/* Kostkowe Lochy: Bohater: ruch, ataki, umiejętności i animacja.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= bohater: logika ================= */
// celowanie: najbliższy wróg, z premią za kierunek, w który gracz prowadzi postać
function autoAim(range) {
  const h = hero,
    pd = h.wantA === undefined ? h.face : h.wantA;
  let best = null,
    bs = 1e9;
  for (const u of units) {
    if (u.team !== 1 || u.dead) continue;
    const dx = u.x - h.x,
      dz = u.z - h.z,
      d = Math.hypot(dx, dz) - u.r;
    if (d > range) continue;
    const sc = d + Math.abs(angDiff(pd, Math.atan2(dx, dz))) * 1.3;
    if (sc < bs) {
      bs = sc;
      best = u;
    }
  }
  for (const n of nodes) {
    if (n.own !== 1) continue;
    const dx = n.x - h.x,
      dz = n.z - h.z,
      d = Math.hypot(dx, dz) - n.r;
    if (d > range) continue;
    const sc = d + Math.abs(angDiff(pd, Math.atan2(dx, dz))) * 1.3 + (n.shield ? 4 : 1);
    if (sc < bs) {
      bs = sc;
      best = n;
    }
  }
  return best;
}
function aimFace(range) {
  const h = hero;
  if (inp.mouseAim) {
    ray.setFromCamera(mouseNDC, camera);
    const o = ray.ray.origin,
      d = ray.ray.direction;
    if (d.y < -0.01) {
      const t = -(o.y - 0.9) / d.y;
      mouseW.x = o.x + d.x * t;
      mouseW.z = o.z + d.z * t;
      h.face = Math.atan2(mouseW.x - h.x, mouseW.z - h.z);
    }
  } else {
    const t = autoAim(range);
    if (t) h.face = Math.atan2(t.x - h.x, t.z - h.z);
    else if (h.wantA !== undefined) h.face = h.wantA;
  }
}
function heroAttack() {
  const h = hero;
  aimFace(3.6);
  h.combo = time - h.lastAtk < 0.75 ? (h.combo + 1) % 3 : 0;
  h.lastAtk = time;
  const fin = h.combo === 2;
  h.swingT = h.swingDur = fin ? 0.32 : 0.24;
  h.swingKind = h.combo;
  h.cd.atk = (fin ? 0.52 : 0.3) * h.cdMul;
  h.hitPending = true;
  h.hitT = fin ? 0.13 : 0.09;
  const s = Math.sin(h.face),
    c = Math.cos(h.face);
  h.kx += s * (fin ? 6.5 : 3.5);
  h.kz += c * (fin ? 6.5 : 3.5);
  slashFx(
    h.x,
    h.z,
    h.face,
    h.combo === 1 ? -1 : 1,
    fin ? 1.22 : 1,
    h.focus > 0 ? 0xffe08a : fin ? 0xffe9a8 : 0xffffff
  );
  sfx.swing(fin);
}
function heroStrike() {
  const h = hero,
    fin = h.swingKind === 2,
    range = fin ? 3.0 : 2.55,
    arc = fin ? 2.7 : 2.3,
    focus = h.focus > 0,
    mul = comboMul();
  let hits = 0,
    critAny = false;
  for (const u of units) {
    if (u.team !== 1 || u.dead) continue;
    const dx = u.x - h.x,
      dz = u.z - h.z,
      d = Math.hypot(dx, dz);
    if (d < range + u.r && (d < 1 || Math.abs(angDiff(h.face, Math.atan2(dx, dz))) < arc / 2)) {
      const crit = focus || Math.random() < 0.12;
      hurt(u, h.atk * mul * (fin ? 1.8 : 1) * rnd(0.9, 1.1) * (crit ? 2 : 1), h.x, h.z, fin ? 11 : 6, crit);
      hits++;
      critAny = critAny || crit;
    }
  }
  for (const n of nodes) {
    if (n.own !== 1) continue;
    const dx = n.x - h.x,
      dz = n.z - h.z,
      d = Math.hypot(dx, dz);
    if (d < range + n.r && Math.abs(angDiff(h.face, Math.atan2(dx, dz))) < arc / 2 + 0.3) {
      const sh = n.shield;
      hurtNode(n, h.atk * mul * (fin ? 1.8 : 1) * rnd(0.9, 1.1) * (focus ? 1.6 : 1), 0);
      if (!sh) hits++;
      else if (!hits) hits = -1;
    }
  }
  if (fin) {
    const s = Math.sin(h.face),
      c = Math.cos(h.face);
    burst(h.x + s * 1.3, 0.1, h.z + c * 1.3, theme.dust, 9, 3.2, 0.14, 0.4, 3);
    h.pop = 0.5;
    if (hits > 0) decal(h.x + s * 1.5, h.z + c * 1.5, 1.0, 2);
  }
  if (hits > 0) {
    addCombo(hits);
    if (focus) h.focus = 0;
    hitstop = Math.max(hitstop, fin ? 0.075 : 0.04);
    shake(fin ? 0.42 : 0.22);
    if (critAny) sfx.crit();
    else sfx.hit();
  } else if (hits < 0) shake(0.12);
}
function updateHero(dt) {
  const h = hero;
  if (h.dead) return;
  for (const k in h.cd) if (h.cd[k] > 0) h.cd[k] -= dt;
  if (h.inv > 0) h.inv -= dt;
  if (h.focus > 0) h.focus -= dt;
  if (h.comboT > 0) {
    h.comboT -= dt;
    if (h.comboT <= 0) h.comboN = 0;
  }
  if (h.flash > 0) {
    h.flash -= dt;
    if (h.flash <= 0) setFlash(h, false);
  }
  let ix = stick.x,
    iy = stick.y;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy += 1;
  if (keys.KeyS || keys.ArrowDown) iy -= 1;
  let il = Math.hypot(ix, iy);
  if (il > 1) {
    ix /= il;
    iy /= il;
    il = 1;
  }
  const wx = camRX * ix + camFX * iy,
    wz = camRZ * ix + camFZ * iy,
    moving = il > 0.12;
  h.wantA = moving ? Math.atan2(wx, wz) : h.face;
  if (inp.roll > 0) inp.roll -= dt;
  if (inp.spec > 0) inp.spec -= dt;
  if (inp.potion > 0) inp.potion -= dt;
  if (h.rollT > 0) {
    h.rollT -= dt;
    moveCircle(h, h.rollX * ROLL_SPD * dt, h.rollZ * ROLL_SPD * dt);
    if (Math.random() < 0.6) burst(h.x, 0.2, h.z, theme.dust, 1, 1.5, 0.12, 0.3, 2);
    if (h.rollT <= 0) {
      h.vx = h.rollX * h.speed;
      h.vz = h.rollZ * h.speed;
      h.inv = Math.max(h.inv, 0.08);
      h.pop = 0.7;
      burst(h.x, 0.1, h.z, theme.dust, 5, 2.4, 0.12, 0.35, 3);
    }
  } else {
    const sp = h.speed * (h.swingT > 0 ? 0.3 : 1) * (h.spinT > 0 ? 0.6 : 1);
    h.vx = damp(h.vx, moving ? wx * sp : 0, moving ? 16 : 22, dt);
    h.vz = damp(h.vz, moving ? wz * sp : 0, moving ? 16 : 22, dt);
    moveCircle(h, (h.vx + h.kx) * dt, (h.vz + h.kz) * dt);
    if (moving && h.swingT <= 0 && h.bowT <= 0)
      h.face = angLerp(h.face, Math.atan2(wx, wz), 1 - Math.exp(-18 * dt));
    if (inp.roll > 0 && h.cd.roll <= 0) {
      inp.roll = 0;
      h.rollT = ROLL_T;
      h.cd.roll = h.max.roll * h.cdMul;
      h.swingT = 0;
      h.hitPending = false;
      h.perfectUsed = false;
      if (moving) {
        const l = Math.hypot(wx, wz);
        h.rollX = wx / l;
        h.rollZ = wz / l;
        h.face = Math.atan2(wx, wz);
      } else {
        h.rollX = Math.sin(h.face);
        h.rollZ = Math.cos(h.face);
      }
      sfx.roll();
      burst(h.x, 0.2, h.z, theme.dust, 6, 3, 0.14, 0.35, 2);
    } else if (inp.spec > 0 && h.cd.spec <= 0) {
      inp.spec = 0;
      heroSpin();
    } else if (inp.atk && h.cd.atk <= 0 && h.spinT <= 0) heroAttack();
    else if (inp.bow && h.cd.bow <= 0 && h.cd.atk <= 0 && h.spinT <= 0) {
      aimFace(14);
      h.cd.bow = h.max.bow * h.cdMul;
      h.bowT = 0.24;
      const s = Math.sin(h.face),
        c = Math.cos(h.face);
      shoot(h.x + s * 0.6, h.z + c * 0.6, s, c, 26, 0, h.atk * 1.15 * comboMul() * (h.focus > 0 ? 2 : 1));
      if (h.focus > 0) h.focus = 0;
      h.kx -= s * 1.5;
      h.kz -= c * 1.5;
      sfx.bow();
    }
    if (inp.potion > 0) {
      if (h.cd.potion <= 0 && h.hp < h.maxHp) {
        inp.potion = 0;
        h.cd.potion = h.max.potion;
        healHero(h.maxHp * 0.5);
        burst(h.x, 1, h.z, 0xff8fa0, 14, 3.5, 0.14, 0.8, -3);
        flash(h.x, 1.5, h.z, 0xff8fa0, 1.2, 0.4, 8);
        sfx.heal();
      } else if (inp.potion > 0.15) {
        inp.potion = 0;
        sfx.no();
      }
    }
  }
  h.kx = damp(h.kx, 0, 9, dt);
  h.kz = damp(h.kz, 0, 9, dt);
  if (h.hitPending) {
    h.hitT -= dt;
    if (h.hitT <= 0) {
      h.hitPending = false;
      heroStrike();
    }
  }
  if (h.swingT > 0) h.swingT -= dt;
  if (h.bowT > 0) h.bowT -= dt;
  if (h.spinT > 0) h.spinT -= dt;
  for (const n of nodes) {
    const dx = h.x - n.x,
      dz = h.z - n.z,
      d = Math.hypot(dx, dz) || 0.001,
      m = n.r + h.r * 0.6;
    if (d < m) moveCircle(h, (dx / d) * (m - d), (dz / d) * (m - d));
    if (n.own === 0 && d < 4.4 && h.hp < h.maxHp) {
      h.hp = Math.min(h.maxHp, h.hp + 5 * dt);
      h.healT -= dt;
      if (h.healT <= 0) {
        h.healT = 0.25;
        burst(h.x + rnd(-0.4, 0.4), 0.3, h.z + rnd(-0.4, 0.4), COL_P, 1, 0.6, 0.1, 0.7, -5);
      }
    }
  }
  animHero(dt);
}
function heroSpin() {
  const h = hero,
    mul = comboMul();
  h.cd.spec = h.max.spec * h.cdMul;
  h.spinT = 0.42;
  h.swingT = 0;
  h.hitPending = false;
  waveFx(h.x, h.z, 0.6, 4.0, COL_P, 0.4);
  waveFx(h.x, h.z, 0.4, 3.0, 0xffffff, 0.3);
  burst(h.x, 0.8, h.z, COL_P, 22, 8, 0.16, 0.5, 6);
  flash(h.x, 1.4, h.z, COL_P, 2, 0.4, 10);
  sfx.spec();
  shake(0.4);
  let hits = 0;
  for (const u of units) {
    if (u.team !== 1 || u.dead) continue;
    if (Math.hypot(u.x - h.x, u.z - h.z) < 3.8 + u.r) {
      hurt(u, h.atk * 2.6 * mul, h.x, h.z, 14, true);
      u.stun = Math.max(u.stun, 0.5);
      hits++;
    }
  }
  for (const n of nodes) {
    if (n.own === 1 && Math.hypot(n.x - h.x, n.z - h.z) < 3.8 + n.r) {
      const sh = n.shield;
      hurtNode(n, h.atk * 2.6 * mul, 0);
      if (!sh) hits++;
    }
  }
  if (hits) {
    addCombo(hits);
    hitstop = 0.08;
  }
}
function animHero(dt) {
  const h = hero,
    P = h.parts,
    sp = Math.hypot(h.vx, h.vz),
    mv = clamp(sp / h.speed, 0, 1),
    A = P.armR,
    still = 1 - mv;
  if (mv > 0.05) h.phase += dt * (4 + sp * 1.7);
  const sn = Math.sin(h.phase),
    cs = Math.cos(h.phase);
  h.pop = damp(h.pop, 0, 12, dt);
  h.blink -= dt;
  if (h.blink <= 0) h.blink = 2 + Math.random() * 3;
  {
    const bs = h.blink < 0.11 ? 0.15 : 1,
      ey = P.eyes;
    for (let i = 0; i < ey.length; i++) ey[i].scale.y = bs;
  }
  const side = sn >= 0 ? 1 : -1;
  if (side !== h.stepS) {
    h.stepS = side;
    if (mv > 0.6 && h.rollT <= 0)
      burst(
        h.x - Math.sin(h.face) * 0.25,
        0.08,
        h.z - Math.cos(h.face) * 0.25,
        theme.dust,
        2,
        1.2,
        0.11,
        0.35,
        2
      );
  }
  let lL = -sn * 0.95 * mv,
    lR = sn * 0.95 * mv,
    kL = (0.1 + Math.max(0, cs) * 1.2) * mv,
    kR = (0.1 + Math.max(0, -cs) * 1.2) * mv;
  let y = 0,
    bx = mv * 0.14,
    byaw = sn * 0.16 * mv,
    sl = sn * 0.55 * mv - 0.1,
    el = -0.75,
    alz = -0.1,
    er = -0.9,
    swinging = false,
    armSet = false;
  if (h.rollT > 0) {
    lL = lR = -1.3;
    kL = kR = 1.7;
    er = -1.5;
    sl = -0.9;
    el = -1.5;
    bx = 0.55;
    byaw = 0;
  } else if (h.spinT > 0) {
    A.rotation.set(-0.1, 0, 1.5);
    armSet = true;
    er = -0.05;
    sl = 0;
    el = -0.1;
    alz = -1.45;
    bx = 0.12;
    byaw = 0;
  } else if (h.swingT > 0) {
    swinging = true;
    armSet = true;
    const k = 1 - h.swingT / h.swingDur;
    if (h.swingKind === 2) {
      const e = 1 - Math.pow(1 - k, 3);
      A.rotation.set(lerp(-3.1, -0.5, e), 0, 0.12);
      er = lerp(-0.8, -0.05, e);
      P.body.rotation.x = lerp(-0.32, 0.42, e);
      P.body.rotation.y = 0;
      y = Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.42;
      sl = lerp(-2.7, -0.4, e);
      el = -0.5;
      kL = Math.max(kL, 0.6 * (1 - e));
      kR = Math.max(kR, 0.6 * (1 - e));
    } else {
      const d = h.swingKind === 0 ? 1 : -1,
        a = k < 0.18 ? k / 0.18 : 1,
        e = k < 0.18 ? 0 : 1 - Math.pow(1 - (k - 0.18) / 0.82, 3);
      A.rotation.set(
        -0.15,
        d > 0 ? lerp(lerp(0.5, 1.0, a), -2.4, e) : lerp(lerp(-2.0, -2.5, a), 0.8, e),
        1.45
      );
      er = -0.08;
      P.body.rotation.y = lerp(d * 0.65, -d * 0.6, e);
      P.body.rotation.x = 0.14;
      sl = 0.5;
      el = -1.0;
      lR = lerp(lR, -0.5, still);
      lL = lerp(lL, 0.35, still);
      kL = lerp(kL, 0.25, still);
      kR = lerp(kR, 0.3, still);
    }
  } else if (h.bowT > 0) {
    A.rotation.set(-1.35, 0, 0.12);
    armSet = true;
    er = lerp(-0.4, -1.7, h.bowT / 0.24);
    sl = -1.5;
    el = 0;
    alz = 0;
    byaw = 0;
  }
  if (!armSet) {
    const rx = h.rollT > 0 ? -0.9 : -0.35 - sn * 0.35 * mv;
    A.rotation.x = damp(A.rotation.x, rx, 18, dt);
    A.rotation.y = damp(A.rotation.y, 0, 18, dt);
    A.rotation.z = damp(A.rotation.z, 0.14, 18, dt);
  }
  P.legL.rotation.x = damp(P.legL.rotation.x, lL, 30, dt);
  P.legR.rotation.x = damp(P.legR.rotation.x, lR, 30, dt);
  P.kneeL.rotation.x = damp(P.kneeL.rotation.x, kL, 30, dt);
  P.kneeR.rotation.x = damp(P.kneeR.rotation.x, kR, 30, dt);
  P.elbR.rotation.x = damp(P.elbR.rotation.x, er, 24, dt);
  if (!swinging) {
    P.body.rotation.y = damp(P.body.rotation.y, byaw, 14, dt);
    P.body.rotation.x = damp(P.body.rotation.x, bx, 12, dt);
  }
  P.armL.rotation.x = damp(P.armL.rotation.x, sl, 20, dt);
  P.armL.rotation.z = damp(P.armL.rotation.z, alz, 20, dt);
  P.elbL.rotation.x = damp(P.elbL.rotation.x, el, 20, dt);
  P.body.position.y = P.hipY - Math.abs(sn) * 0.05 * mv + Math.sin(time * 2.2) * 0.012;
  P.head.rotation.x = Math.sin(h.phase * 2) * 0.05 * mv - h.pop * 0.25;
  P.head.rotation.y = damp(
    P.head.rotation.y,
    mv < 0.05 && !swinging && h.bowT <= 0 ? Math.sin(time * 0.7) * 0.32 : -P.body.rotation.y * 0.5,
    8,
    dt
  );
  P.cape.rotation.x = damp(P.cape.rotation.x, 0.1 + mv * 0.7 + (h.rollT > 0 ? 0.5 : 0), 8, dt);
  P.cape2.rotation.x = damp(
    P.cape2.rotation.x,
    0.06 + mv * 0.45 + Math.sin(time * 10) * 0.16 * mv + Math.sin(time * 1.7) * 0.05,
    10,
    dt
  );
  P.bow.visible = h.bowT > 0;
  P.shield.visible = h.bowT <= 0;
  P.swordGlow.visible = h.focus > 0;
  if (h.rollT > 0) {
    const k = 1 - h.rollT / ROLL_T;
    h.spin.rotation.x = k * TAU;
    h.spin.scale.setScalar(0.86);
  } else {
    h.spin.rotation.x = 0;
    h.spin.scale.setScalar(1);
  }
  const extra = h.spinT > 0 ? (1 - h.spinT / 0.42) * TAU * 2 : 0,
    px = 1 + h.pop * 0.14;
  h.root.position.set(h.x, y, h.z);
  h.root.rotation.set(-h.pop * 0.18, h.face + extra, sn * 0.03 * mv);
  h.root.scale.set(px, 1 - h.pop * 0.12, px);
  h.root.visible = !(h.inv > 0 && h.rollT <= 0 && Math.floor(time * 30) % 3 === 0);
  h.blob.position.set(h.x, 0.032, h.z);
  h.ring.position.set(h.x, 0.04, h.z);
  h.ring.material.opacity = (h.focus > 0 ? 0.9 : 0.42) + Math.sin(time * 3) * 0.08;
  h.ring.material.color.setHex(h.focus > 0 ? 0xffe08a : COL_P);
  {
    const bq = 1.56 * (1 - y * 0.5);
    h.blob.scale.set(bq, bq, 1);
  }
  if (h.swingT > 0 || h.spinT > 0) {
    h.root.updateMatrixWorld(true);
    P.tipA.getWorldPosition(tmpV);
    P.tipB.getWorldPosition(tmpV2);
    trailPush(tmpV, tmpV2, h.focus > 0 ? 0xffe08a : 0xeafcff);
  }
}
