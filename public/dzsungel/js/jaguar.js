// Jaguár: egybefüggő, csontvázas test. A forma lekerekített kúpokból összeolvasztott távolságmező (SDF), ebből
// felületi háló (surface nets) készül, a csontsúlyok a formadarabokból jönnek. Rozettás bunda + héj-szőr (8 réteg).
// Mozgás eljárásosan: lépésrend (séta / vágta), a mancsok a talajra lépnek és ott maradnak (kétcsontos IK),
// gerinc-hajlás fordulásnál, vágtában hullámzó hát, lopakodó testtartás, fej a célpont felé, farok-lengés.
import * as THREE from 'three';
import { patch } from './shaders.js';

const V3 = THREE.Vector3;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const sstep = (a, b, x) => smooth((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// ---------------------------------------------------------------- csontváz (nyugalmi helyzet, világ-méter)
const BONES = [
  ['hips', -1, [0, 0.6, -0.4]], ['spine', 0, [0, 0.58, -0.05]], ['chest', 1, [0, 0.6, 0.3]],
  ['neck', 2, [0, 0.66, 0.5]], ['head', 3, [0, 0.74, 0.74]], ['jaw', 4, [0, 0.68, 0.8]],
  ['tail0', 0, [0, 0.62, -0.6]], ['tail1', 6, [0, 0.52, -0.78]], ['tail2', 7, [0, 0.41, -0.95]],
  ['tail3', 8, [0, 0.32, -1.12]], ['tail4', 9, [0, 0.27, -1.3]], ['tail5', 10, [0, 0.28, -1.46]],
];
const LEG = {};
for (const [sd, s] of [['L', 1], ['R', -1]]) {
  LEG['F' + sd] = BONES.length;
  BONES.push([`fu${sd}`, 2, [s * 0.13, 0.6, 0.4]], [`fl${sd}`, -2, [s * 0.12, 0.33, 0.43]], [`fp${sd}`, -2, [s * 0.11, 0.065, 0.45]]);
}
for (const [sd, s] of [['L', 1], ['R', -1]]) {
  LEG['H' + sd] = BONES.length;
  BONES.push([`ht${sd}`, 0, [s * 0.12, 0.58, -0.42]], [`hs${sd}`, -2, [s * 0.12, 0.36, -0.31]], [`hm${sd}`, -2, [s * 0.11, 0.2, -0.52]], [`hp${sd}`, -2, [s * 0.11, 0.05, -0.48]]);
}
// -2: az előző csont a szülő
BONES.forEach((b, i) => { if (b[1] === -2) b[1] = i - 1; });
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
const BP = (n) => BONES[BI[n]][2];

// ---------------------------------------------------------------- forma: lekerekített kúpok (iq), oldalirányú lapítással
function rc(a, b, r1, r2, bones, k = 0.05, sx = 1) {
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = Math.max(1e-8, ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2]);
  const rr = r1 - r2, R = Math.max(r1, r2) + 0.14;
  return {
    a, b, r1, r2, ba, l2, rr, a2: l2 - rr * rr, il2: 1 / l2, sx, k, bones: Array.isArray(bones) ? bones : [bones, bones],
    lo: [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R],
    hi: [Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R],
  };
}
function rcDist(P, x, y, z) {
  const cx = (P.a[0] + P.b[0]) * 0.5;
  x = cx + (x - cx) / P.sx;
  const pa0 = x - P.a[0], pa1 = y - P.a[1], pa2 = z - P.a[2];
  const yy = pa0 * P.ba[0] + pa1 * P.ba[1] + pa2 * P.ba[2], zz = yy - P.l2;
  const q0 = pa0 * P.l2 - P.ba[0] * yy, q1 = pa1 * P.l2 - P.ba[1] * yy, q2 = pa2 * P.l2 - P.ba[2] * yy;
  const x2 = q0 * q0 + q1 * q1 + q2 * q2, y2 = yy * yy * P.l2, z2 = zz * zz * P.l2;
  const k = Math.sign(P.rr) * P.rr * P.rr * x2;
  let d;
  if (Math.sign(zz) * P.a2 * z2 > k) d = Math.sqrt(x2 + z2) * P.il2 - P.r2;
  else if (Math.sign(yy) * P.a2 * y2 < k) d = Math.sqrt(x2 + y2) * P.il2 - P.r1;
  else d = (Math.sqrt(x2 * P.a2 * P.il2) + yy * P.rr) * P.il2 - P.r1;
  return d * Math.min(1, P.sx);
}
const rcT = (P, x, y, z) => Math.min(1, Math.max(0, ((x - P.a[0]) * P.ba[0] + (y - P.a[1]) * P.ba[1] + (z - P.a[2]) * P.ba[2]) / P.l2));
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };

