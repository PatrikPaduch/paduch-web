// Szemiramisz függőkertje: a Szólétra 3D kertje. A törpe feje fölött mindig a Szólétra-rangod lebeg.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { emblem, TIERS, STEPS } from '../../emblems.js';
import { PLAZA, CITY, PIER, LV, LAKE, ISLAND, CANALS, FOUNTAINS, BASIN, STAIRS, P, heightAt, blocked, layout, makeTour, wordTriggers, LOCK_TIER, maxLevelFor } from './world.js';
import { loadTextures, makeMats, TEX, U } from './mats.js';
import { buildWorld, LANTERNS } from './build.js';
import { buildFlora, CULL } from './flora.js';
import { loadHero } from './hero.js';
import { ShadowCache } from './shadowcache.js';
import { makeLife } from './life.js';
import { GardenAudio } from './audio.js';
import { GARDEN_WORDS, WORD_IDS, CITY_IDS } from './words.js';
import { buildCity, CITY_TRIG, CITY_MAP } from './city.js';
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

let hero = null, M = null, life = null, sc = null, blob = null, ready = false, learn = null, city = null;
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
  prog('Babilon utcái...'); await tick(); city = buildCity(M, q); scene.add(city.root); TRIG.push(...CITY_TRIG);
  prog('A törpe...'); hero = await loadHero(q.rigged); scene.add(hero.object); hero.object.traverse(o => { if (o.isMesh && !o.material.blending) o.castShadow = true; });
  prog('Élet a kertben...'); life = makeLife(scene, q);
  learn = createLearn({ scene, me, TRIG, isFound: id => found.has(id), foundCount: () => found.size, say, addPts, maxH: () => LV[maxI].h, zoneAt, toast: toastK });
  { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })); blob.renderOrder = 3; scene.add(blob); }
  if (q.shadow) { sc = new ShadowCache(renderer, sun); sc.collect(scene, [hero.object]); const hp = new THREE.Vector3(); sc.dynPoint = () => hp.set(me.x, me.y + 1.1, me.z); }
  applyRank(true);
  prog('Shaderek fordítása...'); await tick();
  updateSky(true); onResize(); renderer.compile(scene, camera);
  drawMapBase(); refreshUI(); updWordCount();
  ready = true; document.getElementById('load').classList.add('off');
  if (resumed) { zoneShow('Folytatod, ahol abbahagytad', resumed.zone || ''); zoneNow = zoneOf()[0]; } else zoneShow('Szemiramisz függőkertje', 'Üdv a kertben');
  loop();
}
const tick = () => new Promise(r => setTimeout(r, 0));

