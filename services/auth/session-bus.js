// services/auth/session-bus.js
import { AuthAPI } from "./firebaseClient.js";

const listeners = new Set();

export function onAuthChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function publish(state) {
  listeners.forEach((cb) => cb(state));
  window.dispatchEvent(new CustomEvent("btr:auth:changed", { detail: state }));
}

// Suscríbete al cambio de token/usuario
AuthAPI.onIdToken((user, token, tokenResult) => {
  const authed = !!user;
  publish({ authed, user, token, tokenResult });
});

// Helper actual
export function currentUser() {
  return AuthAPI.auth.currentUser;
}