function buildShape() {
  const S = [], b = BI;
  // törzs: medence, has, mély mellkas, hátvonal, lapockák, combok
  S.push(rc([0, 0.6, -0.5], [0, 0.57, -0.05], 0.165, 0.18, [b.hips, b.spine], 0.08, 0.8));
  S.push(rc([0, 0.57, -0.05], [0, 0.6, 0.3], 0.18, 0.205, [b.spine, b.chest], 0.08, 0.8));
  S.push(rc([0, 0.5, 0.32], [0, 0.48, 0.08], 0.16, 0.14, [b.chest, b.spine], 0.08, 0.82));
  S.push(rc([0, 0.48, -0.32], [0, 0.47, 0.02], 0.12, 0.13, [b.hips, b.spine], 0.08, 0.88));
  S.push(rc([0, 0.66, -0.44], [0, 0.7, 0.36], 0.11, 0.125, [b.hips, b.chest], 0.07, 0.95));
  for (const s of [1, -1]) {
    const F = s > 0 ? 'L' : 'R';
    S.push(rc([s * 0.09, 0.67, 0.36], [s * 0.12, 0.5, 0.42], 0.1, 0.085, [b.chest, b['fu' + F]], 0.06));
    S.push(rc([s * 0.09, 0.61, -0.44], [s * 0.12, 0.45, -0.37], 0.13, 0.105, [b.hips, b['ht' + F]], 0.06));
  }
  // nyak, fej (széles koponya, pofazacskók, rövid erős pofa, orr), állkapocs, fülek
  S.push(rc([0, 0.62, 0.4], [0, 0.71, 0.66], 0.15, 0.112, [b.chest, b.neck], 0.07, 0.92));
  S.push(rc([0, 0.765, 0.715], [0, 0.755, 0.795], 0.122, 0.112, b.head, 0.06, 1.18));
  for (const s of [1, -1]) S.push(rc([s * 0.068, 0.712, 0.78], [s * 0.06, 0.708, 0.82], 0.068, 0.06, b.head, 0.04));
  S.push(rc([0, 0.722, 0.85], [0, 0.708, 0.935], 0.074, 0.056, b.head, 0.04, 1.1));
  S.push(rc([0, 0.728, 0.952], [0, 0.724, 0.962], 0.028, 0.024, b.head, 0.02, 1.2));
  S.push(rc([0, 0.66, 0.8], [0, 0.667, 0.915], 0.058, 0.038, b.jaw, 0.02));
  for (const s of [1, -1]) S.push(rc([s * 0.074, 0.835, 0.728], [s * 0.09, 0.892, 0.716], 0.034, 0.016, b.head, 0.014));
  // lábak
  for (const s of [1, -1]) {
    const F = s > 0 ? 'L' : 'R';
    S.push(rc([s * 0.13, 0.58, 0.4], [s * 0.12, 0.34, 0.425], 0.088, 0.06, b['fu' + F], 0.05));
    S.push(rc([s * 0.12, 0.33, 0.43], [s * 0.11, 0.1, 0.45], 0.056, 0.041, b['fl' + F], 0.035));
    S.push(rc([s * 0.11, 0.058, 0.442], [s * 0.11, 0.042, 0.508], 0.05, 0.046, b['fp' + F], 0.03, 1.08));
    S.push(rc([s * 0.12, 0.56, -0.42], [s * 0.12, 0.365, -0.32], 0.11, 0.066, b['ht' + F], 0.05));
    S.push(rc([s * 0.12, 0.355, -0.31], [s * 0.11, 0.2, -0.51], 0.058, 0.041, b['hs' + F], 0.035));
    S.push(rc([s * 0.11, 0.2, -0.52], [s * 0.11, 0.072, -0.482], 0.04, 0.036, b['hm' + F], 0.03));
    S.push(rc([s * 0.11, 0.05, -0.486], [s * 0.11, 0.038, -0.425], 0.047, 0.043, b['hp' + F], 0.03, 1.06));
  }
  // farok: vastag, végig egyenletes, a vége kissé felkunkorodik
  const TP = [[0, 0.61, -0.52], BP('tail0'), BP('tail1'), BP('tail2'), BP('tail3'), BP('tail4'), BP('tail5'), [0, 0.32, -1.6]];
  const TR = [0.075, 0.064, 0.056, 0.05, 0.046, 0.042, 0.038, 0.032];
  for (let i = 0; i < TP.length - 1; i++) S.push(rc(TP[i], TP[i + 1], TR[i], TR[i + 1], i === 0 ? [b.hips, b.tail0] : [b.tail0 + Math.min(5, i - 1), b.tail0 + Math.min(5, i)], i === 0 ? 0.07 : 0.03));
  return S;
}
function sdf(S, x, y, z) {
  let d = 1;
  for (const P of S) {
    if (x < P.lo[0] || y < P.lo[1] || z < P.lo[2] || x > P.hi[0] || y > P.hi[1] || z > P.hi[2]) continue;
    d = smin(d, rcDist(P, x, y, z), P.k);
  }
  return d;
}

