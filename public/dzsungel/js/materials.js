// Egyedi anyagok onBeforeCompile-lal: a three.js fény/árnyék rendszere megmarad, a felületek saját shadert kapnak
import * as THREE from 'three';
import { G, patch, BUMP, NFB_NOFLIP } from './shaders.js';

const WP_V = `
{ vec4 jwp4 = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  jwp4 = batchingMatrix * jwp4;
#endif
#ifdef USE_INSTANCING
  jwp4 = instanceMatrix * jwp4;
#endif
  vWP = (modelMatrix * jwp4).xyz; }`;

const WN_V = `
{ mat3 jm = mat3(modelMatrix);
#ifdef USE_BATCHING
  jm = jm * mat3(batchingMatrix);
#endif
#ifdef USE_INSTANCING
  jm = jm * mat3(instanceMatrix);
#endif
  vWN = normalize(jm * objectNormal); }`;

export const WIND = `
{
  vec3 iP = vec3(0.0);
#ifdef USE_BATCHING
  iP = batchingMatrix[3].xyz;
#endif
#ifdef USE_INSTANCING
  iP = instanceMatrix[3].xyz;
#endif
  float hgt = max(position.y, 0.0);
  float ph = iP.x * 0.137 + iP.z * 0.113;
  float gst = jn2(iP.xz * 0.02 + vec2(uTime * 0.12, uTime * 0.05));
  float sw = (sin(uTime * 0.8 + ph) * 0.6 + sin(uTime * 1.9 + ph * 1.7) * 0.25) * (0.4 + gst) * uWind;
  vec2 sd = vec2(cos(ph * 3.1), sin(ph * 3.1));
  transformed.xz += sd * sw * uSway * hgt * hgt;
  float fl = sin(uTime * 4.3 + dot(position, vec3(2.1, 1.3, 1.7)) + ph) * uFlutter * uWind * min(hgt * 0.5, 1.0);
  transformed += normal * fl;
}`;

export function basic(m) { return patch(m, 'basic'); }

export function terrainMat(tSplat, tHeight) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  m.userData.u = { tSplat: { value: tSplat }, tHeight: { value: tHeight } };
  return patch(m, 'terrain', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tSplat; uniform sampler2D tHeight;
${BUMP}
float jRockH; float jRough; float jCaus;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 tuv = (vWP.xz + 200.0) / 400.0 * (400.0 / 401.0) + 0.5 / 401.0;
  vec4 sp = texture2D(tSplat, tuv);
  float wl = (vWP.z < -50.0 && vWP.y > 10.0) ? 16.2 : 0.0;
  vec3 wn = normalize(vWN);
  float slope = 1.0 - wn.y;
  float n1 = jfbm2(vWP.xz * 0.07);
  float n2 = jn2(vWP.xz * 0.9);
  float n3 = jn2(vWP.xz * 4.3);
  vec3 grass = mix(s2l(vec3(0.25, 0.37, 0.10)), s2l(vec3(0.37, 0.47, 0.13)), n1);
  grass *= 0.85 + 0.3 * n2;
  vec3 litter = mix(s2l(vec3(0.34, 0.25, 0.14)), s2l(vec3(0.20, 0.25, 0.10)), smoothstep(0.3, 0.7, jn2(vWP.xz * 0.35)));
  litter *= 0.7 + 0.6 * n3;
  vec3 dirt = mix(s2l(vec3(0.44, 0.33, 0.21)), s2l(vec3(0.35, 0.26, 0.17)), n2);
  vec3 mud = s2l(vec3(0.21, 0.17, 0.11));
  float strata = jfbm2(vec2((vWP.x + vWP.z) * 0.12, vWP.y * 1.6));
  vec3 rock = mix(s2l(vec3(0.46, 0.43, 0.38)), s2l(vec3(0.27, 0.26, 0.24)), strata);
  rock *= (0.8 + 0.4 * n3) * (0.72 + 0.4 * jn2(vec2(vWP.x * 1.3 + vWP.z * 0.7, vWP.y * 0.12)));
  vec3 col = grass;
  float lit = smoothstep(0.35, 0.75, sp.g + (n2 - 0.5) * 0.5);
  col = mix(col, litter, lit);
  float pth = smoothstep(0.3, 0.7, sp.r + (n3 - 0.5) * 0.35);
  col = mix(col, dirt, pth);
  col = mix(col, mud, sp.b * 0.8);
  float rk = smoothstep(0.30, 0.55, slope + (n1 - 0.5) * 0.3);
  float mossOnRock = smoothstep(0.25, 0.6, n1 + wn.y * 0.3 - 0.15);
  vec3 rockC = mix(rock, s2l(vec3(0.22, 0.33, 0.10)), mossOnRock * 0.6);
  col = mix(col, rockC, rk);
  float uw = smoothstep(0.8, 1.0, sp.b);
  col = mix(col, s2l(vec3(0.32, 0.29, 0.19)) * 0.8, uw);
  float wetLine = smoothstep(0.0, 0.8, sp.b) * (1.0 - uw);
  col *= 1.0 - wetLine * 0.35;
  diffuseColor.rgb = col;
  jRough = mix(0.95, 0.82, rk);
  jRough = mix(jRough, 0.32, max(wetLine, uw) * 0.9);
  jRockH = strata * 0.6 * rk + n3 * 0.08 + lit * jn2(vWP.xz * 9.0) * 0.12 + pth * jn2(vWP.xz * 14.0) * 0.06;
  float wlv = vWP.y > 10.0 ? 16.2 : 0.0;
  float cd = clamp(wlv - vWP.y, 0.0, 3.0);
  vec2 cp = vWP.xz * 0.55;
  float c1 = jn2(cp + vec2(uTime * 0.35, uTime * 0.2));
  float c2 = jn2(cp * 1.3 - vec2(uTime * 0.25, -uTime * 0.3) + 3.1);
  jCaus = pow(1.0 - abs(c1 - c2), 12.0) * uw * smoothstep(3.0, 0.2, cd) * 2.5;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = jRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = jBump(-vViewPosition, normal, jRockH);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += jCaus * uSunCol * 0.3;');
  });
}

