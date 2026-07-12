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

// Productos base: solo se usan si la coleccion "productos" esta totalmente vacia.
// No se tocan si ya tienes datos (igual que tu sistema anterior).
const DEFAULT_PRODUCTS = [
  { nombre: "Silla Gamer Edicion Azul", desc: "Envio Gratis en Managua + Armada de silla Gratis + Garantia Garantizada + Atencion Personalizada", precio: "$125", tag: "PRO", img: "", orden: 1 },
  { nombre: "Silla Gamer Edicion Roja", desc: "Envio Gratis en Managua + Armada de silla Gratis + Garantia Garantizada + Atencion Personalizada", precio: "$125", tag: "PRO", img: "", orden: 2 },
  { nombre: "Smart TV 55\" pulgadas", desc: "Envio Gratis + Instalacion de soporteria de TV + Factura membretada + Garantia Certificada", precio: "$560", tag: "Media Gama", img: "", orden: 3 },
  { nombre: "S25 Ultra", desc: "Envio Gratis en Managua + Productos 100% Originales + Garantia Garantizada + Atencion Personalizada", precio: "$125", tag: "Media Gama", img: "", orden: 4 }
];

const state = {
  products: [],
  cart: [],
  filters: {
    search: "",
    category: "all",
    sort: "featured"
  },
  adminAuth: false,
  adminRequested: false
};

