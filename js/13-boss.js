/* Kostkowe Lochy: Strażnik Otchłani, boss etapu 4.
   Model, ataki w trzech fazach, tarcza podtrzymywana przez sługi i efekty (ręce z grobów, bańka tarczy).
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
const LICH_C = 0x46f0c8;
const lichPoolMat = new THREE.MeshBasicMaterial({
  map: glowTex,
  color: LICH_C,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});

// Strażnik ma własny materiał: pikselowa faktura jak u innych postaci plus turkusowa poświata krawędzi,
// dzięki której odcina się od ciemnych krypt. Siła poświaty pulsuje przy trafieniach i zmianie fazy.
const LICH_RIM = { value: new THREE.Vector4(0.27, 0.94, 0.78, 0.8) };
const LICH_MAT = (function () {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = sh => {
    sh.uniforms.tNoise = { value: noiseTex };
    sh.uniforms.uRim = LICH_RIM;
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
        '#include <color_fragment>\nvec3 tAn = abs(vTn); vec2 tUv = tAn.y > 0.5 ? vTp.xz : (tAn.x > 0.5 ? vTp.zy : vTp.xy);\ndiffuseColor.rgb *= 0.915 + texture2D(tNoise, tUv * 0.25).r * 0.17;'
      )
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\nfloat rimF = 1.0 - max(dot(normalize(vRn), normalize(vRv)), 0.0);\ngl_FragColor.rgb += uRim.rgb * pow(rimF, 1.5) * uRim.a;'
      );
  };
  m.customProgramCacheKey = () => 'lich-rim';
  return m;
})();
const RUNE_TEX = dataTex(128, 128, (u, v) => {
  const x = u * 2 - 1,
    y = v * 2 - 1,
    r = Math.hypot(x, y),
    a = Math.atan2(y, x) + Math.PI;
  let k = 0;
  if (r > 0.9 && r < 0.96) k = 1;
  else if (r > 0.62 && r < 0.66) k = 0.95;
  else if (r > 0.3 && r < 0.33) k = 0.8;
  else if (r > 0.71 && r < 0.85 && a % (TAU / 16) < 0.09) k = 0.9;
  else if (r > 0.33 && r < 0.62 && Math.abs(((a + 0.02) % (TAU / 6)) - 0.02) < 0.035) k = 0.75;
  else if (r < 0.96) k = 0.06;
  return k;
});
const runeMat = new THREE.MeshBasicMaterial({
  map: RUNE_TEX,
  color: LICH_C,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  fog: false,
});
const pillarMat = new THREE.MeshBasicMaterial({
  map: beamTex,
  color: LICH_C,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
  fog: false,
});
// niewidoczny wzorzec: dzięki niemu shader Strażnika kompiluje się przy starcie etapu, a nie w chwili jego pojawienia się
{
  const w = new THREE.Mesh(BOX, LICH_MAT);
  w.visible = false;
  fxG.add(w);
}
function lichSkin(root) {
  root.traverse(o => {
    if (o.isMesh && o.material === CHAR_MAT) {
      o.material = LICH_MAT;
      o.userData.m = LICH_MAT;
    }
  });
}

/* ---------- model ---------- */
// Wszystkie klocki są ustawione bez obrotu, bo przy scalaniu modelu (bake) liczy się tylko położenie i rozmiar.
function buildLich(root) {
  const robe = 0x3a5866,
    rd = 0x2a404a,
    bone = 0xd8e0d8,
    gold = 0xe0b850,
    dark = 0x0b1014;
  const b = new THREE.Group();
  b.position.y = 0.3;
  root.add(b);
  const P = { body: b, eyes: [], col: robe, lean: 0, lich: true };
  // szata: dolna część z postrzępionym brzegiem
  box(b, 1.1, 0.5, 0.86, rd, 0, 0.55, 0);
  box(b, 0.96, 0.4, 0.76, robe, 0, 0.95, 0);
  const tail = new THREE.Group();
  tail.position.y = 0.32;
  b.add(tail);
  P.tail = tail;
  for (const [x, z, w, d] of [
    [0, 0.4, 0.7, 0.1],
    [0, -0.4, 0.7, 0.1],
    [0.5, 0, 0.1, 0.6],
    [-0.5, 0, 0.1, 0.6],
  ])
    box(tail, w, 0.55, d, rd, x, -0.22, z);
  box(tail, 0.3, 0.4, 0.1, shade(rd, -0.05), 0.15, -0.55, 0.38, 0, 1);
  box(tail, 0.25, 0.3, 0.1, shade(rd, -0.05), -0.2, -0.5, -0.38, 0, 1);
  // świecące brzegi szaty
  box(tail, 0.72, 0.05, 0.12, LICH_C, 0, -0.48, 0.4, LICH_C, 1);
  box(tail, 0.12, 0.05, 0.62, LICH_C, 0.5, -0.48, 0, LICH_C, 1);
  box(tail, 0.12, 0.05, 0.62, LICH_C, -0.5, -0.48, 0, LICH_C, 1);
  // tułów z żebrami i świecącym szwem
  box(b, 0.92, 0.7, 0.62, robe, 0, 1.5, 0);
  box(b, 0.5, 0.06, 0.06, LICH_C, 0, 1.66, 0.32, LICH_C, 1);
  for (let k = 0; k < 3; k++) box(b, 0.46 - k * 0.06, 0.05, 0.04, bone, 0, 1.3 + k * 0.11, 0.33, 0, 1);
  box(b, 1.0, 0.1, 0.66, 0x3a2f24, 0, 1.17, 0, 0, 1);
  box(b, 0.18, 0.18, 0.06, LICH_C, 0, 1.17, 0.34, LICH_C, 1);
  // naramienniki z kolcami i kołnierz
  for (const s of [-1, 1]) {
    box(b, 0.42, 0.22, 0.5, dark, s * 0.56, 1.86, 0);
    box(b, 0.1, 0.3, 0.1, bone, s * 0.62, 2.08, 0.1, 0, 1);
    box(b, 0.1, 0.22, 0.1, bone, s * 0.7, 2.02, -0.12, 0, 1);
  }
  box(b, 0.8, 0.36, 0.3, rd, 0, 1.98, -0.25);
  for (const s of [-1, 1]) box(b, 0.12, 0.12, 0.04, LICH_C, s * 0.56, 1.88, 0.26, LICH_C, 1);
  // postrzępiona peleryna za plecami
  const cape = new THREE.Group();
  cape.position.set(0, 2.0, -0.34);
  b.add(cape);
  P.cape = cape;
  box(cape, 0.95, 1.1, 0.06, rd, 0, -0.55, 0);
  box(cape, 0.8, 0.45, 0.06, shade(rd, -0.04), 0, -1.3, -0.01);
  box(cape, 0.2, 0.3, 0.06, shade(rd, -0.06), -0.32, -1.66, -0.01, 0, 1);
  box(cape, 0.18, 0.26, 0.06, shade(rd, -0.06), 0.08, -1.67, -0.01, 0, 1);
  box(cape, 0.2, 0.34, 0.06, shade(rd, -0.06), 0.33, -1.68, -0.01, 0, 1);
  box(cape, 0.84, 0.05, 0.08, LICH_C, 0, -1.5, 0.0, LICH_C, 1);
  // czaszka w koronie
  const H = new THREE.Group();
  H.position.y = 1.92;
  H.scale.setScalar(1.2);
  b.add(H);
  P.head = H;
  box(H, 0.5, 0.46, 0.48, bone, 0, 0.26, 0.02);
  box(H, 0.38, 0.14, 0.4, shade(bone, -0.1), 0, 0.02, 0.06, 0, 1);
  for (let k = -1; k <= 1; k++) box(H, 0.06, 0.06, 0.02, 0x2a2e2a, k * 0.1, 0.06, 0.27, 0, 1);
  box(H, 0.13, 0.13, 0.03, dark, -0.12, 0.3, 0.26, 0, 1);
  box(H, 0.13, 0.13, 0.03, dark, 0.12, 0.3, 0.26, 0, 1);
  eye(P, H, 0.07, 0.07, LICH_C, LICH_C, -0.12, 0.3, 0.28);
  eye(P, H, 0.07, 0.07, LICH_C, LICH_C, 0.12, 0.3, 0.28);
  for (const s of [-1, 1]) glowSprite(H, LICH_C, 0.55, s * 0.12, 0.3, 0.32, 0.9);
  box(H, 0.58, 0.1, 0.56, gold, 0, 0.52, 0.02, 0, 1);
  for (const [x, z, hh] of [
    [-0.24, 0.24, 0.26],
    [0, 0.27, 0.5],
    [0.24, 0.24, 0.26],
    [-0.27, -0.2, 0.2],
    [0.27, -0.2, 0.2],
  ])
    box(H, 0.08, hh, 0.08, gold, x, 0.52 + hh / 2, z, 0, 1);
  oct(H, 0.08, 0.13, 0.08, LICH_C, 0, 0.66, 0.3, LICH_C);
  // ręce: rękawy, świecące mankiety, kościste dłonie
  for (const s of [-1, 1]) {
    const A = new THREE.Group();
    A.position.set(s * 0.62, 1.78, 0);
    b.add(A);
    box(A, 0.26, 0.62, 0.3, robe, 0, -0.3, 0);
    box(A, 0.32, 0.16, 0.34, LICH_C, 0, -0.6, 0, LICH_C, 1);
    box(A, 0.16, 0.2, 0.16, bone, 0, -0.75, 0.02, 0, 1);
    for (let k = -1; k <= 1; k++) box(A, 0.04, 0.16, 0.04, bone, k * 0.05, -0.9, 0.06, 0, 1);
    P[s < 0 ? 'armL' : 'armR'] = A;
  }
  // kostur z kulą dusz w prawej dłoni
  const S = new THREE.Group();
  S.position.set(0, -0.8, 0.12);
  P.armR.add(S);
  box(S, 0.08, 2.0, 0.08, 0x2a221c, 0, 0.2, 0);
  box(S, 0.22, 0.08, 0.22, gold, 0, 1.05, 0, 0, 1);
  box(S, 0.06, 0.3, 0.06, gold, -0.11, 1.2, 0, 0, 1);
  box(S, 0.06, 0.3, 0.06, gold, 0.11, 1.2, 0, 0, 1);
  P.orb = oct(S, 0.17, 0.22, 0.17, LICH_C, 0, 1.42, 0, LICH_C);
  P.orbGlow = glowSprite(S, LICH_C, 1.8, 0, 1.42, 0, 0.7);
  P.staff = S;
  glowSprite(b, LICH_C, 4.4, 0, 1.4, 0, 0.28);
  P.orbit = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group();
    root.add(g);
    oct(g, 0.12, 0.17, 0.12, 0xc8fff2, 0, 0, 0, LICH_C);
    glowSprite(g, LICH_C, 1.1, 0, 0, 0, 0.6);
    P.orbit.push(g);
  }
  // poświata pod stopami, żeby boss odcinał się od ciemnej posadzki
  const pool = new THREE.Mesh(POOL_GEO, lichPoolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.04;
  pool.scale.set(4.2, 4.2, 1);
  root.add(pool);
  P.runes = new THREE.Mesh(POOL_GEO, runeMat);
  P.runes.rotation.x = -Math.PI / 2;
  P.runes.position.y = 0.06;
  P.runes.scale.set(3.6, 3.6, 1);
  root.add(P.runes);
  // słup światła przy pojawieniu się
  P.pillar = new THREE.Mesh(BEAM_GEO, pillarMat);
  P.pillar.position.y = 6;
  P.pillar.scale.set(4, 1, 4);
  root.add(P.pillar);
  return P;
}

