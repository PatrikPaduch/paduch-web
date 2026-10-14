// Égbolt (napkorong, felhők, csillagok, hold), napszak-ciklus, fények, köd, környezeti térkép
import * as THREE from 'three';
import { G } from './shaders.js';
import { smoothstep, lerp } from './noise.js';

const KEYS = [
  { e: -0.40, zen: [0.020, 0.030, 0.075], hor: [0.035, 0.050, 0.085], fog: [0.030, 0.045, 0.060], sun: [0, 0, 0], si: 0, hi: 0.32, skyI: 1.0, env: 0.30 },
  { e: -0.12, zen: [0.050, 0.075, 0.160], hor: [0.170, 0.140, 0.190], fog: [0.080, 0.085, 0.100], sun: [1.0, 0.35, 0.15], si: 0, hi: 0.36, skyI: 1.0, env: 0.32 },
  { e: -0.02, zen: [0.120, 0.180, 0.360], hor: [0.700, 0.420, 0.300], fog: [0.300, 0.270, 0.250], sun: [1.0, 0.42, 0.18], si: 0, hi: 0.48, skyI: 1.1, env: 0.40 },
  { e: 0.06, zen: [0.200, 0.320, 0.600], hor: [0.980, 0.640, 0.400], fog: [0.560, 0.520, 0.440], sun: [1.0, 0.60, 0.32], si: 1.6, hi: 0.70, skyI: 1.3, env: 0.50 },
  { e: 0.18, zen: [0.220, 0.420, 0.780], hor: [0.920, 0.800, 0.640], fog: [0.650, 0.690, 0.600], sun: [1.0, 0.82, 0.60], si: 2.8, hi: 0.95, skyI: 1.45, env: 0.60 },
  { e: 0.40, zen: [0.180, 0.430, 0.850], hor: [0.700, 0.830, 0.880], fog: [0.620, 0.720, 0.680], sun: [1.0, 0.93, 0.82], si: 3.3, hi: 1.10, skyI: 1.5, env: 0.65 },
  { e: 1.00, zen: [0.140, 0.380, 0.840], hor: [0.660, 0.800, 0.900], fog: [0.600, 0.700, 0.680], sun: [1.0, 0.97, 0.92], si: 3.5, hi: 1.15, skyI: 1.5, env: 0.65 },
];

function sampleKeys(e) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  if (e <= a.e) return a;
  if (e >= b.e) return b;
  for (let i = 0; i < KEYS.length - 1; i++) if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const t = (e - a.e) / (b.e - a.e), o = {};
  for (const k of Object.keys(a)) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], t)) : lerp(a[k], b[k], t);
  return o;
}

