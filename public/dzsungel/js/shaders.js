// Közös shader-infrastruktúra: globális uniformok, GLSL zaj, magassági köd, patch segéd
import * as THREE from 'three';

export const G = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.6, 0.4, -0.5).normalize() },
  uSunCol: { value: new THREE.Color(1, 0.9, 0.7) },
  uFogH: { value: 0.07 },
  uWind: { value: 1 },
  uNight: { value: 0 },
  uPlayer: { value: new THREE.Vector3() },
  uAmbF: { value: new THREE.Color(0.3, 0.33, 0.3) },
  uRain: { value: 0 },   // eső erőssége 0..1
  uWet: { value: 0 },    // felületek nedvessége 0..1 (késve követi az esőt)
  uFlash: { value: 0 },  // villámfény
  uBoltDir: { value: new THREE.Vector3(1, 0.3, 0).normalize() },
};

export const NOISE = /* glsl */`
float jh1(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float jh13(vec3 p3){ p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float jn2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(jh1(i), jh1(i+vec2(1.0,0.0)), u.x), mix(jh1(i+vec2(0.0,1.0)), jh1(i+vec2(1.0,1.0)), u.x), u.y); }
float jn3(vec3 p){ vec3 i = floor(p), f = fract(p); vec3 u = f*f*(3.0-2.0*f);
  float a = jh13(i), b = jh13(i+vec3(1,0,0)), c = jh13(i+vec3(0,1,0)), d = jh13(i+vec3(1,1,0));
  float e = jh13(i+vec3(0,0,1)), f1 = jh13(i+vec3(1,0,1)), g = jh13(i+vec3(0,1,1)), h = jh13(i+vec3(1,1,1));
  return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,f1,u.x), mix(g,h,u.x), u.y), u.z); }
float jfbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a*jn2(p); p = p*2.03 + vec2(17.1, 9.2); a *= 0.5; } return s / 0.9375; }
vec3 s2l(vec3 c){ return pow(c, vec3(2.2)); }
`;

// Csak fragment shaderbe (dFdx miatt)
export const BUMP = /* glsl */`
vec3 jBump(vec3 pos, vec3 n, float h){
  vec3 dx = dFdx(pos), dy = dFdy(pos);
  float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  return normalize(abs(det) * n - g);
}`;

let installed = false;
export function installChunks() {
  if (installed) return;
  installed = true;
  const C = THREE.ShaderChunk;
  C.common = C.common + `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
uniform float uFogH;
uniform float uWind;
uniform float uNight;
uniform vec3 uPlayer;
uniform vec3 uAmbF;
uniform float uRain;
uniform float uWet;
uniform float uFlash;
uniform vec3 uBoltDir;
` + NOISE;

  // Magassági, napfény felé melegedő köd (párás dzsungel-levegő)
  C.fog_pars_vertex = `#ifdef USE_FOG
varying vec3 vFogWP;
#endif`;
  C.fog_vertex = `#ifdef USE_FOG
{ vec4 fwp = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  fwp = batchingMatrix * fwp;
#endif
#ifdef USE_INSTANCING
  fwp = instanceMatrix * fwp;
#endif
  vFogWP = (modelMatrix * fwp).xyz; }
#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG
uniform vec3 fogColor;
varying vec3 vFogWP;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear;
uniform float fogFar;
#endif
#endif`;
  C.fog_fragment = `#ifdef USE_FOG
{ vec3 fd = vFogWP - cameraPosition; float fdist = length(fd);
  float hf = exp(-max(vFogWP.y, 0.0) * uFogH);
  float fogFactor = 1.0 - exp(-fdist * fogDensity * (0.22 + 1.25 * hf));
  float sunA = pow(max(dot(fd / max(fdist, 0.001), uSunDir), 0.0), 6.0);
  vec3 fc = fogColor + uSunCol * sunA * 0.45;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, fogFactor); }
#endif`;
}

// onBeforeCompile segéd: globális + anyag-saját uniformok, egyedi program-kulcs
export function patch(mat, key, fn) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, G, mat.userData.u || {});
    if (fn) fn(sh);
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

export const NFB_NOFLIP = () => THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', '');

// Teljesen additív keverés, ami az alfa csatornát (égbolt-maszk) érintetlenül hagyja
export const ADD = {
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
};
export const ALPHA_KEEP = {
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
};
