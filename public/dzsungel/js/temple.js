// Ősi lépcsős templomrom a fennsíkon: piramis, meredek lépcső, szentély az Arany Jaguárral, omladék, benőtt növényzet.
// A járható felületet a heightAt() írja le, így a játékos fel tud menni a lépcsőn, a falak pedig megállítják.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patch } from './shaders.js';
import { TEMPLE } from './terrain.js';
import { cellUV } from './textures.js';
import { templeMatPBR } from './materials.js';

const V3 = THREE.Vector3;
const TIERS = 5, TH = 2.2, HS0 = 13, STEP = 2.2;            // teraszok: magasság, alap fél-szélesség, beljebb lépés
const ST_W = 2.6, ST_FRONT = HS0 + 5, RISE = 0.3, RUN = 0.37; // lépcső: fél-szélesség, elülső vége, fok
const TOP = TEMPLE.y + TIERS * TH;                             // a felső terasz szintje
const SH = { hx: 3.0, hz: 2.5, wall: 0.55, h: 3.2, door: 0.85 };  // szentély

export class Temple {
  constructor(scene, flora, plants, atlas) {
    this.c = new V3(TEMPLE.x, TEMPLE.y, TEMPLE.z);
    this.found = false; this.discovered = false;
    const geos = [];
    const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.applyMatrix4(new THREE.Matrix4().compose(new V3(TEMPLE.x + x, TEMPLE.y + y, TEMPLE.z + z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(1, 1, 1)));
      geos.push(g.toNonIndexed());
    };
    const rnd = mulberry(91);
    // teraszok + kiugró párkány minden terasz tetején, sarkokon letört kövek
    for (let k = 0; k < TIERS; k++) {
      const hs = HS0 - STEP * k, y0 = k * TH;
      box(hs * 2, TH, hs * 2, 0, y0 + TH / 2, 0);
      box(hs * 2 + 0.3, 0.28, hs * 2 + 0.3, 0, y0 + TH - 0.14, 0);
      for (let b = 0; b < 10; b++) {
        const side = Math.floor(rnd() * 4), t = (rnd() - 0.5) * 2 * hs;
        const [x, z] = side === 0 ? [t, hs + 0.3] : side === 1 ? [t, -hs - 0.3] : side === 2 ? [hs + 0.3, t] : [-hs - 0.3, t];
        if (side === 0 && Math.abs(t) < ST_W + 0.6) continue;
        box(0.6 + rnd() * 0.8, 0.4 + rnd() * 0.5, 0.5 + rnd() * 0.6, x, y0 + TH + 0.15, z, rnd() * 0.4, rnd() * 3, rnd() * 0.4);
      }
    }
    // lépcső (tömör fokok) + két ferde korlátfal
    const nSteps = Math.round((TIERS * TH) / RISE);
    for (let i = 0; i < nSteps; i++) {
      const z = ST_FRONT - i * RUN - RUN / 2, top = (i + 1) * RISE;
      if (z < HS0 - STEP * (TIERS - 1)) break;
      box(ST_W * 2, top, RUN + 0.02, 0, top / 2, z);
      box(ST_W * 2, 0.08, 0.07, 0, top - 0.04, z + RUN / 2 + 0.035); // kiugró élperem: árnyékcsík a fokok alatt
    }
    const len = Math.hypot(ST_FRONT - (HS0 - STEP * (TIERS - 1)), TIERS * TH), ang = Math.atan2(TIERS * TH, ST_FRONT - (HS0 - STEP * (TIERS - 1)));
    for (const s of [-1, 1]) box(0.8, 0.7, len, s * (ST_W + 0.4), TIERS * TH / 2 + 0.2, (ST_FRONT + HS0 - STEP * (TIERS - 1)) / 2, ang, 0, 0);
    // szentély a csúcson: falak ajtónyílással, lépcsőzetes (álboltozatos) tető, tetőfésű
    const fy = TIERS * TH;
    box(SH.hx * 2, SH.h, SH.wall, 0, fy + SH.h / 2, -SH.hz + SH.wall / 2);
    for (const s of [-1, 1]) {
      box(SH.wall, SH.h, SH.hz * 2, s * (SH.hx - SH.wall / 2), fy + SH.h / 2, 0);
      const fw = SH.hx - SH.door;
      box(fw, SH.h, SH.wall, s * (SH.door + fw / 2), fy + SH.h / 2, SH.hz - SH.wall / 2);
    }
    box(SH.door * 2, 0.6, SH.wall, 0, fy + SH.h - 0.3, SH.hz - SH.wall / 2);
    for (let k = 0; k < 3; k++) box((SH.hx + 0.3 - k * 0.7) * 2, 0.4, (SH.hz + 0.3 - k * 0.6) * 2, 0, fy + SH.h + 0.2 + k * 0.4, 0);
    box(SH.hx * 1.4, 1.8, 0.35, 0, fy + SH.h + 1.9, -0.3);
    for (let k = 0; k < 6; k++) box(0.5, 0.6, 0.37, -SH.hx * 0.55 + k * 0.66, fy + SH.h + 1.9, -0.3 + 0.05);
    // oltár
    box(1.5, 0.9, 0.9, 0, fy + 0.45, -SH.hz + 1.2);
    // faragott kőoszlopok (sztélék) a lépcső lábánál, egy ledőlt
    this.colliders = [];
    for (const [x, z, fall] of [[-6.5, ST_FRONT + 1.5, 0], [6.5, ST_FRONT + 1.5, 0], [-12, ST_FRONT - 2, 1]]) {
      if (fall) box(0.9, 0.45, 3.2, x, 0.25, z, 0, 0.6, 0.08);
      else { box(0.9, 3.2, 0.45, x, 1.6, z); box(1.1, 0.25, 0.6, x, 3.3, z); }
      this.colliders.push({ x: TEMPLE.x + x, z: TEMPLE.z + z, r: 0.75 });
    }
    // omladék a piramis körül
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2, d = HS0 + 1 + rnd() * 7;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z > HS0 && Math.abs(x) < ST_W + 1.5) continue;
      const s = 0.4 + rnd() * 0.9;
      box(s * (1 + rnd()), s * 0.7, s, x, s * 0.25, z, rnd(), rnd() * 3, rnd());
      if (s > 0.8) this.colliders.push({ x: TEMPLE.x + x, z: TEMPLE.z + z, r: s * 0.8 });
    }
    const inner = [new THREE.Vector4(TEMPLE.x, TEMPLE.z, SH.hx - SH.wall + 0.02, SH.hz - SH.wall + 0.02), new THREE.Vector4(TOP - 0.3, TOP + SH.h - 0.02, 0, 0)];
    const mat = flora.rockTex ? templeMatPBR(flora.rockTex, inner) : flora.rockMat;
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    flora.colliders.push(...this.colliders);

    // benőtt növényzet: kúszónövény-függönyök a teraszok falán, páfrányok a párkányokon, fák a teraszokon
    const vine = { p: [], n: [], u: [], c: [], i: [] };
    const quad = (cx, cy, cz, nx, nz, w, h) => {
      const ax = new V3(-nz, 0, nx), k = vine.p.length / 3;
      for (const [sx, sy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
        vine.p.push(cx + ax.x * sx * w + nx * 0.05, cy + sy * h, cz + ax.z * sx * w + nz * 0.05);
        vine.n.push(nx, 0.3, nz); const [u, v] = cellUV(7, sx + 0.5, sy); vine.u.push(u, v); vine.c.push(0.8, 0.88, 0.72);
      }
      vine.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
    };
    for (let k = 0; k < TIERS; k++) {
      const hs = HS0 - STEP * k, y0 = TEMPLE.y + k * TH;
      for (let n = 0; n < 26; n++) {
        const side = Math.floor(rnd() * 4), t = (rnd() - 0.5) * 2 * (hs - 0.6);
        const [x, z, nx, nz] = side === 0 ? [t, hs, 0, 1] : side === 1 ? [t, -hs, 0, -1] : side === 2 ? [hs, t, 1, 0] : [-hs, t, -1, 0];
        if (side === 0 && Math.abs(t) < ST_W + 1.2) continue;
        // néha két terasznyi hosszan lelóg (a lenti teraszra is)
        const h = rnd() < 0.25 && k > 0 ? TH + 1 + rnd() * 1.2 : 1.4 + rnd() * 0.9;
        const w = 1.3 + rnd() * 1.3, o = n % 2 ? 0.02 : 0.08;
        quad(TEMPLE.x + x + nx * o, y0 + TH - h + 0.25, TEMPLE.z + z + nz * o, nx, nz, w, h);
      }
    }
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(vine.p, 3));
    vg.setAttribute('normal', new THREE.Float32BufferAttribute(vine.n, 3));
    vg.setAttribute('uv', new THREE.Float32BufferAttribute(vine.u, 2));
    vg.setAttribute('color', new THREE.Float32BufferAttribute(vine.c, 3));
    vg.setIndex(vine.i);
    scene.add(new THREE.Mesh(vg, flora.fol.still.mat));
    if (plants) {
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new V3();
      const ferns = new THREE.InstancedMesh(plants.fern.geos[0], plants.fern.mat, 90);
      let n = 0;
      for (let k = 0; k < TIERS && n < 90; k++) {
        const hs = HS0 - STEP * k - 1.1, y = TEMPLE.y + (k + 1) * TH;
        for (let j = 0; j < 20 && n < 90; j++) {
          const side = Math.floor(rnd() * 4), t = (rnd() - 0.5) * 2 * hs;
          const [x, z] = side === 0 ? [t, hs] : side === 1 ? [t, -hs] : side === 2 ? [hs, t] : [-hs, t];
          if (side === 0 && Math.abs(t) < ST_W + 0.8) continue;
          if (Math.abs(x) < SH.hx + 0.4 && Math.abs(z) < SH.hz + 0.4) continue; // a szentélyben ne
          Q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0)); S.setScalar(1.8 + rnd() * 1.4);
          M.compose(new V3(TEMPLE.x + x, y, TEMPLE.z + z), Q, S); ferns.setMatrixAt(n++, M);
        }
      }
      ferns.count = n; ferns.receiveShadow = true; scene.add(ferns);
      // két fa nő a teraszokon
      const pair = plants.pachira.pairs[1] || plants.pachira.pairs[0];
      for (const [x, z, k, s] of [[-HS0 + 3, -HS0 + 3, 1, 3.6], [HS0 - STEP * 2 - 1.5, -HS0 + STEP * 2 + 2, 3, 3.0]]) {
        Q.setFromEuler(new THREE.Euler(0, rnd() * 6, 0)); S.setScalar(s);
        M.compose(new V3(TEMPLE.x + x, TEMPLE.y + (k + 1) * TH, TEMPLE.z + z), Q, S);
        for (const [geo, mt] of [[pair.bark, plants.pachira.bark.mat], [pair.leaves, plants.pachira.leaf.mat]]) {
          const m = new THREE.Mesh(geo, mt); m.applyMatrix4(M); m.castShadow = true; m.receiveShadow = true;
          if (mt === plants.pachira.leaf.mat && plants.pachira.leaf.depth) m.customDepthMaterial = plants.pachira.leaf.depth;
          scene.add(m);
        }
      }
    }

    // Arany Jaguár szobor az oltáron
    const gold = patch(new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.22, emissive: new THREE.Color(0.25, 0.16, 0.02) }), 'basic');
    const idol = new THREE.Group();
    const part = (g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0) => { const m = new THREE.Mesh(g, gold); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; m.castShadow = true; idol.add(m); };
    part(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16), 0, 0.04, 0);
    part(new THREE.SphereGeometry(0.12, 14, 10), 0, 0.2, -0.02, 0.9, 1.2, 1.1);
    part(new THREE.SphereGeometry(0.08, 12, 10), 0, 0.38, 0.06);
    part(new THREE.ConeGeometry(0.03, 0.05, 6), 0.05, 0.46, 0.05); part(new THREE.ConeGeometry(0.03, 0.05, 6), -0.05, 0.46, 0.05);
    part(new THREE.CapsuleGeometry(0.025, 0.14, 3, 6), 0.05, 0.13, 0.08); part(new THREE.CapsuleGeometry(0.025, 0.14, 3, 6), -0.05, 0.13, 0.08);
    part(new THREE.TorusGeometry(0.1, 0.018, 6, 14, Math.PI), 0, 0.12, -0.14, 1, 1, 1, Math.PI / 2);
    const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.5, 0.8) });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), eyeM); e.position.set(s * 0.03, 0.4, 0.13); idol.add(e); }
    idol.position.set(TEMPLE.x, TOP + 0.9, TEMPLE.z - SH.hz + 1.2);
    idol.scale.setScalar(1.6);
    scene.add(idol);
    this.idol = idol;
    this.idolPos = idol.position.clone();
    this.gold = gold;
  }

  // Járható felszín magassága (vagy -Infinity, ha a templomon kívül van)
  heightAt(x, z) {
    const dx = x - TEMPLE.x, dz = z - TEMPLE.z, m = Math.max(Math.abs(dx), Math.abs(dz));
    let h = -Infinity;
    if (Math.abs(dx) < ST_W && dz < ST_FRONT && dz > HS0 - STEP * (TIERS - 1)) {
      const i = Math.floor((ST_FRONT - dz) / RUN);
      h = TEMPLE.y + Math.min(TIERS * TH, (i + 1) * RISE);
    }
    for (let k = TIERS - 1; k >= 0; k--) if (m < HS0 - STEP * k) { h = Math.max(h, TEMPLE.y + (k + 1) * TH); break; }
    // szentély falai (az ajtónál nyitott)
    if (Math.abs(dx) < SH.hx && Math.abs(dz) < SH.hz) {
      const inX = Math.abs(dx) < SH.hx - SH.wall, inZ = Math.abs(dz) < SH.hz - SH.wall;
      const door = dz > 0 && Math.abs(dx) < SH.door;
      if (!(inX && inZ) && !door) h = TOP + SH.h;
      else if (inX && inZ && Math.abs(dx) < 0.75 && dz < -SH.hz + 1.65) h = TOP + 0.9; // oltár
    }
    return h;
  }

  near(p, r) { return Math.hypot(p.x - TEMPLE.x, p.z - TEMPLE.z) < r; }
  idolNear(p) { return !this.found && p.distanceTo(this.idolPos) < 2.2; }
  takeIdol() { this.found = true; this.idol.visible = false; }
  update(t) { if (!this.found) { this.idol.rotation.y = Math.sin(t * 0.4) * 0.15; this.gold.emissive.setRGB(0.1, 0.06, 0.008).multiplyScalar(1 + Math.sin(t * 2.3) * 0.35); } }
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
