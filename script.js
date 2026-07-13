import { db, productsCol } from "./firebase.js";
import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const WHATSAPP_NUMBER = "50578122548";
const ADMIN_PASSWORD = "eugenio12";
const PLACEHOLDER_IMAGE = "https://placehold.co/400x250/121212/d4af37?text=Nic+Store";
const MAX_IMAGE_SIDE = 800;
const MAX_IMAGES_PER_PRODUCT = 5;
const FAVORITES_KEY = "nicstore_favoritos";
const THEME_KEY = "nicstore_tema";

const PRODUCT_DATABASE = {
  Apple: { keywords: ["iphone", "ipad", "macbook", "airpods", "apple"], category: "Celulares" },
  Samsung: { keywords: ["galaxy", "samsung"], category: "Celulares" },
  Xiaomi: { keywords: ["xiaomi", "redmi", "poco"], category: "Celulares" },
  Motorola: { keywords: ["motorola", "moto"], category: "Celulares" },
  Honor: { keywords: ["honor"], category: "Celulares" },
  HP: { keywords: ["hp", "pavilion", "victus", "omen"], category: "Laptops" },
  Dell: { keywords: ["dell", "inspiron", "latitude", "alienware"], category: "Laptops" },
  Lenovo: { keywords: ["lenovo", "thinkpad", "ideapad", "legion"], category: "Laptops" },
  Asus: { keywords: ["asus", "rog", "vivobook", "zenbook"], category: "Laptops" },
  Acer: { keywords: ["acer", "nitro", "aspire", "predator"], category: "Laptops" },
  LG: { keywords: ["lg"], category: "Televisores" },
  Sony: { keywords: ["sony", "bravia"], category: "Televisores" },
  TCL: { keywords: ["tcl"], category: "Televisores" },
  Hisense: { keywords: ["hisense"], category: "Televisores" }
};

// Productos base: solo se usan si la coleccion "productos" esta totalmente vacia.
const DEFAULT_PRODUCTS = [
  { nombre: "Silla Gamer Edicion Azul", desc: "Envio Gratis en Managua + Armada de silla Gratis + Garantia Garantizada + Atencion Personalizada", precio: "C$125.00", tag: "PRO", marca: "", img: "", imgs: [], orden: 1 },
  { nombre: "Silla Gamer Edicion Roja", desc: "Envio Gratis en Managua + Armada de silla Gratis + Garantia Garantizada + Atencion Personalizada", precio: "C$125.00", tag: "PRO", marca: "", img: "", imgs: [], orden: 2 },
  { nombre: "Smart TV 55\" pulgadas", desc: "Envio Gratis + Instalacion de soporteria de TV + Factura membretada + Garantia Certificada", precio: "C$560.00", tag: "Media Gama", marca: "LG", img: "", imgs: [], orden: 3 },
  { nombre: "S25 Ultra", desc: "Envio Gratis en Managua + Productos 100% Originales + Garantia Garantizada + Atencion Personalizada", precio: "C$125.00", tag: "Media Gama", marca: "Samsung", img: "", imgs: [], orden: 4 }
];

const state = {
  products: [],
  cart: [],
  favorites: loadFavorites(),
  filters: {
    search: "",
    category: "all",
    brand: "all",
    sort: "featured",
    onlyFavorites: false
  },
  adminAuth: false,
  adminRequested: false,
  zoom: { images: [], index: 0 }
};