/* ---------- efekty: ręce z grobów i bańka tarczy ---------- */
const lichHands = [];
{
  const parts = [],
    add = (w, h, d, x, y, z, c) => {
      const m = new THREE.Mesh(BOX, mat(c));
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      parts.push(m);
    };
  add(0.3, 1.0, 0.3, 0, 0.5, 0, 0x3fb8a0);
  add(0.46, 0.34, 0.22, 0, 1.15, 0, 0x8affe0);
  for (let k = 0; k < 4; k++) add(0.08, 0.36, 0.08, -0.16 + k * 0.105, 1.48, 0, 0xc8fff2);
  add(0.08, 0.26, 0.08, 0.28, 1.2, 0.05, 0xc8fff2);
  const geo = mergeBoxes(parts);
  for (let i = 0; i < 8; i++) {
    const g = new THREE.Mesh(geo, CHAR_GLOW);
    g.visible = false;
    fxG.add(g);
    lichHands.push({ g, t: 0 });
  }
}
const lichBub = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: LICH_C,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    fog: false,
  })
);
lichBub.visible = false;
fxG.add(lichBub);
function handFx(x, z) {
  const h = lichHands.find(h => h.t <= 0);
  if (!h) return;
  h.t = 0.75;
  h.g.position.set(x, -1.6, z);
  h.g.rotation.y = rnd(TAU);
  h.g.visible = true;
}
function updateBossFx(dt) {
  for (const h of lichHands) {
    if (h.t <= 0) continue;
    h.t -= dt;
    const k = 1 - Math.max(0, h.t) / 0.75;
    h.g.position.y = k < 0.22 ? lerp(-1.6, 0, k / 0.22) : k < 0.6 ? 0 : lerp(0, -1.7, (k - 0.6) / 0.4);
    if (h.t <= 0) h.g.visible = false;
  }
  const b = boss && boss.def.lich && !boss.dead ? boss : null;
  lichBub.visible = !!(b && lichImmune(b) && b.spawnT <= 0);
  if (lichBub.visible) {
    lichBub.position.set(b.x, 2.2 * b.baseScale * 0.62, b.z);
    lichBub.scale.setScalar(2.3 + Math.sin(time * 3) * 0.06);
    lichBub.rotation.y = time * 0.6;
    lichBub.material.opacity = b.invT > 0 ? 0.25 : 0.55;
  }
}
function resetBossFx() {
  for (const h of lichHands) {
    h.t = 0;
    h.g.visible = false;
  }
  lichBub.visible = false;
}

