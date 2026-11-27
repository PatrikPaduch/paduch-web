// A túlparti kikötő az Eufrátesz északi partján: rakpart, stég, kikötött uszályok és vitorlás, fadaru, raktárak,
// hajóépítő udvar, vámház, rakodómunkások; és a révész csónakja, amivel át lehet kelni (Ezüst csillagtól).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CITY, PIER, HARB, FPIER, collider, rectCollider, R, pick } from './world.js';
import { worldUV, instanced, LANTERNS } from './build.js';
import { TEX } from './mats.js';
import { makePerson } from './hero.js';
import { CITY_NPC, CITY_TRIG } from './city.js';

export const HARB_MAP = { quay: [HARB.x0, 320, HARB.x1, 326], houses: [], ships: [], yard: [-72, 328, -38, 348], customs: [32, 330, 44, 338] };
export const RIDE = { near: [20, PIER.z1 - .2], far: [20, FPIER.z0 + .2] };

export function buildHarbour(M, q) {
  const root = new THREE.Group(), geos = {}, trig = (w, x, z, r, y = 0) => CITY_TRIG.push({ w, x, z, r, y });
  const add = (k, g) => { (geos[k] ||= []).push(g); return g; };
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(k, g); };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); return add(k, g); };
  const nrm = s => q.maps ? { normalMap: TEX.rockN, normalScale: new THREE.Vector2(s, s) } : {};
  const MM = {
    plaster: new THREE.MeshStandardMaterial({ color: '#e6d4b4', map: TEX.brick, ...nrm(.35), roughness: .95 }),
    mud: new THREE.MeshStandardMaterial({ color: '#c4a274', map: TEX.brick, ...nrm(.8), roughness: 1 }),
    cobble: new THREE.MeshStandardMaterial({ color: '#c0b098', map: TEX.pave, ...nrm(.5), roughness: .9 }),
    quay: new THREE.MeshStandardMaterial({ color: '#b0a088', map: TEX.brick, ...nrm(.7), roughness: .95 }),
    plank: new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: .9 }),
    tar: new THREE.MeshStandardMaterial({ color: '#2a221c', roughness: .6 }),
  };
  const UVS = { plaster: 3, mud: 3, cobble: 6, quay: 4, plank: 2 };
  const col = c => new THREE.MeshStandardMaterial({ color: c, roughness: .8 });
  const I = { sack: [], crate: [], amph: [], jarB: [], log: [], coil: [], post: [], reed: [], lampP: [] };
  const people = [], EVENTS = [], ships = [];

  /* ---------- rakpart, burkolat, stég ---------- */
  box('quay', HARB.x0, -1.2, 320, HARB.x1, .08, 326);
  box('cobble', HARB.x0, 0, 326, HARB.x1, .05, HARB.z1);
  for (let x = FPIER.x0; x < FPIER.x1; x += .4) box('plank', x, -.05, FPIER.z0, x + .36, .1, 320.2);
  for (const x of [FPIER.x0, FPIER.x1]) for (let z = FPIER.z0 + 1; z < 320; z += 3) cyl('plank', x, -1.4, z, .12, .12, 1.7, 8);
  for (let x = HARB.x0 + 6; x < HARB.x1 - 4; x += 12) { if (Math.abs(x - 20) < 4) continue; cyl('quay', x, .08, 321.2, .22, .2, .7, 10); collider(x, 321.2, .35); }
  trig('pier', 20, 318, 3); trig('ferry', 20, 312, 4); trig('dock', -30, 323.5, 6); trig('dock', 60, 323.5, 6);

  /* ---------- kikötött hajók: 3 uszály és egy nagy vitorlás (ringatóznak) ---------- */
  const hullG = (L, W, H) => { const g = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); g.scale(L / 2, H, W / 2); return g; };
  const ship = (x, z, L, W, mast) => {
    const g = new THREE.Group(); g.position.set(x, -.3, z);
    const h = new THREE.Mesh(hullG(L, W, .9), MM.tar); h.position.y = .55; h.castShadow = true; g.add(h);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L * .82, .08, W * .72), MM.plank); deck.position.y = .5; deck.receiveShadow = true; g.add(deck);
    if (mast) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.1, .14, 9, 8), M.wood); m.position.y = 5; m.castShadow = true; g.add(m);
      const yard = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 7, 6), M.wood); yard.rotation.z = Math.PI / 2; yard.position.y = 8.6; g.add(yard);
      const furl = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 6.6, 10), col('#e8dcc0')); furl.rotation.z = Math.PI / 2; furl.position.y = 8.35; furl.castShadow = true; g.add(furl);
      for (const s of [-1, 1]) { const len = Math.hypot(L * .42, 9); const rg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, len, 4), col('#4a3a28')); rg.position.set(s * L * .21, 5, 0); rg.rotation.z = s * Math.atan2(L * .42, 9); g.add(rg); }
    }
    root.add(g); ships.push({ g, ph: R(0, 6) }); HARB_MAP.ships.push([x - L / 2, z - W / 2, x + L / 2, z + W / 2]); return g;
  };
  const S1 = ship(2, 314.2, 16, 4.4, true); trig('ship', -2, 323.4, 6); trig('mast', -6, 323.4, 3); trig('deck', 9, 323.4, 3); trig('sailor', -4, 328.4, 3); trig('voyage', -9, 323.4, 3);
  const cargoOn = (g, L, kinds) => { for (let k = 0; k < kinds.length; k++) { const lx = -L * .35 + k * (L * .7 / Math.max(1, kinds.length - 1)), kind = kinds[k];
    if (kind === 's') for (let n = 0; n < 4; n++) { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), col('#cdb78a')); o.scale.set(.32, .26, .24); o.position.set(lx + R(-.4, .4), .78 + (n > 2 ? .3 : 0), R(-.6, .6)); g.add(o); }
    if (kind === 'l') for (let n = 0; n < 3; n++) { const o = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, 3.2, 10), col('#9a6a3a')); o.rotation.z = Math.PI / 2; o.position.set(lx, .78 + (n === 2 ? .4 : 0), n === 2 ? 0 : (n ? .26 : -.26)); o.castShadow = true; g.add(o); }
    if (kind === 'a') for (let n = 0; n < 5; n++) { const o = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.18, .1], [.24, .45], [.12, .8], [.1, .95]].map(([a, b]) => new THREE.Vector2(a, b)), 10), M.terracotta); o.position.set(lx + R(-.4, .4), .54, R(-.6, .6)); g.add(o); } } };
  cargoOn(ship(-46, 316.3, 13, 3.2, false), 13, ['s', 'l', 's']); trig('barge', -46, 323.4, 5); trig('log', -46, 323.4, 3);
  cargoOn(ship(56, 316.3, 12, 3.2, false), 12, ['a', 's', 'a']); trig('barge', 56, 323.4, 5);
  cargoOn(ship(80, 316.3, 11, 3, false), 11, ['l', 'l']); trig('cargo', 80, 323.4, 4);

  /* ---------- fadaru a rakparton: rakományt emel az uszályból ---------- */
  const CR = { x: 4, z: 323.6, top: 7.4, reach: 6.2 };
  cyl('plank', CR.x, 0, CR.z, .25, .2, CR.top, 10); cyl('plank', CR.x, 0, CR.z, .7, .7, .3, 12);
  { const a = new THREE.CylinderGeometry(.13, .13, CR.reach + 1, 8); a.rotateX(Math.PI / 2 - .22); a.translate(CR.x, CR.top - .2, CR.z - CR.reach / 2); add('plank', a);
    const st = new THREE.CylinderGeometry(.08, .08, 4.6, 6); st.rotateX(-.9); st.translate(CR.x, CR.top - 2.2, CR.z - 1.6); add('plank', st); }
  const pul = new THREE.Mesh(new THREE.TorusGeometry(.28, .07, 8, 16), M.wood); pul.position.set(CR.x, CR.top - .9, CR.z - CR.reach); pul.rotation.y = Math.PI / 2; root.add(pul);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1, 4), col('#5a4630')); root.add(rope);
  const load = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), col('#b8a070')); load.scale.set(.55, .45, .5); load.castShadow = true; root.add(load);
  collider(CR.x, CR.z, .6); trig('crane', CR.x + 1.8, CR.z + 1, 3.4); trig('pulley', CR.x + 1.8, CR.z - .5, 2.4); trig('unload', CR.x - 2.4, CR.z + 1.6, 3);

  /* ---------- raktárak ---------- */
  const W = [[-62, -36], [-26, 2], [12, 40], [52, 86]], wz0 = 352, wz1 = 380;
  for (const [x0, x1] of W) {
    const h = R(6.8, 8), m = pick(['mud', 'plaster']), dx = (x0 + x1) / 2;
    box(m, x0, 0, wz0, x1, h, wz1);
    box(m, x0 - .05, h, wz0 - .05, x1 + .05, h + .5, wz0 + .4); box(m, x0 - .05, h, wz1 - .4, x1 + .05, h + .5, wz1 + .05);
    box(m, x0 - .05, h, wz0, x0 + .4, h + .5, wz1); box(m, x1 - .4, h, wz0, x1 + .05, h + .5, wz1);
    box('dark', dx - 2.2, 0, wz0 - .02, dx + 2.2, 4.6, wz0 - .01); box('plank', dx - 2.6, 4.6, wz0 - .3, dx + 2.6, 4.9, wz0);
    for (const wx of [x0 + 3, x1 - 3]) box('dark', wx - .45, h * .62, wz0 - .02, wx + .45, h * .62 + .7, wz0 - .01);
    rectCollider(x0 - .25, wz0 - .25, x1 + .25, wz1 + .25); HARB_MAP.houses.push([x0, wz0, x1, wz1]);
    trig('warehouse', dx, wz0 - 3, 5);
    // áru a kapu előtt
    for (let k = 0; k < 6; k++) I.sack.push({ x: dx - 5 + (k % 3) * .7, y: .05 + (k > 2 ? .38 : 0), z: wz0 - 1.4 + R(-.15, .15), ry: R(0, 3), s: 1 });
    for (let k = 0; k < 5; k++) I.amph.push({ x: dx + 3.6 + (k % 3) * .55, y: .05, z: wz0 - 1.2 - Math.floor(k / 3) * .55, s: 1 });
    rectCollider(dx - 5.5, wz0 - 2, dx - 3, wz0 - .8); rectCollider(dx + 3.2, wz0 - 2, dx + 5.2, wz0 - .8);
  }
  trig('amphora', 4.5, 349.5, 2.6); trig('amphora', 72.5, 349.5, 2.6);
  // bitumenes korsók és cédrusrönkök a raktárnegyedben
  for (let k = 0; k < 8; k++) I.jarB.push({ x: 44 + (k % 4) * .6, y: .05, z: 344 + Math.floor(k / 4) * .6, s: R(.8, 1) }); rectCollider(43.4, 343.4, 46.6, 345.6); trig('bitumen', 45, 342.4, 2.6);
  for (let k = 0; k < 9; k++) { const row = k < 4 ? 0 : k < 7 ? 1 : 2, n = k - [0, 4, 7][row]; I.log.push({ x: -20, y: .3 + row * .46, z: 341 + n * .52 + row * .26, s: 1 }); } rectCollider(-22.2, 340.4, -17.8, 343.4); trig('cedar', -20, 338.8, 3); trig('timber', -24, 341.5, 2.6);

  /* ---------- hajóépítő udvar ---------- */
  { const kx0 = -66, kx1 = -46, kz = 339.5;
    box('plank', kx0, .05, kz - .2, kx1, .5, kz + .2); trig('keel', -56, 336.6, 3);
    for (let x = kx0 + 1.5; x <= kx1 - 1.5; x += 2.2) { const r = 1.5 + .4 * Math.sin((x - kx0) / (kx1 - kx0) * Math.PI); const g = new THREE.TorusGeometry(r, .08, 6, 18, Math.PI); g.rotateZ(Math.PI); g.rotateY(Math.PI / 2); g.translate(x, .5 + r, kz); add('plank', g); }
    for (let x = kx0 + 1; x < kx1 - 1; x += 3) { box('plank', x, 0, kz - 2.3, x + .15, .5, kz - 2.15); box('plank', x, 0, kz + 2.15, x + .15, .5, kz + 2.3); }
    rectCollider(kx0 - .3, kz - 2.5, kx1 + .3, kz + 2.5); trig('hull', -56, 343.4, 3.4);
    for (let k = 0; k < 6; k++) box('plank', -70.5, k * .16, 331 + k * .02, -64.5, k * .16 + .14, 332.4 - k * .02); rectCollider(-70.8, 330.6, -64.2, 332.8);
    box('plank', -60.5, 0, 331, -60.3, .8, 331.2); box('plank', -59.1, 0, 331, -58.9, .8, 331.2); box('plank', -61, .8, 330.9, -58.4, .95, 331.3);
    box('dark', -60.3, .95, 331.05, -59.1, 1.0, 331.15); trig('saw', -59.7, 329.6, 2.4); collider(-59.7, 331.1, .9); }

  /* ---------- vámház ---------- */
  { const [x0, z0, x1, z1] = HARB_MAP.customs, h = 4.6;
    box('plaster', x0, 0, z0, x1, h, z1); box('glaze', x0 - .05, h - .9, z0 - .06, x1 + .05, h - .5, z0); box('plaster', x0 - .1, h, z0 - .1, x1 + .1, h + .4, z1 + .1);
    box('dark', 37.3, 0, z0 - .02, 38.7, 2.4, z0 - .01); rectCollider(x0 - .25, z0 - .25, x1 + .25, z1 + .25);
    box('plank', 34.2, .75, 327.2, 36.8, .85, 328.2); for (const [a, b] of [[34.3, 327.3], [36.6, 327.3], [34.3, 328.1], [36.6, 328.1]]) box('plank', a, 0, b, a + .1, .75, b + .1);
    rectCollider(34, 327, 37, 328.4);
    const sc = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 6), M.bronze); sc.position.set(35, 1.1, 327.7); root.add(sc);
    for (const s of [-1, 1]) { const pan = new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .04, 12), M.bronze); pan.position.set(35 + s * .22, 1.0, 327.7); root.add(pan); }
    trig('customs', 38, 326.4, 4); trig('tax', 35.5, 326.2, 2.4); }

  /* ---------- rakparti rakomány ---------- */
  for (const [x, z] of [[-34, 328.5], [-26, 329], [44, 329.5], [64, 328.5], [72, 330]]) {
    for (let k = 0; k < 4; k++) I.crate.push({ x: x + (k % 2) * .85, y: .05 + (k > 1 ? .5 : 0), z, ry: R(-.1, .1), s: 1 });
    I.coil.push({ x: x + 2.2, y: .12, z: z - .2, s: 1 }); I.sack.push({ x: x - 1.2, y: .05, z: z + .3, ry: R(0, 3), s: 1 });
    rectCollider(x - 1.8, z - .6, x + 2.8, z + .6);
  }
  trig('rope', -31.8, 330.4, 2.4); trig('crate', 44.4, 331.3, 2.4); trig('sack', 62.8, 330.6, 2.4);
  for (const [x, z] of [[10, 326.8], [-4, 327]]) { box('dark', x - .45, .05, z - .12, x + .45, .9, z + .12); cyl('dark', x, .35, z, .16, .16, .26, 10); collider(x, z, .5); }
  trig('anchor', 10, 328.6, 2.4); trig('oar', RIDE.far[0] + 1.6, RIDE.far[1] + 2, 2.4);

  /* ---------- lámpások a rakparton ---------- */
  for (let x = HARB.x0 + 10; x < HARB.x1 - 6; x += 16) { if (Math.abs(x - 20) < 5) continue; cyl('bronze', x, 0, 326.6, .09, .06, 2.3, 8); LANTERNS.push([x, 2.5, 326.6]); collider(x, 326.6, .22); }

  /* ---------- nád a partokon (a kikötőn és a városon kívül) ---------- */
  for (let k = 0; k < (q.maps ? 900 : 380); k++) {
    const far = Math.random() < .55, x = R(-300, 300);
    if (far && x > HARB.x0 - 4 && x < HARB.x1 + 4) continue;
    if (!far && Math.abs(x) < 84) continue;
    I.reed.push({ x, y: -.45, z: far ? R(317.5, 321) : R(229, 232.5), ry: R(0, 3), sx: R(.8, 1.2), sy: R(.8, 1.4), sz: R(.8, 1.2) });
  }
  trig('reed', -86, 316, 5); trig('reed', 100, 316, 5);

  /* ---------- összevonás ---------- */
  const MAT = k => MM[k] || M[k];
  for (const [k, arr] of Object.entries(geos)) {
    if (UVS[k]) arr.forEach(g => worldUV(g, UVS[k]));
    const m = new THREE.Mesh(mergeGeometries(arr.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a); return n; })), MAT(k));
    m.castShadow = !['cobble', 'quay'].includes(k); m.receiveShadow = true; root.add(m);
  }
  { const sg = new THREE.SphereGeometry(1, 12, 8); sg.scale(.3, .26, .22); sg.translate(0, .24, 0); root.add(instanced(sg, col('#cdb78a'), I.sack)); }
  { const cg = new THREE.BoxGeometry(.8, .5, .6); cg.translate(0, .25, 0); root.add(instanced(cg, M.wood, I.crate)); }
  { const ag = new THREE.LatheGeometry([[0, 0], [.18, .1], [.26, .45], [.14, .85], [.1, 1], [.13, 1.04]].map(([a, b]) => new THREE.Vector2(a, b)), 12); root.add(instanced(ag, M.terracotta, I.amph)); }
  { const jg = new THREE.LatheGeometry([[0, 0], [.25, 0], [.32, .3], [.22, .62], [.16, .7]].map(([a, b]) => new THREE.Vector2(a, b)), 12); root.add(instanced(jg, MM.tar, I.jarB)); }
  { const lg = new THREE.CylinderGeometry(.24, .26, 4.2, 12); lg.rotateZ(Math.PI / 2); lg.rotateY(Math.PI / 2); root.add(instanced(lg, col('#a0704a'), I.log)); }
  { const tg = new THREE.TorusGeometry(.32, .1, 8, 18); tg.rotateX(Math.PI / 2); root.add(instanced(tg, col('#8a7050'), I.coil, { cast: false })); }
  { const rg = mergeGeometries([0, 1, 2].map(k => new THREE.PlaneGeometry(.9, 2.4).translate(0, 1.2, 0).rotateY(k * Math.PI / 3))); root.add(instanced(rg, M.reed || col('#8a9a4a'), I.reed, { cast: false })); }

  /* ---------- quffa és halászcsónak a folyón ---------- */
  const floaters = [];
  { const qg = new THREE.LatheGeometry([[0, 0], [.9, .05], [1.15, .35], [1.2, .62], [1.15, .66]].map(([a, b]) => new THREE.Vector2(a, b)), 22); const qm = new THREE.MeshStandardMaterial({ color: '#5a4a30', roughness: 1, side: THREE.DoubleSide });
    for (const [cx, cz, r, sp] of [[-40, 268, 22, .04], [60, 282, 18, -.05]]) { const g = new THREE.Group(); const b = new THREE.Mesh(qg, qm); b.castShadow = true; g.add(b); const p = makePerson(5, .9); p.object.position.y = -.25; g.add(p.object); p.object.traverse(o => { if (o.isMesh) o.castShadow = false; }); root.add(g); floaters.push({ g, p, cx, cz, r, sp, a: R(0, 6) }); }
  }

  /* ---------- a révész csónakja (az átkelés) ---------- */
  const ferry = new THREE.Group(); root.add(ferry);
  { const h = new THREE.Mesh(hullG(5.6, 1.7, .55), M.wood); h.rotation.y = Math.PI / 2; h.position.y = .32; h.castShadow = true; ferry.add(h);
    for (const z of [-1.3, 0, 1.2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.4, .06, .3), MM.plank); s.position.set(0, .32, z); ferry.add(s); }
    for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 2.6, 6), M.wood); o.position.set(s * .95, .45, -1.4); o.rotation.z = s * 1.15; o.name = 'oar' + s; ferry.add(o); } }
  const rower = makePerson(4, .95); rower.object.position.set(0, -.25, -1.55); ferry.add(rower.object); rower.object.traverse(o => { if (o.isMesh) o.castShadow = false; });
  const ferryRest = side => { const [x, z] = side > 0 ? RIDE.far : RIDE.near; ferry.position.set(x, -.25, z + (side > 0 ? -3 : 3)); ferry.rotation.y = side > 0 ? 0 : Math.PI; };
  ferryRest(-1); trig('oar', 21.4, PIER.z1 - .6, 2.2);
  let ride = null;

  /* ---------- szereplők ---------- */
  const NPCS = [
    { id: 'harbourmaster', x: 25.2, z: 324, ry: -Math.PI / 2, name: 'Puzur-Ashur, a kikötőmester', look: 1, talkX: 23.4, talkZ: 324.2 },
    { id: 'sailor', x: -4, z: 326.8, ry: Math.PI, name: 'Abum, az öreg matróz', look: 3, talkX: -4, talkZ: 328.6 },
    { id: 'dilmun', x: 28, z: 349.6, ry: Math.PI, name: 'Ea-nasir, a dilmuni kereskedő', look: 6, talkX: 28, talkZ: 347.6 },
    { id: 'shipwright', x: -50, z: 335.6, ry: Math.PI, name: 'Ur-Ningal, a hajóács', look: 2, talkX: -50, talkZ: 333.6 },
    { id: 'customs', x: 35.5, z: 328.9, ry: Math.PI, name: 'Iddin-Sin, a vámírnok', look: 5, talkX: 35.5, talkZ: 326.3 },
    { id: 'boatman', x: 23.4, z: 321.6, ry: -Math.PI / 2, name: 'Ur-Nanshe, a révész', look: 0, talkX: 21.4, talkZ: 321.6, side: -1 },
  ];
  for (const n of NPCS) { CITY_NPC.push(n); const p = makePerson(n.look); p.object.position.set(n.x, .05, n.z); p.object.rotation.y = n.ry; root.add(p.object); n.person = p; people.push({ p, still: true, x: n.x, z: n.z }); collider(n.x, n.z, .45); }
  trig('shipwright', -50, 333.2, 3);
  // a hajóácssegéd kalapál a bordákon
  const worker = (() => { const p = makePerson(6, 1); p.object.position.set(-57.5, .05, 337); p.object.rotation.y = 0; root.add(p.object); const w = { p, x: -57.5, z: 337, u: 0, hits: 0, rest: 0, work: true }; people.push(w); collider(-57.5, 337, .45); return w; })();
  // rakodómunkások: zsákkal a vállukon a rakpart és a raktárak között
  const CARRY = [[[-30, 327.6], [-36, 349.4]], [[60, 327.4], [64, 349.4]], [[-6, 327.6], [-10, 349.4]]];
  for (const rt of CARRY) { const p = makePerson(pick([1, 2, 3, 5]), 1); const sk = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), col('#cdb78a')); sk.scale.set(.3, .22, .42); sk.position.set(.18, 1.6, 0); p.object.add(sk); root.add(p.object); people.push({ p, rt, i: 1, x: rt[0][0], z: rt[0][1], sp: .8, sack: sk, carry: true }); }
  for (const w of people) w.p.object.traverse(o => { if (o.isMesh) o.castShadow = false; });

  let craneT = 0;
  return {
    root, events: EVENTS,
    // átkelés: dir 1 = a városból a túlpartra, -1 vissza
    rideStart(dir) { const [x0, z0] = dir > 0 ? RIDE.near : RIDE.far, [x1, z1] = dir > 0 ? RIDE.far : RIDE.near; ride = { dir, t: 0, dur: 30, x0, z0, x1, z1 }; },
    rideSkip() { if (ride) ride.t = ride.dur; },
    get riding() { return !!ride; },
    rideStep(dt) {
      if (!ride) return null;
      ride.t = Math.min(ride.dur, ride.t + dt);
      const P = u => { u = Math.min(1, Math.max(0, u)); const e = u * u * (3 - 2 * u); return [ride.x0 + (ride.x1 - ride.x0) * e + Math.sin(u * Math.PI) * 7 * ride.dir, ride.z0 + (ride.z1 - ride.z0) * e]; };
      const u = ride.t / ride.dur, [x, z] = P(u), [xa, za] = P(u - .02), [xb, zb] = P(u + .02), ang = Math.atan2(xb - xa, zb - za);
      ferry.position.set(x, -.25 + Math.sin(ride.t * 1.7) * .04, z); ferry.rotation.y = ang; ferry.rotation.z = Math.sin(ride.t * 1.3) * .03;
      const done = ride.t >= ride.dur;
      const seat = { x: x + Math.sin(ang) * .3, z: z + Math.cos(ang) * .3, y: .08, ang };
      if (done) { const d = ride.dir; ride = null; ferryRest(d); const [lx, lz] = d > 0 ? RIDE.far : RIDE.near; return { ...seat, done: true, land: { x: lx, z: lz + (d > 0 ? 1.5 : -1.5), y: 0, ang: d > 0 ? 0 : Math.PI } }; }
      return seat;
    },
    update(t, dt, me, hour = 12) {
      const near = me.z > 200;
      for (const s of ships) { s.g.position.y = -.3 + Math.sin(t * .9 + s.ph) * .05; s.g.rotation.x = Math.sin(t * .7 + s.ph) * .012; }
      if (!near) return;
      // daru: lassan emeli a rakományt az uszályból a rakpartra
      craneT += dt; const cu = (craneT % 16) / 16, up = cu < .5 ? Math.sin(cu * 2 * Math.PI - Math.PI / 2) * .5 + .5 : 1 - (Math.sin((cu - .5) * 2 * Math.PI - Math.PI / 2) * .5 + .5);
      const ly = .6 + up * 4.4, px = CR.x, pz = CR.z - CR.reach, top = CR.top - 1.1;
      load.position.set(px + Math.sin(t * .8) * .08 * up, ly, pz); rope.position.set(px, (top + ly + .4) / 2, pz); rope.scale.y = Math.max(.1, top - ly - .4);
      // révész evez
      const rowing = !!ride; rower.arm = rowing ? -1.3 + Math.sin(t * 3.2) * .6 : -.3; rower.update(dt, 0);
      for (const s of [-1, 1]) { const o = ferry.getObjectByName('oar' + s); if (o) o.rotation.x = rowing ? Math.sin(t * 3.2) * .5 : 0; }
      for (const f of floaters) { f.a += f.sp * dt; f.g.position.set(f.cx + Math.cos(f.a) * f.r, -.3 + Math.sin(t * 1.2 + f.a) * .04, f.cz + Math.sin(f.a) * f.r * .4); f.g.rotation.y = t * .1; f.p.update(dt, 0); }
      const night = hour < 6 || hour >= 20;
      for (const w of people) {
        const far = Math.hypot(w.x - me.x, w.z - me.z) > 75; w.p.object.visible = !far && !(night && (w.carry || w.work)); if (!w.p.object.visible) continue;
        if (w.work) { if (w.rest > 0) { w.rest -= dt; w.p.arm = -.5; } else { const u0 = w.u; w.u = (w.u + dt / .7) % 1; const u = w.u; w.p.arm = u < .72 ? -.5 - 1.8 * Math.sin(u / .72 * Math.PI / 2) : -2.3 + 1.8 * ((u - .72) / .28); if (u < u0) { EVENTS.push(['hammer', w.x, w.z]); if (++w.hits >= 7) { w.hits = 0; w.rest = R(3, 6); } } } w.p.update(dt, 0); continue; }
        if (w.still) { w.p.update(dt, 0); continue; }
        const [tx, tz] = w.rt[w.i], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
        if (d < .3) { w.i = (w.i + 1) % w.rt.length; if (w.sack) w.sack.visible = w.i === 1; continue; }
        w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt; w.p.object.position.set(w.x, .05, w.z); w.p.object.rotation.y = Math.atan2(dx, dz); w.p.update(dt, w.sp);
      }
    },
  };
}