/* ---------- napszak: valós idő vagy kiválasztott ---------- */
let tod = localStorage.getItem('kert-tod') || 'real', dayF = 1, lastSun = new THREE.Vector3(), sunT = 0;
const hourNow = () => tod === 'day' ? 15.5 : tod === 'dusk' ? 17.55 : tod === 'night' ? 23.3 : (d => d.getHours() + d.getMinutes() / 60)(new Date());
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
  const k = e.key.toLowerCase(); keys[k] = true; audio.start();
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
  if (!ready) return;
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
  if (on) { pauseInfo(); audio.pause(true); learn && learn.closeAll(); } else { audio.pause(document.hidden); clock.getDelta(); }
}
document.getElementById('pause').addEventListener('click', e => {
  const b = e.target.closest('[data-p]'); if (!b) return;
  const a = b.dataset.p;
  if (a === 'go') togglePause(false);
  if (a === 'save') saveGame(true);
  if (a === 'quit') { saveGame(true); SYNC.flush ? SYNC.flush(true).finally(() => { location.href = '../index.html'; }) : setTimeout(() => { location.href = '../index.html'; }, 400); }
  if (a === 'home') { Object.assign(me, { x: 0, z: 104, y: 0, ang: Math.PI }); cam.yaw = 0; sitting = null; pose = null; if (autoWalk) nearestWp(); togglePause(false); zoneShow('Az Istár-kapu előtt', 'a kert bejárata'); }
});
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
const canStand = (x, z, h0) => !blocked(x, z) && Math.abs(heightAt(x, z) - h0) < .7 && heightAt(x, z) <= LV[maxI].h + .45;
let stepDist = 0;
function stepMe(dt) {
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), iz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (joy.on) { ix = joy.x; iz = joy.y; }
  const manual = Math.hypot(ix, iz) > .15;
  if (sitting) { if (manual) toggleSit(); else { me.spd = 0; return; } }
  let mx = 0, mz = 0, speed = 0;
  if (manual) {
    const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    mx = fx * -iz + rx * ix; mz = fz * -iz + rz * ix; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
    speed = (keys.shift ? 6.2 : 2.9) * Math.min(1, Math.hypot(ix, iz) * (joy.on ? 1.6 : 1));
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
function applyRank(first) {
  const r = myRank(), changed = !rk || r.n !== rk.n;
  if (!changed) return;
  const up = rk && r.n > rk.n; rk = r;
  document.getElementById('emb').innerHTML = emblem(TIERS[r.t], r.d, 74); document.getElementById('rname').textContent = `${TIERS[r.t].name} ${r.d}`;
  hero.setRank(TIERS[r.t]);
  const newMax = maxLevelFor(r.t); if (newMax !== maxI || first) { const opened = !first && newMax > maxI; maxI = newMax; TOURP = makeTour(maxI); if (autoWalk) nearestWp(); buildLocks(); if (opened) toastK(`Megnyílt: ${maxI + 1}. terasz`, 'a rangod nyitotta meg'); }
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
const cool = {}, CITY_SET = new Set(CITY_IDS);
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
  addPts(5, `Új ${CITY_SET.has(id) ? 'város' : 'kert'}szó: ${w[0]}`, '+5 pont · bekerült a Szólétrába', w); updWordCount(); learn && learn.onDiscover(id);
  if (!sitting && pose !== 'dance') { pose = 'interact'; poseT = 1.3; }
}
/* ---------- lebegő szócímkék: a szó ott marad a tárgy fölött, amíg a közelben vagy ---------- */
const LABEL_H = { donkey: 2.4, cart: 2.2, sack: 1.8, crate: 1.8, pigeon: 1.3, hen: 1.3, stall: 3.9, awning: 4.4, library: 7.6, boat: 3.2, sail: 8.4, rooftop: 8.2, ladder: 4.2, scarecrow: 3, beehive: 1.9, merchant: 2.6, librarian: 2.6, scribe: 2.6, fisherman: 2.6, harbour: 3, alley: 4, 'clay tablet': 2.6, bookshelf: 3.3, palm: 8.7, date: 6.2, olive: 5.4, fig: 5.8, pomegranate: 4.4, cypress: 10.8, cedar: 11, willow: 8.2, rose: 2, lavender: 1.7, shrub: 1.8, reed: 3, lily: 1.2, flowerpot: 2.4, bench: 1.8, hedge: 1.9, flowerbed: 1.7, fountain: 4.2, canal: 1.7, gate: 18.6, lion: 4.9, tile: 2.7, well: 4, orchard: 5.8, meadow: 1.7, vine: 2.5, terrace: 3.3, staircase: 3.2, waterfall: 4.6, shore: 2.1, bridge: 2.9, island: 7.2, dome: 10.2, column: 5.6, temple: 10.4, arbour: 4.3 };
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
  wordHide = performance.now() + 1500;
  if (best === wordNow && !learn.needsQuiz(best)) return;
  if (wordNow) cool[wordNow] = performance.now() + 25000;
  if (learn.takeWord(best)) { wordNow = best; return; }
  wordNow = best; const w = GARDEN_WORDS[best], isNew = !found.has(best);
  el.innerHTML = `<span class="tag">${CITY_SET.has(best) ? (isNew ? '✨ Új városszó' : 'Városszó') : (isNew ? '✨ Új kertszó' : 'Kertszó')}</span><div class="en">${w[0]}<button data-say="${w[0]}">🔊</button></div><div class="hu">${w[1]}</div><div class="ex">${w[2]} <button data-say="${w[2].replace(/"/g, '&quot;')}" style="background:none;border:0;cursor:pointer">🔊</button><i>${w[3]}</i></div>`;
  el.classList.add('on'); say(w[0]);
  if (isNew) discover(best);
}
document.getElementById('word').addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) say(b.dataset.say, b.dataset.say.includes(' ') ? .92 : .85); });
function updWordCount() { document.getElementById('wcount').textContent = `${found.size} / ${WORD_IDS.length} · lista`; }
document.getElementById('wcount').addEventListener('click', () => {
  const el = document.getElementById('wlist');
  el.innerHTML = `<button class="x">✕</button><h2>Szavaid · ${found.size} / ${WORD_IDS.length}</h2><p style="color:#8fa3c8;font-size:13px;margin:0 0 10px">Sétálj oda a növényekhez, épületekhez, árusokhoz: az angol nevük felbukkan, és az új szavak bekerülnek a Szólétrába.</p>${[['🌿 A kert', WORD_IDS.filter(i => !CITY_SET.has(i))], ['🏛️ Babilon utcái (az Istár-kapun túl)', CITY_IDS]].map(([h, ids]) => `<h3 style="font-size:14px;margin:12px 0 6px;color:#ffd54a">${h} · ${ids.filter(i => found.has(i)).length} / ${ids.length}</h3><div class="g">${ids.map(id => found.has(id) ? `<div class="w"><b>${GARDEN_WORDS[id][0]}</b> · <span>${GARDEN_WORDS[id][1]}</span></div>` : `<div class="w no"><b>???</b> · <span>még nem találtad meg</span></div>`).join('')}</div>`).join('')}`;
  el.classList.add('on'); el.querySelector('.x').onclick = () => el.classList.remove('on');
});
let toastT = null;
function toastK(a, b) { const z = document.getElementById('toastk'); z.innerHTML = `${a}<small>${b}</small>`; z.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => z.classList.remove('on'), 2600); }

