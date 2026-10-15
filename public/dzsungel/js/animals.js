// Dzsungel-állatok: arapapagáj-rajok, majmok a lombkoronában, békák, halak, denevérek, éjszakai jaguár
// Kódból épített, egyszerű "csontozású" modellek (csoport-hierarchia), saját animációval.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch } from './shaders.js';
import { POND, CAMP } from './terrain.js';
import { smoothstep } from './noise.js';
import { JaguarBody, JaguarModel } from './jaguar.js';

const V3 = THREE.Vector3;
const rnd = Math.random;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// vertex-színes geometria-összefűzés: [[geometry, [r,g,b], matrix?], ...]
function merged(parts) {
  const gs = parts.map(([g, c, m]) => {
    const x = g.index ? g.toNonIndexed() : g.clone();
    if (m) x.applyMatrix4(m);
    for (const k of Object.keys(x.attributes)) if (!['position', 'normal'].includes(k)) x.deleteAttribute(k);
    const col = new Float32Array(x.attributes.position.count * 3);
    const cc = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    for (let i = 0; i < col.length; i += 3) { col[i] = cc.r; col[i + 1] = cc.g; col[i + 2] = cc.b; }
    x.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return x;
  });
  return mergeGeometries(gs);
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(sx, sy, sz));

const animalMat = (rough = 0.8) => patch(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 }), 'basic');

// Jaguár-bunda: rozetta-foltok objektumtérben (vertex-szín = alapszín, a foltokat a shader rajzolja)
export class Animals {
  constructor(scene, T, flora, audio, jagModel = null) {
    this.jagModel = jagModel;
    this.scene = scene; this.T = T; this.flora = flora; this.audio = audio;
    this.time = 0;
    this.giants = flora.logs.filter((g) => g.H);
    // fák valódi ágakon lévő ülőhelyekkel (flora.perchTrees); a szomszédos fák listája az ugrásokhoz
    this.ptrees = (flora.perchTrees || []).filter((t) => t.perches.length);
    for (const t of this.ptrees) t.nbrs = this.ptrees.filter((o) => o !== t && Math.hypot(o.x - t.x, o.z - t.z) < 17);
    this.mediums = flora.mediums || [];
    this.buildParrots();
    this.buildMonkeys();
    this.buildFrogs();
    this.buildFish();
    this.buildBats();
    this.buildJaguar();
  }

