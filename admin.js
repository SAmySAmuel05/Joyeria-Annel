/**
 * Panel de administración - Login con Firebase Auth y subida de productos
 * Usa Firebase SDK v10 modular (Auth + Firestore + Storage)
 */
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

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
const msgEl = document.getElementById('admin-msg');

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
});

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

  if (!nombre || !precio || !categoria) {
    showMsg(msgEl, 'Completa nombre, precio y categoría.', 'error');
    return;
  }
  if (!file || !file.type.startsWith('image/')) {
    showMsg(msgEl, 'Selecciona una imagen válida.', 'error');
    return;
  }

  btnSubmit.disabled = true;
  hideMsg(msgEl);

  try {
    const filename = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
    const storageRef = ref(storage, `productos/${filename}`);
    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, 'productos'), {
      nombre,
      descripcion,
      precio,
      imageUrl,
      categoria,
      createdAt: new Date()
    });

    showMsg(msgEl, 'Producto subido correctamente. El catálogo se actualizará al recargar.');
    form.reset();
    fileInput.value = '';
  } catch (err) {
    console.error(err);
    showMsg(msgEl, 'Error al subir: ' + (err.message || 'Revisa la consola y tu configuración de Firebase.'), 'error');
  } finally {
    btnSubmit.disabled = false;
  }
});
