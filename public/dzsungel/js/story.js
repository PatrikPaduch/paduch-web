// Történet és felfedezés: Hollós Vera 1931-es naplójának lapjai a völgyben, napló (J), térkép felfedezési köddel (M),
// aktuális cél a HUD-on és az iránytűn.
import * as THREE from 'three';
import { G, ADD } from './shaders.js';
import { CAMP, TEMPLE, NAPKAPU, CAVE_MOUTH, LIP_Z } from './terrain.js';

const V3 = THREE.Vector3;
const $ = (id) => document.getElementById(id);

// A napló lapjai: hely + szöveg. A sorrend a napló sorrendje.
export const NOTES = [
  { id: 'tabor', date: '1931. március 2.', title: 'A tábor', text: 'Harmadik napja vagyunk a völgyben. A hordárok tegnap visszafordultak, azt mondják, a völgy nem szereti az idegeneket. A szavaikból egy régi legenda szűrődik ki: két őr vigyázza a völgy szívét. Az Arany Jaguár a magasban, a vízesés fölötti romok között, a Jáde Kígyó a mélyben, ahol a víz soha nem hallgat el. Aki mindkettőt a Napkapuhoz viszi, annak a völgy megnyílik.\n\nHolnap felmegyek a fennsíkra. A tábortól nyugatra ösvény indul, az a sziklafal mentén feljáróhoz vezet.' },
  { id: 'templom', date: '1931. március 6.', title: 'A Jaguár temploma', text: 'Megtaláltam! Lépcsős piramis, a csúcsán szentély, az oltáron arany jaguár. Nem mertem hozzányúlni.\n\nA szentély falán kígyót ábrázoló faragás: a teste egy vízesésen át kanyarog be egy sötét üregbe. Ha jól értem, a kígyó a vízesés mögött rejtőzik. A tó nyugati partjáról keskeny párkány fut a sziklafal tövében, egészen a lezúduló víz mögé.' },
  { id: 'parkany', date: '1931. március 9.', title: 'A párkány', text: 'A vízesés mögött tényleg nyílás van, alig látni a permettől. Bent vaksötét, de a mélyben valami kéken dereng.\n\nFáklya nélkül nem megyek tovább. Egy ágból, két nagy levélből és egy liánból könnyű fáklyát kötni.' },
  { id: 'barlang1', date: '1931. március 10.', title: 'Az alagút', text: 'A gombák világítanak! Kékeszöld fényük végigkíséri a falak tövét, mintha utat jelölnének befelé. A mennyezeten ezernyi apró fénypont, akár a csillagos ég.\n\nOlyan mély a csend, hogy hallom a cseppek koppanását a túlsó teremben.' },
  { id: 'barlang2', date: '1931. március 10.', title: 'A kígyó terme', text: 'Itt van a Jáde Kígyó, a derengő tavacska partján, kőtalapzaton.\n\nA falon újabb faragás: a nap kapuja kör alakú kőudvarban áll, a völgy délnyugati végén, ahol a hegyek leérnek az erdőig.\n\nMegrándult a bokám, a kígyót nem tudom felvinni. Ha valaki megtalálja ezt a naplót: vidd el helyettem a két őrt a kapuhoz.' },
  { id: 'napkapu', date: 'Kőbe vésve', title: 'A Napkapu felirata', text: '„A jaguár a nappal, a kígyó az éjjel. Ha egymás mellett pihennek az oltáron, a kapu megnyílik, és a völgy szíve megmutatja magát.”\n\n(Vera fordítása a kő mellé tűzött lapon. Idáig eljutott, de a kígyó nélkül hiába.)' },
];
const FINAL = { id: 'final', date: 'Ma', title: 'A völgy szíve', text: 'A két őr egymás mellett pihen az oltáron, a kapuból fényoszlop emelkedik az ég felé, a közepén a Napkorong lebeg.\n\nVera, sikerült. A völgy megnyílt.' };

