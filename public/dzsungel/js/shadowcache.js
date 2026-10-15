// Árnyék-gyorsítótár: a statikus árnyékvetők (domborzat, fák, sziklák, romok) árnyéktérképét csak ritkán rajzoljuk
// újra (ha a nap érezhetően elfordult, az árnyék-kamera arrébb ugrott, vagy néhány másodperc eltelt), és eltároljuk.
// Minden más képkockában a tárolt térkép GPU-n belül visszamásolódik (blit), és csak a mozgó dolgok (karakter,
// állatok, lándzsa) rajzolódnak rá. Így az árnyékmenet háromszögszáma a töredékére esik.
// A three.js árnyékrajzolóját csomagoljuk be, mert az csak a renderer.render() belsejében hívható.
export class ShadowCache {
  constructor(renderer, light) {
    this.r = renderer; this.light = light;
    this.cache = null; this.valid = false; this.mode = null;
    this.staticCasters = []; this.dynCasters = [];
    this.age = 0; this.enabled = true; this.refreshes = 0;
    // a three.js az árnyékmenet elején törli a térképet; a második (mozgó) menetnél ezt kihagyjuk
    const clear = renderer.clear.bind(renderer);
    renderer.clear = (...a) => { if (this.skipClear) { this.skipClear = false; return; } clear(...a); };
    const SM = renderer.shadowMap, orig = SM.render.bind(SM);
    SM.render = (lights, scene, camera) => {
      if (!lights.includes(light)) { orig(lights, scene, camera); return; }
      if (!this.enabled) { this.setMode('all'); orig(lights, scene, camera); return; }
      const sh = light.shadow;
      if (!this.cache || !sh.map || this.cache.width !== sh.map.width || this.age > 4) this.valid = false;
      if (!this.valid) {
        this.setMode('static'); sh.needsUpdate = true;
        orig(lights, scene, camera);
        if (!sh.map) return;
        if (!this.cache || this.cache.width !== sh.map.width) { this.cache?.dispose(); this.cache = sh.map.clone(); }
        this.blit(sh.map, this.cache);
        this.valid = true; this.age = 0; this.refreshes++;
      } else this.blit(this.cache, sh.map);
      this.setMode('dyn'); sh.needsUpdate = true; this.skipClear = true;
      orig(lights, scene, camera);
      this.skipClear = false;
    };
    light.shadow.autoUpdate = false;
  }
  // árnyékvetők szétválogatása: a mozgó gyökerek (és leszármazottaik) dinamikusak, minden más statikus
  collect(scene, dynRoots) {
    const dyn = new Set();
    for (const r of dynRoots) r?.traverse?.((o) => dyn.add(o));
    this.staticCasters = []; this.dynCasters = [];
    scene.traverse((o) => {
      if (!(o.isMesh || o.isPoints || o.isLine)) return; // a fényforrásnak is van castShadow-ja, az nem árnyékvető
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
  blit(src, dst) {
    const r = this.r, gl = r.getContext(), P = r.properties;
    const prev = r.getRenderTarget(), face = r.getActiveCubeFace(), mip = r.getActiveMipmapLevel();
    r.setRenderTarget(src); const a = P.get(src).__webglFramebuffer;
    r.setRenderTarget(dst); const b = P.get(dst).__webglFramebuffer;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, a);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, b);
    gl.blitFramebuffer(0, 0, src.width, src.height, 0, 0, dst.width, dst.height, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, b);
    r.setRenderTarget(prev, face, mip);
  }
  // képkockánként a fő renderelés előtt (csak az időt léptetjük; a munka a becsomagolt árnyékrajzolóban történik)
  before(dt) { this.age += dt; this.light.shadow.needsUpdate = true; }
  after() { this.skipClear = false; }
}
