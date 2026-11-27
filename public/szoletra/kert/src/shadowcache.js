// Árnyék-gyorsítótár (a Dzsungel ötlete alapján, továbbfejlesztve): a kert statikus árnyéka csak ritkán rajzolódik újra
// (ha az árnyék-doboz arrébb lép, a nap elfordul, vagy eltelt pár másodperc), és eltároljuk egy másolatban.
// Képkockánként NEM másoljuk vissza a teljes térképet (az egy 4096-os térképnél drága), csak azt a kis téglalapot,
// ahová az előző képkockában a törpe rajzolódott; aztán a törpét rárajzoljuk az új helyére.
import * as THREE from 'three';

const _v = new THREE.Vector4();
export class ShadowCache {
  constructor(renderer, light) {
    this.r = renderer; this.light = light;
    this.cache = null; this.valid = false; this.mode = null;
    this.staticCasters = []; this.dynCasters = [];
    this.age = 0; this.enabled = true; this.refreshes = 0; this.maxAge = 15;
    this.dynPoint = null; this.dynRadius = 2.6; this.lastRect = null;
    const clear = renderer.clear.bind(renderer);
    renderer.clear = (...a) => { if (this.skipClear) { this.skipClear = false; return; } clear(...a); };
    const SM = renderer.shadowMap, orig = SM.render.bind(SM);
    SM.render = (lights, scene, camera) => {
      if (!lights.includes(light)) { orig(lights, scene, camera); return; }
      if (!this.enabled) { this.setMode('all'); orig(lights, scene, camera); return; }
      const sh = light.shadow;
      if (!this.cache || !sh.map || this.cache.width !== sh.map.width || this.age > this.maxAge) this.valid = false;
      if (!this.valid) {
        this.setMode('static'); sh.needsUpdate = true;
        orig(lights, scene, camera);
        if (!sh.map) return;
        if (!this.cache || this.cache.width !== sh.map.width) { this.cache?.dispose(); this.cache = sh.map.clone(); }
        this.blit(sh.map, this.cache, null);
        this.valid = true; this.age = 0; this.refreshes++; this.lastRect = null;
      } else if (this.lastRect) this.blit(this.cache, sh.map, this.lastRect);   // csak a törpe előző helyét állítjuk vissza
      this.setMode('dyn'); sh.needsUpdate = true; this.skipClear = true;
      orig(lights, scene, camera);
      this.skipClear = false;
      this.lastRect = this.rectFor(sh);
    };
    light.shadow.autoUpdate = false;
  }
  // a mozgó dolog befoglaló köre az árnyéktérkép texeleiben
  rectFor(sh) {
    if (!this.dynPoint || !sh.map) return null;
    const p = this.dynPoint(), W = sh.map.width, H = sh.map.height, cam = sh.camera;
    _v.set(p.x, p.y, p.z, 1).applyMatrix4(sh.matrix);
    const rx = this.dynRadius / (cam.right - cam.left) * W, ry = this.dynRadius / (cam.top - cam.bottom) * H;
    const cx = _v.x * W, cy = _v.y * H;
    const x0 = Math.max(0, Math.floor(cx - rx)), y0 = Math.max(0, Math.floor(cy - ry)), x1 = Math.min(W, Math.ceil(cx + rx)), y1 = Math.min(H, Math.ceil(cy + ry));
    return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
  }
  collect(scene, dynRoots) {
    const dyn = new Set();
    for (const r of dynRoots) r?.traverse?.((o) => dyn.add(o));
    this.staticCasters = []; this.dynCasters = [];
    scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine)) return;
      if (!o.castShadow && !o.userData.wasCaster) return;
      o.userData.wasCaster = true;
      (dyn.has(o) ? this.dynCasters : this.staticCasters).push(o);
    });
    this.invalidate();
  }
  invalidate() { this.valid = false; this.mode = null; }
  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    for (const o of this.staticCasters) o.castShadow = m !== 'dyn' && !o.userData.noShadow;
    for (const o of this.dynCasters) o.castShadow = m !== 'static';
  }
  blit(src, dst, rect) {
    const r = this.r, gl = r.getContext(), P = r.properties;
    const prev = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    r.setRenderTarget(src); const a = P.get(src).__webglFramebuffer;
    r.setRenderTarget(dst); const b = P.get(dst).__webglFramebuffer;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, a);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, b);
    const [x0, y0, x1, y1] = rect || [0, 0, src.width, src.height];
    gl.blitFramebuffer(x0, y0, x1, y1, x0, y0, x1, y1, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, b);
    r.setRenderTarget(prev, face, mip);
  }
  before(dt) { this.age += dt; this.light.shadow.needsUpdate = true; }
  after() { this.skipClear = false; }
}
