// A kert alaprajza: magasság, ütközés, és minden tárgy/növény helye (determinisztikus, minden gépen ugyanaz).
// Világ-egység = méter. +z dél (a kapu), -z észak.

export const PLAZA = { x0: -92, x1: 92, z0: -84, z1: 112 };
// öt terasz: magasság és fél-szélesség (a gyűrűk 9 m szélesek)
export const LV = [{ h: 5, r: 46 }, { h: 10, r: 37 }, { h: 15, r: 28 }, { h: 20, r: 19 }, { h: 25, r: 10 }];
export const WALL_H = 7;

let seed = 1;
export const srand = s => { seed = s; };
export const sr = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
export const R = (a, b) => a + sr() * (b - a);
export const pick = a => a[Math.floor(sr() * a.length)];

/* ---------- lépcsők: téglalap, a tengely mentén lineáris magasság ---------- */
export const STAIRS = [];
function run(side, w, from, to) {
  for (let i = from; i < to; i++) {
    const outer = i === 0 ? LV[0].r + 8 : LV[i - 1].r, inner = LV[i].r, h0 = i === 0 ? 0 : LV[i - 1].h, h1 = LV[i].h;
    if (side === 'S') STAIRS.push({ x0: -w, x1: w, z0: inner, z1: outer, ax: 'z', a0: outer, a1: inner, h0, h1, side, i, w });
    if (side === 'N') STAIRS.push({ x0: -w, x1: w, z0: -outer, z1: -inner, ax: 'z', a0: -outer, a1: -inner, h0, h1, side, i, w });
    if (side === 'W') STAIRS.push({ x0: -outer, x1: -inner, z0: -w, z1: w, ax: 'x', a0: -outer, a1: -inner, h0, h1, side, i, w });
  }
}
run('S', 5, 0, 5); run('N', 3.5, 0, 4); run('W', 3.5, 0, 2);

/* ---------- víz ---------- */
export const LAKE = { cx: 72, cz: 0, rx: 17, rz: 33 };
export const ISLAND = { x: 75, z: -4, r: 6.5 };
export const BRIDGE = { x0: 52.5, x1: 70, z: -4, w: 1.7 };
export const BASIN = { x0: 46.6, x1: 56, z0: -3.6, z1: 3.6 };         // a vízesés alja, a tóba folyik
export const CANALS = [[-11, -8, 58, 106], [8, 11, 58, 106]];
export const FOUNTAINS = [{ x: -32, z: 80, r: 3.6 }, { x: 32, z: 80, r: 3.6 }, { x: 0, z: -66, r: 4.2 }];
export const WELL = { x: -70, z: -2, r: 1.5 };
const inLake = (x, z) => ((x - LAKE.cx) / LAKE.rx) ** 2 + ((z - LAKE.cz) / LAKE.rz) ** 2 < 1;
const onIsland = (x, z) => Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r;
const onBridge = (x, z) => x > BRIDGE.x0 && x < BRIDGE.x1 && Math.abs(z - BRIDGE.z) < BRIDGE.w;
export const bridgeH = x => { const t = Math.min(1, Math.max(0, (x - BRIDGE.x0) / (BRIDGE.x1 - BRIDGE.x0))); return .35 * t + 1.1 * Math.sin(Math.PI * t); };

export function heightAt(x, z) {
  for (const s of STAIRS) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) { const a = s.ax === 'z' ? z : x; return s.h0 + (s.h1 - s.h0) * (a - s.a0) / (s.a1 - s.a0); }
  const m = Math.max(Math.abs(x), Math.abs(z));
  if (m <= 6) return LV[4].h + .4;                                       // templom padlója
  for (let i = LV.length - 1; i >= 0; i--) if (m <= LV[i].r) return LV[i].h;
  if (onBridge(x, z)) return bridgeH(x);
  if (onIsland(x, z)) return .35;
  return 0;
}

