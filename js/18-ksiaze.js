/* Kostkowe Lochy: Książę Zmierzchu, boss etapu 5 (Cytadela Mroku).
   Faza 1 (powyżej 70%): zamach mieczem w stożku, seria trzech cięć, fala wstrząsu, szarża.
   Faza 2 (70–40%): zaćmienie – mrok gęstnieje, Książę znika na chwilę, a z cienia wychodzą upiory;
     potem podwójne zamachy, dwie fale wstrząsu i rzucane ostrza.
   Faza 3 (poniżej 40%): krwawy księżyc – mrok się rozrzedza, Książę jest szybszy, szarża zostawia ogień,
     trzy fale wstrząsu naraz i deszcz meteorów.
   Fale wstrząsu to rosnące pierścienie: trzeba je przeskoczyć unikiem albo trzymać się daleko.
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

/* ---------- zasady walki ---------- */
function princePhase(u) {
  const f = u.hp / u.maxHp;
  return f > 0.7 ? 1 : f > 0.4 ? 2 : 3;
}
function princeImmune(u) {
  return u.invT > 0 || !!u.vanish;
}
function princeStartPhase(u, ph) {
  u.act = null;
  u.cd = 0.6;
  princeClear();
  waveFx(u.x, u.z, 0.6, 9, PRINCE_C, 0.8);
  burst(u.x, 2.5, u.z, PRINCE_C, 50, 9, 0.2, 1.1);
  flash(u.x, 3, u.z, PRINCE_C, 3, 0.8, 18);
  shake(0.9);
  sfx.boss();
  const dx = hero.x - u.x,
    dz = hero.z - u.z,
    d = Math.hypot(dx, dz) || 1;
  if (!hero.dead && d < 7) {
    hero.kx += (dx / d) * 18;
    hero.kz += (dz / d) * 18;
  }
  if (ph === 2) {
    banner('Zaćmienie', 'Mrok gęstnieje, a z cienia wychodzą upiory. Trzymaj się światła.', 2.8);
    u.act = { kind: 'eclipse', t: 0 };
  } else {
    banner('Krwawy księżyc', 'Książę jest szybszy, a jego ogień zostaje na ziemi.', 2.8);
    u.invT = 1.2;
  }
}
function princeChoose(u, d) {
  const r = Math.random(),
    ph = u.ph;
  if (ph >= 3 && u.meteorCd <= 0 && r < 0.35) return { kind: 'meteors', t: 0, n: 0 };
  if (d > 7 && u.dashCd <= 0) return { kind: 'dash', t: 0 };
  if (ph >= 2 && d > 4.5 && r < 0.5) return { kind: 'blades', t: 0 };
  if (d < 4.8)
    return r < 0.42
      ? { kind: 'sweep', t: 0, n: 0 }
      : r < 0.75
        ? { kind: 'combo', t: 0, n: 0 }
        : { kind: 'quake', t: 0 };
  return r < 0.55
    ? { kind: 'quake', t: 0 }
    : u.dashCd <= 0
      ? { kind: 'dash', t: 0 }
      : { kind: 'blades', t: 0 };
}
function princeHitCone(u, arc, r, dmg, kb) {
  if (!hero.dead && inCone(hero.x, hero.z, u.x, u.z, u.face, arc, r + hero.r)) hurt(hero, dmg, u.x, u.z, kb);
  for (const g of units)
    if (g.team === 0 && !g.dead && inCone(g.x, g.z, u.x, u.z, u.face, arc, r + g.r))
      hurt(g, dmg, u.x, u.z, kb);
}
function princeAct(u, a, dt) {
  const t = a.t,
    ph = u.ph,
    fast = ph === 3 ? 0.78 : 1;
  const faceHero = () => {
    if (!hero.dead) u.face = Math.atan2(hero.x - u.x, hero.z - u.z);
  };
  const end = cd => {
    u.act = null;
    u.cd = cd * fast;
  };
  if (a.kind === 'sweep') {
    // zamach w stożku; od fazy 2 drugi zamach w przeciwną stronę
    const W = 0.8 * fast;
    if (a.n === 0 && t === dt) {
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
      if (ph >= 2) {
        faceHero();
        coneTele(u.x, u.z, u.face, 2.4, 4.8, 0.5 * fast);
      }
    }
    if (ph >= 2 && a.n === 1 && t >= W + 0.5 * fast) {
      a.n = 2;
      princeHitCone(u, 2.4, 4.8, u.dmg, 12);
      slashFx(u.x, u.z, u.face, -1, 1.85, 0xff8090);
      sfx.sweep();
      shake(0.4);
    }
    if (t >= W + (ph >= 2 ? 1.1 : 0.55) * fast) end(1.1);
  } else if (a.kind === 'combo') {
    // trzy szybkie cięcia z wypadem do przodu
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
  } else if (a.kind === 'quake') {
    // uderzenie w ziemię i rosnące pierścienie (od fazy 2 dwa, w fazie 3 trzy)
    const W = 0.9 * fast;
    if (t === dt) {
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
      flash(u.x, 1, u.z, PRINCE_C, 2, 0.35, 12);
      sfx.quake();
      shake(0.7);
      if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < 3 + hero.r * 0.5)
        hurt(hero, u.dmg, u.x, u.z, 13);
    }
    if (a.done && a.rings < ph && t >= W + a.rings * 0.55) {
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
    if (t >= W + ph * 0.55 + 0.4) end(1.3);
  } else if (a.kind === 'dash') {
    // szarża po linii; w fazie 3 zostawia za sobą ogień
    const W = 0.75 * fast,
      len = 12;
    if (t === dt) {
      faceHero();
      a.dx = Math.sin(u.face);
      a.dz = Math.cos(u.face);
      sfx.wail();
    }
    if (t < W) aimLine(u.x, u.z, u.x + a.dx * len, u.z + a.dz * len, t / W, 2.2, 0.07);
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
        if (ph === 3) {
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
    // rzucane ostrza (3, w fazie 3 pięć)
    const W = 0.55 * fast,
      n = ph === 3 ? 5 : 3,
      spread = ph === 3 ? 1.0 : 0.6;
    if (t === dt) faceHero();
    if (t < W) {
      const base = Math.atan2(hero.x - u.x, hero.z - u.z);
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
      const base = Math.atan2(hero.x - u.x, hero.z - u.z);
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
  } else if (a.kind === 'eclipse') {
    // Książę znika w mroku, z cienia wychodzą upiory, po chwili wraca uderzeniem
    if (t === dt) {
      u.vanish = true;
      burst(u.x, 2, u.z, 0x2a0a14, 40, 6, 0.2, 1.0, -1);
      for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * TAU + rnd(0.5),
          x = hero.x + Math.sin(ang) * 6,
          z = hero.z + Math.cos(ang) * 6;
        if (!canStand(x, z, 0.45)) continue;
        const m = makeUnit('wraith', x, z, null);
        m.minionOf = u;
        m.spawnT = m.spawnDur = 0.6;
        burst(x, 0.5, z, PRINCE_C, 10, 3, 0.12, 0.6, -2);
      }
    }
    if (t >= 4.5 && u.vanish) {
      u.vanish = false;
      for (let k = 0; k < 14; k++) {
        const ang = rnd(TAU),
          r = rnd(3, 4.5),
          x = hero.x + Math.sin(ang) * r,
          z = hero.z + Math.cos(ang) * r;
        if (canStand(x, z, 0.6) && fieldHero[cellOf(x, z)] >= 0) {
          u.x = x;
          u.z = z;
          break;
        }
      }
      burst(u.x, 2, u.z, PRINCE_C, 30, 7, 0.18, 0.8);
      u.act = { kind: 'quake', t: 0 };
    }
  } else if (a.kind === 'meteors') {
    // deszcz meteorów wokół bohatera
    if (t >= a.n * 0.28 && a.n < 7) {
      const first = a.n === 0,
        ang = rnd(TAU),
        r = first ? 0 : rnd(1.5, 4),
        x = hero.x + Math.sin(ang) * r + (first ? hero.vx * 0.5 : 0),
        z = hero.z + Math.cos(ang) * r + (first ? hero.vz * 0.5 : 0),
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
    if (a.n >= 7 && t >= 7 * 0.28 + 1.2) {
      u.meteorCd = 9;
      end(1.0);
    }
  }
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
    u.dashCd = 3;
    u.meteorCd = 0;
    u.cd = 1.6;
    u.vanish = false;
  }
  if (u.invT > 0) u.invT -= dt;
  if (u.dashCd > 0) u.dashCd -= dt;
  if (u.meteorCd > 0) u.meteorCd -= dt;
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
  const sp = u.spd * (u.ph === 3 ? 1.25 : 1);
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
    mv = clamp(sp / u.spd, 0, 1);
  if (mv > 0.05 || (a && a.kind === 'dash' && a.go)) u.phase += dt * (3 + sp * 1.6);
  const sn = Math.sin(u.phase),
    cs = Math.cos(u.phase),
    walk = a && a.kind === 'dash' && a.go ? 1 : mv;
  let ar = -0.5,
    er = -0.3,
    al = -0.2 + sn * 0.3 * walk,
    el = -0.4,
    bx = 0.06 + walk * 0.12,
    by = 0,
    y = 0,
    lam = 12;
  if (a) {
    if (a.kind === 'sweep') {
      const W = 0.8 * (u.ph === 3 ? 0.78 : 1);
      if (t < W) {
        const k = t / W;
        ar = -1.4;
        er = -0.1;
        by = 0.9 * k * (a.n === 1 ? -1 : 1);
      } else {
        ar = -1.4;
        er = -0.1;
        by = a.n === 1 ? -0.9 : 0.9;
        lam = 30;
      }
    } else if (a.kind === 'combo') {
      ar = a.tele ? -2.8 : -0.5;
      er = a.tele ? -0.4 : 0;
      bx = a.tele ? -0.2 : 0.4;
      lam = a.tele ? 10 : 35;
    } else if (a.kind === 'quake') {
      const W = 0.9 * (u.ph === 3 ? 0.78 : 1);
      if (!a.done) {
        ar = al = -3.0;
        er = el = -0.2;
        bx = -0.3;
        y = Math.sin(Math.min(1, t / W) * Math.PI) * 0.6;
      } else {
        ar = al = -0.5;
        bx = 0.5;
        lam = 30;
      }
    } else if (a.kind === 'dash') {
      ar = a.go ? 0.6 : -0.9;
      bx = a.go ? 0.55 : 0.2;
    } else if (a.kind === 'blades') {
      ar = -1.5;
      by = a.done ? -0.7 : 0.7;
      lam = a.done ? 30 : 10;
    } else if (a.kind === 'meteors') {
      ar = -3.1;
      er = 0;
      al = -2.4;
    }
  }
  P.legL.rotation.x = -sn * 0.55 * walk;
  P.legR.rotation.x = sn * 0.55 * walk;
  P.kneeL.rotation.x = (0.1 + Math.max(0, cs) * 1.0) * walk;
  P.kneeR.rotation.x = (0.1 + Math.max(0, -cs) * 1.0) * walk;
  P.armR.rotation.x = damp(P.armR.rotation.x, ar, lam, dt);
  P.elbR.rotation.x = damp(P.elbR.rotation.x, er, lam, dt);
  P.armL.rotation.x = damp(P.armL.rotation.x, al, lam, dt);
  P.elbL.rotation.x = damp(P.elbL.rotation.x, el, lam, dt);
  P.body.rotation.x = damp(P.body.rotation.x, bx, 10, dt);
  P.body.rotation.y = damp(
    P.body.rotation.y,
    by,
    a && (a.kind === 'sweep' || a.kind === 'blades') && t > 0.3 ? 26 : 8,
    dt
  );
  P.body.position.y = P.hipY - Math.abs(sn) * 0.08 * walk + Math.sin(time * 1.6 + u.seed) * 0.02;
  P.head.rotation.y = a ? 0 : Math.sin(time * 0.6 + u.seed) * 0.25;
  P.cape.rotation.x = damp(P.cape.rotation.x, 0.15 + walk * 0.5 + Math.sin(time * 2 + u.seed) * 0.06, 6, dt);
  P.runes.rotation.z += dt * (u.ph === 3 ? 1.5 : 0.5);
  P.bladeGlow.scale.setScalar(1.4 + Math.sin(time * 5) * 0.2 + (a ? 0.6 : 0));
  princeRuneMat.opacity = u.ph === 3 ? 1 : 0.75;
  PRINCE_RIM.value.w = damp(
    PRINCE_RIM.value.w,
    (u.ph === 3 ? 0.9 : 0.5) + u.pop * 0.45 + (u.invT > 0 ? 0.8 : 0),
    4,
    dt
  );
  // iskry z ostrza podczas ataku
  if (a && Math.random() < 0.5) {
    u.root.updateMatrixWorld(true);
    P.tip.getWorldPosition(tmpV);
    burst(tmpV.x, tmpV.y, tmpV.z, 0xff6070, 1, 0.6, 0.1, 0.35, 0);
  }
  if (Math.random() < 0.25)
    burst(u.x + rnd(-0.8, 0.8), 0.3, u.z + rnd(-0.8, 0.8), PRINCE_C, 1, 0.5, 0.08, 1.0, -2.5);
  // zaćmienie: Książę rozpływa się w mroku
  const s = u.vanish ? Math.max(0.01, 1 - Math.min(1, (a ? a.t : 0) * 3)) : 1;
  return { s, y };
}
