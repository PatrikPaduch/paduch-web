// Procedurálisan festett textúrák: levél-atlasz (8 cella), kéreg, lepkeszárny
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${Math.max(0, Math.min(100, l))}%,${a})`;

function leafShape(ctx, len, wid, tip = 0.75) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(wid * 0.95, -len * 0.12, wid * tip, -len * 0.72, 0, -len);
  ctx.bezierCurveTo(-wid * tip, -len * 0.72, -wid * 0.95, -len * 0.12, 0, 0);
  ctx.closePath();
}

function drawLeaf(ctx, rnd, x, y, ang, len, wid, h, s, l, opt = {}) {
  const tip = opt.tip ?? 0.75;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  leafShape(ctx, len, wid, tip);
  const g = ctx.createLinearGradient(-wid * 0.7, 0, wid * 0.7, 0);
  g.addColorStop(0, hsl(h, s, l - 8)); g.addColorStop(0.46, hsl(h - 4, s + 6, l + 7));
  g.addColorStop(0.54, hsl(h - 4, s + 6, l + 4)); g.addColorStop(1, hsl(h, s, l - 10));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  const g2 = ctx.createLinearGradient(0, 0, 0, -len);
  g2.addColorStop(0, 'rgba(0,0,0,0.25)'); g2.addColorStop(0.45, 'rgba(255,255,210,0.06)'); g2.addColorStop(1, 'rgba(40,30,0,0.16)');
  ctx.fillStyle = g2; ctx.fillRect(-wid, -len, wid * 2, len);
  ctx.lineCap = 'round';
  ctx.strokeStyle = hsl(h - 12, s, l + 24, 0.55); ctx.lineWidth = Math.max(1.2, wid * 0.07);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(wid * 0.03, -len * 0.5, 0, -len * 0.96); ctx.stroke();
  const nv = opt.veins ?? 8;
  ctx.lineWidth = Math.max(0.7, wid * 0.025); ctx.strokeStyle = hsl(h - 12, s, l + 18, 0.3);
  for (let i = 1; i < nv; i++) {
    const t = i / nv, yy = -len * t * 0.92, w = wid * 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.05));
    ctx.beginPath();
    ctx.moveTo(0, yy); ctx.quadraticCurveTo(w * 0.5, yy - len * 0.03, w, yy - len * 0.11);
    ctx.moveTo(0, yy); ctx.quadraticCurveTo(-w * 0.5, yy - len * 0.03, -w, yy - len * 0.11);
    ctx.stroke();
  }
  const n = Math.floor(len * wid * 0.015);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,200,0.05)';
    ctx.fillRect((rnd() - 0.5) * wid * 1.4, -rnd() * len, 2, 2);
  }
  ctx.lineWidth = Math.max(1, wid * 0.05); ctx.strokeStyle = hsl(h, s, l - 15, 0.5);
  leafShape(ctx, len, wid, tip); ctx.stroke();
  ctx.restore(); ctx.restore();
}

// Fotós levélcsoport-pecsétek a vízigesztenye-textúrából (2048-as képen): befoglaló téglalap + a levélnyél csatlakozási pontja
let PHOTO = null;
const STAMPS = [
  { x0: 80, y0: 93, x1: 947, y1: 1093, jx: 587, jy: 787 },
  { x0: 1000, y0: 80, x1: 1827, y1: 933, jx: 1515, jy: 635 },
  { x0: 40, y0: 947, x1: 960, y1: 2013, jx: 581, jy: 1685 },
  { x0: 1027, y0: 933, x1: 1733, y1: 1840, jx: 1573, jy: 1520 },
];
// egyedi fotózott széles levelek (Island Tree levél-atlasz), az alap (jx, jy) a levélnyél vége
const SINGLE = [
  { x0: 340, y0: 44, x1: 688, y1: 804, jx: 562, jy: 800 },
  { x0: 740, y0: 68, x1: 988, y1: 740, jx: 845, jy: 736 },
  { x0: 1060, y0: 100, x1: 1328, y1: 740, jx: 1218, jy: 736 },
  { x0: 1424, y0: 44, x1: 1672, y1: 848, jx: 1539, jy: 844 },
  { x0: 444, y0: 1184, x1: 724, y1: 2048, jx: 651, jy: 2044 },
  { x0: 36, y0: 1292, x1: 372, y1: 2048, jx: 153, jy: 2044 },
  { x0: 864, y0: 1240, x1: 1148, y1: 2048, jx: 1004, jy: 2044 },
];
function stampFrom(img, s, ctx, x, y, scale, rot, shade = 1) {
  const k = img.width / 2048;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.filter = shade !== 1 ? `brightness(${shade})` : 'none';
  ctx.drawImage(img, s.x0 * k, s.y0 * k, (s.x1 - s.x0) * k, (s.y1 - s.y0) * k,
    -(s.jx - s.x0) * scale, -(s.jy - s.y0) * scale, (s.x1 - s.x0) * scale, (s.y1 - s.y0) * scale);
  ctx.restore();
}
const stamp = (ctx, i, x, y, scale, rot, shade = 1) => stampFrom(PHOTO.pachira, STAMPS[i], ctx, x, y, scale, rot, shade);

// Pálmalevél: minden levélke a halfarkú pálma fotójából kivágott, erezettel párhuzamos sáv
function cPalmPhoto(ctx, C, rnd) {
  const F = PHOTO.fishtail, fk = F.width / 1024, cx = C / 2, N = 42;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = C * (0.98 - t * 0.95);
    const L = C * 0.48 * Math.pow(Math.sin(Math.PI * (0.08 + 0.9 * t)), 0.55) * (t < 0.06 ? 0.4 : 1);
    for (const side of [-1, 1]) {
      const wid = C * (0.02 + rnd() * 0.008);
      ctx.save(); ctx.translate(cx, y); ctx.rotate(side * (0.95 - t * 0.35 + (rnd() - 0.5) * 0.12));
      leafShape(ctx, L, wid, 0.45); ctx.clip();
      ctx.filter = `brightness(${0.8 + rnd() * 0.35}) saturate(${1.0 + rnd() * 0.3})`;
      const sx = (330 + rnd() * 240) * fk;
      ctx.drawImage(F, sx, 140 * fk, 110 * fk, 760 * fk, -wid * 1.3, -L, wid * 2.6, L);
      ctx.filter = 'none';
      ctx.strokeStyle = 'rgba(20,30,8,0.45)'; ctx.lineWidth = 2.2; leafShape(ctx, L, wid, 0.45); ctx.stroke();
      ctx.strokeStyle = 'rgba(210,225,140,0.35)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L * 0.95); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.strokeStyle = hsl(60, 30, 30); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.02); ctx.stroke();
  ctx.strokeStyle = hsl(60, 30, 48, 0.6); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 2, C); ctx.lineTo(cx - 2, C * 0.02); ctx.stroke();
}

// Banánlevél: a két levélfél kitöltése a fotó erezetével kifelé-fölfelé futó irányban, szakadásokkal
function cBananaPhoto(ctx, C, rnd) {
  const F = PHOTO.fishtail, fk = F.width / 1024, cx = C / 2, W = C * 0.47;
  const shape = () => {
    ctx.beginPath(); ctx.moveTo(cx, C * 0.99);
    ctx.bezierCurveTo(cx + W, C * 0.86, cx + W, C * 0.2, cx, C * 0.01);
    ctx.bezierCurveTo(cx - W, C * 0.2, cx - W, C * 0.86, cx, C * 0.99);
    ctx.closePath();
  };
  for (const s of [-1, 1]) {
    ctx.save();
    shape(); ctx.clip();
    ctx.beginPath(); ctx.rect(s > 0 ? cx : 0, 0, C / 2, C); ctx.clip();
    const br = 1.12 + rnd() * 0.06;
    for (let y = C + 30; y > -40; y -= 38) {
      ctx.save(); ctx.translate(cx, y); ctx.rotate(s * (Math.PI / 2 - 0.32));
      ctx.filter = `brightness(${br + rnd() * 0.05}) saturate(1.25)`;
      // csak a forrásfotó teljesen kitöltött középső része (nincs átlátszó rés)
      ctx.drawImage(F, (410 + rnd() * 40) * fk, 380 * fk, 150 * fk, 500 * fk, -42, -W * 1.15, 84, W * 1.2);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.save(); shape(); ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(cx - W, 0, cx + W, 0);
  g.addColorStop(0, 'rgba(60,40,10,0.35)'); g.addColorStop(0.5, 'rgba(200,255,120,0.12)'); g.addColorStop(1, 'rgba(60,40,10,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, C, C);
  ctx.strokeStyle = hsl(35, 50, 28, 0.75); ctx.lineWidth = 7; shape(); ctx.stroke();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const side = rnd() < 0.5 ? -1 : 1, y = C * (0.15 + rnd() * 0.7);
    ctx.lineWidth = 1.5 + rnd() * 2.5;
    ctx.beginPath(); ctx.moveTo(cx + side * W, y - 26); ctx.quadraticCurveTo(cx + side * W * 0.5, y - 8, cx + side * (14 + rnd() * 30), y); ctx.stroke();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = hsl(70, 40, 62); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.03); ctx.stroke();
}

// Kúszónövény: szár + fotózott kis levelek lefelé csüngve
function cVinePhoto(ctx, C, rnd) {
  for (const x0 of [C * 0.3, C * 0.7]) {
    const ph = rnd() * 6;
    ctx.strokeStyle = hsl(60, 30, 24); ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= C; y += 8) { const x = x0 + Math.sin(y * 0.02 + ph) * 16; y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    for (let y = 10; y < C - 10; y += 26 + rnd() * 12) {
      const x = x0 + Math.sin(y * 0.02 + ph) * 16, side = rnd() < 0.5 ? -1 : 1;
      stampFrom(PHOTO.island, SINGLE[Math.floor(rnd() * SINGLE.length)], ctx, x, y, 0.075 + rnd() * 0.03, Math.PI + side * (0.5 + rnd() * 0.5), 0.9 + rnd() * 0.25);
    }
  }
}
function cBroadPhoto(ctx, C, rnd) {
  ctx.strokeStyle = hsl(80, 30, 22); ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C / 2, C); ctx.lineTo(C / 2, C * 0.62); ctx.stroke();
  stamp(ctx, 1, C / 2, C * 0.62, 0.58, (rnd() - 0.5) * 0.3);
}
function cTwigPhoto(ctx, C, rnd) {
  ctx.strokeStyle = hsl(30, 25, 20); ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C * 0.5, C); ctx.quadraticCurveTo(C * 0.46, C * 0.6, C * 0.52, C * 0.3); ctx.stroke();
  stamp(ctx, 2, C * 0.3, C * 0.42, 0.34, -0.5 + rnd() * 0.3, 0.85);
  stamp(ctx, 3, C * 0.72, C * 0.38, 0.36, 0.4 + rnd() * 0.3, 0.9);
  stamp(ctx, 0, C * 0.5, C * 0.72, 0.42, (rnd() - 0.5) * 0.4, 1);
  stamp(ctx, 1, C * 0.52, C * 0.3, 0.3, (rnd() - 0.5) * 0.6, 1.08);
}

// 0: széles levél
function cBroad(ctx, C, rnd) {
  ctx.strokeStyle = hsl(80, 30, 25); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(C / 2, C); ctx.lineTo(C / 2, C * 0.9); ctx.stroke();
  drawLeaf(ctx, rnd, C / 2, C * 0.93, 0, C * 0.9, C * 0.44, 100, 55, 30, { veins: 10 });
}
// 1: ágacska sok levéllel (lombkorona-kártya)
function cTwig(ctx, C, rnd) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([C * 0.5 + Math.sin(t * 3) * C * 0.04, C * (1 - t * 0.86)]); }
  ctx.strokeStyle = hsl(30, 25, 22); ctx.lineCap = 'round'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.stroke();
  const leaves = [];
  for (let i = 0; i < 14; i++) {
    const t = 0.1 + i / 14 * 0.86;
    const p = pts[Math.min(10, Math.round(t * 10))];
    const side = i % 2 ? 1 : -1;
    leaves.push({ x: p[0], y: p[1], a: side * (0.6 + rnd() * 0.6) * (1 - t * 0.45), len: C * (0.27 + rnd() * 0.1) * (1.1 - t * 0.3), wid: C * (0.1 + rnd() * 0.03) });
  }
  leaves.push({ x: pts[10][0], y: pts[10][1] + 8, a: (rnd() - 0.5) * 0.2, len: C * 0.3, wid: C * 0.11 });
  for (const L of leaves) drawLeaf(ctx, rnd, L.x, L.y, L.a, L.len, L.wid, 92 + rnd() * 18, 48 + rnd() * 14, 25 + rnd() * 12, { veins: 6 });
}
// 2: pálmalevél (tollasan szeldelt)
function cPalm(ctx, C, rnd) {
  const cx = C / 2, N = 40;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = C * (0.98 - t * 0.95);
    const L = C * 0.48 * Math.pow(Math.sin(Math.PI * (0.08 + 0.9 * t)), 0.55) * (t < 0.06 ? 0.4 : 1);
    for (const side of [-1, 1]) {
      const ang = side * (0.95 - t * 0.35 + (rnd() - 0.5) * 0.12);
      drawLeaf(ctx, rnd, cx, y, ang, L, C * 0.024, 86 + rnd() * 12, 48, 27 + rnd() * 10, { veins: 0, tip: 0.5 });
    }
  }
  ctx.strokeStyle = hsl(60, 35, 32); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.02); ctx.stroke();
}
// 3: páfrány levél
function cFern(ctx, C, rnd) {
  const cx = C / 2, N = 30;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const y = C * (0.97 - t * 0.94);
    const L = C * 0.45 * Math.pow(Math.sin(Math.PI * (0.05 + 0.92 * t)), 0.8);
    for (const side of [-1, 1]) {
      ctx.save(); ctx.translate(cx, y); ctx.rotate(side * (1.15 - t * 0.3));
      const lobes = Math.max(3, Math.floor(L / 13));
      for (let k = 0; k < lobes; k++) {
        const s = k / lobes, ly = -L * s, lw = (1 - s) * C * 0.03 + 3;
        ctx.fillStyle = hsl(98 + rnd() * 8, 52, 28 + rnd() * 10 + s * 7);
        ctx.beginPath(); ctx.ellipse(0, ly - lw * 0.8, lw, lw * 1.3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = hsl(95, 45, 22); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.strokeStyle = hsl(80, 40, 25); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.03); ctx.stroke();
}
// 4: könnyező pálma (Monstera) levélnyéllel
function cMonstera(ctx, C, rnd) {
  const cx = C / 2;
  ctx.strokeStyle = hsl(110, 40, 28); ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.6); ctx.stroke();
  const y0 = C * 0.64, top = C * 0.02, W = C * 0.47;
  ctx.save();
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(cx, y0 - C * 0.05);
    ctx.bezierCurveTo(cx + W * 0.5, y0 + C * 0.05, cx + W * 1.05, y0 - C * 0.15, cx + W * 0.95, y0 - C * 0.35);
    ctx.bezierCurveTo(cx + W * 0.85, y0 - C * 0.52, cx + W * 0.35, top + C * 0.02, cx, top);
    ctx.bezierCurveTo(cx - W * 0.35, top + C * 0.02, cx - W * 0.85, y0 - C * 0.52, cx - W * 0.95, y0 - C * 0.35);
    ctx.bezierCurveTo(cx - W * 1.05, y0 - C * 0.15, cx - W * 0.5, y0 + C * 0.05, cx, y0 - C * 0.05);
    ctx.closePath();
  };
  shape();
  const g = ctx.createRadialGradient(cx, y0 - C * 0.3, 10, cx, y0 - C * 0.3, C * 0.5);
  g.addColorStop(0, hsl(128, 45, 32)); g.addColorStop(1, hsl(140, 50, 17));
  ctx.fillStyle = g; ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const t = (i + 0.7) / 7.5;
    const yy = y0 - C * 0.06 - t * (y0 - top - C * 0.08);
    const ex = cx + side * W * 1.1, ix = cx + side * W * (0.3 + rnd() * 0.12);
    ctx.lineWidth = 7 + rnd() * 6;
    ctx.beginPath(); ctx.moveTo(ix, yy); ctx.lineTo(ex, yy - C * 0.08 - t * C * 0.02); ctx.stroke();
    if (rnd() < 0.7) { ctx.beginPath(); ctx.ellipse(cx + side * W * 0.17, yy - C * 0.02, 5 + rnd() * 4, 10 + rnd() * 6, side * 0.5, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = hsl(100, 40, 45, 0.6); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(cx, y0 - C * 0.05); ctx.lineTo(cx, top + C * 0.03); ctx.stroke();
  const g2 = ctx.createRadialGradient(cx - W * 0.3, y0 - C * 0.4, 5, cx - W * 0.3, y0 - C * 0.4, C * 0.35);
  g2.addColorStop(0, 'rgba(255,255,230,0.12)'); g2.addColorStop(1, 'rgba(255,255,230,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, C, C);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}
// 5: banánlevél (szakadozott)
function cBanana(ctx, C, rnd) {
  const cx = C / 2, W = C * 0.47;
  const shape = () => {
    ctx.beginPath(); ctx.moveTo(cx, C * 0.99);
    ctx.bezierCurveTo(cx + W, C * 0.86, cx + W, C * 0.2, cx, C * 0.01);
    ctx.bezierCurveTo(cx - W, C * 0.2, cx - W, C * 0.86, cx, C * 0.99);
    ctx.closePath();
  };
  ctx.save();
  shape();
  const g = ctx.createLinearGradient(cx - W, 0, cx + W, 0);
  g.addColorStop(0, hsl(84, 52, 28)); g.addColorStop(0.47, hsl(88, 60, 43)); g.addColorStop(0.53, hsl(88, 60, 40)); g.addColorStop(1, hsl(84, 52, 27));
  ctx.fillStyle = g; ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(230,255,170,0.14)'; ctx.lineWidth = 1.5;
  for (let y = C * 0.03; y < C * 0.98; y += 6) {
    ctx.beginPath(); ctx.moveTo(cx, y); ctx.quadraticCurveTo(cx + W * 0.5, y - 6, cx + W, y - 16);
    ctx.moveTo(cx, y); ctx.quadraticCurveTo(cx - W * 0.5, y - 6, cx - W, y - 16); ctx.stroke();
  }
  ctx.strokeStyle = hsl(35, 50, 30, 0.7); ctx.lineWidth = 7; shape(); ctx.stroke();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9; i++) {
    const side = rnd() < 0.5 ? -1 : 1, y = C * (0.15 + rnd() * 0.7);
    ctx.lineWidth = 1.5 + rnd() * 2.5;
    ctx.beginPath(); ctx.moveTo(cx + side * W, y - 16); ctx.quadraticCurveTo(cx + side * W * 0.5, y - 6, cx + side * (14 + rnd() * 30), y); ctx.stroke();
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = hsl(70, 45, 62); ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, C); ctx.lineTo(cx, C * 0.03); ctx.stroke();
}
// 6: tavirózsa-levél
function cLily(ctx, C, rnd) {
  const cx = C / 2, cy = C / 2, R = C * 0.46;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, -Math.PI / 2 + 0.24, -Math.PI / 2 - 0.24 + Math.PI * 2); ctx.closePath();
  const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, R);
  g.addColorStop(0, hsl(92, 45, 40)); g.addColorStop(0.8, hsl(108, 45, 27)); g.addColorStop(1, hsl(20, 35, 30));
  ctx.fillStyle = g; ctx.fill();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(220,255,180,0.18)'; ctx.lineWidth = 2;
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
  for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`; ctx.beginPath(); ctx.arc(cx + (rnd() - 0.5) * R * 1.6, cy + (rnd() - 0.5) * R * 1.6, 2 + rnd() * 6, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';
}
// 7: csüngő kúszónövény
function cVine(ctx, C, rnd) {
  for (const x0 of [C * 0.3, C * 0.7]) {
    const ph = rnd() * 6;
    ctx.strokeStyle = hsl(60, 30, 24); ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= C; y += 8) { const x = x0 + Math.sin(y * 0.02 + ph) * 16; y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    for (let y = 10; y < C - 10; y += 22 + rnd() * 10) {
      const x = x0 + Math.sin(y * 0.02 + ph) * 16, side = rnd() < 0.5 ? -1 : 1;
      drawLeaf(ctx, rnd, x, y, Math.PI + side * (0.5 + rnd() * 0.5), 46 + rnd() * 26, 24 + rnd() * 8, 100 + rnd() * 15, 50, 24 + rnd() * 12, { veins: 4, tip: 0.6 });
    }
  }
}