const VERT = `
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = `
#include <common>
uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGround; uniform vec3 uFogC; uniform vec3 uSunC;
uniform vec3 uSun; uniform vec3 uMoon; uniform float uCloud;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y, hp = max(h, 0.0);
  vec3 col = mix(uHor, uZen, pow(hp, 0.45));
  float sd = max(dot(d, uSun), 0.0);
  float sunUp = smoothstep(-0.12, 0.05, uSun.y);
  col += uSunC * pow(sd, 2.0) * (1.0 - hp) * 0.35 * sunUp;
  col += uSunC * (pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.8) * sunUp;
  if (uNight > 0.01 && h > 0.0) {
    vec3 sp = d * 230.0; vec3 cell = floor(sp); float r = jh13(cell);
    vec3 f = fract(sp) - 0.5 - (vec3(jh13(cell + 1.7), jh13(cell + 3.1), jh13(cell + 5.3)) - 0.5) * 0.5;
    float star = step(0.9962, r) * smoothstep(0.2, 0.0, length(f)) * (0.55 + 0.45 * sin(uTime * 2.5 + r * 300.0));
    col += vec3(0.9, 0.95, 1.0) * star * 2.5 * uNight * smoothstep(0.0, 0.25, h);
    float band = pow(max(1.0 - abs(dot(d, normalize(vec3(0.6, 0.3, -0.75)))), 0.0), 6.0) * jfbm2(d.xz * 8.0 / (h + 0.3));
    col += vec3(0.25, 0.28, 0.4) * band * 0.06 * uNight;
    float md = max(dot(d, uMoon), 0.0);
    col += vec3(0.85, 0.88, 1.0) * smoothstep(0.99955, 0.99975, md) * 5.0 * uNight;
    col += vec3(0.3, 0.38, 0.6) * pow(md, 40.0) * 0.5 * uNight;
  }
  float disc = smoothstep(0.99955, 0.9998, dot(d, uSun));
  col += uSunC * disc * 40.0 * sunUp;
  if (h > 0.0) {
    vec2 cuv = d.xz / (h + 0.18) * 1.1 + vec2(uTime * 0.006, uTime * 0.0025);
    float cn = jfbm2(cuv * 0.9);
    float cn2 = jfbm2(cuv * 2.4 + 5.0);
    float cov = smoothstep(0.44 - (uCloud - 0.5) * 0.9, 0.8 - (uCloud - 0.5) * 0.6, cn * 0.72 + cn2 * 0.28);
    vec3 cTop = uSunC * 0.9 + uZen * 0.7 + uHor * 0.3;
    vec3 cBot = mix(uHor, uZen, 0.5) * 0.7;
    vec3 cc = mix(cTop, cBot, smoothstep(0.45, 0.85, cn2) * 0.7);
    cc += uSunC * pow(sd, 10.0) * (1.0 - cov) * 2.5 * sunUp;
    col = mix(col, cc, cov * smoothstep(0.0, 0.2, h) * 0.93);
  }
  col += vec3(0.65, 0.7, 0.9) * uFlash * (0.3 + 1.4 * pow(max(dot(d, uBoltDir), 0.0), 6.0));
  col = mix(col, uFogC, smoothstep(0.14, -0.02, h) * 0.9);
  col = mix(col, uGround, smoothstep(-0.02, -0.3, h));
  gl_FragColor = vec4(col, 0.0);
}`;

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.mat = new THREE.ShaderMaterial({
      uniforms: Object.assign({
        uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGround: { value: new THREE.Color() },
        uFogC: { value: new THREE.Color() }, uSunC: { value: new THREE.Color() },
        uSun: { value: new THREE.Vector3() }, uMoon: { value: new THREE.Vector3() }, uCloud: { value: 0.5 },
      }, G),
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), this.mat);
    this.mesh.renderOrder = -1000; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), this.mat));
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;

    this.light = new THREE.DirectionalLight(0xffffff, 3);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.bias = -0.0004;
    this.light.shadow.normalBias = 0.06;
    this.shadowR = 60;
    scene.add(this.light, this.light.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x334422, 1);
    scene.add(this.hemi);
    this.fog = new THREE.FogExp2(0x88aa99, 0.012);
    scene.fog = this.fog;
    this.keyDir = new THREE.Vector3(0, 1, 0);
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.tod = 7.5; this.envTod = -99;
    this.post = { exposure: 1, rays: 0.8, bloom: 0.25, sat: 1.08 };
    this.setTime(7.5);
  }

  setShadow(size, R) {
    this.shadowR = R;
    const s = this.light.shadow;
    if (s.mapSize.x !== size) { s.mapSize.set(size, size); if (s.map) { s.map.dispose(); s.map = null; } }
    const c = s.camera; c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = 400; c.updateProjectionMatrix();
  }

  setTime(tod) {
    this.tod = ((tod % 24) + 24) % 24;
    const a = (this.tod - 6) / 12 * Math.PI;
    const sun = this.sunDir.set(Math.cos(a), Math.sin(a) * 0.82, -0.42 - 0.25 * Math.sin(a)).normalize();
    const e = sun.y;
    const k = sampleKeys(e);
    const moon = new THREE.Vector3(-sun.x * 0.8, Math.max(0.3, -sun.y), -sun.z + 0.4).normalize();
    const night = smoothstep(0.02, -0.18, e);
    G.uNight.value = night;
    const C = (arr, m = 1) => new THREE.Color().setRGB(arr[0], arr[1], arr[2], THREE.SRGBColorSpace).multiplyScalar(m);
    const sunC = C(k.sun);
    const U = this.mat.uniforms;
    U.uSun.value.copy(sun); U.uMoon.value.copy(moon);
    U.uZen.value.copy(C(k.zen, k.skyI)); U.uHor.value.copy(C(k.hor, k.skyI));
    U.uSunC.value.copy(sunC).multiplyScalar(smoothstep(-0.12, 0.05, e));
    const fogC = C(k.fog);
    U.uFogC.value.copy(fogC); U.uGround.value.copy(fogC).multiplyScalar(0.7);

    const moonI = 0.35 * smoothstep(-0.02, -0.15, e);
    if (e > -0.02) { this.keyDir.copy(sun); this.light.color.copy(sunC); this.light.intensity = k.si; }
    else { this.keyDir.copy(moon); this.light.color.setRGB(0.55, 0.65, 1.0); this.light.intensity = moonI; }
    G.uSunDir.value.copy(this.keyDir);
    G.uSunCol.value.copy(this.light.color).multiplyScalar(Math.min(this.light.intensity / 3, 1));

    const hs = new THREE.Color().copy(C(k.zen)).lerp(C(k.hor), 0.5);
    const mx = Math.max(hs.r, hs.g, hs.b, 1e-4); hs.multiplyScalar(1 / mx);
    this.hemi.color.copy(hs);
    this.hemi.groundColor.setRGB(0.16, 0.2, 0.08, THREE.SRGBColorSpace);
    this.hemi.intensity = k.hi;
    this.scene.environmentIntensity = k.env;
    // a Lambert-növényzet nem kap környezeti térképet: ezt pótolja (zöldes, erdei szórt fény)
    G.uAmbF.value.setRGB(0.26, 0.32, 0.24).multiplyScalar(k.env * (1 - night * 0.7));

    const morning = Math.exp(-Math.pow((this.tod - 7.0) / 1.6, 2));
    this.fog.color.copy(fogC);
    this.fog.density = 0.0042 + 0.0036 * morning + 0.0025 * night;
    G.uFogH.value = 0.06 + 0.08 * morning;

    const day = smoothstep(0.0, 0.12, e);
    this.post.exposure = lerp(1.12, 2.1, night);
    this.post.rays = day * (0.65 + 0.55 * (1 - smoothstep(0.2, 0.8, e)));
    this.post.bloom = lerp(0.22, 0.35, night);
    this.day = day; this.night = night; this.morning = morning;
  }

  // Valódi esőerdő-HDRI nappali környezeti fénynek és tükröződésnek
  setHDR(tex) {
    this.hdrEnv = this.pmrem.fromEquirectangular(tex).texture;
    this.envTod = -99;
  }

  updateEnv() {
    if (this.hdrEnv) {
      // nappal a HDRI, szürkületben és éjjel a procedurális égbolt adja a környezeti fényt
      const useHdr = this.day > 0.45;
      this.scene.environmentIntensity *= useHdr ? 0.55 : 1;
      if (useHdr) { this.scene.environment = this.hdrEnv; return; }
    }
    if (Math.abs(this.tod - this.envTod) < 0.15 && this.scene.environment === this.envRT?.texture) return;
    this.envTod = this.tod;
    const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 500);
    if (this.envRT) this.envRT.dispose();
    this.envRT = rt;
    this.scene.environment = rt.texture;
  }

  update(camera, focus) {
    this.mesh.position.copy(camera.position);
    // Árnyék-kamera követi a fókuszt, texel-rácshoz illesztve (nincs remegés)
    const R = this.shadowR, texel = (2 * R) / this.light.shadow.mapSize.x;
    const lz = this.keyDir, u = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), lz);
    if (u.lengthSq() < 1e-6) u.set(1, 0, 0);
    u.normalize();
    const v = new THREE.Vector3().crossVectors(lz, u);
    let du = focus.dot(u), dv = focus.dot(v);
    du = Math.round(du / texel) * texel; dv = Math.round(dv / texel) * texel;
    const c = new THREE.Vector3().addScaledVector(u, du).addScaledVector(v, dv).addScaledVector(lz, focus.dot(lz));
    this.light.target.position.copy(c);
    this.light.position.copy(c).addScaledVector(lz, 180);
    this.light.target.updateMatrixWorld();
  }
}