// Háromirányú (triplanár) mintavétel: a meredek felületeken sem nyúlik a textúra.
// Normálok "whiteout" keveréssel, világtérben.
const TRI = `
void triSample(sampler2D tD, sampler2D tN, sampler2D tA, vec3 p, vec3 N, out vec3 dOut, out vec3 nOut, out vec3 aOut){
  vec3 bw = pow(abs(N), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
  vec2 ux = p.zy, uy = p.xz, uz = p.xy;
  dOut = texture2D(tD, ux).rgb * bw.x + texture2D(tD, uy).rgb * bw.y + texture2D(tD, uz).rgb * bw.z;
  aOut = texture2D(tA, ux).rgb * bw.x + texture2D(tA, uy).rgb * bw.y + texture2D(tA, uz).rgb * bw.z;
  vec3 nX = texture2D(tN, ux).xyz * 2.0 - 1.0, nY = texture2D(tN, uy).xyz * 2.0 - 1.0, nZ = texture2D(tN, uz).xyz * 2.0 - 1.0;
  vec3 sg = sign(N);
  nX.x *= sg.x; nY.x *= sg.y; nZ.x *= -sg.z;
  nX = vec3(nX.xy + N.zy, abs(nX.z) * N.x);
  nY = vec3(nY.xy + N.xz, abs(nY.z) * N.y);
  nZ = vec3(nZ.xy + N.xy, abs(nZ.z) * N.z);
  nOut = normalize(nX.zyx * bw.x + nY.xzy * bw.y + nZ.xyz * bw.z);
}`;

