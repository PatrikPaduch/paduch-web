// Domborzat: tisztás, tó, sziklafal-amfiteátrum vízeséssel, alsó és felső folyó, ösvények
import * as THREE from 'three';
import { fbm, simplex2, smoothstep, lerp, clamp } from './noise.js';

export const SIZE = 400, HALF = 200, N = 401;
export const UPPER = 16.2;
export const POND = { x: 10, z: -44, r: 11 };
export const CAMP = { x: -4, z: 3 };
// Ősi templomrom a fennsíkon (a lépcső dél felé, +z irányba néz)
export const TEMPLE = { x: -45, z: -95, y: 18.3 };
// A Napkapu: kőkör a völgy délnyugati végén (y-t a modul végén számoljuk a kiegyenlítés előtti terepből)
export const NAPKAPU = { x: -100, z: 105, y: 0 };
// Barlang a vízesés mögött: a nyugati parttól párkány vezet a szájához
export const CAVE_MOUTH = { x: 7.6, z: -51.6, y: 0.35 };
const LEDGE = [[-0.8, -46.6], [1.6, -48.6], [5, -50.0], [7, -50.8], [7.6, -51.5], [7.6, -52.3]];
export function ledgeDist(x, z) {
  let d = 1e9;
  for (let i = 0; i < LEDGE.length - 1; i++) {
    const [ax, az] = LEDGE[i], [bx, bz] = LEDGE[i + 1], vx = bx - ax, vz = bz - az;
    const t0 = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    d = Math.min(d, Math.hypot(x - ax - vx * t0, z - az - vz * t0));
  }
  return d;
}

function catmull(pts, sub) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export const RIVER = catmull([[10, -44], [16, -32], [26, -16], [40, -2], [47, 18], [42, 40], [50, 66], [64, 96], [76, 132], [84, 170], [90, 215], [94, 260]], 8);
export const UPR = catmull([[10, -54.2], [9, -66], [3, -82], [-6, -100], [-3, -124], [-12, -152], [-20, -185], [-26, -230], [-30, -270]], 8);
export const PATHS = [
  [[3, 18], [2, 8], [4, -4], [7, -16], [6, -28]],
  [[-4, 6], [-16, 2], [-30, -6], [-46, -4], [-62, -12], [-76, -28], [-86, -48], [-92, -70], [-96, -92], [-90, -112]],
  [[6, 10], [20, 8], [34, 4]],
  // a feljáró tetejétől a templom lépcsőjéig
  [[-96, -92], [-84, -86], [-70, -80], [-56, -76], [-45, -72]],
].map(p => catmull(p, 6));

export function polyInfo(x, z, poly) {
  let best = 1e18, bi = 0, bt = 0;
  for (let i = 0; i < poly.length - 1; i++) {
    const ax = poly[i][0], az = poly[i][1];
    const dx = poly[i + 1][0] - ax, dz = poly[i + 1][1] - az;
    const l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = ax + dx * t - x, pz = az + dz * t - z;
    const d = px * px + pz * pz;
    if (d < best) { best = d; bi = i; bt = t; }
  }
  const dx = poly[bi + 1][0] - poly[bi][0], dz = poly[bi + 1][1] - poly[bi][1];
  const l = Math.hypot(dx, dz) || 1;
  return { d: Math.sqrt(best), tx: dx / l, tz: dz / l, i: bi, t: bt };
}
const polyDist = (x, z, poly) => polyInfo(x, z, poly).d;

function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
}

export function cliffZ(x) {
  const away = smoothstep(4, 12, Math.abs(x - 10));
  return -53 - 0.0022 * (x - 10) * (x - 10) + (2.4 * simplex2(x * 0.045, 3.7) + 1.4 * simplex2(x * 0.21, 7.7) + 0.5 * simplex2(x * 0.6, 2.1)) * away;
}
export function cliffW(x) {
  return (3.6 + 1.2 * simplex2(x * 0.08, 5.5) + 17 * smoothstep(-45, -95, x)) * lerp(0.3, 1, smoothstep(2.5, 8, Math.abs(x - 10)));
}
// Lépcsőzetes sziklafal: keskeny, növényzettel benőhető párkányok
export function cliffT(x, z) {
  const z0 = cliffZ(x), w = cliffW(x);
  let t = smoothstep(z0 + w, z0 - w, z);
  if (w > 2 && w < 8) {
    const k = 3 + (simplex2(x * 0.05, 9.1) > 0 ? 1 : 0), f = t * k, i = Math.floor(f);
    const st = (Math.min(i, k - 1) + smoothstep(0.3, 0.8, f - Math.min(i, k - 1))) / k;
    t = lerp(t, st, 0.75 * smoothstep(2, 3.5, w));
  }
  return t;
}
export const LIP_Z = cliffZ(10) - cliffW(10);

