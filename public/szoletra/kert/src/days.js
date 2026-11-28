// Változatos napok: a mai nap eseménye a városban (kellékek, szereplők, mozgó menet) és az időjárás (eső, homokvihar).
// Csak a mai nap épül fel (lustán); a szókioldók és a beszélő szereplő csak az esemény óráiban élnek.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePerson } from './hero.js';
import { CITY_NPC, CITY_MAP } from './city.js';
import { DAYS, DAY_BY, DAY_WORDS, dayNum, dayTypeOf } from './daysdata.js';

const LOOK = {
  seller: { robe: '#3a6a5a', sash: '#e0b040', head: 'cap', hat: '#d8c49a', beard: '#3a2a1a', skin: '#c98e62' },
  wet: { robe: '#4a4a52', sash: '#6a5a4a', head: 'bare', hat: '#1a1410', beard: '#2a1d14', skin: '#b97f55' },
  bride: { robe: '#f4ecd8', sash: '#d8a93a', head: 'veil', hat: '#fff4dc', beard: null, skin: '#d9a07a' },
  groom: { robe: '#7a1f2a', sash: '#d8a93a', head: 'turban', hat: '#f2e6c8', beard: '#2a1d14', skin: '#b97f55' },
  father: { robe: '#e8dcc4', sash: '#2d5d96', head: 'turban', hat: '#2d5d96', beard: '#d8d0c0', skin: '#c98e62' },
  guard: { robe: '#5a4a3a', sash: '#8a2a2a', head: 'cap', hat: '#8a7a5a', beard: '#2a1d14', skin: '#b97f55' },
  porter: { robe: '#c8b48a', sash: '#6a4a2a', head: 'bare', hat: '#2a1d14', beard: '#2a1d14', skin: '#a8714a' },
  captain: { robe: '#2a4a6a', sash: '#e8dcc4', head: 'turban', hat: '#3a6a8a', beard: '#3a2a1a', skin: '#a8714a' },
  crier: { robe: '#1f3f8a', sash: '#e0b040', head: 'turban', hat: '#e8d8a8', beard: '#3a2a1a', skin: '#c98e62' },
  juggler: { robe: '#d8442a', sash: '#2a7a4a', head: 'cap', hat: '#f0c040', beard: null, skin: '#c98e62' },
  acrobat: { robe: '#7a2a8a', sash: '#f0c040', head: 'bare', hat: '#1a1410', beard: null, skin: '#b97f55' },
  farmer: { robe: '#8a7a4a', sash: '#c8a040', head: 'veil', hat: '#e8dcb8', beard: null, skin: '#b97f55' },
  nomad: { robe: '#d8c49a', sash: '#8a2a3a', head: 'turban', hat: '#f2ead8', beard: '#2a1d14', skin: '#a8714a' },
};
const LOOKS = Object.values(LOOK);
const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...o });
const R = (a, b) => a + Math.random() * (b - a);
const today = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return d; };
const dstr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const HUDAY = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function buildDays(M, q, deps) {
  const { TRIG, cityPeople, audio, pan, addPts, toast } = deps;
  const root = new THREE.Group(); root.name = 'days';
  const G = {};                    // nap -> felépített csoport
  let cur = null, on = false, learn = null;
  const devPick = new URLSearchParams(location.search).get('nap');
  let forced = DAY_BY[devPick] ? devPick : null;

  /* ---------- közös anyagok ---------- */
  const MT = {
    cloth: std('#d8c49a'), red: std('#8a2a3a'), blue: std('#2c4a7a'), green: std('#2f6a46'), rope: std('#6a5232'),
    straw: std('#d8bc6a'), wheat: std('#d9b456'), earth: std('#b89868', { roughness: 1 }), stone: std('#8a8070'),
    puddle: new THREE.MeshStandardMaterial({ color: '#3a4652', roughness: .03, metalness: .35, polygonOffset: true, polygonOffsetFactor: -2 }),
    ivory: std('#f2ead8', { roughness: .4 }), pearl: std('#fbf6ee', { roughness: .15, metalness: .25 }), sail: std('#e8dcc0', { side: THREE.DoubleSide }),
    vcol: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9 }), dbl: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, side: THREE.DoubleSide }),
  };
  const UMB = ['#c23a2a', '#2a5aa8', '#2f7a46', '#e0a020', '#8a3a8a', '#d86a2a'].map(c => std(c, { side: THREE.DoubleSide, roughness: .8 }));
  const umbGeo = (() => { const c = new THREE.ConeGeometry(.72, .3, 12, 1, true); c.translate(0, .15, 0); return c; })();
  const stickGeo = new THREE.CylinderGeometry(.015, .015, 1.1, 5); stickGeo.translate(0, -.55, 0);
  const flameT = tex(64, 128, g => { const gr = g.createRadialGradient(32, 96, 4, 32, 80, 60); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(.35, 'rgba(255,150,40,.9)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 80, 46, 124); g.lineTo(18, 124); g.quadraticCurveTo(2, 80, 32, 4); g.fill(); });

  /* ---------- egy nap felépítése ---------- */
  function build(id) {
    const D = { id, g: new THREE.Group(), people: [], trig: [], cols: [], rects: [], npcs: [], tick: null, bag: new Map(), sound: null };
    const add = (mat, g) => { const k = mat; (D.bag.get(k) || D.bag.set(k, []).get(k)).push(g.index ? g.toNonIndexed() : g); return g; };
    const box = (mat, x0, y0, z0, x1, y1, z1) => { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(mat, g); };
    const cyl = (mat, x, y0, z, r0, r1, h, seg = 12) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.translate(x, y0 + h / 2, z); return add(mat, g); };
    const col = (x, z, r) => D.cols.push([x, z, r]);
    const rcol = (x0, z0, x1, z1) => D.rects.push([x0, z0, x1, z1]);
    const trig = (w, x, z, r, y = 0) => { const t = { w, x, z, r, y, day: id }; D.trig.push(t); return t; };
    const person = (look, x, z, ry, y = 0, sc = 1, o = {}) => { const p = makePerson(look, sc); p.object.position.set(x, y, z); p.object.rotation.y = ry; D.g.add(p.object); const e = { p, x, z, y, ry, ...o }; D.people.push(e); return e; };
    const npc = (cid, look, x, z, ry, name, tx, tz, y = 0) => { const e = person(look, x, z, ry, y, 1.02); const n = { id: cid, x, z, ry, name, talkX: tx, talkZ: tz, person: e.p, hidden: true, day: id }; CITY_NPC.push(n); D.npcs.push(n); col(x, z, .4); e.chat = .15; return e; };
    const face = (x, z, cx, cz) => Math.atan2(cx - x, cz - z);
    const flame = (x, y, z, w, h) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.position.set(x, y, z); s.scale.set(w, h, 1); D.g.add(s); return s; };
    BUILD[id]({ D, add, box, cyl, col, rcol, trig, person, npc, face, flame });
    for (const [mat, gs] of D.bag) { const m = new THREE.Mesh(mergeGeometries(gs), mat); m.castShadow = mat !== MT.puddle; m.receiveShadow = true; D.g.add(m); }
    D.bag.clear(); D.g.visible = false; root.add(D.g);
    return G[id] = D;
  }
  // kis segéd: színes részekből egy háló (csúcsszínekkel), mint a városlakóknál
  function vmesh(parts, mat = MT.vcol) {
    const C = new THREE.Color(), gs = parts.map(([geo, c]) => { const g = geo.index ? geo.toNonIndexed() : geo; C.set(c); const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let k = 0; k < n; k++) a.set([C.r, C.g, C.b], k * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; });
    const m = new THREE.Mesh(mergeGeometries(gs), mat); m.castShadow = true; return m;
  }
  const G3 = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { geo.scale(sx, sy, sz); geo.rotateX(rx); geo.rotateY(ry); geo.rotateZ(rz); geo.translate(x, y, z); return geo; };
  function camel(kneel, saddle) {
    const g = new THREE.Group(), C = '#c49a62', Cd = '#a8804c', parts = [], h = kneel ? .62 : 1.55;
    parts.push([G3(new THREE.SphereGeometry(1, 16, 10), 0, h, 0, .5, .45, .95), C], [G3(new THREE.SphereGeometry(1, 14, 10), 0, h + .4, -.05, .36, .42, .45), C]);
    parts.push([G3(new THREE.CylinderGeometry(.03, .05, .6, 5), 0, h - .15, -1.05, 1, 1, 1, .5), Cd]);
    if (!kneel) for (const [x, z] of [[.24, .6], [-.24, .6], [.24, -.62], [-.24, -.62]]) { parts.push([G3(new THREE.CylinderGeometry(.07, .085, 1.25, 7), x, .62, z), C], [G3(new THREE.SphereGeometry(.1, 8, 6), x, .06, z + .04, 1, .5, 1.4), Cd]); }
    else for (const x of [.36, -.36]) parts.push([G3(new THREE.BoxGeometry(.16, .26, 1.6), x, .14, 0), Cd]);
    if (saddle) { parts.push([G3(new THREE.BoxGeometry(1.06, .55, .86), 0, h + .5, -.05), '#8a2a3a'], [G3(new THREE.BoxGeometry(1.1, .08, .9), 0, h + .78, -.05), '#d8a93a']); for (const z of [-.32, .22]) parts.push([G3(new THREE.CylinderGeometry(.035, .035, 1.0, 6), 0, h + .95, z, 1, 1, 1, 0, 0, Math.PI / 2), '#6a4a2a']); }
    for (const s of [-1, 1]) parts.push([G3(new THREE.BoxGeometry(.24, .5, .55), s * .58, h + .05, .1), saddle ? '#6a4a2a' : '#7a6a4a']);
    g.add(vmesh(parts));
    const nk = new THREE.Group(); nk.position.set(0, h + .1, .82); g.add(nk);
    nk.add(vmesh([[G3(new THREE.CylinderGeometry(.1, .15, 1.0, 8), 0, .42, .24, 1, 1, 1, .55), C], [G3(new THREE.SphereGeometry(1, 12, 8), 0, .86, .52, .13, .15, .3), C], [G3(new THREE.SphereGeometry(1, 8, 6), 0, .8, .78, .08, .08, .1), Cd],
      [G3(new THREE.ConeGeometry(.04, .1, 5), .08, 1.0, .42), Cd], [G3(new THREE.ConeGeometry(.04, .1, 5), -.08, 1.0, .42), Cd]]));
    return { g, nk };
  }
  function strip(x0, z0, x1, z1, h, sag, step, cols, D, holder) {     // zászlófüzér két pont között
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / step), ang = Math.atan2(x1 - x0, z1 - z0), pts = [];
    for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push(new THREE.Vector3(x0 + (x1 - x0) * u, h - sag * 4 * u * (1 - u), z0 + (z1 - z0) * u)); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#3a2a1a' })); D.g.add(line);
    for (let k = 1; k < n; k++) { const u = k / n; holder.push({ x: x0 + (x1 - x0) * u, y: h - sag * 4 * u * (1 - u), z: z0 + (z1 - z0) * u, ry: ang + Math.PI / 2, c: cols[holder.length % cols.length] }); }
  }

  /* ---------- a nyolc nap ---------- */
  const STALLS = [['fruit', -22, 158, 1], ['baker', -22, 166.5, 1], ['spice', -22, 175, 1], ['potter', -22, 183.5, 1], ['weaver', -22, 192, 1], ['fish', 22, 158, -1], ['flowers', 22, 166.5, -1], ['jewel', 22, 175, -1], ['veg', 22, 183.5, -1], ['carpet', 22, 192, -1]];
  const BUILD = {
    rain({ D, box, cyl, add, col, rcol, trig, person, npc }) {
      const sx = -19, sz = 153.2;
      npc('drain', LOOK.seller, sx, sz + .9, Math.PI, 'Nidintu, az ernyőárus', sx, sz - 1.4);
      // állvány: lécre akasztott, összecsukott ernyők, és nagy ernyő az árus fölött
      for (const x of [sx - 1.7, sx + 1.7]) cyl(M.wood, x, 0, sz + 2, .05, .05, 1.9, 6);
      add(M.wood, new THREE.CylinderGeometry(.04, .04, 3.6, 6).rotateZ(Math.PI / 2).translate(sx, 1.85, sz + 2));
      for (let k = 0; k < 6; k++) { const x = sx - 1.35 + k * .54; add(UMB[k], new THREE.ConeGeometry(.11, .8, 8).rotateX(Math.PI).translate(x, 1.3, sz + 2)); add(M.wood, new THREE.CylinderGeometry(.012, .012, .3, 4).translate(x, 1.78, sz + 2)); }
      cyl(M.wood, sx - .9, 0, sz + 1.6, .04, .04, 2.6, 6); add(UMB[0], new THREE.ConeGeometry(1.6, .5, 14, 1, true).translate(sx - .9, 2.75, sz + 1.6));
      // kirakott, kinyitott ernyők állványon
      for (const [k, x, z, tl] of [[1, sx + 2.4, sz + 1.2, .25], [3, sx + 3.3, sz + 1.9, -.2], [4, sx - 2.6, sz + 1.1, -.25]]) { const g = umbGeo.clone(); g.scale(.85, .85, .85); g.rotateZ(tl); g.translate(x, 1.55, z); add(UMB[k], g); add(M.wood, new THREE.CylinderGeometry(.015, .015, 1.6, 5).rotateZ(tl).translate(x - Math.sin(tl) * .1, .8, z)); cyl(M.wood, x, 0, z, .18, .14, .08, 8); }
      rcol(sx - 1.9, sz + 1.7, sx + 1.9, sz + 2.3); col(sx - .9, sz + 1.6, .2);
      const wet = person(LOOK.wet, sx + 2.6, sz - .5, -.6); wet.chat = 1.2; col(wet.x, wet.z, .35);
      for (const [x, z, a, b] of [[-6, 165, 1.6, 1], [7, 158.5, 1.2, .8], [9, 190, 1.5, .9], [-8, 193.5, 1.1, .7], [14.5, 170, 1.3, .9], [-3.5, 183.5, 1.2, .8], [2, 151.5, 1.8, 1.1], [-12, 176, 1, .7]]) {
        const g = new THREE.CircleGeometry(1, 20); const p = g.attributes.position; for (let k = 1; k < p.count; k++) { const s = .82 + .3 * Math.sin(k * 2.1 + x) * Math.cos(k * 1.3 + z); p.setX(k, p.getX(k) * s); p.setY(k, p.getY(k) * s); }
        g.rotateX(-Math.PI / 2); g.scale(a, 1, b); g.translate(x, .075, z); add(MT.puddle, g); trig('puddle', x, z, Math.max(a, b) + .9);
      }
      trig('umbrella', sx, sz + 1.2, 3); trig('soaked', wet.x, wet.z, 2.2); trig('thunder', 0, 175, 9);
    },
    caravan({ D, box, cyl, add, col, rcol, trig, person, npc, flame }) {
      for (const [x, z, ry, kn, sd] of [[-39.5, 159.8, .1, 0, 1], [-39.2, 165, -.15, 0, 0], [-38.4, 190, 1.4, 1, 1], [-34.8, 193.4, 2.0, 0, 0]]) {
        const c = camel(kn, sd); c.g.position.set(x, 0, z); c.g.rotation.y = ry; D.g.add(c.g); D.people.push({ camel: c, x, z, ph: R(0, 9) });
        col(x + Math.sin(ry) * .55, z + Math.cos(ry) * .55, .55); col(x - Math.sin(ry) * .55, z - Math.cos(ry) * .55, .55); trig('camel', x, z, 3.2);
      }
      for (const [x, z, c] of [[-35.6, 160.2, MT.red], [-35.6, 161.2, MT.cloth], [-35.6, 162.2, MT.blue], [-35.4, 161.7, MT.cloth]]) add(c, new THREE.CylinderGeometry(.42, .42, 1.1, 12).rotateZ(Math.PI / 2).translate(x, z === 161.7 ? 1.12 : .42, z));
      box(M.wood, -34.6, 0, 163.4, -33.6, .7, 164.2); box(M.gold, -34.62, .55, 163.38, -33.58, .62, 164.22); box(M.wood, -35.2, 0, 165, -34.2, .6, 165.9);
      for (const [z, c] of [[167, MT.red], [167.5, MT.blue]]) add(c, new THREE.CylinderGeometry(.16, .16, 1.6, 10).rotateZ(Math.PI / 2).translate(-35.2, .16, z));
      rcol(-36.1, 159.7, -33.5, 167.8);
      // tábortűz bográccsal
      const fx = -37.6, fz = 175.3;
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; add(MT.stone, new THREE.SphereGeometry(.13, 7, 5).translate(fx + Math.cos(a) * .5, .07, fz + Math.sin(a) * .5)); }
      for (const a of [.3, 1.9, 3.8]) add(M.wood, new THREE.CylinderGeometry(.05, .05, .7, 6).rotateZ(Math.PI / 2).rotateY(a).translate(fx, .1, fz));
      for (const a of [0, 2.1, 4.2]) add(M.wood, new THREE.CylinderGeometry(.025, .025, 1.5, 5).rotateX(.32).translate(0, .72, -.22).rotateY(a).translate(fx, 0, fz));
      add(M.bronze, new THREE.SphereGeometry(.22, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(fx, .72, fz));
      D.fire = flame(fx, .42, fz, .55, .85); col(fx, fz, .75);
      npc('dcaravan', LOOK.nomad, -35, 178.6, Math.PI / 2, 'Hanunu, a karavánvezető', -32.9, 178.6);
      // a vándor egy bálán ül; a tevehajcsár a tevéknél
      add(MT.cloth, new THREE.CylinderGeometry(.35, .35, 1, 12).rotateX(Math.PI / 2).translate(-37.75, .35, 184.6));
      const tr = person(LOOK.wet, -37.6, 184.6, Math.PI / 2, -.06); tr.sit = true; tr.chat = .3; col(-37.6, 184.6, .6);
      const dr = person(3, -37.6, 162.4, -Math.PI / 2 - .3); dr.chat = .4; col(-37.6, 162.4, .35);
      trig('caravan', -36.5, 171, 6); trig('saddle', -39.4, 160.9, 2.1); trig('traveller', -37.6, 184.6, 2.4);
    },
    wedding({ D, box, cyl, add, col, trig, person, npc, face }) {
      npc('dwedding', LOOK.father, -4, 162.2, Math.PI, 'Iddin-Marduk, a menyasszony apja', -4, 160.2);
      // virágfüzérek nyolc oszlop között a kút körül
      const posts = []; for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * Math.PI * 2, x = Math.cos(a) * 7.5, z = 175 + Math.sin(a) * 7.5; posts.push([x, z]); cyl(M.wood, x, 0, z, .07, .06, 2.5, 7); add(M.gold, new THREE.SphereGeometry(.1, 8, 6).translate(x, 2.55, z)); col(x, z, .2); }
      const fl = [], FC = ['#f4a6c0', '#ffffff', '#f0a030', '#e04a6a', '#fff0a0'];
      posts.forEach(([x0, z0], k) => { const [x1, z1] = posts[(k + 1) % 8]; for (let i = 1; i < 12; i++) { const u = i / 12; fl.push([x0 + (x1 - x0) * u, 2.4 - .55 * 4 * u * (1 - u), z0 + (z1 - z0) * u]); } });
      { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 7, 5), std('#ffffff', { roughness: .7 }), fl.length), m = new THREE.Matrix4(), c = new THREE.Color(); fl.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); im.setMatrixAt(i, m); im.setColorAt(i, c.set(FC[i % FC.length])); }); D.g.add(im); }
      // a menet: zenészek, a pár, vendégek; a kút körül kering
      const lyre = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 6, 16, Math.PI * 1.3), std('#8a5a2a')); lyre.rotation.z = -.6; lyre.position.set(.12, 1.25, .3);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .32, 14), std('#a8743a')); drum.position.set(0, 1.0, .32); drum.rotation.x = Math.PI / 2;
      const proc = [[4, 0, 0, 'drum'], [1, 1.4, 0, 'lyre'], [LOOK.bride, 3.1, -.45, 'bride'], [LOOK.groom, 3.1, .45, 'groom'], [0, 4.7, -.5], [3, 4.7, .5], [5, 6.2, -.45], [2, 6.2, .45]];
      D.proc = proc.map(([look, back, side, role]) => { const e = person(look, 0, 175, 0); e.back = back; e.side = side; e.role = role; if (role === 'drum') e.p.object.add(drum); if (role === 'lyre') e.p.object.add(lyre); return e; });
      D.pa = 0;
      D.bride = trig('bride', 0, 175, 2.3); D.groom = trig('groom', 0, 175, 2.3);
      [35, 45, 140, 150, 215].forEach((a, i) => { const r = a * Math.PI / 180, x = Math.cos(r) * 11.2, z = 175 + Math.sin(r) * 11.2, e = person([0, 2, 3, 5, 6][i], x, z, face(x, z, 0, 175)); e.chat = .5; col(x, z, .35); });
      trig('guest', 8.6, 182.2, 3); trig('guest', -9.2, 181.4, 3); trig('wedding', 0, 175, 10);
      // szirmok a pár fölött
      const N = 160, pos = new Float32Array(N * 3), cl = new Float32Array(N * 3), c = new THREE.Color(); D.pet = Array.from({ length: N }, (_, i) => { c.set(FC[i % 4]); cl.set([c.r, c.g, c.b], i * 3); return { x: 0, y: -9, z: 0, v: R(.4, .8), ph: R(0, 9) }; });
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(cl, 3));
      D.petals = new THREE.Points(pg, new THREE.PointsMaterial({ size: .09, vertexColors: true, transparent: true, depthWrite: false })); D.petals.frustumCulled = false; D.g.add(D.petals);
      D.sound = me => { const b = D.proc[2]; const d = Math.hypot(b.x - me.x, b.z - me.z); return { music: Math.max(0, 1 - d / 30), x: b.x, z: b.z }; };
    },
    dust({ D, box, cyl, add, col, rcol, trig, person, npc }) {
      const gd = npc('ddust', LOOK.guard, 16, 153.2, Math.PI, 'Kudur, az őr', 16, 151.1);
      { const sc = new THREE.Mesh(new THREE.CylinderGeometry(.215, .225, .17, 14, 1, true), std('#a83a2a', { side: THREE.DoubleSide })); sc.position.set(0, -.07, .015); gd.p.parts.head.add(sc);
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 2.6, 6), M.wood); sp.position.set(.42, 1.3, .1); gd.p.object.add(sp); const tip = new THREE.Mesh(new THREE.ConeGeometry(.05, .25, 6), M.bronze); tip.position.set(.42, 2.72, .1); gd.p.object.add(tip); }
      // söprögető asszony, homokkupacok
      const sw = person(2, -8, 167, .4); sw.sweep = true; col(-8, 167, .35);
      { const b = new THREE.Group(), st = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.3, 5), M.wood); st.position.y = -.5; b.add(st); const br = new THREE.Mesh(new THREE.ConeGeometry(.14, .35, 8), MT.straw); br.position.y = -1.15; br.rotation.x = Math.PI; b.add(br); b.position.set(0, -.5, .05); sw.p.parts.armR.add(b); }
      for (const [x, z, r] of [[-8.8, 166.1, .5], [-6.9, 167.9, .4], [-7.6, 168.9, .3], [-9.3, 168, .35]]) add(M.sand, new THREE.ConeGeometry(r, r * .55, 12).translate(x, r * .27, z));
      // csukott ablaktáblák a piac felőli ház homlokzatán
      const h = CITY_MAP.houses.find(([a, b, c, d]) => { const z1 = Math.max(b, d); return z1 > 144 && z1 < 149.4 && Math.min(a, c) < -22 && Math.max(a, c) > -19; }), zf = h ? Math.max(h[1], h[3]) : 147;
      box(M.wood, -21.6, 1.4, zf, -20.55, 2.7, zf + .07); for (let y = 1.55; y < 2.6; y += .22) box(M.dark, -21.55, y, zf + .07, -20.6, y + .05, zf + .09);
      { const g = new THREE.BoxGeometry(1.05, 1.3, .07); g.translate(.525, 0, 0); g.rotateY(-1.25); g.translate(-19.45, 2.05, zf + .04); add(M.wood, g); }
      const kp = person(4, -20.2, zf + .9, Math.PI); kp.chat = .6; col(-20.2, zf + .9, .35);
      // letakart standok
      for (const [, sx, sz, dir] of STALLS.filter(s => ['fruit', 'spice', 'flowers', 'veg', 'fish'].includes(s[0]))) { const tx = sx + .3 * dir; box(MT.cloth, tx - .62, .3, sz - 1.68, tx + .62, 1.28, sz + 1.68); }
      trig('scarf', 16, 153.2, 2.3); trig('dust', -7.6, 167.4, 3.2); trig('shutter', -20.6, zf + 1.4, 2.6); trig('sandstorm', 0, 175, 10);
      D.swirl = true;
    },
    ship({ D, box, cyl, add, col, rcol, trig, person, npc }) {
      const S = new THREE.Group(); S.position.set(-1, -.3, 235.8); S.rotation.y = Math.PI / 2; D.g.add(S); D.ship = S;
      const sp = [], sadd = (mat, g) => sp.push([mat, g.index ? g.toNonIndexed() : g]);
      const hull = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); hull.scale(1.95, 1.25, 7.6); hull.translate(0, 1.0, 0); sadd(M.wood, hull);
      sadd(M.wood, new THREE.BoxGeometry(3.4, .1, 13.2).translate(0, .92, 0));
      for (const s of [-1, 1]) { const p = new THREE.CylinderGeometry(.16, .24, 2.6, 8); p.rotateX(s * .5); p.translate(0, 1.9, s * 7.35); sadd(M.wood, p); }
      sadd(M.wood, new THREE.CylinderGeometry(.11, .15, 9.5, 8).translate(0, 5.6, -.6)); sadd(M.wood, new THREE.CylinderGeometry(.06, .06, 7.2, 6).rotateZ(Math.PI / 2).translate(0, 8.9, -.6));
      sadd(MT.sail, new THREE.CylinderGeometry(.24, .24, 6.6, 10).rotateZ(Math.PI / 2).translate(0, 8.62, -.6));
      for (let k = 0; k < 7; k++) sadd(M.terracotta, new THREE.CylinderGeometry(.16, .22, .62, 10).translate(-.9 + (k % 3) * .55, 1.28, 2.6 + Math.floor(k / 3) * .55));
      for (let k = 0; k < 4; k++) sadd(MT.cloth, new THREE.BoxGeometry(.55, .36, .4).translate(.5 + (k % 2) * .6, 1.15 + Math.floor(k / 2) * .36, -3.4));
      const byM = new Map(); for (const [m, g] of sp) (byM.get(m) || byM.set(m, []).get(m)).push(g);
      for (const [m, gs] of byM) { const mm = new THREE.Mesh(mergeGeometries(gs), m); mm.castShadow = true; S.add(mm); }
      { const L = new THREE.LineBasicMaterial({ color: '#3a2a1a' }); for (const z of [-7.2, 7]) S.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 10.2, -.6), new THREE.Vector3(0, 2.6, z)]), L)); }
      const sailor = makePerson(6); sailor.object.position.set(-.4, .97, 4.6); sailor.object.rotation.y = Math.PI; S.add(sailor.object); D.people.push({ p: sailor, x: -1, z: 235.8, chat: .3, onShip: true });
      // palló a rakpartról a fedélzetre
      { const L = Math.hypot(4.7, .2), g = new THREE.BoxGeometry(.75, .07, L); g.rotateX(-Math.atan2(.2, 4.7)); g.translate(-3, .62, 231.6); add(M.wood, g); for (const z of [229.4, 233.8]) cyl(M.wood, -3.4, -.6, z, .06, .06, 1.6, 6), cyl(M.wood, -2.6, -.6, z, .06, .06, 1.6, 6); }
      // rakomány a rakparton: zsákok, korsók, elefántcsont
      for (let k = 0; k < 9; k++) box(MT.cloth, 4.8 + (k % 3) * .66, .08 + Math.floor(k / 3) * .38, 226 + (k % 2) * .5, 5.4 + (k % 3) * .66, .44 + Math.floor(k / 3) * .38, 226.45 + (k % 2) * .5);
      for (let k = 0; k < 6; k++) cyl(M.terracotta, 4.9 + k * .55, .08, 227.6, .2, .16, .7, 10);
      box(MT.red, 6.1, .08, 227.75, 8.4, .1, 228.75);
      for (let k = 0; k < 4; k++) { const g = new THREE.TorusGeometry(.75, .055, 6, 14, 1.25); g.rotateX(-Math.PI / 2); g.translate(6.0 + k * .5, .16, 228.62); add(MT.ivory, g); }
      rcol(4.6, 225.7, 8.6, 228.8);
      // a kapitány, előtte hordó a gyöngyös ládikával
      npc('dship', LOOK.captain, -6.6, 227.6, Math.PI, 'Lu-Enlil, a dilmuni kapitány', -6.6, 225.5);
      cyl(M.wood, -5.2, .08, 227.7, .32, .3, .8, 12); box(M.wood, -5.45, .88, 227.5, -4.95, 1.05, 227.9); for (let k = 0; k < 7; k++) add(MT.pearl, new THREE.SphereGeometry(.04, 8, 6).translate(-5.38 + (k % 4) * .1, 1.08, 227.62 + Math.floor(k / 4) * .12)); col(-5.2, 227.7, .4);
      // hordárok: a fedélzetről a rakpartra hordják a zsákokat
      const PATH = [[-3, .7, 234.4], [-3, .7, 233.8], [-3, .56, 229.5], [-3, .08, 228.7], [-1.6, .08, 227.3], [4.4, .08, 226.9]];
      const Ls = []; let tot = 0; for (let k = 1; k < PATH.length; k++) { const a = PATH[k - 1], b = PATH[k], l = Math.hypot(b[0] - a[0], b[2] - a[2]); Ls.push(l); tot += l; }
      D.porterPath = { PATH, Ls, tot };
      D.porters = [0, .36, .7].map((u, i) => { const e = person(LOOK.porter, -3, 229, 0); e.u = u * 2; e.wait = 0; const sk = new THREE.Mesh(new THREE.BoxGeometry(.5, .32, .38), MT.cloth); sk.position.set(.1, 1.72, -.05); sk.rotation.z = .2; e.p.object.add(sk); e.sack = sk; return e; });
      D.porterT = trig('porter', -3, 229, 2.3); trig('gangplank', -3, 229.9, 2.1); trig('pearl', -5.2, 227.3, 1.8); trig('ivory', 7.6, 228.1, 2.1);
    },
    herald({ D, box, cyl, add, col, rcol, trig, person, npc, face }) {
      const y = .7;
      box(M.column, -43.8, 0, 183.4, -40.4, y, 188.6); box(M.column, -40.4, 0, 185.2, -39.7, y / 2, 186.8); rcol(-43.9, 183.3, -39.6, 188.7);
      npc('dherald', LOOK.crier, -42.1, 186, Math.PI / 2, 'Ubar, a város kikiáltója', -38.8, 186, y);
      const tp = person(4, -42.6, 184.3, Math.PI / 2 + .3, y); D.trumpeter = tp;
      { const tr = new THREE.Mesh(new THREE.ConeGeometry(.12, 1.1, 10, 1, true), std('#c8a040', { metalness: .8, roughness: .3, side: THREE.DoubleSide })); tr.rotation.x = Math.PI / 2 - .5; tr.position.set(0, 1.95, .7); tr.visible = false; tp.p.object.add(tr); D.trumpet = tr; }
      // zászlók és a rendelet kőtáblája
      const ban = new THREE.MeshStandardMaterial({ map: tex(128, 224, (g, w, h) => { g.fillStyle = '#1f3f8a'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0b040'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 26, w, 8); g.translate(w / 2, 92); for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, -4); g.lineTo(8, -40); g.lineTo(-8, -40); g.fill(); } g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); }), side: THREE.DoubleSide, roughness: .8 });
      for (const z of [183.7, 188.3]) { cyl(M.wood, -43.6, y, z, .05, .05, 3.6, 6); add(ban, new THREE.PlaneGeometry(.9, 1.6).rotateY(Math.PI / 2).translate(-43.52, y + 2.6, z + (z < 186 ? .52 : -.52))); }
      const ct = tex(128, 192, (g, w, h) => { g.fillStyle = '#b88a5a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,40,15,.8)'; g.lineWidth = 3; for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) { const x = 12 + k * 16, yy = 20 + r * 19; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 6, yy + 4); g.lineTo(x, yy + 8); g.stroke(); } });
      { const m = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.3, .7), [std('#b88a5a'), std('#b88a5a'), std('#b88a5a'), std('#b88a5a'), new THREE.MeshStandardMaterial({ map: ct, roughness: .9 }), std('#b88a5a')]); m.geometry.rotateY(Math.PI / 2); m.position.set(-43.3, y + .65, 187.6); m.rotation.y = -Math.PI / 2 + .25; m.castShadow = true; D.g.add(m); }
      // a tömeg félkörben, középen rés a hallgatónak
      for (const [a, r] of [[-78, 4.9], [-60, 4.8], [-42, 4.8], [-26, 5], [26, 5], [42, 4.8], [60, 4.8], [78, 4.9], [-50, 6.3], [50, 6.3], [-33, 6.4], [33, 6.4]]) {
        const ra = a * Math.PI / 180, x = -41.6 + Math.cos(ra) * r, z = 186 + Math.sin(ra) * r, e = person(((a + 90) / 6 | 0) % 7, x, z, face(x, z, -42, 186), 0, R(.92, 1.04)); e.chat = .25; e.listen = true; col(x, z, .35);
      }
      trig('crier', -41.6, 186, 2.6, y); trig('trumpet', -42.6, 184.3, 2.1, y); trig('crowd', -37.2, 186, 5); trig('decree', -43.1, 187.6, 2.1, y);
      D.hornT = 6;
    },
    fair({ D, box, cyl, add, col, trig, person, npc, face }) {
      const jx = 37.2, jz = 183.5;
      D.jug = npc('dfair', LOOK.juggler, jx, jz, -Math.PI / 2, 'Pirig, a zsonglőr', 35.1, jz); D.jug.jug = true;
      D.balls = ['#e83a2a', '#2a8ae8', '#f0c020'].map(c => { const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), std(c, { roughness: .4 })); D.g.add(b); return b; });
      // akrobata: cigánykerék a kifeszített kötél mentén
      const wrap = new THREE.Group(); D.g.add(wrap); const ac = makePerson(LOOK.acrobat); ac.object.position.y = -1; wrap.add(ac.object); ac.object.rotation.y = -Math.PI / 2;
      D.acro = { wrap, p: ac, z: 180, dir: 1, ang: 0, wait: 0 }; D.acroT = trig('acrobat', 40.2, 183.5, 2.4);
      for (const a of [55, 85, 115, 140, 220, 245, 275, 305]) { const r = a * Math.PI / 180, x = jx + Math.cos(r) * 3, z = jz + Math.sin(r) * 3, e = person((a / 30 | 0) % 7, x, z, face(x, z, jx + 1, jz), 0, a === 115 || a === 245 ? .74 : R(.94, 1.03)); e.chat = .2; e.fan = true; col(x, z, .35); }
      // zászlófüzérek a piac fölött
      const fl = [], FC = ['#c23a2a', '#2a5aa8', '#f0c020', '#2f7a46', '#ffffff', '#d86a2a'];
      strip(-31.6, 156.4, 31.6, 156.4, 4.7, 1.1, .7, FC, D, fl); strip(-31.6, 193.6, 31.6, 193.6, 4.7, 1.1, .7, FC, D, fl); strip(31.6, 156.4, 31.6, 193.6, 4.7, .9, .7, FC, D, fl); strip(-31.6, 156.4, -31.6, 193.6, 4.7, .9, .7, FC, D, fl);
      { const sh = new THREE.Shape(); sh.moveTo(-.17, 0); sh.lineTo(.17, 0); sh.lineTo(0, -.4); sh.closePath(); const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(sh), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .8 }), fl.length), m = new THREE.Matrix4(), qq = new THREE.Quaternion(), c = new THREE.Color();
        fl.forEach((f, i) => { qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.ry); m.compose(new THREE.Vector3(f.x, f.y, f.z), qq, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, m); im.setColorAt(i, c.set(f.c)); }); D.g.add(im); D.flags = { im, fl }; }
      trig('juggler', jx, jz, 2.4); trig('applause', 36.4, 180.4, 2.6); for (const [x, z] of [[0, 156.4], [31.6, 175], [0, 193.6], [-31.6, 175]]) trig('bunting', x, z, 4);
      D.clapT = 8;
    },
    harvest({ D, box, cyl, add, col, rcol, trig, person, npc }) {
      // a búzamező: elöl már learatva (tarló)
      const stalk = mergeGeometries([new THREE.CylinderGeometry(.008, .012, .95, 3).translate(0, .475, 0), new THREE.CylinderGeometry(.018, .025, .14, 5).translate(0, 1.0, 0)].map(g => g.toNonIndexed()));
      const pts = []; for (let x = 36.5; x < 42.2; x += .17) for (let z = 165.5; z < 176; z += .17) pts.push([x + R(-.07, .07), z + R(-.07, .07), x < 37.9]);
      const n = q.dens > .5 ? pts.length : Math.floor(pts.length / 2), im = new THREE.InstancedMesh(stalk, MT.wheat, n), m = new THREE.Matrix4(), qq = new THREE.Quaternion(), e3 = new THREE.Euler();
      for (let i = 0; i < n; i++) { const [x, z, cut] = pts[q.dens > .5 ? i : i * 2]; e3.set(R(-.12, .12), R(0, 6), R(-.12, .12)); qq.setFromEuler(e3); m.compose(new THREE.Vector3(x, 0, z), qq, new THREE.Vector3(1, cut ? .16 : R(.85, 1.1), 1)); im.setMatrixAt(i, m); }
      im.receiveShadow = true; D.g.add(im); box(MT.earth, 36.3, 0, 165.3, 42.4, .07, 176.2); rcol(36.3, 165.3, 42.4, 176.2);
      // aratók sarlóval
      const sick = () => { const g = new THREE.Group(), h = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .25, 5), M.wood); h.position.y = -.6; g.add(h); const b = new THREE.Mesh(new THREE.TorusGeometry(.17, .016, 4, 12, Math.PI * 1.25), std('#9aa0a6', { metalness: .8, roughness: .35 })); b.position.set(0, -.78, .1); b.rotation.y = Math.PI / 2; g.add(b); return g; };
      for (const [x, z] of [[37.4, 167.6], [37.5, 172.6]]) { const e = person([0, 4][z > 170 ? 1 : 0], x, z, Math.PI / 2); e.reap = R(0, 6); e.p.parts.armR.add(sick()); col(x, z, .35); }
      // kévék kúpokban
      for (const [x, z] of [[34.4, 177.2], [35.3, 177.4], [34.5, 178.6], [35.4, 178.8], [34.6, 180], [35.5, 180.1]]) { for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(.13, .2, .9, 8); g.rotateZ(s * .22); g.translate(x + s * .13, .45, z); add(MT.straw, g); } add(MT.rope, new THREE.TorusGeometry(.17, .025, 5, 12).rotateX(Math.PI / 2).translate(x, .62, z)); }
      rcol(34.1, 176.8, 35.8, 180.5);
      // szérű: kitaposott föld, szalma, szóró munkás
      { const g = new THREE.CircleGeometry(2.8, 28); g.rotateX(-Math.PI / 2); g.translate(38.2, .07, 187.6); add(MT.earth, g); const s = new THREE.CircleGeometry(1.9, 22, 0, 4.4); s.rotateX(-Math.PI / 2); s.translate(38.4, .085, 187.4); add(MT.straw, s); }
      const th = person(6, 39.2, 188.6, -2.4); th.toss = true; { const f = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.6, 5), M.wood); f.position.set(0, -.75, .25); f.rotation.x = .4; th.p.parts.armR.add(f); } col(39.2, 188.6, .35);
      { const N = 70, pos = new Float32Array(N * 3); D.chaff = Array.from({ length: N }, () => ({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, l: 0 })); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); D.chaffP = new THREE.Points(g, new THREE.PointsMaterial({ color: '#e8d08a', size: .05, transparent: true, opacity: .85, depthWrite: false })); D.chaffP.frustumCulled = false; D.g.add(D.chaffP); D.thr = th; }
      for (let k = 0; k < 4; k++) cyl(M.terracotta, 36.4 + k * .55, .08, 190.8, .24, .2, .8, 10); box(MT.cloth, 38.8, .08, 190.4, 39.5, .5, 191); cyl(MT.wheat, 39.15, .5, 190.7, .3, .3, .05, 10); rcol(36.1, 190.4, 39.6, 191.2);
      // gazdasszony és egy kévehordó
      npc('dharvest', LOOK.farmer, 34.1, 183, -Math.PI / 2, 'Bau-asha, a földműves asszony', 32, 183); cyl(MT.straw, 34.7, 0, 182.4, .3, .36, .45, 12);
      const cr = person(5, 35.6, 171, 0); cr.carry = { a: [35.6, 168.8], b: [35.6, 176.2], u: 0 }; const sh = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, .9, 8), MT.straw); sh.rotation.z = 1.2; sh.position.set(.25, 1.75, 0); cr.p.object.add(sh); cr.sheaf = sh;
      trig('wheat', 39.3, 170.8, 4.2); trig('sickle', 37.4, 170.1, 2.8); trig('sheaf', 34.9, 178.6, 2.3); trig('grain', 38.2, 187.6, 3);
    },
  };

  /* ---------- esernyők a járókelőknél (esős napon) ---------- */
  let umbs = null;
  function umbrellas(v) {
    if (!umbs && v) { umbs = []; let k = 0; for (const w of cityPeople) { if (!(w.walker !== undefined || w.shop) || k >= 18) continue; const g = new THREE.Group(); const c = new THREE.Mesh(umbGeo, UMB[k % UMB.length]); c.castShadow = false; g.add(c); g.add(new THREE.Mesh(stickGeo, M.wood)); g.position.set(.18, 2.15, .08); w.p.object.add(g); umbs.push(g); k++; } }
    if (umbs) for (const u of umbs) u.visible = v;
  }

  /* ---------- időjárás: felhős/poros égbolt, eső, por, villám ---------- */
  const W = { kind: null, k: 0, flash: 0, nextF: 12 };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1700, 24, 12), new THREE.MeshBasicMaterial({ color: '#9aa3ad', transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.renderOrder = -.5; dome.visible = false; root.add(dome);
  const NR = q.dens > .5 ? 3400 : 1300, rpos = new Float32Array(NR * 6), rdat = Array.from({ length: NR }, () => [R(-30, 30), R(0, 24), R(-30, 30), R(.85, 1.15)]);
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
  const rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: '#b4c2d2', transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; rain.visible = false; rain.renderOrder = 2; root.add(rain);
  const ND = q.dens > .5 ? 2400 : 1000, dpos = new Float32Array(ND * 3), ddat = Array.from({ length: ND }, () => [R(-28, 28), R(0, 14), R(-28, 28), R(0, 9)]);
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ color: '#e0b884', size: .16, transparent: true, opacity: 0, depthWrite: false })); dust.frustumCulled = false; dust.visible = false; root.add(dust);
  // porfelhők: nagy, halvány foltok, amik a széllel sodródnak
  const puffT = tex(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(225,185,130,.9)'); gr.addColorStop(.5, 'rgba(215,170,115,.4)'); gr.addColorStop(1, 'rgba(210,165,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
  const puffs = Array.from({ length: q.dens > .5 ? 26 : 12 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffT, transparent: true, opacity: 0, depthWrite: false })); s.userData = { x: R(-40, 40), z: R(-40, 40), y: R(1, 7), sc: R(9, 18), ph: R(0, 9) }; s.visible = false; root.add(s); return s; });
  const wrap = (v, c, h) => c - h + ((((v - c + h) % (2 * h)) + 2 * h) % (2 * h));
  const FLASH_C = new THREE.Color('#e8eeff'), DOME_C = { rain: [new THREE.Color('#98a2ac'), new THREE.Color('#0b0f16')], dust: [new THREE.Color('#c8925a'), new THREE.Color('#1c140c')] }, dc = new THREE.Color();

  function weatherTick(t, dt, cam, dayF, indoor) {
    const want = cur ? DAY_BY[cur].weather || null : null;
    if (W.kind !== want) { W.k = Math.max(0, W.k - dt * .35); if (W.k === 0) W.kind = want; } else if (W.kind) W.k = Math.min(1, W.k + dt * .25);
    const k = W.k, rainOn = W.kind === 'rain' && k > 0, dustOn = W.kind === 'dust' && k > 0;
    dome.visible = k > 0; if (dome.visible) { const [a, b] = DOME_C[W.kind]; dc.copy(a).lerp(b, 1 - dayF); dc.lerp(FLASH_C, W.flash * .6); dome.material.color.copy(dc); dome.material.opacity = k * (W.kind === 'rain' ? .9 : .8); dome.position.copy(cam.position); }
    umbrellas(rainOn && k > .3);
    rain.visible = rainOn && !indoor;
    if (rain.visible) {
      rain.material.opacity = .55 * k; const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z, n = Math.floor(NR * k);
      for (let i = 0; i < n; i++) { const d = rdat[i], y = cy - 8 + ((((d[1] - t * 15 * d[3]) % 24) + 24) % 24), x = wrap(d[0] + t * 1.2, cx, 30), z = wrap(d[2], cz, 30), o = i * 6; rpos[o] = x; rpos[o + 1] = y; rpos[o + 2] = z; rpos[o + 3] = x - .03; rpos[o + 4] = y - .8; rpos[o + 5] = z; }
      rgeo.setDrawRange(0, n * 2); rgeo.attributes.position.needsUpdate = true;
      // villám és mennydörgés
      if (k > .8 && (W.nextF -= dt) < 0) { W.nextF = R(14, 38); W.flash = 1; W.f2 = R(.12, .22); const dist = R(.25, 1); setTimeout(() => audio && audio.thunder(1.1 - dist * .7), 600 + dist * 2600); }
    }
    if (W.flash > 0) { W.flash = Math.max(0, W.flash - dt * 3.2); if (W.f2 && W.flash < .4) { W.flash = .85; W.f2 = 0; } }
    dust.visible = dustOn && !indoor;
    if (dust.visible) {
      dust.material.opacity = .55 * k; const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      for (let i = 0; i < ND; i++) { const d = ddat[i], o = i * 3; dpos[o] = wrap(d[0] + t * 9 + Math.sin(t * 1.3 + d[3]) * 1.5, cx, 28); dpos[o + 1] = cy - 5 + d[1] + Math.sin(t * 2 + d[3] * 3) * .6; dpos[o + 2] = wrap(d[2] + t * 3.5, cz, 28); }
      dgeo.attributes.position.needsUpdate = true;
    }
    for (const s of puffs) { s.visible = dust.visible; if (!s.visible) continue; const u = s.userData; s.position.set(wrap(u.x + t * 7, cam.position.x, 40), u.y + Math.sin(t * .4 + u.ph), wrap(u.z + t * 2.6, cam.position.z, 40)); s.scale.setScalar(u.sc); s.material.opacity = .22 * k * (.7 + .3 * Math.sin(t * .5 + u.ph)); }
  }

  /* ---------- a mai nap eseményének mozgása ---------- */
  const tmpV = new THREE.Vector3();
  function eventTick(D, t, dt, me) {
    const nearAny = Math.hypot(me.x, me.z - 185) < 110 && me.z > 100;
    if (!nearAny) return;
    for (const e of D.people) {
      if (e.camel) { e.camel.nk.rotation.x = Math.sin(t * .5 + e.ph) * .1 + (Math.sin(t * .13 + e.ph) > .7 ? .45 : 0); continue; }
      if (e.onShip || e.jug || e.back !== undefined || e.u !== undefined || e.carry) continue;
      if (Math.hypot(e.x - me.x, e.z - me.z) > 70) continue;
      if (e.chat && Math.random() < dt * e.chat) e.p.talk(R(1, 2.6));
      if (e.sweep) e.p.arm = -.35 + Math.sin(t * 3.2) * .35;
      if (e.reap !== undefined) e.p.arm = -1.3 + Math.sin(t * 2.6 + e.reap) * .7;
      if (e.toss) e.p.arm = -.9 + Math.sin(t * 1.6) * .6;
      e.p.update(dt, 0);
      if (e.sit) { e.p.parts.legL.rotation.x = e.p.parts.legR.rotation.x = -1.45; }
    }
    if (D.fire) { const s = 1 + Math.sin(t * 13) * .09 + Math.sin(t * 7.1) * .07; D.fire.scale.set(.55 * s, .85 * (2 - s), 1); }
    // esküvői menet a kút körül
    if (D.proc) {
      D.pa += dt * .06; const R0 = 9.2;
      for (const e of D.proc) {
        const a = D.pa - e.back / R0, r = R0 + e.side, x = Math.cos(a) * r, z = 175 + Math.sin(a) * r; e.x = x; e.z = z;
        e.p.object.position.set(x, .05, z); e.p.object.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
        if (e.role === 'drum') e.p.arm = -1.1 + Math.abs(Math.sin(t * 5.5)) * -.5;
        if (e.role === 'lyre') e.p.arm = -.9 + Math.sin(t * 9) * .12;
        e.p.update(dt, .6);
      }
      const b = D.proc[2], g = D.proc[3]; D.bride.x = b.x; D.bride.z = b.z; D.groom.x = g.x; D.groom.z = g.z;
      const pp = D.petals.geometry.attributes.position;
      D.pet.forEach((p, i) => { if (p.y < 0) { p.x = (b.x + g.x) / 2 + R(-1.3, 1.3); p.z = (b.z + g.z) / 2 + R(-1.3, 1.3); p.y = R(2.6, 3.8); } p.y -= p.v * dt; p.x += Math.sin(t * 2 + p.ph) * dt * .4; p.z += Math.cos(t * 1.7 + p.ph) * dt * .4; pp.setXYZ(i, p.x, p.y, p.z); });
      pp.needsUpdate = true;
    }
    // hordárok
    if (D.porters) {
      const { PATH, Ls, tot } = D.porterPath;
      for (const e of D.porters) {
        if (e.wait > 0) { e.wait -= dt; e.p.update(dt, 0); continue; }
        const prev = e.u; e.u = (e.u + dt * 1.05 / tot) % 2; if ((prev < 1) !== (e.u < 1)) e.wait = R(1, 2.2);
        const fwd = e.u < 1, s = (fwd ? e.u : 2 - e.u) * tot; let k = 0, acc = 0; while (k < Ls.length - 1 && acc + Ls[k] < s) { acc += Ls[k]; k++; }
        const f = Math.min(1, (s - acc) / Ls[k]), a = PATH[k], bb = PATH[k + 1], x = a[0] + (bb[0] - a[0]) * f, y = a[1] + (bb[1] - a[1]) * f, z = a[2] + (bb[2] - a[2]) * f;
        e.x = x; e.z = z; e.p.object.position.set(x, y, z); e.p.object.rotation.y = Math.atan2((bb[0] - a[0]) * (fwd ? 1 : -1), (bb[2] - a[2]) * (fwd ? 1 : -1)); e.sack.visible = fwd; e.p.arm = fwd ? -2.6 : null; e.p.update(dt, 1.05);
      }
      D.porterT.x = D.porters[0].x; D.porterT.z = D.porters[0].z;
      D.ship.position.y = -.3 + Math.sin(t * .9) * .05; D.ship.rotation.z = Math.sin(t * .7) * .012;
      for (const e of D.people) if (e.onShip) { if (Math.random() < dt * .3) e.p.talk(2); e.p.update(dt, 0); }
    }
    // kikiáltó: kürtszó, utána beszéd; a tömeg figyel
    if (D.trumpet) {
      D.hornT -= dt; const tp = D.trumpeter;
      if (D.hornT < 0) { D.hornT = R(26, 40); D.blow = 2.2; const d = Math.hypot(tp.x - me.x, tp.z - me.z); if (d < 55) audio && audio.horn(Math.pow(1 - d / 55, 1.3), pan(tp.x, tp.z)); setTimeout(() => { const n = D.npcs[0]; n && n.person.talk(5); }, 2300); }
      if (D.blow > 0) D.blow -= dt; D.trumpet.visible = D.blow > 0; tp.p.arm = D.blow > 0 ? -1.4 : null;
    }
    // zsonglőr, akrobata, taps
    if (D.balls) {
      const j = D.jug, ry = j.ry, fx = Math.sin(ry), fz = Math.cos(ry), rx = Math.cos(ry), rz = -Math.sin(ry);
      D.balls.forEach((b, i) => { const ph = t * 1.45 + i / 3, c = Math.floor(ph), s = ph - c, from = c % 2 ? .24 : -.24, lx = from + (-2 * from) * s, ly = 1.28 + 4.4 * s * (1 - s); b.position.set(j.x + rx * lx + fx * .38, ly, j.z + rz * lx + fz * .38); });
      j.p.arm = -1.05 + Math.sin(t * 9.1) * .22; j.p.update(dt, 0); j.p.parts.armL.rotation.x = -1.05 + Math.sin(t * 9.1 + Math.PI) * .22;
      const A = D.acro; if (A.wait > 0) { A.wait -= dt; A.ang = 0; } else { A.z += A.dir * dt * 1.6; A.ang += A.dir * dt * 1.6 / .95; if (A.z > 187.2 || A.z < 179.8) { A.dir *= -1; A.wait = R(1.2, 2.5); A.z = Math.max(179.8, Math.min(187.2, A.z)); } }
      A.wrap.position.set(40.2, 1.0, A.z); A.wrap.rotation.x = A.ang; A.p.update(dt, 0); A.p.parts.armL.rotation.x = A.p.parts.armR.rotation.x = A.wait > 0 ? -2.9 : -3.0; A.p.parts.legL.rotation.z = .35; A.p.parts.legR.rotation.z = -.35;
      D.acroT.z = A.z;
      if ((D.clapT -= dt) < 0) { D.clapT = R(10, 16); for (const e of D.people) if (e.fan) e.p.talk(R(1.5, 2.5)); const d = Math.hypot(j.x - me.x, j.z - me.z); if (d < 40) audio && audio.clap(Math.pow(1 - d / 40, 1.4), pan(j.x, j.z)); }
    }
    // kévehordó és a szérű pelyvája
    for (const e of D.people) if (e.carry) {
      const c = e.carry; c.u = (c.u + dt * .9 / 7.4) % 2; const fwd = c.u < 1, s = fwd ? c.u : 2 - c.u, x = c.a[0] + (c.b[0] - c.a[0]) * s, z = c.a[1] + (c.b[1] - c.a[1]) * s;
      e.x = x; e.z = z; e.p.object.position.set(x, 0, z); e.p.object.rotation.y = fwd ? 0 : Math.PI; e.sheaf.visible = fwd; e.p.arm = fwd ? -2.5 : null; e.p.update(dt, .9);
    }
    if (D.chaff) {
      const th = D.thr, pp = D.chaffP.geometry.attributes.position, burst = Math.sin(t * 1.6) > .9;
      D.chaff.forEach((p, i) => { if (p.l <= 0 && burst && Math.random() < .3) { p.x = th.x + Math.sin(th.ry) * .9; p.z = th.z + Math.cos(th.ry) * .9; p.y = 1.6; p.vx = R(-.6, .6) + .8; p.vy = R(.8, 2); p.vz = R(-.6, .6); p.l = R(1.2, 2.2); } if (p.l > 0) { p.l -= dt; p.vy -= 2.2 * dt; p.x += p.vx * dt; p.y = Math.max(.1, p.y + p.vy * dt); p.z += p.vz * dt; } pp.setXYZ(i, p.x, p.l > 0 ? p.y : -9, p.z); });
      pp.needsUpdate = true;
    }
  }

  /* ---------- a nap feladata (a 4 szó + egy beszélgetés), a kert-beszelgetes mentésben ---------- */
  const qEl = document.getElementById('dayq');
  function Q() {
    if (!learn) return null; const CD = learn.cd(), d = dstr(today());
    const N = CD._napok ||= { hist: {} }; N.hist ||= {};
    if (N.d !== d || N.type !== cur) Object.assign(N, { d, type: cur, seen: [], talk: false, done: false });
    return N;
  }
  const save = () => learn && learn.saveCD();
  function checkDone() {
    const N = Q(), Dd = DAY_BY[cur]; if (!N || N.done || N.seen.length < Dd.words.length || !N.talk) return;
    N.done = true; N.hist[cur] = (N.hist[cur] || 0) + 1; save(); qDone = performance.now();
    setTimeout(() => addPts(20, `${Dd.icon} A nap feladata kész`, `+20 pont · ${Dd.name}`), 2800);   // a szó-felfedezés felirata után
    if (!N.all && DAYS.every(x => N.hist[x.id])) { N.all = true; save(); setTimeout(() => addPts(40, '🗓 Mind a nyolc babiloni nap', '+40 pont · minden napot átéltél'), 5800); }
    render();
  }
  let qDone = 0, qMin = localStorage.getItem('kert-napq-min') === '1';
  function render() {
    if (!qEl) return; const N = Q(), Dd = DAY_BY[cur]; if (!N || !Dd) { qEl.classList.remove('on'); return; }
    const showDone = N.done && performance.now() - qDone < 9000;
    if (N.done && !showDone) { qEl.classList.remove('on'); return; }
    const hrs = Dd.hours || [6, 23.5];
    qEl.innerHTML = `<b data-dq="min">${Dd.icon} ${esc(Dd.name)} <small>· a nap feladata ${qMin ? '▸' : '▾'}</small></b>` + (qMin ? '' : (N.done ? `<div class="dd">✓ Kész! +20 pont</div>` :
      `<div class="dw">${Dd.words.map(w => N.seen.includes(w) ? `<span class="ok">✓ ${esc(DAY_WORDS[w][0])}</span>` : `<span>${esc(DAY_WORDS[w][1].split(',')[0].split(' (')[0])}</span>`).join('')}</div>
      <div class="dt">${N.talk ? '✓' : '💬'} ${esc(Dd.who)}</div>${on ? '' : `<div class="dt" style="color:#ffb07a">Az esemény ${String(hrs[0]).replace('.5', ':30')}${String(hrs[0]).includes('.') ? '' : ':00'} és ${String(hrs[1]).replace('.5', ':30')}${String(hrs[1]).includes('.') ? '' : ':00'} között zajlik.</div>`}<button data-dq="where">📍 Merre?</button>`));
    qEl.classList.add('on');
  }
  qEl && qEl.addEventListener('click', e => {
    const b = e.target.closest('[data-dq]'); if (!b) return;
    if (b.dataset.dq === 'min') { qMin = !qMin; localStorage.setItem('kert-napq-min', qMin ? '1' : '0'); render(); }
    if (b.dataset.dq === 'where') { const Dd = DAY_BY[cur]; hintT = performance.now(); toast(`${Dd.icon} ${Dd.who}`, Dd.where); }
  });
  let hintT = -1e9;

  /* ---------- kifelé ---------- */
  function setVis(v) {
    const D = G[cur]; if (!D) return;
    D.g.visible = v; for (const n of D.npcs) n.hidden = !v;
    for (let i = TRIG.length - 1; i >= 0; i--) if (TRIG[i].day) TRIG.splice(i, 1);
    if (v) TRIG.push(...D.trig);
  }
  const todayType = () => forced || dayTypeOf(dayNum());
  let lastD = dstr(today());
  return {
    root,
    get cur() { return cur; }, get day() { return DAY_BY[cur]; }, get active() { return on; },
    get _g() { return G; },   // csak teszteléshez
    get weather() { return W; },
    set(id) {
      if (!DAY_BY[id]) return false; if (id === cur) return false;
      if (cur && G[cur]) { setVis(false); for (const n of G[cur].npcs) n.hidden = true; }
      const fresh = !G[id]; cur = id; if (fresh) build(id); on = false; render();
      return fresh;
    },
    force(id) { forced = DAY_BY[id] ? id : null; return this.set(todayType()); },
    todayType,
    instantWeather() { W.kind = cur ? DAY_BY[cur].weather || null : null; W.k = W.kind ? 1 : 0; },
    bindLearn(l) { learn = l; render(); },
    blocked(x, z) {
      if (!on || !cur) return false; const D = G[cur];
      for (const [cx, cz, r] of D.cols) if ((x - cx) * (x - cx) + (z - cz) * (z - cz) < (r + .3) * (r + .3)) return true;
      for (const [x0, z0, x1, z1] of D.rects) if (x > x0 - .3 && x < x1 + .3 && z > z0 - .3 && z < z1 + .3) return true;
      return false;
    },
    // visszaadja, hogy változott-e a látható jelenet (árnyék-frissítéshez)
    update(t, dt, me, hour, dayF, cam, indoor) {
      weatherTick(t, dt, cam, dayF, indoor);
      const hrs = cur ? DAY_BY[cur].hours || [6, 23.5] : [0, 0], want = !!cur && hour >= hrs[0] && hour < hrs[1];
      let dirty = false; if (want !== on) { on = want; setVis(on); render(); dirty = true; }
      if (on) eventTick(G[cur], t, dt, me);
      return dirty;
    },
    get flash() { return W.flash; },
    sound(me) { const D = on && G[cur]; return D && D.sound ? D.sound(me) : null; },
    seen(w) { if (!cur || !DAY_BY[cur].words.includes(w)) return; const N = Q(); if (!N || N.seen.includes(w)) return; N.seen.push(w); save(); render(); checkDone(); },
    onConv(id) { if (!cur || DAY_BY[cur].npc !== id) return; const N = Q(); if (!N || N.talk) return; N.talk = true; save(); render(); checkDone(); },
    slow() {
      const d = dstr(today()); if (d !== lastD) { lastD = d; if (!forced) { this.set(todayType()); return 'new'; } }
      if (qDone && performance.now() - qDone > 9000) { qDone = 0; render(); }
      return null;
    },
    mapMark() { const Dd = cur && DAY_BY[cur]; if (!Dd || !on) return null; return { x: Dd.go[0], z: Dd.go[1], icon: Dd.icon, ring: performance.now() - hintT < 15000 }; },
    // a szünet-menü naptára
    pauseHTML(dev) {
      const Dd = DAY_BY[cur], N = Q() || { seen: [], talk: false, done: false, hist: {} }, n0 = dayNum(), hist = N.hist || {};
      const next = [1, 2, 3, 4, 5, 6].map(k => { const d = today(k), t = DAY_BY[dayTypeOf(n0 + k)]; return `<span title="${esc(t.name)}"><i>${t.icon}</i>${k === 1 ? 'holnap' : HUDAY[d.getDay()]}</span>`; }).join('');
      const got = DAYS.filter(x => hist[x.id]).length;
      return `<div class="dtoday"><div class="di">${Dd.icon}</div><div><b>Ma: ${esc(Dd.name)}</b><small>${esc(Dd.desc)}</small>
        <small class="dq">${N.done ? '✓ A mai feladat kész.' : `Feladat: ${N.seen.length}/${Dd.words.length} szó · ${N.talk ? '✓ beszélgetés' : 'beszélgess: ' + esc(Dd.who)}`}</small></div></div>
        <button class="dgo" data-p="dgo">➜ Odamegyek: ${esc(Dd.where)}</button>
        <div class="dnext">${next}</div>
        <div class="dall">Átélt napok: <b>${got} / ${DAYS.length}</b> ${DAYS.map(x => `<i class="${hist[x.id] ? 'on' : ''}" title="${esc(x.name)}">${x.icon}</i>`).join('')}</div>
        ${dev ? `<div class="ddev">Teszt (csak helyben): ${DAYS.map(x => `<button data-p="dday" data-id="${x.id}" class="${x.id === cur ? 'on' : ''}">${x.icon}</button>`).join('')}</div>` : ''}`;
    },
  };
}