export class Story {
  constructor(o) {
    Object.assign(this, o); // scene, T, temple, cave, napkapu, hunt, surv, player, state
    this.read = new Set();
    this.vis = new Uint8Array(96 * 96);
    this.sel = null;
    // a lapok helye a világban
    const T = this.T, at = (x, z) => ({ x, z, y: T.heightAt(x, z) });
    const tp = this.temple.idolPos;
    const nk = this.napkapu;
    this.pos = {
      tabor: at(CAMP.x + 2.6, CAMP.z + 1.4),
      templom: { x: tp.x + 1.15, z: tp.z + 0.4, y: T.heightAt(tp.x + 1.15, tp.z + 0.4) },
      parkany: at(-4.2, -48.3),
      barlang1: this.cave.notePos[0], barlang2: this.cave.notePos[1],
      napkapu: at(nk.altar.x + nk.rgt.x * 1.9 + nk.fwd.x * 0.6, nk.altar.z + nk.rgt.z * 1.9 + nk.fwd.z * 0.6),
    };
    this.buildPages();
  }

  // ---------------------------------------------------------------- lapok a világban
  buildPages() {
    const leather = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.8 });
    const paper = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.95 });
    this.pageMesh = {};
    const sp = [];
    for (const n of NOTES) {
      const p = this.pos[n.id], g = new THREE.Group();
      const cover = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.34), leather);
      const pg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.32), paper); pg.position.y = 0.025;
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.345), leather); strap.position.set(0.07, 0.01, 0);
      g.add(cover, pg, strap);
      g.position.set(p.x, p.y + 0.02, p.z); g.rotation.y = Math.random() * 6.28;
      g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.scene.add(g);
      this.pageMesh[n.id] = g;
      sp.push(p.x, p.y + 0.35, p.z, 1);
    }
    const buf = new THREE.InterleavedBuffer(new Float32Array(sp), 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 3, 0));
    geo.setAttribute('aOn', new THREE.InterleavedBufferAttribute(buf, 1, 3));
    this.sparkBuf = buf;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: G.uTime, uScreenH: G.uScreenH },
      vertexShader: `attribute float aOn; uniform float uTime; uniform float uScreenH; varying float vA;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z;
  float pulse = pow(0.5 + 0.5 * sin(uTime * 2.0 + position.x), 3.0);
  vA = aOn * smoothstep(22.0, 6.0, d) * smoothstep(0.6, 1.4, d) * (0.35 + 0.65 * pulse);
  gl_PointSize = aOn * (110.0 + 60.0 * pulse) * uScreenH / 600.0 / max(d, 0.5); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA;
void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q);
  float star = max(0.0, 1.0 - abs(q.x) * 7.0) * max(0.0, 1.0 - abs(q.y)) + max(0.0, 1.0 - abs(q.y) * 7.0) * max(0.0, 1.0 - abs(q.x));
  float a = (exp(-r * r * 8.0) * 0.7 + star * 0.7) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.86, 0.55) * a * 1.5, 0.0); }`,
      transparent: true, depthWrite: false, ...ADD,
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
    this.scene.add(pts);
  }
  setRead(id) {
    this.read.add(id);
    const i = NOTES.findIndex((n) => n.id === id);
    if (i >= 0) { this.sparkBuf.array[i * 4 + 3] = 0; this.sparkBuf.needsUpdate = true; this.pageMesh[id].visible = false; }
  }
  nearestPage(p) {
    for (const n of NOTES) {
      if (this.read.has(n.id)) continue;
      const q = this.pos[n.id];
      if (Math.hypot(q.x - p.x, q.z - p.z) < 1.8 && Math.abs(q.y - p.y) < 1.8) return n;
    }
    return null;
  }

  // ---------------------------------------------------------------- célok
  objective() {
    const S = this.state, t = this.temple, c = this.cave, k = this.napkapu;
    const P = (x, z) => ({ x, z });
    if (!this.read.has('tabor')) return { text: 'Olvasd el Vera naplóját a táborban', at: P(this.pos.tabor.x, this.pos.tabor.z) };
    if (!S.templeSeen) return { text: 'Keresd meg a Jaguár-templomot a vízesés fölötti fennsíkon', at: P(TEMPLE.x, TEMPLE.z) };
    if (!t.found) return { text: 'Vedd magadhoz az Arany Jaguárt a templom szentélyében', at: P(t.idolPos.x, t.idolPos.z) };
    if (!c.seen) return { text: 'Keresd meg a barlangot a vízesés mögött', at: P(CAVE_MOUTH.x, CAVE_MOUTH.z) };
    if (!c.found) return { text: 'Hozd ki a Jáde Kígyót a barlang mélyéről', at: P(c.serpentPos.x, c.serpentPos.z) };
    if (!k.placed) return { text: k.seen ? 'Helyezd a két szobrot a Napkapu oltárára' : 'Vidd a két szobrot a Napkapuhoz, a völgy délnyugati végére', at: P(k.altar.x, k.altar.z) };
    if (!k.discTaken) return { text: 'Vedd el a Napkorongot a kapuból', at: P(k.discPos.x, k.discPos.z) };
    return { text: 'A völgy titka feltárult. Fedezz fel szabadon!', at: null };
  }

  // ---------------------------------------------------------------- felfedezési köd
  reveal(p, r = 26) {
    const C = 4, N = 96, cx = Math.floor((p.x + 192) / C), cz = Math.floor((p.z + 192) / C), rr = Math.ceil(r / C);
    let ch = false;
    for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) {
      const x = cx + i, z = cz + j;
      if (x < 0 || z < 0 || x >= N || z >= N || i * i + j * j > rr * rr) continue;
      if (!this.vis[z * N + x]) { this.vis[z * N + x] = 1; ch = true; }
    }
    return ch;
  }
  visStr() { let s = ''; for (let i = 0; i < this.vis.length; i += 8) { let b = 0; for (let k = 0; k < 8; k++) b |= (this.vis[i + k] ? 1 : 0) << k; s += String.fromCharCode(b); } return btoa(s); }
  visLoad(s) { try { const t = atob(s); for (let i = 0; i < t.length; i++) { const b = t.charCodeAt(i); for (let k = 0; k < 8; k++) this.vis[i * 8 + k] = (b >> k) & 1; } } catch (e) { /* */ } }

  serialize() { return { read: [...this.read], vis: this.visStr() }; }
  restore(s) { if (!s) return; for (const id of s.read || []) this.setRead(id); if (s.vis) this.visLoad(s.vis); }

  // ---------------------------------------------------------------- napló (J)
  openJournal(id) {
    const list = NOTES.filter((n) => this.read.has(n.id));
    if (this.napkapu.placed) list.push(FINAL);
    if (id) this.sel = id;
    if (!list.some((n) => n.id === this.sel)) this.sel = list.length ? list[list.length - 1].id : null;
    $('jObj').textContent = this.objective().text;
    $('jList').innerHTML = list.length
      ? list.map((n) => `<button data-n="${n.id}" class="${n.id === this.sel ? 'on' : ''}"><i>${n.date}</i>${n.title}</button>`).join('')
      : '<div class="jEmpty">Még egyetlen lapot sem találtál. Nézz körül a táborban!</div>';
    const cur = list.find((n) => n.id === this.sel);
    $('jPage').innerHTML = cur ? `<div class="jDate">${cur.date}</div><h3>${cur.title}</h3>${cur.text.split('\n\n').map((p) => `<p>${p}</p>`).join('')}<div class="jSig">${cur.id === 'final' || cur.id === 'napkapu' ? '' : 'H. V.'}</div>` : '';
    $('jCount').textContent = `${NOTES.filter((n) => this.read.has(n.id)).length} / ${NOTES.length} lap`;
  }

  // ---------------------------------------------------------------- térkép (M)
  buildBase() {
    const T = this.T, S = 384, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    const k = 384 / S, x0 = -192;
    const H = new Float32Array(S * S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) H[j * S + i] = T.heightAt(x0 + (i + 0.5) * k, x0 + (j + 0.5) * k);
    const mix = (a, b, t) => a + (b - a) * t;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = x0 + (i + 0.5) * k, z = x0 + (j + 0.5) * k, o = (j * S + i) * 4;
      const h = H[j * S + i], hl = H[j * S + Math.max(0, i - 1)], hr = H[j * S + Math.min(S - 1, i + 1)];
      const hu = H[Math.max(0, j - 1) * S + i], hd = H[Math.min(S - 1, j + 1) * S + i];
      const lvl = T.waterLevelAt(x, z), sl = T.slopeAt(x, z), fo = T.forestAt(x, z), pa = T.pathAt(x, z);
      let r, g, b;
      if (lvl - h > 0.08) {
        const dep = Math.min(1, (lvl - h) / 2.5);
        r = mix(120, 70, dep); g = mix(160, 120, dep); b = mix(150, 128, dep);
      } else {
        // papírszín, zöldes erdő, világosabb fennsík, szürkésbarna hegyperem
        const up = Math.min(1, Math.max(0, (h - 10) / 6)), rim = Math.min(1, Math.max(0, (h - 24) / 20));
        r = mix(mix(200, 112, fo), 214, up * 0.35); g = mix(mix(190, 146, fo), 202, up * 0.35); b = mix(mix(140, 84, fo), 156, up * 0.35);
        r = mix(r, 168, rim); g = mix(g, 152, rim); b = mix(b, 128, rim);
        if (sl > 0.4) { const c = Math.min(1, (sl - 0.4) * 2.5); const hatch = ((i + j) % 3 === 0) ? 0.7 : 1; r = mix(r, 120 * hatch, c); g = mix(g, 98 * hatch, c); b = mix(b, 74 * hatch, c); }
        if (pa > 0.45 && (i + j) % 5 < 3) { r = 120; g = 86; b = 54; }
        // szintvonalak 4 m-enként
        if (Math.floor(h / 4) !== Math.floor(hr / 4) || Math.floor(h / 4) !== Math.floor(hd / 4)) { r *= 0.86; g *= 0.84; b *= 0.8; }
      }
      const sh = Math.max(0.55, Math.min(1.22, 0.93 + (hl - hr) * 0.14 + (hu - hd) * 0.14));
      d[o] = r * sh; d[o + 1] = g * sh; d[o + 2] = b * sh; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.base = cv;
  }

  drawMap(extra) {
    if (!this.base) this.buildBase();
    const cv = $('mapCanvas'), S = cv.width, ctx = cv.getContext('2d');
    const w2m = (x, z) => [(x + 192) / 384 * S, (z + 192) / 384 * S];
    // papír háttér
    ctx.fillStyle = '#e4d6b4'; ctx.fillRect(0, 0, S, S);
    // a felfedezett rész: maszk a köd-rácsból, lágy szélekkel
    const m = document.createElement('canvas'); m.width = m.height = 96;
    const mc = m.getContext('2d'), mi = mc.createImageData(96, 96);
    for (let i = 0; i < this.vis.length; i++) { mi.data[i * 4 + 3] = this.vis[i] ? 255 : 0; }
    mc.putImageData(mi, 0, 0);
    const layer = document.createElement('canvas'); layer.width = layer.height = S;
    const lc = layer.getContext('2d');
    lc.drawImage(this.base, 0, 0, S, S);
    lc.globalCompositeOperation = 'destination-in';
    lc.filter = `blur(${S / 96 * 1.4}px)`;
    lc.imageSmoothingEnabled = true;
    lc.drawImage(m, 0, 0, S, S);
    lc.filter = 'none';
    ctx.drawImage(layer, 0, 0);
    // jelek
    const lab = (x, z, icon, name, col = '#3b2a18', faded = false) => {
      const [px, py] = w2m(x, z);
      ctx.globalAlpha = faded ? 0.55 : 1;
      ctx.fillStyle = col; ctx.font = `${S * 0.046}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(icon, px, py);
      ctx.font = `italic 700 ${S * 0.036}px "Cormorant Garamond", serif`;
      ctx.lineWidth = S * 0.006; ctx.strokeStyle = 'rgba(240,228,200,0.85)'; ctx.strokeText(name, px, py + S * 0.048);
      ctx.fillText(name, px, py + S * 0.048);
      ctx.globalAlpha = 1;
    };
    const S0 = this.state, rd = this.read;
    lab(CAMP.x, CAMP.z, '▲', 'Tábor');
    lab(24, LIP_Z + 2, '≋', 'Vízesés', '#2d5a66');
    if (S0.templeSeen) lab(TEMPLE.x, TEMPLE.z, '◆', 'Jaguár-templom'); else if (rd.has('tabor')) lab(TEMPLE.x, TEMPLE.z, '?', 'templom?', '#3b2a18', true);
    if (this.cave.seen) lab(CAVE_MOUTH.x - 9, CAVE_MOUTH.z - 6, '◖', 'Barlang'); else if (rd.has('templom') || this.temple.found) lab(CAVE_MOUTH.x - 9, CAVE_MOUTH.z - 6, '?', 'barlang?', '#3b2a18', true);
    if (this.napkapu.seen) lab(NAPKAPU.x, NAPKAPU.z, '☼', 'Napkapu', '#8a5a12'); else if (rd.has('barlang2') || this.cave.found) lab(NAPKAPU.x, NAPKAPU.z, '?', 'Napkapu?', '#8a5a12', true);
    if (extra.fire) lab(extra.fire.x, extra.fire.z, '🔥', '');
    if (extra.spear) lab(extra.spear.x, extra.spear.z, '↑', 'lándzsa', '#5a3a1a');
    // cél: lüktető arany csillag
    const ob = this.objective();
    if (ob.at) {
      const [px, py] = w2m(ob.at.x, ob.at.z), rr = S * (0.03 + 0.006 * Math.sin(performance.now() / 300));
      ctx.strokeStyle = 'rgba(176,120,20,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, rr * 1.6, 0, 7); ctx.stroke();
      ctx.fillStyle = '#c08a1c'; ctx.font = `${S * 0.055}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', px, py);
    }
    // a játékos: piros nyíl a haladási iránnyal
    const p = this.player.pos, [px, py] = w2m(p.x, p.z), f = this.player.facing;
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - f);
    ctx.fillStyle = '#b3261e'; ctx.strokeStyle = '#fff4dc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -S * 0.032); ctx.lineTo(S * 0.02, S * 0.022); ctx.lineTo(0, S * 0.01); ctx.lineTo(-S * 0.02, S * 0.022); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // keret, iránytű-rózsa
    ctx.strokeStyle = 'rgba(70,45,20,0.6)'; ctx.lineWidth = S * 0.006; ctx.strokeRect(S * 0.01, S * 0.01, S * 0.98, S * 0.98);
    ctx.fillStyle = 'rgba(70,45,20,0.75)'; ctx.font = `italic 600 ${S * 0.03}px "Cormorant Garamond", serif`; ctx.textAlign = 'center';
    ctx.fillText('É', S * 0.93, S * 0.07); ctx.fillText('↑', S * 0.93, S * 0.105);
    const pct = Math.round(this.vis.reduce((a, b) => a + b, 0) / (Math.PI * 47 * 47) * 100);
    $('mapInfo').textContent = `Felfedezve: ${Math.min(100, pct)}% · ${ob.text}`;
  }
}
