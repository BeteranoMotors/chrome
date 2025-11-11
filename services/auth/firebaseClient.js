// Inicializa Firebase y expone helpers de auth (popup/email)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onIdTokenChanged, signOut, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Si luego quieres usar Firestore/Storage y emuladores, descomenta:
// import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// import { getStorage, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

let app = null;
let emuWired = false;

function ensureApp() {
  if (!app) {
    const cfg = (window.__BTR_CONFIG__ && window.__BTR_CONFIG__.firebase) || null;
    if (!cfg) throw new Error("Falta __BTR_CONFIG__.firebase (cárgala en header-loader.js).");
    app = getApps().length ? getApps()[0] : initializeApp(cfg);
  }
  return app;
}

function useEmulators() {
  // Actívalo en local o con bandera manual
  const fromConfig = !!(window.__BTR_CONFIG__ && window.__BTR_CONFIG__.useEmulators);
  const isLocalHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  return fromConfig || isLocalHost;
}

function wireEmulatorsOnce(auth /*, db, storage */) {
  if (emuWired) return;
  if (!useEmulators()) return;

  // AUTH
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

  // FIRESTORE/STORAGE (si los usas en el front, descomenta arriba los imports)
  // connectFirestoreEmulator(db, "127.0.0.1", 8082);
  // connectStorageEmulator(storage, "127.0.0.1", 9199);

  emuWired = true;
}

export const AuthAPI = {
  get auth() {
    const app = ensureApp();
    const auth = getAuth(app);
    wireEmulatorsOnce(auth /*, getFirestore(app), getStorage(app) */);
    return auth;
  },
  async signInGooglePopup() { return signInWithPopup(this.auth, new GoogleAuthProvider()); },
  signInEmail(email, pass) { return signInWithEmailAndPassword(this.auth, email, pass); },
  registerEmail(email, pass) { return createUserWithEmailAndPassword(this.auth, email, pass); },
  onIdToken(cb) {
    return onIdTokenChanged(this.auth, async (user) => {
      if (!user) return cb(null, null, null);
      const res = await user.getIdTokenResult(true);
      cb(user, res.token, res);
    });
  },
  async refreshToken() {
    const u = this.auth.currentUser; if (!u) return null;
    const res = await u.getIdTokenResult(true);
    return { user: u, token: res.token, result: res };
  },
  signOut() { return signOut(this.auth); }
};