/* ---------- ütközők: körök rácsba rendezve + téglalapok ---------- */
const CELL = 8, grid = new Map(), RECTS = [];
export function collider(x, z, r) { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); (grid.get(k) || grid.set(k, []).get(k)).push({ x, z, r }); }
export function rectCollider(x0, z0, x1, z1) { RECTS.push([x0, z0, x1, z1]); }
export function blocked(x, z, rad = .35) {
  if (x < PLAZA.x0 + 1.2 || x > PLAZA.x1 - 1.2 || z < PLAZA.z0 + 1.2 || z > PLAZA.z1 - 1.2) return true;
  if (inLake(x, z) && !onIsland(x, z) && !onBridge(x, z)) return true;
  if (x > BASIN.x0 && x < BASIN.x1 && z > BASIN.z0 && z < BASIN.z1) return true;
  for (const [a, b, c, d] of CANALS) if (x > a - .3 && x < b + .3 && z > c - .3 && z < d + .3) return true;
  for (const f of FOUNTAINS) if (Math.hypot(x - f.x, z - f.z) < f.r + .5) return true;
  if (Math.hypot(x - WELL.x, z - WELL.z) < WELL.r + .4) return true;
  for (const [a, c, b, d] of RECTS) if (x > a && x < b && z > c && z < d) return true;
  const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = grid.get((cx + i) + ',' + (cz + j)); if (l) for (const c of l) if (Math.hypot(x - c.x, z - c.z) < c.r + rad) return true;
  }
  return false;
}

/* ---------- helyek: minden növény és díszlet ---------- */
// típusok: palm, olive, fig, pomegranate, cypress, willow, cedar, bush, rose, lavender, flower, grass, reed, fern, sorrel, calathea, urn, bench, lotus, hedge, topiary
export const P = { trees: [], small: [], beds: [], urns: [], benches: [], hedges: [], lotus: [], reeds: [], grass: [], flowers: [], ferns: [], willowSpots: [] };
const T = (type, x, z, y = 0, s = 1, col = true) => { P.trees.push({ type, x, z, y, s, ry: R(0, 6.28) }); if (col) collider(x, z, type === 'cypress' ? .5 : type === 'palm' ? .35 : .45 * s); };
const flowerCols = { meadow: ['white', 'yellow', 'red', 'purple'], bed: ['red', 'yellow', 'white', 'purple', 'orange'] };
const F = (x, z, y, kind = 'bed') => P.flowers.push({ x, z, y, t: pick(flowerCols[kind]), s: R(.8, 1.25), ry: R(0, 6.28) });

