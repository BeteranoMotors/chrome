// beterano-web-chrome/components/dock/dock.js
// Dock móvil/escritorio con highlight y navegación entre apps.
// Submenú Marketplace anclado al botón + highlight coherente con la página actual.
// Invitados (sin suscripción) -> intercepta clicks y abre modal de login.

(function attachDock() {
  const nav = document.querySelector(".mobile-dock");
  if (!nav) return;

  const originalParent = nav.parentElement;
  const placeholder = document.createComment("dock-placeholder");
  let highlightEl = null;

  /* ===== Helpers de auth ===== */
  const isSub = () => !!(window.__BTR_AUTH__ && window.__BTR_AUTH__.isSubscriber);

  // Si cambia auth, podemos re-colorear visual (ya lo hace CSS por body class),
  // aquí solo mantenemos el highlight y los listeners consistentes.
  document.addEventListener("btr:auth", () => {
    // Nada especial que hacer; el color del dock se ajusta por CSS variables.
  });

  /* -----------------------------------------------
   * UTILS: highlight activo
   * ----------------------------------------------- */
  function ensureHighlight(){
    if (!highlightEl){
      highlightEl = document.createElement("div");
      highlightEl.className = "dock-highlight";
      if (getComputedStyle(nav).position === "static") nav.style.position = "relative";
      nav.appendChild(highlightEl);
    }
  }

  function getActionFromURL(){
    const { href="", pathname="" } = window.location || {};
    const list = ["map","tow","marketplace","market","calendar","mechai","garagex","shop"];
    for (const a of list){
      if (href.includes(`/${a}/`) || pathname.startsWith(`/${a}/`)){
        if ((a==="market" || a==="shop") && nav.querySelector('[data-action="marketplace"],[data-app="marketplace"]')) {
          return "marketplace";
        }
        return a;
      }
    }
    if (nav.querySelector('[data-action="map"]')) return "map";
    return nav.querySelector("[data-dock-btn]")?.getAttribute("data-action") || "map";
  }

  function markActive(){
    const wanted = getActionFromURL();
    let found=null;
    nav.querySelectorAll("[data-dock-btn]").forEach(b=>{
      const act=b.getAttribute("data-action");
      if (act===wanted){ b.classList.add("dock--active"); found=b; }
      else b.classList.remove("dock--active");
    });
    if (!found) nav.querySelector("[data-dock-btn]")?.classList.add("dock--active");
    moveHighlightToActive();
  }

  function moveHighlightToActive(){
    ensureHighlight();
    const active = nav.querySelector(".dock-btn.dock--active,[data-dock-btn].dock--active");
    if (!active) return;
    requestAnimationFrame(()=>{
      const b=active.getBoundingClientRect();
      const n=nav.getBoundingClientRect();
      const cx=b.left+b.width/2-n.left, cy=b.top+b.height/2-n.top;
      const cs=getComputedStyle(nav);
      const row=parseFloat(cs.getPropertyValue("--row"))||0;
      const dockH=parseFloat(cs.getPropertyValue("--dock-h"))||0;
      const base=row||dockH||b.height;
      const d=Math.round(base*1.2);
      highlightEl.style.left=`${cx}px`;
      highlightEl.style.top =`${cy}px`;
      highlightEl.style.width =`${d}px`;
      highlightEl.style.height=`${d}px`;
    });
  }

  function showSplashSafe(){ try{ window.BTR_SPLASH?.show(); }catch{} }
  function hideSplashSafe(){ try{ window.BTR_SPLASH?.hide(true); }catch{} }

  /* -----------------------------------------------
   * SUBMENÚ MARKETPLACE
   * ----------------------------------------------- */
  const MarketplaceMenu = (function(){
    let wrap = null, backdrop = null, chips = null;

    function ensure(){
      if (wrap) return;
      wrap = document.createElement("div");
      wrap.className = "btr-dock btr-dock__fab";
      wrap.setAttribute("role","group");
      wrap.setAttribute("aria-label","Marketplace quick actions");

      const sub = document.createElement("div");
      sub.className = "btr-dock__submenu";
      sub.id = "btr-market-submenu";
      sub.innerHTML = `
        <button class="btr-dock__chip" data-pos="1" data-section="vehicles" aria-label="Vehículos">
          <svg class="btr-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 13l2-5c.3-.8 1-1.3 1.9-1.3h8.2c.9 0 1.6.5 1.9 1.3l2 5M5 13h14M7 16a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm10 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM4 13v2m16-2v2"/>
          </svg>
        </button>
        <button class="btr-dock__chip" data-pos="2" data-section="parts" aria-label="Piezas">
          <svg class="btr-chip__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 6a2 2 0 104 0 2 2 0 00-4 0zm-8 6a2 2 0 104 0 2 2 0 00-4 0zm12 6a2 2 0 104 0 2 2 0 00-4 0zm-9-6l9-6m0 12l-9-6"/>
          </svg>
        </button>
      `;
      wrap.appendChild(sub);

      backdrop = document.createElement("div");
      backdrop.className = "btr-dock__backdrop";

      document.body.appendChild(wrap);
      document.body.appendChild(backdrop);

      chips = sub.querySelectorAll(".btr-dock__chip");
      chips.forEach(btn=>{
        btn.addEventListener("click",(e)=>{
          e.preventDefault();
          const section = btn.dataset.section;
          close();
          goMarketplaceSection(section);
        });
      });

      backdrop.addEventListener("click", close);
      document.addEventListener("keydown", (e)=>{ if (e.key==="Escape") close(); });
      document.addEventListener("click", (e)=>{
        if (!wrap) return;
        if (!wrap.contains(e.target) && !backdrop.contains(e.target)) close();
      });
    }

    function placeNearAnchor(){
      ensure();
      const btn = nav.querySelector('[data-action="marketplace"], [data-app="marketplace"]');
      if (!btn) return;

      const b = btn.getBoundingClientRect();
      const isMobile = matchMedia("(max-width: 900px)").matches;

      wrap.style.position = "fixed";
      wrap.style.left = (b.left + b.width/2) + "px";
      wrap.style.transform = "translateX(-50%)";
      wrap.style.top = "";
      wrap.style.bottom = "";

      if (isMobile){
        const gap = 12;
        const distanceFromBottom = Math.max(0, window.innerHeight - b.top + gap);
        wrap.style.bottom = distanceFromBottom + "px";
      } else {
        const gap = 12;
        wrap.style.top = (b.bottom + gap) + "px";
      }
    }

    function open(){ ensure(); placeNearAnchor(); wrap.classList.add("is-open"); }
    function close(){ if (wrap) wrap.classList.remove("is-open"); }
    function toggle(){ (wrap && wrap.classList.contains("is-open")) ? close() : open(); }

    function goMarketplaceSection(section){
      window.dispatchEvent(new CustomEvent("btr:open-app", {
        detail: { app: "marketplace", section }
      }));
      const base = (window.BTR_MARKETPLACE_URL || "https://beteranomotors.github.io/marketplace");
      setTimeout(()=>{ window.location.href = `${base}/#/tab/${section}`; }, 50);
    }

    window.addEventListener("resize", () => { if (wrap?.classList.contains("is-open")) placeNearAnchor(); });
    window.addEventListener("scroll", () => { if (wrap?.classList.contains("is-open")) placeNearAnchor(); }, true);

    ensure();
    return { open, close, toggle, placeNearAnchor };
  })();

  (function bindMarketplaceControls(){
    function findMarketBtn(){
      return document.querySelector(
        '.mobile-dock [data-action="marketplace"], .mobile-dock [data-app="marketplace"], .mobile-dock [aria-label="Marketplace"]'
      );
    }

    window.addEventListener("btr:market:open",   () => { try{ MarketplaceMenu.open(); }catch{} });
    window.addEventListener("btr:market:close",  () => { try{ MarketplaceMenu.close(); }catch{} });
    window.addEventListener("btr:market:toggle", () => { try{ MarketplaceMenu.toggle(); }catch{} });

    const btn = findMarketBtn();
    if (btn){
      btn.addEventListener("click", (ev) => {
        const action = (ev.currentTarget.getAttribute("data-action") || ev.currentTarget.getAttribute("data-app") || "").toLowerCase();

        // Invitado: abrir login en lugar de submenu
        if (!isSub()) {
          ev.preventDefault(); ev.stopPropagation();
          try { document.dispatchEvent(new Event("btr:open-login")); } catch {}
          return;
        }

        if (action === "marketplace"){
          ev.preventDefault();
          ev.stopPropagation();
          try{ MarketplaceMenu.toggle(); }catch{}
          requestAnimationFrame(markActive);
        }
      }, true);
    }

    window.BeteranoDock = Object.assign(window.BeteranoDock || {}, {
      openMarketplace:  () => { try{ MarketplaceMenu.open(); }catch{} },
      closeMarketplace: () => { try{ MarketplaceMenu.close(); }catch{} },
      toggleMarketplace:() => { try{ MarketplaceMenu.toggle(); }catch{} },
    });
  })();

  /* -----------------------------------------------
   * NAVEGACIÓN PRINCIPAL
   * ----------------------------------------------- */
  function normalizeAction(raw){
    const a = String(raw || "").toLowerCase();
    if (a === "market" || a === "shop") return "marketplace";
    return a;
  }

  function go(destRaw){
    const dest = normalizeAction(destRaw);

    // Invitados: cualquier click del dock abre login
    if (!isSub()) {
      try { document.dispatchEvent(new Event("btr:open-login")); } catch {}
      return;
    }

    if (dest !== "marketplace") showSplashSafe();
    document.dispatchEvent(new CustomEvent("btr:dock", { detail:{ action:dest } }));

    if (dest === "marketplace"){
      try { window.dispatchEvent(new Event("btr:market:toggle")); } catch {}
      requestAnimationFrame(markActive);
      return;
    }

    try{
      if (typeof window.BeteranoNavigate === "function" && window.BeteranoNavigate(dest) === true){
        setTimeout(markActive, 0);
        return;
      }
      if (window.BTR_SHELL?.navigate){
        window.BTR_SHELL.navigate(dest);
        setTimeout(markActive, 0);
        return;
      }
    }catch(_){}

    const URLS = {
      calendar:"https://beteranomotors.github.io/calendar/",
      mechai:"https://beteranomotors.github.io/mechai/",
      map:"https://beteranomotors.github.io/map/",
      tow:"https://beteranomotors.github.io/tow/",
      marketplace:"https://beteranomotors.github.io/marketplace/",
      garagex:"https://beteranomotors.github.io/garagex/",
    };
    const url = URLS[dest];
    if (url) location.href = url;
  }

  // Splash safety
  let safetyTimer=null;
  document.addEventListener("btr:header:ready", ()=>{ clearTimeout(safetyTimer); safetyTimer=setTimeout(hideSplashSafe, 8000); });
  document.addEventListener("btr:dock:ready",   ()=>{ clearTimeout(safetyTimer); safetyTimer=setTimeout(hideSplashSafe, 8000); });
  document.addEventListener("btr:map:ready",    ()=>{ hideSplashSafe(); });

  /* -----------------------------------------------
   * Reparentado (inline vs floating)
   * ----------------------------------------------- */
  function moveToBody(){
    if (placeholder.parentNode == null && originalParent) originalParent.insertBefore(placeholder, nav);
    if (nav.parentElement !== document.body) document.body.appendChild(nav);
  }
  function moveBackToOriginal(){
    if (placeholder.parentNode && placeholder.parentNode !== document.body) {
      placeholder.parentNode.insertBefore(nav, placeholder);
    } else if (nav.parentElement !== originalParent && originalParent) {
      originalParent.appendChild(nav);
    }
  }
  function setVariant(v="inline"){
    const val=String(v||"").toLowerCase();
    if (val==="floating") { moveToBody(); nav.classList.remove("dock--inline"); }
    else { moveBackToOriginal(); nav.classList.add("dock--inline"); }
    queueMicrotask(moveHighlightToActive);
  }

  /* -----------------------------------------------
   * Click handler general
   * ----------------------------------------------- */
  nav.addEventListener("click", (ev)=>{
    const target = ev.target.closest("[data-action],[data-app]");
    if (!target) return;
    const action = target.getAttribute("data-action") || target.getAttribute("data-app");
    ev.preventDefault();
    ev.stopPropagation();
    go(action);
  });

  const mql = matchMedia("(max-width: 900px)");
  const apply = ()=> setVariant(mql.matches ? "floating" : "inline");
  apply(); (mql.addEventListener ? mql.addEventListener("change", apply) : mql.addListener(apply));

  window.addEventListener("resize", moveHighlightToActive);
  window.addEventListener("popstate", markActive);

  // init
  ensureHighlight();
  markActive();
})();
