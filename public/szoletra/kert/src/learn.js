// Tanulás a kertben: ismétlés "?" címkékkel, "Keresd meg!" küldetések, agyagtáblák, a kertész feladatai.
import * as THREE from 'three';
import { GARDEN_WORDS, WORD_IDS } from './words.js';
import { TABLETS as TABLETS0, TASKS } from './tablets.js';
import { CONVOS, CITY_TABLETS } from './citydata.js';
import { HARBOUR_CONVOS, HARBOUR_TABLETS, HARBOUR_WORDS, RIDE_TALK } from './harbourdata.js';
import { PALACE_CONVOS } from './palacedata.js';
import { TOWER_CONVOS, TOWER_WAIT, TRIALS, BRICK_POOL, GAP_ITEMS, ORDER_ITEMS, FLOORS } from './zikkdata.js';
Object.assign(CONVOS, HARBOUR_CONVOS, PALACE_CONVOS, TOWER_CONVOS, { tmerchant: [] });
// Bábel tornya: melyik tanító hányadik emelet próbáját adja; a mázas téglák színe emeletenként
const TOWER_NPC = { tbrick: 1, tforeman: 2, tworkers: 3 };
const GLAZE = ['fehér', 'fekete', 'bíbor', 'kék', 'narancs', 'ezüst', 'arany'];
const TOWER_HELLO = {
  1: ['Welcome, stranger! Every tower begins with a single brick. Do you want to try?', 'Üdv, idegen! Minden torony egyetlen téglával kezdődik. Kipróbálod?'],
  2: ['So you made it up here! I need someone who can tell me what happened yesterday.', 'Szóval feljutottál! Kell valaki, aki el tudja mondani, mi történt tegnap.'],
  3: ['Please help us! We work side by side, but our words get all mixed up.', 'Kérlek, segíts! Egymás mellett dolgozunk, de összekeverednek a szavaink.'],
};
// a kihallgatás lépései: melyik beszélgetés hányadik lépést teljesíti
const PAL_FLOW = { pguard: 1, pscribe: 2, chamberlain: 3, herald: 4, king: 5 };
const PAL_WAIT = {
  pscribe: ['First the guard at the gate must let you in.', 'Előbb a kapuőrnek kell beengednie.'],
  chamberlain: ['Have you registered your petition? The scribes are in the outer court.', 'Leadtad már a kérvényedet? Az írnokok a külső udvarban vannak.'],
  herald: ['You are not ready yet. The chamberlain must teach you the rules of the court first.', 'Még nem állsz készen. Előbb az udvarmesternek kell megtanítania az udvari szabályokat.'],
  king: ['The guards stop you: wait until the herald announces you!', 'Az őrök megállítanak: várd meg, amíg a hírnök bejelent!'],
};
import { CITY_NPC } from './city.js';
const TABLETS = [...TABLETS0, ...CITY_TABLETS, ...HARBOUR_TABLETS];   // a kert és a könyvtár táblái
import { makeGardener } from './hero.js';
import { collider } from './world.js';

const INT = [0, 1, 2, 4, 7, 14, 30];                 // doboz -> hány nap múlva jön újra
const dstr = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const sv = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const huShort = id => GARDEN_WORDS[id][1].split(',')[0].split(' (')[0];

