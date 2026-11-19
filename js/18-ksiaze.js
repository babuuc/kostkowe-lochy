/* Kostkowe Lochy: Książę Zmierzchu, ostateczny boss (etap 5, Cytadela Mroku). Walka ma pięć faz:
   1. Szermierz (100–80%): zamach w stożku, seria cięć, pchnięcie, fala wstrząsu, szarża i postawa riposty
      (cios mieczem w postawę zostaje sparowany i oddany obrotowym cięciem; wir i łuk działają).
   2. Taniec cieni (80–60%): mrok gęstnieje, Książę dzieli się na trzy postacie, które po kolei szarżują;
      tylko prawdziwy ma złotą koronę i daje się zranić. Dochodzą rzucane ostrza.
   3. Krwawy księżyc (60–40%): pęknięcia ziemi wyrzucają ogień w liniach, szarża zostawia płomienie, spadają meteory.
   4. Wieczna noc (40–20%): gasną światła, zostają trzy słupy światła. Pochłonięcie rani każdego poza słupem,
      a łańcuch przyciąga bohatera do Księcia, dopóki go nie zerwie unikiem.
   5. Ostatnie tchnienie (20–0%): Książę unosi się nad ziemią, krąży wokół niego sześć mieczy, a cięcia świata
      przecinają całą arenę; do tego spirale ostrzy i potrójne fale.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
const PRINCE_C = 0xff3a50;
const PRINCE_RIM = { value: new THREE.Vector4(1.0, 0.28, 0.34, 0.5) };
const PRINCE_MAT = (function () {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.tNoise = { value: noiseTex };
    sh.uniforms.uRim = PRINCE_RIM;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vTp; varying vec3 vTn; varying vec3 vRn; varying vec3 vRv;'
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTp = position * 2.0; vTn = normal;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvRn = normalize(normalMatrix * objectNormal); vRv = -mvPosition.xyz;'
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform sampler2D tNoise; uniform vec4 uRim; varying vec3 vTp; varying vec3 vTn; varying vec3 vRn; varying vec3 vRv;'
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nvec3 tAn = abs(vTn); vec2 tUv = tAn.y > 0.5 ? vTp.xz : (tAn.x > 0.5 ? vTp.zy : vTp.xy);\ndiffuseColor.rgb *= 0.9 + texture2D(tNoise, tUv * 0.25).r * 0.2;'
      )
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\nfloat rimF = 1.0 - max(dot(normalize(vRn), normalize(vRv)), 0.0);\ngl_FragColor.rgb += uRim.rgb * pow(rimF, 1.6) * uRim.a;'
      );
  };
  m.customProgramCacheKey = () => 'prince-rim';
  return m;
})();
{
  const w = new THREE.Mesh(BOX, PRINCE_MAT);
  w.visible = false;
  fxG.add(w);
}
function princeSkin(root) {
  root.traverse(o => {
    if (o.isMesh && o.material === CHAR_MAT) {
      o.material = PRINCE_MAT;
      o.userData.m = PRINCE_MAT;
    }
  });
}
const princeRuneMat = new THREE.MeshBasicMaterial({
  map: RUNE_TEX,
  color: PRINCE_C,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});
const princePoolMat = new THREE.MeshBasicMaterial({
  map: glowTex,
  color: PRINCE_C,
  transparent: true,
  opacity: 0.4,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});

/* ---------- model ---------- */
// Klocki bez obrotów (scalanie modelu bierze pod uwagę tylko położenie i rozmiar).
function buildPrince(root) {
  const steel = 0x332e3c,
    sd = 0x211c28,
    trim = PRINCE_C,
    gold = 0xd8a84a,
    bone = 0xd8d2c0,
    cloth = 0x56101e;
  const P = humanoid(root, {
    hands: false,
    feet: false,
    legH: 0.85,
    legW: 0.42,
    legC: sd,
    shinC: steel,
    bodyW: 1.25,
    bodyH: 1.15,
    bodyD: 0.75,
    bodyC: steel,
    headW: 0.62,
    headH: 0.6,
    headD: 0.62,
    headC: sd,
    armW: 0.4,
    armH: 1.15,
    armC: steel,
    foreC: sd,
  });
  P.prince = true;
  P.col = steel;
  P.lean = 0.05;
  const B = P.body,
    H = P.head;
  // napierśnik z pęknięciami pełnymi ognia
  box(B, 1.0, 0.72, 0.1, sd, 0, 0.64, 0.39);
  box(B, 0.06, 0.52, 0.04, trim, -0.2, 0.64, 0.45, trim, 1);
  box(B, 0.32, 0.05, 0.04, trim, -0.05, 0.52, 0.45, trim, 1);
  box(B, 0.05, 0.36, 0.04, trim, 0.18, 0.74, 0.45, trim, 1);
  box(B, 1.3, 0.16, 0.8, 0x14101a, 0, 0.1, 0, 0, 1);
  box(B, 0.26, 0.24, 0.06, bone, 0, 0.1, 0.43, 0, 1);
  for (const s of [-1, 1]) {
    box(B, 0.06, 0.06, 0.03, trim, s * 0.06, 0.13, 0.465, trim, 1);
    box(B, 0.5, 0.42, 0.1, steel, s * 0.3, -0.18, 0.38);
    const A = s < 0 ? P.armL : P.armR,
      E = s < 0 ? P.elbL : P.elbR,
      K = s < 0 ? P.kneeL : P.kneeR;
    box(A, 0.64, 0.34, 0.72, steel, 0, 0.12, 0);
    box(A, 0.68, 0.07, 0.76, gold, 0, -0.04, 0, 0, 1);
    box(A, 0.1, 0.42, 0.1, 0xb8b0c0, s * 0.12, 0.44, 0.1, 0, 1);
    box(A, 0.08, 0.3, 0.08, 0xb8b0c0, s * 0.18, 0.38, -0.16, 0, 1);
    box(E, 0.48, 0.3, 0.48, sd, 0, -0.42, 0, 0, 1);
    box(K, 0.48, 0.24, 0.52, steel, 0, -0.04, 0.06, 0, 1);
    box(K, 0.48, 0.14, 0.62, sd, 0, -0.38, 0.08, 0, 1);
  }
  box(B, 0.84, 0.22, 0.62, sd, 0, 1.12, 0, 0, 1);
  // hełm z rogami i koroną
  box(H, 0.68, 0.22, 0.68, steel, 0, 0.56, 0);
  box(H, 0.52, 0.36, 0.06, 0x120e16, 0, 0.3, 0.32, 0, 1);
  eye(P, H, 0.14, 0.06, trim, trim, -0.12, 0.34, 0.36);
  eye(P, H, 0.14, 0.06, trim, trim, 0.12, 0.34, 0.36);
  for (const s of [-1, 1]) {
    box(H, 0.14, 0.14, 0.14, bone, s * 0.4, 0.6, 0, 0, 1);
    box(H, 0.12, 0.3, 0.12, bone, s * 0.5, 0.8, 0, 0, 1);
    box(H, 0.1, 0.26, 0.1, bone, s * 0.54, 1.02, -0.06, 0, 1);
    box(H, 0.06, 0.16, 0.06, gold, s * 0.18, 0.74, 0.22, 0, 1);
    glowSprite(H, trim, 0.7, s * 0.12, 0.34, 0.4, 0.9);
  }
  box(H, 0.08, 0.24, 0.08, gold, 0, 0.78, 0.26, 0, 1);
  // płaszcz
  const cape = new THREE.Group();
  cape.position.set(0, 1.1, -0.42);
  B.add(cape);
  P.cape = cape;
  box(cape, 1.3, 1.45, 0.06, cloth, 0, -0.72, 0);
  box(cape, 1.1, 0.55, 0.06, shade(cloth, -0.05), 0, -1.65, -0.01);
  for (const [x, hh] of [
    [-0.42, 0.4],
    [-0.1, 0.3],
    [0.22, 0.42],
    [0.46, 0.32],
  ])
    box(cape, 0.2, hh, 0.06, shade(cloth, -0.08), x, -1.92 - hh / 2 + 0.1, -0.01, 0, 1);
  box(cape, 1.12, 0.05, 0.08, trim, 0, -1.9, 0, trim, 1);
  // wielki miecz w prawej dłoni
  const E = P.elbR;
  box(E, 0.14, 0.14, 0.14, gold, 0, -0.38, 0, 0, 1);
  box(E, 0.1, 0.3, 0.1, 0x2a1a14, 0, -0.55, 0, 0, 1);
  box(E, 0.74, 0.1, 0.16, gold, 0, -0.72, 0, 0, 1);
  box(E, 0.2, 2.5, 0.08, 0x9aa0b0, 0, -2.0, 0);
  box(E, 0.06, 2.3, 0.1, trim, 0, -1.95, 0, trim, 1);
  box(E, 0.12, 0.2, 0.08, 0x9aa0b0, 0, -3.32, 0, 0, 1);
  P.bladeGlow = glowSprite(E, trim, 1.6, 0, -2.0, 0, 0.45);
  P.tip = new THREE.Object3D();
  P.tip.position.set(0, -3.3, 0);
  E.add(P.tip);
  P.tipA = new THREE.Object3D();
  P.tipA.position.set(0, -0.9, 0);
  E.add(P.tipA);
  // poświata i krąg run pod stopami
  const pool = new THREE.Mesh(POOL_GEO, princePoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.04;
  pool.scale.set(4.4, 4.4, 1);
  root.add(pool);
  P.runes = new THREE.Mesh(POOL_GEO, princeRuneMat);
  P.runes.rotation.x = -Math.PI / 2;
  P.runes.position.y = 0.06;
  P.runes.scale.set(3.4, 3.4, 1);
  root.add(P.runes);
  return P;
}

/* ---------- ostrzeżenia w kształcie stożka ---------- */
const coneGeos = new Map();
function coneGeo(arc) {
  let g = coneGeos.get(arc);
  if (!g) {
    g = new THREE.CircleGeometry(1, 28, -Math.PI / 2 - arc / 2, arc);
    coneGeos.set(arc, g);
  }
  return g;
}
const cones = [];
for (let i = 0; i < 4; i++) {
  const g = new THREE.Group(),
    ma = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.2, depthWrite: false }),
    mb = new THREE.MeshBasicMaterial({ color: 0xff3040, transparent: true, opacity: 0.4, depthWrite: false }),
    a = new THREE.Mesh(coneGeo(2.4), ma),
    b = new THREE.Mesh(coneGeo(2.4), mb);
  a.rotation.x = b.rotation.x = -Math.PI / 2;
  b.position.y = 0.01;
  g.add(a, b);
  g.visible = false;
  fxG.add(g);
  cones.push({ g, a, b, t: 0, dur: 1, r: 1, x: 0, z: 0 });
}
function coneTele(x, z, face, arc, r, dur) {
  const c = cones.find(c => c.t <= 0) || cones[0];
  c.a.geometry = c.b.geometry = coneGeo(arc);
  c.g.position.set(x, 0.05, z);
  c.g.rotation.y = face;
  c.a.scale.setScalar(r);
  c.b.scale.setScalar(0.01);
  c.t = c.dur = dur;
  c.r = r;
  c.x = x + Math.sin(face) * r * 0.5;
  c.z = z + Math.cos(face) * r * 0.5;
  c.g.visible = true;
}
function inCone(px, pz, x, z, face, arc, r) {
  const dx = px - x,
    dz = pz - z,
    d = Math.hypot(dx, dz);
  return d < r && (d < 0.8 || Math.abs(angDiff(face, Math.atan2(dx, dz))) < arc / 2);
}

