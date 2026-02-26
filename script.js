// Número de WhatsApp (México)
const WHATSAPP_NUMBER = '525561056674';
const CART_STORAGE_KEY = 'marara_cart';

// Header scroll effect
const header = document.querySelector('.header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

// --- Carrito (localStorage) ---
function getCart() {
  try {
    const data = localStorage.getItem(CART_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  updateCartCount();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(
    (i) => i.name === item.name && i.category === item.category
  );
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  setCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  setCart(cart);
}

function clearCart() {
  setCart([]);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

function updateCartCount() {
  const el = document.querySelector('.cart-count');
  if (el) el.textContent = getCartCount();
}

// --- Mensaje WhatsApp ---
function buildWhatsAppMessage(items) {
  const lines = ['Hola, me gustaría comprar los siguientes artículos de Marara Joyería:', ''];
  items.forEach((i) => {
    lines.push(`• ${i.name} (${i.category})`);
    lines.push(`  ${i.desc || ''}`);
    lines.push(`  Precio: ${i.price}`);
    lines.push(`  Cantidad: ${i.quantity}`);
    lines.push('');
  });
  return lines.join('\n');
}

function openWhatsAppWithMessage(text) {
  const encoded = encodeURIComponent(text);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank', 'noopener,noreferrer');
}

// --- Inicializar botones en productos disponibles ---
function getCategoryFromCard(card) {
  const grid = card.closest('.products-grid');
  if (grid && grid.dataset.category) return grid.dataset.category;
  const path = (window.location.pathname || '').replace(/\.html$/, '').replace(/^\//, '') || 'index';
  if (path === 'index') {
    const section = card.closest('section');
    if (section && section.id) return section.id;
  }
  const map = { anillos: 'anillos', collares: 'collares', pendientes: 'pendientes', pulseras: 'pulseras', arracadas: 'arracadas', dijes: 'dijes', cadenas: 'cadenas' };
  return map[path] || 'producto';
}

function initProductCards() {
  document.querySelectorAll('.product-card.product-available').forEach((card) => {
    const actionsEl = card.querySelector('[data-product-actions]');
    if (!actionsEl || actionsEl.innerHTML.trim()) return;

    const nameEl = card.querySelector('.product-info h3');
    const descEl = card.querySelector('.product-desc');
    const priceEl = card.querySelector('.product-price');
    const name = nameEl ? nameEl.textContent.trim() : '';
    const desc = descEl ? descEl.textContent.trim() : '';
    const price = priceEl ? priceEl.textContent.trim() : '';
    const category = getCategoryFromCard(card);

    const whatsappOne = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hola, quiero comprar:\n\nProducto: ${name}\nDescripción: ${desc}\nPrecio: ${price}\nCategoría: ${category}`
    )}`;

    actionsEl.innerHTML = `
      <button type="button" class="btn product-action-btn btn-add-cart">Agregar al carrito</button>
      <a href="${whatsappOne}" class="btn product-action-btn btn-whatsapp" target="_blank" rel="noopener noreferrer">Comprar por WhatsApp</a>
    `;

    const addBtn = actionsEl.querySelector('.btn-add-cart');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        addToCart({ name, desc, price, category });
        addBtn.textContent = 'Añadido';
        addBtn.disabled = true;
        setTimeout(() => {
          addBtn.textContent = 'Agregar al carrito';
          addBtn.disabled = false;
        }, 1500);
      });
    }
  });
}

// Expuesto para que catalog.js pueda reinicializar botones tras cargar productos desde Firestore
window.initProductCards = initProductCards;

// --- Drawer del carrito ---
function openCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  const cart = getCart();
  const listEl = drawer.querySelector('.cart-drawer-list');
  const emptyEl = drawer.querySelector('.cart-drawer-empty');
  const footerEl = drawer.querySelector('.cart-drawer-footer');
  const sendBtn = drawer.querySelector('.cart-drawer-send-whatsapp');

  if (listEl) {
    if (cart.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (footerEl) footerEl.style.display = 'none';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (footerEl) footerEl.style.display = 'block';
      listEl.innerHTML = cart
        .map(
          (item, i) => `
        <li class="cart-drawer-item">
          <div class="cart-drawer-item-info">
            <strong>${item.name}</strong>
            <span class="cart-drawer-item-meta">${item.price} × ${item.quantity}</span>
          </div>
          <button type="button" class="cart-drawer-remove" data-index="${i}" aria-label="Quitar">×</button>
        </li>
      `
        )
        .join('');
      listEl.querySelectorAll('.cart-drawer-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          removeFromCart(parseInt(btn.dataset.index, 10));
          openCartDrawer();
        });
      });
    }
  }

  if (sendBtn) {
    sendBtn.onclick = (e) => {
      e.preventDefault();
      if (cart.length === 0) return;
      openWhatsAppWithMessage(buildWhatsAppMessage(cart));
      clearCart();
      drawer.classList.remove('cart-drawer-open');
    };
  }

  drawer.classList.add('cart-drawer-open');
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  if (drawer) drawer.classList.remove('cart-drawer-open');
}

function ensureCartDrawer() {
  if (document.getElementById('cart-drawer')) return;
  const wrap = document.createElement('div');
  wrap.id = 'cart-drawer';
  wrap.className = 'cart-drawer';
  wrap.innerHTML = `
    <div class="cart-drawer-backdrop" aria-hidden="true"></div>
    <div class="cart-drawer-panel">
      <div class="cart-drawer-header">
        <h3>Tu carrito</h3>
        <button type="button" class="cart-drawer-close" aria-label="Cerrar carrito">×</button>
      </div>
      <p class="cart-drawer-empty" style="display:none;">No hay artículos. Agrega productos desde la tienda.</p>
      <ul class="cart-drawer-list"></ul>
      <div class="cart-drawer-footer" style="display:none;">
        <button type="button" class="btn btn-primary cart-drawer-send-whatsapp">Enviar por WhatsApp</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector('.cart-drawer-backdrop').addEventListener('click', closeCartDrawer);
  wrap.querySelector('.cart-drawer-close').addEventListener('click', closeCartDrawer);
}

// --- Inicio ---
function init() {
  ensureCartDrawer();
  initProductCards();
  updateCartCount();

  const cartBtn = document.querySelector('.cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', openCartDrawer);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Formulario de contacto
const form = document.querySelector('.contact-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Gracias por tu mensaje. Te responderemos pronto.');
    form.reset();
  });
}
