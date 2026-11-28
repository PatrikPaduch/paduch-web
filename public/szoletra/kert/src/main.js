// Szemiramisz függőkertje: a Szólétra 3D kertje. A törpe feje fölött mindig a Szólétra-rangod lebeg.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { emblem, TIERS, STEPS } from '../../emblems.js';
import { PLAZA, CITY, PIER, PAL, ZG, ZGATE, ZIG_TIERS, ZIG_FLOOR_Y, ZIG_STAIRS, LV, LAKE, ISLAND, CANALS, FOUNTAINS, BASIN, STAIRS, P, heightAt, blocked, layout, makeTour, wordTriggers, LOCK_TIER, maxLevelFor } from './world.js';
import { loadTextures, makeMats, TEX, U } from './mats.js';
import { buildWorld, LANTERNS } from './build.js';
import { buildFlora, CULL } from './flora.js';
import { loadHero } from './hero.js';
import { ShadowCache } from './shadowcache.js';
import { makeLife } from './life.js';
import { GardenAudio } from './audio.js';
import { GARDEN_WORDS, WORD_IDS, CITY_IDS, HARB_IDS, PAL_IDS, TOWER_IDS, DAY_IDS } from './words.js';
import { buildDays } from './days.js';
import { buildCity, CITY_TRIG, CITY_MAP } from './city.js';
import { buildHarbour, HARB_MAP } from './harbour.js';
import { buildPalace, PAL_LIGHTS, PAL_BLDG } from './palace.js';
import { buildZiggurat, ZIG_BLDG, BAND } from './zigg.js';
import { FLOORS } from './zikkdata.js';
import { createLearn } from './learn.js';
import { initSync } from '../../sync.js';
// a paduch.hu-n előbb lehúzzuk a legfrissebb mentést, hogy a kert már azzal induljon
const SYNC = initSync(); if (SYNC.ready) await SYNC.ready;

/* ---------- minőség ---------- */
const touch = matchMedia('(pointer: coarse)').matches;
const QUAL = {
  low: { pr: Math.min(devicePixelRatio || 1, 1), shadow: 0, dens: .45, maps: false, rigged: false, lights: 0 },
  high: { pr: Math.min(devicePixelRatio || 1, 2), shadow: 4096, dens: 1, maps: true, rigged: true, lights: 6 },
};
let qual = localStorage.getItem('kert-q') || (touch ? 'low' : 'high');
const q = QUAL[qual];
if (touch) { document.body.classList.add('touch'); addEventListener('DOMContentLoaded', () => {}); document.getElementById('ui').classList.add('min'); document.getElementById('hide').textContent = '▸'; }

/* ---------- betöltő ---------- */
let steps = 0; const TOTAL = 22;
const prog = (t) => { steps++; document.getElementById('lbar').style.width = Math.min(100, steps / TOTAL * 100) + '%'; if (t) document.getElementById('ltxt').textContent = t; };

/* ---------- renderelő, jelenet, égbolt ---------- */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(q.pr); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .74;
renderer.shadowMap.enabled = !!q.shadow; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(52, 1, .1, 3000);
scene.fog = new THREE.FogExp2('#cdd8e2', .0016);
const sky = new Sky(); sky.scale.setScalar(2500); { const u = sky.material.uniforms; u.turbidity.value = 2.4; u.rayleigh.value = 1.3; u.mieCoefficient.value = .004; u.mieDirectionalG.value = .82; }
scene.add(sky);
const hemi = new THREE.HemisphereLight('#dfeeff', '#a88a60', .3); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 3.1); scene.add(sun, sun.target);
if (q.shadow) { sun.castShadow = true; sun.shadow.mapSize.set(q.shadow, q.shadow); const c = sun.shadow.camera; c.left = -58; c.right = 58; c.top = 58; c.bottom = -58; c.near = 1; c.far = 420; sun.shadow.bias = -.0003; sun.shadow.normalBias = .04; }
// csillagok és hold (éjjel)
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, y = Math.random() * .95 + .05, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 1500, y * 1500, Math.sin(a) * r * 1500], i * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: '#e6eeff', size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false })); m.frustumCulled = false; m.renderOrder = -1; return m; })();
scene.add(stars);
const moonDir = new THREE.Vector3(-.35, .78, -.52).normalize();
const moon = new THREE.Mesh(new THREE.CircleGeometry(38, 32), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false, transparent: true, opacity: 0, depthWrite: false })); moon.position.copy(moonDir).multiplyScalar(1400); moon.lookAt(0, 0, 0); scene.add(moon);
const lampLights = Array.from({ length: q.lights }, () => { const l = new THREE.PointLight('#ffb35a', 0, 15, 2); scene.add(l); return l; });

let hero = null, M = null, life = null, sc = null, blob = null, ready = false, learn = null, city = null, harbour = null, palace = null, zigg = null, days = null;
const audio = new GardenAudio();
const me = { x: 0, z: 104, y: 0, ang: Math.PI, spd: 0 };
const cam = { yaw: 0, pitch: .3, dist: 7.5 };
let TRIG = [];

async function init() {
  prog('Textúrák...');
  await loadTextures(renderer, () => prog());
  scene.environment = TEX.env; scene.environmentIntensity = .5;
  M = makeMats(q);
  prog('A kert alaprajza...'); layout(q.dens); TRIG = wordTriggers();
  prog('Teraszok, falak, kapuk...'); await tick(); scene.add(buildWorld(M, q));
  prog('Növények...'); await tick(); scene.add(await buildFlora(M, q, () => prog()));
  prog('Babilon utcái...'); await tick(); city = buildCity(M, q); scene.add(city.root); harbour = buildHarbour(M, q); scene.add(harbour.root); palace = buildPalace(M, q); scene.add(palace.root);
  zigg = buildZiggurat(M, q, towerDone()); scene.add(zigg.root); TRIG.push(...CITY_TRIG);
  // a mai nap a városban (eső, karaván, esküvő...): a dátumból jön
  days = buildDays(M, q, { TRIG, cityPeople: city.people, audio, pan: (x, z) => panTo(x, z), addPts, toast: toastK }); scene.add(days.root); days.set(days.todayType()); days.instantWeather();
  prog('A törpe...'); hero = await loadHero(q.rigged); scene.add(hero.object); hero.object.traverse(o => { if (o.isMesh && !o.material.blending) o.castShadow = true; });
  prog('Élet a kertben...'); life = makeLife(scene, q);
  learn = createLearn({ scene, me, TRIG, isFound: id => found.has(id), foundCount: () => found.size, say, addPts, maxH: () => LV[maxI].h, zoneAt, toast: toastK,
    rank: () => ({ tier: rk ? rk.t : 0, need: rk ? Math.max(0, T[5] - rk.p) : 0 }),
    onSeal: () => showSeal(),
    onFloor: f => floorDone(f),
    onConv: id => days && days.onConv(id),
    startRide: dir => { if (sitting) toggleSit(); if (autoWalk) setAuto(false); harbour.rideStart(dir); cam.yaw = (dir > 0 ? 0 : Math.PI) + Math.PI; cam.dist = 9; cam.pitch = .32; zoneShow('Átkelés az Eufráteszen', 'Szóköz: átugrás'); } });
  days.bindLearn(learn);
  { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); blob.renderOrder = 3; scene.add(blob); }
  if (q.shadow) { sc = new ShadowCache(renderer, sun); sc.collect(scene, [hero.object]); const hp = new THREE.Vector3(); sc.dynPoint = () => hp.set(me.x, me.y + 1.1, me.z); }
  applyRank(true);
  prog('Shaderek fordítása...'); await tick();
  updateSky(true); onResize(); renderer.compile(scene, camera);
  drawMapBase(); refreshUI(); updWordCount(); showSeal();
  ready = true; document.getElementById('load').classList.add('off');
  if (resumed) { zoneShow('Folytatod, ahol abbahagytad', resumed.zone || ''); zoneNow = zoneOf()[0]; } else zoneShow('Szemiramisz függőkertje', 'Üdv a kertben');
  setTimeout(dayBanner, 3600);
  loop();
}
const tick = () => new Promise(r => setTimeout(r, 0));

/* ---------- napszak: valós idő vagy kiválasztott ---------- */
let tod = localStorage.getItem('kert-tod') || 'real', dayF = 1, lastSun = new THREE.Vector3(), sunT = 0, hemiBase = .3;
let hourOverride = null, camLift = 0;   // csak teszteléshez (__kert.hour)
const hourNow = () => hourOverride ?? (tod === 'dawn' ? 6.2 : tod === 'day' ? 15.5 : tod === 'dusk' ? 17.55 : tod === 'eve' ? 19.4 : tod === 'night' ? 22.3 : tod === 'late' ? 2.5 : (d => d.getHours() + d.getMinutes() / 60)(new Date()));
const sunDir = new THREE.Vector3(), lightDir = new THREE.Vector3();
const C1 = new THREE.Color(), FOG_D = new THREE.Color('#cdd8e2'), FOG_N = new THREE.Color('#0d1730'), FOG_S = new THREE.Color('#e8b48a');
function updateSky(force) {
  const a = (hourNow() - 6) / 12 * Math.PI;
  sunDir.set(Math.cos(a), Math.sin(a) * .9, .42).normalize();
  dayF = THREE.MathUtils.smoothstep(sunDir.y, -.08, .22);
  const low = 1 - THREE.MathUtils.smoothstep(sunDir.y, .05, .35);           // naplemente-színek
  sky.material.uniforms.sunPosition.value.copy(sunDir);
  const useSun = dayF > .12; lightDir.copy(useSun ? sunDir : moonDir);
  sun.color.set(useSun ? '#fff0d8' : '#9fb8ff'); if (useSun) sun.color.lerp(C1.set('#ff7e30'), low * .85);
  sun.intensity = useSun ? 3.1 * dayF * (1 + .5 * low) : .55 * (1 - dayF);
  hemi.intensity = .3 * dayF + .14 * (1 - dayF); hemi.color.set(dayF > .5 ? '#dfeeff' : '#4a5f9a'); if (useSun) hemi.color.lerp(C1.set('#ffc49a'), low * .6);
  scene.environmentIntensity = .5 * dayF + .06;
  renderer.toneMappingExposure = .74 + .28 * (1 - dayF);
  scene.fog.color.copy(FOG_D).lerp(FOG_S, low * dayF * .6).lerp(FOG_N, 1 - dayF);
  stars.material.opacity = Math.pow(1 - dayF, 2); moon.material.opacity = 1 - dayF;
  lampLights.forEach(l => l.visible = dayF < .85);   // nappal ki vannak véve a számításból (különben minden pixel fizet értük)
  // időjárás a mai napból: felhős vagy poros ég, sűrűbb köd, gyengébb napfény
  const W = days ? days.weather : null, wk = W && W.kind ? W.k : 0;
  scene.fog.density = .0016;
  if (wk > 0) {
    const dust = W.kind === 'dust';
    C1.set(dust ? '#bf8f5c' : '#8c96a1').lerp(FOG_N, 1 - dayF); scene.fog.color.lerp(C1, wk);
    scene.fog.density = .0016 + wk * (dust ? .019 : .0075);
    sun.intensity *= 1 - wk * (dust ? .5 : .68); if (dust && useSun) sun.color.lerp(C1.set('#ff9a50'), wk * .5);
    hemi.intensity *= 1 + wk * .25; scene.environmentIntensity *= 1 - wk * .3;
    stars.material.opacity *= 1 - wk; moon.material.opacity *= 1 - wk;
  }
  hemiBase = hemi.intensity;
  if (M) {
    M.lamp.emissiveIntensity = .15 + 3.6 * (1 - dayF);
    M.water.emissive.set('#0a3a55'); M.water.emissiveIntensity = .35 * (1 - dayF);
    M.fall.emissiveIntensity = .25 + .6 * (1 - dayF);
  }
  if (sc && (force || lightDir.distanceTo(lastSun) > .015)) { lastSun.copy(lightDir); sc.invalidate(); }
}

