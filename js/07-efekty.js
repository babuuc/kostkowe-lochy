/* Kostkowe Lochy: Efekty wizualne: cząsteczki, cięcia, fale, ostrzeżenia, smuga miecza, liczby obrażeń, łupy i pociski.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= efekty ================= */
function makePool(material, max) {
  const mesh = new THREE.InstancedMesh(BOX, material, max);
  mesh.frustumCulled = false;
  fxG.add(mesh);
  const X = new Float32Array(max),
    Y = new Float32Array(max),
    Z = new Float32Array(max),
    VX = new Float32Array(max),
    VY = new Float32Array(max),
    VZ = new Float32Array(max),
    Lf = new Float32Array(max),
    Mx = new Float32Array(max),
    Sz = new Float32Array(max),
    Gr = new Float32Array(max);
  let next = 0;
  dummy.position.set(0, -50, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  for (let i = 0; i < max; i++) {
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, tmpC.setHex(0xffffff));
  }
  return {
    burst(x, y, z, color, n, spd, size, life, grav) {
      spd = spd || 5;
      size = size || 0.16;
      life = life || 0.6;
      for (let k = 0; k < n; k++) {
        const i = next;
        next = (next + 1) % max;
        const a = Math.random() * TAU,
          s = spd * (0.35 + Math.random() * 0.65);
        X[i] = x;
        Y[i] = y;
        Z[i] = z;
        VX[i] = Math.cos(a) * s;
        VZ[i] = Math.sin(a) * s;
        VY[i] = spd * (0.3 + Math.random() * 0.7);
        Lf[i] = Mx[i] = life * (0.6 + Math.random() * 0.6);
        Sz[i] = size * (0.7 + Math.random() * 0.6);
        Gr[i] = grav === undefined ? 18 : grav;
        mesh.setColorAt(i, tmpC.setHex(color));
      }
      mesh.instanceColor.needsUpdate = true;
    },
    update(dt) {
      let any = false;
      for (let i = 0; i < max; i++) {
        if (Lf[i] <= 0) continue;
        any = true;
        Lf[i] -= dt;
        if (Lf[i] <= 0) {
          dummy.position.set(0, -50, 0);
          dummy.scale.set(0, 0, 0);
          dummy.rotation.set(0, 0, 0);
        } else {
          VY[i] -= Gr[i] * dt;
          X[i] += VX[i] * dt;
          Y[i] += VY[i] * dt;
          Z[i] += VZ[i] * dt;
          if (Y[i] < 0.06 && VY[i] < 0 && walkAt(X[i], Z[i])) {
            Y[i] = 0.06;
            VY[i] *= -0.4;
            VX[i] *= 0.6;
            VZ[i] *= 0.6;
          }
          const s = Sz[i] * Math.min(1, (Lf[i] / Mx[i]) * 2.2);
          dummy.position.set(X[i], Y[i], Z[i]);
          dummy.rotation.set(Lf[i] * 7, Lf[i] * 5, 0);
          dummy.scale.set(s, s, s);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      if (any) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
const sparks = makePool(new THREE.MeshBasicMaterial({ color: 0xffffff }), 440); // iskry i pył: świecą własnym kolorem
const debris = makePool(new THREE.MeshLambertMaterial({ color: 0xffffff }), 260); // odłamki: oświetlone jak świat
function burst(x, y, z, color, n, spd, size, life, grav) {
  sparks.burst(x, y, z, color, n, spd, size, life, grav);
}
// rozpad modelu na jego własne klocki
function shatter(root, frags, bs) {
  root.updateMatrixWorld(true);
  const n = frags.length,
    st = n > 22 ? 2 : 1;
  for (let i = 0; i < n; i += st) {
    const f = frags[i];
    tmpV.set(f[1], f[2], f[3]);
    f[0].localToWorld(tmpV);
    debris.burst(tmpV.x, Math.max(0.12, tmpV.y), tmpV.z, f[5], 1, 4.6, clamp(f[4] * bs * 0.8, 0.1, 0.5), 1.0);
  }
}
// łuk cięcia
const SLASH_GEO = new THREE.RingGeometry(1.7, 2.6, 24, 1, -Math.PI / 2 - 1.15, 2.3);
const slashes = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group(),
    mt = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
  const m = new THREE.Mesh(SLASH_GEO, mt);
  m.rotation.x = -Math.PI / 2;
  g.add(m);
  g.visible = false;
  fxG.add(g);
  slashes.push({ g, mt, t: 0, dur: 0.24, dir: 1, face: 0, sc: 1 });
}
let slashI = 0;
function slashFx(x, z, face, dir, sc, color) {
  const s = slashes[slashI++ % 3];
  s.t = s.dur = 0.24;
  s.dir = dir;
  s.face = face;
  s.sc = sc;
  s.g.position.set(x, 0.95, z);
  s.mt.color.setHex(color || 0xffffff);
  s.g.visible = true;
}
// fale uderzeniowe
const WAVE_GEO = new THREE.RingGeometry(0.84, 1, 48);
const waves = [];
for (let i = 0; i < 12; i++) {
  const mt = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const m = new THREE.Mesh(WAVE_GEO, mt);
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  fxG.add(m);
  waves.push({ m, mt, t: 0, dur: 0.4, r0: 0.5, r1: 3 });
}
let waveI = 0;
function waveFx(x, z, r0, r1, color, dur) {
  const w = waves[waveI++ % 12];
  w.t = w.dur = dur || 0.4;
  w.r0 = r0;
  w.r1 = r1;
  w.m.position.set(x, 0.08, z);
  w.mt.color.setHex(color);
  w.m.visible = true;
}
// ostrzeżenia przed uderzeniem
const DISC_GEO = new THREE.CircleGeometry(1, 40);
const teles = [];
for (let i = 0; i < 16; i++) {
  const ma = new THREE.MeshBasicMaterial({
      color: 0xff3040,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
    mb = new THREE.MeshBasicMaterial({
      color: 0xff3040,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
  const a = new THREE.Mesh(DISC_GEO, ma),
    b = new THREE.Mesh(DISC_GEO, mb);
  a.rotation.x = b.rotation.x = -Math.PI / 2;
  a.visible = b.visible = false;
  fxG.add(a);
  fxG.add(b);
  teles.push({ a, b, t: 0, dur: 1, rad: 1 });
}
function telegraph(x, z, rad, dur) {
  for (const t of teles) {
    if (t.t > 0) continue;
    t.t = t.dur = dur;
    t.rad = rad;
    t.a.position.set(x, 0.04, z);
    t.b.position.set(x, 0.05, z);
    t.a.scale.setScalar(rad);
    t.b.scale.setScalar(0.01);
    t.a.visible = t.b.visible = true;
    return;
  }
}
// ślady po uderzeniach
const decals = [];
for (let i = 0; i < 8; i++) {
  const mt = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const m = new THREE.Mesh(DISC_GEO, mt);
  m.rotation.x = -Math.PI / 2;
  m.visible = false;
  fxG.add(m);
  decals.push({ m, mt, t: 0, dur: 1 });
}
let decalI = 0;
function decal(x, z, r, dur) {
  const d = decals[decalI++ % 8];
  d.t = d.dur = dur || 2.5;
  d.m.position.set(x, 0.022 + (decalI % 8) * 0.0012, z);
  d.m.scale.setScalar(r);
  d.m.visible = true;
}
function updateFx(dt) {
  for (const d of decals) {
    if (d.t <= 0) continue;
    d.t -= dt;
    d.mt.opacity = 0.36 * Math.min(1, (d.t / d.dur) * 2);
    if (d.t <= 0) d.m.visible = false;
  }
  for (const s of slashes) {
    if (s.t <= 0) continue;
    s.t -= dt;
    const k = 1 - Math.max(0, s.t) / s.dur;
    s.g.rotation.y = s.face + s.dir * (0.5 - k) * 1.0;
    s.g.scale.setScalar(s.sc * (0.75 + k * 0.4));
    s.mt.opacity = 0.45 * (1 - k * k);
    if (s.t <= 0) s.g.visible = false;
  }
  for (const w of waves) {
    if (w.t <= 0) continue;
    w.t -= dt;
    const k = 1 - Math.max(0, w.t) / w.dur,
      e = 1 - (1 - k) * (1 - k);
    w.m.scale.setScalar(lerp(w.r0, w.r1, e));
    w.mt.opacity = 0.9 * (1 - k);
    if (w.t <= 0) w.m.visible = false;
  }
  for (const t of teles) {
    if (t.t <= 0) continue;
    t.t -= dt;
    const k = 1 - Math.max(0, t.t) / t.dur;
    t.b.scale.setScalar(Math.max(0.01, t.rad * k));
    if (t.t <= 0) {
      t.a.visible = t.b.visible = false;
    }
  }
}
// błysk światła przy trafieniach, wybuchach i przejęciach
const tmpV2 = new THREE.Vector3();
const flashL = new THREE.PointLight(0xffffff, 0, 10, 1.2);
flashL.position.set(0, -100, 0);
scene.add(flashL);
let flashT = 0,
  flashDur = 1,
  flashI = 0;
function flash(x, y, z, color, int, dur, range) {
  if (flashT > 0 && int < (flashI * flashT) / flashDur) return;
  flashL.color.setHex(color);
  flashL.position.set(x, y, z);
  flashL.distance = range || 10;
  flashI = int;
  flashT = flashDur = dur || 0.25;
}
// smuga za ostrzem: wstęga budowana z kolejnych położeń miecza
const TRAIL_N = 14,
  trailPos = new Float32Array(TRAIL_N * 6),
  trailGeo = new THREE.BufferGeometry(),
  trailS = [];
{
  const uv = new Float32Array(TRAIL_N * 4),
    idx = [];
  for (let i = 0; i < TRAIL_N; i++) {
    const u = i / (TRAIL_N - 1);
    uv[i * 4] = u;
    uv[i * 4 + 1] = 0;
    uv[i * 4 + 2] = u;
    uv[i * 4 + 3] = 1;
    if (i < TRAIL_N - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  trailGeo.setIndex(idx);
}
const trailMesh = new THREE.Mesh(
  trailGeo,
  new THREE.MeshBasicMaterial({
    map: dataTex(32, 2, u => Math.pow(1 - u, 1.4)),
    color: 0xeafcff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  })
);
trailMesh.frustumCulled = false;
trailMesh.visible = false;
fxG.add(trailMesh);
function trailPush(a, b, color) {
  trailS.unshift({ p: [a.x, a.y, a.z, b.x, b.y, b.z], t: 0 });
  if (trailS.length > TRAIL_N) trailS.pop();
  trailMesh.material.color.setHex(color);
}
function trailUpdate(dt) {
  for (let i = 0; i < trailS.length; i++) trailS[i].t += dt;
  while (trailS.length && trailS[trailS.length - 1].t > 0.13) trailS.pop();
  const n = trailS.length;
  if (n < 2) {
    trailMesh.visible = false;
    return;
  }
  for (let i = 0; i < TRAIL_N; i++) trailPos.set(trailS[Math.min(i, n - 1)].p, i * 6);
  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.setDrawRange(0, (n - 1) * 6);
  trailMesh.visible = true;
}
// linie celowania łuczników
const aimLines = [];
for (let i = 0; i < 12; i++) {
  const mt = new THREE.MeshBasicMaterial({
    color: 0xff4040,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const m = new THREE.Mesh(BOX, mt);
  m.visible = false;
  fxG.add(m);
  aimLines.push({ m, mt });
}
let aimI = 0;
function aimReset() {
  for (let i = 0; i < aimI; i++) aimLines[i].m.visible = false;
  aimI = 0;
}
function aimLine(x0, z0, x1, z1, k, w, y) {
  if (aimI >= aimLines.length) return;
  const a = aimLines[aimI++],
    dx = x1 - x0,
    dz = z1 - z0,
    d = Math.hypot(dx, dz);
  a.m.visible = true;
  a.m.position.set((x0 + x1) / 2, y === undefined ? 1.0 : y, (z0 + z1) / 2);
  a.m.rotation.y = Math.atan2(dx, dz);
  a.m.scale.set(w === undefined ? 0.03 + k * 0.05 : w, 0.03, d);
  a.mt.opacity = 0.12 + k * 0.5;
}
// cienie chmur
const clouds = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(
    POOL_GEO,
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0x000000,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      fog: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(40 + i * 8, 26 + i * 5, 1);
  m.visible = false;
  m.renderOrder = 5;
  fxG.add(m);
  clouds.push({ m, x: G / 2 + (i - 1) * 34, z: G / 2 + (i - 1) * -22 });
}
// mgła nad otchłanią (etap krypt): przesuwa się nisko nad wodą, wyspy ją zasłaniają
const mists = [];
for (let i = 0; i < 3; i++) {
  const m = new THREE.Mesh(
    POOL_GEO,
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0x5fc8b8,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(30 + i * 8, 18 + i * 5, 1);
  m.visible = false;
  fxG.add(m);
  mists.push({ m, x: G / 2 + (i - 2) * 14, z: G / 2 + (((i * 37) % 5) - 2) * 10, s: 0.6 + i * 0.15 });
}
// liczby obrażeń
const dmgEls = [];
{
  const layer = $('dmg');
  for (let i = 0; i < 22; i++) {
    const el = document.createElement('span');
    layer.appendChild(el);
    dmgEls.push({ el, t: 0, x: 0, y: 0, z: 0, ox: 0 });
  }
}
let dmgI = 0;
function dmgNum(x, y, z, txt, cls) {
  if (state !== 'play') return;
  const d = dmgEls[dmgI++ % dmgEls.length];
  d.t = 0.7;
  d.x = x;
  d.y = y;
  d.z = z;
  d.ox = rnd(-14, 14);
  d.el.textContent = txt;
  d.el.className = cls || '';
}
function updateDmg(dt) {
  const W = window.innerWidth,
    H = window.innerHeight;
  for (const d of dmgEls) {
    if (d.t <= 0) continue;
    d.t -= dt;
    if (d.t <= 0) {
      d.el.style.opacity = '0';
      continue;
    }
    const k = 1 - d.t / 0.7;
    tmpV.set(d.x, d.y, d.z).project(camera);
    const sx = (tmpV.x * 0.5 + 0.5) * W + d.ox,
      sy = (-tmpV.y * 0.5 + 0.5) * H - k * 46,
      sc = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(1, (k - 0.15) * 2) * 0.2;
    d.el.style.transform =
      'translate(' +
      sx.toFixed(1) +
      'px,' +
      sy.toFixed(1) +
      'px) translate(-50%,-50%) scale(' +
      sc.toFixed(2) +
      ')';
    d.el.style.opacity = k > 0.7 ? String(((1 - k) / 0.3).toFixed(2)) : '1';
  }
}
function shake(a) {
  trauma = Math.min(1, trauma + a * (reduceMotion ? 0.3 : 1));
}

/* odłamki i serca */
const gemMat = mat(0xffc23d, 0x9a6410),
  heartMat = mat(0xff4d5e, 0x99202c),
  gemPool = [];
function dropGem(x, z, kind) {
  let m = gemPool.pop();
  if (!m) {
    m = new THREE.Mesh(GEM_GEO, gemMat);
    fxG.add(m);
  }
  if (kind === 'heart') {
    m.geometry = BOX;
    m.material = heartMat;
    m.scale.setScalar(0.32);
  } else {
    m.geometry = GEM_GEO;
    m.material = gemMat;
    m.scale.setScalar(1);
  }
  m.visible = true;
  const a = rnd(TAU),
    s = rnd(1.5, 4.5);
  pickups.push({
    x,
    z,
    y: 0.7,
    vx: Math.cos(a) * s,
    vz: Math.sin(a) * s,
    vy: rnd(5, 8),
    t: 0,
    kind: kind || 'gem',
    m,
  });
}
function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.t += dt;
    const dx = hero.x - p.x,
      dz = hero.z - p.z,
      d = Math.hypot(dx, dz);
    if (p.t > 0.45 && (d < 3.6 || p.t > 25) && !hero.dead) {
      const s = Math.min(18, 6 + p.t * 14);
      p.x += (dx / d) * s * dt;
      p.z += (dz / d) * s * dt;
      p.y = damp(p.y, 0.8, 10, dt);
      if (d < 0.7) {
        if (p.kind === 'heart') {
          healHero(12);
        } else {
          save.gems++;
          runGems++;
          sfx.gem();
        }
        p.m.visible = false;
        gemPool.push(p.m);
        pickups.splice(i, 1);
        continue;
      }
    } else {
      p.vy -= 20 * dt;
      p.y += p.vy * dt;
      if (p.y < 0.3) {
        p.y = 0.3;
        p.vy *= -0.45;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      const nx = p.x + p.vx * dt,
        nz = p.z + p.vz * dt;
      if (walkAt(nx, nz)) {
        p.x = nx;
        p.z = nz;
      } else {
        p.vx *= -0.5;
        p.vz *= -0.5;
      }
    }
    p.m.position.set(p.x, p.y + Math.sin(time * 4 + i) * 0.05, p.z);
    p.m.rotation.y = time * 3 + i;
  }
}
function healHero(v) {
  const h = hero;
  if (h.dead) return;
  const before = h.hp;
  h.hp = Math.min(h.maxHp, h.hp + v);
  const got = Math.round(h.hp - before);
  if (got > 0) {
    dmgNum(h.x, h.h + 0.4, h.z, '+' + got, 'heal');
    burst(h.x, 1, h.z, 0x6fdc5a, 6, 2.5, 0.12, 0.6, -4);
  }
}

/* pociski */
// Pociski są rysowane jako zestawy instancji (strzały, kule i ich poświata),
// więc nawet sto pocisków naraz kosztuje tylko trzy wywołania rysowania.
const PROJ_MAX = 220;
function projSet(geo, mt) {
  const m = new THREE.InstancedMesh(geo, mt, PROJ_MAX);
  m.setColorAt(0, tmpC.setHex(0xffffff));
  m.count = 0;
  m.frustumCulled = false;
  fxG.add(m);
  return m;
}
const projArrow = projSet(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff })),
  projOrb = projSet(OCT, new THREE.MeshBasicMaterial({ color: 0xffffff })),
  projHalo = projSet(
    OCT,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
function shoot(x, z, dx, dz, speed, team, dmg, kind, extra) {
  if (projs.length >= PROJ_MAX) return;
  kind = kind || 'arrow';
  projs.push({
    x,
    z,
    vx: dx * speed,
    vz: dz * speed,
    ry: Math.atan2(dx, dz),
    life: kind === 'arrow' ? 1.4 : 3.4,
    team,
    dmg,
    kind,
    spin: Math.random() * 6,
    pierce: (extra && extra.pierce) || 0,
    crit: !!(extra && extra.crit),
    hit: null,
  });
}
function projClear() {
  projs = [];
  projArrow.count = projOrb.count = projHalo.count = 0;
}
function projDraw() {
  let na = 0,
    no = 0;
  for (const p of projs) {
    dummy.position.set(p.x, 1.0, p.z);
    if (p.kind === 'arrow') {
      dummy.rotation.set(0, p.ry, 0);
      dummy.scale.set(0.08, 0.08, 0.8);
      dummy.updateMatrix();
      projArrow.setMatrixAt(na, dummy.matrix);
      projArrow.setColorAt(na, tmpC.setHex(p.team === 0 ? (p.crit ? 0xffe08a : 0xefe4c4) : 0xe8b0a8));
      na++;
    } else {
      const s = p.kind === 'orb' ? 0.24 : 0.3,
        c = p.kind === 'soul' ? 0xc8fff2 : p.kind === 'blade' ? 0xffc0b0 : 0xe0a0ff;
      dummy.rotation.set(p.spin, p.spin * 0.7, 0);
      dummy.scale.set(s, s * 1.3, s);
      dummy.updateMatrix();
      projOrb.setMatrixAt(no, dummy.matrix);
      projOrb.setColorAt(no, tmpC.setHex(c));
      dummy.scale.set(s * 2.1, s * 2.1, s * 2.1);
      dummy.updateMatrix();
      projHalo.setMatrixAt(no, dummy.matrix);
      projHalo.setColorAt(
        no,
        tmpC.setHex(p.kind === 'soul' ? LICH_C : p.kind === 'blade' ? PRINCE_C : COL_E)
      );
      no++;
    }
  }
  projArrow.count = na;
  projOrb.count = projHalo.count = no;
  for (const m of [projArrow, projOrb, projHalo]) {
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
  }
}
function updateProjs(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    p.spin += dt * 7;
    let gone = p.life <= 0;
    if (!gone && p.x > 0 && p.z > 0 && p.x < G && p.z < G && grid[cellOf(p.x, p.z)] === 3) {
      gone = true;
      burst(p.x, 1, p.z, 0xcfc8b0, 3, 2, 0.1, 0.3);
    }
    if (!gone) {
      if (p.team === 0) {
        if (smashUrns(p.x, p.z, 0.15)) gone = true;
        if (!gone)
          for (const u of units) {
            if (u.team !== 1 || u.dead || (p.hit && p.hit.has(u))) continue;
            if (Math.hypot(u.x - p.x, u.z - p.z) < u.r + 0.3) {
              if (hurt(u, p.dmg, p.x - p.vx, p.z - p.vz, 5, p.crit)) addCombo(1);
              sfx.hit();
              if (p.pierce > 0) {
                p.pierce--;
                (p.hit || (p.hit = new Set())).add(u);
                p.dmg *= 0.8;
              } else {
                gone = true;
                break;
              }
            }
          }
        if (!gone)
          for (const n of nodes) {
            if (n.own === 1 && Math.hypot(n.x - p.x, n.z - p.z) < n.r + 0.1) {
              const sh = n.shield;
              hurtNode(n, p.dmg, 0);
              if (!sh) addCombo(1);
              gone = true;
              break;
            }
          }
      } else {
        if (!hero.dead && Math.hypot(hero.x - p.x, hero.z - p.z) < hero.r + 0.28) {
          if (hurt(hero, p.dmg, p.x - p.vx, p.z - p.vz, 4)) gone = true;
        }
        if (!gone)
          for (const u of units) {
            if (u.team !== 0 || u.dead) continue;
            if (Math.hypot(u.x - p.x, u.z - p.z) < u.r + 0.28) {
              hurt(u, p.dmg, p.x - p.vx, p.z - p.vz, 3);
              gone = true;
              break;
            }
          }
      }
    }
    if (gone) projs.splice(i, 1);
    else if (p.kind === 'arrow') {
      if (Math.random() < 0.6) burst(p.x, 1, p.z, p.team === 0 ? 0xfff2c0 : 0xff9080, 1, 0.3, 0.06, 0.22, 0);
    } else if (Math.random() < (projs.length > 40 ? 0.15 : 0.4))
      burst(
        p.x,
        1,
        p.z,
        p.kind === 'soul' ? 0x7fffd8 : p.kind === 'blade' ? 0xff6070 : COL_E,
        1,
        0.6,
        0.1,
        0.3,
        0
      );
  }
  projDraw();
}
