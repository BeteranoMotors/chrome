// beterano-web-chrome/components/dock/dock-loader.js
(async function loadDock() {
  const stamp = `t=${Math.floor(Date.now() / 3600000)}`;
  const base  = "https://beteranomotors.github.io/chrome/components/dock";

  if (window.__BTR_DOCK_BOOTSTRAPPING__ || window.__BTR_DOCK_MOUNTED__) return;
  window.__BTR_DOCK_BOOTSTRAPPING__ = true;

  const thisScript = document.currentScript;
  const targetSel  = (thisScript && thisScript.getAttribute("data-target")) || "#dock-container";

  const isVisible = (el) => {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    return el.offsetParent !== null && cs.display !== "none" && cs.visibility !== "hidden";
  };

  function waitForContainer(timeoutMs = 5000) {
    return new Promise((resolve) => {
      const found = document.querySelector(targetSel);
      if (found) return resolve(found);

      const start = Date.now();
      const mo = new MutationObserver(() => {
        const el = document.querySelector(targetSel);
        if (el) { mo.disconnect(); resolve(el); }
        else if (Date.now() - start > timeoutMs) {
          mo.disconnect();
          // Fallback: creamos un host temporal que NO aporte altura
          const host = document.body;
          const el2 = document.createElement("div");
          if (targetSel.startsWith("#")) el2.id = targetSel.slice(1);
          else el2.className = targetSel.replace(/^[#.]/, "");
          // Evita que el contenedor aporte flujo/altura
          el2.style.position = "fixed";
          el2.style.left = "0";
          el2.style.right = "0";
          el2.style.bottom = "0";
          el2.style.zIndex = "20000";
          host.appendChild(el2);
          resolve(el2);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(() => {
        const el = document.querySelector(targetSel);
        if (el) { try{mo.disconnect();}catch{} resolve(el); }
      }, 120);
    });
  }

  function rehostWhenInlineAppears(rootEl) {
    try {
      const wantInline = (thisScript && thisScript.getAttribute("data-variant") === "inline");
      if (!wantInline) return;
      const alreadyInline = !!rootEl.closest(".inline-dock");
      if (alreadyInline) return;

      const tryMove = () => {
        const inlineDock = document.querySelector(".inline-dock");
        if (inlineDock && isVisible(inlineDock)) {
          inlineDock.appendChild(rootEl);
          rootEl.setAttribute("data-variant", "inline");
          const nav = rootEl.querySelector(".mobile-dock");
          if (nav) nav.classList.add("dock--inline");
          obs.disconnect();
        }
      };

      const obs = new MutationObserver(tryMove);
      obs.observe(document.documentElement, { childList: true, subtree: true });
      tryMove();
      setTimeout(() => { try { obs.disconnect(); } catch {} }, 15000);
    } catch {}
  }

  const markReady = () => {
    document.body.classList.add("dock-loaded","has-mobile-dock");
    window.__BTR_DOCK_MOUNTED__ = true;
    window.__BTR_DOCK_BOOTSTRAPPING__ = false;
    try { document.dispatchEvent(new Event("btr:dock:ready")); } catch {}
  };

  try {
    const container = await waitForContainer();

    // ---------- CSS global (una sola vez) ----------
    let link = document.querySelector("[data-global-dock-style]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${base}/dock.css?${stamp}`;
      link.dataset.globalDockStyle = "true";
      document.head.appendChild(link);
    }

    try { await fetch(link.href, { cache: "no-store" }); } catch {
      const style = document.createElement("style");
      style.textContent = `
        .mobile-dock{position:fixed;left:0;right:0;bottom:max(0px, env(safe-area-inset-bottom));padding:8px;background:#FBE493;display:flex;gap:10px;justify-content:space-around;z-index:20000;border-radius:20px 20px 0 0}
        .mobile-dock .dock-btn{all:unset;width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:#fff;border:1px solid rgba(0,0,0,.12)}
        .mobile-dock .dock-center{width:64px;height:64px;border-radius:999px;background:#fff;border:2px solid #ffd33d;display:grid;place-items:center;transform:translateY(-20%)}
        .mobile-dock.dock--inline{position:static;transform:none;border-radius:12px;height:56px;padding:6px 10px;display:grid;grid-template-columns:repeat(5,1fr);grid-auto-rows:56px;column-gap:8px}
        .mobile-dock.dock--inline .dock-center{width:52px;height:52px;transform:none}
        @media(min-width:900px){ .mobile-dock:not(.dock--inline){ display:none } }
      `;
      document.head.appendChild(style);
    }

    // ---------- HTML ----------
    const html = await fetch(`${base}/dock.html?${stamp}`).then(r => r.text());
    container.innerHTML = html;

    container.querySelectorAll('.dock-btn, .dock-center, [data-action]').forEach(el => {
      el.classList.add('btn');
      el.setAttribute('data-dock-btn', '');
    });

    const inlineHost = container.closest(".inline-dock");
    const preferred = (inlineHost && isVisible(inlineHost))
      ? "inline"
      : (window.matchMedia("(max-width: 900px)").matches ? "floating" : "inline");

    const rootEl = container.querySelector("#bm-dock-root");
    if (rootEl) rootEl.setAttribute("data-variant", preferred);

    // ---------- Lógica ----------
    const js = document.createElement("script");
    js.src = `${base}/dock.js?${stamp}`;
    js.onload = () => {
      try {
        if (window.BeteranoDock?.setVariant) window.BeteranoDock.setVariant(preferred);
        if (window.BeteranoDock?.init)      window.BeteranoDock.init(container);
      } catch (e) { console.warn("[dock-loader] init error:", e); }
      rehostWhenInlineAppears(rootEl);
      markReady();
    };
    document.body.appendChild(js);
  } catch (err) {
    console.error("❌ Error cargando el dock:", err);
    window.__BTR_DOCK_MOUNTED__ = true;
    window.__BTR_DOCK_BOOTSTRAPPING__ = false;
    try { document.dispatchEvent(new Event("btr:dock:ready")); } catch {}
    document.body.classList.add("dock-loaded");
  }
})();