export function forestFn(x, z) {
  const cd = segDist(x, z, 0, 8, 10, -44);
  let f = smoothstep(17, 33, cd);
  f *= 0.78 + 0.22 * fbm(x * 0.03 + 50, z * 0.03, 2);
  return f;
}

export function heightFn(x, z, skipNK = false) {
  const r = Math.hypot(x, z);
  const rc = Math.hypot(x, z - 6);
  let L = 2.4 + 2.6 * fbm(x * 0.011, z * 0.011, 4) + 0.7 * fbm(x * 0.05 + 7, z * 0.05 - 3, 3);
  L += smoothstep(26, 70, rc) * 3.2 * fbm(x * 0.022 + 11, z * 0.022 + 5, 3);
  L = lerp(L, 2.0 + 0.3 * fbm(x * 0.08, z * 0.08, 2), smoothstep(32, 12, rc));
  L = Math.max(L, 1.1);
  const dp = Math.hypot(x - POND.x, z - POND.z);
  const pf = smoothstep(POND.r + 4, POND.r - 3, dp);
  if (pf > 0) L = lerp(L, -2.6 + 1.7 * smoothstep(0, POND.r, dp), pf);
  let rf = 0;
  if (z > -60) {
    const rd = polyDist(x, z, RIVER);
    const rw = 3.0 + 1.2 * simplex2(x * 0.03, z * 0.03);
    rf = smoothstep(rw + 3.5, rw - 0.8, rd);
    if (rf > 0) L = lerp(L, -1.6, rf);
  }
  // párkány a sziklafal tövében a vízesés mögé (csak feltölt, nem mélyít)
  {
    const lf = smoothstep(1.7, 0.75, ledgeDist(x, z));
    if (lf > 0) L = lerp(L, Math.max(L, 0.36 + 0.08 * simplex2(x * 0.7, z * 0.7)), lf);
  }
  const t = cliffT(x, z);
  let h = L, uf = 0;
  if (t > 0) {
    let U = 18.2 + 1.4 * fbm(x * 0.03 + 3, z * 0.03 + 9, 3);
    U = Math.max(U, 17.0);
    const ud = polyDist(x, z, UPR);
    uf = smoothstep(5.0, 1.8, ud);
    if (uf > 0) U = lerp(U, 14.8, uf);
    h = lerp(L, U, t);
  }
  // a templom alapja: sík terasz
  const dT = Math.hypot(x - TEMPLE.x, z - TEMPLE.z);
  if (dT < 36) h = lerp(h, TEMPLE.y, smoothstep(36, 25, dT));
  const rim = smoothstep(150, 196, r) * (22 + 14 * fbm(x * 0.012 + 40, z * 0.012, 3))
    + smoothstep(200, 430, r) * (55 + 45 * fbm(x * 0.004, z * 0.004, 3));
  h += rim * (1 - Math.max(rf, uf * t));
  if (!skipNK) {
    const dN = Math.hypot(x - NAPKAPU.x, z - NAPKAPU.z);
    if (dN < 24) h = lerp(h, NAPKAPU.y, smoothstep(24, 12, dN));
  }
  return h;
}
NAPKAPU.y = heightFn(NAPKAPU.x, NAPKAPU.z, true);

