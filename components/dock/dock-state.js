// components/dock/dock-state.js

function applyDockState(authed) {
  const buttons = document.querySelectorAll("[data-dock-btn]");
  buttons.forEach((btn) => {
    btn.toggleAttribute("disabled", !authed);
    btn.classList.toggle("dock--disabled", !authed);
    btn.classList.toggle("dock--active", authed);
  });
}

// Responde a cambios de auth
window.addEventListener("btr:auth:changed", (e) => {
  applyDockState(!!e.detail?.authed);
});

// Inicial (por si el HTML se pinta antes del evento)
document.addEventListener("DOMContentLoaded", () => {
  // si quieres, intenta leer un flag guardado o deja gris por defecto
  applyDockState(false);
});
