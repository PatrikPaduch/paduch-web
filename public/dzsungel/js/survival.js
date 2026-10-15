// Gyűjtögetés és barkácsolás: tárgyak a világban, tárgylista, receptek, szerszámok kézben, fáklya, lerakható tűz, mentés
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch, ADD } from './shaders.js';
import { CAMP, POND, RIVER, TEMPLE, NAPKAPU, cliffZ, cliffW } from './terrain.js';
import { cellUV } from './textures.js';

const V3 = THREE.Vector3;
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
export const ITEMS = {
  stick: { name: 'Ág', icon: '🪵' }, stone: { name: 'Kő', icon: '🪨' }, vine: { name: 'Lián', icon: '🌿' },
  leaf: { name: 'Nagy levél', icon: '🍃' }, banana: { name: 'Banán', icon: '🍌' }, coconut: { name: 'Kókuszdió', icon: '🥥' },
  // vadászzsákmány: csak akkor látszik a tárgysávon, ha van belőle
  meat: { name: 'Nyers hús', icon: '🥩', opt: 1 }, fish: { name: 'Hal', icon: '🐟', opt: 1 },
  meatC: { name: 'Sült hús', icon: '🍖', opt: 1 }, fishC: { name: 'Sült hal', icon: '🍢', opt: 1 },
};
export const TOOLS = {
  axe: { name: 'Kőbalta', icon: '🪓', key: 1, need: { stick: 2, stone: 1, vine: 1 }, desc: 'Feltöri a kókuszdiót.' },
  spear: { name: 'Lándzsa', icon: '🔱', key: 2, need: { stick: 3, stone: 1, vine: 1 }, desc: 'Vadászat: kattintás döf, nyomva tartva célzol és dobsz. Elhárítja a jaguárt.' },
  torch: { name: 'Fáklya', icon: '🔥', key: 3, need: { stick: 1, leaf: 2, vine: 1 }, desc: 'Világít és távol tartja a jaguárt. 6 percig ég.' },
  fire: { name: 'Tábortűz', icon: '🏕️', need: { stick: 4, stone: 5, leaf: 1 }, desc: 'Leteszed magad elé. Melegít, véd. 8 percig ég.' },
};
const TORCH_LIFE = 360, FIRE_LIFE = 480;

function merged(parts) {
  const gs = parts.map(([g, c, m]) => {
    const x = g.index ? g.toNonIndexed() : g.clone();
    if (m) x.applyMatrix4(m);
    for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k);
    const cc = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace), col = new Float32Array(x.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) { col[i] = cc.r; col[i + 1] = cc.g; col[i + 2] = cc.b; }
    x.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return x;
  });
  return mergeGeometries(gs);
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(1, 1, 1));