// ---------------------------------------------------------------- felületi háló (naive surface nets)
function surfaceNets(f, lo, hi, h) {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const V = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[id(i, j, k)] = f(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  const cx = nx - 1, cy = ny - 1, cell = new Int32Array(cx * cy * (nz - 1)).fill(-1), cid = (i, j, k) => i + cx * (j + cy * k);
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const ED = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const pos = [], v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0;
    for (let c = 0; c < 8; c++) { v[c] = V[id(i + CO[c][0], j + CO[c][1], k + CO[c][2])]; if (v[c] < 0) m |= 1 << c; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of ED) {
      if ((v[a] < 0) === (v[b] < 0)) continue;
      const t = v[a] / (v[a] - v[b]);
      sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t; sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t; sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t; n++;
    }
    cell[cid(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const idx = [], quad = (a, b, c, d) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; idx.push(a, b, c, a, c, d); };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const s0 = V[id(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && s0 !== (V[id(i + 1, j, k)] < 0)) quad(cell[cid(i, j - 1, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i, j - 1, k)]);
    if (j < ny - 1 && i > 0 && k > 0 && s0 !== (V[id(i, j + 1, k)] < 0)) quad(cell[cid(i - 1, j, k - 1)], cell[cid(i, j, k - 1)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]);
    if (k < nz - 1 && i > 0 && j > 0 && s0 !== (V[id(i, j, k + 1)] < 0)) quad(cell[cid(i - 1, j - 1, k)], cell[cid(i, j - 1, k)], cell[cid(i, j, k)], cell[cid(i - 1, j, k)]);
  }
  return { pos, idx };
}

// ---------------------------------------------------------------- anyag: rozetták + héj-szőr
const SPOT = { hips: [0.085, 0], spine: [0.085, 0], chest: [0.08, 0], neck: [0.05, 0.5], head: [0.028, 1], jaw: [0.02, 1] };
function spotFor(name) {
  if (SPOT[name]) return SPOT[name];
  if (name.startsWith('tail')) return +name[4] < 3 ? [0.055, 0.7] : [0.045, 1];
  if (name.startsWith('fu')) return [0.06, 0.5];
  if (name.startsWith('fl')) return [0.04, 1];
  if (name.startsWith('ht')) return [0.07, 0.3];
  if (name.startsWith('hs')) return [0.045, 0.9];
  if (name.startsWith('hm')) return [0.035, 1];
  return [0.028, 1];
}
function furMat(shell, furLen) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: shell > 0 ? 0.9 : 0.8, metalness: 0 });
  m.userData.u = { uShell: { value: shell }, uFurLen: { value: furLen } };
  return patch(m, 'jaguarFur', (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aRest; attribute vec2 aSpot; attribute float aFur; varying vec3 vRest; varying vec2 vSpot; uniform float uShell; uniform float uFurLen;')
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>
vRest = aRest; vSpot = aSpot;
// héj: a bőrtől a normál mentén kifelé, a szőrvég kicsit lehajlik és hátrafésült
float fl = uShell * uFurLen * aFur;
transformed += normalize(objectNormal) * fl;
transformed.y -= uShell * fl * 0.35;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRest; varying vec2 vSpot; uniform float uShell;
vec2 jagW(vec3 p) {
  vec3 c = floor(p), f = fract(p); float d1 = 9.0, hs = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 r = o + 0.15 + 0.7 * vec3(jh13(c + o), jh13(c + o + 7.1), jh13(c + o + 3.3)) - f;
    float d = dot(r, r); if (d < d1) { d1 = d; hs = jh13(c + o + 11.7); }
  }
  return vec2(sqrt(d1), hs);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  if (uShell > 0.0) {
    // szőrszálak: apró 3D cellánként egy szál, a hegyük felé ritkulnak
    float s = jh13(floor(vRest * 640.0));
    if (s < uShell * 0.86 + 0.06) discard;
  }
  vec2 w = jagW(vRest / vSpot.x);
  float brk = jn3(vRest * 36.0);
  // rozetta: megtört gyűrű, kissé sötétebb belsővel, néha középső pöttyel; foltos részeken tömör pötty
  float ring = smoothstep(0.47, 0.39, w.x) * smoothstep(0.19, 0.28, w.x) * smoothstep(0.3, 0.52, brk);
  float cdot = smoothstep(0.1, 0.055, w.x) * step(0.6, w.y);
  float solid = smoothstep(0.34, 0.25, w.x + (brk - 0.5) * 0.14);
  float spot = mix(max(ring, cdot), solid, vSpot.y);
  vec3 col = diffuseColor.rgb * (1.0 - smoothstep(0.3, 0.12, w.x) * 0.22 * (1.0 - vSpot.y));
  diffuseColor.rgb = mix(col, vec3(0.022, 0.016, 0.011), spot * 0.93);
  // a szőr töve sötétebb (önárnyék), a hegye világosabb
  diffuseColor.rgb *= uShell > 0.0 ? 0.78 + 0.32 * uShell : 0.74;
}`);
  });
}

// ---------------------------------------------------------------- IK segédek (világkoordinátában)
const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3(), _e = new V3(), _p = new V3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
function turnBone(bone, from, to) {
  _q1.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
  bone.quaternion.copy(_q2.premultiply(_q1).premultiply(_q3.invert()));
  bone.updateMatrixWorld(true);
}
function solve2(A, B, C, T, pole) {
  A.getWorldPosition(_a); B.getWorldPosition(_b); C.getWorldPosition(_c);
  const la = _a.distanceTo(_b), lb = _b.distanceTo(_c);
  const d = Math.min(Math.max(_a.distanceTo(T), 0.02), (la + lb) * 0.998);
  _d.subVectors(T, _a).normalize();
  const ca = Math.min(1, Math.max(-1, (la * la + d * d - lb * lb) / (2 * la * d))), sa = Math.sqrt(1 - ca * ca);
  _p.subVectors(pole, _a); _p.addScaledVector(_d, -_p.dot(_d)).normalize();
  _e.copy(_a).addScaledVector(_d, ca * la).addScaledVector(_p, sa * la);
  turnBone(A, _b.sub(_a).normalize(), _c.copy(_e).sub(_a).normalize());
  B.getWorldPosition(_b); C.getWorldPosition(_c);
  turnBone(B, _c.sub(_b).normalize(), _d.subVectors(T, _b).normalize());
}
function setWorldQuat(bone, q) { bone.parent.getWorldQuaternion(_q3); bone.quaternion.copy(_q3.invert().multiply(q)); bone.updateMatrixWorld(true); }

// Közös járás-logika: lépésrend (séta / vágta), talppontok, a test magassága és dőlése a talajhoz.
// A leszármazott adja a lábakat (this.feet: rest [x, z] testkoordinátában, front, s) és a csontok beállítását.
class Gait {
  initGait(hindZ, frontZ) {
    this.hindZ = hindZ; this.frontZ = frontZ;
    this.ph = 0; this.yawPrev = null; this.yr = 0; this.placed = false; this.look = new THREE.Vector2();
    this.crouch = 0; this.drink = 0; this.jawOpen = 0; this.gal = 0;
    for (const F of this.feet) Object.assign(F, {
      offW: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 }[F.name], offG: { LH: 0, RH: 0.1, LF: 0.55, RF: 0.65 }[F.name],
      pos: new V3(), lift: new V3(), target: new V3(), swing: false, err: 0, u: 0,
    });
  }
  // tesztekhez / felbukkanáskor: a lábak a nyugalmi helyükre kerülnek
  place(J, T) {
    const c = Math.cos(J.yaw), s = Math.sin(J.yaw);
    for (const F of this.feet) { const x = J.pos.x + F.rest[0] * c + F.rest[1] * s, z = J.pos.z - F.rest[0] * s + F.rest[1] * c; F.pos.set(x, T.heightAt(x, z), z); F.swing = false; }
    this.yawPrev = J.yaw; this.placed = true;
  }
  gait(dt, J, o) {
    const T = o.T;
    if (!this.placed) this.place(J, T);
    const c = Math.cos(J.yaw), s = Math.sin(J.yaw), fwd = new V3(s, 0, c);
    const toW = (x, z) => new V3(J.pos.x + x * c + z * s, 0, J.pos.z - x * s + z * c);
    let dy = J.yaw - (this.yawPrev ?? J.yaw); while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    this.yawPrev = J.yaw;
    this.yr = damp(this.yr, dt > 0 ? dy / dt : 0, 6, dt);
    this.crouch = damp(this.crouch, o.crouch || 0, 3, dt);
    this.drink = damp(this.drink, o.drink || 0, 2, dt);
    this.jawOpen = damp(this.jawOpen, o.jaw || 0, 12, dt);
    const sp = J.speed;
    this.gal = damp(this.gal, sstep(3.4, 5.5, sp), 4, dt);
    const gal = this.gal;
    // lépésrend: lépéshossz és a talajon töltött idő aránya a sebességgel változik
    const Sx = lerp(Math.min(1.5, Math.max(0.7, 0.7 + sp * 0.32)), 0.9 + sp * 0.3, gal) * (1 - this.crouch * 0.25);
    const duty = lerp(0.64, 0.36, gal);
    let rate = sp / Sx;
    if (sp < 0.12) rate = this.feet.some((F) => F.err > 0.1 || F.swing) ? 1.3 : 0; // megállás után a lábak a helyükre lépnek
    this.ph = (this.ph + rate * dt) % 1;
    const ahead = Math.min(1, sp / 0.5);
    // a test magassága és dőlése a mancsok alatti talajhoz igazodik
    const gAt = (x, z) => T.heightAt(x, z);
    const hw = toW(0, this.hindZ), fw = toW(0, this.frontZ);
    const hG = gAt(hw.x, hw.z), fG = gAt(fw.x, fw.z);
    const bob = lerp(Math.abs(Math.sin(this.ph * Math.PI * 4)) * 0.018 * Math.min(1, sp), Math.sin(this.ph * Math.PI * 2 - 0.6) * 0.06, gal);
    for (const F of this.feet) {
      const off = lerp(F.offW, F.offG, gal), lp = (this.ph - off + 2) % 1;
      const rw = toW(F.rest[0], F.rest[1]);
      if (o.pounce > 0.01 && F.front) {
        // ugrás: a mellső mancsok előre-fel nyúlnak
        const tg = rw.clone().addScaledVector(fwd, 0.45 * o.pounce); tg.y = gAt(rw.x, rw.z) + 0.5 * o.pounce;
        F.pos.lerp(tg, 1 - Math.exp(-14 * dt)); F.swing = true; F.lift.copy(F.pos); F.u = 0.5; continue;
      }
      if (lp < duty || rate === 0) {
        if (F.swing) { F.swing = false; F.pos.copy(F.target); if (o.onStep && sp > 0.5) o.onStep(F, sp); }
      } else {
        const u = (lp - duty) / (1 - duty);
        if (!F.swing) { F.swing = true; F.lift.copy(F.pos); }
        F.target.copy(rw).addScaledVector(fwd, ((1 - u) * (1 - duty) * Sx + duty * Sx * 0.5) * ahead);
        F.target.y = gAt(F.target.x, F.target.z);
        const e = smooth(u);
        F.pos.lerpVectors(F.lift, F.target, e);
        F.pos.y += Math.sin(Math.PI * u) * lerp(0.07, 0.16, gal) * (F.front ? 1 : 0.85);
        F.u = u;
      }
      F.err = Math.hypot(F.pos.x - rw.x, F.pos.z - rw.z);
    }
    const turn = Math.max(-1.5, Math.min(1.5, this.yr));
    const pitch = -Math.atan2(fG - hG, this.frontZ - this.hindZ) + Math.sin(this.ph * Math.PI * 2) * 0.07 * gal - (o.pounce || 0) * 0.45;
    const flex = Math.sin(this.ph * Math.PI * 2 + 0.4) * gal;
    return { c, s, fwd, toW, hG, fG, bob, gal, turn, pitch, flex };
  }
  // fej-célzás: a célpont iránya a test irányához képest (korlátok közt), simítva
  aim(dt, J, o, from) {
    let lyaw = 0, lpit = 0;
    if (o.look) {
      const dx = o.look.x - from.x, dz = o.look.z - from.z, dyy = o.look.y - from.y;
      let a = Math.atan2(dx, dz) - J.yaw; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
      lyaw = Math.max(-0.9, Math.min(0.9, a)); lpit = Math.max(-0.35, Math.min(0.4, -Math.atan2(dyy, Math.hypot(dx, dz))));
      if (Math.abs(a) > 1.6) lyaw = lpit = 0;
    }
    this.look.x = damp(this.look.x, lyaw, 4, dt); this.look.y = damp(this.look.y, lpit, 4, dt);
  }
}

export class JaguarBody extends Gait {
  constructor(scene) {
    super();
    this.scene = scene;
    const t0 = performance.now();
    const S = buildShape();
    const f = (x, y, z) => sdf(S, x, y, z);
    const { pos, idx } = surfaceNets(f, [-0.3, -0.03, -1.68], [0.3, 0.97, 1.03], 0.019);
    const nV = pos.length / 3;
    // normálok a mező gradienséből (simább, mint a háromszögekből)
    const nrm = new Float32Array(nV * 3), e = 0.004;
    for (let i = 0; i < nV; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
      const l = Math.hypot(gx, gy, gz) || 1;
      nrm[i * 3] = gx / l; nrm[i * 3 + 1] = gy / l; nrm[i * 3 + 2] = gz / l;
    }
    // háromszögek iránya a normál szerint
    for (let t = 0; t < idx.length; t += 3) {
      const A = idx[t], B = idx[t + 1], C = idx[t + 2];
      const ux = pos[B * 3] - pos[A * 3], uy = pos[B * 3 + 1] - pos[A * 3 + 1], uz = pos[B * 3 + 2] - pos[A * 3 + 2];
      const vx = pos[C * 3] - pos[A * 3], vy = pos[C * 3 + 1] - pos[A * 3 + 1], vz = pos[C * 3 + 2] - pos[A * 3 + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * nrm[A * 3] + fy * nrm[A * 3 + 1] + fz * nrm[A * 3 + 2] < 0) { idx[t + 1] = C; idx[t + 2] = B; }
    }
    // szemek helye: a koponya és a pofa találkozásánál, a felszínen (a mezőből kifelé lépkedve)
    this.eyes = [1, -1].map((sg) => {
      const d = new V3(sg * 0.5, 0.08, 1).normalize(), p = new V3(sg * 0.035, 0.778, 0.8);
      for (let k = 0; k < 80 && f(p.x, p.y, p.z) < 0; k++) p.addScaledVector(d, 0.002);
      return p.addScaledVector(d, -0.007);
    });
    // csontsúlyok a formadarabokból: aminek a felszínén van a pont, az a csont mozgatja; az összeolvadásoknál keverednek
    const sIdx = new Uint16Array(nV * 4), sW = new Float32Array(nV * 4), col = new Float32Array(nV * 3), spot = new Float32Array(nV * 2), fur = new Float32Array(nV);
    const acc = new Float32Array(BONES.length);
    const C3 = (r, g, b) => [r, g, b];
    const GOLD = C3(0.74, 0.5, 0.25), SADDLE = C3(0.6, 0.38, 0.17), CREAM = C3(0.93, 0.88, 0.76), BLACK = C3(0.04, 0.03, 0.025);
    const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    for (let i = 0; i < nV; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
      acc.fill(0);
      for (const P of S) {
        if (x < P.lo[0] || y < P.lo[1] || z < P.lo[2] || x > P.hi[0] || y > P.hi[1] || z > P.hi[2]) continue;
        const d = rcDist(P, x, y, z), w = Math.exp(-Math.max(d, 0) / 0.016);
        if (w < 1e-4) continue;
        const t = smooth(rcT(P, x, y, z));
        acc[P.bones[0]] += w * (1 - t); acc[P.bones[1]] += w * t;
      }
      const top = [...acc.keys()].sort((p, q) => acc[q] - acc[p]).slice(0, 4);
      let sum = 0; for (const b of top) sum += acc[b];
      let sz = 0, st = 0;
      top.forEach((b, k) => { const w = sum > 0 ? acc[b] / sum : (k === 0 ? 1 : 0); sIdx[i * 4 + k] = b; sW[i * 4 + k] = w; const sp = spotFor(BONES[b][0]); sz += sp[0] * w; st += sp[1] * w; });
      // színek: arany alap, sötétebb nyereg, krémszínű has, torok, láb belső oldala, pofa; fekete farokvég és fül-hát
      const main = BONES[top[0]][0];
      let c = mixc(GOLD, SADDLE, sstep(0.35, 0.95, ny) * (y > 0.5 ? 0.6 : 0.2));
      let cr = 0;
      if (main === 'hips' || main === 'spine' || main === 'chest') { cr = sstep(-0.15, -0.7, ny); if (cr > 0.4) { sz = lerp(sz, 0.12, cr); st = lerp(st, 1, cr); } }
      else if (main === 'neck') cr = sstep(0.05, -0.6, ny);
      else if (main === 'jaw') cr = 1;
      else if (main === 'head') { cr = Math.max(sstep(0.86, 0.93, z) * sstep(0.5, 0.0, ny) * 0.75, sstep(-0.1, -0.6, ny)); if (y > 0.83) { c = nz < -0.2 ? BLACK : c; cr = nz > 0.3 ? 0.6 : 0; } }
      else if (main.startsWith('tail')) cr = sstep(-0.2, -0.75, ny) * 0.8;
      else cr = sstep(0.15, 0.6, -nx * Math.sign(x)) * 0.85 + (main.startsWith('fu') || main.startsWith('ht') ? 0 : sstep(0.3, 0.8, -nz) * 0.0);
      c = mixc(c, CREAM, Math.min(1, cr));
      if (main === 'tail5' || z < -1.5) c = BLACK;
      if (Math.hypot(x, y - 0.728, z - 0.962) < 0.03 && ny > -0.3) c = C3(0.3, 0.17, 0.15);         // orrtükör
      for (const E of this.eyes) {
        const de = Math.hypot(x - E.x, y - E.y, z - E.z);
        if (de < 0.05) c = mixc(c, CREAM, sstep(0.05, 0.034, de) * 0.8); // világos folt a szem körül
        if (de < 0.03) c = mixc(c, BLACK, sstep(0.03, 0.024, de));       // sötét szemkontúr
      }
      if (main === 'head' && z > 0.85 && y > 0.664 && y < 0.684 && Math.abs(x) > 0.02) c = mixc(c, BLACK, 0.8); // szájvonal
      const lc = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); col[i * 3] = lc.r; col[i * 3 + 1] = lc.g; col[i * 3 + 2] = lc.b;
      spot[i * 2] = sz; spot[i * 2 + 1] = Math.min(1, st);
      fur[i] = main.startsWith('tail') || main === 'jaw' || main.startsWith('fp') || main.startsWith('hp') ? 0.6 : (cr > 0.5 ? 1.4 : 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setAttribute('aRest', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSpot', new THREE.BufferAttribute(spot, 2));
    geo.setAttribute('aFur', new THREE.BufferAttribute(fur, 1));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(sIdx, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sW, 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    this.tris = idx.length / 3; this.buildMs = performance.now() - t0;

    // csontok
    const bones = BONES.map(([n]) => { const b = new THREE.Bone(); b.name = n; return b; });
    BONES.forEach(([, par, p], i) => {
      if (par < 0) bones[i].position.set(...p);
      else { const q = BONES[par][2]; bones[i].position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); bones[par].add(bones[i]); }
    });
    this.bones = bones; this.B = Object.fromEntries(BONES.map(([n], i) => [n, bones[i]]));
    const g = new THREE.Group();
    const mesh = new THREE.SkinnedMesh(geo, furMat(0, 0.016));
    mesh.add(bones[0]); g.add(mesh);
    g.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(bones);
    mesh.bind(skel);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    // szőr-rétegek: ugyanaz a háló és csontváz, a normál mentén kitolva
    this.shells = [];
    const NS = 8;
    for (let k = 1; k <= NS; k++) {
      const s = new THREE.SkinnedMesh(geo, furMat(k / NS, 0.016));
      s.bind(skel, mesh.bindMatrix); s.frustumCulled = false; s.receiveShadow = true; s.renderOrder = 1;
      g.add(s); this.shells.push(s);
    }
    this.mesh = mesh;
    this.buildFace();
    this.g = g;
    scene.add(g);

    // lábak: IK-lánc, nyugalmi talppont (testkoordinátában), lépésrend-eltolás (séta / vágta)
    const mk = (name, front, s) => {
      const k = front ? 'F' : 'H', sd = s > 0 ? 'L' : 'R', i0 = LEG[k + sd];
      return { name, front, s, chain: front ? [bones[i0], bones[i0 + 1], bones[i0 + 2]] : [bones[i0], bones[i0 + 1], bones[i0 + 2], bones[i0 + 3]], rest: front ? [s * 0.11, 0.475] : [s * 0.11, -0.45] };
    };
    this.feet = [mk('LF', true, 1), mk('RF', true, -1), mk('LH', false, 1), mk('RH', false, -1)];
    this.initGait(-0.45, 0.47);
  }

  // szemek (borostyán, éjjel visszaverő), orrtükör fölött bajusz, agyarak az állkapocsban
  buildFace() {
    const H = this.B.head, J = this.B.jaw, hp = BP('head'), jp = BP('jaw');
    this.eyeMat = new THREE.MeshStandardMaterial({ color: 0xd9a21e, roughness: 0.12, emissive: new THREE.Color(0, 0, 0) });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x050403 });
    for (const s of [1, -1]) {
      const E = this.eyes[s > 0 ? 0 : 1], eg = new THREE.Group(); eg.position.set(E.x - hp[0], E.y - hp[1], E.z - hp[2]); eg.rotation.set(-0.05, s * 0.42, 0);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 10), this.eyeMat); eg.add(e);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), pupil); p.position.z = 0.014; p.scale.z = 0.5; eg.add(p);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 8, 0, Math.PI * 2, 0, 1.0), new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.9 }));
      lid.rotation.x = 0.35; eg.add(lid);
      H.add(eg);
    }
    // bajusz: vékony, fehér szálak a pofa két oldalán
    const wp = [];
    for (const s of [1, -1]) for (let k = 0; k < 7; k++) {
      const y0 = 0.7 + (k % 4) * 0.008, z0 = 0.905 + (k % 3) * 0.01, a = (k - 3) * 0.06;
      wp.push(s * 0.062, y0, z0, s * (0.062 + 0.1 - Math.abs(a) * 0.1), y0 + a * 0.18 - 0.01, z0 - 0.02 - Math.abs(a) * 0.05);
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3)); wg.translate(-hp[0], -hp[1], -hp[2]);
    H.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xe8e2d2, transparent: true, opacity: 0.3 })));
    // szájüreg és agyarak (morgáskor / támadáskor látszanak)
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x4a1414, roughness: 0.6 }));
    mouth.scale.set(0.042, 0.022, 0.07); mouth.position.set(0, 0.682 - hp[1], 0.875 - hp[2]); H.add(mouth);
    const fang = new THREE.ConeGeometry(0.0065, 0.03, 6), fm = new THREE.MeshStandardMaterial({ color: 0xf0eadb, roughness: 0.35 });
    for (const s of [1, -1]) {
      const u = new THREE.Mesh(fang, fm); u.rotation.x = Math.PI; u.position.set(s * 0.025, 0.676 - hp[1], 0.93 - hp[2]); H.add(u);
      const l = new THREE.Mesh(fang, fm); l.position.set(s * 0.021, 0.676 - jp[1], 0.905 - jp[2]); J.add(l);
    }
  }

  // J: { pos, yaw, speed }, o: { T, time, night, crouch, drink, look (V3|null), jaw, pounce, camera }
  update(dt, J, o) {
    const B = this.B, g = this.g;
    const { c, s, fwd, hG, bob, gal, turn, pitch, flex } = this.gait(dt, J, o);
    g.position.set(J.pos.x, 0, J.pos.z); g.rotation.y = J.yaw;
    // gerinc: medence magassága és dőlése, lopakodás, vágtában hajlás, fordulásnál oldalra görbül
    const crouchY = this.crouch * 0.17 + this.drink * 0.04;
    B.hips.position.set(0, hG + 0.6 - crouchY + bob - 0.03 * gal, -0.4);
    B.hips.rotation.set(pitch, 0, 0);
    B.spine.rotation.set(flex * 0.12, turn * 0.1, 0);
    B.chest.rotation.set(-flex * 0.08 + this.drink * 0.12 + this.crouch * 0.05, turn * 0.1, 0);
    // fej: a célpont felé fordul (korlátok közt), a testdőlést kiegyenlíti; ivásnál lehajol
    this.aim(dt, J, o, B.neck.getWorldPosition(new V3()));
    B.neck.rotation.set(this.drink * 0.75 + this.crouch * 0.2 - 0.12 * gal + Math.sin(this.ph * Math.PI * 4) * 0.02 * (1 - gal), this.look.x * 0.45 + turn * 0.08, 0);
    B.head.rotation.set(-pitch * 0.7 + this.look.y + this.drink * 0.35 - this.crouch * 0.18 + 0.1 * gal, this.look.x * 0.55, -this.look.x * 0.1);
    B.jaw.rotation.set(this.jawOpen * 0.42 + (this.drink > 0.5 ? Math.max(0, Math.sin(o.time * 7)) * 0.12 : 0), 0, 0);
    // farok: lengés, fordulásnál kileng, vágtában hátrafelé emelkedik, lopakodáskor alacsonyan, a vége rángatózik
    const tw = this.crouch > 0.5 ? Math.sin(o.time * 9) * Math.max(0, Math.sin(o.time * 0.9)) : 0;
    for (let i = 0; i < 6; i++) {
      const t = B['tail' + i];
      const sw = Math.sin(o.time * (1.6 + gal) - i * 0.7) * (0.08 + i * 0.03) * (1 - gal * 0.6);
      t.rotation.set(i === 0 ? 0.05 + 0.45 * gal - this.crouch * 0.25 : (i >= 4 ? 0.22 + tw * 0.3 : -0.02 * gal), sw - turn * 0.06 * (i + 1), 0);
    }
    // lábak: alapállásba, majd IK a talppontokra
    for (const F of this.feet) for (const b of F.chain) b.quaternion.identity();
    g.updateMatrixWorld(true);
    const up = new V3(0, 1, 0), yawQ = new THREE.Quaternion().setFromAxisAngle(up, J.yaw);
    for (const F of this.feet) {
      const ch = F.chain, A0 = ch[0].getWorldPosition(new V3());
      const curl = F.swing ? Math.sin(Math.PI * F.u) : 0;
      const side = new V3(c, 0, -s).multiplyScalar(F.s); // a test bal oldala +x
      if (F.front) {
        const T0 = F.pos.clone().add(new V3(0, 0.062 + curl * 0.05, 0)).addScaledVector(fwd, -0.028 - curl * 0.03);
        const pole = A0.clone().addScaledVector(fwd, -0.6).add(new V3(0, -0.25, 0)).addScaledVector(side, 0.08);
        solve2(ch[0], ch[1], ch[2], T0, pole);
        setWorldQuat(ch[2], yawQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), curl * 1.1)));
      } else {
        const T0 = F.pos.clone().add(new V3(0, 0.155 + curl * 0.06, 0)).addScaledVector(fwd, -0.04 - curl * 0.05);
        const pole = A0.clone().addScaledVector(fwd, 0.6).add(new V3(0, -0.15, 0)).addScaledVector(side, 0.08);
        solve2(ch[0], ch[1], ch[2], T0, pole);
        const hm = ch[2].getWorldPosition(new V3()), hp = ch[3].getWorldPosition(new V3());
        const foot = F.pos.clone().add(new V3(0, 0.045, 0)).addScaledVector(fwd, -curl * 0.04);
        turnBone(ch[2], hp.sub(hm).normalize(), foot.sub(hm).normalize());
        setWorldQuat(ch[3], yawQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new V3(1, 0, 0), curl * 0.9)));
      }
    }
    // szőr: közelről mind a 8 réteg, távolabb kevesebb, messze egy sem
    const dCam = o.camera ? o.camera.position.distanceTo(J.pos) : 10;
    const ns = dCam < 14 ? 8 : dCam < 28 ? 4 : dCam < 45 ? 2 : 0;
    this.shells.forEach((sh, k) => { sh.visible = ns === 8 || (ns === 4 && k % 2 === 1) || (ns === 2 && k % 4 === 3); });
    // szemek: nappal borostyán, éjjel a lámpafényt visszaverő zöldessárga ragyogás
    this.eyeMat.emissive.setRGB(1.6, 1.9, 0.5).multiplyScalar(o.night * 0.9);
  }
}

// ---------------------------------------------------------------- letöltött, textúrázott modell (Sketchfab: "Jaguarsf")
// A modell saját csontvázát a közös járás-logika mozgatja: a nyugalmi pózra a test tengelyei körüli elforgatások
// kerülnek (medence-dőlés, gerinc, nyak, fej, állkapocs, fülek, farok), a lábakat IK teszi a talppontokra.
// általános GLB-betöltő (a hiba nem állítja meg a játékot: null, és marad a tartalék)
export async function loadModel(url) {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    return await new GLTFLoader().loadAsync(url);
  } catch (e) {
    console.warn('A modell nem tölthető be:', url, e);
    return null;
  }
}
export async function loadJaguarModel() {
  try {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    return await new GLTFLoader().loadAsync('assets/models/jaguar.glb');
  } catch (e) {
    console.warn('A jaguár-modell nem tölthető be, az eljárásos jaguár marad:', e);
    return null;
  }
}
const AX = new V3(1, 0, 0), AY = new V3(0, 1, 0);
export class JaguarModel extends Gait {
  constructor(scene, gltf) {
    super();
    const S = 3.1, root = gltf.scene;
    root.scale.setScalar(S);
    const g = new THREE.Group(); g.add(root); scene.add(g); g.updateMatrixWorld(true);
    const bone = (re) => { let r = null; root.traverse((o) => { if (!r && o.isBone && re.test(o.name)) r = o; }); return r; };
    this.B = {
      pelvis: bone(/^PantherPelvis/), rib: bone(/^PantherRibcage_/), neck1: bone(/^neck_01/), neck2: bone(/^neck_02/), head: bone(/^head_/), jaw: bone(/^jaw_/),
      spine: [2, 3, 4, 5, 6].map((i) => bone(new RegExp(`^PantherSpine${i}_`))),
      tail: [1, 2, 3, 4, 5].map((i) => bone(new RegExp(`^PantherTail${i}_`))),
      ears: [bone(/Bone008_/), bone(/Bone009_/)],
    };
    this.all = [];
    root.traverse((o) => {
      if (o.isBone) { o.userData.q0 = o.quaternion.clone(); this.all.push(o); }
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => patch(m, 'jaguarGLB'));
      }
    });
    // lábak: comb/felkar, lábszár/alkar, csánk/kéztő, ujjak; nyugalmi talppont és a csánk helye a talpponthoz képest
    const wp = (b) => b.getWorldPosition(new V3());
    const leg = (side, front) => ['Leg1', 'Leg2', 'LegPalm', 'LegDigit01', 'LegDigit02'].map((n) => bone(new RegExp(`^Panther${side}${n}${front ? '_\\(1\\)' : ''}_\\d+$`)));
    this.feet = [['LF', 'L', true, 1], ['RF', 'R', true, -1], ['LH', 'L', false, 1], ['RH', 'R', false, -1]].map(([name, sd, front, s]) => {
      const chain = leg(sd, front), P = wp(chain[3]);
      return { name, front, s, chain, rest: [P.x, P.z], cH: P.y, ank: wp(chain[2]).sub(P), dq: chain[3].getWorldQuaternion(new THREE.Quaternion()) };
    });
    const hz = (this.feet[2].rest[1] + this.feet[3].rest[1]) / 2, fz = (this.feet[0].rest[1] + this.feet[1].rest[1]) / 2;
    this.initGait(hz, fz);
    // éjszakai szemfény (tapetum): két kis világító pont a szemek helyén, a fej-csonthoz kötve
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
    for (const s of [1, -1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.011 / S, 10, 8), this.eyeMat);
      e.position.copy(this.B.head.worldToLocal(new V3(s * 0.0215 * S, 0.2075 * S, 0.2335 * S)));
      e.visible = false; this.B.head.add(e); (this.eyes ||= []).push(e);
    }
    this.g = g; this.gq = g.quaternion;
    this.tris = 0; root.traverse((o) => { if (o.isMesh) this.tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  }
  // elforgatás a test egy tengelye körül (világban), a csont jelenlegi helyzetére
  rotB(bone, axis, ang) {
    if (!bone || Math.abs(ang) < 1e-5) return;
    _q1.setFromAxisAngle(_p.copy(axis).applyQuaternion(this.gq), ang);
    bone.getWorldQuaternion(_q2); bone.parent.getWorldQuaternion(_q3);
    bone.quaternion.copy(_q2.premultiply(_q1).premultiply(_q3.invert()));
    bone.updateMatrixWorld(true);
  }
  update(dt, J, o) {
    const G = this.gait(dt, J, o), g = this.g, B = this.B, gal = G.gal;
    const crouchY = this.crouch * 0.17 + this.drink * 0.04;
    g.position.set(J.pos.x, G.hG - crouchY + G.bob - 0.03 * gal, J.pos.z); g.rotation.y = J.yaw;
    for (const b of this.all) b.quaternion.copy(b.userData.q0);
    g.updateMatrixWorld(true);
    // gerinc: dőlés a talajhoz, vágtában hullámzik, fordulásnál oldalra görbül
    this.rotB(B.pelvis, AX, G.pitch);
    B.spine.forEach((b, i) => { this.rotB(b, AY, G.turn * 0.035); this.rotB(b, AX, (i < 2 ? 0.05 : -0.035) * G.flex); });
    this.rotB(B.rib, AX, this.drink * 0.1 + this.crouch * 0.06);
    // nyak, fej: a célpont felé; lopakodáskor lent, ivásnál a vízhez hajol
    this.aim(dt, J, o, B.neck1.getWorldPosition(new V3()));
    const nb = Math.sin(this.ph * Math.PI * 4) * 0.02 * (1 - gal) * Math.min(1, J.speed);
    this.rotB(B.neck1, AX, this.drink * 0.45 + this.crouch * 0.12 - 0.08 * gal + nb);
    this.rotB(B.neck1, AY, this.look.x * 0.25 + G.turn * 0.05);
    this.rotB(B.neck2, AX, this.drink * 0.35 + this.crouch * 0.08);
    this.rotB(B.neck2, AY, this.look.x * 0.3);
    this.rotB(B.head, AX, -G.pitch * 0.7 + this.look.y + this.drink * 0.3 - this.crouch * 0.2 + 0.08 * gal);
    this.rotB(B.head, AY, this.look.x * 0.35);
    this.rotB(B.jaw, AX, this.jawOpen * 0.45 + (this.drink > 0.5 ? Math.max(0, Math.sin(o.time * 7)) * 0.1 : 0));
    // fülek: lopakodáskor hátrasimulnak, néha megrebbennek
    B.ears.forEach((e, i) => this.rotB(e, AX, -this.crouch * 0.35 + Math.max(0, Math.sin(o.time * 0.7 + i * 2.1) - 0.93) * 6));
    // farok: lengés, fordulásnál kileng, vágtában hátrafelé emelkedik, lopakodáskor alacsonyan, a vége rángatózik
    const tw = this.crouch > 0.5 ? Math.sin(o.time * 9) * Math.max(0, Math.sin(o.time * 0.9)) : 0;
    B.tail.forEach((t, i) => {
      const sw = Math.sin(o.time * (1.6 + gal) - i * 0.7) * (0.1 + i * 0.04) * (1 - gal * 0.6);
      this.rotB(t, AX, i === 0 ? 0.05 + 0.55 * gal - this.crouch * 0.2 : (i >= 3 ? 0.15 + tw * 0.35 : -0.02 * gal));
      this.rotB(t, AY, sw - G.turn * 0.06 * (i + 1));
    });
    // lábak: IK a talppontokra (comb/felkar + lábszár/alkar a csánkhoz, a csánk az ujjakhoz), az ujjak laposan a talajon
    const fwd = G.fwd;
    for (const F of this.feet) {
      const ch = F.chain, A0 = ch[0].getWorldPosition(new V3());
      const curl = F.swing ? Math.sin(Math.PI * F.u) : 0;
      const side = new V3(G.c, 0, -G.s).multiplyScalar(F.s);
      const contact = F.pos.clone(); contact.y += F.cH;
      const T0 = contact.clone().add(F.ank.clone().applyQuaternion(this.gq)).add(new V3(0, curl * 0.05, 0)).addScaledVector(fwd, -curl * 0.05);
      const pole = F.front ? A0.clone().addScaledVector(fwd, -0.6).add(new V3(0, -0.25, 0)).addScaledVector(side, 0.08)
        : A0.clone().addScaledVector(fwd, 0.6).add(new V3(0, -0.15, 0)).addScaledVector(side, 0.08);
      solve2(ch[0], ch[1], ch[2], T0, pole);
      const a = ch[2].getWorldPosition(new V3()), d = ch[3].getWorldPosition(new V3());
      turnBone(ch[2], d.sub(a).normalize(), contact.clone().addScaledVector(fwd, -curl * 0.03).sub(a).normalize());
      const qc = new THREE.Quaternion().setFromAxisAngle(side.clone().multiplyScalar(F.s), curl * 1.0);
      setWorldQuat(ch[3], qc.multiply(this.gq.clone().multiply(F.dq)));
    }
    // szemfény: csak sötétben, zöldessárgán
    const nn = Math.max(0, (o.night - 0.15) / 0.85);
    this.eyeMat.color.setRGB(2.2, 2.6, 0.7).multiplyScalar(nn);
    for (const e of this.eyes) e.visible = nn > 0.02;
  }
}