// Fotós PBR terep: fű / avar / iszap magasság-alapú keveréssel, triplanár sziklafal
export function terrainMatPBR(tSplat, A) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const G1 = A.leafy_grass, F = A.forest_leaves_02, M = A.mud_forest, R = A.rock_face_03;
  m.userData.u = {
    tSplat: { value: tSplat }, tCanopy: { value: null },
    tGd: { value: G1.diff }, tGn: { value: G1.nor },
    tFd: { value: F.diff }, tFn: { value: F.nor },
    tMd: { value: M.diff }, tMn: { value: M.nor },
    tRd: { value: R.diff }, tRn: { value: R.nor }, tRa: { value: R.arm },
    uPom: { value: 0 },
  };
  return patch(m, 'terrainPBR', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tSplat; uniform sampler2D tCanopy;
uniform sampler2D tGd; uniform sampler2D tGn; uniform sampler2D tFd; uniform sampler2D tFn;
uniform sampler2D tMd; uniform sampler2D tMn; uniform sampler2D tRd; uniform sampler2D tRn; uniform sampler2D tRa;
uniform vec4 uMouth; uniform vec3 uMouthZ; uniform float uPom;
// parallax-mélység: a textúra világosságából becsült magasságon lépkedünk a nézés irányában (közel a kamerához)
vec2 jPom(sampler2D t, vec2 uv, vec2 d) {
  vec2 gx = dFdx(uv), gy = dFdy(uv);
  const float L = 0.1; vec2 st = d * L; vec2 c = uv; float cd = 0.0;
  float hh = 1.0 - clamp(dot(textureGrad(t, c, gx, gy).rgb, vec3(0.45)) * 1.6, 0.0, 1.0);
  for (int i = 0; i < 10; i++) { if (cd >= hh) break; c -= st; cd += L; hh = 1.0 - clamp(dot(textureGrad(t, c, gx, gy).rgb, vec3(0.45)) * 1.6, 0.0, 1.0); }
  return c;
}
${TRI}
vec3 jN; float jRough; float jCaus;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec2 mq = (vWP.xy - uMouth.xy) / max(uMouth.zw, vec2(1e-3));
  if (dot(mq, mq) < 1.0 && vWP.y > uMouthZ.z && vWP.z < uMouthZ.x && vWP.z > uMouthZ.y) discard; }
{
  vec2 tuv = (vWP.xz + 200.0) / 400.0 * (400.0 / 401.0) + 0.5 / 401.0;
  vec4 sp = texture2D(tSplat, tuv);
  vec3 N = normalize(vWN);
  float slope = 1.0 - N.y;
  vec3 Vw = normalize(cameraPosition - vWP);
  float pomK = uPom * (1.0 - smoothstep(10.0, 26.0, length(cameraPosition - vWP))) * smoothstep(0.3, 0.1, slope);
  vec2 pdir = Vw.xz / max(Vw.y, 0.2);
  float nLow = jn2(vWP.xz * 0.045);
  vec2 uvG = vWP.xz / 3.4;
  vec3 gD = mix(texture2D(tGd, uvG).rgb, texture2D(tGd, uvG * 0.37 + vec2(0.37, 0.71)).rgb, smoothstep(0.35, 0.65, nLow));
  vec3 gN = texture2D(tGn, uvG).xyz * 2.0 - 1.0;
  gD *= vec3(0.52, 0.84, 0.4);
  vec2 uvF = vWP.xz / 2.8;
  if (pomK > 0.01) uvF = jPom(tFd, uvF, pdir * (0.05 / 2.8) * pomK);
  vec3 fD = mix(texture2D(tFd, uvF).rgb, texture2D(tFd, uvF * 0.33 + 0.5).rgb, smoothstep(0.35, 0.65, jn2(vWP.xz * 0.06 + 3.0)));
  vec3 fN = texture2D(tFn, uvF).xyz * 2.0 - 1.0;
  vec2 uvM = vWP.xz / 2.5;
  if (pomK > 0.01) uvM = jPom(tMd, uvM, pdir * (0.07 / 2.5) * pomK);
  vec3 mD = texture2D(tMd, uvM).rgb * vec3(1.25, 1.02, 0.78);
  vec3 mN = texture2D(tMn, uvM).xyz * 2.0 - 1.0;
  float hG = dot(gD, vec3(0.333)), hF = dot(fD, vec3(0.333)), hM = dot(mD, vec3(0.333));
  float wF = smoothstep(0.32, 0.72, sp.g + (hF - hG) * 1.2 + (nLow - 0.5) * 0.35);
  float wM = smoothstep(0.35, 0.62, sp.r + (hM - 0.25) * 0.8);
  vec3 col = mix(gD, fD, wF);
  vec3 tn = normalize(mix(gN, fN, wF));
  col = mix(col, mD, wM); tn = normalize(mix(tn, mN, wM));
  col = mix(col, mD * 0.6, sp.b * 0.7);
  vec3 wn = normalize(vec3(tn.x + N.x, abs(tn.z) * N.y, tn.y + N.z));
  float rough = mix(0.95, 0.88, wF);
  float ao = mix(1.0, smoothstep(0.0, 0.45, dot(col, vec3(0.333))), 0.35);
  float rk = smoothstep(0.27, 0.5, slope + (nLow - 0.5) * 0.25);
  if (rk > 0.01) {
    vec3 rD, rN, rA;
    triSample(tRd, tRn, tRa, vWP / 5.5, N, rD, rN, rA);
    rD *= vec3(0.66, 0.68, 0.6);
    // moha a párkányokon + lefolyó, mohás csíkok a falon
    float moss = smoothstep(0.38, 0.8, N.y + (jn2(vWP.xz * 0.9 + vWP.y) - 0.5) * 0.5);
    float streak = smoothstep(0.55, 0.85, jn2(vec2((vWP.x + vWP.z) * 0.9, vWP.y * 0.08))) * smoothstep(0.35, 0.7, jn2(vWP.xz * 0.3 + vWP.y * 0.2));
    vec3 mossC = vec3(0.11, 0.17, 0.04) * (0.7 + 0.6 * dot(rD, vec3(0.6)));
    rD = mix(rD, mossC, clamp(moss * 0.85 + streak * 0.55, 0.0, 0.9));
    rD *= 0.78 + 0.35 * jn2(vec2(vWP.x * 1.3 + vWP.z * 0.7, vWP.y * 0.12));
    col = mix(col, rD, rk); wn = normalize(mix(wn, rN, rk));
    ao = mix(ao, rA.r, rk); rough = mix(rough, rA.g, rk);
  }
  float uw = smoothstep(0.8, 1.0, sp.b);
  col = mix(col, col * vec3(0.55, 0.6, 0.5), uw);
  float wetLine = smoothstep(0.0, 0.8, sp.b) * (1.0 - uw);
  col *= 1.0 - wetLine * 0.35;
  rough = mix(rough, 0.3, max(wetLine, uw) * 0.9);
  // eső: beázás + tükröző tócsák a lapos, sáros mélyedésekben
  float wetHere = uWet * (1.0 - texture2D(tCanopy, tuv).r * 0.6); // lomb alatt kevésbé ázik
  float puddle = wetHere * smoothstep(0.6, 0.72, jn2(vWP.xz * 0.18) * 0.7 + wM * 0.35 + (1.0 - slope) * 0.12) * (1.0 - rk) * (1.0 - uw);
  col *= 1.0 - wetHere * 0.33;
  col = mix(col, col * 0.4, puddle);
  rough = mix(rough, 0.24, wetHere * 0.7);
  rough = mix(rough, 0.03, puddle);
  wn = normalize(mix(wn, N, puddle * 0.9));
  diffuseColor.rgb = col * mix(1.0, ao, 0.85);
  jRough = rough; jN = wn;
  float wlv = vWP.y > 10.0 ? 16.2 : 0.0;
  float cd = clamp(wlv - vWP.y, 0.0, 3.0);
  vec2 cp = vWP.xz * 0.55;
  float c1 = jn2(cp + vec2(uTime * 0.35, uTime * 0.2));
  float c2 = jn2(cp * 1.3 - vec2(uTime * 0.25, -uTime * 0.3) + 3.1);
  jCaus = pow(1.0 - abs(c1 - c2), 12.0) * uw * smoothstep(3.0, 0.2, cd) * 2.5;
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = jRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(jN, 0.0)).xyz);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += jCaus * uSunCol * 0.3;');
  });
}

