// Babilon utcái az Istár-kapu mögött: processziós út oroszlános falakkal, a Nagy Piac árusokkal, a Táblaház (könyvtár)
// árkádos udvarral, konyhakert, házsorok, rakpart hajókkal az Eufráteszen, járókelők.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { worldUV, instanced, LANTERNS } from './build.js';
import { CITY, PIER, collider, rectCollider, srand, sr, R, pick } from './world.js';
import { TEX, wind } from './mats.js';
import { makePerson } from './hero.js';

export const CITY_NPC = [];      // beszélő szereplők: { id, x, z, name, person }
export const CITY_TRIG = [];     // szókioldók: { w, x, z, r, y }
export const CITY_MAP = { houses: [], stalls: [], beds: [], lib: [-70, 156, -44, 186], garden: [44, 156, 78, 196] };

const tex = (w, h, draw, rep = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

export function buildCity(M, q) {
  srand(77);
  const root = new THREE.Group(), geos = {}, trig = (w, x, z, r, y = 0) => CITY_TRIG.push({ w, x, z, r, y });
  const add = (k, g) => (geos[k] ??= []).push(g);
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); add(k, g); return g; };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); add(k, g); return g; };
  const I = { jar: [], fruit: [], loaf: [], cone: [], roll: [], fish: [], gold: [], cabbage: [], onion: [], carrot: [], pumpkin: [], basket: [], tabletS: [], scroll: [], post: [], rail: [], beam: [], pot: [], palmT: [], bollard: [], crate: [], hive: [] };
  const UVS = { plaster: 3, mud: 3, brick: 3, brick2: 3, pave: 6, cobble: 5, glaze: 2, wood: 2, soil: 3, column: 2, marble: 3, dark: 1, quay: 4 };

  /* ---------- anyagok ---------- */
  const nrm = s => q.maps ? { normalMap: TEX.rockN, normalScale: new THREE.Vector2(s, s) } : {};
  const MM = {
    plaster: new THREE.MeshStandardMaterial({ color: '#ecdcc0', map: TEX.brick, ...nrm(.35), roughness: .95 }),
    mud: new THREE.MeshStandardMaterial({ color: '#c9a77a', map: TEX.brick, ...nrm(.8), roughness: 1 }),
    cobble: new THREE.MeshStandardMaterial({ color: '#c8b8a0', map: TEX.pave, ...nrm(.5), roughness: .9 }),
    quay: new THREE.MeshStandardMaterial({ color: '#b8a48a', map: TEX.brick, ...nrm(.7), roughness: .95 }),
    river: new THREE.MeshStandardMaterial({ color: '#3d6f6a', roughness: .08, metalness: .1, transparent: true, opacity: .94, ...(q.maps ? { normalMap: TEX.wn, normalScale: new THREE.Vector2(.35, .35) } : {}) }),
  };
  const awn = ['#c23a2a|#f2e6c8', '#2a5aa8|#f2e6c8', '#2f7a46|#f2d27a', '#8a3a8a|#f2e6c8', '#d08a1c|#7a2a1a'].map(cs => {
    const [a, b] = cs.split('|');
    return new THREE.MeshStandardMaterial({ map: tex(128, 128, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 16, 0, 16, 128); } g.fillStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k < 400; k++) g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }), side: THREE.DoubleSide, roughness: .9 });
  });
  const carpetM = new THREE.MeshStandardMaterial({ map: tex(128, 192, (g, w, h) => { g.fillStyle = '#7a1f2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c070'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#1f3a6a'; g.fillRect(20, 20, w - 40, h - 40); g.fillStyle = '#e8c070'; for (let y = 40; y < h - 30; y += 26) for (let x = 36; x < w - 30; x += 28) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 8, y); g.lineTo(x, y + 8); g.lineTo(x - 8, y); g.fill(); } }, false), side: THREE.DoubleSide, roughness: .95 });
  const netM = new THREE.MeshStandardMaterial({ map: tex(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#d8cfb0'; g.lineWidth = 2; for (let i = 0; i <= 64; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); } }), alphaTest: .4, transparent: false, side: THREE.DoubleSide, roughness: 1 });
  netM.map.repeat.set(3, 2);
  const sailM = new THREE.MeshStandardMaterial({ color: '#efe4cc', side: THREE.DoubleSide, roughness: .9 });
  const col = c => new THREE.MeshStandardMaterial({ color: c, roughness: .7 });

  /* ---------- burkolatok ---------- */
  const pave = (k, x0, z0, x1, z1) => box(k, x0, 0, z0, x1, .05, z1);
  pave('pave', -6, CITY.z0, 6, 222);                                     // processziós út
  pave('cobble', -36, 152, 36, 198);                                     // piactér
  pave('cobble', CITY.x0 + 1, 147, CITY.x1 - 1, 152); pave('cobble', CITY.x0 + 1, 198, CITY.x1 - 1, 203);   // keresztutcák
  pave('cobble', -44, 168, -36, 174); pave('cobble', 36, 174, 44, 180);   // bejáratok
  box('quay', CITY.x0, 0, 222, CITY.x1, .08, CITY.z1);                    // rakpart

  /* ---------- processziós út: oroszlános mázas falak ---------- */
  const lion = [];
  for (const s of [-1, 1]) {
    box('glaze', s * 7, 0, 116, s * 8.2, 4.2, 146); box('mud', s * 6.9, 4.2, 116, s * 8.3, 4.6, 146);
    for (let z = 119; z < 144; z += 6.2) lion.push({ x: s * 6.93, z, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
    rectCollider(Math.min(s * 7, s * 8.2) - .2, 116, Math.max(s * 7, s * 8.2) + .2, 146);
  }
  { const gs = lion.map(p => { const g = new THREE.PlaneGeometry(5, 2.5); g.rotateY(p.ry); g.translate(p.x, 2.1, p.z); return g; }); const m = new THREE.Mesh(mergeGeometries(gs), M.lion); m.receiveShadow = true; root.add(m); }

  /* ---------- házak ---------- */
  const house = (x0, z0, x1, z1, front, h) => {
    const m = pick(['plaster', 'mud', 'plaster', 'brick2']);
    box(m, x0, 0, z0, x1, h, z1);
    box(m, x0 - .05, h, z0 - .05, x1 + .05, h + .45, z0 + .35); box(m, x0 - .05, h, z1 - .35, x1 + .05, h + .45, z1 + .05);
    box(m, x0 - .05, h, z0, x0 + .35, h + .45, z1); box(m, x1 - .35, h, z0, x1 + .05, h + .45, z1);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = front === 'z' ? x1 - x0 : z1 - z0, fz = front === '+z' ? z1 : z0, sgn = front === '+z' ? 1 : -1;
    // ajtó, ablakok, kiálló gerendák
    const doorX = cx + R(-w / 4, w / 4);
    box('dark', doorX - .7, 0, fz + sgn * .01, doorX + .7, 2.3, fz + sgn * .03);
    box('wood', doorX - .85, 2.3, fz, doorX + .85, 2.5, fz + sgn * .12);
    for (const wx of [x0 + 1.4, x1 - 1.4]) if (Math.abs(wx - doorX) > 1.6) box('dark', wx - .4, h * .55, fz + sgn * .01, wx + .4, h * .55 + .7, fz + sgn * .03);
    for (let bx = x0 + .8; bx < x1 - .5; bx += 1.3) I.beam.push({ x: bx, y: h - .5, z: fz + sgn * .25, s: 1 });
    if (sr() < .45) { const ag = new THREE.PlaneGeometry(2.6, 1.6); ag.rotateX(-Math.PI / 2 + sgn * .45); ag.translate(doorX, 2.85, fz + sgn * .75); const am = new THREE.Mesh(ag, awn[Math.floor(sr() * awn.length)]); am.castShadow = true; root.add(am); }
    if (sr() < .5) I.pot.push({ x: doorX + 1.3, y: 0, z: fz + sgn * .45, s: R(.7, 1) });
    if (sr() < .35) { const lx = x0 + .6; box('wood', lx - .05, 0, fz + sgn * .3, lx + .05, h + .9, fz + sgn * .36); box('wood', lx + .45, 0, fz + sgn * .3, lx + .55, h + .9, fz + sgn * .36); for (let y = .4; y < h + .8; y += .45) box('wood', lx, y, fz + sgn * .3, lx + .5, y + .06, fz + sgn * .36); trig('ladder', lx + .25, fz + sgn * 1.5, 2.6); }
    rectCollider(x0 - .25, z0 - .25, x1 + .25, z1 + .25);
    CITY_MAP.houses.push([x0, z0, x1, z1]);
    trig('rooftop', cx, fz + sgn * 3, 5);
  };
  // utcasorok: északon (a keresztutca felé néző homlokzattal), délen a piac mögött
  for (const [xa, xb] of [[-78, -12], [12, 78]]) {
    let x = xa; while (x < xb - 4) { const w = Math.min(xb - x, R(7, 12)); house(x, 122, x + w, 146, '+z', R(4.5, 7.5)); if (sr() < .4 && x + w < xb - 6) { trig('alley', x + w + 1.2, 140, 3.2); x += w + 2.4; } else x += w; }
    x = xa; while (x < xb - 4) { const w = Math.min(xb - x, R(7, 11)); house(x, 204.5, x + w, 219, '-z', R(4.5, 7)); x += w + (sr() < .35 ? 2.4 : 0); }
  }
  // a könyvtár és a konyhakert melletti keskeny házak
  for (let z = 156; z < 192; z += 9) house(-79, z, -73, z + 8, 'x', R(4, 6));

  /* ---------- városfalak ---------- */
  for (const s of [-1, 1]) {
    box('brick', s * CITY.x1, 0, CITY.z0, s * (CITY.x1 + 1.5), 7, CITY.z1); box('glaze', s * (CITY.x1 - .02), 4.8, CITY.z0, s * (CITY.x1 - .1), 5.6, CITY.z1);
    box('brick', s * (CITY.x1 - 3), 0, CITY.z1 - 3, s * (CITY.x1 + 3.5), 11, CITY.z1 + 3);
  }

  /* ---------- a Nagy Piac ---------- */
  // szökőkút a közepén
  { const g = new THREE.TorusGeometry(3, .3, 8, 36); g.rotateX(Math.PI / 2); g.scale(1, 1.4, 1); g.translate(0, .45, 175); add('marble', g); cyl('marble', 0, 0, 175, 3, 3, .3, 36);
    cyl('marble', 0, .3, 175, .45, .3, 1.5, 14); cyl('marble', 0, 1.8, 175, .2, 1.1, .3, 20); collider(0, 175, 3.6); trig('fountain', 0, 175, 6); }
  for (const [x, z] of [[-32, 156], [32, 156], [-32, 194], [32, 194]]) { I.palmT.push({ x, z }); collider(x, z, .4); }
  const STALLS = [
    ['fruit', -22, 158, 1], ['baker', -22, 166.5, 1], ['spice', -22, 175, 1], ['potter', -22, 183.5, 1], ['weaver', -22, 192, 1],
    ['fish', 22, 158, -1], ['flowers', 22, 166.5, -1], ['jewel', 22, 175, -1], ['veg', 22, 183.5, -1], ['carpet', 22, 192, -1],
  ];
  const NPC_NAMES = { fruit: 'Ilu, a gyümölcsárus', baker: 'Bel, a pék', spice: 'Zakir, a fűszerárus', potter: 'Ninsun, a fazekas', weaver: 'Tabni, a kelmeárus', fish: 'Ea, a halárus' };
  STALLS.forEach(([type, sx, sz, dir], i) => {
    // helyi koordináták: a pult a +x (dir=1) vagy -x irányba néz, az árus mögötte áll
    const fx = dir, p = (lx, lz) => [sx + lx * fx, sz + lz];   // lx: előre (a vevő felé), lz: oldalirány
    const [tx, tz] = p(.3, 0);
    box('wood', tx - .55, .85, tz - 1.6, tx + .55, .95, tz + 1.6); box('wood', tx - .5, 0, tz - 1.55, tx + .5, .85, tz + 1.55);
    for (const [a, b] of [[-.9, -1.75], [-.9, 1.75], [1.1, -1.75], [1.1, 1.75]]) { const [px, pz] = p(a, b); I.post.push({ x: px, y: 0, z: pz, sx: 1, sy: a < 0 ? 2.75 : 2.3, sz: 1 }); }
    { const ag = new THREE.PlaneGeometry(2.4, 3.9); ag.rotateX(-Math.PI / 2); ag.rotateZ(fx * .32); ag.translate(...[sx + .1 * fx, 2.6, sz]); const am = new THREE.Mesh(ag, awn[i % awn.length]); am.castShadow = true; root.add(am); }
    rectCollider(tx - .7, tz - 1.8, tx + .7, tz + 1.8);
    CITY_MAP.stalls.push([sx, sz, type]);
    const top = .95, gx = (lz) => p(.3, lz);
    trig('stall', tx + fx * 1.6, tz, 3.2); trig('awning', tx + fx * 1.4, tz, 2.8, 0);
    if (type === 'fruit') { for (let k = -1; k <= 1; k++) { const [bx, bz] = gx(k * 1.05); I.basket.push({ x: bx, y: top, z: bz, s: 1 }); for (let n = 0; n < 9; n++) I.fruit.push({ x: bx + R(-.25, .25), y: top + .14 + R(0, .12), z: bz + R(-.25, .25), s: R(.07, .1), c: ['#e8741c', '#b8222a', '#5a2a5a'][k + 1] }); } trig('basket', tx + fx * 1.5, tz, 2.6); trig('scale', tx + fx * 1.5, tz + 1, 2.4); }
    if (type === 'baker') { for (let n = 0; n < 14; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.loaf.push({ x: bx + R(-.25, .25), y: top + .08, z: bz, ry: R(0, 3), s: 1 }); } trig('loaf', tx + fx * 1.5, tz, 2.8); trig('baker', tx + fx * 2.1, tz + 1, 2.6); }
    if (type === 'spice') { ['#c8321e', '#e8b018', '#d86a1c', '#7a4a22', '#6a8a2a', '#e8d8a8'].forEach((c, k) => { const [bx, bz] = gx(-1.25 + k * .5); I.basket.push({ x: bx, y: top, z: bz, s: .8 }); I.cone.push({ x: bx, y: top + .12, z: bz, s: 1, c }); }); trig('spice', tx + fx * 1.5, tz, 2.8); trig('haggle', tx + fx * 2.2, tz, 3.2); trig('scale', tx + fx * 1.5, tz - 1, 2.4); }
    if (type === 'potter') { for (let n = 0; n < 6; n++) { const [bx, bz] = gx(-1.2 + n * .48); I.jar.push({ x: bx, y: top, z: bz, s: R(.35, .55) }); } for (let n = 0; n < 5; n++) { const [bx, bz] = p(1.5 + R(0, .5), -1.6 + n * .8); I.jar.push({ x: bx, y: 0, z: bz, s: R(.8, 1.2) }); } trig('pottery', tx + fx * 1.6, tz, 2.8); trig('jar', tx + fx * 2, tz + 1.2, 2.4); }
    if (type === 'weaver') { ['#2a5aa8', '#c23a2a', '#2f7a46', '#e8c070', '#8a3a8a'].forEach((c, k) => { const [bx, bz] = gx(-1.2 + k * .6); I.roll.push({ x: bx, y: top + .1, z: bz, s: 1, c }); }); trig('fabric', tx + fx * 1.5, tz, 2.8); }
    if (type === 'fish') { box('marble', tx - .5, top, tz - 1.5, tx + .5, top + .05, tz + 1.5); for (let n = 0; n < 10; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.fish.push({ x: bx + R(-.2, .2), y: top + .08, z: bz, ry: R(-.4, .4) + Math.PI / 2, s: R(.9, 1.2) }); } trig('fishmonger', tx + fx * 1.5, tz, 2.8); }
    if (type === 'flowers') { for (let n = 0; n < 5; n++) { const [bx, bz] = gx(-1.2 + n * .6); I.pot.push({ x: bx, y: top, z: bz, s: .6 }); } }
    if (type === 'jewel') { box('dark', tx - .5, top, tz - 1.5, tx + .5, top + .02, tz + 1.5); for (let n = 0; n < 16; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.gold.push({ x: bx + R(-.3, .3), y: top + .05, z: bz, s: R(.04, .07) }); } trig('jewellery', tx + fx * 1.5, tz, 2.8); trig('coin', tx + fx * 1.5, tz + 1, 2.4); trig('purse', tx + fx * 1.5, tz - 1, 2.4); }
    if (type === 'veg') { for (let n = 0; n < 6; n++) { const [bx, bz] = gx(-1.2 + n * .48); I.basket.push({ x: bx, y: top, z: bz, s: .85 }); for (let k = 0; k < 5; k++) (n % 3 === 0 ? I.cabbage : n % 3 === 1 ? I.onion : I.carrot).push({ x: bx + R(-.15, .15), y: top + .16, z: bz + R(-.15, .15), s: n % 3 === 0 ? .17 : .08, ry: R(0, 6), rx: n % 3 === 2 ? 1.4 : 0 }); } trig('basket', tx + fx * 1.5, tz, 2.6); }
    if (type === 'carpet') { for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(1.1, 1.8); g.rotateY(Math.PI / 2); g.translate(sx - fx * .8, 1.6, sz - 1.2 + k * 1.2); const cm = new THREE.Mesh(g, carpetM); cm.castShadow = true; root.add(cm); } }
    // árus
    const [nx, nz] = p(-.6, 0), id = NPC_NAMES[type] ? type : null;
    CITY_NPC.push({ id, x: nx, z: nz, ry: fx > 0 ? Math.PI / 2 : -Math.PI / 2, name: NPC_NAMES[type] || 'Árus', look: i, talkX: sx + fx * 1.7, talkZ: sz });
    trig('merchant', sx + fx * 1.9, sz, 2.6);
  });

  /* ---------- a Táblaház (könyvtár), árkádos udvarral ---------- */
  { const [x0, z0, x1, z1] = CITY_MAP.lib, H = 7, t = 1;
    box('plaster', x0, 0, z0, x1, H, z0 + t); box('plaster', x0, 0, z1 - t, x1, H, z1); box('plaster', x0, 0, z0, x0 + t, H, z1);
    box('plaster', x1 - t, 0, z0, x1, H, 167); box('plaster', x1 - t, 0, 175, x1, H, z1); box('plaster', x1 - t, 4.6, 167, x1, H, 175);
    box('glaze', x0 - .1, 5.4, z0 - .1, x1 + .1, 6.3, z0 + .02); box('glaze', x0 - .1, 5.4, z1 - .02, x1 + .1, 6.3, z1 + .1); box('glaze', x1 - .02, 5.4, z0, x1 + .1, 6.3, z1); box('glaze', x0 - .1, 5.4, z0, x0 + .02, 6.3, z1);
    for (const z of [166.2, 175.8]) { cyl('column', x1 + .8, 0, z, .42, .36, 4.6, 14); collider(x1 + .8, z, .5); }
    box('marble', x1 - .2, 4.6, 165.6, x1 + 1.4, 5.1, 176.4);
    rectCollider(x0 - .2, z0 - .2, x1 + .2, z0 + t + .2); rectCollider(x0 - .2, z1 - t - .2, x1 + .2, z1 + .2); rectCollider(x0 - .2, z0, x0 + t + .2, z1);
    rectCollider(x1 - t - .2, z0, x1 + .2, 166.8); rectCollider(x1 - t - .2, 175.2, x1 + .2, z1);
    // árkád: tető a falak mentén, oszlopsor az udvar felé
    const A = 4.2, ix0 = x0 + t + A, ix1 = x1 - t - A, iz0 = z0 + t + A, iz1 = z1 - t - A;
    box('plaster', x0 + t, 4.4, z0 + t, x1 - t, 4.75, iz0); box('plaster', x0 + t, 4.4, iz1, x1 - t, 4.75, z1 - t);
    box('plaster', x0 + t, 4.4, iz0, ix0, 4.75, iz1); box('plaster', ix1, 4.4, iz0, x1 - t, 4.75, iz1);
    for (let x = ix0; x <= ix1 + .01; x += (ix1 - ix0) / 4) for (const z of [iz0, iz1]) { cyl('column', x, 0, z, .3, .26, 4.4, 12); collider(x, z, .38); }
    for (let z = iz0 + (iz1 - iz0) / 4; z < iz1 - .1; z += (iz1 - iz0) / 4) for (const x of [ix0, ix1]) { cyl('column', x, 0, z, .3, .26, 4.4, 12); collider(x, z, .38); }
    box('pave', x0 + t, 0, z0 + t, x1 - t, .04, z1 - t);
    // polcok agyagtáblákkal és tekercsekkel az árkád falain
    const shelf = (sx0, sz0, sx1, sz1, alongX) => {
      box('wood', sx0, 0, sz0, sx1, 2.6, sz1);
      const n = Math.floor((alongX ? sx1 - sx0 : sz1 - sz0) / .32);
      for (let row = 0; row < 4; row++) for (let k = 0; k < n; k++) { if (sr() < .18) continue; const u = (k + .5) / n; const px = alongX ? sx0 + (sx1 - sx0) * u : (sx0 + sx1) / 2 + (sx0 < x0 + 3 ? .32 : -.32), pz = alongX ? (sz0 + sz1) / 2 + (sz0 < z0 + 3 ? .32 : -.32) : sz0 + (sz1 - sz0) * u;
        (row % 2 ? I.scroll : I.tabletS).push({ x: px, y: .35 + row * .58, z: pz, s: 1, ry: alongX ? 0 : Math.PI / 2 }); }
      rectCollider(Math.min(sx0, sx1) - .3, Math.min(sz0, sz1) - .3, Math.max(sx0, sx1) + .3, Math.max(sz0, sz1) + .3);
    };
    for (let x = x0 + 2.5; x < x1 - 4; x += 5.2) { shelf(x, z0 + t, x + 4, z0 + t + .35, true); shelf(x, z1 - t - .35, x + 4, z1 - t, true); trig('bookshelf', x + 2, z0 + 3, 2.6); trig('clay tablet', x + 2, z1 - 3, 2.6); }
    for (let z = z0 + 3; z < z1 - 3; z += 6) { shelf(x0 + t, z, x0 + t + .35, z + 4.5, false); trig('scroll', x0 + 3, z + 2, 2.6); }
    // olvasóasztal tintával, a könyvtáros
    box('wood', -59.5, 0, 169.8, -56.5, .78, 172.2); box('wood', -59.7, .78, 169.6, -56.3, .86, 172.4); rectCollider(-59.9, 169.5, -56.1, 172.5);
    I.jar.push({ x: -57, y: .86, z: 171.6, s: .12 }); I.tabletS.push({ x: -58.2, y: .88, z: 171, s: 1, ry: 0 }); trig('ink', -58, 168.8, 2.4); trig('scribe', -58, 168, 3.2);
    CITY_NPC.push({ id: 'librarian', x: -58, z: 173.2, ry: Math.PI, name: 'Iddin, a könyvtáros', look: 5, talkX: -58, talkZ: 168.6 });
    trig('library', -40, 171, 5); trig('librarian', -58, 168.4, 3);
    I.palmT.push({ x: -62, z: 176.5 }); collider(-62, 176.5, .5);
  }

  /* ---------- konyhakert ---------- */
  { const [x0, z0, x1, z1] = CITY_MAP.garden;
    // kerítés (karók + lécek), bejárat nyugaton
    const fence = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 1.6); for (let k = 0; k <= n; k++) I.post.push({ x: ax + (bx - ax) * k / n, y: 0, z: az + (bz - az) * k / n, sx: .7, sy: 1.15, sz: .7 }); for (const y of [.45, .9]) { const g = new THREE.BoxGeometry(L, .06, .05); g.rotateY(-Math.atan2(bz - az, bx - ax)); g.translate((ax + bx) / 2, y, (az + bz) / 2); add('wood', g); } };
    fence(x0, z0, x1, z0); fence(x0, z1, x1, z1); fence(x1, z0, x1, z1); fence(x0, z0, x0, 173.5); fence(x0, 180.5, x0, z1);
    rectCollider(x0 - .3, z0 - .3, x1 + .3, z0 + .3); rectCollider(x0 - .3, z1 - .3, x1 + .3, z1 + .3); rectCollider(x1 - .3, z0, x1 + .3, z1); rectCollider(x0 - .3, z0, x0 + .3, 173.5); rectCollider(x0 - .3, 180.5, x0 + .3, z1);
    trig('fence', x0 + 1.5, 171, 2.6); trig('fence', x1 - 2, 190, 2.6);
    // ágyások: két sor, közte öntözőcsatorna
    const crops = ['cabbage', 'onion', 'carrot', 'pumpkin', 'beans', 'cabbage', 'onion', 'carrot'];
    let k = 0;
    for (const [bz0, bz1] of [[159, 173], [181, 195]]) for (let bx = 48; bx < 74; bx += 6.5) {
      const crop = crops[k++ % crops.length];
      box('soil', bx, 0, bz0, bx + 4, .28, bz1); rectCollider(bx - .1, bz0 - .1, bx + 4.1, bz1 + .1); CITY_MAP.beds.push([bx, bz0, bx + 4, bz1]);
      for (let px = bx + .5; px < bx + 4; px += .9) for (let pz = bz0 + .6; pz < bz1 - .3; pz += .9) {
        if (crop === 'cabbage') I.cabbage.push({ x: px, y: .42, z: pz, s: R(.24, .3), ry: R(0, 6) });
        if (crop === 'onion') I.onion.push({ x: px, y: .32, z: pz, s: .09, ry: 0 });
        if (crop === 'carrot') I.carrot.push({ x: px, y: .3, z: pz, s: .09, ry: 0, rx: 0 });
        if (crop === 'pumpkin' && sr() < .5) I.pumpkin.push({ x: px, y: .45, z: pz, s: R(.25, .35), ry: R(0, 6) });
        if (crop === 'beans' && (pz - bz0) % 1.8 < .9) I.post.push({ x: px, y: .28, z: pz, sx: .5, sy: 2, sz: .5 });
      }
      if (crop === 'beans') for (let pz = bz0 + .6; pz < bz1; pz += 1.1) I.cabbage.push({ x: bx + 2, y: 1.3 + R(-.4, .4), z: pz, s: .22, ry: R(0, 6) });
      trig(crop === 'beans' ? 'vegetable patch' : crop, bx + 2, (bz0 + bz1) / 2, 4.2); trig('vegetable patch', bx + 2, bz0 - .8, 2.4);
    }
    box('brick2', 46, 0, 175.6, 76, .25, 176); box('brick2', 46, 0, 178, 76, .25, 178.4);
    { const g = new THREE.PlaneGeometry(30, 2); g.rotateX(-Math.PI / 2); g.translate(61, .18, 177); root.add(Object.assign(new THREE.Mesh(g, M.water), { renderOrder: 1 })); }
    // madárijesztő, méhkasok, fészer, szerszámok
    { const sx = 62, sz = 166; box('wood', sx - .05, 0, sz - .05, sx + .05, 2.1, sz + .05); box('wood', sx - .8, 1.55, sz - .04, sx + .8, 1.63, sz + .04); cyl('hedge', sx, 1.1, sz, .25, .28, .7, 10); { const h = new THREE.SphereGeometry(.2, 12, 8); h.translate(sx, 2.05, sz); add('terracotta', h); } cyl('wood', sx, 2.2, sz, .32, .05, .3, 12); trig('scarecrow', sx, sz, 3.4); }
    for (let n = 0; n < 3; n++) { const hx = 75, hz = 184 + n * 2.6; I.hive.push({ x: hx, y: 0, z: hz, s: 1 }); collider(hx, hz, .6); trig('beehive', hx - 1.2, hz, 2.6); trig('honey', hx - 1.5, hz, 2.2); }
    box('wood', 72.5, 0, 157, 77.5, 3, 161.5); box('wood', 72.1, 3, 156.6, 77.9, 3.3, 161.9); rectCollider(72.3, 156.8, 77.7, 161.7); trig('harvest', 68, 158, 3);
    for (let n = 0; n < 4; n++) I.crate.push({ x: 66.2 + n * .9, y: 0, z: 157.3, s: 1, ry: R(-.2, .2) });
    I.basket.push({ x: 66.6, y: 0, z: 165, s: 1.3 });
    // talicska, locsolókanna, ásó
    { const wx = 64.5, wz = 175.2; box('wood', wx - .5, .45, wz - .3, wx + .5, .55, wz + .3); box('wood', wx - .5, .55, wz - .3, wx + .5, .8, wz - .26); box('wood', wx - .5, .55, wz + .26, wx + .5, .8, wz + .3); cyl('dark', wx + .65, .1, wz, .2, .2, .08, 12); trig('wheelbarrow', wx, wz - 1.2, 2.4); }
    { cyl('bronze', 52, 0, 175.2, .18, .14, .35, 12); trig('watering can', 52, 174, 2.2); box('wood', 54, 0, 175.15, 54.06, 1.1, 175.25); box('bronze', 53.85, 0, 175.1, 54.21, .3, 175.3); trig('spade', 54, 174, 2.2); }
    CITY_NPC.push({ id: 'farmer', x: 58, z: 174.3, ry: -Math.PI / 2, name: 'Urnamma, a földműves', look: 2, talkX: 55.6, talkZ: 174.3 });
  }

  /* ---------- rakpart, stég, hajók, Eufrátesz ---------- */
  { box('quay', CITY.x0, -1.2, CITY.z1 - .5, CITY.x1, .08, CITY.z1); box('mud', CITY.x0, .08, CITY.z1 - .5, PIER.x0, .55, CITY.z1); box('mud', PIER.x1, .08, CITY.z1 - .5, CITY.x1, .55, CITY.z1);
    const rg = new THREE.PlaneGeometry(2400, 92); rg.rotateX(-Math.PI / 2); rg.translate(0, -.45, CITY.z1 + 45); worldUV(rg, 6); const rm = new THREE.Mesh(rg, MM.river); rm.receiveShadow = true; root.add(rm);
    for (let x = PIER.x0; x < PIER.x1; x += .4) box('wood', x, -.05, PIER.z0, x + .36, .1, PIER.z1);
    for (const x of [PIER.x0, PIER.x1]) for (let z = PIER.z0 + 1; z <= PIER.z1; z += 3) cyl('wood', x, -1.4, z, .12, .12, 1.7, 8);
    for (let x = -70; x <= 70; x += 14) { if (Math.abs(x - 20) < 4) continue; I.bollard.push({ x, y: .08, z: CITY.z1 - 1.3, s: 1 }); collider(x, CITY.z1 - 1.3, .35); }
    trig('harbour', 20, 228, 6); trig('rope', 6, CITY.z1 - 1.3, 2.4); trig('rope', -28, CITY.z1 - 1.3, 2.4);
    // halászháló, kosarak
    { const g = new THREE.PlaneGeometry(3, 2); g.translate(-12, 1.2, 226.5); const nm = new THREE.Mesh(g, netM); root.add(nm); box('wood', -13.6, 0, 226.45, -13.5, 2.3, 226.55); box('wood', -10.5, 0, 226.45, -10.4, 2.3, 226.55); trig('fishing net', -12, 225, 3); }
    I.basket.push({ x: -9, y: .08, z: 227, s: 1.4 }); I.basket.push({ x: -8, y: .08, z: 226.4, s: 1.2 });
    CITY_NPC.push({ id: 'fish', x: -15, z: 226.3, ry: 0, name: 'Ea, a halász', look: 6, talkX: -15, talkZ: 224.4, alt: 'fisherman' });
    CITY_NPC.push({ id: 'boatman', x: 20, z: 236, ry: Math.PI, name: 'Sin-iddinam, a hajós', look: 4, talkX: 20, talkZ: 233.5 });
    trig('fisherman', -15, 224.6, 3);
  }
  const boats = [];
  { const hull = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hull.scale(.9, .55, 3.1); hull.translate(0, .3, 0);
    for (const [x, z, ry] of [[14, 238, .1], [26, 240, -.15], [-24, 236, 1.4], [44, 242, .5], [-50, 245, -.3]]) {
      const b = new THREE.Group(); const h = new THREE.Mesh(hull, M.wood); h.castShadow = true; b.add(h);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 4.5, 8), M.wood); mast.position.y = 2.2; b.add(mast);
      const sg = new THREE.PlaneGeometry(2.2, 2.8, 4, 4); { const p = sg.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin((p.getY(k) + 1.4) / 2.8 * Math.PI) * .25); sg.computeVertexNormals(); }
      const sail = new THREE.Mesh(sg, sailM); sail.position.set(0, 2.6, .2); sail.rotation.y = Math.PI / 2; sail.castShadow = true; b.add(sail);
      b.position.set(x, -.25, z); b.rotation.y = ry; root.add(b); boats.push({ b, ph: R(0, 6), y: -.25 });
      trig('boat', x, CITY.z1 - 1.5, 4); trig('sail', x, CITY.z1 - 1.5, 3.2);
    }
  }
  // túlpart: pálmák és házak
  for (let n = 0; n < 40; n++) I.palmT.push({ x: R(-300, 300), z: R(CITY.z1 + 96, CITY.z1 + 150), far: true });

  /* ---------- lámpások ---------- */
  const lamp = (x, z) => { cyl('bronze', x, 0, z, .09, .06, 2.3, 8); LANTERNS.push([x, 2.5, z]); collider(x, z, .22); };
  for (let z = 120; z <= 220; z += 10) for (const s of [-1, 1]) if (z < 146 || z > 199) lamp(s * 5.4, z);
  for (const [x, z] of [[-36, 152], [36, 152], [-36, 198], [36, 198], [-42, 166], [42, 182], [-40, 222], [40, 222], [0, 222]]) lamp(x, z);

  /* ---------- összevonás ---------- */
  const MAT = k => MM[k] || M[k];
  for (const [k, arr] of Object.entries(geos)) {
    if (UVS[k]) arr.forEach(g => worldUV(g, UVS[k]));
    const m = new THREE.Mesh(mergeGeometries(arr.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; })), MAT(k));
    m.castShadow = !['cobble', 'pave', 'soil', 'dark', 'quay'].includes(k); m.receiveShadow = true; root.add(m);
  }
  /* ---------- példányosított apróságok ---------- */
  const jarG = new THREE.LatheGeometry([[0, 0], [.3, 0], [.42, .3], [.38, .7], [.2, .9], [.22, 1]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  root.add(instanced(jarG, M.terracotta, I.jar));
  root.add(instanced(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: .5 }), I.fruit, { cast: false }));
  { const lg = new THREE.SphereGeometry(1, 12, 8); lg.scale(.22, .1, .12); root.add(instanced(lg, col('#b8782e'), I.loaf, { cast: false })); }
  { const cg = new THREE.ConeGeometry(.2, .22, 14); cg.translate(0, .11, 0); root.add(instanced(cg, new THREE.MeshStandardMaterial({ roughness: 1 }), I.cone, { cast: false })); }
  { const rg = new THREE.CylinderGeometry(.11, .11, .9, 12); rg.rotateZ(Math.PI / 2); root.add(instanced(rg, new THREE.MeshStandardMaterial({ roughness: .9 }), I.roll)); }
  { const fg = new THREE.SphereGeometry(1, 10, 6); fg.scale(.08, .04, .22); root.add(instanced(fg, new THREE.MeshStandardMaterial({ color: '#a8b4bc', metalness: .5, roughness: .35 }), I.fish, { cast: false })); }
  root.add(instanced(new THREE.TorusGeometry(1, .35, 8, 14), M.gold, I.gold, { cast: false }));
  { const cg = new THREE.IcosahedronGeometry(1, 2); root.add(instanced(cg, col('#6f9a4a'), I.cabbage)); }
  { const og = new THREE.SphereGeometry(1, 10, 8); og.scale(1, .9, 1); root.add(instanced(og, col('#e8d8b0'), I.onion, { cast: false })); }
  { const cg = new THREE.ConeGeometry(.6, 2.2, 8); cg.rotateX(Math.PI); cg.translate(0, -.5, 0); const tops = new THREE.ConeGeometry(.9, 2, 5); tops.translate(0, 1.4, 0); root.add(instanced(cg, col('#e8741c'), I.carrot, { cast: false })); root.add(instanced(tops, col('#5a8a34'), I.carrot.map(c => ({ ...c, y: c.y }) ), { cast: false })); }
  { const pg = new THREE.SphereGeometry(1, 14, 10); pg.scale(1, .7, 1); root.add(instanced(pg, col('#e08a24'), I.pumpkin)); }
  { const bg = new THREE.CylinderGeometry(.32, .26, .24, 14, 1, true); bg.translate(0, .12, 0); const bm = new THREE.MeshStandardMaterial({ color: '#b8925a', side: THREE.DoubleSide, roughness: 1 }); root.add(instanced(bg, bm, I.basket)); }
  { const tg = new THREE.BoxGeometry(.24, .32, .05); tg.translate(0, .16, 0); root.add(instanced(tg, col('#a87a4e'), I.tabletS, { cast: false })); }
  { const sg = new THREE.CylinderGeometry(.06, .06, .3, 8); sg.rotateZ(Math.PI / 2); root.add(instanced(sg, col('#e8dcb8'), I.scroll, { cast: false })); }
  { const pg = new THREE.CylinderGeometry(.06, .07, 1, 6); pg.translate(0, .5, 0); root.add(instanced(pg, M.wood, I.post)); }
  { const bg = new THREE.BoxGeometry(.14, .14, .8); root.add(instanced(bg, M.wood, I.beam)); }
  { const pg = new THREE.LatheGeometry([[0, 0], [.22, 0], [.3, .35], [.34, .42]].map(([x, y]) => new THREE.Vector2(x, y)), 12); root.add(instanced(pg, M.terracotta, I.pot)); const plants = I.pot.map(p => ({ x: p.x, y: p.y + .45 * p.s, z: p.z, s: p.s * .7, ry: R(0, 6) })); root.add(instanced(new THREE.IcosahedronGeometry(.6, 1), col('#4f8a3a'), plants)); }
  { const bg = new THREE.CylinderGeometry(.2, .26, .7, 10); bg.translate(0, .35, 0); root.add(instanced(bg, M.quay, I.bollard)); }
  { const cg = new THREE.BoxGeometry(.8, .5, .6); cg.translate(0, .25, 0); root.add(instanced(cg, M.wood, I.crate)); }
  { const hg = new THREE.CylinderGeometry(.45, .55, 1.1, 12); hg.translate(0, .55, 0); root.add(instanced(hg, col('#d8b878'), I.hive)); }
  // pálmák (a kert receptje alapján, egyszerűsítve: törzs + korona)
  { const trunk = new THREE.CylinderGeometry(.17, .27, 1, 8, 6); trunk.translate(0, .5, 0); { const p = trunk.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + .3 * y * y); } trunk.computeVertexNormals(); }
    const fr = []; for (let k = 0; k < 10; k++) { const g = new THREE.PlaneGeometry(3, .9, 10, 1); g.rotateX(-Math.PI / 2); g.translate(1.5, 0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, .6 * x - .3 * x * x + Math.abs(z) * .3); } g.rotateY(k * Math.PI * 2 / 10); fr.push(g); } const crown = mergeGeometries(fr); crown.computeVertexNormals();
    const tl = [], cl = []; for (const p of I.palmT) { const H = p.far ? R(6, 9) : R(6, 7.5), ry = R(0, 6.28); tl.push({ x: p.x, y: p.far ? -.4 : 0, z: p.z, ry, sx: 1, sy: H, sz: 1 }); cl.push({ x: p.x + Math.cos(ry) * .3, y: (p.far ? -.4 : 0) + H, z: p.z - Math.sin(ry) * .3, ry: R(0, 6), s: 1.1 }); }
    root.add(instanced(trunk, M.palmBark, tl)); root.add(instanced(crown, M.frond, cl, { cast: q.maps })); }
  // túlparti házak
  { const hs = []; for (let n = 0; n < 60; n++) hs.push({ x: R(-320, 320), y: -.4, z: R(345, 420), sx: R(6, 14), sy: R(4, 9), sz: R(6, 12) }); root.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), MM.mud, hs, { cast: false })); }

  /* ---------- emberek: árusok és járókelők ---------- */
  const people = [];
  for (const n of CITY_NPC) { const p = makePerson(n.look); p.object.position.set(n.x, 0, n.z); p.object.rotation.y = n.ry; root.add(p.object); n.person = p; people.push({ p, still: true, x: n.x, z: n.z }); collider(n.x, n.z, .45); }
  const ROUTES = [
    [[-3, 118], [-3, 146], [-14, 154], [-14, 196], [5.5, 200], [5.5, 150], [3, 118]],
    [[30, 154], [-30, 154], [-30, 196], [30, 196]],
    [[-60, 224.5], [60, 224.5]],
    [[-70, 149.5], [70, 149.5]],
    [[-12, 160], [12, 160], [12, 190], [-12, 190]],
    [[-40, 200.5], [40, 200.5], [40, 224], [-40, 224]],
  ];
  ROUTES.forEach((rt, i) => { const p = makePerson(i + 2); root.add(p.object); people.push({ p, rt, i: 0, x: rt[0][0], z: rt[0][1], sp: R(.9, 1.3) }); });

  let wt = 0;
  return {
    root,
    update(t, dt, me) {
      wt += dt;
      for (const w of people) {
        const far = Math.hypot(w.x - me.x, w.z - me.z) > 70; w.p.object.visible = !far; if (far) continue;
        if (w.still) { w.p.update(dt, 0); continue; }
        const [tx, tz] = w.rt[w.i], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
        if (d < .4) { w.i = (w.i + 1) % w.rt.length; continue; }
        w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt;
        w.p.object.position.set(w.x, 0, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); w.p.update(dt, w.sp);
      }
      for (const b of boats) { b.b.position.y = b.y + Math.sin(t * 1.1 + b.ph) * .06; b.b.rotation.z = Math.sin(t * .8 + b.ph) * .03; }
      if (MM.river.normalMap) MM.river.normalMap.offset.set(t * .01, t * .02);
    },
    people,
  };
}
