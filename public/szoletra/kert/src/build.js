// Építészet: zikkurat-teraszok, lépcsők, vízesés, templom, falak, Istár-kapu, csatornák, szökőkutak, pavilonok, lugas, híd, sziget, háttér.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAZA, CITY, LV, WALL_H, STAIRS, LAKE, ISLAND, BRIDGE, BASIN, CANALS, FOUNTAINS, WELL, bridgeH, collider, rectCollider, R, srand } from './world.js';

export function worldUV(g, s) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, x / s, z / s); else if (ax >= az) uv.setXY(i, z / s, y / s); else uv.setXY(i, x / s, y / s);
  }
  uv.needsUpdate = true; return g;
}
// egy terasz-szint négy oldala, kihagyásokkal (lépcső, vízesés)
export function sides(r, gap) {
  const o = [], seg = (ax, az, bx, bz, nx, nz) => o.push({ ax, az, bx, bz, nx, nz });
  const split = (g, mk) => g ? [mk(-r, -g), mk(g, r)] : [mk(-r, r)];
  split(gap.S, (a, b) => seg(a, r, b, r, 0, 1)); split(gap.N, (a, b) => seg(a, -r, b, -r, 0, -1));
  split(gap.W, (a, b) => seg(-r, a, -r, b, -1, 0)); split(gap.E, (a, b) => seg(r, a, r, b, 1, 0));
  return o;
}
export function along(segs, step, cb) {
  for (const s of segs) {
    const L = Math.hypot(s.bx - s.ax, s.bz - s.az), n = Math.max(1, Math.floor(L / step));
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; cb(s.ax + (s.bx - s.ax) * t, s.az + (s.bz - s.az) * t, s.nx, s.nz, L, t); }
  }
}
export function levelGaps(i, extra = 0) {   // extra: szabad lépcsőpihenő a virágládák között
  const has = (side, k) => STAIRS.some(s => s.side === side && s.i === k);
  const g = (side, w) => (has(side, i) || has(side, i + 1)) ? w + .4 + extra : 0;
  return { S: g('S', 5), N: g('N', 3.5), W: g('W', 3.5), E: 2 };
}