/* ---------- irányítás ---------- */
const keys = {}, joy = { x: 0, y: 0, on: false };
let autoWalk = localStorage.getItem('kert-auto') !== '0', wp = 0, TOURP = makeTour(0), sitting = null, pose = null, poseT = 0;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); audio.start();
  if (harbour && harbour.riding) { if (k === ' ') { harbour.rideSkip(); e.preventDefault(); } if (k === 'm') document.getElementById('map').classList.toggle('off'); if (k !== 'escape') return; }
  keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'm') document.getElementById('map').classList.toggle('off');
  if (k === 'e' && learn && !learn.interact()) toggleSit();
  if (k === 'escape') {   // előbb a nyitott ablakokat zárja, ha nincs ilyen: szünet-menü
    const open = ['wlist', 'talk', 'tablet'].some(id => document.getElementById(id).classList.contains('on'));
    if (open && !paused) { document.getElementById('wlist').classList.remove('on'); learn && learn.closeAll(); } else togglePause();
  }
  if (paused) return;
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && autoWalk) setAuto(false);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

/* ---------- mentés: hol állsz, merre nézel (Esc-menü, és magától is: félpercenként és bezáráskor) ---------- */
let paused = false, lastSaveKey = '';
function saveGame(manual) {
  if (!ready || (harbour && harbour.riding)) return;
  const z = zoneOf(), d = { x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.y.toFixed(2), ang: +me.ang.toFixed(3), yaw: +cam.yaw.toFixed(3), pitch: +cam.pitch.toFixed(3), dist: +cam.dist.toFixed(2), zone: z[0], t: Date.now() };
  const key = [d.x, d.z, d.ang].map(v => v.toFixed(1)).join('|');
  if (!manual && key === lastSaveKey) return;          // ha nem mozdultál, nem írjuk újra (szinkron-forgalom)
  lastSaveKey = key; localStorage.setItem('kert-mentes', JSON.stringify(d));
  if (manual) document.getElementById('psave').textContent = 'Elmentve: ' + z[0] + ' · ' + new Date(d.t).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}
function pauseInfo() {
  let m = null; try { m = JSON.parse(localStorage.getItem('kert-mentes')); } catch (e) { }
  document.getElementById('pwhere').textContent = zoneOf()[0];
  document.getElementById('psave').textContent = m ? 'Utolsó mentés: ' + m.zone + ' · ' + new Date(m.t).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Még nincs mentés.';
}
function togglePause(on = !paused) {
  if (!ready) return;
  paused = on; const el = document.getElementById('pause'); el.classList.toggle('on', on);
  for (const k in keys) keys[k] = false;
  if (on) { pauseInfo(); travelList(); dayPanel(); audio.pause(true); learn && learn.closeAll(); } else { audio.pause(document.hidden); clock.getDelta(); }
}
document.getElementById('pause').addEventListener('click', e => {
  const b = e.target.closest('[data-p]'); if (!b) return;
  const a = b.dataset.p;
  if (a === 'go') togglePause(false);
  if (a === 'save') saveGame(true);
  if (a === 'quit') { saveGame(true); SYNC.flush ? SYNC.flush(true).finally(() => { location.href = '../index.html'; }) : setTimeout(() => { location.href = '../index.html'; }, 400); }
  if (a === 'home') travel(0);
  if (a === 'tp') travel(+b.dataset.i);
  if (a === 'dgo') { const D = days.day; travelTo(D.go[0], D.go[1], D.go[2], D.name, D.where); }
  if (a === 'dday' && DEV) { if (days.force(b.dataset.id) && sc) sc.collect(scene, [hero.object]); if (sc) sc.invalidate(); updateSky(true); dayPanel(); }
});
/* ---------- gyors utazás a menüből ---------- */
// [felirat, x, z, nézési irány, helyszín, alcím, feltétel]
const TRAVEL = [
  ['⛩ A kert bejárata', 0, 104, Math.PI, 'Az Istár-kapu előtt', 'a kert bejárata'],
  ['🦁 Az Istár-kapu (város)', 0, 119, 0, 'Babilon utcái', 'az Istár-kapun túl'],
  ['🧺 A Nagy Piac', 0, 153, 0, 'A Nagy Piac', 'árusok, fűszerek, alku'],
  ['📜 A Táblaház', () => CITY_MAP.lib[2] + 3, 171, -Math.PI / 2, 'A Táblaház', 'Babilon könyvtára'],
  ['🥬 A konyhakert', () => CITY_MAP.garden[0] - 2.5, 177, Math.PI / 2, 'A konyhakert', 'ágyások, méhkasok'],
  ['⛵ A rakpart, a hajós', 20, 231, 0, 'Az Eufrátesz partja', 'rakpart, csónakok, móló'],
  ['⚓ A túlparti kikötő', 20, 325, 0, 'A túlparti kikötő', 'uszályok, daru, matrózok', () => DEV || (rk && rk.t >= 1) ? '' : 'Ezüst csillagtól'],
  ['👑 A palotakapu', -75, 149.5, -Math.PI / 2, 'A palotakapu', 'Nabukodonozor palotája'],
  ['🏛 Bábel tornya, kapu', 75, 200.5, Math.PI / 2, 'A torony kapuja', 'a szent körzet bejárata'],
  ['🧱 A téglavetők udvara', 121, 184.6, Math.PI, 'Téglavetők udvara', 'Bábel tornya · 1. emelet'],
  // az építők emelője: a legmagasabb emelet tanítójához visz, ahová már szabad
  ['🏗 Emelő a toronyban', () => LIFT[zigFloorMax() - 1][0], () => LIFT[zigFloorMax() - 1][1], () => LIFT[zigFloorMax() - 1][2], () => FLOORS[zigFloorMax() - 1][0], () => `Bábel tornya · ${zigFloorMax()}. emelet`, () => zigFloorMax() >= 2 ? '' : 'az 1. emelet után'],
];
// az emelők érkezése emeletenként: a tanító elé, felé fordulva
const LIFT = [[121, 184.6, Math.PI], [162.6, 158.4, Math.PI], [171.2, 178.4, 0], [176.4, 175.4, 0], [182.6, 175.2, 0], [187.3, 174.6, 0], [191, 176, 0]];
const tv = v => typeof v === 'function' ? v() : v;
function travelList() {
  const el = document.getElementById('tgrid'); if (!el) return;
  el.innerHTML = TRAVEL.map((t, i) => { const lock = t[6] ? t[6]() : ''; return `<button data-p="tp" data-i="${i}" ${lock ? 'disabled' : ''}>${t[0]}${lock ? `<small>🔒 ${lock}</small>` : i === TRAVEL.length - 1 ? `<small>${tv(t[5])}</small>` : ''}</button>`; }).join('');
}
function travel(i) {
  const t = TRAVEL[i]; if (t[6] && t[6]()) return;
  travelTo(tv(t[1]), tv(t[2]), tv(t[3]), tv(t[4]), tv(t[5]));
}
function travelTo(x, z, ang, zone, sub) {
  Object.assign(me, { x, z, y: heightAt(x, z), ang, spd: 0 }); cam.yaw = ang + Math.PI; sitting = null; pose = null;
  if (z > PLAZA.z1 && autoWalk) setAuto(false); else if (autoWalk) nearestWp();
  learn && learn.closeAll(); togglePause(false); zoneNow = zone; zoneShow(zone, sub);
}
/* ---------- változatos napok: a mai nap a menüben és felirattal ---------- */
let cityBanner = false, bannerT = -1e9;
function dayPanel() { const el = document.getElementById('pday'); if (el && days) el.innerHTML = days.pauseHTML(DEV); }
function dayBanner() { if (!days || !days.day || paused) return; const D = days.day; bannerT = performance.now(); if (me.z > PLAZA.z1) cityBanner = true; zoneShow(`${D.icon} Ma Babilonban: ${D.name}`, D.sub); }
document.getElementById('menu').addEventListener('click', () => togglePause());
setInterval(() => { if (ready && !paused) saveGame(false); }, 30000);
addEventListener('pagehide', () => { saveGame(false); SYNC.flush && SYNC.flush(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveGame(false); SYNC.flush && SYNC.flush(true); } });
let drag = null;
canvas.addEventListener('pointerdown', e => { audio.start(); drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => { if (!drag) return; cam.yaw -= (e.clientX - drag.x) * .006; cam.pitch = Math.min(1.3, Math.max(-.15, cam.pitch + (e.clientY - drag.y) * .004)); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', e => { cam.dist = Math.min(40, Math.max(2.5, cam.dist * (e.deltaY > 0 ? 1.1 : .9))); e.preventDefault(); }, { passive: false });
// érintéses joystick
{ const j = document.getElementById('joy'), knob = j.querySelector('i');
  const mv = e => { const r = j.getBoundingClientRect(), dx = e.clientX - r.left - 60, dy = e.clientY - r.top - 60, l = Math.min(50, Math.hypot(dx, dy)), a = Math.atan2(dy, dx); joy.x = Math.cos(a) * l / 50; joy.y = Math.sin(a) * l / 50; knob.style.transform = `translate(${joy.x * 40}px,${joy.y * 40}px)`; };
  j.addEventListener('pointerdown', e => { audio.start(); joy.on = true; j.setPointerCapture(e.pointerId); mv(e); if (autoWalk) setAuto(false); });
  j.addEventListener('pointermove', e => joy.on && mv(e));
  const up = () => { joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; }; j.addEventListener('pointerup', up); j.addEventListener('pointercancel', up); }

let maxI = 0;
const canStand = (x, z, h0) => !blocked(x, z) && !(days && days.blocked(x, z)) && !(x < -80.4 && z > PLAZA.z1 && z < 232 && palaceLocked()) && !(x > 84 && z > PLAZA.z1 && z < 232 && heightAt(x, z) > zigH + .45) && Math.abs(heightAt(x, z) - h0) < .7 && (z > PLAZA.z1 || x < PLAZA.x0 || heightAt(x, z) <= LV[maxI].h + .45);   // a teraszok rangzára csak a kertben
let stepDist = 0;
// tempó: séta / futás (Shift) m/s-ban; a választás megmarad
const PACE = { slow: [2.9, 6.2], norm: [4.4, 8.5], fast: [6.5, 12] };
let pace = PACE[localStorage.getItem('kert-tempo')] ? localStorage.getItem('kert-tempo') : 'norm';
function stepMe(dt) {
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), iz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (joy.on) { ix = joy.x; iz = joy.y; }
  const manual = Math.hypot(ix, iz) > .15;
  if (sitting) { if (manual) toggleSit(); else { me.spd = 0; return; } }
  let mx = 0, mz = 0, speed = 0;
  if (manual) {
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    mx = fx * -iz + rx * ix; mz = fz * -iz + rz * ix; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    speed = PACE[pace][keys.shift ? 1 : 0] * Math.min(1, Math.hypot(ix, iz) * (joy.on ? 1.6 : 1));
  } else if (autoWalk) {
    const [tx, tz] = TOURP[wp], dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz);
    if (d < .6) wp = (wp + 1) % TOURP.length; else { mx = dx / d; mz = dz / d; speed = 2.4; }
  }
  if (speed) {
    const nx = me.x + mx * speed * dt, nz = me.z + mz * speed * dt, h0 = heightAt(me.x, me.z);
    if (autoWalk && !manual) { me.x = nx; me.z = nz; }
    else if (canStand(nx, nz, h0)) { me.x = nx; me.z = nz; } else if (canStand(nx, me.z, h0)) me.x = nx; else if (canStand(me.x, nz, h0)) me.z = nz; else speed = 0;
    if (speed) { const ta = Math.atan2(mx, mz); let da = ta - me.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); me.ang += da * Math.min(1, dt * 9); }
    if (autoWalk && !drag) { let dy = me.ang + Math.PI - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cam.yaw += dy * Math.min(1, dt * .8); }
  }
  me.spd += (speed - me.spd) * Math.min(1, dt * 8);
  me.y += (heightAt(me.x, me.z) - me.y) * Math.min(1, dt * 14);
  stepDist += me.spd * dt; if (stepDist > (me.spd > 4 ? 1.3 : .75)) { stepDist = 0; audio.step(!paved(me.x, me.z)); }
}
function paved(x, z) {
  const m = Math.max(Math.abs(x), Math.abs(z));
  if (me.y > 1) { const i = LV.findIndex(l => Math.abs(l.h - me.y) < 1); if (i < 0 || i === 4) return true; return m > LV[i].r - 4; }
  return (m > 46 && m < 54) || (Math.abs(x) < 5 && z > 54) || (x < -54 && Math.abs(z) < 3) || (Math.abs(z + 66) < 2.6 && Math.abs(x) < 48) || (x > 52 && x < 70 && Math.abs(z + 4) < 1.8);
}
function nearestWp() { let b = 0, bd = 1e9; TOURP.forEach(([x, z], i) => { const d = Math.hypot(x - me.x, z - me.z) + Math.abs(heightAt(x, z) - me.y) * 4; if (d < bd) { bd = d; b = i; } }); wp = b; }
function setAuto(v) { autoWalk = v; if (v) { if (sitting) toggleSit(); nearestWp(); } localStorage.setItem('kert-auto', v ? '1' : '0'); refreshUI(); }

