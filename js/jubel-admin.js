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


  /* ---------- Wilayah Indonesia (emsifa) ---------- */
  const WIL = "https://emsifa.github.io/api-wilayah-indonesia/api/";
  const wilCache = {};
  const S = { prov: $("f_prov"), reg: $("f_reg"), dist: $("f_dist"), vil: $("f_vil") };
  function titleCase(n) {
    return String(n || "").toLowerCase().replace(/(^|[\s\-(\/])([a-z])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(Dki|Di|Ntb|Ntt)\b/g, (m) => m.toUpperCase());
  }
  async function wil(path) {
    if (wilCache[path]) return wilCache[path];
    const r = await fetch(WIL + path + ".json");
    if (!r.ok) throw new Error("API wilayah gagal (" + r.status + ")");
    return (wilCache[path] = await r.json());
  }
  function fillSelect(sel, items, placeholder, selected) {
    sel.innerHTML = '<option value="">' + esc(placeholder) + "</option>" +
      items.map((i) => '<option value="' + esc(i.id) + '">' + esc(titleCase(i.name)) + "</option>").join("");
    sel.disabled = !items.length;
    if (selected) sel.value = selected;
  }
  function resetSelect(sel, text) { sel.innerHTML = '<option value="">' + esc(text) + "</option>"; sel.disabled = true; }
  const selText = (sel) => (sel.value ? sel.options[sel.selectedIndex].text : "");
  async function guard(fn) { try { await fn(); } catch (e) { toast(e.message || "Gagal memuat wilayah"); } }

  async function loadProvinces(selected) { fillSelect(S.prov, await wil("provinces"), "Pilih provinsi", selected); }
  S.prov.onchange = () => guard(async () => {
    resetSelect(S.dist, "Pilih kota/kabupaten dulu"); resetSelect(S.vil, "Pilih kecamatan dulu");
    if (!S.prov.value) return resetSelect(S.reg, "Pilih provinsi dulu");
    fillSelect(S.reg, await wil("regencies/" + S.prov.value), "Pilih kota/kabupaten");
  });
  S.reg.onchange = () => guard(async () => {
    resetSelect(S.vil, "Pilih kecamatan dulu");
    if (!S.reg.value) return resetSelect(S.dist, "Pilih kota/kabupaten dulu");
    fillSelect(S.dist, await wil("districts/" + S.reg.value), "Pilih kecamatan");
  });
  S.dist.onchange = () => guard(async () => {
    if (!S.dist.value) return resetSelect(S.vil, "Pilih kecamatan dulu");
    fillSelect(S.vil, await wil("villages/" + S.dist.value), "Pilih kelurahan/desa");
  });
  async function restoreWilayah(r) {
    if (!r.province_id) { await loadProvinces(); resetSelect(S.reg, "Pilih provinsi dulu"); resetSelect(S.dist, "Pilih kota/kabupaten dulu"); resetSelect(S.vil, "Pilih kecamatan dulu"); return; }
    await loadProvinces(r.province_id);
    fillSelect(S.reg, await wil("regencies/" + r.province_id), "Pilih kota/kabupaten", r.regency_id);
    fillSelect(S.dist, await wil("districts/" + r.regency_id), "Pilih kecamatan", r.district_id);
    fillSelect(S.vil, await wil("villages/" + r.district_id), "Pilih kelurahan/desa", r.village_id);
  }
  function syncAddrToggle() {
    const wa = $("f_addr_wa").checked;
    $("f_addr").disabled = wa; if (wa) $("f_addr").value = "";
  }
  $("f_addr_wa").onchange = syncAddrToggle;
  function buildLocation(byWA, detail) {
    const parts = [];
    if (!byWA && detail) parts.push(detail);
    if (S.vil.value) parts.push(selText(S.vil));
    parts.push("Kec. " + selText(S.dist), selText(S.reg), selText(S.prov));
    return parts.join(", ") + (byWA ? " · Alamat detail via WhatsApp" : "");
  }

  function renderImgs() {
    $("f_imgs").innerHTML = images.map((u, i) => '<div><img class="thumb" src="' + esc(u) + '" alt=""><button type="button" data-i="' + i + '" aria-label="Hapus foto">×</button></div>').join("");
  }
  $("f_imgs").onclick = (e) => { const b = e.target.closest("button[data-i]"); if (b) { images.splice(Number(b.dataset.i), 1); renderImgs(); } };

  function fillForm(r) {
    $("formTitle").textContent = "Ubah produk";
    $("f_id").value = r.id; $("f_title").value = r.title || ""; $("f_category").value = r.category;
    $("f_price").value = r.price == null ? "" : r.price; $("f_price_label").value = r.price_label || "";
    $("f_short").value = r.short_description || ""; $("f_desc").value = r.description || "";
    $("f_condition").value = r.condition || "";
    $("f_addr_wa").checked = !!r.address_by_whatsapp; $("f_addr").value = r.address_detail || ""; syncAddrToggle();
    guard(() => restoreWilayah(r));
    $("f_availability").value = r.availability || ""; $("f_wa").value = r.seller_whatsapp || "";
    $("f_badge").value = r.badge || ""; $("f_featured").checked = !!r.featured; $("f_published").checked = !!r.is_published;
    images = (r.images || []).slice(); renderImgs(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    $("formTitle").textContent = "Tambah produk";
    ["f_id","f_title","f_price","f_price_label","f_short","f_desc","f_condition","f_addr","f_wa","f_badge"].forEach((i) => ($(i).value = ""));
    $("f_addr_wa").checked = false; syncAddrToggle(); guard(() => restoreWilayah({}));
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
    if (!S.prov.value || !S.reg.value || !S.dist.value) return toast("Lengkapi lokasi: provinsi, kota/kabupaten, dan kecamatan.");
    if (S.vil.options.length > 1 && !S.vil.value) return toast("Pilih kelurahan/desa.");
    const byWA = $("f_addr_wa").checked, detail = byWA ? "" : $("f_addr").value.trim();
    const waNum = $("f_wa").value.replace(/[^\d]/g, "");
    if (byWA && !waNum) return toast("Isi nomor WhatsApp penjual jika alamat detail via WhatsApp.");
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
        condition: $("f_condition").value.trim() || null,
        location: buildLocation(byWA, detail),
        province_id: S.prov.value, province: selText(S.prov), regency_id: S.reg.value, regency: selText(S.reg),
        district_id: S.dist.value, district: selText(S.dist), village_id: S.vil.value || null, village: selText(S.vil) || null,
        address_detail: detail || null, address_by_whatsapp: byWA,
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

  guard(() => loadProvinces());
  checkSession();
})();
