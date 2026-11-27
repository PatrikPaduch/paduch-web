// Textúrák és anyagok (valósághű stílus). Erős gépen normál- és érdességtérképek is, gyengén csak színtérkép.
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export const U = { uTime: { value: 0 } };       // közös idő a szél- és víz-shaderekhez
let sd = 1; const sr = () => (sd = (sd * 16807) % 2147483647, (sd - 1) / 2147483646), R = (a, b) => a + sr() * (b - a);

export function canvasTex(w, h, draw, { repeat = true, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.generateMipmaps = true; return t;
}

/* ---------- vászon-textúrák ---------- */
const brickTex = () => canvasTex(512, 512, (g, w) => {
  sd = 13; const rows = 8, bh = w / rows, bw = w / 4; g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, w);
  for (let r = 0; r < rows; r++) for (let c = -1; c < 5; c++) {
    const x = c * bw + (r % 2) * bw / 2, l = R(-14, 10); g.fillStyle = `hsl(${32 + R(-4, 4)},${40 + R(-6, 6)}%,${68 + l / 2}%)`; g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(80,50,20,${R(.03, .1)})`; g.fillRect(x + R(3, bw - 6), r * bh + R(3, bh - 6), R(2, 8), R(1, 4)); }
  }
});
// nagy kőlapok (sétányok): szabálytalan téglalapok
const paveTex = () => canvasTex(1024, 1024, (g, w) => {
  sd = 3; g.fillStyle = '#6d5a44'; g.fillRect(0, 0, w, w);
  const rows = 6; let y = 0;
  for (let r = 0; r < rows; r++) {
    const h = w / rows; let x = -R(0, 120);
    while (x < w) {
      const ww = R(120, 260), l = R(-10, 10);
      g.fillStyle = `hsl(${36 + R(-5, 5)},${30 + R(-6, 6)}%,${72 + l}%)`; g.fillRect(x + 4, y + 4, ww - 8, h - 8);
      if (x + ww > w) { g.fillRect(x + 4 - w, y + 4, ww - 8, h - 8); }
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(70,50,30,${R(.02, .08)})`; g.beginPath(); g.arc(x + R(8, ww - 8), y + R(8, h - 8), R(2, 9), 0, 6.3); g.fill(); }
      x += ww;
    }
    y += h;
  }
});
const glazeTex = () => canvasTex(256, 256, (g, w) => {
  sd = 5; const bh = 32, bw = 64;
  for (let r = 0; r < w / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
    const x = c * bw + (r % 2) * bw / 2, l = R(-12, 12);
    g.fillStyle = `hsl(${214 + R(-4, 4)},${68 + R(-6, 6)}%,${36 + l / 3}%)`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 4, r * bh + 4, bw - 10, 5);
  }
  g.fillStyle = 'rgba(30,20,10,.6)'; for (let r = 0; r <= w / bh; r++) g.fillRect(0, r * bh - 1, w, 3);
});
// mázas fal arany oroszlánnal (az Istár-kapu és a processziós út díszítése)
const lionTex = () => canvasTex(512, 256, (g, w, h) => {
  sd = 6; const bh = 32, bw = 64;
  for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) { const x = c * bw + (r % 2) * bw / 2; g.fillStyle = `hsl(${214 + R(-4, 4)},${66 + R(-6, 6)}%,${34 + R(-4, 4)}%)`; g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4); }
  g.save(); g.translate(w / 2, h * .58); g.fillStyle = '#e8b64a'; g.strokeStyle = '#8a5a12'; g.lineWidth = 4;
  g.beginPath(); // stilizált lépő oroszlán
  g.moveTo(-170, 10); g.quadraticCurveTo(-150, -50, -60, -48); g.lineTo(80, -50); g.quadraticCurveTo(120, -90, 165, -70); g.quadraticCurveTo(190, -40, 160, -20);
  g.lineTo(150, 0); g.lineTo(150, 70); g.lineTo(130, 70); g.lineTo(125, 15); g.lineTo(70, 20); g.lineTo(60, 70); g.lineTo(40, 70); g.lineTo(38, 18);
  g.lineTo(-90, 18); g.lineTo(-100, 70); g.lineTo(-120, 70); g.lineTo(-118, 20); g.lineTo(-140, 15); g.lineTo(-150, 70); g.lineTo(-170, 70); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-170, 10); g.quadraticCurveTo(-215, -10, -205, -60); g.stroke();
  g.fillStyle = '#c8822a'; g.beginPath(); g.arc(150, -55, 34, 0, 6.3); g.fill(); g.restore();
  g.fillStyle = '#f2d27a'; for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, 14, 6, 0, 6.3); g.fill(); g.beginPath(); g.arc(x, h - 14, 6, 0, 6.3); g.fill(); }
});
const streakTex = () => canvasTex(64, 256, (g, w, h) => {
  sd = 9; g.clearRect(0, 0, w, h);
  for (let i = 0; i < 80; i++) { const x = R(0, w), y = R(0, h), l = R(20, 90); const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, `rgba(255,255,255,${R(.35, .9)})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x, y, R(1.5, 4), l); g.fillRect(x, y - h, R(1.5, 4), l); }
  g.globalCompositeOperation = 'destination-over'; g.fillStyle = 'rgba(200,240,255,.4)'; g.fillRect(0, 0, w, h);
});
const waterNormalTex = () => canvasTex(256, 256, (g, w) => {
  const img = g.createImageData(w, w), H = (x, y) => Math.sin(x * .098 + y * .049) * .6 + Math.sin(x * .0245 - y * .098) * .8 + Math.sin((x + y) * .147) * .3 + Math.sin(x * .27 - y * .196) * .15;
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1), l = Math.hypot(dx, dy, 2), i = (y * w + x) * 4;
    img.data[i] = (-dx / l * .5 + .5) * 255; img.data[i + 1] = (-dy / l * .5 + .5) * 255; img.data[i + 2] = (2 / l * .5 + .5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, { srgb: false });
const frondTex = () => canvasTex(512, 128, (g, w, h) => {
  sd = 11; g.clearRect(0, 0, w, h); g.lineCap = 'round';
  for (let x = 10; x < w - 6; x += 7) {
    const k = 1 - x / w, len = 14 + 44 * Math.sin(Math.PI * Math.min(1, x / w * 1.1));
    for (const s of [-1, 1]) { g.strokeStyle = `hsl(${92 + R(-8, 10)},${48 + R(-8, 8)}%,${30 + R(-6, 9)}%)`; g.lineWidth = 5 * (.5 + k * .6); g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 12, h / 2 + s * len * .5, x + 26, h / 2 + s * len); g.stroke(); }
  }
  g.strokeStyle = '#7a6a34'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
}, { repeat: false });
// fűcsomó: sok vékony szál
const grassTex = () => canvasTex(256, 256, (g, w, h) => {
  sd = 17; g.clearRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = R(20, w - 20), top = R(10, h * .55), bend = R(-30, 30);
    g.strokeStyle = `hsl(${78 + R(-12, 16)},${40 + R(-10, 12)}%,${26 + R(-6, 16)}%)`; g.lineWidth = R(2, 4.5);
    g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + bend * .3, (h + top) / 2, x + bend, top); g.stroke();
  }
}, { repeat: false });
// virágok: szár + virágfej, típusonként más szín és forma
const FLOWERS = { white: ['#fbfbf2', '#f2d24a'], yellow: ['#f6c623', '#c8780a'], red: ['#d8262c', '#3a1210'], purple: ['#8a4fd0', '#f2e0a0'], orange: ['#f08a24', '#7a3a08'], pink: ['#f06aa8', '#ffe38a'], magenta: ['#d0217a', '#ffd0e8'] };
const flowerTex = (key) => canvasTex(128, 256, (g, w, h) => {
  sd = 23 + key.length; g.clearRect(0, 0, w, h); const [pc, cc] = FLOWERS[key];
  for (let i = 0; i < 3; i++) {
    const x = w / 2 + R(-30, 30), top = R(40, 120);
    g.strokeStyle = '#4d7a2c'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2 + R(-6, 6), h); g.quadraticCurveTo(x, (h + top) / 2, x, top); g.stroke();
    g.fillStyle = '#5a8a34'; g.beginPath(); g.ellipse(x + 8, (h + top) / 2 + 20, 10, 4, .6, 0, 6.3); g.fill();
    const n = key === 'magenta' ? 3 : 7, rr = key === 'magenta' ? 13 : R(11, 16);
    g.fillStyle = pc; for (let k = 0; k < n; k++) { const a = k / n * 6.28; g.beginPath(); g.ellipse(x + Math.cos(a) * rr * .75, top + Math.sin(a) * rr * .75, rr * .62, rr * .34, a, 0, 6.3); g.fill(); }
    g.fillStyle = cc; g.beginPath(); g.arc(x, top, rr * .32, 0, 6.3); g.fill();
  }
}, { repeat: false });
// levendula: zöld szárak, lila kalászok
const lavenderTex = () => canvasTex(128, 256, (g, w, h) => {
  sd = 29; g.clearRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) {
    const x0 = w / 2 + R(-10, 10), x = w / 2 + R(-50, 50), top = R(20, 90);
    g.strokeStyle = '#6a8a4a'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo((x0 + x) / 2, (h + top) / 2, x, top + 40); g.stroke();
    for (let k = 0; k < 9; k++) { g.fillStyle = `hsl(${268 + R(-8, 8)},${48 + R(-8, 8)}%,${52 + R(-8, 10)}%)`; g.beginPath(); g.ellipse(x + R(-2, 2), top + k * 5, 4, 3, 0, 0, 6.3); g.fill(); }
  }
}, { repeat: false });
// nád / papirusz
const reedTex = () => canvasTex(128, 512, (g, w, h) => {
  sd = 31; g.clearRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x0 = w / 2 + R(-12, 12), x = w / 2 + R(-40, 40), top = R(20, 160);
    g.strokeStyle = `hsl(${80 + R(-10, 10)},${38 + R(-8, 8)}%,${30 + R(-4, 10)}%)`; g.lineWidth = R(2.5, 4); g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo((x0 + x) / 2, (h + top) / 2, x, top); g.stroke();
    if (sr() < .45) { g.strokeStyle = '#8a9a4a'; g.lineWidth = 1.5; for (let k = 0; k < 14; k++) { const a = -Math.PI / 2 + R(-1.2, 1.2); g.beginPath(); g.moveTo(x, top); g.lineTo(x + Math.cos(a) * 22, top + Math.sin(a) * 22); g.stroke(); } }
  }
}, { repeat: false });

/* ---------- betöltött textúrák ---------- */
export const TEX = {};
export async function loadTextures(renderer, onFile) {
  const L = new THREE.TextureLoader(), files = {
    rockN: ['rock_face_03_nor.webp', 0], rockA: ['rock_face_03_arm.webp', 0], grassD: ['leafy_grass_diff.webp', 1], grassN: ['leafy_grass_nor.webp', 0],
    grassA: ['leafy_grass_arm.webp', 0], barkD: ['palm_tree_bark_diff.webp', 1], barkN: ['palm_tree_bark_nor.webp', 0],
    leafD: ['island_tree_01_leaves_diff_2k.webp', 1, 1], leafA: ['island_tree_01_leaves_alpha_2k.webp', 0, 1],
    leaf2D: ['pachira_leaves_diff_2k.webp', 1, 1], leaf2A: ['pachira_leaves_alpha_2k.webp', 0, 1], soilD: ['forest_leaves_02_diff.webp', 1],
  };
  await Promise.all(Object.entries(files).map(([k, [f, srgb, clamp]]) => L.loadAsync('assets/tex/' + f).then(t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (!clamp) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; TEX[k] = t; onFile && onFile();
  })));
  const hdr = await new RGBELoader().loadAsync('assets/tex/rainforest_trail_1k.hdr'); onFile && onFile();
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); TEX.env = pm.fromEquirectangular(hdr).texture; pm.dispose(); hdr.dispose();
  Object.assign(TEX, {
    brick: brickTex(), pave: paveTex(), glaze: glazeTex(), lion: lionTex(), streak: streakTex(), wn: waterNormalTex(), frond: frondTex(),
    grassCard: grassTex(), lavender: lavenderTex(), reed: reedTex(), flower: Object.fromEntries(Object.keys(FLOWERS).map(k => [k, flowerTex(k)])),
  });
  TEX.barkD.repeat.set(1, 3); TEX.barkN.repeat.set(1, 3);
  return TEX;
}
export const FLOWER_KEYS = Object.keys(FLOWERS);

/* ---------- szél: a növények csúcsa hajladozik (a gyökér/rögzítési pont áll) ---------- */
export function wind(mat, amp = .06, hang = false) {
  if (mat.userData.wind) return mat; mat.userData.wind = true;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev && prev.call(mat, sh, r);
    if (sh.vertexShader.includes("uniform float uTime;")) return;   // már rajta van (közös GLTF-anyag), ne fűzzük rá még egyszer
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wpo = vec4(0., 0., 0., 1.);
      #ifdef USE_INSTANCING
        wpo = instanceMatrix * wpo;
      #endif
      wpo = modelMatrix * wpo;
      float hgt = ${hang ? '-position.y' : 'position.y'};
      float sw = (sin(uTime * 1.6 + wpo.x * .31 + wpo.z * .17) + .45 * sin(uTime * 2.7 + wpo.x * .9 + wpo.z * .5)) * ${amp.toFixed(3)} * max(0., hgt);
      transformed.x += sw; transformed.z += sw * .55;`);
  };
  mat.customProgramCacheKey = () => 'wind' + amp + hang;
  return mat;
}