/* ---------- pad: leülés ---------- */
function nearBench() { let best = null, bd = 1.9; for (const b of P.benches) { const d = Math.hypot(b.x - me.x, b.z - me.z); if (d < bd && Math.abs(b.y - me.y) < 1) { bd = d; best = b; } } return best; }
function toggleSit() {
  if (sitting) { const b = sitting; sitting = null; pose = null; me.x = b.x + Math.sin(b.ry - Math.PI) * .9; me.z = b.z + Math.cos(b.ry - Math.PI) * .9; return; }
  const b = nearBench(); if (!b) return; if (autoWalk) setAuto(false);
  sitting = b; pose = 'sit'; me.ang = b.ry - Math.PI; me.x = b.x - Math.sin(me.ang) * .12; me.z = b.z - Math.cos(me.ang) * .12; me.y = b.y; me.spd = 0;
}

/* ---------- rang: a fej fölött, rangzár, kinézet ---------- */
const T = Array.from({ length: STEPS }, (_, n) => 150 * n + 11 * n * (n - 1));
const readS = () => { try { return JSON.parse(localStorage.getItem('szoletra-v1')); } catch (e) { return null; } };
function myRank() { const p = (readS() || {}).points || 0; let n = 0; while (n < STEPS - 1 && T[n + 1] <= p) n++; return { t: Math.floor(n / 5), d: n % 5 + 1, n, p }; }
let rk = null, locks = null;
const tol = name => name.endsWith('a') ? name.slice(0, -1) + 'ától' : name + 'tól';
// királyi pecsét a rangjelvény mellett (a kihallgatás jutalma)
function showSeal() { let P = null; try { P = JSON.parse(localStorage.getItem('kert-beszelgetes') || '{}')._palota; } catch (e) { } document.getElementById('seal').hidden = !(P && P.seal); }
// a palota Arany csillagtól nyílik; helyben (localhost) nyitva, hogy fejlesztés közben bejárható legyen
const DEV = /^(localhost|127\.)/.test(location.hostname), PAL_TIER = 2;
const palaceLocked = () => !DEV && (!rk || rk.t < PAL_TIER);
// Bábel tornya: emeletenként nyílik (az előző emelet próbája + a rang kell); helyben a rang nem számít
const towerDone = () => { try { return (JSON.parse(localStorage.getItem('kert-beszelgetes') || '{}')._torony || {}).done || 0; } catch (e) { return 0; } };
function zigFloorMax() { let F = Math.min(7, towerDone() + 1); while (F > 1 && !DEV && (!rk || rk.t < FLOORS[F - 1][3])) F--; return F; }
let zigH = 0, ZLOCKS = [], zlocks = null;
function zigRefresh() {
  const d = towerDone(); if (zigg && zigg.lit !== d) { zigg.setLit(d); if (sc) sc.invalidate(); mapZig = null; }
  const h = ZIG_FLOOR_Y[zigFloorMax() - 1]; if (h === zigH && zlocks) return; zigH = h;
  if (zlocks) { scene.remove(zlocks); zlocks.traverse(o => o.geometry && o.geometry.dispose()); }
  zlocks = new THREE.Group(); ZLOCKS = [];
  for (const s of ZIG_STAIRS) {
    if (s.k === 'land' || !(s.h0 <= zigH + .01 && s.h1 > zigH + .01)) continue;
    const a = s.a0 + (zigH - s.h0) / (s.h1 - s.h0) * (s.a1 - s.a0) + Math.sign(s.a1 - s.a0) * .6, w = s.ax === 'x' ? s.z1 - s.z0 : s.x1 - s.x0;
    const g = new THREE.PlaneGeometry(w, 3.4); g.attributes.uv.array.forEach((v, i, arr) => { arr[i] = v * (i % 2 ? 1.6 : w / 2); });
    const m = new THREE.Mesh(g, lockMat);
    if (s.ax === 'x') { m.position.set(a, zigH + 1.7, (s.z0 + s.z1) / 2); m.rotation.y = Math.PI / 2; } else m.position.set((s.x0 + s.x1) / 2, zigH + 1.7, a);
    zlocks.add(m); ZLOCKS.push({ x: m.position.x, z: m.position.z, y: zigH });
  }
  scene.add(zlocks);
}
function floorDone(f) { zigRefresh(); const c = ['fehér', 'fekete', 'bíbor', 'kék', 'narancs', 'ezüst', 'arany'][f - 1]; setTimeout(() => f === 7 ? zoneShow('Elkészült Bábel tornya', 'arany szentély, Istár csillaga, fehér lépcső') : zoneShow(`Kigyúlt a ${c} sáv`, `Bábel tornya · ${f}. emelet teljesítve`), 2200); }
const azNum = n => (n === 1 || n === 5 ? 'az ' : 'a ') + n + '.';
function applyRank(first) {
  const r = myRank(), changed = !rk || r.n !== rk.n;
  if (!changed) return;
  const up = rk && r.n > rk.n; rk = r;
  document.getElementById('emb').innerHTML = emblem(TIERS[r.t], r.d, 74); document.getElementById('rname').textContent = `${TIERS[r.t].name} ${r.d}`;
  hero.setRank(TIERS[r.t]);
  const newMax = maxLevelFor(r.t); if (newMax !== maxI || first) { const opened = !first && newMax > maxI; maxI = newMax; TOURP = makeTour(maxI); if (autoWalk) nearestWp(); buildLocks(); if (opened) toastK(`Megnyílt: ${maxI + 1}. terasz`, 'a rangod nyitotta meg'); }
  zigRefresh();
  if (up) { pose = 'dance'; poseT = 4; toastK(`Új rang: ${TIERS[r.t].name} ${r.d}`, 'gratulálok!'); }
}
addEventListener('storage', e => { if (e.key === 'szoletra-v1' && hero) applyRank(); });
const lockTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.strokeStyle = 'rgba(255,214,120,.9)'; g.lineWidth = 3; for (let i = -128; i < 256; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
const lockMat = new THREE.MeshBasicMaterial({ map: lockTex, color: '#ffcf6a', transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
let LOCKS = [];
function buildLocks() {
  if (locks) { scene.remove(locks); locks.traverse(o => o.geometry && o.geometry.dispose()); }
  locks = new THREE.Group(); LOCKS = [];
  for (const s of STAIRS) {
    if (s.i <= maxI) continue;
    const w = s.w * 2, g = new THREE.PlaneGeometry(w, 3.4); g.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 1.6 : w / 2); });
    const m = new THREE.Mesh(g, lockMat), inward = s.a1 > s.a0 ? 1 : -1;
    if (s.ax === 'z') m.position.set(0, s.h0 + 1.7, s.a0 + inward); else { m.position.set(s.a0 + inward, s.h0 + 1.7, 0); m.rotation.y = Math.PI / 2; }
    locks.add(m); LOCKS.push({ s, x: m.position.x, z: m.position.z, y: s.h0 });
  }
  scene.add(locks);
}
function lockPrompt() {
  const el = document.getElementById('lock'); let near = null;
  for (const L of LOCKS) if (Math.hypot(L.x - me.x, L.z - me.z) < 7 && Math.abs(L.y - me.y) < 2) near = L;
  if (!near && palaceLocked() && Math.hypot(me.x + 78, me.z - 149.5) < 7) { const tr = TIERS[PAL_TIER], left = Math.max(0, T[PAL_TIER * 5] - rk.p); el.innerHTML = `${emblem(tr, 1, 46)}<div>🔒 A <b>királyi palota</b> ${tr.name.toLowerCase()}tól nyílik.<br><small style="color:#8fa3c8">Még ${left.toLocaleString('hu-HU')} pont a Szólétrában.</small></div>`; el.classList.add('on'); return; }
  const zl = ZLOCKS.find(L => Math.hypot(L.x - me.x, L.z - me.z) < 6 && Math.abs(L.y - me.y) < 2.5);
  if (!near && zl) {
    const F = zigFloorMax(), N = F + 1, d = towerDone();
    if (d < F) { const fl = FLOORS[F - 1]; el.innerHTML = `<div style="font-size:30px">🧱</div><div>🔒 ${azNum(N).replace(/^./, c => c.toUpperCase())} emelet ${azNum(F)} emelet próbája után nyílik.<br><small style="color:#8fa3c8">${fl[2]} vár${/ és /.test(fl[2]) ? 'nak' : ''} ${fl[1]}.</small></div>`; }
    else { const tr = TIERS[FLOORS[N - 1][3]], left = Math.max(0, T[FLOORS[N - 1][3] * 5] - rk.p); el.innerHTML = `${emblem(tr, 1, 46)}<div>🔒 ${azNum(N).replace(/^./, c => c.toUpperCase())} emelet ${tol(tr.name).replace(/^./, c => c.toLowerCase())} nyílik.<br><small style="color:#8fa3c8">Még ${left.toLocaleString('hu-HU')} pont a Szólétrában.</small></div>`; }
    el.classList.add('on'); return;
  }
  if (!near) { el.classList.remove('on'); return; }
  const need = LOCK_TIER[near.s.i], tr = TIERS[need], left = Math.max(0, T[need * 5] - rk.p);
  el.innerHTML = `${emblem(tr, 1, 46)}<div>🔒 A <b>${near.s.i + 1}. terasz</b> ${tol(tr.name).replace(/^./, c => c.toLowerCase())} nyílik.<br><small style="color:#8fa3c8">Még ${left.toLocaleString('hu-HU')} pont a Szólétrában.</small></div>`;
  el.classList.add('on');
}
const plate = document.getElementById('plate'), v3 = new THREE.Vector3();
function placePlate() {
  v3.set(me.x, me.y + hero.top + .35, me.z); const d = v3.distanceTo(camera.position); v3.project(camera);
  if (v3.z > 1) { plate.style.display = 'none'; return; }
  plate.style.display = 'flex'; const sc2 = Math.min(1.4, Math.max(.6, 9 / d));
  plate.style.transform = `translate(${(v3.x * .5 + .5) * innerWidth - 37}px, ${(-v3.y * .5 + .5) * innerHeight - 92}px) scale(${sc2})`;
}

