// Procedurális dzsungel-növényzet: geometria-építők + elhelyezés + közeli "streamelés"
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32, simplex2, smoothstep } from './noise.js';
import { cellUV } from './textures.js';
import { foliageMat, barkMat, plantMat, grassMat, rockMat, rockMatPBR } from './materials.js';
import { POND, CAMP, TEMPLE, NAPKAPU, CAVE_MOUTH, ledgeDist, cliffZ, cliffW, RIVER, polyInfo } from './terrain.js';

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
const tick = () => new Promise(r => setTimeout(r, 0));

class GB {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
  get vc() { return this.p.length / 3; }
  v(p, n, u, v, c) {
    this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.u.push(u, v);
    this.c.push(c ? c[0] : 1, c ? c[1] : 1, c ? c[2] : 1);
    return this.vc - 1;
  }
  pos(i) { return new V3(this.p[i * 3], this.p[i * 3 + 1], this.p[i * 3 + 2]); }
  nrm(i) { return new V3(this.n[i * 3], this.n[i * 3 + 1], this.n[i * 3 + 2]); }
  build(normals = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.i);
    if (normals) g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

function addGeo(gb, geo, matrix, col, uvY = null) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  const nm = new THREE.Matrix3().getNormalMatrix(matrix);
  const base = gb.vc, v = new V3(), nn = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(matrix);
    nn.fromBufferAttribute(n, i).applyMatrix3(nm).normalize();
    gb.v(v, nn, uv ? uv.getX(i) : 0, uvY !== null ? uvY : (uv ? uv.getY(i) : 0), col);
  }
  if (geo.index) for (let i = 0; i < geo.index.count; i++) gb.i.push(base + geo.index.getX(i));
  else for (let i = 0; i < p.count; i++) gb.i.push(base + i);
}

function tube(gb, curve, segs, radial, rFn, colFn, uvRep = 2) {
  const frames = curve.computeFrenetFrames(segs, false);
  const base = gb.vc, len = curve.getLength();
  const vS = uvRep / (Math.PI * 2 * Math.max(0.02, rFn(0.4, 0)));
  const P = new V3(), dir = new V3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; curve.getPointAt(t, P);
    const Nn = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2;
      dir.set(0, 0, 0).addScaledVector(Nn, Math.cos(a)).addScaledVector(B, Math.sin(a));
      const p = P.clone().addScaledVector(dir, rFn(t, a));
      gb.v(p, dir, j / radial * uvRep, t * len * vS, colFn ? colFn(t, p) : null);
    }
  }
  const idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = base + i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const pa = gb.pos(idx[0]), pb = gb.pos(idx[1]), pc = gb.pos(idx[2]);
  const fn = new V3().subVectors(pb, pa).cross(new V3().subVectors(pc, pa));
  if (fn.dot(gb.nrm(idx[0])) < 0) for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
  for (const k of idx) gb.i.push(k);
}

function quad(gb, c, ax, ay, w, h, cell, n, col) {
  const ids = [];
  for (const [sx, sy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
    const p = c.clone().addScaledVector(ax, sx * w).addScaledVector(ay, sy * h);
    const [u, v] = cellUV(cell, sx + 0.5, sy);
    ids.push(gb.v(p, n, u, v, col));
  }
  gb.i.push(ids[0], ids[1], ids[2], ids[0], ids[2], ids[3]);
}

function strip(gb, pts, sides, widths, nrms, cell, colFn, fold = 0.12) {
  const base = gb.vc, n = pts.length;
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), w = widths[i], P = pts[i], S = sides[i], Nn = nrms[i], c = colFn(s);
    const mid = P.clone().addScaledVector(Nn, w * fold);
    let uv = cellUV(cell, 0, s); gb.v(P.clone().addScaledVector(S, -w / 2), Nn, uv[0], uv[1], c);
    uv = cellUV(cell, 0.5, s); gb.v(mid, Nn, uv[0], uv[1], c);
    uv = cellUV(cell, 1, s); gb.v(P.clone().addScaledVector(S, w / 2), Nn, uv[0], uv[1], c);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = base + i * 3, b = a + 3;
    gb.i.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
}

function frond(gb, O, az, elev, L, W, droop, cell, segs, colFn, wprof = () => 1) {
  const dirH = new V3(Math.cos(az), 0, Math.sin(az));
  const pts = [], sides = [], ws = [], ns = [];
  for (let i = 0; i <= segs; i++) {
    const s = i / segs;
    pts.push(O.clone().addScaledVector(dirH, L * s * Math.cos(elev)).add(new V3(0, L * s * Math.sin(elev) - droop * L * s * s, 0)));
  }
  for (let i = 0; i <= segs; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(segs, i + 1)];
    const T = b.clone().sub(a).normalize();
    const side = new V3().crossVectors(T, UP);
    if (side.lengthSq() < 1e-6) side.set(-dirH.z, 0, dirH.x);
    side.normalize();
    const nrm = new V3().crossVectors(side, T).normalize();
    if (nrm.y < 0) nrm.negate();
    sides.push(side); ns.push(nrm.lerp(UP, 0.4).normalize()); ws.push(W * wprof(i / segs));
  }
  strip(gb, pts, sides, ws, ns, cell, colFn);
}

const randDir = (v, rnd) => { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u); return v.set(s * Math.cos(a), u, s * Math.sin(a)); };

function leafCluster(gb, C, R, count, cell, smin, smax, flat, rnd, base) {
  const d = new V3(), tmp = new V3();
  for (let k = 0; k < count; k++) {
    randDir(d, rnd);
    const rr = R * Math.pow(rnd(), 0.4);
    const p = new V3(d.x * rr, d.y * rr * flat, d.z * rr).add(C);
    const out = p.clone().sub(C); out.y /= flat; out.normalize();
    const ay = new V3(rnd() - 0.5, 0.5 + rnd() * 0.7, rnd() - 0.5).addScaledVector(out, 0.7).normalize();
    const ax = new V3().crossVectors(ay, randDir(tmp, rnd)).normalize();
    const s = smin + rnd() * (smax - smin);
    const n = out.clone().multiplyScalar(0.8).add(new V3(0, 0.45, 0)).normalize();
    const ao = 0.42 + 0.58 * Math.min(1, rr / R) * (0.65 + 0.35 * (out.y * 0.5 + 0.5));
    const j = 0.9 + rnd() * 0.2;
    const c = typeof cell === 'function' ? cell() : cell;
    quad(gb, p.clone().addScaledVector(ay, -s * 0.5), ax, ay, s, s, c, n, [base[0] * ao * j, base[1] * ao * (0.95 + rnd() * 0.1), base[2] * ao * j]);
  }
}

function hangVine(gb, P, len, rnd) {
  const a = rnd() * Math.PI, ax = new V3(Math.cos(a), 0, Math.sin(a));
  const nrm = new V3(-ax.z, 0.3, ax.x).normalize();
  const w = 0.7 + rnd() * 0.5, k = Math.max(1, Math.round(len / 2.4)), seg = len / k;
  for (let i = 0; i < k; i++) {
    const b = P.clone().add(new V3((rnd() - 0.5) * 0.15, -seg * (i + 1), (rnd() - 0.5) * 0.15));
    quad(gb, b, ax, UP, w, seg * 1.05, 7, nrm, [0.72, 0.8, 0.68]);
  }
}

function epiphyte(gb, P, rnd) {
  const n = 6 + Math.floor(rnd() * 3);
  for (let f = 0; f < n; f++) frond(gb, P, f / n * Math.PI * 2 + rnd() * 0.4, 0.5 + rnd() * 0.5, 0.8 + rnd() * 0.4, 0.4, 0.5, 3, 3, () => [0.85, 0.95, 0.7]);
}

