// Vadászat lándzsával: pekari-csordák az erdőben, kapibarák a víz partján, halak a tóban.
// A vad egy-egy InstancedMesh fajonként; a lábakat és a fejet a vertex shader mozgatja (példányonként fázis, lépéshossz, fejtartás).
// A lándzsa dobható (nyomva tartás = célzás, felengedés = dobás) vagy döfhető (rövid kattintás); a földbe, fába, zsákmányba áll,
// vízen fennmarad, és vissza kell érte menni.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { patch } from './shaders.js';
import { POND, RIVER, CAMP, TEMPLE } from './terrain.js';

const V3 = THREE.Vector3;
const rnd = Math.random;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDamp = (a, b, k, dt) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-k * dt)); };
const GRAV = 9.8;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new V3(), _v2 = new V3(), _s = new V3(1, 1, 1);
const UP = new V3(0, 1, 0);

// testrészek: 0 törzs, 1-4 lábak (BE, JE, BH, JH), 5 fej; a pivot a csípő/nyak, ekörül fordul a rész
function partGeo(parts, part, pivot) {
  const gs = parts.map(([g, c, m]) => {
    const x = g.index ? g.toNonIndexed() : g.clone();
    if (m) x.applyMatrix4(m);
    for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k);
    const n = x.attributes.position.count, col = new Float32Array(n * 3), pa = new Float32Array(n), pv = new Float32Array(n * 3);
    const cc = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    for (let i = 0; i < n; i++) { col.set([cc.r, cc.g, cc.b], i * 3); pa[i] = part; pv.set(pivot, i * 3); }
    x.setAttribute('color', new THREE.BufferAttribute(col, 3));
    x.setAttribute('aPart', new THREE.BufferAttribute(pa, 1));
    x.setAttribute('aPivot', new THREE.BufferAttribute(pv, 3));
    return x;
  });
  return mergeGeometries(gs);
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));

const DEFORM = `
float jAng = 0.0;
if (aPart > 0.5 && aPart < 4.5) { float lp = (aPart < 1.5 || aPart > 3.5) ? 0.0 : 3.14159; jAng = sin(iAnim.x + lp) * iAnim.y; }
else if (aPart > 4.5) jAng = iAnim.z;
float jc = cos(jAng), js = sin(jAng);`;
function preyMat() {
  const m = patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), 'prey', (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart; attribute vec3 aPivot; attribute vec3 iAnim;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n' + DEFORM + '\nobjectNormal = vec3(objectNormal.x, jc * objectNormal.y - js * objectNormal.z, js * objectNormal.y + jc * objectNormal.z);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec3 q = transformed - aPivot; transformed = aPivot + vec3(q.x, jc * q.y - js * q.z, js * q.y + jc * q.z); }');
  });
  const d = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'preyDepth', (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart; attribute vec3 aPivot; attribute vec3 iAnim;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + DEFORM + '\n{ vec3 q = transformed - aPivot; transformed = aPivot + vec3(q.x, jc * q.y - js * q.z, js * q.y + jc * q.z); }');
  });
  return [m, d];
}

