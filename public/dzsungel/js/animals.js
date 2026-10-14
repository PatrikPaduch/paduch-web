// Dzsungel-állatok: arapapagáj-rajok, majmok a lombkoronában, békák, halak, denevérek, éjszakai jaguár
// Kódból épített, egyszerű "csontozású" modellek (csoport-hierarchia), saját animációval.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch } from './shaders.js';
import { POND, CAMP } from './terrain.js';

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
function jaguarMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  return patch(m, 'jaguar', (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 p = vOP * 9.0;
  vec3 c = floor(p); vec3 f = fract(p); float dmin = 9.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 o = vec3(float(x), float(y), float(z));
    vec3 r = o + vec3(jh13(c + o), jh13(c + o + 7.1), jh13(c + o + 3.3)) - f;
    dmin = min(dmin, length(r));
  }
  float ring = smoothstep(0.34, 0.26, dmin) * smoothstep(0.1, 0.18, dmin);
  float dot2 = smoothstep(0.16, 0.1, dmin) * 0.6;
  float spots = max(ring, dot2) * step(0.05, diffuseColor.r - diffuseColor.b);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.02, 0.015), spots * 0.9); }`);
  });
}

export class Animals {
  constructor(scene, T, flora, audio) {
    this.scene = scene; this.T = T; this.flora = flora; this.audio = audio;
    this.time = 0;
    this.giants = flora.logs.filter((g) => g.H);
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
      const perch = this.pickGiant(60);
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
        birds.push({ g, wr, wl, off: new V3((rnd() - 0.5) * 6, (rnd() - 0.5) * 3, (rnd() - 0.5) * 6), ph: rnd() * 10, seat: new V3((rnd() - 0.5) * 7, rnd() * 2, (rnd() - 0.5) * 7) });
      }
      this.flocks.push({ birds, perch, state: 'perched', t: 0, wait: 30 + rnd() * 60, from: null, to: null, dur: 1 });
    }
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
        const near = Math.hypot(player.pos.x - F.perch.x, player.pos.z - F.perch.z) < 16;
        if (F.wait <= 0 || near) {
          F.from = F.perch.clone(); F.to = this.pickGiant(140, F.perch);
          F.dur = F.from.distanceTo(F.to) / 10 + 2; F.t = 0; F.state = 'flying';
          this.audio?.parrot(this.panOf(F.from, cam), this.volOf(F.from, cam, 0.12));
        }
      } else {
        F.t += dt / F.dur;
        if (F.t >= 1) { F.state = 'perched'; F.perch = F.to; F.wait = 40 + rnd() * 80; }
        else if (rnd() < dt * 0.4) this.audio?.parrot(this.panOf(F.from, cam), this.volOf(F.birds[0].g.position, cam, 0.08));
      }
      for (const b of F.birds) {
        let p, look;
        if (F.state === 'perched') {
          p = F.perch.clone().add(b.seat); p.y += Math.sin(t * 2 + b.ph) * 0.02;
          look = new V3(Math.sin(b.ph), 0, Math.cos(b.ph));
          const fold = 0.15 + Math.max(0, Math.sin(t * 0.7 + b.ph * 3) - 0.95) * 8;
          b.wr.rotation.z = -1.25 + fold; b.wl.rotation.z = 1.25 - fold;
          b.g.rotation.x = -0.5;
        } else {
          const u = Math.min(1, Math.max(0, F.t - b.ph * 0.01));
          const mid = F.from.clone().lerp(F.to, 0.5); mid.y = Math.max(F.from.y, F.to.y) + 14;
          const a = F.from.clone().lerp(mid, u), c2 = mid.clone().lerp(F.to, u);
          p = a.lerp(c2, u).add(b.off.clone().multiplyScalar(Math.sin(u * Math.PI)));
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
    const fur = [0.22, 0.15, 0.1], face = [0.55, 0.42, 0.32];
    const mat = animalMat(0.95);
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 8);
    this.monkeyParts = {
      torso: merged([[cap(0.13, 0.22), fur, M4(0, 0.25, 0, 0, 0, 0, 1, 1, 0.85)], [new THREE.SphereGeometry(0.1, 10, 8), fur, M4(0, 0.52, 0.02)],
        [new THREE.SphereGeometry(0.06, 8, 6), face, M4(0, 0.5, 0.09, 0, 0, 0, 1, 0.8, 0.6)], [new THREE.SphereGeometry(0.035, 6, 5), fur, M4(0.09, 0.55, 0)], [new THREE.SphereGeometry(0.035, 6, 5), fur, M4(-0.09, 0.55, 0)]]),
      limb: merged([[cap(0.04, 0.22), fur, M4(0, -0.14, 0)]]),
      tail: merged([[new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, -0.2, -0.15), new V3(0, -0.45, -0.1), new V3(0, -0.6, 0.08)]), 10, 0.025, 5), fur]]),
    };
    this.monkeys = [];
    const trees = [...this.giants.map((g) => ({ x: g.x, z: g.z, y: g.y, H: g.H * 0.7, R: 5 })), ...this.mediums.filter((m) => m.H > 9).map((m) => ({ x: m.x, z: m.z, y: m.y, H: m.H * 0.85, R: 2.2 }))]
      .filter((t) => Math.hypot(t.x - 4, t.z + 10) < 90);
    this.monkeyTrees = trees;
    for (let i = 0; i < 12 && trees.length; i++) {
      const g = new THREE.Group();
      const torso = new THREE.Mesh(this.monkeyParts.torso, mat); g.add(torso);
      const limbs = [];
      for (const [x, y] of [[0.12, 0.38], [-0.12, 0.38], [0.08, 0.12], [-0.08, 0.12]]) {
        const p = new THREE.Group(); p.position.set(x, y, 0); p.add(new THREE.Mesh(this.monkeyParts.limb, mat)); g.add(p); limbs.push(p);
      }
      const tail = new THREE.Mesh(this.monkeyParts.tail, mat); tail.position.set(0, 0.12, -0.08); g.add(tail);
      g.scale.setScalar(1.3);
      this.scene.add(g);
      const tr = trees[Math.floor(rnd() * trees.length)];
      this.monkeys.push({ g, limbs, tail, tree: tr, seat: this.seatOn(tr), state: 'sit', t: 0, wait: 4 + rnd() * 15, ph: rnd() * 10, from: null, to: null });
    }
    this.howlT = 8 + rnd() * 20;
  }
  seatOn(tr) { const a = rnd() * Math.PI * 2, r = tr.R * (0.4 + rnd() * 0.6); return new V3(tr.x + Math.cos(a) * r, tr.y + tr.H * (0.85 + rnd() * 0.25), tr.z + Math.sin(a) * r); }

  updateMonkeys(dt, cam, day) {
    const t = this.time;
    for (const m of this.monkeys) {
      m.g.visible = day > 0.2 && m.g.position.distanceTo(cam.position) < 110;
      if (m.state === 'sit') {
        m.g.position.copy(m.seat);
        m.g.rotation.y = m.ph + Math.sin(t * 0.3 + m.ph) * 0.6;
        m.limbs[0].rotation.x = -0.6 + Math.sin(t * 1.3 + m.ph) * 0.2; m.limbs[1].rotation.x = -0.4;
        m.limbs[2].rotation.x = -1.3; m.limbs[3].rotation.x = -1.3;
        m.tail.rotation.z = Math.sin(t * 1.1 + m.ph) * 0.4;
        m.wait -= dt;
        if (m.wait <= 0 && this.monkeyTrees.length > 1) {
          const near = this.monkeyTrees.filter((tr) => tr !== m.tree && Math.hypot(tr.x - m.tree.x, tr.z - m.tree.z) < 22);
          if (near.length) {
            const tr = near[Math.floor(rnd() * near.length)];
            m.from = m.seat.clone(); m.tree = tr; m.seat = this.seatOn(tr); m.to = m.seat.clone();
            m.state = 'leap'; m.t = 0; m.dur = 0.6 + m.from.distanceTo(m.to) / 14;
          }
          m.wait = 6 + rnd() * 20;
        }
      } else {
        m.t += dt / m.dur;
        const u = Math.min(1, m.t);
        const p = m.from.clone().lerp(m.to, u); p.y += Math.sin(u * Math.PI) * (2 + m.from.distanceTo(m.to) * 0.15);
        m.g.position.copy(p);
        const d = m.to.clone().sub(m.from); m.g.rotation.y = Math.atan2(d.x, d.z);
        const s = Math.sin(u * Math.PI);
        m.limbs[0].rotation.x = m.limbs[1].rotation.x = -2.6 * s; m.limbs[2].rotation.x = m.limbs[3].rotation.x = 1.2 * s;
        m.tail.rotation.z = 0;
        if (m.t >= 1) m.state = 'sit';
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
    const coat = [0.78, 0.55, 0.25], belly = [0.92, 0.85, 0.7], dark = [0.05, 0.04, 0.03];
    const mat = jaguarMat();
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
    const g = new THREE.Group();
    const body = new THREE.Mesh(merged([
      [cap(0.26, 0.85), coat, M4(0, 0.62, 0, Math.PI / 2)],
      [cap(0.2, 0.6), belly, M4(0, 0.5, 0.05, Math.PI / 2, 0, 0, 0.9, 1, 0.8)],
      [new THREE.SphereGeometry(0.3, 12, 10), coat, M4(0, 0.68, 0.4, 0, 0, 0, 1, 1.05, 1.1)],
    ]), mat);
    g.add(body);
    const head = new THREE.Group(); head.position.set(0, 0.82, 0.72); g.add(head);
    head.add(new THREE.Mesh(merged([
      [new THREE.SphereGeometry(0.19, 12, 10), coat, M4(0, 0, 0, 0, 0, 0, 1, 0.9, 1)],
      [new THREE.SphereGeometry(0.11, 10, 8), belly, M4(0, -0.06, 0.15, 0, 0, 0, 1, 0.75, 0.9)],
      [new THREE.SphereGeometry(0.035, 6, 5), dark, M4(0, -0.02, 0.24)],
      [new THREE.ConeGeometry(0.06, 0.09, 6), coat, M4(0.12, 0.15, -0.02)],
      [new THREE.ConeGeometry(0.06, 0.09, 6), coat, M4(-0.12, 0.15, -0.02)],
    ]), mat));
    // szemek: éjjel fényvisszaverő (tapetum) zöldessárga ragyogás
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.2, 0.8), fog: false });
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), this.eyeMat); e.position.set(s * 0.075, 0.04, 0.16); head.add(e); }
    const legGeo = merged([[cap(0.075, 0.28), coat, M4(0, -0.18, 0)]]);
    const lowGeo = merged([[cap(0.06, 0.26), coat, M4(0, -0.16, 0)], [new THREE.SphereGeometry(0.075, 8, 6), coat, M4(0, -0.33, 0.03, 0, 0, 0, 1, 0.6, 1.3)]]);
    this.jLegs = [];
    for (const [x, z, front] of [[0.16, 0.42, 1], [-0.16, 0.42, 1], [0.16, -0.42, 0], [-0.16, -0.42, 0]]) {
      const hip = new THREE.Group(); hip.position.set(x, 0.62, z); g.add(hip);
      hip.add(new THREE.Mesh(legGeo, mat));
      const knee = new THREE.Group(); knee.position.y = -0.33; hip.add(knee); knee.add(new THREE.Mesh(lowGeo, mat));
      this.jLegs.push({ hip, knee, front, ph: (x > 0 ? 0 : Math.PI) + (front ? 0 : Math.PI) + (front ? 0.3 : 0) });
    }
    const tail = new THREE.Mesh(merged([[new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(0, -0.15, -0.3), new V3(0, -0.3, -0.6), new V3(0, -0.25, -0.85)]), 12, 0.045, 6), coat]]), mat);
    tail.position.set(0, 0.68, -0.55); g.add(tail);
    g.traverse((o) => { if (o.isMesh && o.material !== this.eyeMat) { o.castShadow = true; o.receiveShadow = true; } });
    g.scale.setScalar(1.15);
    g.visible = false;
    this.scene.add(g);
    this.jag = { g, head, tail, state: 'away', t: 20 + rnd() * 40, pos: new V3(), yaw: 0, speed: 0, phase: 0, growlT: 0, ang: 0 };
  }

  updateJaguar(dt, player, night, hooks) {
    const J = this.jag, P = player.pos;
    // biztonságos: tábortűz, lerakott tűz vagy fáklya a kézben
    const safe = hooks.isSafe ? hooks.isSafe(P) : Math.hypot(P.x - CAMP.x, P.z - CAMP.z) < 9;
    const torch = hooks.hasTorch ? hooks.hasTorch() : false;
    const dP = Math.hypot(J.pos.x - P.x, J.pos.z - P.z);
    let target = null, spd = 0;
    if (J.state === 'away') {
      J.g.visible = false;
      J.t -= dt;
      if (night > 0.6 && J.t <= 0 && !player.swim) {
        // a játékostól 35-45 m-re, az erdőben bukkan fel
        for (let k = 0; k < 20; k++) {
          const a = rnd() * Math.PI * 2, d = 35 + rnd() * 10;
          const x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d;
          if (Math.hypot(x, z) > 175 || this.T.heightAt(x, z) < 0.4 || this.T.forestAt(x, z) < 0.35) continue;
          J.pos.set(x, this.T.heightAt(x, z), z); J.ang = Math.atan2(z - P.z, x - P.x);
          J.state = 'stalk'; J.t = 60 + rnd() * 60; J.g.visible = true; break;
        }
        if (J.state === 'away') J.t = 10;
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
      if (dP < 22 && J.growlT <= 0) { this.audio?.growl(Math.min(1, 10 / dP)); J.growlT = 6 + rnd() * 6; }
      if (dP < 8.5 && !safe && !player.swim) { J.state = 'charge'; J.t = 4; this.audio?.growl(1.2); }
      if (J.t <= 0 || night < 0.4 || dP > 70) J.state = 'leave';
    } else if (J.state === 'charge') {
      J.t -= dt; target = P.clone(); spd = 9;
      if (dP < 1.7) { hooks.onAttack(); J.state = 'leave'; J.t = 0; }
      if (J.t <= 0 || safe || player.swim) J.state = 'leave';
    } else if (J.state === 'leave') {
      const away = new V3(J.pos.x - P.x, 0, J.pos.z - P.z).normalize();
      target = J.pos.clone().addScaledVector(away, 20); spd = 6;
      if (dP > 50) { J.state = 'away'; J.t = 90 + rnd() * 120; }
    }
    if (target) {
      const d = new V3(target.x - J.pos.x, 0, target.z - J.pos.z), L = d.length();
      if (L > 0.3) {
        const want = Math.atan2(d.x, d.z);
        let dy = want - J.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        J.yaw += dy * (1 - Math.exp(-dt * 4));
        J.speed = damp(J.speed, Math.min(spd, L * 1.5), 3, dt);
        J.pos.x += Math.sin(J.yaw) * J.speed * dt; J.pos.z += Math.cos(J.yaw) * J.speed * dt;
      } else J.speed = damp(J.speed, 0, 4, dt);
      J.pos.y = this.T.heightAt(J.pos.x, J.pos.z);
    }
    // animáció: séta / vágta, lopakodó testtartás
    const g = J.g; g.position.copy(J.pos); g.rotation.y = J.yaw;
    const run = Math.min(1, Math.max(0, (J.speed - 3) / 4));
    J.phase += dt * (J.speed * 2.2 + 0.3);
    for (const L of this.jLegs) {
      const s = Math.sin(J.phase + L.ph);
      L.hip.rotation.x = -s * (0.45 + 0.4 * run) * Math.min(1, J.speed);
      L.knee.rotation.x = (L.front ? -1 : 1) * Math.max(0, Math.cos(J.phase + L.ph)) * 0.6 * Math.min(1, J.speed);
    }
    const crouch = J.state === 'stalk' ? 0.12 : 0;
    g.children[0].position.y = -crouch + Math.abs(Math.sin(J.phase)) * 0.03 * run;
    J.head.position.y = 0.82 - crouch * 1.2;
    J.head.rotation.y = J.state === 'stalk' ? Math.sin(this.time * 0.6) * 0.25 : 0;
    J.tail.rotation.y = Math.sin(this.time * 1.7) * 0.35;
    this.eyeMat.color.setRGB(3, 3.2, 0.8).multiplyScalar(night);
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
    sky_day_cache = sky.day * (1 - G.uRain.value * 0.7);
    this.updateParrots(dt, player, camera);
    this.updateMonkeys(dt, camera, sky.day * (1 - G.uRain.value * 0.6));
    this.updateFrogs(dt, player, fx);
    this.updateFish(dt, fx);
    this.updateBats(dt, sky.night);
    this.updateJaguar(dt, player, sky.night, hooks);
  }
}
let sky_day_cache = 1;