function branch(gb, S, D, L, r, rnd) {
  const pts = [
    S.clone(),
    S.clone().addScaledVector(D, L * 0.35).add(new V3(0, L * 0.05, 0)),
    S.clone().addScaledVector(D, L * 0.7).add(new V3((rnd() - 0.5) * 0.8, L * 0.16, (rnd() - 0.5) * 0.8)),
    S.clone().addScaledVector(D, L).add(new V3(0, L * 0.28, 0)),
  ];
  const c = new THREE.CatmullRomCurve3(pts);
  tube(gb, c, 10, 8, t => r * (1 - 0.72 * t), null, 1);
  return c;
}

function liana(gb, S, E, rnd) {
  const mid = S.clone().lerp(E, 0.5);
  mid.y -= 1.5 + rnd() * 2; mid.x += (rnd() - 0.5) * 2; mid.z += (rnd() - 0.5) * 2;
  const c = new THREE.CatmullRomCurve3([S, S.clone().lerp(mid, 0.5).add(new V3(0, -0.5, 0)), mid, E]);
  const r = 0.05 + rnd() * 0.04;
  tube(gb, c, 18, 5, () => r, () => [0.55, 0.5, 0.42], 1);
}

const LEAF_TINTS = [[0.85, 0.95, 0.62], [0.95, 1.0, 0.5], [0.72, 0.86, 0.72], [0.9, 0.92, 0.55], [0.8, 1.0, 0.6]];

function makeGiant(seed) {
  const rnd = mulberry32(seed), bark = new GB(), leaf = new GB();
  const H = 27 + rnd() * 7, R0 = 0.95 + rnd() * 0.35;
  const lx = (rnd() - 0.5) * 2.2, lz = (rnd() - 0.5) * 2.2;
  const pts = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, j = i > 0 && i < 6 ? 0.5 : 0;
    pts.push(new V3(lx * t * t + (rnd() - 0.5) * j, -1.5 + (H + 1.5) * t, lz * t * t + (rnd() - 0.5) * j));
  }
  const trunk = new THREE.CatmullRomCurve3(pts);
  const off = rnd() * 6;
  tube(bark, trunk, 30, 30, (t, a) => {
    const y = -1.5 + t * (H + 1.5);
    const bf = Math.pow(1 - smoothstep(-0.5, 6, y), 2) * 2.6 * Math.pow(Math.abs(Math.cos(a * 2.5 + off)), 5);
    return R0 * (1 - 0.55 * smoothstep(0, H, y)) * (1 + bf) + 0.04 * Math.sin(a * 9 + y * 0.7);
  }, (t, p) => { const ao = 0.5 + 0.5 * smoothstep(-1, 4, p.y); return [ao, ao, ao]; }, 3);
  const base = LEAF_TINTS[Math.floor(rnd() * 3)];
  const cl = (C, R, n, flat) => leafCluster(leaf, C, R, Math.round(n * 1.45), 1, 2.0, 3.0, flat, rnd, base);
  const nb = 5 + Math.floor(rnd() * 3);
  for (let b = 0; b < nb; b++) {
    const S = trunk.getPointAt(0.62 + rnd() * 0.3);
    const ang = b / nb * Math.PI * 2 + rnd() * 0.7;
    const D = new V3(Math.cos(ang), 0.45 + rnd() * 0.45, Math.sin(ang)).normalize();
    const E = branch(bark, S, D, 6.5 + rnd() * 5, R0 * 0.36, rnd);
    cl(E.getPointAt(1).add(new V3(0, 1.0, 0)), 3.8 + rnd() * 1.6, 95, 0.5);
    const mid = E.getPointAt(0.55);
    cl(mid.clone().add(new V3(0, 1.6, 0)), 2.8, 45, 0.55);
    if (rnd() < 0.8) {
      const D2 = D.clone().applyAxisAngle(UP, (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.5)); D2.y += 0.2; D2.normalize();
      const E2 = branch(bark, mid, D2, 3.5 + rnd() * 2, R0 * 0.16, rnd);
      cl(E2.getPointAt(1).add(new V3(0, 0.8, 0)), 2.6 + rnd(), 50, 0.55);
    }
    if (rnd() < 0.85) { const nv = 1 + Math.floor(rnd() * 2); for (let k = 0; k < nv; k++) hangVine(leaf, E.getPointAt(0.3 + rnd() * 0.6), 4 + rnd() * 9, rnd); }
    if (rnd() < 0.5) epiphyte(leaf, E.getPointAt(0.12 + rnd() * 0.2), rnd);
  }
  cl(trunk.getPointAt(1).add(new V3(0, 1.6, 0)), 4.2, 80, 0.5);
  for (let k = 0; k < 2; k++) {
    const S = trunk.getPointAt(0.55 + rnd() * 0.35), a = rnd() * Math.PI * 2, d = 3 + rnd() * 4;
    liana(bark, S, new V3(Math.cos(a) * d, -0.3, Math.sin(a) * d), rnd);
  }
  return { bark: bark.build(true), leaf: leaf.build(), H, R0 };
}

function makeMedium(seed) {
  const rnd = mulberry32(seed), bark = new GB(), leaf = new GB();
  const H = 8 + rnd() * 6, R0 = 0.2 + rnd() * 0.14;
  const lx = (rnd() - 0.5) * 1.6, lz = (rnd() - 0.5) * 1.6;
  const pts = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(new V3(lx * t * t + (i % 2 ? (rnd() - 0.5) * 0.3 : 0), -0.6 + (H + 0.6) * t, lz * t * t)); }
  const trunk = new THREE.CatmullRomCurve3(pts);
  const off = rnd() * 6;
  tube(bark, trunk, 16, 12, (t, a) => {
    const y = -0.6 + t * (H + 0.6);
    return R0 * (1 - 0.5 * t) * (1 + Math.pow(1 - smoothstep(-0.3, 1.5, y), 2) * 0.8 * Math.pow(Math.abs(Math.cos(a * 2 + off)), 3));
  }, (t, p) => { const ao = 0.55 + 0.45 * smoothstep(-0.5, 3, p.y); return [ao, ao, ao]; }, 2);
  const base = LEAF_TINTS[Math.floor(rnd() * LEAF_TINTS.length)];
  const cellPick = () => (rnd() < 0.6 ? 1 : 0);
  const nb = 3 + Math.floor(rnd() * 3);
  for (let b = 0; b < nb; b++) {
    const S = trunk.getPointAt(0.55 + rnd() * 0.35);
    const ang = b / nb * Math.PI * 2 + rnd() * 0.8;
    const D = new V3(Math.cos(ang), 0.6 + rnd() * 0.5, Math.sin(ang)).normalize();
    const E = branch(bark, S, D, 2.5 + rnd() * 2, R0 * 0.45, rnd);
    leafCluster(leaf, E.getPointAt(1).add(new V3(0, 0.5, 0)), 2.0 + rnd() * 0.9, 66, cellPick, 1.3, 2.1, 0.65, rnd, base);
  }
  leafCluster(leaf, trunk.getPointAt(1).add(new V3(0, 0.8, 0)), 2.4, 70, cellPick, 1.3, 2.1, 0.65, rnd, base);
  if (rnd() < 0.4) hangVine(leaf, trunk.getPointAt(0.8).add(new V3(0.6, 0, 0)), 3 + rnd() * 4, rnd);
  return { bark: bark.build(true), leaf: leaf.build(), H };
}

