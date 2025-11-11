// beterano-web-chrome/components/splash/splash.js
(function setupSplash() {
  const MIN_SHOW_MS = 2000;
  const HARD_MAX_MS = 12000;
  const startedAt = (performance?.now?.() ?? Date.now());

  // Overlay (z-index MUY alto y con !important por si hay stacking contexts raros)
  const splash = document.createElement('div');
  splash.id = 'btr-splash';
  splash.innerHTML = `<div class="logo-wrap" id="btr-logo-slot" aria-label="Loading BETERANO"></div>`;
  document.body.appendChild(splash);
  splash.classList.add('loading');

  // barra de progreso
  splash.insertAdjacentHTML("beforeend",
    `<div id="btr-progress-wrap">
       <div id="btr-progress-bar"></div>
       <span id="btr-progress-text">0%</span>
     </div>`
  );

  // CSS inline de respaldo
  if (!document.getElementById('btr-splash-inline-style')) {
    const s = document.createElement('style');
    s.id = 'btr-splash-inline-style';
    s.textContent = `
      #btr-splash{position:fixed!important;inset:0!important;background:#0a0a0a;display:grid;place-items:center;z-index:100500!important;pointer-events:all}
      #btr-splash.hidden{opacity:0;visibility:hidden;transition:opacity .6s ease,visibility .6s ease}
      #btr-splash .logo-wrap{width:min(420px,70vw);aspect-ratio:1/1}
      #btr-logo-slot{width:100%;height:100%;display:grid;place-items:center}
      #btr-logo-slot>*{margin:auto;max-width:100%;max-height:100%}
      #btr-progress-wrap{position:absolute;bottom:10vh;left:50%;transform:translateX(-50%);width:260px}
      #btr-progress-bar{width:0%;height:6px;background:#f5d84d;border-radius:4px;transition:width .35s ease}
      #btr-progress-text{display:block;text-align:center;margin-top:8px;color:#f5d84d;font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
      @keyframes btr-spin{to{transform:rotate(360deg)}}
      @keyframes btr-line-draw{to{stroke-dashoffset:0}}
    `;
    document.head.appendChild(s);
  }

  // rutas
  const isLocal = location.hostname === 'localhost';
  const chromeRoot = isLocal ? '' : 'https://beteranomotors.github.io/chrome';
  const logoUrl = `${chromeRoot}/assets/logo_loading.svg`;

  // carga svg o spinner
  fetch(logoUrl, { cache: 'no-store' })
    .then(r => { const c=(r.headers.get('content-type')||'').toLowerCase(); if(!r.ok||!c.includes('image/svg')) throw 0; return r.text(); })
    .then(svgText => {
      document.getElementById('btr-logo-slot').innerHTML = svgText;
      const parts = document.querySelectorAll('#btr-logo-slot svg path,#btr-logo-slot svg line,#btr-logo-slot svg polyline,#btr-logo-slot svg polygon,#btr-logo-slot svg circle');
      parts.forEach((el,i)=>{try{const L=(el.getTotalLength?.()||600);el.style.strokeDasharray=String(L);el.style.strokeDashoffset=String(L);el.style.animation=`btr-line-draw 1.6s ease-in-out forwards`;el.style.animationDelay=`${Math.min(i*90,900)}ms`;}catch{}});
    })
    .catch(()=>{document.getElementById('btr-logo-slot').innerHTML =
      `<div style="width:72px;height:72px;border-radius:50%;border:4px solid rgba(245,216,77,.25);border-top-color:#f5d84d;animation:btr-spin 1s linear infinite"></div>`;});

  // progreso y señales
  let headerReady=false, mapReady=false, dockReady=false;
  const WEIGHTS = { header:30, map:45, dock:25 };
  const update = (p)=>{ const b=document.getElementById('btr-progress-bar'); const t=document.getElementById('btr-progress-text'); if(b) b.style.width=`${Math.min(p,100)}%`; if(t) t.textContent=`${Math.round(Math.min(p,100))}%`; };

  // 👇 API GLOBAL para poder usar desde el dock (preload entre apps)
  window.BTR_SPLASH = {
    show(){
      if (!document.getElementById('btr-splash')) document.body.appendChild(splash);
      splash.classList.remove('hidden');
      splash.classList.add('loading');
      update(0);
      headerReady = mapReady = dockReady = false;
    },
    // permite un hide “forzado” desde fuera
    hide(force=false){ hideSplash(!force); }
  };

  document.addEventListener('btr:header:ready',()=>{headerReady=true;maybe();});
  document.addEventListener('btr:map:ready',   ()=>{mapReady=true;maybe();});
  document.addEventListener('btr:dock:ready',  ()=>{dockReady=true;maybe();});

  const minOk = ()=> (performance?.now?.() ?? Date.now()) - startedAt >= MIN_SHOW_MS;
  const hardExceeded = ()=> (performance?.now?.() ?? Date.now()) - startedAt >= HARD_MAX_MS;

  let tmr=null;
  function maybe(){
    if (!splash || splash.classList.contains('hidden')) return;
    const all = headerReady && dockReady && (mapReady || true); // el “map” puede no existir en otras apps
    let p = 0;
    if (headerReady) p += WEIGHTS.header;
    if (dockReady)   p += WEIGHTS.dock;
    if (mapReady)    p += WEIGHTS.map;
    const elapsed = (performance?.now?.() ?? Date.now()) - startedAt;
    if (!all){ p = Math.min(96, p + Math.min(16, Math.floor(elapsed/800))); update(p); }
    if ((all && minOk()) || hardExceeded()){ update(100); return hideSplash(!all); }
    clearTimeout(tmr); tmr = setTimeout(maybe, 180);
  }
  setTimeout(maybe, 300);
  setTimeout(()=>{ update(100); hideSplash(true); }, HARD_MAX_MS + 200);

  function hideSplash(isFallback=false){
    if (!splash || splash.classList.contains('hidden')) return;
    clearTimeout(tmr);
    const doHide=()=>{ splash.classList.remove('loading'); requestAnimationFrame(()=>{ splash.classList.add('hidden'); setTimeout(()=>splash.remove(),700); }); if(isFallback) console.warn('[splash] hidden by fallback/max-time.'); };
    if (minOk()) doHide(); else setTimeout(doHide, Math.max(0, MIN_SHOW_MS - ((performance?.now?.() ?? Date.now()) - startedAt)));
  }
})();