/* ---------- kertszavak ---------- */
let found = new Set(JSON.parse(localStorage.getItem('kert-szavak') || '[]')), wordNow = null, wordHide = 0;
const cool = {}, CITY_SET = new Set(CITY_IDS), HARB_SET = new Set(HARB_IDS), PAL_SET = new Set(PAL_IDS), TOWER_SET = new Set(TOWER_IDS), DAY_SET = new Set(DAY_IDS);
let VOICE = null; const pickVoice = () => { const vs = speechSynthesis.getVoices(); VOICE = vs.find(v => /en-GB/i.test(v.lang) && /natural|neural|online/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang) && /natural|neural|online/i.test(v.name)) || vs.find(v => /en-GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; };
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(t, rate = .88) { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = VOICE ? VOICE.lang : 'en-GB'; if (VOICE) u.voice = VOICE; u.rate = rate; speechSynthesis.speak(u); }
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function addPts(n, title, sub, word) {
  const S = readS() || { v: 1, settings: { newPerDay: 8, levels: ['a2', 'b1', 'b2'], szodoboz: false }, words: {}, custom: [], points: 0, log: {}, streak: { days: 0, last: null } };
  S.custom ||= []; if (word && !S.custom.some(r => r[0].toLowerCase() === word[0].toLowerCase())) S.custom.push([word[0], word[1], word[2], word[3], word[5] || 'kert', word[4]]);
  S.points = (S.points || 0) + n; const t = today(); S.log ||= {}; S.log[t] ||= { points: 0, newWords: 0, reviews: 0, sentences: 0, shades: 0, done: false }; S.log[t].points += n;
  S.streak ||= { days: 0, last: null }; if (S.streak.last !== t) { const y = new Date(); y.setDate(y.getDate() - 1); const ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0'); S.streak.days = S.streak.last === ys ? S.streak.days + 1 : 1; S.streak.last = t; }
  localStorage.setItem('szoletra-v1', JSON.stringify(S));
  toastK(title, sub); applyRank();
}
function discover(id) {
  const w = GARDEN_WORDS[id]; found.add(id); localStorage.setItem('kert-szavak', JSON.stringify([...found]));
  addPts(5, `Új ${DAY_SET.has(id) ? 'napi ' : TOWER_SET.has(id) ? 'torony' : PAL_SET.has(id) ? 'palota' : HARB_SET.has(id) ? 'kikötői ' : CITY_SET.has(id) ? 'város' : 'kert'}szó: ${w[0]}`, '+5 pont · bekerült a Szólétrába', w); updWordCount(); learn && learn.onDiscover(id);
  if (!sitting && pose !== 'dance') { pose = 'interact'; poseT = 1.3; }
}
/* ---------- lebegő szócímkék: a szó ott marad a tárgy fölött, amíg a közelben vagy ---------- */
const LABEL_H = { umbrella: 3.2, puddle: 1.1, thunder: 7, soaked: 2.5, camel: 3.2, caravan: 3.6, saddle: 3, traveller: 2, wedding: 6, bride: 2.6, groom: 2.6, guest: 2.5, sandstorm: 6.5, dust: 1.6, scarf: 2.5, shutter: 3.2, porter: 2.6, gangplank: 1.5, pearl: 1.6, ivory: 1.3, crier: 2.8, decree: 2, crowd: 2.7, trumpet: 2.6, juggler: 2.7, acrobat: 2.7, bunting: 4.4, applause: 2.6, wheat: 1.6, sickle: 2.3, sheaf: 1.5, grain: 1.5, idiom: 1.6, storyteller: 2.6, tale: 1.2, envoy: 2.8, interpreter: 2.6, treaty: 1.3, astronomer: 2.8, zodiac: 2.6, comet: 5.2, constellation: 5.2, eclipse: 5.2, planet: 5.4, horizon: 1.8, omen: 1.4, fate: 2.7, ziggurat: 9, priest: 2.6, clay: 1.2, straw: 2, mould: 1.7, brick: 2.2, bucket: 1.5, kiln: 4.6, sledge: 1.9, worker: 3, scaffolding: 14, shrine: 10, foreman: 2.8, language: 2.8, audience: 6.5, petition: 2, chamberlain: 2.8, herald: 2.8, garden: 2.2, pool: 1.6, residence: 7.5, tower: 18, treasury: 5.5, gazelle: 1.9, palace: 6, throne: 4.2, crown: 2.9, courtier: 2.6, guard: 2.7, banner: 9, brazier: 2.4, crane: 7.2, warehouse: 8.6, ship: 9.6, mast: 9, barge: 2.6, hull: 4.2, keel: 1.9, customs: 5.6, pier: 1.6, ferry: 2.2, dock: 1.8, pulley: 6.6, cedar: 2.2, timber: 2.2, log: 2, amphora: 1.9, bitumen: 1.5, deck: 2.2, sailor: 2.6, shipwright: 2.6, voyage: 3.2, unload: 2.4, tax: 2, saw: 1.6, reed: 3.2, anchor: 1.6, oar: 1.4, cargo: 2.4, anvil: 1.6, hammer: 1.8, copper: 1.9, lantern: 2.9, rug: 2.4, pattern: 2.2, wool: 1.9, ring: 1.6, necklace: 1.8, bracelet: 1.6, bargain: 2.2, bouquet: 1.9, petal: 1.6, bunch: 1.7, ripe: 1.9, oven: 2.2, donkey: 2.4, cart: 2.2, sack: 1.8, crate: 1.8, pigeon: 1.3, hen: 1.3, stall: 3.9, awning: 4.4, library: 7.6, boat: 3.2, sail: 8.4, rooftop: 8.2, ladder: 4.2, scarecrow: 3, beehive: 1.9, merchant: 2.6, librarian: 2.6, scribe: 2.6, fisherman: 2.6, harbour: 3, alley: 4, 'clay tablet': 2.6, bookshelf: 3.3, palm: 8.7, date: 6.2, olive: 5.4, fig: 5.8, pomegranate: 4.4, cypress: 10.8, cedar: 11, willow: 8.2, rose: 2, lavender: 1.7, shrub: 1.8, reed: 3, lily: 1.2, flowerpot: 2.4, bench: 1.8, hedge: 1.9, flowerbed: 1.7, fountain: 4.2, canal: 1.7, gate: 18.6, lion: 4.9, tile: 2.7, well: 4, orchard: 5.8, meadow: 1.7, vine: 2.5, terrace: 3.3, staircase: 3.2, waterfall: 4.6, shore: 2.1, bridge: 2.9, island: 7.2, dome: 10.2, column: 5.6, temple: 10.4, arbour: 4.3 };
const labelTex = {};
function getLabelTex(id, quiz) {
  const key = id + (quiz ? '?' : ''); if (labelTex[key]) return labelTex[key];
  const w0 = GARDEN_WORDS[id], w = quiz ? ['?', w0[1]] : w0, c = document.createElement('canvas'); c.width = 512; c.height = 176; const g = c.getContext('2d');
  g.font = '800 62px Segoe UI, sans-serif'; const tw = Math.min(500, Math.max(g.measureText(w[0]).width + 70, 260)), x0 = (512 - tw) / 2;
  g.fillStyle = 'rgba(8,14,28,.74)'; g.strokeStyle = 'rgba(255,213,74,.9)'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(x0, 8, tw, 160, 34); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText(w[0], 256, 70, tw - 30);
  g.font = '700 32px Segoe UI, sans-serif'; g.fillStyle = '#ffd54a'; g.fillText(w[1].split(',')[0].split(' (')[0], 256, 128, tw - 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return labelTex[key] = t;
}
const LPOOL = Array.from({ length: 7 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, opacity: 0, fog: false })); s.renderOrder = 8; s.visible = false; scene.add(s); return { s, id: null, target: 0, op: 0, pop: 0, x: 0, y: 0, z: 0 }; });
function labelsPick() {
  const best = new Map();
  for (const t of TRIG) {
    if (!found.has(t.w) || learn.labelMode(t.w) === 'hide') continue;
    const ty = t.y ?? heightAt(t.x, t.z), d = Math.hypot(t.x - me.x, t.z - me.z);
    if (d > 13 || Math.abs(ty - me.y) > 5) continue;
    const b = best.get(t.w), off = t.w === 'date' ? 1.6 : 0; if (!b || d < b.d) best.set(t.w, { d, x: t.x + off, y: ty + (LABEL_H[t.w] || 2.5), z: t.z });
  }
  // egymásra lógó címkék helyett csak a közelebbi marad (a piacon sok szó van egy standon); beszélgetés közben egy sem
  const want = [], talking = document.getElementById('talk').classList.contains('on');
  if (!talking) for (const e of [...best.entries()].sort((a, b) => (a[0] === wordNow ? -1 : 0) - (b[0] === wordNow ? -1 : 0) || a[1].d - b[1].d)) {
    if (want.length >= LPOOL.length) break;
    if (want.some(([, p]) => Math.hypot(p.x - e[1].x, p.z - e[1].z) < 3.2 && Math.abs(p.y - e[1].y) < 1.6)) continue;
    want.push(e);
  }
  const ids = new Set(want.map(w => w[0]));
  for (const L of LPOOL) if (L.id && !ids.has(L.id)) L.target = 0;
  for (const [id, p] of want) {
    let L = LPOOL.find(l => l.id === id) || LPOOL.find(l => !l.id || (l.target === 0 && l.op < .02));
    if (!L) continue;
    const qz = learn.labelMode(id) === 'quiz', key = id + (qz ? '?' : '');
    if (L.key !== key) { const fresh = L.id !== id; L.id = id; L.key = key; L.s.material.map = getLabelTex(id, qz); L.s.material.needsUpdate = true; if (fresh) { L.op = 0; L.pop = 1; } }
    L.target = 1; L.x = p.x; L.y = p.y; L.z = p.z;
  }
}
function labelsTick(dt, t) {
  for (const L of LPOOL) {
    L.op += (L.target - L.op) * Math.min(1, dt * (L.target ? 5 : 3));
    if (L.target === 0 && L.op < .02) { L.id = null; L.key = null; L.s.visible = false; continue; }
    L.pop = Math.max(0, L.pop - dt * 1.6);
    const d = Math.hypot(L.x - camera.position.x, L.z - camera.position.z), act = L.id === wordNow;
    const k = (1 + d / 30) * (act ? 1.15 + .05 * Math.sin(t * 4) : .9) * (1 + L.pop * .6);
    L.s.scale.set(2.3 * k, .79 * k, 1); L.s.position.set(L.x, L.y + Math.sin(t * 1.5 + L.x) * .08, L.z);
    L.s.material.opacity = Math.min(1, L.op * (act ? 1 : .8) + L.pop * .4); L.s.visible = true;
  }
}
function wordCheck() {
  if (learn.cardBusy()) return;
  let best = null, bd = 1e9;
  for (const t of TRIG) {
    const d = Math.hypot(t.x - me.x, t.z - me.z); if (d > t.r) continue;
    if (t.y !== null && Math.abs(t.y - me.y) > 2.6) continue;
    const special = t.w === learn.missionId() || learn.isDue(t.w);   // a küldetés célja és az esedékes szó előnyt kap
    const score = d / t.r - (found.has(t.w) ? 0 : 1) - (special ? 2 : 0);
    if (!special && (cool[t.w] || 0) > performance.now() && found.has(t.w) && t.w !== wordNow) continue;
    if (score < bd) { bd = score; best = t.w; }
  }
  const el = document.getElementById('word');
  if (!best) { if (wordNow && performance.now() > wordHide) { cool[wordNow] = performance.now() + 25000; wordNow = null; el.classList.remove('on'); learn.cardHidden(); } return; }
  wordHide = performance.now() + 1500; days.seen(best);
  if (best === wordNow && !learn.needsQuiz(best)) return;
  if (wordNow) cool[wordNow] = performance.now() + 25000;
  if (learn.takeWord(best)) { wordNow = best; return; }
  wordNow = best; const w = GARDEN_WORDS[best], isNew = !found.has(best);
  el.innerHTML = `<span class="tag">${DAY_SET.has(best) ? (isNew ? '✨ Új napi szó' : 'Napi szó') : TOWER_SET.has(best) ? (isNew ? '✨ Új toronyszó' : 'Toronyszó') : PAL_SET.has(best) ? (isNew ? '✨ Új palotaszó' : 'Palotaszó') : HARB_SET.has(best) ? (isNew ? '✨ Új kikötői szó' : 'Kikötői szó') : CITY_SET.has(best) ? (isNew ? '✨ Új városszó' : 'Városszó') : (isNew ? '✨ Új kertszó' : 'Kertszó')}</span><div class="en">${w[0]}<button data-say="${w[0]}">🔊</button></div><div class="hu">${w[1]}</div><div class="ex">${w[2]} <button data-say="${w[2].replace(/"/g, '&quot;')}" style="background:none;border:0;cursor:pointer">🔊</button><i>${w[3]}</i></div>`;
  el.classList.add('on'); say(w[0]);
  if (isNew) discover(best);
}
document.getElementById('word').addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) say(b.dataset.say, b.dataset.say.includes(' ') ? .92 : .85); });
function updWordCount() { document.getElementById('wcount').textContent = `${found.size} / ${WORD_IDS.length} · lista`; }
document.getElementById('wcount').addEventListener('click', () => {
  const el = document.getElementById('wlist');
  el.innerHTML = `<button class="x">✕</button><h2>Szavaid · ${found.size} / ${WORD_IDS.length}</h2><p style="color:#8fa3c8;font-size:13px;margin:0 0 10px">Sétálj oda a növényekhez, épületekhez, árusokhoz: az angol nevük felbukkan, és az új szavak bekerülnek a Szólétrába.</p>${[['🌿 A kert', WORD_IDS.filter(i => !CITY_SET.has(i) && !HARB_SET.has(i) && !PAL_SET.has(i) && !TOWER_SET.has(i) && !DAY_SET.has(i))], ['🏛️ Babilon utcái (az Istár-kapun túl)', CITY_IDS], ['⚓ A túlparti kikötő (Ezüst csillagtól)', HARB_IDS], ['👑 A királyi palota (a nyugati kapun túl)', PAL_IDS], ['🏛 Bábel tornya (a keleti kapun túl)', TOWER_IDS], ['📅 Babiloni napok (mindegyik csak a maga napján)', DAY_IDS]].map(([h, ids]) => `<h3 style="font-size:14px;margin:12px 0 6px;color:#ffd54a">${h} · ${ids.filter(i => found.has(i)).length} / ${ids.length}</h3><div class="g">${ids.map(id => found.has(id) ? `<div class="w"><b>${GARDEN_WORDS[id][0]}</b> · <span>${GARDEN_WORDS[id][1]}</span></div>` : `<div class="w no"><b>???</b> · <span>még nem találtad meg</span></div>`).join('')}</div>`).join('')}`;
  el.classList.add('on'); el.querySelector('.x').onclick = () => el.classList.remove('on');
});
let toastT = null;
function toastK(a, b) { const z = document.getElementById('toastk'); z.innerHTML = `${a}<small>${b}</small>`; z.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => z.classList.remove('on'), 2600); }