export function createLearn(ctx) {
  const { scene, me, TRIG } = ctx;
  const near = (t, extra = 0) => Math.hypot(t.x - me.x, t.z - me.z) < t.r + extra && (t.y === null || Math.abs(t.y - me.y) < 2.6);
  const reachable = id => TRIG.some(t => t.w === id && (t.y ?? 0) <= ctx.maxH() + .5);

  /* ---------- ismétlés (dobozos, mint a Szólétrában) ---------- */
  const RV = ld('kert-ismetles', {});
  for (const id of WORD_IDS) if (ctx.isFound(id) && !RV[id]) RV[id] = { box: 1, due: dstr(0) };
  sv('kert-ismetles', RV);
  const isDue = id => ctx.isFound(id) && RV[id] && RV[id].due <= dstr(0);
  function grade(id, ok) { const r = RV[id] || { box: 1 }; r.box = ok ? Math.min(6, r.box + 1) : 1; r.due = dstr(INT[r.box]); RV[id] = r; sv('kert-ismetles', RV); }
  function onDiscover(id) { RV[id] = { box: 1, due: dstr(1) }; sv('kert-ismetles', RV); }
  function options(id) {
    const others = shuffle(WORD_IDS.filter(x => x !== id && GARDEN_WORDS[x][0] !== GARDEN_WORDS[id][0])).slice(0, 3).map(x => GARDEN_WORDS[x][0]);
    return shuffle([GARDEN_WORDS[id][0], ...others]);
  }

  /* ---------- kvíz a lenti kártyán ---------- */
  let quiz = null, busyUntil = 0;
  const card = $('word');
  function showQuiz(id, tag, prompt, onDone) {
    const opts = options(id); quiz = { id, opts, onDone, done: false };
    card.innerHTML = `<span class="tag" style="color:#ffd54a">${tag}</span><div class="hu" style="font-size:20px;margin:2px 0 8px">${prompt}</div><div class="qopts">${opts.map((o, i) => `<button data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
    card.classList.add('on');
  }
  card.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]'); if (!b || !quiz || quiz.done) return;
    const q = quiz, w = GARDEN_WORDS[q.id], ok = q.opts[+b.dataset.opt] === w[0]; q.done = true;
    card.querySelectorAll('[data-opt]').forEach(x => { x.disabled = true; if (q.opts[+x.dataset.opt] === w[0]) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
    card.insertAdjacentHTML('beforeend', `<div class="ex">${ok ? '✓ Helyes!' : '✗ Nem ez.'} <b>${esc(w[0])}</b> = ${esc(w[1])}<i>${esc(w[2])}</i></div>`);
    ctx.say(w[0]); busyUntil = performance.now() + 3200;
    q.onDone(ok);
    setTimeout(() => { if (quiz === q) quiz = null; }, 3200);
  });

  /* ---------- "Keresd meg!" küldetés ---------- */
  let MS = ld('kert-kuldetes', null), nextMs = 0;
  const msEl = $('mission');
  function newMission() {
    const pool = WORD_IDS.filter(id => ctx.isFound(id) && reachable(id) && (!MS || id !== MS.id));
    if (pool.length < 3) { MS = null; sv('kert-kuldetes', MS); renderMission(); return; }
    pool.sort((a, b) => ((isDue(b) ? 1 : 0) - (isDue(a) ? 1 : 0)) || ((RV[a]?.box || 1) - (RV[b]?.box || 1)) || Math.random() - .5);
    MS = { id: pool[Math.floor(Math.random() * Math.min(4, pool.length))], tip: null }; sv('kert-kuldetes', MS); renderMission();
  }
  function renderMission() {
    if (!MS) { msEl.innerHTML = ctx.foundCount() < 3 ? `<b>🎯 Keresd meg!</b><small>Fedezz fel legalább 3 kertszót, és jönnek a küldetések.</small>` : ''; msEl.classList.toggle('on', ctx.foundCount() < 3); return; }
    msEl.innerHTML = `<b>🎯 Keresd meg!</b><div class="big">${esc(huShort(MS.id))}</div><small>Sétálj oda, és mondd meg angolul.</small>${MS.tip ? `<small class="tip">Tipp: ${esc(MS.tip)}</small>` : ''}<div class="mb"><button data-m="tip">Tipp</button><button data-m="skip">Másikat</button></div>`;
    msEl.classList.add('on');
  }
  msEl.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b || !MS) return;
    if (b.dataset.m === 'skip') { newMission(); return; }
    const ts = TRIG.filter(t => t.w === MS.id && (t.y ?? 0) <= ctx.maxH() + .5).sort((a, c) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(c.x - me.x, c.z - me.z));
    if (ts[0]) { MS.tip = ctx.zoneAt(ts[0].x, ts[0].z, ts[0].y ?? 0); MS.hint = { x: ts[0].x + (Math.random() - .5) * 10, z: ts[0].z + (Math.random() - .5) * 10 }; sv('kert-kuldetes', MS); renderMission(); }
  });

  /* ---------- agyagtáblák ---------- */
  const readT = new Set(ld('kert-tablak', []));
  const clayTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 192; const g = c.getContext('2d'); g.fillStyle = '#b88a5a'; g.fillRect(0, 0, 256, 192); g.strokeStyle = 'rgba(70,40,15,.75)'; g.lineWidth = 3;
    for (let r = 0; r < 8; r++) for (let k = 0; k < 14; k++) { const x = 14 + k * 17 + (r % 2) * 5, y = 18 + r * 21; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 4); g.lineTo(x, y + 8); g.stroke(); if ((k + r) % 3 === 0) { g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 8, y + 9); g.stroke(); } }
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,35,15,${Math.random() * .08})`; g.fillRect(Math.random() * 256, Math.random() * 192, 3, 3); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const tabMat = new THREE.MeshStandardMaterial({ map: clayTex, roughness: .9 }), pedMat = new THREE.MeshStandardMaterial({ color: '#efe6d4', roughness: .6 });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,236,160,1)'); gr.addColorStop(.4, 'rgba(255,200,80,.5)'); gr.addColorStop(1, 'rgba(255,180,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const tabs = TABLETS.map((T, i) => {
    const [, x, z, y] = T, grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = Math.atan2(-x, -z) ;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, 1, 12), pedMat); ped.position.y = .5; ped.castShadow = true; grp.add(ped);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(.7, .5, .1), [tabMat, tabMat, tabMat, tabMat, tabMat, tabMat]); tab.position.set(0, 1.18, 0); tab.rotation.x = -.5; tab.castShadow = true; grp.add(tab);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.position.y = 1.9; glow.scale.setScalar(.8); glow.visible = !readT.has(i); grp.add(glow);
    scene.add(grp); collider(x, z, .4);
    return { i, x, z, y, glow };
  });
  const tabEl = $('tablet');
  function openTablet(t) {
    const [title, , , , en, hu, q, opts, a] = TABLETS[t.i], wasRead = readT.has(t.i);
    tabEl.innerHTML = `<button class="x">✕</button><span class="tag">Agyagtábla ${t.i + 1} / ${TABLETS.length}</span><h2>${esc(title)}</h2><p class="en">${esc(en)}</p><div class="row2"><button data-t="say">🔊 Felolvasás</button><button data-t="hu">Fordítás</button></div><p class="hu" hidden>${esc(hu)}</p>
      <div class="q"><b>${esc(q)}</b><div class="qopts">${opts.map((o, k) => `<button data-a="${k}">${esc(o)}</button>`).join('')}</div><div class="res"></div></div>`;
    tabEl.classList.add('on'); tabEl.dataset.i = t.i;
    tabEl.querySelector('.x').onclick = () => tabEl.classList.remove('on');
    tabEl.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.t === 'say') ctx.say(en, .9);
      if (b.dataset.t === 'hu') tabEl.querySelector('.hu').hidden = !tabEl.querySelector('.hu').hidden;
      if (b.dataset.a !== undefined && !tabEl.dataset.answered) {
        const ok = +b.dataset.a === a; tabEl.dataset.answered = '1';
        tabEl.querySelectorAll('[data-a]').forEach(x => { x.disabled = true; if (+x.dataset.a === a) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
        tabEl.querySelector('.res').textContent = ok ? (wasRead ? '✓ Helyes!' : '✓ Helyes! +8 pont') : '✗ Nem ez. Olvasd el még egyszer!';
        if (ok && !wasRead) { ctx.addPts(8, 'Agyagtábla elolvasva', '+8 pont · mondatértés'); }
        if (ok) { readT.add(t.i); sv('kert-tablak', [...readT]); t.glow.visible = false; }
      }
    };
    delete tabEl.dataset.answered;
  }

  /* ---------- a kertész ---------- */
  const GP = { x: -17.5, z: 61.3 };
  const gard = makeGardener(); gard.object.position.set(GP.x, 0, GP.z); gard.object.rotation.y = 0; scene.add(gard.object); collider(GP.x, GP.z, .5);
  let KS = ld('kert-kertesz', { task: null, got: 0, picked: [], visited: false, next: 0, done: 0 });
  const saveKS = () => sv('kert-kertesz', KS);
  const talkEl = $('talk'), taskEl = $('task');
  const taskOf = () => TASKS.find(t => t.id === KS.task);
  let who = { name: 'Nabu, a kertész', person: null, x: GP.x, z: GP.z };
  function talk(en, hu, buttons) {
    talkEl.innerHTML = `<button class="x">✕</button><span class="tag">${esc(who.name)}</span><p class="en">“${esc(en)}”</p><p class="hu" hidden>${esc(hu)}</p><div class="row2"><button data-k="say">🔊 Még egyszer</button><button data-k="hu">Fordítás</button>${buttons || ''}</div>`;
    talkEl.classList.add('on'); ctx.say(en, .9); (who.person || gard).talk(Math.min(6, en.length / 14));
    talkEl.querySelector('.x').onclick = () => talkEl.classList.remove('on');
    talkEl.dataset.en = en;
  }
  talkEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k === 'say') { ctx.say(talkEl.dataset.en, .85); (who.person || gard).talk(4); }
    if (b.dataset.k === 'task') { talkToGardener(true); return; }
    if (b.dataset.k === 'chat') { startConv('nabu'); return; }
    if (b.dataset.k === 'bchat') { startConv('boatman', boatN, true); return; }
    if (b.dataset.k === 'cross') {
      const dir = boatN.side || 1, rk = ctx.rank();
      if (dir > 0 && rk.tier < 1) { talk('The harbour is only for experienced travellers. Come back when you are a Silver Star!', 'A kikötő csak tapasztalt utazóknak való. Gyere vissza, ha Ezüst csillag leszel!', `</div><p class="why" style="color:#ffd54a;font-size:13.5px;margin:6px 0 0">🔒 A túlparti kikötő Ezüst csillagtól nyílik. Még ${rk.need.toLocaleString('hu-HU')} pont a Szólétrában.`); return; }
      askFare(); return;
    }
    if (b.dataset.fare) {
      const ok = b.dataset.fare === fare.k;
      if (!ok) { b.disabled = true; askFare(`Nem ez volt: „${HARBOUR_WORDS[fare.k][1].split(',')[0]}” = ${HARBOUR_WORDS[fare.k][0]}. Kérdezek mást!`); return; }
      const dir = boatN.side || 1; ctx.say('Correct! Sit down and hold on.', .9);
      ride = { dir, t: 0, i: 0, n: boatN, q: null }; talkEl.classList.remove('on'); ctx.startRide(dir); return;
    }
    if (b.dataset.rq !== undefined && (ride || rideQ) && (ride || rideQ).q) {
      const RQ = ride || rideQ, L = RIDE_TALK[RQ.dir][2], ok = +b.dataset.rq === L[3]; talkEl.querySelectorAll('[data-rq]').forEach(x => { x.disabled = true; if (+x.dataset.rq === L[3]) x.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      ctx.say(ok ? 'Well done! You listen carefully.' : 'Not quite. Listen to the river next time!', .9);
      if (ok && !RQ.q.paid) { RQ.q.paid = true; ctx.addPts(5, 'Hallás utáni értés a csónakban', '+5 pont'); }
      RQ.q.done = true; rideQ = null; return;
    }
    if (b.dataset.k === 'trial') { startTrial(TOWER_NPC[towerN.id]); return; }
    if (b.dataset.k === 'tchat') { startConv(towerN.id, towerN, true); return; }
    if (b.dataset.k === 'tnext') { if (trial) nextItem(); return; }
    if (b.dataset.k === 'tclear' && trial) { trial.built = []; renderItem(); return; }
    if (b.dataset.tr !== undefined && trial && !trial.answered) { answerTrial(b.dataset.tr, b); return; }
    if (b.dataset.chip !== undefined && trial && !trial.answered) { trial.built.push(+b.dataset.chip); if (trial.built.length === trial.cur.toks.length) answerTrial(trial.built.map(k => trial.cur.toks[k]).join(' ').toLowerCase(), null); else renderItem(); return; }
    if (b.dataset.k === 'cnext') { conv.si++; if (conv.si < conv.c.steps.length) showStep(); else endConv(); return; }
    if (b.dataset.rep !== undefined && conv) { replyConv(b); return; }
    if (b.dataset.k === 'hu') talkEl.querySelector('.hu').hidden = !talkEl.querySelector('.hu').hidden;
    if (b.dataset.k === 'ok') { const t = TASKS[KS.next % TASKS.length]; KS = { task: t.id, got: 0, picked: [], visited: false, next: KS.next + 1, done: KS.done }; saveKS(); talkEl.classList.remove('on'); renderTask(); ctx.toast('Új feladat a kertésztől', 'figyeld, mit kért!'); }
    if (b.dataset.k === 'other') { KS.next++; saveKS(); offer(); }
    if (b.dataset.ans !== undefined && !talkEl.dataset.answered) {
      const t = taskOf(), ok = +b.dataset.ans === t.ask[2]; talkEl.dataset.answered = '1';
      talkEl.querySelectorAll('[data-ans]').forEach(x => { x.disabled = true; if (+x.dataset.ans === t.ask[2]) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
      if (ok) finishTask("That's right! Thank you, my friend.", 'Így van! Köszönöm, barátom.');
      else { KS.visited = false; saveKS(); renderTask(); setTimeout(() => talk('Hmm, not quite. Go and have another look, then come back.', 'Hmm, nem egészen. Menj, nézd meg még egyszer, aztán gyere vissza.'), 1400); }
    }
  });
  function offer() { const t = TASKS[KS.next % TASKS.length]; talk(t.en, t.hu, `<button data-k="ok" class="pri">Elvállalom</button><button data-k="other">Másikat</button>`); }
  function finishTask(en, hu) { KS.done++; KS.task = null; saveKS(); renderTask(); talk(en, hu); ctx.addPts(15, 'Feladat teljesítve', '+15 pont · a kertész megköszönte'); }
  function nabuMenu() {
    who = { name: 'Nabu, a kertész', person: null, x: GP.x, z: GP.z };
    talk('Hello, my friend! Do you want to help me, or shall we have a little chat?', 'Szervusz, barátom! Segítesz nekem, vagy beszélgessünk egy kicsit?',
      `<button data-k="task" class="pri">🧑‍🌾 Feladat</button><button data-k="chat" class="pri">💬 Beszélgessünk</button>`);
  }
  function talkToGardener(fromMenu) {
    who = { name: 'Nabu, a kertész', person: null, x: GP.x, z: GP.z };
    const t = taskOf();
    if (!fromMenu && (!t || !(t.ask ? KS.visited : KS.got >= t.n))) { nabuMenu(); return; }
    if (!t) { offer(); return; }
    if (t.ask) {
      if (!KS.visited) { talk(t.en, t.hu); return; }
      talk(t.ask[0], '', `</div><div class="qopts">${t.ask[1].map((o, k) => `<button data-ans="${k}">${esc(o)}</button>`).join('')}`); delete talkEl.dataset.answered; return;
    }
    if (KS.got >= t.n) { finishTask('Wonderful, that is exactly what I needed. Thank you!', 'Csodás, pont erre volt szükségem. Köszönöm!'); return; }
    talk(t.en, t.hu);
  }
  function renderTask() {
    const t = taskOf();
    if (!t) { taskEl.classList.remove('on'); return; }
    const prog = t.ask ? (KS.visited ? '✓ megnézted · vissza a kertészhez' : '👀 menj és nézd meg') : `${t.icon} ${KS.got} / ${t.n}${KS.got >= t.n ? ' · vissza a kertészhez' : ''}`;
    taskEl.innerHTML = `<b>🧑‍🌾 Nabu feladata</b><div>${prog}</div><button data-r="1">🔊 Mit is kért?</button>`;
    taskEl.classList.add('on');
  }
  taskEl.addEventListener('click', e => { if (e.target.closest('[data-r]')) { const t = taskOf(); if (t) ctx.say(t.en, .88); } });
  function pickable() {
    const t = taskOf(); if (!t || !t.src || KS.got >= t.n) return null;
    let best = null, bd = 1e9;
    TRIG.forEach((tr, k) => { if (tr.w !== t.src || KS.picked.includes(k)) return; const d = Math.hypot(tr.x - me.x, tr.z - me.z); if (d < Math.min(tr.r, 3.6) && (tr.y === null || Math.abs(tr.y - me.y) < 2.6) && d < bd) { bd = d; best = k; } });
    return best;
  }

  /* ---------- beszélgetések: az NPC angolul mond valamit, te választod ki a jó angol választ ---------- */
  const CD = ld('kert-beszelgetes', {});        // beszélgetés-kulcs -> utolsó teljesítés napja
  let conv = null;
  /* ---------- a révész: átkelés a túlpartra (Ezüst csillagtól), viteldíj = egy jó angol válasz ---------- */
  let boatN = null, fare = null, ride = null, rideQ = null;
  const FARE = ['oar', 'anchor', 'deck', 'mast', 'hull', 'pier', 'cargo', 'barge', 'ferry'];
  function boatMenu(n) {
    boatN = n; who = { name: n.name, person: n.person, x: n.x, z: n.z };
    const dir = n.side || 1;
    talk(dir > 0 ? 'Shall I take you across the river to the north harbour?' : 'Do you want to go back to the city?', dir > 0 ? 'Átvigyelek a folyón az északi kikötőbe?' : 'Vissza akarsz menni a városba?',
      `<button data-k="cross" class="pri">⛵ ${dir > 0 ? 'Átkelés a túlpartra' : 'Vissza a városba'}</button><button data-k="bchat">💬 Beszélgessünk</button>`);
  }
  function askFare(note) {
    const pool = FARE.filter(k => HARBOUR_WORDS[k] && k !== fare?.k), k = pool[Math.floor(Math.random() * pool.length)], w = HARBOUR_WORDS[k];
    const wrong = shuffle(FARE.filter(x => x !== k)).slice(0, 2), opts = shuffle([k, ...wrong]);
    fare = { k, opts };
    talk(`My fare is one English word. How do you say "${w[1].split(',')[0]}" in English?`, `A viteldíjam egy angol szó. Hogy mondod angolul: „${w[1].split(',')[0]}”?`,
      `</div>${note ? `<p class="why" style="color:#ff9aa6;font-size:13.5px;margin:6px 0 0">${esc(note)}</p>` : ''}<div class="cnv"><small>⛵ Viteldíj · válaszd ki az angol szót:</small>${opts.map(o => `<button data-fare="${o}">${esc(HARBOUR_WORDS[o][0])}</button>`).join('')}`);
  }
  /* ---------- Bábel tornya: emeletek próbái ---------- */
  let towerN = null, trial = null;
  const TW = () => (CD._torony ||= { done: 0, day: {} });
  function towerMenu(n) {
    towerN = n; who = { name: n.name, person: n.person, x: n.x, z: n.z };
    const f = TOWER_NPC[n.id], T = TRIALS[f - 1], done = TW().done >= f, h = TOWER_HELLO[f];
    talk(h[0], h[1], `<button data-k="trial" class="pri">🧱 ${done ? 'Újra: ' : 'Próba: '}${esc(T.title)}</button><button data-k="tchat">💬 Beszélgessünk</button></div>${done ? `<p class="why" style="color:#7fe0a0;font-size:13.5px;margin:6px 0 0">✓ Ezt az emeletet már teljesítetted, a ${GLAZE[f - 1]} mázas tégla a tiéd. Gyakorolni bármikor lehet.</p>` : `<p class="why" style="color:#8fa3c8;font-size:13.5px;margin:6px 0 0">${T.need} tégla kell. Minden jó válasz lerak egyet, minden hiba leejt egyet.</p>`}<div>`);
  }
  function startTrial(f) {
    const T = TRIALS[f - 1];
    const items = T.kind === 'pick' ? shuffle(BRICK_POOL.filter(id => GARDEN_WORDS[id])) : T.kind === 'gap' ? shuffle(GAP_ITEMS) : shuffle(ORDER_ITEMS);
    trial = { f, T, items, i: 0, bricks: 0, fell: -1, built: [], cur: null, answered: false, miss: 0 };
    talk(T.intro[0], T.intro[1], `<button data-k="tnext" class="pri">Kezdjük ⏎</button>`);
  }
  function nextItem() {
    const t = trial, it = t.items[t.i++ % t.items.length]; t.answered = false; t.built = []; t.fell = -1;
    if (t.T.kind === 'pick') { const wrong = shuffle(BRICK_POOL.filter(x => x !== it && GARDEN_WORDS[x])).slice(0, 3); t.cur = { id: it, opts: shuffle([it, ...wrong]) }; }
    if (t.T.kind === 'gap') t.cur = { g: it, opts: shuffle(it[1].map((o, k) => k)) };
    if (t.T.kind === 'order') { const toks = it[0].split(' ').map(w => w === 'I' ? w : w.toLowerCase()); let ord; do ord = shuffle(toks.map((_, k) => k)); while (toks.length > 2 && ord.every((v, k) => v === k)); t.cur = { s: it, toks, ord }; }
    renderItem(true);
  }
  const bricksHtml = () => `<div class="brk">${Array.from({ length: trial.T.need }, (_, k) => `<i class="${k < trial.bricks ? 'on' : ''}${k === trial.fell ? ' fall' : ''}"></i>`).join('')}<small>${trial.bricks} / ${trial.T.need}</small></div>`;
  function renderItem(speak) {
    const t = trial, c = t.cur, head = `</div>${bricksHtml()}<div class="cnv">`;
    if (t.T.kind === 'pick') {
      const hu = huShort(c.id);
      (speak ? talk : quietTalk)(pickLine(), 'Melyik tégla kell?', `${head}<small>🧱 Hogy mondod angolul: <b style="color:#fff">„${esc(hu)}”</b>?</small>${c.opts.map(o => `<button data-tr="${o}">${esc(GARDEN_WORDS[o][0])}</button>`).join('')}<div class="react"></div>`);
    }
    if (t.T.kind === 'gap') {
      const g = c.g;
      (speak ? talk : quietTalk)(g[0].replace('___', '…'), g[3], `${head}<small>🧱 Melyik szó illik a helyére?</small>${c.opts.map(k => `<button data-tr="${k}">${esc(g[1][k])}</button>`).join('')}<div class="react"></div>`);
    }
    if (t.T.kind === 'order') {
      const used = new Set(t.built), line = t.built.map(k => c.toks[k]).join(' ');
      (speak ? talk : quietTalk)(c.ord.map(k => c.toks[k]).join(' · '), c.s[1], `${head}<small>🧱 Zakir összekeverte a szavakat. Rakd őket sorba, hogy Ubar megértse:</small><div class="built">${line ? esc(line.charAt(0).toUpperCase() + line.slice(1)) : '<span style="color:#5a6a8a">koppints a szavakra sorban…</span>'}</div><div class="chips">${c.ord.map(k => `<button data-chip="${k}" ${used.has(k) ? 'disabled' : ''}>${esc(c.toks[k])}</button>`).join('')}</div><div class="row2"><button data-k="tclear">↺ Újrakezdem</button></div><div class="react"></div>`);
    }
  }
  const PICK_LINES = ['Next brick, please!', 'Bring me another one!', 'Good. And this one?', 'Careful with this one!', 'The wall is growing!'];
  const pickLine = () => PICK_LINES[Math.floor(Math.random() * PICK_LINES.length)];
  // ugyanaz, mint a talk, de nem olvassa fel újra (a mondatrendezésnél minden koppintás újrarajzol)
  function quietTalk(en, hu, buttons) { const s0 = ctx.say; ctx.say = () => { }; try { talk(en, hu, buttons); } finally { ctx.say = s0; } }
  function answerTrial(v, b) {
    const t = trial, c = t.cur; let ok, right, why;
    if (t.T.kind === 'pick') { ok = v === c.id; right = GARDEN_WORDS[c.id][0]; why = `„${huShort(c.id)}” angolul: ${right}.`; }
    if (t.T.kind === 'gap') { ok = +v === c.g[2]; right = c.g[0].replace('___', c.g[1][c.g[2]]); why = c.g[4]; }
    if (t.T.kind === 'order') { right = c.s[0]; ok = v === c.toks.join(' ').toLowerCase(); why = 'A helyes sorrend: ' + right; }
    t.answered = true;
    if (ok) t.bricks++; else { t.miss++; if (t.bricks > 0) { t.bricks--; t.fell = t.bricks; } }
    if (t.T.kind === 'order') renderItem(); else talkEl.querySelector('.brk').outerHTML = bricksHtml();
    talkEl.querySelectorAll('[data-tr]').forEach(x => { x.disabled = true; const good = t.T.kind === 'pick' ? x.dataset.tr === c.id : +x.dataset.tr === c.g[2]; if (good) x.classList.add('ok'); else if (x === b) x.classList.add('bad'); });
    const re = talkEl.querySelector('.react');
    if (ok) {
      ctx.say(t.T.kind === 'pick' ? GARDEN_WORDS[c.id][0] : right, .9); (who.person || gard).talk(2);
      if (t.bricks >= t.T.need) { setTimeout(() => finishTrial(), 900); re.innerHTML = `<p class="en" style="color:#7fe0a0">✓ Kész a fal!</p>`; return; }
      re.innerHTML = `<p class="en" style="color:#7fe0a0">✓ ${t.T.kind === 'order' ? esc(right) : 'Jó!'}</p>`;
      const id = t; setTimeout(() => { if (trial === id && t.answered) nextItem(); }, t.T.kind === 'order' ? 1500 : 900);
    } else {
      ctx.say(t.T.kind === 'gap' || t.T.kind === 'order' ? right : 'No, no! That brick broke.', .9); (who.person || gard).talk(3);
      re.innerHTML = `<p class="why">✗ ${t.fell >= 0 ? 'Egy tégla leesett és összetört. ' : ''}${esc(why)}</p><div class="row2"><button data-k="tnext" class="pri">Tovább ⏎</button></div>`;
    }
  }
  function finishTrial() {
    const t = trial, f = t.f, st = TW(), first = st.done < f, day = dstr(0); trial = null;
    const next = FLOORS[f], col = GLAZE[f - 1];
    talk(first ? `Well done! Here is your ${['white', 'black', 'purple', 'blue', 'orange', 'silver', 'golden'][f - 1]} glazed brick. Look at the tower!` : 'Well done! Your wall is as strong as ever.', first ? `Szép munka! Itt a ${col} mázas téglád. Nézz fel a toronyra!` : 'Szép munka! A falad ugyanolyan erős, mint eddig.');
    if (first) {
      st.done = f; st.day[f] = day; sv('kert-beszelgetes', CD);
      setTimeout(() => { ctx.addPts(30, `🧱 ${f}. emelet teljesítve`, `+30 pont · a ${col} sáv kigyúlt a tornyon`); ctx.onFloor && ctx.onFloor(f); }, 700);
      if (next) setTimeout(() => ctx.toast(`🏛 Következő: ${next[0]}`, `${next[2]}, ${next[1]}`), 3600);
    } else if (st.day[f] !== day) { st.day[f] = day; sv('kert-beszelgetes', CD); ctx.addPts(5, 'Gyakorlás a toronyban', `+5 pont · ${t.miss ? t.miss + ' hibával' : 'hiba nélkül'}`); }
  }
  function startConv(id, n, chat) {
    if (id === 'boatman' && !chat && n) { boatMenu(n); return; }
    if (TOWER_NPC[id] && !chat && n) { towerMenu(n); return; }
    if (TOWER_WAIT[id]) { if (n) who = { name: n.name, person: n.person, x: n.x, z: n.z }; talk(TOWER_WAIT[id][0], TOWER_WAIT[id][1]); return; }
    const list = CONVOS[id]; if (!list) return;
    if (PAL_FLOW[id]) { const P = CD._palota || { step: 0 }; if (P.step < PAL_FLOW[id] - 1) { if (n) who = { name: n.name, person: n.person, x: n.x, z: n.z }; const w = PAL_WAIT[id]; talk(w[0], w[1]); return; } }
    if (n) who = { name: n.name, person: n.person, x: n.x, z: n.z };
    let ci = list.findIndex((c, i) => CD[id + i] !== dstr(0)); if (ci < 0) ci = Math.floor(Math.random() * list.length);
    conv = { id, ci, c: list[ci], si: 0, first: 0, wrong: false };
    showStep();
  }
  function showStep() {
    const st = conv.c.steps[conv.si]; conv.wrong = false;
    const reps = shuffle(st.replies.map((r, i) => i));
    talk(st.say, st.hu, `</div><div class="cnv"><small>💬 ${esc(conv.c.title)} · ${conv.si + 1}/${conv.c.steps.length} · Válaszolj angolul:</small>${reps.map(i => `<button data-rep="${i}">${esc(st.replies[i][0])}</button>`).join('')}<div class="react"></div>`);
  }
  function replyConv(b) {
    const st = conv.c.steps[conv.si], r = st.replies[+b.dataset.rep], ok = r[1] === 1, re = talkEl.querySelector('.react');
    ctx.say(r[2], .9); (who.person || gard).talk(3);
    if (ok) {
      if (!conv.wrong) conv.first++;
      talkEl.querySelectorAll('[data-rep]').forEach(x => { x.disabled = true; if (x === b) x.classList.add('ok'); });
      re.innerHTML = `<p class="en">“${esc(r[2])}”</p><div class="row2"><button data-k="cnext" class="pri">${conv.si + 1 < conv.c.steps.length ? 'Tovább ⏎' : 'Befejezés'}</button></div>`;
    } else {
      conv.wrong = true; b.disabled = true; b.classList.add('bad');
      const lv = r[4] === 'nyers' ? '<b>Túl nyers.</b> ' : r[4] === 'kor' ? '<b>Túl körülményes.</b> ' : '';
      re.innerHTML = `<p class="en">“${esc(r[2])}”</p><p class="why">✗ ${lv}${esc(r[3] || 'Ez nem illik ide.')} Próbáld újra!</p>`;
    }
  }
  function endConv() {
    const key = conv.id + conv.ci, n = conv.c.steps.length, fresh = CD[key] !== dstr(0);
    CD[key] = dstr(0); sv('kert-beszelgetes', CD);
    const pts = fresh ? 5 + 3 * conv.first : 0;
    if (conv.c.bye) talk(conv.c.bye[0], conv.c.bye[1]);
    else talk(conv.first === n ? 'Lovely talking to you!' : 'It was nice to talk to you. See you soon!', conv.first === n ? 'Öröm volt veled beszélgetni!' : 'Jó volt beszélgetni. Hamarosan találkozunk!');
    if (pts) ctx.addPts(pts, 'Beszélgetés: ' + conv.c.title, `+${pts} pont · ${conv.first}/${n} elsőre jó válasz`);
    if (PAL_FLOW[conv.id]) {
      const P = CD._palota || { step: 0 }; P.step = Math.max(P.step, PAL_FLOW[conv.id]);
      if (conv.id === 'king' && !P.seal) { P.seal = true; P.sealDate = dstr(0); setTimeout(() => { ctx.addPts(50, '👑 Királyi pecsét', '+50 pont · a pecsét mostantól a rangjelvényed mellett áll'); ctx.onSeal && ctx.onSeal(); }, 1600); }
      const next = { 1: 'Következő lépés: az írnok a külső udvarban', 2: 'Következő lépés: az udvarmester a kertben', 3: 'Következő lépés: a hírnök a trónterem kapujában', 4: 'Következő lépés: lépj a trón elé (E)' }[PAL_FLOW[conv.id]];
      if (next && conv.id !== 'king') setTimeout(() => ctx.toast('👑 Kihallgatás', next), 1200);
      CD._palota = P; sv('kert-beszelgetes', CD);
    }
    conv = null;
  }

  /* ---------- interakció (E gomb) ---------- */
  function target() {
    if (Math.hypot(GP.x - me.x, GP.z - me.z) < 2.8 && me.y < 1) return { kind: 'gard', text: 'E: beszélgetés Nabuval, a kertésszel' };
    const np = CITY_NPC.find(n => n.id && CONVOS[n.id] && !n.hidden && Math.hypot(n.talkX - me.x, n.talkZ - me.z) < 2.4 && (n.y === undefined || Math.abs(n.y - me.y) < 2));
    if (np && np.away) return { kind: 'closed', text: `${np.name.split(',')[0]} standja zárva · ${np.opens || '7'} órakor nyit` };
    if (np) return { kind: 'npc', n: np, text: `E: beszélgetés · ${np.name}` };
    const tb = tabs.find(t => Math.hypot(t.x - me.x, t.z - me.z) < 2.4 && Math.abs(t.y - me.y) < 1.5);
    if (tb) return { kind: 'tab', t: tb, text: 'E: az agyagtábla elolvasása' };
    const pk = pickable(); if (pk !== null) { const t = taskOf(); return { kind: 'pick', k: pk, text: `E: ${t.item === 'water' ? 'megtöltöd a kannát' : 'leszedsz egyet'} (${t.icon})` }; }
    return null;
  }
  renderMission(); renderTask();

  return {
    isDue, onDiscover, missionId: () => MS && MS.id,
    needsQuiz: id => ((MS && id === MS.id) || isDue(id)) && !(quiz && quiz.id === id),
    hint: () => target()?.text || null,
    interact() {
      const tg = target(); if (!tg) return false;
      if (tg.kind === 'gard') talkToGardener();
      if (tg.kind === 'npc') startConv(tg.n.id, tg.n);
      if (tg.kind === 'tab') openTablet(tg.t);
      if (tg.kind === 'pick') { const t = taskOf(); KS.got++; KS.picked.push(tg.k); saveKS(); renderTask(); ctx.toast(`+1 ${t.icon}`, `${KS.got} / ${t.n}${KS.got >= t.n ? ' · vidd vissza Nabunak!' : ''}`); }
      return true;
    },
    // a lenti kártya: küldetés-cél vagy esedékes ismétlés esetén kvíz
    cardBusy: () => performance.now() < busyUntil || (quiz && !quiz.done),
    takeWord(id) {
      if (MS && id === MS.id) {
        showQuiz(id, '🎯 Megtaláltad!', `Hogy mondod angolul: <b style="color:#fff">${esc(huShort(id))}</b>?`, ok => { grade(id, ok); if (ok) ctx.addPts(10, 'Küldetés teljesítve', '+10 pont · megtaláltad és tudtad'); MS = null; sv('kert-kuldetes', MS); renderMission(); nextMs = performance.now() + 5000; });
        return true;
      }
      if (isDue(id)) { showQuiz(id, '❓ Ismétlés', `Mi ez angolul? <b style="color:#fff">${esc(huShort(id))}</b>`, ok => { grade(id, ok); if (ok) ctx.addPts(3, 'Ismétlés', '+3 pont'); }); return true; }
      return false;
    },
    cardHidden() { if (quiz && !quiz.done) quiz = null; },
    labelMode: id => (MS && id === MS.id) ? 'hide' : isDue(id) ? 'quiz' : 'normal',
    mapHint: () => MS && MS.hint,
    slow() {
      if (!MS && performance.now() > nextMs && ctx.foundCount() >= 3) newMission();
      else if (!MS) renderMission();
      const t = taskOf();
      if (t && t.visit && !KS.visited && TRIG.some(tr => tr.w === t.visit && near(tr))) { KS.visited = true; saveKS(); renderTask(); ctx.toast('Megnézted!', 'menj vissza Nabuhoz, és válaszolj'); }
      if (talkEl.classList.contains('on') && !who.ride && Math.hypot(who.x - me.x, who.z - me.z) > 6) { talkEl.classList.remove('on'); conv = null; trial = null; }
      if (tabEl.classList.contains('on')) { const t = tabs[+tabEl.dataset.i]; if (Math.hypot(t.x - me.x, t.z - me.z) > 5) tabEl.classList.remove('on'); }
    },
    update(dt, t) {
      gard.update(dt);
      if (talkEl.classList.contains('on') && !who.person) { const a = Math.atan2(me.x - GP.x, me.z - GP.z); gard.object.rotation.y += (a - gard.object.rotation.y) * Math.min(1, dt * 4); }
      for (const tb of tabs) if (tb.glow.visible) tb.glow.material.opacity = .6 + .4 * Math.sin(t * 2.5 + tb.i);
    },
    closeAll() { talkEl.classList.remove('on'); tabEl.classList.remove('on'); trial = null; },
    towerDone: () => (CD._torony || { done: 0 }).done,
    rideTick(dt) {
      if (!ride) return; ride.t += dt; const L = RIDE_TALK[ride.dir];
      const say = (en, hu, extra) => { who = { name: ride.n.name, person: { talk() { } }, ride: true }; talk(en, hu, extra); };
      if (ride.i === 0 && ride.t > 2.5) { ride.i = 1; say(L[0][0], L[0][1]); }
      if (ride.i === 1 && ride.t > 11) { ride.i = 2; say(L[1][0], L[1][1]); }
      if (ride.i === 2 && ride.t > 20) { ride.i = 3; ride.q = { done: false }; say(L[2][0], L[2][1], `</div><div class="cnv"><small>🎧 Mit mondott a révész?</small>${L[2][2].map((o, k) => `<button data-rq="${k}">${esc(o)}</button>`).join('')}`); }
    },
    rideEnd() { if (ride && (!ride.q || ride.q.done)) talkEl.classList.remove('on'); if (ride && ride.q && !ride.q.done) { who.ride = false; rideQ = ride; } ride = null; },
  };
}