export const LANTERNS = [];   // lámpások helye (éjjel ezek világítanak)
export function buildWorld(M, q) {
  srand(7);
  const root = new THREE.Group(), geos = {};
  const UVS = { brick: 3, brick2: 3, stair: 2.5, pave: 6, grass: 5, soil: 3, glaze: 2, sand: 14, column: 2, marble: 3, dark: 1, rock: 4, hedge: 2.5, wood: 2, archFrame: 3 };
  const add = (k, g) => (geos[k] ??= []).push(g);
  const box = (k, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); add(k, g); return g; };
  const cyl = (k, x, y0, z, r0, r1, h, seg = 16, open = false) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, open); g.translate(x, y0 + h / 2, z); add(k, g); return g; };
  const inst = { rosette: [], merlon: [], jet: [] };
  const lion = [];                                   // oroszlános mázas panelek (saját UV)

  /* ---------- talaj ---------- */
  { const g = new THREE.PlaneGeometry(PLAZA.x1 - PLAZA.x0, PLAZA.z1 - PLAZA.z0); g.rotateX(-Math.PI / 2); g.translate((PLAZA.x0 + PLAZA.x1) / 2, 0, (PLAZA.z0 + PLAZA.z1) / 2); add('grass', g); }
  // homok: az Eufrátesz medre (CITY.z1 .. CITY.z1 + 90) kimarad, hogy a víz látsszon
  for (const [z0, z1] of [[-1200, CITY.z1], [CITY.z1 + 90, 1200]]) { const g = new THREE.PlaneGeometry(2400, z1 - z0); g.rotateX(-Math.PI / 2); g.translate(0, -.06, (z0 + z1) / 2); worldUV(g, 14); const m = new THREE.Mesh(g, M.sand); m.receiveShadow = true; root.add(m); }
  // sétányok
  const pave = (x0, z0, x1, z1, y = 0) => box('pave', x0, y, z0, x1, y + .05, z1);
  pave(-54, 46, 54, 54); pave(-54, -54, 54, -46); pave(-54, -46, -46, 46); pave(46, -46, 54, -3.6); pave(46, 3.6, 54, 46);
  pave(-5, 54, 5, PLAZA.z1); pave(-92, -3, -54, 3); pave(-48, -68.6, 48, -63.4); pave(-3, -63.4, 3, -54); pave(-3, -82, 3, -68.6);
  pave(-92, 55, -54, 59); pave(54, 55, 92, 59);
  for (const s of [-1, 1]) { pave(s * 16, 60.5, s * 48, 62.3); pave(s * 16, 97.7, s * 48, 99.5); pave(s * 21, 78.5, s * 43, 81.5); pave(s * 30.5, 64, s * 33.5, 96); }
  { const g = new THREE.CylinderGeometry(3.6, 3.6, .06, 28); g.translate(ISLAND.x, .37, ISLAND.z); add('pave', g); }

  /* ---------- teraszok ---------- */
  LV.forEach(({ h, r }, i) => {
    const base = i ? LV[i - 1].h : 0, inner = i < LV.length - 1 ? LV[i + 1].r : 0, gap = levelGaps(i, 2.2), tight = levelGaps(i);
    box('brick', -r, 0, -r, r, h, r);
    // tető: kerti sáv (fű), sétaút (kő), virágláda (tégla + föld)
    const ring = (x0, x1, y, k, th = .05, gp = gap) => {
      const seg = (k2, ax, az, bx, bz, w, nx, nz, yy, hh) => {
        const xa = Math.min(ax, bx), xb = Math.max(ax, bx), za = Math.min(az, bz), zb = Math.max(az, bz);
        if (nz) box(k2, xa, yy, nz > 0 ? zb - w : za, xb, yy + hh, nz > 0 ? zb : za + w); else box(k2, nx > 0 ? xb - w : xa, yy, za, nx > 0 ? xb : xa + w, yy + hh, zb);
      };
      for (const s of sides(x1, gp)) seg(k, s.ax, s.az, s.bx, s.bz, x1 - x0, s.nx, s.nz, y, th);
    };
    if (i < LV.length - 1) {
      ring(inner, r - 4, h, 'grass', .04, tight);
      ring(r - 4, r - 1, h, 'pave', .05, { ...tight, E: 0 });
      for (const [side, w] of [['S', 5], ['N', 3.5], ['W', 3.5]]) if (gap[side]) for (const sg of [-1, 1]) {   // kőburkolatú pihenő a lépcső két oldalán
        const a = sg * (w + .4), b = sg * gap[side], [x0, x1] = [Math.min(a, b), Math.max(a, b)];
        if (side === 'S') box('pave', x0, h, r - 1, x1, h + .05, r); else if (side === 'N') box('pave', x0, h, -r, x1, h + .05, -r + 1); else box('pave', -r, h, x0, -r + 1, h + .05, x1);
      }
    } else box('marble', -r + 1, h, -r + 1, r - 1, h + .05, r - 1);
    ring(r - 1, r, h, 'brick2', .6, gap); ring(r - .95, r - .05, h + .6, 'soil', .02, gap);
    // mázas sáv a falon, arany rozetták
    for (const s of sides(r, gap)) {
      const xa = Math.min(s.ax, s.bx), xb = Math.max(s.ax, s.bx), za = Math.min(s.az, s.bz), zb = Math.max(s.az, s.bz), o = .12;
      if (s.nz) box('glaze', xa, h - 1.3, s.nz > 0 ? zb - .02 : za - o, xb, h - .45, s.nz > 0 ? zb + o : za + .02);
      else box('glaze', s.nx > 0 ? xb - .02 : xa - o, h - 1.3, za, s.nx > 0 ? xb + o : xa + .02, h - .45, zb);
    }
    along(sides(r, gap), 1.7, (x, z, nx, nz) => inst.rosette.push({ x: x + nx * .14, y: h - .87, z: z + nz * .14, ry: Math.atan2(nx, nz) }));
    // boltívek (sötét fülke + kiugró keret)
    const H = h - base, aw = Math.min(1.1, H * .22), ah = Math.min(3.2, H * .62);
    const archS = new THREE.Shape(); archS.moveTo(-aw, 0); archS.lineTo(aw, 0); archS.lineTo(aw, ah - aw); archS.absarc(0, ah - aw, aw, 0, Math.PI, false); archS.lineTo(-aw, 0);
    const frame = new THREE.Shape(); const fw = aw + .35; frame.moveTo(-fw, 0); frame.lineTo(fw, 0); frame.lineTo(fw, ah - aw); frame.absarc(0, ah - aw, fw, 0, Math.PI, false); frame.lineTo(-fw, 0); frame.holes.push(archS);
    const frG = new THREE.ExtrudeGeometry(frame, { depth: .18, bevelEnabled: false, curveSegments: 10 });
    const gapA = { S: Math.max(gap.S, 5.4) + 1.2, N: (gap.N || 0) + 1.2, W: (gap.W || 0) + 1.2, E: 3.2 };
    along(sides(r, gapA), 4.4, (x, z, nx, nz) => {
      if (Math.abs(nz ? x : z) > r - 2 || (i === 0 && nz > 0)) return;
      const ry = Math.atan2(nx, nz);
      const a = new THREE.ShapeGeometry(archS, 10); a.rotateY(ry); a.translate(x + nx * .03, base + .5, z + nz * .03); add('dark', a);
      const f = frG.clone(); f.rotateY(ry); f.translate(x + nx * .01, base + .5, z + nz * .01); add('archFrame', f);
    });
    // oroszlános panelek a legalsó szint déli homlokzatán
    if (i === 0) for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const cx = s * (10 + k * 9); lion.push({ x: cx, y: 2.1, z: r + .05, w: 6.4, h: 3.2, ry: 0 }); }
  });

  /* ---------- lépcsők, korláttal ---------- */
  for (const s of STAIRS) {
    const n = Math.round((s.h1 - s.h0) / .2), L = s.a1 - s.a0, w = s.w;
    for (let k = 0; k < n; k++) {
      const a0 = s.a0 + L * k / n, a1 = s.a0 + L * (k + 1) / n, top = s.h0 + (s.h1 - s.h0) * (k + 1) / n, bot = s.i ? LV[s.i - 1].h - .02 : 0;
      const rail = !(s.i >= 1 && k < 3);   // az első lépcsőfokoknál nincs korlát: oldalt ki lehet lépni a teraszra
      if (s.ax === 'z') { box('stair', -w, bot, Math.min(a0, a1), w, top, Math.max(a0, a1) + .01); if (rail) for (const sx of [-1, 1]) box('brick2', sx * w, bot, Math.min(a0, a1), sx * (w + .5), top + .9, Math.max(a0, a1)); }
      else { box('stair', Math.min(a0, a1), bot, -w, Math.max(a0, a1) + .01, top, w); if (rail) for (const sz of [-1, 1]) box('brick2', Math.min(a0, a1), bot, sz * w, Math.max(a0, a1), top + .9, sz * (w + .5)); }
    }
  }
  // a főlépcső alján talapzatok bronz tűztartóval
  for (const sx of [-1, 1]) { box('marble', sx * 7 - 1, 0, 54.5, sx * 7 + 1, 1.6, 56.5); cyl('bronze', sx * 7, 1.6, 55.5, .45, .8, .7, 16); collider(sx * 7, 55.5, 1.3); }

  /* ---------- vízesés a keleti oldalon ---------- */
  const water = [], falls = [];
  LV.forEach(({ h, r }, i) => {
    const inner = i < LV.length - 1 ? LV[i + 1].r : 4.6, low = i ? LV[i - 1].h : 0;
    water.push([inner, h + .07, -1.4, r - 4, 1.4]); water.push([r - 1, h + .62, -1.4, r, 1.4]);
    for (const sz of [-1, 1]) { box('brick2', inner, h, sz * 1.4, r - 4, h + .35, sz * 1.75); }
    box('pave', r - 4, h, -1.75, r - 1, h + .12, 1.75);                     // híd-lap a sétaút fölött
    falls.push({ x: r + .12, y0: low, y1: h + .62, w: 2.6 });
  });
  // a vízesés medencéje és a tó
  for (const [x0, z0, x1, z1] of [[BASIN.x0 - .4, BASIN.z0 - .4, BASIN.x1, BASIN.z0], [BASIN.x0 - .4, BASIN.z1, BASIN.x1, BASIN.z1 + .4]]) box('brick2', x0, 0, z0, x1, .45, z1);
  water.push(['basin']);

  /* ---------- csúcs: templom ---------- */
  { const h = LV[4].h;
    box('marble', -6, h, -6, 6, h + .4, 6);
    const cols = new Set(); for (let k = -2; k <= 2; k++) for (const [x, z] of [[k * 2.5, -5], [k * 2.5, 5], [-5, k * 2.5], [5, k * 2.5]]) if (!(Math.abs(z) === 5 && Math.abs(x) < 2)) cols.add(x + ',' + z);
    for (const c of cols) { const [x, z] = c.split(',').map(Number); cyl('column', x, h + .4, z, .42, .36, 4.6, 16); collider(x, z, .5); }
    box('brick', -5.8, h + 5, -5.8, 5.8, h + 5.9, 5.8); box('glaze', -5.9, h + 5.9, -5.9, 5.9, h + 6.6, 5.9);
    box('brick2', -4.6, h + 6.6, -4.6, 4.6, h + 7.2, 4.6); box('brick2', -3.4, h + 7.2, -3.4, 3.4, h + 7.8, 3.4); box('glaze', -2.2, h + 7.8, -2.2, 2.2, h + 8.5, 2.2);
    cyl('gold', 0, h + 8.5, 0, .9, .2, 1.8, 16);
    along(sides(5.9, {}), 1.5, (x, z, nx, nz) => inst.rosette.push({ x: x + nx * .04, y: h + 6.25, z: z + nz * .04, ry: Math.atan2(nx, nz) }));
    // forrásmedence a templomban
    box('brick2', 1, h + .4, -2.4, 4.6, h + .9, -2); box('brick2', 1, h + .4, 2, 4.6, h + .9, 2.4); box('brick2', 1, h + .4, -2, 1.4, h + .9, 2);
    water.push([1.4, h + .75, -2, 4.6, 2]); rectCollider(.8, -2.6, 4.8, 2.6);
  }

  /* ---------- külső fal, tornyok, Istár-kapu ---------- */
  const W = WALL_H, gateHalf = 5;
  const wall = (x0, z0, x1, z1) => box('brick', x0, 0, z0, x1, W, z1);
  wall(PLAZA.x0 - 1.5, PLAZA.z0 - 1.5, PLAZA.x1 + 1.5, PLAZA.z0); wall(PLAZA.x0 - 1.5, PLAZA.z0, PLAZA.x0, PLAZA.z1); wall(PLAZA.x1, PLAZA.z0, PLAZA.x1 + 1.5, PLAZA.z1);
  wall(PLAZA.x0 - 1.5, PLAZA.z1, -gateHalf, PLAZA.z1 + 1.5); wall(gateHalf, PLAZA.z1, PLAZA.x1 + 1.5, PLAZA.z1 + 1.5);
  box('glaze', PLAZA.x0, W - 2.2, PLAZA.z0, PLAZA.x1, W - 1.2, PLAZA.z0 + .1); box('glaze', PLAZA.x0, W - 2.2, PLAZA.z0, PLAZA.x0 + .1, W - 1.2, PLAZA.z1);
  box('glaze', PLAZA.x1 - .1, W - 2.2, PLAZA.z0, PLAZA.x1, W - 1.2, PLAZA.z1); box('glaze', PLAZA.x0, W - 2.2, PLAZA.z1 - .1, -gateHalf - 6, W - 1.2, PLAZA.z1); box('glaze', gateHalf + 6, W - 2.2, PLAZA.z1 - .1, PLAZA.x1, W - 1.2, PLAZA.z1);
  for (let x = PLAZA.x0; x <= PLAZA.x1; x += 1.6) { inst.merlon.push({ x, y: W, z: PLAZA.z0 - .75 }); if (Math.abs(x) > gateHalf + 6.5) inst.merlon.push({ x, y: W, z: PLAZA.z1 + .75 }); }
  for (let z = PLAZA.z0; z <= PLAZA.z1; z += 1.6) { inst.merlon.push({ x: PLAZA.x0 - .75, y: W, z, ry: Math.PI / 2 }); inst.merlon.push({ x: PLAZA.x1 + .75, y: W, z, ry: Math.PI / 2 }); }
  for (const [tx, tz] of [[PLAZA.x0, PLAZA.z0], [PLAZA.x1, PLAZA.z0], [PLAZA.x0, PLAZA.z1], [PLAZA.x1, PLAZA.z1]]) { box('brick', tx - 3.5, 0, tz - 3.5, tx + 3.5, W + 4, tz + 3.5); box('glaze', tx - 3.6, W + 2.4, tz - 3.6, tx + 3.6, W + 3.2, tz + 3.6); }
  // Istár-kapu: két torony és az átjáró fölötti híd, csupa kék máz
  for (const s of [-1, 1]) {
    box('glaze', s * gateHalf, 0, PLAZA.z1 - 2, s * (gateHalf + 6), 17, PLAZA.z1 + 4);
    for (let x = gateHalf + .5; x < gateHalf + 6; x += 1.4) inst.merlon.push({ x: s * x, y: 17, z: PLAZA.z1 + 1, s: 1.2 });
    for (const y of [2, 6.5, 11]) lion.push({ x: s * (gateHalf + 3), y, z: PLAZA.z1 - 2.06, w: 5.4, h: 2.7, ry: Math.PI });
  }
  box('glaze', -gateHalf, 10, PLAZA.z1 - 1.6, gateHalf, 15, PLAZA.z1 + 3.6);
  { const ga = new THREE.Shape(); ga.moveTo(-gateHalf, 0); ga.lineTo(gateHalf, 0); ga.lineTo(gateHalf, 10); ga.lineTo(-gateHalf, 10); ga.lineTo(-gateHalf, 0);
    const hole = new THREE.Path(); hole.moveTo(-gateHalf, 0); hole.lineTo(gateHalf, 0); hole.lineTo(gateHalf, 4.5); hole.absarc(0, 4.5, gateHalf, 0, Math.PI, false); hole.lineTo(-gateHalf, 0); ga.holes.push(hole);
    for (const z of [PLAZA.z1 - 1.6, PLAZA.z1 + 3.6]) { const g = new THREE.ShapeGeometry(ga, 16); if (z > PLAZA.z1) g.rotateY(Math.PI); g.translate(0, 0, z); add('glaze', g); } }
  for (let x = -gateHalf + .6; x < gateHalf; x += 1.4) inst.merlon.push({ x, y: 15, z: PLAZA.z1 + 1, s: 1.1 });
  for (let x = -4; x <= 4; x += 1.1) inst.rosette.push({ x, y: 12.5, z: PLAZA.z1 - 1.72, ry: Math.PI });

  /* ---------- csatornák, szökőkutak, kút ---------- */
  for (const [x0, x1, z0, z1] of CANALS) {
    box('brick2', x0 - .35, 0, z0 - .35, x1 + .35, .4, z0); box('brick2', x0 - .35, 0, z1, x1 + .35, .4, z1 + .35);
    box('brick2', x0 - .35, 0, z0, x0, .4, z1); box('brick2', x1, 0, z0, x1 + .35, .4, z1);
    water.push([x0, .3, z0, x1, z1]);
    for (let z = z0 + 4; z < z1; z += 8) inst.jet.push({ x: (x0 + x1) / 2, z, y: .3, h: 1.6, r: .12 });
  }
  const basinRim = (x, z, r, y = 0) => { const g = new THREE.TorusGeometry(r, .32, 8, 40); g.rotateX(Math.PI / 2); g.scale(1, 1.4, 1); g.translate(x, y + .45, z); add('marble', g); cyl('marble', x, y, z, r, r, .3, 40); };
  for (const f of FOUNTAINS) {
    basinRim(f.x, f.z, f.r); water.push(['disc', f.x, .55, f.z, f.r - .1]);
    cyl('marble', f.x, .3, f.z, .5, .35, 1.6, 16); cyl('marble', f.x, 1.9, f.z, .25, 1.3, .35, 24); cyl('marble', f.x, 2.25, f.z, .2, .2, .8, 12);
    inst.jet.push({ x: f.x, z: f.z, y: 1.9, h: 1.6, r: 1.15, fall: true }); inst.jet.push({ x: f.x, z: f.z, y: 3, h: .9, r: .08 });
  }
  { const { x, z, r } = WELL; cyl('brick2', x, 0, z, r, r, .9, 20); cyl('dark', x, .02, z, r - .25, r - .25, .9, 20);
    for (const s of [-1, 1]) box('wood', x + s * r - .1, 0, z - .1, x + s * r + .1, 2.6, z + .1);
    box('wood', x - r - .2, 2.5, z - .1, x + r + .2, 2.7, z + .1); { const g = new THREE.ConeGeometry(2.3, 1.2, 4); g.rotateY(Math.PI / 4); g.translate(x, 3.25, z); add('terracotta', g); } }

  /* ---------- pavilonok (délkeleten és délnyugaton), szigettemplom ---------- */
  const gazebo = (gx, gz, gy, n, rr, colH) => {
    cyl('marble', gx, gy, gz, rr + .8, rr + .9, .12, 24);
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; cyl('column', gx + Math.cos(a) * rr, gy + .12, gz + Math.sin(a) * rr, .28, .24, colH, 12); }
    cyl('marble', gx, gy + .12 + colH, gz, rr + .5, rr + .5, .5, 24, false);
    { const g = new THREE.SphereGeometry(rr + .3, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.translate(gx, gy + .62 + colH, gz); add('glaze', g); }
    cyl('gold', gx, gy + .62 + colH + rr + .2, gz, .3, .05, 1.2, 10);
  };
  for (const s of [-1, 1]) { gazebo(s * 66, 88, 0, 8, 4.2, 3.6); box('marble', s * 66 - 1.6, 0, 88 - .4, s * 66 + 1.6, .5, 88 + .4); }
  { const g = new THREE.CylinderGeometry(ISLAND.r, ISLAND.r + 1, .6, 32); g.translate(ISLAND.x, .05, ISLAND.z); add('rock', g); const t = new THREE.CircleGeometry(ISLAND.r, 32); t.rotateX(-Math.PI / 2); t.translate(ISLAND.x, .36, ISLAND.z); add('grass', t); }
  gazebo(ISLAND.x, ISLAND.z, .35, 7, 2.6, 3);

  /* ---------- lugas az északi rózsakertben ---------- */
  for (const s of [-1, 1]) {
    for (let x = 7; x <= 46; x += 3) for (const z of [-68.2, -63.8]) box('wood', s * x - .12, 0, z - .12, s * x + .12, 3.2, z + .12);
    for (let x = 7; x <= 46; x += 1.5) box('wood', s * x - .07, 3.2, -68.7, s * x + .07, 3.38, -63.3);
    for (const z of [-68.2, -63.8]) box('wood', s * 6.8, 3.05, z - .1, s * 46.2, 3.25, z + .1);
  }

  /* ---------- híd a szigetre ---------- */
  for (let x = BRIDGE.x0; x < BRIDGE.x1; x += .5) {
    const y = bridgeH(x + .25);
    box('wood', x, y - .25, BRIDGE.z - BRIDGE.w, x + .52, y + .02, BRIDGE.z + BRIDGE.w);
    if (Math.round(x * 2) % 4 === 0) for (const s of [-1, 1]) box('wood', x, y, BRIDGE.z + s * (BRIDGE.w - .08) - .06, x + .12, y + 1.05, BRIDGE.z + s * (BRIDGE.w - .08) + .06);
  }
  for (const s of [-1, 1]) { const pts = []; for (let x = BRIDGE.x0; x <= BRIDGE.x1; x += .5) pts.push(new THREE.Vector3(x, bridgeH(x) + 1.05, BRIDGE.z + s * (BRIDGE.w - .08))); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, .05, 6); add('wood', g); }

  /* ---------- lámpások az utak mentén ---------- */
  LANTERNS.length = 0;
  const lampAt = (x, z, y = 0) => { cyl('bronze', x, y, z, .09, .06, 2.3, 8); cyl('bronze', x, y, z, .22, .2, .12, 10); LANTERNS.push([x, y + 2.5, z]); collider(x, z, .22); };
  for (let z = 58; z <= 104; z += 9.2) for (const s of [-1, 1]) lampAt(s * 5.6, z);
  for (let t = -48; t <= 48; t += 12) for (const [x, z] of [[t, 53.6], [t, -53.6], [53.6, t], [-53.6, t]]) { if (Math.abs(t) < 7) continue; lampAt(x, z); }
  for (const s of [-1, 1]) { lampAt(s * 6.3, -61.5); lampAt(s * 47.5, -61.5); lampAt(s * 60, 82); lampAt(s * 60, 94); }
  lampAt(BRIDGE.x0 - .6, BRIDGE.z + 2.3); lampAt(BRIDGE.x0 - .6, BRIDGE.z - 2.3);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + .6; lampAt(Math.cos(a) * 6.5, -66 + Math.sin(a) * 6.5); }

  /* ---------- összevonás anyagonként ---------- */
  for (const [k, arr] of Object.entries(geos)) {
    if (UVS[k]) arr.forEach(g => worldUV(g, UVS[k]));
    const parts = k === 'archFrame' ? arr : arr.map(g => g.index ? g.toNonIndexed() : g);
    const merged = mergeGeometries(parts.map(g => { for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); return g; }));
    const m = new THREE.Mesh(merged, k === 'archFrame' ? M.brick2 : M[k]);
    m.castShadow = !['grass', 'pave', 'soil', 'dark'].includes(k); m.receiveShadow = true; root.add(m);
  }
  // oroszlános panelek (saját textúra-kiosztással)
  { const gs = lion.map(p => { const g = new THREE.PlaneGeometry(p.w, p.h); g.rotateY(p.ry); g.translate(p.x, p.y, p.z); return g; }); const m = new THREE.Mesh(mergeGeometries(gs), M.lion); m.receiveShadow = true; root.add(m); }

  /* ---------- víz ---------- */
  const wg = [];
  for (const w of water) {
    if (w[0] === 'basin') { const g = new THREE.PlaneGeometry(BASIN.x1 - BASIN.x0, BASIN.z1 - BASIN.z0); g.rotateX(-Math.PI / 2); g.translate((BASIN.x0 + BASIN.x1) / 2, .2, 0); wg.push(g); continue; }
    if (w[0] === 'disc') { const g = new THREE.CircleGeometry(w[4], 32); g.rotateX(-Math.PI / 2); g.translate(w[1], w[2], w[3]); wg.push(g); continue; }
    const [x0, y, z0, x1, z1] = w, g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); wg.push(g);
  }
  { const g = new THREE.CircleGeometry(1, 64); g.rotateX(-Math.PI / 2); g.scale(LAKE.rx, 1, LAKE.rz); g.translate(LAKE.cx, .12, LAKE.cz); wg.push(g); }
  wg.forEach(g => worldUV(g, 6));
  const wm = new THREE.Mesh(mergeGeometries(wg.map(g => g.index ? g.toNonIndexed() : g)), M.water); wm.receiveShadow = true; wm.renderOrder = 1; root.add(wm);
  // tópart kövei
  { const rocks = []; srand(19); for (let k = 0; k < 120; k++) { const a = k / 120 * 6.28, rr = 1 + R(-.01, .05); rocks.push({ x: LAKE.cx + Math.cos(a) * LAKE.rx * rr, z: LAKE.cz + Math.sin(a) * LAKE.rz * rr, s: R(.35, .9), ry: R(0, 6) }); }
    const rg = new THREE.IcosahedronGeometry(1, 1); { const p = rg.attributes.position; for (let i = 0; i < p.count; i++) { const f = 1 + (Math.sin(p.getX(i) * 7.1 + p.getY(i) * 3.3 + p.getZ(i) * 5.7) * .5) * .3; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * .55, p.getZ(i) * f); } rg.computeVertexNormals(); }
    root.add(instanced(rg, M.rock, rocks.map(r => ({ ...r, y: .05 })), { cast: true })); }
  // vízesések és szökőkút-sugarak
  { const gs = falls.map(f => { const h = f.y1 - f.y0, g = new THREE.PlaneGeometry(f.w, h, 1, 6); g.rotateY(Math.PI / 2); g.translate(f.x, (f.y0 + f.y1) / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * h / 2.5); return g; });
    for (const j of inst.jet) { const g = j.fall ? new THREE.CylinderGeometry(j.r, j.r * 1.08, j.h, 24, 1, true) : new THREE.CylinderGeometry(j.r, j.r * 1.6, j.h, 8, 1, true); g.translate(j.x, j.y + (j.fall ? -j.h / 2 + .05 : j.h / 2), j.z); gs.push(g); }
    const m = new THREE.Mesh(mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g)), M.fall); m.renderOrder = 2; root.add(m); }

  /* ---------- példányosított díszek ---------- */
  root.add(instanced(new THREE.CylinderGeometry(.17, .17, .07, 12).rotateX(Math.PI / 2), M.gold, inst.rosette, { cast: false }));
  const merG = mergeGeometries([new THREE.BoxGeometry(1, .7, 1.5).translate(0, .35, 0), new THREE.BoxGeometry(.6, .6, 1.5).translate(0, 1, 0)]);
  root.add(instanced(merG, M.brick, inst.merlon, { cast: true }));
  { const lg = new THREE.BoxGeometry(.3, .42, .3); root.add(instanced(lg, M.lamp, LANTERNS.map(([x, y, z]) => ({ x, y: y - .25, z })), { cast: false })); }

  /* ---------- háttér: sivatag, Eufrátesz, Babilon városa, Etemenanki ---------- */
  srand(33);
  { const dg = []; for (let k = 0; k < 26; k++) { const a = R(0, 6.28), d = R(260, 700), g = new THREE.SphereGeometry(1, 20, 8); g.scale(R(60, 140), R(10, 30), R(60, 140)); if (Math.sin(a) * d > 120) continue; g.translate(Math.cos(a) * d, -4, Math.sin(a) * d); dg.push(g.toNonIndexed()); }
    const m = new THREE.Mesh(mergeGeometries(dg), M.sand); root.add(m); }
  { const hs = []; for (let k = 0; k < 420; k++) { const a = R(.2, 3.6), d = R(150, 330); const x = Math.cos(a) * d, z = Math.sin(a) * d + 40; if (z > 100 || x < -205) continue; const w = R(6, 16), hh = R(4, 10), dd = R(6, 16); hs.push({ x, z, sx: w, sy: hh, sz: dd, ry: R(-.1, .1) }); }
    root.add(instanced(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), M.brick2, hs, { cast: false }));
    const eg = []; for (let k = 0; k < 7; k++) { const s = 46 - k * 6, g = new THREE.BoxGeometry(s * 2, 9, s * 2); g.translate(-230, 4.5 + k * 9, 20); eg.push(g.toNonIndexed()); }
    const em = new THREE.Mesh(mergeGeometries(eg), M.brick); root.add(em);
    const tg = new THREE.BoxGeometry(10, 8, 10); tg.translate(-230, 67, 20); root.add(new THREE.Mesh(tg, M.glaze)); }
  return root;
}

export function instanced(geo, mat, list, { cast = true, receive = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)), o = new THREE.Object3D();
  list.forEach((t, i) => {
    o.position.set(t.x, t.y ?? 0, t.z); o.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0, 'YXZ');
    o.scale.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    if (t.c) m.setColorAt(i, t.c.isColor ? t.c : new THREE.Color(t.c));
  });
  m.count = list.length; m.castShadow = cast; m.receiveShadow = receive; m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); return m;
}
