// A Napkapu: kőkör a völgy délnyugati végén. Középen kőkapu napkoronggal, előtte oltár két foglalattal.
// Ha az Arany Jaguár és a Jáde Kígyó a helyére kerül, a kapuban fényoszlop gyúl, és előkerül a Napkorong.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, patch, ADD } from './shaders.js';
import { templeMatPBR } from './materials.js';
import { mulberry32 } from './noise.js';
import { NAPKAPU, CAMP } from './terrain.js';

const V3 = THREE.Vector3;

export class Napkapu {
  constructor(scene, flora, rockTex, idolSrc, serpentSrc) {
    this.scene = scene;
    this.c = new V3(NAPKAPU.x, NAPKAPU.y, NAPKAPU.z);
    this.placed = false; this.discTaken = false; this.seen = false; this.k = 0;
    // a kapu a tábor felé néz (onnan érkezik a játékos)
    this.yaw = Math.atan2(CAMP.x - NAPKAPU.x, CAMP.z - NAPKAPU.z);
    const rnd = mulberry32(5);
    const fwd = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), rgt = new V3(fwd.z, 0, -fwd.x);
    this.fwd = fwd; this.rgt = rgt;
    const W = (lx, y, lz) => new V3(NAPKAPU.x + rgt.x * lx + fwd.x * lz, NAPKAPU.y + y, NAPKAPU.z + rgt.z * lx + fwd.z * lz);
    const geos = [];
    const box = (w, h, d, p, ry = 0, rx = 0, rz = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.applyMatrix4(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, this.yaw + ry, rz)), new V3(1, 1, 1)));
      geos.push(g.toNonIndexed());
    };
    // kör alakú, töredezett kőpadló két lépcsőfokkal
    const disc = (r, h, y) => { const g = new THREE.CylinderGeometry(r, r + 0.15, h, 36, 1); g.translate(NAPKAPU.x, NAPKAPU.y + y, NAPKAPU.z); geos.push(g.toNonIndexed()); };
    disc(8.2, 0.5, -0.05); disc(6.9, 0.3, 0.3);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, d = 1 + rnd() * 5.4;
      box(0.8 + rnd() * 1.2, 0.12, 0.6 + rnd() * 1.0, W(Math.cos(a) * d, 0.47, Math.sin(a) * d), rnd() * 3, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.06);
    }
    // álló kövek gyűrűje (néhány ledőlt)
    this.colliders = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.15, lx = Math.cos(a) * 6.1, lz = Math.sin(a) * 6.1;
      if (Math.abs(lx) < 2.2 && lz > 0) continue; // a bejáratnál rés
      const fallen = rnd() < 0.25, h = 2.6 + rnd() * 1.6;
      if (fallen) box(0.75, 0.55, h, W(lx * 1.08, 0.75, lz * 1.08), -a + 0.4, 0, 0.1);
      else box(0.85, h, 0.6, W(lx, 0.45 + h / 2, lz), -a + Math.PI / 2, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.12);
      const p = W(lx, 0, lz); this.colliders.push({ x: p.x, z: p.z, r: 0.65, h: fallen ? 0.9 : h });
    }
    // kapu: két oszlop + szemöldökkő
    for (const s of [-1, 1]) {
      box(0.95, 4.6, 0.95, W(s * 1.75, 2.75, -1.5));
      box(1.25, 0.35, 1.25, W(s * 1.75, 0.62, -1.5));
      box(1.15, 0.3, 1.15, W(s * 1.75, 5.1, -1.5));
      const p = W(s * 1.75, 0, -1.5); this.colliders.push({ x: p.x, z: p.z, r: 0.7, h: 5.5 });
    }
    box(5.0, 0.8, 1.1, W(0, 5.6, -1.5));
    // oltár a kapu előtt, két foglalattal
    box(2.2, 1.0, 1.0, W(0, 0.95, 1.6));
    box(2.5, 0.18, 1.25, W(0, 1.5, 1.6));
    for (const s of [-1, 1]) box(0.5, 0.12, 0.5, W(s * 0.6, 1.64, 1.6));
    { const p = W(0, 0, 1.6); this.colliders.push({ x: p.x, z: p.z, r: 1.0, h: 1.6 }); }
    flora.colliders.push(...this.colliders);
    const mat = templeMatPBR(rockTex, [new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4(0, -1, 0, 0)]);
    const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);

    // napkorong a szemöldökkövön: arany gyűrű, aktiváláskor felizzik
    this.sunMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.9, roughness: 0.3, emissive: new THREE.Color(0, 0, 0) });
    const sun = new THREE.Group();
    sun.add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 10, 36), this.sunMat));
    sun.add(new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), this.sunMat));
    for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 5), this.sunMat); const a = i / 12 * Math.PI * 2; r.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0); r.rotation.z = a - Math.PI / 2; sun.add(r); }
    sun.position.copy(W(0, 6.75, -1.5)); sun.rotation.y = this.yaw;
    scene.add(sun);
    this.sun = sun;

    // az oltárra kerülő szobrok (a megszerzett kincsek másolata)
    this.idolCopy = idolSrc.clone(); this.idolCopy.position.copy(W(-0.6, 1.7, 1.6)); this.idolCopy.rotation.set(0, this.yaw, 0); this.idolCopy.scale.setScalar(1.25); this.idolCopy.visible = false;
    this.serpCopy = serpentSrc.clone(); this.serpCopy.position.copy(W(0.6, 1.7, 1.6)); this.serpCopy.rotation.set(0, this.yaw, 0); this.serpCopy.scale.setScalar(1.0); this.serpCopy.visible = false;
    scene.add(this.idolCopy, this.serpCopy);
    this.altar = W(0, 1.6, 1.6);
    this.discPos = W(0, 1.7, -1.5);

    // fényoszlop a kapuban + felszálló szikrák
    const bm = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uK: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; uniform float uK; varying vec2 vUv;
