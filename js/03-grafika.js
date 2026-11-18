/* Kostkowe Lochy: Renderer three.js, światła, materiały z pikselową fakturą, shader wody i lawy, scalanie modeli.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= renderer ================= */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $('game'),
    antialias: true,
    powerPreference: 'high-performance',
  });
} catch (e) {
  $('fatal').hidden = false;
  throw e;
}
const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
let pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10262e);
scene.fog = new THREE.Fog(0x10262e, 30, 80);
const camera = new THREE.PerspectiveCamera(32, 1, 1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.85);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
{
  const c = sun.shadow.camera;
  c.left = -22;
  c.right = 22;
  c.top = 22;
  c.bottom = -22;
  c.near = 1;
  c.far = 95;
}
sun.shadow.bias = -0.0015;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);
// pula świateł punktowych: przypinane do najbliższych źródeł (kapliczki, latarnie, paleniska)
const LIGHTS = [];
for (let i = 0; i < 6; i++) {
  const l = new THREE.PointLight(0xffffff, 0, 9, 1.5);
  l.position.set(0, -100, 0);
  scene.add(l);
  LIGHTS.push(l);
}
const heroLight = new THREE.PointLight(0xffe2b8, 0, 9, 1.4);
heroLight.position.set(0, -100, 0);
scene.add(heroLight);
const world = new THREE.Group(),
  actors = new THREE.Group(),
  fxG = new THREE.Group();
scene.add(world, actors, fxG);

const BOX = new THREE.BoxGeometry(1, 1, 1);
const OCT = new THREE.OctahedronGeometry(1);
const GEM_GEO = new THREE.OctahedronGeometry(0.2);
const dummy = new THREE.Object3D(),
  tmpC = new THREE.Color(),
  tmpV = new THREE.Vector3();
const matCache = new Map();
function mat(c, e) {
  e = e || 0;
  const k = c + '_' + e;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, emissive: e });
    matCache.set(k, m);
  }
  return m;
}
function matT(c, op) {
  const k = 't' + c + '_' + op;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: op });
    matCache.set(k, m);
  }
  return m;
}
const FLASH = new THREE.MeshBasicMaterial({ color: 0xffffff });
function box(parent, w, h, d, color, x, y, z, em, ns) {
  const m = new THREE.Mesh(BOX, mat(color, em));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = !ns;
  m.userData.m = m.material;
  parent.add(m);
  return m;
}
function oct(parent, sx, sy, sz, color, x, y, z, em) {
  const m = new THREE.Mesh(OCT, mat(color, em));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.userData.m = m.material;
  parent.add(m);
  return m;
}
// pikselowa faktura nakładana w shaderze: stała gęstość na całym świecie, bez tekstur do pobrania
const TIMEU = { value: 0 };
const noiseTex = (function () {
  const n = 32,
    d = new Uint8Array(n * n * 4),
    r = mulberry(7);
  for (let i = 0; i < n * n; i++) {
    const q = r(),
      v = q < 0.12 ? 0 : q < 0.38 ? 80 : q < 0.74 ? 150 : q < 0.93 ? 210 : 255;
    d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
})();
function texMat(m, kind) {
  m.onBeforeCompile = sh => {
    sh.uniforms.tNoise = { value: noiseTex };
    sh.uniforms.uTime = TIMEU;
    let v = sh.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vTp; varying vec3 vTn; uniform float uTime;'
    );
    if (kind === 'char')
      v = v.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTp=position*2.0; vTn=normal;');
    else
      v = v.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvec4 tWp=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ntWp=instanceMatrix*tWp;\n#endif\ntWp=modelMatrix*tWp; vTp=tWp.xyz; vTn=normal;'
      );
    if (kind === 'leaf')
      v = v.replace(
        '#include <project_vertex>',
        'vec4 mvPosition=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nmvPosition=instanceMatrix*mvPosition;\n#endif\nmvPosition=modelMatrix*mvPosition;\nfloat tSw=clamp(0.3+mvPosition.y*0.3,0.0,1.0);\nmvPosition.x+=sin(uTime*1.6+mvPosition.x*0.9+mvPosition.z*0.7)*0.08*tSw;\nmvPosition.z+=cos(uTime*1.3+mvPosition.x*0.6-mvPosition.z*0.8)*0.06*tSw;\nmvPosition=viewMatrix*mvPosition;\ngl_Position=projectionMatrix*mvPosition;'
      );
    sh.vertexShader = v;
    let f = sh.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform sampler2D tNoise; varying vec3 vTp; varying vec3 vTn;'
    );
    f = f.replace(
      '#include <color_fragment>',
      '#include <color_fragment>\nvec3 tAn=abs(vTn); vec2 tUv=tAn.y>0.5?vTp.xz:(tAn.x>0.5?vTp.zy:vTp.xy);\ndiffuseColor.rgb*=0.915+texture2D(tNoise,tUv*0.25).r*0.17;' +
        (kind === 'tile'
          ? '\nvec2 tGf=abs(fract(tUv)-0.5); diffuseColor.rgb*=1.0-step(0.468,max(tGf.x,tGf.y))*0.085;'
          : '')
    );
    sh.fragmentShader = f;
  };
  m.customProgramCacheKey = () => 'tex-' + kind;
  return m;
}
const CHAR_MAT = texMat(new THREE.MeshLambertMaterial({ vertexColors: true }), 'char'),
  CHAR_GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
// scalanie klocków jednego przegubu w jedną siatkę: kilkakrotnie mniej wywołań rysowania na postać
const bakeCache = new Map(),
  BOXP = BOX.attributes.position.array,
  BOXN = BOX.attributes.normal.array,
  BOXI = BOX.index.array;
