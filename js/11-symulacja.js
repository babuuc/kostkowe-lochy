/* Kostkowe Lochy: Symulacja świata, kapliczki i wypady, światła dynamiczne, otoczenie i kamera.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= pętla symulacji ================= */
function tryRaid(n) {
  if (
    !level.links.some(
      lk => (lk[0] === n.i && nodes[lk[1]].own === 0) || (lk[1] === n.i && nodes[lk[0]].own === 0)
    )
  )
    return;
  let raiders = 0;
  for (const u of units) if (u.raid && !u.dead) raiders++;
  if (raiders >= 4) return;
  let sent = 0;
  for (const u of units) {
    if (sent >= (n.cap >= 5 ? 3 : 2)) break;
    if (
      u.team !== 1 ||
      u.dead ||
      u.home !== n ||
      u.raid ||
      u.def.heavy ||
      u.def.heal ||
      u.def.bomb ||
      u.state !== 'move' ||
      u.tgt ||
      u.spawnT > 0
    )
      continue;
    u.raid = true;
    u.home = null;
    n.kids--;
    sent++;
    burst(u.x, 1, u.z, COL_E, 6, 3, 0.12, 0.5);
  }
  if (sent) raidCd = level.raid * 0.6;
}
function updateNodes(dt) {
  const enemyLeft = nodes.some(n => n.own === 1) || !!boss;
  if (raidCd > 0) raidCd -= dt;
  for (const n of nodes) {
    n.timer -= dt;
    if (n.barT > 0) n.barT -= dt;
    if (n.alertT > 0) n.alertT -= dt;
    if (n.lock > 0) n.lock -= dt;
    if (n.bub > 0) n.bub = Math.max(0, n.bub - dt * 4);
    if (n.hitT > 0) n.hitT -= dt;
    else if (n.hp < n.maxHp) n.hp = Math.min(n.maxHp, n.hp + n.maxHp * (n.own === 0 ? 0.02 : 0.012) * dt);
    if (n.own === 1) {
      const want = n.kids >= 3;
      if (n.shield && !want) {
        n.shield = false;
        n.lock = 12;
        n.bub = 1;
        burst(n.x, 2.4, n.z, 0xe3b3ff, 22, 7, 0.14, 0.6);
        waveFx(n.x, n.z, 0.6, 3.2, COL_E, 0.4);
        if (Math.hypot(n.x - hero.x, n.z - hero.z) < 24) {
          sfx.shieldBreak();
          dmgNum(n.x, 3.7, n.z, 'Tarcza pękła', 'crit');
        }
      } else if (!n.shield && want && n.lock <= 0) {
        n.shield = true;
        n.bub = 1;
      }
      if (n.timer <= 0) {
        n.timer = level.respawn;
        if (n.kids < n.cap) {
          spawnFromNode(n);
          if (Math.hypot(n.x - hero.x, n.z - hero.z) < 20) sfx.spawn();
        }
      }
      if (level.raid && raidCd <= 0) {
        n.raidT -= dt;
        if (n.raidT <= 0) {
          n.raidT = level.raid * rnd(0.8, 1.3);
          tryRaid(n);
        }
      }
    } else if (n.timer <= 0) {
      n.timer = 7;
      if (enemyLeft && n.allies < 2 && !ending) spawnFromNode(n);
    }
  }
}
function separate() {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    const a = units[i];
    if (a.dead) continue;
    for (let j = i + 1; j < n; j++) {
      const b = units[j];
      if (b.dead) continue;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        m = a.r + b.r;
      if (Math.abs(dx) > m || Math.abs(dz) > m) continue;
      const d = Math.hypot(dx, dz);
      if (d >= m || d < 0.0001) continue;
      const p = (m - d) * 0.5,
        ux = dx / d,
        uz = dz / d,
        wa = a.def.heavy ? 0.2 : 1,
        wb = b.def.heavy ? 0.2 : 1;
      moveCircle(a, -ux * p * wa, -uz * p * wa);
      moveCircle(b, ux * p * wb, uz * p * wb);
    }
    if (!hero.dead && hero.rollT <= 0) {
      const dx = a.x - hero.x,
        dz = a.z - hero.z,
        m = a.r + hero.r,
        d = Math.hypot(dx, dz);
      if (d < m && d > 0.0001) {
        const p = m - d,
          ux = dx / d,
          uz = dz / d;
        if (a.def.heavy) moveCircle(hero, -ux * p, -uz * p);
        else {
          moveCircle(a, ux * p * 0.8, uz * p * 0.8);
          moveCircle(hero, -ux * p * 0.2, -uz * p * 0.2);
        }
      }
    }
    for (const nd of nodes) {
      const dx = a.x - nd.x,
        dz = a.z - nd.z,
        d = Math.hypot(dx, dz),
        m = nd.r + Math.min(a.r, 0.5);
      if (d < m && d > 0.0001) moveCircle(a, (dx / d) * (m - d), (dz / d) * (m - d));
    }
  }
}
function updateSim(dt) {
  levelTime += dt;
  aimReset();
  fieldT -= dt;
  if (fieldT <= 0) {
    fieldT = 0.25;
    if (!hero.dead) bfs(fieldHero, [cellOf(hero.x, hero.z)]);
    if (boss) refreshEnemyField();
  }
  tokens = 0;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (!u.dead && u.state === 'wind' && u.tgt === hero && !u.def.ranged && !u.def.bomb) tokens++;
  }
  if (hero.dead && hero.respawnT > 0) {
    hero.respawnT -= dt;
    if (hero.respawnT <= 0 && !ending) respawnHero();
  }
  updateHero(dt);
  for (let i = 0; i < units.length; i++) updateUnit(units[i], dt);
  separate();
  updateNodes(dt);
  updateProjs(dt);
  updatePickups(dt);
  if (anyDead) {
    units = units.filter(u => !u.dead);
    anyDead = false;
  }
}
let lightT = 0,
  moteT = 0;
