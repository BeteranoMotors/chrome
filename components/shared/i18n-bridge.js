// components/shared/i18n-bridge.js
export function getInitialLang(allowed = ['es','en','de','fr','it','nl','pl']) {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const fromStorage = safeLocalGet('btr:lang');
  const fromCookie = document.cookie.match(/(?:^|;\s*)btr_lang=([^;]+)/)?.[1];
  const nav = (navigator.languages?.[0] || navigator.language || 'en').slice(0, 2).toLowerCase();

  const pick = (val) => val && allowed.includes(val) ? val : null;
  return pick(normalize(fromUrl)) || pick(normalize(fromStorage)) || pick(normalize(fromCookie)) || pick(nav) || 'es';
}

export function setGlobalLang(langRaw) {
  const lang = normalize(langRaw);
  safeLocalSet('btr:lang', lang);
  document.cookie = `btr_lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = lang;
  try {
    window.dispatchEvent(new CustomEvent('btr:langchange', { detail: { lang } }));
  } catch {}
  return lang;
}

// — Helpers —
function normalize(v) {
  return (v || '').toString().slice(0, 2).toLowerCase();
}
function safeLocalGet(k) {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeLocalSet(k, v) {
  try { localStorage.setItem(k, v); } catch {}
}
