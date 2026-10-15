// Impostorok: a távoli fák előre lerajzolt képek. Betöltéskor minden fafajtáról (törzs + lomb) 8 irányból
// ortografikus kép készül egy atlaszba; játék közben a távoli fák helyén egy-egy kamera felé forduló lap áll,
// a nézőszöghöz legközelebbi képpel. Egy fa így 2 háromszög a több ezer helyett. Az árnyék-sugáron túl vannak,
// árnyékot nem kell vetniük; a köd ugyanaz, mint a valódi fáknál.
import * as THREE from 'three';
import { G, patch } from './shaders.js';

const VIEWS = 8, CELL = 256;

export class Impostors {
  // defs: [{ parts: [[geo, mat], ...], list: [{x,y,z,ry,s}], refs: [instRefs a törzs-batchből, instRefs a lomb-batchből], batches: [Batch, Batch] }]
  constructor(renderer, scene, defs) {
    this.defs = defs.filter((d) => d.list.length);
    const rows = this.defs.length;
    if (!rows) return;
    const W = CELL * VIEWS, H = CELL * rows;
    const atlas = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true });
    atlas.texture.generateMipmaps = true;
    atlas.texture.minFilter = THREE.LinearMipmapLinearFilter;
    atlas.texture.magFilter = THREE.LinearFilter;
    this.atlas = atlas;

    // sütés: semleges, felülről világos égbolt-fény (a játékban a napszakhoz igazítjuk a színét)
    const bake = new THREE.Scene();
    bake.add(new THREE.HemisphereLight(0xffffff, 0x8a8a78, Math.PI));
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    const prevAuto = renderer.autoClear;
    renderer.autoClear = false;
    this.meta = [];
    this.defs.forEach((d, row) => {
      const meshes = d.parts.map(([g, m]) => new THREE.Mesh(g, m));
      const box = new THREE.Box3();
      for (const m of meshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); bake.add(m); }
      const R = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) * 1.02;
      const y0 = box.min.y, y1 = box.max.y * 1.01;
      this.meta.push({ R, y0, y1 });
      cam.left = -R; cam.right = R; cam.bottom = y0; cam.top = y1; cam.near = 0.1; cam.far = R * 4 + 10; cam.updateProjectionMatrix();
      for (let k = 0; k < VIEWS; k++) {
        const a = (k / VIEWS) * Math.PI * 2, D = R * 2 + 5;
        cam.position.set(Math.sin(a) * D, 0, Math.cos(a) * D); cam.lookAt(0, 0, 0); cam.updateMatrixWorld();
        atlas.viewport.set(k * CELL, row * CELL, CELL, CELL);
        atlas.scissor.set(k * CELL, row * CELL, CELL, CELL); atlas.scissorTest = true;
        renderer.setRenderTarget(atlas);
        renderer.setClearColor(new THREE.Color(0.09, 0.13, 0.06), 0); // a lomb színe, átlátszó (a mipmap széle ne sötétüljön)
        renderer.clear(true, true, false);
        renderer.render(bake, cam);
      }
      for (const m of meshes) bake.remove(m);
    });
    atlas.scissorTest = false; atlas.viewport.set(0, 0, W, H);
    renderer.setRenderTarget(null);
    renderer.autoClear = prevAuto; renderer.setClearColor(prevClear, prevAlpha);

    // lapok: egyetlen instanced geometria, példányonként hely, forgatás, méret, atlasz-sor
    const total = this.defs.reduce((a, d) => a + d.list.length, 0);
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
    this.aS = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4);
    this.aP.setUsage(THREE.DynamicDrawUsage); this.aS.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aP', this.aP); g.setAttribute('aS', this.aS);
    g.instanceCount = total;
    this.items = [];
    let n = 0;
    this.defs.forEach((d, row) => {
      const M = this.meta[row];
      d.list.forEach((o, i) => {
        const s = o.s;
        this.aP.setXYZW(n, o.x, o.y, o.z, o.ry || 0);
        this.aS.setXYZW(n, 0, 0, row, 0); // 0 méret = rejtve, amíg közel van
        this.items.push({ n, d, i, x: o.x, z: o.z, w: 2 * M.R * s, h: (M.y1 - M.y0) * s, y0: M.y0 * s, row, imp: false });
        n++;
      });
    });
    this.lightCol = new THREE.Color(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ map: atlas.texture, alphaTest: 0.42, side: THREE.DoubleSide });
    mat.userData.u = { uImpCol: { value: this.lightCol }, uRows: { value: rows } };
    patch(mat, 'impostor', (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aP; attribute vec4 aS; uniform float uRows;')
        .replace('#include <begin_vertex>', `
vec3 ctr = aP.xyz;
vec3 toC = cameraPosition - ctr; toC.y = 0.0;
float lc = length(toC); vec3 dir = lc > 1e-4 ? toC / lc : vec3(0.0, 0.0, 1.0);
vec3 rgt = vec3(dir.z, 0.0, -dir.x);
vec3 transformed = ctr + rgt * position.x * aS.x + vec3(0.0, aS.w + position.y * aS.y, 0.0);
float ang = atan(dir.x, dir.z) - aP.w;
float fr = mod(floor(ang / (6.2831853 / ${VIEWS}.0) + 0.5), ${VIEWS}.0);
vMapUv = vec2((fr + uv.x) / ${VIEWS}.0, (aS.z + uv.y) / uRows);`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uImpCol;')
        .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\ndiffuseColor.rgb *= uImpCol; diffuseColor.a = 1.0;');
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
    scene.add(mesh);
    this.mesh = mesh;
  }

  // távolság szerinti váltás: a távoli fák valódi példányai elrejtve, helyettük a lap látszik
  update(px, pz, D, frac = 1) {
    if (!this.mesh) return;
    const D2 = D * D;
    let ch = false;
    for (const it of this.items) {
      const dx = it.x - px, dz = it.z - pz, far = dx * dx + dz * dz > D2;
      const ref = it.d.refs[0][it.i], on = ref.r < frac;
      if (far !== it.imp) {
        it.imp = far;
        it.d.batches.forEach((b, bi) => b.setImp(it.d.refs[bi][it.i], far));
      }
      const w = far && on ? it.w : 0;
      if (this.aS.getX(it.n) !== w) { this.aS.setXYZW(it.n, w, it.h, it.row, it.y0); ch = true; }
    }
    if (ch) this.aS.needsUpdate = true;
  }
  // a napszak fényéhez igazított szín (a valódi fák átlagos megvilágítását közelíti)
  setLight(sky) {
    if (!this.mesh) return;
    const h = sky.hemi, l = sky.light;
    this.lightCol.copy(h.color).multiplyScalar(h.intensity * 0.42)
      .add(new THREE.Color().copy(l.color).multiplyScalar(l.intensity * 0.16))
      .addScalar(sky.scene.environmentIntensity * 0.12)
      .multiplyScalar(0.74); // a valódi lomb önárnyékát és takarási árnyékát közelíti
  }
}