/* ---------- helyszín-felirat ---------- */
function zoneAt(x, z, y) { const s = { x: me.x, z: me.z, y: me.y }; me.x = x; me.z = z; me.y = y; const r = zoneOf(); Object.assign(me, s); return r[0] + (r[1] ? ' (' + r[1] + ')' : ''); }
function zoneOf() {
  if (me.x > 78.2 && me.z > PLAZA.z1 && me.z < 230) {
    if (me.x < 86) return ['A torony kapuja', 'a szent körzet bejárata'];
    if (me.y > 1) { const F = ZIG_FLOOR_Y.findIndex(y => Math.abs(y - me.y) < 1.2); if (F > 0) return [`Bábel tornya · ${F + 1}. emelet`, FLOORS[F][0]]; return ['A torony lépcsője', `${Math.round(me.y)} méter magasan`]; }
    if (me.x > 250) return ['A téglavetők műhelye', 'kemencék és téglarakások'];
    if (me.x < 140 && me.z < 160) return ['Esagila előtt', 'Marduk temploma'];
    if (me.x < 140 && me.z > 174 && me.z < 190) return ['Téglavetők udvara', 'Bábel tornya · 1. emelet'];
    if (me.x < 140 && me.z > 189) return ['A papok házai', 'Esagila papjai laknak itt'];
    return ['A szent körzet', 'Bábel tornya lábánál'];
  }
  if (me.x < -78.2 && me.z > PLAZA.z1) {
    if (me.x > -92) return ['A palotakapu', 'Nabukodonozor palotája'];
    if (me.x > -104 && me.y < 3.4) return ['A díszlépcső', 'fel a palota teraszára'];
    if (me.y > 6.5) { if (me.x > -200 && me.x < -150 && me.z > 205 && me.z < 222) return ['A trónterem', 'II. Nabukodonozor, Babilon királya']; if (me.z > 222) return ['A folyóparti terasz', 'kilátás az Eufráteszre']; return ['A trónterem-udvar', 'a kék homlokzat előtt']; }
    if (me.x > -141) return ['A külső udvar', 'kérvényezők és írnokok'];
    if (me.x > -206) return ['A középső udvar', 'a királyi kert'];
    return ['A királyi lakópalota', 'csak a király családja léphet be'];
  }
  if (me.z > PLAZA.z1 - .5) {
    if (me.z < CITY.z0 + 1.5) return ['Az Istár-kapu', 'átjáró a városba'];
    if (me.z > 296) {
      if (me.z < 321) return ['A révészstég', 'a túlparti kikötő'];
      if (me.x < -38 && me.z < 349) return ['A hajóépítő udvar', 'bordák, gerinc, faforgács'];
      if (me.z > 347) return ['A raktárnegyed', 'gabona, cédrus, amfórák'];
      if (me.x > 30 && me.x < 46 && me.z < 340) return ['A vámház', 'minden rakomány itt áll meg'];
      return ['A túlparti kikötő', 'uszályok, daru, matrózok'];
    }
    if (me.z > CITY.z1 + 1) return ['Az Eufrátesz', 'átkelés csónakkal'];
    if (me.z > CITY.z1 - 4) return ['Az Eufrátesz partja', 'rakpart, csónakok, móló'];
    const [lx0, lz0, lx1, lz1] = CITY_MAP.lib, [gx0, gz0, gx1, gz1] = CITY_MAP.garden;
    if (me.x > lx0 - 1 && me.x < lx1 + 1 && me.z > lz0 - 1 && me.z < lz1 + 1) return ['A Táblaház', 'Babilon könyvtára'];
    if (me.x > gx0 - 1 && me.x < gx1 + 1 && me.z > gz0 - 1 && me.z < gz1 + 1) return ['A konyhakert', 'ágyások, méhkasok, madárijesztő'];
    if (Math.abs(me.x) < 9 && me.z < 150) return ['A Processziós út', 'oroszlános falak között'];
    if (Math.abs(me.x) < 30 && me.z > 150 && me.z < 200) return ['A Nagy Piac', 'árusok, fűszerek, alku'];
    return ['Babilon utcái', 'házak és sikátorok'];
  }
  const m = Math.max(Math.abs(me.x), Math.abs(me.z));
  if (m <= LV[0].r + .5 && me.y > 1) { if (me.y > 24) return ['A Templom', 'a kert csúcsa']; const i = LV.findIndex(l => Math.abs(l.h - me.y) < 1.5); return [`${i + 1}. terasz`, ['Gránátalmák és rózsák', 'Olajfák és levendula', 'Pálmák és virágok', 'Ciprusok és rózsák'][i] || '']; }
  if (Math.hypot(me.x - ISLAND.x, me.z - ISLAND.z) < ISLAND.r + 1) return ['A sziget', 'a tó közepén'];
  if (me.z > 56) return ['Díszudvar', 'az Istár-kapu előtt'];
  if (me.x > 54 && Math.abs(me.z) < 40) return ['A tó', 'fűzek és nád'];
  if (me.x < -52) return ['Gyümölcsös liget', 'olaj, füge, gránátalma'];
  if (me.z < -55) return ['Rózsakert', 'lugassal és szökőkúttal'];
  return ['Sétány', 'a teraszok tövében'];
}
let zoneNow = '', zoneT = null;
function zoneShow(a, b) { const z = document.getElementById('zone'); z.innerHTML = `${a}<small>${b}</small>`; z.classList.add('on'); clearTimeout(zoneT); zoneT = setTimeout(() => z.classList.remove('on'), 3200); }

