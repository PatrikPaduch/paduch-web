// Életre keltő effektek: vízesés, pára, fodrok, szentjánosbogarak, por, fénynyalábok, lepkék, madarak, levelek, tábortűz
import * as THREE from 'three';
import { G, patch, ADD, ALPHA_KEEP } from './shaders.js';
import { UPPER, CAMP, POND } from './terrain.js';
import { mulberry32 } from './noise.js';
import { cellUV } from './textures.js';
import { basic, rockMat } from './materials.js';

const V3 = THREE.Vector3;
const rnd = mulberry32(4242);

function pointsMat(vs, fs, uniforms, blend = ADD) {
  return new THREE.ShaderMaterial({ uniforms: Object.assign({ uScreenH: { value: 800 } }, G, uniforms), vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, ...blend });
}

export class FX {
  constructor(scene, T, flora, atlas, wingTex) {
    this.scene = scene; this.T = T; this.flora = flora;
    this.pointMats = [];
    this.buildWaterfall();
    this.buildMist();
    this.buildRipples();
    this.buildFireflies();
    this.buildDust();
    this.buildBeams();
    this.buildButterflies(wingTex);
    this.buildBirds();
    this.buildLeaves(atlas);
    this.buildCamp(atlas);
    this.rippleT = 0; this.fishT = 3;
  }

