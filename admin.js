/**
 * Panel de administración - Login con Firebase Auth y subida de productos
 * Usa Firebase SDK v10 modular (Auth + Firestore + Storage)
 */
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const loadingEl = document.getElementById('admin-loading');
const loginPanel = document.getElementById('admin-login-panel');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginMsg = document.getElementById('login-msg');
const btnLogout = document.getElementById('btn-logout');
const form = document.getElementById('admin-form');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const msgEl = document.getElementById('admin-msg');
const productListEl = document.getElementById('admin-product-list');

let editingProductId = null;
let editingImageUrl = '';
let productsCache = [];

function showMsg(el, text, type = 'success') {
  el.textContent = text;
  el.className = 'admin-msg ' + type;
}

function hideMsg(el) {
  el.className = 'admin-msg';
  el.textContent = '';
}

function setPanelVisibility(user) {
  loadingEl.style.display = 'none';
  if (user) {
    loginPanel.classList.remove('visible');
    adminPanel.classList.add('visible');
    hideMsg(loginMsg);
  } else {
    loginPanel.classList.add('visible');
    adminPanel.classList.remove('visible');
  }
}

function updateFormModeUI() {
  const isEditing = Boolean(editingProductId);
  btnSubmit.textContent = isEditing ? 'Guardar Cambios' : 'Subir producto';
  if (btnCancelEdit) {
    btnCancelEdit.classList.toggle('visible', isEditing);
  }
  if (form?.imagen) {
    form.imagen.required = !isEditing;
  }
}

function renderProductsList() {
  if (!productListEl) return;

  productListEl.innerHTML = '';
  if (!productsCache.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-product-empty';
    empty.textContent = 'No hay productos cargados en Firestore.';
    productListEl.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  productsCache.forEach((product) => {
    const item = document.createElement('div');
    item.className = 'admin-product-item';
    if (product.id === editingProductId) {
      item.classList.add('is-editing');
    }

    const name = document.createElement('p');
    name.className = 'admin-product-name';
    name.textContent = product.nombre || 'Producto sin nombre';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'admin-product-edit';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      editingProductId = product.id;
      editingImageUrl = product.imageUrl || '';
      form.nombre.value = product.nombre || '';
      form.descripcion.value = product.descripcion || '';
      form.precio.value = product.precio || '';
      form.categoria.value = product.categoria || '';
      if (form.imagen) {
        form.imagen.value = '';
      }
      hideMsg(msgEl);
      updateFormModeUI();
      renderProductsList();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'admin-product-delete';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => {
      deleteProduct(product, editBtn, deleteBtn);
    });

    const actions = document.createElement('div');
    actions.className = 'admin-product-actions';
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(name);
    item.appendChild(actions);
    fragment.appendChild(item);
  });

  productListEl.appendChild(fragment);
}

async function loadProductsList() {
  if (!productListEl) return;

  productListEl.innerHTML = '<p class="admin-product-empty">Cargando productos…</p>';

  try {
    const snapshot = await getDocs(collection(db, 'productos'));
    productsCache = snapshot.docs.map((productDoc) => ({
      id: productDoc.id,
      ...productDoc.data()
    }));

    productsCache.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    if (editingProductId && !productsCache.some((product) => product.id === editingProductId)) {
      editingProductId = null;
      editingImageUrl = '';
      updateFormModeUI();
    }

    renderProductsList();
  } catch (err) {
    console.error('Error al cargar productos:', err);
    productListEl.innerHTML = '<p class="admin-product-empty">No se pudo cargar la lista de productos.</p>';
  }
}

function clearEditMode(resetForm = false) {
  editingProductId = null;
  editingImageUrl = '';
  if (resetForm) {
    form.reset();
    if (form.imagen) {
      form.imagen.value = '';
    }
  }
  updateFormModeUI();
  renderProductsList();
}