const els = {
  productGrid: document.getElementById("productGrid"),
  emptyState: document.getElementById("emptyState"),
  firebaseStatus: document.getElementById("firebaseStatus"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  brandFilter: document.getElementById("brandFilter"),
  sortProducts: document.getElementById("sortProducts"),
  favToggleBtn: document.getElementById("favToggleBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
  adminToggleBtn: document.getElementById("adminToggleBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  adminLogin: document.getElementById("adminLogin"),
  loginForm: document.getElementById("loginForm"),
  adminPassword: document.getElementById("adminPassword"),
  loginBtn: document.getElementById("loginBtn"),
  loginMessage: document.getElementById("loginMessage"),
  adminSection: document.getElementById("admin"),
  dashboardStats: document.getElementById("dashboardStats"),
  productForm: document.getElementById("productForm"),
  productId: document.getElementById("productId"),
  currentImageUrl: document.getElementById("currentImageUrl"),
  currentImagesUrls: document.getElementById("currentImagesUrls"),
  currentOrden: document.getElementById("currentOrden"),
  productName: document.getElementById("productName"),
  productBrand: document.getElementById("productBrand"),
  productCategory: document.getElementById("productCategory"),
  productPrice: document.getElementById("productPrice"),
  productStock: document.getElementById("productStock"),
  productFeatured: document.getElementById("productFeatured"),
  productNew: document.getElementById("productNew"),
  productSale: document.getElementById("productSale"),
  productSalePrice: document.getElementById("productSalePrice"),
  productImageFile: document.getElementById("productImageFile"),
  imagePreview: document.getElementById("imagePreview"),
  productDescription: document.getElementById("productDescription"),
  saveProductBtn: document.getElementById("saveProductBtn"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  formMessage: document.getElementById("formMessage"),
  productTable: document.getElementById("productTable"),
  managerCount: document.getElementById("managerCount"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartItems: document.getElementById("cartItems"),
  emptyCart: document.getElementById("emptyCart"),
  cartTotal: document.getElementById("cartTotal"),
  cartCount: document.querySelectorAll("[data-cart-count]"),
  sendQuoteBtn: document.getElementById("sendQuoteBtn"),
  clearCartBtn: document.getElementById("clearCartBtn"),
  menuToggleBtn: document.getElementById("menuToggleBtn"),
  mainNav: document.getElementById("mainNav"),
  floatWa: document.getElementById("floatWa"),
  specialOrderForm: document.getElementById("specialOrderForm"),
  specialItem: document.getElementById("specialItem"),
  specialDetails: document.getElementById("specialDetails"),
  zoomModal: document.getElementById("zoomModal"),
  zoomImage: document.getElementById("zoomImage"),
  zoomCounter: document.getElementById("zoomCounter")
};

// ─── FAVORITOS (localStorage, por dispositivo) ─────────────────────────
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  } catch (e) {
    /* almacenamiento no disponible, se ignora */
  }
}

function toggleFavorite(id) {
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter((favId) => favId !== id);
  } else {
    state.favorites.push(id);
  }
  saveFavorites();
  renderProductGrid();
}

// ─── MODO OSCURO / CLARO ────────────────────────────────────────────────
function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "light";
  } catch (e) {
    return "light";
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (els.themeToggleBtn) {
    els.themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    els.themeToggleBtn.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* ignorado */
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

// ─── MAPEO: documento Firestore (tus campos reales) <-> objeto de la vista ───
function normalizeProduct(docId, data) {
  const parsedPrice = parsePrice(data.precio);
  const parsedSalePrice = data.precioOferta ? parsePrice(data.precioOferta) : null;
  const detected = detectProduct(data.nombre || "");
  const images = Array.isArray(data.imgs) && data.imgs.length
    ? data.imgs.filter(Boolean)
    : (data.img ? [data.img] : []);

  return {
    id: docId,
    name: data.nombre || "",
    category: data.tag || "General",
    brand: data.marca || detected.brand || "",
    price: parsedPrice,
    priceLabel: formatCurrency(parsedPrice),
    salePrice: parsedSalePrice,
    salePriceLabel: parsedSalePrice !== null ? formatCurrency(parsedSalePrice) : "",
    onSale: data.oferta === true && parsedSalePrice !== null,
    isNew: data.nuevo === true,
    stock: data.stock === undefined || data.stock === null || data.stock === "" ? null : Number(data.stock),
    featured: data.destacado === true,
    images,
    imageUrl: images[0] || "",
    description: data.desc || "",
    orden: Number(data.orden || 0)
  };
}

function parsePrice(precio) {
  const num = Number(String(precio || "").replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(num) ? 0 : num;
}

function formatCurrency(value) {
  try {
    return new Intl.NumberFormat("es-NI", {
      style: "currency",
      currency: "NIO",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value) || 0);
  } catch (e) {
    return `C$${Number(value || 0).toFixed(2)}`;
  }
}

function formatPriceLabel(product) {
  return product.priceLabel || formatCurrency(product.price);
}

function detectProduct(productName) {
  const text = String(productName || "").toLowerCase();
  for (const brand in PRODUCT_DATABASE) {
    const data = PRODUCT_DATABASE[brand];
    for (const keyword of data.keywords) {
      if (text.includes(keyword)) {
        return { brand, category: data.category };
      }
    }
  }
  return { brand: "", category: "" };
}

// ─── CONEXION EN TIEMPO REAL A FIRESTORE ─────────────────────────────
function startListening() {
  const q = query(productsCol, orderBy("orden", "asc"));
  onSnapshot(q, (snapshot) => {
    state.products = snapshot.docs.map((item) => normalizeProduct(item.id, item.data()));
    setFirebaseStatus("Base de datos conectada.", "success");
    refresh();
  }, (error) => {
    console.error("Firestore read error:", error);
    setFirebaseStatus(getFirebaseErrorMessage(error), "error");
  });
}

async function seedIfEmpty() {
  try {
    const snap = await getDocs(productsCol);
    if (snap.empty) {
      for (const product of DEFAULT_PRODUCTS) {
        await addDoc(productsCol, product);
      }
    }
  } catch (error) {
    console.error("Seed error:", error);
  }
}

function getFirebaseErrorMessage(error) {
  const code = error && error.code ? error.code : "";
  if (code.includes("permission-denied")) {
    return "Firestore no deja leer. Revisa las reglas de seguridad del proyecto.";
  }
  if (code.includes("unavailable")) {
    return "No se pudo conectar. Revisa tu internet y que el proyecto de Firebase exista.";
  }
  return `No se pudo conectar con la base de datos (${code || "error desconocido"}).`;
}

function setFirebaseStatus(text, type) {
  if (!els.firebaseStatus) return;
  els.firebaseStatus.textContent = text;
  els.firebaseStatus.className = `firebase-status${type ? ` ${type}` : ""}`;
}

// ─── HELPERS DE PRESENTACION ──────────────────────────────────────────
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function safeUrlFor(url) {
  return String(url || PLACEHOLDER_IMAGE).replace(/"/g, "%22");
}

function getCategories() {
  return Array.from(new Set(state.products.map((product) => product.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

function getBrands() {
  return Array.from(new Set(state.products.map((product) => product.brand).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
}

function populateCategoryFilter() {
  const current = els.categoryFilter.value || "all";
  els.categoryFilter.innerHTML = '<option value="all">Todas las categorias</option>';

  getCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });

  const exists = Array.from(els.categoryFilter.options).some((option) => option.value === current);
  els.categoryFilter.value = exists ? current : "all";
  state.filters.category = els.categoryFilter.value;
}

function populateBrandFilter() {
  if (!els.brandFilter) return;
  const current = els.brandFilter.value || "all";
  els.brandFilter.innerHTML = '<option value="all">Todas las marcas</option>';

  getBrands().forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    els.brandFilter.appendChild(option);
  });

  const exists = Array.from(els.brandFilter.options).some((option) => option.value === current);
  els.brandFilter.value = exists ? current : "all";
  state.filters.brand = els.brandFilter.value;
}

function getFilteredProducts() {
  const search = state.filters.search.trim().toLowerCase();
  let list = state.products.slice();

  if (search) {
    list = list.filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.brand} ${product.description}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  if (state.filters.category !== "all") {
    list = list.filter((product) => product.category === state.filters.category);
  }

  if (state.filters.brand !== "all") {
    list = list.filter((product) => product.brand === state.filters.brand);
  }

  if (state.filters.onlyFavorites) {
    list = list.filter((product) => state.favorites.includes(product.id));
  }

  switch (state.filters.sort) {
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price-low":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price-high":
      list.sort((a, b) => b.price - a.price);
      break;
    case "new":
      list.sort((a, b) => Number(b.isNew) - Number(a.isNew) || a.orden - b.orden);
      break;
    default:
      list.sort((a, b) => Number(b.featured) - Number(a.featured) || a.orden - b.orden);
  }

  return list;
}

function renderProductGrid() {
  const list = getFilteredProducts();
  els.productGrid.innerHTML = "";
  els.emptyState.classList.toggle("is-hidden", list.length > 0);

  list.forEach((product) => {
    const outOfStock = product.stock !== null && product.stock <= 0;
    const stockLabel = product.stock === null ? "Disponible" : (outOfStock ? "Sin stock" : `${product.stock} disp.`);
    const isFav = state.favorites.includes(product.id);
    const images = product.images.length ? product.images : [PLACEHOLDER_IMAGE];

    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="thumb" data-zoom-open="${product.id}">
        <img src="${safeUrlFor(images[0])}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">
        <div class="badge-row">
          ${product.featured ? '<span class="badge badge-featured">⭐ Destacado</span>' : ""}
          ${product.isNew ? '<span class="badge badge-new">🔥 Nuevo</span>' : ""}
          ${product.onSale ? '<span class="badge badge-sale">💸 Oferta</span>' : ""}
        </div>
        ${outOfStock ? '<span class="badge out">Agotado</span>' : ""}
        ${images.length > 1 ? `<span class="badge multi-img">📷 ${images.length}</span>` : ""}
        <button type="button" class="fav-btn ${isFav ? "is-active" : ""}" data-fav="${product.id}" aria-label="${isFav ? "Quitar de favoritos" : "Agregar a favoritos"}">${isFav ? "❤️" : "🤍"}</button>
      </div>
      <div class="body">
        <span class="cat">${escapeHtml(product.brand ? `${product.brand} · ${product.category}` : product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="meta">
          <span class="price-wrap">
            ${product.onSale
              ? `<span class="price-old">${formatPriceLabel(product)}</span><span class="price">${product.salePriceLabel}</span>`
              : `<span class="price">${formatPriceLabel(product)}</span>`}
          </span>
          <span class="stock">${stockLabel}</span>
        </div>
        <button class="add-btn" type="button" data-add="${product.id}" ${outOfStock ? "disabled" : ""}>
          ${outOfStock ? "No disponible" : "Agregar a cotizacion"}
        </button>
      </div>
    `;
    els.productGrid.appendChild(card);
  });
}

function renderManagerTable() {
  els.productTable.innerHTML = "";
  els.managerCount.textContent = `${state.products.length} producto${state.products.length === 1 ? "" : "s"}`;

  if (state.products.length === 0) {
    els.productTable.innerHTML = '<p class="mini-empty">Todavia no hay productos guardados.</p>';
    return;
  }

  state.products.forEach((product) => {
    const thumbUrl = product.imageUrl || PLACEHOLDER_IMAGE;
    const row = document.createElement("div");
    row.className = "mini-row";
    row.innerHTML = `
      <img class="mini-thumb" src="${safeUrlFor(thumbUrl)}" alt="" loading="lazy">
      <div class="mini-info">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.category)} | ${formatPriceLabel(product)} | stock ${product.stock === null ? "sin control" : product.stock}</span>
      </div>
      <div class="mini-actions">
        <button type="button" data-edit="${product.id}" aria-label="Editar ${escapeHtml(product.name)}">E</button>
        <button type="button" class="delete" data-delete="${product.id}" aria-label="Eliminar ${escapeHtml(product.name)}">X</button>
      </div>
    `;
    els.productTable.appendChild(row);
  });
}

// ─── DASHBOARD DE ESTADISTICAS ──────────────────────────────────────────
function renderDashboard() {
  if (!els.dashboardStats) return;

  const total = state.products.length;
  const inventoryValue = state.products.reduce((sum, product) => {
    const stock = product.stock === null ? 1 : product.stock;
    return sum + product.price * Math.max(stock, 0);
  }, 0);
  const featuredCount = state.products.filter((product) => product.featured).length;
  const newCount = state.products.filter((product) => product.isNew).length;
  const saleCount = state.products.filter((product) => product.onSale).length;
  const outOfStockCount = state.products.filter((product) => product.stock !== null && product.stock <= 0).length;
  const categoryCount = getCategories().length;

  const cards = [
    { label: "Productos totales", value: total },
    { label: "Valor de inventario", value: formatCurrency(inventoryValue) },
    { label: "Destacados", value: featuredCount },
    { label: "Nuevos", value: newCount },
    { label: "En oferta", value: saleCount },
    { label: "Sin stock", value: outOfStockCount },
    { label: "Categorias activas", value: categoryCount }
  ];

  els.dashboardStats.innerHTML = cards.map((card) => `
    <div class="stat-card">
      <span class="stat-value">${escapeHtml(card.value)}</span>
      <span class="stat-label">${escapeHtml(card.label)}</span>
    </div>
  `).join("");
}

function refresh() {
  cleanCart();
  populateCategoryFilter();
  populateBrandFilter();
  renderProductGrid();
  renderManagerTable();
  renderDashboard();
  renderCart();
}

// ─── PANEL ADMIN: LOGIN SIMPLE POR CONTRASENA ─────────────────────────
function syncAdminVisibility() {
  els.logoutBtn.classList.toggle("is-hidden", !state.adminAuth);

  if (!state.adminRequested) {
    els.adminLogin.classList.add("is-hidden");
    els.adminSection.classList.add("is-hidden");
    els.adminToggleBtn.setAttribute("aria-expanded", "false");
    els.adminToggleBtn.textContent = "Administrar";
    return;
  }

  els.adminLogin.classList.toggle("is-hidden", state.adminAuth);
  els.adminSection.classList.toggle("is-hidden", !state.adminAuth);
  els.adminToggleBtn.setAttribute("aria-expanded", "true");
  els.adminToggleBtn.textContent = state.adminAuth ? "Ocultar panel" : "Ocultar acceso";

  if (state.adminAuth) {
    renderManagerTable();
    renderDashboard();
  }
}

function toggleAdminArea(forceOpen) {
  state.adminRequested = typeof forceOpen === "boolean" ? forceOpen : !state.adminRequested;
  syncAdminVisibility();

  if (state.adminRequested) {
    const target = state.adminAuth ? els.adminSection : els.adminLogin;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function handleLogin(event) {
  event.preventDefault();
  const value = els.adminPassword.value;

  if (value === ADMIN_PASSWORD) {
    state.adminAuth = true;
    els.loginForm.reset();
    setLoginMessage("", "");
    syncAdminVisibility();
  } else {
    setLoginMessage("Contrasena incorrecta.", "error");
  }
}

function handleLogout() {
  state.adminAuth = false;
  state.adminRequested = false;
  resetForm();
  syncAdminVisibility();
}

function setLoginMessage(text, type) {
  els.loginMessage.textContent = text;
  els.loginMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

// ─── FORMULARIO DE PRODUCTO ────────────────────────────────────────────
function fillForm(product) {
  els.productId.value = product.id;
  els.currentImageUrl.value = product.imageUrl || "";
  els.currentImagesUrls.value = JSON.stringify(product.images || []);
  els.currentOrden.value = product.orden;
  els.productName.value = product.name;
  els.productBrand.value = product.brand || "";
  els.productCategory.value = product.category;
  els.productPrice.value = Number.isFinite(product.price)
    ? Number(product.price).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
  els.productStock.value = product.stock === null ? "" : product.stock;
  els.productFeatured.value = String(product.featured);
  els.productNew.checked = Boolean(product.isNew);
  els.productSale.checked = Boolean(product.onSale);
  els.productSalePrice.value = product.salePrice
    ? Number(product.salePrice).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
  els.productSalePrice.disabled = !product.onSale;
  els.productDescription.value = product.description;
  els.productImageFile.value = "";
  setImagePreview(product.images || []);
  setFormMessage(`Editando "${product.name}". Guarda para publicar los cambios.`, "");
  els.productName.focus();
}

function resetForm() {
  els.productForm.reset();
  els.productId.value = "";
  els.currentImageUrl.value = "";
  els.currentImagesUrls.value = "[]";
  els.currentOrden.value = "";
  els.productBrand.value = "";
  els.productFeatured.value = "false";
  els.productSalePrice.disabled = true;
  setImagePreview([]);
  setFormMessage("", "");
}

function setImagePreview(urls) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : (urls ? [urls] : []);
  if (!list.length) {
    els.imagePreview.classList.add("is-hidden");
    els.imagePreview.innerHTML = "";
    return;
  }
  els.imagePreview.classList.remove("is-hidden");
  els.imagePreview.innerHTML = list.map((url) => `<div class="image-preview-item" style="background-image:url('${String(url).replace(/'/g, "%27")}')"></div>`).join("");
}

function setFormMessage(text, type) {
  els.formMessage.textContent = text;
  els.formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

// Comprime cada imagen a maximo 800px y la convierte a base64.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      reject(new Error("Formato de imagen no permitido."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > MAX_IMAGE_SIDE) { h = Math.round((h * MAX_IMAGE_SIDE) / w); w = MAX_IMAGE_SIDE; }
        if (h > MAX_IMAGE_SIDE) { w = Math.round((w * MAX_IMAGE_SIDE) / h); h = MAX_IMAGE_SIDE; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

async function readAndCompressImages(files, currentImages) {
  const list = Array.from(files || []);
  if (!list.length) {
    try {
      return JSON.parse(currentImages || "[]");
    } catch (e) {
      return [];
    }
  }
  const limited = list.slice(0, MAX_IMAGES_PER_PRODUCT);
  const compressed = [];
  for (const file of limited) {
    compressed.push(await compressImage(file));
  }
  return compressed;
}

function handleSaleToggle() {
  els.productSalePrice.disabled = !els.productSale.checked;
  if (!els.productSale.checked) els.productSalePrice.value = "";
}

async function handleProductSubmit(event) {
  event.preventDefault();

  if (!state.adminAuth) {
    setFormMessage("Debes iniciar sesion para guardar productos.", "error");
    return;
  }

  const nombre = els.productName.value.trim();
  const marca = els.productBrand.value.trim();
  const tag = els.productCategory.value.trim();
  const rawPrice = els.productPrice.value;
  const price = Number(String(rawPrice).replace(/,/g, "").replace(/\s/g, ""));
  const stockValue = els.productStock.value.trim();
  const desc = els.productDescription.value.trim();
  const onSale = els.productSale.checked;
  const rawSalePrice = els.productSalePrice.value;
  const salePrice = onSale ? Number(String(rawSalePrice).replace(/,/g, "").replace(/\s/g, "")) : null;

  if (!nombre || !tag || !desc || Number.isNaN(price) || price < 0) {
    setFormMessage("Revisa los campos requeridos antes de guardar.", "error");
    return;
  }

  if (onSale && (Number.isNaN(salePrice) || salePrice < 0)) {
    setFormMessage("Ingresa un precio de oferta valido.", "error");
    return;
  }

  els.saveProductBtn.disabled = true;
  els.saveProductBtn.textContent = "Guardando...";

  try {
    const imgs = await readAndCompressImages(els.productImageFile.files, els.currentImagesUrls.value);

    const data = {
      nombre,
      desc,
      precio: formatCurrency(price),
      tag,
      marca,
      imgs,
      img: imgs[0] || "",
      destacado: els.productFeatured.value === "true",
      nuevo: els.productNew.checked,
      oferta: onSale,
      precioOferta: onSale ? formatCurrency(salePrice) : ""
    };

    if (stockValue === "") {
      data.stock = null;
    } else {
      data.stock = Number.parseInt(stockValue, 10);
    }

    if (els.productId.value) {
      await updateDoc(doc(db, "productos", els.productId.value), data);
      resetForm();
      setFormMessage(`"${nombre}" se actualizo correctamente.`, "success");
    } else {
      const maxOrden = state.products.length ? Math.max(...state.products.map((p) => p.orden || 0)) + 1 : 1;
      await addDoc(productsCol, { ...data, orden: maxOrden });
      resetForm();
      setFormMessage(`"${nombre}" se agrego al catalogo.`, "success");
    }
  } catch (error) {
    console.error("Save product error:", error);
    setFormMessage(error.message || "No se pudo guardar el producto.", "error");
  } finally {
    els.saveProductBtn.disabled = false;
    els.saveProductBtn.textContent = "Guardar producto";
  }
}

async function deleteProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  if (!window.confirm(`Eliminar "${product.name}" del catalogo?`)) return;

  try {
    await deleteDoc(doc(db, "productos", id));
    setFormMessage(`"${product.name}" se elimino.`, "success");
  } catch (error) {
    console.error("Delete error:", error);
    setFormMessage("No se pudo eliminar el producto.", "error");
  }
}

function handleImageFileChange() {
  const files = els.productImageFile.files;
  if (!files || !files.length) {
    try {
      setImagePreview(JSON.parse(els.currentImagesUrls.value || "[]"));
    } catch (e) {
      setImagePreview([]);
    }
    return;
  }
  const urls = Array.from(files).slice(0, MAX_IMAGES_PER_PRODUCT).map((file) => URL.createObjectURL(file));
  setImagePreview(urls);
}

// ─── ZOOM DE IMAGENES ───────────────────────────────────────────────────
function openZoom(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const images = product.images.length ? product.images : [PLACEHOLDER_IMAGE];
  state.zoom.images = images;
  state.zoom.index = 0;
  renderZoom();
  els.zoomModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function renderZoom() {
  const { images, index } = state.zoom;
  if (!images.length) return;
  els.zoomImage.src = safeUrlFor(images[index]);
  els.zoomCounter.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
  els.zoomModal.querySelectorAll("[data-zoom-nav]").forEach((btn) => {
    btn.classList.toggle("is-hidden", images.length <= 1);
  });
}

function zoomNav(direction) {
  const { images } = state.zoom;
  if (images.length <= 1) return;
  state.zoom.index = (state.zoom.index + direction + images.length) % images.length;
  renderZoom();
}

function closeZoom() {
  els.zoomModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ─── CARRITO / COTIZACION ──────────────────────────────────────────────
function cleanCart() {
  state.cart = state.cart
    .filter((item) => state.products.some((product) => product.id === item.id))
    .map((item) => {
      const product = state.products.find((candidate) => candidate.id === item.id);
      const limit = product.stock === null ? item.qty : Math.max(product.stock, 0);
      return { ...item, qty: Math.min(item.qty, limit) };
    })
    .filter((item) => item.qty > 0);
}

function addToCart(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  if (product.stock !== null && product.stock <= 0) return;

  const existing = state.cart.find((item) => item.id === id);
  const limit = product.stock === null ? Infinity : product.stock;

  if (existing) {
    existing.qty = Math.min(existing.qty + 1, limit);
  } else {
    state.cart.push({ id, qty: 1 });
  }

  renderCart();
  openCart();
}

function updateQty(id, amount) {
  const item = state.cart.find((candidate) => candidate.id === id);
  const product = state.products.find((candidate) => candidate.id === id);
  if (!item || !product) return;

  const limit = product.stock === null ? Infinity : product.stock;
  item.qty = Math.min(Math.max(item.qty + amount, 0), limit);
  if (item.qty === 0) {
    state.cart = state.cart.filter((candidate) => candidate.id !== id);
  }

  renderCart();
}

function effectivePrice(product) {
  return product.onSale && product.salePrice !== null ? product.salePrice : product.price;
}

function renderCart() {
  els.cartItems.innerHTML = "";
  els.emptyCart.classList.toggle("is-hidden", state.cart.length > 0);

  let total = 0;
  let totalQty = 0;

  state.cart.forEach((item) => {
    const product = state.products.find((candidate) => candidate.id === item.id);
    if (!product) return;

    const unitPrice = effectivePrice(product);
    const subtotal = unitPrice * item.qty;
    total += subtotal;
    totalQty += item.qty;

    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <img class="cart-thumb" src="${safeUrlFor(product.imageUrl)}" alt="" loading="lazy">
      <div class="cart-info">
        <strong>${escapeHtml(product.name)}</strong>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      <div class="qty-controls">
        <button type="button" data-qty-down="${product.id}" aria-label="Restar">-</button>
        <span>${item.qty}</span>
        <button type="button" data-qty-up="${product.id}" aria-label="Sumar">+</button>
      </div>
      <button type="button" class="remove-btn" data-remove="${product.id}" aria-label="Quitar">X</button>
    `;
    els.cartItems.appendChild(row);
  });

  els.cartTotal.textContent = formatCurrency(total);
  els.cartCount.forEach((count) => {
    count.textContent = totalQty;
  });
}

function openCart() {
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  els.cartDrawer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function sendQuote() {
  if (state.cart.length === 0) {
    els.emptyCart.textContent = "Agrega al menos un producto antes de enviar la cotizacion.";
    els.emptyCart.classList.remove("is-hidden");
    window.setTimeout(() => {
      els.emptyCart.textContent = "Todavia no agregaste productos.";
      renderCart();
    }, 2400);
    return;
  }

  let message = "Hola, quisiera cotizar estos productos:\n\n";
  let total = 0;

  state.cart.forEach((item) => {
    const product = state.products.find((candidate) => candidate.id === item.id);
    if (!product) return;
    const unitPrice = effectivePrice(product);
    const subtotal = unitPrice * item.qty;
    total += subtotal;
    message += `- ${product.name} x${item.qty}: ${formatCurrency(subtotal)}\n`;
  });

  message += `\nTotal estimado: ${formatCurrency(total)}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function handleSpecialOrder(event) {
  event.preventDefault();
  const item = els.specialItem.value.trim();
  const details = els.specialDetails.value.trim();
  if (!item) return;

  let message = `Hola, busco este producto bajo encargo:\n\n- ${item}`;
  if (details) message += `\nDetalles: ${details}`;
  message += "\n\nMe gustaria saber disponibilidad y precio.";

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  els.specialOrderForm.reset();
}

// ─── EVENTOS ────────────────────────────────────────────────────────────
function bindEvents() {
  els.adminToggleBtn.addEventListener("click", () => toggleAdminArea());
  els.loginForm.addEventListener("submit", handleLogin);
  els.logoutBtn.addEventListener("click", handleLogout);

  els.searchInput.addEventListener("input", () => {
    state.filters.search = els.searchInput.value;
    renderProductGrid();
  });

  els.categoryFilter.addEventListener("change", () => {
    state.filters.category = els.categoryFilter.value;
    renderProductGrid();
  });

  if (els.brandFilter) {
    els.brandFilter.addEventListener("change", () => {
      state.filters.brand = els.brandFilter.value;
      renderProductGrid();
    });
  }

  els.sortProducts.addEventListener("change", () => {
    state.filters.sort = els.sortProducts.value;
    renderProductGrid();
  });

  if (els.favToggleBtn) {
    els.favToggleBtn.addEventListener("click", () => {
      state.filters.onlyFavorites = !state.filters.onlyFavorites;
      els.favToggleBtn.classList.toggle("is-active", state.filters.onlyFavorites);
      els.favToggleBtn.setAttribute("aria-pressed", String(state.filters.onlyFavorites));
      renderProductGrid();
    });
  }

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener("click", toggleTheme);
  }

  els.productGrid.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    const favButton = event.target.closest("[data-fav]");
    const zoomTarget = event.target.closest("[data-zoom-open]");

    if (favButton) {
      event.stopPropagation();
      toggleFavorite(favButton.dataset.fav);
      return;
    }
    if (addButton) {
      addToCart(addButton.dataset.add);
      return;
    }
    if (zoomTarget) {
      openZoom(zoomTarget.dataset.zoomOpen);
    }
  });

  els.productTable.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) {
      const product = state.products.find((item) => item.id === editButton.dataset.edit);
      if (product) fillForm(product);
    }
    if (deleteButton) deleteProduct(deleteButton.dataset.delete);
  });

  els.productImageFile.addEventListener("change", handleImageFileChange);
  els.productForm.addEventListener("submit", handleProductSubmit);
  els.resetFormBtn.addEventListener("click", resetForm);
  els.productSale.addEventListener("change", handleSaleToggle);

  if (els.productName) {
    els.productName.addEventListener("keyup", () => {
      if (els.productBrand.value.trim()) return;
      const result = detectProduct(els.productName.value || "");
      if (result.brand) els.productBrand.value = result.brand;
      if (result.category && !els.productCategory.value.trim()) els.productCategory.value = result.category;
    });
  }

  els.specialOrderForm.addEventListener("submit", handleSpecialOrder);

  document.querySelectorAll("[data-open-cart]").forEach((button) => {
    button.addEventListener("click", openCart);
  });

  document.querySelectorAll("[data-close-cart]").forEach((button) => {
    button.addEventListener("click", closeCart);
  });

  els.cartItems.addEventListener("click", (event) => {
    const up = event.target.closest("[data-qty-up]");
    const down = event.target.closest("[data-qty-down]");
    const remove = event.target.closest("[data-remove]");

    if (up) updateQty(up.dataset.qtyUp, 1);
    if (down) updateQty(down.dataset.qtyDown, -1);
    if (remove) {
      state.cart = state.cart.filter((item) => item.id !== remove.dataset.remove);
      renderCart();
    }
  });

  els.clearCartBtn.addEventListener("click", () => {
    if (state.cart.length === 0) return;
    if (window.confirm("Vaciar toda la cotizacion?")) {
      state.cart = [];
      renderCart();
    }
  });

  els.sendQuoteBtn.addEventListener("click", sendQuote);

  els.menuToggleBtn.addEventListener("click", () => {
    const isOpen = els.mainNav.classList.toggle("open");
    els.menuToggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  if (els.zoomModal) {
    els.zoomModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-zoom-close]")) closeZoom();
      if (event.target.closest("[data-zoom-next]")) zoomNav(1);
      if (event.target.closest("[data-zoom-prev]")) zoomNav(-1);
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      closeZoom();
    }
    if (els.zoomModal && els.zoomModal.getAttribute("aria-hidden") === "false") {
      if (event.key === "ArrowRight") zoomNav(1);
      if (event.key === "ArrowLeft") zoomNav(-1);
    }
  });
}

// ─── INICIO ───────────────────────────────────────────────────────────
async function init() {
  els.floatWa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quisiera mas informacion sobre sus productos.")}`;
  applyTheme(loadTheme());
  bindEvents();
  populateCategoryFilter();
  populateBrandFilter();
  renderProductGrid();
  renderCart();
  syncAdminVisibility();

  try {
    await seedIfEmpty();
    startListening();
  } catch (error) {
    console.error("Error al iniciar Firebase:", error);
    setFirebaseStatus("Error de conexion. Verifica la configuracion de Firebase.", "error");
  }
}

init();
