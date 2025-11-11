/* components/header/header.js */
(function () {
  const LANG_KEY = "btr_lang";
  const LANG_EVT = "btr:langchange";
  const normalize = (l) => (l || "").toString().split("-")[0].slice(0,2).toLowerCase();

  function applyTranslations(lang){
    const strings = window.translations?.[lang] || {};
    document.querySelectorAll("[data-i18n]").forEach(el=>{
      const k = el.getAttribute("data-i18n");
      if (k && strings[k]) el.textContent = strings[k];
    });
  }

  function setLang(langRaw, emit=true){
    const lang = normalize(langRaw) || "es";
    try{ localStorage.setItem(LANG_KEY, lang); }catch{}
    try{ document.cookie = `${LANG_KEY}=${encodeURIComponent(lang)};path=/;max-age=31536000;SameSite=Lax`; }catch{}
    document.documentElement.lang = lang;
    const d = document.getElementById("lang-desktop");
    const m = document.getElementById("lang-mobile");
    if (d) d.value = lang; if (m) m.value = lang;
    applyTranslations(lang);
    if (emit) window.dispatchEvent(new CustomEvent(LANG_EVT, { detail:{ lang }}));
  }

  function getInitialLang(){
    try{
      const ls = normalize(localStorage.getItem(LANG_KEY)); if (ls) return ls;
      const ck = (document.cookie.split(";").map(s=>s.trim()).find(p=>p.startsWith(LANG_KEY+"="))||"").split("=")[1]||"";
      if (ck) return normalize(decodeURIComponent(ck));
    }catch{}
    const html = normalize(document.documentElement.lang); if (html) return html;
    return normalize(navigator.languages?.[0] || navigator.language || "es");
  }

  function ready(fn){
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function init(){
    // --- elementos
    const btn = document.getElementById("menu-toggle");
    const panel = document.getElementById("nav-panel");
    const loginLink = document.getElementById("login-link");
    const langDesktop = document.getElementById("lang-desktop");
    const langMobile  = document.getElementById("lang-mobile");

    // overlay click-to-close
    let overlay = document.querySelector(".menu-overlay");
    if (!overlay){ overlay = document.createElement("div"); overlay.className="menu-overlay"; document.body.appendChild(overlay); }

    // idioma inicial
    const initial = getInitialLang();
    setLang(initial, /*emit*/false);

    // selectores de idioma
    const onChange = (ev) => setLang(ev.target.value, true);
    langDesktop?.addEventListener("change", onChange);
    langMobile ?.addEventListener("change", onChange);

    // escuchar cambios externos (app/i18n)
    window.addEventListener(LANG_EVT, (ev)=>{
      const next = normalize(ev?.detail?.lang);
      if (next && next !== normalize(document.documentElement.lang)) setLang(next, /*emit*/false);
    });

    // abrir/cerrar menú
    function setOpen(open){
      if (!panel) return;
      panel.classList.toggle("is-open", !!open);
      overlay.classList.toggle("is-open", !!open);
      btn?.classList.toggle("is-open", !!open);
      btn?.setAttribute("aria-expanded", String(!!open));
      document.body.classList.toggle("nav-open", !!open);
    }
    const toggle = (e)=>{ e?.preventDefault?.(); setOpen(!panel.classList.contains("is-open")); };

    btn?.addEventListener("click", toggle);
    btn?.addEventListener("touchstart", (e)=>{ e.preventDefault(); toggle(e); }, { passive:false });
    overlay.addEventListener("click", ()=>setOpen(false));
    document.addEventListener("keydown", (e)=>{ if (e.key==="Escape") setOpen(false); });

    // cerrar cuando se hace click en un enlace del menú (móvil/desktop)
    panel?.querySelectorAll("a").forEach(a=> a.addEventListener("click", ()=>setOpen(false)));

    // wire login dentro del menú móvil también
    document.getElementById("menu-login")?.addEventListener("click", (e)=>{
      e.preventDefault();
      setOpen(false);
      loginLink?.click();
    });

    // expón mínima API
    window.BTR_LANG = { get: getInitialLang, set: setLang };
    window.applyTranslations = applyTranslations;
  });
})();
