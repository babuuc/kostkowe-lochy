/* Kostkowe Lochy: mechaniki Upiornych Krypt (etap 4): płyty z kolcami i urny dusz.
   Kościani wojownicy, którzy wstają z martwych, są obsłużeni w 08-walka.js (funkcje die, hurt, updateUnit).
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
let traps = [],
  urns = [],
  trapSpikes = null,
  trapGlow = null,
  urnMesh = null,
  urnGlow = null;
const TRAP_T = 3.4,
  SPIKE_OFF = [
    [-0.25, -0.25],
    [0.25, -0.25],
    [0, 0],
    [-0.25, 0.25],
    [0.25, 0.25],
  ];

function cryptReset() {
  traps = [];
  urns = [];
  trapSpikes = trapGlow = urnMesh = urnGlow = null;
}

// Wywoływane z buildWorld (05-swiat.js) dla motywu krypt, zanim powstaną kafle.
function cryptBuild(L, rng, pathM, linkD, db) {
  cryptReset();
  const start = L.nodes[0];
  // płyty z kolcami: na środku mostów i na kamiennych ścieżkach, z dala od kapliczek i od startu
  const cand = [];
  for (let j = 2; j < G - 2; j++)
    for (let i = 2; i < G - 2; i++) {
      const c = j * G + i,
        g = grid[c];
      if (!((g === 2 && linkD[c] < 0.9) || (g === 1 && pathM[c]))) continue;
      const x = i + 0.5,
        z = j + 0.5;
      if (Math.hypot(x - start.x, z - start.z) < start.r + 4) continue;
      if (L.nodes.some(n => Math.hypot(x - n.x, z - n.z) < 4)) continue;
      cand.push([x, z]);
    }
  for (let k = cand.length - 1; k > 0; k--) {
    const r = (rng() * (k + 1)) | 0;
    [cand[k], cand[r]] = [cand[r], cand[k]];
  }
  for (const [x, z] of cand) {
    if (traps.length >= 16) break;
    if (traps.some(t => Math.hypot(t.x - x, t.z - z) < 4.5)) continue;
    traps.push({ x, z, ph: rng() * TRAP_T, id: 0, hitId: -1, hit: new Set(), up: -1, warn: -1, snd: -1 });
    db.add(x, 0.012, z, 0.96, 0.03, 0.96, 0x23282c);
    for (const [ox, oz] of SPIKE_OFF) db.add(x + ox, 0.03, z + oz, 0.13, 0.02, 0.13, 0x0b0d0f);
  }
  // urny dusz: po kilka na wyspach wroga, przy brzegu, poza ścieżkami
  L.nodes.forEach((n, k) => {
    if (k === 0) return;
    let placed = 0;
    for (let tr = 0; tr < 60 && placed < 3; tr++) {
      const a = rng() * TAU,
        d = 2.8 + rng() * (n.r - 3.8),
        i = (n.x + Math.cos(a) * d) | 0,
        j = (n.z + Math.sin(a) * d) | 0,
        c = j * G + i;
      if (grid[c] !== 1 || pathM[c] || linkD[c] < 2.2) continue;
      let ok = true;
      for (let dj = -1; dj <= 1 && ok; dj++)
        for (let di = -1; di <= 1; di++) if (grid[(j + dj) * G + i + di] !== 1) ok = false;
      if (!ok) continue;
      grid[c] = 3;
      urns.push({ x: i + 0.5, z: j + 0.5, c, alive: true, tint: rng() });
      placed++;
    }
  });
  const mk = (n, mt, cast) => {
    const m = new THREE.InstancedMesh(BOX, mt, Math.max(1, n));
    m.count = n;
    m.frustumCulled = false;
    m.castShadow = !!cast;
    m.receiveShadow = true;
    m.userData.own = true;
    world.add(m);
    return m;
  };
  trapSpikes = mk(traps.length * 5, new THREE.MeshLambertMaterial({ color: 0xc8d0d4 }), true);
  trapGlow = mk(
    traps.length,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })
  );
  urnMesh = mk(urns.length * 3, new THREE.MeshLambertMaterial({ color: 0xffffff }), true);
  urnGlow = mk(urns.length, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  traps.forEach((t, k) => {
    setTrap(t, k, 0, 0);
    trapGlow.setColorAt(k, tmpC.setHex(0x101418));
  });
  urns.forEach((u, k) => drawUrn(u, k));
  for (const m of [trapSpikes, trapGlow, urnMesh, urnGlow]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}
function setTrap(t, k, up, warn) {
  for (let s = 0; s < 5; s++) {
    const o = SPIKE_OFF[s];
    dummy.position.set(t.x + o[0], -0.3 + up * 0.56, t.z + o[1]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(0.1, 0.5, 0.1);
    dummy.updateMatrix();
    trapSpikes.setMatrixAt(k * 5 + s, dummy.matrix);
  }
  dummy.position.set(t.x, 0.05, t.z);
  dummy.scale.set(0.78, 0.02, 0.78);
  dummy.updateMatrix();
  trapGlow.setMatrixAt(k, dummy.matrix);
}
function drawUrn(u, k) {
  const parts = u.alive
    ? [
        [0, 0.3, 0, 0.5, 0.6, 0.5],
        [0, 0.66, 0, 0.32, 0.14, 0.32],
        [0, 0.76, 0, 0.4, 0.07, 0.4],
      ]
    : [
        [0, -5, 0, 0, 0, 0],
        [0, -5, 0, 0, 0, 0],
        [0, -5, 0, 0, 0, 0],
      ];
  const cols = [0x55606a, 0x4a545d, 0x8a7a4a];
  parts.forEach((p, s) => {
    dummy.position.set(u.x + p[0], p[1], u.z + p[2]);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(p[3], p[4], p[5]);
    dummy.updateMatrix();
    urnMesh.setMatrixAt(k * 3 + s, dummy.matrix);
    urnMesh.setColorAt(k * 3 + s, tmpC.setHex(cols[s]).offsetHSL(0, 0, (u.tint - 0.5) * 0.06));
  });
  dummy.position.set(u.x, u.alive ? 0.82 : -5, u.z);
  dummy.scale.set(0.14, 0.06, 0.14);
  dummy.updateMatrix();
  urnGlow.setMatrixAt(k, dummy.matrix);
  urnGlow.setColorAt(k, tmpC.setHex(LICH_C));
}

// Kolce: 2 s spokoju, 0,75 s czerwonego ostrzeżenia, pół sekundy w górze. Ranią każdego, kto stoi na płycie.
function updateTraps(dt) {
  if (!traps.length || !trapSpikes) return;
  let dirty = false;
  traps.forEach((t, k) => {
    t.ph += dt;
    if (t.ph >= TRAP_T) {
      t.ph -= TRAP_T;
      t.id++;
      t.hit.clear();
    }
    const p = t.ph;
    let up = 0,
      warn = 0;
    if (p >= 2.0 && p < 2.75) warn = (p - 2.0) / 0.75;
    else if (p >= 2.75 && p < 3.25) up = Math.min(1, (p - 2.75) / 0.06);
    else if (p >= 3.25) up = 1 - (p - 3.25) / 0.15;
    const wq = Math.round(warn * 12) / 12;
    if (up !== t.up || wq !== t.warn) {
      t.up = up;
      t.warn = wq;
      setTrap(t, k, up, wq);
      const col =
        up > 0
          ? 0xff5a30
          : wq > 0
            ? tmpC
                .setHex(0x101418)
                .lerp(tmpC2.setHex(0xff2a3a), 0.35 + 0.65 * wq * (0.6 + 0.4 * Math.sin(time * 30)))
                .getHex()
            : 0x101418;
      trapGlow.setColorAt(k, tmpC.setHex(col));
      dirty = true;
    }
    if (p >= 2.75 && p < 3.25) {
      if (t.snd !== t.id) {
        t.snd = t.id;
        if (Math.hypot(hero.x - t.x, hero.z - t.z) < 12) sfx.trap();
        burst(t.x, 0.3, t.z, 0xcfd6dc, 4, 3, 0.08, 0.3);
      }
      const on = (x, z, r) => Math.abs(x - t.x) < 0.5 + r * 0.5 && Math.abs(z - t.z) < 0.5 + r * 0.5;
      if (!hero.dead && !t.hit.has(hero) && on(hero.x, hero.z, hero.r) && hero.rollT <= 0 && hero.inv <= 0) {
        t.hit.add(hero);
        hurt(hero, 16, t.x, t.z, 6);
      }
      for (const u of units)
        if (
          !u.dead &&
          !t.hit.has(u) &&
          u.spawnT <= 0 &&
          on(u.x, u.z, u.r) &&
          !(u.def.wraith || u.def.dash) &&
          !u.def.boss
        ) {
          t.hit.add(u);
          hurt(u, u.team === 1 ? 30 : 12, t.x, t.z, 4);
        }
    }
  });
  if (dirty) {
    trapSpikes.instanceMatrix.needsUpdate = true;
    trapGlow.instanceMatrix.needsUpdate = true;
    trapGlow.instanceColor.needsUpdate = true;
  }
}
const tmpC2 = new THREE.Color();

// Rozbijanie urn mieczem, wirem i strzałami. Zwraca liczbę rozbitych.
function smashUrns(x, z, r, face, arc) {
  if (!urns.length) return 0;
  let n = 0;
  urns.forEach((u, k) => {
    if (!u.alive) return;
    const dx = u.x - x,
      dz = u.z - z,
      d = Math.hypot(dx, dz);
    if (d > r + 0.35) return;
    if (arc !== undefined && d > 1 && Math.abs(angDiff(face, Math.atan2(dx, dz))) > arc / 2) return;
    u.alive = false;
    grid[u.c] = 1;
    drawUrn(u, k);
    urnMesh.instanceMatrix.needsUpdate = true;
    urnGlow.instanceMatrix.needsUpdate = true;
    debris.burst(u.x, 0.4, u.z, 0x55606a, 7, 4.5, 0.16, 0.8);
    burst(u.x, 0.6, u.z, LICH_C, 10, 3, 0.1, 0.8, -3);
    sfx.crystal();
    const g = 2 + ((Math.random() * 3) | 0);
    for (let i = 0; i < g; i++) dropGem(u.x, u.z);
    if (Math.random() < 0.3) dropGem(u.x, u.z, 'heart');
    n++;
  });
  return n;
}
