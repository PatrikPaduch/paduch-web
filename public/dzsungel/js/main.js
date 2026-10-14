import * as THREE from 'three';
import { G, installChunks } from './shaders.js';
import { makeAtlas, makeBark, makeWing } from './textures.js';
import { buildTerrain, UPPER, CAMP, RIVER, polyInfo } from './terrain.js';
import { terrainMat, terrainMatPBR, farMat, waterMat } from './materials.js';
import { loadAssets } from './assets.js';
import { loadPlants } from './plants.js';
import { loadCharacter } from './character.js';
import { Weather, WEATHER_LABELS } from './weather.js';
import { Animals } from './animals.js';
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
  const input = { fwd: false, back: false, left: false, right: false, run: false, jump: false, turnL: false, turnR: false };
  const keymap = { KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', ArrowRight: 'turnR', ShiftLeft: 'run', ShiftRight: 'run' };
  addEventListener('keydown', (e) => {
    if (keymap[e.code]) input[keymap[e.code]] = true;
    if (state.mode !== 'play' || state.menu) return;
    if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyR') { const m = weather.cycleMode(); settings.weather = m; toast(`Időjárás: ${WEATHER_LABELS[m]}`); syncMenu(); }
    if (e.code === 'KeyC') { input.walk = !input.walk; toast(input.walk ? 'Séta' : 'Kocogás'); }
    if (e.code === 'KeyH') { state.hud = !state.hud; $('hud').classList.toggle('off', !state.hud); }
    if (e.code === 'KeyT') { settings.tspeed = settings.tspeed === 2 ? 1 : 2; toast(settings.tspeed === 2 ? 'Az idő felgyorsult' : 'Az idő normál ütemben telik'); syncMenu(); }
    if (e.code === 'KeyM') toast(audio.toggleMute() ? 'Hang némítva' : 'Hang bekapcsolva');
  });
  addEventListener('keyup', (e) => { if (keymap[e.code]) input[keymap[e.code]] = false; });
  addEventListener('blur', () => { for (const k in input) input[k] = false; audio.pause(true); });
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
  const strip = $('cstrip'), PX = 2.2;
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
  ];
  for (const m of marks) { const e = document.createElement('span'); e.className = 'm'; e.textContent = m.icon; e.title = m.title; $('cmarks').appendChild(e); m.el = e; }
  const fmtTime = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };
  const bars = {};
  document.querySelectorAll('.stat').forEach((s) => { bars[s.dataset.k] = s.querySelector('i'); });

  function nearWater() {
    for (let a = 0; a < 8; a++) {
      const x = player.pos.x + Math.cos(a / 8 * 6.28) * 1.4, z = player.pos.z + Math.sin(a / 8 * 6.28) * 1.4;
      if (T.waterLevelAt(x, z) - T.heightAt(x, z) > 0.12) return true;
    }
    return player.wade > 0.05;
  }
  function nearBanana() {
    for (const b of flora.bananas) if (!b.eaten && Math.hypot(b.x - player.pos.x, b.z - player.pos.z) < 1.9) return b;
    return null;
  }
  function interact() {
    const b = nearBanana();
    if (b) {
      b.eaten = true;
      flora.bunchMesh.setMatrixAt(b.i, new THREE.Matrix4().makeScale(0, 0, 0));
      flora.bunchMesh.instanceMatrix.needsUpdate = true;
      state.food = Math.min(1, state.food + 0.35);
      toast('Leszedtél egy fürt banánt');
      player.rig?.oneShot('interact', 1.1);
      return;
    }
    if (nearWater()) { state.water = 1; toast('Ittál a friss forrásvízből'); audio.step('water', 0); if (!player.swim) player.rig?.oneShot('interact', 1.1); }
  }

  // ---------------- Menü
  function syncMenu() {
    $('tod').value = tod; $('todv').textContent = fmtTime(tod);
    document.querySelectorAll('#tseg button').forEach((b) => b.classList.toggle('on', +b.dataset.t === settings.tspeed));
    document.querySelectorAll('#wseg button').forEach((b) => b.classList.toggle('on', b.dataset.w === weather.mode));
    $('cRays').checked = settings.rays; $('cBloom').checked = settings.bloom; $('cGrain').checked = settings.grain;
    $('cInv').checked = settings.invY; $('sens').value = settings.sens; $('sensv').textContent = (+settings.sens).toFixed(2);
    saveSettings();
  }
  function openMenu() { state.menu = true; $('menu').classList.remove('hidden'); syncMenu(); for (const k in input) input[k] = false; }
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
    onAttack() {
      if (state.mode !== 'play') return;
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

    // túlélés
    if (state.mode === 'play' && !state.menu) {
      const fireD = Math.hypot(player.pos.x - CAMP.x, player.pos.z - CAMP.z);
      state.food = Math.max(0, state.food - dt / 480);
      state.water = Math.max(0, state.water - dt / 300);
      if (state.food <= 0 || state.water <= 0) state.hp = Math.max(0.05, state.hp - dt / 150);
      else state.hp = Math.min(1, state.hp + dt * (fireD < 4 ? 1 / 30 : 1 / 240));
      hudT -= dt;
      if (hudT < 0) {
        hudT = 0.1;
        bars.hp.style.width = `${state.hp * 100}%`; bars.food.style.width = `${state.food * 100}%`;
        bars.water.style.width = `${state.water * 100}%`; bars.stam.style.width = `${player.stamina * 100}%`;
        const b = nearBanana(), w = !b && nearWater(), fire = fireD < 3.5;
        const p = $('prompt');
        if (b) p.innerHTML = '<b>E</b>Banán leszedése';
        else if (w) p.innerHTML = '<b>E</b>Ivás';
        else if (fire) p.innerHTML = 'Melegszel a tűznél';
        p.classList.toggle('on', !!(b || w || fire));
      }
    }
    if (state.mode !== 'title') {
      const bearing = ((-player.camYaw * 180 / Math.PI) % 360 + 360) % 360;
      const W = $('compass').clientWidth;
      strip.style.transform = `translateX(${W / 2 - (bearing + 360) * PX}px)`;
      for (const m of marks) {
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
    audio.update({ pos: state.mode === 'title' ? camera.position : player.pos, fall: fx.fallPos, yaw: player.camYaw, riverD: rd, day: sky.day * (1 - weather.rain), night: sky.night * (1 - weather.rain * 0.8), fireD: Math.hypot(player.pos.x - CAMP.x, player.pos.z - CAMP.z) });

    // utófeldolgozás paraméterei
    tmpV.copy(camera.position).addScaledVector(sky.sunDir, 1000).project(camera);
    sunUV.set((tmpV.x + 1) / 2, (tmpV.y + 1) / 2);
    const facing = camera.getWorldDirection(new THREE.Vector3()).dot(sky.sunDir);
    const vis = smoothstep(-0.1, 0.4, facing) * (tmpV.z < 1 ? 1 : 0);
    post.render(scene, camera, {
      sunUV, rays: sky.post.rays * vis, raysStr: sky.post.rays * vis * 1.2,
      bloom: settings.bloom ? sky.post.bloom : 0, exposure: sky.post.exposure, time: G.uTime.value,
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
  };
  const setView = (k) => {
    const v = VIEWS[k];
    state.mode = 'play'; state.fade = 1; state.hud = false; state.noAuto = true; $('hud').classList.add('off'); $('start').classList.add('hidden');
    player.pos.set(v.p[0], T.heightAt(v.p[0], v.p[1]), v.p[1]);
    player.camTarget.set(v.p[0], player.pos.y + 1.6, v.p[1]);
    player.camYaw = player.yawT = v.yaw; player.camPitch = player.pitchT = v.pitch;
    player.camDist = player.camDistT = v.dist; player.camHit = v.dist; player.facing = v.yaw + Math.PI;
    tod = v.t; settings.tspeed = 0;
  };
  if (qs.has('view')) setView(qs.get('view'));
  window.__dz = { animals, weather, setView, state, scene, camera, renderer, sky, player, flora, T, post, fx, setTod: (h) => { tod = h; } };
}

init().catch((e) => {
  console.error(e);
  $('ltext').textContent = 'Hiba a betöltéskor: ' + e.message;
});
