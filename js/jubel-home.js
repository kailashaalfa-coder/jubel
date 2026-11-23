document.addEventListener("DOMContentLoaded", async function () {
  await window.JUBEL_READY;
  const grid = document.querySelector(".featured-grid");
  if (!grid || !Array.isArray(window.JUBEL_PRODUCTS)) return;
  const featured = window.JUBEL_PRODUCTS.filter(product => product.featured === true).slice(0, 3);
  if (featured.length) {
    grid.innerHTML = featured.map(product => window.JUBEL_PRODUCT_UTILS.featuredHTML(product)).join("");
  } else {
    grid.innerHTML = '<div class="featured-empty"><strong>Produk unggulan segera hadir.</strong><p>Listing pilihan JUBEL akan ditampilkan di sini setelah produk ditambahkan.</p><a href="jual-beli.html" class="btn-secondary">LIHAT ETALASE</a></div>';
  }
});