  // ---------------------------------------------------------------- Arapapagájok
  buildParrots() {
    const mat = animalMat(0.6);
    const body = merged([
      [new THREE.SphereGeometry(0.11, 10, 8), [0.85, 0.08, 0.05], M4(0, 0, 0, 0, 0, 0, 1, 0.9, 1.6)],
      [new THREE.SphereGeometry(0.075, 10, 8), [0.88, 0.1, 0.06], M4(0, 0.06, 0.17)],
      [new THREE.SphereGeometry(0.04, 8, 6), [0.95, 0.92, 0.85], M4(0.02, 0.07, 0.22, 0, 0, 0, 0.6, 0.8, 0.8)],
      [new THREE.ConeGeometry(0.025, 0.07, 6), [0.2, 0.18, 0.15], M4(0, 0.05, 0.27, Math.PI / 2 + 0.4)],
      [new THREE.ConeGeometry(0.05, 0.45, 6), [0.85, 0.1, 0.06], M4(0, -0.02, -0.33, -Math.PI / 2 + 0.15, 0, 0, 1, 1, 0.4)],
      [new THREE.ConeGeometry(0.035, 0.2, 6), [0.15, 0.35, 0.85], M4(0, -0.03, -0.5, -Math.PI / 2 + 0.15, 0, 0, 1, 1, 0.4)],
    ]);
    const wingGeo = merged([
      [new THREE.BoxGeometry(0.3, 0.015, 0.16), [0.95, 0.75, 0.1], M4(0.16, 0, 0.02)],
      [new THREE.BoxGeometry(0.22, 0.012, 0.14), [0.12, 0.3, 0.85], M4(0.4, 0, -0.01)],
      [new THREE.BoxGeometry(0.1, 0.012, 0.18), [0.85, 0.08, 0.05], M4(0.05, 0.005, 0.0)],
    ]);
    this.flocks = [];
    const nF = Math.min(4, this.giants.length);
    for (let f = 0; f < nF; f++) {
      const perch = this.pickPerchTree(60);
      const birds = [];
      const n = 5 + Math.floor(rnd() * 5);
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(body, mat));
        const wr = new THREE.Group(), wl = new THREE.Group();
        wr.add(new THREE.Mesh(wingGeo, mat)); const lw = new THREE.Mesh(wingGeo, mat); lw.scale.x = -1; wl.add(lw);
        wr.position.set(0.06, 0.04, 0.03); wl.position.set(-0.06, 0.04, 0.03);
        g.add(wr, wl);
        g.scale.setScalar(1.4);
        this.scene.add(g);
        birds.push({ g, wr, wl, off: new V3((rnd() - 0.5) * 6, (rnd() - 0.5) * 3, (rnd() - 0.5) * 6), ph: rnd() * 10, i, seat: null, seatFrom: null });
      }
      this.flocks.push({ birds, perch, state: 'perched', t: 0, wait: 30 + rnd() * 60, from: null, to: null, dur: 1 });
    }
  }

  // papagáj-ülőhely: egy fa ágai; minden madár saját pontot kap az ágon (a vastagság fölött)
  pickPerchTree(maxD = 120, from = null) {
    if (!this.ptrees.length) { const g = this.pickGiant(maxD, from); return { c: g, tree: null }; }
    const c = from || new V3(4, 0, -12);
    const cands = this.ptrees.filter((t) => { const d = Math.hypot(t.x - c.x, t.z - c.z); return d < maxD && d > (from ? 25 : 0) && t.perches.length >= 4; });
    const L = cands.length ? cands : this.ptrees;
    const tree = L[Math.floor(rnd() * L.length)];
    const top = tree.perches.reduce((a, q) => a.add(q.p), new V3()).multiplyScalar(1 / tree.perches.length);
    return { c: top, tree };
  }
  birdSeat(P, i) {
    if (!P.tree) return P.c.clone().add(new V3(Math.sin(i * 2.4) * 2, 0, Math.cos(i * 2.4) * 2));
    const ps = P.tree.perches, q = ps[(i * 3 + 1) % ps.length], k = Math.floor(i / ps.length);
    return q.p.clone().addScaledVector(q.tan, (k % 2 ? -1 : 1) * 0.35 * (k + (i % 2) * 0.5)).add(new V3(0, q.r + 0.12, 0));
  }

  pickGiant(maxD = 120, from = null) {
    const c = from || new V3(4, 0, -12);
    const cands = this.giants.filter((g) => { const d = Math.hypot(g.x - c.x, g.z - c.z); return d < maxD && d > (from ? 25 : 0); });
    const g = (cands.length ? cands : this.giants)[Math.floor(rnd() * (cands.length || this.giants.length))];
    return new V3(g.x, g.y + g.H * 0.82, g.z);
  }

  updateParrots(dt, player, cam) {
    const t = this.time;
    for (const F of this.flocks) {
      if (F.state === 'perched') {
        F.wait -= dt;
        const near = Math.hypot(player.pos.x - F.perch.c.x, player.pos.z - F.perch.c.z) < 16;
        if (F.wait <= 0 || near) {
          F.fromP = F.perch; F.toP = this.pickPerchTree(140, F.perch.c);
          F.from = F.fromP.c.clone(); F.to = F.toP.c.clone();
          F.dur = F.from.distanceTo(F.to) / 10 + 2; F.t = 0; F.state = 'flying';
          this.audio?.parrot(this.panOf(F.from, cam), this.volOf(F.from, cam, 0.12));
        }
      } else {
        F.t += dt / F.dur;
        if (F.t >= 1) { F.state = 'perched'; F.perch = F.toP; F.wait = 40 + rnd() * 80; }
        else if (rnd() < dt * 0.4) this.audio?.parrot(this.panOf(F.from, cam), this.volOf(F.birds[0].g.position, cam, 0.08));
      }
      for (const b of F.birds) {
        let p, look;
        if (F.state === 'perched') {
          p = this.birdSeat(F.perch, b.i); p.y += Math.sin(t * 2 + b.ph) * 0.01;
          look = new V3(Math.sin(b.ph), 0, Math.cos(b.ph));
          const fold = 0.15 + Math.max(0, Math.sin(t * 0.7 + b.ph * 3) - 0.95) * 8;
          b.wr.rotation.z = -1.25 + fold; b.wl.rotation.z = 1.25 - fold;
          b.g.rotation.x = -0.5;
        } else {
          const u = Math.min(1, Math.max(0, F.t - b.ph * 0.01));
          const mid = F.from.clone().lerp(F.to, 0.5); mid.y = Math.max(F.from.y, F.to.y) + 14;
          const a = F.from.clone().lerp(mid, u), c2 = mid.clone().lerp(F.to, u);
          p = a.lerp(c2, u).add(b.off.clone().multiplyScalar(Math.sin(u * Math.PI)));
          // fel- és leszálláskor a saját ágpontjáról indul, oda érkezik (nincs ugrás)
          if (u < 0.15) p.lerp(this.birdSeat(F.fromP, b.i), 1 - u / 0.15);
          else if (u > 0.85) p.lerp(this.birdSeat(F.toP, b.i), (u - 0.85) / 0.15);
          const u2 = Math.min(1, u + 0.01);
          const a2 = F.from.clone().lerp(mid, u2), c3 = mid.clone().lerp(F.to, u2);
          look = a2.lerp(c3, u2).sub(a.lerp(c2, u)).normalize();
          const fl = Math.sin(t * 13 + b.ph) * 0.9;
          b.wr.rotation.z = fl; b.wl.rotation.z = -fl;
          b.g.rotation.x = 0;
        }
        b.g.position.copy(p);
        b.g.rotation.y = Math.atan2(look.x, look.z);
        b.g.visible = sky_day_cache > 0.15 && b.g.position.distanceTo(cam.position) < 160;
      }
    }
  }

  // ---------------------------------------------------------------- Majmok
  buildMonkeys() {
    const fur = [0.2, 0.14, 0.09], belly = [0.36, 0.27, 0.18], face = [0.62, 0.48, 0.38], dark = [0.06, 0.05, 0.04];
    const mat = animalMat(0.95);
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 8);
    const P = this.monkeyParts = {
      torso: merged([[cap(0.115, 0.2), fur, M4(0, 0.22, 0, 0, 0, 0, 1, 1, 0.85)], [cap(0.08, 0.14), belly, M4(0, 0.2, 0.045, 0, 0, 0, 0.9, 1, 0.6)]]),
      head: merged([
        [new THREE.SphereGeometry(0.095, 12, 9), fur, M4(0, 0, 0)],
        [new THREE.SphereGeometry(0.068, 10, 8), face, M4(0, -0.012, 0.062, 0, 0, 0, 1, 0.85, 0.6)],
        [new THREE.SphereGeometry(0.014, 6, 5), dark, M4(0.03, 0.018, 0.112)], [new THREE.SphereGeometry(0.014, 6, 5), dark, M4(-0.03, 0.018, 0.112)],
        [new THREE.SphereGeometry(0.032, 6, 5), face, M4(0.09, 0.01, 0, 0, 0, 0, 0.5, 1, 1)], [new THREE.SphereGeometry(0.032, 6, 5), face, M4(-0.09, 0.01, 0, 0, 0, 0, 0.5, 1, 1)],
      ]),
      arm: merged([[cap(0.03, 0.3), fur, M4(0, -0.17, 0)], [new THREE.SphereGeometry(0.034, 6, 5), dark, M4(0, -0.35, 0.01)]]),
      leg: merged([[cap(0.036, 0.22), fur, M4(0, -0.13, 0)], [new THREE.SphereGeometry(0.036, 6, 5), dark, M4(0, -0.27, 0.02, 0, 0, 0, 1, 0.7, 1.3)]]),
      // hosszú, a végén begörbülő farok
      tail: merged([[new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, -0.15, -0.12), new V3(0, -0.45, -0.12), new V3(0, -0.7, -0.02), new V3(0.06, -0.78, 0.08), new V3(0.08, -0.72, 0.14)]), 16, 0.022, 5), fur]]),
    };
    this.monkeys = [];
    // a tábor körüli óriásfákon csapatokban (valódi ágakon ülnek)
    const trees = this.ptrees.filter((t) => t.kind === 'giant' && Math.hypot(t.x - 4, t.z + 10) < 95 && t.perches.length >= 6);
    if (!trees.length) return;
    const used = new Set();
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(P.torso, mat));
      const head = new THREE.Group(); head.position.set(0, 0.44, 0.02); head.add(new THREE.Mesh(P.head, mat)); g.add(head);
      const limb = (geo, x, y) => { const q = new THREE.Group(); q.position.set(x, y, 0); q.add(new THREE.Mesh(geo, mat)); g.add(q); return q; };
      const arms = [limb(P.arm, 0.115, 0.35), limb(P.arm, -0.115, 0.35)];
      const legs = [limb(P.leg, 0.07, 0.1), limb(P.leg, -0.07, 0.1)];
      const tail = new THREE.Group(); tail.position.set(0, 0.1, -0.08); tail.add(new THREE.Mesh(P.tail, mat)); g.add(tail);
      g.scale.setScalar(1.25);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(g);
      const tr = trees[Math.floor(i / 3) % trees.length];
      let perch = tr.perches.find((q) => !used.has(q) && q.r > 0.12) || tr.perches[0];
      used.add(perch);
      const m = { g, head, arms, legs, tail, perch, state: 'sit', t: 0, wait: 3 + rnd() * 12, ph: rnd() * 10, yaw: 0, from: null, to: null };
      this.sitOn(m, perch);
      this.monkeys.push(m);
    }
    this.howlT = 8 + rnd() * 20;
  }
  // leül az ág tetejére, az ágra merőlegesen (lábai lelógnak)
  sitOn(m, q) {
    m.perch = q;
    m.seat = q.p.clone().add(new V3(0, q.r * 0.95, 0));
    m.yaw = Math.atan2(q.tan.x, q.tan.z) + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2;
  }
  // következő cél: ugyanazon az ágon (szalad), másik ágon vagy a szomszéd fán (ugrik)
  nextPerch(m) {
    const q0 = m.perch, here = q0.p;
    const opts = [];
    for (const q of q0.tree.perches) if (q !== q0 && q.r > 0.07 && q.p.distanceTo(here) < 7.5) opts.push(q);
    for (const t of q0.tree.nbrs || []) for (const q of t.perches) if (q.r > 0.07 && q.p.distanceTo(here) < 8.5) opts.push(q);
    for (const o of this.monkeys) if (o !== m) { const i = opts.indexOf(o.perch); if (i >= 0) opts.splice(i, 1); }
    if (!opts.length) return null;
    const same = opts.filter((q) => q.tree === q0.tree && q.b === q0.b);
    return same.length && rnd() < 0.45 ? same[Math.floor(rnd() * same.length)] : opts[Math.floor(rnd() * opts.length)];
  }

  // a törzs sugara egy adott magasságban (a gyökérfalak miatt lent vastagabb)
  trunkR(tr, yr) { return tr.r0 * (1 - 0.55 * Math.min(1, Math.max(0, yr / tr.H))) * (1 + 1.3 * (1 - smoothstep(0, 6, yr))) + 0.1; }
  trunkPt(tr, ang, yr) { const r = this.trunkR(tr, yr); return new V3(tr.x + Math.cos(ang) * r, tr.y + yr, tr.z + Math.sin(ang) * r); }
  startLeap(m, to, after, next = null) {
    m.from = m.g.position.clone(); m.to = to.clone(); m.after = after; m.next = next;
    m.dur = 0.45 + m.from.distanceTo(m.to) / 8; m.t = 0; m.state = 'leap';
    m.yaw = Math.atan2(m.to.x - m.from.x, m.to.z - m.from.z);
  }
  landLeap(m) {
    if (m.after === 'climbDown') { m.state = 'climbDown'; return; }
    if (m.after === 'ground') { m.state = 'ground'; m.sub = 'eat'; m.st = 3 + rnd() * 4; m.gt = 25 + rnd() * 25; return; }
    this.sitOn(m, m.next); m.state = 'sit';
  }
  // a törzshöz legközelebbi ülőhely (ide mászik vissza)
  lowPerch(tr) { return tr.perches.filter((q) => q.r > 0.12).reduce((a, q) => (!a || q.t < a.t || (q.t === a.t && q.p.y < a.p.y) ? q : a), null) || tr.perches[0]; }

  updateMonkeys(dt, cam, day, player) {
    const t = this.time;
    let onGround = this.monkeys.filter((o) => o.state === 'ground' || o.state.startsWith('climb')).length;
    for (const m of this.monkeys) {
      const vis = day > 0.2 && m.g.position.distanceTo(cam.position) < 110;
      m.g.visible = vis;
      const A = m.arms, L = m.legs;
      // éjjel mindenki a fán alszik
      if (day <= 0.2 && m.state !== 'sit') { this.sitOn(m, this.lowPerch(m.perch.tree)); m.state = 'sit'; }
      if (m.state === 'climbDown' || m.state === 'climbUp') {
        // a törzsön mászik: arccal a törzs felé, felváltva nyúló karok
        const tr = m.home, sp = m.state === 'climbDown' ? -2.2 : 2.0;
        m.cy += sp * dt;
        const pos = this.trunkPt(tr, m.cang, m.cy);
        m.g.position.copy(pos);
        m.yaw = Math.atan2(tr.x - pos.x, tr.z - pos.z);
        const gp = t * 9;
        m.g.rotation.set(-0.1, m.yaw, 0, 'YXZ');
        m.head.rotation.set(m.state === 'climbDown' ? 0.5 : -0.5, 0, 0);
        A[0].rotation.set(-2.6 + Math.sin(gp) * 0.45, 0, 0.3); A[1].rotation.set(-2.6 + Math.sin(gp + Math.PI) * 0.45, 0, -0.3);
        L[0].rotation.set(-1.0 + Math.sin(gp + Math.PI) * 0.4, 0, 0.35); L[1].rotation.set(-1.0 + Math.sin(gp) * 0.4, 0, -0.35);
        m.tail.rotation.set(0.2, 0, 0);
        if (m.state === 'climbDown' && m.cy <= 0.7) {
          const gx = tr.x + Math.cos(m.cang) * (this.trunkR(tr, 0) + 1.3), gz = tr.z + Math.sin(m.cang) * (this.trunkR(tr, 0) + 1.3);
          this.startLeap(m, new V3(gx, this.T.heightAt(gx, gz), gz), 'ground');
        } else if (m.state === 'climbUp' && m.cy >= m.cyTop) this.startLeap(m, m.next.p.clone().add(new V3(0, m.next.r * 0.95, 0)), 'sit', m.next);
        continue;
      }
      if (m.state === 'ground') {
        const P = player.pos, pd = Math.hypot(P.x - m.g.position.x, P.z - m.g.position.z);
        m.gt -= dt;
        if (m.sub !== 'return' && (m.gt <= 0 || pd < 7)) { m.sub = 'return'; m.fast = pd < 7; }
        let tgt = null, spd = 0;
        if (m.sub === 'eat') {
          // a földön ül és eszik: kéz a szájhoz
          m.st -= dt;
          m.g.position.y = this.T.heightAt(m.g.position.x, m.g.position.z);
          m.g.rotation.set(0.05, m.yaw, 0, 'YXZ');
          m.head.rotation.set(0.25 + Math.sin(t * 3 + m.ph) * 0.1, Math.sin(t * 0.6 + m.ph) * 0.5, 0);
          const bite = Math.max(0, Math.sin(t * 2.2 + m.ph));
          A[0].rotation.set(-1.2 - bite * 1.1, 0, -0.35); A[1].rotation.set(-0.7, 0, -0.2);
          L[0].rotation.set(-1.35, 0, 0.3); L[1].rotation.set(-1.35, 0, -0.3);
          m.tail.rotation.set(1.3, 0, Math.sin(t + m.ph) * 0.3);
          if (m.st <= 0) {
            m.sub = 'walk';
            const a = rnd() * 6.28, d = 2 + rnd() * 5, tr = m.home, r = this.trunkR(tr, 0) + d;
            m.gtarget = new V3(tr.x + Math.cos(a) * r, 0, tr.z + Math.sin(a) * r);
          }
        } else if (m.sub === 'walk') { tgt = m.gtarget; spd = 1.5; }
        else { tgt = this.trunkPt(m.home, m.cang, 0.7); spd = m.fast ? 4.2 : 2.0; }
        if (tgt) {
          const dx = tgt.x - m.g.position.x, dz = tgt.z - m.g.position.z, dd = Math.hypot(dx, dz);
          m.yaw = Math.atan2(dx, dz);
          const k = Math.min(dd, spd * dt);
          m.g.position.x += dx / (dd || 1) * k; m.g.position.z += dz / (dd || 1) * k;
          m.g.position.y = this.T.heightAt(m.g.position.x, m.g.position.z) + 0.3 + Math.abs(Math.sin(t * 10)) * 0.04; // a lábakon áll
          const Pp = 1.2, gp = t * (spd > 3 ? 15 : 10);
          m.g.rotation.set(Pp, m.yaw, 0, 'YXZ');
          m.head.rotation.set(-1.0, 0, 0);
          A[0].rotation.set(-Pp + Math.sin(gp) * 0.7, 0, 0.1); A[1].rotation.set(-Pp + Math.sin(gp + Math.PI) * 0.7, 0, -0.1);
          L[0].rotation.set(-Pp + Math.sin(gp + Math.PI) * 0.7, 0, 0); L[1].rotation.set(-Pp + Math.sin(gp) * 0.7, 0, 0);
          m.tail.rotation.set(-0.6, 0, 0);
          if (dd < 0.3) {
            if (m.sub === 'walk') { m.sub = 'eat'; m.st = 4 + rnd() * 6; }
            else { m.next = this.lowPerch(m.home); m.cyTop = m.next.p.y - m.home.y - 0.4; m.cy = 0.7; m.state = 'climbUp'; }
          }
        }
        continue;
      }
      if (m.state === 'sit') {
        m.g.position.copy(m.seat);
        m.g.rotation.set(0.12, m.yaw, 0, 'YXZ');
        m.head.rotation.set(Math.sin(t * 0.37 + m.ph) * 0.25, Math.sin(t * 0.5 + m.ph) * 0.8 + Math.sin(t * 2.3 + m.ph) * 0.1, 0);
        // lelógó, lóbált lábak; egyik kéz az ágon, a másik néha vakaródzik
        L[0].rotation.x = -0.35 + Math.sin(t * 1.6 + m.ph) * 0.25; L[1].rotation.x = -0.35 + Math.sin(t * 1.6 + m.ph + 2.1) * 0.25;
        L[0].rotation.z = 0.12; L[1].rotation.z = -0.12;
        const scratch = Math.max(0, Math.sin(t * 0.33 + m.ph * 2) - 0.85) * 6.6;
        A[0].rotation.set(-0.5 - scratch * 1.5 + Math.sin(t * 14) * 0.15 * scratch, 0, 0.15);
        A[1].rotation.set(-0.45, 0, -0.18);
        m.tail.rotation.set(0.15, 0, Math.sin(t * 0.9 + m.ph) * 0.35);
        m.wait -= dt;
        if (m.wait <= 0 && vis) {
          m.wait = 5 + rnd() * 16;
          // néha lemászik a földre enni (egyszerre legfeljebb négyen)
          const tr = m.perch.tree;
          if (tr.kind === 'giant' && onGround < 4 && rnd() < 0.3) {
            onGround++;
            m.home = tr; m.cang = Math.atan2(m.perch.p.z - tr.z, m.perch.p.x - tr.x); m.cy = m.perch.p.y - tr.y - 0.3;
            this.startLeap(m, this.trunkPt(tr, m.cang, m.cy), 'climbDown');
            continue;
          }
          const q = this.nextPerch(m);
          if (q) {
            m.from = m.seat.clone(); m.to = q.p.clone().add(new V3(0, q.r * 0.95, 0)); m.next = q; m.after = 'sit';
            const d = m.from.distanceTo(m.to);
            m.state = q.tree === m.perch.tree && q.b === m.perch.b ? 'walk' : 'leap';
            m.dur = m.state === 'walk' ? 0.4 + d / 1.4 : 0.45 + d / 8; m.t = 0;
            m.yaw = Math.atan2(m.to.x - m.from.x, m.to.z - m.from.z);
          }
        }
      } else if (m.state === 'walk') {
        // négy lábon szalad az ágon
        m.t += dt / m.dur;
        const u = Math.min(1, m.t);
        m.g.position.copy(m.from).lerp(m.to, u);
        const P = 1.15, gp = t * 11;
        m.g.rotation.set(P, m.yaw, 0, 'YXZ');
        m.head.rotation.set(-1.0, 0, 0);
        A[0].rotation.set(-P + Math.sin(gp) * 0.7, 0, 0.1); A[1].rotation.set(-P + Math.sin(gp + Math.PI) * 0.7, 0, -0.1);
        L[0].rotation.set(-P + Math.sin(gp + Math.PI) * 0.7, 0, 0); L[1].rotation.set(-P + Math.sin(gp) * 0.7, 0, 0);
        m.tail.rotation.set(-0.9, 0, Math.sin(gp * 0.5) * 0.2);
        m.g.position.y += 0.3 + Math.abs(Math.sin(gp)) * 0.05; // a lábakon áll az ágon
        if (u >= 1) { this.sitOn(m, m.next); m.state = 'sit'; }
      } else {
        // ugrás ívben: karok előre a cél felé, lábak hátra
        m.t += dt / m.dur;
        const u = Math.min(1, m.t), d = m.from.distanceTo(m.to);
        m.g.position.copy(m.from).lerp(m.to, u);
        m.g.position.y += Math.sin(u * Math.PI) * (0.5 + d * 0.22);
        const P = 0.9 + Math.sin(u * Math.PI) * 0.35;
        m.g.rotation.set(P, m.yaw, 0, 'YXZ');
        m.head.rotation.set(-0.8, 0, 0);
        const reach = u < 0.15 ? u / 0.15 : 1;
        A[0].rotation.set(-P - 1.5 * reach, 0, 0.25); A[1].rotation.set(-P - 1.5 * reach, 0, -0.25);
        L[0].rotation.set(-P + 1.1 * reach, 0, 0.1); L[1].rotation.set(-P + 1.1 * reach, 0, -0.1);
        m.tail.rotation.set(-1.3, 0, 0);
        if (u >= 1) this.landLeap(m);
      }
    }
    // bőgőmajmok távoli kórusa, főleg reggel
    this.howlT -= dt;
    if (this.howlT <= 0 && day > 0.2) { this.audio?.howl(rnd() * 1.4 - 0.7); this.howlT = 45 + rnd() * 90; }
  }

  // ---------------------------------------------------------------- Békák
  buildFrogs() {
    const mat = animalMat(0.4);
    const geo = merged([
      [new THREE.SphereGeometry(0.05, 10, 8), [0.2, 0.6, 0.12], M4(0, 0.035, 0, -0.3, 0, 0, 1, 0.75, 1.25)],
      [new THREE.SphereGeometry(0.018, 6, 5), [0.85, 0.15, 0.05], M4(0.028, 0.07, 0.04)],
      [new THREE.SphereGeometry(0.018, 6, 5), [0.85, 0.15, 0.05], M4(-0.028, 0.07, 0.04)],
      [new THREE.CapsuleGeometry(0.012, 0.06, 2, 5), [0.25, 0.55, 0.1], M4(0.05, 0.015, -0.03, 0, 0.6, Math.PI / 2)],
      [new THREE.CapsuleGeometry(0.012, 0.06, 2, 5), [0.25, 0.55, 0.1], M4(-0.05, 0.015, -0.03, 0, -0.6, Math.PI / 2)],
    ]);
    this.frogs = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(geo, mat); m.scale.setScalar(1.6); m.castShadow = true; this.scene.add(m);
      const f = { m, state: 'sit', t: 0, home: this.shoreSpot() };
      m.position.copy(f.home); m.rotation.y = Math.atan2(POND.x - f.home.x, POND.z - f.home.z);
      this.frogs.push(f);
    }
  }
  shoreSpot() {
    for (let k = 0; k < 40; k++) {
      const a = rnd() * Math.PI * 2, d = POND.r + 0.5 + rnd() * 2.5;
      const x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d, h = this.T.heightAt(x, z);
      if (h > 0.05 && h < 0.6) return new V3(x, h, z);
    }
    return new V3(POND.x + POND.r + 1, 0.2, POND.z);
  }

  updateFrogs(dt, player, fx) {
    for (const f of this.frogs) {
      if (f.state === 'sit') {
        f.m.scale.y = 1.6 * (1 + Math.max(0, Math.sin(this.time * 5 + f.home.x)) * 0.04);
        if (f.m.position.distanceTo(player.pos) < 3.2) {
          f.state = 'jump'; f.t = 0; f.from = f.m.position.clone();
          const dir = new V3(POND.x - f.from.x, 0, POND.z - f.from.z).normalize();
          f.to = f.from.clone().addScaledVector(dir, 1.8); f.to.y = 0;
          f.m.rotation.y = Math.atan2(dir.x, dir.z);
        }
      } else if (f.state === 'jump') {
        f.t += dt / 0.45;
        const u = Math.min(1, f.t);
        f.m.position.lerpVectors(f.from, f.to, u); f.m.position.y = f.from.y + (f.to.y - f.from.y) * u + Math.sin(u * Math.PI) * 0.5;
        if (u >= 1) { f.state = 'under'; f.t = 6 + rnd() * 10; f.m.visible = false; fx?.ripple(f.to.x, 0, f.to.z, 1.2, 1.2); this.audio?.plop(); }
      } else {
        f.t -= dt;
        if (f.t <= 0 && f.home.distanceTo(player.pos) > 6) { f.home = this.shoreSpot(); f.m.position.copy(f.home); f.m.visible = true; f.state = 'sit'; }
      }
    }
  }

  // ---------------------------------------------------------------- Halak
  buildFish() {
    const geo = merged([
      [new THREE.SphereGeometry(0.08, 10, 6), [1, 1, 1], M4(0, 0, 0, 0, 0, 0, 0.45, 0.7, 1.6)],
      [new THREE.ConeGeometry(0.07, 0.14, 4), [1, 1, 1], M4(0, 0, -0.17, -Math.PI / 2, 0, 0, 0.25, 1, 1)],
    ]);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.3 });
    patch(mat, 'fish', (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSwim;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(uTime * 9.0 + position.z * 18.0) * 0.03 * smoothstep(0.1, -0.2, position.z);');
    });
    this.fish = [];
    const cols = [[1, 0.5, 0.15], [0.8, 0.82, 0.85], [0.95, 0.75, 0.3], [0.6, 0.65, 0.5]];
    for (let i = 0; i < 14; i++) {
      const g = geo.clone(); const c = cols[i % 4];
      const ca = g.attributes.color; for (let k = 0; k < ca.count; k++) ca.setXYZ(k, c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2);
      const m = new THREE.Mesh(g, mat); m.scale.setScalar(1.3 + rnd() * 0.6); this.scene.add(m);
      this.fish.push({ m, r: 2.5 + rnd() * 6.5, a: rnd() * 6.28, sp: (0.25 + rnd() * 0.3) * (rnd() < 0.5 ? 1 : -1), d: 0.35 + rnd() * 0.7, jump: -1 });
    }
    this.jumpT = 4;
  }

  updateFish(dt, fx) {
    this.jumpT -= dt;
    for (const f of this.fish) {
      if (f.caught) { if (f.hideT > 0) { f.hideT -= dt; f.m.visible = false; if (f.hideT <= 0) f.caught = false; } continue; } // lándzsán / kifogva
      if (f.jump >= 0) {
        f.jump += dt / 0.7;
        const u = Math.min(1, f.jump);
        const x = f.jx + Math.cos(f.a) * u * 1.2, z = f.jz + Math.sin(f.a) * u * 1.2;
        f.m.position.set(x, -0.2 + Math.sin(u * Math.PI) * 0.8, z);
        f.m.rotation.set(-Math.cos(u * Math.PI) * 0.9, -f.a + Math.PI / 2 * Math.sign(f.sp), 0);
        if (u >= 1) { f.jump = -1; fx?.ripple(x, 0, z, 2, 1.6); this.audio?.plop(); }
        continue;
      }
      f.a += f.sp * dt / f.r * 2;
      const x = POND.x + Math.cos(f.a) * f.r, z = POND.z + Math.sin(f.a) * f.r;
      const floor = this.T.heightAt(x, z);
      f.m.position.set(x, Math.max(floor + 0.15, -f.d), z);
      f.m.rotation.set(0, -f.a + (f.sp > 0 ? 0 : Math.PI), 0);
      f.m.visible = floor < -0.3;
      if (this.jumpT < 0 && f.m.visible && rnd() < 0.15) { this.jumpT = 6 + rnd() * 12; f.jump = 0; f.jx = x; f.jz = z; fx?.ripple(x, 0, z, 1.4, 1.2); }
    }
  }

  // ---------------------------------------------------------------- Denevérek
  buildBats() {
    const mat = animalMat(0.9);
    const body = merged([[new THREE.SphereGeometry(0.05, 8, 6), [0.08, 0.06, 0.06], M4(0, 0, 0, 0, 0, 0, 0.8, 0.8, 1.4)]]);
    const wing = merged([[new THREE.BoxGeometry(0.22, 0.008, 0.14), [0.06, 0.05, 0.05], M4(0.11, 0, -0.02)]]);
    this.bats = [];
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group(); g.add(new THREE.Mesh(body, mat));
      const wr = new THREE.Group(), wl = new THREE.Group();
      wr.add(new THREE.Mesh(wing, mat)); const lw = new THREE.Mesh(wing, mat); lw.scale.x = -1; wl.add(lw);
      g.add(wr, wl); g.scale.setScalar(1.6); this.scene.add(g);
      this.bats.push({ g, wr, wl, c: new V3(-4 + (rnd() - 0.5) * 50, 0, -8 + (rnd() - 0.5) * 50), ph: rnd() * 100, h: 4 + rnd() * 9 });
    }
  }
  updateBats(dt, night) {
    const t = this.time, vis = night > 0.45;
    for (const b of this.bats) {
      b.g.visible = vis;
      if (!vis) continue;
      const k = t * 0.9 + b.ph;
      const p = b.c.clone().add(new V3(Math.sin(k * 1.3) * 9 + Math.sin(k * 3.7) * 2, 0, Math.cos(k * 1.1) * 9 + Math.cos(k * 4.1) * 2));
      p.y = Math.max(this.T.heightAt(p.x, p.z), 0) + b.h + Math.sin(k * 2.9) * 1.5;
      const prev = b.g.position.clone();
      b.g.position.copy(p);
      const d = p.clone().sub(prev); if (d.lengthSq() > 1e-6) b.g.rotation.y = Math.atan2(d.x, d.z);
      const fl = Math.sin(t * 24 + b.ph) * 1.1;
      b.wr.rotation.z = fl; b.wl.rotation.z = -fl;
    }
  }

  // ---------------------------------------------------------------- Jaguár (éjjel)
  buildJaguar() {
    // a letöltött, textúrázott modell, ha betölthető; különben az eljárásos test
    this.jbody = this.jagModel ? new JaguarModel(this.scene, this.jagModel) : new JaguarBody(this.scene);
    const g = this.jbody.g; g.visible = false;
    this.jag = { g, state: 'away', t: 25 + rnd() * 30, pos: new V3(), yaw: 0, speed: 0, growlT: 0, ang: 0, jawT: 0, pounce: 0, aware: 0, drinkAt: null, drinkDir: 0 };
  }
  // tesztekhez: a jaguár megjelenítése adott helyen és állapotban
  spawnJaguar(x, z, yaw = 0, state = 'roam', t = 60) {
    const J = this.jag; J.pos.set(x, this.T.heightAt(x, z), z); J.yaw = yaw; J.state = state; J.t = t; J.g.visible = true; J.speed = 0; J.aware = 0;
    this.jbody.placed = false;
  }
  // nappali itatóhely: szárazföldi pont, ahonnan 2 m-en belül mély víz van, a játékostól dmin..dmax távolságra
  findDrinkSpot(P, dmin, dmax) {
    for (let k = 0; k < 60; k++) {
      const a = rnd() * Math.PI * 2, d = dmin + rnd() * (dmax - dmin), x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
      if (Math.hypot(x, z) > 168) continue;
      const h = this.T.heightAt(x, z);
      if (h < 0.15 || h > 3 || this.T.waterLevelAt(x, z) - h > 0.05) continue;
      for (let j = 0; j < 8; j++) {
        const bb = j / 8 * Math.PI * 2, wx = x + Math.cos(bb) * 2, wz = z + Math.sin(bb) * 2;
        if (this.T.waterLevelAt(wx, wz) - this.T.heightAt(wx, wz) > 0.35) return { spot: new V3(x, h, z), dir: Math.atan2(wx - x, wz - z) };
      }
    }
    return null;
  }

  updateJaguar(dt, player, night, hooks) {
    const J = this.jag, P = player.pos;
    // biztonságos: tábortűz, lerakott tűz vagy fáklya a kézben
    const safe = hooks.isSafe ? hooks.isSafe(P) : Math.hypot(P.x - CAMP.x, P.z - CAMP.z) < 9;
    const torch = hooks.hasTorch ? hooks.hasTorch() : false;
    const dP = Math.hypot(J.pos.x - P.x, J.pos.z - P.z);
    const growl = (v) => { this.audio?.growl(v); J.jawT = 0.9; };
    let target = null, spd = 0, face = null;
    J.jawT -= dt; J.pounce = Math.max(0, J.pounce - dt * 2.2);
    if (J.state === 'away') {
      J.g.visible = false;
      J.t -= dt;
      if (night > 0.6 && J.t <= 0 && !player.swim) {
        // éjjel: a játékostól 35-45 m-re, az erdőben bukkan fel, és becserkészi
        for (let k = 0; k < 20; k++) {
          const a = rnd() * Math.PI * 2, d = 35 + rnd() * 10;
          const x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
          if (Math.hypot(x, z) > 175 || this.T.heightAt(x, z) < 0.4 || this.T.forestAt(x, z) < 0.35) continue;
          this.spawnJaguar(x, z, Math.atan2(P.x - x, P.z - z), 'stalk', 60 + rnd() * 60);
          J.ang = Math.atan2(z - P.z, x - P.x); break;
        }
        if (J.state === 'away') J.t = 10;
      } else if (night < 0.3 && J.t <= 0 && !player.swim) {
        // nappal: inni megy a folyóhoz; ha észrevesz, elkerül
        const ds = this.findDrinkSpot(P, 26, 42);
        if (ds) {
          const away = new V3(ds.spot.x - P.x, 0, ds.spot.z - P.z).normalize();
          let sx = ds.spot.x + away.x * 16, sz = ds.spot.z + away.z * 16;
          if (this.T.heightAt(sx, sz) < 0.3) { sx = ds.spot.x - Math.sin(ds.dir) * 14; sz = ds.spot.z - Math.cos(ds.dir) * 14; }
          this.spawnJaguar(sx, sz, Math.atan2(ds.spot.x - sx, ds.spot.z - sz), 'roam', 80);
          J.drinkAt = ds.spot; J.drinkDir = ds.dir;
        } else J.t = 15;
      }
    } else if (J.state === 'stalk') {
      J.t -= dt;
      // körözve közelít; a tábortűz fényébe nem lép be
      J.ang += dt * 0.12;
      let R = Math.max(torch ? 14 : 9, 24 - (60 - J.t) * 0.25);
      target = new V3(P.x + Math.cos(J.ang) * R, 0, P.z + Math.sin(J.ang) * R);
      const fd = Math.hypot(target.x - CAMP.x, target.z - CAMP.z);
      if (fd < 14) target.add(new V3(target.x - CAMP.x, 0, target.z - CAMP.z).normalize().multiplyScalar(14 - fd));
      spd = 1.6;
      J.growlT -= dt;
      if (dP < 22 && J.growlT <= 0) { growl(Math.min(1, 10 / dP)); J.growlT = 6 + rnd() * 6; }
      if (dP < 8.5 && !safe && !player.swim) { J.state = 'charge'; J.t = 4; growl(1.2); }
      if (J.t <= 0 || night < 0.4 || dP > 70) J.state = 'leave';
    } else if (J.state === 'charge') {
      J.t -= dt; target = P.clone(); spd = 9;
      if (dP < 3.0 && J.pounce <= 0.05) J.pounce = 1;
      if (dP < 1.7) { hooks.onAttack(); J.state = 'leave'; J.t = 0; }
      if (J.t <= 0 || safe || player.swim) J.state = 'leave';
    } else if (J.state === 'roam' || J.state === 'drink' || J.state === 'wander' || J.state === 'watch') {
      // nappali viselkedés: odasétál a vízhez, iszik, továbbáll; ha észreveszi a játékost, megáll, néz, majd elinal
      J.t -= dt;
      const notice = player.crouch ? 7.5 : player.running ? 24 : 16;
      J.aware = Math.max(0, Math.min(1.5, J.aware + (dP < notice ? dt * 1.6 : -dt * 0.5)));
      if (J.aware > 0.6 && J.state !== 'watch') { J.state = 'watch'; J.t = 1.2 + rnd() * 1.2; if (dP < 12) growl(0.5); }
      if (J.state === 'roam') {
        target = J.drinkAt; spd = 1.25;
        if (!J.drinkAt || Math.hypot(J.drinkAt.x - J.pos.x, J.drinkAt.z - J.pos.z) < 0.7) { J.state = 'drink'; J.t = 9 + rnd() * 8; }
      } else if (J.state === 'drink') {
        face = J.drinkDir;
        if (J.t <= 0) { J.state = 'wander'; J.t = 60; const a = J.drinkDir + Math.PI + (rnd() - 0.5) * 1.6; J.drinkAt = J.pos.clone().add(new V3(Math.sin(a) * 45, 0, Math.cos(a) * 45)); }
      } else if (J.state === 'wander') {
        target = J.drinkAt; spd = 1.4;
        if (dP > 55 || J.t <= 0) { J.state = 'away'; J.t = 150 + rnd() * 150; }
      } else if (J.state === 'watch') {
        face = Math.atan2(P.x - J.pos.x, P.z - J.pos.z);
        if (J.t <= 0) J.state = 'leave';
      }
    } else if (J.state === 'leave') {
      const away = new V3(J.pos.x - P.x, 0, J.pos.z - P.z).normalize();
      target = J.pos.clone().addScaledVector(away, 20); spd = 6;
      if (dP > 50) { J.state = 'away'; J.t = night > 0.5 ? 90 + rnd() * 120 : 150 + rnd() * 150; }
    }
    if (!J.g.visible) return;
    if (target) {
      const d = new V3(target.x - J.pos.x, 0, target.z - J.pos.z), L = d.length();
      if (L > 0.3) {
        const want = Math.atan2(d.x, d.z);
        let dy = want - J.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        J.yaw += dy * (1 - Math.exp(-dt * (spd > 4 ? 4 : 2.5)));
        // éles fordulónál lelassít
        J.speed = damp(J.speed, Math.min(spd, L * 1.5) * (1 - Math.min(0.7, Math.abs(dy) * 0.5)), 3, dt);
        J.pos.x += Math.sin(J.yaw) * J.speed * dt; J.pos.z += Math.cos(J.yaw) * J.speed * dt;
      } else J.speed = damp(J.speed, 0, 4, dt);
    } else {
      J.speed = damp(J.speed, 0, 5, dt);
      J.pos.x += Math.sin(J.yaw) * J.speed * dt; J.pos.z += Math.cos(J.yaw) * J.speed * dt;
      if (face !== null) { let dy = face - J.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; J.yaw += dy * (1 - Math.exp(-dt * 2.5)); }
    }
    J.pos.y = this.T.heightAt(J.pos.x, J.pos.z);
    const looking = J.state === 'stalk' || J.state === 'charge' || J.state === 'watch' || J.aware > 0.25;
    this.jbody.update(dt, J, {
      T: this.T, time: this.time, night, camera: this.cam,
      crouch: J.state === 'stalk' ? 1 : J.state === 'watch' ? 0.35 : 0, drink: J.state === 'drink' ? 1 : 0,
      look: looking ? new V3(P.x, P.y + 1.4, P.z) : null, jaw: J.jawT > 0 ? 1 : 0, pounce: J.pounce,
    });
  }

  panOf(p, cam) {
    const d = p.clone().sub(cam.position); const f = cam.getWorldDirection(new V3());
    const r = new V3().crossVectors(f, new V3(0, 1, 0)).normalize();
    return Math.max(-0.9, Math.min(0.9, d.normalize().dot(r)));
  }
  volOf(p, cam, v) { return v / (1 + p.distanceTo(cam.position) * 0.03); }

  update(dt, ctx) {
    this.time += dt;
    const { player, camera, sky, fx, hooks } = ctx;
    this.cam = camera;
    sky_day_cache = sky.day * (1 - G.uRain.value * 0.7);
    this.updateParrots(dt, player, camera);
    this.updateMonkeys(dt, camera, sky.day * (1 - G.uRain.value * 0.6), player);
    this.updateFrogs(dt, player, fx);
    this.updateFish(dt, fx);
    this.updateBats(dt, sky.night);
    this.updateJaguar(dt, player, sky.night, hooks);
  }
}
let sky_day_cache = 1;
