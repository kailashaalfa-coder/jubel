document.addEventListener("DOMContentLoaded", async function () {
  await window.JUBEL_READY;
  const params = new URLSearchParams(window.location.search);
  const currentCategory = params.get("cat") || "properti";
  const categoryData = {
    properti: { title: "Temukan tempat, temukan peluang.", name: "PROPERTI", description: "Jelajahi rumah, tanah, ruang usaha, dan peluang properti pilihan di etalase JUBEL." },
    gadget: { title: "Teknologi yang menarik perhatian.", name: "GADGET", description: "Temukan smartphone, perangkat elektronik, dan gadget menarik lainnya." },
    otomotif: { title: "Temukan kendaraan incaranmu.", name: "OTOMOTIF", description: "Jelajahi mobil, motor, dan berbagai kendaraan yang tersedia di etalase JUBEL." },
    fashion: { title: "Temukan gaya yang cocok.", name: "FASHION", description: "Jelajahi pilihan fashion, pakaian, sepatu, dan berbagai item gaya." },
    lainnya: { title: "Hal menarik lainnya ada di sini.", name: "LAINNYA", description: "Berbagai produk unik dan menarik yang tidak masuk kategori utama." }
  };
  const data = categoryData[currentCategory] || categoryData.properti;
  const title = document.getElementById("categoryTitle");
  const description = document.getElementById("categoryDescription");
  const breadcrumb = document.getElementById("categoryBreadcrumb");
  const counter = document.getElementById("categoryCounter");
  const sectionTitle = document.getElementById("categorySectionTitle");
  const searchInput = document.getElementById("categorySearch");
  const clearSearch = document.getElementById("categoryClear");
  const sortSelect = document.getElementById("categorySort");
  const grid = document.getElementById("categoryProductGrid");
  const productCount = document.getElementById("categoryProductCount");
  const emptyState = document.getElementById("categoryEmpty");
  const resetButton = document.getElementById("categoryReset");
  if (!grid || !Array.isArray(window.JUBEL_PRODUCTS)) return;

  if (title) title.textContent = data.title;
  if (description) description.textContent = data.description;
  if (breadcrumb) breadcrumb.textContent = data.name;
  if (counter) counter.textContent = data.name + " COLLECTION";
  if (sectionTitle) sectionTitle.textContent = "Pilihan " + data.name.toLowerCase() + ".";
  document.title = data.name + " | JUBEL";
  document.querySelectorAll("[data-cat-link]").forEach(link => link.classList.toggle("active", link.dataset.catLink === currentCategory));

  const products = window.JUBEL_PRODUCTS.filter(p => p.category === currentCategory);
  const cards = products.map(p => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = window.JUBEL_PRODUCT_UTILS.cardHTML(p);
    return wrapper.firstElementChild;
  });
  grid.replaceChildren(...cards);

  function updateCategory() {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const sort = sortSelect ? sortSelect.value : "default";
    let visibleCards = cards.filter(card => {
      const matches = (card.dataset.name || "").toLowerCase().includes(keyword) || (card.dataset.search || "").includes(keyword);
      card.hidden = !matches;
      return matches;
    });
    if (sort === "price-low" || sort === "price-high") {
      visibleCards.sort((a, b) => {
        const aPrice = parseFloat(a.dataset.price), bPrice = parseFloat(b.dataset.price);
        const va = aPrice > 0 ? aPrice : Number.MAX_SAFE_INTEGER;
        const vb = bPrice > 0 ? bPrice : Number.MAX_SAFE_INTEGER;
        return sort === "price-low" ? va - vb : vb - va;
      });
    } else if (sort === "name") visibleCards.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || ""));
    visibleCards.forEach(card => grid.appendChild(card));
    if (productCount) productCount.textContent = visibleCards.length + " produk";
    if (emptyState) emptyState.hidden = visibleCards.length > 0;
    grid.hidden = visibleCards.length === 0;
  }
  if (searchInput) searchInput.addEventListener("input", updateCategory);
  if (clearSearch) clearSearch.addEventListener("click", () => { if (searchInput) searchInput.value = ""; updateCategory(); });
  if (sortSelect) sortSelect.addEventListener("change", updateCategory);
  if (resetButton) resetButton.addEventListener("click", () => { if (searchInput) searchInput.value = ""; if (sortSelect) sortSelect.value = "default"; updateCategory(); });
  updateCategory();
});
