// Valódi 3D növénymodellek (Poly Haven, CC0) betöltése + fotós levél-pecsétek a lombkorona-atlaszhoz
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { patch } from './shaders.js';
import { WIND } from './materials.js';

const DEFS = {
  fern: { file: 'fern_02/fern_02_1k.gltf', alpha: 'fern_02/textures/fern_02_alpha_1k.png' },
  anthurium: { file: 'anthurium_botany_01/anthurium_botany_01_1k.gltf', alpha: 'anthurium_botany_01/textures/anthurium_botany_01_alpha_1k.png' },
  calathea: { file: 'calathea_orbifolia_01/calathea_orbifolia_01_1k.gltf', alpha: 'calathea_orbifolia_01/textures/calathea_orbifolia_01_alpha_1k.png' },
  pachira: { file: 'pachira_aquatica_01/pachira_aquatica_01_1k.gltf', alpha: 'pachira_aquatica_01/textures/pachira_aquatica_01_alpha_1k.png' },
};

// Szél + átvilágítás a glTF anyagokra (MeshStandardMaterial marad, így HDRI-t és árnyékot is kap)
function leafify(mat, alpha, sway, flutter, key) {
  const u = { uSway: { value: sway }, uFlutter: { value: flutter } };
  if (alpha) { mat.alphaMap = alpha; mat.alphaTest = 0.5; mat.transparent = false; }
  mat.side = THREE.DoubleSide;
  mat.userData.u = u;
  patch(mat, key, sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;\nvarying vec3 vLW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
{ vec4 p4 = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  p4 = batchingMatrix * p4;
#endif
#ifdef USE_INSTANCING
  p4 = instanceMatrix * p4;
#endif
  vLW = (modelMatrix * p4).xyz; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLW;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{ vec3 vd = normalize(vLW - cameraPosition);
  float bl = pow(max(dot(vd, uSunDir), 0.0), 3.0);
  totalEmissiveRadiance += diffuseColor.rgb * vec3(1.1, 1.2, 0.55) * jDirAcc * bl * 0.8; }`);
  });
  let depth = null;
  if (alpha) {
    depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
    depth.userData.u = u;
    patch(depth, key + 'Depth', sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uSway;\nuniform float uFlutter;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND);
    });
  }
  return { mat, depth, u };
}

// A glTF-ben a változatok külön node-ok, egymás mellé tolva: a node-eltolást elhagyjuk, így mind az origóban áll
function variants(gltf) {
  const out = {};
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.computeBoundingSphere();
    const name = o.name || o.parent?.name || '';
    const suffix = name.split('_').pop();
    (out[o.material.name] ||= []).push({ geo: g, mat: o.material, suffix });
  });
  return out;
}

export async function loadPlants(renderer, progress) {
  const L = new GLTFLoader(), TL = new THREE.TextureLoader();
  const base = 'assets/models/';
  const keys = Object.keys(DEFS);
  const P = {};
  let done = 0;
  try {
    await Promise.all(keys.map(async (k) => {
      const d = DEFS[k];
      const [gltf, alpha] = await Promise.all([L.loadAsync(base + d.file), TL.loadAsync(base + d.alpha)]);
      alpha.flipY = false; // glTF-konvenció
      alpha.colorSpace = THREE.NoColorSpace;
      P[k] = { v: variants(gltf), alpha };
      progress(++done / (keys.length + 1));
    }));
    // fotós levél-pecsétek: vízigesztenye-levélcsoportok, egyedi széles levelek, halfarkú pálma levélkéje
    const loadImg = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
    const withAlpha = async (diffUrl, alphaUrl) => {
      const [di, ai] = await Promise.all([loadImg(diffUrl), loadImg(alphaUrl)]);
      const S = di.width, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(ai, 0, 0, S, S); const al = cx.getImageData(0, 0, S, S).data;
      cx.clearRect(0, 0, S, S); cx.drawImage(di, 0, 0);
      const img = cx.getImageData(0, 0, S, S);
      for (let i = 0; i < S * S; i++) img.data[i * 4 + 3] = al[i * 4];
      cx.putImageData(img, 0, 0);
      return cv;
    };
    const [pachira, island, fishtail] = await Promise.all([
      withAlpha('assets/leaves/pachira_leaves_diff_2k.webp', 'assets/leaves/pachira_leaves_alpha_2k.webp'),
      withAlpha('assets/leaves/island_tree_01_leaves_diff_2k.webp', 'assets/leaves/island_tree_01_leaves_alpha_2k.webp'),
      loadImg('assets/leaves/fishtailpalm_sideleaf.webp'),
    ]);
    P.leafPhoto = { pachira, island, fishtail };
    progress(1);
  } catch (e) {
    console.warn('Növénymodellek nem tölthetők be, procedurális növényzet marad:', e);
    return null;
  }

  // anyagok
  const fernV = Object.values(P.fern.v)[0];
  const fern = leafify(fernV[0].mat, P.fern.alpha, 0.05, 0.02, 'gFern');
  const anthV = Object.values(P.anthurium.v)[0];
  const anth = leafify(anthV[0].mat, P.anthurium.alpha, 0.05, 0.02, 'gAnth');
  const calV = Object.values(P.calathea.v)[0];
  const cal = leafify(calV[0].mat, P.calathea.alpha, 0.05, 0.02, 'gCal');
  const pv = P.pachira.v;
  const leafKey = Object.keys(pv).find((k) => k.includes('leaves')), barkKey = Object.keys(pv).find((k) => k.includes('bark'));
  const pLeaf = leafify(pv[leafKey][0].mat, P.pachira.alpha, 0.004, 0.04, 'gPachL');
  const pBark = leafify(pv[barkKey][0].mat, null, 0.004, 0, 'gPachB');
  // vízigesztenye: kéreg és lomb párosítása a node-név utótagja szerint (_a, _b, ...)
  const pairs = pv[barkKey].map((b) => ({ bark: b.geo, leaves: (pv[leafKey].find((l) => l.suffix === b.suffix) || pv[leafKey][0]).geo }));
  return {
    leafPhoto: P.leafPhoto,
    fern: { geos: fernV.map((x) => x.geo), ...fern },
    anthurium: { geos: anthV.map((x) => x.geo), ...anth },
    calathea: { geos: calV.map((x) => x.geo), ...cal },
    pachira: { pairs, leaf: pLeaf, bark: pBark },
  };
}
