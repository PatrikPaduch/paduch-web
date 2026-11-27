// Szólétra: angol szótanuló ranglétrával. Az adat a böngészőben (localStorage) marad.
import { emblem, TIERS, LATER, FAMS, STEPS } from './emblems.js';
import { CORE } from './data/core.js';
import { EXTRA } from './data/extra.js';
import { SZODOBOZ } from './data/szodoboz.js';
import { initSync } from './sync.js';
// a paduch.hu-n indulás előtt lehúzzuk a legfrissebb mentést (más eszközről)
const SYNC = initSync(); if (SYNC.ready) await SYNC.ready;
import { NEAR } from './data/arnyalat.js';

/* ================= beállítások, szabályok ================= */
const KEY = 'szoletra-v1';
const KERT_KEYS = ['kert-szavak', 'kert-ismetles', 'kert-kuldetes', 'kert-kertesz', 'kert-tablak'];
const INTERVALS = [0, 1, 2, 4, 7, 14, 30, 60];      // doboz -> hány nap múlva jön újra
const MASTERED = 5;                                  // ettől a doboztól "megszilárdult"
const PTS = { newWord: 10, review: 3, mastered: 15, sentence: 5, shade: 5, daily: 20 };
// pontküszöbök: az első lépcső 150 pont, utána lépcsőnként 22-vel több kell
const T = Array.from({ length: STEPS }, (_, n) => 150 * n + 11 * n * (n - 1));
const LEVELS = [['a2', 'Könnyebb (A2)'], ['b1', 'Közép (B1)'], ['b2', 'Felső-közép (B2)'], ['c1', 'Haladó (C1)']];

/* ================= segédek ================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rnd = a => a[Math.floor(Math.random() * a.length)];
const fmt = n => Math.round(n).toLocaleString('hu-HU');
const dstr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => dstr(new Date());
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return dstr(d); };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/* ================= állapot ================= */
const defaults = () => ({ v: 1, settings: { newPerDay: 8, levels: ['a2', 'b1', 'b2'], szodoboz: false, offTopics: [] }, words: {}, custom: [], points: 0, log: {}, streak: { days: 0, last: null } });
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) { const d = defaults(); return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } }; }
  } catch (e) { /* sérült mentés: tiszta lappal indulunk */ }
  return defaults();
}
const save = () => localStorage.setItem(KEY, JSON.stringify(S));
// ha a kertben (másik fülön) új kertszót találsz, a pontok és a szavak itt is frissülnek
addEventListener('storage', e => { if (e.key !== KEY) return; S = load(); buildWords(); if (view === 'session') renderTop(); else render(); });
function dayLog(t = today()) { return S.log[t] || (S.log[t] = { points: 0, newWords: 0, reviews: 0, sentences: 0, shades: 0, done: false }); }
const streakNow = () => (S.streak.last === today() || S.streak.last === addDays(-1)) ? S.streak.days : 0;

/* ================= szavak ================= */
let WORDS = new Map();
function buildWords() {
  WORDS = new Map();
  const add = (r, pack) => { const id = r[0].toLowerCase().trim(); if (!id || WORDS.has(id)) return; WORDS.set(id, { id, en: r[0], hu: r[1], sen: r[2] || '', shu: r[3] || '', topic: r[4] || 'saját', level: r[5] || 'b1', pack }); };
  S.custom.forEach(r => add(r, 'saját'));
  CORE.forEach(r => add(r, 'core'));
  EXTRA.forEach(r => add(r, 'core'));
  if (S.settings.szodoboz) SZODOBOZ.forEach(r => add(r, 'szodoboz'));
}
buildWords();
const W = id => WORDS.get(id);
const P = id => S.words[id];
function newCandidates() {
  const lv = S.settings.levels, ord = { a2: 0, b1: 1, b2: 2, c1: 3 }, pk = { 'saját': 0, core: 1, szodoboz: 2 };
  // a könnyebbek kicsit előbb jönnek, de keverve: nem 48 könnyű szó egymás után
  const key = w => ord[w.level] * .7 + hash(w.id) * 2.2;
  const off = S.settings.offTopics || [];
  return [...WORDS.values()].filter(w => !P(w.id) && lv.includes(w.level) && !off.includes(w.topic)).sort((a, b) => (pk[a.pack] - pk[b.pack]) || (key(a) - key(b)));
}
function dueIds() {
  const t = today();
  return Object.entries(S.words).filter(([id, p]) => p.box >= 1 && p.due <= t && WORDS.has(id)).sort((a, b) => a[1].due < b[1].due ? -1 : 1).map(([id]) => id);
}
const learnedIds = () => Object.keys(S.words).filter(id => S.words[id].box >= 1 && WORDS.has(id));
function sentencePool() {
  let ids = learnedIds().filter(id => W(id).sen && (W(id).shu || matchIn(W(id))));
  if (ids.length < 10) { // az elején még kevés a tanult szó: alapszólista-mondatokkal töltjük fel
    const extra = [...WORDS.values()].filter(w => w.shu && S.settings.levels.includes(w.level) && !ids.includes(w.id)).map(w => w.id);
    ids = ids.concat(shuffle(extra).slice(0, 30));
  }
  return ids;
}