// Mohás sziklatömbök fotós textúrával (triplanár, a geometriának nincs UV-ja)
export function rockMatPBR(T) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  m.userData.u = { tRd: { value: T.diff }, tRn: { value: T.nor }, tRa: { value: T.arm } };
  return patch(m, 'rockPBR', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tRd; uniform sampler2D tRn; uniform sampler2D tRa;
${TRI}
vec3 jN; float jRough;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 N = normalize(vWN);
  vec3 rD, rN, rA;
  triSample(tRd, tRn, tRa, vWP / 2.2, N, rD, rN, rA);
  float wetR = smoothstep(0.6, 0.0, vWP.y);
  rD *= 1.0 - wetR * 0.4;
  diffuseColor.rgb *= rD * mix(1.0, rA.r, 0.9) * (1.0 - uWet * 0.35);
  jN = rN; jRough = mix(mix(rA.g, 0.35, wetR), 0.2, uWet * 0.8); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = jRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(jN, 0.0)).xyz);');
  });
}

// Templomkő: nagyobb léptékű, fakóbb kő, moha a felfelé néző lapokon és a fugákban,
// a szentély belseje sötét (nincs valódi beltéri árnyék, ezért itt csaljuk)
export function templeMatPBR(T, shrine) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  m.userData.u = { tRd: { value: T.diff }, tRn: { value: T.nor }, tRa: { value: T.arm }, uShr: { value: shrine } };
  return patch(m, 'templePBR', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tRd; uniform sampler2D tRn; uniform sampler2D tRa;
uniform vec4 uShr[2];
${TRI}
vec3 jN; float jRough; float jIn;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 N = normalize(vWN);
  vec3 rD, rN, rA;
  triSample(tRd, tRn, tRa, vWP / 4.6, N, rD, rN, rA);
  float l = dot(rD, vec3(0.33));
  vec3 stone = mix(vec3(l), rD, 0.35) * vec3(1.12, 1.0, 0.8) * 0.98;
  vec2 mp = vWP.xz + vec2(vWP.y * 0.7, -vWP.y * 0.4);
  float n = jn2(mp * 0.45) * 0.55 + jn2(mp * 1.9) * 0.3 + jn2(mp * 6.3) * 0.15;
  float moss = smoothstep(0.35, 0.85, N.y) * smoothstep(0.5, 0.7, n + (l - 0.3) * 0.4);
  moss = max(moss, smoothstep(0.66, 0.82, n) * (1.0 - abs(N.y)) * 0.7);
  stone = mix(stone, vec3(0.09, 0.13, 0.04) * (0.6 + rD.g * 1.6), moss * 0.8);
  vec2 q = abs(vWP.xz - uShr[0].xy) - uShr[0].zw;
  jIn = step(max(q.x, q.y), 0.0) * step(uShr[1].x, vWP.y) * step(vWP.y, uShr[1].y);
  diffuseColor.rgb *= stone * mix(1.0, rA.r, 0.9) * (1.0 - uWet * 0.35) * (1.0 - jIn * 0.72);
  jN = rN; jRough = mix(mix(rA.g, 1.0, moss * 0.5), 0.25, uWet * 0.8); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = jRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(jN, 0.0)).xyz);')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= 1.0 - jIn * 0.5;');
  });
}

