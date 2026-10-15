import * as THREE from 'three';
import { G, installChunks } from './shaders.js';
import { makeAtlas, makeBark, makeWing } from './textures.js';
import { buildTerrain, UPPER, CAMP, TEMPLE, RIVER, NAPKAPU, polyInfo } from './terrain.js';
import { terrainMat, terrainMatPBR, farMat, waterMat } from './materials.js';
import { loadAssets } from './assets.js';
import { loadPlants } from './plants.js';
import { loadCharacter } from './character.js';
import { Weather, WEATHER_LABELS } from './weather.js';
import { Animals } from './animals.js';
import { Temple } from './temple.js';
import { Survival, ITEMS, TOOLS } from './survival.js';
import { Hunt } from './hunt.js';
import { Cave } from './cave.js';
import { Napkapu } from './napkapu.js';
import { Story } from './story.js';
import { buildFlora } from './flora.js';
import { Sky } from './sky.js';
import { Post } from './post.js';
import { Player } from './player.js';
import { FX } from './fx.js';
import { JungleAudio } from './audio.js';
import { smoothstep, clamp } from './noise.js';

installChunks();

const $ = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 16));

const QUALITY = {
  low: { label: 'Alacsony', scale: 0.7, prCap: 1, msaa: 0, shadow: 1024, shadowR: 40, rays: false, grass: 0.4, near: 0.7, trees: 0.65 },
  medium: { label: 'Közepes', scale: 0.85, prCap: 1, msaa: 2, shadow: 2048, shadowR: 50, rays: true, grass: 0.7, near: 0.85, trees: 0.85 },
  high: { label: 'Magas', scale: 1, prCap: 1.25, msaa: 4, shadow: 2048, shadowR: 60, rays: true, grass: 1, near: 1, trees: 1 },
  ultra: { label: 'Ultra', scale: 1, prCap: 2, msaa: 4, shadow: 4096, shadowR: 70, rays: true, grass: 1, near: 1.3, trees: 1 },
};
const QORDER = ['low', 'medium', 'high', 'ultra'];
const TSPEED = [0, 1 / 120, 1 / 6];

const settings = { rays: true, bloom: true, grain: true, q: 'high', tspeed: 1, sens: 1, invY: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem('dzsungel-settings') || '{}')); } catch (e) { /* nincs tárolt beállítás */ }
const saveSettings = () => { try { localStorage.setItem('dzsungel-settings', JSON.stringify(settings)); } catch (e) { /* privát mód */ } };

function setProgress(f, text) {
  $('lfill').style.width = `${Math.round(f * 100)}%`;
  if (text) $('ltext').textContent = text + '…';
}

