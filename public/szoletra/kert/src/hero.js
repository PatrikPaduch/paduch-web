// A karakter. Erős gépen: csontvázas, animált modell (Quaternius Universal Base Character + Animation Library, CC0)
// törpe-jelmezben. Gyenge gépen: primitívekből épített törpe. A kinézet (sapka, korona, köpeny, aura) a rangtól függ.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const V3 = THREE.Vector3;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const LOCO = { walk: { clip: 'Walk_Loop', dist: 1.3 }, jog: { clip: 'Jog_Fwd_Loop', dist: 5.0 }, sprint: { clip: 'Sprint_Loop', dist: 5.5 } };
const COL = { tunic: '#2d5d96', pants: '#6a4a30', boots: '#3a2414', beard: '#a4521f', hat: '#b8302a', belt: '#3a2618', buckle: '#d9a640' };
// rangcsalád -> sapkaszín; fém -> sapkaszalag
const HAT = { 0: '#b8302a', 1: '#2b4fa8', 5: '#1f7a4c', 4: '#6a2b9a' };
const METAL = ['#b07040', '#d4dde6', '#f0c040'];

export async function loadHero(rigged) {
  if (rigged) {
    try {
      const L = new GLTFLoader();
      const [ch, an] = await Promise.all([L.loadAsync('assets/character/Superhero_Male_FullBody.gltf'), L.loadAsync('assets/character/anims.glb')]);
      return buildRig(ch, an.animations);
    } catch (e) { console.warn('Az animált karakter nem tölthető be, egyszerű törpe lesz:', e); }
  }
  return simpleDwarf();
}

/* ---------- rangfüggő kiegészítők (mindkét figurán ugyanúgy) ---------- */
function makeGear(hatMat, hatTop, backAnchor) {
  const band = new THREE.Mesh(new THREE.TorusGeometry(1, .12, 8, 28), new THREE.MeshStandardMaterial({ color: METAL[0], metalness: .85, roughness: .3 }));
  band.rotation.x = Math.PI / 2; band.castShadow = true;
  const crown = new THREE.Group();
  for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.13, .38, 6), band.material); const a = k / 7 * Math.PI * 2; c.position.set(Math.cos(a), .2, Math.sin(a)); crown.add(c); }
  // köpeny: a hát tetején rögzítve, lefelé lóg, a sebességgel lebben
  const capeG = new THREE.PlaneGeometry(1, 1, 4, 8); capeG.translate(0, -.5, 0);
  { const p = capeG.attributes.position; for (let i = 0; i < p.count; i++) { const y = -p.getY(i); p.setX(i, p.getX(i) * (1 + y * .35)); } }
  const capeM = new THREE.MeshStandardMaterial({ color: '#7a1f2a', roughness: .8, side: THREE.DoubleSide });
  const cape = new THREE.Mesh(capeG, capeM); cape.castShadow = true;
  const capePivot = new THREE.Group(), swing = new THREE.Group(); swing.add(cape); capePivot.add(swing);
  // aura a lába alatt
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(255,255,255,.55)'); gr.addColorStop(.75, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.position.y = .06; aura.renderOrder = 4;
  return {
    band, crown, cape, capePivot, aura,
    set(tier) {
      hatMat.color.set(HAT[tier.fam] ?? HAT[0]);
      band.material.color.set(METAL[tier.lvl] || METAL[0]);
      crown.visible = tier.fam === 1 || tier.fam === 4;
      capePivot.visible = tier.fam === 5 || tier.fam === 4;
      capeM.color.set(tier.fam === 4 ? '#5a1a7a' : '#7a1f2a');
      aura.visible = tier.fam === 4 || tier.fam === 5 || tier.lvl === 2;
      aura.material.color.set(tier.glow || tier.aura || '#ffcc33');
    },
    tick(t, speed) {
      swing.rotation.x = .12 + Math.min(.9, speed * .14) + Math.sin(t * 6) * .04 * Math.min(1, speed);
      aura.rotation.y = t * .6; aura.material.opacity = .55 + .25 * Math.sin(t * 2.2);
    },
  };
}