/* ---------- anyagok ---------- */
export function makeMats(q) {
  const T = TEX, maps = q.maps, std = o => new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0, ...o });
  const nrm = (t, s = .7) => maps ? { normalMap: t, normalScale: new THREE.Vector2(s, s) } : {};
  const card = (map, alphaMap, o = {}) => std({ map, alphaMap, alphaTest: .45, side: THREE.DoubleSide, roughness: .8, ...o });
  const M = {
    brick: std({ map: T.brick, ...nrm(T.rockN), ...(maps ? { roughnessMap: T.rockA } : {}), roughness: 1 }),
    brick2: std({ color: '#e8cfae', map: T.brick, ...nrm(T.rockN) }),
    stair: std({ color: '#fff3e0', map: T.brick, ...nrm(T.rockN, .45) }),
    pave: std({ map: T.pave, ...nrm(T.rockN, .35), roughness: .85 }),
    grass: std({ color: '#cfe3a8', map: T.grassD, ...nrm(T.grassN), ...(maps ? { roughnessMap: T.grassA } : {}), roughness: 1 }),
    soil: std({ color: '#b89a7a', map: T.soilD, roughness: 1 }),
    sand: std({ color: '#c7a070', ...nrm(T.rockN, .4), roughness: 1 }),
    glaze: std({ map: T.glaze, roughness: .25, metalness: .05 }),
    lion: std({ map: T.lion, roughness: .25, metalness: .05 }),
    gold: std({ color: '#e0a830', metalness: .85, roughness: .28 }),
    dark: std({ color: '#2a1c12', roughness: 1 }),
    column: std({ color: '#f4ead6', map: T.brick, ...nrm(T.rockN, .3), roughness: .7 }),
    marble: std({ color: '#f2ede4', roughness: .35 }),
    wood: std({ color: '#8a6040', map: T.barkD, roughness: .85 }),
    bronze: std({ color: '#8a5a2a', metalness: .7, roughness: .4 }),
    terracotta: std({ color: '#b8643a', roughness: .8 }),
    bark: std({ color: '#b7a58e', map: T.barkD, ...nrm(T.barkN), roughness: .95 }),
    palmBark: std({ map: T.barkD, ...nrm(T.barkN), roughness: .95 }),
    water: std({ color: '#2c7488', roughness: .05, metalness: .1, transparent: true, opacity: .88, ...(maps ? { normalMap: T.wn, normalScale: new THREE.Vector2(.3, .3) } : {}) }),
    fall: std({ color: '#e8fbff', map: T.streak, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, emissive: '#9fdcf0', emissiveIntensity: .25, roughness: .2 }),
    hedge: std({ color: '#5d8a46', map: T.grassD, ...nrm(T.grassN, 1.2), roughness: 1 }),
    rock: std({ color: '#9a8a76', ...nrm(T.rockN, 1), roughness: .95 }),
    fruit: std({ color: '#b8222a', roughness: .5 }),
    lamp: std({ color: '#ffe6b0', emissive: '#ffa13a', emissiveIntensity: .15, roughness: .35 }),
    date: std({ color: '#9a5418', roughness: .55 }),
    lotusPad: std({ color: '#4c7a32', roughness: .6, side: THREE.DoubleSide }),
    // levélkártyák, széllel
    leaf: wind(card(T.leafD, T.leafA, { color: '#ffffff' }), .045),
    leaf2: wind(card(T.leaf2D, T.leaf2A, { color: '#ffffff' }), .05),
    vine: wind(card(T.leafD, T.leafA, { color: '#d8ecb8' }), .05, true),
    willow: wind(card(T.leaf2D, T.leaf2A, { color: '#cfe0a0' }), .09, true),
    frond: wind(card(T.frond, null, { color: '#ffffff' }), .035),
    grassCard: wind(card(T.grassCard, null, { color: '#ffffff' }), .12),
    lavender: wind(card(T.lavender, null), .1),
    reed: wind(card(T.reed, null), .06),
  };
  M.flower = {}; for (const k of FLOWER_KEYS) M.flower[k] = wind(card(T.flower[k], null), .1);
  return M;
}
