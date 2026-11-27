// Nabukodonozor palotája a nyugati városfalon túl (minta: a babiloni Déli Palota). 1. kör (3D minta):
// palotakapu, előudvar, díszlépcső oroszlánokkal, a két terasz, a trónterem-udvar a kék pálmaoszlopos homlokzattal,
// és a trónterem belül (trónfülke, emelvény, király, udvaroncok, parázstartók, függőlámpák, fénysávok).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, collider, rectCollider, R, pick } from './world.js';
import { worldUV, LANTERNS, instanced } from './build.js';
import { TEX } from './mats.js';
import { makePerson } from './hero.js';
import { CITY_NPC, CITY_TRIG } from './city.js';

export const PAL_LIGHTS = [];
export const PAL_BLDG = [];     // épületek alaprajza a térképhez [x0, z0, x1, z1, szín]   // a trónterem függőlámpái (bent nappal is ezek kapják a pontfényeket)

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// a trónterem homlokzata: mázas kék tégla, sárga-fehér pálmaoszlopok, rozettasor, alul oroszlánsor (12,5 m széles, 15 m magas csempe)
function facadeTex() {
  return tex(1024, 1228, (g, W, H) => {
    const bw = 64, bh = 26;
    for (let y = 0; y < H; y += bh) for (let x = -((y / bh) % 2) * bw / 2; x < W; x += bw) { const l = 34 + Math.random() * 14; g.fillStyle = `hsl(${218 + Math.random() * 8},${62 + Math.random() * 10}%,${l}%)`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3); }
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < H; y += bh) g.fillRect(0, y + 2, W, 4);
    const Y = '#f0c43a', Wt = '#f4ead0', Dk = '#1a2a5a';
    const rosette = (cx, cy, r) => { g.fillStyle = Wt; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .42, r * .2, a, 0, 6.3); g.fill(); } g.fillStyle = Y; g.beginPath(); g.arc(cx, cy, r * .3, 0, 6.3); g.fill(); };
    const band = (y0, h) => { g.fillStyle = Wt; g.fillRect(0, y0, W, 6); g.fillRect(0, y0 + h - 6, W, 6); for (let x = 32; x < W; x += 64) rosette(x, y0 + h / 2, h * .42); };
    band(40, 70); band(H - 330, 60);
    // pálmaoszlopok: törzs, egymásra rakott voluták, pálmalevél-korona
    const palm = cx => {
      const top = 150, bot = H - 350;
      g.fillStyle = Y; g.fillRect(cx - 9, top + 60, 18, bot - top - 60);
      g.strokeStyle = Dk; g.lineWidth = 3; g.strokeRect(cx - 9, top + 60, 18, bot - top - 60);
      for (let y = top + 120; y < bot - 20; y += 150) {
        for (const s of [-1, 1]) { g.fillStyle = Wt; g.beginPath(); g.arc(cx + s * 22, y, 20, 0, 6.3); g.fill(); g.fillStyle = Y; g.beginPath(); g.arc(cx + s * 22, y, 11, 0, 6.3); g.fill(); g.fillStyle = Dk; g.beginPath(); g.arc(cx + s * 22, y, 4, 0, 6.3); g.fill(); }
        g.fillStyle = Wt; g.fillRect(cx - 34, y + 22, 68, 8);
      }
      for (let k = -4; k <= 4; k++) { const a = -Math.PI / 2 + k * .22; g.strokeStyle = k % 2 ? Y : Wt; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, top + 70); g.quadraticCurveTo(cx + Math.cos(a) * 60, top + 70 + Math.sin(a) * 90, cx + Math.cos(a) * 92, top + 70 + Math.sin(a) * 30 + 40); g.stroke(); }
      for (const s of [-1, 1]) { g.fillStyle = Wt; g.beginPath(); g.arc(cx + s * 26, top + 76, 22, 0, 6.3); g.fill(); g.fillStyle = Y; g.beginPath(); g.arc(cx + s * 26, top + 76, 12, 0, 6.3); g.fill(); }
    };
    palm(W * .25); palm(W * .75);
    // oroszlánsor
    const ly = H - 170;
    g.fillStyle = Wt; g.fillRect(0, ly - 92, W, 5); g.fillRect(0, ly + 70, W, 5);
    for (let x = 110; x < W; x += 400) {
      g.fillStyle = Y;
      g.beginPath(); g.ellipse(x, ly, 120, 42, 0, 0, 6.3); g.fill();
      g.beginPath(); g.ellipse(x + 118, ly - 34, 46, 50, -.3, 0, 6.3); g.fill();
      g.fillStyle = '#e0a020'; g.beginPath(); g.ellipse(x + 130, ly - 26, 28, 30, 0, 0, 6.3); g.fill();
      g.fillStyle = Y; for (const lx of [-80, -40, 50, 90]) g.fillRect(x + lx - 10, ly + 20, 20, 52);
      g.strokeStyle = Y; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 118, ly - 8); g.quadraticCurveTo(x - 170, ly - 60, x - 150, ly - 92); g.stroke();
      g.fillStyle = Dk; g.beginPath(); g.arc(x + 146, ly - 36, 5, 0, 6.3); g.fill();
    }
  });
}
const carpetTex = () => tex(128, 512, (g, w, h) => { g.fillStyle = '#7a1420'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8a830'; g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillStyle = '#1f3a6a'; g.fillRect(14, 0, 6, h); g.fillRect(w - 20, 0, 6, h); for (let y = 30; y < h; y += 64) { g.fillStyle = '#d8a830'; g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 + 22, y + 22); g.lineTo(w / 2, y + 44); g.lineTo(w / 2 - 22, y + 22); g.closePath(); g.fill(); g.fillStyle = '#1f3a6a'; g.beginPath(); g.arc(w / 2, y + 22, 7, 0, 6.3); g.fill(); } });
const beamTex = () => tex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(.15, 'rgba(255,240,200,.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const flameTex = () => tex(64, 128, (c) => { const g = c.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(.25, 'rgba(255,190,70,.95)'); g.addColorStop(.6, 'rgba(255,90,20,.45)'); g.addColorStop(1, 'rgba(255,40,0,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(32, 2); c.bezierCurveTo(60, 60, 62, 120, 32, 126); c.bezierCurveTo(2, 120, 4, 60, 32, 2); c.fill(); });

export function buildPalace(M, q) {
  const root = new THREE.Group(), geos = {}, trig = (w, x, z, r, y = 0) => CITY_TRIG.push({ w, x, z, r, y });
  const add = (k, g) => { (geos[k] ||= []).push(g); return g; };
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(k, g); };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); return add(k, g); };
  const nrm = s => q.maps ? { normalMap: TEX.rockN, normalScale: new THREE.Vector2(s, s) } : {};
  const MM = {
    mud: new THREE.MeshStandardMaterial({ color: '#c8a678', map: TEX.brick, ...nrm(.7), roughness: .95 }),
    pave: new THREE.MeshStandardMaterial({ color: '#d6c8ac', map: TEX.pave, ...nrm(.45), roughness: .8 }),
    floor: new THREE.MeshStandardMaterial({ color: '#cbb894', map: TEX.pave, ...nrm(.3), roughness: .55 }),
    stone: new THREE.MeshStandardMaterial({ color: '#eadfc6', map: TEX.brick, ...nrm(.25), roughness: .7 }),
    facade: new THREE.MeshStandardMaterial({ map: facadeTex(), roughness: .22, metalness: .05 }),
    cedar: new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: .8 }),
    ceil: new THREE.MeshStandardMaterial({ color: '#3a2616', roughness: .9 }),
    sky: new THREE.MeshBasicMaterial({ color: '#fff4d6' }),
    hedge: new THREE.MeshStandardMaterial({ color: '#3f6a2a', roughness: .9 }),
  };
  MM.facade.map.wrapS = THREE.RepeatWrapping;
  const UVS = { mud: 3, pave: 6, floor: 5, stone: 3, glaze: 2 };
  const col = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
  const { gate: G, fore: F, st1: S1, l1: L1, st2: S2, l2: L2, hall: HL } = PAL;
  const people = [], FL = [], flameM = new THREE.SpriteMaterial({ map: flameTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const flame = (x, y, z, w = .4, h = .7) => { const s = new THREE.Sprite(flameM); s.position.set(x, y, z); s.scale.set(w, h, 1); s.renderOrder = 4; root.add(s); FL.push({ s, w, h, ph: R(0, 6) }); };
  const brazier = (x, y, z) => { cyl('bronze', x, y, z, .05, .05, .9, 6); const b = new THREE.Mesh(new THREE.CylinderGeometry(.42, .22, .32, 14, 1, true), col('#5a3a1a', { metalness: .7, roughness: .4, side: THREE.DoubleSide })); b.position.set(x, y + 1.05, z); root.add(b); const c = new THREE.Mesh(new THREE.CircleGeometry(.38, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a0a00', emissive: '#ff5a10', emissiveIntensity: 1.8 })); c.position.set(x, y + 1.17, z); root.add(c); flame(x, y + 1.5, z, .55, .85); collider(x, z, .5); };
  // stilizált oroszlánszobor (ülő, mint egy szfinx)
  const lionStatue = (x, y, z, ry, mat = M.bronze) => {
    const g = new THREE.Group(), S = (sx, sy, sz, px, py, pz) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat); o.scale.set(sx, sy, sz); o.position.set(px, py, pz); o.castShadow = true; g.add(o); };
    { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, 2.4), MM.stone); p.position.y = .45; p.castShadow = true; g.add(p); }
    const C = (r, len, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), mat); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
    C(.3, 1.1, 0, 1.22, -.2, Math.PI / 2);                                   // fekvő törzs
    S(.36, .3, .4, 0, 1.2, -.75);                                            // far
    for (const s of [-1, 1]) { S(.17, .2, .32, s * .25, 1.12, -.72); C(.085, .5, s * .2, .99, .62, Math.PI / 2); S(.1, .07, .13, s * .2, .96, .95); }   // comb, előrenyújtott mancsok
    { const mn = new THREE.Mesh(new THREE.TorusGeometry(.26, .16, 10, 18), mat); mn.position.set(0, 1.58, .42); mn.rotation.x = .25; mn.castShadow = true; g.add(mn); }   // sörény
    S(.4, .42, .22, 0, 1.58, .36);                                           // sörény háta
    S(.2, .21, .24, 0, 1.62, .55); S(.12, .1, .13, 0, 1.53, .74);            // fej, pofa
    for (const s of [-1, 1]) { S(.05, .06, .03, s * .14, 1.82, .48); S(.035, .035, .03, s * .08, 1.68, .73); }   // fülek, szemek
    C(.035, .7, -.34, 1.05, -1.1, 1.2, 0, .5);                                // farok
    g.position.set(x, y, z); g.rotation.y = ry; root.add(g); collider(x, z, 1.1);
  };

  /* ---------- palotakapu a városfalban: két mázas torony, kapuív ---------- */
  for (const [za, zb] of [[G.z0 - 3.2, G.z0], [G.z1, G.z1 + 3.2]]) { box('glaze', -83.6, 0, za, -78.6, 11, zb); box('mud', -84, 11, za - .2, -78.2, 11.8, zb + .2); for (let z = za; z < zb; z += 1.07) box('mud', -84, 11.8, z, -78.2, 12.6, z + .6); }
  box('glaze', -83.6, 7.2, G.z0, -78.6, 11, G.z1); box('gold', -78.55, 6.9, G.z0, -78.5, 7.2, G.z1);
  for (const z of [G.z0 - 1.6, G.z1 + 1.6]) { const pg = new THREE.PlaneGeometry(2.6, 1.3); pg.rotateY(Math.PI / 2); pg.translate(-78.55, 4.2, z); const m = new THREE.Mesh(pg, M.lion); root.add(m); }
  rectCollider(-83.8, G.z0 - 3.4, -78.4, G.z0 - .05); rectCollider(-83.8, G.z1 + .05, -78.4, G.z1 + 3.4);
  trig('palace', -76, 149.5, 4); trig('gate', -86, 146, 2.6);

  /* ---------- előudvar és díszlépcső ---------- */
  box('pave', F.x0, 0, F.z0, F.x1, .05, F.z1);
  for (const z of [F.z0 - .6, F.z1]) box('mud', F.x0, 0, z, F.x1, 4, z + .6);
  rectCollider(F.x0, F.z0 - .6, F.x1, F.z0); rectCollider(F.x0, F.z1, F.x1, F.z1 + .6);
  const N1 = 14; for (let k = 0; k < N1; k++) { const xa = S1.x1 - (k + 1) * (S1.x1 - S1.x0) / N1, xb = S1.x1 - k * (S1.x1 - S1.x0) / N1; box('stone', xa, 0, S1.z0, xb, (k + 1) * L1.h / N1, S1.z1); }
  for (const [za, zb] of [[S1.z0 - .9, S1.z0], [S1.z1, S1.z1 + .9]]) { for (let k = 0; k < N1; k++) { const xa = S1.x1 - (k + 1) * (S1.x1 - S1.x0) / N1, xb = S1.x1 - k * (S1.x1 - S1.x0) / N1; box('glaze', xa, 0, za, xb, (k + 1) * L1.h / N1 + 1.1, zb); } rectCollider(S1.x0, za, S1.x1, zb); }
  lionStatue(-90.6, 0, S1.z0 - 1.7, -Math.PI / 2); lionStatue(-90.6, 0, S1.z1 + 1.7, -Math.PI / 2);
  // fáklyák: nappal is égnek, éjjel a legközelebbiek valódi fényt kapnak (LANTERNS)
  const torch = (x, y, z, h = 2.2) => { cyl('bronze', x, y, z, .1, .06, h, 8); cyl('bronze', x, y + h, z, .1, .2, .22, 10); flame(x, y + h + .5, z, .42, .75); LANTERNS.push([x, y + h + .4, z]); collider(x, z, .25); };
  for (const z of [S1.z0 - .45, S1.z1 + .45]) torch(S1.x0 + .3, L1.h + 1.1, z, 1.2);
  for (const z of [143.2, 155.8]) torch(-86.5, 0, z); for (const z of [S1.z0 - .45, S1.z1 + .45]) torch(S1.x1 - .3, .5, z, 1.4);
  trig('staircase', -96, 149.5, 4); trig('lion', -89, S1.z0 - 2.6, 2.8);

  /* ---------- 1. szint (a külső és a középső udvar egyelőre csak burkolat és falak) ---------- */
  box('mud', L1.x0, -1, L1.z0, L1.x1, L1.h, L1.z1); box('pave', L1.x0, L1.h, L1.z0, L1.x1, L1.h + .05, L1.z1);
  box('glaze', L1.x1 - .02, L1.h - 1.3, L1.z0, L1.x1 + .06, L1.h - .6, S1.z0); box('glaze', L1.x1 - .02, L1.h - 1.3, S1.z1, L1.x1 + .06, L1.h - .6, L1.z1);
  const parapet = (x0, z0, x1, z1, y) => { box('mud', x0, y, z0, x1, y + .9, z1); const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0); const len = alongX ? x1 - x0 : z1 - z0; for (let u = 0; u < len - .5; u += 1.4) { if (alongX) box('mud', x0 + u, y + .9, z0, x0 + u + .7, y + 1.4, z1); else box('mud', x0, y + .9, z0 + u, x1, y + 1.4, z0 + u + .7); } rectCollider(Math.min(x0, x1) - .1, Math.min(z0, z1) - .1, Math.max(x0, x1) + .1, Math.max(z0, z1) + .1); };
  parapet(L1.x0, L1.z0, L1.x1, L1.z0 + .6, L1.h); parapet(L1.x0, L1.z0, L1.x0 + .6, L1.z1, L1.h);
  parapet(L1.x1 - .6, L1.z0, L1.x1, S1.z0, L1.h); parapet(L1.x1 - .6, S1.z1, L1.x1, L1.z1, L1.h);
  parapet(L1.x0, L1.z1 - .6, L2.x0, L1.z1, L1.h); parapet(L2.x1, L1.z1 - .6, L1.x1, L1.z1, L1.h);
  // a külső és a középső udvar közti fal kapuval

  // pálmák a középső udvarban (helyőrzők a későbbi kerthez)
  const palms = [];
  for (let x = -198; x <= -152; x += 7.6) for (const z of [138.2, 170.5]) palms.push({ x, z });            // a középső udvar kertje
  for (const [x, z] of [[-250, 128], [-238, 134], [-226, 128], [-214, 134], [-250, 176], [-238, 170], [-226, 176], [-214, 170]]) palms.push({ x, z, y: L1.h + 15 });   // tetőkert a lakópalotán
  { const trunk = new THREE.CylinderGeometry(.17, .27, 1, 8, 6); trunk.translate(0, .5, 0); { const p = trunk.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + .3 * y * y); } trunk.computeVertexNormals(); }
    const fr = []; for (let k = 0; k < 10; k++) { const g = new THREE.PlaneGeometry(3, .9, 10, 1); g.rotateX(-Math.PI / 2); g.translate(1.5, 0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, .6 * x - .3 * x * x + Math.abs(z) * .3); } g.rotateY(k * Math.PI * 2 / 10); fr.push(g); } const crown = mergeGeometries(fr); crown.computeVertexNormals();
    { const tl = [], cl = []; for (const p of palms) { const H = R(6, 7.5), y = p.y ?? L1.h; tl.push({ x: p.x, y, z: p.z, sx: 1, sy: H, sz: 1 }); cl.push({ x: p.x + .3, y: y + H, z: p.z, s: 1.1, ry: R(0, 6) }); if (!p.y) collider(p.x, p.z, .4); } root.add(instanced(trunk, M.palmBark, tl)); root.add(instanced(crown, M.frond, cl)); } }

  /* ---------- lépcső a 2. szintre és a 2. szint ---------- */
  const N2 = 14; for (let k = 0; k < N2; k++) { const za = S2.z0 + k * (S2.z1 - S2.z0) / N2, zb = S2.z0 + (k + 1) * (S2.z1 - S2.z0) / N2; box('stone', S2.x0, L1.h - .2, za, S2.x1, L1.h + (k + 1) * (L2.h - L1.h) / N2, zb); }
  for (const [xa, xb] of [[S2.x0 - .9, S2.x0], [S2.x1, S2.x1 + .9]]) { for (let k = 0; k < N2; k++) { const za = S2.z0 + k * (S2.z1 - S2.z0) / N2, zb = S2.z0 + (k + 1) * (S2.z1 - S2.z0) / N2; box('glaze', xa, L1.h, za, xb, L1.h + (k + 1) * (L2.h - L1.h) / N2 + 1.1, zb); } rectCollider(xa, S2.z0, xb, S2.z1); }
  lionStatue(S2.x0 - 1.8, L1.h, S2.z0 - 1.4, Math.PI); lionStatue(S2.x1 + 1.8, L1.h, S2.z0 - 1.4, Math.PI);
  for (const x of [S2.x0 - 1.5, S2.x1 + 1.5]) torch(x, L1.h, S2.z0 - 3.6);
  for (const [x, z] of [[-110, 143.5], [-110, 155.5], [-135, 171], [-150, 143.5], [-150, 155.5], [-202, 143.5], [-202, 155.5]]) torch(x, L1.h, z);
  for (const [x, z] of [[-181.8, 201.2], [-168.2, 201.2], [-198, 188.5], [-152, 188.5], [-205, 225.5], [-145, 225.5], [-202, 212], [-148, 212]]) torch(x, L2.h, z);
  box('mud', L2.x0, -1, L2.z0, L2.x1, L2.h, L2.z1); box('pave', L2.x0, L2.h, L2.z0, HL.x0, L2.h + .05, L2.z1); box('pave', HL.x1, L2.h, L2.z0, L2.x1, L2.h + .05, L2.z1); box('pave', HL.x0, L2.h, L2.z0, HL.x1, L2.h + .05, HL.z0); box('pave', HL.x0, L2.h, HL.z1, HL.x1, L2.h + .05, L2.z1);
  // a 2. szint fala a folyó felé: mázas sávok és oroszlánfríz (a folyóról és a kikötőből is látszik)
  box('glaze', L2.x0, 1.4, L2.z1 - .02, L2.x1, 2.4, L2.z1 + .06); box('glaze', L2.x0, 5.4, L2.z1 - .02, L2.x1, 6.1, L2.z1 + .06);
  { const gs = []; for (let x = L2.x0 + 4; x < L2.x1 - 3; x += 6.2) { const g = new THREE.PlaneGeometry(5, 2.5); g.translate(x, 3.9, L2.z1 + .08); gs.push(g); } const m = new THREE.Mesh(mergeGeometries(gs), M.lion); m.receiveShadow = true; root.add(m); }
  box('glaze', L2.x0, L2.h - 1.3, L2.z0 - .06, S2.x0, L2.h - .6, L2.z0 + .02); box('glaze', S2.x1, L2.h - 1.3, L2.z0 - .06, L2.x1, L2.h - .6, L2.z0 + .02);
  parapet(L2.x0, L2.z0, S2.x0, L2.z0 + .6, L2.h); parapet(S2.x1, L2.z0, L2.x1, L2.z0 + .6, L2.h);
  parapet(L2.x0, L2.z0, L2.x0 + .6, L2.z1, L2.h); parapet(L2.x1 - .6, L2.z0, L2.x1, L2.z1, L2.h); parapet(L2.x0, L2.z1 - .6, L2.x1, L2.z1, L2.h);
  trig('terrace', -140, 225, 6);
  for (const [x, z] of [[-212, 224.5], [-138, 224.5], [-198, 200], [-152, 200]]) { const pot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.5, 0], [.68, .6], [.75, .75]].map(([a, b]) => new THREE.Vector2(a, b)), 14), M.terracotta); pot.position.set(x, L2.h, z); root.add(pot); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(.9, 1), col('#4f8a3a')); pl.position.set(x, L2.h + 1.4, z); root.add(pl); collider(x, z, .8); }

  /* ---------- trónterem-udvar: szökőkutak, zászlórudak, őrök ---------- */
  for (const fx of [-188, -162]) { const fz = 195.5, y = L2.h;
    const b = new THREE.LatheGeometry([[2.2, 0], [2.2, .55], [2.45, .62], [2.6, .58], [2.6, 0]].map(([a, c]) => new THREE.Vector2(a, c)), 36); b.translate(fx, y, fz); add('stone', b);
    const w = new THREE.Mesh(new THREE.CircleGeometry(2.2, 36).rotateX(-Math.PI / 2), M.water); w.position.set(fx, y + .45, fz); root.add(w);
    cyl('stone', fx, y, fz, .35, .25, 1.4, 14); cyl('glaze', fx, y + 1.4, fz, .25, .6, .25, 18);
    const j = new THREE.Mesh(new THREE.CylinderGeometry(.05, .4, 1.3, 12, 1, true), M.fall); j.position.set(fx, y + 1.0, fz); j.renderOrder = 2; root.add(j);
    collider(fx, fz, 2.8); }
  trig('fountain', -175, 195.5, 6);
  const banners = [];
  for (const bx of [-196, -184, -166, -154]) { const bz = 203; cyl('bronze', bx, L2.h, bz, .12, .08, 12, 8); const cl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5, 1, 6), col(bx < -175 ? '#22489a' : '#8a1f2a', { side: THREE.DoubleSide, roughness: .9 })); cl.geometry.translate(.85, -2.5, 0); cl.position.set(bx, L2.h + 11.6, bz); cl.castShadow = true; root.add(cl); banners.push(cl); collider(bx, bz, .3); }
  trig('banner', -175, 201.5, 5);

  /* ---------- a trónterem ---------- */
  const T = 1.5, H = 18, y0 = L2.h, dx0 = -178, dx1 = -172, dH = 9.5;     // falvastagság, belmagasság, főkapu
  // falak (kívül-belül mázas kék), a homlokzat külön texturált lapokkal
  box('glaze', HL.x0, y0, HL.z0, dx0, y0 + H, HL.z0 + T); box('glaze', dx1, y0, HL.z0, HL.x1, y0 + H, HL.z0 + T); box('glaze', dx0, y0 + dH, HL.z0, dx1, y0 + H, HL.z0 + T);
  box('glaze', HL.x0, y0, HL.z1 - T, dx0, y0 + H, HL.z1); box('glaze', dx1, y0, HL.z1 - T, HL.x1, y0 + H, HL.z1); box('glaze', dx0, y0 + dH, HL.z1 - T, dx1, y0 + H, HL.z1); box('glaze', dx0, y0, HL.z1 - .3, dx1, y0 + dH, HL.z1);
  box('glaze', HL.x0, y0, HL.z0, HL.x0 + T, y0 + H, HL.z1); box('glaze', HL.x1 - T, y0, HL.z0, HL.x1, y0 + H, HL.z1);
  rectCollider(HL.x0 - .1, HL.z0 - .1, dx0 + .2, HL.z0 + T + .1); rectCollider(dx1 - .2, HL.z0 - .1, HL.x1 + .1, HL.z0 + T + .1); rectCollider(HL.x0 - .1, HL.z1 - T - .1, HL.x1 + .1, HL.z1 + .1);
  rectCollider(HL.x0 - .1, HL.z0, HL.x0 + T + .1, HL.z1); rectCollider(HL.x1 - T - .1, HL.z0, HL.x1 + .1, HL.z1);
  // homlokzat (észak felé néz, a trónterem-udvarra)
  { const fz = HL.z0 - .02, parts = [[HL.x0, dx0, 0, 15], [dx1, HL.x1, 0, 15], [dx0, dx1, dH, 15]], gs = [];
    for (const [xa, xb, ya, yb] of parts) { const g = new THREE.PlaneGeometry(xb - xa, yb - ya); g.rotateY(Math.PI); g.translate((xa + xb) / 2, y0 + (ya + yb) / 2, fz); const p = g.attributes.position, uv = g.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) - HL.x0) / 12.5, (p.getY(k) - y0) / 15); gs.push(g); }
    const m = new THREE.Mesh(mergeGeometries(gs), MM.facade); m.receiveShadow = true; root.add(m); }
  // aranyozott kapukeret, lépcsőzetes oromzat a falak tetején
  { const a = new THREE.TorusGeometry((dx1 - dx0) / 2 + .35, .22, 8, 24, Math.PI); a.translate((dx0 + dx1) / 2, y0 + dH - 3, HL.z0 - .15); add('gold', a); box('gold', dx0 - .57, y0, HL.z0 - .37, dx0 - .13, y0 + dH - 3, HL.z0 + .07); box('gold', dx1 + .13, y0, HL.z0 - .37, dx1 + .57, y0 + dH - 3, HL.z0 + .07); }
  box('glaze', HL.x0 - .3, y0 + 15, HL.z0 - .3, HL.x1 + .3, y0 + 15.6, HL.z0 + .1);
  const merlon = (x, z, alongX) => { const w = 1, d = 1.6; box('glaze', alongX ? x - w / 2 : x - d / 2, y0 + H, alongX ? z - d / 2 : z - w / 2, alongX ? x + w / 2 : x + d / 2, y0 + H + 1.2, alongX ? z + d / 2 : z + w / 2); box('glaze', alongX ? x - w / 4 : x - d / 2, y0 + H + 1.2, alongX ? z - d / 2 : z - w / 4, alongX ? x + w / 4 : x + d / 2, y0 + H + 2, alongX ? z + d / 2 : z + w / 4); };
  for (let x = HL.x0 + 1; x < HL.x1; x += 2.4) { merlon(x, HL.z0 + .75, true); merlon(x, HL.z1 - .75, true); }
  for (let z = HL.z0 + 3; z < HL.z1 - 1; z += 2.4) { merlon(HL.x0 + .75, z, false); merlon(HL.x1 - .75, z, false); }
  // tető, cédrusgerendák, magas ablakok (világos üveg-hatás) és ferde fénysávok
  box('ceil', HL.x0, y0 + H - .4, HL.z0, HL.x1, y0 + H, HL.z1);
  for (let x = HL.x0 + 2; x < HL.x1 - 1; x += 2.6) box('cedar', x - .25, y0 + H - 1.1, HL.z0 + T, x + .25, y0 + H - .4, HL.z1 - T);
  { const wins = []; for (let x = HL.x0 + 5; x < HL.x1 - 3; x += 7) { const g = new THREE.PlaneGeometry(2.2, 2.6); g.translate(x, y0 + H - 3.5, HL.z1 - T - .02); wins.push(g); } const wm = new THREE.Mesh(mergeGeometries(wins), MM.sky); root.add(wm);
    const bm = new THREE.MeshBasicMaterial({ map: beamTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (let x = HL.x0 + 5; x < HL.x1 - 3; x += 14) { const g = new THREE.PlaneGeometry(2.4, 15); g.rotateX(-.62); g.translate(x, y0 + H - 9.5, HL.z1 - T - 5.2); const b = new THREE.Mesh(g, bm); b.renderOrder = 5; root.add(b); } }
  // padló belül, vörös szőnyeg, emelvény, trón, oroszlánok
  box('floor', HL.x0 + T, y0, HL.z0 + T, HL.x1 - T, y0 + .06, HL.z1 - T);
  { const g = new THREE.PlaneGeometry(2.6, HL.z1 - HL.z0 - 6.5); g.rotateX(-Math.PI / 2); g.translate(-175, y0 + .075, (HL.z0 + HL.z1) / 2 - 1.6); const cm = new THREE.MeshStandardMaterial({ map: carpetTex(), roughness: .95 }); cm.map.wrapT = THREE.RepeatWrapping; cm.map.repeat.set(1, 4); const c = new THREE.Mesh(g, cm); c.receiveShadow = true; root.add(c); }
  box('stone', -180, y0, 216.6, -170, y0 + .35, HL.z1 - T); box('stone', -179, y0 + .35, 217.6, -171, y0 + .7, HL.z1 - T); box('gold', -180.05, y0 + .3, 216.55, -169.95, y0 + .36, 216.62);
  { const tx = -175, tz = 219.6, ty = y0 + .7; box('gold', tx - .85, ty, tz - .55, tx + .85, ty + .55, tz + .45); box('gold', tx - .85, ty + .55, tz + .25, tx + .85, ty + 2.9, tz + .45); box('gold', tx - 1, ty + .55, tz - .55, tx - .8, ty + 1.2, tz + .45); box('gold', tx + .8, ty + .55, tz - .55, tx + 1, ty + 1.2, tz + .45);
    const cu = new THREE.Mesh(new THREE.BoxGeometry(1.5, .14, .9), col('#8a1f2a')); cu.position.set(tx, ty + .62, tz - .05); root.add(cu);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.55, 24), M.gold); disc.position.set(tx, ty + 2.55, tz + .2); disc.rotation.y = Math.PI; root.add(disc); }
  { const a = new THREE.TorusGeometry(3.3, .2, 8, 24, Math.PI); a.translate(-175, y0 + dH - 3.2, HL.z1 - T + .1); add('gold', a); }
  lionStatue(-179.2, y0 + .7, 218.4, Math.PI, M.gold); lionStatue(-170.8, y0 + .7, 218.4, Math.PI, M.gold);
  rectCollider(-180.2, 216.4, -169.8, HL.z1);
  trig('throne', -175, 214, 3.6, y0); trig('crown', -175, 215.2, 2.2, y0);
  // függőlámpák (pontfény bent nappal is) és parázstartók a szőnyeg mentén
  for (let x = HL.x0 + 7; x < HL.x1 - 5; x += 9) for (const z of [HL.z0 + 5.5]) { const ly = y0 + 9.5; const ch = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, H - 10.5, 4), M.bronze); ch.position.set(x, ly + (H - 10.5) / 2, z); root.add(ch); const bw = new THREE.Mesh(new THREE.CylinderGeometry(.45, .2, .3, 14), M.bronze); bw.position.set(x, ly, z); root.add(bw); flame(x, ly + .35, z, .35, .55); PAL_LIGHTS.push([x, ly - .3, z]); }
  for (const z of [208.5, 212.5]) for (const x of [-179.5, -170.5]) brazier(x, y0, z);
  trig('brazier', -170.5, 210.5, 2.6, y0);
  // falikárpitok a hosszú falakon
  for (let x = HL.x0 + 6; x < HL.x1 - 4; x += 8.5) { if (Math.abs(x + 175) < 5) continue; for (const [z, ry] of [[HL.z0 + T + .05, 0], [HL.z1 - T - .05, Math.PI]]) { const g = new THREE.PlaneGeometry(2.4, 7); const m = new THREE.Mesh(g, col(x < -175 ? '#8a1f2a' : '#22489a', { roughness: .95 })); m.position.set(x, y0 + 5.5, z); m.rotation.y = ry; root.add(m); const gb = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .3), M.gold); gb.position.set(x, y0 + 2.2, z + (ry ? -.01 : .01)); gb.rotation.y = ry; root.add(gb); } }


  /* =================== A PALOTA TÖMEGE: szárnyak, kaputorony, lakópalota, kert, tornyok =================== */
  // lépcsőzetes csipkézés egy téglalap pereme mentén
  const crenels = (x0, z0, x1, z1, y, m = 'mud', step = 2.1) => {
    const one = (x, z) => { box(m, x - .45, y, z - .45, x + .45, y + .9, z + .45); box(m, x - .22, y + .9, z - .22, x + .22, y + 1.4, z + .22); };
    for (let x = x0 + .6; x <= x1 - .5; x += step) { one(x, z0 + .45); one(x, z1 - .45); }
    for (let z = z0 + .6 + step; z <= z1 - .5 - step; z += step) { one(x0 + .45, z); one(x1 - .45, z); }
  };
  // ablakok és ajtók: sötét bemélyedés egy homlokzaton (face: n z0, s z1, w x0, e x1)
  const inset = (face, x0, z0, x1, z1, c, w, y0b, y1b) => {
    const e = .03;
    if (face === 'n') box('dark', c - w / 2, y0b, z0 - e, c + w / 2, y1b, z0 + .02);
    if (face === 's') box('dark', c - w / 2, y0b, z1 - .02, c + w / 2, y1b, z1 + e);
    if (face === 'w') box('dark', x0 - e, y0b, c - w / 2, x0 + .02, y1b, c + w / 2);
    if (face === 'e') box('dark', x1 - .02, y0b, c - w / 2, x1 + e, y1b, c + w / 2);
  };
  // egy épületszárny: tömb, mázas sáv, csipkék, ablaksorok, ajtók
  const wing = (x0, z0, x1, z1, yb, h, o = {}) => {
    const m = o.mat || 'mud';
    box(m, x0, yb, z0, x1, yb + h, z1);
    box('glaze', x0 - .07, yb + h - 1.7, z0 - .07, x1 + .07, yb + h - 1.0, z1 + .07);
    if (h > 7) box('glaze', x0 - .07, yb + .9, z0 - .07, x1 + .07, yb + 1.3, z1 + .07);
    crenels(x0, z0, x1, z1, yb + h, o.crenMat || m);
    for (const f of o.win || []) {
      const along = f === 'n' || f === 's', a0 = along ? x0 : z0, a1 = along ? x1 : z1;
      for (let c = a0 + 3; c < a1 - 2; c += 3.6) for (const r of h > 10 ? [.38, .68] : [.5]) inset(f, x0, z0, x1, z1, c, .9, yb + h * r, yb + h * r + 1.4);
    }
    for (const [f, c, w, dh] of o.doors || []) {
      inset(f, x0, z0, x1, z1, c, w, yb, yb + dh);
      const along = f === 'n' || f === 's', fz = f === 'n' ? z0 - .08 : f === 's' ? z1 + .08 : 0, fx = f === 'w' ? x0 - .08 : f === 'e' ? x1 + .08 : 0;
      if (along) { box('gold', c - w / 2 - .25, yb, fz - .05, c - w / 2, yb + dh + .25, fz + .05); box('gold', c + w / 2, yb, fz - .05, c + w / 2 + .25, yb + dh + .25, fz + .05); box('gold', c - w / 2 - .25, yb + dh, fz - .05, c + w / 2 + .25, yb + dh + .25, fz + .05); }
      else { box('gold', fx - .05, yb, c - w / 2 - .25, fx + .05, yb + dh + .25, c - w / 2); box('gold', fx - .05, yb, c + w / 2, fx + .05, yb + dh + .25, c + w / 2 + .25); box('gold', fx - .05, yb + dh, c - w / 2 - .25, fx + .05, yb + dh + .25, c + w / 2 + .25); }
    }
    rectCollider(x0 - .15, z0 - .15, x1 + .15, z1 + .15); PAL_BLDG.push([x0, z0, x1, z1, o.map || '#a07650']);
  };
  // oszlopcsarnok: oszlopsor + architráv + árnyékoló tető a szárny homlokzatáig
  const arcade = (a0, a1, line, wallLine, yb, h, alongX) => {
    for (let a = a0; a <= a1 + .01; a += 3.2) { if (alongX) cyl('column', a, yb, line, .36, .3, h, 14); else cyl('column', line, yb, a, .36, .3, h, 14); if (alongX) collider(a, line, .42); else collider(line, a, .42); }
    const [lo, hi] = [Math.min(line, wallLine), Math.max(line, wallLine)];
    if (alongX) { box('stone', a0 - .5, yb + h, line - .45, a1 + .5, yb + h + .6, line + .45); box('cedar', a0 - .5, yb + h + .6, lo - .2, a1 + .5, yb + h + .85, hi); box('glaze', a0 - .5, yb + h + .1, (line < wallLine ? line - .47 : line + .45), a1 + .5, yb + h + .5, (line < wallLine ? line - .45 : line + .47)); }
    else { box('stone', line - .45, yb + h, a0 - .5, line + .45, yb + h + .6, a1 + .5); box('cedar', lo - .2, yb + h + .6, a0 - .5, hi, yb + h + .85, a1 + .5); }
  };
  const Y1 = L1.h, Y2 = L2.h;

  // --- külső udvar: északi írnok-szárny oszlopcsarnokkal, déli kérvényező-csarnok ---
  wing(-141, 122, -104.6, 133, Y1, 9.5, { win: ['s', 'n', 'e'], doors: [['s', -122.5, 3.2, 4.4]] });
  arcade(-138, -107, 136.4, 133, Y1, 4.6, true);
  wing(-141, 177, -118.4, 186, Y1, 7.5, { win: ['n'], doors: [['n', -130, 3, 4]] });
  arcade(-138.5, -121, 174.2, 177, Y1, 4.2, true);
  // íróasztalok az oszlopcsarnok alatt
  for (const x of [-112, -120, -128, -136]) { box('cedar', x - .9, Y1, 134.3, x + .9, Y1 + .8, 135.3); rectCollider(x - 1, 134.1, x + 1, 135.5); }

  // --- kaputorony a két udvar között ---
  { const gx0 = -147.5, gx1 = -140.5;
    for (const [za, zb] of [[136.5, 145.5], [153.5, 162.5]]) wing(gx0, za, gx1, zb, Y1, 15, { mat: 'glaze', win: ['e', 'w'], map: '#2a62c2' });
    for (const [za, zb] of [[122, 136.5], [162.5, 186]]) wing(gx0 + 1, za, gx1 - 1, zb, Y1, 9, { map: '#a07650' });
    box('glaze', gx0, Y1 + 9, 145.5, gx1, Y1 + 12, 153.5); box('gold', gx1 + .02, Y1 + 8.6, 145.5, gx1 + .1, Y1 + 9, 153.5); box('gold', gx0 - .1, Y1 + 8.6, 145.5, gx0 - .02, Y1 + 9, 153.5);
    for (const z of [141, 158]) { const pg = new THREE.PlaneGeometry(3.6, 1.8); pg.rotateY(Math.PI / 2); pg.translate(gx1 + .1, Y1 + 5, z); root.add(new THREE.Mesh(pg, M.lion)); }
    trig('gate', -138, 149.5, 3); }

  // --- középső udvar: északi lakomaterem-szárny oszlopcsarnokkal, déli kisszárnyak a lépcső mellett ---
  wing(-205, 122, -148, 133, Y1, 11.5, { win: ['s', 'n'], doors: [['s', -176.5, 4, 5.5]] });
  arcade(-202, -151, 136.2, 133, Y1, 5.2, true);
  wing(-205, 177.5, -185.6, 186, Y1, 6.5, { win: ['n'] }); wing(-164.4, 177.5, -148, 186, Y1, 6.5, { win: ['n'] });

  // --- a királyi kert a középső udvarban: két hosszú medence, gyep, virágágyások, szökőkút ---
  for (const [za, zb] of [[140, 144.2], [154.8, 159]]) {
    box('stone', -197, Y1, za - .4, -153, Y1 + .55, za); box('stone', -197, Y1, zb, -153, Y1 + .55, zb + .4);
    box('stone', -197.4, Y1, za - .4, -197, Y1 + .55, zb + .4); box('stone', -153, Y1, za - .4, -152.6, Y1 + .55, zb + .4);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(44, zb - za).rotateX(-Math.PI / 2), M.water); w.position.set(-175, Y1 + .4, (za + zb) / 2); w.receiveShadow = true; root.add(w);
    rectCollider(-197.5, za - .5, -152.5, zb + .5);
  }
  for (const [za, zb] of [[136.6, 139.4], [159.6, 168.6]]) box('grass', -200, Y1, za, -150, Y1 + .09, zb);
  { const fx = -175, fz = 149.5; const b = new THREE.LatheGeometry([[1.6, 0], [1.6, .5], [1.8, .56], [1.9, .5], [1.9, 0]].map(([a, c]) => new THREE.Vector2(a, c)), 30); b.translate(fx, Y1, fz); add('stone', b); const w = new THREE.Mesh(new THREE.CircleGeometry(1.6, 30).rotateX(-Math.PI / 2), M.water); w.position.set(fx, Y1 + .42, fz); root.add(w); const j = new THREE.Mesh(new THREE.CylinderGeometry(.04, .3, 1.6, 10, 1, true), M.fall); j.position.set(fx, Y1 + 1.2, fz); root.add(j); cyl('glaze', fx, Y1, fz, .2, .15, 1.9, 10); collider(fx, fz, 2.1); }
  const beds = [], bloom = [];
  for (let x = -196; x < -153; x += 6) { beds.push([x, 163.5]); }
  for (const [x, z] of beds) { box('soil', x - 1.8, Y1, z - 1, x + 1.8, Y1 + .25, z + 1); rectCollider(x - 1.9, z - 1.1, x + 1.9, z + 1.1); for (let k = 0; k < 14; k++) bloom.push({ x: x + R(-1.6, 1.6), y: Y1 + .35 + R(0, .15), z: z + R(-.8, .8), s: R(.09, .14), c: pick(['#c8324a', '#e8b030', '#f2e6f0', '#9a4ac8', '#e86a30']) }); }
  { const bm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: .8 }), bloom.length), d = new THREE.Object3D(), cc = new THREE.Color(); bloom.forEach((b, k) => { d.position.set(b.x, b.y, b.z); d.scale.setScalar(b.s); d.updateMatrix(); bm.setMatrixAt(k, d.matrix); bm.setColorAt(k, cc.set(b.c)); }); root.add(bm); }
  // gránátalmafák a gyepen
  { const crs = [], frs = []; for (const [x, z] of [[-196, 166], [-184, 166], [-166, 166], [-154, 166], [-190, 137.8], [-160, 137.8]]) { cyl('wood', x, Y1, z, .12, .09, 1.6, 6); crs.push({ x, y: Y1 + 2.3, z, sx: 1.2, sy: 1.02, sz: 1.2 }); for (let k = 0; k < 7; k++) { const a = R(0, 6.28); frs.push({ x: x + Math.cos(a) * 1.1, y: Y1 + 2.1 + R(-.4, .5), z: z + Math.sin(a) * 1.1, s: .09 }); } collider(x, z, .6); }
    root.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#3f7a32', roughness: .9 }), crs)); root.add(instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#b8222a', roughness: .5 }), frs, { cast: false })); }
  trig('garden', -175, 164, 6); trig('pool', -175, 145.5, 5); trig('pomegranate', -184, 164.5, 2.6);

  // --- a királyi lakópalota: nagy tömb, négy torony, tetőkert, őrzött kapu ---
  wing(-262, 122, -206, 186, Y1, 15, { win: ['e', 'n', 's', 'w'], doors: [['e', 154, 4.4, 6.5]], map: '#8a5a3a' });
  for (const [tx, tz] of [[-262, 122], [-262, 177.5], [-214.5, 122], [-214.5, 177.5]]) wing(tx, tz, tx + 8.5, tz + 8.5, Y1, 25, { mat: 'mud', win: ['n', 's', 'e', 'w'], map: '#6a4a2a' });
  for (const [tx, tz] of [[-262, 122], [-262, 177.5], [-214.5, 122], [-214.5, 177.5]]) box('glaze', tx - .08, Y1 + 19, tz - .08, tx + 8.58, Y1 + 22.5, tz + 8.58);
  box('grass', -255, Y1 + 15, 132, -217, Y1 + 15.15, 176);
  for (let k = 0; k < 8; k++) { const hx = R(-250, -222), hz = pick([140, 150, 160, 168]), w = R(2, 4); box('hedge', hx - w / 2, Y1 + 15.1, hz - .6, hx + w / 2, Y1 + 16.2, hz + .6); }
  trig('residence', -203, 154, 4);

  // --- a 2. szint: a trónterem két oldalán kincstár- és őrségszárny, a folyó felé két saroktorony ---
  wing(-232, 186, -204, 218, Y2, 11, { win: ['n', 'e', 'w'], doors: [['e', 196, 3, 4.5]] });
  wing(-146, 186, -118, 218, Y2, 11, { win: ['n', 'w', 'e'], doors: [['w', 196, 3, 4.5]] });
  for (const tx of [-232, -124]) { wing(tx, 221.5, tx + 6, 227.5, Y2, 16, { mat: 'glaze', win: ['s', 'n'], map: '#2a62c2' }); }
  trig('tower', -225, 219.5, 3, Y2); trig('treasury', -203, 196, 3, Y2);
  // a trónterem folyó felőli homlokzata is pálmaoszlopos
  { const g = new THREE.PlaneGeometry(HL.x1 - HL.x0, 15); g.translate((HL.x0 + HL.x1) / 2, y0 + 7.5, HL.z1 + .03); const pp = g.attributes.position, uv = g.attributes.uv; for (let k = 0; k < pp.count; k++) uv.setXY(k, (pp.getX(k) - HL.x0) / 12.5, (pp.getY(k) - y0) / 15); const m = new THREE.Mesh(g, MM.facade); root.add(m); }
  PAL_BLDG.push([HL.x0, HL.z0, HL.x1, HL.z1, '#22489a']);

  /* ---------- összevonás ---------- */
  const MAT = k => MM[k] || M[k];
  for (const [k, arr] of Object.entries(geos)) {
    if (UVS[k]) arr.forEach(g => worldUV(g, UVS[k]));
    const m = new THREE.Mesh(mergeGeometries(arr.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; })), MAT(k));
    m.castShadow = !['pave', 'floor'].includes(k); m.receiveShadow = true; root.add(m);
  }

  /* ---------- szereplők: őrök, a király, udvaroncok, írnokok ---------- */
  const person = (look, x, z, ry, y = y0, scale = 1, opts = {}) => { const p = makePerson(look, scale); p.object.position.set(x, y + .05, z); p.object.rotation.y = ry; root.add(p.object); p.object.traverse(o => { if (o.isMesh) o.castShadow = false; }); const w = { p, x, z, ...opts }; people.push(w); collider(x, z, .4); return w; };
  const spear = (w) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 2.6, 6), M.wood); s.position.set(.38, 1.2, .1); w.p.object.add(s); const t = new THREE.Mesh(new THREE.ConeGeometry(.06, .3, 6), M.bronze); t.position.set(.38, 2.6, .1); w.p.object.add(t); };
  for (const [x, z, ry, y] of [[-85, 145.4, Math.PI / 2, 0], [-85, 153.6, Math.PI / 2, 0], [-179.5, 203.6, Math.PI, y0], [-170.5, 203.6, Math.PI, y0], [-178.6, 216, Math.PI, y0], [-171.4, 216, Math.PI, y0]]) spear(person(1, x, z, ry, y, 1.06, { guard: true }));
  { const k = person(6, -175, 218.9, Math.PI, y0 + .7, 1.1, { king: true });
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(.2, .18, .34, 16), M.gold); cr.position.set(0, 2.05, 0); k.p.object.add(cr); const tp = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 8), M.gold); tp.position.set(0, 2.3, 0); k.p.object.add(tp);
    const rb = new THREE.Mesh(new THREE.CylinderGeometry(.42, .62, 1.5, 16, 1, true), col('#5a1a3a', { side: THREE.DoubleSide })); rb.position.set(0, .82, -.05); k.p.object.add(rb);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 6), M.gold); sc.position.set(.42, 1.1, .2); k.p.object.add(sc);
    CITY_NPC.push({ id: 'king', x: -175, z: 218.9, ry: Math.PI, name: 'II. Nabukodonozor, Babilon királya', look: 6, talkX: -175, talkZ: 215.3, person: k.p }); }
  const courtiers = [];
  for (let x = HL.x0 + 5; x < HL.x1 - 4; x += 4.6) { if (Math.abs(x + 175) < 6) continue; for (const z of [HL.z0 + 3.2, HL.z1 - 4.2]) { if (z > 215 && Math.abs(x + 175) < 9) continue; courtiers.push(person(pick([0, 2, 3, 4, 5]), x + R(-.4, .4), z, z < 210 ? 0 : Math.PI, y0, R(.95, 1.05), { courtier: true })); } }
  trig('courtier', -160, 208.2, 3, y0); trig('guard', -175, 201.5, 3.2);
  for (const x of [-196, -154]) { const w = person(4, x, 214, x < -175 ? Math.PI / 2 : -Math.PI / 2, y0, 1, { scribe: true }); const tb = new THREE.Mesh(new THREE.BoxGeometry(.28, .36, .06), col('#a87a4e')); tb.position.set(0, 1.15, .3); tb.rotation.x = -.6; w.p.object.add(tb); }
  trig('palace', -175, 190, 5, y0);

  // --- élet a külső és a középső udvarban ---
  for (const x of [-112, -120, -128, -136]) { const w = person(4, x, 133.8, 0, Y1, 1, { scribe: true }); const tb = new THREE.Mesh(new THREE.BoxGeometry(.28, .36, .06), col('#a87a4e')); tb.position.set(0, 1.15, .3); tb.rotation.x = -.6; w.p.object.add(tb); }
  for (let k = 1; k < 4; k++) person(pick([0, 2, 3, 5]), -112 - k * 8, 136.6 + .6, Math.PI, Y1, R(.95, 1.04), { courtier: true });
  for (let k = 0; k < 7; k++) person(pick([0, 1, 2, 3, 5, 6]), -108 - k * 1.3, 141.2 + (k % 2) * .3, -Math.PI / 2 + .3, Y1, R(.94, 1.04), { courtier: true });
  for (const z of [144.6, 154.4]) spear(person(1, -138.6, z, Math.PI / 2, Y1, 1.06, { guard: true }));
  for (const z of [151.2, 156.8]) spear(person(1, -204.4, z, Math.PI / 2, Y1, 1.06, { guard: true }));
  for (const [x, z] of [[-188, 166.8], [-160, 162]]) person(3, x, z, R(0, 6), Y1, 1, { courtier: true });
  const walkers = [], WR = [[[-150, 147], [-199, 147], [-199, 152], [-150, 152]], [[-137, 172], [-120, 172], [-120, 139], [-137, 139]], [[-200, 152], [-150, 152], [-150, 147], [-200, 147]]];
  WR.forEach((rt, i) => { const p = makePerson(i + 2); root.add(p.object); p.object.traverse(o => { if (o.isMesh) o.castShadow = false; }); const w = { p, rt, i: 0, x: rt[0][0], z: rt[0][1], sp: R(.7, .95), walk: true }; people.push(w); walkers.push(w); });
  // gazellák a királyi kertben
  const gazelles = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group(), m = col('#c89a62'), wm = col('#f0e6d6'), S = (sx, sy, sz, x, y, z, mt = m) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mt); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; g.add(o); };
    S(.2, .2, .45, 0, .78, 0); S(.16, .1, .3, 0, .66, 0, wm); const nk = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, .45, 8), m); nk.position.set(0, 1.0, .36); nk.rotation.x = -.6; g.add(nk); S(.08, .09, .16, 0, 1.2, .5);
    for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.012, .02, .32, 5), col('#2a2018')); h.position.set(s * .05, 1.38, .44); h.rotation.x = -.5; g.add(h); }
    for (const [lx, lz] of [[.1, .3], [-.1, .3], [.1, -.3], [-.1, -.3]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.025, .02, .62, 5), m); l.position.set(lx, .31, lz); g.add(l); }
    root.add(g); gazelles.push({ g, x: R(-196, -154), z: pick([138, 165]), tx: 0, tz: 0, t: 0, ph: R(0, 6) });
  }
  trig('gazelle', -175, 166, 5);
  // a kihallgatás szereplői (beszélni lehet velük)
  { const gg = people.find(w => w.guard && w.x === -85 && w.z === 145.4); CITY_NPC.push({ id: 'pguard', x: -85, z: 145.4, ry: Math.PI / 2, name: 'Kudur, a kapuőr', talkX: -85, talkZ: 147.6, person: gg.p });
    const sc = people.find(w => w.scribe && w.x === -112); CITY_NPC.push({ id: 'pscribe', x: -112, z: 133.8, ry: 0, name: 'Nabu-zer-iddin, a palota írnoka', talkX: -112, talkZ: 136.4, person: sc.p });
    const ch = person(5, -168, 153.5, Math.PI, Y1, 1.05, {}); const st = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.7, 6), M.gold); st.position.set(.36, .85, .15); ch.p.object.add(st);
    CITY_NPC.push({ id: 'chamberlain', x: -168, z: 153.5, ry: Math.PI, name: 'Arad-Ea, az udvarmester', talkX: -168, talkZ: 151.5, person: ch.p });
    const he = person(2, -173.2, 202.6, Math.PI, Y2, 1.03, {}); CITY_NPC.push({ id: 'herald', x: -173.2, z: 202.6, ry: Math.PI, name: 'Shamash-eriba, a hírnök', talkX: -173.2, talkZ: 200.6, person: he.p }); }
  trig('petition', -116, 137.8, 2.6); trig('chamberlain', -168, 151, 2.6); trig('herald', -173.2, 200.2, 2.6); trig('audience', -175, 212, 3, Y2);


  return {
    root, people,
    inHall: me => me.x > HL.x0 && me.x < HL.x1 && me.z > HL.z0 && me.z < HL.z1 && me.y > y0 - 1,
    update(t, dt, me) {
      if (me.x > -70) return;                                    // csak a palota közelében számolunk
      for (const f of FL) { const k = 1 + Math.sin(t * 13 + f.ph) * .12 + Math.sin(t * 23 + f.ph * 2) * .08; f.s.scale.set(f.w * (2 - k), f.h * k, 1); }
      banners.forEach((b, i) => { b.rotation.y = Math.sin(t * 1.3 + i) * .35; });
      for (const g of gazelles) { const dx = g.tx - g.x, dz = g.tz - g.z, d = Math.hypot(dx, dz); if (d > .1) { const sp = Math.hypot(g.x - me.x, g.z - me.z) < 4 ? 2.2 : .5; g.x += dx / d * sp * dt; g.z += dz / d * sp * dt; g.g.rotation.y = Math.atan2(dx, dz); g.g.position.y = Y1 + Math.abs(Math.sin(t * 7 + g.ph)) * .03; } else if ((g.t -= dt) <= 0) { g.tx = R(-198, -152); g.tz = Math.random() < .5 ? R(136.8, 139.2) : R(160, 168.4); g.t = R(3, 9); } g.g.position.x = g.x; g.g.position.z = g.z; }
      for (const w of walkers) { const [tx, tz] = w.rt[w.i], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz); if (d < .3) w.i = (w.i + 1) % w.rt.length; else { w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt; w.p.object.position.set(w.x, Y1 + .05, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); } }
      for (const w of people) { const far = Math.hypot(w.x - me.x, w.z - me.z) > 50 || (w.y0 !== undefined && Math.abs(me.y - w.y0) > 5 && Math.hypot(w.x - me.x, w.z - me.z) > 20); w.p.object.visible = !far; if (far) continue; if (w.walk) { w.p.update(dt, w.sp); continue; } if (w.courtier && Math.random() < dt * .3) w.p.talk(R(1, 2.5)); if (w.king && Math.random() < dt * .1) w.p.talk(R(1.5, 3)); w.p.update(dt, 0); }
    },
  };
}