function clothShader(mat) {
  const u = { cT: { value: new THREE.Color(COL.tunic) }, cP: { value: new THREE.Color(COL.pants) }, cB: { value: new THREE.Color(COL.boots) } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCloth;\nvarying float vCloth;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloth = aCloth;\ntransformed += normal * (aCloth > 2.5 ? 0.016 : aCloth > 0.5 ? 0.012 : 0.0);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCloth;\nuniform vec3 cT; uniform vec3 cP; uniform vec3 cB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vCloth > 0.5) {
          float lum = dot(diffuseColor.rgb, vec3(.3, .59, .11));
          float shade = mix(1., clamp(lum / .35, .7, 1.1), .5);
          vec3 fab = vCloth < 1.5 ? cT : (vCloth < 2.5 ? cP : cB);
          #ifdef USE_MAP
            vec2 wv = vMapUv * 700.;
            fab *= .92 + .05 * sin(wv.x * 3.1) * sin(wv.y * 3.1);
          #endif
          diffuseColor.rgb = fab * shade;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (vCloth > .5) roughnessFactor = vCloth > 2.5 ? .55 : .92;');
  };
  mat.customProgramCacheKey = () => 'heroCloth';
}

function buildRig(ch, clips) {
  const scene = ch.scene; scene.updateMatrixWorld(true);
  let body = null;
  scene.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    if (o.isSkinnedMesh && o.material && o.material.name.includes('Superhero')) body = o;
    if (o.isMesh && o.material && o.material.name.includes('Hair')) { o.material.alphaTest = .45; o.material.color.set(COL.beard).multiplyScalar(.55); }
  });
  const bones = body.skeleton.bones, bone = n => bones.find(b => b.name === n);
  const g = body.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const cloth = new Float32Array(pos.count), v = new V3(), reg = {};
  for (let i = 0; i < pos.count; i++) {
    let bi = si.getX(i), bw = sw.getX(i);
    for (const k of ['Y', 'Z', 'W']) if (sw['get' + k](i) > bw) { bw = sw['get' + k](i); bi = si['get' + k](i); }
    const name = bones[bi].name; v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld);
    (reg[name] ||= new THREE.Box3().makeEmpty()).expandByPoint(v);
    let c = 0;
    if (/^spine_0[123]$/.test(name) || name.startsWith('clavicle') || name.startsWith('upperarm') || name === 'pelvis') c = 1;
    else if (name.startsWith('thigh')) c = v.y > .72 ? 1 : 2;
    else if (name.startsWith('calf')) c = v.y < .32 ? 3 : 2;
    else if (name.startsWith('foot') || name.startsWith('ball')) c = 3;
    cloth[i] = c;
  }
  g.setAttribute('aCloth', new THREE.BufferAttribute(cloth, 1)); clothShader(body.material);
  const toe = reg.ball_l ? reg.ball_l.getCenter(new V3()) : new V3(0, 0, 1), heel = reg.foot_l ? reg.foot_l.getCenter(new V3()) : new V3();
  const fwd = Math.sign(toe.z - heel.z) || 1;
  const std = (c, r = .9, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0, ...o });
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
  const head = reg.Head, hc = head.getCenter(new V3()), hs = head.getSize(new V3());
  const beardM = std(COL.beard, 1);
  const bg = new THREE.SphereGeometry(1, 20, 16); { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const f = 1 + .06 * Math.sin(p.getX(i) * 40 + y * 25); p.setXYZ(i, p.getX(i) * f, y < 0 ? y * (1.5 - .3 * Math.abs(p.getX(i))) : y, p.getZ(i) * f); } bg.computeVertexNormals(); }
  const beard = mk(bg, beardM); beard.scale.set(hs.x * .5, hs.y * .42, hs.z * .34);
  beard.position.set(hc.x, head.min.y + hs.y * .2, hc.z + fwd * hs.z * .3); bone('Head').attach(beard);
  for (const s of [-1, 1]) { const m = mk(new THREE.SphereGeometry(1, 10, 8), beardM); m.scale.set(hs.x * .2, hs.y * .06, hs.z * .1); m.position.set(hc.x + s * hs.x * .13, head.min.y + hs.y * .38, hc.z + fwd * hs.z * .47); m.rotation.z = s * .3; bone('Head').attach(m); }
  const hatM = std(COL.hat, .85), hatR = Math.max(hs.x, hs.z) * .56;
  const hat = new THREE.Group();
  const brim = mk(new THREE.TorusGeometry(hatR * .98, hatR * .14, 8, 28), hatM); brim.rotation.x = Math.PI / 2; hat.add(brim);
  const c1 = mk(new THREE.ConeGeometry(hatR, hs.y * 1.1, 24, 3), hatM); c1.position.y = hs.y * .55; hat.add(c1);
  const c2 = mk(new THREE.ConeGeometry(hatR * .5, hs.y * .7, 16), hatM); c2.position.set(0, hs.y * 1.15, -fwd * hatR * .45); c2.rotation.x = -fwd * .9; hat.add(c2);
  const gear = makeGear(hatM);
  gear.band.scale.setScalar(hatR * 1.02); gear.band.position.y = hatR * .25; hat.add(gear.band);
  gear.crown.scale.setScalar(hatR * 1.02); gear.crown.position.y = hatR * .3; hat.add(gear.crown);
  hat.position.set(hc.x, head.max.y - hs.y * .22, hc.z - fwd * .01); hat.rotation.x = -fwd * .12;
  bone('Head').attach(hat);
  const chest = reg.spine_03, cc = chest.getCenter(new V3()), backZ = fwd > 0 ? chest.min.z : chest.max.z;
  gear.cape.scale.set((chest.max.x - chest.min.x) * 1.15, .95, 1); gear.capePivot.position.set(cc.x, chest.max.y - .04, backZ - fwd * .04);
  if (fwd < 0) gear.capePivot.rotation.y = Math.PI; bone('spine_03').attach(gear.capePivot);
  const pel = reg.pelvis, pc = pel.getCenter(new V3()), ps = pel.getSize(new V3()), beltY = pel.max.y - .03;
  const belt = mk(new THREE.TorusGeometry(1, .03, 6, 28), std(COL.belt, .7)); belt.scale.set(ps.x * .55 + .03, ps.z * .55 + .03, 1); belt.rotation.x = Math.PI / 2; belt.position.set(pc.x, beltY, pc.z); bone('pelvis').attach(belt);
  const buckle = mk(new THREE.BoxGeometry(.08, .065, .02), std(COL.buckle, .3, { metalness: .8 })); buckle.position.set(pc.x, beltY, pc.z + fwd * (ps.z * .55 + .04)); bone('pelvis').attach(buckle);

  const byName = {}; for (const c of clips) { c.tracks = c.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'pelvis.position'); byName[c.name] = c; }
  const holder = new THREE.Group(); if (fwd < 0) scene.rotation.y = Math.PI; holder.add(scene); holder.add(gear.aura);
  scene.scale.set(1.08, .84, 1.08);
  const mixer = new THREE.AnimationMixer(scene), act = {};
  const use = (k, n) => { const c = byName[n]; if (!c) return; const a = mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play(); act[k] = { a, w: 0, dur: c.duration }; };
  use('idle', 'Idle_Loop'); for (const k of Object.keys(LOCO)) use(k, LOCO[k].clip);
  use('sit', 'Sitting_Idle_Loop'); use('dance', 'Dance_Loop'); use('interact', 'Interact');
  for (const k of Object.keys(LOCO)) if (act[k]) act[k].a.timeScale = 0;
  act.idle.w = 1;
  let phase = 0, t = 0;
  return {
    object: holder, top: (head.max.y + hs.y * 1.4) * .84, rigged: true, setRank: tier => gear.set(tier),
    update(dt, speed, pose) {
      t += dt; const s = speed, T = {};
      if (pose && act[pose]) T[pose] = 1;
      else {
        const wW = THREE.MathUtils.smoothstep(s, .1, 1.2) * (1 - THREE.MathUtils.smoothstep(s, 1.8, 3.4));
        const wJ = THREE.MathUtils.smoothstep(s, 1.8, 3.4) * (1 - THREE.MathUtils.smoothstep(s, 4.6, 6.4));
        const wS = THREE.MathUtils.smoothstep(s, 4.6, 6.4);
        T.idle = 1 - THREE.MathUtils.smoothstep(s, .1, 1.2); T.walk = wW; T.jog = wJ; T.sprint = wS;
        const tw = wW + wJ + wS;
        if (tw > .001) { const dist = (wW * LOCO.walk.dist + wJ * LOCO.jog.dist + wS * LOCO.sprint.dist) / tw * .84; phase = (phase + s * dt / dist) % 1; }
        for (const k of ['walk', 'jog', 'sprint']) if (act[k]) act[k].a.time = phase * act[k].dur;
      }
      for (const k in act) { act[k].w = damp(act[k].w, T[k] || 0, 10, dt); act[k].a.setEffectiveWeight(act[k].w); }
      mixer.update(dt); gear.tick(t, speed);
    },
  };
}

