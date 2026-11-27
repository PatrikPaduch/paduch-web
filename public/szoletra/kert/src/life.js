// Élet a kertben: pillangók, madárraj, pontyok a tóban és a csatornákban, kacsák, éjjel szentjánosbogarak, tűz a tálakban.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAKE, ISLAND, CANALS, P, heightAt } from './world.js';

const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _s = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _v = new THREE.Vector3(1, 1, 1);

export function makeLife(scene, q) {
  const root = new THREE.Group(); scene.add(root);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- pillangók ---------- */
  const NB = q.dens > .5 ? 40 : 16;
  const wingT = tex(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64); g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(2, 34); g.bezierCurveTo(10, 2, 58, 0, 60, 20); g.bezierCurveTo(62, 34, 40, 36, 30, 36); g.bezierCurveTo(46, 40, 52, 60, 34, 62); g.bezierCurveTo(18, 62, 8, 46, 2, 34); g.fill();
    g.strokeStyle = 'rgba(20,10,0,.75)'; g.lineWidth = 3; g.stroke(); g.lineWidth = 1.5; for (const [x, y] of [[50, 14], [40, 30], [36, 54]]) { g.beginPath(); g.moveTo(3, 34); g.lineTo(x, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y] of [[52, 18], [46, 24], [38, 56]]) { g.beginPath(); g.arc(x, y, 2.5, 0, 6.3); g.fill(); }
  });
  const wingG = new THREE.PlaneGeometry(.2, .2); wingG.translate(.1, 0, 0); wingG.rotateX(-Math.PI / 2);
  const wingM = new THREE.MeshStandardMaterial({ map: wingT, alphaTest: .5, side: THREE.DoubleSide, roughness: .7 });
  const wl = new THREE.InstancedMesh(wingG, wingM, NB), wr = new THREE.InstancedMesh(wingG, wingM, NB);
  const bcol = ['#f08a1c', '#3a7bff', '#fff6d8', '#ffd23a', '#e04a8a'];
  const bf = Array.from({ length: NB }, (_, i) => { const c = new THREE.Color(bcol[i % bcol.length]); wl.setColorAt(i, c); wr.setColorAt(i, c); return { ax: 0, az: 0, ay: 0, ph: rnd(0, 99), a: rnd(.3, .7), b: rnd(.4, .9), r: rnd(1.5, 3.5), set: false }; });
  wl.frustumCulled = wr.frustumCulled = false; root.add(wl, wr);
  const flowerSpots = P.flowers.length ? P.flowers : [{ x: 0, y: 0, z: 70 }];

  /* ---------- madárraj (magasan körözik) ---------- */
  const NBird = 16, birdG = mergeGeometries([new THREE.PlaneGeometry(.9, .28).translate(.45, 0, 0).rotateX(-Math.PI / 2), new THREE.PlaneGeometry(.9, .28).translate(-.45, 0, 0).rotateX(-Math.PI / 2)]);
  const birdM = new THREE.MeshStandardMaterial({ color: '#2a2622', side: THREE.DoubleSide, roughness: 1 });
  const birds = new THREE.InstancedMesh(birdG, birdM, NBird); birds.frustumCulled = false; root.add(birds);
  const bd = Array.from({ length: NBird }, () => ({ r: rnd(30, 60), h: rnd(38, 52), ph: rnd(0, 6.3), sp: rnd(.08, .13), fl: rnd(0, 9) }));

  /* ---------- pontyok és kacsák ---------- */
  const fishG = mergeGeometries([new THREE.SphereGeometry(1, 10, 6).scale(.12, .07, .34), new THREE.ConeGeometry(.1, .22, 4).rotateX(-Math.PI / 2).scale(1, .3, 1).translate(0, 0, -.42)].map(g => g.toNonIndexed()));
  const fishM = new THREE.MeshStandardMaterial({ roughness: .4 });
  const fish = [];
  for (let k = 0; k < 14; k++) fish.push({ kind: 'lake', f: rnd(.25, .8), ph: rnd(0, 6.3), sp: rnd(.05, .11) * (Math.random() < .5 ? -1 : 1) });
  for (const [a, b, c, d] of CANALS) for (let k = 0; k < 4; k++) fish.push({ kind: 'canal', x: (a + b) / 2 + rnd(-.8, .8), z0: c + 1, z1: d - 1, ph: rnd(0, 6.3), sp: rnd(.04, .08) });
  const fishI = new THREE.InstancedMesh(fishG, fishM, fish.length); fishI.frustumCulled = false; root.add(fishI);
  const fc = ['#ff7a1a', '#ffffff', '#ff5a2a', '#ffb020', '#f2f2f2'];
  fish.forEach((f, i) => fishI.setColorAt(i, new THREE.Color(fc[i % fc.length])));
  const duckG = mergeGeometries([new THREE.SphereGeometry(1, 12, 8).scale(.22, .16, .34).translate(0, .1, 0), new THREE.SphereGeometry(.11, 10, 8).translate(0, .32, .24), new THREE.ConeGeometry(.045, .14, 6).rotateX(Math.PI / 2).translate(0, .3, .38)].map(g => g.toNonIndexed()));
  const duckM = new THREE.MeshStandardMaterial({ roughness: .8 });
  const ducks = Array.from({ length: 5 }, (_, i) => ({ f: rnd(.55, .85), ph: i * 1.3, sp: rnd(.03, .05) * (i % 2 ? 1 : -1) }));
  const duckI = new THREE.InstancedMesh(duckG, duckM, ducks.length); root.add(duckI);
  ducks.forEach((d, i) => duckI.setColorAt(i, new THREE.Color(i % 2 ? '#f4f0e6' : '#7a5a3a')));

  /* ---------- szentjánosbogarak (éjjel, a törpe körül) ---------- */
  const NF = q.dens > .5 ? 160 : 60, fpos = new Float32Array(NF * 3), fbase = Array.from({ length: NF }, () => [rnd(-22, 22), rnd(.4, 2.6), rnd(-22, 22), rnd(0, 6.3)]);
  const fGeo = new THREE.BufferGeometry(); fGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fMat = new THREE.PointsMaterial({ color: '#d8ff6a', size: .16, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flies = new THREE.Points(fGeo, fMat); flies.frustumCulled = false; root.add(flies);

  /* ---------- tűz a bronz tálakban ---------- */
  const flameT = tex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(32, 96, 4, 32, 80, 60); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(.35, 'rgba(255,150,40,.9)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 80, 46, 124); g.lineTo(18, 124); g.quadraticCurveTo(2, 80, 32, 4); g.fill(); });
  const fires = [];
  for (const s of [-1, 1]) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.position.set(s * 7, 2.85, 55.5); sp.scale.set(.9, 1.5, 1); root.add(sp); fires.push(sp); }

  let t0 = 0;
  return {
    root,
    update(t, dt, me, dayF) {
      // pillangók: virágok fölött köröznek a törpe 30 m-es körzetében
      const showB = dayF > .3; wl.visible = wr.visible = showB;
      if (showB) bf.forEach((b, i) => {
        if (!b.set || Math.hypot(b.ax - me.x, b.az - me.z) > 32) { let f; for (let k = 0; k < 12; k++) { f = flowerSpots[Math.floor(Math.random() * flowerSpots.length)]; if (Math.hypot(f.x - me.x, f.z - me.z) < 28) break; } b.ax = f.x; b.az = f.z; b.ay = (f.y || 0) + .6; b.set = true; }
        const tt = t * b.a + b.ph, x = b.ax + Math.sin(tt) * b.r, z = b.az + Math.cos(tt * 1.3) * b.r, y = b.ay + .5 + Math.sin(t * b.b * 2 + b.ph) * .45;
        const hd = Math.atan2(Math.cos(tt) * b.r, -Math.sin(tt * 1.3) * b.r * 1.3), flap = Math.sin(t * 22 + b.ph) * 1.1;
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hd); _m.compose(_p.set(x, y, z), _q, _v);
        wl.setMatrixAt(i, _r.copy(_m).multiply(_s.makeRotationZ(flap)));
        wr.setMatrixAt(i, _r.copy(_m).multiply(_s.makeRotationZ(-flap)).multiply(new THREE.Matrix4().makeScale(-1, 1, 1)));
      });
      wl.instanceMatrix.needsUpdate = wr.instanceMatrix.needsUpdate = true;
      // madarak
      birds.visible = dayF > .2;
      bd.forEach((b, i) => { const a = t * b.sp + b.ph, x = Math.cos(a) * b.r, z = Math.sin(a) * b.r * .8 + 10, y = b.h + Math.sin(t * .5 + b.ph) * 2;
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a); _m.compose(_p.set(x, y, z), _q, _v); const fl = Math.sin(t * 7 + b.fl) * .5; birds.setMatrixAt(i, _r.copy(_m).multiply(_s.makeRotationZ(fl * .3)).multiply(new THREE.Matrix4().makeScale(1, 1 + fl * .4, 1))); });
      birds.instanceMatrix.needsUpdate = true;
      // halak
      fish.forEach((f, i) => {
        let x, z, hd;
        if (f.kind === 'lake') { const a = t * f.sp + f.ph; x = LAKE.cx + Math.cos(a) * LAKE.rx * f.f; z = LAKE.cz + Math.sin(a) * LAKE.rz * f.f; hd = Math.atan2(-Math.sin(a) * LAKE.rx * f.sp, Math.cos(a) * LAKE.rz * f.sp); if (Math.hypot(x - ISLAND.x, z - ISLAND.z) < ISLAND.r + 1) { x += 2.5; } }
        else { const u = (Math.sin(t * f.sp + f.ph) + 1) / 2; x = f.x + Math.sin(t * .7 + f.ph) * .3; z = f.z0 + (f.z1 - f.z0) * u; hd = Math.cos(t * f.sp + f.ph) > 0 ? 0 : Math.PI; }
        _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hd + Math.sin(t * 6 + f.ph) * .12); _m.compose(_p.set(x, f.kind === 'lake' ? .04 : .18, z), _q, _v); fishI.setMatrixAt(i, _m);
      });
      fishI.instanceMatrix.needsUpdate = true;
      ducks.forEach((d, i) => { const a = t * d.sp + d.ph, x = LAKE.cx + Math.cos(a) * LAKE.rx * d.f, z = LAKE.cz + Math.sin(a) * LAKE.rz * d.f;
        const hd = Math.atan2(-Math.sin(a) * LAKE.rx * d.sp, Math.cos(a) * LAKE.rz * d.sp); _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hd); _m.compose(_p.set(x, .08 + Math.sin(t * 2 + i) * .02, z), _q, _v); duckI.setMatrixAt(i, _m); });
      duckI.instanceMatrix.needsUpdate = true;
      // szentjánosbogarak
      const night = 1 - dayF; fMat.opacity = Math.max(0, night - .3) * (.7 + .3 * Math.sin(t * 3)); flies.visible = night > .3;
      if (flies.visible) for (let i = 0; i < NF; i++) { const [x, y, z, p] = fbase[i], wx = me.x + x + Math.sin(t * .4 + p) * 1.5, wz = me.z + z + Math.cos(t * .35 + p) * 1.5; fpos[i * 3] = wx; fpos[i * 3 + 1] = heightAt(wx, wz) + y + Math.sin(t * .7 + p * 2) * .4; fpos[i * 3 + 2] = wz; }
      fGeo.attributes.position.needsUpdate = true;
      for (const [k, f] of fires.entries()) { const s = 1 + Math.sin(t * 13 + k) * .08 + Math.sin(t * 7.3 + k * 2) * .06; f.scale.set(.9 * s, 1.5 * (2 - s), 1); }
    },
  };
}
