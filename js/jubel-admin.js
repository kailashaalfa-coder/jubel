(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cfg = window.JUBEL_SUPABASE || {};
  const BUCKET = "product-images", MAX_IMG = 4, MAX_BYTES = 3 * 1024 * 1024;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  let sb, images = [], rows = [], msgTimer;

  function toast(t) { const m = $("msg"); m.textContent = t; m.style.display = "block"; clearTimeout(msgTimer); msgTimer = setTimeout(() => (m.style.display = "none"), 3500); }

  if (!cfg.url || /GANTI/.test(cfg.url)) { document.body.innerHTML = '<p style="padding:24px">Isi dulu <code>js/supabase-config.js</code>.</p>'; return; }
  sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  async function checkSession() {
    const { data } = await sb.auth.getSession();
    const session = data.session;
    $("loginBox").hidden = !!session; $("app").hidden = !session; $("logout").hidden = !session;
    if (session) loadList();
  }

  $("loginBtn").onclick = async () => {
    const { error } = await sb.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) return toast("Gagal masuk: " + error.message);
    $("password").value = ""; checkSession();
  };
  $("logout").onclick = async () => { await sb.auth.signOut(); checkSession(); };

  async function loadList() {
    const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: false });
    if (error) { $("list").textContent = "Gagal memuat (apakah email ini terdaftar di tabel admins?): " + error.message; return; }
    rows = data;
    $("list").innerHTML = rows.length ? rows.map((r) =>
      '<div class="item">' + (r.images && r.images[0] ? '<img src="' + esc(r.images[0]) + '" alt="">' : '<div class="thumb"></div>') +
      '<div class="grow"><strong>' + esc(r.title) + '</strong><br><small>' + esc(r.category) + (r.is_published ? "" : " · DRAFT") + (r.featured ? " · UNGGULAN" : "") + '</small></div>' +
      '<div class="actions"><button data-act="edit" data-id="' + esc(r.id) + '">Ubah</button>' +
      '<button class="ghost" data-act="pub" data-id="' + esc(r.id) + '">' + (r.is_published ? "Sembunyikan" : "Tayangkan") + '</button>' +
      '<button class="danger" data-act="del" data-id="' + esc(r.id) + '">Hapus</button></div></div>').join("") : "Belum ada produk.";
  }

  $("list").onclick = async (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const r = rows.find((x) => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.act === "edit") return fillForm(r);
    if (b.dataset.act === "pub") {
      const { error } = await sb.from("products").update({ is_published: !r.is_published }).eq("id", r.id);
      return error ? toast(error.message) : loadList();
    }
    if (b.dataset.act === "del") {
      if (!confirm('Hapus "' + r.title + '" beserta fotonya?')) return;
      const paths = (r.images || []).map(pathFromUrl).filter(Boolean);
      if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      const { error } = await sb.from("products").delete().eq("id", r.id);
      if (error) return toast(error.message);
      toast("Produk dihapus."); loadList();
    }
  };

  function pathFromUrl(u) { const i = String(u).indexOf("/" + BUCKET + "/"); return i < 0 ? "" : decodeURIComponent(String(u).slice(i + BUCKET.length + 2).split("?")[0]); }

  function renderImgs() {
    $("f_imgs").innerHTML = images.map((u, i) => '<div><img class="thumb" src="' + esc(u) + '" alt=""><button type="button" data-i="' + i + '" aria-label="Hapus foto">×</button></div>').join("");
  }
  $("f_imgs").onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) { images.splice(Number(b.dataset.i), 1); renderImgs(); } };

  function fillForm(r) {
    $("formTitle").textContent = "Ubah produk";
    $("f_id").value = r.id; $("f_title").value = r.title || ""; $("f_category").value = r.category;
    $("f_price").value = r.price == null ? "" : r.price; $("f_price_label").value = r.price_label || "";
    $("f_short").value = r.short_description || ""; $("f_desc").value = r.description || "";
    $("f_condition").value = r.condition || ""; $("f_location").value = r.location || "";
    $("f_availability").value = r.availability || ""; $("f_wa").value = r.seller_whatsapp || "";
    $("f_badge").value = r.badge || ""; $("f_featured").checked = !!r.featured; $("f_published").checked = !!r.is_published;
    images = (r.images || []).slice(); renderImgs(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    $("formTitle").textContent = "Tambah produk";
    ["f_id","f_title","f_price","f_price_label","f_short","f_desc","f_condition","f_location","f_wa","f_badge"].forEach((i) => ($(i).value = ""));
    $("f_category").value = "properti"; $("f_availability").value = "Tersedia"; $("f_files").value = "";
    $("f_featured").checked = false; $("f_published").checked = true; images = []; renderImgs();
  }
  $("resetBtn").onclick = resetForm;

  async function uploadFiles(files) {
    const out = [];
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error(f.name + ": format harus JPG/PNG/WEBP");
      if (f.size > MAX_BYTES) throw new Error(f.name + ": maksimal 3 MB");
      const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
      const path = new Date().getFullYear() + "/" + crypto.randomUUID() + "." + ext;
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000" });
      if (error) throw error;
      out.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    return out;
  }

  $("saveBtn").onclick = async () => {
    const btn = $("saveBtn"); const title = $("f_title").value.trim();
    if (!title) return toast("Nama produk wajib diisi.");
    const files = Array.from($("f_files").files || []);
    if (images.length + files.length > MAX_IMG) return toast("Maksimal " + MAX_IMG + " foto.");
    const price = $("f_price").value === "" ? null : Number($("f_price").value);
    if (price != null && (!Number.isFinite(price) || price < 0)) return toast("Harga tidak valid.");
    btn.disabled = true; btn.textContent = "MENYIMPAN...";
    try {
      const uploaded = files.length ? await uploadFiles(files) : [];
      const payload = {
        title, category: $("f_category").value, price, price_label: $("f_price_label").value.trim() || null,
        short_description: $("f_short").value.trim() || null, description: $("f_desc").value.trim() || null,
        condition: $("f_condition").value.trim() || null, location: $("f_location").value.trim() || null,
        availability: $("f_availability").value.trim() || null,
        seller_whatsapp: $("f_wa").value.replace(/[^\d]/g, "") || null,
        badge: $("f_badge").value.trim() || null, featured: $("f_featured").checked,
        is_published: $("f_published").checked, images: images.concat(uploaded)
      };
      const id = $("f_id").value;
      const { error } = id ? await sb.from("products").update(payload).eq("id", id) : await sb.from("products").insert(payload);
      if (error) throw error;
      toast("Tersimpan."); resetForm(); loadList();
    } catch (err) { toast("Gagal: " + (err.message || err)); }
    finally { btn.disabled = false; btn.textContent = "SIMPAN"; }
  };

  checkSession();
})();
