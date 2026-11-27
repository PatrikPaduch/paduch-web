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
  let FLAGS = null, DONKEY = null, PLANTS = null;
  const EVENTS = [];   // hang-események (pl. kalapácsütés), a main.js üríti
  const STALL_ST = [];   // standonként: { i, type, sx, sz, dir, goods: [[tömb, tól, ig]], meshes, open }
  const root = new THREE.Group(), geos = {}, trig = (w, x, z, r, y = 0) => CITY_TRIG.push({ w, x, z, r, y });
  const add = (k, g) => (geos[k] ??= []).push(g);
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); add(k, g); return g; };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); add(k, g); return g; };
  const I = { copper: [], jar: [], fruit: [], loaf: [], cone: [], roll: [], fish: [], gold: [], cabbage: [], onion: [], carrot: [], pumpkin: [], basket: [], tabletS: [], scroll: [], post: [], rail: [], beam: [], pot: [], palmT: [], bollard: [], crate: [], hive: [] };
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
  // a rétegek csak érintkeznek, nem fedik egymást (az azonos magasságú átfedés villogott)
  pave('pave', -6, CITY.z0, 6, 147); pave('pave', -6, 203, 6, 222);      // processziós út a piac előtt és után
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
  { const FX = 0, FZ = 175, lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    { const g = lathe([[2.85, .05], [2.85, .62], [3.05, .7], [3.4, .66], [3.42, .05]]); g.translate(FX, 0, FZ); add('column', g); }   // medence pereme
    { const g = new THREE.CylinderGeometry(3.425, 3.425, .18, 48, 1, true); g.translate(FX, .36, FZ); add('glaze', g); }              // mázas sáv
    { const g = new THREE.CircleGeometry(2.86, 48); g.rotateX(-Math.PI / 2); g.translate(FX, .5, FZ); const w = new THREE.Mesh(g, M.water); w.receiveShadow = true; root.add(w); }
    { const g = lathe([[.55, 0], [.42, .3], [.36, 1.2], [.5, 1.35]], 20); g.translate(FX, .05, FZ); add('column', g); }              // oszlop
    { const g = lathe([[0, 0], [.5, 0], [1.05, .22], [1.18, .36], [1.12, .4], [.9, .3]], 32); g.translate(FX, 1.38, FZ); add('column', g); }  // felső tál
    { const g = new THREE.CircleGeometry(1.08, 32); g.rotateX(-Math.PI / 2); g.translate(FX, 1.74, FZ); root.add(new THREE.Mesh(g, M.water)); }
    { const g = new THREE.SphereGeometry(.22, 16, 10); g.translate(FX, 1.95, FZ); add('glaze', g); const s2 = new THREE.ConeGeometry(.08, .35, 10); s2.translate(FX, 2.3, FZ); add('gold', s2); }
    { const g = new THREE.CylinderGeometry(1.16, 1.5, 1.25, 32, 1, true); g.translate(FX, 1.12, FZ); const f = new THREE.Mesh(g, M.fall); f.renderOrder = 2; root.add(f); }   // lehulló víz
    // mozaik a kút körül: kék máz, arany csillagsugarak
    { const T = tex(512, 512, (c, w, h) => { const cx = w / 2, R2 = w / 2;
        c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h);
        const ring = (r0, r1, col) => { c.beginPath(); c.arc(cx, cx, r1 * R2, 0, 6.3); c.arc(cx, cx, r0 * R2, 0, 6.3, true); c.fillStyle = col; c.fill(); };
        ring(.9, 1, '#2a5aa8'); ring(.86, .9, '#e8c070'); ring(.52, .56, '#e8c070'); ring(.56, .6, '#2a5aa8');
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, a2 = a + Math.PI / 16; c.beginPath(); c.moveTo(cx + Math.cos(a) * .6 * R2, cx + Math.sin(a) * .6 * R2); c.lineTo(cx + Math.cos(a2) * .86 * R2, cx + Math.sin(a2) * .86 * R2); c.lineTo(cx + Math.cos(a + Math.PI / 8) * .6 * R2, cx + Math.sin(a + Math.PI / 8) * .6 * R2); c.closePath(); c.fillStyle = k % 2 ? '#c8a050' : '#3a6ab8'; c.fill(); }
        for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * .95 * R2, cx + Math.sin(a) * .95 * R2, 5, 0, 6.3); c.fillStyle = '#f2e6c8'; c.fill(); }
        c.globalAlpha = .1; for (let k = 0; k < 3000; k++) { c.fillStyle = Math.random() < .5 ? '#000' : '#fff'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
      const g = new THREE.RingGeometry(3.4, 7.2, 72, 1); g.rotateX(-Math.PI / 2); { const uv = g.attributes.uv, ps = g.attributes.position; for (let k = 0; k < uv.count; k++) uv.setXY(k, .5 + ps.getX(k) / 14.4, .5 - ps.getZ(k) / 14.4); }
      g.translate(FX, .062, FZ); const mm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: T, roughness: .45, metalness: .05 })); mm.receiveShadow = true; root.add(mm); }
    // padok a mozaik szélén
    for (const [bx, bz] of [[-10, 153.8], [10, 153.8], [-10, 196.2], [10, 196.2]]) { const g = new THREE.BoxGeometry(2.4, .12, .6); g.translate(0, .48, 0); const l1 = new THREE.BoxGeometry(.2, .44, .5), l2 = l1.clone(); l1.translate(-.95, .22, 0); l2.translate(.95, .22, 0); const b = mergeGeometries([g, l1, l2]); b.translate(bx, 0, bz); add('column', b); rectCollider(bx - 1.3, bz - .4, bx + 1.3, bz + .4); }
    collider(FX, FZ, 3.6); trig('fountain', FX, FZ, 6); }
  for (const [x, z] of [[-32, 156], [32, 156], [-32, 194], [32, 194]]) { I.palmT.push({ x, z }); collider(x, z, .4); }
  const STALLS = [
    ['fruit', -22, 158, 1], ['baker', -22, 166.5, 1], ['spice', -22, 175, 1], ['potter', -22, 183.5, 1], ['weaver', -22, 192, 1],
    ['fish', 22, 158, -1], ['flowers', 22, 166.5, -1], ['jewel', 22, 175, -1], ['veg', 22, 183.5, -1], ['carpet', 22, 192, -1],
  ];
  const NPC_NAMES = { fruit: 'Ilu, a gyümölcsárus', baker: 'Bel, a pék', spice: 'Zakir, a fűszerárus', potter: 'Ninsun, a fazekas', weaver: 'Tabni, a kelmeárus', fish: 'Ea, a halárus', flowers: 'Ninlil, a virágárus', jewel: 'Ishme, az ékszerész', veg: 'Gula, a zöldségárus', carpet: 'Arad, a szőnyegárus' };
  STALLS.forEach(([type, sx, sz, dir], i) => {
    // helyi koordináták: a pult a +x (dir=1) vagy -x irányba néz, az árus mögötte áll
    const fx = dir, p = (lx, lz) => [sx + lx * fx, sz + lz];   // lx: előre (a vevő felé), lz: oldalirány
    const [tx, tz] = p(.3, 0);
    box('wood', tx - .55, .85, tz - 1.6, tx + .55, .95, tz + 1.6); box('wood', tx - .5, 0, tz - 1.55, tx + .5, .85, tz + 1.55);
    for (const [a, b] of [[-.9, -1.75], [-.9, 1.75], [1.1, -1.75], [1.1, 1.75]]) { const [px, pz] = p(a, b); I.post.push({ x: px, y: 0, z: pz, sx: 1, sy: a < 0 ? 2.75 : 2.3, sz: 1 }); }
    { const ag = new THREE.PlaneGeometry(2.4, 3.9); ag.rotateX(-Math.PI / 2); ag.rotateZ(fx * .32); ag.translate(...[sx + .1 * fx, 2.6, sz]); const am = new THREE.Mesh(ag, awn[i % awn.length]); am.castShadow = true; root.add(am); STALL_ST[i] = { i, type, sx, sz, dir, tx: sx + .3 * fx, goods: [], meshes: [am], open: true }; }
    rectCollider(tx - .7, tz - 1.8, tx + .7, tz + 1.8);
    CITY_MAP.stalls.push([sx, sz, type]);
    const top = .95, gx = (lz) => p(.3, lz), snap = Object.fromEntries(Object.entries(I).map(([k, a]) => [k, a.length]));
    trig('stall', tx + fx * 1.6, tz, 3.2); trig('awning', tx + fx * 1.4, tz, 2.8, 0);
    if (type === 'fruit') { for (let k = -1; k <= 1; k++) { const [bx, bz] = gx(k * 1.05); I.basket.push({ x: bx, y: top, z: bz, s: 1 }); for (let n = 0; n < 9; n++) I.fruit.push({ x: bx + R(-.25, .25), y: top + .14 + R(0, .12), z: bz + R(-.25, .25), s: R(.07, .1), c: ['#e8741c', '#b8222a', '#5a2a5a'][k + 1] }); } trig('basket', tx + fx * 1.5, tz, 2.6); trig('scale', tx + fx * 1.5, tz + 1, 2.4); }
    if (type === 'baker') { for (let n = 0; n < 14; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.loaf.push({ x: bx + R(-.25, .25), y: top + .08, z: bz, ry: R(0, 3), s: 1 }); } trig('loaf', tx + fx * 1.5, tz, 2.8); trig('baker', tx + fx * 2.1, tz + 1, 2.6); }
    if (type === 'spice') { ['#c8321e', '#e8b018', '#d86a1c', '#7a4a22', '#6a8a2a', '#e8d8a8'].forEach((c, k) => { const [bx, bz] = gx(-1.25 + k * .5); I.basket.push({ x: bx, y: top, z: bz, s: .8 }); I.cone.push({ x: bx, y: top + .12, z: bz, s: 1, c }); }); trig('spice', tx + fx * 1.5, tz, 2.8); trig('haggle', tx + fx * 2.2, tz, 3.2); trig('scale', tx + fx * 1.5, tz - 1, 2.4); }
    if (type === 'potter') { for (let n = 0; n < 6; n++) { const [bx, bz] = gx(-1.2 + n * .48); I.jar.push({ x: bx, y: top, z: bz, s: R(.35, .55) }); } for (let n = 0; n < 5; n++) { const [bx, bz] = p(1.5 + R(0, .5), -1.6 + n * .8); I.jar.push({ x: bx, y: 0, z: bz, s: R(.8, 1.2) }); } trig('pottery', tx + fx * 1.6, tz, 2.8); trig('jar', tx + fx * 2, tz + 1.2, 2.4); }
    if (type === 'weaver') { ['#2a5aa8', '#c23a2a', '#2f7a46', '#e8c070', '#8a3a8a'].forEach((c, k) => { const [bx, bz] = gx(-1.2 + k * .6); I.roll.push({ x: bx, y: top + .1, z: bz, s: 1, c }); }); trig('fabric', tx + fx * 1.5, tz, 2.8); }
    if (type === 'fish') { box('marble', tx - .5, top, tz - 1.5, tx + .5, top + .05, tz + 1.5); for (let n = 0; n < 10; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.fish.push({ x: bx + R(-.2, .2), y: top + .08, z: bz, ry: R(-.4, .4) + Math.PI / 2, s: R(.9, 1.2) }); } trig('fishmonger', tx + fx * 1.5, tz, 2.8); }
    if (type === 'flowers') { for (let n = 0; n < 5; n++) { const [bx, bz] = gx(-1.2 + n * .6); I.pot.push({ x: bx, y: top, z: bz, s: .6 }); } trig('bouquet', tx + fx * 1.5, tz, 2.8); trig('petal', tx + fx * 1.5, tz + 1, 2.2); }
    if (type === 'jewel') { box('dark', tx - .5, top, tz - 1.5, tx + .5, top + .02, tz + 1.5); for (let n = 0; n < 16; n++) { const [bx, bz] = gx(R(-1.3, 1.3)); I.gold.push({ x: bx + R(-.3, .3), y: top + .05, z: bz, s: R(.04, .07) }); } trig('jewellery', tx + fx * 1.5, tz, 2.8); trig('coin', tx + fx * 1.5, tz + 1, 2.4); trig('purse', tx + fx * 1.5, tz - 1, 2.4); trig('ring', tx + fx * 2.2, tz + .5, 2.2); trig('necklace', tx + fx * 2.2, tz - .5, 2.2); trig('bracelet', tx + fx * 2.6, tz, 2.2); trig('bargain', tx + fx * 2.6, tz + 1.4, 2.4); }
    if (type === 'veg') { for (let n = 0; n < 6; n++) { const [bx, bz] = gx(-1.2 + n * .48); I.basket.push({ x: bx, y: top, z: bz, s: .85 }); for (let k = 0; k < 5; k++) (n % 3 === 0 ? I.cabbage : n % 3 === 1 ? I.onion : I.carrot).push({ x: bx + R(-.15, .15), y: top + .16, z: bz + R(-.15, .15), s: n % 3 === 0 ? .17 : .08, ry: R(0, 6), rx: n % 3 === 2 ? 1.4 : 0 }); } trig('basket', tx + fx * 1.5, tz, 2.6); trig('bunch', tx + fx * 1.5, tz + 1, 2.4); trig('ripe', tx + fx * 2.2, tz - 1, 2.4); }
    if (type === 'carpet') { for (let k = 0; k < 3; k++) { const g = new THREE.PlaneGeometry(1.1, 1.8); g.rotateY(Math.PI / 2); g.translate(sx - fx * .8, 1.6, sz - 1.2 + k * 1.2); const cm = new THREE.Mesh(g, carpetM); cm.castShadow = true; root.add(cm); STALL_ST[i].meshes.push(cm); } trig('rug', tx + fx * 1.5, tz, 2.8); trig('pattern', tx + fx * 1.5, tz + 1.2, 2.2); trig('wool', tx + fx * 1.5, tz - 1.2, 2.2); }
    for (const [k, a] of Object.entries(I)) if (a.length > (snap[k] ?? 0)) STALL_ST[i].goods.push([a, snap[k] ?? 0, a.length]);
    // árus
    const [nx, nz] = p(-.6, 0), id = NPC_NAMES[type] ? type : null;
    CITY_NPC.push({ id, x: nx, z: nz, ry: fx > 0 ? Math.PI / 2 : -Math.PI / 2, name: NPC_NAMES[type] || 'Árus', look: i, talkX: sx + fx * 1.7, talkZ: sz, stall: i, opens: type === 'baker' ? '5:30' : '7' });
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

  /* ---------- a piac élete: kellékek ---------- */
  I.sack = [];
  // szamaras kocsi a nyugati sor mögött
  { const cx = -30, cz = 168;
    box('wood', cx - .8, .7, cz - 1.4, cx + .8, .82, cz + 1.4); box('wood', cx - .85, .82, cz - 1.4, cx - .75, 1.25, cz + 1.4); box('wood', cx + .75, .82, cz - 1.4, cx + .85, 1.25, cz + 1.4); box('wood', cx - .8, .82, cz + 1.3, cx + .8, 1.25, cz + 1.4);
    for (const s of [-1, 1]) { const w = new THREE.CylinderGeometry(.55, .55, .1, 18); w.rotateZ(Math.PI / 2); w.translate(cx + s * .92, .55, cz + .3); add('wood', w); const h = new THREE.CylinderGeometry(.04, .04, 2.2, 6); h.rotateX(Math.PI / 2); h.translate(cx + s * .45, .75, cz - 2.4); add('wood', h); }
    for (let k = 0; k < 6; k++) I.sack.push({ x: cx + R(-.5, .5), y: .82 + (k > 3 ? .3 : 0), z: cz - .9 + (k % 4) * .6, ry: R(0, 3), s: R(.9, 1.1) });
    rectCollider(cx - 1, cz - 1.6, cx + 1, cz + 1.6); collider(cx, cz - 3.4, .7);
    { const D = new THREE.Group(), dm = col('#7d6e60'), lm = col('#cfc2b0'), dk = col('#3a302a'), m = (g, mt, x, y, z, par = D) => { const o = new THREE.Mesh(g, mt); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; };
      m(new THREE.SphereGeometry(1, 16, 10), dm, 0, 1.05, 0).scale.set(.4, .42, .85);
      for (const [x, z] of [[.2, .5], [-.2, .5], [.2, -.5], [-.2, -.5]]) { m(new THREE.CylinderGeometry(.075, .06, .9, 8), dm, x, .45, z); m(new THREE.CylinderGeometry(.07, .07, .1, 8), dk, x, .05, z); }
      const neck = m(new THREE.CylinderGeometry(.13, .19, .7, 10), dm, 0, 1.38, .72); neck.rotation.x = .7;
      const head = new THREE.Group(); head.position.set(0, 1.62, .95); D.add(head);
      m(new THREE.SphereGeometry(1, 12, 8), dm, 0, -.05, .18, head).scale.set(.15, .16, .3); m(new THREE.SphereGeometry(1, 10, 8), lm, 0, -.12, .42, head).scale.set(.12, .1, .1);
      for (const s of [-1, 1]) { const e = m(new THREE.ConeGeometry(.05, .32, 6), dm, s * .08, .2, .02, head); e.rotation.z = -s * .25; }
      const tail = new THREE.Group(); tail.position.set(0, 1.25, -.82); D.add(tail); m(new THREE.CylinderGeometry(.025, .02, .55, 5), dk, 0, -.27, -.02, tail);
      D.position.set(cx, .05, cz - 3.5); D.rotation.y = Math.PI; root.add(D); DONKEY = { head, tail }; }
    trig('donkey', cx + 1.2, cz - 3.5, 2.6); trig('cart', cx + 1.3, cz, 2.6); trig('sack', cx + 1.3, cz + 1.2, 2.2);
  }
  // zsákok, ládák, korsók a standok mögött
  for (const [sx, sz, dir] of [[-22, 158, 1], [-22, 183.5, 1], [22, 166.5, -1], [22, 183.5, -1], [22, 192, -1], [-22, 192, 1]]) {
    const bx = sx - dir * 2.3;
    for (let k = 0; k < 3; k++) I.sack.push({ x: bx + R(-.3, .3), y: .05, z: sz - 1.2 + k * .55, ry: R(0, 3), s: R(.9, 1.15) });
    I.crate.push({ x: bx - dir * .4, y: .05, z: sz + 1.3, ry: R(-.2, .2), s: 1 }); I.crate.push({ x: bx - dir * .4, y: .55, z: sz + 1.3, ry: R(-.3, .3), s: .9 });
    I.jar.push({ x: bx, y: .05, z: sz + .5, s: R(.7, .9) }); rectCollider(bx - .7, sz - 1.6, bx + .7, sz + 1.8); if (sz === 166.5) trig('crate', bx - dir * 1.6, sz + 1.3, 2.4); }
  // kerekes kút a keleti sor mögött
  { const wx = 30, wz = 176; cyl('column', wx, 0, wz, 1, 1, .85, 24); cyl('glaze', wx, .55, wz, 1.02, 1.02, .14, 24);
    for (const s of [-1, 1]) box('wood', wx + s * .85 - .07, .85, wz - .07, wx + s * .85 + .07, 2.4, wz + .07);
    box('wood', wx - .95, 2.3, wz - .06, wx + .95, 2.42, wz + .06); { const r = new THREE.CylinderGeometry(.04, .04, 1.5, 6); r.translate(wx, 1.6, wz); add('wood', r); } I.jar.push({ x: wx + 1.3, y: .05, z: wz + .4, s: .8 });
    collider(wx, wz, 1.2); trig('well', wx - 1.8, wz, 2.8); trig('hen', 30.5, 186.5, 4.2); }
  // dézsás pálmák és virágok a piac szélén
  for (const x of [-14, -6, 6, 14]) for (const z of [153, 197]) { if (Math.abs(x) < 7 && z === 197) continue; I.pot.push({ x, y: .05, z, s: 1.7, noPlant: true }); I.palmT.push({ x, z, small: true }); collider(x, z, .7); }
  // ünnepi zászlófüzérek a piac fölött (keletről nyugatra, belógó ívvel)
  { const lines = [], flags = [], FC = ['#c23a2a', '#2a5aa8', '#e8c070', '#2f7a46', '#f2e6c8', '#8a3a8a'];
    for (const z of [158, 166.5, 183.5, 192]) {
      for (const s of [-1, 1]) cyl('wood', s * 25.2, 0, z, .08, .06, 5.2, 8);
      const pts = []; for (let k = 0; k <= 24; k++) { const u = k / 24, x = -25.2 + 50.4 * u; pts.push(new THREE.Vector3(x, 5 - 1.1 * 4 * u * (1 - u), z)); }
      lines.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, .012, 4, false));
      for (let x = -24.5; x <= 24.5; x += .75) { const u = (x + 25.2) / 50.4; flags.push({ x, y: 5 - 1.1 * 4 * u * (1 - u) - .02, z, c: FC[flags.length % FC.length] }); }
    }
    root.add(new THREE.Mesh(mergeGeometries(lines), col('#5a4630')));
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute([-.18, 0, 0, .18, 0, 0, 0, -.42, 0], 3)); fg.computeVertexNormals();
    const fm = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .85 }), flags.length), d = new THREE.Object3D(), cc = new THREE.Color();
    flags.forEach((f, k) => { d.position.set(f.x, f.y, f.z); d.rotation.set(0, 0, 0); d.updateMatrix(); fm.setMatrixAt(k, d.matrix); fm.setColorAt(k, cc.set(f.c)); });
    fm.userData.flags = flags; root.add(fm); FLAGS = fm; }
  // szőnyegek kiterítve a szőnyegárus előtt
  for (const [x, z, r] of [[18.6, 190.6, .1], [18.4, 193.2, -.08]]) { const g = new THREE.PlaneGeometry(1.4, 2.2); g.rotateX(-Math.PI / 2); g.rotateY(r + Math.PI / 2); g.translate(x, .065, z); const cm = new THREE.Mesh(g, carpetM); cm.receiveShadow = true; root.add(cm); }

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
  for (let n = 0; n < 40; n++) { const x = R(-300, 300); if (x > -90 && x < 110) continue; I.palmT.push({ x, z: R(CITY.z1 + 96, CITY.z1 + 150), far: true }); }

  /* ---------- lámpások ---------- */
  trig('lantern', -5.4, 125, 2.6); trig('lantern', 5.4, 215, 2.6);
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
  const IM = new Map(), reg = (arr, im) => { if (!IM.has(arr)) IM.set(arr, []); IM.get(arr).push(im); return im; };
  const inst = (g, m, arr, o) => reg(arr, instanced(g, m, arr, o));
  root.add(inst(jarG, M.terracotta, I.jar));
  root.add(instanced(jarG, new THREE.MeshStandardMaterial({ color: '#c8743a', metalness: .85, roughness: .3 }), I.copper));
  root.add(inst(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: .5 }), I.fruit, { cast: false }));
  { const lg = new THREE.SphereGeometry(1, 12, 8); lg.scale(.22, .1, .12); root.add(inst(lg, col('#b8782e'), I.loaf, { cast: false })); }
  { const cg = new THREE.ConeGeometry(.2, .22, 14); cg.translate(0, .11, 0); root.add(inst(cg, new THREE.MeshStandardMaterial({ roughness: 1 }), I.cone, { cast: false })); }
  { const rg = new THREE.CylinderGeometry(.11, .11, .9, 12); rg.rotateZ(Math.PI / 2); root.add(inst(rg, new THREE.MeshStandardMaterial({ roughness: .9 }), I.roll)); }
  { const fg = new THREE.SphereGeometry(1, 10, 6); fg.scale(.08, .04, .22); root.add(inst(fg, new THREE.MeshStandardMaterial({ color: '#a8b4bc', metalness: .5, roughness: .35 }), I.fish, { cast: false })); }
  root.add(inst(new THREE.TorusGeometry(1, .35, 8, 14), M.gold, I.gold, { cast: false }));
  { const cg = new THREE.IcosahedronGeometry(1, 2); root.add(inst(cg, col('#6f9a4a'), I.cabbage)); }
  { const og = new THREE.SphereGeometry(1, 10, 8); og.scale(1, .9, 1); root.add(inst(og, col('#e8d8b0'), I.onion, { cast: false })); }
  { const cg = new THREE.ConeGeometry(.6, 2.2, 8); cg.rotateX(Math.PI); cg.translate(0, -.5, 0); const tops = new THREE.ConeGeometry(.9, 2, 5); tops.translate(0, 1.4, 0); root.add(inst(cg, col('#e8741c'), I.carrot, { cast: false })); root.add(reg(I.carrot, instanced(tops, col('#5a8a34'), I.carrot.map(c => ({ ...c, y: c.y }) ), { cast: false }))); }
  { const pg = new THREE.SphereGeometry(1, 14, 10); pg.scale(1, .7, 1); root.add(instanced(pg, col('#e08a24'), I.pumpkin)); }
  { const bg = new THREE.CylinderGeometry(.32, .26, .24, 14, 1, true); bg.translate(0, .12, 0); const bm = new THREE.MeshStandardMaterial({ color: '#b8925a', side: THREE.DoubleSide, roughness: 1 }); root.add(inst(bg, bm, I.basket)); }
  { const tg = new THREE.BoxGeometry(.24, .32, .05); tg.translate(0, .16, 0); root.add(instanced(tg, col('#a87a4e'), I.tabletS, { cast: false })); }
  { const sg = new THREE.CylinderGeometry(.06, .06, .3, 8); sg.rotateZ(Math.PI / 2); root.add(instanced(sg, col('#e8dcb8'), I.scroll, { cast: false })); }
  { const pg = new THREE.CylinderGeometry(.06, .07, 1, 6); pg.translate(0, .5, 0); root.add(instanced(pg, M.wood, I.post)); }
  { const bg = new THREE.BoxGeometry(.14, .14, .8); root.add(instanced(bg, M.wood, I.beam)); }
  { const pg = new THREE.LatheGeometry([[0, 0], [.22, 0], [.3, .35], [.34, .42]].map(([x, y]) => new THREE.Vector2(x, y)), 12); root.add(inst(pg, M.terracotta, I.pot)); const plants = I.pot.map((p, k) => [p, k]).filter(([p]) => !p.noPlant).map(([p, k]) => ({ x: p.x, y: p.y + .45 * p.s, z: p.z, s: p.s * .7, ry: R(0, 6), src: k })); const pm = instanced(new THREE.IcosahedronGeometry(.6, 1), col('#4f8a3a'), plants); root.add(pm); PLANTS = { pm, of: new Map(plants.map((p, j) => [p.src, j])) }; }
  { const bg = new THREE.CylinderGeometry(.2, .26, .7, 10); bg.translate(0, .35, 0); root.add(instanced(bg, M.quay, I.bollard)); }
  { const cg = new THREE.BoxGeometry(.8, .5, .6); cg.translate(0, .25, 0); root.add(instanced(cg, M.wood, I.crate)); }
  { const hg = new THREE.CylinderGeometry(.45, .55, 1.1, 12); hg.translate(0, .55, 0); root.add(instanced(hg, col('#d8b878'), I.hive)); }
  { const sg = new THREE.SphereGeometry(1, 12, 8); sg.scale(.3, .26, .22); sg.translate(0, .24, 0); { const p = sg.attributes.position; for (let k = 0; k < p.count; k++) if (p.getY(k) > .4) p.setX(k, p.getX(k) * .6); } sg.computeVertexNormals(); root.add(instanced(sg, col('#cdb78a'), I.sack)); }
  // pálmák (a kert receptje alapján, egyszerűsítve: törzs + korona)
  { const trunk = new THREE.CylinderGeometry(.17, .27, 1, 8, 6); trunk.translate(0, .5, 0); { const p = trunk.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) + .3 * y * y); } trunk.computeVertexNormals(); }
    const fr = []; for (let k = 0; k < 10; k++) { const g = new THREE.PlaneGeometry(3, .9, 10, 1); g.rotateX(-Math.PI / 2); g.translate(1.5, 0, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, .6 * x - .3 * x * x + Math.abs(z) * .3); } g.rotateY(k * Math.PI * 2 / 10); fr.push(g); } const crown = mergeGeometries(fr); crown.computeVertexNormals();
    const tl = [], cl = []; for (const p of I.palmT) { const H = p.far ? R(6, 9) : p.small ? R(1.6, 2.2) : R(6, 7.5), ry = R(0, 6.28), y0 = p.far ? -.4 : p.small ? .55 : 0, k = p.small ? .3 : .3; tl.push({ x: p.x, y: y0, z: p.z, ry, sx: p.small ? .55 : 1, sy: H, sz: p.small ? .55 : 1 }); cl.push({ x: p.x + Math.cos(ry) * k * (p.small ? .4 : 1), y: y0 + H, z: p.z - Math.sin(ry) * k * (p.small ? .4 : 1), ry: R(0, 6), s: p.small ? .55 : 1.1 }); }
    root.add(instanced(trunk, M.palmBark, tl)); root.add(instanced(crown, M.frond, cl, { cast: q.maps })); }
  // túlparti házak
  { const hs = []; for (let n = 0; n < 60; n++) { const x = R(-320, 320), z = R(345, 420); if (x > -95 && x < 115 && z < 405) continue; hs.push({ x, y: -.4, z, sx: R(6, 14), sy: R(4, 9), sz: R(6, 12) }); } root.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), MM.mud, hs, { cast: false })); }

  /* ---------- emberek: árusok és járókelők ---------- */
  /* ---------- rézműves-műhely (a kalapálás hangja innen szól) ---------- */
  const SMITH = { x: 31, z: 159.5 };
  { const { x, z } = SMITH;
    for (const [a, b] of [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.4], [1.6, 1.4]]) I.post.push({ x: x + a, y: 0, z: z + b, sx: 1.2, sy: 2.7, sz: 1.2 });
    box('wood', x - 1.9, 2.7, z - 1.7, x + 1.9, 2.85, z + 1.7);
    box('dark', x - .35, 0, z - .2, x + .35, .55, z + .2); box('dark', x - .5, .55, z - .22, x + .45, .75, z + .22); { const h = new THREE.ConeGeometry(.12, .4, 8); h.rotateZ(Math.PI / 2); h.translate(x - .7, .65, z); add('dark', h); }
    box('wood', x + .9, 0, z - 1.2, x + 1.5, .8, z + 1.2);
    for (let k = 0; k < 7; k++) I.copper.push({ x: x + 1.2 + R(-.15, .15), y: .8, z: z - 1 + k * .33, s: R(.28, .4) });
    for (let k = 0; k < 4; k++) I.copper.push({ x: x - 1.3 + k * .5, y: .05, z: z + 1.9, s: R(.6, .9) });
    rectCollider(x - 1.8, z - 1.6, x + 1.8, z + 1.6);
    trig('anvil', x - 2.4, z, 2.6); trig('hammer', x - 2.4, z + 1.2, 2.4); trig('copper', x - 2.4, z - 1.2, 2.6); }

  /* ---------- napszak-kellékek ---------- */
  const AWC = ['#c23a2a', '#2a5aa8', '#2f7a46', '#8a3a8a', '#d08a1c'];
  // feltekert napellenző és ponyvás pult standonként (zárva látszanak)
  const rollIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .16, 3.9, 12).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: .9 }), STALL_ST.length);
  const coverIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.35, .34, 3.6), new THREE.MeshStandardMaterial({ color: '#a89272', roughness: 1 }), STALL_ST.length);
  { const cc = new THREE.Color(); STALL_ST.forEach((st, k) => rollIM.setColorAt(k, cc.set(AWC[k % AWC.length]))); }
  for (const m of [rollIM, coverIM]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; for (let k = 0; k < m.count; k++) m.setMatrixAt(k, new THREE.Matrix4().makeScale(0, 0, 0)); root.add(m); }
  // lángok: additív sprite-ok, pislákolnak
  const flameT = tex(64, 128, (c, w, h) => { const g = c.createRadialGradient(32, 92, 2, 32, 80, 60); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(.25, 'rgba(255,190,70,.95)'); g.addColorStop(.6, 'rgba(255,90,20,.45)'); g.addColorStop(1, 'rgba(255,40,0,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(32, 2); c.bezierCurveTo(60, 60, 62, 120, 32, 126); c.bezierCurveTo(2, 120, 4, 60, 32, 2); c.fill(); });
  const flameM = new THREE.SpriteMaterial({ map: flameT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
  const FLAMES = [];
  const flame = (parent, x, y, z, w = .35, h = .6) => { const sp = new THREE.Sprite(flameM); sp.position.set(x, y, z); sp.scale.set(w, h, 1); sp.renderOrder = 4; parent.add(sp); FLAMES.push({ sp, w, h, ph: R(0, 6), y }); return sp; };
  const smokeT = tex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(200,195,190,.55)'); g.addColorStop(1, 'rgba(200,195,190,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  // a pék agyagkemencéje (tannur) a standja mögött, füsttel
  const OVEN = { x: -24.6, z: 168.4 }, SMOKE = [];
  { const g = new THREE.LatheGeometry([[0, 0], [.75, 0], [.78, .5], [.6, .95], [.3, 1.18], [.22, 1.22]].map(([x, y]) => new THREE.Vector2(x, y)), 20); g.translate(OVEN.x, .05, OVEN.z); add('terracotta', g); collider(OVEN.x, OVEN.z, .9);
    const sm = new THREE.SpriteMaterial({ map: smokeT, depthWrite: false, transparent: true });
    for (let k = 0; k < 7; k++) { const sp = new THREE.Sprite(sm.clone()); sp.renderOrder = 4; root.add(sp); SMOKE.push({ sp, t: k / 7 }); } trig('oven', OVEN.x + 1.4, OVEN.z, 2.6); }
  // éjjeli piac: 4 bódé a kút körül (csak 20:30 és 0:30 között)
  const nightG = new THREE.Group(); nightG.visible = false; root.add(nightG);
  const NIGHT_TORCH = [];   // a LANTERNS-be tett fáklyák (nappal mélyre tesszük őket, így nem kapnak fényt)
  const NB = [['tea', -12.5, 175, 1, '#6a1f2a'], ['food', 12.5, 175, -1, '#1f3a6a'], ['story', 0, 188.5, -1, '#4a2a5a'], ['music', 0, 161.5, 1, '#2a4a3a']];
  const nmat = c => new THREE.MeshStandardMaterial({ color: c, roughness: .85 }), nwood = M.wood;
  const nbox = (mt, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); const m = new THREE.Mesh(g, mt); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.castShadow = true; m.receiveShadow = true; nightG.add(m); return m; };
  const NIGHT_NPC = [];
  for (const [type, bx, bz, dir, roofC] of NB) {
    const alongZ = type === 'tea' || type === 'food';            // a pult iránya
    const P = (f, l) => alongZ ? [bx + f * dir, bz + l] : [bx + l, bz + f * dir];   // f: előre, l: oldalra
    if (type === 'tea' || type === 'food') {
      { const [x, z] = P(0, 0); nbox(nwood, x - .45, 0, z - 1.1, x + .45, .9, z + 1.1); }
      for (const [f, l] of [[-.7, -1.3], [-.7, 1.3], [.6, -1.3], [.6, 1.3]]) { const [x, z] = P(f, l); nbox(nwood, x - .05, 0, z - .05, x + .05, 2.5, z + .05); }
      { const [x, z] = P(-.05, 0); const r = nbox(nmat(roofC), x - .9, 2.5, z - 1.5, x + .9, 2.56, z + 1.5); }
      // parázstartó a pult mellett
      { const [x, z] = P(.9, 1.7); const b = new THREE.Mesh(new THREE.CylinderGeometry(.38, .2, .35, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#3a302a', metalness: .6, roughness: .5, side: THREE.DoubleSide })); b.position.set(x, .65, z); nightG.add(b); const lg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 6), nwood); lg.position.set(x, .25, z); nightG.add(lg);
        const coal = new THREE.Mesh(new THREE.CircleGeometry(.34, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a0a00', emissive: '#ff5a10', emissiveIntensity: 1.6 })); coal.position.set(x, .78, z); nightG.add(coal); flame(nightG, x, 1.05, z, .45, .7); NIGHT_TORCH.push([x, 1.4, z]); }
      if (type === 'tea') { const [x, z] = P(0, -.4); const k = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 10), new THREE.MeshStandardMaterial({ color: '#b87333', metalness: .8, roughness: .35 })); k.position.set(x, 1.05, z); nightG.add(k); for (let n = 0; n < 5; n++) { const [cx, cz] = P(.1, .2 + n * .22); const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .035, .08, 10), M.terracotta); c.position.set(cx, .95, cz); nightG.add(c); } }
      if (type === 'food') { for (let n = 0; n < 6; n++) { const [x, z] = P(0, -.9 + n * .35); const f = new THREE.Mesh(new THREE.CircleGeometry(.14, 12).rotateX(-Math.PI / 2), nmat('#d8a860')); f.position.set(x, .91, z); nightG.add(f); } }
    } else {
      // mesemondó és zenész: szőnyeg a földön, két ülőpárna
      { const g = new THREE.PlaneGeometry(2.6, 1.8); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, carpetM); m.position.set(bx, .066, bz); nightG.add(m); }
      for (const l of [-1.5, 1.5]) { const [x, z] = P(1.6, l); const c = new THREE.Mesh(new THREE.CylinderGeometry(.35, .38, .18, 14), nmat(type === 'story' ? '#8a3a3a' : '#3a5a8a')); c.position.set(x, .14, z); nightG.add(c); }
    }
    // két fáklya a bódé két oldalán
    for (const l of [-1.7, 1.7]) { const [x, z] = P(type === 'tea' || type === 'food' ? .9 : -.6, l * (type === 'tea' || type === 'food' ? -1 : 1)); if (type === 'tea' || type === 'food') { if (l > 0) continue; } nbox(nwood, x - .04, 0, z - .04, x + .04, 1.9, z + .04); const cup = new THREE.Mesh(new THREE.CylinderGeometry(.09, .06, .18, 10), new THREE.MeshStandardMaterial({ color: '#3a302a', metalness: .5 })); cup.position.set(x, 1.95, z); nightG.add(cup); flame(nightG, x, 2.22, z, .32, .55); NIGHT_TORCH.push([x, 2.3, z]); }
    const [nx, nz] = P(type === 'tea' || type === 'food' ? -.75 : 0, 0), ry = alongZ ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
    const [tx2, tz2] = P(type === 'tea' || type === 'food' ? 1.7 : 1.9, 0);
    const npc = { id: type === 'tea' || type === 'story' ? type : null, x: nx, z: nz, ry, name: { tea: 'Belet, a teaárus', food: 'Kubaba, a lepénysütő', story: 'Ludingirra, a mesemondó', music: 'Enlil-bani, a lantos' }[type], look: { tea: 2, food: 5, story: 0, music: 4 }[type], talkX: tx2, talkZ: tz2, hidden: true, night: true, type };
    CITY_NPC.push(npc); NIGHT_NPC.push(npc);
  }
  for (const t of NIGHT_TORCH) { t.push(t[1]); LANTERNS.push(t); }   // [x, y, z, eredeti y]
  // őrök fáklyával, macska (csak éjjel)
  const GUARD_RT = [
    [[-33, 155], [33, 155], [33, 195], [-33, 195]],
    [[3, 120], [3, 149.5], [-60, 149.5], [3, 149.5], [3, 200.5], [3, 224], [50, 224], [3, 224], [3, 200.5], [3, 149.5]],
  ];
  const CAT = (() => {
    const g = new THREE.Group(), m = nmat('#6a5a4a'), S = (sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); g.add(o); return o; };
    S(.11, .1, .22, 0, .2, 0); const hd = S(.08, .075, .08, 0, .3, .2); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.025, .06, 4), m); e.position.set(s * .045, .38, .2); g.add(e); }
    for (const [x, z] of [[.05, .12], [-.05, .12], [.05, -.12], [-.05, -.12]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .16, 5), m); l.position.set(x, .08, z); g.add(l); }
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(.015, .012, .3, 5), m); tl.position.set(0, .3, -.3); tl.rotation.x = -.7; g.add(tl);
    g.visible = false; root.add(g); return { g, tl, x: -4, z: 168, tx: -4, tz: 168, t: 0 };
  })();

  const people = [];
  const LQ = !q.maps;   // gyenge gép: kevesebb vásárló és madár
  for (const n of CITY_NPC) {
    const p = makePerson(n.look); p.object.position.set(n.x, 0, n.z); p.object.rotation.y = n.ry; root.add(p.object); n.person = p;
    const w = { p, still: true, x: n.x, z: n.z, n, home: [n.x, n.z, n.ry], on: true, path: [] };
    if (n.stall !== undefined) { w.merchant = STALL_ST[n.stall]; STALL_ST[n.stall].w = w; }
    if (n.night) { w.nightNpc = true; w.on = false; p.object.visible = false; if (n.type === 'music') { const ly = new THREE.Group(); const fr = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 6, 16, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: '#8a5a2a' })); fr.rotation.z = -.6; ly.add(fr); ly.position.set(.12, 1.25, .28); ly.rotation.y = .3; p.object.add(ly); } }
    if (!n.night) collider(n.x, n.z, .45);
    people.push(w);
  }
  const smith = (() => { const p = makePerson(6, 1.05); p.object.position.set(SMITH.x + .9, .05, SMITH.z); p.object.rotation.y = -Math.PI / 2; root.add(p.object); const w = { p, smithW: true, on: true, still: true, x: SMITH.x + .9, z: SMITH.z, u: 0, hits: 0, rest: 0 }; people.push(w); collider(w.x, w.z, .45); return w; })();
  const guards = GUARD_RT.map((rt, k) => { const p = makePerson(k ? 6 : 1, 1.04); root.add(p.object); const tch = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .8, 6), M.wood); pole.position.set(0, -.25, 0); tch.add(pole); flame(tch, 0, .28, 0, .3, .5); tch.position.set(.36, 1.25, .2); p.object.add(tch); const w = { p, rt, i: 0, x: rt[0][0], z: rt[0][1], sp: .85, guard: true, on: false, torch: [rt[0][0], -999, rt[0][1], -999] }; p.object.visible = false; LANTERNS.push(w.torch); people.push(w); return w; });
  const ROUTES = [
    [[-3, 118], [-3, 146], [-14, 154], [-14, 196], [5.5, 200], [5.5, 150], [3, 118]],
    [[30, 154], [-30, 154], [-30, 196], [30, 196]],
    [[-60, 224.5], [60, 224.5]],
    [[-70, 149.5], [70, 149.5]],
    [[-12, 160], [12, 160], [12, 190], [-12, 190]],
    [[-40, 200.5], [40, 200.5], [40, 224], [-40, 224]],
  ];
  ROUTES.forEach((rt, i) => { const p = makePerson(i + 2); root.add(p.object); people.push({ p, rt, i: 0, x: rt[0][0], z: rt[0][1], sp: R(.9, 1.3), walker: i, on: true }); });
  // vásárlók: standról standra mennek, megállnak, nézelődnek, alkudoznak
  const SPOTS = STALLS.flatMap(([, sx, sz, dir]) => [-1.2, 1.2].map(o => ({ x: sx + dir * 2.2, z: sz + o, ry: dir > 0 ? -Math.PI / 2 : Math.PI / 2, busy: false })));
  SPOTS.forEach((s, k) => { s.stall = STALL_ST[k >> 1]; });
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .2; SPOTS.push({ x: Math.cos(a) * 4.3, z: 175 + Math.sin(a) * 4.3, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), busy: false, fountain: true }); }
  // éjjel: a bódék elé (a mesemondót és a lantost körbeállják)
  for (const n of NIGHT_NPC) { const fx = n.talkX - n.x, fz = n.talkZ - n.z, l = Math.hypot(fx, fz) || 1; for (const o of [-1.1, 1.1]) { const x = n.talkX + fx / l * .4 - fz / l * o, z = n.talkZ + fz / l * .4 + fx / l * o; SPOTS.push({ x, z, ry: Math.atan2(n.x - x, n.z - z), busy: false, night: true }); } }
  const EXITS = [[-30, 149.5, -46], [30, 149.5, 46], [-30, 200.5, -46], [30, 200.5, 46]];   // [x, z, ahol eltűnik (x)]
  const exitPath = (x, z) => { const e = EXITS.reduce((b, e) => Math.hypot(e[0] - x, e[1] - z) < Math.hypot(b[0] - x, b[1] - z) ? e : b); return [...viaFountain(x, z, e[0], e[1]), [e[2], e[1]]]; };
  const enterFrom = (x, z) => { const e = pick(EXITS); return { start: [e[2], e[1]], path: [[e[0], e[1]], ...viaFountain(e[0], e[1], x, z)] }; };
  const viaFountain = (ax, az, bx, bz) => {           // ha a szakasz a kúton menne át, megkerüli
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((0 - ax) * dx + (175 - az) * dz) / L2)), px = ax + dx * u, pz = az + dz * u, d = Math.hypot(px, pz - 175);
    if (d > 4.8) return [[bx, bz]];
    let nx = px, nz = pz - 175; if (d < .01) { nx = -dz; nz = dx; } const l = Math.hypot(nx, nz); return [[nx / l * 5.6, 175 + nz / l * 5.6], [bx, bz]];
  };
  const shoppers = [];
  for (let k = 0; k < (LQ ? 6 : 12); k++) {
    const sp = SPOTS.filter(s => !s.busy)[Math.floor(Math.random() * 10)]; sp.busy = true;
    const p = makePerson(k + 3, R(.92, 1.04)); root.add(p.object);
    const w = { p, shop: true, k, on: true, x: sp.x, z: sp.z, spot: sp, path: [], m: 'stay', t: R(1, 8), sp: R(.8, 1.15), face: sp.ry };
    p.object.position.set(w.x, .05, w.z); p.object.rotation.y = sp.ry; people.push(w); shoppers.push(w);
  }
  // gyerekek kergetőznek a kút körül
  for (let k = 0; k < 2; k++) { const p = makePerson(k + 1, .62); root.add(p.object); people.push({ p, kid: true, on: true, a: k * Math.PI + .5, r: 9.6, x: 0, z: 175, sp: 2.6 }); }
  // talpfoltok (egy példányos háló mindenkinek)
  const blobT = tex(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.15, 1.15).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobT, transparent: true, depthWrite: false }), people.length);
  blobs.renderOrder = 3; blobs.frustumCulled = false; root.add(blobs);
  for (const w of people) w.p.object.traverse(o => { if (o.isMesh) o.castShadow = false; });

  /* ---------- madarak: galambok a kútnál (felröppennek, ha közel mész), tyúkok a kút mögött ---------- */
  const birds = [];
  const birdGeo = (kind) => {
    const S = (r, sx, sy, sz, x, y, z) => { const g = new THREE.SphereGeometry(r, 10, 7); g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
    return kind === 'p' ? mergeGeometries([S(1, .09, .08, .15, 0, .12, 0), S(.05, 1, 1, 1, 0, .21, .12), S(1, .03, .012, .1, 0, .12, -.17), S(1, .13, .012, .08, .08, .15, -.01), S(1, .13, .012, .08, -.08, .15, -.01)])
      : mergeGeometries([S(1, .15, .15, .2, 0, .27, 0), S(.075, 1, 1, 1, 0, .45, .15), S(1, .04, .1, .08, 0, .35, -.2), new THREE.CylinderGeometry(.015, .015, .16, 5).translate(.05, .08, 0), new THREE.CylinderGeometry(.015, .015, .16, 5).translate(-.05, .08, 0)]);
  };
  const pickSpot = b => { for (let k = 0; k < 8; k++) { const a = R(0, 6.28), d = R(b.r0, b.r1), x = b.cx + Math.cos(a) * d, z = b.cz + Math.sin(a) * d; if (!B.me || Math.hypot(x - B.me.x, z - B.me.z) > 5) return [x, z]; } return [b.cx + b.r1, b.cz]; };
  const B = { me: null };
  const flock = (kind, n, cx, cz, r0, r1, colors) => {
    const im = new THREE.InstancedMesh(birdGeo(kind), new THREE.MeshStandardMaterial({ roughness: .8 }), n), cc = new THREE.Color(); im.frustumCulled = false; root.add(im);
    for (let k = 0; k < n; k++) { const b = { kind, im, k, cx, cz, r0, r1, y: 0, ry: R(0, 6.28), m: 'idle', t: R(0, 4), ph: R(0, 6), vx: 0, vy: 0, vz: 0, tx: 0, tz: 0, land: false }; [b.x, b.z] = pickSpot(b); birds.push(b); im.setColorAt(k, cc.set(pick(colors))); }
  };
  trig('pigeon', 0, 165, 4.5); trig('pigeon', 0, 185, 4.5);
  flock('p', LQ ? 8 : 16, 0, 175, 4, 11, ['#8a929e', '#7a8290', '#a8aeb8', '#6a7080', '#c8c8c8']);
  flock('c', LQ ? 3 : 6, 30.5, 186.5, .6, 3.8, ['#f2ece0', '#b8743a', '#8a4a22', '#e8dcc8']);
  const bd = new THREE.Object3D();

  /* ---------- napszak: ki van kint, mi van nyitva ---------- */
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), ID = new THREE.Matrix4();
  const origOf = im => im.userData.orig ??= Array.from({ length: im.count }, (_, k) => { const m = new THREE.Matrix4(); im.getMatrixAt(k, m); return m; });
  let dirty = false;
  function setStall(st, on) {
    st.open = on;
    for (const [arr, a, b] of st.goods) for (const im of IM.get(arr) || []) { const o = origOf(im); for (let k = a; k < b && k < im.count; k++) im.setMatrixAt(k, on ? o[k] : ZERO); im.instanceMatrix.needsUpdate = true; }
    if (PLANTS) for (const [arr, a, b] of st.goods) if (arr === I.pot) { const o = origOf(PLANTS.pm); for (let k = a; k < b; k++) { const j = PLANTS.of.get(k); if (j !== undefined) PLANTS.pm.setMatrixAt(j, on ? o[j] : ZERO); } PLANTS.pm.instanceMatrix.needsUpdate = true; }
    st.meshes.forEach(m => m.visible = on);
    if (on) { rollIM.setMatrixAt(st.i, ZERO); coverIM.setMatrixAt(st.i, ZERO); }
    else { bd.position.set(st.sx - st.dir * 1.0, 2.95, st.sz); bd.rotation.set(0, 0, 0); bd.scale.set(1, 1, 1); bd.updateMatrix(); rollIM.setMatrixAt(st.i, bd.matrix); bd.position.set(st.tx, 1.1, st.sz); bd.updateMatrix(); coverIM.setMatrixAt(st.i, bd.matrix); }
    rollIM.instanceMatrix.needsUpdate = true; coverIM.instanceMatrix.needsUpdate = true; dirty = true;
  }
  const openH = st => st.type === 'baker' ? 5.5 : 7 + st.i * .06, closeH = st => st.type === 'baker' ? 17.5 : 18.5 + st.i * .17;
  const isOpen = (st, h) => h >= openH(st) && h < closeH(st);
  const phase = h => h >= 5.5 && h < 7 ? 'dawn' : h >= 7 && h < 18.5 ? 'day' : h >= 18.5 && h < 20.5 ? 'closing' : (h >= 20.5 || h < .5) ? 'night' : 'quiet';
  const WANT = { dawn: 2, day: 12, closing: 4, night: 5, quiet: 0 };
  let curPhase = null, lastH = null, schedT = 0;
  const show = (w, on) => { w.on = on; w.p.object.visible = on; if (!on) { w.path = []; w.m = null; } };
  const go = (w, path, then) => { w.path = path; w.then = then; w.m = 'walk'; };
  function schedule(h, instant, me) {
    const ph = phase(h), farMe = w => !me || Math.hypot(w.x - me.x, w.z - me.z) > 38;
    // standok és árusok
    for (const st of STALL_ST) {
      const want = isOpen(st, h), w = st.w; if (want === st.open && (want ? w.on && w.m !== 'leave' : !w.on || w.m === 'leave')) continue;
      if (!instant && (w.m === 'pack' || w.m === 'leave' || w.m === 'walk')) continue;
      if (instant || farMe(w)) { setStall(st, want); show(w, want); if (want) { [w.x, w.z] = w.home; w.p.object.position.set(w.x, 0, w.z); w.p.object.rotation.y = w.home[2]; } w.n.away = !want; continue; }
      if (!want && st.open) { w.n.away = true; w.m = 'pack'; w.t = 3.5; w.p.talk(3); }         // pakol, aztán hazamegy
      if (want && !w.on) { const e = pick(EXITS.filter(x => Math.sign(x[0]) === Math.sign(st.sx))), bx2 = st.sx - st.dir * 3.9; show(w, true); w.x = e[2]; w.z = e[1]; go(w, [[e[0], e[1]], [bx2, e[1]], [bx2, w.home[1]], [w.home[0], w.home[1]]], () => { setStall(st, true); w.n.away = false; w.m = null; w.p.object.rotation.y = w.home[2]; }); }
    }
    // vásárlók
    const want = Math.round(WANT[ph] * (LQ ? .5 : 1));
    for (const w of shoppers) {
      const should = w.k < want;
      if (should === w.on && w.m !== 'leave') continue;
      if (instant || farMe(w)) { if (!should && w.spot) { w.spot.busy = false; w.spot = null; } show(w, should); if (should) { const sp = freeSpot(ph); if (sp) { if (w.spot) w.spot.busy = false; sp.busy = true; w.spot = sp; w.x = sp.x; w.z = sp.z; w.m = 'stay'; w.t = R(2, 8); w.face = sp.ry; w.p.object.position.set(w.x, .05, w.z); } } continue; }
      if (!should && w.on && w.m !== 'leave') { if (w.spot) w.spot.busy = false; w.spot = null; go(w, exitPath(w.x, w.z), () => show(w, false)); w.m = 'leave'; }
      else if (should && !w.on) { const sp = freeSpot(ph); if (!sp) continue; sp.busy = true; w.spot = sp; const e = enterFrom(sp.x, sp.z); show(w, true); [w.x, w.z] = e.start; go(w, e.path, () => { w.m = 'stay'; w.t = R(4, 10); w.face = sp.ry; }); }
    }
    // a többiek: csak ha nem látod (vagy azonnali váltásnál) tűnnek el / jelennek meg
    const night = ph === 'night' || ph === 'quiet';
    for (const w of people) {
      let should = null;
      if (w.kid) should = ph === 'day';
      else if (w.walker !== undefined) should = ph === 'quiet' ? w.walker < 2 : true;
      else if (w.guard) should = night;
      else if (w.nightNpc) should = ph === 'night';
      else if (w.smithW) should = ph === 'day';
      if (should === null || should === w.on) continue;
      if (instant || farMe(w) || w.nightNpc) { show(w, should); if (w.guard) w.torch[1] = should ? 2.2 : -999; if (w.nightNpc) { w.n.hidden = !should; [w.x, w.z] = w.home; w.p.object.position.set(w.x, 0, w.z); w.p.object.rotation.y = w.home[2]; } }
    }
    if (nightG.visible !== (ph === 'night')) { nightG.visible = ph === 'night'; dirty = true; for (const t of NIGHT_TORCH) t[1] = ph === 'night' ? t[3] : -999; }
    const birdsOn = !night; for (const b of birds) if (b.im.visible !== birdsOn && (instant || !me || Math.hypot(me.x, me.z - 175) > 45)) b.im.visible = birdsOn;
    CAT.g.visible = night;
    curPhase = ph;
  }
  function freeSpot(ph) {
    const ok = SPOTS.filter(s => !s.busy && (s.night ? ph === 'night' : s.fountain ? ph !== 'quiet' : s.stall && s.stall.open && ph !== 'night'));
    return ok.length ? ok[Math.floor(Math.random() * ok.length)] : null;
  }
  // kezdeti állapot (a portéka-mátrixok elmentése előtt minden nyitva)
  let firstSched = true;

  let wt = 0;
  return {
    root,
    update(t, dt, me, hour = 12) {
      wt += dt; dirty = false;
      const jump = lastH === null || Math.abs(((hour - lastH + 36) % 24) - 12) > .5;   // nagy ugrás (napszak-választó): azonnal
      if (firstSched || jump || (schedT += dt) > 1) { schedT = 0; schedule(hour, firstSched || jump, firstSched ? null : me); firstSched = false; }
      lastH = hour;
      let bi = 0;
      for (const w of people) {
        const far = !w.on || Math.hypot(w.x - me.x, w.z - me.z) > 70; w.p.object.visible = !far;
        if (!far) { bd.position.set(w.x, .07, w.z); bd.rotation.set(0, 0, 0); bd.scale.setScalar(w.kid ? .7 : 1); } else { bd.position.set(0, -50, 0); bd.scale.setScalar(0); }
        bd.updateMatrix(); blobs.setMatrixAt(bi++, bd.matrix);
        if (far) continue;
        if (w.m === 'pack') { w.t -= dt; w.p.update(dt, 0); if (w.t <= 0) { const st = w.merchant; setStall(st, false); go(w, [[st.sx - st.dir * 3.9, w.z], ...exitPath(st.sx - st.dir * 3.9, w.z).slice(-2)], () => show(w, false)); w.m = 'leave'; } continue; }
        if (w.m === 'walk' || w.m === 'leave') {
          if (!w.path.length) { const f = w.then; w.then = null; if (w.m === 'walk') w.m = null; if (f) f(); else w.m = null; if (!w.on) continue; }
          else { const [tx, tz] = w.path[0], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz), sp = w.sp || 1;
            if (d < .25) w.path.shift(); else { w.x += dx / d * sp * dt; w.z += dz / d * sp * dt; w.p.object.position.set(w.x, .05, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); }
            w.p.update(dt, sp); if (w.m === 'leave' && !w.path.length) { const f = w.then; w.then = null; w.m = null; f && f(); } continue; }
        }
        if (w.smithW) {
          if (w.rest > 0) { w.rest -= dt; w.p.arm = -.5; }
          else { const u0 = w.u; w.u = (w.u + dt / .62) % 1; const u = w.u; w.p.arm = u < .72 ? -.5 - 1.8 * Math.sin(u / .72 * Math.PI / 2) : -2.3 + 1.8 * ((u - .72) / .28);
            if (u < u0) { EVENTS.push(['hammer', SMITH.x, SMITH.z]); if (++w.hits >= 9) { w.hits = 0; w.rest = R(2, 4.5); } } }
          w.p.update(dt, 0); continue;
        }
        if (w.still) { if (w.nightNpc && (w.n.type === 'music' || w.n.type === 'story') && Math.random() < dt * .6) w.p.talk(R(1.5, 3)); w.p.update(dt, 0); continue; }
        if (w.guard) { const [tx, tz] = w.rt[w.i], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz); if (d < .4) { w.i = (w.i + 1) % w.rt.length; } else { w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt; } w.p.object.position.set(w.x, .05, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); w.p.update(dt, w.sp); w.torch[0] = w.x; w.torch[1] = 2.2; w.torch[2] = w.z; continue; }
        if (w.kid) { w.a += w.sp / w.r * dt; w.x = Math.cos(w.a) * w.r; w.z = 175 + Math.sin(w.a) * w.r * .9; w.p.object.position.set(w.x, .05, w.z); w.p.object.rotation.y = Math.atan2(-Math.sin(w.a), Math.cos(w.a) * .9); w.p.update(dt, w.sp); continue; }
        if (w.shop) {
          if (w.m === 'stay' || !w.path.length && w.m !== 'walk') { w.m = 'stay';
            w.t -= dt; w.p.object.rotation.y += (w.face - w.p.object.rotation.y) * Math.min(1, dt * 4);
            if (Math.random() < dt * .25) w.p.talk(R(1, 2.5));
            w.p.update(dt, 0);
            if (w.t <= 0) { const n = freeSpot(curPhase); if (n) { if (w.spot) w.spot.busy = false; n.busy = true; w.spot = n; go(w, viaFountain(w.x, w.z, n.x, n.z), () => { w.m = 'stay'; w.t = R(4, 12); w.face = n.ry; }); } else w.t = 3; }
            continue;
          }
          continue;
        }
        const [tx, tz] = w.rt[w.i], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
        if (d < .4) { w.i = (w.i + 1) % w.rt.length; continue; }
        w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt;
        w.p.object.position.set(w.x, 0, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); w.p.update(dt, w.sp);
      }
      blobs.instanceMatrix.needsUpdate = true;
      // madarak (csak ha a piac közelében vagy)
      if (Math.hypot(me.x, me.z - 175) < 80 && birds[0].im.visible) { B.me = me;
        for (const b of birds) {
          const dm = Math.hypot(b.x - me.x, b.z - me.z), P = b.kind === 'p';
          if (b.m !== 'fly' && dm < (P ? 3.4 : 2.2)) { const a = Math.atan2(b.x - me.x, b.z - me.z) + R(-.7, .7), sp = P ? R(3, 4.5) : R(2.4, 3.2); b.m = 'fly'; b.t = P ? R(2.6, 4) : R(.7, 1.1); b.vx = Math.sin(a) * sp; b.vz = Math.cos(a) * sp; b.vy = P ? R(2.6, 3.6) : 1.8; b.ry = a; b.land = false; }
          let tilt = 0, flap = 1;
          if (b.m === 'fly') {
            b.t -= dt;
            if (P && b.t < 1.3) { if (!b.land) { [b.tx, b.tz] = pickSpot(b); b.land = true; } const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz) || 1, hs = Math.min(4, d / Math.max(.2, b.t)); b.vx = dx / d * hs; b.vz = dz / d * hs; b.vy = -b.y / Math.max(.25, b.t); b.ry = Math.atan2(dx, dz); }
            if (!P) b.vy -= 7 * dt;
            b.x += b.vx * dt; b.z += b.vz * dt; b.y = Math.max(0, b.y + b.vy * dt);
            flap = 1 + (P ? .9 : .6) * Math.abs(Math.sin(t * (P ? 26 : 32) + b.ph));
            if (b.t <= 0) { b.m = 'idle'; b.y = 0; b.t = R(1, 4); }
          } else if (b.m === 'walk') {
            const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz); b.t -= dt;
            if (d < .05 || b.t <= 0) { b.m = 'idle'; b.t = R(1, 5); } else { const sp = P ? .45 : .6; b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; b.ry = Math.atan2(dx, dz); }
            tilt = Math.sin(t * 14 + b.ph) * .08;
          } else {
            b.t -= dt; tilt = Math.sin(t * 5 + b.ph) > .55 ? .55 : 0;
            if (b.t <= 0) { const a = R(0, 6.28), r = R(.3, 1.2); let x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r; const dc = Math.hypot(x - b.cx, z - b.cz); if (dc < b.r0 || dc > b.r1) { x = b.cx + (x - b.cx) / dc * Math.min(b.r1, Math.max(b.r0, dc)); z = b.cz + (z - b.cz) / dc * Math.min(b.r1, Math.max(b.r0, dc)); } b.tx = x; b.tz = z; b.m = 'walk'; b.t = R(1, 3); }
          }
          bd.position.set(b.x, b.y + .05, b.z); bd.rotation.set(tilt, b.ry, 0); bd.scale.set(flap, 1, 1); bd.updateMatrix(); b.im.setMatrixAt(b.k, bd.matrix);
        }
        for (const b of birds) if (b.k === 0) b.im.instanceMatrix.needsUpdate = true;
      }
      if (Math.abs(me.z - 175) < 70) {
        for (const f of FLAMES) { if (!f.sp.parent.visible && f.sp.parent !== root) continue; const k = 1 + Math.sin(t * 13 + f.ph) * .12 + Math.sin(t * 23 + f.ph * 2) * .08; f.sp.scale.set(f.w * (2 - k), f.h * k, 1); }
        const bakerOpen = STALL_ST.find(s => s.type === 'baker')?.open;
        for (const sm of SMOKE) { sm.sp.visible = !!bakerOpen; if (!bakerOpen) continue; sm.t = (sm.t + dt * .12) % 1; const u = sm.t; sm.sp.position.set(OVEN.x + Math.sin(u * 5 + t * .3) * .3 * u, 1.3 + u * 4.5, OVEN.z + u * .8); sm.sp.scale.setScalar(.4 + u * 1.8); sm.sp.material.opacity = (1 - u) * .55 * Math.min(1, u * 6); }
        if (CAT.g.visible) { const c = CAT; c.t -= dt; const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz); if (d > .1) { c.x += dx / d * .55 * dt; c.z += dz / d * .55 * dt; c.g.rotation.y = Math.atan2(dx, dz); c.g.position.y = Math.abs(Math.sin(t * 9)) * .02; } else if (c.t <= 0) { const a = R(0, 6.28), r = R(4.5, 9); c.tx = Math.cos(a) * r; c.tz = 175 + Math.sin(a) * r; c.t = R(3, 9); } c.g.position.x = c.x; c.g.position.z = c.z; c.tl.rotation.z = Math.sin(t * 2) * .4; }
      }
      if (DONKEY) { DONKEY.head.rotation.x = .25 + Math.sin(t * .7) * .15 + (Math.sin(t * .23) > .8 ? .35 : 0); DONKEY.tail.rotation.z = Math.sin(t * 2.4) * .35; }
      // zászlók lengése
      if (FLAGS && Math.abs(me.z - 175) < 60) { const fl = FLAGS.userData.flags; fl.forEach((f, k) => { bd.position.set(f.x, f.y, f.z); bd.rotation.set(Math.sin(t * 2.2 + f.x * .7) * .35, 0, 0); bd.scale.set(1, 1, 1); bd.updateMatrix(); FLAGS.setMatrixAt(k, bd.matrix); }); FLAGS.instanceMatrix.needsUpdate = true; }
      for (const b of boats) { b.b.position.y = b.y + Math.sin(t * 1.1 + b.ph) * .06; b.b.rotation.z = Math.sin(t * .8 + b.ph) * .03; }
      if (MM.river.normalMap) MM.river.normalMap.offset.set(t * .01, t * .02);
      return dirty;
    },
    get phase() { return curPhase; },
    events: EVENTS,
    // a város hangjainak forrásai és szintjei (a törpe helyéhez képest)
    audio(me) {
      const ph = curPhase || 'day', inCity = me.z > 112, dM = Math.hypot(me.x, me.z - 175);
      const crowdK = { day: 1, closing: .45, dawn: .15, night: .35, quiet: 0 }[ph];
      let stall = 1e9; for (const st of STALL_ST) if (st.open) stall = Math.min(stall, Math.hypot(st.sx - me.x, st.sz - me.z));
      const nb = NIGHT_NPC.map(n => Math.hypot(n.x - me.x, n.z - me.z)), mus = NIGHT_NPC.find(n => n.type === 'music');
      return {
        market: inCity ? crowdK * Math.max(0, 1 - dM / 48) : 0, marketSrc: [0, 175],
        haggle: ph === 'day' ? Math.max(0, 1 - stall / 14) : 0,
        river: Math.max(0, 1 - (me.z < CITY.z1 ? CITY.z1 - me.z : me.z > CITY.z1 + 90 ? me.z - CITY.z1 - 90 : 0) / 26), riverSrc: [me.x, me.z < CITY.z1 + 45 ? CITY.z1 + 4 : CITY.z1 + 86],
        music: ph === 'night' ? Math.max(0, 1 - Math.hypot(mus.x - me.x, mus.z - me.z) / 34) : 0, musicSrc: [mus.x, mus.z],
        fire: ph === 'night' ? Math.max(0, 1 - Math.min(...nb) / 12) : 0,
        dogs: inCity && (ph === 'night' || ph === 'quiet'),
        fountain: Math.min(1, Math.max(0, 1 - (dM - 3.4) / 16)),
      };
    },
    people,
  };
}