/* ---------- egyszerű törpe (gyenge gépre) ---------- */
function simpleDwarf() {
  const g = new THREE.Group(), P = {}, M = {};
  const mat = k => M[k] ??= new THREE.MeshStandardMaterial({ color: { skin: '#e9b896', eye: '#1a1a1a', ...COL }[k], roughness: k === 'buckle' ? .3 : .85, metalness: k === 'buckle' ? .8 : 0 });
  const mesh = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, mat(m)); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const pivot = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const body = pivot(0, 0, 0, g); P.body = body;
  for (const s of [-1, 1]) { const hip = pivot(s * .16, .58, 0, body); mesh(new THREE.CylinderGeometry(.12, .11, .42, 10), 'pants', 0, -.21, 0, hip); mesh(new THREE.BoxGeometry(.24, .16, .36), 'boots', 0, -.47, .05, hip); P[s < 0 ? 'legL' : 'legR'] = hip; }
  mesh(new THREE.CylinderGeometry(.3, .41, .64, 16), 'tunic', 0, .9, 0, body);
  mesh(new THREE.CylinderGeometry(.42, .42, .1, 16), 'belt', 0, .64, 0, body);
  mesh(new THREE.BoxGeometry(.15, .13, .05), 'buckle', 0, .64, .42, body);
  for (const s of [-1, 1]) { const sh = pivot(s * .37, 1.1, 0, body); const a = mesh(new THREE.CylinderGeometry(.095, .085, .46, 10), 'tunic', 0, -.22, 0, sh); a.rotation.z = s * .12; mesh(new THREE.SphereGeometry(.105, 12, 8), 'skin', s * .03, -.47, 0, sh); P[s < 0 ? 'armL' : 'armR'] = sh; }
  const head = pivot(0, 1.43, 0, body); P.head = head;
  mesh(new THREE.SphereGeometry(.28, 20, 14), 'skin', 0, 0, 0, head); mesh(new THREE.SphereGeometry(.09, 10, 8), 'skin', 0, -.02, .28, head);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(.036, 8, 6), 'eye', s * .1, .07, .245, head);
  const beard = mesh(new THREE.SphereGeometry(.3, 16, 12), 'beard', 0, -.22, .12, head); beard.scale.set(1, 1.4, .72);
  const hat = pivot(0, .17, -.02, head);
  mesh(new THREE.CylinderGeometry(.31, .31, .08, 18), 'hat', 0, 0, 0, hat);
  const c1 = mesh(new THREE.ConeGeometry(.29, .56, 18), 'hat', 0, .3, -.03, hat); c1.rotation.x = -.15;
  const c2 = mesh(new THREE.ConeGeometry(.15, .36, 14), 'hat', 0, .6, -.16, hat); c2.rotation.x = -.8;
  const gear = makeGear(mat('hat'));
  gear.band.scale.setScalar(.31); gear.band.position.y = .06; hat.add(gear.band);
  gear.crown.scale.setScalar(.31); gear.crown.position.y = .08; hat.add(gear.crown);
  gear.cape.scale.set(.6, .85, 1); gear.capePivot.position.set(0, 1.18, -.3); body.add(gear.capePivot); g.add(gear.aura);
  let ph = 0, t = 0;
  return {
    object: g, top: 2.3, rigged: false, setRank: tier => gear.set(tier),
    update(dt, speed, pose) {
      t += dt; const k = Math.min(1, speed / 1.5); ph += dt * (6 + speed * 1.6) * k; const s = Math.sin(ph);
      P.legL.rotation.x = s * .75 * k; P.legR.rotation.x = -s * .75 * k; P.armL.rotation.x = -s * .65 * k; P.armR.rotation.x = s * .65 * k;
      P.body.position.y = Math.abs(Math.cos(ph)) * .07 * k + Math.sin(t * 2) * .012 * (1 - k); P.head.rotation.y = Math.sin(t * .7) * .25 * (1 - k);
      if (pose === 'sit') { P.legL.rotation.x = P.legR.rotation.x = -1.4; P.body.position.y = -.42; }
      if (pose === 'dance') { P.armL.rotation.x = P.armR.rotation.x = -2.6 + Math.sin(t * 8) * .4; P.body.position.y = Math.abs(Math.sin(t * 6)) * .12; P.head.rotation.y = Math.sin(t * 4) * .4; }
      gear.tick(t, speed);
    },
  };
}