// Barlangkő: nedves, sötét szikla vízcsíkokkal; a szájtól befelé (aS = távolság a bejárattól) fogy a szórt és a napfény
export function caveMatPBR(T) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
  m.userData.u = { tRd: { value: T.diff }, tRn: { value: T.nor }, tRa: { value: T.arm } };
  return patch(m, 'cavePBR', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aS;
varying float vS;
varying vec3 vWP;
varying vec3 vWN;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
vS = aS;
` + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vS; varying vec3 vWP; varying vec3 vWN;
uniform sampler2D tRd; uniform sampler2D tRn; uniform sampler2D tRa;
${TRI}
vec3 jN; float jRough; float jSunK;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 N = normalize(vWN);
  vec3 rD, rN, rA;
  triSample(tRd, tRn, tRa, vWP / 3.2, N, rD, rN, rA);
  float l = dot(rD, vec3(0.33));
  vec3 c = mix(vec3(l), rD, 0.5) * vec3(0.62, 0.64, 0.66);
  // lefolyó víz csíkjai a falon, sáros-nedves padló
  float streak = smoothstep(0.55, 0.85, jn2(vec2((vWP.x - vWP.z) * 1.1, vWP.y * 0.1))) * (1.0 - abs(N.y));
  float floorK = smoothstep(0.55, 0.85, N.y);
  c = mix(c, c * vec3(0.75, 0.68, 0.58), floorK);
  c *= 1.0 - streak * 0.35;
  diffuseColor.rgb *= c * mix(1.0, rA.r, 0.8);
  jN = rN; jRough = mix(mix(rA.g * 0.85, 0.22, streak), 0.35, floorK * 0.6);
  jSunK = 1.0 - smoothstep(0.5, 4.0, vS); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = jRough;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize((viewMatrix * vec4(jN, 0.0)).xyz);`)
      // az #include a patch után bomlik ki, ezért a teljes darabot cseréljük
      .replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= jSunK;'))
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{ float ind = mix(1.0, 0.035, smoothstep(0.5, 11.0, vS));
  reflectedLight.indirectDiffuse *= ind; reflectedLight.indirectSpecular *= ind; }`);
  });
}

export function farMat() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  return patch(m, 'far', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= 0.6 + 0.8 * jn2(vWP.xz * 0.09) * (0.7 + 0.6 * jn2(vWP.xz * 0.4));`);
  });
}