async function deleteProduct(product, editBtn, deleteBtn) {
  if (!auth.currentUser) {
    showMsg(msgEl, 'Debes iniciar sesión para eliminar productos.', 'error');
    return;
  }

  const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este producto? Esta acción no se puede deshacer');
  if (!confirmed) return;

  editBtn.disabled = true;
  deleteBtn.disabled = true;
  hideMsg(msgEl);

  try {
    if (product?.imageUrl) {
      try {
        const imageRef = ref(storage, product.imageUrl);
        await deleteObject(imageRef);
      } catch (imageErr) {
        const code = imageErr?.code || '';
        if (code !== 'storage/object-not-found') {
          throw imageErr;
        }
      }
    }

    await deleteDoc(doc(db, 'productos', product.id));

    productsCache = productsCache.filter((item) => item.id !== product.id);
    if (editingProductId === product.id) {
      clearEditMode(true);
    } else {
      renderProductsList();
    }

    showMsg(msgEl, 'Producto eliminado con éxito');
    await loadProductsList();
  } catch (err) {
    console.error(err);
    showMsg(msgEl, 'Error al eliminar: ' + (err.message || 'No se pudo eliminar el producto.'), 'error');
    editBtn.disabled = false;
    deleteBtn.disabled = false;
  }
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    showMsg(loginMsg, 'Indica email y contraseña.', 'error');
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  hideMsg(loginMsg);

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    btn.disabled = false;
    const code = err.code || '';
    let text = 'Error al iniciar sesión.';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      text = 'Correo o contraseña incorrectos.';
    } else if (code === 'auth/invalid-email') {
      text = 'Correo electrónico no válido.';
    } else if (code === 'auth/too-many-requests') {
      text = 'Demasiados intentos. Espera un poco e inténtalo de nuevo.';
    } else if (err.message) {
      text = err.message;
    }
    showMsg(loginMsg, text, 'error');
  }
});

// Logout
btnLogout.addEventListener('click', () => {
  signOut(auth);
});

// Estado de autenticación: mostrar login o panel de subida
onAuthStateChanged(auth, (user) => {
  setPanelVisibility(user);
  const btn = document.getElementById('btn-login');
  if (btn) btn.disabled = false;

  if (user) {
    loadProductsList();
  } else {
    productsCache = [];
    clearEditMode(true);
    if (productListEl) {
      productListEl.innerHTML = '<p class="admin-product-empty">Inicia sesión para gestionar productos.</p>';
    }
    hideMsg(msgEl);
  }
});

if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', () => {
    clearEditMode(true);
    hideMsg(msgEl);
  });
}

updateFormModeUI();

// Subida de productos (solo si hay sesión)
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!auth.currentUser) {
    showMsg(msgEl, 'Debes iniciar sesión para subir productos.', 'error');
    return;
  }

  const nombre = form.nombre.value.trim();
  const descripcion = form.descripcion.value.trim();
  const precio = form.precio.value.trim();
  const categoria = form.categoria.value;
  const fileInput = form.imagen;
  const file = fileInput?.files?.[0];
  const isEditing = Boolean(editingProductId);

  if (!nombre || !precio || !categoria) {
    showMsg(msgEl, 'Completa nombre, precio y categoría.', 'error');
    return;
  }

  if (!isEditing && (!file || !file.type.startsWith('image/'))) {
    showMsg(msgEl, 'Selecciona una imagen válida.', 'error');
    return;
  }
  if (file && !file.type.startsWith('image/')) {
    showMsg(msgEl, 'Selecciona una imagen válida.', 'error');
    return;
  }

  btnSubmit.disabled = true;
  if (btnCancelEdit) btnCancelEdit.disabled = true;
  hideMsg(msgEl);

  try {
    let imageUrl = editingImageUrl;

    if (file) {
      const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const storageRef = ref(storage, `productos/${filename}`);
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }

    if (isEditing) {
      await updateDoc(doc(db, 'productos', editingProductId), {
        nombre,
        descripcion,
        precio,
        imageUrl: imageUrl || '',
        categoria,
        updatedAt: new Date()
      });
      showMsg(msgEl, 'Producto actualizado correctamente.');
    } else {
      await addDoc(collection(db, 'productos'), {
        nombre,
        descripcion,
        precio,
        imageUrl: imageUrl || '',
        categoria,
        createdAt: new Date()
      });
      showMsg(msgEl, 'Producto subido correctamente.');
    }

    clearEditMode(true);
    await loadProductsList();
  } catch (err) {
    console.error(err);
    showMsg(msgEl, 'Error al guardar: ' + (err.message || 'Revisa la consola y tu configuración de Firebase.'), 'error');
  } finally {
    btnSubmit.disabled = false;
    if (btnCancelEdit) btnCancelEdit.disabled = false;
  }
});