export function buildTerrain() {
  const H = new Float32Array(N * N), NY = new Float32Array(N * N);
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) H[iz * N + ix] = heightFn(-HALF + ix, -HALF + iz);
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const gx = (H[iz * N + Math.min(N - 1, ix + 1)] - H[iz * N + Math.max(0, ix - 1)]) / 2;
    const gz = (H[Math.min(N - 1, iz + 1) * N + ix] - H[Math.max(0, iz - 1) * N + ix]) / 2;
    NY[iz * N + ix] = 1 / Math.sqrt(1 + gx * gx + gz * gz);
  }

  const heightAt = (x, z) => {
    const fx = x + HALF, fz = z + HALF;
    if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return heightFn(x, z);
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * N + ix;
    return (H[i] * (1 - tx) + H[i + 1] * tx) * (1 - tz) + (H[i + N] * (1 - tx) + H[i + N + 1] * tx) * tz;
  };
  const idx = (x, z) => clamp(Math.round(z + HALF), 0, N - 1) * N + clamp(Math.round(x + HALF), 0, N - 1);
  const slopeAt = (x, z) => 1 - NY[idx(x, z)];
  // Vízszint-rács: a felső szint csak a felső folyó medrében érvényes
  const WL = new Uint8Array(N * N);
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const x = -HALF + ix, z = -HALF + iz;
    if (z < -48 && cliffT(x, z) > 0.6 && polyInfo(x, z, UPR).d < 9) WL[iz * N + ix] = 1;
  }
  const waterLevelAt = (x, z) => (WL[idx(x, z)] ? UPPER : 0);

  // Folyásirány, hab, ösvény, erdő, nedvesség textúrák
  const impact = { x: 10, z: LIP_Z + 2.9 };
  const hd = new Uint16Array(N * N * 4), sp = new Uint8Array(N * N * 4);
  const SPL = new Float32Array(N * N * 3);
  const toH = THREE.DataUtils.toHalfFloat;
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const x = -HALF + ix, z = -HALF + iz, i = iz * N + ix, h = H[i];
    let fx = 0, fz = 0, foam = 0;
    const t = cliffT(x, z);
    if (t > 0.5) {
      const u = polyInfo(x, z, UPR); const s = smoothstep(7, 1, u.d);
      fx = -u.tx * s * 1.3; fz = -u.tz * s * 1.3;
    } else if (z > -62) {
      const rr = polyInfo(x, z, RIVER); const s = smoothstep(9, 1.5, rr.d);
      fx = rr.tx * s; fz = rr.tz * s;
      const dI = Math.hypot(x - impact.x, z - impact.z);
      const pr = smoothstep(16, 2, dI) * 0.9 * (1 - s * 0.5);
      fx = lerp(fx, (x - impact.x) / (dI + 0.01) * 0.8, pr);
      fz = lerp(fz, (z - impact.z) / (dI + 0.01) * 0.8, pr);
      foam = smoothstep(7.5, 0.5, dI);
    }
    hd[i * 4] = toH(h); hd[i * 4 + 1] = toH(fx); hd[i * 4 + 2] = toH(fz); hd[i * 4 + 3] = toH(foam);

    let path = 0;
    for (const p of PATHS) path = Math.max(path, smoothstep(2.1, 0.7, polyDist(x, z, p) + 0.6 * simplex2(x * 0.2, z * 0.2)));
    const forest = forestFn(x, z);
    const lvl = WL[i] ? UPPER : 0;
    const wet = smoothstep(1.0, 0.0, h - lvl);
    const flw = smoothstep(0.15, 0.55, fbm(x * 0.05 + 20, z * 0.05, 3)) * (1 - forest);
    sp[i * 4] = path * 255; sp[i * 4 + 1] = forest * 255; sp[i * 4 + 2] = wet * 255; sp[i * 4 + 3] = flw * 255;
    SPL[i * 3] = path; SPL[i * 3 + 1] = forest; SPL[i * 3 + 2] = flw;
  }
  const tHeight = new THREE.DataTexture(hd, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  tHeight.minFilter = tHeight.magFilter = THREE.LinearFilter; tHeight.needsUpdate = true;
  const tSplat = new THREE.DataTexture(sp, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tSplat.minFilter = tSplat.magFilter = THREE.LinearFilter; tSplat.needsUpdate = true;

  const pathAt = (x, z) => SPL[idx(x, z) * 3];
  const forestAt = (x, z) => SPL[idx(x, z) * 3 + 1];
  const flowerAt = (x, z) => SPL[idx(x, z) * 3 + 2];

  // Fő terepháló 8x8 csempében (látótér-vágáshoz), normálok a teljes rácsból (nincs varrat)
  const NRM = new Float32Array(N * N * 3);
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
    const gx = (H[iz * N + Math.min(N - 1, ix + 1)] - H[iz * N + Math.max(0, ix - 1)]) / 2;
    const gz = (H[Math.min(N - 1, iz + 1) * N + ix] - H[Math.max(0, iz - 1) * N + ix]) / 2;
    const l = Math.sqrt(gx * gx + 1 + gz * gz), i = (iz * N + ix) * 3;
    NRM[i] = -gx / l; NRM[i + 1] = 1 / l; NRM[i + 2] = -gz / l;
  }
  const tiles = [], TS = 50;
  for (let tz = 0; tz < (N - 1) / TS; tz++) for (let tx = 0; tx < (N - 1) / TS; tx++) {
    const p = [], nn = [], idx = [];
    for (let z = 0; z <= TS; z++) for (let x = 0; x <= TS; x++) {
      const ix = tx * TS + x, iz = tz * TS + z, i = iz * N + ix;
      p.push(-HALF + ix, H[i], -HALF + iz); nn.push(NRM[i * 3], NRM[i * 3 + 1], NRM[i * 3 + 2]);
    }
    for (let z = 0; z < TS; z++) for (let x = 0; x < TS; x++) {
      const a = z * (TS + 1) + x, b = a + 1, c = a + TS + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    g.setIndex(idx); g.computeBoundingSphere();
    tiles.push(g);
  }
  // Alacsony felbontású, láthatatlan árnyékvető a sziklafal árnyékához
  const SN = 101, sp2 = [], si2 = [];
  for (let z = 0; z < SN; z++) for (let x = 0; x < SN; x++) sp2.push(-HALF + x * 4, H[(z * 4) * N + x * 4] - 0.45, -HALF + z * 4);
  for (let z = 0; z < SN - 1; z++) for (let x = 0; x < SN - 1; x++) { const a = z * SN + x, b = a + 1, c = a + SN, d = c + 1; si2.push(a, c, b, b, c, d); }
  const shadowGeo = new THREE.BufferGeometry();
  shadowGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp2, 3));
  shadowGeo.setIndex(si2); shadowGeo.computeVertexNormals(); shadowGeo.computeBoundingSphere();

  // Távoli hegykoszorú (gyűrű)
  const rings = 44, segs = 200;
  const fp = [], fc = [], fi = [];
  for (let j = 0; j < rings; j++) {
    const r = 175 * Math.pow(950 / 175, j / (rings - 1));
    for (let k = 0; k <= segs; k++) {
      const a = k / segs * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
      let y = heightFn(x, z) + (r > 200 ? 3.5 * simplex2(x * 0.05, z * 0.05) : 0);
      y -= 1.4 * (1 - smoothstep(285, 305, r));
      fp.push(x, y, z);
      const n = simplex2(x * 0.02, z * 0.02) * 0.5 + 0.5;
      const c = new THREE.Color().setRGB(0.10 + 0.05 * n, 0.19 + 0.07 * n, 0.07 + 0.03 * n, THREE.SRGBColorSpace);
      fc.push(c.r, c.g, c.b);
    }
  }
  for (let j = 0; j < rings - 1; j++) for (let k = 0; k < segs; k++) {
    const a = j * (segs + 1) + k, b = a + segs + 1;
    fi.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const far = new THREE.BufferGeometry();
  far.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
  far.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
  far.setIndex(fi);
  far.computeVertexNormals();
  let ny = 0; const fn = far.attributes.normal;
  for (let i = 0; i < fn.count; i += 97) ny += fn.getY(i);
  if (ny < 0) { for (let i = 0; i < fi.length; i += 3) { const t = fi[i + 1]; fi[i + 1] = fi[i + 2]; fi[i + 2] = t; } far.setIndex(fi); far.computeVertexNormals(); }

  // Felső folyó vízszalagja
  const up = [], ui = [];
  for (let i = 0; i < UPR.length; i++) {
    const a = UPR[Math.max(0, i - 1)], b = UPR[Math.min(UPR.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const nx = -tz, nz = tx, w = 8;
    up.push(UPR[i][0] + nx * w, UPPER, UPR[i][1] + nz * w, UPR[i][0] - nx * w, UPPER, UPR[i][1] - nz * w);
    if (i < UPR.length - 1) { const k = i * 2; ui.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const upGeo = new THREE.BufferGeometry();
  upGeo.setAttribute('position', new THREE.Float32BufferAttribute(up, 3));
  upGeo.setIndex(ui);
  upGeo.computeVertexNormals();
  const un = upGeo.attributes.normal;
  for (let i = 0; i < un.count; i++) un.setXYZ(i, 0, 1, 0);
  // indexek iránya: felfelé nézzen
  {
    const p = upGeo.attributes.position, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    A.fromBufferAttribute(p, ui[0]); B.fromBufferAttribute(p, ui[1]); C.fromBufferAttribute(p, ui[2]);
    const nrm = B.sub(A).cross(C.sub(A));
    if (nrm.y < 0) { for (let i = 0; i < ui.length; i += 3) { const t = ui[i + 1]; ui[i + 1] = ui[i + 2]; ui[i + 2] = t; } upGeo.setIndex(ui); }
  }

  return {
    H, tiles, shadowGeo, far, upGeo, tHeight, tSplat, heightAt, slopeAt, waterLevelAt, pathAt, forestAt, flowerAt,
    impact, lipZ: LIP_Z,
  };
}