export function waterMat(tHeight, level) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, depthWrite: false });
  m.userData.u = { tHeight: { value: tHeight }, uLevel: { value: level } };
  return patch(m, 'water', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWP; uniform sampler2D tHeight; uniform float uLevel;
vec3 jWN; float jFoam;
vec2 wgrad(vec2 p){
  float e = 0.12;
  float a = jn2(p), b = jn2(p + vec2(e, 0.0)), c = jn2(p + vec2(0.0, e));
  vec2 g = vec2(b - a, c - a) / e;
  p = p * 2.3 + 4.7;
  a = jn2(p); b = jn2(p + vec2(e, 0.0)); c = jn2(p + vec2(0.0, e));
  return g + vec2(b - a, c - a) / e * 0.45;
}
// esőcsepp-gyűrűk: cellánként egy-egy táguló, elhaló hullámgyűrű
float rainRip(vec2 p){
  vec2 cell = floor(p), f = fract(p); float acc = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 o = vec2(float(i), float(j)), c = cell + o;
    float h = jh1(c);
    vec2 ctr = o + vec2(jh1(c + 3.1), jh1(c + 7.7));
    float t = fract(uTime * 1.25 + h);
    float d = length(f - ctr), r = t * 0.85;
    acc += sin(clamp((d - r) * 34.0, -3.1416, 3.1416)) * (1.0 - t) * smoothstep(0.14, 0.0, abs(d - r));
  }
  return acc;
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec2 tuv = (vWP.xz + 200.0) / 400.0 * (400.0 / 401.0) + 0.5 / 401.0;
  vec4 hd = texture2D(tHeight, tuv);
  float depth = max(uLevel - hd.r, 0.0);
  vec2 flow = hd.gb;
  float ph0 = fract(uTime * 0.2), ph1 = fract(uTime * 0.2 + 0.5);
  float bw = abs(ph0 - 0.5) * 2.0;
  vec2 p = vWP.xz * 0.6;
  vec2 g0 = wgrad(p - flow * ph0 * 2.6);
  vec2 g1 = wgrad(p - flow * ph1 * 2.6 + vec2(0.37, 0.71));
  vec2 g = mix(g0, g1, bw);
  g += wgrad(vWP.xz * 1.6 + vec2(uTime * 0.15, -uTime * 0.11)) * 0.3;
  if (uRain > 0.02) {
    vec2 rp = vWP.xz * 2.2; float re = 0.03;
    float r0 = rainRip(rp);
    g += vec2(rainRip(rp + vec2(re, 0.0)) - r0, rainRip(rp + vec2(0.0, re)) - r0) / re * 0.05 * uRain;
  }
  float fs = 0.09 + 0.14 * length(flow) + hd.a * 0.25;
  jWN = normalize(vec3(-g.x * fs, 1.0, -g.y * fs));
  vec3 shallow = s2l(vec3(0.33, 0.47, 0.34));
  vec3 deep = s2l(vec3(0.03, 0.12, 0.11));
  vec3 wc = mix(shallow, deep, 1.0 - exp(-depth * 0.85));
  float alpha = 0.93 * (1.0 - exp(-depth * 1.7));
  float fn = jn2(vWP.xz * 1.6 - flow * uTime * 1.3) * 0.6 + jn2(vWP.xz * 4.0 + uTime * 0.4) * 0.4;
  float edgeF = smoothstep(0.4, 0.0, depth) * smoothstep(0.38, 0.66, fn);
  float fallF = hd.a * smoothstep(0.42 - hd.a * 0.35, 0.8, fn);
  float streak = length(flow) * smoothstep(0.64, 0.82, fn) * 0.55;
  jFoam = clamp(edgeF * 0.75 + fallF + streak, 0.0, 1.0);
  vec3 vd = normalize(cameraPosition - vWP);
  float fr = pow(1.0 - max(vd.y, 0.0), 5.0);
  alpha = mix(alpha, 1.0, fr * 0.85);
  diffuseColor.rgb = mix(wc, vec3(0.88, 0.94, 0.92), jFoam);
  diffuseColor.a = max(alpha, jFoam * 0.95) * smoothstep(0.0, 0.1, depth);
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.04, 0.6, jFoam);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize((viewMatrix * vec4(jWN, 0.0)).xyz);');
  });
}

