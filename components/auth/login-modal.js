// beterano-web-chrome/components/auth/login-modal.js
(function () {
  const CDN_APP  = "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
  const CDN_AUTH = "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

  const isLocal    = location.hostname === "localhost";
  const chromeRoot = (typeof window !== "undefined" && window.__BTR_CHROME_ROOT__)
    ? window.__BTR_CHROME_ROOT__
    : (isLocal ? "" : "https://beteranomotors.github.io/chrome");
  const u = (p) => (isLocal ? p : `${chromeRoot}${p}`);

  const RTL_LANGS = new Set(["ar"]);

  function makeI18n(langArg) {
    const lang = (langArg || document.documentElement.lang || "es").slice(0,2).toLowerCase();
    const dict = {
      es:{title:"Iniciar sesión", google:"Google", email:"Email",
          emailPh:"Email", passPh:"Contraseña", login:"Entrar", signup:"Crear cuenta",
          note:"Usamos cookies de sesión de Firebase Auth.",
          errRequired:"Email y contraseña son obligatorios.",
          errGeneric:"No se pudo completar la operación."},
      en:{title:"Sign in", google:"Google", email:"Email",
          emailPh:"Email", passPh:"Password", login:"Sign in", signup:"Create account",
          note:"We use Firebase Auth session cookies.",
          errRequired:"Email and password are required.",
          errGeneric:"Operation failed."},
      de:{title:"Anmelden", google:"Google", email:"E-Mail",
          emailPh:"E-Mail", passPh:"Passwort", login:"Anmelden", signup:"Konto erstellen",
          note:"Wir verwenden Firebase Auth-Sitzungscookies.",
          errRequired:"E-Mail und Passwort sind erforderlich.",
          errGeneric:"Vorgang fehlgeschlagen."},
      fr:{title:"Se connecter", google:"Google", email:"Email",
          emailPh:"Email", passPh:"Mot de passe", login:"Entrer", signup:"Créer un compte",
          note:"Nous utilisons des cookies de session Firebase Auth.",
          errRequired:"Email et mot de passe requis.",
          errGeneric:"Échec de l’opération."},
      it:{title:"Accedi", google:"Google", email:"Email",
          emailPh:"Email", passPh:"Password", login:"Accedi", signup:"Crea account",
          note:"Usiamo cookie di sessione di Firebase Auth.",
          errRequired:"Email e password sono obbligatori.",
          errGeneric:"Operazione non riuscita."},
      nl:{title:"Inloggen", google:"Google", email:"E-mail",
          emailPh:"E-mail", passPh:"Wachtwoord", login:"Inloggen", signup:"Account maken",
          note:"We gebruiken Firebase Auth sessie-cookies.",
          errRequired:"E-mail en wachtwoord vereist.",
          errGeneric:"Bewerking mislukt."},
      pl:{title:"Zaloguj się", google:"Google", email:"E-mail",
          emailPh:"E-mail", passPh:"Hasło", login:"Zaloguj", signup:"Utwórz konto",
          note:"Używamy ciasteczek sesji Firebase Auth.",
          errRequired:"Wymagane e-mail i hasło.",
          errGeneric:"Operacja nie powiodła się."},
      hr:{title:"Prijava", google:"Google", email:"E-pošta",
          emailPh:"E-pošta", passPh:"Lozinka", login:"Prijava", signup:"Stvori račun",
          note:"Koristimo kolačiće sesije Firebase Auth.",
          errRequired:"E-pošta i lozinka su obavezni.",
          errGeneric:"Operacija nije uspjela."},
      ja:{title:"ログイン", google:"Google", email:"メール",
          emailPh:"メール", passPh:"パスワード", login:"ログイン", signup:"アカウント作成",
          note:"Firebase Auth のセッション Cookie を使用します。",
          errRequired:"メールとパスワードは必須です。",
          errGeneric:"操作に失敗しました。"},
      zh:{title:"登录", google:"Google", email:"邮箱",
          emailPh:"邮箱", passPh:"密码", login:"登录", signup:"创建账户",
          note:"我们使用 Firebase Auth 会话 Cookie。",
          errRequired:"邮箱和密码为必填项。",
          errGeneric:"操作失败。"},
      ar:{title:"تسجيل الدخول", google:"Google", email:"البريد الإلكتروني",
          emailPh:"البريد الإلكتروني", passPh:"كلمة المرور", login:"تسجيل الدخول", signup:"إنشاء حساب",
          note:"نستخدم ملفات تعريف الارتباط لجلسات Firebase Auth.",
          errRequired:"البريد الإلكتروني وكلمة المرور مطلوبان.",
          errGeneric:"فشلت العملية."}
    };
    return dict[lang] || dict.es;
  }

  let t = makeI18n();

  window.BTR_AUTH = window.BTR_AUTH || {};
  window.BTR_AUTH.mountLoginModal = mountLoginModal;
  window.BTR_AUTH.setLang = function(lang) {
    try { window.dispatchEvent(new CustomEvent("btr:langchange", { detail: { lang } })); } catch {}
  };

  async function ensureStyles() {
    if (document.querySelector('link[data-btr-auth-style="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = u("/components/auth/login_modal.css") + "?" + Math.floor(Date.now()/3600000);
    link.dataset.btrAuthStyle = "1";
    document.head.appendChild(link);
  }

  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function ui() {
    const backdrop = el(`
      <div class="btr-auth__backdrop" role="dialog" aria-modal="true" aria-label="${t.title}">
        <div class="btr-auth__modal" role="document">
          <div class="btr-auth__head">
            <div class="btr-auth__title" data-i18n="title">${t.title}</div>
            <button class="btr-auth__close" aria-label="Close">✕</button>
          </div>

          <div class="btr-auth__tabs">
            <button class="btr-auth__tab is-active" data-tab="google" data-i18n="google">${t.google}</button>
            <button class="btr-auth__tab" data-tab="email" data-i18n="email">${t.email}</button>
          </div>

          <div class="btr-auth__panel is-active" data-panel="google">
            <div class="btr-auth__row"><button class="btr-auth__btn" data-google data-i18n="google">${t.google}</button></div>
          </div>

          <div class="btr-auth__panel" data-panel="email">
            <div class="btr-auth__form">
              <input class="btr-auth__input" type="email" placeholder="${t.emailPh}" data-email data-i18n-ph="emailPh" />
              <input class="btr-auth__input" type="password" placeholder="${t.passPh}"  data-pass  data-i18n-ph="passPh" />
              <div class="btr-auth__row">
                <button class="btr-auth__btn"            data-login data-i18n="login">${t.login}</button>
                <button class="btr-auth__btn--secondary" data-signup data-i18n="signup">${t.signup}</button>
              </div>
            </div>
            <div class="btr-auth__error" data-error></div>
          </div>

          <p class="btr-auth__note" data-i18n="note">${t.note}</p>
        </div>
      </div>
    `);

    // RTL por idioma
    const setDir = (lng) => {
      const l = (lng || document.documentElement.lang || "es").slice(0,2).toLowerCase();
      backdrop.dir = RTL_LANGS.has(l) ? "rtl" : "ltr";
    };
    setDir();

    // tabs
    const tabs = backdrop.querySelectorAll(".btr-auth__tab");
    tabs.forEach(tb => tb.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("is-active"));
      tb.classList.add("is-active");
      const sel = tb.dataset.tab;
      backdrop.querySelectorAll(".btr-auth__panel").forEach(p => {
        p.classList.toggle("is-active", p.dataset.panel === sel);
      });
    }));

    // close
    const close = () => {
      backdrop.classList.remove("is-open");
      setTimeout(() => {
        backdrop.remove();
        window.__BTR_LOGIN_OPEN__ = false;
        document.removeEventListener("keydown", onEsc);
        window.removeEventListener("btr:langchange", onLang);
      }, 120);
    };
    const onEsc = (e) => (e.key === "Escape") && close();
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
    backdrop.querySelector(".btr-auth__close").addEventListener("click", close);
    document.addEventListener("keydown", onEsc);

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("is-open"));

    // i18n dinámico
    const applyI18n = (langForce) => {
      t = makeI18n(langForce);
      setDir(langForce);
      backdrop.querySelectorAll("[data-i18n]").forEach(n => {
        const key = n.getAttribute("data-i18n");
        if (key && t[key]) n.textContent = t[key];
      });
      backdrop.querySelectorAll("[data-i18n-ph]").forEach(n => {
        const key = n.getAttribute("data-i18n-ph");
        if (key && t[key]) n.setAttribute("placeholder", t[key]);
      });
    };
    const onLang = (e) => {
      const next = (e?.detail?.lang || "").slice(0,2).toLowerCase();
      applyI18n(next || undefined);
    };
    window.addEventListener("btr:langchange", onLang);

    return {
      root: backdrop,
      googleBtn: backdrop.querySelector("[data-google]"),
      loginBtn:  backdrop.querySelector("[data-login]"),
      signupBtn: backdrop.querySelector("[data-signup]"),
      emailEl:   backdrop.querySelector("[data-email]"),
      passEl:    backdrop.querySelector("[data-pass]"),
      errorEl:   backdrop.querySelector("[data-error]"),
      close,
      applyI18n
    };
  }

  async function ensureFirebase() {
    try {
      const store = await import(u("/stores/authStore.js")).catch(() => null);
      if (store?.authStore) return { kind: "store", store: store.authStore };
    } catch {}

    const appMod  = await import(/* @vite-ignore */ CDN_APP);
    const authMod = await import(/* @vite-ignore */ CDN_AUTH);

    const cfg =
      (window.__BTR_CONFIG__ && window.__BTR_CONFIG__.firebase) ||
      {
        apiKey:        window.BTR_FIREBASE_API_KEY,
        authDomain:    window.BTR_FIREBASE_AUTH_DOMAIN,
        projectId:     window.BTR_FIREBASE_PROJECT_ID,
        appId:         window.BTR_FIREBASE_APP_ID,
        storageBucket: window.BTR_FIREBASE_STORAGE_BUCKET
      } ||
      {};

    if (!cfg || !cfg.apiKey) throw new Error("Missing Firebase config");

    const app  = appMod.initializeApp(cfg);
    const auth = authMod.getAuth(app);
    const { GoogleAuthProvider, signInWithPopup,
            signInWithEmailAndPassword, createUserWithEmailAndPassword } = authMod;

    try {
      const langNow = (document.documentElement.lang || "es").slice(0,2).toLowerCase();
      auth.languageCode = langNow;
      window.addEventListener("btr:langchange", (e) => {
        const next = (e?.detail?.lang || "es").slice(0,2).toLowerCase();
        auth.languageCode = next;
      });
    } catch {}

    window.__FIREBASE_AUTH__ = auth;

    return {
      kind: "sdk",
      auth,
      GoogleAuthProvider,
      signInWithPopup,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword
    };
  }

  async function mountLoginModal() {
    if (window.__BTR_LOGIN_OPEN__) return;
    window.__BTR_LOGIN_OPEN__ = true;

    await ensureStyles();
    const $ = ui();

    // idioma actual
    $.applyI18n((document.documentElement.lang || "es").slice(0,2).toLowerCase());

    let provider, fb;
    try {
      fb = await ensureFirebase();
      if (fb.kind === "store") {
        // asegurar init del store si no estaba
        try { fb.store.init?.(); } catch {}
      }
      if (fb.kind === "sdk") provider = new fb.GoogleAuthProvider();
    } catch (e) {
      $.errorEl.textContent = e?.message || "Auth init error";
    }

    $.googleBtn.addEventListener("click", async () => {
      try {
        if (fb.kind === "store" && fb.store?.signInWithGoogle) {
          await fb.store.signInWithGoogle();
        } else if (fb.kind === "sdk") {
          await fb.signInWithPopup(fb.auth, provider);
        } else {
          throw new Error("Google login not available");
        }
        $.close();
      } catch (e) {
        $.errorEl.textContent = e?.message || (makeI18n().errGeneric);
      }
    });

    async function emailLoginOrSignup(doSignup = false) {
      const email = $.emailEl.value.trim();
      const pass  = $.passEl.value;
      if (!email || !pass) { $.errorEl.textContent = makeI18n().errRequired; return; }

      try {
        if (fb.kind === "store") {
          if (doSignup && fb.store?.signUpWithEmail) {
            await fb.store.signUpWithEmail(email, pass);
          } else if (fb.store?.signInWithEmail) {
            await fb.store.signInWithEmail(email, pass);
          } else {
            throw new Error("Email auth not available");
          }
        } else if (fb.kind === "sdk") {
          if (doSignup) {
            await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
          } else {
            await fb.signInWithEmailAndPassword(fb.auth, email, pass);
          }
        } else {
          throw new Error("Auth not initialized");
        }
        $.close();
      } catch (e) {
        $.errorEl.textContent = e?.message || (makeI18n().errGeneric);
      }
    }

    $.loginBtn.addEventListener("click", () => emailLoginOrSignup(false));
    $.signupBtn.addEventListener("click", () => emailLoginOrSignup(true));
  }

  // Permitir abrir modal desde cualquier parte del shell
  window.addEventListener("btr:open-login", () => {
    try { mountLoginModal(); } catch {}
  });

  try { if (typeof module !== "undefined") { module.exports = { mountLoginModal }; } } catch (_) {}
})();
