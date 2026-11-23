/* JUBEL PRODUCT DATA - dimuat dari Supabase (tabel products). Lihat supabase/schema.sql dan js/supabase-config.js */
(function () {
  const PRODUCTS = [];

  const CATEGORY_LABELS = {
    properti: "PROPERTI", gadget: "GADGET", otomotif: "OTOMOTIF",
    fashion: "FASHION", lainnya: "LAINNYA"
  };


  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }


  function formatPrice(product) {
    if (product.priceLabel) return escapeHTML(product.priceLabel);
    if (product.price == null || product.price === "") return "Harga belum dicantumkan";
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) return "Harga belum dicantumkan";
    return "Rp " + price.toLocaleString("id-ID");
  }


  function hasPrice(product) {
    if (product.price == null || product.price === "") return false;
    const n = Number(product.price);
    return Number.isFinite(n) && n > 0;
  }

  function whatsappURL(product) {
    let phone = String(product.sellerWhatsApp || "").replace(/\D/g, "");
    if (!phone) return "";
    if (phone.charAt(0) === "0") phone = "62" + phone.slice(1);
    const text = "Halo, saya tertarik dengan produk \"" + product.title + "\" di JUBEL. Apakah masih tersedia?";
    return "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
  }

  function imageBlock(product, className) {
    const image = Array.isArray(product.images) ? product.images[0] : "";
    if (image) {
      return '<div class="' + className + ' has-product-image"><img src="' + escapeHTML(image) + '" alt="' + escapeHTML(product.title) + '" loading="lazy">' +
        (product.badge ? '<span class="product-badge">' + escapeHTML(product.badge) + '</span>' : '') + '</div>';
    }
    return '<div class="catalog-image-placeholder"><span class="placeholder-icon">&#9633;</span><span>FOTO PRODUK BELUM ADA</span>' +
      (product.badge ? '<span class="product-badge">' + escapeHTML(product.badge) + '</span>' : '') + '</div>';
  }


  function cardHTML(product) {
    const categoryLabel = CATEGORY_LABELS[product.category] || "LAINNYA";
    const id = encodeURIComponent(product.id);
    return '<article class="catalog-card" data-category="' + escapeHTML(product.category) + '" data-price="' + (hasPrice(product) ? escapeHTML(product.price) : "") + '" data-name="' + escapeHTML(product.title) + '" data-search="' + escapeHTML([product.title, product.shortDescription, product.location, categoryLabel].join(" ").toLowerCase()) + '">' +
      '<a href="detail-produk.html?id=' + id + '" class="catalog-card-link">' +
      imageBlock(product, "catalog-image-placeholder") +
      '<div class="catalog-card-body"><span class="catalog-card-category">' + categoryLabel + '</span>' +
      '<h3>' + escapeHTML(product.title) + '</h3><p class="catalog-description">' + escapeHTML(product.shortDescription || "") + '</p>' +
      '<div class="catalog-price">' + formatPrice(product) + '</div><span class="catalog-detail-link">LIHAT DETAIL &rarr;</span></div></a></article>';
  }


  function featuredHTML(product) {
    const image = Array.isArray(product.images) ? product.images[0] : "";
    const categoryLabel = CATEGORY_LABELS[product.category] || "LAINNYA";
    return '<article class="product-card"><div class="product-image">' +
      (image ? '<img src="' + escapeHTML(image) + '" alt="' + escapeHTML(product.title) + '" loading="lazy">' : '<div class="featured-image-placeholder">FOTO PRODUK BELUM ADA</div>') +
      '<span class="product-tag">' + escapeHTML(product.badge || "JUBEL PICKS") + '</span></div><div class="product-info"><span class="product-category">' + categoryLabel + '</span>' +
      '<h3>' + escapeHTML(product.title) + '</h3><p>' + escapeHTML(product.shortDescription || "") + '</p>' +
      '<a href="detail-produk.html?id=' + encodeURIComponent(product.id) + '" class="product-button">LIHAT DETAIL &rarr;</a></div></article>';
  }


  function fromRow(r) {
    return {
      id: r.id, title: r.title, category: r.category, price: r.price,
      priceLabel: r.price_label, shortDescription: r.short_description,
      description: r.description, condition: r.condition, location: r.location,
      availability: r.availability, sellerWhatsApp: r.seller_whatsapp,
      images: Array.isArray(r.images) ? r.images : [], badge: r.badge,
      featured: r.featured === true
    };
  }

  async function loadProducts() {
    const cfg = window.JUBEL_SUPABASE || {};
    if (!cfg.url || !cfg.anonKey || /GANTI/.test(cfg.url)) {
      console.warn("JUBEL: Supabase belum dikonfigurasi (js/supabase-config.js).");
      return;
    }
    const q = "/rest/v1/products?select=*&is_published=eq.true&order=sort_order.asc,created_at.desc";
    const res = await fetch(cfg.url + q, { headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = await res.json();
    PRODUCTS.length = 0;
    rows.forEach(function (r) { PRODUCTS.push(fromRow(r)); });
  }

  window.JUBEL_PRODUCTS = PRODUCTS;
  window.JUBEL_READY = loadProducts().catch(function (err) {
    window.JUBEL_LOAD_ERROR = err;
    console.error("JUBEL: gagal memuat produk", err);
  });
  window.JUBEL_CATEGORY_LABELS = CATEGORY_LABELS;
  window.JUBEL_PRODUCT_UTILS = { escapeHTML: escapeHTML, formatPrice: formatPrice, hasPrice: hasPrice, whatsappURL: whatsappURL, cardHTML: cardHTML, featuredHTML: featuredHTML };
})();