// Lombozat: Lambert + szél + átvilágítás (napfény a leveleken át) + gömbi normálok
export function foliageMat(atlas, sway, flutter) {
  const u = { uSway: { value: sway }, uFlutter: { value: flutter } };
  const m = new THREE.MeshLambertMaterial({ map: atlas, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true });
  m.userData.u = u;
  patch(m, 'foliage', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <normal_fragment_begin>', NFB_NOFLIP())
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= (0.86 + 0.28 * jn2(vWP.xz * 0.05 + vWP.y * 0.03)) * (1.0 - uWet * 0.14);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * uAmbF;`)
      // áttetszőség: a levél csak ott világít át, ahol a napfény tényleg eléri (árnyékban és felhő alatt nem)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{ vec3 vd = normalize(vWP - cameraPosition);
  float bl = pow(max(dot(vd, uSunDir), 0.0), 3.0);
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.1, 1.2, 0.55) * jDirAcc * bl * 0.9; }`);
  });
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlas, alphaTest: 0.5, side: THREE.DoubleSide });
  d.userData.u = u;
  patch(d, 'foliageDepth', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND);
  });
  return { mat: m, depth: d, u };
}

export function barkMat(barkTex, u) {
  // barkTex: vászon-textúra (procedurális) vagy {diff, nor, arm} fotós PBR készlet
  const pbr = barkTex && barkTex.diff;
  const m = pbr
    ? new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.56, 0.48), map: barkTex.diff, normalMap: barkTex.nor, normalScale: new THREE.Vector2(1.3, 1.3), roughnessMap: barkTex.arm, aoMap: barkTex.arm, roughness: 1, metalness: 0, vertexColors: true })
    : new THREE.MeshStandardMaterial({ map: barkTex, bumpMap: barkTex, bumpScale: 2.5, roughness: 0.95, metalness: 0, vertexColors: true });
  m.userData.u = { uSway: u ? u.uSway : { value: 0 }, uFlutter: { value: 0 } };
  return patch(m, 'bark', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND + '\nvH = position.y;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying float vH;')
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 wn = normalize(vWN);
  float mn = jn2(vWP.xz * 1.7 + vWP.y * 0.9);
  float moss = smoothstep(0.25, 0.8, wn.y + (mn - 0.5) * 0.7);
  moss = max(moss, smoothstep(2.4, 0.2, vH) * smoothstep(0.35, 0.65, jn2(vWP.xz * 2.3 + vWP.y * 1.7)));
  diffuseColor.rgb = mix(diffuseColor.rgb, s2l(vec3(0.25, 0.35, 0.10)) * (0.75 + 0.5 * jn2(vWP.xz * 9.0 + vWP.y * 3.0)), moss * 0.85);
  diffuseColor.rgb *= 1.0 - uWet * 0.38; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.25, uWet * 0.7);');
  });
}

// Növényi szárak, virágok, gombák (vertex színek; a gomba éjjel világít)
export function plantMat(sway, glow = 0) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.userData.u = { uSway: { value: sway }, uFlutter: { value: 0 }, uGlow: { value: glow } };
  return patch(m, 'plant', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;\nvarying float vGlowM;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND + '\nvGlowM = uv.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGlow;\nvarying float vGlowM;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(0.25, 1.0, 0.85) * uNight * uGlow * vGlowM * 1.6;`);
  });
}

