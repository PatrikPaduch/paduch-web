// Saját utófeldolgozó lánc: HDR jelenet -> fénysugarak + bloom -> ACES + színkorrekció + vignetta + szemcse
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const DOWN = `
uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; uniform float uPre;
varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = s(vec2(0.0)) * 4.0 + s(vec2(-1.0,-1.0)) + s(vec2(1.0,-1.0)) + s(vec2(-1.0,1.0)) + s(vec2(1.0,1.0));
  c /= 8.0;
  if (uPre > 0.5) {
    c = min(c, vec3(60.0));
    float br = max(c.r, max(c.g, c.b));
    float soft = clamp(br - uThr + 0.5, 0.0, 1.0); soft = soft * soft * 0.5;
    c *= max(soft, br - uThr) / max(br, 1e-4);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const UPS = `
uniform sampler2D tSrc; uniform vec2 uTexel;
varying vec2 vUv;
vec3 s(vec2 o){ return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main(){
  vec3 c = s(vec2(-2.0,0.0)) + s(vec2(2.0,0.0)) + s(vec2(0.0,-2.0)) + s(vec2(0.0,2.0))
    + (s(vec2(-1.0,-1.0)) + s(vec2(1.0,-1.0)) + s(vec2(-1.0,1.0)) + s(vec2(1.0,1.0))) * 2.0;
  gl_FragColor = vec4(c / 12.0, 1.0);
}`;

const MASK = `
uniform sampler2D tScene; uniform vec2 uSun; uniform float uAspect;
varying vec2 vUv;
void main(){
  vec4 s = texture2D(tScene, vUv);
  float sky = 1.0 - clamp(s.a, 0.0, 1.0);
  vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
  float g = exp(-dot(d, d) * 5.0);
  gl_FragColor = vec4(min(s.rgb, vec3(6.0)) * sky * g, 1.0);
}`;

const RADIAL = `
uniform sampler2D tMask; uniform vec2 uSun; uniform float uDensity; uniform float uDecay;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  const int N = 56;
  vec2 delta = (vUv - uSun) * uDensity / float(N);
  vec2 p = vUv - delta * hash(vUv * 1000.0);
  float ill = 1.0; vec3 acc = vec3(0.0);
  for (int i = 0; i < N; i++) { acc += texture2D(tMask, p).rgb * ill; ill *= uDecay; p -= delta; }
  gl_FragColor = vec4(acc / float(N), 1.0);
}`;

// Képernyőtéri ambient occlusion a mélységbufferből (fél felbontás)
const SSAO = `
uniform sampler2D tDepth; uniform mat4 uProj; uniform mat4 uInvProj; uniform vec2 uRes; uniform float uRadius;
varying vec2 vUv;
vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 c = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return c.xyz / c.w; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.999999) { gl_FragColor = vec4(1.0, -1e4, 0.0, 1.0); return; }
  vec3 P = vpos(vUv);
  vec2 px = 1.0 / uRes;
  vec3 Px = vpos(vUv + vec2(px.x, 0.0)), Pxn = vpos(vUv - vec2(px.x, 0.0));
  vec3 Py = vpos(vUv + vec2(0.0, px.y)), Pyn = vpos(vUv - vec2(0.0, px.y));
  vec3 dx = abs(Px.z - P.z) < abs(P.z - Pxn.z) ? Px - P : P - Pxn;
  vec3 dy = abs(Py.z - P.z) < abs(P.z - Pyn.z) ? Py - P : P - Pyn;
  vec3 Nv = normalize(cross(dx, dy));
  vec3 t = normalize(abs(Nv.y) < 0.9 ? cross(Nv, vec3(0.0, 1.0, 0.0)) : cross(Nv, vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(Nv, t);
  float rnd = hash(gl_FragCoord.xy) * 6.2831;
  float rad = uRadius * (1.0 + smoothstep(10.0, 40.0, -P.z) * 1.5);
  float occ = 0.0;
  const int S = 12;
  for (int i = 0; i < S; i++) {
    float fi = float(i) + 0.5;
    float a = fi * 2.39996 + rnd, r = sqrt(fi / float(S));
    vec3 S3 = P + (t * cos(a) + b * sin(a)) * r * rad + Nv * rad * (0.1 + 0.5 * hash(vec2(fi, rnd)));
    vec4 q = uProj * vec4(S3, 1.0);
    vec2 suv = q.xy / q.w * 0.5 + 0.5;
    float sz = vpos(suv).z;
    float range = smoothstep(0.0, 1.0, rad / max(abs(P.z - sz), 1e-3));
    occ += step(S3.z + 0.04, sz) * range;
  }
  float ao = 1.0 - occ / float(S);
  ao = mix(ao, 1.0, smoothstep(45.0, 90.0, -P.z));
  gl_FragColor = vec4(ao, P.z, 0.0, 1.0);
}`;

const AOBLUR = `
uniform sampler2D tAO; uniform vec2 uDir;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(tAO, vUv);
  float z0 = c.g, s = c.r, w = 1.0;
  for (int i = -4; i <= 4; i++) {
    if (i == 0) continue;
    vec4 tt = texture2D(tAO, vUv + uDir * float(i));
    float wi = exp(-abs(tt.g - z0) * 1.5) * (1.0 - abs(float(i)) / 5.0);
    s += tt.r * wi; w += wi;
  }
  gl_FragColor = vec4(s / w, z0, 0.0, 1.0);
}`;

const FINAL = `
uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tRays; uniform sampler2D tAO; uniform float uAO;
uniform float uBloom; uniform float uRays; uniform float uExposure; uniform float uSat; uniform float uVig; uniform float uGrain; uniform float uTime;
uniform vec2 uRes; uniform float uFade;
varying vec2 vUv;
vec3 aces(vec3 x){ const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14; return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv, cc = uv - 0.5;
  float ca = length(cc) * 0.0035;
  vec3 col;
  col.r = texture2D(tScene, uv - cc * ca).r;
  col.g = texture2D(tScene, uv).g;
  col.b = texture2D(tScene, uv + cc * ca).b;
  float ao = texture2D(tAO, uv).r;
  col *= mix(1.0, pow(ao, 1.4), uAO);
  col += texture2D(tBloom, uv).rgb * uBloom;
  col += texture2D(tRays, uv).rgb * uRays;
  col *= uExposure;
  col = aces(col);
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, uSat);
  col = mix(col * vec3(0.93, 1.0, 1.05), col, smoothstep(0.0, 0.45, l));
  col *= mix(vec3(1.0), vec3(1.05, 1.0, 0.92), smoothstep(0.35, 1.0, l));
  col = toSRGB(clamp(col, 0.0, 1.0));
  float v = smoothstep(0.95, 0.2, length(cc * vec2(1.0, 0.82)));
  col *= mix(1.0, v, uVig);
  col += (hash(uv * uRes + fract(uTime * 7.13) * 317.0) - 0.5) * uGrain;
  col *= uFade;
  gl_FragColor = vec4(col, 1.0);
}`;

const sm = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });

export class Post {
  constructor(renderer) {
    this.r = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(g); this.quad.frustumCulled = false; this.scene.add(this.quad);
    this.down = sm(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 1.1 }, uPre: { value: 0 } });
    this.up = sm(UPS, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } }, {
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    this.mask = sm(MASK, { tScene: { value: null }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 } });
    this.radial = sm(RADIAL, { tMask: { value: null }, uSun: { value: new THREE.Vector2() }, uDensity: { value: 0.9 }, uDecay: { value: 0.975 } });
    this.final = sm(FINAL, {
      tScene: { value: null }, tBloom: { value: null }, tRays: { value: null }, tAO: { value: null }, uAO: { value: 0.7 },
      uBloom: { value: 0.25 }, uRays: { value: 0.8 }, uExposure: { value: 1 }, uSat: { value: 1.16 }, uVig: { value: 0.35 },
      uGrain: { value: 0.012 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2() }, uFade: { value: 1 },
    });
    this.black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); this.black.needsUpdate = true;
    this.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); this.white.needsUpdate = true;
    this.ssao = sm(SSAO, { tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uInvProj: { value: new THREE.Matrix4() }, uRes: { value: new THREE.Vector2() }, uRadius: { value: 0.55 } });
    this.aoBlur = sm(AOBLUR, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.useRays = true; this.useBloom = true; this.useAO = true;
  }

  setSize(w, h, msaa) {
    for (const t of [this.rtScene, this.rtA, this.rtB, ...(this.mips || [])]) if (t) t.dispose();
    const o = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    const dt = new THREE.DepthTexture(w, h); dt.type = THREE.FloatType;
    this.rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: msaa, depthBuffer: true, depthTexture: dt });
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
    this.rtA = new THREE.WebGLRenderTarget(hw, hh, o);
    this.rtB = new THREE.WebGLRenderTarget(hw, hh, o);
    for (const t of [this.rtAO1, this.rtAO2]) if (t) t.dispose();
    this.rtAO1 = new THREE.WebGLRenderTarget(hw, hh, o);
    this.rtAO2 = new THREE.WebGLRenderTarget(hw, hh, o);
    this.mips = [];
    let mw = w, mh = h;
    for (let i = 0; i < 6; i++) { mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); this.mips.push(new THREE.WebGLRenderTarget(mw, mh, o)); }
    this.w = w; this.h = h;
    this.final.uniforms.uRes.value.set(w, h);
  }

  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }

  render(scene, camera, P) {
    const r = this.r;
    r.setRenderTarget(this.rtScene);
    r.render(scene, camera);
    const tex = this.rtScene.texture;
    let ao = this.white;
    if (this.useAO) {
      const S = this.ssao.uniforms;
      S.tDepth.value = this.rtScene.depthTexture;
      S.uProj.value.copy(camera.projectionMatrix); S.uInvProj.value.copy(camera.projectionMatrixInverse);
      S.uRes.value.set(this.w, this.h);
      this.pass(this.ssao, this.rtAO1);
      const B = this.aoBlur.uniforms;
      B.tAO.value = this.rtAO1.texture; B.uDir.value.set(1 / this.rtAO1.width, 0); this.pass(this.aoBlur, this.rtAO2);
      B.tAO.value = this.rtAO2.texture; B.uDir.value.set(0, 1 / this.rtAO1.height); this.pass(this.aoBlur, this.rtAO1);
      ao = this.rtAO1.texture;
    }
    let rays = this.black;
    if (this.useRays && P.rays > 0.01) {
      this.mask.uniforms.tScene.value = tex;
      this.mask.uniforms.uSun.value.copy(P.sunUV);
      this.mask.uniforms.uAspect.value = this.w / this.h;
      this.pass(this.mask, this.rtA);
      this.radial.uniforms.tMask.value = this.rtA.texture;
      this.radial.uniforms.uSun.value.copy(P.sunUV);
      this.pass(this.radial, this.rtB);
      rays = this.rtB.texture;
    }
    let bloom = this.black;
    if (this.useBloom) {
      let src = tex, sw = this.w, sh = this.h;
      for (let i = 0; i < this.mips.length; i++) {
        this.down.uniforms.tSrc.value = src;
        this.down.uniforms.uTexel.value.set(1 / sw, 1 / sh);
        this.down.uniforms.uPre.value = i === 0 ? 1 : 0;
        this.pass(this.down, this.mips[i]);
        src = this.mips[i].texture; sw = this.mips[i].width; sh = this.mips[i].height;
      }
      r.autoClear = false;
      for (let i = this.mips.length - 2; i >= 0; i--) {
        const s = this.mips[i + 1];
        this.up.uniforms.tSrc.value = s.texture;
        this.up.uniforms.uTexel.value.set(1 / s.width, 1 / s.height);
        this.pass(this.up, this.mips[i]);
      }
      r.autoClear = true;
      bloom = this.mips[0].texture;
    }
    const F = this.final.uniforms;
    F.tScene.value = tex; F.tBloom.value = bloom; F.tRays.value = rays; F.tAO.value = ao;
    F.uBloom.value = P.bloom; F.uRays.value = P.raysStr; F.uExposure.value = P.exposure;
    F.uTime.value = P.time; F.uGrain.value = P.grain; F.uFade.value = P.fade ?? 1;
    this.pass(this.final, null);
  }
}