/* ---------- térkép ---------- */
const mc = document.getElementById('mapc'), mg = mc.getContext('2d'); let mapBase = null;
const MB_G = { x0: PLAZA.x0, x1: PLAZA.x1, z0: PLAZA.z0, z1: PLAZA.z1 }, MB_C = { x0: -84, x1: 84, z0: 104, z1: 248 }, MB_H = { x0: -84, x1: 104, z0: 292, z1: 398 }, MB_P = { x0: -270, x1: -70, z0: 104, z1: 240 }, MB_Z = { x0: 74, x1: 304, z0: 104, z1: 240 };
let MB = MB_G, mapCity = null, mapHarb = null, mapPal = null, mapZig = null;
const mx2 = x => (x - MB.x0) / (MB.x1 - MB.x0) * mc.width, mz2 = z => (z - MB.z0) / (MB.z1 - MB.z0) * mc.height;
function drawCityBase() {
  MB = MB_C; const g = mg, pv = (x0, z0, x1, z1) => g.fillRect(mx2(Math.min(x0, x1)), mz2(Math.min(z0, z1)), Math.abs(mx2(x1) - mx2(x0)), Math.abs(mz2(z1) - mz2(z0)));
  g.fillStyle = '#b89a6a'; g.fillRect(0, 0, mc.width, mc.height);
  g.fillStyle = '#d9c49a'; pv(CITY.x0, CITY.z0, CITY.x1, CITY.z1);
  g.fillStyle = '#5c7a3c'; pv(MB.x0, MB.z0, MB.x1, PLAZA.z1);                       // a kert széle
  g.fillStyle = '#cdb68e'; pv(-5, PLAZA.z1 - 6, 5, PLAZA.z1);
  g.fillStyle = '#3d6f8a'; pv(MB.x0, CITY.z1, MB.x1, MB.z1);                          // Eufrátesz
  g.fillStyle = '#8a6a48'; pv(PIER.x0, PIER.z0, PIER.x1, PIER.z1);
  g.fillStyle = '#e8dcc0'; pv(-6, CITY.z0, 6, 150); pv(-30, 150, 30, 200);            // Processziós út, piactér
  g.fillStyle = '#2a62c2'; pv(-8.2, 116, -7, 146); pv(7, 116, 8.2, 146);              // oroszlános falak
  g.fillStyle = '#a07650'; for (const [a, b, c, d] of CITY_MAP.houses) pv(a, b, c, d);
  for (const [x, z, t] of CITY_MAP.stalls) { g.fillStyle = { fruit: '#e8741c', baker: '#e8c070', spice: '#c8321e', potter: '#b8683a', weaver: '#2a5aa8', fish: '#7ab8c8', flowers: '#d870a0', jewel: '#ffd54a', veg: '#6a9a3a', carpet: '#8a3a8a' }[t] || '#c8a070'; pv(x - 1.6, z - 2, x + 1.6, z + 2); }
  g.fillStyle = '#7fc8e8'; g.beginPath(); g.arc(mx2(0), mz2(175), 7, 0, 6.3); g.fill();
  { const [a, b, c, d] = CITY_MAP.lib; g.fillStyle = '#6a5a8a'; pv(a, b, c, d); g.fillStyle = '#d9c49a'; pv(a + 4, b + 4, c - 4, d - 4); }
  { const [a, b, c, d] = CITY_MAP.garden; g.fillStyle = '#7a9a4a'; pv(a, b, c, d); g.fillStyle = '#5a3c22'; for (const [x0, z0, x1, z1] of CITY_MAP.beds) pv(x0, z0, x1, z1); }
  g.fillStyle = '#2a62c2'; pv(-11, PLAZA.z1 - .5, 11, CITY.z0 + .5);
  g.font = 'bold 15px system-ui'; g.textAlign = 'center'; g.fillStyle = '#2a1a08';
  g.fillText('Piac', mx2(0), mz2(160)); g.fillText('Táblaház', mx2(-57), mz2(152)); g.fillText('Konyhakert', mx2(61), mz2(152)); g.fillText('Eufrátesz', mx2(-50), mz2(240));
  { const y = mz2(149.5); g.fillStyle = '#2a62c2'; g.fillRect(mx2(-84), mz2(146.6), mx2(-79) - mx2(-84), mz2(152.4) - mz2(146.6)); g.fillStyle = '#b8871c'; g.beginPath(); g.moveTo(6, y); g.lineTo(18, y - 9); g.lineTo(18, y + 9); g.closePath(); g.fill(); g.font = 'bold 13px system-ui'; g.textAlign = 'left'; g.fillStyle = '#7a5a10'; g.fillText('Palota', 22, y - 10); g.textAlign = 'center'; }
  { const y = mz2(200.5), W = mc.width; g.fillStyle = '#2a62c2'; g.fillRect(mx2(79), mz2(ZGATE.z0), mx2(84) - mx2(79), mz2(ZGATE.z1) - mz2(ZGATE.z0)); g.fillStyle = '#b8871c'; g.beginPath(); g.moveTo(W - 6, y); g.lineTo(W - 18, y - 9); g.lineTo(W - 18, y + 9); g.closePath(); g.fill(); g.font = 'bold 13px system-ui'; g.textAlign = 'right'; g.fillStyle = '#7a5a10'; g.fillText('Torony', W - 22, y - 10); g.textAlign = 'center'; }
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapCity = g.getImageData(0, 0, mc.width, mc.height); MB = MB_G;
}
function drawHarbBase() {
  MB = MB_H; const g = mg, pv = (x0, z0, x1, z1) => g.fillRect(mx2(Math.min(x0, x1)), mz2(Math.min(z0, z1)), Math.abs(mx2(x1) - mx2(x0)), Math.abs(mz2(z1) - mz2(z0)));
  g.fillStyle = '#c8a878'; g.fillRect(0, 0, mc.width, mc.height);
  g.fillStyle = '#3d6f8a'; pv(MB.x0, MB.z0, MB.x1, 320);
  g.fillStyle = '#d9c49a'; pv(-76, 326, 96, 392); g.fillStyle = '#b0a088'; pv(-76, 320, 96, 326);
  g.fillStyle = '#8a6a48'; pv(18.4, 300, 21.6, 321);
  g.fillStyle = '#2a221c'; for (const [a, b, c, d] of HARB_MAP.ships) pv(a, b, c, d);
  g.fillStyle = '#a07650'; for (const [a, b, c, d] of HARB_MAP.houses) pv(a, b, c, d);
  { const [a, b, c, d] = HARB_MAP.customs; g.fillStyle = '#6a5a8a'; pv(a, b, c, d); }
  { const [a, b, c, d] = HARB_MAP.yard; g.strokeStyle = '#8a6a48'; g.lineWidth = 3; g.strokeRect(mx2(a), mz2(b), mx2(c) - mx2(a), mz2(d) - mz2(b)); }
  g.font = 'bold 15px system-ui'; g.textAlign = 'center'; g.fillStyle = '#2a1a08';
  g.fillText('Raktárak', mx2(12), mz2(388)); g.fillText('Hajóépítők', mx2(-55), mz2(326 + 0)); g.fillText('Vámház', mx2(38), mz2(343)); g.fillStyle = '#e8f2ff'; g.fillText('Eufrátesz · a város felé', mx2(10), mz2(298));
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapHarb = g.getImageData(0, 0, mc.width, mc.height); MB = MB_G;
}
function drawPalBase() {
  MB = MB_P; const g = mg, pv = (x0, z0, x1, z1) => g.fillRect(mx2(Math.min(x0, x1)), mz2(Math.min(z0, z1)), Math.abs(mx2(x1) - mx2(x0)), Math.abs(mz2(z1) - mz2(z0)));
  const { fore: F, st1: S1, l1: L1, st2: S2, l2: L2, hall: HL } = PAL;
  g.fillStyle = '#c8a878'; g.fillRect(0, 0, mc.width, mc.height);
  g.fillStyle = '#3d6f8a'; pv(MB.x0, 230, MB.x1, MB.z1);
  g.fillStyle = '#d9c49a'; pv(-80, 113.5, MB.x1, 230); g.fillStyle = '#a07650'; pv(-79, 122, -70, 146); pv(-79, 156, -73, 192);
  g.fillStyle = '#b89a6a'; pv(L1.x0, L1.z0, L1.x1, L1.z1); g.fillStyle = '#e8d8b0'; pv(L1.x0 + 1, L1.z0 + 1, L1.x1 - 1, L1.z1 - 1);
  g.fillStyle = '#8a6a42'; pv(L2.x0, L2.z0, L2.x1, L2.z1); g.fillStyle = '#efe3c4'; pv(L2.x0 + 1, L2.z0 + 1, L2.x1 - 1, L2.z1 - 1);
  g.fillStyle = '#d0c0a0'; pv(F.x0, F.z0, F.x1, F.z1); pv(S1.x0, S1.z0, S1.x1, S1.z1); pv(S2.x0, S2.z0, S2.x1, S2.z1);
  g.strokeStyle = '#8a6a48'; g.lineWidth = 1.5; for (let x = S1.x0; x < S1.x1; x += 1.7) { g.beginPath(); g.moveTo(mx2(x), mz2(S1.z0)); g.lineTo(mx2(x), mz2(S1.z1)); g.stroke(); } for (let z = S2.z0; z < S2.z1; z += 1.4) { g.beginPath(); g.moveTo(mx2(S2.x0), mz2(z)); g.lineTo(mx2(S2.x1), mz2(z)); g.stroke(); }
  for (const [a, b, c, d, cl] of PAL_BLDG) { g.fillStyle = cl; pv(a, b, c, d); }
  g.fillStyle = '#6f9a4a'; pv(-200, 136.6, -150, 139.4); pv(-200, 159.6, -150, 168.6); g.fillStyle = '#3d8fb0'; pv(-197, 140, -153, 144.2); pv(-197, 154.8, -153, 159);
  g.fillStyle = '#22489a'; pv(HL.x0, HL.z0, HL.x1, HL.z1); g.fillStyle = '#8a1f2a'; pv(-176, HL.z0 + 1.5, -174, HL.z1 - 4);
  g.fillStyle = '#3d8fb0'; for (const fx of [-188, -162]) { g.beginPath(); g.arc(mx2(fx), mz2(195.5), 3.5, 0, 6.3); g.fill(); }
  g.fillStyle = '#2a62c2'; pv(-84, 143.4, -78.6, 146.6); pv(-84, 152.4, -78.6, 155.6); g.fillStyle = '#a07650'; pv(-81.5, 113.5, -80, 143.4); pv(-81.5, 155.6, -80, 230);
  g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillStyle = '#2a1a08';
  g.fillText('Külső udvar', mx2(-122), mz2(140)); g.fillText('Középső udvar', mx2(-200), mz2(140)); g.fillText('Trónterem-udvar', mx2(-175), mz2(200)); g.fillStyle = '#fff'; g.fillText('Trónterem', mx2(-175), mz2(214)); g.fillStyle = '#2a1a08'; g.fillText('Kapu', mx2(-82), mz2(139)); g.fillText('→ a város', mx2(-74), mz2(118)); g.fillStyle = '#e8f2ff'; g.fillText('Eufrátesz', mx2(-170), mz2(236));
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapPal = g.getImageData(0, 0, mc.width, mc.height); MB = MB_G;
}
function drawZigBase() {
  const sv = MB; MB = MB_Z; const g = mg, pv = (x0, z0, x1, z1) => g.fillRect(mx2(Math.min(x0, x1)), mz2(Math.min(z0, z1)), Math.abs(mx2(x1) - mx2(x0)), Math.abs(mz2(z1) - mz2(z0)));
  const d = towerDone(), { cx, cz } = ZG;
  g.fillStyle = '#c8a878'; g.fillRect(0, 0, mc.width, mc.height);
  g.fillStyle = '#3d6f8a'; pv(MB.x0, 229, MB.x1, MB.z1);
  g.fillStyle = '#d9c49a'; pv(MB.x0, 113.5, 80, 229); g.fillStyle = '#a07650'; pv(80, 113.5, 81.5, ZGATE.z0); pv(80, ZGATE.z1, 81.5, 229);
  g.fillStyle = '#e8d8b0'; pv(ZG.x0, ZG.z0, ZG.x1, ZG.z1); g.fillStyle = '#8a6a48'; pv(ZG.x0, ZG.z0 - 1.5, ZG.x1 + 1.5, ZG.z0); pv(ZG.x0, ZG.z1, ZG.x1 + 1.5, ZG.z1 + 1.5); pv(ZG.x1, ZG.z0, ZG.x1 + 1.5, ZG.z1);
  g.fillStyle = '#d0c0a0'; pv(ZG.x0, 197.6, 92, 203.4); pv(88, cz + 4, 92, 197.6); pv(88, cz - 4, 134, cz + 4);
  for (const [a, b, c, e, cl] of ZIG_BLDG) { g.fillStyle = cl; pv(a, b, c, e); }
  ZIG_TIERS.forEach(([h], i) => { g.fillStyle = i < d ? '#26315c' : i < 2 ? '#2a62c2' : ['#b89a6a', '#c4a676', '#d0b282', '#dcbe8e'][i - 2]; pv(cx - h, cz - h, cx + h, cz + h); g.strokeStyle = i < d ? BAND[i] : '#8d8478'; g.lineWidth = 2; g.strokeRect(mx2(cx - h), mz2(cz - h), mx2(cx + h) - mx2(cx - h), mz2(cz + h) - mz2(cz - h)); });
  g.fillStyle = d >= 7 ? '#d8a93a' : '#2a62c2'; pv(cx - 11, cz - 11, cx + 11, cz + 11);
  g.fillStyle = '#efe3c4'; pv(135, cz - 4.5, 167, cz + 4.5); pv(153.5, cz - 41.5, 159.5, cz - 4.5); pv(153.5, cz + 4.5, 159.5, cz + 41.5);
  g.fillStyle = '#5a3c22'; for (const [x, z] of [[272, 150], [284, 150], [278, 162]]) { g.beginPath(); g.arc(mx2(x), mz2(z), 4, 0, 6.3); g.fill(); }
  g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillStyle = '#2a1a08';
  g.fillText('Esagila', mx2(114), mz2(140)); g.fillText('Téglavetők', mx2(118), mz2(176)); g.fillText('Műhely', mx2(278), mz2(140)); g.fillStyle = '#fff'; g.fillText('Bábel tornya', mx2(cx), mz2(cz - 30)); g.fillText(`${d} / 7 emelet`, mx2(cx), mz2(cz + 34));
  g.fillStyle = '#2a1a08'; g.textAlign = 'left'; g.fillText('← a város', 4, mz2(209)); g.textAlign = 'center'; g.fillStyle = '#e8f2ff'; g.fillText('Eufrátesz', mx2(150), mz2(235));
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapZig = g.getImageData(0, 0, mc.width, mc.height); MB = sv;
}
function drawMapBase() {
  drawPalBase();
  drawHarbBase();
  drawCityBase();
  const g = mg; g.fillStyle = '#5c7a3c'; g.fillRect(0, 0, mc.width, mc.height);
  g.fillStyle = '#cdb68e'; const pv = (x0, z0, x1, z1) => g.fillRect(mx2(Math.min(x0, x1)), mz2(Math.min(z0, z1)), Math.abs(mx2(x1) - mx2(x0)), Math.abs(mz2(z1) - mz2(z0)));
  pv(-54, 46, 54, 54); pv(-54, -54, 54, -46); pv(-54, -46, -46, 46); pv(46, -46, 54, 46); pv(-5, 54, 5, PLAZA.z1); pv(-92, -3, -54, 3); pv(-48, -68.6, 48, -63.4);
  LV.forEach((l, i) => { const c = 150 + i * 18; g.fillStyle = `rgb(${c},${c - 30},${c - 70})`; pv(-l.r, -l.r, l.r, l.r); });
  g.fillStyle = '#3d8fb0'; g.beginPath(); g.ellipse(mx2(LAKE.cx), mz2(LAKE.cz), LAKE.rx / (PLAZA.x1 - PLAZA.x0) * mc.width, LAKE.rz / (PLAZA.z1 - PLAZA.z0) * mc.height, 0, 0, 6.3); g.fill();
  g.fillStyle = '#5c7a3c'; g.beginPath(); g.arc(mx2(ISLAND.x), mz2(ISLAND.z), ISLAND.r / (PLAZA.x1 - PLAZA.x0) * mc.width, 0, 6.3); g.fill();
  g.fillStyle = '#3d8fb0'; for (const [a, b, c, d] of CANALS) pv(a, c, b, d); for (const f of FOUNTAINS) { g.beginPath(); g.arc(mx2(f.x), mz2(f.z), f.r / (PLAZA.x1 - PLAZA.x0) * mc.width, 0, 6.3); g.fill(); }
  g.strokeStyle = '#2a62c2'; g.lineWidth = 6; g.beginPath(); g.moveTo(mx2(-11), mz2(PLAZA.z1)); g.lineTo(mx2(11), mz2(PLAZA.z1)); g.stroke();
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapBase = g.getImageData(0, 0, mc.width, mc.height);
}
function drawMap() {
  const inZig = me.x > 78.4 && me.z > PLAZA.z1 && me.z < 240, inPal = me.x < -78.4 && me.z > PLAZA.z1 && me.z < 240, inHarb = !inPal && !inZig && me.z > 288, inCity = !inPal && !inHarb && !inZig && me.z > PLAZA.z1 - 2;
  if (inZig && !mapZig) drawZigBase();
  MB = inZig ? MB_Z : inPal ? MB_P : inHarb ? MB_H : inCity ? MB_C : MB_G;
  mg.putImageData(inZig ? mapZig : inPal ? mapPal : inHarb ? mapHarb : inCity ? mapCity : mapBase, 0, 0);
  // zárt teraszok: sötétítés
  if (!inCity && !inHarb && !inPal && !inZig) for (let i = maxI + 1; i < LV.length; i++) { const r = LV[i].r; mg.fillStyle = 'rgba(10,15,30,.28)'; mg.fillRect(mx2(-r), mz2(-r), mx2(r) - mx2(-r), mz2(r) - mz2(-r)); }
  mg.fillStyle = '#7fe0a0'; for (const t of TRIG) if (!found.has(t.w) && Math.hypot(t.x - me.x, t.z - me.z) < 24) { mg.beginPath(); mg.arc(mx2(t.x), mz2(t.z), 2.5, 0, 6.3); mg.fill(); }
  { const dm = days && days.mapMark(); if (dm && inCity) { const X = mx2(dm.x), Y = mz2(dm.z); if (dm.ring) { const pr = 12 + 3 * Math.sin(performance.now() / 260); mg.strokeStyle = '#7fe0a0'; mg.lineWidth = 3; mg.beginPath(); mg.arc(X, Y, pr + 8, 0, 6.3); mg.stroke(); } mg.font = '20px system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText(dm.icon, X, Y); mg.textBaseline = 'alphabetic'; } }
  const mh = learn && learn.mapHint(); if (mh) { const pr = 10 + 3 * Math.sin(performance.now() / 300); mg.strokeStyle = '#ffd54a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(mx2(mh.x), mz2(mh.z), pr + 12, 0, 6.3); mg.stroke(); }
  const x = mx2(me.x), y = mz2(me.z);
  mg.save(); mg.translate(x, y); mg.rotate(-me.ang + Math.PI); mg.fillStyle = '#ffd54a'; mg.strokeStyle = '#000'; mg.lineWidth = 2;
  mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(7, 8); mg.lineTo(0, 4); mg.lineTo(-7, 8); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
}

/* ---------- lámpafények, távolsági ritkítás, hang ---------- */
function assignLamps() {
  if (!lampLights.length) return;
  if (palace && palace.inHall(me)) { const near = PAL_LIGHTS.map(p => [Math.hypot(p[0] - me.x, p[2] - me.z), p]).sort((a, b) => a[0] - b[0]); lampLights.forEach((l, i) => { const p = near[i] && near[i][1]; l.visible = true; if (!p) { l.intensity = 0; return; } l.position.set(p[0], p[1], p[2]); l.distance = 22; l.intensity = 38; }); return; }
  lampLights.forEach(l => l.distance = 15);
  const night = 1 - dayF, near = LANTERNS.map(p => [Math.hypot(p[0] - me.x, p[2] - me.z) + Math.abs(p[1] - me.y) * 2, p]).sort((a, b) => a[0] - b[0]);
  lampLights.forEach((l, i) => { const p = near[i] && near[i][1]; l.visible = night > .15; if (!p || !l.visible) { l.intensity = 0; return; } l.position.set(p[0], p[1], p[2]); l.intensity = 16 * night; });
}
let cullMul = 1;
function cullSmall() { for (const m of CULL) { const c = m.boundingSphere.center; m.visible = Math.hypot(c.x - me.x, c.z - me.z) - m.boundingSphere.radius < m.userData.cull * cullMul; } }
function audioState() {
  let dw = 1e9;
  for (const f of FOUNTAINS) dw = Math.min(dw, Math.hypot(f.x - me.x, f.z - me.z) - f.r);
  for (const [a, b, c, d] of CANALS) dw = Math.min(dw, Math.hypot(Math.max(a - me.x, 0, me.x - b), Math.max(c - me.z, 0, me.z - d)));
  const fx = me.x < 8 ? 8 - me.x : me.x > 56 ? me.x - 56 : 0, df = me.x > -2 ? Math.hypot(fx, Math.max(0, Math.abs(me.z) - 1.5)) : 1e9;
  const ca = city ? city.audio(me) : null;
  return { water: Math.max(0, 1 - dw / 14, ca ? ca.fountain * .8 : 0), fall: Math.max(0, 1 - df / 26), day: dayF, height: me.y, city: ca };
}
// hangforrás iránya a kamera jobb oldalához képest (-1 bal .. 1 jobb)
const panTo = (x, z) => { const dx = x - me.x, dz = z - me.z, l = Math.hypot(dx, dz); if (l < .5) return 0; return Math.max(-1, Math.min(1, (dx * Math.cos(cam.yaw) - dz * Math.sin(cam.yaw)) / l)); };
function cityAudio() {
  const st = audioState().city; if (!st) return;
  const ds = days && days.sound(me), dm = ds && ds.music > st.music;
  audio.cityUpdate({ market: st.market, marketPan: panTo(...st.marketSrc) * .6, haggle: st.haggle, river: st.river, music: dm ? ds.music : st.music, musicPan: dm ? panTo(ds.x, ds.z) : panTo(...st.musicSrc), fire: st.fire, dogs: st.dogs });
}

/* ---------- fő ciklus ---------- */
const clock = new THREE.Clock(); let fN = 0, fT = 0, slow = 0, slowT = 0, prT = 0, curPr = q.pr, shX = 1e9, shZ = 1e9;
function loop() { requestAnimationFrame(loop); if (paused) { clock.getDelta(); return; } frame(); }
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  U.uTime.value = t;
  if (harbour && harbour.riding) {          // a révész csónakjában ülsz
    const r = harbour.rideStep(dt); me.x = r.x; me.z = r.z; me.y = r.y; me.ang = r.ang; me.spd = 0; pose = 'sit'; learn.rideTick(dt);
    if (r.done) { Object.assign(me, r.land); pose = null; learn.rideEnd(); saveGame(false); }
  } else stepMe(dt);
  if (poseT > 0) { poseT -= dt; if (poseT <= 0 && pose !== 'sit') pose = null; }
  hero.object.position.set(me.x, me.y, me.z); hero.object.rotation.y = me.ang; hero.update(dt, me.spd, pose);
  blob.position.set(me.x, me.y + .03, me.z); blob.visible = !q.shadow || dayF < .12;
  const ty = me.y + 1.25 + camLift;
  let cx = me.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cz = me.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist, cy = ty + Math.sin(cam.pitch) * cam.dist;
  const gh = heightAt(cx, cz) + .6; if (cy < gh) cy = gh;
  if (Math.abs(cz + 66) < 3 && Math.abs(cx) > 6 && Math.abs(cx) < 47 && me.y < 1) cy = Math.min(cy, 2.7);
  camera.position.set(cx, cy, cz); camera.lookAt(me.x, ty, me.z);
  // nap/hold: az árnyék-doboz 14 m-es lépésekben követi a törpét; ekkor (és ha a nap elfordult) frissül a tárolt árnyék
  if ((sunT += dt) > 10) { sunT = 0; updateSky(); }
  const S = 14, sx = Math.round(me.x / S) * S, sz = Math.round(me.z / S) * S;
  if (sx !== shX || sz !== shZ) { shX = sx; shZ = sz; sc && sc.invalidate(); }
  sun.target.position.set(shX, 8, shZ); sun.position.set(shX + lightDir.x * 180, 8 + lightDir.y * 180, shZ + lightDir.z * 180);
  sc && sc.before(dt);
  if (M.water.normalMap) M.water.normalMap.offset.set(t * .015, t * .01);
  M.fall.map.offset.y = t * 1.2;
  life.update(t, dt, me, dayF); if (city.update(t, dt, me, hourNow()) && sc) sc.invalidate();
  if (days.update(t, dt, me, hourNow(), dayF, camera, palace.inHall(me)) && sc) sc.invalidate();
  { const W = days.weather; if (W.k > 0 && W.k < 1) updateSky(); hemi.intensity = hemiBase + days.flash * 1.8; } harbour.update(t, dt, me, hourNow()); palace.update(t, dt, me); zigg.update(t, dt, me, dayF);
  for (const [kind, x, z] of [...city.events.splice(0), ...harbour.events.splice(0)]) if (kind === 'hammer') { const d = Math.hypot(x - me.x, z - me.z); if (d < 45) audio.hammer(Math.pow(1 - d / 45, 1.6), panTo(x, z)); } labelsTick(dt, t); learn.update(dt, t);
  renderer.render(scene, camera);
  sc && sc.after();
  placePlate();
  if ((slowT += dt) > .25) {
    slowT = 0; drawMap(); cullSmall(); wordCheck(); labelsPick(); learn.slow(); zigRefresh(); lockPrompt(); assignLamps(); audio.update(audioState()); cityAudio();
    { const W = days.weather, k = W.kind ? W.k : 0; audio.weather(W.kind === 'rain' && !palace.inHall(me) ? k : 0, W.kind === 'dust' ? k : W.kind === 'rain' ? k * .3 : 0); if (days.slow() === 'new') { if (sc) { sc.collect(scene, [hero.object]); sc.invalidate(); } setTimeout(dayBanner, 500); } }
    const [a, b] = zoneOf(); if (a !== zoneNow) { if (zoneNow) zoneShow(a, b); zoneNow = a; if (me.z > PLAZA.z1 && !cityBanner && performance.now() - bannerT > 60000) { cityBanner = true; setTimeout(dayBanner, 3400); } }
    const lh = !sitting && learn.hint(), bn = !sitting && !lh && !autoWalk && nearBench(); const h = document.getElementById('hint'); h.textContent = sitting ? 'E vagy mozgás: felállsz' : lh || 'E: leülsz a padra'; h.classList.toggle('on', !!(lh || bn || sitting));
  }
  fN++; fT += dt;
  if (fT > 1) {
    const fps = fN / fT; fN = 0; fT = 0;
    // önszabályozás: előbb a távoli apró növényeket ritkítja, csak utána a felbontást
    if ((prT += 1) > 2) {
      if (fps < 40) { if (cullMul > .55) cullMul -= .15; else if (curPr > .7) { curPr = Math.max(.7, curPr - .15); renderer.setPixelRatio(curPr); } prT = 0; }
      else if (fps > 57) { if (curPr < q.pr) { curPr = Math.min(q.pr, curPr + .1); renderer.setPixelRatio(curPr); } else if (cullMul < 1) cullMul = Math.min(1, cullMul + .15); prT = 0; }
    }
    document.getElementById('fps').textContent = `${Math.round(fps)} FPS · ${qual === 'high' ? 'erős gép' : 'gyenge gép'} · ${renderer.info.render.calls} rajzolás · ${(renderer.info.render.triangles / 1e6).toFixed(1)} M háromszög`;
  }
}
function onResize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', onResize);
document.addEventListener('visibilitychange', () => audio.pause(document.hidden));

/* ---------- panel ---------- */
function refreshUI() {
  document.querySelectorAll('#pace button').forEach(b => b.classList.toggle('on', b.dataset.v === pace));
  document.querySelectorAll('#qual button').forEach(b => b.classList.toggle('on', b.dataset.q === qual));
  document.querySelectorAll('#auto button').forEach(b => b.classList.toggle('on', (b.dataset.a === '1') === autoWalk));
  document.querySelectorAll('#snd button').forEach(b => b.classList.toggle('on', (b.dataset.s === '1') === !audio.muted));
  document.getElementById('tod').value = tod;
}
document.getElementById('qual').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b || b.dataset.q === qual) return; localStorage.setItem('kert-q', b.dataset.q); localStorage.setItem('kert-pos', JSON.stringify(me)); location.reload(); });
document.getElementById('auto').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) setAuto(b.dataset.a === '1'); });
document.getElementById('pace').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; pace = b.dataset.v; localStorage.setItem('kert-tempo', pace); refreshUI(); toastK('Tempó: ' + b.textContent, `séta ${PACE[pace][0]} m/s · futás (Shift) ${PACE[pace][1]} m/s`); });
document.getElementById('snd').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; audio.start(); audio.setMuted(b.dataset.s === '0'); refreshUI(); });
document.getElementById('tod').addEventListener('change', e => { tod = e.target.value; localStorage.setItem('kert-tod', tod); updateSky(true); });
document.getElementById('hide').addEventListener('click', () => { const u = document.getElementById('ui'); u.classList.toggle('min'); document.getElementById('hide').textContent = u.classList.contains('min') ? '▸' : '▾'; });
let resumed = null;
try {
  const p = JSON.parse(localStorage.getItem('kert-pos'));
  if (p) { Object.assign(me, p); localStorage.removeItem('kert-pos'); }
  else { const m = JSON.parse(localStorage.getItem('kert-mentes')); if (m && isFinite(m.x) && isFinite(m.z) && !blocked(m.x, m.z)) { Object.assign(me, { x: m.x, z: m.z, y: m.y || 0, ang: m.ang || 0 }); cam.yaw = m.yaw ?? cam.yaw; cam.pitch = m.pitch ?? cam.pitch; cam.dist = m.dist ?? cam.dist; resumed = m; } }
} catch (e) { }
if (autoWalk) nearestWp();
window.__kert = { camera, set lift(v) { camLift = v; }, zigg: n => { zigg.setLit(n); if (sc) sc.invalidate(); }, get learnT() { return learn; }, get hero() { return hero; }, get city() { return city; }, get harbour() { return harbour; }, get learn() { return learn; }, set hour(v) { hourOverride = v; updateSky(true); }, me, cam, get auto() { return autoWalk; }, set auto(v) { autoWalk = v; }, renderer, scene, get sc() { return sc; }, CULL, setTod: v => { tod = v; updateSky(true); }, frames: (n, d = 1 / 60) => { for (let i = 0; i < n; i++) { clock.elapsedTime += d; frame(d); } }, get dayF() { return dayF; }, get days() { return days; }, setDay: id => { const f = days.force(id); if (f && sc) sc.collect(scene, [hero.object]); if (sc) sc.invalidate(); updateSky(true); return days.cur; } };
init().catch(e => { document.getElementById('ltxt').textContent = 'Hiba: ' + e.message; console.error(e); });
