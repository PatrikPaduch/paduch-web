// Csontvázas, animált felfedező: Quaternius Universal Base Character + Universal Animation Library (CC0)
// A ruházat shaderben, testtájanként (csont-súlyok alapján) kerül az alapfigurára; a felszerelés csontokra rögzítve.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { patch } from './shaders.js';

const V3 = THREE.Vector3;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const std = (color, rough = 0.85, extra = {}) => patch(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }), 'basic');

// Natív haladás animációs ciklusonként (a gyökérmozgásos változatból mérve): méter / ciklus
const LOCO = { walk: { clip: 'Walk_Loop', dist: 1.3 }, jog: { clip: 'Jog_Fwd_Loop', dist: 5.0 }, sprint: { clip: 'Sprint_Loop', dist: 5.5 } };

function clothShader(mat) {
  patch(mat, 'charBody', (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aCloth;\nvarying float vCloth;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vCloth = aCloth;
transformed += objectNormal * (aCloth > 2.5 ? 0.016 : aCloth > 0.5 ? 0.011 : 0.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vCloth;')
      .replace('#include <color_fragment>', `#include <color_fragment>
if (vCloth > 0.5) {
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  float shade = mix(1.0, clamp(lum / 0.4, 0.72, 1.1), 0.55);
  vec2 wv = vMapUv * vec2(700.0, 700.0);
  float weave = 0.9 + 0.06 * jn2(wv) + 0.04 * sin(wv.x * 3.1) * sin(wv.y * 3.1);
  vec3 fab = vCloth < 1.5 ? s2l(vec3(0.74, 0.68, 0.53)) : (vCloth < 2.5 ? s2l(vec3(0.36, 0.37, 0.25)) : s2l(vec3(0.24, 0.16, 0.09)));
  fab *= 0.9 + 0.2 * jn2(vMapUv * 37.0);
  diffuseColor.rgb = fab * weave * shade;
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
if (vCloth > 0.5) roughnessFactor = vCloth > 2.5 ? 0.6 : 0.93;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (vCloth > 0.5) {
  vec3 gn = normalize(vNormal) * faceDirection;
  normal = normalize(mix(normal, gn, 0.88));
  // finom szövetráncok
  float wr = jn2(vMapUv * vec2(60.0, 18.0)) - 0.5;
  normal = normalize(normal + vec3(wr * 0.12, wr * 0.06, 0.0));
}`);
  });
}

// Felszerelés: kalap, hátizsák, öv, bozótvágó, kulacs, sál
function gear() {
  const M = {
    hat: std(0xc4a874, 0.9), band: std(0x4a3420, 0.8), pack: std(0x56633c, 0.92), strap: std(0x3d2c1d, 0.8),
    metal: std(0xc4c8cc, 0.3, { metalness: 0.85 }), roll: std(0x7a3b2a, 0.95), scarf: std(0x8c3324, 0.9), canteen: std(0x4d5a3a, 0.55),
  };
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
  return { M, mk };
}

export async function loadCharacter() {
  const L = new GLTFLoader();
  try {
    const [ch, an] = await Promise.all([L.loadAsync('assets/character/Superhero_Male_FullBody.gltf'), L.loadAsync('assets/character/UAL1_Standard.glb')]);
    return buildRig(ch, an.animations);
  } catch (e) {
    console.warn('Animált karakter nem tölthető be, procedurális figura marad:', e);
    return null;
  }
}

function buildRig(ch, clips) {
  const scene = ch.scene;
  scene.updateMatrixWorld(true);
  let body = null;
  scene.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    if (o.isSkinnedMesh && o.material && o.material.name.includes('Superhero')) body = o;
    // szemöldök/haj: a PNG alfa-csatornája vágja ki a szálakat, sötétbarna tónussal
    if (o.isMesh && o.material && o.material.name.includes('Hair')) {
      o.material.alphaTest = 0.45; o.material.color.setRGB(0.09, 0.06, 0.045); o.material.needsUpdate = true;
      patch(o.material, 'charHair');
    }
    if (o.isMesh && o.material && o.material.name.includes('Eyes')) patch(o.material, 'charEyes');
  });
  const bones = body.skeleton.bones;
  const boneByName = (n) => bones.find((b) => b.name === n);

  // --- Testtájak (kötési pózban): 0 bőr, 1 ing, 2 nadrág, 3 bakancs
  const g = body.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const cloth = new Float32Array(pos.count), v = new V3();
  const reg = {}; // csontonkénti befoglaló dobozok
  for (let i = 0; i < pos.count; i++) {
    let bi = si.getX(i), bw = sw.getX(i);
    for (const k of ['Y', 'Z', 'W']) if (sw['get' + k](i) > bw) { bw = sw['get' + k](i); bi = si['get' + k](i); }
    const name = bones[bi].name;
    v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld);
    (reg[name] ||= new THREE.Box3().makeEmpty()).expandByPoint(v);
    let c = 0;
    if (/^spine_0[123]$/.test(name) || name.startsWith('clavicle') || name.startsWith('upperarm')) c = 1;
    else if (name === 'pelvis' || name.startsWith('thigh')) c = 2;
    else if (name.startsWith('calf')) c = v.y < 0.3 ? 3 : 2;
    else if (name.startsWith('foot') || name.startsWith('ball')) c = 3;
    cloth[i] = c;
  }
  g.setAttribute('aCloth', new THREE.BufferAttribute(cloth, 1));
  clothShader(body.material);

  // --- Előre néző irány a lábujjak alapján (a lábfej-csont dobozához képest)
  const toe = reg.ball_l ? reg.ball_l.getCenter(new V3()) : new V3(0, 0, 1), heel = reg.foot_l ? reg.foot_l.getCenter(new V3()) : new V3();
  const fwdSign = Math.sign(toe.z - heel.z) || 1;

  // --- Felszerelés a csontokra, kötési pózban elhelyezve, majd attach() megtartja a világ-transzformot
  const { M, mk } = gear();
  const head = reg.Head, hc = head.getCenter(new V3()), hs = head.getSize(new V3());
  const hatR = Math.max(hs.x, hs.z) * 0.5 + 0.012;
  const hat = new THREE.Group();
  hat.add(mk(new THREE.CylinderGeometry(hatR * 1.95, hatR * 1.95, 0.012, 32), M.hat));
  const crown = mk(new THREE.CylinderGeometry(hatR * 0.92, hatR * 1.04, 0.11, 24), M.hat); crown.position.y = 0.055; hat.add(crown);
  const band = mk(new THREE.CylinderGeometry(hatR * 1.05, hatR * 1.05, 0.03, 24), M.band); band.position.y = 0.018; hat.add(band);
  hat.position.set(hc.x, head.max.y - 0.055, hc.z - 0.008 * fwdSign);
  hat.rotation.x = -0.07 * fwdSign;
  boneByName('Head').attach(hat);

  const chest = reg.spine_03, cc = chest.getCenter(new V3());
  const backZ = fwdSign > 0 ? chest.min.z : chest.max.z;
  const pack = new THREE.Group();
  pack.add(mk(new THREE.BoxGeometry(0.34, 0.44, 0.18), M.pack));
  const flap = mk(new THREE.BoxGeometry(0.36, 0.12, 0.2), M.pack); flap.position.y = 0.17; pack.add(flap);
  const pocket = mk(new THREE.BoxGeometry(0.22, 0.14, 0.06), M.pack); pocket.position.set(0, -0.09, -0.11 * fwdSign); pack.add(pocket);
  const roll = mk(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 14), M.roll); roll.rotation.z = Math.PI / 2; roll.position.y = 0.28; pack.add(roll);
  pack.position.set(cc.x, cc.y - 0.06, backZ - 0.1 * fwdSign);
  boneByName('spine_03').attach(pack);
  const scarf = mk(new THREE.TorusGeometry(0.07, 0.028, 8, 16), M.scarf);
  const nk = reg.neck_01 ? reg.neck_01.getCenter(new V3()) : new V3(cc.x, chest.max.y, cc.z);
  scarf.position.set(nk.x, (reg.neck_01 ? reg.neck_01.min.y : chest.max.y) + 0.01, nk.z); scarf.rotation.x = Math.PI / 2;
  boneByName('spine_03').attach(scarf);

  // öv a derék magasságában (a pelvis-régió felső széle)
  const pel = reg.pelvis, pc = pel.getCenter(new V3()), ps = pel.getSize(new V3());
  const beltY = pel.max.y - 0.04;
  const belt = mk(new THREE.TorusGeometry(1, 0.022, 6, 28), M.strap);
  belt.scale.set(ps.x * 0.5 + 0.02, ps.z * 0.5 + 0.02, 1); belt.rotation.x = Math.PI / 2;
  belt.position.set(pc.x, beltY, pc.z);
  boneByName('pelvis').attach(belt);
  const buckle = mk(new THREE.BoxGeometry(0.05, 0.045, 0.015), M.metal);
  buckle.position.set(pc.x, beltY, pc.z + (ps.z * 0.5 + 0.03) * fwdSign); boneByName('pelvis').attach(buckle);
  const sheath = mk(new THREE.BoxGeometry(0.045, 0.42, 0.06), M.strap);
  sheath.position.set(pc.x - (ps.x * 0.5 + 0.03), beltY - 0.2, pc.z); sheath.rotation.z = 0.1; boneByName('pelvis').attach(sheath);
  const grip = mk(new THREE.CylinderGeometry(0.018, 0.02, 0.12, 8), M.band);
  grip.position.set(pc.x - (ps.x * 0.5 + 0.035), beltY + 0.06, pc.z); boneByName('pelvis').attach(grip);
  const cant = mk(new THREE.CylinderGeometry(0.07, 0.07, 0.045, 14), M.canteen);
  cant.rotation.z = Math.PI / 2; cant.position.set(pc.x + (ps.x * 0.5 + 0.035), beltY - 0.1, pc.z); boneByName('pelvis').attach(cant);

  // --- Animációk: csak forgatás-sávok + medence-elmozdulás (a könyvtár más arányú figurán készült)
  const byName = {};
  for (const c of clips) {
    c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion') || t.name === 'pelvis.position');
    byName[c.name] = c;
  }
  const holder = new THREE.Group();
  if (fwdSign < 0) scene.rotation.y = Math.PI;
  holder.add(scene);
  const mixer = new THREE.AnimationMixer(scene);
  const act = {};
  const use = (key, name, once = false) => {
    const c = byName[name]; if (!c) return;
    const a = mixer.clipAction(c);
    if (once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
    a.enabled = true; a.setEffectiveWeight(0); a.play();
    act[key] = { a, w: 0, dur: c.duration };
  };
  use('idle', 'Idle_Loop');
  for (const k of Object.keys(LOCO)) use(k, LOCO[k].clip);
  use('swimF', 'Swim_Fwd_Loop'); use('swimI', 'Swim_Idle_Loop');
  use('jumpS', 'Jump_Start', true); use('jumpL', 'Jump_Loop'); use('land', 'Jump_Land', true);
  use('interact', 'Interact', true);
  use('crouchI', 'Crouch_Idle_Loop'); use('crouchF', 'Crouch_Fwd_Loop');
  use('sitI', 'Sitting_Idle_Loop');
  for (const k of ['walk', 'jog', 'sprint']) if (act[k]) act[k].a.timeScale = 0; // kézi fázis-vezérlés
  act.idle.w = 1;

  // Felsőtest-réteg (célzás, dobás): a klip spine_02 fölötti sávjait közvetlenül mintavételezzük és a fő keverés után
  // ráírjuk a csontokra; így a lábak közben tovább sétálnak
  const upNames = new Set();
  scene.getObjectByName('spine_02')?.traverse((o) => { if (o.isBone) upNames.add(o.name); });
  const uact = {};
  const useU = (key, name, once = false) => {
    const c0 = byName[name]; if (!c0) return;
    const ch = c0.tracks.filter((t) => t.name.endsWith('.quaternion') && upNames.has(t.name.split('.')[0]))
      .map((t) => ({ bone: scene.getObjectByName(t.name.split('.')[0]), it: t.createInterpolant() }));
    uact[key] = { ch, dur: c0.duration, once };
  };
  for (const [k, n, once] of [['aim', 'Pistol_Aim_Up'], ['throw', 'Sword_Attack', true], ['stab', 'Punch_Cross', true], ['torch', 'Idle_Torch_Loop']]) useU(k, n, once);

  // karok az IK-hoz (vállcsont, alkar, kéz)
  const arm = (k) => ['upperarm_', 'lowerarm_', 'hand_'].map((n) => scene.getObjectByName(n + k));
  const arms = { l: arm('l'), r: arm('r') };
  return new Rig(holder, mixer, act, { uact, make: useU }, arms.l.every(Boolean) && arms.r.every(Boolean) ? arms : null);
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _e = new THREE.Vector3(), _d = new THREE.Vector3(), _p = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
class Rig {
  constructor(object, mixer, act, up, arms) {
    this.arms = arms; this.ik = null; this.ikW = 0; this.ikS = { l: new THREE.Vector3(), r: new THREE.Vector3() }; this.ikFresh = true;
    this.object = object; this.mixer = mixer; this.act = act;
    this.phase = 0; this.lastHalf = 0; this.shot = null; this.shotT = 0; this.wasGround = true;
    this.up = up; this.upKey = null; this.upW = 0; this.upT = 0; this.upShotT = 0; this.upHold = null; this.upSpeed = 1;
    this._q = new THREE.Quaternion();
  }

  oneShot(key, dur) {
    const s = this.act[key]; if (!s) return;
    s.a.reset(); s.a.play();
    this.shot = key; this.shotT = dur ?? s.dur;
  }

  // felsőtest-póz: tartós (pl. 'aim') vagy egyszeri (pl. 'throw', dur másodpercig)
  upper(key, dur) {
    if (key && !this.up.uact[key]) return;
    if (dur) { this.upKey = key; this.upT = 0; this.upShotT = dur; this.upSpeed = this.up.uact[key].dur / dur; return; }
    this.upHold = key;
  }

  // p: { speed, swim, onGround, vy, dt } -> visszaadja, volt-e lépés (lépéshang)
  update(dt, p) {
    const A = this.act, T = {};
    for (const k in A) T[k] = 0;
    let step = false;
    if (p.sit) {
      T.sitI = 1;
    } else if (p.swim) {
      const m = Math.min(1, p.speed / 1.2);
      T.swimF = m; T.swimI = 1 - m;
      A.swimF.a.timeScale = Math.max(0.5, p.speed / 2.175);
    } else if (!p.onGround) {
      T.jumpL = 1;
    } else {
      const s = p.speed;
      // sebesség szerinti keverés: áll -> sétál -> kocog -> sprintel
      const wWalk = THREE.MathUtils.smoothstep(s, 0.1, 1.2) * (1 - THREE.MathUtils.smoothstep(s, 1.6, 3.2));
      const wJog = THREE.MathUtils.smoothstep(s, 1.6, 3.2) * (1 - THREE.MathUtils.smoothstep(s, 4.2, 6.4));
      const wSpr = THREE.MathUtils.smoothstep(s, 4.2, 6.4);
      T.idle = 1 - THREE.MathUtils.smoothstep(s, 0.1, 1.2);
      T.walk = wWalk; T.jog = wJog; T.sprint = wSpr;
      // közös lépésfázis: a ciklushossz a súlyozott átlag, így a lábak nem csúsznak és a keverés szinkronban marad
      const tw = wWalk + wJog + wSpr;
      if (tw > 0.001) {
        const dist = (wWalk * LOCO.walk.dist + wJog * LOCO.jog.dist + wSpr * LOCO.sprint.dist) / tw;
        this.phase = (this.phase + s * dt / dist) % 1;
      }
      for (const k of ['walk', 'jog', 'sprint']) if (A[k]) A[k].a.time = this.phase * A[k].dur;
      // lopakodás: guggoló séta (saját fázissal, a lábak itt nem kell, hogy szinkronban legyenek)
      if (p.crouch) {
        const m = THREE.MathUtils.smoothstep(s, 0.05, 0.6);
        T.crouchI = 1 - m; T.crouchF = m; T.idle = T.walk = T.jog = T.sprint = 0;
        if (A.crouchF) A.crouchF.a.timeScale = Math.max(0.4, s / 1.1);
      }
      const half = this.phase < 0.5 ? 0 : 1;
      if (half !== this.lastHalf && tw > 0.3) step = true;
      this.lastHalf = half;
    }
    // ugrás-átmenetek
    if (p.sit) this.wasGround = true;
    if (this.wasGround && !p.onGround && !p.swim && p.vy > 0) this.oneShot('jumpS', 0.35);
    if (!this.wasGround && p.onGround && !p.swim) this.oneShot('land', 0.3);
    this.wasGround = p.onGround;
    // egyszeri mozdulat ráteszi magát a többire
    let sw = 0;
    if (this.shot) {
      this.shotT -= dt;
      if (this.shotT <= 0) this.shot = null; else sw = 1;
    }
    for (const k in A) {
      const target = k === this.shot ? 1 : T[k] * (1 - sw);
      A[k].w = damp(A[k].w, target, k === this.shot ? 18 : 10, dt);
      A[k].a.setEffectiveWeight(A[k].w);
    }
    this.mixer.update(dt);
    // felsőtest-réteg
    if (this.upShotT > 0) { this.upShotT -= dt; if (this.upShotT <= 0) this.upKey = null; }
    if (this.upShotT <= 0 && this.upHold && this.upKey !== this.upHold) { this.upKey = this.upHold; this.upT = 0; this.upSpeed = 1; }
    const wantW = this.upShotT > 0 || this.upHold ? 1 : 0;
    this.upW = damp(this.upW, wantW, wantW ? 14 : 7, dt);
    if (this.upKey) this.upLast = this.upKey;
    else if (this.upW > 0.001) this.upSpeed = 0; // elengedés: az utolsó pózból halványul vissza
    const key = this.upKey || this.upLast;
    if (key && this.upW > 0.001) {
      const U = this.up.uact[key];
      this.upT += dt * this.upSpeed;
      const t = U.once ? Math.min(this.upT, U.dur) : this.upT % Math.max(U.dur, 1e-3);
      for (const c of U.ch) c.bone.quaternion.slerp(this._q.fromArray(c.it.evaluate(t)), this.upW);
    }
    // kéz-IK (pl. evező a kézben): a célpontok simítva követik a kért helyet, a súly be/ki úszik
    if (this.arms) {
      this.ikW = damp(this.ikW, this.ik ? 1 : 0, 8, dt);
      if (this.ik) {
        if (this.ikFresh) { this.ikS.l.copy(this.ik.l); this.ikS.r.copy(this.ik.r); this.ikFresh = false; }
        else { const k = 1 - Math.exp(-22 * dt); this.ikS.l.lerp(this.ik.l, k); this.ikS.r.lerp(this.ik.r, k); }
      } else this.ikFresh = true;
      if (this.ikW > 0.002 && (this.ik || this.ikLast)) {
        if (this.ik) this.ikLast = this.ik;
        let top = this.object; while (top.parent && !top.parent.isScene) top = top.parent;
        top.updateMatrixWorld(true);
        this.solveArm(this.arms.l, this.ikS.l, this.ikLast.pl, this.ikW);
        this.solveArm(this.arms.r, this.ikS.r, this.ikLast.pr, this.ikW);
      }
    }
    return step;
  }

  // kétcsontos IK: a könyök a pólus felé hajlik, a kéz a célpontba kerül (világkoordinátában)
  solveArm([A, B, C], T, pole, w) {
    A.getWorldPosition(_a); B.getWorldPosition(_b); C.getWorldPosition(_c);
    const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
    const d = Math.min(Math.max(_a.distanceTo(T), 0.02), (la + lb) * 0.999);
    _d.subVectors(T, _a).normalize();
    const ca = Math.min(1, Math.max(-1, (la * la + d * d - lb * lb) / (2 * la * d))), sa = Math.sqrt(1 - ca * ca);
    _p.subVectors(pole, _a); _p.addScaledVector(_d, -_p.dot(_d)).normalize();
    _e.copy(_a).addScaledVector(_d, ca * la).addScaledVector(_p, sa * la);
    this.turnBone(A, _b.sub(_a).normalize(), _c.copy(_e).sub(_a).normalize(), w);
    A.updateMatrixWorld(true);
    B.getWorldPosition(_b); C.getWorldPosition(_c);
    this.turnBone(B, _c.sub(_b).normalize(), _d.subVectors(T, _b).normalize(), w);
    B.updateMatrixWorld(true);
  }
  // a csontot világtérben elforgatja úgy, hogy a 'from' irány a 'to' irányba nézzen
  turnBone(bone, from, to, w) {
    _q1.setFromUnitVectors(from, to);
    bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
    _q2.premultiply(_q1).premultiply(_q3.invert());
    bone.quaternion.slerp(_q2, w);
  }
}