async function init() {
  const qs = new URLSearchParams(location.search);
  const canvas = $('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 2000);
  const camB = camera.clone();
  // unadjustedMovement: az operációs rendszer egérgyorsítása nélkül (érintőpadon sokkal kiszámíthatóbb)
  const lockPointer = () => {
    try {
      const p = canvas.requestPointerLock?.({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { const q = canvas.requestPointerLock(); if (q && q.catch) q.catch(() => {}); } catch (e) { /* nincs pointer lock */ } });
    } catch (e) { /* a beágyazott nézet nem enged pointer lockot */ }
  };

  setProgress(0.02, 'Fotós textúrák betöltése'); await tick();
  const A = qs.has('proc') ? null : await loadAssets(renderer, (f) => setProgress(0.02 + f * 0.1));
  setProgress(0.12, 'Növénymodellek betöltése'); await tick();
  const PL = A ? await loadPlants(renderer, (f) => setProgress(0.12 + f * 0.05)) : null;
  setProgress(0.17, 'Felfedező felöltöztetése'); await tick();
  const RIG = A ? await loadCharacter() : null;
  setProgress(0.15, 'Domborzat formálása'); await tick();
  const T = buildTerrain();
  const tMat = A ? terrainMatPBR(T.tSplat, A) : terrainMat(T.tSplat, T.tHeight);
  for (const g of T.tiles) { const m = new THREE.Mesh(g, tMat); m.receiveShadow = true; scene.add(m); }
  const caster = new THREE.Mesh(T.shadowGeo, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  caster.castShadow = true; scene.add(caster);
  scene.add(new THREE.Mesh(T.far, farMat()));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), waterMat(T.tHeight, 0));
  water.receiveShadow = true; scene.add(water);
  const upWater = new THREE.Mesh(T.upGeo, waterMat(T.tHeight, UPPER));
  upWater.receiveShadow = true; scene.add(upWater);

  setProgress(0.18, 'Levelek festése'); await tick();
  const atlas = makeAtlas(PL ? PL.leafPhoto : null), barkTex = makeBark(), wing = makeWing();
  let fp = 0.25;
  const flora = await buildFlora(scene, T, atlas, barkTex, (s) => { fp += 0.06; setProgress(fp, s); }, A, PL);

  setProgress(0.82, 'Égbolt és fények'); await tick();
  const sky = new Sky(scene, renderer);
  const weather = new Weather(scene, T, T.tHeight);
  if (flora.canopy) {
    weather.setCanopy(flora.canopy);
    if (tMat.userData.u.tCanopy) tMat.userData.u.tCanopy.value = flora.canopy.tex;
  }
  if (A) sky.setHDR(A.hdr);
  const player = new Player(scene, T, flora.colliders);
  player.setRig(RIG);
  const fx = new FX(scene, T, flora, atlas, wing);
  const post = new Post(renderer);
  const audio = new JungleAudio();
  const animals = new Animals(scene, T, flora, audio);
  player.onStep = (s, run) => audio.step(s, run);
  // templomrom: a járható felülete (teraszok, lépcső, szentélyfalak) a domborzat fölé kerül
  const temple = new Temple(scene, flora, PL, atlas);
  const terrainHeight = T.heightAt;
  T.heightAt = (x, z) => Math.max(terrainHeight(x, z), temple.heightAt(x, z));
  const surv = new Survival(scene, T, flora, player);
  const hunt = new Hunt(scene, T, flora, audio, fx, surv, player, animals);
  // barlang a vízesés mögött: a játékos a barlang padlóján jár, a kamera nem megy ki a sziklába
  const cave = new Cave(scene, A ? A.rock_face_03 : flora.rockTex, flora);
  const inCave = () => cave.near(player.pos) && player.pos.z < -51.0;
  player.groundFn = (x, z) => { if (inCave()) { const f = cave.floorAt(x, z); if (f !== null) return f; } return T.heightAt(x, z); };
  player.waterFn = (x, z) => (inCave() && cave.floorAt(x, z) !== null ? cave.waterAt(x, z) : T.waterLevelAt(x, z));
  player.camCeil = (x, z) => (inCave() && cave.floorAt(x, z) !== null ? cave.ceilAt(x, z) : Infinity);
  player.camBlock = (x, z) => Math.max(temple.heightAt(x, z), inCave() && cave.inRock(x, z) ? Infinity : -Infinity);
  const napkapu = new Napkapu(scene, flora, flora.rockTex, temple.idol, cave.serpent);
  const story = new Story({ scene, T, temple, cave, napkapu, hunt, surv, player, state: null });

  let Q = QUALITY.high, streamFrom = new THREE.Vector3(1e9, 0, 0);
  function applyQuality(name) {
    settings.q = name; Q = QUALITY[name];
    // rejtett/összecsukott ablaknál 0 a méret: ideiglenes alapméret, a resize esemény később javítja
    const W = innerWidth || 1280, H = innerHeight || 720;
    renderer.setPixelRatio(Math.min(devicePixelRatio, Q.prCap) * Q.scale);
    renderer.setSize(W, H);
    const v = renderer.getDrawingBufferSize(new THREE.Vector2());
    post.setSize(v.x, v.y, Q.msaa);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    sky.setShadow(Q.shadow, Q.shadowR);
    flora.setTreeFrac(Q.trees);
    for (const s of flora.streams) { s.rMul = Q.near; s.frac = s.isGrass ? Q.grass : Math.min(1, Q.grass + 0.3); }
    flora.grassMat.userData.u.uGrassR.value = 65 * Q.near;
    post.useRays = Q.rays && settings.rays;
    post.useBloom = settings.bloom;
    streamFrom.set(1e9, 0, 0);
    document.querySelectorAll('#qseg button').forEach((b) => b.classList.toggle('on', b.dataset.q === name));
    saveSettings();
  }
  applyQuality(QUALITY[settings.q] ? settings.q : 'high');
  addEventListener('resize', () => applyQuality(settings.q));

  let tod = 8.2;
  sky.setTime(tod);
  sky.updateEnv();
  setProgress(0.9, 'Shaderek fordítása'); await tick();
  const titleCam = (t) => {
    const ang = -0.45 + Math.sin(t * 0.035) * 0.5;
    const x = 6 + Math.sin(ang) * 30, z = -16 + Math.cos(ang) * 35;
    camera.position.set(x, Math.max(T.heightAt(x, z), 0) + 3.4 + Math.sin(t * 0.05) * 1.0, z);
    camera.lookAt(9, 8.5, -46);
  };
  titleCam(0);
  for (const s of flora.streams) s.update(camera.position.x, camera.position.z);
  try { await renderer.compileAsync(scene, camera); } catch (e) { console.warn(e); }
  setProgress(1, 'Kész');

  // ---------------- Állapot, bemenet
  const state = { mode: 'title', menu: false, hud: true, transT: 0, fade: 0, hp: 1, food: 0.8, water: 0.7, t: 0 };
  story.state = state;
  const input = { fwd: false, back: false, left: false, right: false, run: false, jump: false, turnL: false, turnR: false };
  const keymap = { KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', ArrowRight: 'turnR', ShiftLeft: 'run', ShiftRight: 'run' };
  addEventListener('keydown', (e) => {
    if (e.code === 'Tab') { e.preventDefault(); if (state.mode === 'play') (state.craft ? closeCraft() : (!state.menu && openCraft())); return; }
    if (state.craft && e.code === 'Escape') { closeCraft(); return; }
    if (state.panel && (e.code === 'Escape' || e.code === state.panel)) { closePanel(); return; }
    if (state.mode === 'play' && !state.menu && (e.code === 'KeyM' || e.code === 'KeyJ')) { openPanel(e.code); return; }
    if (keymap[e.code]) input[keymap[e.code]] = true;
    if (state.mode !== 'play' || state.menu) return;
    if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyF') { toast(surv.eat(state)); refreshHotbar(); }
    for (const [id, t] of Object.entries(TOOLS)) if (t.key && e.code === `Digit${t.key}`) { toast(surv.equip(id)); refreshHotbar(); }
    if (e.code === 'KeyR') { const m = weather.cycleMode(); settings.weather = m; toast(`Időjárás: ${WEATHER_LABELS[m]}`); syncMenu(); }
    if (e.code === 'KeyC') { input.walk = !input.walk; toast(input.walk ? 'Séta' : 'Kocogás'); }
    if (e.code === 'KeyX') { player.crouch = !player.crouch; toast(player.crouch ? 'Lopakodás: a vad később vesz észre' : 'Felálltál'); }
    if (e.code === 'KeyQ' && !e.repeat && !hunt.startAim() && surv.equipped !== 'spear') toast('Vedd kézbe a lándzsát (2)');
    if (e.code === 'KeyH') { state.hud = !state.hud; $('hud').classList.toggle('off', !state.hud); }
    if (e.code === 'KeyT') { settings.tspeed = settings.tspeed === 2 ? 1 : 2; toast(settings.tspeed === 2 ? 'Az idő felgyorsult' : 'Az idő normál ütemben telik'); syncMenu(); }
    if (e.code === 'KeyM') toast(audio.toggleMute() ? 'Hang némítva' : 'Hang bekapcsolva');
  });
  addEventListener('keyup', (e) => {
    if (keymap[e.code]) input[keymap[e.code]] = false;
    if (e.code === 'KeyQ') huntRelease();
  });
  // lándzsa: bal gomb nyomva = célzás, felengedve dobás (rövid kattintás = döfés); jobb gomb megszakítja
  function huntRelease() { if (!hunt.aim) return; const m = hunt.release(camera); if (m) toast(m); refreshHotbar(); }
  canvas.addEventListener('mousedown', (e) => {
    if (state.mode !== 'play' || state.menu) return;
    if (e.button === 0) hunt.startAim();
    if (e.button === 2) hunt.cancelAim();
  });
  addEventListener('mouseup', (e) => { if (e.button === 0) huntRelease(); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('blur', () => { for (const k in input) input[k] = false; hunt.cancelAim(); audio.pause(true); });
  addEventListener('focus', () => { if (!document.hidden) audio.pause(false); });
  document.addEventListener('visibilitychange', () => audio.pause(document.hidden || !document.hasFocus()));
  let dragging = false;
  canvas.addEventListener('mousedown', () => { dragging = true; });
  addEventListener('mouseup', () => { dragging = false; });
  addEventListener('mousemove', (e) => {
    if (state.mode !== 'play' || state.menu) return;
    if (document.pointerLockElement !== canvas && !dragging) return;
    let dx = e.movementX, dy = e.movementY;
    // Chrome/érintőpad hiba: befogott egérnél néha óriási ugrásokat jelent, ezeket eldobjuk
    if (Math.abs(dx) > 120 || Math.abs(dy) > 120) return;
    dx = clamp(dx, -40, 40); dy = clamp(dy, -40, 40);
    const s = 0.0014 * settings.sens;
    player.yawT -= dx * s;
    player.pitchT = clamp(player.pitchT + dy * s * (settings.invY ? -0.85 : 0.85), -0.35, 1.25);
  });
  addEventListener('wheel', (e) => { if (state.mode === 'play') player.camDistT = clamp(player.camDistT + clamp(e.deltaY, -60, 60) * 0.004, 2.2, 12); }, { passive: true });
  canvas.addEventListener('click', () => { if (state.mode === 'play' && !state.menu) lockPointer(); });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && state.mode === 'play' && !state.menu && !state.ignoreUnlock) openMenu();
    state.ignoreUnlock = false;
  });

  // ---------------- HUD
  let toastTimer = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600); }
  const strip = $('cstrip'), PX = 2.2, xhair = $('xhair');
  {
    const names = { 0: 'É', 45: 'ÉK', 90: 'K', 135: 'DK', 180: 'D', 225: 'DNy', 270: 'Ny', 315: 'ÉNy' };
    let html = '';
    for (let d = -360; d <= 720; d += 15) {
      const n = ((d % 360) + 360) % 360, x = (d + 360) * PX;
      if (names[n] !== undefined) html += `<span class="l${n === 0 ? ' n' : ''}" style="left:${x}px">${names[n]}</span>`;
      else html += `<span class="t${n % 45 === 0 ? ' big' : ''}" style="left:${x}px"></span>`;
    }
    strip.innerHTML = html;
  }
  const marks = [
    { el: null, x: 10, z: T.lipZ, icon: '≋', title: 'Vízesés' },
    { el: null, x: CAMP.x, z: CAMP.z, icon: '▲', title: 'Tábor' },
    { el: null, x: TEMPLE.x, z: TEMPLE.z, icon: '◆', title: 'Templomrom' },
    { el: null, x: 0, z: 0, icon: '↑', title: 'Lándzsa', spear: true },
    { el: null, x: 0, z: 0, icon: '★', title: 'Cél', obj: true },
  ];
  for (const m of marks) { const e = document.createElement('span'); e.className = 'm' + (m.obj ? ' obj' : ''); e.textContent = m.icon; e.title = m.title; $('cmarks').appendChild(e); m.el = e; }
  const fmtTime = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const bars = {};
  document.querySelectorAll('.stat').forEach((s) => { bars[s.dataset.k] = s.querySelector('i'); });

  function nearWater() {
    for (let a = 0; a < 8; a++) {
      const x = player.pos.x + Math.cos(a / 8 * 6.28) * 1.4, z = player.pos.z + Math.sin(a / 8 * 6.28) * 1.4;
      if (player.waterFn(x, z) - player.groundFn(x, z) > 0.12) return true;
    }
    return player.wade > 0.05;
  }
  function nearBanana() {
    for (const b of flora.bananas) if (!b.eaten && Math.hypot(b.x - player.pos.x, b.z - player.pos.z) < 1.9) return b;
    return null;
  }
  // E: a legközelebbi teendő (kincs > tárgy > banán > ivás)
  function interact() {
    if (temple.idolNear(player.pos)) {
      temple.takeIdol(); state.found = true;
      discover('Az Arany Jaguár a tiéd!', 'Megtaláltad az elveszett templom kincsét');
      player.rig?.oneShot('interact', 1.1); saveGame(); return;
    }
    if (hunt.nearSpear(player.pos)) { toast(hunt.takeSpear()); player.rig?.oneShot('interact', 0.9); refreshHotbar(); return; }
    const cc = hunt.nearCarcass(player.pos);
    if (cc) { toast(hunt.butcher(cc)); player.rig?.oneShot('interact', 1.2); audio.thunk(0.15); refreshHotbar(); saveGame(); return; }
    if (surv.canCook(player.pos)) { toast(surv.cook()); audio.sizzle(); player.rig?.oneShot('interact', 1.2); refreshHotbar(); return; }
    const pg = story.nearestPage(player.pos);
    if (pg) { story.setRead(pg.id); player.rig?.oneShot('interact', 1.0); if (audio.ctx) audio.burst(2600, 0.6, 0.05, 0.35); openPanel('KeyJ', pg.id); saveGame(); return; }
    if (cave.serpentNear(player.pos)) {
      cave.takeSerpent(); player.rig?.oneShot('interact', 1.1);
      discover('A Jáde Kígyó a tiéd!', 'A második őr is megvan. Irány a Napkapu!'); saveGame(); return;
    }
    if (napkapu.altarNear(player.pos)) {
      if (!temple.found || !cave.found) { toast(`Az oltáron két foglalat van. Hiányzik: ${[!temple.found && 'Arany Jaguár', !cave.found && 'Jáde Kígyó'].filter(Boolean).join(', ')}`); return; }
      napkapu.place(); player.rig?.oneShot('interact', 1.2); audio.chord(0.22);
      setTimeout(() => discover('A völgy szíve', 'A kapu megnyílt. A fényben a Napkorong lebeg.'), 2500);
      saveGame(); return;
    }
    if (napkapu.discNear(player.pos)) {
      napkapu.takeDisc(); player.rig?.oneShot('interact', 1.1); audio.chord(0.15);
      discover('A Napkorong a tiéd', 'A dzsungel befogadott. A jaguár többé nem támad rád.'); saveGame(); return;
    }
    const it = surv.nearestItem(player.pos);
    if (it) { toast(surv.pickup(it)); player.rig?.oneShot('interact', 1.0); refreshHotbar(); return; }
    const b = nearBanana();
    if (b) {
      b.eaten = true; b.back = 300;
      flora.bunchMesh.setMatrixAt(b.i, new THREE.Matrix4().makeScale(0, 0, 0));
      flora.bunchMesh.instanceMatrix.needsUpdate = true;
      surv.inv.banana += 3;
      toast('+3 Banán (F: evés)');
      player.rig?.oneShot('interact', 1.1); refreshHotbar();
      return;
    }
    if (nearWater()) { state.water = 1; toast('Ittál a friss forrásvízből'); audio.step('water', 0); if (!player.swim) player.rig?.oneShot('interact', 1.1); }
  }
  function promptText() {
    if (temple.idolNear(player.pos)) return '<b>E</b>Arany Jaguár felvétele';
    if (story.nearestPage(player.pos)) return '<b>E</b>📜 Napló lap elolvasása';
    if (cave.serpentNear(player.pos)) return '<b>E</b>Jáde Kígyó felvétele';
    if (napkapu.altarNear(player.pos)) return temple.found && cave.found ? '<b>E</b>A két szobor elhelyezése az oltáron' : '<b>E</b>Az oltár vizsgálata';
    if (napkapu.discNear(player.pos)) return '<b>E</b>☼ A Napkorong elvétele';
    if (hunt.aim) return hunt.charge() > 0.02 ? `Erő ${Math.round(hunt.charge() * 100)}% · engedd el a dobáshoz` : 'Célzás… (rövid kattintás: döfés)';
    if (hunt.nearSpear(player.pos)) return `<b>E</b>🔱 Lándzsa visszavétele${hunt.shot.fish ? ' a hallal' : ''}`;
    const cc = hunt.nearCarcass(player.pos);
    if (cc) return `<b>E</b>${cc.sp === 'peccary' ? '🐗 Pekari' : '🦫 Kapibara'} feldolgozása`;
    if (surv.canCook(player.pos)) return '<b>E</b>🔥 Sütés a tűzön';
    const it = surv.nearestItem(player.pos);
    if (it) return `<b>E</b>${ITEMS[it.type].icon} ${ITEMS[it.type].name} felvétele`;
    if (nearBanana()) return '<b>E</b>🍌 Banánfürt leszedése';
    if (nearWater()) return '<b>E</b>Ivás';
    if (surv.warmth(player.pos)) return 'Melegszel a tűznél';
    return '';
  }

  // ---------------- Tárgysáv és barkácsolás
  function refreshHotbar() {
    let h = '';
    for (const [k, d] of Object.entries(ITEMS)) if (!d.opt || surv.inv[k]) h += `<div class="slot${surv.inv[k] ? '' : ' empty'}" title="${d.name}"><span>${d.icon}</span><i>${surv.inv[k]}</i></div>`;
    h += '<div class="sep"></div>';
    for (const [k, d] of Object.entries(TOOLS)) {
      if (!d.key) continue;
      h += `<div class="slot tool${surv.tools[k] ? '' : ' empty'}${surv.equipped === k ? ' on' : ''}${k === 'spear' && surv.spearOut ? ' out' : ''}" title="${d.name}"><span>${d.icon}</span><b>${d.key}</b></div>`;
    }
    $('hotbar').innerHTML = h;
    if (state.craft) renderCraft();
  }
  function renderCraft() {
    let h = '';
    for (const [id, t] of Object.entries(TOOLS)) {
      const ok = surv.canCraft(id) && (id === 'fire' || !surv.tools[id]);
      const req = Object.entries(t.need).map(([k, n]) => `<span class="${surv.inv[k] >= n ? 'have' : 'miss'}">${ITEMS[k].icon} ${surv.inv[k]}/${n}</span>`).join('');
      h += `<div class="recipe${ok ? '' : ' no'}"><div class="ri">${t.icon}</div><div class="rb"><div class="rn">${t.name}${id !== 'fire' && surv.tools[id] ? ' <em>megvan</em>' : ''}</div><div class="rd">${t.desc}</div><div class="rr">${req}</div></div><button data-c="${id}" ${ok ? '' : 'disabled'}>Elkészít</button></div>`;
    }
    $('recipes').innerHTML = h;
  }
  $('recipes').onclick = (e) => { const id = e.target.dataset.c; if (id) { const m = surv.craft(id); if (m) toast(m); refreshHotbar(); renderCraft(); saveGame(); } };
  // napló (J) és térkép (M): megállítják a játékot, mint a menü
  function openPanel(code, noteId) {
    hunt.cancelAim();
    state.panel = code; state.menu = true;
    for (const k in input) input[k] = false;
    if (code === 'KeyJ') { story.openJournal(noteId); $('journal').classList.remove('hidden'); }
    else { story.drawMap({ fire: surv.fire, spear: hunt.shot && hunt.shot.state !== 'fly' ? hunt.spearMid() : null }); $('mapPanel').classList.remove('hidden'); }
    state.ignoreUnlock = true; document.exitPointerLock?.();
  }
  function closePanel() { $('journal').classList.add('hidden'); $('mapPanel').classList.add('hidden'); state.panel = null; state.menu = false; lockPointer(); }
  $('jClose').onclick = closePanel; $('mapClose').onclick = closePanel;
  $('jList').onclick = (e) => { const b = e.target.closest('button'); if (b) story.openJournal(b.dataset.n); };
  function openCraft() { hunt.cancelAim(); state.craft = true; state.menu = true; renderCraft(); $('craft').classList.remove('hidden'); for (const k in input) input[k] = false; state.ignoreUnlock = true; document.exitPointerLock?.(); }
  function closeCraft() { state.craft = false; state.menu = false; $('craft').classList.add('hidden'); lockPointer(); }
  $('craftClose').onclick = closeCraft;

  // nagy felfedezés-felirat
  function discover(title, sub) {
    const d = $('discover'); d.querySelector('.t1').textContent = title; d.querySelector('.t2').textContent = sub;
    d.classList.remove('on'); void d.offsetWidth; d.classList.add('on');
  }

  // ---------------- Mentés (böngészőben, 10 mp-enként)
  const SAVE_KEY = 'dzsungel-save';
  function saveGame() {
    if (state.mode !== 'play' || state.noAuto) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, pos: [player.pos.x, player.pos.y, player.pos.z], facing: player.facing, hp: state.hp, food: state.food, water: state.water,
        tod, surv: surv.serialize(), found: state.found, templeSeen: state.templeSeen, firstKill: state.firstKill,
        story: story.serialize(), caveSeen: cave.seen, serpent: cave.found, napSeen: napkapu.seen, placed: napkapu.placed, disc: napkapu.discTaken,
      }));
    } catch (e) { /* privát mód */ }
  }
  function loadGame() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
    if (!s || s.v !== 1) return false;
    player.pos.set(s.pos[0], s.pos[1], s.pos[2]); player.facing = s.facing || 0;
    player.camTarget.set(s.pos[0], s.pos[1] + 1.6, s.pos[2]);
    Object.assign(state, { hp: s.hp ?? 1, food: s.food ?? 0.8, water: s.water ?? 0.7, found: !!s.found, templeSeen: !!s.templeSeen, firstKill: !!s.firstKill });
    if (s.tod !== undefined) tod = s.tod;
    surv.restore(s.surv);
    if (state.found) temple.takeIdol();
    story.restore(s.story);
    cave.seen = !!s.caveSeen; if (s.serpent) cave.takeSerpent();
    napkapu.seen = !!s.napSeen; napkapu.restore(!!s.placed, !!s.disc);
    return true;
  }
  addEventListener('beforeunload', saveGame);

  // ---------------- Menü
  function syncMenu() {
    $('tod').value = tod; $('todv').textContent = fmtTime(tod);
    document.querySelectorAll('#tseg button').forEach((b) => b.classList.toggle('on', +b.dataset.t === settings.tspeed));
    document.querySelectorAll('#wseg button').forEach((b) => b.classList.toggle('on', b.dataset.w === weather.mode));
    $('cRays').checked = settings.rays; $('cBloom').checked = settings.bloom; $('cGrain').checked = settings.grain;
    $('cInv').checked = settings.invY; $('sens').value = settings.sens; $('sensv').textContent = (+settings.sens).toFixed(2);
    saveSettings();
  }
  function openMenu() { state.menu = true; hunt.cancelAim(); $('menu').classList.remove('hidden'); syncMenu(); for (const k in input) input[k] = false; }
  function closeMenu() { state.menu = false; $('menu').classList.add('hidden'); lockPointer(); }
  $('resume').onclick = closeMenu;
  $('qseg').onclick = (e) => { const q = e.target.dataset.q; if (q) applyQuality(q); };
  $('tseg').onclick = (e) => { if (e.target.dataset.t !== undefined) { settings.tspeed = +e.target.dataset.t; syncMenu(); } };
  $('tod').oninput = (e) => { tod = +e.target.value; $('todv').textContent = fmtTime(tod); };
  $('vol').oninput = (e) => audio.setVolume(+e.target.value);
  $('cRays').onchange = (e) => { settings.rays = e.target.checked; post.useRays = Q.rays && settings.rays; saveSettings(); };
  $('cBloom').onchange = (e) => { settings.bloom = e.target.checked; post.useBloom = settings.bloom; saveSettings(); };
  $('cGrain').onchange = (e) => { settings.grain = e.target.checked; saveSettings(); };
  $('wseg').onclick = (e) => { const w = e.target.dataset.w; if (w) { weather.setMode(w); settings.weather = w; syncMenu(); } };
  if (settings.weather) weather.setMode(settings.weather);
  if (qs.has('w')) weather.setMode(qs.get('w'));
  $('cInv').onchange = (e) => { settings.invY = e.target.checked; saveSettings(); };
  $('sens').oninput = (e) => { settings.sens = +e.target.value; $('sensv').textContent = settings.sens.toFixed(2); saveSettings(); };

  // ---------------- Indítás
  // banánfürtök eredeti helye (újranövéshez)
  for (const b of flora.bananas) { b.m0 = new THREE.Matrix4(); flora.bunchMesh.getMatrixAt(b.i, b.m0); }
  const hasSave = !qs.has('view') && !qs.has('play') && loadGame();
  refreshHotbar();
  if (hasSave) { $('go').textContent = 'Folytatás'; $('newgame').classList.remove('hidden'); }
  $('newgame').onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } location.reload(); };
  $('load').classList.add('hidden');
  $('go').classList.remove('hidden');
  $('start').classList.remove('loading');
  $('go').onclick = (e) => {
    if (e) audio.start();
    state.mode = 'trans'; state.transT = 0;
    state.fromPos = camera.position.clone(); state.fromQ = camera.quaternion.clone();
    $('start').classList.add('fade');
    setTimeout(() => $('start').classList.add('hidden'), 1300);
    $('hud').classList.remove('off');
    setTimeout(() => $('help').classList.add('dim'), 14000);
    lockPointer();
  };

  if (qs.has('t')) tod = +qs.get('t');
  if (qs.has('play')) $('go').onclick();

  // jaguártámadás: sebzés, piros villanás, kamera-rázkódás
  const animalHooks = {
    isSafe: (p) => surv.isSafe(p) || napkapu.discTaken,
    hasTorch: () => surv.equipped === 'torch',
    onAttack() {
      if (state.mode !== 'play') return;
      if (surv.hasSpear()) {
        state.hp = Math.max(0.05, state.hp - 0.08);
        toast('Lándzsával elhárítottad a jaguárt!');
        player.rig?.oneShot('interact', 0.6);
        return;
      }
      state.hp = Math.max(0.05, state.hp - 0.35);
      toast('A jaguár rád vetette magát!');
      const h = $('hurt'); h.classList.remove('on'); void h.offsetWidth; h.classList.add('on');
      player.camYaw += (Math.random() - 0.5) * 0.3; player.camPitch += 0.1;
    },
  };

  // ---------------- Fő ciklus
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3(), sunUV = new THREE.Vector2();
  let fpsAcc = 0, fpsN = 0, fpsShown = 0, autoT = 0, autoDone = false, autoAcc = 0, autoN = 0, hudT = 0;
  function frame() {
    requestAnimationFrame(frame);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    state.t += dt;
    G.uTime.value += dt;
    if (!state.menu) tod = (tod + dt * TSPEED[settings.tspeed]) % 24;
    sky.setTime(tod);
    weather.update(dt, { camera, sky, audio, screenH: post.h });
    state.fade = Math.min(1, state.fade + dt * 0.6);

    if (state.mode === 'title') {
      titleCam(state.t);
      player.animate(dt);
    } else {
      if (!state.menu) {
        const turn = (input.turnL ? 1 : 0) - (input.turnR ? 1 : 0);
        player.yawT += turn * dt * 1.9 * settings.sens;
        player.update(dt, input);
      } else player.animate(dt);
      if (state.mode === 'trans') {
        state.transT += dt / 2.0;
        player.updateCamera(dt, camB);
        const k = smoothstep(0, 1, state.transT);
        camera.position.lerpVectors(state.fromPos, camB.position, k);
        camera.quaternion.slerpQuaternions(state.fromQ, camB.quaternion, k);
        if (state.transT >= 1) state.mode = 'play';
      } else player.updateCamera(dt, camera);
    }
    camera.updateMatrixWorld();
    G.uPlayer.value.copy(player.pos);
    if (streamFrom.distanceToSquared(camera.position) > 36) {
      streamFrom.copy(camera.position);
      for (const s of flora.streams) s.update(camera.position.x, camera.position.z);
    }
    sky.update(camera, state.mode === 'title' ? tmpV.set(6, 2, -20) : player.pos);
    sky.updateEnv();
    fx.update(dt, { camera, player: state.mode === 'title' ? null : player, sky, screenH: post.h });
    animals.update(dt, { player, camera, sky, fx, hooks: animalHooks });
    if (state.mode !== 'title') {
      const hm = hunt.update(dt, camera);
      if (hm) {
        toast(hm); refreshHotbar();
        if (hm.startsWith('Elejtettél') && !state.firstKill) { state.firstKill = true; discover('Vadász lettél', 'Elejtetted az első zsákmányodat'); }
      }
      xhair.classList.toggle('on', !!hunt.aim);
      if (hunt.aim) xhair.style.setProperty('--k', hunt.charge().toFixed(3));
    }

    temple.update(state.t);
    // barlang: szórt fény és ég eltompítása, szemhez szoktatás (expozíció), nincs eső, halkabb dzsungel
    const caveK = cave.update(dt, state.t, player.pos, audio);
    if (caveK > 0) {
      const dim = 1 - 0.93 * caveK;
      sky.hemi.intensity *= dim; scene.environmentIntensity *= dim; G.uAmbF.value.multiplyScalar(dim);
      sky.light.intensity *= 1 - 0.97 * caveK; G.uSunCol.value.multiplyScalar(1 - 0.97 * caveK);
      sky.fog.color.multiplyScalar(1 - 0.94 * caveK); sky.fog.density = sky.fog.density * (1 - caveK) + 0.035 * caveK;
    }
    weather.shelter = caveK;
    napkapu.update(dt, state.t);
    surv.update(dt, sky.night, (m) => { toast(m); refreshHotbar(); });
    for (const b of flora.bananas) if (b.eaten) { b.back -= dt; if (b.back <= 0) { b.eaten = false; flora.bunchMesh.setMatrixAt(b.i, b.m0); flora.bunchMesh.instanceMatrix.needsUpdate = true; } }

    // túlélés
    if (state.mode === 'play' && !state.menu) {
      state.food = Math.max(0, state.food - dt / 480);
      state.water = Math.max(0, state.water - dt / 300);
      if (state.food <= 0 || state.water <= 0) state.hp = Math.max(0.05, state.hp - dt / 150);
      else state.hp = Math.min(1, state.hp + dt * (surv.warmth(player.pos) ? 1 / 30 : 1 / 240));
      state.revT = (state.revT || 0) - dt;
      if (state.revT <= 0) { state.revT = 0.5; story.reveal(player.pos); }
      if (!cave.seen && cave.depthK(player.pos) > 0.05) { cave.seen = true; discover('A Zúgó-barlang', 'Rejtett üreg a vízesés mögött'); saveGame(); }
      if (!napkapu.seen && napkapu.near(player.pos, 30)) { napkapu.seen = true; discover('A Napkapu', 'Kőkör a völgy délnyugati végén'); saveGame(); }
      const obj = story.objective().text;
      if (obj !== state.objText) {
        state.objText = obj; const oe = $('objective'); oe.querySelector('b').textContent = obj;
        oe.classList.remove('new'); void oe.offsetWidth; oe.classList.add('new');
      }
      if (!state.templeSeen && temple.near(player.pos, 32)) {
        state.templeSeen = true;
        discover('Az Elveszett Jaguár-templom', 'Ősi romok a vízesés fölötti fennsíkon');
        saveGame();
      }
      state.saveT = (state.saveT || 0) - dt;
      if (state.saveT <= 0) { state.saveT = 10; saveGame(); }
      hudT -= dt;
      if (hudT < 0) {
        hudT = 0.1;
        bars.hp.style.width = `${state.hp * 100}%`; bars.food.style.width = `${state.food * 100}%`;
        bars.water.style.width = `${state.water * 100}%`; bars.stam.style.width = `${player.stamina * 100}%`;
        const txt = promptText(), p = $('prompt');
        if (txt) p.innerHTML = txt;
        p.classList.toggle('on', !!txt);
      }
    }
    if (state.mode !== 'title') {
      const bearing = ((-player.camYaw * 180 / Math.PI) % 360 + 360) % 360;
      const W = $('compass').clientWidth;
      strip.style.transform = `translateX(${W / 2 - (bearing + 360) * PX}px)`;
      for (const m of marks) {
        if (m.obj) {
          const ob = story.objective();
          if (!ob.at) { m.el.style.display = 'none'; continue; }
          m.x = ob.at.x; m.z = ob.at.z;
        }
        if (m.spear) {
          const sm = hunt.shot && hunt.shot.state !== 'fly' ? hunt.spearMid() : null;
          if (!sm) { m.el.style.display = 'none'; continue; }
          m.x = sm.x; m.z = sm.z;
        }
        const mb = Math.atan2(m.x - player.pos.x, -(m.z - player.pos.z)) * 180 / Math.PI;
        let rel = ((mb - bearing) % 360 + 540) % 360 - 180;
        m.el.style.display = Math.abs(rel) < 85 ? '' : 'none';
        m.el.style.left = `${W / 2 + rel * PX}px`;
      }
      $('clockT').textContent = fmtTime(tod);
      $('clockIcon').textContent = weather.stormy ? '⚡' : weather.rain > 0.3 ? '☂' : sky.night > 0.5 ? '☾' : '☀';
    }

    // hang
    const rd = player.pos.z > -60 ? polyInfo(player.pos.x, player.pos.z, RIVER).d : 99;
    audio.update({ pos: state.mode === 'title' ? camera.position : player.pos, fall: fx.fallPos, yaw: player.camYaw, riverD: rd, day: sky.day * (1 - weather.rain) * (1 - caveK * 0.9), night: sky.night * (1 - weather.rain * 0.8) * (1 - caveK * 0.9), fireD: Math.hypot(player.pos.x - CAMP.x, player.pos.z - CAMP.z) });

    // utófeldolgozás paraméterei
    tmpV.copy(camera.position).addScaledVector(sky.sunDir, 1000).project(camera);
    sunUV.set((tmpV.x + 1) / 2, (tmpV.y + 1) / 2);
    const facing = camera.getWorldDirection(new THREE.Vector3()).dot(sky.sunDir);
    const vis = smoothstep(-0.1, 0.4, facing) * (tmpV.z < 1 ? 1 : 0);
    post.render(scene, camera, {
      sunUV, rays: sky.post.rays * vis, raysStr: sky.post.rays * vis * 1.2,
      bloom: settings.bloom ? sky.post.bloom : 0, exposure: sky.post.exposure * (1 + 0.7 * caveK), time: G.uTime.value,
      grain: settings.grain ? 0.014 : 0, fade: state.fade,
    });

    fpsAcc += dt; fpsN++;
    if (fpsAcc > 0.5) { fpsShown = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; $('fps').textContent = `${fpsShown} fps · ${Q.label}`; }
    // Automatikus minőség: csak látható, fókuszált lapon mér; fojtott (háttérben lévő) képkockánál újrakezdi
    if (state.mode === 'play' && !autoDone && !state.noAuto) {
      if (document.hidden || !document.hasFocus() || rawDt > 0.25) { autoT = 0; autoAcc = 0; autoN = 0; }
      autoT += rawDt;
      if (autoT > 2) { autoAcc += rawDt; autoN++; }
      if (autoT > 8) {
        autoDone = true;
        const avg = autoN / autoAcc, i = QORDER.indexOf(settings.q);
        if (avg < 28 && i > 0) { applyQuality(QORDER[i - 1]); toast(`Grafika automatikusan: ${QUALITY[QORDER[i - 1]].label}`); }
      }
    }
  }
  frame();
  // Összehasonlító képekhez rögzített nézőpontok
  const VIEWS = {
    A: { p: [2, 18], yaw: 0, pitch: 0.22, dist: 5.2, t: 8.2 },
    B: { p: [-12, -40], yaw: -0.25, pitch: 0.0, dist: 5, t: 9.5 },
    C: { p: [4, -31], yaw: 0.35, pitch: 0.05, dist: 4.5, t: 9.5 },
    D: { p: [2, 18], yaw: -1.35, pitch: -0.05, dist: 5.2, t: 7.0 },
    E: { p: [-30, -2], yaw: 1.9, pitch: 0.1, dist: 5, t: 10.5 },
    F: { p: [-62, 40], yaw: 2.6, pitch: 0.1, dist: 5, t: 10.5 },
    G: { p: [-43, -68], yaw: 0.15, pitch: 0.12, dist: 6, t: 9.5 },
    H: { p: [-45, -83], yaw: 0, pitch: 0.3, dist: 5, t: 16.5 },
    I: { p: [-1.5, -47.5], yaw: -1.1, pitch: 0.1, dist: 5, t: 10 },
    K: { p: [cave.chamber.x + 2.5, cave.chamber.z + 4], yaw: 0.5, pitch: 0.15, dist: 4, t: 10 },
    N: { p: [napkapu.c.x + napkapu.fwd.x * 15, napkapu.c.z + napkapu.fwd.z * 15], yaw: napkapu.yaw, pitch: 0.12, dist: 6, t: 9 },
  };
  const setView = (k) => {
    const v = VIEWS[k];
    state.mode = 'play'; state.fade = 1; state.hud = false; state.noAuto = true; $('hud').classList.add('off'); $('start').classList.add('hidden');
    player.pos.set(v.p[0], 0, v.p[1]); player.pos.y = player.groundFn(v.p[0], v.p[1]);
    player.camTarget.set(v.p[0], player.pos.y + 1.6, v.p[1]);
    player.camYaw = player.yawT = v.yaw; player.camPitch = player.pitchT = v.pitch;
    player.camDist = player.camDistT = v.dist; player.camHit = v.dist; player.facing = v.yaw + Math.PI;
    tod = v.t; settings.tspeed = 0;
  };
  if (qs.has('view')) setView(qs.get('view'));
  window.__dz = { temple, surv, hunt, cave, napkapu, story, animals, weather, setView, state, scene, camera, renderer, sky, player, flora, T, post, fx, setTod: (h) => { tod = h; } };
}

init().catch((e) => {
  console.error(e);
  $('ltext').textContent = 'Hiba a betöltéskor: ' + e.message;
});
