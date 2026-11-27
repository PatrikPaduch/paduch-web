// Növényzet: fák (pálma, olajfa, füge, gránátalma, ciprus, cédrus, fűz), cserjék, virágok, fű, nád, tavirózsa, indák.
// Minden példányosítva és térbeli cellákra bontva, hogy a kamerán kívüli részeket ne rajzolja.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LV, P, R, sr, srand, pick } from './world.js';
import { sides, along, levelGaps } from './build.js';
import { TEX, wind, FLOWER_KEYS } from './mats.js';

const CH = 64;
export const CULL = [];   // távolságra elrejthető apró növények (a főciklus kapcsolgatja)
function chunked(geo, mat, list, { cast = false, receive = true, name = '', cull = 0 } = {}) {
  const g = new THREE.Group(), cells = new Map(), o = new THREE.Object3D();
  for (const t of list) { const k = Math.floor(t.x / CH) + ',' + Math.floor(t.z / CH); (cells.get(k) || cells.set(k, []).get(k)).push(t); }
  for (const arr of cells.values()) {
    const m = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach((t, i) => {
      o.position.set(t.x, t.y ?? 0, t.z); o.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0, 'YXZ');
      o.scale.set(t.sx ?? t.s ?? 1, t.sy ?? t.s ?? 1, t.sz ?? t.s ?? 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      if (t.c) m.setColorAt(i, t.c.isColor ? t.c : new THREE.Color(t.c));
    });
    m.castShadow = cast; m.receiveShadow = receive; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere(); m.name = name; g.add(m);
    if (cull) { m.userData.cull = cull; CULL.push(m); }
  }
  return g;
}

/* ---------- alapgeometriák ---------- */
function clumpGeo() { // levélcsomó: 3 függőleges + 1 ferde kártya
  const ps = [];
  for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(1, 1); g.rotateY(i * Math.PI / 3); ps.push(g); }
  const t = new THREE.PlaneGeometry(1, 1); t.rotateX(-Math.PI / 2.6); ps.push(t);
  return mergeGeometries(ps);
}
function crossGeo(w, h, n = 2) { // fű, virág, levendula: talajon álló keresztkártyák
  const ps = []; for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0); g.rotateY(i * Math.PI / n); ps.push(g); }
  return mergeGeometries(ps);
}
function trunkGeo(branches = 3, lean = .0) { // törzs + ágak, egységnyi magasság
  const ps = []; const t = new THREE.CylinderGeometry(.11, .2, 1, 9, 4); t.translate(0, .5, 0);
  { const p = t.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 3) * .05 + lean * y * y); } }
  ps.push(t);
  for (let b = 0; b < branches; b++) {
    const g = new THREE.CylinderGeometry(.045, .09, .55, 6); g.translate(0, .27, 0); g.rotateZ(.8 + b * .15); g.rotateY(b * 2.1 + .4); g.translate(lean * .5, .62 + b * .1, 0); ps.push(g);
  }
  const m = mergeGeometries(ps.map(g => g.toNonIndexed())); m.computeVertexNormals(); return m;
}
function palmTrunkGeo() {
  const g = new THREE.CylinderGeometry(.17, .27, 1, 10, 10); g.translate(0, .5, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), ring = 1 + .06 * Math.max(0, Math.sin(y * 70)); p.setX(i, p.getX(i) * ring + .32 * y * y); p.setZ(i, p.getZ(i) * ring); }
  g.computeVertexNormals(); return g;
}
function palmCrownGeo() {
  srand(5); const fr = [];
  for (let k = 0; k < 12; k++) {
    const g = new THREE.PlaneGeometry(3.1, .95, 12, 2); g.rotateX(-Math.PI / 2); g.translate(1.55, 0, 0);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, .62 * x - .3 * x * x + Math.abs(z) * .32); }
    g.rotateZ(k < 4 ? R(.25, .45) : R(-.15, .15)); g.rotateY(k * Math.PI * 2 / 12 + R(-.12, .12)); fr.push(g);
  }
  const m = mergeGeometries(fr); m.computeVertexNormals(); return m;
}
function strandGeo() { const g = new THREE.PlaneGeometry(.55, 1, 1, 4); g.translate(0, -.5, 0); return g; } // lelógó (fűz, inda, akác)
function urnGeo() { const pts = [[.0, 0], [.32, 0], [.36, .08], [.26, .2], [.3, .45], [.46, .75], [.52, .9], [.46, .95], [.44, .92]].map(([x, y]) => new THREE.Vector2(x, y)); return new THREE.LatheGeometry(pts, 18); }
function lotusGeo() { const g = new THREE.CircleGeometry(.45, 14, .3, Math.PI * 2 - .4); g.rotateX(-Math.PI / 2); return g; }