// ---------------------------------------------------------------- fajok
const ell = (sx, sy, sz, seg = 14) => new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)).scale(sx, sy, sz);
function peccaryGeo() {
  const fur = [0.31, 0.28, 0.25], dark = [0.09, 0.08, 0.07], collar = [0.47, 0.44, 0.38], snout = [0.32, 0.22, 0.2], hoof = [0.05, 0.045, 0.04];
  const body = partGeo([
    [ell(0.2, 0.22, 0.4), fur, M4(0, 0.44, -0.06)],
    [ell(0.205, 0.26, 0.22), fur, M4(0, 0.48, 0.17)],                 // váll-púp: elöl magasabb
    [ell(0.05, 0.09, 0.4, 8), dark, M4(0, 0.63, 0.0)],                // sörte-taréj a gerincen
    [ell(0.209, 0.236, 0.03), collar, M4(0, 0.47, 0.25, -0.55)],       // világos "nyakörv"
    [ell(0.04, 0.035, 0.06, 6), dark, M4(0, 0.5, -0.45, 0.6)],        // farok
  ], 0, [0, 0, 0]);
  const neck = [0, 0.5, 0.3];
  const head = partGeo([
    [ell(0.12, 0.14, 0.17), fur, M4(0, 0.48, 0.43)],
    [new THREE.CylinderGeometry(0.045, 0.1, 0.24, 10), fur, M4(0, 0.42, 0.6, Math.PI / 2 + 0.3)],
    [new THREE.CylinderGeometry(0.048, 0.048, 0.02, 10), snout, M4(0, 0.383, 0.717, Math.PI / 2 + 0.3)],
    [new THREE.ConeGeometry(0.035, 0.08, 5), dark, M4(0.075, 0.62, 0.38, -0.4, 0, 0.35)],
    [new THREE.ConeGeometry(0.035, 0.08, 5), dark, M4(-0.075, 0.62, 0.38, -0.4, 0, -0.35)],
    [new THREE.SphereGeometry(0.016, 5, 4), [0.01, 0.01, 0.01], M4(0.07, 0.52, 0.53)],
    [new THREE.SphereGeometry(0.016, 5, 4), [0.01, 0.01, 0.01], M4(-0.07, 0.52, 0.53)],
  ], 5, neck);
  const legs = [[0.1, 0.22, 1], [-0.1, 0.22, 2], [0.1, -0.28, 3], [-0.1, -0.28, 4]].map(([x, z, p]) => partGeo([
    [new THREE.CylinderGeometry(0.05, 0.028, 0.34, 6), fur, M4(x, 0.22, z)],
    [new THREE.CylinderGeometry(0.026, 0.032, 0.06, 6), hoof, M4(x, 0.03, z + 0.01)],
  ], p, [x, 0.38, z]));
  return mergeGeometries([body, head, ...legs]);
}
function capybaraGeo() {
  const fur = [0.45, 0.3, 0.18], dark = [0.17, 0.11, 0.07], nose = [0.1, 0.07, 0.05];
  const body = partGeo([
    [ell(0.27, 0.27, 0.46), fur, M4(0, 0.5, -0.06)],
    [ell(0.25, 0.26, 0.2), fur, M4(0, 0.47, -0.36)],                  // lekerekített far (nincs farka)
  ], 0, [0, 0, 0]);
  const neck = [0, 0.56, 0.28];
  const head = partGeo([
    [ell(0.13, 0.15, 0.2), fur, M4(0, 0.6, 0.45)],
    [ell(0.115, 0.13, 0.15), fur, M4(0, 0.55, 0.6)],                  // tömpe, szögletes pofa
    [ell(0.08, 0.05, 0.04, 8), nose, M4(0, 0.56, 0.735)],
    [ell(0.04, 0.045, 0.02, 8), dark, M4(0.08, 0.75, 0.38)],
    [ell(0.04, 0.045, 0.02, 8), dark, M4(-0.08, 0.75, 0.38)],
    [new THREE.SphereGeometry(0.02, 5, 4), [0.01, 0.01, 0.01], M4(0.1, 0.67, 0.5)],
    [new THREE.SphereGeometry(0.02, 5, 4), [0.01, 0.01, 0.01], M4(-0.1, 0.67, 0.5)],
  ], 5, neck);
  const legs = [[0.15, 0.24, 1], [-0.15, 0.24, 2], [0.15, -0.3, 3], [-0.15, -0.3, 4]].map(([x, z, p]) => partGeo([
    [new THREE.CylinderGeometry(0.07, 0.05, 0.32, 7), fur, M4(x, 0.18, z)],
    [new THREE.CylinderGeometry(0.05, 0.056, 0.04, 7), dark, M4(x, 0.02, z + 0.015)],
  ], p, [x, 0.34, z]));
  return mergeGeometries([body, head, ...legs]);
}

const SPECIES = {
  peccary: { name: 'Pekari', icon: '🐗', geo: peccaryGeo, meat: 3, hear: 17, walk: 0.75, flee: 6.8, stride: 0.55, len: 0.36, hy: 0.44, r: 0.25, cadence: 1.0 },
  capybara: { name: 'Kapibara', icon: '🦫', geo: capybaraGeo, meat: 4, hear: 11, walk: 0.55, flee: 4.6, stride: 0.45, len: 0.4, hy: 0.48, r: 0.31, cadence: 0.8 },
};

