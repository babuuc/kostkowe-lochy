/* Kostkowe Lochy: bogatsze efekty.
   - wybuch warstwowy: kula ognia (jasny środek i pomarańczowa otoczka), iskry-smugi, klocki dymu, które rosną,
     unoszą się i kurczą, do tego fala, odłamki i wypalony ślad,
   - iskry przy każdym trafieniu, lecące w stronę, w którą poszedł cios (więcej przy krytykach),
   - słup światła przy przejęciu kapliczki, smugi pędu przy uniku, dusza ulatująca z pokonanego wroga.
   Wszystko w stałych pulach i jednym rysowaniu na rodzaj efektu.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ---------- kule ognia ---------- */
const FIRE_GEO = new THREE.IcosahedronGeometry(1, 0);
const fireballs = [];
for (let i = 0; i < 6; i++) {
  const outer = new THREE.Mesh(
      FIRE_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xff8a2a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    ),
    inner = new THREE.Mesh(
      FIRE_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xfff0b0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
  outer.visible = inner.visible = false;
  fxG.add(outer, inner);
  fireballs.push({ outer, inner, t: 0, dur: 0.4, r: 1 });
}
/* ---------- iskry-smugi (cienkie klocki ustawione wzdłuż lotu) ---------- */
const ST_N = 160;
const stMesh = new THREE.InstancedMesh(
  BOX,
  new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  }),
  ST_N
);
stMesh.frustumCulled = false;
fxG.add(stMesh);
const st = [];
for (let i = 0; i < ST_N; i++) {
  st.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, l: 0, m: 1, len: 0.5, w: 0.05 });
  stMesh.setColorAt(i, tmpC.setHex(0xffffff));
}
let stNext = 0,
  stLive = true;
function streaks(x, y, z, ang, spread, n, spd, color, len, life) {
  for (let k = 0; k < n; k++) {
    const p = st[stNext],
      a = ang + rnd(-spread, spread),
      s = spd * rnd(0.5, 1);
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = Math.sin(a) * s;
    p.vz = Math.cos(a) * s;
    p.vy = rnd(-0.2, 0.6) * s;
    p.l = p.m = (life || 0.22) * rnd(0.7, 1.3);
    p.len = (len || 0.5) * rnd(0.7, 1.2);
    p.w = 0.045;
    stMesh.setColorAt(stNext, tmpC.setHex(color));
    stNext = (stNext + 1) % ST_N;
  }
  stMesh.instanceColor.needsUpdate = true;
  stLive = true;
}
/* ---------- klocki dymu ---------- */
const SM_N = 90;
const smMesh = new THREE.InstancedMesh(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), SM_N);
smMesh.frustumCulled = false;
smMesh.castShadow = false;
fxG.add(smMesh);
const sm = [];
for (let i = 0; i < SM_N; i++) {
  sm.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, l: 0, m: 1, s: 0.5, r: 0 });
  smMesh.setColorAt(i, tmpC.setHex(0x555555));
}
let smNext = 0,
  smLive = true;
function smoke(x, y, z, n, r, color, size) {
  for (let k = 0; k < n; k++) {
    const p = sm[smNext],
      a = rnd(TAU),
      d = rnd(0, r);
    p.x = x + Math.sin(a) * d * 0.5;
    p.y = y + rnd(0, 0.4);
    p.z = z + Math.cos(a) * d * 0.5;
    p.vx = Math.sin(a) * rnd(0.6, 1.6) * (0.5 + r * 0.3);
    p.vz = Math.cos(a) * rnd(0.6, 1.6) * (0.5 + r * 0.3);
    p.vy = rnd(0.8, 1.8);
    p.l = p.m = rnd(0.9, 1.6);
    p.s = (size || 0.55) * rnd(0.7, 1.3);
    p.r = rnd(TAU);
    smMesh.setColorAt(smNext, tmpC.setHex(color || 0x4a4448).offsetHSL(0, 0, rnd(-0.05, 0.06)));
    smNext = (smNext + 1) % SM_N;
  }
  smMesh.instanceColor.needsUpdate = true;
  smLive = true;
}
/* ---------- słupy światła przy przejęciu ---------- */
const beams = [];
for (let i = 0; i < 2; i++) {
  const m = new THREE.Mesh(
    BEAM_GEO,
    new THREE.MeshBasicMaterial({
      map: beamTex,
      color: 0xbff8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    })
  );
  m.visible = false;
  fxG.add(m);
  beams.push({ m, t: 0 });
}
function captureBeam(x, z, color) {
  const b = beams.find(b => b.t <= 0) || beams[0];
  b.t = 1.1;
  b.m.material.color.setHex(color || 0xbff8ff);
  b.m.position.set(x, 7, z);
  b.m.visible = true;
  streaks(x, 1.5, z, 0, Math.PI, 20, 9, 0xbff8ff, 0.8, 0.35);
}