  // ---------------- Vízesés
  buildWaterfall() {
    const T = this.T, lip = T.lipZ, x0 = 10, top = UPPER;
    const Tf = Math.sqrt(2 * (top + 0.3) / 9.8), v0 = 1.5;
    const mk = (W, zOff, ny = 30, nx = 14) => {
      const p = [], uv = [], idx = [];
      for (let j = 0; j <= ny; j++) {
        const t = j / ny, tau = t * Tf;
        const y = top + 0.05 - 4.9 * tau * tau;
        for (let i = 0; i <= nx; i++) {
          const s = i / nx - 0.5;
          const z = lip + 0.15 + v0 * tau + zOff + 0.3 * Math.cos(s * Math.PI) * t;
          p.push(x0 + s * W * (1 + 0.35 * t), y, z); uv.push(i / nx, t);
        }
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    const vs = `
#include <common>
#include <fog_pars_vertex>
uniform float uOff;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 transformed = position + normal * (jn2(vec2(uv.x * 10.0, uv.y * 4.0 - uTime * 3.0 + uOff)) - 0.5) * 0.18 * uv.y;
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
    const fs = `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uAmb; uniform float uOff;
varying vec2 vUv;
void main(){
  float x = vUv.x, y = vUv.y, sp = uTime * 1.6 + uOff;
  float n = jn2(vec2(x * 22.0, y * 5.0 - sp * 3.0)) * 0.55 + jn2(vec2(x * 55.0, y * 9.0 - sp * 4.5)) * 0.3 + jn2(vec2(x * 9.0 + uOff, y * 2.0 - sp * 1.5)) * 0.15;
  float streak = smoothstep(0.36, 0.78, n);
  float edge = smoothstep(0.0, 0.16, x) * smoothstep(1.0, 0.84, x);
  vec3 water = s2l(vec3(0.42, 0.56, 0.54));
  vec3 col = mix(water, vec3(1.0), clamp(streak * 0.85 + y * 0.2, 0.0, 1.0));
  col *= (uAmb + uSunCol * 0.35) * mix(1.0, 0.45, uNight);
  float a = (0.42 + 0.5 * streak + y * 0.15) * edge * smoothstep(0.0, 0.03, y);
  a *= mix(smoothstep(0.35, 0.65, n + edge * 0.3), 1.0, edge);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  #include <fog_fragment>
}`;
    this.fallMats = [];
    for (const [W, zo, off] of [[6.4, 0, 0], [5.4, -0.35, 7.3]]) {
      const m = new THREE.ShaderMaterial({
        uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), G, { uAmb: { value: new THREE.Color(0.5, 0.55, 0.55) }, uOff: { value: off } }),
        vertexShader: vs, fragmentShader: fs, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ALPHA_KEEP,
      });
      this.fallMats.push(m);
      this.scene.add(new THREE.Mesh(mk(W, zo), m));
    }
    this.fallPos = new V3(x0, 8, lip + 1.5);
  }

  buildMist() {
    const T = this.T, n = 170, p = [], s = [];
    for (let i = 0; i < n; i++) { p.push(T.impact.x + (rnd() - 0.5) * 6, 0.1, T.impact.z + (rnd() - 0.5) * 3); s.push(rnd()); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const vs = `
#include <common>
attribute float aSeed; uniform float uScreenH; varying float vA;
void main(){
  float t = fract(uTime * 0.09 + aSeed);
  vec3 p = position + vec3((aSeed - 0.5) * t * 7.0, t * 7.0 + sin(aSeed * 40.0) * 0.5, t * 5.0 + sin(uTime * 0.3 + aSeed * 9.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = sin(t * 3.14159) * 0.13;
  gl_PointSize = min((1.5 + t * 4.5) * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z, 700.0);
}`;
    const fs = `
uniform vec3 uAmb; varying float vA;
void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uAmb, a * a * vA); }`;
    this.mistMat = pointsMat(vs, fs, { uAmb: { value: new THREE.Color(0.8, 0.85, 0.85) } }, ALPHA_KEEP);
    this.pointMats.push(this.mistMat);
    const pts = new THREE.Points(g, this.mistMat); pts.frustumCulled = false;
    this.scene.add(pts);

    const n2 = 120, p2 = [], s2 = [];
    for (let i = 0; i < n2; i++) { p2.push(T.impact.x + (rnd() - 0.5) * 5, 0.0, T.impact.z + (rnd() - 0.5) * 1.5); s2.push(rnd()); }
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
    g2.setAttribute('aSeed', new THREE.Float32BufferAttribute(s2, 1));
    const vs2 = `
#include <common>
attribute float aSeed; uniform float uScreenH; varying float vA;
void main(){
  float t = fract(uTime * 0.9 + aSeed);
  float a = aSeed * 40.0;
  vec3 p = position + vec3(cos(a) * t * 2.2, t * 3.2 - t * t * 4.0, sin(a) * t * 1.6 + t * 0.8);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = (1.0 - t);
  gl_PointSize = 0.07 * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z;
}`;
    const fs2 = `uniform vec3 uAmb; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uAmb * 1.4, smoothstep(0.5, 0.2, d) * vA * 0.8); }`;
    this.splashMat = pointsMat(vs2, fs2, { uAmb: this.mistMat.uniforms.uAmb }, ALPHA_KEEP);
    this.pointMats.push(this.splashMat);
    const sp = new THREE.Points(g2, this.splashMat); sp.frustumCulled = false;
    this.scene.add(sp);
  }

  // ---------------- Fodrok a vízen
  buildRipples() {
    const n = 64;
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.rAge = new Float32Array(n).fill(1);
    g.setAttribute('aAge', new THREE.InstancedBufferAttribute(this.rAge, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uAmb: { value: new THREE.Color(0.8, 0.9, 0.9) } }, G),
      vertexShader: `
attribute float aAge; varying vec2 vUv; varying float vAge;
void main(){ vUv = uv; vAge = aAge; vec4 p = vec4(position, 1.0);
#ifdef USE_INSTANCING
  p = instanceMatrix * p;
#endif
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * p; }`,
      fragmentShader: `
uniform vec3 uAmb; varying vec2 vUv; varying float vAge;
void main(){ float d = length(vUv - 0.5) * 2.0; float r = mix(0.15, 0.95, sqrt(vAge));
  float ring = smoothstep(0.08, 0.0, abs(d - r)) + smoothstep(0.06, 0.0, abs(d - r * 0.6)) * 0.4;
  gl_FragColor = vec4(uAmb, ring * (1.0 - vAge) * 0.45 * step(vAge, 0.999)); }`,
      transparent: true, depthWrite: false, ...ALPHA_KEEP,
    });
    this.rippleMat = m;
    this.ripples = new THREE.InstancedMesh(g, m, n);
    this.ripples.frustumCulled = false;
    this.rData = Array.from({ length: n }, () => ({ x: 0, y: -100, z: 0, s: 1, life: 1, age: 1 }));
    this.rNext = 0;
    this.scene.add(this.ripples);
  }
  ripple(x, y, z, size = 1.5, life = 1.6) {
    const r = this.rData[this.rNext]; this.rNext = (this.rNext + 1) % this.rData.length;
    Object.assign(r, { x, y: y + 0.03, z, s: size, life, age: 0 });
  }

  // ---------------- Szentjánosbogarak
  buildFireflies() {
    const T = this.T, n = 420, p = [], s = [];
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, d = 8 + rnd() * 45;
      const x = 4 + Math.cos(a) * d, z = -12 + Math.sin(a) * d;
      p.push(x, Math.max(T.heightAt(x, z), T.waterLevelAt(x, z)) + 0.5 + rnd() * 2.8, z); s.push(rnd());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const vs = `
#include <common>
attribute float aSeed; uniform float uScreenH; uniform float uAmt; varying float vA;
void main(){
  float t = uTime * 0.3 + aSeed * 20.0;
  vec3 p = position + vec3(sin(t * 1.3 + aSeed * 7.0) * 1.8, sin(t * 0.9 + aSeed * 3.0) * 0.6, cos(t * 1.1 + aSeed * 5.0) * 1.8);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float blink = smoothstep(0.2, 1.0, sin(uTime * (1.2 + aSeed * 1.5) + aSeed * 40.0));
  vA = blink * uAmt;
  gl_PointSize = max(2.0, 0.13 * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z) * (0.6 + blink * 0.5);
}`;
    const fs = `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a *= a; gl_FragColor = vec4(vec3(2.6, 3.4, 1.0) * a * vA, 1.0); }`;
    this.ffMat = pointsMat(vs, fs, { uAmt: { value: 0 } });
    this.pointMats.push(this.ffMat);
    const pts = new THREE.Points(g, this.ffMat); pts.frustumCulled = false;
    this.scene.add(pts);
  }

  // ---------------- Lebegő porszemek a fényben
  buildDust() {
    const n = 700, p = [], s = [];
    for (let i = 0; i < n; i++) { p.push((rnd() - 0.5) * 28, (rnd() - 0.5) * 14, (rnd() - 0.5) * 28); s.push(rnd()); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const vs = `
#include <common>
attribute float aSeed; uniform float uScreenH; uniform float uAmt; varying float vA;
void main(){
  vec3 p = position + vec3(uTime * (0.08 + aSeed * 0.1), sin(uTime * 0.4 + aSeed * 30.0) * 0.4, uTime * 0.05);
  vec3 R = vec3(14.0, 7.0, 14.0);
  p = mod(p - cameraPosition + R, 2.0 * R) - R + cameraPosition;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 vd = normalize(p - cameraPosition);
  float fw = 0.25 + 2.2 * pow(max(dot(vd, uSunDir), 0.0), 6.0);
  vA = uAmt * fw * smoothstep(14.0, 4.0, length(p - cameraPosition)) * (0.4 + 0.6 * sin(uTime * 2.0 + aSeed * 50.0) * 0.5 + 0.3);
  gl_PointSize = max(1.5, 0.025 * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z);
}`;
    const fs = `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uSunCol * vec3(1.0, 0.9, 0.7) * smoothstep(0.5, 0.0, d) * vA * 0.9, 1.0); }`;
    this.dustMat = pointsMat(vs, `#include <common>\n` + fs, { uAmt: { value: 1 } });
    this.pointMats.push(this.dustMat);
    const pts = new THREE.Points(g, this.dustMat); pts.frustumCulled = false;
    this.scene.add(pts);
  }

  // ---------------- Lombokon átszűrődő fénynyalábok
  buildBeams() {
    const T = this.T;
    const g = new THREE.CylinderGeometry(1, 1.25, 1, 20, 1, true).translate(0, 0.5, 0);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uI: { value: 1 } }, G),
      vertexShader: `
varying vec3 vN; varying vec3 vWP; varying float vH;
void main(){ vH = position.y; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `
#include <common>
uniform float uI;
varying vec3 vN; varying vec3 vWP; varying float vH;
void main(){
  vec3 vd = normalize(cameraPosition - vWP);
  float f = pow(abs(dot(normalize(vN), vd)), 2.2);
  float along = smoothstep(0.0, 0.05, vH) * smoothstep(0.75, 0.3, vH);
  float dust = 0.6 + 0.4 * jn3(vWP * 0.5 + vec3(0.0, -uTime * 0.3, uTime * 0.2));
  float near = smoothstep(1.5, 7.0, length(cameraPosition - vWP));
  gl_FragColor = vec4(uSunCol * vec3(1.0, 0.92, 0.75) * f * along * dust * near * uI * 0.11, 1.0);
}`,
      transparent: true, depthWrite: false, side: THREE.FrontSide, ...ADD,
    });
    this.beams = [];
    for (let i = 0, a = 0; i < 18 && a < 400; a++) {
      const ang = rnd() * 6.28, d = 20 + rnd() * 40;
      const x = 4 + Math.cos(ang) * d, z = -12 + Math.sin(ang) * d;
      const h = T.heightAt(x, z);
      if (h < T.waterLevelAt(x, z) + 0.2 || T.forestAt(x, z) < 0.3) continue;
      const m = new THREE.Mesh(g, this.beamMat);
      m.userData = { r: 0.8 + rnd() * 2.2, L: 34 + rnd() * 10 };
      m.position.set(x, h - 0.5, z); m.frustumCulled = false;
      this.scene.add(m); this.beams.push(m); i++;
    }
  }

  // ---------------- Kék morfolepkék
  buildButterflies(wingTex) {
    const wm = basic(new THREE.MeshLambertMaterial({ map: wingTex, alphaTest: 0.4, side: THREE.DoubleSide, emissive: new THREE.Color(0.02, 0.12, 0.3) }));
    const bm = basic(new THREE.MeshLambertMaterial({ color: 0x15100c }));
    const wg = new THREE.PlaneGeometry(0.12, 0.12).translate(0.06, 0, 0).rotateX(-Math.PI / 2);
    this.flies = [];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 2, 6), bm); body.rotation.x = Math.PI / 2; g.add(body);
      const wr = new THREE.Group(), wl = new THREE.Group();
      const r = new THREE.Mesh(wg, wm); wr.add(r);
      const l = new THREE.Mesh(wg, wm); l.scale.x = -1; wl.add(l);
      g.add(wr, wl);
      g.scale.setScalar(1.3 + rnd() * 0.6);
      const p = new V3(-8 + rnd() * 30, 0, -30 + rnd() * 40);
      p.y = this.T.heightAt(p.x, p.z) + 1;
      g.position.copy(p);
      this.scene.add(g);
      this.flies.push({ g, wr, wl, vel: new V3(), tgt: p.clone(), ph: rnd() * 10, rest: 0 });
    }
  }

  buildBirds() {
    const m = basic(new THREE.MeshLambertMaterial({ color: 0x1a1612, side: THREE.DoubleSide }));
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.18, 0, 0, -0.12, 0.75, 0, -0.05], 3));
    wing.computeVertexNormals();
    this.birds = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.35, 2, 6), m); body.rotation.x = Math.PI / 2; g.add(body);
      const wr = new THREE.Mesh(wing, m), wl = new THREE.Mesh(wing, m); wl.scale.x = -1;
      g.add(wr, wl);
      this.scene.add(g);
      this.birds.push({ g, wr, wl, r: 55 + rnd() * 40, h: 42 + rnd() * 18, sp: 0.05 + rnd() * 0.04, a: rnd() * 6.28, ph: rnd() * 6 });
    }
  }

  // ---------------- Hulló levelek
  buildLeaves(atlas) {
    const g = new THREE.PlaneGeometry(0.14, 0.2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) { const [u, v] = cellUV(0, uv.getX(i), uv.getY(i)); uv.setXY(i, u, v); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(uv.count * 3).fill(1), 3));
    this.leafMesh = new THREE.InstancedMesh(g, this.flora.fol.still.mat, 50);
    this.leafMesh.frustumCulled = false;
    this.leafData = [];
    const cols = [[0.95, 0.75, 0.25], [0.8, 0.45, 0.18], [0.75, 0.9, 0.4], [0.6, 0.38, 0.2]];
    for (let i = 0; i < 50; i++) {
      const c = cols[i % 4];
      this.leafMesh.setColorAt(i, new THREE.Color(c[0], c[1], c[2]));
      this.leafData.push({ p: new V3(0, -100, 0), ph: rnd() * 10, sp: 0.5 + rnd() * 0.5, rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6) });
    }
    this.scene.add(this.leafMesh);
  }

  // ---------------- Tábortűz, menedék
  buildCamp(atlas) {
    const T = this.T, cx = CAMP.x, cz = CAMP.z, cy = T.heightAt(cx, cz);
    this.campPos = new V3(cx, cy, cz);
    const g = new THREE.Group(); g.position.set(cx, cy, cz); this.scene.add(g);
    const stone = new THREE.DodecahedronGeometry(0.17, 1);
    const rm = this.flora.rockMat;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * 6.28;
      const s = new THREE.Mesh(stone, rm); s.position.set(Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62);
      s.scale.set(1 + rnd() * 0.4, 0.7, 1 + rnd() * 0.3); s.rotation.set(rnd(), rnd(), rnd());
      s.castShadow = true; s.receiveShadow = true; g.add(s);
    }
    const logGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.9, 8);
    logGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(logGeo.attributes.position.count * 3).fill(0.8), 3));
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * 6.28, l = new THREE.Mesh(logGeo, this.flora.bark.still);
      l.position.set(Math.cos(a) * 0.17, 0.25, Math.sin(a) * 0.17);
      l.rotation.set(0, -a, 0); l.rotateZ(0.5); l.castShadow = true; g.add(l);
    }
    const ember = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2), basic(new THREE.MeshStandardMaterial({ color: 0x15100c, emissive: new THREE.Color(1.0, 0.25, 0.04), emissiveIntensity: 0.6, roughness: 1 })));
    ember.position.y = 0.03; g.add(ember);
    this.emberMat = ember.material;

    const flameMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({}, G),
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
#include <common>
varying vec2 vUv;
void main(){
  vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
  float t = uTime;
  float n = jn2(vec2(p.x * 3.0, p.y * 4.0 - t * 3.6)) * 0.6 + jn2(vec2(p.x * 7.0 + 3.0, p.y * 8.0 - t * 6.0)) * 0.4;
  float h = 1.0 - p.y;
  float w = (0.75 * h + 0.05) * (0.7 + 0.5 * n);
  float flame = smoothstep(0.0, 0.35, w - abs(p.x + (n - 0.5) * 0.3 * p.y)) * smoothstep(1.0, 0.55, p.y + (n - 0.5) * 0.35);
  vec3 col = mix(vec3(1.0, 0.18, 0.02), vec3(1.0, 0.8, 0.35), smoothstep(0.2, 0.9, flame * h));
  gl_FragColor = vec4(col * flame * 3.2, 1.0);
}`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ADD,
    });
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.15), flameMat);
      f.position.y = 0.6; f.rotation.y = i / 3 * Math.PI; g.add(f);
    }
    this.fireLight = new THREE.PointLight(0xff8a3c, 30, 16, 2);
    this.fireLight.position.set(0, 0.8, 0); g.add(this.fireLight);

    const n = 60, p = [], s = [];
    for (let i = 0; i < n; i++) { p.push(cx + (rnd() - 0.5) * 0.5, cy + 0.3, cz + (rnd() - 0.5) * 0.5); s.push(rnd()); }
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    eg.setAttribute('aSeed', new THREE.Float32BufferAttribute(s, 1));
    const evs = `
#include <common>
attribute float aSeed; uniform float uScreenH; varying float vA;
void main(){
  float t = fract(uTime * (0.25 + aSeed * 0.2) + aSeed);
  vec3 p = position + vec3(sin(t * 9.0 + aSeed * 30.0) * 0.3 * t, t * 3.5, cos(t * 7.0 + aSeed * 20.0) * 0.3 * t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = (1.0 - t) * step(0.3, fract(aSeed * 7.0));
  gl_PointSize = max(1.5, 0.035 * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z);
}`;
    const efs = `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(4.0, 1.4, 0.3) * smoothstep(0.5, 0.0, d) * vA, 1.0); }`;
    const em = pointsMat(evs, efs, {}); this.pointMats.push(em);
    const ep = new THREE.Points(eg, em); ep.frustumCulled = false; this.scene.add(ep);

    const sg = new THREE.BufferGeometry();
    const sp = [], ss = [];
    for (let i = 0; i < 40; i++) { sp.push(cx, cy + 0.8, cz); ss.push(rnd()); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ss, 1));
    const svs = `
#include <common>
attribute float aSeed; uniform float uScreenH; varying float vA;
void main(){
  float t = fract(uTime * 0.07 + aSeed);
  vec3 p = position + vec3(sin(t * 4.0 + aSeed * 9.0) * t * 1.2 + t * 1.5, t * 9.0, cos(t * 3.0 + aSeed * 5.0) * t * 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vA = sin(t * 3.14159) * 0.16;
  gl_PointSize = min((0.4 + t * 2.4) * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z, 500.0);
}`;
    const sfs = `uniform vec3 uAmbS; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d); gl_FragColor = vec4(uAmbS, a * vA); }`;
    this.smokeMat = pointsMat(svs, sfs, { uAmbS: { value: new THREE.Color(0.5, 0.5, 0.5) } }, ALPHA_KEEP); this.pointMats.push(this.smokeMat);
    const smp = new THREE.Points(sg, this.smokeMat); smp.frustumCulled = false; this.scene.add(smp);

    // Menedék (lean-to) a tűz mellett
    const sx = cx - 5.2, sz = cz - 4.2, sy = T.heightAt(sx, sz);
    const sh = new THREE.Group(); sh.position.set(sx, sy, sz); sh.rotation.y = 0.55; this.scene.add(sh);
    const pole = (x1, y1, z1, x2, y2, z2, r = 0.05) => {
      const a = new V3(x1, y1, z1), b = new V3(x2, y2, z2), L = a.distanceTo(b);
      const geo = new THREE.CylinderGeometry(r, r * 1.1, L, 7);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 3).fill(0.75), 3));
      const m = new THREE.Mesh(geo, this.flora.bark.still);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize());
      m.castShadow = true; m.receiveShadow = true; sh.add(m);
    };
    pole(-1.5, -0.2, 0, -1.5, 1.7, 0); pole(1.5, -0.2, 0, 1.5, 1.7, 0); pole(-1.8, 1.62, 0, 1.8, 1.62, 0, 0.045);
    for (let i = 0; i < 7; i++) { const x = -1.35 + i * 0.45; pole(x, 1.65, 0.05, x, -0.05, -1.9, 0.035); }
    const lgb = [];
    const cover = new THREE.BufferGeometry();
    const P = [], N = [], UV = [], C = [], I = [];
    const slope = new V3(0, -1.7, -1.95).normalize(), nrm = new V3(0, 1.95, -1.7).normalize().negate();
    for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
      const x = -1.6 + k * 0.62 + (rnd() - 0.5) * 0.2, t = r * 0.62;
      const base = new V3(x, 1.75, 0.15).addScaledVector(slope, t + 0.9);
      const up = slope.clone().negate(), ax = new V3(1, 0, 0);
      const b = P.length / 3;
      for (const [sx2, sy2] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
        const p = base.clone().addScaledVector(ax, sx2 * 0.9).addScaledVector(up, sy2 * 1.3).addScaledVector(new V3(0, 1, 0.5), 0.02 * r);
        P.push(p.x, p.y, p.z); N.push(-nrm.x, -nrm.y, -nrm.z);
        const [u, v] = cellUV(5, sx2 + 0.5, sy2); UV.push(u, v); C.push(0.85, 0.85, 0.7);
      }
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    void lgb;
    cover.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    cover.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    cover.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    cover.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    cover.setIndex(I);
    const cm = new THREE.Mesh(cover, this.flora.fol.still.mat); cm.castShadow = true; cm.customDepthMaterial = this.flora.fol.still.depth; sh.add(cm);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.3), basic(new THREE.MeshStandardMaterial({ color: 0x5b5a33, roughness: 1 })));
    mat.position.set(0, 0.02, -0.9); mat.receiveShadow = true; sh.add(mat);
    this.flora.colliders.push({ x: sx, z: sz, r: 0.3 });
    // ülőrönk
    const seatGeo = new THREE.CylinderGeometry(0.28, 0.3, 2.0, 12);
    seatGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(seatGeo.attributes.position.count * 3).fill(0.8), 3));
    const seat = new THREE.Mesh(seatGeo, this.flora.bark.still);
    seat.position.set(cx + 1.8, T.heightAt(cx + 1.8, cz + 1.2) + 0.2, cz + 1.2); seat.rotation.set(0, 0.9, Math.PI / 2);
    seat.castShadow = seat.receiveShadow = true; this.scene.add(seat);
    this.flora.colliders.push({ x: cx + 1.8, z: cz + 1.2, r: 0.5 }, { x: cx, z: cz, r: 0.75 });
  }

  update(dt, ctx) {
    const { camera, player, sky, screenH } = ctx;
    const t = G.uTime.value;
    for (const m of this.pointMats) m.uniforms.uScreenH.value = screenH;
    const amb = new THREE.Color().copy(sky.hemi.color).multiplyScalar(sky.hemi.intensity * 0.5).add(new THREE.Color().copy(sky.light.color).multiplyScalar(sky.light.intensity * 0.12));
    amb.multiplyScalar(1 - sky.night * 0.55);
    for (const m of this.fallMats) m.uniforms.uAmb.value.copy(amb);
    this.mistMat.uniforms.uAmb.value.copy(amb).multiplyScalar(1.3);
    this.smokeMat.uniforms.uAmbS.value.copy(amb).multiplyScalar(0.7).lerp(new THREE.Color(0.25, 0.12, 0.05), sky.night * 0.5);
    this.rippleMat.uniforms.uAmb.value.copy(amb).multiplyScalar(1.4);
    const dry = 1 - G.uRain.value;
    this.ffMat.uniforms.uAmt.value = Math.max(sky.night, 0.35 * (1 - sky.day)) * dry;
    this.dustMat.uniforms.uAmt.value = sky.day * dry;

    // Fénynyalábok iránya a nap felé
    const sd = sky.sunDir, q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), sd);
    this.beamMat.uniforms.uI.value = sky.day * dry * dry * (1 - 0.55 * Math.min(1, Math.max(0, (sd.y - 0.35) * 2)));
    for (const b of this.beams) { b.quaternion.copy(q); b.scale.set(b.userData.r, b.userData.L, b.userData.r); b.visible = sky.day * dry > 0.01; }

    // Fodrok
    this.rippleT -= dt;
    if (this.rippleT < 0) { this.rippleT = 0.12; const T = this.T; this.ripple(T.impact.x + (rnd() - 0.5) * 6, 0, T.impact.z + rnd() * 3, 1.2 + rnd() * 2, 1.2); }
    this.fishT -= dt;
    if (this.fishT < 0) {
      this.fishT = 2 + rnd() * 5;
      const a = rnd() * 6.28, d = rnd() * POND.r * 0.8;
      const x = POND.x + Math.cos(a) * d, z = POND.z + Math.sin(a) * d;
      if (this.T.heightAt(x, z) < -0.5) { this.ripple(x, 0, z, 2.5, 2.2); this.ripple(x, 0, z, 1.2, 1.6); }
    }
    if (player && player.wade > 0.08) {
      player._rp = (player._rp || 0) - dt;
      if (player._rp < 0) {
        player._rp = player.moving ? 0.22 : 0.9;
        const lvl = this.T.waterLevelAt(player.pos.x, player.pos.z);
        this.ripple(player.pos.x, lvl, player.pos.z, player.swim ? 2.4 : 1.6, 1.4);
      }
    }
    const M = new THREE.Matrix4(), S = new V3(), Q = new THREE.Quaternion(), P = new V3();
    for (let i = 0; i < this.rData.length; i++) {
      const r = this.rData[i];
      r.age = Math.min(1, r.age + dt / r.life);
      this.rAge[i] = r.age;
      P.set(r.x, r.y, r.z); S.setScalar(r.s * (0.4 + r.age * 1.2));
      M.compose(P, Q, S); this.ripples.setMatrixAt(i, M);
    }
    this.ripples.instanceMatrix.needsUpdate = true;
    this.ripples.geometry.attributes.aAge.needsUpdate = true;

    // Lepkék
    const visFly = sky.day > 0.2 && dry > 0.7;
    for (const f of this.flies) {
      f.g.visible = visFly;
      if (!visFly) continue;
      const p = f.g.position;
      if (f.rest > 0) { f.rest -= dt; f.wr.rotation.z = 0.25 + Math.sin(t * 2 + f.ph) * 0.25; f.wl.rotation.z = -f.wr.rotation.z; continue; }
      if (p.distanceTo(f.tgt) < 0.6) {
        if (rnd() < 0.15) f.rest = 2 + rnd() * 4;
        const a = rnd() * 6.28, d = rnd() * 22;
        f.tgt.set(2 + Math.cos(a) * d, 0, -10 + Math.sin(a) * d);
        f.tgt.y = Math.max(this.T.heightAt(f.tgt.x, f.tgt.z), 0) + 0.3 + rnd() * 2.2;
      }
      const des = f.tgt.clone().sub(p).normalize().multiplyScalar(1.6);
      des.y += Math.sin(t * 5 + f.ph) * 0.8;
      f.vel.lerp(des, 1 - Math.exp(-dt * 2.5));
      p.addScaledVector(f.vel, dt);
      f.g.rotation.y = Math.atan2(f.vel.x, f.vel.z);
      const flap = Math.sin(t * 16 + f.ph) * 1.1 + 0.2;
      f.wr.rotation.z = flap; f.wl.rotation.z = -flap;
    }
    // Madarak
    for (const b of this.birds) {
      b.g.visible = sky.day > 0.1 && dry > 0.6;
      b.a += dt * b.sp;
      b.g.position.set(4 + Math.cos(b.a) * b.r, b.h + Math.sin(b.a * 3) * 3, -30 + Math.sin(b.a) * b.r);
      b.g.rotation.y = -b.a + Math.PI;
      const gl = Math.sin(t * 0.5 + b.ph) > 0.2;
      const fl = gl ? 0.15 : Math.sin(t * 9 + b.ph) * 0.7;
      b.wr.rotation.z = fl; b.wl.rotation.z = -fl;
    }
    // Hulló levelek
    if (player) {
      const E = new THREE.Euler();
      for (let i = 0; i < this.leafData.length; i++) {
        const L = this.leafData[i];
        const gy = this.T.heightAt(L.p.x, L.p.z);
        if (L.p.y < gy + 0.03 || L.p.distanceTo(player.pos) > 26) {
          const a = rnd() * 6.28, d = 2 + rnd() * 16;
          L.p.set(player.pos.x + Math.cos(a) * d, 0, player.pos.z + Math.sin(a) * d);
          L.p.y = this.T.heightAt(L.p.x, L.p.z) + 4 + rnd() * 14;
        }
        L.p.y -= L.sp * dt;
        L.p.x += Math.sin(t * 1.3 + L.ph) * dt * 0.6 + dt * 0.2;
        L.p.z += Math.cos(t * 1.1 + L.ph) * dt * 0.5;
        E.set(L.rot.x + t * 1.7 + L.ph, L.rot.y + t * 0.8, L.rot.z + Math.sin(t * 2 + L.ph));
        Q.setFromEuler(E); S.setScalar(1);
        M.compose(L.p, Q, S); this.leafMesh.setMatrixAt(i, M);
      }
      this.leafMesh.instanceMatrix.needsUpdate = true;
    }
    // Tűz pislákolás
    const fl = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1) + 0.1 * Math.sin(t * 23);
    this.fireLight.intensity = (14 + 30 * Math.max(sky.night, 1 - sky.day)) * fl;
    this.emberMat.emissiveIntensity = 0.5 + 0.4 * fl;
    void camera;
  }
}