function makePalm(seed) {
  const rnd = mulberry32(seed), bark = new GB(), leaf = new GB();
  const H = 8 + rnd() * 5, la = rnd() * Math.PI * 2, lean = 1.2 + rnd() * 2.6;
  const pts = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new V3(Math.cos(la) * lean * Math.pow(t, 1.6), -0.8 + (H + 0.8) * t, Math.sin(la) * lean * Math.pow(t, 1.6))); }
  const curve = new THREE.CatmullRomCurve3(pts);
  tube(bark, curve, 28, 10, (t) => 0.24 * (1 - 0.3 * t) + 0.035 * Math.max(0, Math.sin(t * H * 6.5)) + 0.18 * Math.pow(1 - smoothstep(0, 0.08, t), 2),
    (t) => { const c = 0.75 + 0.25 * t; return [c * 1.05, c, c * 0.9]; }, 2);
  const top = curve.getPointAt(1);
  addGeo(bark, new THREE.SphereGeometry(0.34, 10, 8), new THREE.Matrix4().makeTranslation(top.x, top.y + 0.1, top.z), [0.55, 0.6, 0.35]);
  const nc = 3 + Math.floor(rnd() * 5);
  for (let k = 0; k < nc; k++) {
    const a = rnd() * Math.PI * 2;
    addGeo(bark, new THREE.SphereGeometry(0.15, 8, 6), new THREE.Matrix4().makeTranslation(top.x + Math.cos(a) * 0.32, top.y - 0.25 - rnd() * 0.2, top.z + Math.sin(a) * 0.32), rnd() < 0.5 ? [0.45, 0.38, 0.22] : [0.42, 0.52, 0.2]);
  }
  const nf = 13 + Math.floor(rnd() * 5);
  const col = [0.9 + rnd() * 0.1, 0.95, 0.72 + rnd() * 0.18];
  const O = top.clone().add(new V3(0, 0.15, 0));
  for (let f = 0; f < nf; f++) {
    const young = f % 5 === 0;
    const az = f / nf * Math.PI * 2 + rnd() * 0.35;
    frond(leaf, O, az, young ? 0.9 + rnd() * 0.3 : 0.05 + rnd() * 0.6, (young ? 3.5 : 4.3) + rnd() * 1.3, 1.7, young ? 0.2 : 0.5 + rnd() * 0.35, 2, 8,
      s => { const c = 0.62 + 0.38 * s; return [col[0] * c, col[1] * c, col[2] * c]; }, s => (s < 0.1 ? 0.25 + s * 7.5 : 1));
  }
  for (let k = 0; k < 2; k++) frond(leaf, O, rnd() * Math.PI * 2, -1.0, 2.8, 1.1, 0.05, 2, 4, () => [0.85, 0.6, 0.32]);
  return { bark: bark.build(true), leaf: leaf.build(), H };
}

function makeBanana(seed) {
  const rnd = mulberry32(seed), stem = new GB(), leaf = new GB();
  const Hs = 1.8 + rnd() * 0.9;
  const c = new THREE.CatmullRomCurve3([new V3(0, -0.3, 0), new V3(0.05, Hs * 0.5, 0), new V3(0, Hs, 0.05)]);
  tube(stem, c, 6, 10, t => 0.14 * (1 - 0.35 * t), t => [0.45 + 0.2 * t, 0.55 + 0.1 * t, 0.25], 1);
  const nl = 7 + Math.floor(rnd() * 3);
  for (let k = 0; k < nl; k++) {
    frond(leaf, new V3(0, Hs * (0.85 + rnd() * 0.15), 0), k / nl * Math.PI * 2 + rnd() * 0.5, 0.5 + rnd() * 0.7, 2.0 + rnd() * 0.9, 0.95, 0.4 + rnd() * 0.3, 5, 6,
      () => [0.95, 1, 0.85], s => (s < 0.12 ? 0.15 : 1));
  }
  return { stem: stem.build(true), leaf: leaf.build(), top: Hs };
}

function makeBunch() {
  const gb = new GB();
  addGeo(gb, new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6).translate(0, -0.45, 0), new THREE.Matrix4(), [0.35, 0.45, 0.18]);
  const cap = new THREE.CapsuleGeometry(0.028, 0.13, 3, 6);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();
  for (let t = 0; t < 4; t++) for (let f = 0; f < 7; f++) {
    const a = f / 7 * Math.PI * 2 + t * 0.4;
    E.set(-0.9, a, 0, 'YXZ'); Q.setFromEuler(E);
    M.compose(new V3(Math.sin(a) * 0.08, -0.15 - t * 0.17, Math.cos(a) * 0.08), Q, new V3(1, 1, 1));
    const g = t / 3;
    addGeo(gb, cap, M, [0.9 - g * 0.35, 0.82 - g * 0.1, 0.18]);
  }
  return gb.build();
}

function makeFern(seed) {
  const rnd = mulberry32(seed), leaf = new GB();
  const nf = 12 + Math.floor(rnd() * 5);
  for (let f = 0; f < nf; f++) frond(leaf, new V3(0, 0.05, 0), f / nf * Math.PI * 2 + rnd() * 0.4, 0.55 + rnd() * 0.6, 1.0 + rnd() * 0.7, 0.5, 0.55 + rnd() * 0.3, 3, 5,
    s => [0.8 + 0.2 * s, 0.9 + 0.1 * s, 0.7 + 0.2 * s]);
  return leaf.build();
}

function makeMonstera(seed) {
  const rnd = mulberry32(seed), leaf = new GB();
  const nl = 6 + Math.floor(rnd() * 3);
  for (let k = 0; k < nl; k++) frond(leaf, new V3(0, 0, 0), k / nl * Math.PI * 2 + rnd() * 0.6, 1.25 - rnd() * 0.35, 1.5 + rnd() * 0.6, 1.0, 0.55, 4, 5, () => [0.95, 1, 0.95]);
  return leaf.build();
}

function makeBush(seed) {
  const rnd = mulberry32(seed), leaf = new GB();
  const base = LEAF_TINTS[Math.floor(rnd() * LEAF_TINTS.length)];
  for (let k = 0; k < 3; k++) {
    leafCluster(leaf, new V3((rnd() - 0.5) * 1.2, 0.55 + rnd() * 0.4, (rnd() - 0.5) * 1.2), 0.8 + rnd() * 0.35, 22, () => (rnd() < 0.5 ? 0 : 1), 0.55, 0.95, 0.75, rnd, base);
  }
  return leaf.build();
}

function makeHeliconia(seed) {
  const rnd = mulberry32(seed), plant = new GB(), leaf = new GB();
  const c = new THREE.CatmullRomCurve3([new V3(0, -0.1, 0), new V3(0.05, 0.8, 0), new V3(0, 1.55, 0.05)]);
  tube(plant, c, 6, 6, () => 0.025, () => [0.3, 0.45, 0.15], 1);
  const cone = new THREE.ConeGeometry(0.055, 0.24, 8), tip = new THREE.ConeGeometry(0.03, 0.08, 6);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1, y = 1.5 - i * 0.11;
    Q.setFromEuler(new THREE.Euler(0, 0, side * 1.15));
    M.compose(new V3(side * 0.09, y, 0), Q, new V3(1, 1, 1));
    addGeo(plant, cone, M, [0.85, 0.08, 0.05]);
    M.compose(new V3(side * 0.19, y + 0.05, 0), Q, new V3(1, 1, 1));
    addGeo(plant, tip, M, [0.95, 0.78, 0.1]);
  }
  for (let k = 0; k < 3; k++) frond(leaf, new V3(0, 0.3 + rnd() * 0.5, 0), k / 3 * Math.PI * 2 + rnd(), 0.7 + rnd() * 0.4, 1.4, 0.45, 0.35, 5, 4, () => [0.9, 1, 0.8]);
  return { plant: plant.build(), leaf: leaf.build() };
}

function makeMushrooms(seed) {
  const rnd = mulberry32(seed), gb = new GB();
  const n = 3 + Math.floor(rnd() * 3);
  for (let k = 0; k < n; k++) {
    const x = (rnd() - 0.5) * 0.4, z = (rnd() - 0.5) * 0.4, h = 0.08 + rnd() * 0.12, r = 0.04 + rnd() * 0.05;
    addGeo(gb, new THREE.CylinderGeometry(r * 0.3, r * 0.4, h, 6).translate(0, h / 2, 0), new THREE.Matrix4().makeTranslation(x, 0, z), [0.85, 0.82, 0.7], 0);
    addGeo(gb, new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1), new THREE.Matrix4().makeTranslation(x, h, z), rnd() < 0.5 ? [0.8, 0.45, 0.22] : [0.86, 0.78, 0.6], 1);
  }
  return gb.build();
}

