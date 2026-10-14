// Fotós PBR textúrák (Poly Haven, CC0) és esőerdő-HDRI betöltése; hiány esetén null (procedurális tartalék)
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const NAMES = ['leafy_grass', 'forest_leaves_02', 'mud_forest', 'rock_face_03', 'mossy_rock', 'bark_brown_02', 'palm_tree_bark'];

export async function loadAssets(renderer, progress) {
  const TL = new THREE.TextureLoader();
  const total = NAMES.length * 3 + 1;
  let done = 0;
  const step = (t) => { progress(++done / total); return t; };
  const load = (url, srgb) => TL.loadAsync(url).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return step(t);
  });
  try {
    const A = {};
    await Promise.all(NAMES.map(async (n) => {
      const [diff, nor, arm] = await Promise.all([load(`assets/${n}_diff.webp`, true), load(`assets/${n}_nor.webp`, false), load(`assets/${n}_arm.webp`, false)]);
      A[n] = { diff, nor, arm };
    }));
    const hdr = await new RGBELoader().loadAsync('assets/rainforest_trail_1k.hdr');
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    A.hdr = step(hdr);
    // feltöltés a GPU-ra most, ne az első képkockánál akadjon
    for (const n of NAMES) for (const t of Object.values(A[n])) renderer.initTexture(t);
    return A;
  } catch (e) {
    console.warn('PBR asset-ek nem tölthetők be, procedurális anyagok maradnak:', e);
    return null;
  }
}