function mergeBoxes(list) {
  const n = list.length,
    pos = new Float32Array(n * 72),
    nor = new Float32Array(n * 72),
    col = new Float32Array(n * 72),
    idx = new Uint16Array(n * 36);
  for (let k = 0; k < n; k++) {
    const m = list[k],
      c = m.material.color,
      q = m.position,
      sc = m.scale,
      o = k * 72;
    for (let v = 0; v < 24; v++) {
      const a = o + v * 3,
        b = v * 3;
      pos[a] = BOXP[b] * sc.x + q.x;
      pos[a + 1] = BOXP[b + 1] * sc.y + q.y;
      pos[a + 2] = BOXP[b + 2] * sc.z + q.z;
      nor[a] = BOXN[b];
      nor[a + 1] = BOXN[b + 1];
      nor[a + 2] = BOXN[b + 2];
      col[a] = c.r;
      col[a + 1] = c.g;
      col[a + 2] = c.b;
    }
    for (let i = 0; i < 36; i++) idx[k * 36 + i] = BOXI[i] + k * 24;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
function bake(root, key) {
  const groups = [],
    frags = [];
  root.traverse(o => {
    if (!o.isMesh && !o.isSprite) groups.push(o);
  });
  groups.forEach((g, gi) => {
    const lit = [],
      glow = [];
    for (const c of g.children)
      if (c.isMesh && c.geometry === BOX && !c.material.transparent)
        (c.material.emissive.getHex() ? glow : lit).push(c);
    for (const c of lit.concat(glow)) {
      frags.push([
        g,
        c.position.x,
        c.position.y,
        c.position.z,
        (c.scale.x + c.scale.y + c.scale.z) / 3,
        c.material.color.getHex(),
      ]);
      g.remove(c);
    }
    for (const pair of [
      [lit, 'L', CHAR_MAT],
      [glow, 'G', CHAR_GLOW],
    ]) {
      if (!pair[0].length) continue;
      const k = key + '#' + gi + pair[1];
      let geo = bakeCache.get(k);
      if (!geo) {
        geo = mergeBoxes(pair[0]);
        bakeCache.set(k, geo);
      }
      const m = new THREE.Mesh(geo, pair[2]);
      m.castShadow = pair[1] === 'L';
      m.userData.m = pair[2];
      g.add(m);
    }
  });
  return frags;
}
function setFlash(e, on) {
  const a = e.meshes;
  for (let i = 0; i < a.length; i++) a[i].material = on ? FLASH : a[i].userData.m;
}
function shade(hex, l) {
  return tmpC.setHex(hex).offsetHSL(0, 0, l).getHex();
}

function dataTex(w, h, fn) {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = fn(w > 1 ? x / (w - 1) : 0, h > 1 ? y / (h - 1) : 0),
        i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(clamp(a, 0, 1) * 255);
    }
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
const glowTex = dataTex(64, 64, (u, v) => {
  const r = Math.hypot(u - 0.5, v - 0.5) * 2;
  return r >= 1 ? 0 : Math.pow(1 - r, 2.1);
});
const beamTex = dataTex(4, 64, (u, v) => Math.pow(1 - v, 1.7) * (0.5 + 0.5 * Math.sin(u * Math.PI)));
const glowMats = new Map();
function glowSprite(parent, c, size, x, y, z, op) {
  op = op === undefined ? 0.55 : op;
  const k = c + '_' + op;
  let m = glowMats.get(k);
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: glowTex,
      color: c,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: op,
    });
    glowMats.set(k, m);
  }
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  s.position.set(x, y, z);
  parent.add(s);
  return s;
}

// woda, lawa i wydmy: kratkowany, migoczący shader pod wyspami
const WATER_VS =
  'varying vec2 vW; varying float vD; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xz; vec4 mv=viewMatrix*wp; vD=-mv.z; gl_Position=projectionMatrix*mv; }';
const WATER_FS = [
  'uniform float time,cell,speed,sparkTh,crustTh,fogNear,fogFar; uniform vec3 cA,cB,cC,cD,fogColor; varying vec2 vW; varying float vD;',
  'float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }',
  'void main(){',
  '  vec2 p=floor(vW*cell); float h=hash(p), h2=hash(p+17.0);',
  '  float big=sin(time*0.5*speed+p.x*0.23-p.y*0.19)*0.5+0.5;',
  '  float fine=sin(time*1.4*speed+h*6.2832)*0.5+0.5;',
  '  vec3 col=mix(cA,cB,clamp(big*0.6+fine*0.25+h*0.2,0.0,1.0));',
  '  col=mix(col,cD,step(crustTh,h2+big*0.12));',
  '  col=mix(col,cC,step(sparkTh,fine*0.5+h*0.5));',
  '  gl_FragColor=vec4(mix(col,fogColor,smoothstep(fogNear,fogFar,vD)),1.0);',
  '}',
].join('\n');
function waterMat(w, bg) {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_VS,
    fragmentShader: WATER_FS,
    uniforms: {
      time: { value: 0 },
      cell: { value: w.cell },
      speed: { value: w.speed },
      sparkTh: { value: w.spark },
      crustTh: { value: w.crust },
      cA: { value: new THREE.Color(w.a) },
      cB: { value: new THREE.Color(w.b) },
      cC: { value: new THREE.Color(w.c) },
      cD: { value: new THREE.Color(w.d) },
      fogColor: { value: new THREE.Color(bg) },
      fogNear: { value: 30 },
      fogFar: { value: 80 },
    },
  });
}