void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float core = exp(-x * x * 9.0), band = 0.6 + 0.4 * sin(vUv.y * 40.0 - uTime * 3.0);
  float a = core * (0.55 + 0.45 * band) * smoothstep(1.0, 0.25, vUv.y) * smoothstep(0.0, 0.03, vUv.y) * uK;
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a * 2.4, 0.0); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ADD,
    });
    this.beamMat = bm;
    const beam = new THREE.Group();
    for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 40), bm); p.position.y = 20; p.rotation.y = i / 3 * Math.PI; beam.add(p); }
    beam.position.copy(W(0, 0.5, -1.5));
    beam.visible = false;
    scene.add(beam);
    this.beam = beam;
    const sp = [];
    for (let i = 0; i < 160; i++) sp.push((Math.random() - 0.5) * 2.4, Math.random() * 30, (Math.random() - 0.5) * 2.4, Math.random());
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp.filter((_, i) => i % 4 !== 3), 3));
    sg.setAttribute('aR', new THREE.Float32BufferAttribute(sp.filter((_, i) => i % 4 === 3), 1));
    this.moteMat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uK: { value: 0 } },
      vertexShader: `attribute float aR; uniform float uTime; varying float vA;
void main() { vec3 p = position; p.y = mod(p.y + uTime * (1.2 + aR * 1.6), 30.0);
  p.xz *= 0.6 + 0.4 * sin(uTime * 0.5 + aR * 6.28);
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = smoothstep(30.0, 18.0, p.y) * smoothstep(0.0, 1.0, p.y);
  gl_PointSize = (40.0 + aR * 40.0) / max(-mv.z, 0.5); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying float vA;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float a = exp(-dot(q, q) * 5.0) * vA * uK;
  gl_FragColor = vec4(vec3(1.0, 0.85, 0.5) * a * 1.8, 0.0); }`,
      transparent: true, depthWrite: false, ...ADD,
    });
    const motes = new THREE.Points(sg, this.moteMat);
    motes.position.copy(W(0, 0.5, -1.5)); motes.frustumCulled = false;
    beam.add(motes); motes.position.set(0, 0, 0);

    // a Napkorong (jutalom): a kapuban lebeg, ha aktív
    const prize = new THREE.Group();
    const dm = new THREE.MeshStandardMaterial({ color: 0xf5c851, metalness: 1, roughness: 0.18, emissive: new THREE.Color(0.5, 0.32, 0.06) });
    prize.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 32).rotateX(Math.PI / 2), dm));
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), dm); const a = i / 8 * Math.PI * 2; r.position.set(Math.cos(a) * 0.36, Math.sin(a) * 0.36, 0); r.rotation.z = a - Math.PI / 2; prize.add(r); }
    prize.position.copy(this.discPos); prize.visible = false;
    scene.add(prize);
    this.disc = prize;
  }

  near(p, r) { return Math.hypot(p.x - this.c.x, p.z - this.c.z) < r; }
  altarNear(p) { return !this.placed && Math.hypot(p.x - this.altar.x, p.z - this.altar.z) < 2.4; }
  place() { this.placed = true; this.idolCopy.visible = true; this.serpCopy.visible = true; this.beam.visible = true; this.t0 = -1; }
  discNear(p) { return this.placed && !this.discTaken && this.k > 0.8 && Math.hypot(p.x - this.discPos.x, p.z - this.discPos.z) < 2.0; }
  takeDisc() { this.discTaken = true; this.disc.visible = false; }
  // betöltéskor: már aktivált kapu
  restore(placed, taken) {
    if (placed) { this.place(); this.k = 1; }
    if (taken) this.takeDisc();
  }

  update(dt, t) {
    if (this.placed) this.k = Math.min(1, this.k + dt / 4);
    const k = this.k;
    this.beamMat.uniforms.uK.value = k * (0.85 + 0.15 * Math.sin(t * 1.3));
    this.moteMat.uniforms.uK.value = k;
    this.sunMat.emissive.setRGB(1.0, 0.62, 0.15).multiplyScalar(k * (1.4 + 0.3 * Math.sin(t * 2)));
    this.sun.rotation.z = t * 0.15 * k;
    if (this.placed && !this.discTaken && k > 0.6) {
      this.disc.visible = true;
      this.disc.rotation.y = t * 0.8;
      this.disc.position.y = this.discPos.y + Math.sin(t * 1.6) * 0.08;
    }
  }
}
