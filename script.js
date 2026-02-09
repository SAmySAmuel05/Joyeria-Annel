// Header scroll effect
const header = document.querySelector('.header');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

// Carrito
let cartCount = 0;
const cartCountEl = document.querySelector('.cart-count');
document.querySelectorAll('.product-card .btn-small').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    cartCount++;
    if (cartCountEl) cartCountEl.textContent = cartCount;
  });
});

// Formulario de contacto
const form = document.querySelector('.contact-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Gracias por tu mensaje. Te responderemos pronto.');
    form.reset();
  });
}
