// Bábel tornya (Etemenanki) a keleti városfalon túl. A szent körzet (kapu, Esagila, papi házak, téglavetők) egyszer
// épül fel; maga a torony a teljesített emeletek számától függ (setLit): Istár-kékkel indul (alsó két szint kék máz
// oroszlánfrízzel, feljebb vályog falpillérekkel, kék szentély állványzattal), minden teljesített emelet csillagos
// lapisra vált és kigyúl a sávja, a hetedik után arany szentély Istár csillagával és fehér lépcső.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZG, ZGATE, ZIG_TIERS, ZIG_TOPS, ZIG_SH, collider, rectCollider, R, pick } from './world.js';
import { worldUV, LANTERNS } from './build.js';
import { TEX } from './mats.js';
import { makePerson } from './hero.js';
import { CITY_NPC, CITY_TRIG } from './city.js';

export const ZIG_BLDG = [];   // a térképhez: [x0, z0, x1, z1, szín]
export const BAND = ['#efeae0', '#2a2a2e', '#7b2d6e', '#2c5aa8', '#d9772e', '#c7ccd4', '#d8a93a'];
const { cx, cz } = ZG;

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
// a csillagok helye ugyanaz a két textúrán: a nappali (téglával) és az éjjel világító (csak a csillagok)
const STARS = Array.from({ length: 9 }, (_, k) => [30 + ((k * 197) % 460), 30 + ((k * 131) % 460), 9 + (k % 3) * 5, k % 3 ? '#d9dee8' : '#f0c43a']);
const star = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? r * .38 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
const starTex = () => tex(512, 512, (g, W, H) => {
  const bw = 64, bh = 24;
  for (let y = 0; y < H; y += bh) for (let x = -((y / bh) % 2) * bw / 2; x < W; x += bw) { g.fillStyle = `hsl(${222 + Math.random() * 10},${55 + Math.random() * 12}%,${16 + Math.random() * 8}%)`; g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3); }
  for (const s of STARS) star(g, ...s);
});
const starGlowTex = () => tex(512, 512, (g, W, H) => { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); for (const s of STARS) star(g, s[0], s[1], s[2], '#ffffff'); });
const glowTex = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
const flameTex = () => tex(64, 128, (c) => { const g = c.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(.25, 'rgba(255,190,70,.95)'); g.addColorStop(.6, 'rgba(255,90,20,.45)'); g.addColorStop(1, 'rgba(255,40,0,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(32, 2); c.bezierCurveTo(60, 60, 62, 120, 32, 126); c.bezierCurveTo(2, 120, 4, 60, 32, 2); c.fill(); });

// geometriák gyűjtése anyagonként, a végén összevonás
function bag() {
  const geos = {};
  const add = (k, g) => { (geos[k] ||= []).push(g); return g; };
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(k, g); };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); return add(k, g); };
  const merge = (root, MAT, UVS) => { for (const [k, arr] of Object.entries(geos)) { if (!arr.length) continue; if (UVS[k]) arr.forEach(g => worldUV(g, UVS[k])); const m = new THREE.Mesh(mergeGeometries(arr.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; })), MAT(k)); m.castShadow = k !== 'pave'; m.receiveShadow = true; root.add(m); } };
  return { add, box, cyl, merge };
}
const UVS = { stone: 3, mud: 3, mud2: 3, lapis: 6, pave: 6, glaze: 2 };