export function layout(dens) {
  srand(42);
  // --- teraszok gyűrűi: mindegyiken más fajta kert ---
  const ringSpecies = [['pomegranate', 'rose'], ['olive', 'lavender'], ['palm', 'flower'], ['cypress', 'rose'], ['cedar', 'lavender']];
  LV.forEach(({ h, r }, i) => {
    const inner = i < LV.length - 1 ? LV[i + 1].r : 0, [tree, under] = ringSpecies[i];
    if (i < LV.length - 1) {
      const mid = (inner + r - 4) / 2; // a kerti sáv közepe (a belső fal és a sétaút között)
      for (const side of ['S', 'N', 'E', 'W']) for (let t = -r + 5; t <= r - 5; t += tree === 'cypress' ? 4 : 7) {
        const [x, z] = side === 'S' ? [t, mid] : side === 'N' ? [t, -mid] : side === 'E' ? [mid, t] : [-mid, t];
        if (Math.abs(side === 'S' || side === 'N' ? x : z) < 7.5) continue;                // lépcsők, vízesés helye
        if (Math.abs(Math.abs(x) - Math.abs(z)) < 3) continue;                                // sarkok szabadon
        T(tree, x + R(-.4, .4), z + R(-.4, .4), h, R(.85, 1.15));
        for (let k = 0; k < 6 * dens + 2; k++) {
          const a = R(0, 6.28), d = R(1.2, 2.6), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
          if (under === 'flower') F(px, pz, h); else P.small.push({ type: under, x: px, z: pz, y: h, s: R(.8, 1.2), ry: R(0, 6.28) });
        }
      }
      // urnák a sétaút belső szélén, padok kifelé nézve
      for (const side of ['S', 'N', 'E', 'W']) for (let t = -r + 6; t <= r - 6; t += 9) {
        if (Math.abs(t) < 7) continue;
        const e = r - 4.3, [x, z, ry] = side === 'S' ? [t, e, 0] : side === 'N' ? [t, -e, Math.PI] : side === 'E' ? [e, t, Math.PI / 2] : [-e, t, -Math.PI / 2];
        P.urns.push({ x, z, y: h, ry }); collider(x, z, .55);
        const b = r - 1.7, [bx, bz] = side === 'S' ? [t + 4.5, b] : side === 'N' ? [t + 4.5, -b] : side === 'E' ? [b, t + 4.5] : [-b, t + 4.5];
        if (Math.abs(side === 'S' || side === 'N' ? bx : bz) > 7) { P.benches.push({ x: bx, z: bz, y: h, ry: ry + Math.PI }); }
      }
    } else {
      // csúcs: két nagy cédrus a templom mögött
      T('cedar', -7.6, -7.6, h, 1.15); T('cedar', 7.6, -7.6, h, 1.1);
      for (let k = 0; k < 30 * dens; k++) P.small.push({ type: 'lavender', x: R(-8.5, -2) * (sr() < .5 ? 1 : -1), z: R(6.5, 8.6), y: h, s: R(.8, 1.1), ry: R(0, 6) });
    }
  });

  // --- dél: díszudvar (processziós út, csatornák, parterek) ---
  for (const s of [-1, 1]) {
    for (let z = 58; z <= 104; z += 7) T('palm', s * 15, z, 0, R(.95, 1.15));
    for (let z = 61; z <= 103; z += 7) { F(s * 6.6, z, 0); F(s * 6.8, z + 2.5, 0); F(s * 13, z, 0); }
    // parter: alacsony sövénykeretek, bennük virág és rózsa, közepén szökőkút
    const cx = s * 32, cz = 80;
    for (const [w, d] of [[22, 34]]) {
      P.hedges.push({ x: cx, z: cz - d / 2, w, d: .9, h: .8 }); P.hedges.push({ x: cx, z: cz + d / 2, w, d: .9, h: .8 });
      P.hedges.push({ x: cx - w / 2, z: cz - 9.5, w: .9, d: d / 2 - 9, h: .8 }); P.hedges.push({ x: cx - w / 2, z: cz + 9.5, w: .9, d: d / 2 - 9, h: .8 });
      P.hedges.push({ x: cx + w / 2, z: cz - 9.5, w: .9, d: d / 2 - 9, h: .8 }); P.hedges.push({ x: cx + w / 2, z: cz + 9.5, w: .9, d: d / 2 - 9, h: .8 });
    }
    for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const bx = cx + qx * 6, bz = cz + qz * 9.5;
      P.hedges.push({ x: bx, z: bz, w: 7, d: 10, h: .55, bed: true });
      for (let k = 0; k < 40 * dens + 8; k++) F(bx + R(-3, 3), bz + R(-4.5, 4.5), .55);
      P.trees.push({ type: 'topiary', x: bx, z: bz, y: .55, s: 1, ry: 0 }); collider(bx, bz, .8);
    }
    for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) T('cypress', cx + qx * 12.5, cz + qz * 18, 0, R(.9, 1.1));
    // kerti pavilon (gazebo) és környéke
    const gx = s * 66, gz = 88;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; collider(gx + Math.cos(a) * 4.2, gz + Math.sin(a) * 4.2, .35); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; T('cypress', gx + Math.cos(a) * 10, gz + Math.sin(a) * 10, 0, R(.85, 1.05)); }
    for (let k = 0; k < 18; k++) { const a = R(0, 6.28), d = R(6, 8.5); P.small.push({ type: 'rose', x: gx + Math.cos(a) * d, z: gz + Math.sin(a) * d, y: 0, s: R(.9, 1.2), ry: R(0, 6) }); }
    // szélső fasorok
    for (let z = 58; z <= 106; z += 8) T('olive', s * 50, z, 0, R(.9, 1.15));
    for (let z = 62; z <= 104; z += 8) T('pomegranate', s * 82, z, 0, R(.9, 1.1));
  }

  // --- kelet: tó, sziget, fűzek, nád ---
  for (let k = 0; k < 70; k++) {
    const a = k / 70 * 6.28 + R(-.03, .03), rr = 1 + R(.03, .16);
    const x = LAKE.cx + Math.cos(a) * LAKE.rx * rr, z = LAKE.cz + Math.sin(a) * LAKE.rz * rr;
    if (x < 57 && Math.abs(z) < 6) continue;                                   // a patak és a híd környéke
    if (Math.abs(z - BRIDGE.z) < 3 && x < 60) continue;
    P.reeds.push({ x, z, s: R(.8, 1.3), ry: R(0, 6) });
    if (sr() < .5) P.reeds.push({ x: x + R(-1, 1), z: z + R(-1, 1), s: R(.7, 1.1), ry: R(0, 6) });
  }
  for (let k = 0; k < 26 * dens + 10; k++) { const a = R(0, 6.28), d = R(.25, .8); const x = LAKE.cx + Math.cos(a) * LAKE.rx * d, z = LAKE.cz + Math.sin(a) * LAKE.rz * d; if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r + 1.5 || Math.abs(z - BRIDGE.z) < 2.5) continue; P.lotus.push({ x, z, s: R(.7, 1.3), ry: R(0, 6), bloom: sr() < .35 }); }
  for (const [x, z] of [[58, -38], [86, -36], [88, 30], [60, 40], [90, 2]]) T('willow', x, z, 0, R(1, 1.2));
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; collider(ISLAND.x + Math.cos(a) * 2.6, ISLAND.z + Math.sin(a) * 2.6, .3); }
  for (let k = 0; k < 10; k++) { const a = R(0, 6.28), d = R(3.8, 5.8); P.small.push({ type: 'fern', x: ISLAND.x + Math.cos(a) * d, z: ISLAND.z + Math.sin(a) * d, y: .35, s: R(.9, 1.3), ry: R(0, 6) }); }
  for (let z = -76; z <= -46; z += 8) for (let x = 54; x <= 88; x += 9) T(pick(['fig', 'olive']), x + R(-1.5, 1.5), z + R(-1.5, 1.5), 0, R(.9, 1.15));
  for (let z = 42; z <= 54; z += 6) for (let x = 56; x <= 88; x += 8) T('palm', x + R(-1, 1), z + R(-1, 1), 0, R(.9, 1.2));

  // --- nyugat: gyümölcsös liget, rét, kút ---
  for (let z = -46; z <= 50; z += 7.5) for (let x = -88; x <= -54; x += 7.5) {
    const px = x + R(-1.4, 1.4), pz = z + R(-1.4, 1.4);
    if (Math.hypot(px - WELL.x, pz - WELL.z) < 5.5 || Math.abs(pz) < 4.4) continue;
    T(pick(['olive', 'fig', 'pomegranate', 'pomegranate']), px, pz, 0, R(.85, 1.15));
  }
  for (let k = 0; k < 900 * dens; k++) { const x = R(-89, -52), z = R(-50, 54); if (Math.abs(z) < 3.4) continue; if (sr() < .55) P.grass.push({ x, z, s: R(.7, 1.3), ry: R(0, 6) }); else F(x, z, 0, 'meadow'); }

  // --- észak: rózsakert lugassal, szökőkút, ciprusfasor ---
  for (const s of [-1, 1]) {
    for (let x = 7; x <= 46; x += 3) { collider(s * x, -68.2, .25); collider(s * x, -63.8, .25); }
    for (let x = 8; x <= 46; x += 2.2) for (const zz of [-71.5, -60.5]) P.small.push({ type: 'rose', x: s * x + R(-.4, .4), z: zz + R(-.6, .6), y: 0, s: R(.9, 1.25), ry: R(0, 6) });
    for (let z = -80; z <= -54; z += 5) { T('cypress', s * 56, z, 0, R(.9, 1.1)); T('cypress', s * 86, z, 0, R(.9, 1.1)); }
    for (let k = 0; k < 120 * dens; k++) { const x = s * R(59, 83), z = R(-80, -54); if (sr() < .5) P.small.push({ type: 'lavender', x, z, y: 0, s: R(.8, 1.2), ry: R(0, 6) }); else F(x, z, 0); }
  }
  for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; P.small.push({ type: 'rose', x: Math.cos(a) * 7.6, z: -66 + Math.sin(a) * 7.6, y: 0, s: 1.1, ry: a }); }

  // --- a zikkurat körüli sétány és gyep ---
  for (let k = 0; k < 2200 * dens; k++) {
    const x = R(PLAZA.x0 + 2, PLAZA.x1 - 2), z = R(PLAZA.z0 + 2, PLAZA.z1 - 2), m = Math.max(Math.abs(x), Math.abs(z));
    if (m < 56 || (Math.abs(x) < 14 && z > 50) || (x > 50 && Math.abs(z) < 38) || (Math.abs(z + 66) < 9 && Math.abs(x) < 48)) continue;
    if (x < -52 && Math.abs(z) < 55) continue;
    if (Math.abs(x) > 18 && Math.abs(x) < 46 && z > 60 && z < 100) continue;
    P.grass.push({ x, z, s: R(.7, 1.2), ry: R(0, 6) });
  }
  // páfrányok és cserjék a teraszok tövében
  for (let k = 0; k < 160 * dens + 30; k++) {
    const side = Math.floor(R(0, 4)), t = R(-44, 44), d = R(47.5, 49.5);
    const [x, z] = side === 0 ? [t, d] : side === 1 ? [t, -d] : side === 2 ? [d, t] : [-d, t];
    if ((side === 0 && Math.abs(t) < 8) || (side === 1 && Math.abs(t) < 6) || (side === 2 && Math.abs(t) < 6) || (side === 3 && Math.abs(t) < 6)) continue;
    P.small.push({ type: pick(['fern', 'sorrel', 'sorrel', 'calathea']), x, z, y: 0, s: R(.9, 1.4), ry: R(0, 6) });
  }
  // sövények ütközői
  for (const hd of P.hedges) if (!hd.bed) rectCollider(hd.x - hd.w / 2 - .2, hd.z - hd.d / 2 - .2, hd.x + hd.w / 2 + .2, hd.z + hd.d / 2 + .2);
  for (const hd of P.hedges) if (hd.bed) rectCollider(hd.x - hd.w / 2, hd.z - hd.d / 2, hd.x + hd.w / 2, hd.z + hd.d / 2);
  return P;
}

