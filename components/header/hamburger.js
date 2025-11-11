/* beterano-web-chrome / components/header/hamburger.js */
(function setupHamburger(){
  const menuToggle = document.getElementById("menu-toggle");
  const navWrapper = document.getElementById("main-menu") || document.querySelector(".nav-wrapper");
  if (!menuToggle || !navWrapper) return;

  // Backdrop
  let backdrop = document.getElementById("nav-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "nav-backdrop";
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);
  }

  const reflect = window.__BTR_HEADER__?.reflectMenuState || (()=>{});
  const stop = (e) => e.stopPropagation();

  function setOpen(v){
    navWrapper.classList.toggle("open", !!v);
    backdrop.classList.toggle("open", !!v);
    document.documentElement.classList.toggle("no-scroll", !!v);
    document.body.classList.toggle("no-scroll", !!v);
    reflect(!!v);
  }
  function isOpen(){ return navWrapper.classList.contains("open"); }
  function open(){ setOpen(true); }
  function close(){ setOpen(false); }
  function toggle(e){
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(!isOpen());
  }

  // Wiring
  menuToggle.addEventListener("click", toggle, { passive:false });
  menuToggle.addEventListener("touchstart", toggle, { passive:false });

  // Evitar cierre por click interno
  navWrapper.addEventListener("click", stop, { passive:true });
  navWrapper.addEventListener("touchstart", stop, { passive:true });

  // Cerrar con backdrop / ESC
  backdrop.addEventListener("click", close, { passive:true });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") close(); });

  // Cerrar al navegar por los links del menú
  document.querySelectorAll(".nav-list a, .nav-extras-mobile a").forEach(a=>{
    a.addEventListener("click", () => close());
  });

  // Exponer por si otros módulos necesitan cerrar
  document.addEventListener("btr:header:close", close);
})();