/* ---------- valódi 3D növénymodellek (csak erős gépen) ---------- */
async function loadModels() {
  const L = new GLTFLoader(), out = {};
  const want = { fern: ['fern_02', .95], sorrel: ['shrub_sorrel_01', .7], calathea: ['calathea_orbifolia_01', .85] };
  await Promise.all(Object.entries(want).map(async ([k, [n, H]]) => {
    try {
      const g = await L.loadAsync(`assets/models/${n}/${n}_1k.gltf`); g.scene.updateMatrixWorld(true); out[k] = [];
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone(), m = o.matrixWorld.clone(); m.setPosition(0, 0, 0); geo.applyMatrix4(m);
        geo.computeBoundingBox(); const bb = geo.boundingBox, c = bb.getCenter(new THREE.Vector3()), h = bb.max.y - bb.min.y;
        geo.translate(-c.x, -bb.min.y, -c.z); geo.scale(H / h, H / h, H / h);
        const mat = o.material; mat.side = THREE.DoubleSide; if (mat.alphaMap || mat.transparent) { mat.alphaTest = .5; mat.transparent = false; }
        wind(mat, .07); out[k].push({ geo, mat });
      });
    } catch (e) { console.warn('Növénymodell nem tölthető be:', n, e); }
  }));
  return out;
}

/* ---------- fa-receptek: törzs + levélcsomók elhelyezése ---------- */
const TREE = {
  olive: { H: 4.6, cr: 2.6, cy: .78, tint: '#b6c4a0', leaf: 'leaf', n: 22, trunk: 0 },
  fig: { H: 5.2, cr: 3.1, cy: .74, tint: '#9fbf7a', leaf: 'leaf2', n: 24, trunk: 1 },
  pomegranate: { H: 3.6, cr: 2.0, cy: .72, tint: '#a9cc88', leaf: 'leaf', n: 16, trunk: 0, fruit: 14 },
  cedar: { H: 9, cr: 5.2, cy: .5, tint: '#7f9c86', leaf: 'leaf', n: 34, trunk: 1, tiers: true },
  willow: { H: 7, cr: 4.2, cy: .72, tint: '#c4dc94', leaf: 'leaf2', n: 26, trunk: 1, strands: 46 },
};

