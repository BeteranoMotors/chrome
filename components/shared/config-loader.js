// components/shared/config-loader.js
(function () {
  const isLocal = location.hostname === "localhost";
  const chromeRoot = (typeof window !== "undefined" && window.__BTR_CHROME_ROOT__)
    ? window.__BTR_CHROME_ROOT__
    : (isLocal ? "" : "https://beteranomotors.github.io/chrome");

  const url = isLocal
    ? "/config/public.json"
    : `${chromeRoot}/config/public.json?t=${Math.floor(Date.now()/3600000)}`;

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error("config not found");
      return r.json();
    })
    .then(cfg => {
      const chosen = cfg.firebase?.[isLocal ? "dev" : "prod"] || cfg.firebase || {};
      window.__BTR_CONFIG__ = { ...cfg, firebase: chosen };
      window.dispatchEvent(new CustomEvent("btr:config", { detail: window.__BTR_CONFIG__ }));
    })
    .catch(err => {
      console.error("[BTR] config-loader:", err);
      window.__BTR_CONFIG__ = {};
    });
})();