export function buildZiggurat(M, q, lit = 0) {
  const root = new THREE.Group(), std = o => new THREE.MeshStandardMaterial(o);
  const nrm = s => q.maps ? { normalMap: TEX.rockN, normalScale: new THREE.Vector2(s, s) } : {};
  const MM = {
    mud: std({ color: '#c8a678', map: TEX.brick, ...nrm(.7), roughness: .95 }),
    mud2: std({ color: '#a9845a', map: TEX.brick, ...nrm(.7), roughness: .95 }),
    stone: std({ color: '#eadfc6', map: TEX.brick, ...nrm(.25), roughness: .7 }),
    lapis: std({ map: starTex(), emissiveMap: starGlowTex(), emissive: '#fff4d8', emissiveIntensity: 0, roughness: .28, metalness: .1 }),
    pave: std({ color: '#d6c8ac', map: TEX.pave, ...nrm(.45), roughness: .8 }),
    dull: std({ color: '#8d8478', roughness: .9 }),
    silver: std({ color: '#d4d9e2', metalness: .8, roughness: .3 }),
    dark: std({ color: '#1c140e', roughness: 1 }),
    clayw: std({ color: '#7a5434', roughness: .7 }),
    straw: std({ color: '#d8bc6a', roughness: 1 }),
  };
  BAND.forEach((c, i) => { MM['band' + i] = std({ color: c, emissive: c, emissiveIntensity: 0, roughness: i >= 5 ? .32 : .25, metalness: i >= 5 ? .65 : .05 }); });
  const MAT = k => MM[k] || M[k];
  const S = bag(), { box, cyl } = S, trig = (w, x, z, r, y = 0) => CITY_TRIG.push({ w, x, z, r, y });
  const FL = [], flameM = new THREE.SpriteMaterial({ map: flameTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const flame = (x, y, z, w = .42, h = .75) => { const s = new THREE.Sprite(flameM); s.position.set(x, y, z); s.scale.set(w, h, 1); s.renderOrder = 4; root.add(s); FL.push({ s, w, h, ph: R(0, 6) }); };
  const torch = (x, y, z, h = 2.2) => { cyl('bronze', x, y, z, .1, .06, h, 8); cyl('bronze', x, y + h, z, .1, .2, .22, 10); flame(x, y + h + .5, z); LANTERNS.push([x, y + h + .4, z]); if (y < 1) collider(x, z, .25); };
  const { x0, x1, z0, z1 } = ZG;

  /* ---------- kapu a városfalban: két mázas torony, kapuív, oroszlánok ---------- */
  for (const [za, zb] of [[ZGATE.z0 - 3.2, ZGATE.z0], [ZGATE.z1, ZGATE.z1 + 3.2]]) { box('glaze', 78.6, 0, za, 83.6, 11, zb); box('mud', 78.2, 11, za - .2, 84, 11.8, zb + .2); for (let z = za; z < zb; z += 1.07) box('mud', 78.2, 11.8, z, 84, 12.6, z + .55); }
  box('glaze', 78.6, 7.2, ZGATE.z0, 83.6, 11, ZGATE.z1); box('gold', 78.5, 6.9, ZGATE.z0, 78.55, 7.2, ZGATE.z1);
  for (const z of [ZGATE.z0 - 1.6, ZGATE.z1 + 1.6]) { const pg = new THREE.PlaneGeometry(2.6, 1.3); pg.rotateY(-Math.PI / 2); pg.translate(78.55, 4.2, z); root.add(new THREE.Mesh(pg, M.lion)); }
  rectCollider(78.4, ZGATE.z0 - 3.4, 83.8, ZGATE.z0 - .05); rectCollider(78.4, ZGATE.z1 + .05, 83.8, ZGATE.z1 + 3.4);
  trig('ziggurat', 88, 200.5, 4);

  /* ---------- a szent körzet: kövezet, fal, tornyok ---------- */
  box('pave', x0, 0, z0, x1, .05, z1);
  for (const [a, b, c, d] of [[x0, z0 - 1.5, x1 + 1.5, z0], [x0, z1, x1 + 1.5, z1 + 1.5], [x1, z0, x1 + 1.5, z1]]) box('mud', a, 0, b, c, 7, d);
  box('glaze', x0, 4.8, z0 - 1.6, x1 + 1.6, 5.6, z0 - 1.48); box('glaze', x1 + 1.48, 4.8, z0, x1 + 1.6, 5.6, z1); box('glaze', x0, 4.8, z1 + 1.48, x1 + 1.6, 5.6, z1 + 1.6);
  for (const [x, z] of [[x1, z0], [x1, z1], [x0 + 60, z0], [x0 + 140, z0], [x0 + 60, z1], [x0 + 140, z1]]) box('mud', x - 2, 0, z - 2, x + 3.5, 10, z + 3.5);
  // processziós út a kaputól a főlépcsőig, fáklyákkal
  const xs1 = cx - ZIG_TIERS[1][0], xs0 = xs1 - ZIG_TOPS[1], fx = cx - ZIG_TIERS[0][0];
  box('stone', x0, 0, 197.6, 92, .09, 203.4); box('stone', 88, 0, cz + 4, 92, .09, 197.6); box('stone', 88, 0, cz - 4, xs0 - 3, .09, cz + 4);
  for (let x = 97; x < xs0 - 6; x += 9) for (const s of [-1, 1]) torch(x, 0, cz + s * 5.6);
  for (const z of [196, 205]) torch(86.5, 0, z);

  /* ---------- Esagila, Marduk temploma, lépcsőzetes pártázattal ---------- */
  const E = { x0: 92, x1: 136, z0: 121, z1: 156 };
  box('mud', E.x0, 0, E.z0, E.x1, 11, E.z1); box('glaze', E.x0 - .05, 8.6, E.z0 - .05, E.x1 + .05, 9.6, E.z1 + .05);
  for (let x = E.x0; x < E.x1 - .5; x += 1.4) { box('mud', x, 11, E.z0, x + .7, 12, E.z0 + .5); box('mud', x, 11, E.z1 - .5, x + .7, 12, E.z1); }
  for (let z = E.z0; z < E.z1 - .5; z += 1.4) { box('mud', E.x0, 11, z, E.x0 + .5, 12, z + .7); box('mud', E.x1 - .5, 11, z, E.x1, 12, z + .7); }
  for (let x = E.x0 + 2; x < E.x1 - 1; x += 3.2) box('mud2', x - .5, 0, E.z1, x + .5, 10, E.z1 + .5);
  for (const sx of [E.x0 + 17, E.x1 - 17]) box('mud', sx - 2.5, 0, E.z1, sx + 2.5, 14, E.z1 + 3);
  box('glaze', E.x0 + 19.5, 0, E.z1 + .05, E.x1 - 19.5, 9, E.z1 + 2.5); box('dark', E.x0 + 20.5, 0, E.z1 + 2.52, E.x1 - 20.5, 6.5, E.z1 + 2.6);
  rectCollider(E.x0 - .3, E.z0 - .3, E.x1 + .3, E.z1 + 3.3); for (const x of [E.x0 + 18, E.x1 - 18]) torch(x, 0, E.z1 + 4.2);
  trig('priest', 114, 160.5, 3); ZIG_BLDG.push([E.x0, E.z0, E.x1, E.z1, '#a07650']);
  // papi házak
  for (const [a, b, c, d] of [[96, 191, 110, 202], [114, 192, 128, 202], [96, 208, 110, 222], [114, 208, 128, 222], [132, 210, 144, 222]]) { box('mud', a, 0, b, c, 5, d); box('mud2', a - .1, 5, b - .1, c + .1, 5.5, d + .1); box('dark', (a + c) / 2 - .6, 0, b - .03, (a + c) / 2 + .6, 2.2, b); rectCollider(a - .3, b - .3, c + .3, d + .3); ZIG_BLDG.push([a, b, c, d, '#a07650']); }

  /* ---------- a téglavetők udvara (1. emelet) a főlépcső előtt, északra ---------- */
  { const bx = 118, bz = 182;
    box('clayw', bx - 8, 0, bz - 2, bx - 2, .25, bz + 3); trig('clay', bx - 5, bz + .5, 3);                         // agyaggödör
    { const g = new THREE.SphereGeometry(1.6, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, .6, 1); g.translate(bx + 5, 0, bz + 2.5); S.add('straw', g); collider(bx + 5, bz + 2.5, 1.5); trig('straw', bx + 5, bz + 2.5, 2.6); }
    box('wood', bx - 1, 0, bz - 1, bx + 2, .8, bz); rectCollider(bx - 1.2, bz - 1.2, bx + 2.2, bz + .2);           // vetőasztal a formával
    box('wood', bx - .5, .8, bz - .8, bx + .7, .95, bz - .2); trig('mould', bx + .5, bz - .5, 2.4);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) box('mud', bx - 9 + k * .9, .05, bz - 6 + r * .6, bx - 9 + k * .9 + .35, .17, bz - 6 + r * .6 + .45);   // száradó téglák
    for (let k = 0; k < 3; k++) { const x = bx + 4 + k * 2.6; box('mud2', x, 0, bz - 6.5, x + 2, 1.4, bz - 5); rectCollider(x - .2, bz - 6.7, x + 2.2, bz - 4.8); }
    trig('brick', bx + 7, bz - 4.2, 3);
    for (const x of [bx - 4, bx - 3]) { cyl('wood', x, 0, bz + 5, .3, .25, .7, 10); collider(x, bz + 5, .35); } trig('bucket', bx - 3.5, bz + 5, 2.4);
    torch(bx - 10, 0, bz - 2); torch(bx + 9.5, 0, bz + 4.5);
  }
  // a keleti udvar: téglarakások, kemencék, szán, daru
  for (let k = 0; k < 14; k++) { const x = 258 + (k % 7) * 5.6, z = 124 + Math.floor(k / 7) * 7, hh = 1 + (k * 37 % 10) / 10; box('mud2', x, 0, z, x + 3.4, hh, z + 2.2); rectCollider(x - .2, z - .2, x + 3.6, z + 2.4); }
  for (const [x, z] of [[272, 150], [284, 150], [278, 162]]) { const g = new THREE.SphereGeometry(3.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(x, 0, z); S.add('mud2', g); box('dark', x - .9, 0, z - 3.25, x + .9, 1.6, z - 2.6); cyl('mud', x, 2.6, z, .5, .4, 2.2, 10); collider(x, z, 3.3); flame(x, .5, z - 3.1, .7, .9); }
  trig('kiln', 278, 145, 4);
  for (let k = 0; k < 6; k++) { const x = 262 + k * 5; cyl('wood', x, 0, 186, .12, .1, 4, 6); collider(x, 186, .2); }
  box('wood', 260, 3.9, 185.8, 288, 4.1, 186.2);
  box('wood', 266, 0, 200, 270, .3, 202); box('wood', 265.6, 0, 199.8, 266, .45, 202.2); box('mud', 266.4, .3, 200.2, 269.6, 1.3, 201.8); rectCollider(265.4, 199.6, 270.2, 202.4); trig('sledge', 268, 204, 2.6);
  { const bx = cx + ZIG_TIERS[0][0] + 5; cyl('wood', bx, 0, cz - 12, .35, .3, 26, 8); collider(bx, cz - 12, .5); const g = new THREE.BoxGeometry(.4, .4, 18); g.translate(0, 0, 7); g.rotateX(-.25); g.translate(bx, 25, cz - 12); S.add('wood', g); trig('worker', bx - 2, cz - 16, 4); }

  /* ---------- a torony ütközői: korlátok, kapuépítmény, szentély ---------- */
  for (const s of [-1, 1]) {
    for (const [a, b] of [[xs0, fx - 6], [fx, xs1 + .5]]) rectCollider(a, Math.min(cz + s * 4.5, cz + s * 5.2), b, Math.max(cz + s * 4.5, cz + s * 5.2));   // a főlépcső korlátja, a pihenőnél nyitva
    rectCollider(fx - 6.8, Math.min(cz + s * 6.2, cz + s * 42), fx - 5.95, Math.max(cz + s * 6.2, cz + s * 42));             // a mellékrámpák külső korlátja
    rectCollider(xs0 - 3.1, Math.min(cz + s * 2.9, cz + s * 6.1), xs0 + .05, Math.max(cz + s * 2.9, cz + s * 6.1));          // kapuépítmény pillérei
  }
  rectCollider(cx - ZIG_SH - .3, cz - ZIG_SH - .3, cx + ZIG_SH + .3, cz + ZIG_SH + .3);
  trig('scaffolding', cx - ZIG_SH - 2, cz + 6, 4, ZIG_TOPS[5]); trig('shrine', cx - ZIG_SH - 2, cz - 5, 4, ZIG_TOPS[5]);
  trig('staircase', xs0 - 1, cz, 3);
  for (const s of [-1, 1]) { torch(xs0 - 4.6, 0, cz + s * 7.5); torch(fx - 7.6, 0, cz + s * 40); }
  // fáklyák a teraszokon, a lépcsők érkezésénél
  for (const s of [-1, 1]) { torch(fx + 1.2, ZIG_TOPS[0], cz + s * 7.6); torch(xs1 + 1, ZIG_TOPS[1], cz + s * 5.6, 1.8); }
  for (let i = 2; i < 6; i++) for (const s of [-1, 1]) torch(cx - ZIG_TIERS[i][0] + 1, ZIG_TOPS[i], cz + s * 3.6, 1.6);

  /* ---------- emberek és a tanítók ---------- */
  const people = [];
  const person = (look, x, z, ry, y = 0, s = 1) => { const p = makePerson(look, s); p.object.position.set(x, y + .05, z); p.object.rotation.y = ry; p.object.traverse(o => { if (o.isMesh) o.castShadow = false; }); root.add(p.object); const w = { p, x, z, y }; people.push(w); return w; };
  for (const [u, dz] of [[.18, -1.4], [.26, 1.2], [.42, 0], [.6, -1]]) person(pick([2, 5]), xs0 + u * (xs1 - xs0), cz + dz, -Math.PI / 2, u * ZIG_TOPS[1]);
  for (let k = 0; k < 6; k++) person(pick([0, 1, 3, 4]), 262 + (k % 3) * 9, 137 + Math.floor(k / 3) * 30, k * 1.3);
  for (const [x, z, ry] of [[100, 164, .5], [128, 162, -2], [104, 186, 3]]) { person(pick([2, 5]), x, z, ry); collider(x, z, .4); }
  const npc = (id, look, x, z, ry, y, name, tx, tz, s = 1) => { const w = person(look, x, z, ry, y, s); CITY_NPC.push({ id, x, z, y, ry, name, talkX: tx, talkZ: tz, person: w.p }); collider(x, z, .45); return w; };
  npc('tbrick', 6, 121, 179.6, 0, 0, 'Ilu-ibni, a téglavető mester', 121, 182, 1.04);
  npc('tforeman', 3, 162.6, 155.4, 0, ZIG_TOPS[0], 'Shamash-nasir, a munkavezető', 162.6, 157.8, 1.05); trig('foreman', 162.6, 153.6, 3, ZIG_TOPS[0]);
  npc('tworkers', 0, 170.2, 181.4, Math.PI, ZIG_TOPS[1], 'Ubar és Zakir, a munkások', 171.2, 179); person(4, 172.2, 181.8, Math.PI - .3, ZIG_TOPS[1]); collider(172.2, 181.8, .4); trig('language', 171.2, 183.6, 3, ZIG_TOPS[1]);
  npc('tmerchant', 5, 176.4, cz + 8.2, Math.PI, ZIG_TOPS[2], 'Tarhunta, a kereskedő', 176.4, cz + 5.8);

  S.merge(root, MAT, UVS);

  /* ---------- maga a torony: a teljesített emeletek szerint ---------- */
  let tower = null, glowS = null, doorM = null;
  function setLit(n) {
    lit = n;
    if (tower) { root.remove(tower); tower.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    tower = new THREE.Group(); const T = bag(), done = i => i < lit, fin = lit >= 7;
    const wallK = i => done(i) ? 'lapis' : i < 2 ? 'glaze' : 'mud';
    const ring = (k, h, y0, y1, t, out, gap) => {
      T.box(k, cx - h - out, y0, cz - h - out, cx + h + out, y1, cz - h - out + t);
      T.box(k, cx - h - out, y0, cz + h + out - t, cx + h + out, y1, cz + h + out);
      T.box(k, cx + h + out - t, y0, cz - h - out, cx + h + out, y1, cz + h + out);
      if (gap) { T.box(k, cx - h - out, y0, cz - h - out, cx - h - out + t, y1, gap[0]); T.box(k, cx - h - out, y0, gap[1], cx - h - out + t, y1, cz + h + out); }
      else T.box(k, cx - h - out, y0, cz - h - out, cx - h - out + t, y1, cz + h + out);
    };
    let y = 0;
    ZIG_TIERS.forEach(([h, H], i) => {
      const wk = wallK(i);
      T.box(wk, cx - h, y, cz - h, cx + h, y + H, cz + h);
      if (i >= 2 && !done(i)) { const d = .55, w = .8; for (let u = -h + 2; u <= h - 2 + .01; u += 4) {
        T.box('mud2', cx + u - w, y, cz - h - d, cx + u + w, y + H - 1.2, cz - h); T.box('mud2', cx + u - w, y, cz + h, cx + u + w, y + H - 1.2, cz + h + d); T.box('mud2', cx + h, y, cz + u - w, cx + h + d, y + H - 1.2, cz + u + w);
        if (Math.abs(u) > 3.5) T.box('mud2', cx - h - d, y, cz + u - w, cx - h, y + H - 1.2, cz + u + w); } }
      const gap = i === 0 ? [cz - 4.6, cz + 4.6] : [cz - 2.6, cz + 2.6];
      ring(done(i) ? 'band' + i : 'dull', h, y + H - 1.2, y + H - .15, .4, .62, gap);
      ring(done(i) ? 'silver' : 'gold', h, y + H - .15, y + H + .1, .5, .7, gap);
      ring(wk === 'glaze' ? 'mud' : wk, h - .3, y + H, y + H + 1, .5, 0, gap);   // mellvéd
      y += H;
    });
    const yS = y, stairK = fin ? 'marble' : 'stone';
    // hármas lépcső: főlépcső a 2. szint tetejéig, két mellékrámpa az 1. szint tetejéig, kapuépítmény
    // a főlépcső magassága: alsó szakasz a 20 m-es pihenőig, pihenő (a mellékrámpák itt csatlakoznak), felső szakasz
    const sH = x => x < fx - 6 ? (x - xs0) / (fx - 6 - xs0) * ZIG_TOPS[0] : x < fx ? ZIG_TOPS[0] : ZIG_TOPS[0] + (x - fx) / (xs1 - fx) * (ZIG_TOPS[1] - ZIG_TOPS[0]);
    { const N = 80, dx = (xs1 - xs0) / N; for (let k = 0; k < N; k++) { const xa = xs0 + k * dx; T.box(stairK, xa, 0, cz - 4.5, xa + dx, sH(xa + dx), cz + 4.5); }
      for (const s of [-1, 1]) for (let k = 0; k < N; k += 2) { const xa = xs0 + k * dx; if (xa > fx - 6.4 && xa < fx) continue; T.box('glaze', xa, 0, cz + s * 4.5 - (s < 0 ? .6 : 0), xa + 2 * dx, sH(xa + 2 * dx) + 1, cz + s * 4.5 + (s > 0 ? .6 : 0)); }
      const M2 = 50; for (const s of [-1, 1]) { const za = cz + s * (ZIG_TIERS[0][0] - 4), zb = cz + s * 6;
        for (let k = 0; k < M2; k++) { const a = za + (zb - za) * k / M2, b = za + (zb - za) * (k + 1) / M2; T.box(stairK, fx - 6, 0, Math.min(a, b), fx, (k + 1) * ZIG_TOPS[0] / M2, Math.max(a, b)); }
        for (let k = 0; k < M2; k += 2) { const a = za + (zb - za) * k / M2, b = za + (zb - za) * (k + 2) / M2; T.box('glaze', fx - 6.6, 0, Math.min(a, b), fx - 6, (k + 2) * ZIG_TOPS[0] / M2 + 1, Math.max(a, b)); }
        T.box(stairK, fx - 6, 0, Math.min(zb, cz + s * 4.5), fx, ZIG_TOPS[0], Math.max(zb, cz + s * 4.5)); }
      for (const s of [-1, 1]) T.box('glaze', xs0 - 3, 0, cz + s * 4.5 - 1.6, xs0, 7, cz + s * 4.5 + 1.6);
      T.box('glaze', xs0 - 3, 5.6, cz - 6.1, xs0, 7, cz + 6.1);
      for (let i = 2; i < ZIG_TIERS.length; i++) { const fxi = cx - ZIG_TIERS[i][0], run = Math.min(ZIG_TIERS[i][1], ZIG_TIERS[i - 1][0] - ZIG_TIERS[i][0] - .6), n = 18, yb = ZIG_TOPS[i - 1]; for (let k = 0; k < n; k++) T.box(stairK, fxi - run + k * run / n, yb, cz - 2.4, fxi, yb + (k + 1) * ZIG_TIERS[i][1] / n, cz + 2.4); }
    }
    // oroszlános fríz a még nem teljesített alsó két szinten
    { const gs = []; [[ZIG_TIERS[0][0], 9], [ZIG_TIERS[1][0], ZIG_TOPS[0] + 5.2]].forEach(([h, y0], j) => { if (done(j)) return; for (let u = -h + 2.5; u < h - 2; u += 3.2) {
        for (const [ry, px, pz] of [[0, cx + u, cz + h + .03], [Math.PI, cx + u, cz - h - .03], [Math.PI / 2, cx + h + .03, cz + u]]) { const g = new THREE.PlaneGeometry(2.8, 1.4); g.rotateY(ry); g.translate(px, y0, pz); gs.push(g); }
        if (Math.abs(u) > 6) { const g = new THREE.PlaneGeometry(2.8, 1.4); g.rotateY(-Math.PI / 2); g.translate(cx - h - .03, y0, cz + u); gs.push(g); } } });
      if (gs.length) { const m = new THREE.Mesh(mergeGeometries(gs), M.lion); m.receiveShadow = true; tower.add(m); } }
    // a szentély
    const SH = ZIG_SH;
    T.box(fin ? 'gold' : 'glaze', cx - SH, yS, cz - SH, cx + SH, yS + 8, cz + SH);
    T.box(fin ? 'band6' : 'dull', cx - SH - .4, yS + 7.2, cz - SH - .4, cx + SH + .4, yS + 8.2, cz + SH + .4);
    for (let u = -SH; u < SH - .5; u += 1.4) for (const [a, b, c, d] of [[cx + u, cz - SH - .2, cx + u + .7, cz - SH + .3], [cx + u, cz + SH - .3, cx + u + .7, cz + SH + .2], [cx - SH - .2, cz + u, cx - SH + .3, cz + u + .7], [cx + SH - .3, cz + u, cx + SH + .2, cz + u + .7]]) T.box(fin ? 'silver' : 'gold', a, yS + 8.2, b, c, yS + 8.9, d);
    T.box('dark', cx - SH - .05, yS, cz - 1.6, cx - SH + .6, yS + 5, cz + 1.6);
    { const g = new THREE.PlaneGeometry(3, 4.6); g.rotateY(-Math.PI / 2); g.translate(cx - SH - .1, yS + 2.4, cz); doorM = new THREE.MeshBasicMaterial({ color: '#ffd890', transparent: true, opacity: fin ? 1 : .25 }); tower.add(new THREE.Mesh(g, doorM)); }
    if (!fin) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new THREE.ConeGeometry(.5, 2.4, 8); g.translate(cx + sx * (SH - .6), yS + 10.1, cz + sz * (SH - .6)); T.add('gold', g); }
      for (const z of [-5, -1.7, 1.7, 5]) T.cyl('column', cx - SH - 3.2, yS, cz + z, .45, .38, 6.5, 14); T.box('glaze', cx - SH - 4, yS + 6.5, cz - 6, cx - SH, yS + 7.3, cz + 6);
      const r = SH + 1.6; for (let u = -r; u <= r + .01; u += r / 3) for (const [x, z] of [[cx + u, cz - r], [cx + u, cz + r], [cx - r, cz + u], [cx + r, cz + u]]) { if (x < cx - r + .1 && Math.abs(z - cz) < 3) continue; T.cyl('wood', x, yS, z, .12, .1, 11, 6); }
      for (const hy of [3.5, 7, 10.5]) { ring('wood', r, yS + hy, yS + hy + .18, .25, 0, [cz - 3, cz + 3]); ring('wood', r - .1, yS + hy - .18, yS + hy, 1.1, 0, [cz - 3, cz + 3]); }
    } else {
      const sh = new THREE.Shape(); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? 1.2 : 3.2; k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(rr, 0); }
      const g = new THREE.ExtrudeGeometry(sh, { depth: .4, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(cx - .2, yS + 13.5, cz); T.add('silver', g); T.box('silver', cx - .3, yS + 8.9, cz - .3, cx + .3, yS + 10.5, cz + .3);
    }
    T.merge(tower, MAT, UVS);
    // a szentély fénye: a kész toronynál éjjel az egész térképről látszik
    glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ffd890', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
    glowS.position.set(cx - SH - 1, yS + 3, cz); glowS.scale.set(fin ? 34 : 10, fin ? 34 : 10, 1); tower.add(glowS);
    root.add(tower);
  }
  setLit(lit);

  return {
    root,
    setLit, get lit() { return lit; },
    update(t, dt, me, dayF) {
      const night = Math.max(0, Math.min(1, (.55 - dayF) / .45)), fin = lit >= 7;
      MM.lapis.emissiveIntensity = night * .9;
      for (let i = 0; i < 7; i++) MM['band' + i].emissiveIntensity = night * .45;
      if (glowS) glowS.material.opacity = fin ? .25 + night * .7 : night * .35;
      if (doorM && !fin) doorM.opacity = .25 + night * .5;
      if (me.x < 60) { for (const w of people) w.p.object.visible = false; return; }   // a körzeten kívül semmi mozgás
      for (const f of FL) { const k = 1 + Math.sin(t * 13 + f.ph) * .12 + Math.sin(t * 23 + f.ph * 2) * .08; f.s.scale.set(f.w * (2 - k), f.h * k, 1); }
      for (const w of people) { const far = Math.hypot(w.x - me.x, w.z - me.z) > 60 || (Math.abs(me.y - w.y) > 8 && Math.hypot(w.x - me.x, w.z - me.z) > 25); w.p.object.visible = !far; if (!far) w.p.update(dt, 0); }
    },
  };
}