/* ---------- bemutató-séta: végigmegy minden kerten ---------- */
export const TOUR = [
  [0, 104], [0, 60], [0, 54.5], [0, 46.3], [-30, 43.5], [-43.5, 43.5], [-43.5, -43.5], [-4, -43.5], [0, -46.3], [0, -37.4],
  [-34.5, -34.5], [-34.5, 34.5], [-4, 34.5], [0, 37.4], [0, 28.3], [25.5, 25.5], [25.5, -25.5], [-25.5, -25.5], [-25.5, 25.5], [-4, 25.6],
  [0, 28.3], [0, 19.3], [16.5, 16.5], [16.5, -16.5], [-16.5, -16.5], [-16.5, 16.5], [-4, 16.6], [0, 19.3], [0, 10.3], [-1.6, 4], [-1.6, -6.5], [-1.6, 4],
  [0, 10.3], [0, 19.3], [0, 28.3], [0, 37.4], [0, 46.3], [0, 54.5], [0, 58], [-20, 58], [-46, 57], [-51, 52], [-51, 6], [-70, 6], [-77, 30], [-77, -30], [-62, -44],
  [-50, -50], [-48, -66], [-5.5, -66], [-4, -60.8], [0, -60], [4, -60.8], [5.5, -66], [48, -66], [50, -50], [50, -12], [53, -4], [62, -4], [70, -4], [76, -2], [70, -4], [62, -4],
  [53, -4], [50, 10], [50, 44], [54, 56], [40, 58], [20, 58], [6, 62], [4, 104], [0, 104],
];

