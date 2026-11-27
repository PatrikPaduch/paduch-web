// Tanulás a kertben: ismétlés "?" címkékkel, "Keresd meg!" küldetések, agyagtáblák, a kertész feladatai.
import * as THREE from 'three';
import { GARDEN_WORDS, WORD_IDS } from './words.js';
import { TABLETS, TASKS } from './tablets.js';
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
  function talk(en, hu, buttons) {
    talkEl.innerHTML = `<button class="x">✕</button><span class="tag">Nabu, a kertész</span><p class="en">“${esc(en)}”</p><p class="hu" hidden>${esc(hu)}</p><div class="row2"><button data-k="say">🔊 Még egyszer</button><button data-k="hu">Fordítás</button>${buttons || ''}</div>`;
    talkEl.classList.add('on'); ctx.say(en, .9); gard.talk(Math.min(6, en.length / 14));
    talkEl.querySelector('.x').onclick = () => talkEl.classList.remove('on');
    talkEl.dataset.en = en;
  }
  talkEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.k === 'say') { ctx.say(talkEl.dataset.en, .85); gard.talk(4); }
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
  function talkToGardener() {
    const t = taskOf();
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

  /* ---------- interakció (E gomb) ---------- */
  function target() {
    if (Math.hypot(GP.x - me.x, GP.z - me.z) < 2.8 && me.y < 1) return { kind: 'gard', text: 'E: beszélgetés Nabuval, a kertésszel' };
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
      if (talkEl.classList.contains('on') && Math.hypot(GP.x - me.x, GP.z - me.z) > 6) talkEl.classList.remove('on');
      if (tabEl.classList.contains('on')) { const t = tabs[+tabEl.dataset.i]; if (Math.hypot(t.x - me.x, t.z - me.z) > 5) tabEl.classList.remove('on'); }
    },
    update(dt, t) {
      gard.update(dt);
      if (talkEl.classList.contains('on')) { const a = Math.atan2(me.x - GP.x, me.z - GP.z); gard.object.rotation.y += (a - gard.object.rotation.y) * Math.min(1, dt * 4); }
      for (const tb of tabs) if (tb.glow.visible) tb.glow.material.opacity = .6 + .4 * Math.sin(t * 2.5 + tb.i);
    },
    closeAll() { talkEl.classList.remove('on'); tabEl.classList.remove('on'); },
  };
}
