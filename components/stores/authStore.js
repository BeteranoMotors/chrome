// beterano-web-chrome/components/stores/authStore.js
import { AuthAPI } from "/services/auth/firebaseClient.js";
import { emitAuth } from "/services/auth/session-bus.js";

const LS = "btr_auth_cache_v1";

let state = {
  user: null,
  idToken: null,
  claims: {},
  expiresAt: null,
  isReady: false,
};

try {
  const raw = localStorage.getItem(LS);
  if (raw) state = { ...state, ...JSON.parse(raw) };
} catch {}

let timer = null;
const now = () => Date.now();
function save() {
  try {
    localStorage.setItem(LS, JSON.stringify(state));
  } catch {}
}

function setBodyModeFromClaims(claims) {
  const isSubscriber = !!(claims && claims.subscriber);
  document.body.classList.toggle("btr-subscriber", isSubscriber);
  document.body.classList.toggle("btr-guest", !isSubscriber);
  // Exponer snapshot para otros módulos (dock, header…)
  window.__BTR_AUTH__ = {
    user: state.user,
    claims: state.claims,
    isSubscriber,
    idToken: state.idToken,
  };
  // Evento estándar cross-app
  try {
    document.dispatchEvent(
      new CustomEvent("btr:auth", {
        detail: { user: state.user, claims: state.claims },
      })
    );
  } catch {}
}

function scheduleRefresh() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!state.expiresAt) return;
  const ms = Math.max(120000, state.expiresAt - now() - 120000);
  timer = setTimeout(async () => {
    const r = await AuthAPI.refreshToken();
    if (!r) return;
    const expiresAt = r.result?.expirationTime
      ? new Date(r.result.expirationTime).getTime()
      : null;
    state = {
      user: r.user
        ? {
            uid: r.user.uid,
            displayName: r.user.displayName,
            email: r.user.email,
            photoURL: r.user.photoURL,
          }
        : null,
      idToken: r.token || null,
      claims: r.result?.claims || {},
      expiresAt,
      isReady: true,
    };
    save();
    emitAuth(state);
    setBodyModeFromClaims(state.claims);
    scheduleRefresh();
  }, ms);
}

export const authStore = {
  init() {
    // señal temprana (no bloqueante)
    emitAuth({ ...state, isReady: false });

    AuthAPI.onIdToken((user, token, res) => {
      const expiresAt = res?.expirationTime
        ? new Date(res.expirationTime).getTime()
        : null;
      state = {
        user: user
          ? {
              uid: user.uid,
              displayName: user.displayName,
              email: user.email,
              photoURL: user.photoURL,
            }
          : null,
        idToken: token || null,
        claims: res?.claims || {},
        expiresAt,
        isReady: true,
      };
      save();
      emitAuth(state);
      setBodyModeFromClaims(state.claims);
      scheduleRefresh();
    });

    // Aplica estado inicial si había cache
    setBodyModeFromClaims(state.claims || {});
  },
  get() {
    return state;
  },
  logout() {
    return AuthAPI.signOut();
  },
};

// Exponer por si otros módulos quieren inicializar manualmente
try {
  window.__BTR_STORES__ = window.__BTR_STORES__ || {};
  window.__BTR_STORES__.authStore = authStore;
} catch {}
