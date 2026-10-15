// Barlang a vízesés mögött: kanyargó alagút a sziklafalba, a végén csarnok világító tavacskával,
// világító gombákkal, cseppkövekkel és fénylő lárvákkal a mennyezeten; a csarnokban a Jáde Kígyó.
// A domborzat magasságtérkép, ezért a barlang külön (befelé néző) háló: a terep a szájnál shaderből átlátszó,
// a játékos a barlangban ennek a padlóján jár (floorAt), a kamera nem megy ki a sziklába (inRock, ceilAt).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch, ADD } from './shaders.js';
import { caveMatPBR } from './materials.js';
import { simplex2, smoothstep, mulberry32 } from './noise.js';
import { CAVE_MOUTH } from './terrain.js';

const V3 = THREE.Vector3;
// vezérpontok: x, z, padlószint, fél-szélesség, belmagasság
const CTRL = [
  [7.6, -51.85, 0.35, 1.75, 3.9],
  [7.4, -54.0, 0.32, 1.85, 3.8],
  [6.6, -57.2, 0.25, 1.5, 3.2],
  [4.8, -61.0, 0.12, 1.9, 3.9],
  [1.9, -65.0, 0.0, 2.3, 4.6],
  [-1.2, -69.2, -0.1, 3.6, 5.6],
  [-3.4, -74.0, -0.2, 6.6, 7.2],
  [-4.4, -79.2, -0.22, 7.4, 7.6],
  [-4.2, -84.0, -0.12, 5.6, 6.2],
  [-3.6, -87.4, 0.15, 2.4, 3.4],
  [-3.4, -88.6, 0.4, 0.35, 0.8],
];
const FACE_Z = -51.8;

function catmullN(pts, sub) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const n3 = (x, y, z) => simplex2(x * 0.9 + y * 0.53, z * 0.9 - y * 0.41) * 0.6 + simplex2(x * 2.3 - z * 0.7, y * 2.1 + z * 0.3) * 0.4;

export class Cave {
  constructor(scene, rockTex, flora) {
    this.scene = scene;
    this.found = false; this.seen = false;
    // gyűrűk a középvonal mentén
    const R = catmullN(CTRL, 9).map(([x, z, y, w, h]) => ({ x, z, y, w, h, s: 0 }));
    for (let i = 1; i < R.length; i++) R[i].s = R[i - 1].s + Math.hypot(R[i].x - R[i - 1].x, R[i].z - R[i - 1].z);
    this.R = R;
    this.len = R[R.length - 1].s;
    // csarnok: a legszélesebb gyűrű; benne a tavacska és a talapzat
    const ch = R.reduce((a, b) => (b.w > a.w ? b : a));
    this.chamber = new V3(ch.x, ch.y, ch.z);
    const ci = R.indexOf(ch), t = this.tangent(ci), rgt = new V3(-t.z, 0, t.x);
    this.pool = { x: ch.x + rgt.x * ch.w * 0.32 - t.x * 1.2, z: ch.z + rgt.z * ch.w * 0.32 - t.z * 1.2, r: 2.5, y: ch.y - 0.1 };
    this.pedestal = new V3(ch.x - rgt.x * ch.w * 0.3 - t.x * 2.0, 0, ch.z - rgt.z * ch.w * 0.3 - t.z * 2.0);
    this.pedestal.y = this.floorF(this.pedestal.x, this.pedestal.z, ch.y);

    this.buildShell(rockTex);
    this.buildDeco(rockTex, flora);
    this.buildSerpent();

    // a terep átlátszó a szájnál
    G.uMouth.value.set(CAVE_MOUTH.x, CAVE_MOUTH.y + 1.75, 1.32, 1.6);
    G.uMouthZ.value.set(FACE_Z, FACE_Z - 6, CAVE_MOUTH.y + 0.18);
    this.mouth = new V3(CAVE_MOUTH.x, CAVE_MOUTH.y, CAVE_MOUTH.z + 0.6);
    // jegyzetek helye a barlangban
    const ri = R.findIndex((r) => r.s > 13), r2 = R[ri], t2 = this.tangent(ri);
    this.notePos = [
      { id: 'cave1', x: r2.x + t2.z * r2.w * 0.45, z: r2.z - t2.x * r2.w * 0.45 },
      { id: 'cave2', x: this.pedestal.x + rgt.x * 1.3, z: this.pedestal.z + rgt.z * 1.3 },
    ];
    for (const n of this.notePos) n.y = this.floorAt(n.x, n.z) ?? 0;
  }