/* a szó megkeresése a példamondatban (ragozott alakokkal is: -s, -ed, -ing, ...) */
function wordRegex(en) {
  const e = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = en.trim().split(/\s+/), w0 = parts[0].toLowerCase(), rest = parts.slice(1).map(e).join('\\s+');
  const alts = [e(w0) + '(?:s|es|ed|d|ing)?'];
  if (w0.endsWith('e')) alts.push(e(w0.slice(0, -1)) + '(?:ing|ed)');
  if (w0.endsWith('y')) alts.push(e(w0.slice(0, -1)) + '(?:ies|ied)');
  if (/[^aeiou][aeiou][bdgmnprt]$/.test(w0)) alts.push(e(w0) + w0.slice(-1) + '(?:ing|ed)');
  return new RegExp('\\b(?:' + alts.join('|') + ')' + (rest ? '\\s+' + rest : '') + '\\b', 'i');
}
function matchIn(w) { if (!w.sen) return null; const m = w.sen.match(wordRegex(w.en)); return m ? { i: m.index, s: m[0] } : null; }
const hl = w => { const m = matchIn(w); return m ? esc(w.sen.slice(0, m.i)) + '<mark>' + esc(m.s) + '</mark>' + esc(w.sen.slice(m.i + m.s.length)) : esc(w.sen); };
const cloze = w => { const m = matchIn(w); return esc(w.sen.slice(0, m.i)) + '<span class="blank">&nbsp;</span>' + esc(w.sen.slice(m.i + m.s.length)); };

/* rossz válaszlehetőségek: lehetőleg azonos témából */
function distract(w, field, n) {
  const pool = [...WORDS.values()].filter(x => x.id !== w.id && x[field] && x[field].toLowerCase() !== w[field].toLowerCase());
  const same = shuffle(pool.filter(x => x.topic === w.topic)), other = shuffle(pool.filter(x => x.topic !== w.topic));
  const out = [];
  for (const x of [...same, ...other]) { if (!out.includes(x[field])) out.push(x[field]); if (out.length >= n) break; }
  return out;
}

/* ================= felolvasás ================= */
let VOICE = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  VOICE = vs.find(v => /en-GB/i.test(v.lang) && /natural|neural|online/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang) && /natural|neural|online/i.test(v.name))
    || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function speak(t, rate = .95) {
  if (!('speechSynthesis' in window) || !t) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t); u.lang = VOICE ? VOICE.lang : 'en-GB'; if (VOICE) u.voice = VOICE; u.rate = rate;
  speechSynthesis.speak(u);
}

/* ================= pont, rang ================= */
const stepOf = p => { let n = 0; while (n < STEPS - 1 && T[n + 1] <= p) n++; return n; };
function rankInfo(p = S.points) { const n = stepOf(p), t = Math.floor(n / 5), d = n % 5 + 1, lo = T[n], hi = n < STEPS - 1 ? T[n + 1] : null; return { n, t, d, tr: TIERS[t], lo, hi, pct: hi ? (p - lo) / (hi - lo) * 100 : 100 }; }
let pendingUp = null;
function addPoints(n) {
  if (n <= 0) return;
  const before = stepOf(S.points);
  S.points += n; dayLog().points += n;
  const t = today();
  if (S.streak.last !== t) { S.streak.days = S.streak.last === addDays(-1) ? S.streak.days + 1 : 1; S.streak.last = t; }
  const after = stepOf(S.points);
  if (after > before) pendingUp = { from: before, to: after };
  floatPts(n); renderTop();
}
function floatPts(n) {
  const a = $('.mini') || document.body, r = a.getBoundingClientRect(), el = document.createElement('div');
  el.className = 'float'; el.textContent = '+' + n; el.style.left = (r.left + 60) + 'px'; el.style.top = (r.top + 10) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1200);
}
function toast(html, ms = 2200) { const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms); }
/* új rang (új név): teljes képernyő; csak fokozatlépés: kis értesítés */
function showRankUp() {
  if (!pendingUp) return false;
  const { from, to } = pendingUp; pendingUp = null;
  const r = rankInfo();
  if (Math.floor(from / 5) !== Math.floor(to / 5)) {
    $('#upEmb').innerHTML = emblem(r.tr, r.d, 240);
    $('#upName').textContent = r.tr.name;
    $('#upT1').textContent = 'ÚJ RANG';
    const up = $('#up'); up.classList.remove('on'); void up.offsetWidth; up.classList.add('on');
    return true;
  }
  toast(`${emblem(r.tr, r.d, 34)} Fokozatlépés: ${esc(r.tr.name)} ${r.d}`, 2600);
  return false;
}
$('#up').addEventListener('click', () => $('#up').classList.remove('on'));

