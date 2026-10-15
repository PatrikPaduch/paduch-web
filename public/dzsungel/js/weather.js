// Időjárás: eső (GPU-s esőcsíkok + csobbanások), beázó felületek, borult ég, villámlás mennydörgéssel
import * as THREE from 'three';
import { G, ALPHA_KEEP, ADD } from './shaders.js';
import { smoothstep, lerp } from './noise.js';

const MODES = ['clear', 'variable', 'rain', 'storm'];
export const WEATHER_LABELS = { clear: 'Derült', variable: 'Változó', rain: 'Eső', storm: 'Vihar' };

export class Weather {
  constructor(scene, T, tHeight) {
    this.scene = scene; this.T = T;
    this.mode = 'variable';
    this.rain = 0; this.target = 0; this.stormy = false;
    this.nextChange = 20 + Math.random() * 40; // változó módban az első zápor ne azonnal jöjjön
    this.nextBolt = 4; this.boltT = 99; this.flash = 0;
    this.thunderQueue = [];
    this.buildRain();
    this.buildSplashes(tHeight);
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5.4, 7), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, ...ADD });
    // széles derengés: a lombokon és a párán át is látszik, merre csapott be
    const gc = document.createElement('canvas'); gc.width = 64; gc.height = 4;
    const gx = gc.getContext('2d'), grd = gx.createLinearGradient(0, 0, 64, 0);
    grd.addColorStop(0, '#000'); grd.addColorStop(0.5, '#fff'); grd.addColorStop(1, '#000');
    gx.fillStyle = grd; gx.fillRect(0, 0, 64, 4);
    const gtex = new THREE.CanvasTexture(gc);
    this.glowMat = new THREE.MeshBasicMaterial({ map: gtex, color: new THREE.Color(0.25, 0.27, 0.4), transparent: true, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide, ...ADD });
    this.bolt = null; this.glow = null;
    this.flashLight = new THREE.DirectionalLight(0xc8d4ff, 0);
    scene.add(this.flashLight, this.flashLight.target);
  }

  setCanopy(canopy) {
    this.canopy = canopy;
    this.rainMat.uniforms.tCanopy.value = canopy.tex;
    this.splashMat.uniforms.tCanopy.value = canopy.tex;
  }

  setMode(m) {
    this.mode = m;
    if (m === 'clear') this.target = 0;
    if (m === 'rain') this.target = 0.7;
    if (m === 'storm') this.target = 1;
    if (m === 'variable') this.nextChange = 0;
  }
  cycleMode() { this.setMode(MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]); return this.mode; }

  // --- Esőcsíkok: instanced négyszögek, a kamera körüli hengerben körbeérve (mod), szél szerint döntve
  buildRain() {
    const N = 22000;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const s = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) s[i] = Math.random();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(s, 4));
    g.instanceCount = 0;
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uCol: { value: new THREE.Color() }, uWindV: { value: new THREE.Vector2(2.2, 1.0) }, tCanopy: { value: null } }, G),
      vertexShader: `
#include <common>
attribute vec4 aSeed; uniform vec2 uWindV; uniform sampler2D tCanopy;
varying float vA; varying float vX; varying float vY;
void main(){
  const float R = 17.0, Hh = 15.0;
  vec3 cam = cameraPosition;
  vec3 p = vec3((aSeed.x - 0.5) * 2.0 * R, 0.0, (aSeed.y - 0.5) * 2.0 * R);
  // lombkorona alatt a cseppek többsége fennakad; ami átjut, lassabb, rövidebb csöpögés
  vec2 xz0 = mod(p.xz - cam.xz + R, 2.0 * R) - R + cam.xz;
  float cov = texture2D(tCanopy, (xz0 + 200.0) / 400.0 * (400.0 / 401.0) + 0.5 / 401.0).r;
  float keep = step(cov * 0.9, fract(aSeed.x * 13.7 + aSeed.y * 7.3));
  if (keep < 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; vX = 0.0; vY = 0.0; return; }
  float sp = 13.0 * (0.85 + aSeed.w * 0.3) * mix(1.0, 0.6, cov);
  float fall = uTime * sp + aSeed.z * Hh;
  p.y = Hh - mod(fall, Hh);
  vec3 vel = vec3(uWindV.x, -sp, uWindV.y);
  p.xz += vel.xz / sp * (Hh - p.y);
  p.xz = mod(p.xz - cam.xz + R, 2.0 * R) - R + cam.xz;
  p.y += cam.y - 5.0;
  vec3 up = -normalize(vel);
  vec3 toCam = normalize(cam - p);
  vec3 right = normalize(cross(up, toCam));
  float len = (0.8 + aSeed.w * 0.7) * mix(1.0, 0.4, cov), wid = (0.013 + aSeed.z * 0.01) * mix(1.0, 1.5, cov);
  vec3 wp = p + right * position.x * wid * (1.0 + length(cam - p) * 0.06) + up * position.y * len;
  vX = position.x * 2.0; vY = position.y;
  float d = length(p.xz - cam.xz);
  vA = uRain * smoothstep(R, R * 0.45, d) * (0.35 + 0.65 * aSeed.w) * smoothstep(0.6, 2.0, length(cam - p));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`,
      fragmentShader: `
#include <common>
uniform vec3 uCol;
varying float vA; varying float vX; varying float vY;
void main(){
  float a = vA * (1.0 - vX * vX) * smoothstep(0.0, 0.35, vY) * smoothstep(1.0, 0.7, vY) * 0.36;
  gl_FragColor = vec4(uCol + vec3(0.8, 0.85, 1.0) * uFlash * 0.8, a);
}`,
      transparent: true, depthWrite: false, ...ALPHA_KEEP,
    });
    this.rainMesh = new THREE.Mesh(g, this.rainMat);
    this.rainMesh.frustumCulled = false;
    this.rainN = N;
    this.scene.add(this.rainMesh);
  }

  // --- Csobbanások a talajon és a vízen (a magasságtérképből olvassák a felszínt)
  buildSplashes(tHeight) {
    const N = 1600, p = new Float32Array(N * 3), s = new Float32Array(N);
    for (let i = 0; i < N; i++) s[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    this.splashMat = new THREE.ShaderMaterial({
      uniforms: Object.assign({ tHeight: { value: tHeight }, tCanopy: { value: null }, uScreenH: { value: 800 }, uCol: { value: new THREE.Color() } }, G),
      vertexShader: `
#include <common>
attribute float aSeed; uniform sampler2D tHeight; uniform sampler2D tCanopy; uniform float uScreenH;
varying float vA; varying float vT;
void main(){
  float cyc = uTime * 2.2 + aSeed * 17.0;
  float k = floor(cyc); float t = fract(cyc);
  vec2 rnd = vec2(jh1(vec2(aSeed * 91.7, k)), jh1(vec2(k, aSeed * 53.1)));
  vec2 xz = cameraPosition.xz + (rnd - 0.5) * 30.0;
  vec2 tuv = (xz + 200.0) / 400.0 * (400.0 / 401.0) + 0.5 / 401.0;
  float h = texture2D(tHeight, tuv).r;
  float y = max(h, 0.0) + 0.04;
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vT = t;
  float cov = texture2D(tCanopy, tuv).r;
  vA = uRain * step(t, 0.3) * smoothstep(16.0, 6.0, length(xz - cameraPosition.xz)) * step(cov * 0.85, fract(aSeed * 31.7 + k * 0.61));
  gl_PointSize = max(1.5, (0.05 + t * 0.35) * projectionMatrix[1][1] * uScreenH * 0.5 / -mv.z);
}`,
      fragmentShader: `
#include <common>
uniform vec3 uCol;
varying float vA; varying float vT;
void main(){
  vec2 c = gl_PointCoord - 0.5; c.y *= 2.2;
  float d = length(c);
  float ring = smoothstep(0.12, 0.0, abs(d - 0.38)) + smoothstep(0.25, 0.0, d) * (1.0 - vT * 3.3);
  gl_FragColor = vec4(uCol * 1.3 + uFlash * 0.6, ring * vA * (1.0 - vT / 0.3) * 0.7);
}`,
      transparent: true, depthWrite: false, ...ALPHA_KEEP,
    });
    const pts = new THREE.Points(g, this.splashMat);
    pts.frustumCulled = false;
    this.splashPts = pts;
    this.scene.add(pts);
  }

  // --- Villám: cikcakkos főág + elágazások, kamera felé forduló szalagokból, a távolban
  strike(camera, spread = 1.6) {
    if (this.bolt) { this.scene.remove(this.bolt); this.bolt.geometry.dispose(); }
    if (this.glow) { this.scene.remove(this.glow); this.glow.geometry.dispose(); }
    const fw = camera.getWorldDirection(new THREE.Vector3());
    const a = Math.atan2(fw.x, -fw.z) + (Math.random() - 0.5) * spread; // iránytű-szög, nagyjából a látómezőben
    const dist = 380 + Math.random() * 320;
    const base = new THREE.Vector3(camera.position.x + Math.sin(a) * dist, 0, camera.position.z - Math.cos(a) * dist);
    base.y = Math.max(this.T.heightAt(base.x, base.z), 0);
    const top = base.clone().add(new THREE.Vector3((Math.random() - 0.5) * 60, 260 + Math.random() * 100, (Math.random() - 0.5) * 60));
    const P = [], I = [], UV = [];
    const ribbon = (pts, w) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const A = pts[i], B = pts[i + 1], dir = B.clone().sub(A).normalize();
        const toCam = camera.position.clone().sub(A).normalize();
        const side = new THREE.Vector3().crossVectors(dir, toCam).normalize().multiplyScalar(w * (1 - i / pts.length * 0.5));
        const k = P.length / 3;
        for (const v of [A.clone().add(side), A.clone().sub(side), B.clone().sub(side), B.clone().add(side)]) P.push(v.x, v.y, v.z);
        UV.push(0, 0, 1, 0, 1, 1, 0, 1);
        I.push(k, k + 1, k + 2, k, k + 2, k + 3);
      }
    };
    const jag = (from, to, steps, amp) => {
      const pts = [from.clone()];
      for (let i = 1; i < steps; i++) {
        const t = i / steps, p = from.clone().lerp(to, t);
        p.x += (Math.random() - 0.5) * amp * (1 - t * 0.3); p.z += (Math.random() - 0.5) * amp * (1 - t * 0.3);
        pts.push(p);
      }
      pts.push(to.clone());
      return pts;
    };
    const main = jag(top, base, 26, 22);
    ribbon(main, 2.6);
    // felhőben szétfutó vízszintes ágak a villám tetején
    for (let b = 0; b < 3; b++) {
      const a2 = Math.random() * Math.PI * 2, L = 80 + Math.random() * 120;
      ribbon(jag(top, top.clone().add(new THREE.Vector3(Math.cos(a2) * L, -10 - Math.random() * 30, Math.sin(a2) * L)), 12, 20), 1.4);
    }
    for (let b = 0; b < 4; b++) {
      const i0 = 3 + Math.floor(Math.random() * 14), s = main[i0];
      const end = s.clone().add(new THREE.Vector3((Math.random() - 0.5) * 90, -40 - Math.random() * 70, (Math.random() - 0.5) * 90));
      ribbon(jag(s, end, 10, 14), 1.3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setIndex(I);
    this.bolt = new THREE.Mesh(geo, this.boltMat);
    this.bolt.frustumCulled = false;
    this.scene.add(this.bolt);
    P.length = 0; I.length = 0; UV.length = 0;
    ribbon(jag(top, base, 8, 10), 22);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    gg.setIndex(I);
    this.glow = new THREE.Mesh(gg, this.glowMat);
    this.glow.frustumCulled = false; this.glow.renderOrder = 10;
    this.scene.add(this.glow);
    this.boltT = 0;
    const bd = top.clone().sub(camera.position).normalize();
    G.uBoltDir.value.copy(bd);
    this.flashLight.position.copy(camera.position).addScaledVector(bd, 100);
    this.flashLight.target.position.copy(camera.position);
    this.thunderQueue.push({ t: Math.min(3.5, dist / 343), dist });
  }

  update(dt, ctx) {
    const { camera, sky, audio } = ctx;
    // változó mód: időnként új időjárás-cél
    if (this.mode === 'variable') {
      this.nextChange -= dt;
      if (this.nextChange <= 0) {
        const r = Math.random();
        this.target = r < 0.55 ? 0 : r < 0.82 ? 0.65 : 1;
        this.nextChange = 70 + Math.random() * 110;
      }
    }
    const rate = this.target > this.rain ? 0.07 : 0.05;
    this.rain += Math.sign(this.target - this.rain) * Math.min(Math.abs(this.target - this.rain), rate * dt);
    const wetRate = this.rain > G.uWet.value ? 0.06 : 0.012; // gyorsan ázik, lassan szárad
    G.uWet.value += Math.sign(this.rain - G.uWet.value) * Math.min(Math.abs(this.rain - G.uWet.value), wetRate * dt);
    G.uRain.value = this.rain;
    // barlangban (shelter=1) nem esik és alig hallani
    if (this.splashPts) this.splashPts.visible = !(this.shelter > 0.3);
    this.rainMesh.geometry.instanceCount = Math.floor(this.rainN * Math.min(1, this.rain * 1.25) * (this.shelter > 0.3 ? 0 : 1));
    this.stormy = this.rain > 0.85;

    // villámok
    if (this.stormy) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.strike(camera); this.nextBolt = 5 + Math.random() * 14; }
    }
    this.boltT += dt;
    const t = this.boltT;
    // villanás-görbe: erős villanás, rövid elhalványulás, második felvillanás, lecsengés
    let f = 0;
    if (t < 0.07) f = 1; else if (t < 0.13) f = 0.25; else if (t < 0.2) f = 0.85; else f = 0.85 * Math.exp(-(t - 0.2) * 9);
    if (t > 1.2) f = 0;
    this.flash = f;
    G.uFlash.value = f;
    if (this.bolt) this.bolt.visible = t < 0.35 && (t < 0.07 || t > 0.13);
    if (this.glow) { this.glow.visible = f > 0.02; this.glowMat.color.setRGB(0.25, 0.27, 0.4).multiplyScalar(f); }
    this.flashLight.intensity = f * 6;
    // mennydörgés a távolság szerinti késéssel
    for (const q of this.thunderQueue) q.t -= dt;
    while (this.thunderQueue.length && this.thunderQueue[0].t <= 0) { const q = this.thunderQueue.shift(); audio?.thunder(q.dist); }

    // égbolt, fények, köd az esőhöz igazítva (a napszak-számítás után, képkockánként)
    const r = this.rain;
    if (r > 0.001 || f > 0) {
      const U = sky.mat.uniforms;
      U.uCloud.value = 0.5 + r * 0.5;
      const gray = (c, k) => { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; c.lerp(new THREE.Color(l, l, l * 1.08), k).multiplyScalar(1 - k * 0.55); };
      gray(U.uZen.value, r); gray(U.uHor.value, r); gray(U.uSunC.value, r);
      sky.light.intensity *= 1 - 0.85 * r;
      sky.hemi.intensity = sky.hemi.intensity * (1 - 0.42 * r) + f * 1.6;
      sky.hemi.color.lerp(new THREE.Color(0.75, 0.8, 0.85), r * 0.6);
      G.uSunCol.value.multiplyScalar(1 - 0.8 * r);
      sky.fog.color.lerp(new THREE.Color().setRGB(0.32, 0.36, 0.36), r * 0.75).multiplyScalar(1 - 0.35 * r);
      sky.fog.density += 0.011 * r;
      U.uFogC.value.copy(sky.fog.color);
      sky.scene.environmentIntensity = sky.scene.environmentIntensity * (1 - 0.55 * r) + f * 0.8;
      G.uAmbF.value.multiplyScalar(1 - 0.4 * r).addScalar(f * 0.35);
      sky.post.rays *= 1 - r;
    }
    const amb = new THREE.Color().copy(sky.hemi.color).multiplyScalar(sky.hemi.intensity * 0.35 + 0.05);
    this.rainMat.uniforms.uCol.value.copy(amb);
    this.splashMat.uniforms.uCol.value.copy(amb);
    this.splashMat.uniforms.uScreenH.value = ctx.screenH;
    const cov = this.canopy ? this.canopy.at(camera.position.x, camera.position.z) : 0;
    this.coverHere = cov;
    audio?.setRain(r * (1 - 0.85 * (this.shelter || 0)), Math.max(cov, this.shelter || 0));
  }
}