const els = {
  productGrid: document.getElementById("productGrid"),
  emptyState: document.getElementById("emptyState"),
  firebaseStatus: document.getElementById("firebaseStatus"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  sortProducts: document.getElementById("sortProducts"),
  adminToggleBtn: document.getElementById("adminToggleBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  adminLogin: document.getElementById("adminLogin"),
  loginForm: document.getElementById("loginForm"),
  adminPassword: document.getElementById("adminPassword"),
  loginBtn: document.getElementById("loginBtn"),
  loginMessage: document.getElementById("loginMessage"),
  adminSection: document.getElementById("admin"),
  productForm: document.getElementById("productForm"),
  productId: document.getElementById("productId"),
  currentImageUrl: document.getElementById("currentImageUrl"),
  currentOrden: document.getElementById("currentOrden"),
  productName: document.getElementById("productName"),
  productCategory: document.getElementById("productCategory"),
  productPrice: document.getElementById("productPrice"),
  productStock: document.getElementById("productStock"),
  productFeatured: document.getElementById("productFeatured"),
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
  specialDetails: document.getElementById("specialDetails")
};

// ─── MAPEO: documento Firestore (tus campos reales) <-> objeto de la vista ───
function normalizeProduct(docId, data) {
  return {
    id: docId,
    name: data.nombre || "",
    category: data.tag || "General",
    price: parsePrice(data.precio),
    priceLabel: data.precio || "$0",
    stock: data.stock === undefined || data.stock === null || data.stock === "" ? null : Number(data.stock),
    featured: data.destacado === true,
    imageUrl: data.img || "",
    description: data.desc || "",
    orden: Number(data.orden || 0)
  };
}

function parsePrice(precio) {
  const num = Number(String(precio || "").replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(num) ? 0 : num;
}

function formatPriceLabel(product) {
  return product.priceLabel || `$${product.price.toFixed(2)}`;
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

function imageStyle(url) {
  const safeUrl = String(url || PLACEHOLDER_IMAGE).replace(/'/g, "%27");
  return `background-image:url('${safeUrl}')`;
}

function getCategories() {
  return Array.from(new Set(state.products.map((product) => product.category).filter(Boolean)))
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

function getFilteredProducts() {
  const search = state.filters.search.trim().toLowerCase();
  let list = state.products.slice();

  if (search) {
    list = list.filter((product) => {
      const haystack = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  if (state.filters.category !== "all") {
    list = list.filter((product) => product.category === state.filters.category);
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
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div class="thumb" style="${imageStyle(product.imageUrl)}">
        ${product.featured ? '<span class="badge">Destacado</span>' : ""}
        ${outOfStock ? '<span class="badge out">Agotado</span>' : ""}
      </div>
      <div class="body">
        <span class="cat">${escapeHtml(product.category)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="meta">
          <span class="price">${formatPriceLabel(product)}</span>
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
    const row = document.createElement("div");
    row.className = "mini-row";
    row.innerHTML = `
      <div class="mini-thumb" style="${imageStyle(product.imageUrl)}"></div>
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

function refresh() {
  cleanCart();
  populateCategoryFilter();
  renderProductGrid();
  renderManagerTable();
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

  if (state.adminAuth) renderManagerTable();
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
  els.currentOrden.value = product.orden;
  els.productName.value = product.name;
  els.productCategory.value = product.category;
  els.productPrice.value = product.price;
  els.productStock.value = product.stock === null ? "" : product.stock;
  els.productFeatured.value = String(product.featured);
  els.productDescription.value = product.description;
  els.productImageFile.value = "";
  setImagePreview(product.imageUrl);
  setFormMessage(`Editando "${product.name}". Guarda para publicar los cambios.`, "");
  els.productName.focus();
}

function resetForm() {
  els.productForm.reset();
  els.productId.value = "";
  els.currentImageUrl.value = "";
  els.currentOrden.value = "";
  els.productFeatured.value = "false";
  setImagePreview("");
  setFormMessage("", "");
}

function setImagePreview(url) {
  const hasImage = Boolean(url);
  els.imagePreview.classList.toggle("is-hidden", !hasImage);
  els.imagePreview.style.backgroundImage = hasImage ? `url('${String(url).replace(/'/g, "%27")}')` : "";
}

function setFormMessage(text, type) {
  els.formMessage.textContent = text;
  els.formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

// Comprime la imagen a maximo 800px (igual que tu sistema anterior) y la
// convierte a base64, para guardarla directo en el documento sin usar Storage.
function readAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(els.currentImageUrl.value || "");
      return;
    }

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

async function handleProductSubmit(event) {
  event.preventDefault();

  if (!state.adminAuth) {
    setFormMessage("Debes iniciar sesion para guardar productos.", "error");
    return;
  }

  const nombre = els.productName.value.trim();
  const tag = els.productCategory.value.trim();
  const precioNum = Number.parseFloat(els.productPrice.value);
  const stockValue = els.productStock.value.trim();
  const desc = els.productDescription.value.trim();

  if (!nombre || !tag || !desc || Number.isNaN(precioNum) || precioNum < 0) {
    setFormMessage("Revisa los campos requeridos antes de guardar.", "error");
    return;
  }

  els.saveProductBtn.disabled = true;
  els.saveProductBtn.textContent = "Guardando...";

  try {
    const img = await readAndCompressImage(els.productImageFile.files[0]);

    const data = {
      nombre,
      desc,
      precio: `$${precioNum.toFixed(2)}`,
      tag,
      img,
      destacado: els.productFeatured.value === "true"
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
  const file = els.productImageFile.files[0];
  if (!file) {
    setImagePreview(els.currentImageUrl.value || "");
    return;
  }
  setImagePreview(URL.createObjectURL(file));
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

function renderCart() {
  els.cartItems.innerHTML = "";
  els.emptyCart.classList.toggle("is-hidden", state.cart.length > 0);

  let total = 0;
  let totalQty = 0;

  state.cart.forEach((item) => {
    const product = state.products.find((candidate) => candidate.id === item.id);
    if (!product) return;

    const subtotal = product.price * item.qty;
    total += subtotal;
    totalQty += item.qty;

    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="cart-thumb" style="${imageStyle(product.imageUrl)}"></div>
      <div class="cart-info">
        <strong>${escapeHtml(product.name)}</strong>
        <span>$${subtotal.toFixed(2)}</span>
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

  els.cartTotal.textContent = `$${total.toFixed(2)}`;
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
    const subtotal = product.price * item.qty;
    total += subtotal;
    message += `- ${product.name} x${item.qty}: $${subtotal.toFixed(2)}\n`;
  });

  message += `\nTotal estimado: $${total.toFixed(2)}`;
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

  els.sortProducts.addEventListener("change", () => {
    state.filters.sort = els.sortProducts.value;
    renderProductGrid();
  });

  els.productGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add]");
    if (button) addToCart(button.dataset.add);
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });
}

// ─── INICIO ───────────────────────────────────────────────────────────
async function init() {
  els.floatWa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quisiera mas informacion sobre sus productos.")}`;
  bindEvents();
  populateCategoryFilter();
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
