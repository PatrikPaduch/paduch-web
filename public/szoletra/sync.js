// Szólétra + kert szinkron: a haladás a paduch.hu-n (Cloudflare Access mögött) a bejelentkezett e-mail-címhez kötve
// a szoletra-api Workerbe (D1) mentődik, így minden eszközön ugyanaz. Helyben (localhost) ki van kapcsolva,
// kivéve, ha a localStorage 'szoletra-sync-api' kulcsában meg van adva egy fejlesztői API-cím.
const KEYS = ['szoletra-v1', 'kert-szavak', 'kert-ismetles', 'kert-kuldetes', 'kert-kertesz', 'kert-tablak', 'kert-mentes', 'kert-beszelgetes'];
const TKEY = 'szoletra-sync-t';
const origSet = Storage.prototype.setItem;
const st = { state: 'off', last: 0 };

export function initSync({ onRemote } = {}) {
  const dev = localStorage.getItem('szoletra-sync-api');
  const on = /(^|\.)paduch\.hu$/.test(location.hostname) || !!dev;
  if (!on) return st;
  const API = (dev || '') + '/szoletra/api/state';
  let timer = null, pushing = false;
  const localT = () => +localStorage.getItem(TKEY) || 0;
  // minden mentésnél időbélyeg + késleltetett feltöltés
  Storage.prototype.setItem = function (k, v) {
    origSet.call(this, k, v);
    if (this === localStorage && KEYS.includes(k) && !st.applying) { origSet.call(localStorage, TKEY, String(Date.now())); clearTimeout(timer); timer = setTimeout(push, 2500); }
  };
  async function push(keepalive) {
    if (pushing && !keepalive) { clearTimeout(timer); timer = setTimeout(push, 2000); return; }
    pushing = true;
    try {
      const data = {}; for (const k of KEYS) { const v = localStorage.getItem(k); if (v !== null) data[k] = v; }
      const r = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: localT(), data }), credentials: 'include', keepalive: !!keepalive });
      st.state = r.ok ? 'ok' : 'hiba'; st.last = Date.now();
      if (r.status === 409) { const j = await r.json(); apply(j); }
    } catch (e) { st.state = 'offline'; } finally { pushing = false; }
  }
  function apply(j) {
    if (!j || !j.data) return;
    st.applying = true;
    try { for (const k of KEYS) { if (k in j.data) origSet.call(localStorage, k, j.data[k]); } origSet.call(localStorage, TKEY, String(j.t)); }
    finally { st.applying = false; }
    onRemote && onRemote();
  }
  st.ready = (async () => {
    try {
      const r = await fetch(API, { credentials: 'include', cache: 'no-store' }); if (!r.ok) throw new Error(r.status);
      const j = await r.json(); st.state = 'ok';
      if (j.none) { if (localT() || KEYS.some(k => localStorage.getItem(k) !== null)) { if (!localT()) origSet.call(localStorage, TKEY, String(Date.now())); push(); } }
      else if (j.t > localT()) apply(j);
      else if (j.t < localT()) push();
    } catch (e) { st.state = 'offline'; }
  })();
  // azonnali feltöltés (pl. Mentés és kilépés, vagy bezáráskor a frissen mentett hely)
  st.flush = (keep) => { if (!timer) return Promise.resolve(); clearTimeout(timer); timer = null; return push(keep); };
  addEventListener('visibilitychange', () => { if (document.hidden && timer) { clearTimeout(timer); timer = null; push(true); } });
  addEventListener('pagehide', () => { if (timer) { clearTimeout(timer); push(true); } });
  return st;
}
