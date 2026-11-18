/* Kostkowe Lochy: Stan świata, wyszukiwanie ścieżek i budowa wysp, dekoracji oraz kapliczek.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= stan świata ================= */
const grid = new Uint8Array(G * G);
const fieldHero = new Int16Array(G * G),
  fieldEnemy = new Int16Array(G * G),
  fieldPlayer = new Int16Array(G * G),
  Q = new Int32Array(G * G);
let theme = null,
  level = null,
  levelIdx = 0,
  nodes = [],
  units = [],
  pickups = [],
  projs = [];
let underMesh = null,
  mapB = { x0: 0, z0: 0, w: G, h: G },
  mapCx = G / 2,
  mapCz = G / 2;
let state = 'menu',
  time = 0,
  levelTime = 0,
  kills = 0,
  runGems = 0,
  hitstop = 0,
  trauma = 0,
  hurtFlash = 0,
  fieldT = 0,
  ending = null,
  boss = null,
  bossSpawned = false,
  anyDead = false;
const DIR = { x: 0, z: 0 };

function walkAt(x, z) {
  if (x < 0 || z < 0) return false;
  const i = x | 0,
    j = z | 0;
  if (i >= G || j >= G) return false;
  const c = grid[j * G + i];
  return c === 1 || c === 2;
}
function canStand(x, z, r) {
  return walkAt(x - r, z - r) && walkAt(x + r, z - r) && walkAt(x - r, z + r) && walkAt(x + r, z + r);
}
function moveCircle(e, dx, dz) {
  const r = Math.min(e.r * 0.8, 0.45);
  if (dx && canStand(e.x + dx, e.z, r)) e.x += dx;
  if (dz && canStand(e.x, e.z + dz, r)) e.z += dz;
}
function bfs(field, srcs) {
  field.fill(-1);
  let qh = 0,
    qt = 0;
  for (let k = 0; k < srcs.length; k++) {
    const s = srcs[k];
    if (s >= 0 && s < G * G && field[s] < 0) {
      field[s] = 0;
      Q[qt++] = s;
    }
  }
  while (qh < qt) {
    const c = Q[qh++],
      d = field[c] + 1,
      i = c % G,
      j = (c / G) | 0;
    let n;
    if (i > 0) {
      n = c - 1;
      if (field[n] < 0 && (grid[n] === 1 || grid[n] === 2)) {
        field[n] = d;
        Q[qt++] = n;
      }
    }
    if (i < G - 1) {
      n = c + 1;
      if (field[n] < 0 && (grid[n] === 1 || grid[n] === 2)) {
        field[n] = d;
        Q[qt++] = n;
      }
    }
    if (j > 0) {
      n = c - G;
      if (field[n] < 0 && (grid[n] === 1 || grid[n] === 2)) {
        field[n] = d;
        Q[qt++] = n;
      }
    }
    if (j < G - 1) {
      n = c + G;
      if (field[n] < 0 && (grid[n] === 1 || grid[n] === 2)) {
        field[n] = d;
        Q[qt++] = n;
      }
    }
  }
}
const NB = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
function fieldDir(field, x, z) {
  const i = x | 0,
    j = z | 0;
  if (x < 0 || z < 0 || i >= G || j >= G) return false;
  const cur = field[j * G + i];
  if (cur <= 0) return false;
  let best = cur,
    bi = i,
    bj = j;
  for (let k = 0; k < 8; k++) {
    const di = NB[k][0],
      dj = NB[k][1],
      ni = i + di,
      nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= G || nj >= G) continue;
    const v = field[nj * G + ni];
    if (v < 0) continue;
    if (di && dj && (field[j * G + ni] < 0 || field[nj * G + i] < 0)) continue;
    const c = v + (di && dj ? 0.5 : 0);
    if (c < best) {
      best = c;
      bi = ni;
      bj = nj;
    }
  }
  if (bi === i && bj === j) return false;
  const dx = bi + 0.5 - x,
    dz = bj + 0.5 - z,
    d = Math.hypot(dx, dz) || 1;
  DIR.x = dx / d;
  DIR.z = dz / d;
  return true;
}
function cellOf(x, z) {
  return (z | 0) * G + (x | 0);
}

/* ================= budowa etapu ================= */
function boxBuilder() {
  const items = [];
  return {
    add(x, y, z, w, h, d, color, ry) {
      items.push([x, y, z, w, h, d, color, ry || 0]);
    },
    build(material, cast, recv) {
      if (!items.length) return null;
      const m = new THREE.InstancedMesh(BOX, material, items.length);
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        dummy.position.set(it[0], it[1], it[2]);
        dummy.rotation.set(0, it[7], 0);
        dummy.scale.set(it[3], it[4], it[5]);
        dummy.updateMatrix();
        m.setMatrixAt(k, dummy.matrix);
        m.setColorAt(k, tmpC.setHex(it[6]));
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.castShadow = cast;
      m.receiveShadow = recv;
      m.frustumCulled = false;
      m.userData.own = true;
      world.add(m);
      return m;
    },
  };
}
let lightSrc = [],
  glowers = [],
  corpses = [];