/* ================= nézetek ================= */
let view = 'home', sess = null, combo = 0, advT = null, wFilter = 'all', wQuery = '', wTopic = '';
function go(v) { clearTimeout(advT); view = v; if (v !== 'session') sess = null; window.scrollTo(0, 0); render(); }
function render() {
  renderTop(); renderNav();
  const v = $('#view');
  if (view === 'session') v.innerHTML = sessionHtml();
  else if (view === 'words') { v.innerHTML = wordsHtml(); renderWordList(); }
  else if (view === 'ranks') v.innerHTML = ranksHtml();
  else if (view === 'progress') v.innerHTML = progressHtml();
  else if (view === 'settings') v.innerHTML = settingsHtml();
  else v.innerHTML = homeHtml();
  afterRender();
}
function renderTop() {
  const r = rankInfo();
  $('#top').innerHTML = `<div class="mini" data-act="go" data-v="ranks">${emblem(r.tr, r.d, 46)}<div class="mtxt"><b>${esc(r.tr.name)} ${r.d}</b><div class="mbar"><i style="width:${r.pct}%"></i></div><small>${fmt(S.points)} pont${r.hi ? ` · még ${fmt(r.hi - S.points)} a következőig` : ''}</small></div></div><div class="streak" title="Hány napja gyakorolsz egyfolytában">🔥 ${streakNow()}</div>`;
}
function renderNav() {
  const items = [['home', '🏠', 'Ma'], ['words', '📚', 'Szavaim'], ['ranks', '🏆', 'Ranglétra'], ['progress', '📈', 'Haladás'], ['settings', '⚙️', 'Beállítások']];
  const n = $('#nav'); n.classList.toggle('hide', view === 'session');
  n.innerHTML = items.map(([v, i, l]) => `<button data-act="go" data-v="${v}" class="${view === v ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('');
}

/* ---------- főoldal ---------- */
function plan() {
  const L = dayLog(), newLeft = Math.max(0, S.settings.newPerDay - L.newWords);
  return { nNew: Math.min(newLeft, newCandidates().length), nRev: Math.min(dueIds().length, 50), nSent: sentencePool().length ? 6 : 0, nShade: 3 };
}
function homeHtml() {
  const r = rankInfo(), L = dayLog(), p = plan(), due = dueIds().length, learned = learnedIds().length;
  const mastered = Object.values(S.words).filter(x => x.box >= MASTERED).length;
  const next = r.hi ? `${TIERS[Math.floor((r.n + 1) / 5)].name} ${(r.n + 1) % 5 + 1}` : '';
  const total = p.nNew + p.nRev + p.nSent + p.nShade;
  return `
  <div class="panel hero">${emblem(r.tr, r.d, 150)}
    <div style="flex:1;min-width:0"><div class="rn">${esc(r.tr.name)}</div><div class="rd">${r.d}. fokozat · ${r.n + 1}. lépcső a ${STEPS}-ből</div>
    <div class="bar"><i style="width:${r.pct}%"></i></div>
    <div class="mut small">${r.hi ? `Még <b style="color:#fff">${fmt(r.hi - S.points)}</b> pont: ${esc(next)}` : 'Elérted a csúcsot!'}</div>
    <a class="garden" href="kert/index.html">🌴 Séta a függőkertben a rangoddal</a></div>
  </div>
  <div class="panel today">
    <h3>Mai kör</h3>
    ${L.done ? `<div class="done">✓ A mai kör megvan! Ma eddig ${fmt(L.points)} pont.</div>` : `<div class="chips">
      <span class="chip">🆕 ${p.nNew} új szó</span><span class="chip">🔁 ${p.nRev} ismétlés</span><span class="chip">💬 ${p.nSent} mondat</span><span class="chip">🎯 ${p.nShade} árnyalat</span><span class="chip">⭐ ma: ${fmt(L.points)} pont</span></div>`}
    <button class="big" data-act="start" data-k="daily" ${L.done || !total ? 'disabled' : ''}>${L.done ? 'Holnap jön az új kör' : '▶ Mai kör indítása'}</button>
  </div>
  <div class="tiles">
    <button class="tile" data-act="start" data-k="new" ${newCandidates().length ? '' : 'disabled'}><div class="ic">🆕</div><b>Új szavak</b><small>még 5 szó</small></button>
    <button class="tile" data-act="start" data-k="review" ${due ? '' : 'disabled'}><div class="ic">🔁</div><b>Ismétlés</b><small>${due} esedékes</small></button>
    <button class="tile" data-act="start" data-k="sent"><div class="ic">💬</div><b>Mondatok</b><small>10 mondat</small></button>
    <button class="tile" data-act="start" data-k="shade"><div class="ic">🎯</div><b>Árnyalatok</b><small>hasonló jelentések</small></button>
  </div>
  <div class="stats" style="margin-top:14px">
    <div class="stat"><b>${learned}</b><small>megtanult szó (${WORDS.size}-ből)</small></div>
    <div class="stat"><b>${mastered}</b><small>megszilárdult</small></div>
    <div class="stat"><b>${streakNow()}</b><small>napos sorozat</small></div>
    <div class="stat"><b>${fmt(S.points)}</b><small>összes pont</small></div>
  </div>`;
}

/* ---------- kör összeállítása ---------- */
function newCards(n) {
  const ids = newCandidates().slice(0, n).map(w => w.id), out = [];
  for (let g = 0; g < ids.length; g += 4) {
    const grp = ids.slice(g, g + 4);
    grp.forEach(id => { out.push({ t: 'intro', id, sec: 'new' }); sess.newState[id] = { en2hu: false, hu2en: false }; });
    shuffle(grp).forEach(id => out.push({ t: 'mc', dir: 'en2hu', id, sec: 'new' }));
    shuffle(grp).forEach(id => out.push({ t: 'mc', dir: 'hu2en', id, sec: 'new' }));
  }
  return out;
}
function modeFor(id) {
  const b = P(id).box, c = !!matchIn(W(id));
  const m = b <= 1 ? rnd(['en2hu', 'listen']) : b === 2 ? rnd(['hu2en', c ? 'cloze' : 'en2hu']) : b === 3 ? rnd([c ? 'cloze' : 'hu2en', 'listen']) : rnd(['type', c ? 'cloze' : 'type']);
  return m === 'type' ? { t: 'type' } : { t: 'mc', dir: m };
}
const reviewCards = max => shuffle(dueIds().slice(0, max)).map(id => ({ ...modeFor(id), id, sec: 'rev' }));
function sentCards(n) {
  return shuffle(sentencePool()).slice(0, n).map(id => {
    const w = W(id), modes = [];
    if (w.shu) modes.push('trans', 'trans', 'listen');
    if (matchIn(w)) modes.push('ctx');
    return modes.length ? { t: 'sent', mode: rnd(modes), id, sec: 'sent' } : null;
  }).filter(Boolean);
}
/* Árnyalatok: hasonló jelentések közül a pontos. Előbb a már tanult szavak jönnek, a többi kitölti. */
function shadeCards(n) {
  const has = id => NEAR[id] && WORDS.has(id) && S.settings.levels.includes(W(id).level);
  const learned = shuffle(learnedIds().filter(has)), rest = shuffle(Object.keys(NEAR).filter(id => has(id) && !learned.includes(id)));
  return [...learned, ...rest].slice(0, n).map(id => ({ t: 'shade', dir: Math.random() < .7 ? 'en2hu' : 'hu2en', id, sec: 'shade' }));
}
function start(kind) {
  sess = { kind, cards: [], i: 0, newState: {}, stats: { nw: 0, rv: 0, st: 0, sh: 0, ok: 0, bad: 0 }, p0: S.points };
  const p = plan();
  if (kind === 'daily') sess.cards = [...newCards(p.nNew), ...reviewCards(50), ...sentCards(p.nSent), ...shadeCards(p.nShade)];
  if (kind === 'new') sess.cards = newCards(5);
  if (kind === 'review') sess.cards = reviewCards(50);
  if (kind === 'sent') sess.cards = sentCards(10);
  if (kind === 'shade') sess.cards = shadeCards(10);
  if (!sess.cards.length) { sess = null; toast('Most nincs ilyen feladat.'); return; }
  combo = 0; go('session');
}

/* ---------- egy kártya ---------- */
const cur = () => sess.cards[sess.i];
const SECN = { new: 'Új szavak', rev: 'Ismétlés', sent: 'Mondatértés', retry: 'Még egyszer', shade: 'Árnyalatok' };
function prepare(c) {
  if (c.opts || c.t === 'intro' || c.t === 'type') return;
  const w = W(c.id);
  if (c.t === 'shade') {
    const near = shuffle(NEAR[c.id]).slice(0, 3).map(x => x.split('|'));
    c.pairs = [[w.hu, w.en], ...near];
    const k = c.dir === 'en2hu' ? 0 : 1;
    c.correct = c.pairs[0][k]; c.opts = shuffle(c.pairs.map(x => x[k]));
    return;
  }
  if (c.t === 'sent') {
    if (c.mode === 'ctx') { c.correct = w.hu; c.opts = shuffle([w.hu, ...distract(w, 'hu', 3)]); }
    else { c.correct = w.shu; c.opts = shuffle([w.shu, ...distract(w, 'shu', 2)]); }
  } else if (c.dir === 'hu2en' || c.dir === 'cloze') { c.correct = w.en; c.opts = shuffle([w.en, ...distract(w, 'en', 3)]); }
  else { c.correct = w.hu; c.opts = shuffle([w.hu, ...distract(w, 'hu', 3)]); }
}
function sessionHtml() {
  const c = cur();
  if (!c) return summaryHtml();
  prepare(c);
  const w = W(c.id), tot = sess.cards.length;
  const head = `<div class="shead"><span class="sec">${SECN[c.sec]}</span><div class="bar"><i style="width:${sess.i / tot * 100}%"></i></div><span class="cnt">${sess.i + 1}/${tot}</span>${combo >= 3 ? `<span class="combo">🔥 ${combo}</span>` : ''}<button class="xbtn" data-act="quit">✕</button></div>`;
  const spk = (t, cls = '') => `<button class="spk ${cls}" data-act="say" data-t="${esc(t)}" title="Felolvasás">🔊</button>`;
  let body = '';
  if (c.t === 'intro') {
    body = `<span class="tag">Új szó</span>
      <div class="word">${esc(w.en)} ${spk(w.en)}</div><div class="lvl">${w.level.toUpperCase()} · ${esc(w.topic)}</div>
      <div class="mean">${esc(w.hu)}</div>
      ${w.sen ? `<div class="ex">${hl(w)} ${spk(w.sen)}</div>` : ''}${w.shu ? `<div class="exhu">${esc(w.shu)}</div>` : ''}
      <div class="btns"><button class="btn" data-act="known">Ezt már tudom</button><button class="btn pri" data-act="next">Megvan, kérdezz! ⏎</button></div>`;
  } else if (c.t === 'type') {
    body = `<span class="tag">Írd be angolul</span><div class="word hu">${esc(w.hu)}</div>
      ${matchIn(w) ? `<div class="ex">${cloze(w)}</div>` : ''}
      ${c.res ? '' : `<input class="inp" id="typed" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="angolul..."><div class="btns"><button class="btn" data-act="giveup">Nem tudom</button><button class="btn pri" data-act="check">Ellenőrzés ⏎</button></div>`}`;
  } else if (c.t === 'shade') {
    if (c.dir === 'en2hu') body = `<span class="tag shade">Árnyalat · pontosan mit jelent?</span><div class="word">${esc(w.en)} ${spk(w.en)}</div><div class="q">A válaszok hasonlóak, csak egy a pontos.</div>`;
    else body = `<span class="tag shade">Árnyalat · melyik angol szó?</span><div class="word hu">${esc(w.hu)}</div>${matchIn(w) && !c.res ? `<div class="ex">${cloze(w)}</div>` : ''}`;
  } else if (c.t === 'sent') {
    if (c.mode === 'trans') body = `<span class="tag">Mit jelent a mondat?</span><div class="sent">${esc(w.sen)} ${spk(w.sen)}</div>`;
    if (c.mode === 'listen') body = `<span class="tag">Hallás utáni értés</span>${spk(w.sen, 'huge')}<div class="q">Hallgasd meg, és válaszd ki, mit jelent.</div>${c.res ? `<div class="sent">${esc(w.sen)}</div>` : ''}`;
    if (c.mode === 'ctx') body = `<span class="tag">Szó a mondatban</span><div class="sent">${hl(w)} ${spk(w.sen)}</div><div class="q">Mit jelent itt a kiemelt rész?</div>`;
  } else {
    if (c.dir === 'en2hu') body = `<span class="tag">Mit jelent?</span><div class="word">${esc(w.en)} ${spk(w.en)}</div>`;
    if (c.dir === 'hu2en') body = `<span class="tag">Hogy mondod angolul?</span><div class="word hu">${esc(w.hu)}</div>`;
    if (c.dir === 'listen') body = `<span class="tag">Mit hallasz?</span>${spk(w.en, 'huge')}<div class="q">${c.res ? `<b style="color:#fff;font-size:22px">${esc(w.en)}</b>` : 'Hallgasd meg, és válaszd ki a jelentését.'}</div>`;
    if (c.dir === 'cloze') body = `<span class="tag">Melyik szó illik bele?</span><div class="sent">${c.res ? hl(w) : cloze(w)}</div>${w.shu ? `<div class="exhu">${esc(w.shu)}</div>` : ''}`;
  }
  if (c.opts) body += `<div class="opts">${c.opts.map((o, i) => {
    let cls = ''; if (c.res) { if (o === c.correct) cls = 'ok'; else if (i === c.res.chosen) cls = 'bad'; }
    return `<button class="opt ${cls}" data-act="ans" data-i="${i}" ${c.res ? 'disabled' : ''}><span class="k">${i + 1}</span><span>${esc(o)}</span></button>`;
  }).join('')}</div>`;
  if (c.res) body += feedbackHtml(c, w);
  return head + `<div class="card">${body}</div>`;
}
function feedbackHtml(c, w) {
  const ok = c.res.ok;
  let msg = ok ? (c.res.near ? `Majdnem tökéletes! Helyesen: <b>${esc(w.en)}</b>` : 'Helyes!') : (c.t === 'type' ? `A helyes válasz: <b>${esc(w.en)}</b>` : 'Nem ez volt.');
  if (c.mastered) msg += ' Ez a szó most megszilárdult! 🏅';
  if (c.sec === 'new' && ok && P(c.id) && c.gain) msg += ' Új szó megtanulva! 🎉';
  const showEx = c.t !== 'sent' || c.mode === 'ctx';
  const ex = showEx && w.sen ? `<div class="exs">${hl(w)}${w.shu ? `<div class="h">${esc(w.shu)}</div>` : ''}</div>` : (c.t === 'sent' && !ok ? `<div class="exs"><div class="h">${esc(w.shu)}</div></div>` : '');
  const pair = c.t === 'sent' ? '' : c.t === 'shade'
    ? `<div class="nears">${c.pairs.map((x, i) => `<div class="${i === 0 ? 'ok' : !c.res.ok && x[c.dir === 'en2hu' ? 0 : 1] === c.opts[c.res.chosen] ? 'bad' : ''}"><b>${esc(x[1])}</b><span>${esc(x[0])}</span><button class="spk sm" data-act="say" data-t="${esc(x[1])}">🔊</button></div>`).join('')}</div>`
    : `<div class="exs"><b>${esc(w.en)}</b> = ${esc(w.hu)}</div>`;
  return `<div class="fb ${ok ? 'ok' : 'bad'}">${c.gain ? `<span class="gain">+${c.gain}</span>` : ''}<b>${ok ? '✓' : '✗'} ${msg}</b>${pair}${ex}</div>
    <div class="btns"><button class="btn pri" data-act="next">Tovább ⏎</button></div>`;
}
function checkTyped(input, en) {
  const n = s => s.toLowerCase().replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim();
  const a = n(input), b = n(en);
  if (!a) return { ok: false };
  if (a === b) return { ok: true };
  if (b.length > 4 && lev(a, b) <= 1) return { ok: true, near: true };
  return { ok: false };
}
function answer(choice) {
  const c = cur(); if (!c || c.res || c.t === 'intro') return;
  if (c.t === 'type') { const r = checkTyped(choice, W(c.id).en); c.res = { ok: r.ok, near: r.near }; }
  else c.res = { ok: c.opts[choice] === c.correct, chosen: choice };
  apply(c, c.res.ok);
  render();
  const big = showRankUp();
  if (c.res.ok && !big && c.t !== 'shade') advT = setTimeout(next, c.t === 'sent' ? 1700 : 1100);
  if (!c.res.ok && c.t !== 'sent') speak(W(c.id).en);
}
function apply(c, ok) {
  const p = P(c.id), L = dayLog(), st = sess.stats;
  if (ok) { combo++; st.ok++; } else { combo = 0; st.bad++; }
  if (c.sec === 'new') {
    if (ok) {
      const ns = sess.newState[c.id]; ns[c.dir] = true;
      if (ns.en2hu && ns.hu2en && !p) { S.words[c.id] = { box: 1, due: addDays(1), learned: today(), ok: 0, bad: 0 }; L.newWords++; st.nw++; c.gain = PTS.newWord; addPoints(c.gain); }
    } else sess.cards.push({ t: 'mc', dir: c.dir, id: c.id, sec: 'new' });
  } else if (c.sec === 'rev') {
    if (ok) {
      p.box = Math.min(7, p.box + 1); p.due = addDays(INTERVALS[p.box]); p.ok = (p.ok || 0) + 1; L.reviews++; st.rv++;
      c.gain = PTS.review; if (p.box === MASTERED) { c.gain += PTS.mastered; c.mastered = true; } addPoints(c.gain);
    } else { p.box = 1; p.due = addDays(1); p.bad = (p.bad || 0) + 1; sess.cards.push({ t: 'mc', dir: 'en2hu', id: c.id, sec: 'retry' }); }
  } else if (c.sec === 'sent') {
    if (ok) { L.sentences++; st.st++; c.gain = PTS.sentence; addPoints(c.gain); }
  } else if (c.sec === 'shade') {
    if (ok) { L.shades = (L.shades || 0) + 1; st.sh++; if (!c.again) { c.gain = PTS.shade; addPoints(c.gain); } }
    else if (!c.again) sess.cards.push({ t: 'shade', dir: c.dir, id: c.id, sec: 'shade', again: true });
  } else if (c.sec === 'retry' && !ok && !c.again) sess.cards.push({ t: 'mc', dir: 'en2hu', id: c.id, sec: 'retry', again: true });
  save();
}
function next() {
  clearTimeout(advT);
  if (!sess) return;
  const c = cur();
  if (c && c.t !== 'intro' && !c.res) return;
  sess.i++;
  if (sess.i >= sess.cards.length && sess.kind === 'daily' && !dayLog().done) {
    dayLog().done = true; sess.daily = true; addPoints(PTS.daily); save();
  }
  render(); window.scrollTo(0, 0);
  if (sess && sess.i >= sess.cards.length) showRankUp();
}
function markKnown() {
  const c = cur(); if (!c || c.t !== 'intro') return;
  S.words[c.id] = { box: 4, due: addDays(INTERVALS[4]), known: true, learned: today(), ok: 0, bad: 0 };
  sess.cards = sess.cards.filter((x, i) => i <= sess.i || x.id !== c.id);
  save(); toast('Rendben, ezt a szót később csak ritkán kérdezem.'); next();
}
function summaryHtml() {
  const s = sess.stats, tot = s.ok + s.bad, acc = tot ? Math.round(s.ok / tot * 100) : 100, r = rankInfo();
  return `<div class="panel sum">${emblem(r.tr, r.d, 130)}
    <h2>Kör vége!</h2><div class="mut">${sess.daily ? `A mai kör megvan, ezért járt +${PTS.daily} pont. ` : ''}Ebben a körben <b style="color:var(--gold)">+${fmt(S.points - sess.p0)}</b> pontot szereztél.</div>
    <div class="stats">${sess.kind === 'shade' ? `<div class="stat"><b>${s.sh}</b><small>eltalált árnyalat</small></div><div class="stat"><b>${s.bad}</b><small>összekevert</small></div>` : `<div class="stat"><b>${s.nw}</b><small>új szó</small></div><div class="stat"><b>${s.rv}</b><small>ismétlés</small></div><div class="stat"><b>${s.st}</b><small>mondat${s.sh ? `, ${s.sh} árnyalat` : ''}</small></div>`}<div class="stat"><b>${acc}%</b><small>pontosság</small></div></div>
    <div class="btns">${sess.kind === 'shade' ? '<button class="btn" data-act="start" data-k="shade">Még 10 árnyalat</button>' : '<button class="btn" data-act="start" data-k="sent">Még 10 mondat</button>'}<button class="btn pri" data-act="go" data-v="home">Vissza a főoldalra</button></div></div>`;
}

/* ---------- szavaim ---------- */
function wordsHtml() {
  const f = [['all', 'Mind'], ['learning', 'Tanulás alatt'], ['mastered', 'Megszilárdult'], ['new', 'Még új']];
  return `<div class="panel"><h2>Szavaim</h2>
    <input class="search" id="wq" placeholder="Keresés angolul vagy magyarul..." value="${esc(wQuery)}">
    <div class="filt">${f.map(([k, l]) => `<button data-act="wf" data-f="${k}" class="${wFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <select class="search" id="wt" style="margin-top:8px"><option value="">Minden téma (${WORDS.size} szó)</option>${topics().map(([t, n]) => `<option value="${esc(t)}" ${wTopic === t ? 'selected' : ''}>${esc(t)} (${n})</option>`).join('')}</select>
    <details class="add"><summary>＋ Saját szó felvétele</summary>
      <div class="form"><input id="aEn" placeholder="angol szó vagy kifejezés *"><input id="aHu" placeholder="magyar jelentés *"><input id="aSen" placeholder="példamondat angolul (nem kötelező)"><input id="aShu" placeholder="a példamondat magyarul (nem kötelező)">
      <button class="btn pri" data-act="addword">Felvétel</button></div></details>
    <div id="wlist" style="margin-top:10px"></div></div>`;
}
// témák (szószámmal), a szólisták sorrendjében
function topics() { const m = new Map(); for (const w of WORDS.values()) m.set(w.topic, (m.get(w.topic) || 0) + 1); return [...m.entries()]; }
function renderWordList() {
  const q = wQuery.trim().toLowerCase();
  let list = [...WORDS.values()].filter(w => {
    const p = P(w.id);
    if (wFilter === 'new' && p) return false;
    if (wFilter === 'learning' && !(p && p.box >= 1 && p.box < MASTERED)) return false;
    if (wFilter === 'mastered' && !(p && p.box >= MASTERED)) return false;
    if (wTopic && w.topic !== wTopic) return false;
    return !q || w.en.toLowerCase().includes(q) || w.hu.toLowerCase().includes(q);
  });
  const shown = list.slice(0, 300);
  $('#wlist').innerHTML = `<div class="mut small" style="margin-bottom:6px">${list.length} szó${list.length > 300 ? ' (az első 300 látszik)' : ''}</div>` + shown.map(w => {
    const p = P(w.id);
    const st = !p ? '<span class="bx">új</span>' : p.box >= MASTERED ? '<span class="bx m">✓ megszilárdult</span>' : `<span class="bx">${[1, 2, 3, 4].map(i => `<i class="d ${p.box >= i ? 'on' : ''}"></i>`).join('')}</span>`;
    return `<div class="wrow"><button class="spk" data-act="say" data-t="${esc(w.en)}">🔊</button><div class="w"><b>${esc(w.en)}</b><small>${esc(w.hu)} · <span class="mut">${esc(w.topic)}, ${w.level.toUpperCase()}</span></small></div>${st}</div>`;
  }).join('');
}
function addWord() {
  const v = id => $('#' + id).value.trim(), en = v('aEn'), hu = v('aHu');
  if (!en || !hu) { toast('Az angol szó és a magyar jelentés kell.'); return; }
  if (WORDS.has(en.toLowerCase())) { toast('Ez a szó már benne van.'); return; }
  S.custom.push([en, hu, v('aSen'), v('aShu'), 'saját', 'b1']); buildWords(); save();
  toast(`Felvéve: ${esc(en)}. A következő új szavak között jön.`); render();
}

/* ---------- ranglétra ---------- */
function ranksHtml() {
  const r = rankInfo();
  const cols = FAMS.map(f => `<div class="fam"><h3>${f.name}</h3>${TIERS.map((t, ti) => ({ t, ti })).filter(x => x.t.fam === f.fam).map(({ t, ti }) =>
    `<div class="tier ${ti === r.t ? 'cur' : ti > r.t ? 'locked' : ''}"><div class="strip">${[1, 2, 3, 4, 5].map(d => emblem(t, d, 44)).join('')}</div><div class="tname">${t.name} <small>· ${fmt(T[ti * 5])} ponttól</small></div></div>`).join('')}</div>`).join('');
  const later = LATER.map(t => `<figure>${emblem(t, 0, 70)}<span class="lock">🔒</span><figcaption>${t.name}</figcaption></figure>`).join('');
  return `<div class="panel"><h2>Ranglétra</h2><div class="cols">${cols}</div>
    <details class="hidden-ranks"><summary>🔒 Rejtett rangok</summary><div class="later">${later}</div><p class="mut small" style="text-align:center">Az Arany szárnyas korona 5. fokozata után nyílnak meg.</p></details></div>
    <div class="panel"><h2>Így szerzel pontot</h2><div class="ptab">
      <div><span>Új szó megtanulva</span><b>+${PTS.newWord}</b></div><div><span>Helyes ismétlés</span><b>+${PTS.review}</b></div>
      <div><span>Egy szó megszilárdul (5. doboz)</span><b>+${PTS.mastered}</b></div><div><span>Helyesen értett mondat</span><b>+${PTS.sentence}</b></div><div><span>Árnyalat eltalálva</span><b>+${PTS.shade}</b></div>
      <div><span>A mai kör teljesítve</span><b>+${PTS.daily}</b></div></div>
      <p class="mut small">Pontot sosem veszítesz, rangot sem. Egy rossz válasz csak annyit jelent, hogy a szó hamarabb jön újra.</p></div>`;
}

/* ---------- haladás ---------- */
function progressHtml() {
  const days = Array.from({ length: 14 }, (_, i) => addDays(i - 13)), vals = days.map(d => (S.log[d] || {}).points || 0), mx = Math.max(50, ...vals);
  const chart = days.map((d, i) => `<div class="c"><em>${vals[i] || ''}</em><i style="height:${vals[i] / mx * 100}%"></i><small>${d.slice(8)}</small></div>`).join('');
  const bx = [0, 0, 0, 0, 0, 0, 0, 0]; Object.values(S.words).forEach(p => bx[Math.min(7, p.box)]++);
  const lab = ['', '1. doboz (holnap)', '2. doboz', '3. doboz', '4. doboz', '5. megszilárdult', '6. doboz', '7. végleges'];
  const bmx = Math.max(1, ...bx);
  const tot = Object.values(S.log).reduce((a, l) => ({ nw: a.nw + l.newWords, rv: a.rv + l.reviews, st: a.st + l.sentences }), { nw: 0, rv: 0, st: 0 });
  return `<div class="panel"><h2>Az elmúlt 14 nap pontjai</h2><div class="chart">${chart}</div></div>
    <div class="panel"><h2>Összesen</h2><div class="stats">
      <div class="stat"><b>${learnedIds().length}</b><small>tanult szó</small></div><div class="stat"><b>${tot.rv}</b><small>ismétlés</small></div>
      <div class="stat"><b>${tot.st}</b><small>értett mondat</small></div><div class="stat"><b>${S.streak.days}</b><small>leghosszabb most</small></div></div></div>
    <div class="panel"><h2>Szavak dobozonként</h2><div class="boxes">${[1, 2, 3, 4, 5, 6, 7].map(i => `<div><span>${lab[i]}</span><i style="width:${bx[i] / bmx * 60}%"></i><b>${bx[i]}</b></div>`).join('')}</div>
      <p class="mut small">Minden helyes válasz egy dobozzal feljebb viszi a szót, és egyre ritkábban jön: 1, 2, 4, 7, 14, 30, majd 60 nap múlva. Rossz válasznál visszakerül az elsőbe.</p></div>`;
}

/* ---------- beállítások ---------- */
function settingsHtml() {
  const s = S.settings;
  return `<div class="panel"><h2>Beállítások</h2>
    <div class="row"><span>Új szavak naponta</span><div class="seg">${[5, 8, 12, 15, 20].map(n => `<button data-act="npd" data-n="${n}" class="${s.newPerDay === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="row" style="align-items:flex-start"><span>Témák az új szavakhoz<br><small class="mut">Kattints egy témára a ki- vagy bekapcsoláshoz.</small></span><div class="filt" style="max-width:62%;justify-content:flex-end">${topics().map(([t, n]) => `<button data-act="topic" data-t="${esc(t)}" class="${(s.offTopics || []).includes(t) ? '' : 'on'}">${esc(t)} <small>${n}</small></button>`).join('')}<button data-act="topicall">Mind be</button></div></div>
    <div class="row"><span>Szintek</span><div class="seg">${LEVELS.map(([k, l]) => `<button data-act="lvl" data-l="${k}" class="${s.levels.includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="row"><span>Szódoboz szavai is (${SZODOBOZ.length} szó, főleg munkahelyi)<br><small class="mut">Ezekhez nincs magyar mondatfordítás, a mondatfeladatokban ritkábban jönnek.</small></span><button class="sw ${s.szodoboz ? 'on' : ''}" data-act="szd" aria-label="Szódoboz szavai"></button></div>
    <div class="row"><span>Mentés fájlba</span><button class="btn" data-act="export">⬇ Letöltés</button></div>
    <div class="row"><span>Mentés visszatöltése</span><label class="btn" style="cursor:pointer">⬆ Fájl választása<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
    <div class="row"><span>Minden haladás törlése</span><button class="btn danger" data-act="reset">Törlés</button></div>
  </div><p class="mut small" style="text-align:center">Szólétra · a haladásod ebben a böngészőben van tárolva</p>`;
}

/* ================= események ================= */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'go') go(b.dataset.v);
  else if (a === 'start') start(b.dataset.k);
  else if (a === 'quit') { if (!sess || sess.i === 0 || confirm('Kilépsz a körből? Amit eddig megtanultál, az megmarad.')) go('home'); }
  else if (a === 'say') speak(b.dataset.t, b.dataset.t.includes(' ') ? .9 : .85);
  else if (a === 'next') next();
  else if (a === 'ans') answer(+b.dataset.i);
  else if (a === 'known') markKnown();
  else if (a === 'check') answer($('#typed').value);
  else if (a === 'giveup') answer('');
  else if (a === 'wf') { wFilter = b.dataset.f; render(); }
  else if (a === 'topic') { const o = S.settings.offTopics ||= [], t = b.dataset.t; S.settings.offTopics = o.includes(t) ? o.filter(x => x !== t) : [...o, t]; if (topics().every(([x]) => S.settings.offTopics.includes(x))) S.settings.offTopics = []; save(); render(); }
  else if (a === 'topicall') { S.settings.offTopics = []; save(); render(); }
  else if (a === 'addword') addWord();
  else if (a === 'npd') { S.settings.newPerDay = +b.dataset.n; save(); render(); }
  else if (a === 'lvl') { const L = S.settings.levels, k = b.dataset.l; S.settings.levels = L.includes(k) ? (L.length > 1 ? L.filter(x => x !== k) : L) : [...L, k]; save(); render(); }
  else if (a === 'szd') { S.settings.szodoboz = !S.settings.szodoboz; buildWords(); save(); render(); }
  else if (a === 'export') {
    const kert = {}; for (const k of KERT_KEYS) { const v = localStorage.getItem(k); if (v !== null) kert[k] = v; }   // a 3D kert haladása is
    const blob = new Blob([JSON.stringify({ ...S, _kert: kert }, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = u; l.download = `szoletra-mentes-${today()}.json`; l.click(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  }
  else if (a === 'reset') { if (confirm('Biztosan törlöd az összes haladást? Ezt nem lehet visszavonni.')) { S = defaults(); buildWords(); save(); go('home'); } }
});
document.addEventListener('input', e => { if (e.target.id === 'wq') { wQuery = e.target.value; renderWordList(); } if (e.target.id === 'wt') { wTopic = e.target.value; renderWordList(); } });
document.addEventListener('change', e => {
  if (e.target.id !== 'imp' || !e.target.files[0]) return;
  e.target.files[0].text().then(txt => {
    const s = JSON.parse(txt);
    if (!s || s.v !== 1 || typeof s.points !== 'number') throw new Error('nem Szólétra-mentés');
    if (!confirm('Felülírod a mostani haladást a fájlban lévővel?')) return;
    const kert = s._kert; delete s._kert;
    if (kert && typeof kert === 'object') for (const k of KERT_KEYS) if (typeof kert[k] === 'string') localStorage.setItem(k, kert[k]);
    localStorage.setItem(KEY, JSON.stringify(s)); S = load(); buildWords(); go('home'); toast('Visszatöltve.');
  }).catch(() => toast('Ez nem egy Szólétra-mentés.'));
});
document.addEventListener('keydown', e => {
  if (view !== 'session' || !sess) return;
  if ($('#up').classList.contains('on')) { if (e.key === 'Enter' || e.key === ' ') { $('#up').classList.remove('on'); e.preventDefault(); } return; }
  const c = cur(), typing = e.target.id === 'typed';
  if (e.key === 'Enter') { e.preventDefault(); if (typing && c && !c.res) answer(e.target.value); else next(); return; }
  if (typing) return;
  if (c && c.opts && !c.res && /^[1-4]$/.test(e.key) && +e.key <= c.opts.length) answer(+e.key - 1);
  if (e.key === ' ' && c) { e.preventDefault(); const w = W(c.id); speak(c.t === 'sent' ? w.sen : w.en); }
});
/* felolvasás és fókusz, amikor egy kártya megjelenik */
function afterRender() {
  if (view !== 'session' || !sess) return;
  const c = cur(); if (!c) return;
  const ti = $('#typed'); if (ti) ti.focus();
  if (c.spoken) return; c.spoken = true;
  const w = W(c.id);
  if (c.t === 'intro' || (c.t === 'shade' && c.dir === 'en2hu') || (c.t === 'mc' && (c.dir === 'en2hu' || c.dir === 'listen'))) setTimeout(() => speak(w.en, .85), 250);
  if (c.t === 'sent' && c.mode === 'listen') setTimeout(() => speak(w.sen, .9), 300);
}

render();
