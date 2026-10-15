// Felhőmentés: a helyi mentés (localStorage) mellé a paduch.hu/dzsungel/api Worker + D1 is megkapja az állást.
// A mentéskód (XXXX-XXXX-XXXX-XXXX) a "jelszó": másik gépen beírva ugyanaz az állás jön le. Indulásnál a frissebb nyer.
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_KEY = 'dzsungel-code', FRESH_KEY = 'dzsungel-fresh';
export const CODE_RE = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privát mód */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
};

export class Cloud {
  constructor(saveKey) {
    this.saveKey = saveKey;
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    this.api = local ? 'https://paduch.hu/dzsungel/api' : `${location.origin}/dzsungel/api`;
    let c = ls.get(CODE_KEY);
    if (!c || !CODE_RE.test(c)) { c = Cloud.newCode(); ls.set(CODE_KEY, c); }
    this.code = c;
    this.lastPushed = null; this.lastPushT = 0; this.status = ''; this.ok = null;
  }
  static newCode() {
    const r = new Uint32Array(16); crypto.getRandomValues(r);
    let s = ''; for (let i = 0; i < 16; i++) { s += ABC[r[i] % ABC.length]; if (i % 4 === 3 && i < 15) s += '-'; }
    return s;
  }
  async req(method, body, code = this.code, keepalive = false) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(`${this.api}/save`, { method, headers: { 'Content-Type': 'application/json', 'X-Save-Code': code }, body, signal: ctl.signal, keepalive });
      return await r.json();
    } finally { clearTimeout(to); }
  }
  // indulás: ha a felhőben frissebb állás van, az kerül a helyi mentés helyére
  async pull() {
    try {
      const r = await this.req('GET');
      if (!r || r.none || !r.data) { this.ok = true; return false; }
      let local = null; try { local = JSON.parse(ls.get(this.saveKey) || 'null'); } catch (e) { local = null; }
      const fresh = +(ls.get(FRESH_KEY) || 0);
      const lt = local ? (local.t || 0) : 0;
      this.ok = true;
      if (r.updated_at > lt + 2000 && r.updated_at > fresh) {
        ls.set(this.saveKey, JSON.stringify({ ...r.data, t: r.updated_at }));
        this.status = 'A felhőből töltve';
        return true;
      }
      return false;
    } catch (e) { this.ok = false; this.status = 'A felhő most nem érhető el'; return false; }
  }
  // feltöltés, ha változott (30 mp-enként hívva, és kilépéskor keepalive-val)
  async push(force = false, keepalive = false) {
    const s = ls.get(this.saveKey);
    if (!s || (!force && s === this.lastPushed)) return;
    if (!force && performance.now() - this.lastPushT < 25000) return;
    this.lastPushT = performance.now();
    try {
      const data = JSON.parse(s);
      const r = await this.req('PUT', JSON.stringify({ data }), this.code, keepalive);
      if (r && r.ok) { this.lastPushed = s; this.ok = true; this.status = `Mentve a felhőbe ${new Date().toTimeString().slice(0, 5)}-kor`; }
      else { this.ok = false; this.status = (r && r.hiba) || 'Hiba a felhőmentésnél'; }
    } catch (e) { this.ok = false; this.status = 'A felhő most nem érhető el'; }
  }
  // másik kód: ha van alatta mentés, átvesszük (a hívó újratölti az oldalt)
  async useCode(code) {
    code = code.toUpperCase().trim();
    if (!CODE_RE.test(code)) return { err: 'A kód formája: XXXX-XXXX-XXXX-XXXX' };
    try {
      const r = await this.req('GET', undefined, code);
      ls.set(CODE_KEY, code); this.code = code;
      if (r && r.data) { ls.set(this.saveKey, JSON.stringify({ ...r.data, t: r.updated_at })); ls.del(FRESH_KEY); return { loaded: true }; }
      this.lastPushed = null; await this.push(true);
      return { loaded: false };
    } catch (e) { return { err: 'A felhő most nem érhető el' }; }
  }
  markFresh() { ls.set(FRESH_KEY, String(Date.now())); }
}