function clearWorld() {
  resetBossFx();
  cryptReset();
  for (let i = world.children.length - 1; i >= 0; i--) {
    const o = world.children[i];
    world.remove(o);
    o.traverse(c => {
      if (c.userData && c.userData.own && c.material) c.material.dispose();
      if (c.userData && c.userData.ownGeo) c.geometry.dispose();
      if (c.isInstancedMesh && c.dispose) c.dispose();
    });
  }
  for (let i = actors.children.length - 1; i >= 0; i--) actors.remove(actors.children[i]);
  for (const p of pickups) {
    p.m.visible = false;
    gemPool.push(p.m);
  }
  projClear();
  nodes = [];
  units = [];
  pickups = [];
  projs = [];
  boss = null;
  bossSpawned = false;
  ending = null;
  lightSrc = [];
  glowers = [];
  corpses = [];
  for (const t of teles) {
    t.a.visible = t.b.visible = false;
    t.t = 0;
  }
  for (const d of decals) {
    d.m.visible = false;
    d.t = 0;
  }
  aimReset();
  trailS.length = 0;
}
function buildWorld(idx) {
  clearWorld();
  const L = LEVELS[idx],
    TH = THEMES[L.theme];
  level = L;
  levelIdx = idx;
  theme = TH;
  const rng = mulberry(L.seed),
    P = a => a[(rng() * a.length) | 0],
    key = TH.key;
  const jit = (c, a) =>
    tmpC
      .setHex(c)
      .offsetHSL(0, (rng() - 0.5) * 0.04, (rng() - 0.5) * (a || 0.045))
      .getHex();
  {
    const d = TH.sunDir,
      l = Math.hypot(d[0], d[1], d[2]),
      v = (TH.sunV = [d[0] / l, d[1] / l, d[2] / l]),
      rl = Math.hypot(v[2], v[0]),
      R = (TH.sR = [v[2] / rl, 0, -v[0] / rl]);
    TH.sU = [v[1] * R[2], v[2] * R[0] - v[0] * R[2], -v[1] * R[0]];
  }
  grid.fill(0);
  const owner = new Int8Array(G * G).fill(-1),
    pathM = new Uint8Array(G * G),
    linkD = new Float32Array(G * G);
  for (let j = 1; j < G - 1; j++)
    for (let i = 1; i < G - 1; i++) {
      const c = j * G + i,
        cx = i + 0.5,
        cz = j + 0.5;
      let v = 0,
        ld = 99;
      for (let k = 0; k < L.nodes.length; k++) {
        const n = L.nodes[k];
        if (Math.hypot(cx - n.x, cz - n.z) < n.r - 0.4 + rng() * 0.9) {
          v = 1;
          owner[c] = k;
          break;
        }
      }
      for (const lk of L.links) {
        const d = segDist(cx, cz, L.nodes[lk[0]], L.nodes[lk[1]]);
        if (d < ld) ld = d;
      }
      linkD[c] = ld;
      if (!v && ld < 1.55) v = 2;
      if (v === 1) {
        const n = L.nodes[owner[c]],
          nd = Math.hypot(cx - n.x, cz - n.z);
        if (ld < 0.95 + rng() * 0.5 || nd < 2.9 + rng() * 0.5) pathM[c] = 1;
      }
      grid[c] = v;
    }
  const tb = boxBuilder(),
    db = boxBuilder(),
    eb = boxBuilder(),
    fb = boxBuilder(),
    wb = boxBuilder();
  const isVoid = (i, j) => grid[j * G + i] === 0;
  const isEdge = (i, j) => isVoid(i - 1, j) || isVoid(i + 1, j) || isVoid(i, j - 1) || isVoid(i, j + 1);
  function addLight(x, y, z, color, range, int, gs) {
    lightSrc.push({ x, y: y + 0.5, z, color, range, int, flick: true, ph: rng() * 6, d: 0 });
    if (gs) {
      const s = glowSprite(world, color, gs, x, y, z, 0.5);
      s.userData.b = gs;
      s.userData.ph = rng() * 6;
      glowers.push(s);
    }
  }
  function tree(x, y0, z, big) {
    const r = rng(),
      th = (big ? 1.2 : 0.9) + rng() * 0.6;
    let tr = 0x6b4526,
      g1,
      g2;
    if (r < 0.14) {
      tr = 0xd9d4c4;
      g1 = 0x9cc24e;
      g2 = 0xb4d463;
    } else if (r < 0.22) {
      g1 = 0xf09abc;
      g2 = 0xf7b8d0;
    } else {
      g1 = P([0x2f7d32, 0x3a9140, 0x2a6e2c, 0x4aa345]);
      g2 = shade(g1, 0.06);
    }
    db.add(x, y0 + 0.1, z, 0.66, 0.2, 0.66, shade(tr, -0.06));
    db.add(x, y0 + th / 2, z, 0.42, th, 0.42, tr);
    if (tr === 0xd9d4c4) {
      db.add(x, y0 + th * 0.4, z + 0.2, 0.2, 0.08, 0.04, 0x3a3630);
      db.add(x + 0.2, y0 + th * 0.7, z, 0.04, 0.08, 0.2, 0x3a3630);
    }
    const s = big ? 1.15 : 1;
    fb.add(x, y0 + th + 0.42 * s, z, 1.8 * s, 0.84 * s, 1.8 * s, g1);
    fb.add(x, y0 + th + 1.14 * s, z, 1.3 * s, 0.7 * s, 1.3 * s, g2);
    fb.add(x, y0 + th + 1.68 * s, z, 0.68 * s, 0.44 * s, 0.68 * s, g1);
    fb.add(x + 0.8 * s, y0 + th + 0.5 * s, z + 0.15, 0.5, 0.5, 0.8, g2);
    fb.add(x - 0.15, y0 + th + 0.45 * s, z + 0.82 * s, 0.8, 0.46, 0.5, g2);
    fb.add(x - 0.78 * s, y0 + th + 0.7 * s, z - 0.2, 0.46, 0.42, 0.7, g1);
  }
  function brazier(x, z) {
    db.add(x, 0.3, z, 0.56, 0.6, 0.56, shade(TH.stone, -0.12));
    db.add(x, 0.68, z, 0.86, 0.18, 0.86, shade(TH.stone, -0.04));
    const F = TH.fire || { a: 0xff8a2a, b: 0xffc040, c: 0xfff0a0, l: 0xff9a40 };
    eb.add(x, 0.88, z, 0.5, 0.24, 0.5, F.a);
    eb.add(x, 1.1, z, 0.3, 0.24, 0.3, F.b);
    eb.add(x, 1.3, z, 0.14, 0.2, 0.14, F.c);
    addLight(x, 1.15, z, F.l, 9, 1.15, 3.4);
  }
  function lantern(x, y, z) {
    db.add(x, y + 0.02, z, 0.28, 0.06, 0.28, 0x2a2620);
    const Lm = TH.lamp || { c: 0xffc860, l: 0xffb45a };
    eb.add(x, y + 0.17, z, 0.2, 0.24, 0.2, Lm.c);
    db.add(x, y + 0.32, z, 0.28, 0.06, 0.28, 0x2a2620);
    addLight(x, y + 0.17, z, Lm.l, 7.5, 0.9, 2.4);
  }
  // murki i skały na dalszej krawędzi wysp (tło, nie zasłania bohatera)
  const rims = [];
  for (let j = 1; j < G - 1; j++)
    for (let i = 1; i < G - 1; i++) {
      const c = j * G + i;
      if (grid[c] !== 1 || pathM[c] || linkD[c] < 2.8 || !isEdge(i, j)) continue;
      const n = L.nodes[owner[c]];
      if (((i + 0.5 - n.x) * -0.58 + (j + 0.5 - n.z) * -0.81) / n.r < 0.28) continue;
      if (rng() < 0.62) rims.push([i, j, rng() < 0.38 ? 2 : 1]);
    }
  for (const r of rims) grid[r[1] * G + r[0]] = 3;
  for (const r of rims) {
    const x = r[0] + 0.5,
      z = r[1] + 0.5,
      tall = r[2] === 2;
    if (key === 'forest') {
      db.add(x, 0.5, z, 1, 1, 1, jit(TH.rim));
      if (tall) {
        db.add(x, 1.42, z, 0.92, 0.84, 0.92, jit(TH.rim));
        db.add(x, 1.9, z, 0.96, 0.14, 0.96, jit(TH.rimTop));
        if (rng() < 0.3) db.add(x + 0.2, 2.08, z - 0.1, 0.3, 0.24, 0.3, 0x3a8a3a);
      } else {
        db.add(x, 1.07, z, 1.02, 0.16, 1.02, jit(TH.rimTop));
        const q = rng();
        if (q < 0.3) tree(x, 1.15, z, false);
        else if (q < 0.5) db.add(x, 1.3, z, 0.7, 0.34, 0.7, 0x3a8a3a);
      }
    } else if (key === 'desert') {
      db.add(x, 0.5, z, 1, 1, 1, jit(TH.rim));
      db.add(x, 1.04, z, 1.04, 0.1, 1.04, jit(TH.rimTop));
      if (tall) {
        db.add(x, 1.6, z, 0.8, 1.0, 0.8, jit(TH.rim));
        if (rng() < 0.5) db.add(x, 2.2, z, 1.0, 0.2, 1.0, jit(TH.rimTop));
        else db.add(x + 0.15, 2.25, z, 0.4, 0.3, 0.5, jit(TH.rim));
      } else if (rng() < 0.25) db.add(x, 1.3, z, 0.5, 0.44, 0.5, 0xb5653a);
    } else if (key === 'crypt') {
      const h = (tall ? 1.9 : 1.0) + rng() * 0.6;
      db.add(x, h / 2, z, 1, h, 1, jit(TH.rim, 0.03));
      db.add(x, h + 0.07, z, 1.06, 0.14, 1.06, jit(TH.rimTop, 0.03));
      if (rng() < 0.3) db.add(x - 0.2, h + 0.2, z + 0.1, 0.4, 0.14, 0.5, jit(TH.rim, 0.03));
      if (rng() < 0.35) db.add(x + (rng() - 0.5) * 0.5, h * 0.4, z + 0.51, 0.34, 0.3, 0.02, 0x2f4a3c);
      if (!tall && rng() < 0.3) {
        for (let k = -1; k <= 1; k++) db.add(x + k * 0.3, h + 0.45, z, 0.06, 0.7, 0.06, 0x15181b);
        db.add(x, h + 0.62, z, 0.96, 0.05, 0.06, 0x15181b);
      } else if (rng() < 0.25) {
        db.add(x + 0.2, h + 0.2, z, 0.12, 0.26, 0.12, 0xd8d2c0);
        eb.add(x + 0.2, h + 0.39, z, 0.06, 0.1, 0.06, TH.fire.b);
      }
    } else {
      const h = (tall ? 2.0 : 0.9) + rng() * 1.0;
      db.add(x, h / 2, z, 0.98, h, 0.98, jit(TH.rim, 0.03));
      db.add(x + 0.22, h * 0.32, z + 0.24, 0.6, h * 0.64, 0.6, jit(TH.rimTop, 0.03));
      if (rng() < 0.22) eb.add(x, h + 0.012, z, 0.5, 0.024, 0.08, 0xff7a2a, rng() * 3);
    }
  }
  function blocker(x, z) {
    const r = rng();
    if (key === 'forest') {
      if (r < 0.5) tree(x, 0, z, rng() < 0.4);
      else if (r < 0.7) {
        db.add(x, 0.32, z, 0.95, 0.64, 0.85, jit(0x868c95), rng() * 1.5);
        db.add(x + 0.25, 0.72, z - 0.1, 0.45, 0.3, 0.45, 0x9aa0a8, rng() * 1.5);
        db.add(x - 0.1, 0.66, z + 0.1, 0.5, 0.06, 0.4, 0x5c9c40, rng());
      } else if (r < 0.84) {
        fb.add(x, 0.32, z, 0.95, 0.64, 0.95, 0x3a8a3a);
        fb.add(x, 0.74, z, 0.6, 0.3, 0.6, 0x48a046);
        for (let k = 0; k < 4; k++)
          db.add(
            x + (rng() - 0.5) * 0.8,
            0.3 + rng() * 0.4,
            z + 0.49 * (rng() < 0.5 ? 1 : -1),
            0.1,
            0.1,
            0.06,
            0xe0405a
          );
      } else if (r < 0.93) {
        db.add(x, 0.25, z, 0.6, 0.5, 0.6, 0x7a5232);
        db.add(x, 0.51, z, 0.5, 0.03, 0.5, 0xc49a62);
        db.add(x + 0.36, 0.14, z + 0.2, 0.08, 0.28, 0.08, 0xefe6cf);
        db.add(x + 0.36, 0.32, z + 0.2, 0.26, 0.12, 0.26, 0xd94a3a);
      } else {
        db.add(x, 0.5, z, 0.3, 1.0, 0.3, 0xefe6cf);
        db.add(x, 1.14, z, 1.2, 0.34, 1.2, 0xd94a3a);
        db.add(x, 1.38, z, 0.7, 0.16, 0.7, 0xd94a3a);
        db.add(x + 0.3, 1.33, z + 0.3, 0.2, 0.04, 0.2, 0xffffff);
        db.add(x - 0.35, 1.33, z - 0.1, 0.16, 0.04, 0.16, 0xffffff);
        db.add(x + 0.05, 1.48, z - 0.2, 0.14, 0.04, 0.14, 0xffffff);
      }
    } else if (key === 'desert') {
      if (r < 0.3) {
        const h = 1.0 + rng() * 1.8;
        db.add(x, 0.14, z, 1, 0.28, 1, 0xbf9c62);
        db.add(x, h / 2 + 0.14, z, 0.74, h, 0.74, jit(0xd2b077));
        db.add(x, h * 0.5, z, 0.8, 0.08, 0.8, 0xbf9c62);
        if (rng() < 0.6) db.add(x, h + 0.26, z, 1, 0.24, 1, 0xe0c58c);
        else db.add(x + 0.14, h + 0.24, z - 0.1, 0.4, 0.2, 0.44, 0xd2b077);
      } else if (r < 0.5) {
        let px = x,
          pz = z;
        const lx = (rng() - 0.5) * 0.24,
          lz = (rng() - 0.5) * 0.24,
          n = 4 + ((rng() * 2) | 0);
        for (let k = 0; k < n; k++) {
          db.add(px, 0.25 + k * 0.5, pz, 0.3 - k * 0.02, 0.5, 0.3 - k * 0.02, k & 1 ? 0x9a7040 : 0x8a6236);
          px += lx;
          pz += lz;
        }
        const ty = n * 0.5 + 0.06,
          g = 0x5fa04a,
          g2 = 0x4c8a3c;
        db.add(px, ty, pz, 0.44, 0.2, 0.44, g2);
        for (const d of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          fb.add(px + d[0] * 0.7, ty + 0.04, pz + d[1] * 0.7, d[0] ? 1.1 : 0.36, 0.08, d[1] ? 1.1 : 0.36, g);
          fb.add(px + d[0] * 1.35, ty - 0.14, pz + d[1] * 1.35, d[0] ? 0.5 : 0.3, 0.08, d[1] ? 0.5 : 0.3, g2);
        }
      } else if (r < 0.68) {
        const h = 1.1 + rng() * 0.7;
        db.add(x, h / 2, z, 0.42, h, 0.42, 0x4f9d58);
        db.add(x + 0.38, h * 0.55, z, 0.34, 0.26, 0.3, 0x4f9d58);
        db.add(x + 0.5, h * 0.72, z, 0.24, 0.5, 0.24, 0x5bb066);
        db.add(x - 0.36, h * 0.4, z, 0.3, 0.24, 0.3, 0x4f9d58);
        db.add(x, h + 0.07, z, 0.2, 0.14, 0.2, 0xf06a9a);
      } else if (r < 0.85) {
        const ry = rng() < 0.5 ? 0 : Math.PI / 2;
        db.add(x, 0.4, z, 1, 0.8, 0.5, jit(0xc9a66a), ry);
        db.add(x, 0.95, z, 0.5, 0.3, 0.5, 0xb28e58, ry);
        db.add(x, 0.3, z, 0.3, 0.6, 0.52, 0x9a7a48, ry);
      } else brazier(x, z);
    } else if (key === 'crypt') {
      if (r < 0.3) {
        const ry = (rng() - 0.5) * 0.5,
          gs = jit(0x6a7078, 0.04);
        db.add(x, 0.07, z, 0.9, 0.14, 0.7, jit(0x4a5056, 0.03), ry);
        if (rng() < 0.6) {
          db.add(x, 0.55, z - 0.1, 0.66, 0.84, 0.18, gs, ry);
          db.add(x, 1.0, z - 0.1, 0.46, 0.12, 0.18, gs, ry);
          db.add(x, 0.6, z - 0.0, 0.3, 0.06, 0.02, 0x2a2e33, ry);
        } else {
          db.add(x, 0.65, z - 0.1, 0.2, 1.1, 0.18, gs, ry);
          db.add(x, 0.85, z - 0.1, 0.7, 0.18, 0.18, gs, ry);
        }
        if (rng() < 0.5) db.add(x + 0.2, 0.16, z + 0.2, 0.36, 0.05, 0.3, 0x2f4a3c);
      } else if (r < 0.5) {
        const th = 1.6 + rng() * 0.8,
          tc = 0x2a2420;
        db.add(x, 0.1, z, 0.6, 0.2, 0.6, shade(tc, -0.04));
        db.add(x, th / 2, z, 0.34, th, 0.34, tc);
        db.add(x + 0.4, th * 0.62, z, 0.62, 0.1, 0.1, tc);
        db.add(x + 0.68, th * 0.62 + 0.22, z, 0.1, 0.44, 0.1, tc);
        db.add(x - 0.1, th * 0.82, z + 0.36, 0.1, 0.1, 0.6, tc);
        db.add(x - 0.1, th * 0.82 + 0.2, z + 0.62, 0.08, 0.36, 0.08, tc);
        db.add(x - 0.36, th * 0.5, z - 0.1, 0.5, 0.08, 0.08, tc);
        db.add(x + 0.06, th + 0.18, z, 0.08, 0.36, 0.08, tc);
      } else if (r < 0.68) brazier(x, z);
      else if (r < 0.85) {
        const h = 1.4 + rng() * 1.4,
          st = jit(0x575e66, 0.03);
        db.add(x, 0.12, z, 0.86, 0.24, 0.86, shade(st, -0.05));
        db.add(x, h / 2 + 0.2, z, 0.56, h, 0.56, st);
        if (rng() < 0.5) db.add(x, h + 0.3, z, 0.8, 0.2, 0.8, shade(st, 0.03));
        else db.add(x + 0.5, 0.18, z + 0.3, 0.5, 0.36, 0.5, st, 0.6);
      } else {
        const ry = rng() < 0.5 ? 0 : Math.PI / 2;
        db.add(x, 0.26, z, 1.0, 0.52, 0.62, jit(0x4f565e, 0.03), ry);
        db.add(x, 0.58, z, 1.08, 0.12, 0.7, jit(0x5f666e, 0.03), ry);
        db.add(x, 0.66, z, ry ? 0.1 : 0.6, 0.04, ry ? 0.6 : 0.1, 0x2a2e33, ry);
        db.add(x, 0.66, z, ry ? 0.42 : 0.1, 0.04, ry ? 0.1 : 0.42, 0x2a2e33, ry);
      }
    } else {
      if (r < 0.45) {
        const h = 0.8 + rng() * 1.7;
        db.add(x, h / 2, z, 0.9, h, 0.9, jit(0x2a262e, 0.03));
        db.add(x + 0.2, h * 0.3, z + 0.25, 0.6, h * 0.6, 0.6, 0x35303a);
        db.add(x - 0.24, h * 0.22, z - 0.2, 0.5, h * 0.44, 0.5, 0x232027);
      } else if (r < 0.68) brazier(x, z);
      else if (r < 0.88) {
        const h = 1.2 + rng() * 1.2;
        db.add(x, h * 0.3, z, 0.7, h * 0.6, 0.7, 0x1c1822);
        db.add(x, h * 0.75, z, 0.44, h * 0.5, 0.44, 0x241f2c);
        db.add(x, h + 0.1, z, 0.2, 0.3, 0.2, 0x2c2636);
        eb.add(x, h * 0.5, z + 0.36, 0.08, h * 0.7, 0.02, COL_E);
        eb.add(x + 0.36, h * 0.4, z, 0.02, h * 0.5, 0.08, COL_E);
      } else {
        db.add(x, 0.14, z, 0.8, 0.28, 0.8, 0x2a262e);
        for (let k = 0; k < 5; k++)
          db.add(
            x + (rng() - 0.5) * 0.6,
            0.34 + rng() * 0.1,
            z + (rng() - 0.5) * 0.6,
            0.4,
            0.08,
            0.1,
            0xe6e0cc,
            rng() * 3
          );
        db.add(x, 0.52, z, 0.3, 0.26, 0.3, 0xe6e0cc);
        db.add(x, 0.52, z + 0.151, 0.2, 0.08, 0.02, 0x18181c);
      }
    }
  }
  function scatter(x, z) {
    const r = rng();
    if (key === 'forest') {
      if (r < 0.5) {
        fb.add(x, 0.15, z, 0.1, 0.3, 0.1, 0x3f8f2f);
        fb.add(x + 0.16, 0.1, z + 0.1, 0.09, 0.2, 0.09, 0x4aa13a);
        fb.add(x - 0.1, 0.12, z + 0.14, 0.08, 0.24, 0.08, 0x47983a);
      } else if (r < 0.85) {
        fb.add(x, 0.14, z, 0.06, 0.28, 0.06, 0x3f8f2f);
        fb.add(x, 0.32, z, 0.2, 0.14, 0.2, P([0xff6b8a, 0xffd84a, 0xffffff, 0xb48cff]));
      } else {
        db.add(x, 0.08, z, 0.07, 0.16, 0.07, 0xefe6cf);
        db.add(x, 0.2, z, 0.2, 0.09, 0.2, rng() < 0.5 ? 0xd94a3a : 0xa9713f);
      }
    } else if (key === 'desert') {
      if (r < 0.45) db.add(x, 0.06, z, 0.3, 0.12, 0.25, 0xb9945a, rng() * 3);
      else if (r < 0.7) db.add(x, 0.05, z, 0.55, 0.08, 0.1, 0xeee6cf, rng() * 3);
      else if (r < 0.9) {
        fb.add(x, 0.12, z, 0.08, 0.24, 0.08, 0xa98a4a);
        fb.add(x + 0.1, 0.09, z + 0.06, 0.07, 0.18, 0.07, 0xb89a58);
      } else {
        db.add(x, 0.16, z, 0.3, 0.32, 0.3, 0xb5653a);
        db.add(x, 0.34, z, 0.22, 0.06, 0.22, 0x8a4a28);
      }
    } else if (key === 'crypt') {
      if (r < 0.32) {
        fb.add(x, 0.12, z, 0.08, 0.24, 0.08, 0x2f4a3c);
        fb.add(x + 0.13, 0.09, z + 0.08, 0.07, 0.18, 0.07, 0x37554a);
      } else if (r < 0.62) db.add(x, 0.04, z, 0.5, 0.07, 0.09, 0xd8d2c0, rng() * 3);
      else if (r < 0.8) {
        db.add(x, 0.11, z, 0.22, 0.2, 0.22, 0xd8d2c0);
        db.add(x, 0.13, z + 0.111, 0.14, 0.06, 0.02, 0x15181b);
      } else {
        db.add(x, 0.07, z, 0.05, 0.14, 0.05, 0xc8d8d0);
        eb.add(x, 0.17, z, 0.16, 0.07, 0.16, TH.fire.a);
      }
    } else {
      if (r < 0.5) eb.add(x, 0.012, z, 0.5 + rng() * 0.5, 0.022, 0.09, 0xff7a2a, rng() * 3);
      else if (r < 0.88) db.add(x, 0.07, z, 0.28, 0.14, 0.24, 0x221f26, rng() * 3);
      else eb.add(x, 0.06, z, 0.12, 0.12, 0.12, 0xffa23a, rng() * 3);
    }
  }
  for (const n of L.nodes) {
    const tries = Math.floor(n.r * n.r * 0.55);
    for (let k = 0; k < tries; k++) {
      const a = rng() * TAU,
        d = 3.6 + rng() * (n.r - 4.0);
      if (d > n.r - 0.9) continue;
      const x = n.x + Math.cos(a) * d,
        z = n.z + Math.sin(a) * d,
        i = x | 0,
        j = z | 0;
      if (grid[j * G + i] !== 1 || pathM[j * G + i] || linkD[j * G + i] < 2.6) continue;
      let ok = true;
      for (let dj = -1; dj <= 1 && ok; dj++)
        for (let di = -1; di <= 1; di++) {
          const g = grid[(j + dj) * G + i + di];
          if (g === 3 || g === 0) {
            ok = false;
            break;
          }
        }
      if (!ok) continue;
      grid[j * G + i] = 3;
      blocker(i + 0.5, j + 0.5);
    }
    for (let k = 0; k < n.r * n.r * 1.1; k++) {
      const a = rng() * TAU,
        d = 2.8 + rng() * (n.r - 2.8),
        x = n.x + Math.cos(a) * d,
        z = n.z + Math.sin(a) * d,
        c = cellOf(x, z);
      if (grid[c] !== 1 || (pathM[c] && rng() < 0.8)) continue;
      scatter(x, z);
    }
  }
  if (key === 'crypt') cryptBuild(L, rng, pathM, linkD, db);
  for (const n of L.nodes) {
    const ci = n.x | 0,
      cj = n.z | 0;
    for (let dj = -1; dj <= 0; dj++) for (let di = -1; di <= 0; di++) grid[(cj + dj) * G + ci + di] = 3;
  }
  // kafle z cieniowaniem przy przeszkodach, łatami faktury i warstwową skarpą
  const cnt3 = (i, j) => {
    let n = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) if (grid[(j + dj) * G + i + di] === 3) n++;
    return n;
  };
  for (let j = 1; j < G - 1; j++)
    for (let i = 1; i < G - 1; i++) {
      const c = j * G + i,
        g = grid[c];
      if (!g) continue;
      const x = i + 0.5,
        z = j + 0.5,
        edge = isEdge(i, j);
      if (g === 2) {
        tb.add(x, -0.15, z, 1, 0.3, 1, jit(TH.bridge[(i + j) & 1]));
        if (edge) {
          tb.add(x, -0.37, z, 1, 0.14, 1, shade(TH.bridge[1], -0.12));
          let ox = 0,
            oz = 0;
          if (isVoid(i + 1, j)) ox = 1;
          else if (isVoid(i - 1, j)) ox = -1;
          if (isVoid(i, j + 1)) oz = 1;
          else if (isVoid(i, j - 1)) oz = -1;
          if ((i * 7 + j * 13) % 3 === 0) {
            const px = x + ox * 0.4,
              pz = z + oz * 0.4;
            db.add(px, 0.4, pz, 0.16, 0.8, 0.16, shade(TH.bridge[1], -0.1));
            if ((i * 5 + j * 11) % 4 === 0) lantern(px, 0.8, pz);
            else db.add(px, 0.83, pz, 0.22, 0.06, 0.22, shade(TH.bridge[1], -0.16));
          }
          if (rng() < 0.25) tb.add(x, -1.0, z, 0.26, 1.2, 0.26, shade(TH.bridge[1], -0.14));
        }
      } else {
        const n = L.nodes[owner[c]],
          nd = Math.hypot(x - n.x, z - n.z),
          ao = Math.min(3, cnt3(i, j)),
          base = pathM[c] ? P(TH.path) : P(TH.top);
        tb.add(
          x,
          -0.2,
          z,
          1,
          0.4,
          1,
          tmpC
            .setHex(base)
            .offsetHSL(0, (rng() - 0.5) * 0.04, (rng() - 0.5) * 0.04 - ao * 0.028 - (nd < 2 ? 0.05 : 0))
            .getHex()
        );
        if (g === 1 && rng() < 0.62) {
          const s = 0.26 + rng() * 0.32,
            px = x + (rng() - 0.5) * (1 - s),
            pz = z + (rng() - 0.5) * (1 - s);
          tb.add(
            px,
            0.007,
            pz,
            s,
            0.014,
            s,
            pathM[c] ? shade(base, rng() < 0.5 ? 0.05 : -0.06) : jit(P(TH.topAcc))
          );
        }
        if (edge) {
          const h1 = 0.45 + rng() * 0.5,
            h2 = 0.5 + rng() * 1.1;
          tb.add(x, -0.4 - h1 / 2, z, 1, h1, 1, jit(TH.side[0]));
          tb.add(x, -0.4 - h1 - h2 / 2, z, 0.92, h2, 0.92, jit(TH.side[1]));
          if (rng() < 0.45) {
            const h3 = 0.4 + rng() * 1.3;
            tb.add(
              x + (rng() - 0.5) * 0.2,
              -0.4 - h1 - h2 - h3 / 2,
              z + (rng() - 0.5) * 0.2,
              0.6,
              h3,
              0.6,
              jit(TH.side[2])
            );
          }
        }
      }
    }
  // płycizna przy brzegu i drobiazgi na powierzchni
  for (let j = 1; j < G - 1; j++)
    for (let i = 1; i < G - 1; i++) {
      if (grid[j * G + i] !== 0) continue;
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++)
        for (let di = -1; di <= 1; di++) {
          const g = grid[(j + dj) * G + i + di];
          if (g === 1 || g === 3) {
            near = true;
            break;
          }
        }
      if (near)
        (key === 'lava' ? eb : tb).add(i + 0.5, TH.underY + 0.05, j + 0.5, 1, 0.1, 1, jit(TH.shallow, 0.03));
    }
  for (let k = 0; k < 170; k++) {
    const x = 2 + rng() * (G - 4),
      z = 2 + rng() * (G - 4);
    if (grid[cellOf(x, z)] !== 0) continue;
    if (key === 'forest') {
      if (k % 2) continue;
      wb.add(x, TH.underY + 0.07, z, 0.4 + rng() * 0.25, 0.06, 0.4 + rng() * 0.25, jit(0x3a8a46), rng() * 3);
      if (rng() < 0.3) wb.add(x, TH.underY + 0.14, z, 0.16, 0.1, 0.16, rng() < 0.5 ? 0xf7b8d0 : 0xffffff);
    } else if (key === 'desert')
      wb.add(
        x,
        TH.underY + 0.2,
        z,
        0.8 + rng() * 1.6,
        0.4 + rng() * 0.5,
        0.8 + rng() * 1.4,
        jit(0x6a4630),
        rng() * 3
      );
    else if (key === 'crypt') {
      if (rng() < 0.12) eb.add(x, TH.underY + 0.06, z, 0.24, 0.05, 0.24, TH.fire.a, rng() * 3);
      else
        wb.add(
          x,
          TH.underY + 0.08,
          z,
          0.6 + rng() * 1.4,
          0.14,
          0.5 + rng() * 1.2,
          jit(0x0e1a1e, 0.02),
          rng() * 3
        );
    } else
      wb.add(
        x,
        TH.underY + 0.07,
        z,
        0.8 + rng() * 1.8,
        0.12,
        0.8 + rng() * 1.6,
        jit(0x241512, 0.03),
        rng() * 3
      );
  }
  underMesh = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), waterMat(TH.water, TH.bg));
  underMesh.userData.own = true;
  underMesh.userData.ownGeo = true;
  underMesh.rotation.x = -Math.PI / 2;
  underMesh.position.set(G / 2, TH.underY, G / 2);
  world.add(underMesh);
  // kapliczki: schodkowa podstawa i cztery filary
  for (const n of L.nodes) {
    const st = TH.stone;
    db.add(n.x, 0.15, n.z, 2.6, 0.3, 2.6, jit(st, 0.02));
    db.add(n.x, 0.45, n.z, 1.9, 0.3, 1.9, shade(st, -0.05));
    db.add(n.x, 0.78, n.z, 1.1, 0.36, 1.1, jit(st, 0.02));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const px = n.x + sx * 1.1,
          pz = n.z + sz * 1.1;
        db.add(px, 0.36, pz, 0.5, 0.12, 0.5, shade(st, 0.02));
        db.add(px, 1.05, pz, 0.34, 1.5, 0.34, shade(st, -0.09));
        db.add(px, 1.86, pz, 0.48, 0.14, 0.48, shade(st, 0.03));
      }
  }
  {
    const mt = texMat(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'tile'),
      md = texMat(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'prop'),
      mf = texMat(new THREE.MeshLambertMaterial({ color: 0xffffff }), 'leaf'),
      me = new THREE.MeshBasicMaterial({ color: 0xffffff });
    tb.build(mt, false, true);
    db.build(md, true, true);
    fb.build(mf, true, true);
    eb.build(me, false, false);
    wb.build(md, false, true);
  }
  scene.background.setHex(TH.bg);
  scene.fog.color.setHex(TH.bg);
  hemi.color.setHex(TH.sky);
  hemi.groundColor.setHex(TH.ground);
  hemi.intensity = TH.hemiI;
  sun.color.setHex(TH.sun);
  sun.intensity = TH.sunI;
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9;
  L.nodes.forEach((n, i) => {
    nodes.push(makeNode(n, i));
    x0 = Math.min(x0, n.x - n.r);
    x1 = Math.max(x1, n.x + n.r);
    z0 = Math.min(z0, n.z - n.r);
    z1 = Math.max(z1, n.z + n.r);
  });
  mapB = { x0: x0 - 1, z0: z0 - 1, w: x1 - x0 + 2, h: z1 - z0 + 2 };
  mapCx = (x0 + x1) / 2;
  mapCz = (z0 + z1) / 2;
  for (const n of nodes) {
    bfs(n.field, nodeCells(n));
    if (n.own === 1) for (let k = 0; k < n.cap; k++) spawnFromNode(n, true);
  }
  for (const n of nodes) n.shield = n.own === 1 && n.kids >= (level.shieldAt || 3);
  refreshFields();
  lightT = 0;
}
const RING_GEO = new THREE.RingGeometry(2.05, 2.3, 4, 1, Math.PI / 4),
  RING2_GEO = new THREE.RingGeometry(2.75, 2.9, 4, 1, 0);