export class Hunt {
  constructor(scene, T, flora, audio, fx, surv, player, animals) {
    Object.assign(this, { scene, T, flora, audio, fx, surv, player, animals });
    this.time = 0;
    [this.mat, this.depth] = preyMat();
    this.groups = []; this.prey = [];
    this.meshes = {};
    const spots = { peccary: [], capybara: [] };
    // pekari-csordák az erdőben
    for (let h = 0, tries = 0; h < 6 && tries < 400; tries++) {
      const x = -165 + rnd() * 330, z = -165 + rnd() * 330;
      if (!this.okLand(x, z) || this.T.forestAt(x, z) < 0.35 || Math.hypot(x - CAMP.x, z - CAMP.z) < 35) continue;
      if (this.groups.some((g) => Math.hypot(g.cx - x, g.cz - z) < 45)) continue;
      spots.peccary.push(this.addGroup('peccary', x, z, 3 + Math.floor(rnd() * 3))); h++;
    }
    // kapibarák a tó és a folyó partján
    const banks = [];
    for (let a = 0; a < 6.28; a += 0.5) banks.push([POND.x + Math.cos(a) * (POND.r + 3), POND.z + Math.sin(a) * (POND.r + 3)]);
    for (let i = 10; i < RIVER.length - 10; i += 6) banks.push([RIVER[i][0] + 6, RIVER[i][1]], [RIVER[i][0] - 6, RIVER[i][1]]);
    for (let h = 0, tries = 0; h < 3 && tries < 200; tries++) {
      const [x, z] = banks[Math.floor(rnd() * banks.length)];
      if (!this.okLand(x, z, true) || this.groups.some((g) => Math.hypot(g.cx - x, g.cz - z) < 30)) continue;
      spots.capybara.push(this.addGroup('capybara', x, z, 2 + Math.floor(rnd() * 2))); h++;
    }
    for (const sp of Object.keys(SPECIES)) {
      const list = this.prey.filter((p) => p.sp === sp);
      const geo = SPECIES[sp].geo();
      const anim = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.length) * 3), 3);
      anim.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iAnim', anim);
      const m = new THREE.InstancedMesh(geo, this.mat, Math.max(1, list.length));
      m.customDepthMaterial = this.depth;
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      m.count = list.length;
      list.forEach((p, i) => { p.i = i; p.mesh = m; p.anim = anim; });
      this.scene.add(m);
      this.meshes[sp] = m;
    }

    // a dobott lándzsa
    this.spear = new THREE.Mesh(surv.hand.spear.geometry, surv.hand.spear.material);
    this.spear.castShadow = true; this.spear.visible = false;
    this.scene.add(this.spear);
    this.shot = null;          // { state: 'fly'|'stuck'|'float'|'carcass', pos, vel, dir, fish, prey, rel }
    this.aim = null;           // { t } célzás közben
    this.stab = 0;
    this.noise = 0;            // zaj (pl. becsapódó lándzsa) a csordák riasztásához
  }

  okLand(x, z, shore = false) {
    const T = this.T, h = T.heightAt(x, z);
    if (Math.hypot(x, z) > 172 || T.slopeAt(x, z) > 0.55) return false;
    if (h < T.waterLevelAt(x, z) + (shore ? 0.12 : 0.25)) return false;
    if (Math.hypot(x - TEMPLE.x, z - TEMPLE.z) < 17) return false;
    return true;
  }
  addGroup(sp, x, z, n) {
    const g = { sp, cx: x, cz: z, home: [x, z], moveT: 20 + rnd() * 30, alarm: 0, members: [], gruntT: rnd() * 8 };
    for (let k = 0; k < n; k++) {
      const a = rnd() * 6.28, d = 1 + rnd() * 3.5;
      const p = { sp, g, pos: new V3(x + Math.cos(a) * d, 0, z + Math.sin(a) * d), yaw: rnd() * 6.28, speed: 0, state: 'graze', t: rnd() * 5,
        target: null, phase: rnd() * 6, head: 0, alive: true, deadK: 0, back: 0, swim: false, s: 0.9 + rnd() * 0.25 };
      p.pos.y = this.T.heightAt(p.pos.x, p.pos.z);
      g.members.push(p); this.prey.push(p);
    }
    this.groups.push(g);
    return g;
  }

  // ---------------------------------------------------------------- célzás, dobás, döfés
  canUse() { return this.surv.equipped === 'spear' && !this.surv.spearOut && !this.player.swim; }
  startAim() { if (!this.canUse() || this.aim) return false; this.aim = { t: 0 }; this.player.aim = true; this.player.rig?.upper('aim'); return true; }
  cancelAim() { if (!this.aim) return; this.aim = null; this.player.aim = false; this.player.rig?.upper(null); }
  // felengedés: rövid nyomás = döfés, hosszabb = dobás az erő szerint
  release(camera) {
    if (!this.aim) return null;
    const t = this.aim.t; this.cancelAim();
    if (t < 0.18) return this.doStab();
    return this.doThrow(camera, Math.min(1, (t - 0.1) / 0.8));
  }
  charge() { return this.aim ? Math.min(1, Math.max(0, (this.aim.t - 0.1) / 0.8)) : 0; }

  doStab() {
    this.player.rig?.upper('stab', 0.55);
    this.audio?.whoosh(0.5);
    this.stab = 0.22; // a találat a mozdulat közepén
    return null;
  }
  resolveStab() {
    const P = this.player.pos, f = _v.set(Math.sin(this.player.facing), 0, Math.cos(this.player.facing));
    // vad előttünk 2,4 m-en belül, ±40°-os kúpban
    for (const p of this.prey) {
      if (!p.alive) continue;
      const dx = p.pos.x - P.x, dz = p.pos.z - P.z, d = Math.hypot(dx, dz);
      if (d < 2.4 && (dx * f.x + dz * f.z) / (d || 1) > 0.75) return this.kill(p, null);
    }
    // hal a lábunk előtt a vízben
    for (const fi of this.animals.fish) {
      if (!fi.m.visible || fi.caught) continue;
      const q = fi.m.position, dx = q.x - P.x, dz = q.z - P.z, d = Math.hypot(dx, dz);
      if (d < 2.0 && (dx * f.x + dz * f.z) / (d || 1) > 0.6) { fi.caught = true; fi.m.visible = false; fi.hideT = 150; this.surv.inv.fish++; this.fx?.ripple(q.x, 0, q.z, 1.2, 1.2); this.audio?.plop(); return '+1 Hal'; }
    }
    return null;
  }

  doThrow(camera, power) {
    const P = this.player, rig = P.rig;
    rig?.upper('throw', 0.5);
    // célpont: a kamera középpontján át húzott sugár első akadálya (vagy 70 m)
    const o = camera.position, d = camera.getWorldDirection(new V3());
    let tgt = null;
    for (let s = 1; s < 70; s += 0.5) {
      const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s;
      if (y < this.T.heightAt(x, z)) { tgt = new V3(x, y, z); break; }
    }
    // a célpont közelében álló vadra pontosítunk (a sugár a hátukon csúszna át)
    let best = 1e9;
    for (const p of this.prey) {
      if (!p.alive) continue;
      const c = _v.copy(p.pos).addScaledVector(UP, SPECIES[p.sp].hy * p.s), t = c.clone().sub(o).dot(d);
      if (t < 1 || t > 70) continue;
      const off = c.clone().sub(o).addScaledVector(d, -t).length();
      if (off < 0.6 && t < best) { best = t; tgt = c.clone(); }
    }
    for (const fi of this.animals.fish) {
      if (fi.caught || !fi.m.visible) continue;
      const c = fi.m.position, t = c.clone().sub(o).dot(d);
      if (t < 1 || t > 25 || t > best) continue;
      if (c.clone().sub(o).addScaledVector(d, -t).length() < 0.5) { best = t; tgt = c.clone(); }
    }
    if (!tgt) tgt = o.clone().addScaledVector(d, 70);
    const start = new V3();
    (this.surv.hand.spear.parent || P.root).getWorldPosition(start);
    start.y = Math.max(start.y, P.pos.y + 1.45);
    const v = 15 + power * 15;
    // ballisztikus emelés, hogy a célkereszt felé repüljön
    const dx = Math.hypot(tgt.x - start.x, tgt.z - start.z), dy = tgt.y - start.y;
    const disc = v ** 4 - GRAV * (GRAV * dx * dx + 2 * dy * v * v);
    const elev = disc >= 0 ? Math.atan2(v * v - Math.sqrt(disc), GRAV * dx) : Math.PI / 4;
    const yaw = Math.atan2(tgt.x - start.x, tgt.z - start.z);
    // szórás: gyenge dobásnál és mozgás közben pontatlanabb
    const spread = 0.008 + (1 - power) * 0.03 + Math.min(1, P.speed / 3) * 0.02;
    const e2 = elev + (rnd() - 0.5) * 2 * spread, y2 = yaw + (rnd() - 0.5) * 2 * spread;
    const vel = new V3(Math.sin(y2) * Math.cos(e2), Math.sin(e2), Math.cos(y2) * Math.cos(e2)).multiplyScalar(v);
    this.shot = { state: 'fly', pos: start.clone().addScaledVector(vel.clone().normalize(), -0.5), vel, t: 0, fish: null, prey: null, start: start.clone() };
    this.surv.spearOut = true; this.surv.hand.spear.visible = false;
    this.spear.visible = true;
    this.audio?.whoosh(0.5 + power * 0.5);
    this.noise = 0;
    return null;
  }

  // ---------------------------------------------------------------- találatok
  kill(p, at) {
    p.alive = false; p.state = 'dead'; p.deadK = 0; p.speed = 0;
    const S = SPECIES[p.sp];
    this.audio?.squeal(0, p.sp === 'peccary' ? 0.35 : 0.15);
    this.alarm(p.g, this.player.pos);
    for (const g of this.groups) if (g !== p.g && Math.hypot(g.cx - p.pos.x, g.cz - p.pos.z) < 30) this.alarm(g, p.pos);
    if (at) { at.prey = p; }
    return `Elejtettél egy ${S.name.toLowerCase()}t! (E: feldolgozás)`;
  }
  alarm(g, from) {
    for (const m of g.members) {
      if (!m.alive) continue;
      const a = Math.atan2(m.pos.x - from.x, m.pos.z - from.z) + (rnd() - 0.5) * 0.9;
      m.state = 'flee'; m.t = 4 + rnd() * 2.5; m.fleeYaw = a;
    }
    g.alarm = 30;
  }

  // a dobott lándzsa repülése és becsapódása; visszaad egy üzenetet (vagy null-t)
  updateShot(dt) {
    const S = this.shot; if (!S) return null;
    const T = this.T;
    let msg = null;
    if (S.state === 'fly') {
      S.t += dt;
      const steps = Math.max(1, Math.ceil(S.vel.length() * dt / 0.15));
      const h = dt / steps;
      for (let k = 0; k < steps && S.state === 'fly'; k++) {
        S.vel.y -= GRAV * h;
        S.pos.addScaledVector(S.vel, h);
        const dir = _v2.copy(S.vel).normalize();
        const tip = _v.copy(S.pos).addScaledVector(dir, 1.45);
        // vad
        for (const p of this.prey) {
          if (!p.alive) continue;
          const sp = SPECIES[p.sp], f = new V3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
          const c = p.pos.clone().addScaledVector(UP, sp.hy * p.s);
          const A = c.clone().addScaledVector(f, sp.len * p.s), B = c.clone().addScaledVector(f, -sp.len * p.s);
          if (segDist(tip, A, B) < sp.r * p.s + 0.06) {
            // a találat felőli oldal kerüljön felülre, amikor eldől (így a lándzsa felfelé áll ki belőle)
            const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
            p.rollSign = ((tip.x - p.pos.x) * rx + (tip.z - p.pos.z) * rz) >= 0 ? 1 : -1;
            msg = this.kill(p, S);
            S.state = 'carcass';
            p.mesh.getMatrixAt(p.i, _m);
            this.placeSpear(S, tip.addScaledVector(dir, 0.12 + rnd() * 0.1), dir);
            S.rel = _m.clone().invert().multiply(this.spear.matrix);
            this.audio?.thunk(0.25);
            break;
          }
        }
        if (S.state !== 'fly') break;
        // jaguár
        const J = this.animals.jag;
        if (J && J.g.visible && J.state !== 'away' && J.state !== 'leave' && tip.distanceTo(J.pos.clone().addScaledVector(UP, 0.75)) < 0.75) {
          J.state = 'leave'; this.audio?.growl(1.3);
          S.vel.multiplyScalar(-0.12).add(new V3(0, 1.5, 0));
          msg = 'Eltaláltad a jaguárt, elmenekült!';
          continue;
        }
        // víz: hal, aztán fennmarad a felszínen
        const lvl = T.waterLevelAt(tip.x, tip.z), floor = T.heightAt(tip.x, tip.z);
        if (tip.y < lvl && lvl - floor > 0.15) {
          // a víz alatt még kb. 1,4 m-t halad tovább: ezen a szakaszon keressük a halat
          for (let k = 0; k <= 1.4 && !S.fish; k += 0.1) {
            const q2 = tip.clone().addScaledVector(dir, k);
            if (q2.y < T.heightAt(q2.x, q2.z)) break;
            for (const fi of this.animals.fish) {
              if (fi.caught || !fi.m.visible) continue;
              if (fi.m.position.distanceTo(q2) < 0.38) { fi.caught = true; S.fish = fi; msg = 'Halat szigonyoztál! Hozd ki a lándzsát.'; break; }
            }
          }
          S.state = 'float'; S.vel.multiplyScalar(0.25); S.vel.y = 0;
          this.fx?.ripple(tip.x, lvl, tip.z, 2.2, 1.6); this.audio?.plop();
          this.noise = 8; this.noisePos = tip.clone();
          break;
        }
        // fatörzs
        for (const c of this.flora.colliders) {
          if (c.r < 0.2) continue;
          const dx = tip.x - c.x, dz = tip.z - c.z;
          if (dx * dx + dz * dz > c.r * c.r || tip.y > floor + (c.h ?? 25)) continue;
          // a dobás kezdőpontját tartalmazó ütközőt (mellette állunk) nem vesszük figyelembe
          if (Math.hypot(S.start.x - c.x, S.start.z - c.z) < c.r + 0.4) continue;
          {
            S.state = 'stuck'; this.placeSpear(S, tip.addScaledVector(dir, -0.2), dir);
            this.audio?.thunk(0.3, true); this.noise = 10; this.noisePos = tip.clone(); break;
          }
        }
        if (S.state !== 'fly') break;
        // talaj (és a templom kövei)
        if (tip.y < floor) {
          S.state = 'stuck';
          const steep = dir.y > -0.25; // laposan érkezve elfekszik
          const d2 = steep ? new V3(dir.x, -0.18, dir.z).normalize() : dir;
          this.placeSpear(S, tip.addScaledVector(d2, steep ? -0.05 : -0.32), d2);
          this.audio?.thunk(0.28); this.noise = 9; this.noisePos = tip.clone();
          break;
        }
        if (S.t > 8) { S.state = 'stuck'; this.placeSpear(S, tip, dir); }
      }
      if (S.state === 'fly') this.placeSpear(S, _v.copy(S.pos).addScaledVector(_v2.copy(S.vel).normalize(), 1.45), _v2);
    } else if (S.state === 'float') {
      // vízen sodródik, vízszintesre dől
      const c = S.mid || (S.mid = S.pos.clone().addScaledVector(S.dir, 0.7));
      S.vel.multiplyScalar(Math.exp(-dt * 1.5));
      c.addScaledVector(S.vel, dt);
      const lvl = T.waterLevelAt(c.x, c.z);
      c.y = damp(c.y, lvl - 0.02 + Math.sin(this.time * 1.7) * 0.01, 3, dt);
      S.dir.y = damp(S.dir.y, 0, 2, dt); S.dir.normalize();
      if (T.heightAt(c.x, c.z) > lvl - 0.05) S.vel.set(0, 0, 0); // partra sodródott
      this.placeSpear(S, c.clone().addScaledVector(S.dir, 0.75), S.dir);
    } else if (S.state === 'carcass') {
      S.prey.mesh.getMatrixAt(S.prey.i, _m);
      this.spear.matrix.multiplyMatrices(_m, S.rel);
      this.spear.matrix.decompose(this.spear.position, this.spear.quaternion, this.spear.scale);
    }
    // a szigonyozott hal a lándzsa hegyén
    if (S.fish) {
      const tip = this.tipPos(_v);
      S.fish.m.position.copy(tip).addScaledVector(S.dir, -0.12);
      S.fish.m.rotation.set(0, Math.atan2(S.dir.x, S.dir.z) + Math.PI / 2, 0.3);
      S.fish.m.visible = true;
    }
    return msg;
  }
  // a lándzsa elhelyezése: tip = hegy helye, dir = irány (a geometria +y tengelye)
  placeSpear(S, tip, dir) {
    S.dir = dir.clone().normalize();
    S.tip = tip.clone();
    this.spear.quaternion.setFromUnitVectors(UP, S.dir);
    this.spear.position.copy(tip).addScaledVector(S.dir, -1.45);
    this.spear.updateMatrix();
  }
  tipPos(out) { return out.copy(this.spear.position).addScaledVector(this.shot.dir, 1.45); }
  spearMid() { return this.shot ? this.spear.position.clone().addScaledVector(this.shot.dir, 0.7) : null; }

  // ---------------------------------------------------------------- E: lándzsa visszaszerzése, zsákmány feldolgozása
  nearSpear(p) {
    const S = this.shot; if (!S || S.state === 'fly' || S.state === 'carcass') return false;
    const m = this.spearMid();
    return Math.hypot(m.x - p.x, m.z - p.z) < (S.state === 'float' ? 2.6 : 2.2) && Math.abs(m.y - p.y - 0.8) < 2.6;
  }
  takeSpear() {
    const S = this.shot; let msg = 'Visszavetted a lándzsát';
    if (S.fish) { this.surv.inv.fish++; S.fish.m.visible = false; S.fish.hideT = 150; msg = '+1 Hal, és visszavetted a lándzsát'; }
    this.returnSpear();
    return msg;
  }
  returnSpear() {
    this.shot = null; this.spear.visible = false;
    this.surv.spearOut = false;
    if (this.surv.equipped === 'spear') this.surv.hand.spear.visible = true;
  }
  nearCarcass(p) {
    for (const q of this.prey) if (!q.alive && q.state === 'dead' && q.deadK > 0.6 && Math.hypot(q.pos.x - p.x, q.pos.z - p.z) < 2.3) return q;
    return null;
  }
  butcher(q) {
    const S = SPECIES[q.sp];
    this.surv.inv.meat += S.meat;
    q.state = 'gone'; q.back = 300 + rnd() * 240;
    let msg = `+${S.meat} Nyers hús`;
    if (this.shot && this.shot.prey === q) { this.returnSpear(); msg += ', és visszavetted a lándzsát'; }
    return msg;
  }

  // ---------------------------------------------------------------- vad mozgása
  updatePrey(dt, P, camera) {
    const T = this.T, pl = this.player;
    // mennyire hallják / látják a játékost
    const loud = pl.running ? 1.5 : pl.crouch ? (pl.speed < 0.2 ? 0.16 : 0.36) : pl.speed > 2.2 ? 1 : pl.speed > 0.3 ? 0.7 : 0.5;
    for (const g of this.groups) {
      const S = SPECIES[g.sp];
      g.alarm = Math.max(0, g.alarm - dt);
      const alive = g.members.filter((m) => m.alive);
      // csorda-központ vándorlása
      g.moveT -= dt;
      if (g.moveT <= 0 || (alive.length && Math.hypot(alive[0].pos.x - g.cx, alive[0].pos.z - g.cz) > 40)) {
        g.moveT = 30 + rnd() * 40;
        for (let k = 0; k < 12; k++) {
          const a = rnd() * 6.28, d = 8 + rnd() * 18;
          const x = (alive[0]?.pos.x ?? g.cx) + Math.cos(a) * d, z = (alive[0]?.pos.z ?? g.cz) + Math.sin(a) * d;
          const fromHome = Math.hypot(x - g.home[0], z - g.home[1]);
          if (this.okLand(x, z, g.sp === 'capybara') && fromHome < 50) { g.cx = x; g.cz = z; break; }
        }
      }
      // érzékelés
      const dP = Math.hypot(g.cx - P.x, g.cz - P.z);
      if (g.alarm <= 0 && dP < 45 && !pl.swim) {
        for (const m of alive) {
          const d = Math.hypot(m.pos.x - P.x, m.pos.z - P.z);
          if (d < S.hear * loud * m.s || (this.noise > 0 && this.noisePos && m.pos.distanceTo(this.noisePos) < this.noise)) {
            this.alarm(g, d < S.hear * loud * m.s ? P : this.noisePos);
            this.audio?.grunt(0, 0.2); break;
          }
        }
      }
      // röfögés a közelben
      g.gruntT -= dt;
      if (g.gruntT <= 0) {
        g.gruntT = 4 + rnd() * 8;
        if (dP < 30 && alive.length && g.sp === 'peccary') this.audio?.grunt(this.animals.panOf(alive[0].pos, camera), 0.14 * Math.max(0.2, 1 - dP / 30));
      }
      for (const m of g.members) this.updateMember(m, g, S, dt);
    }
    this.noise = Math.max(0, this.noise - dt * 20);
  }

  updateMember(m, g, S, dt) {
    const T = this.T;
    if (m.state === 'gone') {
      m.back -= dt;
      if (m.back <= 0 && Math.hypot(g.cx - this.player.pos.x, g.cz - this.player.pos.z) > 50) {
        m.alive = true; m.state = 'graze'; m.t = 3; m.pos.set(g.cx + (rnd() - 0.5) * 4, 0, g.cz + (rnd() - 0.5) * 4);
        m.pos.y = T.heightAt(m.pos.x, m.pos.z);
      }
      _m.makeScale(0, 0, 0); m.mesh.setMatrixAt(m.i, _m); m.mesh.instanceMatrix.needsUpdate = true;
      return;
    }
    let want = 0;
    if (m.state === 'dead') {
      m.deadK = Math.min(1, m.deadK + dt * 2.2);
    } else {
      m.t -= dt;
      if (m.state === 'flee') {
        want = S.flee * (0.9 + 0.1 * Math.sin(this.time * 3 + m.phase));
        m.yaw = angDamp(m.yaw, m.fleeYaw, 5, dt);
        if (m.t <= 0) { m.state = 'walk'; m.t = 2; g.cx = m.pos.x + Math.sin(m.yaw) * 10; g.cz = m.pos.z + Math.cos(m.yaw) * 10; }
      } else if (m.state === 'graze') {
        if (m.t <= 0) {
          m.state = 'walk'; m.t = 3 + rnd() * 5;
          const a = rnd() * 6.28, d = rnd() * 4.5;
          m.target = [g.cx + Math.cos(a) * d, g.cz + Math.sin(a) * d];
        }
      } else if (m.state === 'walk') {
        if (!m.target) m.target = [g.cx, g.cz];
        const dx = m.target[0] - m.pos.x, dz = m.target[1] - m.pos.z, d = Math.hypot(dx, dz);
        m.yaw = angDamp(m.yaw, Math.atan2(dx, dz), 3, dt);
        want = d > 0.5 ? S.walk * (d > 8 ? 2.2 : 1) : 0;
        if (d < 0.5 || m.t <= -6) { m.state = 'graze'; m.t = 4 + rnd() * 9; m.target = null; }
      }
    }
    m.speed = damp(m.speed, want, want > m.speed ? 4 : 6, dt);
    if (m.speed > 0.01) {
      const nx = m.pos.x + Math.sin(m.yaw) * m.speed * dt, nz = m.pos.z + Math.cos(m.yaw) * m.speed * dt;
      const ok = this.okLand(nx, nz, true) || (g.sp === 'capybara' && Math.hypot(nx, nz) < 172 && T.slopeAt(nx, nz) < 0.6);
      if (ok) { m.pos.x = nx; m.pos.z = nz; }
      else { m.yaw += (rnd() < 0.5 ? 1 : -1) * 1.2; if (m.fleeYaw !== undefined) m.fleeYaw = m.yaw; }
    }
    const h = T.heightAt(m.pos.x, m.pos.z), lvl = T.waterLevelAt(m.pos.x, m.pos.z);
    m.swim = lvl - h > 0.45;
    const y = m.swim ? lvl - SPECIES[m.sp].hy * m.s * 0.95 : h;
    m.pos.y = m.state === 'dead' && m.swim ? damp(m.pos.y, lvl - 0.25, 2, dt) : damp(m.pos.y, y, 10, dt);
    // animáció: lépésfázis a megtett úttal, fej le legelés közben
    m.phase += m.speed * dt / (S.stride * m.s) * Math.PI * S.cadence;
    const amp = Math.min(0.55, m.speed * 0.35) * (m.state === 'dead' ? 0 : 1) + (m.swim ? 0.35 : 0);
    const headT = m.state === 'graze' ? 0.55 + Math.sin(this.time * 2 + m.phase) * 0.12 : m.state === 'flee' ? -0.12 : 0.05;
    m.head = damp(m.head, m.state === 'dead' ? 0.3 : headT, 4, dt);
    m.anim.setXYZ(m.i, m.phase + (m.swim ? this.time * 6 : 0), amp, m.head);
    m.anim.needsUpdate = true;
    // példány-mátrix: helyzet, irány, elejtve oldalra dől
    const roll = m.deadK * Math.PI / 2 * 0.92 * (m.rollSign || 1);
    _q.setFromAxisAngle(UP, m.yaw); _q2.setFromAxisAngle(_v.set(0, 0, 1), roll); _q.multiply(_q2);
    _v2.set(m.pos.x, m.pos.y - m.deadK * 0.18 * m.s, m.pos.z);
    _m.compose(_v2, _q, _s.setScalar(m.s));
    m.mesh.setMatrixAt(m.i, _m); m.mesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- frame
  update(dt, camera) {
    this.time += dt;
    let msg = null;
    if (this.aim) {
      this.aim.t += dt;
      if (!this.canUse()) this.cancelAim();
    }
    if (this.stab > 0) { this.stab -= dt; if (this.stab <= 0) msg = this.resolveStab(); }
    // célzáskor a lándzsa a célkereszt felé mutat
    const hs = this.surv.hand.spear;
    if (hs.visible && hs.parent) {
      if (this.aim) {
        const d = camera.getWorldDirection(_v).normalize();
        d.y += 0.06; d.normalize();
        const pq = hs.parent.getWorldQuaternion(_q).invert();
        hs.quaternion.copy(pq.multiply(_q2.setFromUnitVectors(UP, d)));
      } else if (this.surv.handRest) hs.quaternion.copy(this.surv.handRest);
    }
    this.updatePrey(dt, this.player.pos, camera);
    const m2 = this.updateShot(dt);
    return m2 || msg;
  }
}

function segDist(p, a, b) {
  const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}