export function grassMat() {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  m.userData.u = { uGrassR: { value: 60 } };
  return patch(m, 'grass', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vGH;\nvarying vec3 vGW;\nuniform float uGrassR;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3( tangent.xyz );\n#endif')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vGH = uv.y;
{
  mat4 im = mat4(1.0);
#ifdef USE_BATCHING
  im = batchingMatrix;
#endif
#ifdef USE_INSTANCING
  im = instanceMatrix;
#endif
  vec3 wp = (modelMatrix * im * vec4(position, 1.0)).xyz;
  vec3 root = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float hh = uv.y * uv.y;
  float gust = jn2(wp.xz * 0.06 + vec2(uTime * 0.35, uTime * 0.12));
  vec2 wd = vec2(0.28, 0.16) * (0.15 + 0.7 * gust) * uWind;
  wd += vec2(sin(uTime * 2.1 + wp.x * 0.7 + wp.z * 0.4), cos(uTime * 1.7 + wp.z * 0.6)) * 0.035 * uWind;
  vec3 disp = vec3(wd.x, 0.0, wd.y) * hh;
  vec2 tp = root.xz - uPlayer.xz;
  float pd = length(tp);
  float push = (1.0 - smoothstep(0.25, 1.3, pd)) * step(abs(root.y - uPlayer.y), 2.0);
  disp.xz += (tp / max(pd, 0.001)) * push * 0.6 * hh;
  disp.y -= push * 0.25 * hh;
  float cdist = length(root.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(uGrassR * 0.7, uGrassR, cdist);
  mat3 r3 = mat3(modelMatrix * im);
  float s2 = dot(r3[0], r3[0]);
  transformed += (transpose(r3) * disp) / s2;
  transformed.y *= fade;
  vGW = wp;
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGH;\nvarying vec3 vGW;')
      .replace('#include <normal_fragment_begin>', NFB_NOFLIP())
      .replace('#include <color_fragment>', `#include <color_fragment>
{ float gn = jn2(vGW.xz * 0.12);
  vec3 base = mix(s2l(vec3(0.21, 0.33, 0.08)), s2l(vec3(0.27, 0.39, 0.09)), gn);
  vec3 tip = mix(s2l(vec3(0.40, 0.58, 0.17)), s2l(vec3(0.56, 0.64, 0.22)), jn2(vGW.xz * 0.3 + 7.0));
  diffuseColor.rgb *= mix(base, tip, smoothstep(0.0, 1.0, vGH)) * (0.8 + 0.2 * vGH) * (1.0 - uWet * 0.15); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * uAmbF * (0.6 + 0.6 * vGH);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{ vec3 vd = normalize(vGW - cameraPosition);
  float bl = pow(max(dot(vd, uSunDir), 0.0), 4.0);
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.1, 1.2, 0.6) * jDirAcc * bl * vGH * 0.55; }`);
  });
}

export function rockMat() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  return patch(m, 'rock', sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + WP_V + WN_V);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\n${BUMP}\nfloat jRH;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 wn = normalize(vWN);
  float n = jfbm2(vWP.xz * 0.7 + vWP.y * 0.45);
  vec3 rc = mix(s2l(vec3(0.47, 0.45, 0.40)), s2l(vec3(0.29, 0.28, 0.26)), n);
  float moss = smoothstep(0.35, 0.8, wn.y + (jn2(vWP.xz * 1.2 + vWP.y) - 0.5) * 0.6);
  rc = mix(rc, s2l(vec3(0.21, 0.33, 0.08)) * (0.8 + 0.4 * jn2(vWP.xz * 6.0)), moss);
  float wetR = smoothstep(0.6, 0.0, vWP.y);
  rc *= 1.0 - wetR * 0.4;
  diffuseColor.rgb *= rc;
  jRH = n * 0.8 + jn2(vWP.xz * 7.0 + vWP.y * 5.0) * 0.15; }`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = jBump(-vViewPosition, normal, jRH);');
  });
}