function updateLights(dt) {
  lightT -= dt;
  if (lightT <= 0) {
    lightT = 0.15;
    for (const s of lightSrc) {
      if (s.unit) {
        s.x = s.unit.x;
        s.z = s.unit.z;
      }
      s.d = Math.hypot(s.x - camT.x, s.z - camT.z);
    }
    lightSrc.sort((a, b) => a.d - b.d);
  }
  const cut = Math.min(lightSrc.length > 6 ? lightSrc[6].d : 1e9, state === 'menu' ? 70 : 30),
    mul = theme.lightMul;
  for (let i = 0; i < 6; i++) {
    const Lt = LIGHTS[i],
      s = lightSrc[i];
    if (!s) {
      Lt.intensity = 0;
      continue;
    }
    const fade = clamp((cut - s.d) / 5, 0, 1);
    if (s.node) {
      Lt.color.setHex(s.node.own === 0 ? COL_P : COL_E);
      Lt.intensity = s.int * mul * fade * (1 + s.node.pulse * 0.6);
    } else {
      Lt.color.setHex(s.color);
      Lt.intensity =
        s.int *
        mul *
        fade *
        (0.86 + 0.1 * Math.sin(time * 11 + s.ph) + 0.06 * Math.sin(time * 23 + s.ph * 2.3));
    }
    Lt.distance = s.range;
    Lt.position.set(s.x, s.y, s.z);
  }
  if (state === 'play' && !hero.dead) {
    heroLight.intensity = theme.heroLight * (hero.focus > 0 ? 1.8 : 1);
    heroLight.position.set(hero.x, 2.4, hero.z);
  } else heroLight.intensity = 0;
  if (flashT > 0) {
    flashT -= dt;
    flashL.intensity = flashI * Math.max(0, flashT / flashDur);
  } else flashL.intensity = 0;
}
function updateAmbient(dt) {
  for (const n of nodes) {
    const t = time + n.i * 1.7;
    n.cr.rotation.y += dt * (n.own === 1 ? 1.4 : 0.7);
    if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - dt * 5);
    let s = 1 + n.pulse * 0.25;
    s *= 0.74 + 0.26 * clamp(n.hp / n.maxHp, 0, 1);
    if (n.reform > 0) {
      n.reform = Math.max(0, n.reform - dt * 1.7);
      const k = 1 - n.reform;
      s *= k < 0.7 ? (k / 0.7) * 1.3 : 1.3 - ((k - 0.7) / 0.3) * 0.3;
    }
    n.cr.scale.set(0.66 * s, 1.1 * s, 0.66 * s);
    n.cr.position.y = 2.45 + Math.sin(t * 1.8) * 0.14;
    for (let k = 0; k < 3; k++) {
      const sh = n.shards[k],
        a = t * 1.3 + k * 2.094;
      sh.position.set(Math.cos(a) * 1.05, 2.35 + Math.sin(t * 2 + k * 2) * 0.3, Math.sin(a) * 1.05);
      sh.rotation.y = t * 2 + k;
    }
    for (let k = 0; k < 4; k++) {
      const f = n.flames[k],
        q = 1 + Math.sin(time * 9 + k * 1.7 + n.i) * 0.22;
      f.scale.set(0.2, 0.26 * q, 0.2);
      f.position.y = 2.06 + 0.13 * q;
      f.rotation.y = time * 2 + k;
    }
    if (n.flash > 0) {
      n.flash -= dt;
      n.cm.emissive.setHex(0xffffff);
      if (n.flash <= 0) paintNode(n);
    }
    n.glow.material.opacity = 0.5 + Math.sin(time * 2.4 + n.i * 1.7) * 0.12 + n.pulse * 0.3;
    n.beam.material.opacity = 0.17 + Math.sin(time * 1.6 + n.i) * 0.05 + n.pulse * 0.4;
    n.beam.rotation.y += dt * 0.5;
    n.pool.material.opacity = 0.15 + Math.sin(time * 2 + n.i) * 0.04 + n.pulse * 0.2;
    n.ring.material.opacity = 0.6 + Math.sin(time * 3 + n.i) * 0.2;
    n.ring2.rotation.z += dt * (n.own === 1 ? 0.5 : 0.25);
    const bv = n.shield || n.bub > 0;
    n.bubble.visible = n.bubW.visible = bv;
    if (bv) {
      const q = (n.shield ? 1.75 : 1.75 + (1 - n.bub) * 0.9) + Math.sin(time * 2 + n.i) * 0.03;
      n.bubble.scale.setScalar(q);
      n.bubW.scale.setScalar(q);
      n.bubble.rotation.y = n.bubW.rotation.y = time * 0.35 + n.i;
      n.bubble.material.opacity = (n.shield ? 0.1 : 0) + n.bub * 0.25;
      n.bubW.material.opacity = (n.shield ? 0.42 : 0) + n.bub * 0.5;
    }
    setBar(n.bar, n.hp / n.maxHp, n.barT > 0 && n.hp < n.maxHp);
  }
  for (let i = 0; i < glowers.length; i++) {
    const s = glowers[i],
      k = s.userData.b * (0.9 + 0.1 * Math.sin(time * 10 + s.userData.ph));
    s.scale.set(k, k, 1);
  }
  TIMEU.value = time;
  if (underMesh) {
    const u = underMesh.material.uniforms;
    u.time.value = time;
    u.fogNear.value = scene.fog.near;
    u.fogFar.value = scene.fog.far;
  }
  // cienie chmur płynące nad wyspami
  const cl = !!(theme && theme.clouds) && qLevel < 3;
  for (const c of clouds) {
    c.m.visible = cl;
    if (!cl) continue;
    c.x += dt * 1.5;
    c.z -= dt * 0.6;
    if (c.x - camT.x > 48) c.x -= 96;
    else if (c.x - camT.x < -48) c.x += 96;
    if (c.z - camT.z > 48) c.z -= 96;
    else if (c.z - camT.z < -48) c.z += 96;
    c.m.position.set(c.x, 7.5, c.z);
  }
  moteT -= dt;
  if (moteT <= 0 && theme) {
    const k = theme.key;
    moteT = k === 'lava' ? 0.05 : 0.1;
    const x = camT.x + rnd(-16, 16),
      z = camT.z + rnd(-16, 16);
    if (k === 'forest') sparks.burst(x, rnd(0.4, 2.6), z, theme.mote, 1, 0.5, 0.07, 3, -0.25);
    else if (k === 'desert') sparks.burst(x, rnd(0.2, 2), z, theme.mote, 1, 1.6, 0.05, 2.2, 0.3);
    else if (!walkAt(x, z)) {
      if (Math.random() < 0.06) sparks.burst(x, theme.underY + 0.1, z, 0xffc050, 6, 3, 0.12, 0.6);
      else
        sparks.burst(
          x,
          theme.underY + 0.2,
          z,
          Math.random() < 0.3 ? 0xffe080 : theme.mote,
          1,
          2.4,
          0.09,
          2.4,
          -1.2
        );
    }
  }
  sparks.update(dt);
  debris.update(dt);
  updateFx(dt);
  updateDmg(dt);
  updateCorpses(dt);
  updateLights(dt);
  trailUpdate(dt);
  if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt * 2.2);
  const low =
    state === 'play' && !hero.dead && hero.hp < hero.maxHp * 0.3 ? 0.3 + Math.sin(time * 6) * 0.12 : 0;
  const ho = Math.max(hurtFlash * 0.8, low);
  if (Math.abs(ho - lastHurtO) > 0.02) {
    lastHurtO = ho;
    $('hurt').style.opacity = ho.toFixed(2);
  }
}
let lastHurtO = 0;

