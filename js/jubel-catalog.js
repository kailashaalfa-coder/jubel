document.addEventListener("DOMContentLoaded", async function () {
  await window.JUBEL_READY;
  const searchInput = document.getElementById("catalogSearch");
  const clearSearch = document.getElementById("clearSearch");
  const sortSelect = document.getElementById("catalogSort");
  const categoryFilters = document.getElementById("categoryFilters");
  const catalogGrid = document.getElementById("catalogGrid");
  const productCount = document.getElementById("productCount");
  const catalogEmpty = document.getElementById("catalogEmpty");
  const resetCatalog = document.getElementById("resetCatalog");
  if (!catalogGrid || !Array.isArray(window.JUBEL_PRODUCTS)) return;

  const products = window.JUBEL_PRODUCTS;
  const cards = products.map(p => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = window.JUBEL_PRODUCT_UTILS.cardHTML(p);
    return wrapper.firstElementChild;
  });
  catalogGrid.replaceChildren(...cards);
  let activeCategory = "all";

  function updateCatalog() {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const sortValue = sortSelect ? sortSelect.value : "default";
    let visibleCards = cards.filter(card => {
      const matchesCategory = activeCategory === "all" || card.dataset.category === activeCategory;
      const matchesSearch = (card.dataset.name || "").toLowerCase().includes(keyword) || (card.dataset.search || "").includes(keyword);
      card.hidden = !(matchesCategory && matchesSearch);
      return matchesCategory && matchesSearch;
    });
    if (sortValue === "price-low" || sortValue === "price-high") {
      visibleCards.sort((a, b) => {
        const pa = parseFloat(a.dataset.price), pb = parseFloat(b.dataset.price);
        const va = pa > 0 ? pa : Number.MAX_SAFE_INTEGER;
        const vb = pb > 0 ? pb : Number.MAX_SAFE_INTEGER;
        return sortValue === "price-low" ? va - vb : vb - va;
      });
    } else if (sortValue === "name") visibleCards.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || ""));
    visibleCards.forEach(card => catalogGrid.appendChild(card));
    if (productCount) productCount.textContent = "Menampilkan " + visibleCards.length + " produk";
    if (catalogEmpty) catalogEmpty.hidden = visibleCards.length > 0;
    catalogGrid.hidden = visibleCards.length === 0;
  }

  if (searchInput) searchInput.addEventListener("input", updateCatalog);
  if (clearSearch) clearSearch.addEventListener("click", () => { if (searchInput) searchInput.value = ""; updateCatalog(); });
  if (sortSelect) sortSelect.addEventListener("change", updateCatalog);
  if (categoryFilters) categoryFilters.addEventListener("click", event => {
    const button = event.target.closest(".filter-btn");
    if (!button) return;
    activeCategory = button.dataset.category || "all";
    categoryFilters.querySelectorAll(".filter-btn").forEach(btn => btn.classList.toggle("active", btn === button));
    updateCatalog();
  });
  if (resetCatalog) resetCatalog.addEventListener("click", () => {
    activeCategory = "all";
    if (searchInput) searchInput.value = "";
    if (sortSelect) sortSelect.value = "default";
    if (categoryFilters) categoryFilters.querySelectorAll(".filter-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.category === "all"));
    updateCatalog();
  });
  updateCatalog();
});
