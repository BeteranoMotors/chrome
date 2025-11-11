// beterano-web-chrome/components/header/header-loader.js
(async function loadHeader() {
  const container = document.getElementById("header-container");
  if (!container) return;

  /* ========= Rutas/base ========= */
  const isLocal    = location.hostname === "localhost";
  const chromeRoot = isLocal ? "" : "https://beteranomotors.github.io/chrome";
  const baseUrl    = `${chromeRoot}/components/header`;
  const sharedUrl  = `${chromeRoot}/components/shared`;
  const dockBase   = `${chromeRoot}/components/dock`;
  const assetsBase = `${chromeRoot}/assets`;
  const stamp      = `t=${Math.floor(Date.now()/3600000)}`;

  const u = (p) => (isLocal ? p : `${chromeRoot}${p}`);
  const q = (p) => {
    const sep = p.includes("?") ? "&" : "?";
    return u(p) + sep + stamp;
  };

  /* ========= Helpers ========= */
  const normalize = (l)=> (l||"").toString().split("-")[0].slice(0,2).toLowerCase();

  const markReady = () => {
    const a = document.getElementById("announcement-bar");
    const h = document.getElementById("site-header");
    const offset = (a?.offsetHeight||0) + (h?.offsetHeight||0);
    document.documentElement.style.setProperty("--header-offset", `${offset}px`);
    document.body.classList.add("header-loaded");
    document.dispatchEvent(new Event("btr:header:ready"));
  };

  const ensureCss = () => {
    if (document.querySelector("[data-global-header-style]")) return;
    const l = document.createElement("link");
    l.rel="stylesheet";
    l.href=`${baseUrl}/header.css?${stamp}`;
    l.dataset.globalHeaderStyle="true";
    document.head.appendChild(l);
  };

  const ensureDock = () => {
    if (window.__BTR_DOCK_LOADED__) return;
    if (document.querySelector('script[data-btr="dock-loader"]')) return;
    const s = document.createElement("script");
    s.src = `${dockBase}/dock-loader.js?${stamp}`;
    s.defer = true;
    s.dataset.btr = "dock-loader";
    s.setAttribute("data-target",".inline-dock");
    s.setAttribute("data-variant","inline");
    document.head.appendChild(s);
  };

  async function safeImport(path) {
    try { return await import(q(path)); }
    catch (e) { console.warn("[header-loader] fallo import", path, e); return null; }
  }

  /* ========= Render ========= */
  try{
    // 1) HTML
    const html = await fetch(`${baseUrl}/header.html?${stamp}`).then(r=>r.text());
    container.innerHTML = html;

    // logo forzado si existe
    const logoEl = container.querySelector('img[data-btr="logo"], img.logo, img[src*="logo_header.svg"]');
    if (logoEl) logoEl.src = `${assetsBase}/logo_header.svg`;

    // 2) CSS global del header
    ensureCss();

    // 3) Traducciones
    await new Promise((resolve)=> {
      const s = document.createElement("script");
      s.src = `${baseUrl}/lang.js?${stamp}`;
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });

    // 4) Lógica visual del header
    await new Promise((resolve)=> {
      const s = document.createElement("script");
      s.src = `${baseUrl}/header.js?${stamp}`;
      s.onload = resolve; s.onerror = resolve;
      document.body.appendChild(s);
    });

    /* ========= Idioma unificado ========= */
    const LANG_KEY = "btr_lang";
    const allowed = Object.keys(window.translations || { es:1,en:1,de:1,fr:1,it:1,nl:1,pl:1 });

    const getInitialLang = () => {
      const ls = normalize(localStorage.getItem(LANG_KEY));
      if (ls && allowed.includes(ls)) return ls;
      const htmlL = normalize(document.documentElement.lang);
      if (htmlL && allowed.includes(htmlL)) return htmlL;
      const nav = normalize(navigator.languages?.[0] || navigator.language || "es");
      return allowed.includes(nav) ? nav : "es";
    };

    const setGlobalLang = (langRaw) => {
      const lang = normalize(langRaw) || "es";
      localStorage.setItem(LANG_KEY, lang);
      document.documentElement.lang = lang;
      window.applyTranslations?.(lang);
      document.dispatchEvent(new CustomEvent("btr:langchange", { detail: { lang }}));
      return lang;
    };

    let lang = setGlobalLang(getInitialLang());
    const d = document.getElementById("lang-desktop");
    const m = document.getElementById("lang-mobile");
    if (d) d.value = lang;
    if (m) m.value = lang;

    const onSelectChange = (val) => {
      const next = normalize(val);
      if (!allowed.includes(next) || next === lang) return;
      lang = setGlobalLang(next);
      if (d) d.value = lang;
      if (m) m.value = lang;
      setTimeout(markReady, 50);
    };
    d?.addEventListener("change", (e)=> onSelectChange(e.target.value));
    m?.addEventListener("change", (e)=> onSelectChange(e.target.value));

    /* ========= Login modal ========= */
    async function openLoginModal() {
      try {
        const mod = await safeImport("/components/auth/login-modal.js");
        const open = (mod && mod.mountLoginModal) ||
                     (window.BTR_AUTH && window.BTR_AUTH.mountLoginModal);
        if (typeof open === "function") open();

        // Idioma del modal sincronizado con el header
        const setter = window.BTR_AUTH && window.BTR_AUTH.setLang;
        const current = (document.documentElement.lang || "es").slice(0,2).toLowerCase();
        if (typeof setter === "function") setter(current);

        // Inicializa authStore si existe, sin romper si no está
        const store = await safeImport("/stores/authStore.js");
        store?.authStore?.init?.();
      } catch (e) {
        console.warn("[header-loader] abrir modal falló:", e);
      }
    }

    function wireLogin() {
      const link = document.getElementById("login-link") || document.querySelector('[data-login]');
      if (!link) return;
      link.href = "#";
      link.setAttribute("role","button");
      link.addEventListener("click", async (ev) => {
        ev.preventDefault();
        openLoginModal();
      });
    }
    wireLogin();

    // Abridor universal desde cualquier módulo (dock incluidos)
    document.addEventListener("btr:open-login", () => openLoginModal());

    // 5) Arranque auth store al cargar el header (para que el dock tenga el color correcto desde el inicio)
    try {
      const store = await safeImport("/stores/authStore.js");
      store?.authStore?.init?.();
    } catch(e) {
      console.warn("[header-loader] authStore init opcional falló:", e);
    }

    // 6) Recalc offset + dock
    requestAnimationFrame(() => {
      markReady();
      ensureDock();
      setTimeout(markReady, 60);
    });
  } catch(e) {
    console.error("[header-loader] error:", e);
    document.documentElement.style.setProperty("--header-offset","85px");
  }
})();