/* ---------- helyszín-felirat ---------- */
function zoneAt(x, z, y) { const s = { x: me.x, z: me.z, y: me.y }; me.x = x; me.z = z; me.y = y; const r = zoneOf(); Object.assign(me, s); return r[0] + (r[1] ? ' (' + r[1] + ')' : ''); }
function zoneOf() {
  if (me.z > PLAZA.z1 - .5) {
    if (me.z < CITY.z0 + 1.5) return ['Az Istár-kapu', 'átjáró a városba'];
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
const MB_G = { x0: PLAZA.x0, x1: PLAZA.x1, z0: PLAZA.z0, z1: PLAZA.z1 }, MB_C = { x0: -84, x1: 84, z0: 104, z1: 248 };
let MB = MB_G, mapCity = null;
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
  g.strokeStyle = '#8a6a48'; g.lineWidth = 5; g.strokeRect(2, 2, mc.width - 4, mc.height - 4);
  mapCity = g.getImageData(0, 0, mc.width, mc.height); MB = MB_G;
}
function drawMapBase() {
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
  const inCity = me.z > PLAZA.z1 - 2; MB = inCity ? MB_C : MB_G;
  mg.putImageData(inCity ? mapCity : mapBase, 0, 0);
  // zárt teraszok: sötétítés
  if (!inCity) for (let i = maxI + 1; i < LV.length; i++) { const r = LV[i].r; mg.fillStyle = 'rgba(10,15,30,.28)'; mg.fillRect(mx2(-r), mz2(-r), mx2(r) - mx2(-r), mz2(r) - mz2(-r)); }
  mg.fillStyle = '#7fe0a0'; for (const t of TRIG) if (!found.has(t.w) && Math.hypot(t.x - me.x, t.z - me.z) < 24) { mg.beginPath(); mg.arc(mx2(t.x), mz2(t.z), 2.5, 0, 6.3); mg.fill(); }
  const mh = learn && learn.mapHint(); if (mh) { const pr = 10 + 3 * Math.sin(performance.now() / 300); mg.strokeStyle = '#ffd54a'; mg.lineWidth = 3; mg.beginPath(); mg.arc(mx2(mh.x), mz2(mh.z), pr + 12, 0, 6.3); mg.stroke(); }
  const x = mx2(me.x), y = mz2(me.z);
  mg.save(); mg.translate(x, y); mg.rotate(-me.ang + Math.PI); mg.fillStyle = '#ffd54a'; mg.strokeStyle = '#000'; mg.lineWidth = 2;
  mg.beginPath(); mg.moveTo(0, -11); mg.lineTo(7, 8); mg.lineTo(0, 4); mg.lineTo(-7, 8); mg.closePath(); mg.fill(); mg.stroke(); mg.restore();
}

/* ---------- lámpafények, távolsági ritkítás, hang ---------- */
function assignLamps() {
  if (!lampLights.length) return;
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
  return { water: Math.max(0, 1 - dw / 14), fall: Math.max(0, 1 - df / 26), day: dayF, height: me.y };
}

/* ---------- fő ciklus ---------- */
const clock = new THREE.Clock(); let fN = 0, fT = 0, slow = 0, slowT = 0, prT = 0, curPr = q.pr, shX = 1e9, shZ = 1e9;
function loop() { requestAnimationFrame(loop); if (paused) { clock.getDelta(); return; } frame(); }
function frame(fixedDt) {
  const dt = fixedDt ?? Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  U.uTime.value = t;
  stepMe(dt);
  if (poseT > 0) { poseT -= dt; if (poseT <= 0 && pose !== 'sit') pose = null; }
  hero.object.position.set(me.x, me.y, me.z); hero.object.rotation.y = me.ang; hero.update(dt, me.spd, pose);
  blob.position.set(me.x, me.y + .03, me.z); blob.visible = !q.shadow || dayF < .12;
  const ty = me.y + 1.25;
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
  life.update(t, dt, me, dayF); city.update(t, dt, me); labelsTick(dt, t); learn.update(dt, t);
  renderer.render(scene, camera);
  sc && sc.after();
  placePlate();
  if ((slowT += dt) > .25) {
    slowT = 0; drawMap(); cullSmall(); wordCheck(); labelsPick(); learn.slow(); lockPrompt(); assignLamps(); audio.update(audioState());
    const [a, b] = zoneOf(); if (a !== zoneNow) { if (zoneNow) zoneShow(a, b); zoneNow = a; }
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
  document.querySelectorAll('#qual button').forEach(b => b.classList.toggle('on', b.dataset.q === qual));
  document.querySelectorAll('#auto button').forEach(b => b.classList.toggle('on', (b.dataset.a === '1') === autoWalk));
  document.querySelectorAll('#snd button').forEach(b => b.classList.toggle('on', (b.dataset.s === '1') === !audio.muted));
  document.getElementById('tod').value = tod;
}
document.getElementById('qual').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (!b || b.dataset.q === qual) return; localStorage.setItem('kert-q', b.dataset.q); localStorage.setItem('kert-pos', JSON.stringify(me)); location.reload(); });
document.getElementById('auto').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) setAuto(b.dataset.a === '1'); });
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
window.__kert = { me, cam, get auto() { return autoWalk; }, set auto(v) { autoWalk = v; }, renderer, scene, get sc() { return sc; }, CULL, setTod: v => { tod = v; updateSky(true); }, frames: (n, d = 1 / 60) => { for (let i = 0; i < n; i++) { clock.elapsedTime += d; frame(d); } }, get dayF() { return dayF; } };
init().catch(e => { document.getElementById('ltxt').textContent = 'Hiba: ' + e.message; console.error(e); });