  tangent(i) {
    const R = this.R, a = R[Math.max(0, i - 1)], b = R[Math.min(R.length - 1, i + 1)];
    return new V3(b.x - a.x, 0, b.z - a.z).normalize();
  }
  // padlószint egy pontban (alap + apró egyenetlenség - tavacska mélyedése)
  floorF(x, z, base) {
    const dp = Math.hypot(x - this.pool.x, z - this.pool.z);
    return base + 0.05 * simplex2(x * 1.4, z * 1.4) - smoothstep(this.pool.r, this.pool.r * 0.45, dp) * 0.55;
  }
  // a középvonal legközelebbi pontja: { s, d, w, h, y }
  info(x, z) {
    const R = this.R;
    let best = null, bd = 1e9;
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i], b = R[i + 1], vx = b.x - a.x, vz = b.z - a.z, L2 = vx * vx + vz * vz;
      const u = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / L2));
      const px = a.x + vx * u, pz = a.z + vz * u, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; best = { i, u, d }; }
    }
    const a = R[best.i], b = R[best.i + 1], u = best.u;
    // a száj előtt (u=0 az első szakaszon, és a sziklafal elé esik) már nem barlang
    if (best.i === 0 && u === 0 && z > a.z) return null;
    return { s: a.s + (b.s - a.s) * u, d: best.d, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u, y: a.y + (b.y - a.y) * u };
  }
  floorAt(x, z) {
    const I = this.info(x, z);
    if (!I || I.d > I.w * 0.68 || I.s > this.len - 0.6) return null;
    return this.floorF(x, z, I.y);
  }
  ceilAt(x, z) {
    const I = this.info(x, z);
    if (!I || I.d > I.w) return -Infinity;
    const q = Math.min(1, I.d / I.w);
    return I.y + I.h * (0.42 + 0.58 * Math.sqrt(1 - q * q)) - 0.35;
  }
  // a kamera szempontjából szikla-e (a sziklafal mögött, de nem az üregben)
  inRock(x, z) { return z < FACE_Z && this.floorAt(x, z) === null; }
  near(p) { return p.y < 9 && p.z < -50.6 && p.z > -92 && p.x > -16 && p.x < 14; }
  // mennyire mélyen van a pont a barlangban (0 a száj, 1 bent)
  depthK(p) {
    if (!this.near(p)) return 0;
    const I = this.info(p.x, p.z);
    if (!I || I.d > I.w) return 0;
    return smoothstep(0.5, 9, I.s);
  }
  waterAt(x, z) {
    const dp = Math.hypot(x - this.pool.x, z - this.pool.z);
    return dp < this.pool.r ? this.pool.y : -100;
  }

  // ---------------------------------------------------------------- héj
  buildShell(rockTex) {
    const R = this.R, M = 40, pos = [], aS = [], idx = [];
    for (let i = 0; i < R.length; i++) {
      const r = R[i], t = this.tangent(i), rgt = new V3(-t.z, 0, t.x);
      const cy = r.y + r.h * 0.42, hh = r.h * 0.58;
      for (let k = 0; k < M; k++) {
        const th = k / M * Math.PI * 2 - Math.PI / 2;
        const cs = Math.cos(th), sn = Math.sin(th);
        let lat = cs * r.w, ver = cy + hh * sn;
        let x = r.x + rgt.x * lat, z = r.z + rgt.z * lat;
        // falak és mennyezet: zajos, kitüremkedő kő (a száj első gyűrűje sima marad)
        const amp = (i < 2 ? 0.25 : 1) * Math.min(r.w, r.h) * 0.16;
        const nn = n3(x * 0.7, ver * 0.7, z * 0.7) * amp + n3(x * 2.4, ver * 2.4, z * 2.4) * amp * 0.25;
        lat += cs * nn; ver += sn * nn * 0.8;
        x = r.x + rgt.x * lat; z = r.z + rgt.z * lat;
        const fl = this.floorF(x, z, r.y);
        if (ver < fl) ver = fl;
        pos.push(x, ver, z); aS.push(r.s);
      }
    }
    for (let i = 0; i < R.length - 1; i++) for (let k = 0; k < M; k++) {
      const a = i * M + k, b = i * M + (k + 1) % M, c = (i + 1) * M + k, d = (i + 1) * M + (k + 1) % M;
      idx.push(a, c, b, b, c, d);
    }
    // a cső vége zárt (különben az égbolt átlátszana)
    const last = R[R.length - 1], ci = pos.length / 3;
    pos.push(last.x, last.y + last.h * 0.45, last.z); aS.push(last.s);
    for (let k = 0; k < M; k++) idx.push((R.length - 1) * M + k, ci, (R.length - 1) * M + (k + 1) % M);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    // a normálisok befelé nézzenek (a padló felfelé)
    const nrm = g.attributes.normal;
    if (nrm.getY(2 * M + 0) < 0) { idx.reverse(); g.setIndex(idx); g.computeVertexNormals(); }
    this.mat = caveMatPBR(rockTex);
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.receiveShadow = true; mesh.castShadow = false;
    this.scene.add(mesh);
    this.shell = mesh;
  }

  // ---------------------------------------------------------------- díszlet
  buildDeco(rockTex, flora) {
    const R = this.R, rnd = mulberry32(77);
    // cseppkövek (mennyezetről) és állócseppkövek
    const cone = new THREE.ConeGeometry(0.11, 1, 7, 1).translate(0, 0.5, 0); // alap y=0, hegy y=1
    cone.setAttribute('aS', new THREE.Float32BufferAttribute(new Float32Array(cone.attributes.position.count).fill(30), 1));
    const nSt = 150, st = new THREE.InstancedMesh(cone, this.mat, nSt);
    const Mx = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new V3();
    let n = 0;
    for (let k = 0; k < 400 && n < nSt; k++) {
      const i = 4 + Math.floor(rnd() * (R.length - 6)), r = R[i];
      if (r.s < 6) continue;
      const t = this.tangent(i), rgt = new V3(-t.z, 0, t.x);
      const down = rnd() < 0.72;
      const lat = (rnd() - 0.5) * (down ? 1.2 : 1.5) * r.w;
      const x = r.x + rgt.x * lat, z = r.z + rgt.z * lat;
      const fl = this.floorF(x, z, r.y);
      const ceil = this.ceilAt(x, z) + 0.3;
      if (!Number.isFinite(ceil) || Math.hypot(x - this.pool.x, z - this.pool.z) < this.pool.r + 0.3) continue;
      if (!down && Math.abs(lat) < r.w * 0.45) continue; // a járható sávban nincs állócseppkő
      const len = (0.25 + rnd() * rnd() * 1.6) * (down ? 1 : 0.7);
      if (down) { Q.setFromAxisAngle(new V3(1, 0, 0), Math.PI); S.set(0.6 + rnd() * 1.2, len, 0.6 + rnd() * 1.2); Mx.compose(new V3(x, ceil + 0.05, z), Q, S); }
      else { Q.identity(); S.set(1 + rnd() * 1.5, len, 1 + rnd() * 1.5); Mx.compose(new V3(x, fl - 0.05, z), Q, S); }
      st.setMatrixAt(n++, Mx);
    }
    st.count = n; st.receiveShadow = true;
    this.scene.add(st);

    // világító gombák: a fal tövében, a mélység felé sűrűsödnek (útjelzők)
    const stem = new THREE.CylinderGeometry(0.018, 0.026, 0.13, 6).translate(0, 0.065, 0);
    const cap = new THREE.SphereGeometry(0.07, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.12, 0);
    const mk = (g, glow, col) => {
      const x = g.toNonIndexed(), c = x.attributes.position.count;
      x.deleteAttribute('uv');
      x.setAttribute('aGlow', new THREE.Float32BufferAttribute(new Float32Array(c).fill(glow), 1));
      x.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(c * 3).map((_, j) => col[j % 3]), 3));
      return x;
    };
    const mush = mergeGeometries([mk(stem, 0.25, [0.8, 0.85, 0.8]), mk(cap, 1, [0.75, 0.95, 0.9])]);
    const mMat = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), 'mushGlow', (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; varying float vGlow; varying float vPh;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;\n#ifdef USE_INSTANCING\nvPh = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 2.3;\n#else\nvPh = 0.0;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow; varying float vPh;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow * 1.6 * (0.8 + 0.2 * sin(uTime * 1.3 + vPh));');
    });
    const nM = 160, mm = new THREE.InstancedMesh(mush, mMat, nM);
    const cols = [[0.25, 1.0, 0.85], [0.3, 0.75, 1.0], [0.55, 1.0, 0.45]];
    n = 0;
    for (let k = 0; k < 900 && n < nM; k++) {
      const i = 2 + Math.floor(rnd() * (R.length - 4)), r = R[i];
      if (r.s < 3 + rnd() * 6) continue;
      const t = this.tangent(i), rgt = new V3(-t.z, 0, t.x);
      const side = rnd() < 0.5 ? -1 : 1, lat = side * (0.5 + rnd() * 0.16) * r.w;
      const cx = r.x + rgt.x * lat, cz = r.z + rgt.z * lat;
      const cl = 2 + Math.floor(rnd() * 5), c = cols[Math.floor(rnd() * 3)];
      for (let j = 0; j < cl && n < nM; j++) {
        const x = cx + (rnd() - 0.5) * 0.5, z = cz + (rnd() - 0.5) * 0.5;
        Q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.5, rnd() * 6, (rnd() - 0.5) * 0.5));
        S.setScalar(0.6 + rnd() * 1.1);
        Mx.compose(new V3(x, this.floorF(x, z, r.y) - 0.02, z), Q, S);
        mm.setMatrixAt(n, Mx); mm.setColorAt(n, new THREE.Color(...c)); n++;
      }
    }
    mm.count = n;
    this.scene.add(mm);

    // fénylő lárvák a mennyezeten: apró kék pontok, lassan pislákolnak
    const gp = [];
    for (let k = 0; k < 1400 && gp.length < 520 * 3; k++) {
      const i = Math.floor(rnd() * R.length), r = R[i];
      if (r.s < 9) continue;
      const t = this.tangent(i), rgt = new V3(-t.z, 0, t.x), lat = (rnd() - 0.5) * 1.3 * r.w;
      const x = r.x + rgt.x * lat, z = r.z + rgt.z * lat, c = this.ceilAt(x, z);
      if (!Number.isFinite(c)) continue;
      gp.push(x, c + 0.25 - rnd() * 0.2, z);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const gm = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uScreenH: G.uScreenH },
      vertexShader: `uniform float uTime; uniform float uScreenH; varying float vA;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float ph = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.28;
  vA = 0.55 + 0.45 * sin(uTime * 0.7 + ph);
  gl_PointSize = (10.0 + 6.0 * vA) * uScreenH / 600.0 / max(-mv.z, 0.5);
  gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float a = exp(-dot(q, q) * 4.0) * vA;
  gl_FragColor = vec4(vec3(0.35, 0.75, 1.0) * a * 2.2, 0.0); }`,
      transparent: true, depthWrite: false, ...ADD,
    });
    const gpts = new THREE.Points(gg, gm); gpts.frustumCulled = false;
    this.scene.add(gpts);

    // tavacska: sötét türkiz víz, a mélyéből derengő fénnyel
    const pm = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime },
      vertexShader: `varying vec3 vP; void main() { vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec3 vP;
${'float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }'}
float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vP.xz * 1.6;
  float c1 = nz(p + vec2(uTime * 0.25, uTime * 0.17)), c2 = nz(p * 1.4 - vec2(uTime * 0.2, -uTime * 0.23) + 3.1);
  float caus = pow(1.0 - abs(c1 - c2), 9.0);
  float r = length(vP.xz - vec2(${this.pool.x.toFixed(3)}, ${this.pool.z.toFixed(3)})) / ${this.pool.r.toFixed(3)};
  vec3 col = mix(vec3(0.03, 0.4, 0.38), vec3(0.01, 0.06, 0.08), smoothstep(0.05, 0.95, r));
  col += vec3(0.2, 0.9, 0.85) * caus * (1.0 - r) * 0.6;
  gl_FragColor = vec4(col * 0.62, 1.0); }`,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(this.pool.r * 0.98, 48).rotateX(-Math.PI / 2), pm);
    pool.position.set(this.pool.x, this.pool.y, this.pool.z);
    this.scene.add(pool);
    // a csarnok derengő fénye (mindig a jelenetben van, hogy ne kelljen shadert újrafordítani)
    this.glow = new THREE.PointLight(0x46e0c8, 0, 18, 2);
    this.glow.position.set(this.pool.x, this.pool.y + 1.6, this.pool.z);
    this.scene.add(this.glow);

    // kőkeret a száj körül, hogy a sziklafal és az alagút találkozása természetes legyen
    const rock = new THREE.DodecahedronGeometry(1, 1);
    for (const [dx, dy, s] of [[-1.9, 0.4, 0.75], [1.9, 0.5, 0.8], [-1.6, 2.6, 0.6], [1.7, 2.8, 0.65], [0, 3.85, 0.85], [-0.9, 3.6, 0.5], [1.0, 3.7, 0.55]]) {
      const m = new THREE.Mesh(rock, flora.rockMat);
      m.position.set(CAVE_MOUTH.x + dx, CAVE_MOUTH.y + dy, FACE_Z + 0.15 + rnd() * 0.2);
      m.scale.set(s * (1 + rnd() * 0.4), s, s * 0.7); m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      m.castShadow = true; m.receiveShadow = true;
      this.scene.add(m);
    }
    // talapzat a kígyónak
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.6, 1.0, 9), flora.rockMat);
    ped.position.set(this.pedestal.x, this.pedestal.y + 0.45, this.pedestal.z);
    ped.receiveShadow = true;
    this.scene.add(ped);
  }

  // ---------------------------------------------------------------- Jáde Kígyó
  buildSerpent() {
    const jade = new THREE.MeshPhysicalMaterial({ color: 0x2f9a6c, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, emissive: new THREE.Color(0.02, 0.09, 0.06) });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.25, emissive: new THREE.Color(0.25, 0.15, 0.02) });
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * Math.PI * 5.2, r = 0.2 * (1 - t * 0.45);
      pts.push(new V3(Math.cos(a) * r, 0.04 + t * 0.32, Math.sin(a) * r));
    }
    pts.push(new V3(pts[60].x * 0.6, 0.48, pts[60].z * 0.6 + 0.03), new V3(0.0, 0.58, 0.08));
    const body = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 140, 0.045, 10).scale(1, 1, 1), jade);
    const g = new THREE.Group(); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10).scale(1, 0.7, 1.45), jade);
    head.position.set(0, 0.6, 0.13); g.add(head);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), gold); e.position.set(s * 0.04, 0.625, 0.19); g.add(e); }
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 18), gold);
    crown.position.set(0, 0.66, 0.1); crown.rotation.x = Math.PI / 2.4; g.add(crown);
    g.scale.setScalar(1.5);
    g.position.set(this.pedestal.x, this.pedestal.y + 0.95, this.pedestal.z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(g);
    this.serpent = g;
    this.serpentPos = g.position.clone().add(new V3(0, 0.4, 0));
  }
  serpentNear(p) { return !this.found && Math.hypot(p.x - this.serpentPos.x, p.z - this.serpentPos.z) < 2.0 && Math.abs(p.y - this.pedestal.y) < 2; }
  takeSerpent() { this.found = true; this.serpent.visible = false; }

  update(dt, t, playerPos, audio) {
    const k = this.depthK(playerPos);
    const nearCh = Math.max(0, 1 - this.chamber.distanceTo(playerPos) / 40);
    this.glow.intensity = nearCh > 0 && playerPos.z < -55 ? 7 * (0.85 + 0.15 * Math.sin(t * 0.9)) : 0;
    if (!this.found) this.serpent.rotation.y = Math.sin(t * 0.35) * 0.25;
    // csepegés
    this.dripT = (this.dripT ?? 1) - dt;
    if (k > 0.2 && this.dripT <= 0) { this.dripT = 0.6 + Math.random() * 2.2; audio?.drip(k); }
    return k;
  }
}