/* ---------- rangzár: melyik terasz melyik rangtól nyílik (TIERS-index) ---------- */
export const LOCK_TIER = [0, 1, 2, 3, 6];
export const maxLevelFor = t => { let m = 0; LOCK_TIER.forEach((need, i) => { if (t >= need) m = i; }); return m; };

/* ---------- bemutató-séta a nyitott teraszokkal ---------- */
export function makeTour(maxI) {
  const out = [[0, 104], [0, 60], [0, 54.5]];
  for (let i = 0; i <= maxI; i++) {
    const r = LV[i].r;
    out.push([0, r + .3]);
    if (i < LV.length - 1) { const p = r - 2.5; out.push([-6.6, r - .55], [-6.6, p], [-p, p], [-p, -p], [p, -p], [p, p], [6.6, p], [6.6, r - .55], [0, r + .3]); }
    else out.push([-1.6, 4], [-1.6, -6.5], [-1.6, 4]);
  }
  for (let i = maxI; i >= 0; i--) out.push([0, LV[i].r + .3]);
  const k = TOUR.findIndex(([x, z]) => x === 0 && z === 58);
  return out.concat(TOUR.slice(k));
}

/* ---------- kertszavak kioldói: hol bukkan fel melyik angol szó ---------- */
export function wordTriggers() {
  const T = [], add = (w, x, z, r, y = null) => T.push({ w, x, z, r, y });
  const treeWord = { palm: 'palm', olive: 'olive', fig: 'fig', pomegranate: 'pomegranate', cypress: 'cypress', cedar: 'cedar', willow: 'willow' };
  for (const t of P.trees) { if (treeWord[t.type]) add(treeWord[t.type], t.x, t.z, t.type === 'cedar' || t.type === 'willow' ? 6 : 3.6, t.y); if (t.type === 'palm') add('date', t.x, t.z, 2.6, t.y); }
  P.small.forEach((p, i) => { if (p.type === 'rose' && i % 2 === 0) add('rose', p.x, p.z, 2.4, p.y); if (p.type === 'lavender' && i % 3 === 0) add('lavender', p.x, p.z, 2.4, p.y); if (['fern', 'sorrel', 'calathea'].includes(p.type) && i % 4 === 0) add('shrub', p.x, p.z, 2.6, p.y); });
  P.reeds.forEach((r, i) => i % 2 === 0 && add('reed', r.x, r.z, 3.5, 0));
  P.lotus.forEach(l => add('lily', l.x, l.z, 6, 0));
  P.urns.forEach(u => add('flowerpot', u.x, u.z, 2.2, u.y));
  P.benches.forEach(b => add('bench', b.x, b.z, 2.2, b.y));
  for (const hd of P.hedges) { const n = Math.max(1, Math.round(Math.max(hd.w, hd.d) / 5)); for (let k = 0; k < n; k++) { const t = (k + .5) / n - .5; add(hd.bed ? 'flowerbed' : 'hedge', hd.x + (hd.w > hd.d ? t * hd.w : 0), hd.z + (hd.w > hd.d ? 0 : t * hd.d), hd.bed ? 4.5 : 2.6, 0); } }
  for (const f of FOUNTAINS) add('fountain', f.x, f.z, f.r + 3, 0);
  for (const [a, b, c, d] of CANALS) for (let z = c; z <= d; z += 6) add('canal', (a + b) / 2, z, 3.5, 0);
  add('gate', 0, 108, 9, 0);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { add('lion', s * (10 + k * 9), 48.5, 4.5, 0); add('tile', s * (12 + k * 9), 47.5, 4, 0); }
  add('well', WELL.x, WELL.z, 4.5, 0);
  for (let x = -86; x <= -56; x += 14) for (let z = -44; z <= 48; z += 14) { add('orchard', x, z, 8, 0); add('meadow', x + 7, z + 7, 6, 0); }
  LV.forEach(({ h, r }, i) => {
    if (i === LV.length - 1) return;
    const p = r - 2.5;
    for (let t = -p + 6; t <= p - 6; t += 12) for (const [x, z] of [[t, p], [t, -p], [p, t], [-p, t]]) { add('vine', x, z, 3.2, h); add('terrace', x, z, 6, h); }
  });
  for (const s of STAIRS) add('staircase', (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, 4, (s.h0 + s.h1) / 2);
  LV.forEach(({ h, r }, i) => add('waterfall', r + 2, 0, 5, i ? LV[i - 1].h : 0));
  add('waterfall', 51, 0, 7, 0);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; add('shore', LAKE.cx + Math.cos(a) * (LAKE.rx + 2), LAKE.cz + Math.sin(a) * (LAKE.rz + 2), 4, 0); }
  add('bridge', (BRIDGE.x0 + BRIDGE.x1) / 2, BRIDGE.z, 5); add('island', ISLAND.x, ISLAND.z, 7, .35);
  for (const s of [-1, 1]) { add('dome', s * 66, 88, 7, 0); add('column', s * 66, 88, 6, 0); }
  add('dome', ISLAND.x, ISLAND.z, 4, .35);
  add('temple', 0, 0, 9, LV[4].h); add('column', 0, 0, 7, LV[4].h);
  for (const s of [-1, 1]) for (let x = 9; x <= 45; x += 6) add('arbour', s * x, -66, 3.2, 0);
  return T;
}