/* ---------- gotowe zestawy ---------- */
// wybuch warstwowy: r to promień rażenia, c kolor otoczki ognia
function explodeFx(x, z, r, c) {
  const f = fireballs.find(f => f.t <= 0) || fireballs[0];
  f.t = f.dur = 0.42;
  f.r = Math.max(0.8, r * 0.55);
  f.outer.material.color.setHex(c || 0xff8a2a);
  f.outer.position.set(x, 0.7, z);
  f.inner.position.set(x, 0.75, z);
  f.outer.rotation.set(rnd(TAU), rnd(TAU), 0);
  f.inner.rotation.set(rnd(TAU), rnd(TAU), 0);
  f.outer.visible = f.inner.visible = true;
  streaks(x, 0.7, z, 0, Math.PI, 14 + ((r * 3) | 0), 10 + r * 2, c || 0xffc060, 0.7, 0.3);
  smoke(x, 0.4, z, 5 + ((r * 2) | 0), r, 0x3e3a3c, 0.5 + r * 0.06);
}
// iskry przy trafieniu: lecą w stronę ciosu
function hitSparks(x, y, z, ang, crit, color) {
  streaks(
    x,
    y,
    z,
    ang,
    crit ? 0.9 : 0.6,
    crit ? 9 : 4,
    crit ? 9 : 6.5,
    color || (crit ? 0xffe08a : 0xffffff),
    crit ? 0.6 : 0.4,
    0.18
  );
}
// pył po ciężkim uderzeniu w ziemię
function dustFx(x, z, r) {
  smoke(x, 0.15, z, 4 + ((r * 2) | 0), r, theme.dust, 0.42);
}

/* ---------- aktualizacja ---------- */
function updateFx2(dt) {
  for (const f of fireballs) {
    if (f.t <= 0) continue;
    f.t -= dt;
    const k = 1 - Math.max(0, f.t) / f.dur,
      g = k < 0.25 ? k / 0.25 : 1;
    f.outer.scale.setScalar(f.r * (0.4 + 0.7 * g + k * 0.25));
    f.inner.scale.setScalar(f.r * (0.3 + 0.45 * g) * (1 - k * 0.6));
    f.outer.material.opacity = 0.75 * (1 - k);
    f.inner.material.opacity = 0.95 * (1 - k * k);
    f.outer.rotation.y += dt * 2;
    if (f.t <= 0) f.outer.visible = f.inner.visible = false;
  }
  for (const b of beams) {
    if (b.t <= 0) continue;
    b.t -= dt;
    const k = 1 - Math.max(0, b.t) / 1.1;
    b.m.scale.set(1.2 + k * 3.4, 1, 1.2 + k * 3.4);
    b.m.material.opacity = 0.9 * (1 - k) * Math.min(1, k * 8);
    if (b.t <= 0) b.m.visible = false;
  }
  if (stLive) {
    stLive = false;
    for (let i = 0; i < ST_N; i++) {
      const p = st[i];
      if (p.l <= 0) {
        if (p.m > 0) {
          p.m = 0;
          dummy.position.set(0, -50, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          stMesh.setMatrixAt(i, dummy.matrix);
        }
        continue;
      }
      stLive = true;
      p.l -= dt;
      p.vx *= 1 - dt * 5;
      p.vz *= 1 - dt * 5;
      p.vy -= 9 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const sp = Math.hypot(p.vx, p.vy, p.vz) || 1,
        q = Math.max(0, p.l / p.m);
      dummy.position.set(p.x, p.y, p.z);
      dummy.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      dummy.scale.set(p.w * q + 0.01, p.w * q + 0.01, p.len * Math.min(1, sp / 6) * q + 0.02);
      dummy.updateMatrix();
      stMesh.setMatrixAt(i, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    stMesh.instanceMatrix.needsUpdate = true;
  }
  if (smLive) {
    smLive = false;
    for (let i = 0; i < SM_N; i++) {
      const p = sm[i];
      if (p.l <= 0) {
        if (p.m > 0) {
          p.m = 0;
          dummy.position.set(0, -50, 0);
          dummy.scale.set(0, 0, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          smMesh.setMatrixAt(i, dummy.matrix);
        }
        continue;
      }
      smLive = true;
      p.l -= dt;
      p.vx *= 1 - dt * 2.2;
      p.vz *= 1 - dt * 2.2;
      p.vy *= 1 - dt * 0.8;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.r += dt * 1.2;
      // dym rośnie przez pierwszą część życia, potem się kurczy
      const k = 1 - Math.max(0, p.l) / p.m,
        sc = p.s * (k < 0.3 ? 0.4 + (k / 0.3) * 0.6 : 1 - (k - 0.3) / 0.7);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.r * 0.7, p.r, 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      smMesh.setMatrixAt(i, dummy.matrix);
    }
    dummy.rotation.set(0, 0, 0);
    smMesh.instanceMatrix.needsUpdate = true;
  }
}