/* ================= kamera ================= */
const camT = { x: G / 2, z: G / 2 };
let camDist = 26,
  camRX = 1,
  camRZ = 0,
  camFX = 0,
  camFZ = -1,
  menuYaw = CAM_YAW,
  shadowHalf = 18;
function setCamBasis(yaw) {
  camFX = -Math.sin(yaw);
  camFZ = -Math.cos(yaw);
  camRX = Math.cos(yaw);
  camRZ = -Math.sin(yaw);
}
setCamBasis(CAM_YAW);
function updateCamera(dt) {
  let yaw = CAM_YAW,
    d = camDist;
  if (state === 'menu') {
    menuYaw += dt * 0.07;
    yaw = menuYaw;
    d = camDist * 1.5;
    camT.x = damp(camT.x, mapCx, 2, dt);
    camT.z = damp(camT.z, mapCz, 2, dt);
  } else if (!hero.dead) {
    camT.x = damp(camT.x, hero.x + hero.vx * 0.22, 6.5, dt);
    camT.z = damp(camT.z, hero.z + hero.vz * 0.22, 6.5, dt);
  }
  trauma = Math.max(0, trauma - dt * 1.9);
  const s = trauma * trauma * 0.7,
    ox = (Math.random() - 0.5) * s,
    oy = (Math.random() - 0.5) * s,
    oz = (Math.random() - 0.5) * s;
  const cp = Math.cos(CAM_PITCH),
    spv = Math.sin(CAM_PITCH);
  camera.position.set(
    camT.x + Math.sin(yaw) * cp * d + ox,
    spv * d + oy,
    camT.z + Math.cos(yaw) * cp * d + oz
  );
  camera.lookAt(camT.x + ox, 0.7 + oy, camT.z + oz);
  scene.fog.near = d + 4;
  scene.fog.far = d + 46;
  // cień: środek przyciągany do siatki tekseli, żeby krawędzie nie migotały przy ruchu kamery
  const sv = theme.sunV,
    R = theme.sR,
    U = theme.sU,
    tex = (shadowHalf * 2) / sun.shadow.mapSize.x;
  const a = camT.x * R[0] + camT.z * R[2],
    b = camT.x * U[0] + camT.z * U[2],
    da = Math.round(a / tex) * tex - a,
    db = Math.round(b / tex) * tex - b;
  const tx = camT.x + R[0] * da + U[0] * db,
    ty = U[1] * db,
    tz = camT.z + R[2] * da + U[2] * db;
  sun.target.position.set(tx, ty, tz);
  sun.position.set(tx + sv[0] * 46, ty + sv[1] * 46, tz + sv[2] * 46);
}
function resize() {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  camDist = Math.max(25, 11.5 / (2 * t * camera.aspect));
  camera.updateProjectionMatrix();
  // obszar cienia dopasowany do widocznego kadru
  shadowHalf = clamp(
    Math.max(2 * camDist * t * camera.aspect, (2 * camDist * t) / Math.sin(CAM_PITCH)) / 2 + 3,
    13,
    22
  );
  {
    const c = sun.shadow.camera;
    c.left = -shadowHalf;
    c.right = shadowHalf;
    c.top = shadowHalf;
    c.bottom = -shadowHalf;
    c.updateProjectionMatrix();
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  mini.width = mini.height = Math.round(96 * dpr);
  if (stick.id < 0) placeStick();
}