const BUB_GEO = new THREE.IcosahedronGeometry(1, 1);
const BEAM_GEO = new THREE.CylinderGeometry(0.12, 0.34, 13, 8, 1, true),
  POOL_GEO = new THREE.PlaneGeometry(1, 1);
function makeNode(n, i) {
  const N = {
    isNode: true,
    i,
    x: n.x,
    z: n.z,
    R: n.r,
    r: 1.4,
    own: n.own === 0 ? 0 : 1,
    maxHp: n.hp || 150,
    hp: n.hp || 150,
    roster: n.roster || level.nodes[1].roster,
    cap: n.cap || 3,
    shield: false,
    lock: 0,
    bub: 0,
    ping: -9,
    hitT: 0,
    alertT: 0,
    raidT: level.raid ? level.raid * rnd(0.5, 1.2) : 0,
    kids: 0,
    allies: 0,
    timer: 4,
    spawnN: 0,
    barT: 0,
    flash: 0,
    pulse: 0,
    reform: 0,
    shards: [],
    flames: [],
    field: new Int16Array(G * G),
  };
  const g = new THREE.Group();
  g.position.set(n.x, 0, n.z);
  const own = o => {
    o.userData.own = true;
    g.add(o);
    return o;
  };
  const fxm = (op, map) =>
    new THREE.MeshBasicMaterial({
      map: map || null,
      transparent: true,
      opacity: op,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
  N.cm = new THREE.MeshLambertMaterial({ color: 0xffffff });
  N.fm = new THREE.MeshBasicMaterial({ color: 0xffffff });
  N.cr = own(new THREE.Mesh(OCT, N.cm));
  N.cr.position.y = 2.45;
  N.cr.castShadow = true;
  for (let k = 0; k < 3; k++) {
    const s = new THREE.Mesh(OCT, N.cm);
    s.scale.set(0.14, 0.25, 0.14);
    g.add(s);
    N.shards.push(s);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const f = new THREE.Mesh(BOX, N.fm);
      f.position.set(sx * 1.1, 2.08, sz * 1.1);
      g.add(f);
      N.flames.push(f);
    }
  N.flames[0].userData.own = true;
  N.glow = own(
    new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.6,
      })
    )
  );
  N.glow.scale.set(6.5, 6.5, 1);
  N.glow.position.y = 2.4;
  N.beam = own(new THREE.Mesh(BEAM_GEO, fxm(0.3, beamTex)));
  N.beam.position.y = 8.8;
  N.pool = own(new THREE.Mesh(POOL_GEO, fxm(0.3, glowTex)));
  N.pool.rotation.x = -Math.PI / 2;
  N.pool.position.y = 0.06;
  N.pool.scale.set(10, 10, 1);
  N.ring = own(new THREE.Mesh(RING_GEO, fxm(0.8)));
  N.ring.rotation.x = -Math.PI / 2;
  N.ring.position.y = 0.035;
  N.ring2 = own(new THREE.Mesh(RING2_GEO, fxm(0.5)));
  N.ring2.rotation.x = -Math.PI / 2;
  N.ring2.position.y = 0.04;
  N.bubble = own(new THREE.Mesh(BUB_GEO, fxm(0.1)));
  N.bubW = own(
    new THREE.Mesh(
      BUB_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        fog: false,
      })
    )
  );
  N.bubble.position.y = N.bubW.position.y = 2.45;
  N.bubble.visible = N.bubW.visible = false;
  N.bar = makeBar(g, 4.1, 2.2, 'n');
  lightSrc.push({ node: N, x: n.x, y: 3.1, z: n.z, range: 10.5, int: 0.95, flick: false, ph: i, d: 0 });
  world.add(g);
  N.g = g;
  paintNode(N);
  return N;
}
function paintNode(N) {
  const c = N.own === 0 ? COL_P : COL_E;
  N.cm.color.setHex(c);
  N.cm.emissive.setHex(c).multiplyScalar(0.45);
  N.fm.color.setHex(c).offsetHSL(0, 0, 0.12);
  for (const m of [N.glow, N.beam, N.pool, N.ring, N.ring2, N.bubble]) m.material.color.setHex(c);
  N.bubW.material.color.setHex(c).offsetHSL(0, 0, 0.18);
  N.bar.f.material = barMat[N.own === 1 ? 'n' : 'a'];
}