/* ---------- fale wstrząsu, strefy ognia, meteory ---------- */
const QUAKE_GEO = new THREE.CylinderGeometry(1, 1, 0.9, 56, 1, true);
const quakes = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(
    QUAKE_GEO,
    new THREE.MeshBasicMaterial({
      map: beamTex,
      color: 0xff4050,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  m.visible = false;
  fxG.add(m);
  quakes.push({ m, t: 0, x: 0, z: 0, R: 0, hit: false, dmg: 0 });
}
const fireZones = [];
for (let i = 0; i < 16; i++) {
  const m = new THREE.Mesh(
    POOL_GEO,
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xff5030,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  fxG.add(m);
  fireZones.push({ m, t: 0, x: 0, z: 0, r: 1, tick: 0 });
}
function fireZone(x, z, r, t) {
  const f = fireZones.find(f => f.t <= 0) || fireZones[0];
  f.x = x;
  f.z = z;
  f.r = r;
  f.t = t;
  f.tick = 0;
  f.m.position.set(x, 0.07, z);
  f.m.scale.set(r * 2.6, r * 2.6, 1);
  f.m.visible = true;
}
const meteors = [];
for (let i = 0; i < 10; i++) {
  const m = new THREE.Mesh(BOX, mat(0xff8060, 0xc02a10));
  m.scale.setScalar(0.7);
  m.visible = false;
  fxG.add(m);
  meteors.push({ m, t: 0, x: 0, z: 0, dmg: 0 });
}
function updatePrinceFx(dt) {
  for (const c of cones) {
    if (c.t <= 0) continue;
    c.t -= dt;
    c.b.scale.setScalar(Math.max(0.01, c.r * (1 - Math.max(0, c.t) / c.dur)));
    if (c.t <= 0) c.g.visible = false;
  }
  for (const q of quakes) {
    if (q.t <= 0) continue;
    q.t -= dt;
    q.R += dt * 7.5;
    q.m.position.set(q.x, 0.45, q.z);
    q.m.scale.set(q.R, 1, q.R);
    q.m.material.opacity = 0.85 * Math.min(1, q.t / 0.4);
    if (!q.hit && !hero.dead && state === 'play') {
      const d = Math.hypot(hero.x - q.x, hero.z - q.z);
      if (Math.abs(d - q.R) < 0.55) {
        q.hit = true;
        hurt(hero, q.dmg, q.x, q.z, 9);
      }
    }
    if (q.t <= 0) q.m.visible = false;
  }
  for (const f of fireZones) {
    if (f.t <= 0) continue;
    f.t -= dt;
    f.m.material.opacity = Math.min(0.75, f.t) * (0.8 + Math.sin(time * 14 + f.x) * 0.2);
    if (Math.random() < 0.3)
      burst(
        f.x + rnd(-f.r, f.r) * 0.7,
        0.2,
        f.z + rnd(-f.r, f.r) * 0.7,
        Math.random() < 0.5 ? 0xff5030 : 0xffb060,
        1,
        0.8,
        0.09,
        0.6,
        -3
      );
    f.tick -= dt;
    if (f.tick <= 0 && state === 'play') {
      f.tick = 0.5;
      if (
        !hero.dead &&
        Math.hypot(hero.x - f.x, hero.z - f.z) < f.r + hero.r * 0.4 &&
        hero.rollT <= 0 &&
        hero.inv <= 0
      )
        hurt(hero, 8, f.x, f.z, 0);
    }
    if (f.t <= 0) f.m.visible = false;
  }
  for (const m of meteors) {
    if (m.t <= 0) continue;
    m.t -= dt;
    if (m.t < 0.4) {
      m.m.visible = true;
      const k = 1 - m.t / 0.4;
      m.m.position.set(m.x - 2 + 2 * k, 14 - 14 * k, m.z - 1 + k);
      m.m.rotation.set(time * 5, time * 4, 0);
      if (Math.random() < 0.8)
        burst(m.m.position.x, m.m.position.y, m.m.position.z, 0xff8040, 1, 0.5, 0.2, 0.4, 0);
    }
    if (m.t <= 0) {
      m.m.visible = false;
      explodeFx(m.x, m.z, 1.8, 0xff5a20);
      waveFx(m.x, m.z, 0.4, 2.2, 0xff6030, 0.4);
      burst(m.x, 0.4, m.z, 0xff8040, 18, 7, 0.16, 0.6);
      debris.burst(m.x, 0.3, m.z, theme.side[0], 6, 6, 0.2, 0.8);
      decal(m.x, m.z, 1.4, 3);
      sfx.meteor();
      if (Math.hypot(hero.x - m.x, hero.z - m.z) < 7) shake(0.35);
      if (!hero.dead && Math.hypot(hero.x - m.x, hero.z - m.z) < 1.5 + hero.r * 0.4)
        hurt(hero, m.dmg, m.x, m.z, 8);
      fireZone(m.x, m.z, 1.2, 3);
    }
  }
}
function princeClear() {
  for (const c of cones) {
    c.t = 0;
    c.g.visible = false;
  }
  for (const q of quakes) {
    q.t = 0;
    q.m.visible = false;
  }
  for (const f of fireZones) {
    f.t = 0;
    f.m.visible = false;
  }
  for (const m of meteors) {
    m.t = 0;
    m.m.visible = false;
  }
}

/* ---------- dodatkowe efekty: smuga miecza, linie, słupy światła, łańcuch, krążące miecze ---------- */
// smuga za mieczem Księcia (taka sama zasada jak u bohatera, osobne bufory)
const PT_N = 12,
  ptPos = new Float32Array(PT_N * 6),
  ptGeo = new THREE.BufferGeometry(),
  ptS = [];
{
  const uv = new Float32Array(PT_N * 4),
    idx = [];
  for (let i = 0; i < PT_N; i++) {
    const u = i / (PT_N - 1);
    uv.set([u, 0, u, 1], i * 4);
    if (i < PT_N - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
  ptGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  ptGeo.setIndex(idx);
}
const ptMesh = new THREE.Mesh(
  ptGeo,
  new THREE.MeshBasicMaterial({
    map: dataTex(32, 2, u => Math.pow(1 - u, 1.3)),
    color: 0xff6a7a,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  })
);
ptMesh.frustumCulled = false;
ptMesh.visible = false;
fxG.add(ptMesh);
function princeTrail(u, on, dt) {
  for (const p of ptS) p.t += dt;
  while (ptS.length && ptS[ptS.length - 1].t > 0.16) ptS.pop();
  if (on) {
    u.root.updateMatrixWorld(true);
    u.parts.tipA.getWorldPosition(tmpV);
    u.parts.tip.getWorldPosition(tmpV2);
    ptS.unshift({ p: [tmpV.x, tmpV.y, tmpV.z, tmpV2.x, tmpV2.y, tmpV2.z], t: 0 });
    if (ptS.length > PT_N) ptS.pop();
  }
  const n = ptS.length;
  if (n < 2) {
    ptMesh.visible = false;
    return;
  }
  for (let i = 0; i < PT_N; i++) ptPos.set(ptS[Math.min(i, n - 1)].p, i * 6);
  ptGeo.attributes.position.needsUpdate = true;
  ptGeo.setDrawRange(0, (n - 1) * 6);
  ptMesh.visible = true;
}
// linie ostrzegawcze tej klatki (szarże, pchnięcia, pęknięcia, cięcia świata): rysuje je aimLine, a mrok wycina pod nimi światło
const pLines = [];
function lineTele(x0, z0, x1, z1, k, w) {
  aimLine(x0, z0, x1, z1, k, w, 0.07);
  pLines.push({ x0, z0, x1, z1, w });
}
function segD(px, pz, x0, z0, x1, z1) {
  const vx = x1 - x0,
    vz = z1 - z0,
    t = clamp(((px - x0) * vx + (pz - z0) * vz) / (vx * vx + vz * vz || 1), 0, 1);
  return Math.hypot(px - (x0 + vx * t), pz - (z0 + vz * t));
}
// błysk cięcia wzdłuż linii
const cuts = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(
    BOX,
    new THREE.MeshBasicMaterial({
      color: 0xffd0d8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  m.visible = false;
  fxG.add(m);
  cuts.push({ m, t: 0 });
}
function cutFx(x0, z0, x1, z1, w) {
  const c = cuts.find(c => c.t <= 0) || cuts[0],
    dx = x1 - x0,
    dz = z1 - z0;
  c.t = 0.35;
  c.m.position.set((x0 + x1) / 2, 0.6, (z0 + z1) / 2);
  c.m.rotation.set(0, Math.atan2(dx, dz), 0);
  c.m.scale.set(w, 0.12, Math.hypot(dx, dz));
  c.m.visible = true;
}
// słupy światła z fazy 4: jedyne bezpieczne miejsca przed Pochłonięciem
const pillars = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group(),
    beam = new THREE.Mesh(
      BEAM_GEO,
      new THREE.MeshBasicMaterial({
        map: beamTex,
        color: 0xfff0b0,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    ),
    ring = new THREE.Mesh(
      RING_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      })
    );
  beam.position.y = 6.5;
  beam.scale.set(4.4, 1, 4.4);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  ring.scale.setScalar(0.95);
  g.add(beam, ring);
  glowSprite(g, 0xffe08a, 3.4, 0, 1.2, 0, 0.5);
  g.visible = false;
  fxG.add(g);
  pillars.push({ g, on: false, x: 0, z: 0 });
}
const PILLAR_R = 2.0;
function inPillar(x, z) {
  return pillars.some(p => p.on && Math.hypot(x - p.x, z - p.z) < PILLAR_R);
}
// łańcuch z fazy 4
const chainM = new THREE.Mesh(BOX, mat(0x8a8494, 0x401018));
chainM.visible = false;
fxG.add(chainM);
// sześć mieczy krążących wokół Księcia w fazie 5
const orbitGeo = (function () {
  const parts = [],
    add = (w, h, d, x, y, z, c) => {
      const m = new THREE.Mesh(BOX, mat(c));
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      parts.push(m);
    };
  add(0.14, 2.0, 0.06, 0, 0, 0, 0xffb0b8);
  add(0.05, 1.8, 0.08, 0, 0, 0, 0xff3a50);
  add(0.5, 0.08, 0.12, 0, 1.0, 0, 0xffd080);
  add(0.08, 0.3, 0.08, 0, 1.2, 0, 0x5a2a20);
  return mergeBoxes(parts);
})();
const orbit = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(orbitGeo, CHAR_GLOW);
  m.visible = false;
  fxG.add(m);
  orbit.push(m);
}
let orbitOn = false,
  orbitR = 3,
  orbitHitT = 0;

function updatePrinceFx2(dt) {
  for (const c of cuts) {
    if (c.t <= 0) continue;
    c.t -= dt;
    c.m.material.opacity = Math.max(0, c.t / 0.35) * 0.95;
    if (c.t <= 0) c.m.visible = false;
  }
  for (const p of pillars) {
    if (!p.on) continue;
    p.g.children[1].rotation.z += dt;
    p.g.children[0].material.opacity = 0.45 + Math.sin(time * 3 + p.x) * 0.12;
  }
  const b = boss && boss.def.prince && !boss.dead ? boss : null;
  // krążące miecze
  const show = !!(b && orbitOn && b.spawnT <= 0);
  for (let i = 0; i < 6; i++) orbit[i].visible = show;
  if (show) {
    orbitR = 4 + Math.sin(time * 1.4) * 1.6;
    if (orbitHitT > 0) orbitHitT -= dt;
    for (let i = 0; i < 6; i++) {
      const a = time * 1.5 + (i * TAU) / 6,
        x = b.x + Math.sin(a) * orbitR,
        z = b.z + Math.cos(a) * orbitR;
      orbit[i].position.set(x, 1.4 + Math.sin(time * 3 + i) * 0.25, z);
      orbit[i].rotation.set(Math.PI / 2, a + Math.PI / 2, time * 4);
      if (
        state === 'play' &&
        orbitHitT <= 0 &&
        !hero.dead &&
        Math.hypot(hero.x - x, hero.z - z) < 0.9 + hero.r &&
        hurt(hero, b.dmg * 0.5, x, z, 9)
      )
        orbitHitT = 0.7;
      if (Math.random() < 0.15) burst(x, 1.4, z, 0xff6070, 1, 0.4, 0.08, 0.3, 0);
    }
  }
  // łańcuch przyciągający bohatera
  const h = hero;
  if (h.chainT > 0 && b && !h.dead) {
    h.chainT -= dt;
    const dx = b.x - h.x,
      dz = b.z - h.z,
      d = Math.hypot(dx, dz) || 1;
    if (h.rollT > 0) {
      h.chainT = 0;
      dmgNum(h.x, h.h + 0.6, h.z, 'zerwany!', 'crit');
      burst(h.x, 1, h.z, 0xc8c0d0, 12, 5, 0.1, 0.4);
      sfx.block();
    } else if (d > 2.4) moveCircle(h, (dx / d) * 7 * dt, (dz / d) * 7 * dt);
    chainM.visible = h.chainT > 0;
    chainM.position.set((h.x + b.x) / 2, 1.2, (h.z + b.z) / 2);
    chainM.rotation.set(0, Math.atan2(dx, dz), 0);
    chainM.scale.set(0.12, 0.12, d);
  } else {
    if (h.chainT > 0 && (!b || h.dead)) h.chainT = 0;
    chainM.visible = false;
  }
}
function princeClear2() {
  for (const c of cuts) {
    c.t = 0;
    c.m.visible = false;
  }
  for (const p of pillars) {
    p.on = false;
    p.g.visible = false;
  }
  orbitOn = false;
  for (const m of orbit) m.visible = false;
  chainM.visible = false;
  hero.chainT = 0;
  ptS.length = 0;
  ptMesh.visible = false;
}

/* ---------- zasady walki ---------- */
const PHASES = [
  null,
  { name: 'Szermierz Zmierzchu' },
  {
    name: 'Taniec cieni',
    hint: 'Książę dzieli się na trzy postacie. Tylko ta ze złotą koroną jest prawdziwa.',
  },
  { name: 'Krwawy księżyc', hint: 'Pęknięcia ziemi wyrzucają ogień. Nie stój na świecących liniach.' },
  {
    name: 'Wieczna noc',
    hint: 'Przed Pochłonięciem schowaj się w słupie światła. Łańcuch zerwiesz unikiem.',
  },
  { name: 'Ostatnie tchnienie', hint: 'Wokół Księcia krążą miecze, a cięcia przecinają całą arenę.' },
];
function princePhase(u) {
  const f = u.hp / u.maxHp;
  return f > 0.8 ? 1 : f > 0.6 ? 2 : f > 0.4 ? 3 : f > 0.2 ? 4 : 5;
}
function princeImmune(u) {
  return u.invT > 0 || !!u.vanish;
}
// cios mieczem w postawę riposty: parowanie i kontra (wywoływane z heroStrike)
function princeParry(u) {
  const a = u.act;
  if (!a || a.kind !== 'riposte' || a.parried) return;
  a.parried = true;
  a.ct = a.t + 0.28;
  dmgNum(u.x, u.h + 0.8, u.z, 'sparowane!', 'crit');
  burst(u.x, 2.2, u.z, 0xffe0a0, 16, 6, 0.1, 0.4);
  flash(u.x, 2, u.z, 0xffe0a0, 1.6, 0.25, 8);
  telegraph(u.x, u.z, 4.4, 0.28);
  sfx.block();
}
function princeStartPhase(u, ph) {
  // przerwany taniec cieni: Książę wraca na widok, a pozostałe cienie znikają
  u.vanish = false;
  u.dash = null;
  for (const sh of units)
    if (sh.def.shade && !sh.dead) {
      burst(sh.x, 2, sh.z, 0x5a2a6a, 20, 4, 0.16, 0.6, -1);
      die(sh, true);
    }
  u.act = { kind: 'roar', t: 0, ph };
  u.invT = 2.2;
  u.cd = 1;
  princeClear();
  for (const c of cuts) c.t = 0;
  hero.chainT = 0;
  slowmo = Math.max(slowmo, 0.5);
  if (ph === 5)
    for (const p of pillars) {
      p.on = false;
      p.g.visible = false;
    }
  const P = PHASES[ph];
  banner('Faza ' + ph + ': ' + P.name, P.hint || '', 3);
}
function princeChoose(u, d) {
  const ph = u.ph,
    w = [];
  const add = (kind, wt, ok) => {
    if (ok !== false) w.push([kind, wt]);
  };
  const near = d < 4.8;
  add('sweep', near ? 3 : 0.4);
  add('combo', near ? 2.5 : 0.3, ph !== 5);
  add('thrust', d < 8 ? 1.6 : 0.5);
  add('quake', 1.6);
  add('riposte', near ? 1.2 : 0.2, ph <= 4 && u.ripCd <= 0);
  add('dash', d > 6 ? 2.5 : 0.6, u.dashCd <= 0);
  add('blades', d > 4 ? 1.6 : 0.6, ph >= 2);
  add('dance', 2.2, ph === 2 && u.danceCd <= 0);
  add('fissures', 1.8, ph >= 3 && u.fisCd <= 0);
  add('meteors', 1.3, ph >= 3 && u.meteorCd <= 0);
  add('devour', 3, ph === 4 && u.devCd <= 0);
  add('chain', 1.6, ph >= 4 && u.chainCd <= 0 && d > 4);
  add('worldcut', 2.6, ph === 5 && u.cutCd <= 0);
  add('spiral', 1.6, ph === 5 && u.spiralCd <= 0);
  let sum = 0;
  for (const x of w) sum += x[1];
  let r = Math.random() * sum;
  for (const x of w) {
    r -= x[1];
    if (r <= 0) return { kind: x[0], t: 0, n: 0 };
  }
  return { kind: 'sweep', t: 0, n: 0 };
}
function princeHitCone(u, arc, r, dmg, kb) {
  if (!hero.dead && inCone(hero.x, hero.z, u.x, u.z, u.face, arc, r + hero.r)) hurt(hero, dmg, u.x, u.z, kb);
  for (const g of units)
    if (g.team === 0 && !g.dead && inCone(g.x, g.z, u.x, u.z, u.face, arc, r + g.r))
      hurt(g, dmg, u.x, u.z, kb);
}
function hitLine(x0, z0, x1, z1, w, dmg, kb) {
  if (!hero.dead && segD(hero.x, hero.z, x0, z0, x1, z1) < w / 2 + hero.r * 0.5) hurt(hero, dmg, x0, z0, kb);
}
function princeAct(u, a, dt) {
  const t = a.t,
    ph = u.ph,
    fast = ph >= 3 ? 0.82 : 1;
  const faceHero = () => {
    if (!hero.dead) u.face = Math.atan2(hero.x - u.x, hero.z - u.z);
  };
  const end = cd => {
    u.act = null;
    u.cd = cd * fast;
  };
  const first = t === dt;
  if (a.kind === 'roar') {
    // przejście fazy: ryk, uniesiony miecz i fala odpychająca
    if (!a.done && t >= 0.7) {
      a.done = true;
      waveFx(u.x, u.z, 0.6, 10, PRINCE_C, 0.9);
      waveFx(u.x, u.z, 0.4, 6, 0xffffff, 0.6);
      burst(u.x, 3, u.z, PRINCE_C, 60, 10, 0.2, 1.2);
      flash(u.x, 3, u.z, PRINCE_C, 3.2, 0.9, 20);
      shake(1);
      sfx.boss();
      const dx = hero.x - u.x,
        dz = hero.z - u.z,
        d = Math.hypot(dx, dz) || 1;
      if (!hero.dead && d < 8) {
        hero.kx += (dx / d) * 18;
        hero.kz += (dz / d) * 18;
      }
      if (a.ph === 4) princePillars(u);
      if (a.ph === 5) orbitOn = true;
    }
    if (t >= 1.7) {
      u.act = a.ph === 2 ? { kind: 'dance', t: 0, n: 0 } : a.ph === 4 ? { kind: 'devour', t: 0, n: 0 } : null;
      u.cd = 0.6;
    }
  } else if (a.kind === 'sweep') {
    // zamach w stożku; od fazy 2 drugi w przeciwną stronę
    const W = 0.8 * fast,
      twice = ph >= 2;
    if (a.n === 0 && first) {
      faceHero();
      coneTele(u.x, u.z, u.face, 2.4, 4.8, W);
      sfx.wail();
    }
    if (a.n === 0 && t >= W) {
      a.n = 1;
      princeHitCone(u, 2.4, 4.8, u.dmg, 12);
      slashFx(u.x, u.z, u.face, 1, 1.85, 0xff8090);
      sfx.sweep();
      shake(0.4);
      if (twice) {
        faceHero();
        coneTele(u.x, u.z, u.face, 2.4, 4.8, 0.5 * fast);
      }
    }
    if (twice && a.n === 1 && t >= W + 0.5 * fast) {
      a.n = 2;
      princeHitCone(u, 2.4, 4.8, u.dmg, 12);
      slashFx(u.x, u.z, u.face, -1, 1.85, 0xff8090);
      sfx.sweep();
      shake(0.4);
    }
    if (t >= W + (twice ? 1.1 : 0.55) * fast) end(1.1);
  } else if (a.kind === 'combo') {
    // trzy szybkie cięcia z wypadem
    const step = 0.5 * fast;
    if (t >= a.n * step && a.n < 3 && !a.tele) {
      faceHero();
      coneTele(u.x, u.z, u.face, 1.6, 3.4, step * 0.85);
      a.tele = true;
      a.at = a.n * step + step * 0.85;
    }
    if (a.tele && t >= a.at) {
      a.tele = false;
      a.n++;
      moveCircle(u, Math.sin(u.face) * 1.4, Math.cos(u.face) * 1.4);
      princeHitCone(u, 1.6, 3.4, u.dmg * 0.7, 8);
      slashFx(u.x, u.z, u.face, a.n % 2 ? 1 : -1, 1.3, 0xff8090);
      sfx.swing(a.n === 3);
    }
    if (a.n >= 3 && t >= 3 * step + 0.3) end(1.2);
  } else if (a.kind === 'thrust') {
    // pchnięcie: długa, wąska linia i wypad do przodu
    const W = 0.65 * fast,
      len = 7.5;
    if (first) {
      faceHero();
      a.dx = Math.sin(u.face);
      a.dz = Math.cos(u.face);
    }
    if (t < W) lineTele(u.x, u.z, u.x + a.dx * len, u.z + a.dz * len, t / W, 1.5);
    else if (!a.done) {
      a.done = true;
      const x0 = u.x,
        z0 = u.z;
      hitLine(x0, z0, x0 + a.dx * len, z0 + a.dz * len, 1.5, u.dmg * 0.9, 12);
      moveCircle(u, a.dx * 4, a.dz * 4);
      cutFx(x0, z0, x0 + a.dx * len, z0 + a.dz * len, 0.5);
      burst(u.x + a.dx * 2, 1.2, u.z + a.dz * 2, 0xff8090, 14, 6, 0.1, 0.4);
      sfx.sweep();
      shake(0.35);
    }
    if (t >= W + 0.6) end(1.0);
  } else if (a.kind === 'riposte') {
    // postawa riposty: cios mieczem zostanie sparowany i oddany obrotem; jeśli nikt nie uderzy, Książę pchnie
    if (first) {
      faceHero();
      sfx.wail();
    }
    if (a.parried) {
      if (!a.cdone && t >= a.ct) {
        a.cdone = true;
        if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < 4.4 + hero.r)
          hurt(hero, u.dmg * 1.3, u.x, u.z, 16);
        waveFx(u.x, u.z, 0.6, 4.4, 0xffe0a0, 0.35);
        slashFx(u.x, u.z, u.face, 1, 1.75, 0xffe0a0);
        slashFx(u.x, u.z, u.face + Math.PI, 1, 1.75, 0xffe0a0);
        sfx.sweep();
        shake(0.6);
      }
      if (t >= a.ct + 0.6) {
        u.ripCd = 7;
        end(0.8);
      }
    } else if (t >= 2.2) {
      u.ripCd = 7;
      u.act = { kind: 'thrust', t: 0, n: 0 };
    }
  } else if (a.kind === 'quake') {
    // uderzenie w ziemię i rosnące pierścienie (liczba rośnie z fazą)
    const W = 0.9 * fast,
      rings = Math.min(3, Math.ceil(ph / 1.6));
    if (first) {
      telegraph(u.x, u.z, 3, W);
      sfx.wail();
    }
    if (!a.done && t >= W) {
      a.done = true;
      a.rings = 0;
      waveFx(u.x, u.z, 0.6, 3.4, 0xff5a4a, 0.35);
      burst(u.x, 0.3, u.z, theme.dust, 18, 6, 0.18, 0.5);
      debris.burst(u.x, 0.2, u.z, theme.side[1], 10, 6, 0.2, 0.8);
      decal(u.x, u.z, 3, 3);
      dustFx(u.x, u.z, 3);
      flash(u.x, 1, u.z, PRINCE_C, 2, 0.35, 12);
      sfx.quake();
      shake(0.7);
      if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < 3 + hero.r * 0.5)
        hurt(hero, u.dmg, u.x, u.z, 13);
    }
    if (a.done && a.rings < rings && t >= W + a.rings * 0.55) {
      const q = quakes.find(q => q.t <= 0);
      if (q) {
        q.x = u.x;
        q.z = u.z;
        q.R = 1.2;
        q.t = 1.9;
        q.hit = false;
        q.dmg = u.dmg * 0.7;
        q.m.visible = true;
      }
      a.rings++;
      if (a.rings > 1) sfx.quake();
    }
    if (t >= W + rings * 0.55 + 0.4) end(1.3);
  } else if (a.kind === 'dash') {
    // szarża; od fazy 3 zostawia ogień
    const W = 0.75 * fast,
      len = 12;
    if (first) {
      faceHero();
      a.dx = Math.sin(u.face);
      a.dz = Math.cos(u.face);
      sfx.wail();
    }
    if (t < W) lineTele(u.x, u.z, u.x + a.dx * len, u.z + a.dz * len, t / W, 2.2);
    else {
      if (!a.go) {
        a.go = true;
        a.left = len;
        a.trail = 0;
        sfx.dash();
      }
      if (a.left > 0) {
        const st = Math.min(a.left, 30 * dt),
          ox = u.x,
          oz = u.z;
        moveCircle(u, a.dx * st, a.dz * st);
        a.left = Math.hypot(u.x - ox, u.z - oz) < st * 0.3 ? 0 : a.left - st;
        burst(u.x, 1.2, u.z, PRINCE_C, 2, 1.2, 0.14, 0.4, 0);
        if (ph >= 3) {
          a.trail += st;
          if (a.trail > 1.6) {
            a.trail = 0;
            fireZone(u.x, u.z, 1.1, 4);
          }
        }
        if (
          !a.hit &&
          !hero.dead &&
          Math.hypot(hero.x - u.x, hero.z - u.z) < u.r * u.baseScale * 0.6 + hero.r + 0.4
        ) {
          a.hit = true;
          hurt(hero, u.dmg * 1.1, u.x - a.dx, u.z - a.dz, 14);
        }
      } else {
        u.dashCd = 6;
        end(1.0);
      }
    }
  } else if (a.kind === 'blades') {
    // rzucane ostrza (3, od fazy 3 pięć)
    const W = 0.55 * fast,
      n = ph >= 3 ? 5 : 3,
      spread = ph >= 3 ? 1.0 : 0.6;
    if (first) faceHero();
    const base = Math.atan2(hero.x - u.x, hero.z - u.z);
    if (t < W) {
      for (let q = 0; q < n; q++) {
        const ang = base - spread / 2 + (spread * q) / (n - 1);
        aimLine(
          u.x + Math.sin(ang) * 1.5,
          u.z + Math.cos(ang) * 1.5,
          u.x + Math.sin(ang) * 8,
          u.z + Math.cos(ang) * 8,
          t / W,
          0.06 + (t / W) * 0.08,
          0.9
        );
      }
    } else if (!a.done) {
      a.done = true;
      for (let q = 0; q < n; q++) {
        const ang = base - spread / 2 + (spread * q) / (n - 1);
        shoot(
          u.x + Math.sin(ang) * 1.5,
          u.z + Math.cos(ang) * 1.5,
          Math.sin(ang),
          Math.cos(ang),
          10,
          1,
          u.dmg * 0.5,
          'blade'
        );
      }
      slashFx(u.x, u.z, u.face, 1, 1.3, 0xff8090);
      sfx.sweep();
    }
    if (t >= W + 0.5) end(1.1);
  } else if (a.kind === 'dance') {
    // taniec cieni: trzy postacie na okręgu wokół bohatera szarżują po kolei; prawdziwa ma koronę
    if (first) {
      u.vanish = true;
      burst(u.x, 2, u.z, 0x2a0a14, 40, 6, 0.2, 1.0, -1);
      sfx.wail();
      const real = (Math.random() * 3) | 0,
        a0 = rnd(TAU);
      a.spots = [];
      for (let k = 0; k < 3; k++) {
        let x = hero.x,
          z = hero.z;
        for (let tr = 0; tr < 10; tr++) {
          const ang = a0 + (k * TAU) / 3 + rnd(-0.3, 0.3),
            r = rnd(6, 7.5);
          if (canStand(hero.x + Math.sin(ang) * r, hero.z + Math.cos(ang) * r, 0.6)) {
            x = hero.x + Math.sin(ang) * r;
            z = hero.z + Math.cos(ang) * r;
            break;
          }
        }
        a.spots.push({ x, z, real: k === real });
      }
      a.order = [0, 1, 2].sort(() => Math.random() - 0.5);
      a.shades = [];
      for (const s of a.spots) {
        if (s.real) continue;
        const sh = makeUnit('shade', s.x, s.z, null);
        sh.noLoot = true;
        sh.spawnT = sh.spawnDur = 0.5;
        sh.face = Math.atan2(hero.x - s.x, hero.z - s.z);
        sh.minionOf = u;
        a.shades.push(sh);
        s.unit = sh;
      }
    }
    if (t >= 0.6 && u.vanish && !a.placed) {
      a.placed = true;
      const s = a.spots.find(s => s.real);
      u.x = s.x;
      u.z = s.z;
      u.vanish = false;
      u.invT = 0;
      faceHero();
      burst(u.x, 2, u.z, PRINCE_C, 20, 5, 0.16, 0.6);
    }
    // kolejne szarże co 1,1 s
    const turn = Math.floor((t - 0.9) / 1.1);
    if (t >= 0.9 && turn < 3 && turn >= a.n) {
      a.n = turn + 1;
      const s = a.spots[a.order[turn]];
      const who = s.real ? u : s.unit;
      if (who && !who.dead) {
        const dx = hero.x - who.x,
          dz = hero.z - who.z,
          d = Math.hypot(dx, dz) || 1;
        who.dash = { dx: dx / d, dz: dz / d, t: 0, len: d + 4, go: false };
      }
    }
    for (const s of a.spots) {
      const who = s.real ? u : s.unit;
      if (!who || who.dead || !who.dash) continue;
      const q = who.dash;
      q.t += dt;
      if (q.t < 0.7) lineTele(who.x, who.z, who.x + q.dx * q.len, who.z + q.dz * q.len, q.t / 0.7, 2);
      else {
        if (!q.go) {
          q.go = true;
          sfx.dash();
        }
        if (q.len > 0) {
          const st = Math.min(q.len, 26 * dt);
          moveCircle(who, q.dx * st, q.dz * st);
          q.len -= st;
          who.face = Math.atan2(q.dx, q.dz);
          burst(who.x, 1.2, who.z, s.real ? PRINCE_C : 0x5a2a6a, 2, 1, 0.12, 0.4, 0);
          if (!q.hit && !hero.dead && Math.hypot(hero.x - who.x, hero.z - who.z) < 1.6 + hero.r) {
            q.hit = true;
            hurt(hero, u.dmg * 0.9, who.x - q.dx, who.z - q.dz, 12);
          }
        } else who.dash = null;
      }
    }
    if (t >= 0.9 + 3 * 1.1 + 0.6) {
      for (const sh of a.shades)
        if (!sh.dead) {
          burst(sh.x, 2, sh.z, 0x5a2a6a, 20, 4, 0.16, 0.6, -1);
          die(sh, true);
        }
      u.dash = null;
      u.danceCd = 13;
      end(1.0);
    }
  } else if (a.kind === 'fissures') {
    // pęknięcia: pięć linii ognia rozchodzących się od Księcia
    const W = 1.0 * fast;
    if (first) {
      a.ang = Math.atan2(hero.x - u.x, hero.z - u.z);
      sfx.wail();
    }
    const lines = [];
    for (let k = 0; k < 5; k++) {
      const ang = a.ang + (k * TAU) / 5;
      lines.push([
        u.x + Math.sin(ang) * 1.6,
        u.z + Math.cos(ang) * 1.6,
        u.x + Math.sin(ang) * 13,
        u.z + Math.cos(ang) * 13,
      ]);
    }
    if (t < W) for (const l of lines) lineTele(l[0], l[1], l[2], l[3], t / W, 1.4);
    else if (!a.done) {
      a.done = true;
      for (const l of lines) {
        hitLine(l[0], l[1], l[2], l[3], 1.4, u.dmg * 0.8, 8);
        for (let k = 0; k <= 6; k++) {
          const x = lerp(l[0], l[2], k / 6),
            z = lerp(l[1], l[3], k / 6);
          if (walkAt(x, z)) fireZone(x, z, 0.9, 3.5);
        }
        cutFx(l[0], l[1], l[2], l[3], 0.6);
      }
      sfx.quake();
      shake(0.6);
      u.fisCd = 9;
    }
    if (t >= W + 0.6) end(1.0);
  } else if (a.kind === 'meteors') {
    // deszcz meteorów wokół bohatera
    const count = ph >= 5 ? 9 : 7;
    if (t >= a.n * 0.28 && a.n < count) {
      const f0 = a.n === 0,
        ang = rnd(TAU),
        r = f0 ? 0 : rnd(1.5, 4),
        x = hero.x + Math.sin(ang) * r + (f0 ? hero.vx * 0.5 : 0),
        z = hero.z + Math.cos(ang) * r + (f0 ? hero.vz * 0.5 : 0),
        m = meteors.find(m => m.t <= 0);
      if (m) {
        m.x = x;
        m.z = z;
        m.t = 1.1;
        m.dmg = u.dmg * 0.7;
        telegraph(x, z, 1.5, 1.1);
      }
      a.n++;
    }
    if (a.n >= count && t >= count * 0.28 + 1.2) {
      u.meteorCd = 9;
      end(1.0);
    }
  } else if (a.kind === 'devour') {
    // Pochłonięcie: tylko w słupie światła jest bezpiecznie; unik nie chroni
    const W = 3.2;
    if (first) {
      if (!pillars.some(p => p.on)) princePillars(u);
      telegraph(u.x, u.z, 14, W);
      sfx.wail();
      banner('Pochłonięcie!', 'Schowaj się w słupie światła.', 2);
    }
    if (t < W && Math.random() < 0.7) {
      const ang = rnd(TAU),
        r = rnd(5, 10);
      burst(u.x + Math.sin(ang) * r, 0.5, u.z + Math.cos(ang) * r, 0x2a0a14, 1, 2, 0.2, 0.6, -2);
    }
    if (!a.done && t >= W) {
      a.done = true;
      waveFx(u.x, u.z, 1, 15, 0x200008, 0.8);
      waveFx(u.x, u.z, 0.6, 12, PRINCE_C, 0.6);
      flash(u.x, 2, u.z, 0x400010, 3, 0.8, 30);
      shake(1);
      sfx.boom();
      if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < 14 && !inPillar(hero.x, hero.z)) {
        hero.rollT = 0;
        hero.inv = 0;
        hurt(hero, hero.maxHp * 0.55, u.x, u.z, 10);
      }
      for (const g of units) if (g.team === 0 && !g.dead && !inPillar(g.x, g.z)) hurt(g, 999, u.x, u.z, 0);
      // słupy przenoszą się na nowe miejsca na następny raz
      princePillars(u);
    }
    if (t >= W + 0.8) {
      u.devCd = 14;
      end(1.2);
    }
  } else if (a.kind === 'chain') {
    // łańcuch: jeśli trafi, przyciąga bohatera, dopóki ten nie zrobi uniku
    const W = 0.8 * fast;
    if (first) {
      faceHero();
      a.dx = Math.sin(u.face);
      a.dz = Math.cos(u.face);
      a.len = Math.min(12, Math.hypot(hero.x - u.x, hero.z - u.z) + 2);
    }
    if (t < W) lineTele(u.x, u.z, u.x + a.dx * a.len, u.z + a.dz * a.len, t / W, 0.9);
    else if (!a.done) {
      a.done = true;
      sfx.dash();
      cutFx(u.x, u.z, u.x + a.dx * a.len, u.z + a.dz * a.len, 0.2);
      if (
        !hero.dead &&
        hero.rollT <= 0 &&
        hero.inv <= 0 &&
        segD(hero.x, hero.z, u.x, u.z, u.x + a.dx * a.len, u.z + a.dz * a.len) < 0.9
      ) {
        hero.chainT = 1.6;
        dmgNum(hero.x, hero.h + 0.6, hero.z, 'unik zerwie łańcuch!', 'hurt');
      }
    }
    if (t >= W + 0.5) {
      u.chainCd = 8;
      // przyciągniętego bohatera czeka zamach
      u.act = hero.chainT > 0 ? { kind: 'sweep', t: 0, n: 0 } : null;
      u.cd = 0.6;
    }
  } else if (a.kind === 'worldcut') {
    // cięcia świata: trzy linie przez całą arenę, tuż obok bohatera
    const W = 1.25;
    if (first) {
      a.lines = [];
      for (let k = 0; k < 3; k++) {
        const ang = rnd(TAU),
          off = k === 0 ? 0 : rnd(-3.5, 3.5),
          px = hero.x + Math.cos(ang) * off,
          pz = hero.z - Math.sin(ang) * off;
        a.lines.push([
          px - Math.sin(ang) * 15,
          pz - Math.cos(ang) * 15,
          px + Math.sin(ang) * 15,
          pz + Math.cos(ang) * 15,
        ]);
      }
      sfx.wail();
    }
    if (t < W) for (const l of a.lines) lineTele(l[0], l[1], l[2], l[3], t / W, 1.8);
    else if (!a.done) {
      a.done = true;
      for (const l of a.lines) {
        hitLine(l[0], l[1], l[2], l[3], 1.8, u.dmg, 12);
        cutFx(l[0], l[1], l[2], l[3], 0.7);
      }
      flash(hero.x, 2, hero.z, 0xffd0d8, 2.4, 0.3, 14);
      sfx.sweep();
      shake(0.8);
    }
    if (t >= W + 0.5) {
      u.cutCd = 6;
      end(0.9);
    }
  } else if (a.kind === 'spiral') {
    // spirala ostrzy w czterech ramionach
    if (first) sfx.wail();
    if (t >= 0.5 && t < 2.8 && t >= (a.next || 0.5)) {
      a.next = t + 0.13;
      a.ang = (a.ang || 0) + 0.27;
      for (let k = 0; k < 4; k++) {
        const ang = a.ang + (k * TAU) / 4;
        shoot(
          u.x + Math.sin(ang) * 1.6,
          u.z + Math.cos(ang) * 1.6,
          Math.sin(ang),
          Math.cos(ang),
          7.5,
          1,
          u.dmg * 0.4,
          'blade'
        );
      }
    }
    if (t >= 3.1) {
      u.spiralCd = 9;
      end(1.2);
    }
  }
}
function princePillars(u) {
  const a0 = rnd(TAU);
  pillars.forEach((p, k) => {
    let x = u.x,
      z = u.z;
    for (let tr = 0; tr < 14; tr++) {
      const ang = a0 + (k * TAU) / 3 + rnd(-0.4, 0.4),
        r = rnd(5.5, 7.5),
        px = u.x + Math.sin(ang) * r,
        pz = u.z + Math.cos(ang) * r;
      if (canStand(px, pz, 0.8) && fieldHero[cellOf(px, pz)] >= 0) {
        x = px;
        z = pz;
        break;
      }
    }
    p.x = x;
    p.z = z;
    p.on = true;
    p.g.position.set(x, 0, z);
    p.g.visible = true;
    burst(x, 1, z, 0xffe08a, 14, 4, 0.12, 0.7, -3);
  });
}
// cienie z tańca: kopie Księcia, które giną od jednego ciosu
function shadeSkin(root) {
  root.traverse(o => {
    if (o.isMesh && o.material === CHAR_MAT) {
      o.material = SHADE_MAT;
      o.userData.m = SHADE_MAT;
    }
  });
}
const SHADE_MAT = new THREE.MeshLambertMaterial({
  color: 0x3a1a4a,
  emissive: 0x12051a,
  transparent: true,
  opacity: 0.72,
});
function updateShade(u, dt) {
  if (u.spawnT > 0) u.spawnT -= dt;
  if (Math.random() < 0.3)
    burst(u.x + rnd(-0.6, 0.6), rnd(0.5, 3), u.z + rnd(-0.6, 0.6), 0x5a2a6a, 1, 0.4, 0.1, 0.7, -1.5);
}
function updatePrince(u, dt) {
  if (u.spawnT > 0) {
    u.spawnT -= dt;
    return;
  }
  if (u.ph === undefined) {
    u.ph = 1;
    u.act = null;
    u.invT = 0;
    u.cd = 1.6;
    u.vanish = false;
    u.dashCd = 3;
    u.meteorCd = 0;
    u.ripCd = 4;
    u.danceCd = 0;
    u.fisCd = 0;
    u.devCd = 0;
    u.chainCd = 3;
    u.cutCd = 0;
    u.spiralCd = 4;
  }
  for (const k of [
    'invT',
    'dashCd',
    'meteorCd',
    'ripCd',
    'danceCd',
    'fisCd',
    'devCd',
    'chainCd',
    'cutCd',
    'spiralCd',
  ])
    if (u[k] > 0) u[k] -= dt;
  const ph = princePhase(u);
  if (ph > u.ph) {
    u.ph = ph;
    princeStartPhase(u, ph);
  }
  const dx = hero.x - u.x,
    dz = hero.z - u.z,
    d = Math.hypot(dx, dz) || 0.001;
  let mx = 0,
    mz = 0;
  const a = u.act;
  if (a) {
    a.t += dt;
    princeAct(u, a, dt);
  } else if (!hero.dead) {
    if (d > 3.4) {
      steerTo(u, hero, d);
      mx = DIR.x;
      mz = DIR.z;
    }
    u.face = angLerp(u.face, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt));
    if (u.cd <= 0 && u.invT <= 0) u.act = princeChoose(u, d);
  }
  const sp = u.spd * (u.ph >= 3 ? 1.2 : 1) * (u.ph === 5 ? 1.1 : 1);
  u.vx = damp(u.vx, mx * sp, 8, dt);
  u.vz = damp(u.vz, mz * sp, 8, dt);
  if (Math.abs(u.vx) + Math.abs(u.vz) > 0.02) moveCircle(u, u.vx * dt, u.vz * dt);
}

/* ---------- animacja ---------- */
function animPrince(u, dt) {
  const P = u.parts,
    a = u.act,
    t = a ? a.t : 0,
    sp = Math.hypot(u.vx, u.vz),
    mv = clamp(sp / u.spd, 0, 1),
    shade = !!u.def.shade,
    dashing = (a && (a.kind === 'dash' || a.kind === 'thrust') && (a.go || a.done)) || (u.dash && u.dash.go);
  if (mv > 0.05 || dashing) u.phase += dt * (3 + Math.max(sp, dashing ? 8 : 0) * 1.4);
  const sn = Math.sin(u.phase),
    cs = Math.cos(u.phase),
    walk = dashing ? 1 : mv;
  // ciężkie kroki: pył przy każdym postawieniu stopy
  const side = sn >= 0 ? 1 : -1;
  if (side !== u.stepS) {
    u.stepS = side;
    if (walk > 0.4 && u.ph !== 5) burst(u.x, 0.1, u.z, theme.dust, 4, 2, 0.16, 0.4, 3);
  }
  let ar = -0.5,
    er = -0.3,
    al = -0.2 + sn * 0.3 * walk,
    el = -0.4,
    alz = 0,
    arz = 0,
    bx = 0.06 + walk * 0.12,
    by = 0,
    hx = 0,
    y = 0,
    lam = 12,
    legBend = 0,
    trail = false,
    spin = 0;
  if (a) {
    const k = a.kind;
    if (k === 'roar') {
      const q = Math.min(1, t / 0.6);
      ar = al = -1.2 * q;
      arz = 1.1 * q;
      alz = -1.1 * q;
      er = el = 0;
      bx = -0.35 * q;
      hx = -0.5 * q;
      if (t > 0.7 && t < 1.2) {
        ar = -3;
        arz = 0.2;
      }
    } else if (k === 'sweep') {
      const W = 0.8 * (u.ph >= 3 ? 0.82 : 1);
      ar = -1.4;
      er = -0.1;
      by = t < W ? 0.9 * (t / W) * (a.n === 1 ? -1 : 1) : a.n === 1 ? -0.9 : 0.9;
      lam = t < W ? 12 : 30;
      trail = t >= W - 0.05 && t < W + 0.25;
      legBend = 0.3;
    } else if (k === 'combo') {
      ar = a.tele ? -2.8 : -0.5;
      er = a.tele ? -0.4 : 0;
      bx = a.tele ? -0.2 : 0.4;
      lam = a.tele ? 10 : 35;
      trail = !a.tele;
    } else if (k === 'thrust') {
      ar = a.done ? -1.55 : -1.3;
      er = a.done ? 0 : -1.4;
      bx = a.done ? 0.45 : -0.1;
      by = a.done ? 0 : 0.5;
      legBend = 0.5;
      trail = a.done && t < 0.9;
    } else if (k === 'riposte') {
      if (a.parried) {
        spin = Math.min(1, (t - a.ct + 0.28) / 0.45) * TAU;
        ar = -1.5;
        trail = true;
      } else {
        ar = -1.5;
        er = -1.2;
        by = 0.7;
        legBend = 0.9;
        y = -0.3;
        bx = 0.15;
      }
    } else if (k === 'quake') {
      if (!a.done) {
        ar = al = -3.0;
        er = el = -0.2;
        bx = -0.3;
        y = Math.sin(Math.min(1, t / 0.9) * Math.PI) * 0.6;
      } else {
        ar = al = -0.5;
        bx = 0.5;
        lam = 30;
        legBend = 0.6;
      }
    } else if (k === 'dash') {
      ar = a.go ? 0.6 : -0.9;
      bx = a.go ? 0.55 : 0.2;
    } else if (k === 'blades') {
      ar = -1.5;
      by = a.done ? -0.7 : 0.7;
      lam = a.done ? 30 : 10;
      trail = a.done && t < 0.8;
    } else if (k === 'meteors' || k === 'worldcut') {
      ar = al = -3.1;
      er = el = 0;
      hx = -0.3;
      if (k === 'worldcut' && a.done) {
        ar = al = -0.6;
        bx = 0.5;
        lam = 30;
        trail = t < 1.6;
      }
    } else if (k === 'fissures') {
      ar = al = a.done ? -0.4 : -2.9;
      bx = a.done ? 0.6 : -0.3;
      legBend = a.done ? 0.8 : 0;
      lam = a.done ? 30 : 10;
    } else if (k === 'devour') {
      ar = al = -2.4;
      arz = 0.9;
      alz = -0.9;
      hx = -0.45;
      y = Math.min(1.6, t * 0.8);
    } else if (k === 'chain') {
      al = a.done ? -1.6 : -0.6;
      el = 0;
      by = a.done ? -0.5 : 0.4;
    } else if (k === 'spiral') {
      ar = al = -1.6;
      arz = 0.6;
      alz = -0.6;
      spin = t * 5;
    }
  }
  if (u.dash) {
    ar = u.dash.go ? 0.6 : -0.9;
    bx = u.dash.go ? 0.55 : 0.2;
  }
  // faza 5: Książę unosi się nad ziemią
  if (u.ph === 5 && !shade) y += 0.9 + Math.sin(time * 2) * 0.2;
  P.legL.rotation.x = -sn * 0.55 * walk - legBend * 0.6;
  P.legR.rotation.x = sn * 0.55 * walk + legBend * 0.2;
  P.kneeL.rotation.x = (0.1 + Math.max(0, cs) * 1.0) * walk + legBend;
  P.kneeR.rotation.x = (0.1 + Math.max(0, -cs) * 1.0) * walk + legBend * 0.8;
  P.armR.rotation.x = damp(P.armR.rotation.x, ar, lam, dt);
  P.elbR.rotation.x = damp(P.elbR.rotation.x, er, lam, dt);
  P.armL.rotation.x = damp(P.armL.rotation.x, al, lam, dt);
  P.elbL.rotation.x = damp(P.elbL.rotation.x, el, lam, dt);
  P.armR.rotation.z = damp(P.armR.rotation.z, arz, lam, dt);
  P.armL.rotation.z = damp(P.armL.rotation.z, alz, lam, dt);
  P.body.rotation.x = damp(P.body.rotation.x, bx, 10, dt);
  P.body.rotation.y = spin ? spin : damp(P.body.rotation.y, by, a && t > 0.3 ? 26 : 8, dt);
  P.body.position.y = P.hipY - Math.abs(sn) * 0.08 * walk + Math.sin(time * 1.6 + u.seed) * 0.03;
  P.head.rotation.x = damp(P.head.rotation.x, hx, 8, dt);
  P.head.rotation.y = a ? 0 : Math.sin(time * 0.6 + u.seed) * 0.25;
  P.cape.rotation.x = damp(
    P.cape.rotation.x,
    0.15 + walk * 0.5 + (u.ph === 5 ? 0.5 : 0) + Math.sin(time * 2 + u.seed) * 0.08,
    6,
    dt
  );
  P.runes.rotation.z += dt * (u.ph >= 3 ? 1.5 : 0.5);
  P.bladeGlow.scale.setScalar(1.4 + Math.sin(time * 5) * 0.2 + (a ? 0.6 : 0));
  if (!shade) {
    princeRuneMat.opacity = u.ph >= 3 ? 1 : 0.75;
    PRINCE_RIM.value.w = damp(
      PRINCE_RIM.value.w,
      (u.ph >= 3 ? 0.9 : 0.5) + u.pop * 0.45 + (u.invT > 0 ? 0.8 : 0),
      4,
      dt
    );
    princeTrail(u, trail, dt);
    if (a && Math.random() < 0.5) {
      u.root.updateMatrixWorld(true);
      P.tip.getWorldPosition(tmpV);
      burst(tmpV.x, tmpV.y, tmpV.z, 0xff6070, 1, 0.6, 0.1, 0.35, 0);
    }
    if (Math.random() < 0.25)
      burst(u.x + rnd(-0.8, 0.8), 0.3, u.z + rnd(-0.8, 0.8), PRINCE_C, 1, 0.5, 0.08, 1.0, -2.5);
  }
  // zaćmienie i taniec: Książę rozpływa się w mroku
  const s = u.vanish ? Math.max(0.01, 1 - Math.min(1, t * 3)) : 1;
  return { s, y };
}