function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, G),
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
#include <common>
varying vec2 vUv;
void main(){
  vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
  float n = jn2(vec2(p.x * 3.0, p.y * 4.0 - uTime * 3.8)) * 0.6 + jn2(vec2(p.x * 7.0 + 3.0, p.y * 8.0 - uTime * 6.2)) * 0.4;
  float h = 1.0 - p.y, w = (0.75 * h + 0.05) * (0.7 + 0.5 * n);
  float flame = smoothstep(0.0, 0.35, w - abs(p.x + (n - 0.5) * 0.3 * p.y)) * smoothstep(1.0, 0.55, p.y + (n - 0.5) * 0.35);
  vec3 col = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.8, 0.35), smoothstep(0.2, 0.9, flame * h));
  gl_FragColor = vec4(col * flame * 3.2, 1.0);
}`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ADD,
  });
}

export class Survival {
  constructor(scene, T, flora, player, rnd = Math.random) {
    this.scene = scene; this.T = T; this.flora = flora; this.player = player;
    this.inv = Object.fromEntries(Object.keys(ITEMS).map((k) => [k, 0]));
    this.spearOut = false; // a lándzsa el van dobva, ott fekszik valahol
    this.tools = { axe: false, spear: false, torch: false };
    this.equipped = null; this.torchT = 0;
    this.fire = null; // lerakott tűz: {x, z, t}
    this.flame = flameMaterial();
    this.buildWorldItems(rnd);
    this.buildHandTools();
    this.buildPlacedFire();
    // egyetlen hordozható fény: a fáklyáé, vagy ha az nincs a kézben, a lerakott tűzé
    this.light = new THREE.PointLight(0xff9a48, 0, 13, 2);
    scene.add(this.light);
  }

  // ---------------------------------------------------------------- tárgyak a világban
  buildWorldItems(rnd) {
    const T = this.T, F = this.flora;
    const okGround = (x, z) => {
      const h = T.heightAt(x, z);
      if (h < T.waterLevelAt(x, z) + 0.3 || T.slopeAt(x, z) > 0.55 || Math.hypot(x, z) > 175) return null;
      if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 20) return null;
      if (Math.hypot(x - NAPKAPU.x, z - NAPKAPU.z) < 11) return null;
      return h;
    };
    const spots = { stick: [], stone: [], vine: [], leaf: [], coconut: [] };
    const add = (type, x, z, tries = 1) => {
      for (let k = 0; k < tries; k++) {
        const xx = x + (k ? (rnd() - 0.5) * 3 : 0), zz = z + (k ? (rnd() - 0.5) * 3 : 0), h = okGround(xx, zz);
        if (h !== null) { spots[type].push({ type, x: xx, z: zz, y: h, ry: rnd() * 6.28, taken: false, back: 0 }); return; }
      }
    };
    // kezdőkészlet a tábor körül, hogy rögtön lehessen barkácsolni
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, d = 5 + rnd() * 10; add('stick', CAMP.x + Math.cos(a) * d, CAMP.z + Math.sin(a) * d, 6); }
    for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, d = 6 + rnd() * 10; add('stone', CAMP.x + Math.cos(a) * d, CAMP.z + Math.sin(a) * d, 6); }
    for (let i = 0; i < 140; i++) { const x = -170 + rnd() * 340, z = -170 + rnd() * 340; if (T.forestAt(x, z) > 0.3) add('stick', x, z); }
    for (let i = 0; i < 45; i++) { const x = -70 + rnd() * 160; add('stone', x, cliffZ(x) + cliffW(x) + 1 + rnd() * 4, 4); }
    for (let i = 0; i < 40; i++) { const p = RIVER[Math.floor(rnd() * (RIVER.length - 20))]; add('stone', p[0] + (rnd() - 0.5) * 14, p[1] + (rnd() - 0.5) * 14, 4); }
    for (let i = 0; i < 20; i++) { const a = rnd() * 6.28, d = POND.r + 1 + rnd() * 4; add('stone', POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d, 4); }
    for (const g of F.logs) if (rnd() < 0.55) { const a = rnd() * 6.28, d = g.r * 2 + 1.5 + rnd() * 3; add('vine', g.x + Math.cos(a) * d, g.z + Math.sin(a) * d, 4); }
    for (const b of F.bananas) for (let k = 0; k < 2; k++) { const a = rnd() * 6.28, d = 1.2 + rnd() * 1.5; add('leaf', b.x + Math.cos(a) * d, b.z + Math.sin(a) * d, 3); }
    for (const p of (F.palms || [])) if (rnd() < 0.5) { const a = rnd() * 6.28, d = 0.8 + rnd() * 1.8; add('coconut', p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, 3); }

    const brown = [0.36, 0.26, 0.16];
    const stickGeo = merged([
      [new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(-0.45, 0.03, 0), new V3(0, 0.05, 0.04), new V3(0.45, 0.03, -0.02)]), 8, 0.025, 6), brown],
      [new THREE.CylinderGeometry(0.008, 0.012, 0.22, 5), brown, M4(0.1, 0.06, 0.08, 0, 0, 1.0)],
    ]);
    const vineGeo = merged([[new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 22 }, (_, i) => { const a = i / 21 * Math.PI * 6; return new V3(Math.cos(a) * 0.16, 0.025 + i * 0.004, Math.sin(a) * 0.16); })), 60, 0.018, 5), [0.3, 0.32, 0.12]]]);
    const cocoGeo = merged([[new THREE.SphereGeometry(0.12, 12, 9), [0.42, 0.3, 0.16], M4(0, 0.1, 0)], [new THREE.SphereGeometry(0.03, 6, 4), [0.2, 0.14, 0.08], M4(0, 0.2, 0.06)]]);
    const leafGeo = (() => {
      const p = [], n = [], u = [], c = [];
      for (const [sx, sz] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) { p.push(sx * 0.55, 0.02, sz * 1.2 - 0.6); n.push(0, 1, 0); const [a, b] = cellUV(5, sx + 0.5, sz); u.push(a, b); c.push(0.9, 0.95, 0.75); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      g.setIndex([0, 2, 1, 0, 3, 2]);
      return g;
    })();
    const plain = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 'basic');
    const defs = {
      stick: [stickGeo, plain], stone: [new THREE.DodecahedronGeometry(0.13, 1).scale(1, 0.7, 1.1).translate(0, 0.07, 0), F.rockMat],
      vine: [vineGeo, plain], leaf: [leafGeo, F.fol.still.mat], coconut: [cocoGeo, plain],
    };
    this.meshes = {}; this.items = [];
    for (const type of Object.keys(spots)) {
      const [geo, mat] = defs[type], list = spots[type];
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      m.castShadow = type !== 'leaf'; m.receiveShadow = true;
      list.forEach((it, i) => { it.i = i; it.mesh = m; this.items.push(it); this.place(it); });
      m.count = list.length; m.computeBoundingSphere();
      this.meshes[type] = m;
      this.scene.add(m);
    }
    // halvány, lüktető csillanás minden gyűjthető tárgy fölött, hogy a fűben is észrevehető legyen
    const sp = new Float32Array(this.items.length * 4);
    this.items.forEach((it, k) => { it.k = k; sp.set([it.x, it.y + 0.32, it.z, it.taken ? 0 : 1], k * 4); });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.InterleavedBufferAttribute(this.spark = new THREE.InterleavedBuffer(sp, 4), 3, 0));
    sg.setAttribute('aOn', new THREE.InterleavedBufferAttribute(this.spark, 1, 3));
    const sm = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime },
      vertexShader: `attribute float aOn; uniform float uTime; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = -mv.z, ph = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.28;
  float pulse = pow(0.5 + 0.5 * sin(uTime * 2.2 + ph), 3.0);
  vA = aOn * smoothstep(16.0, 6.0, d) * smoothstep(0.6, 1.4, d) * (0.25 + 0.75 * pulse);
  gl_PointSize = aOn * (80.0 + 50.0 * pulse) / max(d, 0.5);
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: `varying float vA;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r = length(q), star = max(0.0, 1.0 - abs(q.x) * 6.0) * max(0.0, 1.0 - abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 6.0) * max(0.0, 1.0 - abs(q.x));
  float a = (exp(-r * r * 9.0) * 0.8 + star * 0.6) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.93, 0.7) * a * 1.4, 0.0);
}`,
      transparent: true, depthWrite: false, ...ADD,
    });
    const pts = new THREE.Points(sg, sm);
    pts.frustumCulled = false; pts.renderOrder = 5;
    this.scene.add(pts);
  }
  place(it) {
    if (this.spark && it.k !== undefined) { this.spark.array[it.k * 4 + 3] = it.taken ? 0 : 1; this.spark.needsUpdate = true; }
    const M = new THREE.Matrix4();
    if (it.taken) M.makeScale(0, 0, 0);
    else M.compose(new V3(it.x, it.y, it.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.ry, 0)), new V3(1, 1, 1));
    it.mesh.setMatrixAt(it.i, M); it.mesh.instanceMatrix.needsUpdate = true;
  }

  nearestItem(p) {
    let best = null, bd = 2.2;
    for (const it of this.items) {
      if (it.taken) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < bd && Math.abs(it.y - p.y) < 1.8) { bd = d; best = it; }
    }
    return best;
  }
  pickup(it) {
    it.taken = true; it.back = 220 + Math.random() * 200; this.place(it);
    this.inv[it.type]++;
    return `+1 ${ITEMS[it.type].name}`;
  }

  // ---------------------------------------------------------------- barkácsolás, evés
  canCraft(id) { return Object.entries(TOOLS[id].need).every(([k, n]) => this.inv[k] >= n); }
  craft(id) {
    if (!this.canCraft(id)) return null;
    if (id !== 'fire' && this.tools[id]) return `Már van ${TOOLS[id].name.toLowerCase()}d`;
    for (const [k, n] of Object.entries(TOOLS[id].need)) this.inv[k] -= n;
    if (id === 'fire') { this.placeFire(); return 'Tüzet raktál'; }
    this.tools[id] = true;
    if (id === 'torch') this.torchT = TORCH_LIFE;
    this.equip(id);
    return `Elkészült: ${TOOLS[id].name}`;
  }
  eat(stats) {
    const I = this.inv, add = (f, w = 0, hp = 0) => { stats.food = Math.min(1, stats.food + f); stats.water = Math.min(1, stats.water + w); stats.hp = Math.max(0.05, Math.min(1, stats.hp + hp)); };
    if (I.meatC > 0) { I.meatC--; add(0.42, 0, 0.06); return 'Megettél egy szelet sült húst'; }
    if (I.fishC > 0) { I.fishC--; add(0.3, 0.05, 0.04); return 'Megettél egy sült halat'; }
    if (I.banana <= 0 && I.coconut <= 0 && (I.meat > 0 || I.fish > 0)) {
      if (I.meat > 0) { I.meat--; add(0.12, 0, -0.06); } else { I.fish--; add(0.08, 0, -0.04); }
      return 'Nyersen ettél, nem esett jól. Süsd meg a tűznél!';
    }
    if (this.inv.banana > 0) { this.inv.banana--; stats.food = Math.min(1, stats.food + 0.3); return 'Megettél egy banánt'; }
    if (this.inv.coconut > 0) {
      if (!this.tools.axe) return 'A kókuszdió feltöréséhez kőbalta kell';
      this.inv.coconut--; stats.food = Math.min(1, stats.food + 0.18); stats.water = Math.min(1, stats.water + 0.4);
      return 'Feltörtél egy kókuszdiót';
    }
    return 'Nincs nálad ennivaló';
  }

  // ---------------------------------------------------------------- szerszámok kézben
  buildHandTools() {
    const wood = [0.22, 0.13, 0.06], stone = [0.17, 0.165, 0.15], bind = [0.12, 0.14, 0.05];
    const mat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 'basic');
    const mk = (geo) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };
    this.hand = {
      axe: mk(merged([
        [new THREE.CylinderGeometry(0.02, 0.025, 0.55, 6), wood, M4(0, 0.15, 0)],
        [new THREE.BoxGeometry(0.05, 0.11, 0.17), stone, M4(0, 0.39, 0.07)],
        [new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6), bind, M4(0, 0.38, 0)],
      ])),
      spear: mk(merged([
        [new THREE.CylinderGeometry(0.018, 0.022, 1.7, 6), wood, M4(0, 0.45, 0)],
        [new THREE.ConeGeometry(0.04, 0.2, 5), stone, M4(0, 1.4, 0)],
        [new THREE.CylinderGeometry(0.026, 0.026, 0.06, 6), bind, M4(0, 1.28, 0)],
      ])),
      torch: new THREE.Group(),
    };
    this.hand.torch.add(mk(merged([
      [new THREE.CylinderGeometry(0.022, 0.026, 0.6, 6), wood, M4(0, 0.15, 0)],
      [new THREE.ConeGeometry(0.06, 0.16, 7), [0.35, 0.33, 0.12], M4(0, 0.5, 0, Math.PI)],
    ])));
    for (let i = 0; i < 2; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.38), this.flame); f.position.y = 0.66; f.rotation.y = i * Math.PI / 2; this.hand.torch.add(f); }
    this.torchTip = new THREE.Object3D(); this.torchTip.position.y = 0.7; this.hand.torch.add(this.torchTip);
    // a jobb kéz csontjára kerül; ha nincs csontváz, a procedurális alkarra
    const P = this.player;
    const bone = P.rig ? P.rig.object.getObjectByName('hand_r') : null;
    this.handParent = bone || (P.arms && P.arms[1] ? P.arms[1].el : P.root);
    for (const [k, o] of Object.entries(this.hand)) {
      o.visible = false;
      if (bone) { o.rotation.set(Math.PI / 2, 0, 0); o.position.set(0.08, 0.03, 0); o.scale.setScalar(1 / bone.getWorldScale(new V3()).x); }
      else { o.position.set(0, -0.26, 0.04); o.rotation.set(Math.PI / 2, 0, 0); }
      this.handParent.add(o);
      void k;
    }
    this.handRest = this.hand.spear.quaternion.clone();
  }
  equip(id) {
    if (id && !this.tools[id]) return `Nincs ${TOOLS[id].name.toLowerCase()}d. Tabbal barkácsolhatsz.`;
    if (id === 'spear' && this.spearOut && this.equipped !== 'spear') return 'A lándzsád ott maradt, ahová dobtad (iránytű: ↑)';
    this.equipped = this.equipped === id ? null : id;
    for (const [k, o] of Object.entries(this.hand)) o.visible = k === this.equipped && !(k === 'spear' && this.spearOut);
    return this.equipped ? `Kézben: ${TOOLS[this.equipped].name}` : 'Üres kéz';
  }

  // ---------------------------------------------------------------- lerakható tűz
  buildPlacedFire() {
    const g = new THREE.Group(); g.visible = false;
    const stone = new THREE.DodecahedronGeometry(0.15, 1);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.28, s = new THREE.Mesh(stone, this.flora.rockMat);
      s.position.set(Math.cos(a) * 0.55, 0.04, Math.sin(a) * 0.55); s.scale.set(1.1, 0.7, 1); s.castShadow = true; g.add(s);
    }
    const logGeo = merged([[new THREE.CylinderGeometry(0.05, 0.06, 0.8, 7), [0.35, 0.24, 0.14]]]);
    const lm = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 'basic');
    for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(logGeo, lm); const a = i / 4 * 6.28; l.position.set(Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15); l.rotation.set(0, -a, 0); l.rotateZ(0.5); g.add(l); }
    for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 1.0), this.flame); f.position.y = 0.52; f.rotation.y = i / 3 * Math.PI; g.add(f); }
    this.fireGroup = g;
    this.scene.add(g);
  }
  placeFire() {
    const P = this.player, f = new V3(Math.sin(P.facing), 0, Math.cos(P.facing));
    const x = P.pos.x + f.x * 1.6, z = P.pos.z + f.z * 1.6;
    this.fire = { x, z, t: FIRE_LIFE };
    this.fireGroup.position.set(x, this.T.heightAt(x, z), z);
    this.fireGroup.visible = true;
  }

  // biztonságos-e a hely a jaguár elől (tábortűz, lerakott tűz, fáklya a kézben)
  isSafe(p) {
    if (Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < 9) return true;
    if (this.fire && Math.hypot(p.x - this.fire.x, p.z - this.fire.z) < 9) return true;
    return this.equipped === 'torch' && Math.hypot(p.x - this.player.pos.x, p.z - this.player.pos.z) < 9;
  }
  hasSpear() { return this.equipped === 'spear' && !this.spearOut; }
  canCook(p) { return this.warmth(p) && (this.inv.meat > 0 || this.inv.fish > 0); }
  cook() {
    const m = this.inv.meat, f = this.inv.fish;
    this.inv.meatC += m; this.inv.fishC += f; this.inv.meat = 0; this.inv.fish = 0;
    return `Megsütöttél ${[m && `${m} húst`, f && `${f} halat`].filter(Boolean).join(' és ')}`;
  }
  warmth(p) { return Math.hypot(p.x - CAMP.x, p.z - CAMP.z) < 4 || (this.fire && Math.hypot(p.x - this.fire.x, p.z - this.fire.z) < 3.5); }

  update(dt, night, toast) {
    for (const it of this.items) if (it.taken) { it.back -= dt; if (it.back <= 0) { it.taken = false; this.place(it); } }
    // fáklya égése
    if (this.equipped === 'torch') {
      this.torchT -= dt;
      if (this.torchT <= 0) { this.tools.torch = false; this.equip(null); toast?.('A fáklya leégett'); }
    }
    if (this.fire) { this.fire.t -= dt * (1 + G.uRain.value * 1.5); if (this.fire.t <= 0) { this.fire = null; this.fireGroup.visible = false; toast?.('Kialudt a tüzed'); } }
    const fl = 0.8 + 0.2 * Math.sin(G.uTime.value * 14) * Math.sin(G.uTime.value * 7.7 + 1);
    if (this.equipped === 'torch') {
      // a fáklya mindig felfelé álljon (kicsit előre döntve), bárhogy is mozog a kézcsont
      const tq = this.hand.torch, pq = tq.parent.getWorldQuaternion(_q1).invert();
      tq.quaternion.copy(pq.multiply(_q2.setFromEuler(_e.set(0.28, this.player.facing, 0, 'YXZ'))));
      // a fényforrást kicsit kijjebb és feljebb toljuk a testtől, különben kiégeti a karaktert
      const L = this.torchTip.getWorldPosition(this.light.position), P = this.player.pos;
      const ox = L.x - P.x, oz = L.z - P.z, ol = Math.hypot(ox, oz) || 1;
      L.x += ox / ol * 0.6; L.z += oz / ol * 0.6; L.y += 0.25;
      this.light.intensity = (2.4 + 6.5 * night) * fl;
    } else if (this.fire) {
      this.light.position.copy(this.fireGroup.position).add(new V3(0, 0.8, 0));
      this.light.intensity = (7 + 18 * night) * fl;
    } else this.light.intensity = 0;
  }

  // ---------------------------------------------------------------- mentés
  serialize() { return { inv: this.inv, tools: this.tools, equipped: this.equipped, torchT: this.torchT, fire: this.fire }; }
  restore(s) {
    if (!s) return;
    Object.assign(this.inv, s.inv || {}); Object.assign(this.tools, s.tools || {});
    this.torchT = s.torchT || TORCH_LIFE;
    if (s.fire) { this.fire = s.fire; this.fireGroup.position.set(s.fire.x, this.T.heightAt(s.fire.x, s.fire.z), s.fire.z); this.fireGroup.visible = true; }
    if (s.equipped && this.tools[s.equipped]) this.equip(s.equipped);
  }
}