function makeFlower() {
  const gb = new GB();
  addGeo(gb, new THREE.CylinderGeometry(0.006, 0.008, 0.32, 4).translate(0, 0.16, 0), new THREE.Matrix4(), [0.35, 0.5, 0.2]);
  const sh = new THREE.Shape();
  for (let i = 0; i <= 40; i++) {
    const a = i / 40 * Math.PI * 2, r = 0.045 * (0.5 + 0.5 * Math.abs(Math.cos(2.5 * a)));
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const head = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2 + 0.3);
  addGeo(gb, head, new THREE.Matrix4().makeTranslation(0, 0.32, 0), [1, 1, 1]);
  addGeo(gb, new THREE.SphereGeometry(0.013, 6, 4), new THREE.Matrix4().makeTranslation(0, 0.325, 0), [1, 0.8, 0.15]);
  return gb.build();
}

function makeLotus() {
  const gb = new GB();
  const pet = new THREE.SphereGeometry(1, 8, 6);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let ring = 0; ring < 2; ring++) for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + ring * 0.4;
    Q.setFromEuler(new THREE.Euler(ring ? 0.7 : 1.0, a, 0, 'YXZ'));
    const off = new V3(0, 0.06, 0.06).applyQuaternion(Q);
    M.compose(off, Q, new V3(0.035, 0.015, 0.09));
    addGeo(gb, pet, M, ring ? [1, 0.72, 0.82] : [1, 0.55, 0.7]);
  }
  addGeo(gb, new THREE.SphereGeometry(0.03, 8, 6), new THREE.Matrix4().makeTranslation(0, 0.05, 0), [1, 0.85, 0.2]);
  return gb.build();
}

