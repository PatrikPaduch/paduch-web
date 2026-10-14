// Felfedező karakter (procedurális modell + animáció) és harmadik személyű kamera
import * as THREE from 'three';
import { patch } from './shaders.js';

const V3 = THREE.Vector3;
const std = (color, rough = 0.85, extra = {}) => patch(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra }), 'basic');
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDamp = (a, b, k, dt) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * (1 - Math.exp(-k * dt)); };

export class Player {
  constructor(scene, T, colliders) {
    this.T = T; this.colliders = colliders;
    this.pos = new V3(2, T.heightAt(2, 18), 18);
    this.vy = 0; this.onGround = true; this.facing = Math.PI; this.speed = 0; this.phase = 0;
    this.swim = false; this.wade = 0; this.moving = false; this.running = false;
    this.camYaw = 0; this.camPitch = 0.22; this.camDist = 5.2; this.camDistT = 5.2;
    this.yawT = this.camYaw; this.pitchT = this.camPitch;
    this.camTarget = new V3().copy(this.pos).add(new V3(0, 1.55, 0));
    this.stamina = 1; this.lastStepSign = 0; this.onStep = null;
    this.build(scene);
  }

  build(scene) {
    const M = {
      shirt: std(0xb39a6c, 0.92), pants: std(0x5a4a36, 0.95), skin: std(0xc68a62, 0.65), boot: std(0x3a291b, 0.75),
      hat: std(0xc8ad78, 0.9), band: std(0x4a3420, 0.8), pack: std(0x56633c, 0.92), strap: std(0x3d2c1d, 0.8),
      metal: std(0xc4c8cc, 0.3, { metalness: 0.85 }), roll: std(0x7a3b2a, 0.95), hair: std(0x2b1d14, 0.9), scarf: std(0x8c3324, 0.9),
    };
    const add = (parent, geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
      m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    };
    const root = this.root = new THREE.Group();
    scene.add(root);
    const hips = this.hips = new THREE.Group(); hips.position.y = 0.95; root.add(hips);
    add(hips, new THREE.CapsuleGeometry(0.15, 0.08, 4, 12), M.pants, 0, 0, 0, 1.15, 1, 0.8);
    add(hips, new THREE.TorusGeometry(0.162, 0.025, 6, 20), M.strap, 0, 0.07, 0, 1.12, 0.8, 1).rotation.x = Math.PI / 2;
    add(hips, new THREE.BoxGeometry(0.05, 0.05, 0.02), M.metal, 0, 0.07, 0.15);
    // bozótvágó kés tokban
    const sheath = add(hips, new THREE.BoxGeometry(0.05, 0.42, 0.07), M.strap, -0.21, -0.18, 0.02);
    sheath.rotation.z = 0.12;
    add(hips, new THREE.CylinderGeometry(0.02, 0.022, 0.12, 8), M.boot, -0.19, 0.08, 0.02);
    // kulacs
    const cant = add(hips, new THREE.CylinderGeometry(0.075, 0.075, 0.045, 14), std(0x4d5a3a, 0.6), 0.2, -0.06, 0.04);
    cant.rotation.z = Math.PI / 2;

    const torso = this.torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso);
    add(torso, new THREE.CapsuleGeometry(0.17, 0.3, 4, 14), M.shirt, 0, 0.28, 0, 1.15, 1, 0.75);
    add(torso, new THREE.TorusGeometry(0.075, 0.03, 6, 14), M.scarf, 0, 0.53, 0.0, 1.1, 1.1, 1).rotation.x = Math.PI / 2;
    add(torso, new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), M.skin, 0, 0.57, 0);
    // pántok
    for (const s of [-1, 1]) {
      const st = add(torso, new THREE.BoxGeometry(0.045, 0.42, 0.02), M.strap, s * 0.1, 0.3, 0.135);
      st.rotation.x = 0.05;
    }
    // hátizsák
    const pack = new THREE.Group(); pack.position.set(0, 0.3, -0.17); torso.add(pack);
    add(pack, new THREE.BoxGeometry(0.34, 0.42, 0.18), M.pack);
    add(pack, new THREE.BoxGeometry(0.36, 0.12, 0.2), M.pack, 0, 0.17, 0.0);
    add(pack, new THREE.BoxGeometry(0.22, 0.14, 0.06), M.pack, 0, -0.08, -0.11);
    add(pack, new THREE.CylinderGeometry(0.075, 0.075, 0.44, 14), M.roll, 0, 0.27, 0.0).rotation.z = Math.PI / 2;
    add(pack, new THREE.TorusGeometry(0.035, 0.008, 6, 10), M.metal, 0.17, 0.0, -0.04).rotation.y = Math.PI / 2;

    const head = this.head = new THREE.Group(); head.position.set(0, 0.69, 0); torso.add(head);
    add(head, new THREE.SphereGeometry(0.115, 20, 16), M.skin, 0, 0, 0, 0.95, 1.08, 1);
    add(head, new THREE.SphereGeometry(0.022, 8, 6), M.skin, 0, -0.01, 0.112);
    add(head, new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M.hair, 0, 0.012, -0.012, 0.97, 1.05, 1.02);
    add(head, new THREE.SphereGeometry(0.012, 6, 4), M.hair, -0.04, 0.025, 0.105);
    add(head, new THREE.SphereGeometry(0.012, 6, 4), M.hair, 0.04, 0.025, 0.105);
    const hat = new THREE.Group(); hat.position.set(0, 0.075, -0.005); hat.rotation.set(-0.08, 0, 0.04); head.add(hat);
    add(hat, new THREE.CylinderGeometry(0.25, 0.25, 0.012, 32), M.hat);
    add(hat, new THREE.CylinderGeometry(0.118, 0.135, 0.115, 24), M.hat, 0, 0.06, 0);
    add(hat, new THREE.CylinderGeometry(0.137, 0.137, 0.032, 24), M.band, 0, 0.022, 0);

    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.225, 0.44, 0); torso.add(sh);
      add(sh, new THREE.CapsuleGeometry(0.056, 0.2, 4, 10), M.shirt, 0, -0.13, 0);
      const el = new THREE.Group(); el.position.y = -0.27; sh.add(el);
      add(el, new THREE.CapsuleGeometry(0.047, 0.18, 4, 10), M.skin, 0, -0.12, 0);
      add(el, new THREE.SphereGeometry(0.052, 10, 8), M.skin, 0, -0.26, 0.01, 0.9, 1.1, 0.8);
      this.arms.push({ sh, el, s });
    }
    this.legs = [];
    for (const s of [-1, 1]) {
      const hp = new THREE.Group(); hp.position.set(s * 0.1, -0.02, 0); hips.add(hp);
      add(hp, new THREE.CapsuleGeometry(0.078, 0.3, 4, 10), M.pants, 0, -0.22, 0);
      const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
      add(kn, new THREE.CapsuleGeometry(0.066, 0.3, 4, 10), M.pants, 0, -0.2, 0);
      add(kn, new THREE.CylinderGeometry(0.07, 0.075, 0.12, 12), M.boot, 0, -0.36, 0);
      const ft = new THREE.Group(); ft.position.y = -0.44; kn.add(ft);
      add(ft, new THREE.BoxGeometry(0.115, 0.1, 0.25), M.boot, 0, 0.03, 0.045);
      add(ft, new THREE.BoxGeometry(0.12, 0.025, 0.26), std(0x1c140d, 0.9), 0, -0.02, 0.045);
      this.legs.push({ hp, kn, ft, s });
    }
  }

  // Csontvázas karakter bekötése: a procedurális bábu elrejtve
  setRig(rig) {
    if (!rig) return;
    this.rig = rig;
    this.hips.visible = false;
    this.root.add(rig.object);
  }

  update(dt, input) {
    const T = this.T;
    const fwd = new THREE.Vector2(-Math.sin(this.camYaw), -Math.cos(this.camYaw));
    const right = new THREE.Vector2(Math.cos(this.camYaw), -Math.sin(this.camYaw));
    const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0), mz = (input.fwd ? 1 : 0) - (input.back ? 1 : 0);
    const dir = new THREE.Vector2().addScaledVector(fwd, mz).addScaledVector(right, mx);
    const len = dir.length();
    this.moving = len > 0.01;
    if (this.moving) dir.multiplyScalar(1 / len);

    const ground0 = T.heightAt(this.pos.x, this.pos.z), lvl0 = T.waterLevelAt(this.pos.x, this.pos.z);
    const depth0 = lvl0 - ground0;
    this.swim = depth0 > 1.25;
    this.wade = Math.max(0, Math.min(1, (lvl0 - this.pos.y) / 1.2));
    this.running = this.moving && input.run && this.stamina > 0.04 && !this.swim;
    let target = this.rig
      ? (this.swim ? 2.2 : this.running ? 6.8 : input.walk ? 1.3 : 3.8)
      : (this.swim ? 2.2 : this.running ? 6.4 : 3.0);
    if (!this.swim) target *= 1 - this.wade * 0.45;
    this.speed = damp(this.speed, this.moving ? target : 0, this.moving ? 8 : 10, dt);
    if (this.running) this.stamina = Math.max(0, this.stamina - dt * 0.12);
    else this.stamina = Math.min(1, this.stamina + dt * (this.moving ? 0.06 : 0.12));

    if (this.moving) this.facing = angDamp(this.facing, Math.atan2(dir.x, dir.y), 10, dt);
    const moveDir = this.moving ? dir : new THREE.Vector2(Math.sin(this.facing), Math.cos(this.facing));
    let nx = this.pos.x + moveDir.x * this.speed * dt, nz = this.pos.z + moveDir.y * this.speed * dt;

    const blocked = (x, z) => {
      const h1 = T.heightAt(x, z), d = Math.hypot(x - this.pos.x, z - this.pos.z);
      if (d < 1e-5) return false;
      return !this.swim && (h1 - ground0) / d > 1.05 && h1 > T.waterLevelAt(x, z) - 1.0;
    };
    if (blocked(nx, nz)) {
      if (!blocked(nx, this.pos.z)) nz = this.pos.z;
      else if (!blocked(this.pos.x, nz)) nx = this.pos.x;
      else { nx = this.pos.x; nz = this.pos.z; }
    }
    for (const c of this.colliders) {
      const dx = nx - c.x, dz = nz - c.z, mn = c.r + 0.35;
      if (Math.abs(dx) > mn || Math.abs(dz) > mn) continue;
      const d = Math.hypot(dx, dz);
      if (d < mn && d > 1e-4) { nx = c.x + dx / d * mn; nz = c.z + dz / d * mn; }
    }
    const rr = Math.hypot(nx, nz);
    if (rr > 182) { nx *= 182 / rr; nz *= 182 / rr; }
    this.pos.x = nx; this.pos.z = nz;

    const ground = T.heightAt(nx, nz), lvl = T.waterLevelAt(nx, nz);
    if (lvl - ground > 1.25) {
      this.pos.y = damp(this.pos.y, lvl - (this.rig ? 0.14 : 1.02) + Math.sin(performance.now() * 0.002) * 0.04, 6, dt);
      this.vy = 0; this.onGround = true;
    } else {
      if (input.jump && this.onGround) { this.vy = 6.0; this.onGround = false; }
      this.vy -= 18 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= ground || (this.onGround && this.vy <= 0 && this.pos.y - ground < 0.4)) {
        this.pos.y = ground; this.vy = 0; this.onGround = true;
      } else this.onGround = false;
    }
    input.jump = false;
    this.animate(dt);
  }

  animate(dt) {
    if (this.rig) {
      this.root.position.copy(this.pos);
      this.root.rotation.y = this.facing;
      const step = this.rig.update(dt, { speed: this.speed, swim: this.swim, onGround: this.onGround, vy: this.vy });
      if (step && this.onStep) this.onStep(this.wade > 0.05 ? 'water' : 'ground', Math.min(1, Math.max(0, (this.speed - 3.5) / 3)));
      return;
    }
    const sp = this.speed, run = Math.min(1, Math.max(0, (sp - 3.2) / 3));
    const amp = Math.min(1, sp / 3);
    this.phase += dt * (sp * 1.75 + (this.swim ? 2 : 0));
    const ph = this.phase, t = performance.now() * 0.001;
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.facing;
    const stepSign = Math.sign(Math.sin(ph));
    if (this.onGround && !this.swim && amp > 0.2 && stepSign !== this.lastStepSign && this.onStep) this.onStep(this.wade > 0.05 ? 'water' : 'ground', run);
    this.lastStepSign = stepSign;

    if (this.swim) {
      this.hips.rotation.x = damp(this.hips.rotation.x, 1.15, 5, dt);
      this.hips.position.y = 0.95;
      for (const a of this.arms) {
        const p = ph * 1.2 + (a.s > 0 ? 0 : Math.PI);
        a.sh.rotation.x = -Math.PI * 0.5 + Math.sin(p) * 1.4; a.sh.rotation.z = a.s * (0.3 + Math.cos(p) * 0.3);
        a.el.rotation.x = -0.3;
      }
      for (const l of this.legs) { l.hp.rotation.x = Math.sin(ph * 3 + (l.s > 0 ? 0 : Math.PI)) * 0.35; l.kn.rotation.x = 0.25; l.ft.rotation.x = 0.4; }
      this.torso.rotation.x = 0; this.head.rotation.x = -0.9;
      return;
    }
    this.hips.rotation.x = damp(this.hips.rotation.x, 0, 8, dt);
    this.head.rotation.x = damp(this.head.rotation.x, 0, 8, dt);
    const bob = Math.abs(Math.sin(ph)) * 0.05 * amp + (1 - amp) * Math.sin(t * 1.6) * 0.006;
    this.hips.position.y = 0.95 - 0.03 * amp - 0.05 * run + bob;
    this.torso.rotation.x = damp(this.torso.rotation.x, 0.06 * amp + 0.18 * run, 6, dt);
    this.torso.rotation.y = Math.sin(ph) * 0.12 * amp;
    this.torso.scale.y = 1 + (1 - amp) * Math.sin(t * 1.6) * 0.008;
    if (!this.onGround) {
      for (const l of this.legs) { l.hp.rotation.x = damp(l.hp.rotation.x, l.s > 0 ? -0.7 : -0.2, 10, dt); l.kn.rotation.x = damp(l.kn.rotation.x, l.s > 0 ? 1.1 : 0.5, 10, dt); }
      for (const a of this.arms) { a.sh.rotation.x = damp(a.sh.rotation.x, -0.5, 8, dt); a.sh.rotation.z = a.s * 0.35; a.el.rotation.x = -0.6; }
      return;
    }
    for (const l of this.legs) {
      const p = ph + (l.s > 0 ? 0 : Math.PI);
      const swing = Math.sin(p) * (0.5 + 0.25 * run) * amp;
      l.hp.rotation.x = -swing;
      l.kn.rotation.x = Math.max(0, Math.cos(p)) * (0.65 + 0.55 * run) * amp + 0.04;
      l.ft.rotation.x = -Math.min(0, Math.sin(p)) * 0.3 * amp - 0.05;
    }
    for (const a of this.arms) {
      const p = ph + (a.s > 0 ? Math.PI : 0);
      a.sh.rotation.x = -Math.sin(p) * (0.45 + 0.3 * run) * amp - 0.12 * run;
      a.sh.rotation.z = a.s * (0.07 + (1 - amp) * Math.sin(t * 1.6) * 0.01);
      a.el.rotation.x = -(0.2 + 0.25 * amp + 0.9 * run);
    }
  }

  updateCamera(dt, camera) {
    const T = this.T;
    // simított forgatás: az egér a célszöget állítja, a kamera finoman követi
    this.camYaw = damp(this.camYaw, this.yawT, 16, dt);
    this.camPitch = damp(this.camPitch, this.pitchT, 16, dt);
    this.camDist = damp(this.camDist, this.camDistT, 8, dt);
    const right = new V3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const tgt = new V3(this.pos.x, this.pos.y + (this.swim ? (this.rig ? 0.5 : 1.1) : 1.6), this.pos.z).addScaledVector(right, 0.45 * Math.min(1, this.camDist / 4));
    this.camTarget.x = damp(this.camTarget.x, tgt.x, 14, dt);
    this.camTarget.z = damp(this.camTarget.z, tgt.z, 14, dt);
    this.camTarget.y = damp(this.camTarget.y, tgt.y, 9, dt);
    const cp = Math.cos(this.camPitch);
    const dir = new V3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    // kamera ne menjen bele a fatörzsekbe: sugármenetelés a cél felől
    let dist = this.camDist;
    for (let s = 0.6; s < this.camDist; s += 0.35) {
      const px = this.camTarget.x + dir.x * s, pz = this.camTarget.z + dir.z * s;
      let hit = false;
      for (const c of this.colliders) {
        if (c.r < 0.25) continue;
        const dx = px - c.x, dz = pz - c.z, rr = c.r + 0.25;
        if (dx * dx + dz * dz < rr * rr) { hit = true; break; }
      }
      if (hit) { dist = Math.max(0.8, s - 0.35); break; }
    }
    this.camHit = damp(this.camHit ?? dist, dist, dist < (this.camHit ?? dist) ? 20 : 4, dt);
    const c = dir.multiplyScalar(Math.min(this.camDist, this.camHit)).add(this.camTarget);
    c.y = Math.max(c.y, T.heightAt(c.x, c.z) + 0.4, T.waterLevelAt(c.x, c.z) + 0.3);
    camera.position.copy(c);
    camera.lookAt(this.camTarget);
  }
}