export function makeAtlas(photo = null) {
  PHOTO = photo;
  const C = 512, W = C * 4, H = C * 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rnd = mulberry32(777);
  const fns = photo
    ? [cBroadPhoto, cTwigPhoto, cPalmPhoto, cFern, cMonstera, cBananaPhoto, cLily, cVinePhoto]
    : [cBroad, cTwig, cPalm, cFern, cMonstera, cBanana, cLily, cVine];
  fns.forEach((fn, k) => {
    ctx.save(); ctx.translate((k % 4) * C, Math.floor(k / 4) * C);
    ctx.beginPath(); ctx.rect(0, 0, C, C); ctx.clip();
    fn(ctx, C, rnd);
    ctx.restore();
  });
  const img = ctx.getImageData(0, 0, W, H).data;
  // Függőleges tükrözés: a vászon alja lesz v=0 (a levelek töve)
  const d0 = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) { const sy = H - 1 - y; d0.set(img.subarray(sy * W * 4, (sy + 1) * W * 4), y * W * 4); }
  const half = H / 2;
  const cellOf = (x, y, w, h) => Math.floor(y / (h / 2)) * 4 + Math.floor(x / (w / 4));
  // Átlátszó pixelek színe = cella átlagszíne (különben fekete szegély mipeknél)
  const sum = new Float64Array(8 * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; if (d0[i + 3] < 200) continue;
    const c = cellOf(x, y, W, H) * 4; sum[c] += d0[i]; sum[c + 1] += d0[i + 1]; sum[c + 2] += d0[i + 2]; sum[c + 3]++;
  }
  const cov = new Float64Array(8), cnt = new Float64Array(8);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, c = cellOf(x, y, W, H);
    cnt[c]++; if (d0[i + 3] >= 128) cov[c]++;
    if (d0[i + 3] < 4) { const s = c * 4, n = Math.max(1, sum[s + 3]); d0[i] = sum[s] / n; d0[i + 1] = sum[s + 1] / n; d0[i + 2] = sum[s + 2] / n; }
  }
  for (let c = 0; c < 8; c++) cov[c] /= cnt[c];
  void half;
  // Mip-lánc lefedettség-megőrző alfa skálázással (távoli lombok nem ritkulnak el)
  const levels = [{ data: d0, width: W, height: H }];
  let w = W, h = H, src = d0;
  while (w > 1 || h > 1) {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1);
    const dst = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const x0 = Math.min(w - 1, x * 2), x1 = Math.min(w - 1, x * 2 + 1), y0 = Math.min(h - 1, y * 2), y1 = Math.min(h - 1, y * 2 + 1);
      const a = (y0 * w + x0) * 4, b = (y0 * w + x1) * 4, c = (y1 * w + x0) * 4, d = (y1 * w + x1) * 4, o = (y * nw + x) * 4;
      for (let k = 0; k < 4; k++) dst[o + k] = (src[a + k] + src[b + k] + src[c + k] + src[d + k] + 2) >> 2;
    }
    if (nw >= 16 && nh >= 8) {
      const cw = nw / 4, ch = nh / 2;
      for (let cell = 0; cell < 8; cell++) {
        const cx0 = (cell % 4) * cw, cy0 = Math.floor(cell / 4) * ch;
        const target = cov[cell] * cw * ch;
        let lo = 0.5, hi = 8;
        for (let it = 0; it < 14; it++) {
          const s = (lo + hi) / 2; let n = 0;
          for (let y = cy0; y < cy0 + ch; y++) for (let x = cx0; x < cx0 + cw; x++) if (dst[(y * nw + x) * 4 + 3] * s >= 128) n++;
          if (n < target) lo = s; else hi = s;
        }
        const s = (lo + hi) / 2;
        for (let y = cy0; y < cy0 + ch; y++) for (let x = cx0; x < cx0 + cw; x++) { const i = (y * nw + x) * 4 + 3; dst[i] = Math.min(255, Math.round(dst[i] * s)); }
      }
    }
    levels.push({ data: dst, width: nw, height: nh });
    src = dst; w = nw; h = nh;
  }
  const tex = new THREE.DataTexture(d0, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.mipmaps = levels;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Atlasz-cella UV: u,v 0..1 a cellán belül, v=0 a levél töve
export function cellUV(k, u, v) {
  const col = k % 4, row = Math.floor(k / 4);
  return [(col + 0.01 + u * 0.98) / 4, 1 - (row + 1) / 2 + (0.01 + v * 0.98) / 2];
}

export function makeBark() {
  const S = 512;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  const rnd = mulberry32(99);
  ctx.fillStyle = '#5e5245'; ctx.fillRect(0, 0, S, S);
  const wrapRect = (x, y, w, h) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) ctx.fillRect(x + ox, y + oy, w, h); };
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `hsla(${22 + rnd() * 22},${8 + rnd() * 16}%,${20 + rnd() * 26}%,0.22)`;
    wrapRect(rnd() * S, rnd() * S, 3 + rnd() * 18, 10 + rnd() * 60);
  }
  for (let i = 0; i < 60; i++) {
    const x0 = rnd() * S, ph = rnd() * 9, dark = rnd();
    ctx.strokeStyle = `rgba(22,16,10,${0.3 + dark * 0.45})`; ctx.lineWidth = 1.5 + rnd() * 4.5;
    for (const ox of [-S, 0, S]) {
      ctx.beginPath();
      for (let y = -16; y <= S + 16; y += 16) { const x = x0 + ox + Math.sin(y * 0.021 + ph) * 7 + (rnd() - 0.5) * 3; y === -16 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 45; i++) {
    const x0 = rnd() * S, ph = rnd() * 9;
    ctx.strokeStyle = 'rgba(205,185,150,0.10)'; ctx.lineWidth = 2 + rnd() * 3;
    for (const ox of [-S, 0, S]) {
      ctx.beginPath();
      for (let y = -16; y <= S + 16; y += 16) { const x = x0 + ox + Math.sin(y * 0.021 + ph) * 7; y === -16 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  for (let i = 0; i < 80; i++) {
    const r = 3 + rnd() * 14;
    ctx.fillStyle = rnd() < 0.6 ? `rgba(170,190,140,${0.12 + rnd() * 0.15})` : `rgba(220,220,200,${0.1 + rnd() * 0.12})`;
    const x = rnd() * S, y = rnd() * S;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { ctx.beginPath(); ctx.ellipse(x + ox, y + oy, r, r * (0.6 + rnd() * 0.6), rnd() * 3, 0, 7); ctx.fill(); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeWing() {
  const S = 128;
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(2, 64);
    ctx.bezierCurveTo(30, 10, 100, -4, 124, 26);
    ctx.bezierCurveTo(118, 52, 96, 62, 70, 64);
    ctx.bezierCurveTo(96, 74, 110, 100, 92, 120);
    ctx.bezierCurveTo(60, 126, 20, 100, 2, 66);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = '#0c1220'; ctx.fill();
  ctx.save(); ctx.clip();
  const g = ctx.createRadialGradient(10, 64, 4, 10, 64, 100);
  g.addColorStop(0, '#9fe8ff'); g.addColorStop(0.45, '#1f8fff'); g.addColorStop(0.8, '#0a3fa8'); g.addColorStop(1, 'rgba(10,40,120,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#f4f4ea';
  for (const [x, y, r] of [[108, 30, 3.5], [100, 40, 2.5], [86, 104, 3], [96, 96, 2.2]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.restore();
  ctx.lineWidth = 5; ctx.strokeStyle = '#05080f'; shape(); ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