export async function buildFlora(M, q, onStep) {
  const root = new THREE.Group(), D = q.dens, hi = q.maps;
  srand(91);
  const models = hi ? await loadModels() : {};
  onStep && onStep();
  const clumps = { leaf: [], leaf2: [] }, trunks = [[], []], palmT = [], palmC = [], fruit = [], dates = [], strands = [], cyp = [], topi = [];
  const small = { rose: [], lavender: [], grass: [], reed: [], fern: [], sorrel: [], calathea: [], urnPlant: [] }, flowers = Object.fromEntries(FLOWER_KEYS.map(k => [k, []]));
  const vines = [], wisteria = [], tint = c => new THREE.Color(c).offsetHSL(R(-.02, .02), R(-.05, .05), R(-.06, .05));

  for (const t of P.trees) {
    const s = t.s;
    if (t.type === 'palm') {
      const H = 6.4 * s; palmT.push({ x: t.x, y: t.y, z: t.z, ry: t.ry, sx: s, sy: H, sz: s });
      const dx = .32 * s; const cx = t.x + Math.cos(-t.ry) * dx, cz = t.z + Math.sin(-t.ry) * dx; palmC.push({ x: cx, y: t.y + H, z: cz, ry: R(0, 6.28), s: .9 + s * .25 });
      for (let k = 0; k < 7; k++) { const a = R(0, 6.28); dates.push({ x: cx + Math.cos(a) * .3, y: t.y + H - R(.35, .6), z: cz + Math.sin(a) * .3, sx: .13, sy: .2, sz: .13 }); }
      continue;
    }
    if (t.type === 'cypress') {
      const H = R(7.5, 10) * s; cyp.push({ x: t.x, y: t.y, z: t.z, sx: .95 * s, sy: H, sz: .95 * s });
      const n = hi ? 16 : 7;
      for (let k = 0; k < n; k++) { const f = k / (n - 1), y = t.y + .8 + f * (H - 1.2), rr = .95 * s * Math.sin(Math.PI * (.12 + f * .82)) * .85; const a = R(0, 6.28); clumps.leaf.push({ x: t.x + Math.cos(a) * rr * .3, y, z: t.z + Math.sin(a) * rr * .3, s: rr * 2.2 + .4, ry: R(0, 6.28), c: tint('#6e8c5c') }); }
      continue;
    }
    if (t.type === 'topiary') { topi.push({ x: t.x, y: t.y + 1.05, z: t.z, s: 1.05 }); continue; }
    const r = TREE[t.type]; if (!r) continue;
    const H = r.H * s, cr = r.cr * s, cyy = t.y + H * r.cy;
    trunks[r.trunk].push({ x: t.x, y: t.y, z: t.z, ry: t.ry, sx: s * 1.15, sy: H * (r.tiers ? .95 : .8), sz: s * 1.15 });
    const n = Math.round(r.n * (hi ? 1 : .45));
    for (let k = 0; k < n; k++) {
      let x, y, z;
      if (r.tiers) { const tier = k % 4, rr = cr * (1 - tier * .2) * Math.sqrt(sr()), a = R(0, 6.28); x = t.x + Math.cos(a) * rr; z = t.z + Math.sin(a) * rr; y = t.y + H * (.35 + tier * .17) + R(-.2, .2); }
      else { const a = R(0, 6.28), u = R(-1, 1), rr = Math.sqrt(1 - u * u) * R(.45, 1); x = t.x + Math.cos(a) * rr * cr; z = t.z + Math.sin(a) * rr * cr; y = cyy + u * cr * .55; }
      clumps[r.leaf].push({ x, y, z, s: R(1.4, 2.1) * (r.tiers ? 1.25 : 1) * Math.min(1.3, s), ry: R(0, 6.28), c: tint(r.tint) });
    }
    if (r.fruit) for (let k = 0; k < r.fruit; k++) { const a = R(0, 6.28), u = R(-.6, .4); fruit.push({ x: t.x + Math.cos(a) * cr * .85, y: cyy + u * cr * .5, z: t.z + Math.sin(a) * cr * .85, s: R(.09, .13) }); }
    if (r.strands) for (let k = 0; k < r.strands * (hi ? 1 : .5); k++) { const a = R(0, 6.28), rr = cr * R(.55, 1.05); strands.push({ x: t.x + Math.cos(a) * rr, y: cyy + R(-.3, .8), z: t.z + Math.sin(a) * rr, ry: a + Math.PI / 2 + R(-.4, .4), sx: R(.9, 1.4), sy: R(2.2, 4.2), sz: 1 }); }
  }
  // cserjék, virágok
  for (const p of P.small) {
    if (p.type === 'rose') {
      clumps.leaf.push({ x: p.x, y: p.y + .45 * p.s, z: p.z, s: .95 * p.s, ry: p.ry, c: tint('#7fa868') });
      const col = pick(['red', 'pink', 'white', 'red']);
      for (let k = 0; k < (hi ? 3 : 1); k++) flowers[col].push({ x: p.x + R(-.3, .3), y: p.y + R(.15, .45), z: p.z + R(-.3, .3), s: R(.55, .75), ry: R(0, 6.28) });
    } else if (p.type === 'flower') flowers[pick(['red', 'yellow', 'white', 'purple', 'orange'])].push({ x: p.x, y: p.y, z: p.z, s: p.s * .8, ry: p.ry });
    else if (small[p.type]) small[p.type].push({ x: p.x, y: p.y, z: p.z, s: p.s, ry: p.ry });
  }
  for (const f of P.flowers) { const key = f.t === 'white' && sr() < .3 ? 'pink' : f.t; (flowers[key] || flowers.white).push({ x: f.x, y: f.y, z: f.z, s: f.s * .75, ry: f.ry }); }
  for (const g of P.grass) small.grass.push({ x: g.x, y: 0, z: g.z, s: g.s, ry: g.ry });
  for (const r of P.reeds) small.reed.push({ x: r.x, y: 0, z: r.z, s: r.s, ry: r.ry });
  for (const u of P.urns) small.urnPlant.push(u);

  // indák és bougainvillea a teraszok peremén, bokrok a virágládákban
  LV.forEach(({ h, r }, i) => {
    const low = i ? LV[i - 1].h : 0, gap = levelGaps(i, 2.2);
    along(sides(r, gap), .55 / Math.sqrt(D), (x, z, nx, nz) => {
      const L = R(1.4, Math.max(1.6, (h - low) - .6)), j = R(-.2, .2), px = x + (nz ? j : 0) + nx * .16, pz = z + (nx ? j : 0) + nz * .16;
      vines.push({ x: px, y: h + .7, z: pz, ry: Math.atan2(nx, nz) + R(-.3, .3), rz: R(-.06, .06), sx: R(1.1, 1.8), sy: L, sz: 1 });
      if (sr() < .38) for (let k = 0; k < 1 + Math.floor(R(0, 3)); k++) flowers.magenta.push({ x: px + nx * .1, y: h + .6 - R(.2, L * .7), z: pz + nz * .1, s: R(.6, .9), ry: Math.atan2(nx, nz) + R(-.6, .6), rx: R(2.6, 3.6) });
    });
    along(sides(r - .5, gap), 1.25 / Math.sqrt(D), (x, z) => clumps.leaf.push({ x: x + R(-.15, .15), y: h + .95, z: z + R(-.15, .15), s: R(.9, 1.3), ry: R(0, 6.28), c: tint('#8fb878') }));
  });
  // lugas: levéltető és lelógó lila fürtök
  for (const sx of [-1, 1]) for (let x = 7; x <= 46; x += 1.1) {
    for (const z of [-67.6, -66, -64.4]) clumps.leaf.push({ x: sx * x + R(-.3, .3), y: 3.55 + R(0, .3), z: z + R(-.3, .3), s: R(1.2, 1.7), ry: R(0, 6.28), c: tint('#88b070') });
    for (const z of [-68.1, -63.9]) if (sr() < .8 * Math.sqrt(D)) wisteria.push({ x: sx * x + R(-.4, .4), y: 3.3, z: z + R(-.25, .25), ry: R(0, 6.28), sx: R(.7, 1.1), sy: R(.9, 1.8), sz: 1 });
  }
  onStep && onStep();

  /* ---------- hálók ---------- */
  const add = o => root.add(o);
  const cl = clumpGeo();
  add(chunked(cl, M.leaf, clumps.leaf, { cast: hi, name: 'leaf' }));
  add(chunked(cl, M.leaf2, clumps.leaf2, { cast: hi, name: 'leaf2' }));
  const tg = [trunkGeo(3), trunkGeo(4, .15)];
  trunks.forEach((l, k) => l.length && add(chunked(tg[k], M.bark, l, { cast: true })));
  add(chunked(palmTrunkGeo(), M.palmBark, palmT, { cast: true }));
  add(chunked(palmCrownGeo(), M.frond, palmC, { cast: hi }));
  add(chunked(new THREE.SphereGeometry(1, 10, 8), M.fruit, fruit, { cull: 60 }));
  add(chunked(new THREE.SphereGeometry(1, 8, 6), M.date, dates, { cull: 70 }));
  add(chunked(strandGeo(), M.willow, strands, { cast: false }));
  { const core = new THREE.ConeGeometry(.5, 1, 10, 1); core.translate(0, .5, 0); const cm = new THREE.MeshStandardMaterial({ color: '#2e4226', roughness: 1 }); add(chunked(core, cm, cyp, { cast: true })); }
  add(chunked(new THREE.SphereGeometry(1, 20, 14), M.hedge, topi, { cast: true }));
  // sövények
  { const hs = P.hedges.map(hd => ({ x: hd.x, y: 0, z: hd.z, sx: hd.w, sy: hd.h, sz: hd.d })); const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, .5, 0); add(chunked(bg, M.hedge, hs.filter((_, i) => !P.hedges[i].bed), { cast: true }));
    const beds = hs.filter((_, i) => P.hedges[i].bed).map(b => ({ ...b, sy: .5, sx: b.sx - .3, sz: b.sz - .3 })); add(chunked(bg, M.soil, beds)); }
  // indák, akác-fürtök
  add(chunked(strandGeo(), M.vine, vines, { cast: hi }));
  { const wm = wind(new THREE.MeshStandardMaterial({ map: TEX.lavender, alphaTest: .45, side: THREE.DoubleSide, color: '#e6d2ff', roughness: .8 }), .06, true);
    const sg = strandGeo(); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); add(chunked(sg, wm, wisteria.map(w => ({ ...w, sx: w.sx * 1.3 })), { cull: 75 })); }
  // virágok, fű, levendula, nád
  const fg = crossGeo(.6, .9, 2);
  for (const k of FLOWER_KEYS) if (flowers[k].length) add(chunked(fg, M.flower[k], flowers[k], { cull: 55 }));
  if (small.grass.length) add(chunked(crossGeo(1.1, .55, 3), M.grassCard, small.grass, { cull: 45 }));
  add(chunked(crossGeo(.9, .75, 3), M.lavender, small.lavender, { cull: 60 }));
  add(chunked(crossGeo(1.1, 2.4, 3), M.reed, small.reed, { cull: 80 }));
  // tavirózsa
  add(chunked(lotusGeo(), M.lotusPad, P.lotus.map(l => ({ x: l.x, y: .14, z: l.z, s: l.s, ry: l.ry })), { cull: 90 }));
  // urnák és benne növény; padok
  add(chunked(urnGeo(), M.terracotta, P.urns.map(u => ({ x: u.x, y: u.y, z: u.z, s: 1.15 })), { cast: true }));
  { const bg = mergeGeometries([new THREE.BoxGeometry(2, .12, .55).translate(0, .48, 0), new THREE.BoxGeometry(.18, .44, .45).translate(-.75, .22, 0), new THREE.BoxGeometry(.18, .44, .45).translate(.75, .22, 0)]);
    add(chunked(bg, M.marble, P.benches.map(b => ({ x: b.x, y: b.y, z: b.z, ry: b.ry })), { cast: true })); }
  // páfrány, sóska, kalátea: erős gépen valódi modell, gyengén levélcsomó
  const modelPlants = (key, list, scaleK = 1) => {
    const vs = models[key];
    if (vs && vs.length) { const per = vs.map(() => []); list.forEach((p, i) => per[i % vs.length].push({ ...p, s: p.s * scaleK })); vs.forEach((v, i) => per[i].length && add(chunked(v.geo, v.mat, per[i], { cast: false, cull: 55 }))); }
    else list.forEach(p => clumps2.push({ x: p.x, y: p.y + .4 * p.s, z: p.z, s: .9 * p.s, ry: p.ry, c: tint(key === 'calathea' ? '#7fa060' : '#8cb070') }));
  };
  const clumps2 = [];
  modelPlants('fern', small.fern); modelPlants('sorrel', small.sorrel); modelPlants('calathea', small.calathea);
  modelPlants('sorrel', small.urnPlant.map(u => ({ x: u.x, y: u.y + .95, z: u.z, s: 1, ry: R(0, 6) })), 1);
  if (clumps2.length) add(chunked(cl, M.leaf2, clumps2, { cull: 55 }));
  add(chunked(fg, M.flower.pink, P.lotus.filter(l => l.bloom).map(l => ({ x: l.x, y: .1, z: l.z, s: .45, ry: R(0, 6) })), { cull: 60 }));
  onStep && onStep();
  return root;
}
