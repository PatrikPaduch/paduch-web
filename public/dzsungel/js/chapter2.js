// 2. fejezet: Vera elhagyott tábora a folyó partján, a fatörzs-kenu (javítás, evezés, sodrás), a mocsár a cölöpfaluval,
// mangrovék és kajmánok. A falu pallóin és létráján járni lehet (heightAt), a kajmánok a vízben lévő játékost támadják.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch, ADD } from './shaders.js';
import { VERA_CAMP, CANOE_SPOT, MARSH, VILLAGE, RIVER, polyInfo } from './terrain.js';
import { GB, tube, leafCluster, hangVine, LEAF_TINTS } from './flora.js';
import { mulberry32, smoothstep } from './noise.js';

const V3 = THREE.Vector3;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDamp = (a, b, k, dt) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-k * dt)); };
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));
const vcol = (geo, c) => {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const cc = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace), a = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = cc.r; a[i + 1] = cc.g; a[i + 2] = cc.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};
const part = (geo, c, m) => { const g = vcol(geo, c); if (m) g.applyMatrix4(m); return g; };

const PLAT_Y = 1.9; // a cölöpházak padlószintje (a víz fölött)
const HUTS = [
  { x: 101.6, z: 118.2, s: 3.6, roof: 1 },          // bejárat (a csatorna végén, létrával)
  { x: 106.2, z: 114.6, s: 3.6, roof: 1 },
  { x: 110.8, z: 120.2, s: 5.0, roof: 1, chief: 1 }, // a főnök háza
  { x: 105.6, z: 123.8, s: 3.4, roof: 0 },          // tető nélküli rom
  { x: 111.6, z: 113.4, s: 3.2, broken: 1 },        // összeomlott
];
const WALKS = [[0, 1], [1, 2], [0, 3], [3, 2]];

export class Chapter2 {
  constructor(scene, T, terrainH, flora, audio, fx, player) {
    Object.assign(this, { scene, T, terrainH, flora, audio, fx, player });
    this.rnd = mulberry32(31);
    this.has = { knife: false, rope: false, compass: false, talisman: false };
    this.campSeen = false; this.villageSeen = false;
    this.inCanoe = false;
    this.wood = flora.bark.still;
    this.buildCamp();
    this.buildCanoe();
    this.buildVillage();
    this.buildMangroves();
    this.buildCaimans();
    this.buildSparkles();
  }