/* paski zdrowia nad głowami */
const barBg = new THREE.SpriteMaterial({
  color: 0x05060a,
  opacity: 0.7,
  transparent: true,
  depthTest: false,
});
const barMat = {
  e: new THREE.SpriteMaterial({ color: 0xff4d5e, transparent: true, depthTest: false }),
  a: new THREE.SpriteMaterial({ color: COL_P, transparent: true, depthTest: false }),
  n: new THREE.SpriteMaterial({ color: COL_E, transparent: true, depthTest: false }),
};
function makeBar(parent, y, w, kind) {
  const bg = new THREE.Sprite(barBg);
  bg.scale.set(w + 0.1, 0.22, 1);
  bg.position.y = y;
  bg.renderOrder = 10;
  const f = new THREE.Sprite(barMat[kind]);
  f.scale.set(w, 0.12, 1);
  f.position.y = y;
  f.renderOrder = 11;
  bg.visible = f.visible = false;
  parent.add(bg);
  parent.add(f);
  return { bg, f, w };
}
function setBar(b, frac, vis) {
  b.bg.visible = vis;
  const fv = vis && frac > 0.02;
  b.f.visible = fv;
  if (fv) {
    b.f.scale.x = b.w * frac;
    b.f.center.x = 1 / (2 * frac);
  }
}