/* ---------- zasady walki ---------- */
// Faza 1 (powyżej 66% zdrowia): pociski dusz, ręce z grobów, uderzenie z bliska.
// Faza 2 (66–33%): wzywa sługi; dopóki żyją, chroni go tarcza (najwyżej 8 s). Więcej pocisków i rąk.
// Faza 3 (poniżej 33%): teleportuje się obok bohatera i wystrzeliwuje spirale pocisków.
function lichPhase(u) {
  const f = u.hp / u.maxHp;
  return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
}
function lichImmune(u) {
  return u.invT > 0 || (u.minions > 0 && u.shieldT > 0);
}
function lichBlocked(u) {
  if (time - (u.pingT || 0) < 0.6) return;
  u.pingT = time;
  dmgNum(u.x, u.h + 0.5, u.z, 'tarcza', 'ally');
  burst(u.x, 2, u.z, 0xbffff0, 4, 5, 0.1, 0.3);
  sfx.shield();
}
function lichSetup(u) {
  u.ph = 1;
  u.act = null;
  u.invT = 0;
  u.shieldT = 0;
  u.minions = 0;
  u.sumCd = 0;
  u.blinkCd = 0;
  u.novaA = 0;
  u.cd = 2.2;
}
function lichStartPhase(u, ph) {
  u.act = null;
  u.invT = 1.0;
  u.cd = 1.0;
  LICH_RIM.value.w = 2.5;
  // przerwany atak nie zostawia na ziemi ostrzeżeń bez skutku
  for (const t of teles) {
    t.t = 0;
    t.a.visible = t.b.visible = false;
  }
  if (ph === 2) u.sumCd = 0;
  if (ph === 3) u.blinkCd = 1.5;
  waveFx(u.x, u.z, 0.6, 7, LICH_C, 0.7);
  waveFx(u.x, u.z, 0.4, 4.5, 0xffffff, 0.45);
  burst(u.x, 2, u.z, LICH_C, 40, 9, 0.2, 1.0);
  flash(u.x, 2.5, u.z, LICH_C, 2.6, 0.7, 16);
  shake(0.8);
  sfx.boss();
  const dx = hero.x - u.x,
    dz = hero.z - u.z,
    d = Math.hypot(dx, dz) || 1;
  if (!hero.dead && d < 6.5) {
    hero.kx += (dx / d) * 16;
    hero.kz += (dz / d) * 16;
  }
  if (ph === 2) banner('Strażnik wzywa sługi', 'Pokonaj je, żeby zdjąć jego tarczę.', 2.6);
  else banner('Strażnik wpada w szał', 'Teleportuje się i zasypuje cię pociskami.', 2.6);
}
function lichChoose(u, d) {
  const r = Math.random();
  if (u.ph >= 2 && u.sumCd <= 0 && u.minions === 0) return { kind: 'summon', t: 0 };
  if (d < 3.6 && r < 0.55) return { kind: 'slam', t: 0 };
  if (u.ph === 3 && u.blinkCd <= 0 && (d > 7 || r < 0.4)) return { kind: 'blink', t: 0 };
  if (u.ph === 3 && r < 0.6) return { kind: 'nova', t: 0, next: 0.5 };
  return r < 0.5 ? { kind: 'bolts', t: 0, shots: 0 } : { kind: 'hands', t: 0 };
}
function lichBolts(u, off) {
  const n = u.ph === 1 ? 5 : 7,
    spread = u.ph === 1 ? 0.8 : 1.05,
    base = Math.atan2(hero.x - u.x, hero.z - u.z) + off,
    sp = u.ph === 3 ? 10 : 8.5;
  for (let k = 0; k < n; k++) {
    const a = base - spread / 2 + (spread * k) / (n - 1);
    shoot(
      u.x + Math.sin(a) * 1.4,
      u.z + Math.cos(a) * 1.4,
      Math.sin(a),
      Math.cos(a),
      sp,
      1,
      u.dmg * 0.45,
      'soul'
    );
  }
  burst(u.x, 2.4, u.z, LICH_C, 10, 4, 0.12, 0.4, 0);
  sfx.dash();
}
function lichAct(u, a, dt) {
  const t = a.t,
    ph = u.ph;
  if (a.kind === 'bolts') {
    const wind = ph === 3 ? 0.55 : 0.75;
    if (a.shots === 0 && t === dt) sfx.wail();
    if (a.shots === 0 && t < wind) {
      const n = ph === 1 ? 5 : 7,
        spread = ph === 1 ? 0.8 : 1.05,
        base = Math.atan2(hero.x - u.x, hero.z - u.z),
        k = t / wind;
      for (let q = 0; q < n; q++) {
        const ang = base - spread / 2 + (spread * q) / (n - 1);
        aimLine(
          u.x + Math.sin(ang) * 1.4,
          u.z + Math.cos(ang) * 1.4,
          u.x + Math.sin(ang) * 7,
          u.z + Math.cos(ang) * 7,
          k,
          0.05 + k * 0.08,
          0.9
        );
      }
    }
    if (a.shots === 0 && t >= wind) {
      lichBolts(u, 0);
      a.shots = 1;
    }
    if (ph >= 2 && a.shots === 1 && t >= wind + 0.35) {
      lichBolts(u, 0.13);
      a.shots = 2;
    }
    if (t >= wind + (ph >= 2 ? 0.8 : 0.5)) end(1.2);
  } else if (a.kind === 'hands') {
    if (!a.spots) {
      const k = ph === 1 ? 3 : ph === 2 ? 5 : 6;
      a.spots = [{ x: hero.x, z: hero.z }];
      if (ph === 3) a.spots.push({ x: hero.x + hero.vx * 0.9, z: hero.z + hero.vz * 0.9 });
      for (let i = a.spots.length; i < k; i++) {
        const ang = rnd(TAU),
          r = rnd(1.7, 3.3);
        a.spots.push({ x: hero.x + Math.sin(ang) * r, z: hero.z + Math.cos(ang) * r });
      }
      for (const s of a.spots) telegraph(s.x, s.z, 1.25, 1.0);
      sfx.wail();
    }
    if (!a.done && t >= 1.0) {
      a.done = true;
      for (const s of a.spots) {
        handFx(s.x, s.z);
        burst(s.x, 0.3, s.z, LICH_C, 8, 5, 0.14, 0.5);
        debris.burst(s.x, 0.2, s.z, theme.side[0], 4, 5, 0.18, 0.7);
        decal(s.x, s.z, 1.0, 2.5);
        if (!hero.dead && Math.hypot(hero.x - s.x, hero.z - s.z) < 1.25 + hero.r * 0.4)
          hurt(hero, u.dmg * 0.7, s.x, s.z, 7);
        for (const g of units)
          if (g.team === 0 && !g.dead && Math.hypot(g.x - s.x, g.z - s.z) < 1.4)
            hurt(g, u.dmg * 0.7, s.x, s.z, 7);
      }
      waveFx(hero.x, hero.z, 0.4, 3, LICH_C, 0.35);
      flash(hero.x, 1.2, hero.z, LICH_C, 1.6, 0.35, 10);
      sfx.slam();
      shake(0.45);
    }
    if (t >= 1.35) end(ph === 3 ? 0.9 : 1.3);
  } else if (a.kind === 'slam') {
    if (t === dt) telegraph(u.x, u.z, 3.8, 0.9);
    if (!a.done && t >= 0.9) {
      a.done = true;
      waveFx(u.x, u.z, 0.6, 3.8, 0xff5a4a, 0.35);
      burst(u.x, 0.2, u.z, theme.dust, 18, 6, 0.18, 0.5);
      debris.burst(u.x, 0.2, u.z, theme.side[1], 10, 6, 0.2, 0.8);
      decal(u.x, u.z, 3.2, 3);
      flash(u.x, 1, u.z, LICH_C, 1.6, 0.3, 10);
      sfx.slam();
      shake(0.6);
      if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < 3.8 + hero.r * 0.5)
        hurt(hero, u.dmg, u.x, u.z, 13);
      for (const g of units)
        if (g.team === 0 && !g.dead && Math.hypot(g.x - u.x, g.z - u.z) < 3.8 + g.r)
          hurt(g, u.dmg, u.x, u.z, 10);
      // od drugiej fazy po uderzeniu rozchodzi się pierścień pocisków
      if (ph >= 2)
        for (let k = 0; k < 12; k++) {
          const ang = (k / 12) * TAU + u.face;
          shoot(
            u.x + Math.sin(ang) * 1.6,
            u.z + Math.cos(ang) * 1.6,
            Math.sin(ang),
            Math.cos(ang),
            6.5,
            1,
            u.dmg * 0.38,
            'soul'
          );
        }
    }
    if (t >= 1.4) end(1.0);
  } else if (a.kind === 'summon') {
    if (!a.spots) {
      a.spots = [];
      for (let k = 0; k < 12 && a.spots.length < 3; k++) {
        const ang = rnd(TAU),
          r = rnd(2.6, 3.8),
          x = u.x + Math.sin(ang) * r,
          z = u.z + Math.cos(ang) * r;
        if (canStand(x, z, 0.45) && fieldHero[cellOf(x, z)] >= 0) a.spots.push({ x, z });
      }
      for (const s of a.spots) telegraph(s.x, s.z, 0.9, 0.9);
      sfx.chant();
    }
    if (!a.done && t >= 0.9) {
      a.done = true;
      const types = ph === 2 ? ['wraith', 'archer', 'goblin'] : ['wraith', 'wraith', 'archer'];
      a.spots.forEach((s, i) => {
        const m = makeUnit(types[i % types.length], s.x, s.z, null);
        m.minionOf = u;
        m.spawnT = m.spawnDur = 0.6;
        handFx(s.x, s.z);
        burst(s.x, 0.4, s.z, LICH_C, 12, 4, 0.14, 0.6, -2);
      });
      // tarcza trwa, dopóki żyje choć jeden sługa (najwyżej 8 s)
      u.minions = a.spots.length;
      u.shieldT = a.spots.length ? 6 : 0;
      u.sumCd = 20;
    }
    if (t >= 1.4) end(1.0);
  } else if (a.kind === 'blink') {
    if (t === dt) {
      u.invT = Math.max(u.invT, 0.45);
      burst(u.x, 1.6, u.z, LICH_C, 22, 6, 0.16, 0.6, -1);
      sfx.wail();
    }
    if (!a.moved && t >= 0.35) {
      a.moved = true;
      for (let k = 0; k < 16; k++) {
        const ang = rnd(TAU),
          r = rnd(4.2, 6),
          x = hero.x + Math.sin(ang) * r,
          z = hero.z + Math.cos(ang) * r,
          c = cellOf(x, z);
        if (canStand(x, z, 0.6) && fieldHero[c] >= 0 && fieldHero[c] < 14) {
          u.x = x;
          u.z = z;
          u.vx = u.vz = 0;
          break;
        }
      }
      burst(u.x, 1.6, u.z, LICH_C, 22, 6, 0.16, 0.6, -1);
      waveFx(u.x, u.z, 0.4, 2.6, LICH_C, 0.4);
    }
    if (t >= 0.7) {
      u.blinkCd = 4.5;
      u.act = Math.random() < 0.5 ? { kind: 'hands', t: 0 } : { kind: 'bolts', t: 0, shots: 0 };
    }
  } else if (a.kind === 'nova') {
    if (t === dt) sfx.wail();
    if (t >= a.next && t < 2.3) {
      a.next = t + 0.11;
      for (let k = 0; k < 3; k++) {
        const ang = u.novaA + (k * TAU) / 3;
        shoot(
          u.x + Math.sin(ang) * 1.3,
          u.z + Math.cos(ang) * 1.3,
          Math.sin(ang),
          Math.cos(ang),
          7,
          1,
          u.dmg * 0.38,
          'soul'
        );
      }
      u.novaA += 0.3;
    }
    if (t >= 2.5) end(1.6);
  }
  function end(cd) {
    u.act = null;
    u.cd = cd * (ph === 3 ? 0.75 : 1);
  }
}
function updateLich(u, dt) {
  if (u.spawnT > 0) {
    u.spawnT -= dt;
    return;
  }
  if (u.ph === undefined) lichSetup(u);
  if (u.invT > 0) u.invT -= dt;
  if (u.sumCd > 0) u.sumCd -= dt;
  if (u.blinkCd > 0) u.blinkCd -= dt;
  let mc = 0;
  for (const m of units) if (m.minionOf === u && !m.dead) mc++;
  u.minions = mc;
  if (u.shieldT > 0) {
    u.shieldT -= dt;
    if (mc === 0 || u.shieldT <= 0) {
      u.shieldT = 0;
      burst(u.x, 2, u.z, 0xbffff0, 24, 7, 0.14, 0.6);
      waveFx(u.x, u.z, 0.6, 3.4, LICH_C, 0.4);
      sfx.shieldBreak();
    }
  }
  const ph = lichPhase(u);
  if (ph > u.ph) {
    u.ph = ph;
    lichStartPhase(u, ph);
  }
  const dx = hero.x - u.x,
    dz = hero.z - u.z,
    d = Math.hypot(dx, dz) || 0.001;
  let mx = 0,
    mz = 0;
  const a = u.act;
  if (a) {
    a.t += dt;
    lichAct(u, a, dt);
    if (a.kind !== 'blink' && !hero.dead) u.face = angLerp(u.face, Math.atan2(dx, dz), 1 - Math.exp(-6 * dt));
  } else if (!hero.dead) {
    if (d > 6.5) {
      steerTo(u, hero, d);
      mx = DIR.x;
      mz = DIR.z;
    } else if (d < 2.6) {
      mx = (-dx / d) * 0.6;
      mz = (-dz / d) * 0.6;
    }
    u.face = angLerp(u.face, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
    if (u.cd <= 0 && u.invT <= 0) u.act = lichChoose(u, d);
  }
  const sp = u.spd * (u.ph === 3 ? 1.25 : 1);
  u.vx = damp(u.vx, mx * sp, 8, dt);
  u.vz = damp(u.vz, mz * sp, 8, dt);
  if (Math.abs(u.vx) + Math.abs(u.vz) > 0.02) moveCircle(u, u.vx * dt, u.vz * dt);
}

/* ---------- animacja ---------- */
function animLich(u, dt) {
  const P = u.parts,
    a = u.act,
    k = a ? a.t : 0;
  let al = -0.2,
    ar = -0.25,
    lean = 0.05,
    fade = 1,
    glow = 0.6;
  if (a) {
    if (a.kind === 'bolts') {
      ar = -1.35;
      al = -0.7;
      lean = -0.12;
      glow = 1.3;
    } else if (a.kind === 'hands' || a.kind === 'summon') {
      al = ar = -2.8;
      lean = -0.2;
      glow = 1.1;
    } else if (a.kind === 'slam') {
      if (k < 0.9) {
        al = ar = -3.0;
        lean = -0.3;
      } else {
        al = ar = -0.4;
        lean = 0.45;
      }
    } else if (a.kind === 'nova') {
      al = ar = -1.6;
      glow = 1.4;
    } else if (a.kind === 'blink') fade = k < 0.35 ? 1 - k / 0.35 : (k - 0.35) / 0.35;
  }
  P.body.position.y = 0.3 + Math.sin(time * 1.8 + u.seed) * 0.12;
  P.body.rotation.y =
    a && a.kind === 'nova' && k > 0.5
      ? P.body.rotation.y + dt * 7
      : angLerp(P.body.rotation.y, 0, 1 - Math.exp(-6 * dt));
  P.body.rotation.x = damp(P.body.rotation.x, lean, a && a.kind === 'slam' && k >= 0.9 ? 30 : 10, dt);
  P.armL.rotation.x = damp(P.armL.rotation.x, al + Math.sin(time * 2 + u.seed) * 0.06, 12, dt);
  P.armR.rotation.x = damp(P.armR.rotation.x, ar + Math.sin(time * 2 + u.seed + 1) * 0.06, 12, dt);
  P.tail.rotation.x = Math.sin(time * 2.4 + u.seed) * 0.12;
  P.head.rotation.y = a ? 0 : Math.sin(time * 0.7 + u.seed) * 0.3;
  P.orb.rotation.y += dt * 3;
  // kostur zostaje prawie pionowo, gdy Strażnik unosi rękę
  P.staff.rotation.x = -P.armR.rotation.x * 0.85;
  P.cape.rotation.x = damp(
    P.cape.rotation.x,
    0.12 + Math.sin(time * 2.2 + u.seed) * 0.08 + Math.hypot(u.vx, u.vz) * 0.08,
    6,
    dt
  );
  P.runes.rotation.z += dt * (u.ph === 3 ? 1.4 : 0.45);
  {
    const rs = 3.6 + Math.sin(time * 2) * 0.12 + (lichImmune(u) ? 0.5 : 0);
    P.runes.scale.set(rs, rs, 1);
  }
  runeMat.opacity = u.ph === 3 ? 1 : 0.75;
  pillarMat.opacity = u.spawnT > 0 ? Math.min(0.9, u.spawnT) : damp(pillarMat.opacity, 0, 3, dt);
  P.pillar.visible = pillarMat.opacity > 0.01;
  if (Math.random() < 0.35)
    burst(u.x + rnd(-0.6, 0.6), 0.4, u.z + rnd(-0.6, 0.6), LICH_C, 1, 0.5, 0.08, 1.1, -2.5);
  P.orbit.forEach((g, k) => {
    const ang = time * (a && a.kind === 'nova' ? 4 : 1.4) + (k * TAU) / 3;
    g.position.set(Math.sin(ang) * 1.25, 1.55 + Math.sin(time * 2 + k) * 0.18, Math.cos(ang) * 1.25);
    g.rotation.y = time * 3;
  });
  LICH_RIM.value.w = damp(LICH_RIM.value.w, (lichImmune(u) ? 1.3 : 0.8) + u.pop * 1.2, 4, dt);
  {
    const q = 1.4 + glow * 1.1 + Math.sin(time * 6) * 0.15;
    P.orbGlow.scale.set(q, q, 1);
  }
  return { s: Math.max(0.05, fade) };
}