  // ---------------------------------------------------------------- Vera tábora
  buildCamp() {
    const C = VERA_CAMP, h = (x, z) => this.terrainH(x, z), rnd = this.rnd;
    const canvas = [0.62, 0.56, 0.42], dark = [0.24, 0.18, 0.12], tin = [0.5, 0.5, 0.48], crate = [0.42, 0.3, 0.18];
    const gs = [];
    const at = (dx, dz) => new V3(C.x + dx, h(C.x + dx, C.z + dz), C.z + dz);
    // összeomlott sátor: két ferde vászonlap, egyik rúd eldőlve
    const t0 = at(-2.5, -1.5);
    // vászonlap: vízszintes lapból döntve, középen belógva (a hátsó rúd áll, az első eldőlt, így a gerinc lejt)
    // a gerinc a hátsó végén a rúdon 1.15 m, elöl (eldőlt rúd) a földre ért; a két lap belóg, a széle a földön
    const ry = 0.5, ax = Math.sin(ry), az = Math.cos(ry), sx = az, sz = -ax, NU = 10, NV = 6;
    const tp = [], ti = [];
    for (const side of [1, -1]) {
      const base = tp.length / 3;
      for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
        const u = i / NU, v = j / NV, along = -1.3 + 2.7 * u;
        const ridge = 1.15 * (1 - u) * (1 - 0.25 * u) + 0.06, half = side > 0 ? 1.05 : 0.9;
        const x = t0.x + ax * along + sx * side * half * v, z = t0.z + az * along + sz * side * half * v;
        const gy = h(x, z) + 0.03, y0 = t0.y + ridge;
        const y = gy + (y0 - gy) * (1 - v) * (1 - 0.35 * v) - 0.22 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI) * (1 - u * 0.5);
        tp.push(x, Math.max(y, gy), z);
      }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a0 = base + i * (NV + 1) + j, b0 = a0 + NV + 1; ti.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
    }
    const tent = new THREE.BufferGeometry();
    tent.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3)); tent.setIndex(ti); tent.computeVertexNormals();
    const tv = vcol(tent, canvas), tc = tv.attributes.color, tpp = tv.attributes.position;
    // sárfoltok és penész a vásznon (lent sötétebb)
    for (let i = 0; i < tc.count; i++) {
      const x = tpp.getX(i), y = tpp.getY(i), z = tpp.getZ(i);
      const k = (0.62 + 0.25 * Math.sin(x * 4.1 + z * 2.3) * Math.sin(z * 3.7 - x * 1.9) + 0.25 * Math.min(1, (y - t0.y) * 1.2)) * 0.8;
      tc.setXYZ(i, tc.getX(i) * k, tc.getY(i) * k * 1.02, tc.getZ(i) * k * 0.95);
    }
    gs.push(tv);
    gs.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.25, 5), dark, M4(t0.x - ax * 1.3, t0.y + 0.6, t0.z - az * 1.3)));
    gs.push(part(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), dark, M4(t0.x + ax * 1.9, t0.y + 0.08, t0.z + az * 1.9, 0, ry, 1.45)));
    for (const [dx, dz] of [[-1.3, -1.4], [1.3, -0.8], [-1.0, 1.2], [1.1, 1.6]]) gs.push(part(new THREE.ConeGeometry(0.025, 0.25, 4), dark, M4(t0.x + dx, t0.y + 0.08, t0.z + dz, Math.PI, 0, 0)));
    // láda (a tárgyak rajta), tűzrakóhely kövekkel és hamuval, bögre, hátizsák
    const c0 = at(1.6, 0.4);
    gs.push(part(new THREE.BoxGeometry(0.9, 0.55, 0.6), crate, M4(c0.x, c0.y + 0.27, c0.z, 0, 0.3, 0)));
    gs.push(part(new THREE.BoxGeometry(0.95, 0.06, 0.65), dark, M4(c0.x - 0.05, c0.y + 0.58, c0.z + 0.05, 0.08, 0.32, 0.04)));
    const f0 = at(0, 2.2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; gs.push(part(new THREE.DodecahedronGeometry(0.13, 0), [0.58, 0.55, 0.5], M4(f0.x + Math.cos(a) * 0.45, f0.y + 0.05, f0.z + Math.sin(a) * 0.45))); }
    gs.push(part(new THREE.CylinderGeometry(0.35, 0.38, 0.03, 12), [0.12, 0.11, 0.1], M4(f0.x, f0.y + 0.015, f0.z)));
    gs.push(part(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 6), [0.1, 0.08, 0.06], M4(f0.x + 0.1, f0.y + 0.06, f0.z, 0, 0.4, Math.PI / 2)));
    gs.push(part(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 10, 1, true), tin, M4(f0.x + 0.7, f0.y + 0.05, f0.z - 0.3, 0.4, 0, 1.1)));
    const b0 = at(-0.8, -3.4);
    gs.push(part(new THREE.BoxGeometry(0.42, 0.55, 0.28), [0.32, 0.36, 0.22], M4(b0.x, b0.y + 0.22, b0.z, 0.25, 0.8, 0.3)));
    const mesh = new THREE.Mesh(mergeGeometries(gs), patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), 'basic'));
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    // tárgyak a ládán
    const top = c0.y + 0.62;
    this.items = [
      { id: 'knife', name: 'Vera kése', icon: '🔪', p: new V3(c0.x - 0.2, top, c0.z), mesh: this.knifeMesh() },
      { id: 'rope', name: 'Vera kötele', icon: '🪢', p: new V3(c0.x + 0.22, top, c0.z + 0.08), mesh: this.ropeMesh() },
      { id: 'compass', name: 'Vera iránytűje', icon: '🧭', p: new V3(c0.x + 0.05, top, c0.z - 0.2), mesh: this.compassMesh() },
    ];
    for (const it of this.items) { it.mesh.position.copy(it.p); it.mesh.rotation.y = rnd() * 6.28; this.scene.add(it.mesh); }
    this.crate = c0;
    this.notePos = [
      { id: 'vtabor1', x: t0.x + 0.2, z: t0.z + 0.9, y: h(t0.x + 0.2, t0.z + 0.9) },
    ];
  }
  knifeMesh() {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.9, roughness: 0.35 }), w = new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.8 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.006, 0.2), m); b.position.z = 0.1; g.add(b);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.11, 8).rotateX(Math.PI / 2), w); hd.position.z = -0.05; g.add(hd);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  ropeMesh() {
    const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.95 });
    for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.005, 0.012, 6, 24), m); t.rotation.x = Math.PI / 2; t.position.y = 0.012 + i * 0.022; g.add(t); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  compassMesh() {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 20), new THREE.MeshStandardMaterial({ color: 0xb8902e, metalness: 1, roughness: 0.3 }));
    c.position.y = 0.009; g.add(c);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.042, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: 0.6 }));
    f.position.y = 0.0185; g.add(f);
    const n = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.07, 4).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb02020 }));
    n.position.y = 0.021; g.add(n);
    return g;
  }

  // ---------------------------------------------------------------- a kenu
  buildCanoe() {
    const g = new THREE.Group();
    const woodC = [0.36, 0.24, 0.14], inner = [0.24, 0.16, 0.09];
    // fatörzsből vájt teknő: csúcsos, kissé felhajló végek; külső és belső héj, közöttük a perem
    const W = 0.36, D = 0.36, L = 4.3, TH = 0.05, NU = 28, NV = 10;
    const shell = (inset) => {
      const pos = [], idx = [];
      for (let i = 0; i <= NU; i++) {
        const u = -1 + 2 * i / NU, au = Math.abs(u);
        const wu = Math.max(0, W * Math.pow(Math.max(0, 1 - Math.pow(au, 2.4)), 0.55) - inset), du = Math.max(0, D * Math.pow(Math.max(0, 1 - Math.pow(au, 4)), 0.5) - inset);
        for (let j = 0; j <= NV; j++) { const a = Math.PI * j / NV; pos.push(Math.cos(a) * wu, -Math.sin(a) * du + 0.1 * Math.pow(au, 3), u * L / 2 * (1 - inset)); }
      }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const outer = shell(0), innerG = shell(TH);
    // perem: a két héj felső élét összekötő sáv (mindkét oldalon)
    const op = outer.attributes.position, ip = innerG.attributes.position, rr = [];
    const P3 = (A, k) => [A.getX(k), A.getY(k) + 0.012, A.getZ(k)];
    for (const j of [0, NV]) for (let i = 0; i < NU; i++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      rr.push(...P3(op, a), ...P3(op, b), ...P3(ip, a), ...P3(op, b), ...P3(ip, b), ...P3(ip, a));
    }
    const rim = new THREE.BufferGeometry();
    rim.setAttribute('position', new THREE.Float32BufferAttribute(rr, 3)); rim.computeVertexNormals();
    const grain = (g, c, k0) => {
      const v = vcol(g, c), cc = v.attributes.color, pp = v.attributes.position;
      for (let i = 0; i < cc.count; i++) { const k = k0 * (0.85 + 0.15 * Math.sin(pp.getZ(i) * 9 + Math.sin(pp.getX(i) * 20) * 2) + 0.06 * Math.sin(pp.getZ(i) * 41)); cc.setXYZ(i, cc.getX(i) * k, cc.getY(i) * k, cc.getZ(i) * k); }
      return v;
    };
    const hull = grain(outer, woodC, 1), inn = grain(innerG, inner, 1), rimG = grain(rim, woodC, 1.15);
    const seat = part(new THREE.BoxGeometry(0.56, 0.05, 0.3), woodC, M4(0, -0.16, -0.75));
    const mat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }), 'basic');
    const body = new THREE.Mesh(mergeGeometries([hull, inn, rimG, seat]), mat);
    body.castShadow = true; body.receiveShadow = true; g.add(body);
    // repedés (javítás előtt) és a kötés (javítás után)
    this.crack = new THREE.Mesh(part(new THREE.BoxGeometry(0.03, 0.2, 1.1), [0.05, 0.03, 0.02], M4(0.34, -0.12, 0.3, 0, 0, -0.35)), mat);
    g.add(this.crack);
    const binds = [];
    for (let k = 0; k < 4; k++) binds.push(part(new THREE.TorusGeometry(1, 0.016, 4, 24), [0.55, 0.45, 0.28], M4(0, -0.04, -0.1 + k * 0.28, 0, 0, 0, 0.38, 0.4, 0.05)));
    this.bind = new THREE.Mesh(mergeGeometries(binds), mat); this.bind.visible = false; g.add(this.bind);
    // evező
    const paddle = new THREE.Group();
    const pm = new THREE.Mesh(mergeGeometries([part(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 6), woodC, M4(0, 0.15, 0)), part(new THREE.BoxGeometry(0.16, 0.42, 0.025), woodC, M4(0, -0.75, 0)), part(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 6), woodC, M4(0, 0.9, 0, 0, 0, Math.PI / 2))]), mat);
    pm.castShadow = true; paddle.add(pm);
    paddle.position.set(0.08, -0.02, 0.35); paddle.rotation.set(Math.PI / 2, 0, 0.1); // a kenu aljában fekszik
    g.add(paddle);
    this.paddle = paddle;
    this.scene.add(g);
    const c = CANOE_SPOT;
    this.canoe = { g, pos: new V3(c.x, 0, c.z), yaw: Math.PI / 2 + 0.15, v: 0, w: 0, fixed: false, beached: true, pt: 0, wakeT: 0 };
    this.placeCanoe();
    this.notePos.push({ id: 'vtabor2', x: c.x - 1.6, z: c.z - 0.6, y: this.terrainH(c.x - 1.6, c.z - 0.6) });
  }
  placeCanoe() {
    const C = this.canoe, g = C.g;
    if (C.beached) {
      // a parton fekszik, az orra a víz felé lejt
      const fx = Math.sin(C.yaw) * 1.5, fz = Math.cos(C.yaw) * 1.5;
      const h1 = Math.max(this.terrainH(C.pos.x + fx, C.pos.z + fz), -0.12), h0 = Math.max(this.terrainH(C.pos.x - fx, C.pos.z - fz), -0.12);
      g.position.set(C.pos.x, (h0 + h1) / 2 + 0.3, C.pos.z);
      g.rotation.set(Math.atan2(h0 - h1, 3), C.yaw, 0.12, 'YXZ');
    } else {
      g.position.set(C.pos.x, 0.2 + Math.sin(G.uTime.value * 1.6) * 0.02, C.pos.z);
      g.rotation.set(Math.sin(G.uTime.value * 1.1) * 0.015, C.yaw, -C.w * 0.08 + Math.sin(G.uTime.value * 1.4) * 0.02, 'YXZ');
    }
  }
  depthAt(x, z) { return -this.terrainH(x, z); } // a víz szintje 0
  canoeNear(p) { return Math.hypot(p.x - this.canoe.pos.x, p.z - this.canoe.pos.z) < 2.6 && !this.inCanoe; }
  repair() { this.canoe.fixed = true; this.crack.visible = false; this.bind.visible = true; }
  board() {
    const C = this.canoe;
    if (C.beached) {
      // vízre toljuk: a legközelebbi elég mély pont
      let best = null, bd = 1e9;
      for (let r = 1; r < 9; r += 0.5) for (let a = 0; a < 6.28; a += 0.3) {
        const x = C.pos.x + Math.cos(a) * r, z = C.pos.z + Math.sin(a) * r;
        const ri = polyInfo(x, z, RIVER);
        if (this.depthAt(x, z) > 0.7 && this.depthAt(x + ri.tx * 2, z + ri.tz * 2) > 0.5 && this.depthAt(x - ri.tx * 2, z - ri.tz * 2) > 0.5 && r < bd) { bd = r; best = new V3(x, 0, z); }
        if (best) break;
      }
      if (!best) return false;
      C.pos.copy(best); C.beached = false;
      const ri = polyInfo(C.pos.x, C.pos.z, RIVER); C.yaw = Math.atan2(ri.tx, ri.tz);
    }
    this.inCanoe = true; this.player.seated = true; C.v = 0;
    return true;
  }
  // kiszállás: a legközelebbi száraz pont (part, létra, palló)
  exit() {
    const C = this.canoe;
    let best = null, bd = 1e9;
    for (let r = 0.8; r < 4.6; r += 0.3) for (let a = 0; a < 6.28; a += 0.25) {
      const x = C.pos.x + Math.cos(a) * r, z = C.pos.z + Math.sin(a) * r, h = this.T.heightAt(x, z);
      if (h > 0.15 && h < 2.4 && r < bd) { bd = r; best = new V3(x, h, z); }
    }
    if (!best) return false;
    this.inCanoe = false; this.player.seated = false;
    this.player.pos.copy(best); this.player.vy = 0;
    return true;
  }

  updateCanoe(dt, input) {
    const C = this.canoe;
    C.pt += dt;
    if (!this.inCanoe) {
      this.placeCanoe();
      if (this.paddleHeld) { this.paddleHeld = false; this.paddle.position.set(0.08, -0.02, 0.35); this.paddle.rotation.set(Math.PI / 2, 0, 0.1); if (this.player.rig) this.player.rig.ik = null; }
      return;
    }
    const sy = input.sy || 0, sx = input.sx || 0;
    const thrust = (input.fwd ? 1 : 0) - (input.back ? 0.6 : 0) - (Math.abs(sy) > 0.1 ? sy : 0);
    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0) - (Math.abs(sx) > 0.1 ? sx : 0);
    C.v += thrust * 2.6 * dt; C.v *= Math.exp(-0.75 * dt);
    C.v = Math.max(-1.3, Math.min(3.6, C.v));
    C.w = damp(C.w, turn * (0.7 + Math.min(1, Math.abs(C.v) * 0.3)), 4, dt);
    C.yaw += C.w * dt;
    // a folyó sodra (a mederben lefelé visz)
    const ri = polyInfo(C.pos.x, C.pos.z, RIVER);
    const cur = ri.d < 9 && C.pos.z > -40 ? 0.55 * smoothstep(9, 3, ri.d) : 0;
    const fx = Math.sin(C.yaw), fz = Math.cos(C.yaw);
    const vx = fx * C.v + ri.tx * cur, vz = fz * C.v + ri.tz * cur;
    const nx = C.pos.x + vx * dt, nz = C.pos.z + vz * dt;
    // sekély víz vagy part: megáll, kicsit visszapattan (az orra és a fara is kell, hogy vízben legyen)
    const ok = (x, z) => this.depthAt(x, z) > 0.45;
    // csak a haladási irányba eső vége akadhat meg (így a partról is el lehet tolatni)
    const vl = Math.hypot(vx, vz) || 1, ex = nx + vx / vl * 2.0, ez = nz + vz / vl * 2.0;
    if (ok(nx, nz) && ok(ex, ez) && Math.hypot(nx, nz) < 182) { C.pos.x = nx; C.pos.z = nz; }
    else { if (Math.abs(C.v) > 0.6) this.audio?.thunk(0.12, true); C.v *= -0.25; }
    this.placeCanoe();
    // a játékos ül a kenuban
    const P = this.player;
    P.pos.set(C.pos.x - fx * 0.75, C.g.position.y - 0.42, C.pos.z - fz * 0.75);
    P.facing = C.yaw; P.vy = 0;
    // evezés: az evező a két kézben; csapás-ciklus (beszúrás elöl, húzás hátra, kiemelés és átváltás a másik oldalra)
    const pw = Math.abs(thrust) > 0.05 || Math.abs(turn) > 0.05 ? 1 : 0;
    const ph = this.paddleStroke(dt, thrust, turn);
    C.wakeT -= dt;
    if (Math.abs(C.v) > 0.6 && C.wakeT <= 0) { C.wakeT = 0.35; this.fx?.ripple(C.pos.x - fx * 1.9, 0, C.pos.z - fz * 1.9, 1.4, 1.1); }
    if (pw && ph.dip && !this.splashT) { this.audio?.step('water', 0.2); this.splashT = 0.6; this.fx?.ripple(ph.blade.x, 0, ph.blade.z, 0.8, 0.9); }
    this.splashT = Math.max(0, (this.splashT || 0) - dt);
  }

  // az evező helye a kenuban (helyi koordináta: +z előre, +x a játékos bal keze felől) és a két kéz célpontja
  paddleStroke(dt, thrust, turn) {
    const S = this.pad ||= { k: 0, u: 0.1, side: -1, prevIn: false, L: new V3(), U: new V3(), ax: new V3() };
    const act = Math.abs(thrust) > 0.05 || Math.abs(turn) > 0.05;
    S.k = damp(S.k, act ? 1 : 0, 5, dt);
    // szóló kenus módjára mindig a jobb oldalon evez (J-csapás), a kormányzást a csapás végi fordítás adja
    if (act) { S.u += dt / 1.45 * (thrust < -0.05 ? -1 : 1); S.u -= Math.floor(S.u); }
    // a vállak kb. (±0.2, 0.6, -1.0)-nél vannak, a kar kb. 0,5 m: minden fogás ezen belül marad
    const s = S.side, u = S.u;
    let lx, ly, lz;
    if (u < 0.62) { const t = u / 0.62; lx = s * 0.36; ly = 0.24 - 0.04 * Math.sin(Math.PI * t); lz = -0.72 - 0.45 * t; }
    else { const t = (u - 0.62) / 0.38, e = t * t * (3 - 2 * t); lx = s * (0.36 + 0.06 * Math.sin(Math.PI * t)); ly = 0.24 + 0.2 * Math.sin(Math.PI * t); lz = -1.17 + 0.45 * e; }
    // nyugalomban keresztben az ölében tartja
    S.L.set(s * 0.25, 0.3, -0.75).lerp(new V3(lx, ly, lz), S.k);
    const Ud = new V3(-s * 0.4, 0.32, -0.75).lerp(new V3(-0.42 * lx, Math.min(ly + 0.62, 0.92), lz - 0.05), S.k);
    const gd = 0.55 + 0.3 * S.k; // a két kéz távolsága a nyélen
    S.ax.subVectors(Ud, S.L).normalize();
    // az evező: alsó fogás a nyél 0 pontján, a felső gd-nél; a lapát előre-hátra néz
    const y = S.ax, F = new V3(0, 0, 1), z = F.addScaledVector(y, -F.dot(y)).normalize(), x = new V3().crossVectors(y, z);
    this.paddle.position.copy(S.L);
    this.paddle.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    const g = this.canoe.g; g.updateMatrixWorld(true);
    const W = (v) => v.clone().applyMatrix4(g.matrixWorld);
    const lower = W(S.L), upper = W(S.L.clone().addScaledVector(S.ax, gd));
    // az alsó kéz a húzás oldalán van (a játékos jobb keze a -x oldal)
    const lowerRight = S.L.x < 0;
    const rig = this.player.rig;
    if (rig) {
      rig.ik = {
        l: lowerRight ? upper : lower, r: lowerRight ? lower : upper,
        pl: W(new V3(0.8, 0.2, -1.2)), pr: W(new V3(-0.8, 0.2, -1.2)),
      };
    }
    this.paddleHeld = true;
    const blade = W(S.L.clone().addScaledVector(S.ax, -0.75));
    const inW = blade.y < -0.02;
    const dip = inW && !S.prevIn; S.prevIn = inW;
    return { dip, blade };
  }

  // ---------------------------------------------------------------- cölöpfalu
  buildVillage() {
    const wood = [0.38, 0.27, 0.16], plank = [0.46, 0.34, 0.21], thatch = [0.46, 0.37, 0.22], dark = [0.2, 0.14, 0.09];
    const W = [], R = [], rnd = this.rnd;
    const groundAt = (x, z) => Math.min(this.terrainH(x, z), 0) - 0.4;
    const post = (x, z, top, r = 0.09) => { const b = groundAt(x, z), L = top - b; W.push(part(new THREE.CylinderGeometry(r, r * 1.15, L, 6), wood, M4(x, b + L / 2, z, (rnd() - 0.5) * 0.05, 0, (rnd() - 0.5) * 0.05))); };
    HUTS.forEach((H, hi) => {
      const s = H.s, hs = s / 2, y = PLAT_Y;
      if (H.broken) {
        // összeomlott ház: ferde padló, néhány cölöp, lecsúszott tető
        for (const [dx, dz] of [[-hs, -hs], [hs, -hs], [-hs, hs]]) post(H.x + dx, H.z + dz, y - 0.4 - rnd());
        W.push(part(new THREE.BoxGeometry(s, 0.14, s), plank, M4(H.x, y - 0.9, H.z, 0.35, 0.2, -0.28)));
        R.push(part(new THREE.ConeGeometry(s * 0.78, 1.5, 4, 1, true), thatch, M4(H.x + 0.8, y - 0.6, H.z + 0.6, 0.6, Math.PI / 4, 0.3)));
        return;
      }
      for (const dx of [-hs, 0, hs]) for (const dz of [-hs, 0, hs]) if (dx !== 0 || dz !== 0) post(H.x + dx * 0.95, H.z + dz * 0.95, y + (Math.abs(dx) > 0 && Math.abs(dz) > 0 ? 2.1 : 0));
      // padló deszkákból
      for (let k = 0; k < 7; k++) W.push(part(new THREE.BoxGeometry(s, 0.08, s / 7 - 0.03), k % 3 ? plank : wood, M4(H.x, y - 0.04, H.z - hs + (k + 0.5) * s / 7)));
      // alacsony fonott fal körben, kijárattal minden palló és a létra felé (ezeken nem lehet átmenni)
      const exits = [];
      WALKS.forEach(([a, b]) => { if (a === hi || b === hi) { const O = HUTS[a === hi ? b : a]; exits.push([O.x - H.x, O.z - H.z]); } });
      if (hi === 0) exits.push([-1, 0]);
      const gaps = [[], [], [], []]; // -x, +x, -z, +z oldal: a kijárat helye az oldal mentén
      for (const [ex, ez] of exits) {
        const k = hs / Math.max(Math.abs(ex), Math.abs(ez));
        if (Math.abs(ex) >= Math.abs(ez)) gaps[ex < 0 ? 0 : 1].push(ez * k); else gaps[ez < 0 ? 2 : 3].push(ex * k);
      }
      for (let sd = 0; sd < 4; sd++) {
        const segs = []; let from = -hs * 0.97;
        for (const g of gaps[sd].sort((p, q) => p - q)) { segs.push([from, Math.max(from, g - 0.65)]); from = Math.min(hs * 0.97, g + 0.65); }
        segs.push([from, hs * 0.97]);
        for (const [p0, p1] of segs) {
          if (p1 - p0 < 0.1) continue;
          const c = (p0 + p1) / 2, len = p1 - p0, fixed = (sd % 2 ? 1 : -1) * hs * 0.97;
          const wx = sd < 2 ? H.x + fixed : H.x + c, wz = sd < 2 ? H.z + c : H.z + fixed;
          W.push(part(new THREE.BoxGeometry(sd < 2 ? 0.08 : len, 0.7, sd < 2 ? len : 0.08), wood, M4(wx, y + 0.35, wz)));
          for (let q = p0 + 0.15; q <= p1 - 0.1; q += 0.35) this.flora.colliders.push({ x: sd < 2 ? H.x + fixed : H.x + q, z: sd < 2 ? H.z + q : H.z + fixed, r: 0.1, h: y + 0.7, y0: y - 0.6 });
        }
      }
      if (H.roof) {
        const rs = s * 0.82;
        R.push(part(new THREE.ConeGeometry(rs, 1.9 + (H.chief ? 0.6 : 0), 4, 2), thatch, M4(H.x, y + 2.1 + 0.95 + (H.chief ? 0.3 : 0), H.z, 0, Math.PI / 4, 0)));
        // bojtos eresz
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; R.push(part(new THREE.ConeGeometry(0.12, 0.45, 3), thatch, M4(H.x + Math.cos(a) * rs * 0.95, y + 2.0, H.z + Math.sin(a) * rs * 0.95, Math.PI, 0, 0))); }
      } else {
        // csak a tetőváz maradt
        for (const [dx, dz] of [[-hs, -hs], [hs, -hs], [hs, hs], [-hs, hs]]) W.push(part(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), dark, M4(H.x + dx * 0.48, y + 2.55, H.z + dz * 0.48, dz * 0.35, 0, -dx * 0.35)));
      }
    });
    // pallók a házak között, cölöpökkel
    this.walks = WALKS.map(([a, b]) => {
      const A = HUTS[a], B = HUTS[b], dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ang = Math.atan2(dx, dz);
      const n = Math.ceil(L / 0.32);
      for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; W.push(part(new THREE.BoxGeometry(1.1, 0.06, 0.28), k % 4 ? plank : wood, M4(A.x + dx * t, PLAT_Y - 0.05 + Math.sin(t * Math.PI) * -0.08, A.z + dz * t, 0, ang, (rnd() - 0.5) * 0.06))); }
      for (let t = 0.25; t < 1; t += 0.25) for (const sd of [-0.5, 0.5]) post(A.x + dx * t + Math.cos(ang) * sd, A.z + dz * t - Math.sin(ang) * sd, PLAT_Y - 0.1, 0.06);
      return { ax: A.x, az: A.z, bx: B.x, bz: B.z };
    });
    // létra a bejárati háztól le a vízig (itt lehet kiszállni a kenuból)
    const H0 = HUTS[0];
    this.ladder = { x0: H0.x - H0.s / 2, x1: H0.x - H0.s / 2 - 2.8, z: H0.z };
    for (let k = 0; k < 7; k++) { const t = k / 6; W.push(part(new THREE.BoxGeometry(0.3, 0.06, 1.0), plank, M4(this.ladder.x0 - t * 2.8, PLAT_Y - 0.1 - t * 1.75, H0.z))); }
    for (const sd of [-0.5, 0.5]) W.push(part(new THREE.BoxGeometry(3.3, 0.08, 0.08), wood, M4(this.ladder.x0 - 1.4, PLAT_Y - 0.95, H0.z + sd, 0, 0, 0.56)));
    // totem a főnök háza előtt
    const C = HUTS[2], tx = C.x - 3.6, tz = C.z + 0.4;
    const tb = groundAt(tx, tz);
    W.push(part(new THREE.CylinderGeometry(0.28, 0.32, 6.2, 8), wood, M4(tx, tb + 3.1, tz)));
    for (let k = 0; k < 3; k++) {
      const y = tb + 2.4 + k * 1.3;
      W.push(part(new THREE.BoxGeometry(0.66, 0.5, 0.66), k === 1 ? [0.45, 0.2, 0.12] : wood, M4(tx, y, tz, 0, k * 0.4, 0)));
      W.push(part(new THREE.BoxGeometry(0.18, 0.08, 0.06), [0.85, 0.82, 0.7], M4(tx + 0.12, y + 0.08, tz + 0.34))); W.push(part(new THREE.BoxGeometry(0.18, 0.08, 0.06), [0.85, 0.82, 0.7], M4(tx - 0.12, y + 0.08, tz + 0.34)));
    }
    W.push(part(new THREE.BoxGeometry(1.8, 0.12, 0.3), wood, M4(tx, tb + 5.7, tz, 0, 0, 0.1)));
    const wm = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 'basic');
    const tm = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }), 'basic');
    for (const [list, m] of [[W, wm], [R, tm]]) { const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh); }
    // a talizmán a főnök házában, egy alacsony asztalon
    W.length = 0;
    const tab = new THREE.Mesh(mergeGeometries([part(new THREE.BoxGeometry(0.9, 0.08, 0.6), plank, M4(0, 0.45, 0)), part(new THREE.BoxGeometry(0.08, 0.45, 0.08), wood, M4(0.38, 0.22, 0.24)), part(new THREE.BoxGeometry(0.08, 0.45, 0.08), wood, M4(-0.38, 0.22, 0.24)), part(new THREE.BoxGeometry(0.08, 0.45, 0.08), wood, M4(0.38, 0.22, -0.24)), part(new THREE.BoxGeometry(0.08, 0.45, 0.08), wood, M4(-0.38, 0.22, -0.24))]), wm);
    tab.position.set(C.x + 0.6, PLAT_Y, C.z - 1.2); tab.castShadow = true; this.scene.add(tab);
    const tal = new THREE.Group();
    const tg = new THREE.MeshStandardMaterial({ color: 0x3fa37a, roughness: 0.25, emissive: new THREE.Color(0.02, 0.08, 0.05) });
    tal.add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 8, 20), tg));
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0xece2c8, roughness: 0.5 }));
    tooth.position.y = -0.14; tooth.rotation.x = Math.PI; tal.add(tooth);
    tal.position.set(C.x + 0.6, PLAT_Y + 0.6, C.z - 1.2); tal.rotation.x = -Math.PI / 2.6;
    this.scene.add(tal);
    this.items.push({ id: 'talisman', name: 'Vera talizmánja', icon: '🪬', p: tal.position.clone(), mesh: tal });
    this.notePos.push({ id: 'falu1', x: H0.x + 0.6, z: H0.z + 0.9, y: PLAT_Y });
    this.notePos.push({ id: 'falu2', x: C.x - 0.6, z: C.z - 1.3, y: PLAT_Y });
    this.chief = new V3(C.x, PLAT_Y, C.z);
  }
  // járható felületek a faluban: padlók, pallók, létra (különben -Infinity)
  heightAt(x, z) {
    if (Math.abs(x - VILLAGE.x) > 16 || Math.abs(z - VILLAGE.z) > 16) return -Infinity;
    let h = -Infinity;
    for (const H of HUTS) if (!H.broken && Math.abs(x - H.x) < H.s / 2 && Math.abs(z - H.z) < H.s / 2) h = Math.max(h, PLAT_Y);
    for (const w of this.walks) {
      const vx = w.bx - w.ax, vz = w.bz - w.az, t = Math.max(0, Math.min(1, ((x - w.ax) * vx + (z - w.az) * vz) / (vx * vx + vz * vz)));
      if (Math.hypot(x - w.ax - vx * t, z - w.az - vz * t) < 0.6) h = Math.max(h, PLAT_Y - 0.02);
    }
    const L = this.ladder;
    if (x <= L.x0 && x >= L.x1 - 0.3 && Math.abs(z - L.z) < 0.55) h = Math.max(h, PLAT_Y - 0.08 - (L.x0 - x) / 2.8 * 1.75);
    return h;
  }

  // ---------------------------------------------------------------- mangrovék a mocsárban és a folyó alsó szakaszán
  buildMangroves() {
    const rnd = mulberry32(57), bark = new GB(), leaf = new GB(), V = (x, y, z) => new V3(x, y, z);
    const spots = [];
    for (let k = 0; k < 400 && spots.length < 26; k++) {
      const a = rnd() * 6.28, d = 6 + rnd() * (MARSH.r - 4);
      const x = MARSH.x + Math.cos(a) * d, z = MARSH.z + Math.sin(a) * d;
      const h = this.terrainH(x, z);
      if (h > 0.6 || h < -0.9 || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 13 || spots.some((s) => Math.hypot(s[0] - x, s[1] - z) < 5)) continue;
      spots.push([x, z, h]);
    }
    for (const [x, z, h0] of spots) {
      const base = Math.max(h0, -0.6), top = 0.9 + rnd() * 0.5, H = 6 + rnd() * 4;
      // ívelt gyökérlábak a vízből a törzs aljáig
      const nr = 6 + Math.floor(rnd() * 3);
      for (let k = 0; k < nr; k++) {
        const a = k / nr * 6.28 + rnd() * 0.5, d = 1.4 + rnd() * 1.2;
        const c = new THREE.CatmullRomCurve3([V(x + Math.cos(a) * d, base - 0.3, z + Math.sin(a) * d), V(x + Math.cos(a) * d * 0.75, base + top + 0.5, z + Math.sin(a) * d * 0.75), V(x + Math.cos(a) * 0.2, base + top + 0.6, z + Math.sin(a) * 0.2)]);
        tube(bark, c, 8, 5, (t) => 0.06 + 0.05 * t, null, 1);
      }
      const trunk = new THREE.CatmullRomCurve3([V(x, base + top + 0.4, z), V(x + (rnd() - 0.5), base + top + H * 0.5, z + (rnd() - 0.5)), V(x + (rnd() - 0.5) * 1.5, base + top + H, z + (rnd() - 0.5) * 1.5)]);
      tube(bark, trunk, 10, 7, (t) => 0.22 * (1 - 0.5 * t), null, 2);
      const tp = trunk.getPointAt(1), tint = LEAF_TINTS[Math.floor(rnd() * LEAF_TINTS.length)];
      leafCluster(leaf, tp.clone().add(V(0, 0.6, 0)), 2.6 + rnd(), 70, 1, 1.4, 2.2, 0.55, rnd, tint);
      leafCluster(leaf, trunk.getPointAt(0.7).add(V(1.2, 0.3, 0.5)), 1.8, 35, 1, 1.3, 2.0, 0.55, rnd, tint);
      if (rnd() < 0.6) hangVine(leaf, trunk.getPointAt(0.8), 3 + rnd() * 3, rnd);
    }
    const bm = new THREE.Mesh(bark.build(true), this.flora.bark.still); bm.castShadow = true; bm.receiveShadow = true; this.scene.add(bm);
    const lm = new THREE.Mesh(leaf.build(), this.flora.fol.still.mat); lm.castShadow = true; lm.receiveShadow = true;
    lm.customDepthMaterial = this.flora.fol.still.depth; this.scene.add(lm);
  }

  // ---------------------------------------------------------------- kajmánok
  buildCaimans() {
    const skin = [0.2, 0.22, 0.13], belly = [0.55, 0.52, 0.36], eye = [0.85, 0.7, 0.15], dark = [0.08, 0.08, 0.05];
    const mat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), 'basic');
    const ell = (sx, sy, sz) => new THREE.SphereGeometry(1, 14, 9).scale(sx, sy, sz);
    const scutes = [];
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) scutes.push(part(ell(0.04, 0.03, 0.06), dark, M4(s * 0.1, 0.15, -0.7 + i * 0.16)));
    this.caiParts = {
      body: mergeGeometries([part(ell(0.34, 0.16, 0.95), skin, M4(0, 0, 0)), part(ell(0.3, 0.1, 0.85), belly, M4(0, -0.06, 0)), ...scutes]),
      head: mergeGeometries([part(ell(0.17, 0.09, 0.32), skin, M4(0, 0.02, 0.22)), part(ell(0.1, 0.06, 0.22), skin, M4(0, 0.0, 0.5)),
        part(new THREE.SphereGeometry(0.035, 8, 6), eye, M4(0.08, 0.1, 0.18)), part(new THREE.SphereGeometry(0.035, 8, 6), eye, M4(-0.08, 0.1, 0.18)),
        part(new THREE.SphereGeometry(0.022, 6, 5), dark, M4(0.03, 0.06, 0.68)), part(new THREE.SphereGeometry(0.022, 6, 5), dark, M4(-0.03, 0.06, 0.68))]),
      jaw: mergeGeometries([part(ell(0.15, 0.04, 0.4), belly, M4(0, -0.03, 0.32))]),
      tail: [0, 1, 2, 3].map((k) => mergeGeometries([part(ell(0.2 - k * 0.04, 0.12 - k * 0.02, 0.3), skin, M4(0, 0, -0.26)), part(ell(0.03, 0.04, 0.08), dark, M4(0, 0.1 - k * 0.02, -0.25))])),
      leg: mergeGeometries([part(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), skin, M4(0, -0.1, 0, 0, 0, 0))]),
    };
    this.caimans = [];
    // kettő a folyó széles szakaszán, kettő a mocsárban, egy a csatornában
    const homes = [];
    for (const z of [100, 124, 140]) { let best = null; for (const p of RIVER) if (Math.abs(p[1] - z) < 6) best = p; if (best) homes.push(new V3(best[0], 0, best[1])); }
    homes.push(new V3(MARSH.x - 6, 0, MARSH.z + 8), new V3(MARSH.x + 4, 0, MARSH.z - 10), new V3(84, 0, 115.5));
    for (const h of homes) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(this.caiParts.body, mat));
      const head = new THREE.Group(); head.position.set(0, 0.06, 0.85); head.rotation.x = -0.06; head.add(new THREE.Mesh(this.caiParts.head, mat)); g.add(head);
      const jaw = new THREE.Group(); jaw.position.set(0, -0.02, 0.06); jaw.add(new THREE.Mesh(this.caiParts.jaw, mat)); head.add(jaw);
      let parent = g, tail = [];
      for (let k = 0; k < 4; k++) { const s = new THREE.Group(); s.position.set(0, 0, k === 0 ? -0.85 : -0.5); s.add(new THREE.Mesh(this.caiParts.tail[k], mat)); parent.add(s); tail.push(s); parent = s; }
      const legs = [];
      for (const [x, z] of [[0.3, 0.5], [-0.3, 0.5], [0.3, -0.5], [-0.3, -0.5]]) { const l = new THREE.Group(); l.position.set(x, -0.04, z); l.rotation.z = Math.sign(x) * 1.1; l.add(new THREE.Mesh(this.caiParts.leg, mat)); g.add(l); legs.push(l); }
      g.scale.setScalar(1.15);
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.scene.add(g);
      this.caimans.push({ g, head, jaw, tail, legs, home: h.clone(), pos: h.clone(), yaw: Math.random() * 6.28, speed: 0, state: 'float', t: 3 + Math.random() * 8, target: null, cool: 0, ph: Math.random() * 6 });
    }
  }
  // kajmán viselkedése: lebeg/úszkál, sütkérezik a parton, vízben lévő játékosra rátámad
  updateCaimans(dt, t, hooks) {
    const P = this.player.pos, inWater = !this.inCanoe && (this.player.swim || this.player.wade > 0.3);
    for (const c of this.caimans) {
      c.t -= dt; c.cool -= dt;
      const dx = P.x - c.pos.x, dz = P.z - c.pos.z, dP = Math.hypot(dx, dz);
      let want = 0, tgt = null;
      if (c.state === 'float' || c.state === 'cruise') {
        if (inWater && !this.has.talisman && dP < 14 && c.cool <= 0) { c.state = 'stalk'; this.audio?.growl(0.35); }
        else if (c.t <= 0) {
          c.t = 6 + Math.random() * 10;
          if (Math.random() < 0.5) { const a = Math.random() * 6.28, d = 2 + Math.random() * 7; c.target = c.home.clone().add(new V3(Math.cos(a) * d, 0, Math.sin(a) * d)); c.state = 'cruise'; }
          else c.state = 'float';
        }
        if (c.state === 'cruise' && c.target) { tgt = c.target; want = 0.6; if (c.pos.distanceTo(c.target) < 0.8) c.state = 'float'; }
      } else if (c.state === 'stalk') {
        tgt = P; want = 3.2;
        if (!inWater || this.has.talisman || dP > 20) { c.state = 'float'; c.t = 4; }
        if (dP < 1.8) {
          c.state = 'retreat'; c.t = 5; c.cool = 8; c.bite = 0.5;
          hooks?.onCaiman?.();
        }
      } else if (c.state === 'retreat') {
        tgt = c.pos.clone().add(new V3(-dx, 0, -dz).normalize().multiplyScalar(5)); want = 2.4;
        if (c.t <= 0) { c.state = 'float'; c.t = 3; }
      }
      if (tgt) {
        const tx = tgt.x - c.pos.x, tz = tgt.z - c.pos.z;
        c.yaw = angDamp(c.yaw, Math.atan2(tx, tz), c.state === 'stalk' ? 3 : 1.5, dt);
      }
      c.speed = damp(c.speed, want, 2, dt);
      const nx = c.pos.x + Math.sin(c.yaw) * c.speed * dt, nz = c.pos.z + Math.cos(c.yaw) * c.speed * dt;
      if (this.depthAt(nx, nz) > 0.45 && Math.hypot(nx - c.home.x, nz - c.home.z) < 26) { c.pos.x = nx; c.pos.z = nz; }
      else { c.yaw += 1.2 * dt * 3; if (c.state === 'cruise') c.state = 'float'; }
      // csak a hát, a szem és az orr áll ki a vízből
      const sub = c.state === 'stalk' ? 0.19 : 0.15;
      c.g.position.set(c.pos.x, -sub + Math.sin(t * 0.9 + c.ph) * 0.015, c.pos.z);
      c.g.rotation.set(0, c.yaw, 0);
      const sw = c.speed * 0.5 + 0.08;
      c.tail.forEach((s, k) => { s.rotation.y = Math.sin(t * (2 + c.speed * 2.5) - k * 0.9 + c.ph) * sw * (0.35 + k * 0.15); });
      // úszáskor a lábak a testhez simulnak, lebegéskor szétterülnek
      c.legs.forEach((l, k) => { l.rotation.x = c.speed > 0.3 ? 1.2 : 0.5 + Math.sin(t * 0.8 + k) * 0.1; l.rotation.z = (k % 2 ? -1 : 1) * (c.speed > 0.3 ? 1.3 : 1.45); });
      c.bite = Math.max(0, (c.bite || 0) - dt);
      c.jaw.rotation.x = c.bite > 0 ? 0.7 * Math.sin(c.bite / 0.5 * Math.PI) : (c.state === 'float' ? Math.max(0, Math.sin(t * 0.25 + c.ph) - 0.7) * 1.4 : 0);
    }
  }

  // ---------------------------------------------------------------- tárgyak csillanása
  buildSparkles() {
    const pts = this.items.map((it) => [it.p.x, it.p.y + 0.3, it.p.z, 1]).flat();
    const buf = new THREE.InterleavedBuffer(new Float32Array(pts), 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0));
    g.setAttribute('aOn', new THREE.InterleavedBufferAttribute(buf, 1, 3));
    this.sbuf = buf;
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uScreenH: G.uScreenH },
      vertexShader: `attribute float aOn; uniform float uTime; uniform float uScreenH; varying float vA;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z;
  float pulse = pow(0.5 + 0.5 * sin(uTime * 2.4 + position.x * 3.0), 3.0);
  vA = aOn * smoothstep(18.0, 4.0, d) * smoothstep(0.5, 1.2, d) * (0.3 + 0.7 * pulse);
  gl_PointSize = aOn * (90.0 + 60.0 * pulse) * uScreenH / 600.0 / max(d, 0.5); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q);
  float star = max(0.0, 1.0 - abs(q.x) * 7.0) * max(0.0, 1.0 - abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 7.0) * max(0.0, 1.0 - abs(q.x));
  gl_FragColor = vec4(vec3(1.0, 0.92, 0.7) * (exp(-r * r * 8.0) * 0.7 + star * 0.7) * vA * 1.4, 0.0); }`,
      transparent: true, depthWrite: false, ...ADD,
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 5;
    this.scene.add(p);
  }
  nearestItem(p) {
    for (const it of this.items) if (!this.has[it.id] && Math.hypot(it.p.x - p.x, it.p.z - p.z) < 1.8 && Math.abs(it.p.y - p.y) < 2) return it;
    return null;
  }
  take(it) {
    this.has[it.id] = true; it.mesh.visible = false;
    const i = this.items.indexOf(it); this.sbuf.array[i * 4 + 3] = 0; this.sbuf.needsUpdate = true;
  }

  update(dt, t, input, hooks) {
    this.updateCanoe(dt, input);
    this.updateCaimans(dt, t, hooks);
  }

  serialize() {
    const C = this.canoe;
    return { has: this.has, campSeen: this.campSeen, villageSeen: this.villageSeen, canoe: { fixed: C.fixed, beached: C.beached, x: C.pos.x, z: C.pos.z, yaw: C.yaw }, inCanoe: this.inCanoe };
  }
  restore(s) {
    if (!s) return;
    for (const it of this.items) if (s.has?.[it.id]) this.take(it);
    this.campSeen = !!s.campSeen; this.villageSeen = !!s.villageSeen;
    const C = this.canoe;
    if (s.canoe) {
      if (s.canoe.fixed) this.repair();
      C.beached = s.canoe.beached !== false; C.pos.set(s.canoe.x, 0, s.canoe.z); C.yaw = s.canoe.yaw || 0;
    }
    if (s.inCanoe && C.fixed && !C.beached) { this.inCanoe = true; this.player.seated = true; }
  }
}
