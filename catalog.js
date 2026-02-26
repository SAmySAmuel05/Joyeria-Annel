/**
 * Catálogo dinámico desde Firestore - Marara Joyería
 * Carga productos de la colección "productos" y los muestra en las rejillas por categoría.
 * Actualización en tiempo real con onSnapshot.
 */
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CATEGORY_PLACEHOLDER = {
  anillos: '◆',
  collares: '◇',
  pendientes: '○',
  pulseras: '▣',
  arracadas: '○',
  dijes: '◆',
  cadenas: '◇',
  broqueles: '◆'
};

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderProductCard(product, category) {
  const symbol = CATEGORY_PLACEHOLDER[category] || '◆';
  const nombre = escapeHtml(product.nombre);
  const descripcion = escapeHtml(product.descripcion || '');
  const precio = escapeHtml(product.precio || '');
  const imageUrl = product.imageUrl || '';
  const alt = escapeHtml(product.nombre);

  return `
    <article class="product-card product-available">
      <div class="product-image">
        <div class="product-placeholder" aria-hidden="true">${symbol}</div>
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${alt}" onerror="this.style.display='none'">` : ''}
      </div>
      <div class="product-info">
        <h3>${nombre}</h3>
        <p class="product-desc">${descripcion}</p>
        <p class="product-price">${precio}</p>
        <div class="product-actions" data-product-actions></div>
      </div>
    </article>
  `;
}

function renderLoading() {
  return '<p class="catalog-loading" style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Cargando catálogo…</p>';
}

function renderEmpty(category) {
  const labels = { anillos: 'anillos', collares: 'collares', pendientes: 'pendientes', pulseras: 'pulseras', arracadas: 'arracadas', dijes: 'dijes', cadenas: 'cadenas', broqueles: 'broqueles de plata' };
  const label = labels[category] || category;
  return '<p class="catalog-empty" style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">Aún no hay productos en ' + escapeHtml(label) + '.</p>';
}

function paintGrids(products) {
  const grids = document.querySelectorAll('.products-grid[data-category]');
  grids.forEach((grid) => {
    const category = grid.dataset.category;
    let list = (products || []).filter((p) => (p.categoria || '') === category);
    const limit = grid.dataset.limit ? parseInt(grid.dataset.limit, 10) : 0;
    if (limit > 0) list = list.slice(0, limit);
    if (list.length === 0) {
      grid.innerHTML = renderEmpty(category);
      return;
    }
    grid.innerHTML = list.map((p) => renderProductCard(p, category)).join('');
  });

  if (typeof window.initProductCards === 'function') {
    window.initProductCards();
  }
}

function initCatalog() {
  const grids = document.querySelectorAll('.products-grid[data-category]');
  if (!grids.length) return;

  grids.forEach((grid) => {
    grid.innerHTML = renderLoading();
  });

  onSnapshot(
    collection(db, 'productos'),
    (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenar por createdAt (más recientes primero) si existe
      products.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      paintGrids(products);
    },
    (err) => {
      console.error('Error Firestore:', err);
      grids.forEach((grid) => {
        grid.innerHTML = '<p class="catalog-error" style="grid-column:1/-1;text-align:center;color:#b71c1c;padding:2rem;">No se pudo cargar el catálogo. Revisa la consola y tu configuración de Firebase.</p>';
      });
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatalog);
} else {
  initCatalog();
}