/* ---------- a kertész: idős, fehér szakállú, szalmakalapos ---------- */
export function makeGardener() {
  const g = new THREE.Group(), P = {}, M = {};
  const C = { skin: '#d9a07a', beard: '#eeeae0', tunic: '#4f7a3a', pants: '#6a5236', boots: '#3a2616', straw: '#d8b86a', band: '#8a3a22', eye: '#1a1a1a', apron: '#a88a5a' };
  const mat = k => M[k] ??= new THREE.MeshStandardMaterial({ color: C[k], roughness: .85 });
  const mesh = (geo, m, x, y, z, parent) => { const o = new THREE.Mesh(geo, mat(m)); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const pivot = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const body = pivot(0, 0, 0, g);
  for (const s of [-1, 1]) { const hip = pivot(s * .15, .62, 0, body); mesh(new THREE.CylinderGeometry(.11, .1, .46, 10), 'pants', 0, -.23, 0, hip); mesh(new THREE.BoxGeometry(.22, .14, .34), 'boots', 0, -.5, .05, hip); }
  mesh(new THREE.CylinderGeometry(.27, .36, .7, 14), 'tunic', 0, .97, 0, body);
  const ap = mesh(new THREE.BoxGeometry(.42, .5, .04), 'apron', 0, .82, .3, body); ap.rotation.x = -.12;
  for (const s of [-1, 1]) { const sh = pivot(s * .34, 1.22, 0, body); mesh(new THREE.CylinderGeometry(.085, .075, .48, 8), 'tunic', 0, -.23, 0, sh); mesh(new THREE.SphereGeometry(.09, 10, 8), 'skin', 0, -.49, 0, sh); P[s < 0 ? 'armL' : 'armR'] = sh; }
  const head = pivot(0, 1.56, 0, body); P.head = head;
  mesh(new THREE.SphereGeometry(.25, 18, 12), 'skin', 0, 0, 0, head); mesh(new THREE.SphereGeometry(.08, 10, 8), 'skin', 0, -.02, .25, head);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(.03, 8, 6), 'eye', s * .09, .06, .22, head);
  const bd = mesh(new THREE.SphereGeometry(.27, 14, 10), 'beard', 0, -.25, .1, head); bd.scale.set(.95, 1.6, .7);
  mesh(new THREE.CylinderGeometry(.55, .58, .04, 24), 'straw', 0, .16, 0, head);
  mesh(new THREE.CylinderGeometry(.24, .27, .2, 18), 'straw', 0, .27, 0, head);
  mesh(new THREE.CylinderGeometry(.272, .272, .06, 18), 'band', 0, .2, 0, head);
  // kis kosár a kezében
  const basket = mesh(new THREE.CylinderGeometry(.18, .13, .18, 12, 1, true), 'straw', 0, -.62, .08, P.armL); basket.material.side = THREE.DoubleSide;
  let t = 0, talk = 0;
  return {
    object: g,
    talk(sec) { talk = sec; },
    update(dt) {
      t += dt; talk = Math.max(0, talk - dt);
      P.head.rotation.y = Math.sin(t * .6) * .3; P.head.rotation.x = talk > 0 ? Math.sin(t * 9) * .05 : 0;
      P.armR.rotation.x = talk > 0 ? -.9 + Math.sin(t * 3) * .35 : Math.sin(t * .8) * .05; P.armR.rotation.z = talk > 0 ? .3 : 0;
      body.position.y = Math.sin(t * 1.6) * .01;
    },
  };
}