function makeRock(seed, detail = 3) {
  const rnd = mulberry32(seed);
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position, v = new V3(), ox = rnd() * 100, oz = rnd() * 100;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.22 * simplex2(v.x * 1.3 + ox, v.y * 1.3 + v.z * 0.9) + 0.12 * simplex2(v.z * 2.6 + oz, v.x * 2.6 - v.y) + 0.05 * simplex2(v.x * 6 + v.z * 3, v.y * 6);
    v.multiplyScalar(n); v.y *= 0.62;
    if (v.y < -0.25) v.y = -0.25 + (v.y + 0.25) * 0.2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function makeGrassClump(rnd, blades = 9, hMul = 1) {
  const gb = new GB();
  for (let b = 0; b < blades; b++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.28;
    const base = new V3(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = (0.32 + rnd() * 0.42) * hMul, w = 0.04 + rnd() * 0.028;
    const face = rnd() * Math.PI * 2;
    const side = new V3(Math.cos(face), 0, Math.sin(face));
    const lean = new V3(-side.z, 0, side.x).multiplyScalar(0.15 + rnd() * 0.3);
    const ids = [];
    for (let s = 0; s <= 4; s++) {
      const t = s / 4, wd = w * (1 - t * 0.95);
      const p = base.clone().addScaledVector(lean, t * t * h).add(new V3(0, h * t, 0));
      ids.push(gb.v(p.clone().addScaledVector(side, -wd / 2), UP, 0, t, null));
      ids.push(gb.v(p.clone().addScaledVector(side, wd / 2), UP, 1, t, null));
    }
    for (let s = 0; s < 4; s++) { const a0 = ids[s * 2], b0 = ids[s * 2 + 1], a1 = ids[s * 2 + 2], b1 = ids[s * 2 + 3]; gb.i.push(a0, b0, a1, b0, b1, a1); }
  }
  return gb.build();
}

// Egy anyag = egy BatchedMesh = egy rajzolási hívás (multi-draw), példányonkénti látótér- és távolság-vágással
class Batch {
  constructor(mat, opts = {}) { this.mat = mat; this.opts = opts; this.items = []; this.inst = []; this.frac = 1; this.rMul = 1; this.isGrass = !!opts.grass; }
  add(geo, list, R = Infinity, sMul = 1) { if (list.length) this.items.push({ geo, list, R, sMul }); }
  build(scene) {
    let nI = 0, nV = 0, nX = 0;
    for (const it of this.items) { nI += it.list.length; nV += it.geo.attributes.position.count; nX += it.geo.index.count; }
    if (!nI) return;
    const bm = this.mesh = new THREE.BatchedMesh(nI, nV, nX, this.mat);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new V3(), S = new V3(), W = new THREE.Color(1, 1, 1);
    let rank = 0;
    for (const it of this.items) {
      const gid = bm.addGeometry(it.geo);
      for (const o of it.list) {
        const id = bm.addInstance(gid);
        E.set(o.rx || 0, o.ry || 0, o.rz || 0); Q.setFromEuler(E);
        const s = o.s * it.sMul;
        P.set(o.x, o.y, o.z); S.set(s * (o.sx || 1), s * (o.sy || 1), s * (o.sz || 1));
        M.compose(P, Q, S); bm.setMatrixAt(id, M);
        bm.setColorAt(id, o.c || W);
        this.inst.push({ id, x: o.x, z: o.z, R: it.R, r: ((rank++) * 0.61803398875) % 1 });
      }
    }
    bm.castShadow = !!this.opts.cast; bm.receiveShadow = true;
    if (this.opts.depth) bm.customDepthMaterial = this.opts.depth;
    bm.sortObjects = this.opts.sort !== false;
    bm.perObjectFrustumCulled = this.opts.cull !== false;
    bm.computeBoundingSphere();
    scene.add(bm);
  }
  update(px, pz) {
    if (!this.mesh) return;
    for (const o of this.inst) {
      let vis = o.r < this.frac;
      if (vis && o.R !== Infinity) { const R = o.R * this.rMul, dx = o.x - px, dz = o.z - pz; vis = dx * dx + dz * dz < R * R; }
      this.mesh.setVisibleAt(o.id, vis);
    }
  }
}

function makeInst(geo, mat, list, opts = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new V3(), S = new V3();
  list.forEach((o, i) => {
    E.set(o.rx || 0, o.ry || 0, o.rz || 0); Q.setFromEuler(E);
    P.set(o.x, o.y, o.z); S.set(o.s * (o.sx || 1), o.s * (o.sy || 1), o.s * (o.sz || 1));
    M.compose(P, Q, S); m.setMatrixAt(i, M);
    if (opts.colors) m.setColorAt(i, o.c || new THREE.Color(1, 1, 1));
  });
  m.count = list.length;
  m.castShadow = !!opts.cast; m.receiveShadow = opts.recv !== false;
  if (opts.depth) m.customDepthMaterial = opts.depth;
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.computeBoundingSphere();
  m.userData.full = list.length;
  return m;
}

class Occ {
  constructor(cell = 4) { this.c = cell; this.m = new Map(); }
  key(i, j) { return (i + 1000) * 4000 + (j + 1000); }
  add(x, z, r) { const k = this.key(Math.floor(x / this.c), Math.floor(z / this.c)); let a = this.m.get(k); if (!a) { a = []; this.m.set(k, a); } a.push(x, z, r); }
  free(x, z, r) {
    const span = Math.ceil((r + 8) / this.c), i0 = Math.floor(x / this.c), j0 = Math.floor(z / this.c);
    for (let i = i0 - span; i <= i0 + span; i++) for (let j = j0 - span; j <= j0 + span; j++) {
      const a = this.m.get(this.key(i, j)); if (!a) continue;
      for (let k = 0; k < a.length; k += 3) { const dx = a[k] - x, dz = a[k + 1] - z, rr = a[k + 2] + r; if (dx * dx + dz * dz < rr * rr) return false; }
    }
    return true;
  }
}

// Valódi modell-változatok szétosztása egy batch-be (lista elemei körbeforgó változattal)
function addModel(batch, geos, list, R, sMul) {
  geos.forEach((g, k) => batch.add(g, list.filter((_, i) => i % geos.length === k), R, sMul));
}

export async function buildFlora(scene, T, atlas, barkTex, progress, pbr = null, PL = null) {
  // pbr: fotós textúrák (kéreg, pálmakéreg, mohás szikla), ha betöltődtek
  const BX = pbr ? { bark: pbr.bark_brown_02, palm: pbr.palm_tree_bark, rock: pbr.mossy_rock } : { bark: barkTex, palm: barkTex, rock: null };
  const rnd = mulberry32(2024);
  const colliders = [];
  const trees = new Occ(4);
  const streams = [];
  const treeMeshes = [];
  const out = { colliders, streams, treeMeshes, bananas: [], logs: [] };

  const ground = (x, z, o = {}) => {
    if (Math.hypot(x, z) > (o.maxR ?? 186)) return null;
    const h = T.heightAt(x, z), lvl = T.waterLevelAt(x, z);
    if (h < lvl + (o.above ?? 0.35)) return null;
    if (T.slopeAt(x, z) > (o.slope ?? 0.5)) return null;
    if (T.pathAt(x, z) > (o.path ?? 0.3)) return null;
    if (Math.hypot(x - CAMP.x, z - CAMP.z) < (o.camp ?? 9)) return null;
    if (Math.hypot(x - 2, z - 18) < (o.spawn ?? 4)) return null;
    // a templomrom alapterülete: fák messzebb, aljnövényzet a falakig, a lépcső előtti tér szabad
    const tx = Math.abs(x - TEMPLE.x), tz = z - TEMPLE.z;
    if (Math.hypot(x - NAPKAPU.x, z - NAPKAPU.z) < (o.big ? 17 : 10.5)) return null; // a Napkapu köre
    if (!o.grass && ledgeDist(x, z) < (o.big ? 3 : 1.4)) return null; // a párkány járható maradjon
    if (o.big ? Math.hypot(tx, tz) < 20 : Math.max(tx, Math.abs(tz)) < 13.6 || (tx < 6 && tz > 0 && tz < 23)) return null;
    return h;
  };
  const rx = () => -186 + rnd() * 372;
  const nearWater = (x, z) => {
    const dp = Math.hypot(x - POND.x, z - POND.z) - POND.r;
    const dr = z > -60 ? polyInfo(x, z, RIVER).d - 4 : 99;
    return smoothstep(14, 2, Math.min(dp, dr));
  };

  // --- Óriásfák
  progress('Óriásfák növesztése');
  await tick();
  const fol = {
    giant: foliageMat(atlas, 0.0005, 0.05),
    medium: foliageMat(atlas, 0.0025, 0.05),
    palm: foliageMat(atlas, 0.004, 0.07),
    ground: foliageMat(atlas, 0.05, 0.02),
    still: foliageMat(atlas, 0, 0),
  };
  out.fol = fol;
  const bark = {
    giant: barkMat(BX.bark, fol.giant.u),
    medium: barkMat(BX.bark, fol.medium.u),
    palm: barkMat(BX.palm, fol.palm.u),
    still: barkMat(BX.bark, null),
  };
  out.bark = bark;
  const BT = {
    gBark: new Batch(bark.giant, { cast: true }),
    gLeaf: new Batch(fol.giant.mat, { cast: true, depth: fol.giant.depth }),
    pBark: new Batch(bark.palm, { cast: true }),
    pLeaf: new Batch(fol.palm.mat, { cast: true, depth: fol.palm.depth }),
    mBark: new Batch(bark.medium, { cast: true }),
    mLeaf: new Batch(fol.medium.mat, { cast: true, depth: fol.medium.depth }),
  };
  const giants = [0, 1, 2].map(i => makeGiant(100 + i * 17));
  const gLists = [[], [], []];
  const heroes = [[-27, -24], [33, -20], [-31, 14], [29, 26], [-18, -50], [36, -48], [-40, -8]];
  const placeGiant = (x, z, forced) => {
    const h = ground(x, z, { big: 1, slope: 0.42, path: 0.15, camp: 14 });
    if (h === null) return false;
    const v = Math.floor(rnd() * 3), s = 0.85 + rnd() * 0.35, r = giants[v].R0 * s * 1.6;
    if (!trees.free(x, z, r + (forced ? 2 : 4))) return false;
    trees.add(x, z, r + 1); colliders.push({ x, z, r });
    const c = new THREE.Color().setRGB(0.85 + rnd() * 0.2, 0.9 + rnd() * 0.15, 0.8 + rnd() * 0.25);
    gLists[v].push({ x, y: h - 0.4, z, ry: rnd() * Math.PI * 2, s, c });
    out.logs.push({ x, z, r: giants[v].R0 * s, y: h - 0.4, H: giants[v].H * s });
    return true;
  };
  for (const [x, z] of heroes) placeGiant(x, z, true);
  for (let a = 0, n = 0; a < 9000 && n < 125; a++) {
    const x = rx(), z = rx();
    if (rnd() > Math.pow(T.forestAt(x, z), 1.5)) continue;
    if (placeGiant(x, z, false)) n++;
  }
  giants.forEach((g, i) => { BT.gBark.add(g.bark, gLists[i]); BT.gLeaf.add(g.leaf, gLists[i]); });

  // --- Pálmák
  progress('Pálmák és fák');
  await tick();
  const palms = [0, 1, 2, 3].map(i => makePalm(300 + i * 11));
  const pLists = [[], [], [], []];
  for (let a = 0, n = 0; a < 9000 && n < 210; a++) {
    const x = rx(), z = rx();
    const f = T.forestAt(x, z);
    const p = 0.12 + 0.9 * nearWater(x, z) + (f > 0.05 && f < 0.6 ? 0.35 : 0);
    if (rnd() > p) continue;
    const h = ground(x, z, { big: 1, above: 0.5, slope: 0.45, path: 0.2 });
    if (h === null || !trees.free(x, z, 2.2)) continue;
    trees.add(x, z, 1.2); colliders.push({ x, z, r: 0.38 });
    const v = Math.floor(rnd() * 4);
    (out.palms ||= []).push({ x, z, y: h });
    pLists[v].push({ x, y: h - 0.2, z, ry: rnd() * Math.PI * 2, s: 0.85 + rnd() * 0.3, c: new THREE.Color().setRGB(0.9 + rnd() * 0.15, 0.95 + rnd() * 0.1, 0.85 + rnd() * 0.2) });
    n++;
  }
  palms.forEach((g, i) => { BT.pBark.add(g.bark, pLists[i]); BT.pLeaf.add(g.leaf, pLists[i]); });

  // --- Közepes fák
  const meds = [0, 1, 2, 3].map(i => makeMedium(500 + i * 23));
  const mLists = [[], [], [], []];
  for (let a = 0, n = 0; a < 28000 && n < 1050; a++) {
    const x = rx(), z = rx();
    if (rnd() > T.forestAt(x, z) * 1.1) continue;
    const h = ground(x, z, { big: 1, slope: 0.48, path: 0.2, camp: 12 });
    if (h === null || !trees.free(x, z, 2.1)) continue;
    trees.add(x, z, 1.4); colliders.push({ x, z, r: 0.42 });
    const v = Math.floor(rnd() * 4);
    const ms = 0.8 + rnd() * 0.45;
    (out.mediums ||= []).push({ x, z, y: h - 0.3, H: meds[v].H * ms });
    mLists[v].push({ x, y: h - 0.3, z, ry: rnd() * Math.PI * 2, s: ms, c: new THREE.Color().setRGB(0.85 + rnd() * 0.25, 0.9 + rnd() * 0.15, 0.8 + rnd() * 0.3) });
    n++;
  }
  meds.forEach((g, i) => { BT.mBark.add(g.bark, mLists[i]); BT.mLeaf.add(g.leaf, mLists[i]); });

  // --- Banánok + fürtök
  progress('Banánok és aljnövényzet');
  await tick();
  const ban = [0, 1].map(i => makeBanana(700 + i * 5));
  const bunchGeo = makeBunch();
  const plant = plantMat(0.03), still = plantMat(0), mush = plantMat(0, 1);
  out.plant = plant;
  const bLists = [[], []], bunchList = [];
  for (let a = 0, n = 0; a < 8000 && n < 120; a++) {
    const x = rx(), z = rx();
    const f = T.forestAt(x, z);
    const p = (f > 0.08 && f < 0.75 ? 0.6 : 0.05) + nearWater(x, z) * 0.4;
    if (Math.hypot(x, z) > 120 || rnd() > p) continue;
    const h = ground(x, z, { big: 1, slope: 0.4, path: 0.15 });
    if (h === null || !trees.free(x, z, 1.4)) continue;
    trees.add(x, z, 0.9); colliders.push({ x, z, r: 0.28 });
    const v = Math.floor(rnd() * 2), s = 0.85 + rnd() * 0.3, ry = rnd() * Math.PI * 2;
    bLists[v].push({ x, y: h - 0.1, z, ry, s });
    if (rnd() < 0.6) {
      const top = ban[v].top * s;
      const bx = x + Math.cos(ry) * 0.25, bz = z - Math.sin(ry) * 0.25;
      out.bananas.push({ x: bx, y: h + top * 0.92, z: bz, i: bunchList.length, eaten: false });
      bunchList.push({ x: bx, y: h + top * 0.95, z: bz, ry, s: 1 });
    }
    n++;
  }
  BT.stems = new Batch(plant, { cast: true });
  ban.forEach((g, i) => { BT.stems.add(g.stem, bLists[i]); BT.pLeaf.add(g.leaf, bLists[i]); });
  out.bunchMesh = makeInst(bunchGeo, still, bunchList, { cast: true });
  scene.add(out.bunchMesh);

  // --- Heliconia
  const hel = makeHeliconia(900);
  const hList = [];
  for (let a = 0, n = 0; a < 4000 && n < 90; a++) {
    const x = -70 + rnd() * 140, z = -90 + rnd() * 160;
    const f = T.forestAt(x, z);
    if (!(f > 0.05 && f < 0.7) || rnd() > 0.7) continue;
    const h = ground(x, z, { slope: 0.4, path: 0.2 });
    if (h === null || !trees.free(x, z, 0.6)) continue;
    hList.push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5 }); n++;
  }
  const SB = {
    ground: new Batch(fol.ground.mat, { cull: false, sort: false }),
    small: new Batch(plant, { cull: false, sort: false }),
    mush: new Batch(mush, { cull: false, sort: false }),
    grass: null,
  };
  SB.small.add(hel.plant, hList, 100);
  SB.ground.add(hel.leaf, hList, 100);

  // --- Bokrok, páfrányok, monsterák (távolság szerint vágva)
  const mkStream = (geo, mat, list, opts) => {
    const b = mat === fol.ground.mat ? SB.ground : mat === plant ? SB.small : mat === mush ? SB.mush : SB.grass;
    b.add(geo, list, opts.R);
  };
  const bushGeos = [0, 1, 2].map(i => makeBush(1100 + i));
  const bushL = [[], [], []];
  for (let a = 0, n = 0; a < 14000 && n < 2400; a++) {
    const x = rx(), z = rx();
    if (rnd() > T.forestAt(x, z) * 0.95 + 0.04) continue;
    const h = ground(x, z, { slope: 0.55, path: 0.25, camp: 8 });
    if (h === null || !trees.free(x, z, 0.4)) continue;
    const v = Math.floor(rnd() * 3), s = 0.7 + rnd() * 0.8;
    bushL[v].push({ x, y: h - 0.1, z, ry: rnd() * 6.28, s, c: new THREE.Color().setRGB(0.8 + rnd() * 0.3, 0.85 + rnd() * 0.2, 0.75 + rnd() * 0.3) });
    n++;
  }
  bushGeos.forEach((g, i) => mkStream(g, fol.ground.mat, bushL[i], { R: 110 }));

  progress('Páfrányok kibontása');
  await tick();
  const fernGeos = [0, 1].map(i => makeFern(1200 + i));
  const fernL = [[], []];
  for (let a = 0, n = 0; a < 16000 && n < 3600; a++) {
    const x = rx(), z = rx();
    const p = T.forestAt(x, z) * 0.85 + nearWater(x, z) * 0.15 + 0.05;
    if (rnd() > p) continue;
    const h = ground(x, z, { slope: 0.6, path: 0.35, camp: 7, above: 0.2 });
    if (h === null || !trees.free(x, z, 0.2)) continue;
    fernL[n % 2].push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.7, c: new THREE.Color().setRGB(0.85 + rnd() * 0.25, 0.9 + rnd() * 0.2, 0.8 + rnd() * 0.25) });
    n++;
  }
  if (!PL) fernGeos.forEach((g, i) => mkStream(g, fol.ground.mat, fernL[i], { R: 85 }));

  const monGeos = [0, 1].map(i => makeMonstera(1300 + i));
  const monL = [[], []];
  for (let a = 0, n = 0; a < 8000 && n < 800; a++) {
    const x = rx(), z = rx();
    if (rnd() > T.forestAt(x, z)) continue;
    const h = ground(x, z, { slope: 0.5, path: 0.25 });
    if (h === null || !trees.free(x, z, 0.5)) continue;
    monL[n % 2].push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.6 }); n++;
  }
  if (!PL) monGeos.forEach((g, i) => mkStream(g, fol.ground.mat, monL[i], { R: 95 }));

  // --- Fű
  progress('Fű ültetése');
  await tick();
  const gMat = grassMat();
  out.grassMat = gMat;
  SB.grass = new Batch(gMat, { grass: true, sort: false, cull: false });
  const grassGeo = makeGrassClump(mulberry32(5), 9);
  const gList = [];
  const addGrass = (x, z) => {
    const h = ground(x, z, { slope: 0.5, path: 0.55, camp: 2.2, spawn: 0, above: 0.15 });
    if (h === null) return;
    const s = 0.8 + rnd() * 0.45;
    const c = new THREE.Color().setRGB(0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.85 + rnd() * 0.2);
    gList.push({ x, y: h - 0.03, z, ry: rnd() * 6.28, s, sy: 0.75 + rnd() * 0.5, c });
  };
  for (let a = 0; a < 30000; a++) {
    const x = -38 + rnd() * 86, z = -64 + rnd() * 110;
    const f = T.forestAt(x, z);
    if (rnd() > Math.pow(1 - f, 2)) continue;
    addGrass(x, z);
  }
  for (let a = 0; a < 26000; a++) {
    const x = rx(), z = rx();
    const p = 0.05 + nearWater(x, z) * 0.35 + (1 - T.forestAt(x, z)) * 0.3;
    if (rnd() > p) continue;
    addGrass(x, z);
  }
  mkStream(grassGeo, gMat, gList, { R: 60 });

  const reedGeo = makeGrassClump(mulberry32(9), 7, 2.4);
  const rList = [];
  for (let a = 0; a < 9000 && rList.length < 900; a++) {
    const x = rx(), z = rx();
    const h = T.heightAt(x, z), lvl = T.waterLevelAt(x, z);
    if (h < lvl - 0.25 || h > lvl + 0.55 || Math.hypot(x, z) > 180) continue;
    if (Math.hypot(x - T.impact.x, z - T.impact.z) < 5) continue;
    rList.push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.5, c: new THREE.Color().setRGB(0.7 + rnd() * 0.2, 0.8, 0.55 + rnd() * 0.15) });
  }
  mkStream(reedGeo, gMat, rList, { R: 80 });

  // --- Virágok
  const flowerGeo = makeFlower();
  const FCOL = [[1, 1, 1], [1, 0.85, 0.2], [1, 0.45, 0.6], [0.75, 0.5, 1], [1, 0.5, 0.15]];
  const flL = [];
  for (let a = 0; a < 26000 && flL.length < 2200; a++) {
    const x = -40 + rnd() * 90, z = -64 + rnd() * 112;
    if (rnd() > T.flowerAt(x, z) * 0.9 + 0.02) continue;
    const h = ground(x, z, { slope: 0.4, path: 0.3, camp: 3, spawn: 1.5 });
    if (h === null) continue;
    const fc = FCOL[Math.floor(rnd() * FCOL.length)];
    flL.push({ x, y: h - 0.02, z, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.7, c: new THREE.Color().setRGB(fc[0], fc[1], fc[2]) });
  }
  mkStream(flowerGeo, plant, flL, { R: 55 });

  // --- Gombák (éjjel világítanak)
  const mushGeos = [0, 1].map(i => makeMushrooms(1500 + i));
  const muL = [[], []];
  for (const t of out.logs) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.28, d = t.r * (1.6 + rnd() * 1.5), x = t.x + Math.cos(a) * d, z = t.z + Math.sin(a) * d;
      const h = T.heightAt(x, z);
      muL[k % 2].push({ x, y: h - 0.02, z, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.8 });
    }
  }
  for (let a = 0; a < 3000 && muL[0].length + muL[1].length < 420; a++) {
    const x = rx(), z = rx();
    if (rnd() > T.forestAt(x, z)) continue;
    const h = ground(x, z, { slope: 0.5 });
    if (h === null) continue;
    muL[a % 2].push({ x, y: h - 0.02, z, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.9 });
  }
  mushGeos.forEach((g, i) => mkStream(g, mush, muL[i], { R: 70 }));

  // --- Sziklák
  progress('Sziklák és kúszónövények');
  await tick();
  const rMat = BX.rock ? rockMatPBR(BX.rock) : rockMat();
  out.rockMat = rMat;
  out.rockTex = BX.rock;
  const rocks = [0, 1, 2, 3, 4].map(i => makeRock(1700 + i * 3));
  const rkL = [[], [], [], [], []];
  const addRock = (x, z, s, sink = 0.3, flatY = 1) => {
    if (ledgeDist(x, z) < s + 1.0 || Math.hypot(x - CAVE_MOUTH.x, z - CAVE_MOUTH.z) < s + 2.2) return; // a párkány és a barlangszáj szabadon marad
    const h = T.heightAt(x, z);
    const g = 0.75 + rnd() * 0.35;
    rkL[Math.floor(rnd() * 5)].push({ x, y: h - s * sink, z, ry: rnd() * 6.28, rx: (rnd() - 0.5) * 0.3, rz: (rnd() - 0.5) * 0.3, s, sy: flatY, c: new THREE.Color(g, g * (0.97 + rnd() * 0.05), g * 0.95) });
    if (s > 0.7) colliders.push({ x, z, r: s * 0.85, h: s * 1.3 });
  };
  for (let k = 0; k < 30; k++) {
    const a = rnd() * Math.PI * 2, d = POND.r + rnd() * 3.5 - 1.2;
    const x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d;
    if (Math.hypot(x - T.impact.x, z - T.impact.z) < 4) continue;
    addRock(x, z, 0.5 + rnd() * 1.4);
  }
  for (let x = -70; x < 90; x += 2.5 + rnd() * 4) {
    if (Math.abs(x - 10) < 4.5) continue;
    const z = cliffZ(x) + cliffW(x) * (0.6 + rnd() * 0.8) + rnd() * 2;
    addRock(x, z, 1 + rnd() * 2.2, 0.35);
  }
  for (const side of [-1, 1]) addRock(10 + side * 5.2, T.impact.z - 1.5, 2.2 + rnd(), 0.3);
  for (let a = 0, n = 0; a < 3000 && n < 90; a++) {
    const x = rx(), z = rx();
    if (ground(x, z, { slope: 0.6, path: 0.3 }) === null || !trees.free(x, z, 1)) continue;
    addRock(x, z, 0.35 + Math.pow(rnd(), 2) * 1.8, 0.45); n++;
  }
  for (let k = 0; k < 24; k++) {
    const p = RIVER[4 + Math.floor(rnd() * (RIVER.length - 30))];
    addRock(p[0] + (rnd() - 0.5) * 9, p[1] + (rnd() - 0.5) * 9, 0.4 + rnd() * 1.1);
  }
  for (const [x, z, s] of [[14, 8, 1.1], [-15, 12, 0.8], [19, -6, 1.4], [-12, -16, 0.9]]) addRock(x, z, s, 0.35);
  rocks.forEach((g, i) => { const m = makeInst(g, rMat, rkL[i], { cast: true, colors: true }); scene.add(m); });

  // --- Tavirózsák + lótusz
  const lilyGB = new GB();
  quad(lilyGB, new V3(0, 0, -0.5), new V3(1, 0, 0), new V3(0, 0, 1), 1, 1, 6, UP, [1, 1, 1]);
  const lilyGeo = lilyGB.build();
  const lilyL = [], lotusL = [];
  for (let a = 0; a < 600 && lilyL.length < 80; a++) {
    const ang = rnd() * 6.28, d = Math.sqrt(rnd()) * POND.r;
    const x = POND.x + Math.cos(ang) * d, z = POND.z + Math.sin(ang) * d;
    if (T.heightAt(x, z) > -0.35 || Math.hypot(x - T.impact.x, z - T.impact.z) < 5.5) continue;
    const s = 0.55 + rnd() * 0.6;
    lilyL.push({ x, y: 0.03, z, ry: rnd() * 6.28, s, c: new THREE.Color().setRGB(0.9 + rnd() * 0.2, 0.95 + rnd() * 0.1, 0.85 + rnd() * 0.2) });
    if (rnd() < 0.2) lotusL.push({ x: x + 0.1, y: 0.04, z: z + 0.1, ry: rnd() * 6.28, s: 0.9 + rnd() * 0.5 });
  }
  scene.add(makeInst(lilyGeo, fol.still.mat, lilyL, { colors: true }));
  scene.add(makeInst(makeLotus(), still, lotusL, {}));

  // --- Sziklafalon lecsüngő kúszónövény-függönyök
  const vineGB = new GB();
  for (let x = -80; x <= 95; x += 1.4 + rnd() * 1.2) {
    if (Math.abs(x - 10) < 4.3 || rnd() < 0.5) continue;
    const w = cliffW(x); if (w > 7) continue;
    const zTop = cliffZ(x) - w * 1.05, zBot = zTop + 2 * w * (0.25 + rnd() * 0.7);
    const width = 0.8 + rnd() * 0.9, len = zBot - zTop;
    const k = Math.max(1, Math.round(len * 2.2 / 2.6));
    for (let s = 0; s < k; s++) {
      const pts = [], sides = [], ws = [], ns = [];
      for (let i = 2; i >= 0; i--) {
        const t = (s + i / 2) / k, z = zTop + len * t, xx = x + Math.sin(t * 3 + x) * 0.3;
        const h = T.heightAt(xx, z), hz = T.heightAt(xx, z + 0.5) - T.heightAt(xx, z - 0.5);
        const nrm = new V3(0, 1, -hz).normalize();
        pts.push(new V3(xx, h, z).addScaledVector(nrm, 0.22)); sides.push(new V3(1, 0, 0)); ws.push(width); ns.push(nrm);
      }
      strip(vineGB, pts, sides, ws, ns, 7, () => [0.78, 0.86, 0.72], 0);
    }
  }
  const vines = new THREE.Mesh(vineGB.build(), fol.still.mat);
  vines.receiveShadow = true;
  scene.add(vines);

  // --- Kidőlt farönkök
  const logGB = new GB(), logMush = [];
  for (const [x, z, a, L] of [[13, 12, 0.6, 7], [-22, -18, -0.4, 6]]) {
    const dx = Math.cos(a) * L / 2, dz = Math.sin(a) * L / 2;
    const h0 = T.heightAt(x - dx, z - dz), h1 = T.heightAt(x + dx, z + dz);
    const c = new THREE.CatmullRomCurve3([new V3(x - dx, h0 + 0.3, z - dz), new V3(x, (h0 + h1) / 2 + 0.36, z), new V3(x + dx, h1 + 0.3, z + dz)]);
    tube(logGB, c, 12, 14, t => 0.42 * (1 - 0.2 * t), () => [0.75, 0.72, 0.68], 3);
    for (let k = 0; k <= 4; k++) colliders.push({ x: x - dx + dx * 2 * k / 4, z: z - dz + dz * 2 * k / 4, r: 0.45, h: 1.0 });
    for (let k = 0; k < 4; k++) {
      const t = 0.15 + rnd() * 0.7, p = c.getPointAt(t);
      logMush.push({ x: p.x + (rnd() - 0.5) * 0.4, y: p.y + 0.3, z: p.z + (rnd() - 0.5) * 0.4, ry: rnd() * 6, s: 0.8 + rnd() * 0.5 });
    }
  }
  const logs = new THREE.Mesh(logGB.build(true), bark.still);
  logs.castShadow = logs.receiveShadow = true;
  scene.add(logs);
  mkStream(mushGeos[0], mush, logMush, { R: 70 });

  // --- Páfrányok és bokrok a sziklapárkányokon
  for (let a = 0; a < 7000; a++) {
    const x = -80 + rnd() * 170;
    if (Math.abs(x - 10) < 5.5) continue;
    const w = cliffW(x); if (w > 8) continue;
    const z = cliffZ(x) + (rnd() * 2 - 1) * w * 1.1;
    const h = T.heightAt(x, z);
    if (T.slopeAt(x, z) > 0.62 || h < 3 || h > 17.5) continue;
    const c = new THREE.Color().setRGB(0.85 + rnd() * 0.2, 0.9 + rnd() * 0.15, 0.75 + rnd() * 0.2);
    if (rnd() < 0.6) fernL[a % 2].push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 0.55 + rnd() * 0.5, c });
    else bushL[a % 3].push({ x, y: h - 0.25, z, ry: rnd() * 6.28, s: 0.45 + rnd() * 0.45, c });
  }

  // --- Valódi 3D növénymodellek (ha betöltődtek)
  if (PL) {
    progress('Növénymodellek elhelyezése');
    SB.gFern = new Batch(PL.fern.mat, { cull: false, sort: false });
    addModel(SB.gFern, PL.fern.geos, fernL.flat(), 85, 2.0);
    const mon = monL.flat();
    SB.gAnth = new Batch(PL.anthurium.mat, { cull: false, sort: false });
    addModel(SB.gAnth, PL.anthurium.geos, mon.filter((_, i) => i % 2 === 0), 95, 2.6);
    SB.gCal = new Batch(PL.calathea.mat, { cull: false, sort: false });
    addModel(SB.gCal, PL.calathea.geos, mon.filter((_, i) => i % 2 === 1), 95, 2.8);
    // még több dús aljnövényzet az erdő szélén és a tó körül
    const extra = [];
    for (let a = 0, n = 0; a < 9000 && n < 900; a++) {
      const x = rx(), z = rx();
      const f = T.forestAt(x, z);
      if (rnd() > (f > 0.05 ? 0.5 + 0.5 * f : 0.04) + nearWater(x, z) * 0.3) continue;
      const h = ground(x, z, { slope: 0.5, path: 0.25, camp: 7 });
      if (h === null || !trees.free(x, z, 0.4)) continue;
      extra.push({ x, y: h - 0.04, z, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.6, c: new THREE.Color().setRGB(0.9 + rnd() * 0.2, 0.95 + rnd() * 0.1, 0.85 + rnd() * 0.2) });
      n++;
    }
    addModel(SB.gCal, PL.calathea.geos, extra.filter((_, i) => i % 3 === 0), 80, 2.6);
    addModel(SB.gAnth, PL.anthurium.geos, extra.filter((_, i) => i % 3 === 1), 80, 2.4);
    addModel(SB.gFern, PL.fern.geos, extra.filter((_, i) => i % 3 === 2), 80, 2.2);
    // vízigesztenye-fák: fotós levelű aljnövényzeti fák
    const pach = [];
    for (let a = 0, n = 0; a < 8000 && n < 260; a++) {
      const x = rx(), z = rx();
      const f = T.forestAt(x, z);
      if (rnd() > f * 0.9 + 0.05) continue;
      const h = ground(x, z, { big: 1, slope: 0.45, path: 0.2, camp: 10 });
      if (h === null || !trees.free(x, z, 1.6)) continue;
      trees.add(x, z, 0.8); colliders.push({ x, z, r: 0.22 });
      pach.push({ x, y: h - 0.05, z, ry: rnd() * 6.28, s: 2.4 + rnd() * 1.6, c: new THREE.Color().setRGB(0.85 + rnd() * 0.25, 0.92 + rnd() * 0.15, 0.8 + rnd() * 0.25) });
      n++;
    }
    out.pachira = pach;
    BT.pachBark = new Batch(PL.pachira.bark.mat, { cast: true });
    BT.pachLeaf = new Batch(PL.pachira.leaf.mat, { cast: true, depth: PL.pachira.leaf.depth });
    PL.pachira.pairs.forEach((p, k) => {
      const sub = pach.filter((_, i) => i % PL.pachira.pairs.length === k);
      BT.pachBark.add(p.bark, sub); BT.pachLeaf.add(p.leaves, sub);
    });
  }

  // --- Lombkorona-takarás térkép (1 m-es rács): az eső ennyire ritkul a fák alatt
  {
    const NN = 401, cov = new Float32Array(NN * NN);
    const disk = (x, z, R, s) => {
      const ix0 = Math.max(0, Math.floor(x + 200 - R)), ix1 = Math.min(NN - 1, Math.ceil(x + 200 + R));
      const iz0 = Math.max(0, Math.floor(z + 200 - R)), iz1 = Math.min(NN - 1, Math.ceil(z + 200 + R));
      for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
        const d = Math.hypot(ix - 200 - x, iz - 200 - z) / R;
        if (d >= 1) continue;
        const a = s * (1 - d * d * d), i = iz * NN + ix;
        cov[i] = 1 - (1 - cov[i]) * (1 - a);
      }
    };
    for (const L of gLists) for (const o of L) disk(o.x, o.z, 13 * o.s, 0.95);
    for (const L of mLists) for (const o of L) disk(o.x, o.z, 6 * o.s, 0.82);
    for (const L of pLists) for (const o of L) disk(o.x, o.z, 4.5 * o.s, 0.6);
    for (const L of bLists) for (const o of L) disk(o.x, o.z, 2.2 * o.s, 0.5);
    if (out.pachira) for (const o of out.pachira) disk(o.x, o.z, 0.6 * o.s, 0.6);
    // elmosás (2 menet doboz-szűrő), hogy a korona széle lágyan ritkuljon
    const tmp = new Float32Array(NN * NN);
    for (let pass = 0; pass < 2; pass++) {
      for (let iz = 0; iz < NN; iz++) for (let ix = 0; ix < NN; ix++) {
        let s = 0, n = 0;
        for (let k = -2; k <= 2; k++) { const x = ix + k; if (x >= 0 && x < NN) { s += cov[iz * NN + x]; n++; } }
        tmp[iz * NN + ix] = s / n;
      }
      for (let iz = 0; iz < NN; iz++) for (let ix = 0; ix < NN; ix++) {
        let s = 0, n = 0;
        for (let k = -2; k <= 2; k++) { const z = iz + k; if (z >= 0 && z < NN) { s += tmp[z * NN + ix]; n++; } }
        cov[iz * NN + ix] = s / n;
      }
    }
    const px = new Uint8Array(NN * NN * 4);
    for (let i = 0; i < NN * NN; i++) { const v = Math.round(Math.min(1, cov[i]) * 255); px[i * 4] = v; px[i * 4 + 3] = 255; }
    const tex = new THREE.DataTexture(px, NN, NN, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
    out.canopy = {
      tex,
      at(x, z) { const ix = Math.round(x + 200), iz = Math.round(z + 200); return ix < 0 || iz < 0 || ix >= NN || iz >= NN ? 0 : cov[iz * NN + ix]; },
    };
  }

  progress('Példányok összefűzése');
  await tick();
  for (const b of Object.values(BT)) { b.build(scene); treeMeshes.push(b); }
  for (const b of Object.values(SB)) { b.build(scene); streams.push(b); }
  out.setTreeFrac = (f) => { for (const b of treeMeshes) { b.frac = f; b.update(0, 0); } };
  return out;
}
