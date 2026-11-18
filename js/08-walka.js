/* Kostkowe Lochy: Walka i sztuczna inteligencja: obrażenia, przejmowanie kapliczek, wypady, zachowanie i animacje wrogów.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= walka ================= */
const DASH_SPD = 26;
let tokens = 0,
  maxTok = 2,
  slowmo = 0,
  raidCd = 20,
  shieldHint = false;
function alive(t, u) {
  return t.isNode ? t.own !== u.team : !t.dead;
}
function hurt(t, dmg, fx, fz, kb, crit, by) {
  if (t.isNode) {
    hurtNode(t, dmg, by || 0);
    return true;
  }
  if (t.dead) return false;
  if (t.bones > 0) {
    // leżące kości: każde trafienie rozbija je na dobre
    t.smashed = true;
    debris.burst(t.x, 0.3, t.z, 0xe2ded0, 8, 4.5, 0.14, 0.8);
    sfx.crystal();
    die(t);
    return true;
  }
  if (t.def.lich && lichImmune(t)) {
    lichBlocked(t);
    return false;
  }
  if (t === hero) {
    if (ending) return false;
    if (hero.rollT > 0) {
      if (!hero.perfectUsed) {
        hero.perfectUsed = true;
        perfectDodge();
      }
      return false;
    }
    if (hero.inv > 0) return false;
    hero.hp -= dmg;
    if (hero.hp <= 0 && TAL.second && !hero.secondUsed) {
      // druga szansa: raz na etap bohater zostaje przy życiu
      hero.secondUsed = true;
      hero.hp = 1;
      hero.inv = 2;
      dmgNum(hero.x, hero.h + 0.8, hero.z, 'Druga szansa!', 'crit');
      flash(hero.x, 1.5, hero.z, 0xffe08a, 2, 0.6, 10);
      waveFx(hero.x, hero.z, 0.4, 3, 0xffe08a, 0.5);
      sfx.perfect();
    }
    hero.inv = 0.5;
    hurtFlash = 1;
    shake(0.45);
    sfx.hurt();
    buzz(45);
    hero.comboN = 0;
    hero.comboT = 0;
  } else {
    t.hp -= dmg;
    t.provoked = 6;
    t.barT = 4;
    waveFx(t.x, t.z, 0.25, crit ? 1.7 : 1.05, crit ? 0xffe08a : 0xffffff, 0.16);
  }
  t.flash = 0.09;
  t.pop = 1;
  setFlash(t, true);
  const dx = t.x - fx,
    dz = t.z - fz,
    d = Math.hypot(dx, dz) || 1,
    k = (kb || 0) / (t.def.heavy ? 3.2 : t.elite ? 1.8 : 1);
  t.kx += (dx / d) * k;
  t.kz += (dz / d) * k;
  if (t !== hero && !t.def.heavy && !t.def.steady && !t.elite && kb > 4) {
    if (t.state === 'wind') {
      if (kb > 8) {
        t.state = 'rec';
        t.t = 0.3;
        t.stun = 0.14;
      }
    } else t.stun = 0.14;
  }
  dmgNum(
    t.x,
    t.h + 0.3,
    t.z,
    String(Math.max(1, Math.round(dmg))),
    t === hero ? 'hurt' : crit ? 'crit' : t.team === 0 ? 'ally' : ''
  );
  debris.burst(t.x, t.h * 0.6, t.z, t.pcol, crit ? 4 : 2, 4.2, 0.13, 0.55);
  burst(t.x, t.h * 0.6, t.z, 0xffffff, crit ? 5 : 2, 5, 0.08, 0.25);
  if (crit) flash(t.x, 1.2, t.z, 0xffe08a, 1.1, 0.18, 7);
  if (t.hp <= 0) {
    if (t === hero) heroDie();
    else die(t);
  }
  return true;
}
function hurtNode(n, dmg, by) {
  if (ending || n.own === by) return;
  if (n.own === 1 && n.shield) {
    if (time - n.ping > 0.2) {
      n.ping = time;
      n.bub = 1;
      dmgNum(n.x, 3.4, n.z, 'tarcza', 'ally');
      burst(n.x, 2.4, n.z, 0xe3b3ff, 4, 5, 0.1, 0.3);
      sfx.shield();
      if (!shieldHint && by === 0) {
        shieldHint = true;
        const cnt = { 3: 'trzech', 4: 'czterech', 5: 'pięciu' }[level.shieldAt || 3];
        banner('Tarcza kryształu', 'Pęknie, gdy zostanie mniej niż ' + cnt + ' strażników.', 3.2);
      }
    }
    return;
  }
  const c = n.own === 1 ? COL_E : COL_P;
  n.hp -= dmg;
  n.barT = 5;
  n.flash = 0.1;
  n.pulse = 1;
  n.hitT = 6;
  dmgNum(n.x, 3.4, n.z, String(Math.round(dmg)), n.own === 0 ? 'hurt' : '');
  burst(n.x, 2.4, n.z, n.own === 1 ? 0xe3b3ff : 0xc8f6ff, 5, 4.5, 0.12, 0.5);
  debris.burst(n.x, 2.4, n.z, c, 2, 4, 0.14, 0.7);
  sfx.crystal();
  if (n.own === 0 && n.alertT <= 0) {
    n.alertT = 16;
    banner('Kapliczka pod atakiem', 'Obroń ją albo odbijesz ją później.', 2.6);
    sfx.alarm();
  }
  if (n.hp <= 0) {
    if (n.own === 1) capture(n);
    else loseNode(n);
  }
}
function capture(n) {
  n.own = 0;
  n.hp = n.maxHp;
  n.timer = 3;
  n.allies = 0;
  n.reform = 1;
  n.shield = false;
  n.lock = 0;
  n.hitT = 0;
  n.alertT = 6;
  paintNode(n);
  burst(n.x, 2.4, n.z, COL_P, 40, 9, 0.2, 0.9);
  burst(n.x, 2.4, n.z, 0xffffff, 16, 6, 0.14, 0.6);
  debris.burst(n.x, 2.4, n.z, COL_E, 14, 7, 0.26, 1.1);
  waveFx(n.x, n.z, 1, n.R + 2, COL_P, 0.7);
  waveFx(n.x, n.z, 0.5, n.R * 0.6, 0xffffff, 0.45);
  flash(n.x, 3, n.z, COL_P, 2.4, 0.7, 16);
  shake(0.7);
  hitstop = 0.12;
  sfx.capture();
  buzz([30, 50, 60]);
  for (const u of units) {
    if (u.team === 1 && u.home === n && !u.dead) die(u, true);
  }
  for (let k = 0; k < 10 + levelIdx * 4; k++) dropGem(n.x + rnd(-1, 1), n.z + rnd(-1, 1));
  healHero(hero.maxHp * 0.3);
  refreshFields();
  buildPips();
  const left = nodes.filter(m => m.own === 1).length,
    total = nodes.length;
  if (left > 0)
    banner('Kapliczka przejęta', 'Masz ' + (total - left) + ' z ' + total + '. Golemy już się budzą.', 2.2);
  else if (level.boss && !bossSpawned) {
    spawnBoss(n);
  } else win();
}
function loseNode(n) {
  n.own = 1;
  n.hp = n.maxHp * 0.5;
  n.kids = 0;
  n.timer = 2.5;
  n.spawnN = 0;
  n.shield = false;
  n.lock = 10;
  n.hitT = 0;
  n.raidT = rnd(30, 50);
  n.reform = 1;
  paintNode(n);
  burst(n.x, 2.4, n.z, COL_E, 36, 9, 0.2, 0.9);
  debris.burst(n.x, 2.4, n.z, COL_P, 12, 7, 0.24, 1.0);
  waveFx(n.x, n.z, 1, n.R + 2, COL_E, 0.7);
  flash(n.x, 3, n.z, COL_E, 2, 0.6, 14);
  for (const u of units) {
    if (u.team === 0 && u.home === n && !u.dead) die(u, true);
  }
  if (Math.hypot(n.x - hero.x, n.z - hero.z) < 26) shake(0.5);
  sfx.lost();
  buzz([80, 60, 80]);
  banner('Kapliczka utracona', 'Wróg znów ją trzyma. Odbij ją.', 2.6);
  refreshFields();
  buildPips();
}
function spawnBoss(n) {
  bossSpawned = true;
  let dx = n.x - hero.x,
    dz = n.z - hero.z,
    d = Math.hypot(dx, dz) || 1;
  let x = n.x + (dx / d) * 3.4,
    z = n.z + (dz / d) * 3.4;
  if (!canStand(x, z, 0.45)) {
    x = n.x + 3.2;
    z = n.z;
  }
  boss = makeUnit(level.bossType || 'boss', x, z, n);
  boss.spawnT = boss.spawnDur = 1.4;
  boss.cd = 2.2;
  const bc = boss.def.lich ? LICH_C : COL_E;
  // światło bossa wisi nad nim (u wysokiego Strażnika wyżej, żeby nie świeciło od środka modelu)
  lightSrc.push({
    unit: boss,
    x,
    y: boss.def.lich ? 6.2 : 3.2,
    z,
    color: bc,
    range: boss.def.lich ? 14 : 12,
    int: boss.def.lich ? 0.75 : 1.3,
    flick: true,
    ph: 0,
    d: 0,
  });
  lightT = 0;
  waveFx(x, z, 0.5, 6, bc, 1.2);
  burst(x, 1, z, bc, 40, 8, 0.22, 1.2);
  decal(x, z, 3.2, 5);
  shake(0.9);
  sfx.boss();
  const bossName = level.bossName || 'Strażnik Głębin';
  banner(bossName, level.bossHint || 'Unikaj czerwonych kręgów i bij, gdy się odsłoni.', 3.6);
  $('bossName').textContent = bossName;
  hintQ = [];
  hintT = 0;
  $('bosshp').hidden = false;
  refreshFields();
}
function die(u, silent) {
  if (u.dead) return;
  // kościany wojownik rozpada się na kości i po chwili wstaje (najwyżej dwa razy), chyba że kości zostaną rozbite
  if (u.def.revive && !silent && !u.smashed && (u.revives || 0) < 2) {
    u.bones = 4.5;
    u.hp = 1;
    u.state = 'move';
    u.stun = 0;
    u.vx = u.vz = 0;
    u.tgt = null;
    setFlash(u, false);
    setBar(u.bar, 0, false);
    debris.burst(u.x, 0.8, u.z, 0xe2ded0, 6, 3.5, 0.12, 0.6);
    burst(u.x, 0.5, u.z, LICH_C, 6, 1.5, 0.08, 1.2, -2);
    sfx.die();
    return;
  }
  u.dead = true;
  anyDead = true;
  u.dieT = 0.16;
  setFlash(u, true);
  setBar(u.bar, 0, false);
  u.blob.visible = false;
  corpses.push(u);
  if (u.team === 1) {
    kills++;
    if (TAL.reaper && !silent) hero.cd.spec = Math.max(0, hero.cd.spec - 0.6);
    if (u.home && !u.raid && !u.def.boss && u.home.own === 1) u.home.kids--;
    if (!u.noLoot) {
      const g = u.def.gems * (u.elite ? 3 : 1) + (hero.comboN >= 10 ? 1 : 0);
      for (let k = 0; k < g; k++) dropGem(u.x, u.z);
      if (Math.random() < (u.elite ? 0.6 : 0.1)) dropGem(u.x, u.z, 'heart');
    }
  } else {
    if (u.home && u.home.own === 0) u.home.allies = Math.max(0, u.home.allies - 1);
    if (u.type === 'golem' && save.up.gol >= 8 && !silent) {
      // golemy z ulepszeniem 8 wybuchają przy śmierci
      waveFx(u.x, u.z, 0.4, 2.4, COL_P, 0.35);
      burst(u.x, 0.6, u.z, COL_P, 16, 6, 0.14, 0.5);
      sfx.boom();
      for (const e of units)
        if (e.team === 1 && !e.dead && Math.hypot(e.x - u.x, e.z - u.z) < 2.4 + e.r) hurt(e, 30, u.x, u.z, 8);
    }
  }
  if (!silent) sfx.die();
  if (u.def.lich) {
    // dusze uwalniają się z rozbitego Strażnika
    burst(u.x, 2.5, u.z, LICH_C, 70, 9, 0.2, 2.2, -5);
    burst(u.x, 1.2, u.z, 0xffffff, 30, 12, 0.14, 0.8);
    flash(u.x, 3, u.z, 0xc8fff2, 4, 1.2, 22);
  }
  if (u.def.boss) {
    boss = null;
    lightSrc = lightSrc.filter(s => s.unit !== u);
    $('bosshp').hidden = true;
    waveFx(u.x, u.z, 1, 9, COL_E, 1);
    waveFx(u.x, u.z, 0.5, 6, 0xffffff, 0.7);
    burst(u.x, 2, u.z, COL_E, 60, 11, 0.24, 1.3);
    decal(u.x, u.z, 3.6, 6);
    flash(u.x, 3, u.z, COL_E, 3, 0.9, 18);
    shake(1);
    hitstop = 0.18;
    win();
  }
}
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const u = corpses[i];
    u.dieT -= dt;
    const k = 1 - Math.max(0, u.dieT) / 0.16,
      s = u.baseScale;
    u.root.scale.set(s * (1 + k * 0.28), s * (1 - k * 0.3), s * (1 + k * 0.28));
    if (u.dieT <= 0) {
      shatter(u.root, u.frags, s);
      burst(u.x, u.h * 0.5, u.z, u.pcol, u.def.heavy ? 16 : 6, 6, 0.12, 0.5);
      actors.remove(u.root);
      actors.remove(u.blob);
      corpses.splice(i, 1);
    }
  }
}
function heroDie() {
  const h = hero;
  h.dead = true;
  h.lives--;
  buzz(160);
  shatter(h.root, h.frags, 1);
  h.root.visible = false;
  h.blob.visible = false;
  h.ring.visible = false;
  burst(h.x, 0.9, h.z, 0xffffff, 14, 6, 0.12, 0.6);
  shake(0.9);
  h.comboN = 0;
  h.focus = 0;
  if (h.lives > 0) {
    h.respawnT = 1.8;
    sfx.lose();
    banner(
      'Bohater poległ',
      h.lives === 1 ? 'Zostało ostatnie życie.' : 'Zostały ' + h.lives + ' życia.',
      1.7
    );
  } else {
    sfx.lose();
    ending = { kind: 'lose', t: 1.5 };
  }
}
function respawnHero() {
  const h = hero;
  let best = nodes[0],
    bd = 1e9;
  for (const n of nodes)
    if (n.own === 0) {
      const d = Math.hypot(n.x - h.x, n.z - h.z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
  let x = best.x,
    z = best.z + 2.8;
  for (let k = 0; k < 12 && !canStand(x, z, 0.4); k++) {
    const a = k * 0.52;
    x = best.x + Math.sin(a) * 2.9;
    z = best.z + Math.cos(a) * 2.9;
  }
  h.x = x;
  h.z = z;
  h.vx = h.vz = h.kx = h.kz = 0;
  h.hp = h.maxHp;
  h.dead = false;
  h.inv = 2.5;
  h.pop = 1;
  h.rollT = h.swingT = h.bowT = h.spinT = 0;
  h.hitPending = false;
  setFlash(h, false);
  h.root.visible = true;
  h.blob.visible = true;
  h.ring.visible = true;
  waveFx(x, z, 0.4, 4, COL_P, 0.6);
  burst(x, 1, z, COL_P, 26, 6, 0.16, 0.8, -2);
  flash(x, 2, z, COL_P, 2, 0.6, 12);
  sfx.heal();
  lastHp = -1;
}
function win() {
  if (ending) return;
  ending = { kind: 'win', t: 1.9 };
  sfx.win();
  for (const u of units) if (u.team === 1 && !u.dead) die(u, true);
}
function nodeCells(n) {
  const out = [],
    ci = n.x | 0,
    cj = n.z | 0;
  for (let dj = -2; dj <= 1; dj++)
    for (let di = -2; di <= 1; di++) {
      if (di >= -1 && di <= 0 && dj >= -1 && dj <= 0) continue;
      const c = (cj + dj) * G + ci + di;
      if (grid[c] === 1 || grid[c] === 2) out.push(c);
    }
  return out;
}
function refreshEnemyField() {
  const src = [];
  for (const n of nodes)
    if (n.own === 1) {
      const cs = nodeCells(n);
      for (let k = 0; k < cs.length; k++) src.push(cs[k]);
    }
  if (boss && !boss.dead && !boss.def.lich) src.push(cellOf(boss.x, boss.z));
  bfs(fieldEnemy, src);
}
function refreshFields() {
  refreshEnemyField();
  const src = [];
  for (const n of nodes)
    if (n.own === 0) {
      const cs = nodeCells(n);
      for (let k = 0; k < cs.length; k++) src.push(cs[k]);
    }
  bfs(fieldPlayer, src);
}
function perfectDodge() {
  const h = hero;
  slowmo = 0.34;
  h.focus = 3;
  buzz([12, 40, 12]);
  h.cd.spec = Math.max(0, h.cd.spec - 2);
  h.cd.roll = 0;
  dmgNum(h.x, h.h + 0.7, h.z, 'Unik!', 'crit');
  waveFx(h.x, h.z, 0.4, 2.6, 0xffffff, 0.3);
  flash(h.x, 1.5, h.z, 0xffffff, 1.8, 0.35, 9);
  sfx.perfect();
}
function addCombo(n) {
  const h = hero;
  h.comboN += n;
  h.comboT = 3.2;
}
function comboMul() {
  return 1 + Math.min(0.3, Math.floor(hero.comboN / 5) * 0.06);
}

function pickTarget(u) {
  let best = null,
    bd = 1e9;
  if (u.team === 1) {
    if (state !== 'play' || ending) return null;
    const ag = u.provoked > 0 ? u.def.aggro * 1.8 : u.def.aggro,
      hm = u.home;
    const consider = (t, w) => {
      const d = Math.hypot(t.x - u.x, t.z - u.z);
      if (d < ag && d * w < bd) {
        if (hm && !u.def.boss && Math.hypot(t.x - hm.x, t.z - hm.z) > hm.R + 11) return;
        bd = d * w;
        best = t;
      }
    };
    if (u.raid) {
      for (const n of nodes)
        if (n.own === 0) {
          const d = Math.hypot(n.x - u.x, n.z - u.z);
          if (d < 4.6 && d < bd) {
            bd = d;
            best = n;
          }
        }
      if (best && u.provoked <= 0) return best;
      bd = 1e9;
      best = null;
    }
    if (!hero.dead && !(hero.cloakT > 0)) consider(hero, 0.8);
    for (const a of units) if (a.team === 0 && !a.dead) consider(a, 1);
  } else {
    const ag = u.guard ? 9 : u.def.aggro;
    for (const e of units)
      if (e.team === 1 && !e.dead) {
        const d = Math.hypot(e.x - u.x, e.z - u.z);
        if (d < ag && d < bd) {
          if (u.guard && u.home && Math.hypot(e.x - u.home.x, e.z - u.home.z) > u.home.R + 4) continue;
          bd = d;
          best = e;
        }
      }
    if (!best && !u.guard)
      for (const n of nodes)
        if (n.own === 1 && !n.shield) {
          const d = Math.hypot(n.x - u.x, n.z - u.z);
          if (d < 3.9 && d < bd) {
            bd = d;
            best = n;
          }
        }
  }
  return best;
}
function steerTo(u, t, d) {
  if (t === hero && d > 3 && fieldDir(fieldHero, u.x, u.z)) return;
  DIR.x = (t.x - u.x) / d;
  DIR.z = (t.z - u.z) / d;
}
function beginWind(u, t) {
  u.state = 'wind';
  u.t = u.windDur = u.def.wind;
  u.aimX = t.x;
  u.aimZ = t.z;
  u.healTgt = null;
  if (u.def.slam) telegraph(u.x, u.z, u.def.slam, u.def.wind);
  else if (u.def.bomb) {
    telegraph(u.x, u.z, u.def.bomb, u.def.wind);
    sfx.fuse();
  } else if (u.def.heal) {
    let best = null,
      bf = 0.85;
    for (const a of units)
      if (a.team === 1 && !a.dead && a !== u && !a.def.boss) {
        const f = a.hp / a.maxHp;
        if (f < bf && Math.hypot(a.x - u.x, a.z - u.z) < 9) {
          bf = f;
          best = a;
        }
      }
    u.healTgt = best;
  } else if (u.def.dash) sfx.wail();
}
function explode(u) {
  const R = u.def.bomb;
  waveFx(u.x, u.z, 0.5, R, 0xff8a2a, 0.35);
  waveFx(u.x, u.z, 0.3, R * 0.6, 0xffe08a, 0.25);
  burst(u.x, 0.5, u.z, 0xffa23a, 26, 9, 0.2, 0.6);
  burst(u.x, 0.5, u.z, 0xfff0a0, 10, 6, 0.14, 0.4);
  debris.burst(u.x, 0.4, u.z, 0x3a3038, 10, 7, 0.22, 0.9);
  decal(u.x, u.z, R * 0.75, 3.5);
  flash(u.x, 1.2, u.z, 0xff9a40, 2.6, 0.4, 11);
  sfx.boom();
  if (Math.hypot(hero.x - u.x, hero.z - u.z) < 14) shake(0.55);
  if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < R + hero.r * 0.5)
    hurt(hero, u.dmg, u.x, u.z, 12);
  for (const a of units)
    if (a.team === 0 && !a.dead && Math.hypot(a.x - u.x, a.z - u.z) < R + a.r) hurt(a, u.dmg, u.x, u.z, 10);
  u.noLoot = true;
  die(u, true);
}
function strike(u, t) {
  u.cd = u.def.cd * rnd(0.85, 1.2);
  u.atkN++;
  u.lunge = u.def.slam ? 0.3 : u.def.ranged ? -0.18 : 0.5;
  if (u.def.slam) {
    waveFx(u.x, u.z, 0.6, u.def.slam, 0xff5a4a, 0.35);
    burst(u.x, 0.2, u.z, theme.dust, 16, 6, 0.18, 0.5);
    debris.burst(u.x, 0.2, u.z, theme.side[1], 8, 6, 0.2, 0.8);
    decal(u.x, u.z, u.def.slam * 0.85, 3);
    sfx.slam();
    const hd = Math.hypot(hero.x - u.x, hero.z - u.z);
    if (hd < 14) {
      shake(0.5);
      flash(u.x, 1, u.z, 0xff5a4a, 1.4, 0.25, 9);
    }
    if (!hero.dead && hd < u.def.slam + hero.r * 0.5) hurt(hero, u.dmg, u.x, u.z, 12);
    for (const a of units)
      if (a.team === 0 && !a.dead && Math.hypot(a.x - u.x, a.z - u.z) < u.def.slam + a.r)
        hurt(a, u.dmg, u.x, u.z, 10);
    if (u.def.boss && u.atkN % 3 === 0) {
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + u.face;
        shoot(
          u.x + Math.sin(a) * 1.6,
          u.z + Math.cos(a) * 1.6,
          Math.sin(a),
          Math.cos(a),
          8,
          1,
          u.dmg * 0.55,
          'orb'
        );
      }
    }
  } else if (u.def.dash) {
    // szarża upiora: stała długość po linii wyznaczonej na końcu zamachu
    const dx = u.aimX - u.x,
      dz = u.aimZ - u.z,
      d = Math.hypot(dx, dz) || 1;
    u.dashX = dx / d;
    u.dashZ = dz / d;
    u.dashT = u.def.dash / DASH_SPD;
    u.dashHit = false;
    u.lunge = 0;
    burst(u.x, 0.9, u.z, 0x7fffd8, 10, 4, 0.12, 0.5, 0);
    sfx.dash();
  } else if (u.def.bomb) {
    explode(u);
  } else if (u.def.heal) {
    const a = u.healTgt;
    if (a && !a.dead) {
      const before = a.hp;
      a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.4);
      a.barT = 4;
      a.pop = 0.6;
      dmgNum(a.x, a.h + 0.3, a.z, '+' + Math.round(a.hp - before), 'heal');
      burst(a.x, a.h * 0.5, a.z, 0x7dffb0, 12, 3, 0.12, 0.7, -4);
      waveFx(a.x, a.z, 0.3, 1.4, 0x7dffb0, 0.4);
      for (let k = 1; k < 8; k++)
        burst(lerp(u.x, a.x, k / 8), 1.4, lerp(u.z, a.z, k / 8), 0x7dffb0, 1, 0.5, 0.1, 0.4, 0);
      sfx.chant();
    } else {
      const dx = u.aimX - u.x,
        dz = u.aimZ - u.z,
        d = Math.hypot(dx, dz) || 1;
      shoot(u.x + (dx / d) * 0.5, u.z + (dz / d) * 0.5, dx / d, dz / d, 7.5, 1, u.dmg, 'orb');
      sfx.chant();
    }
  } else if (u.def.ranged) {
    const dx = u.aimX - u.x,
      dz = u.aimZ - u.z,
      d = Math.hypot(dx, dz) || 1;
    shoot(u.x + (dx / d) * 0.5, u.z + (dz / d) * 0.5, dx / d, dz / d, 13, 1, u.dmg);
    sfx.bow();
  } else {
    if (u.type === 'slime') {
      const dx = u.aimX - u.x,
        dz = u.aimZ - u.z,
        d = Math.hypot(dx, dz) || 1;
      u.kx += (dx / d) * 5;
      u.kz += (dz / d) * 5;
    }
    if (t && alive(t, u)) {
      const d = Math.hypot(t.x - u.x, t.z - u.z);
      if (d <= u.def.range + t.r + 0.8) {
        // golemy słabo ranią Strażnika Otchłani: walkę z nim musi wygrać bohater
        hurt(t, t.def && t.def.lich && u.team === 0 ? u.dmg * 0.35 : u.dmg, u.x, u.z, 5, false, u.team);
        if (t.isNode || t.team === 1) sfx.hit();
      }
    }
  }
}
function updateUnit(u, dt) {
  if (u.dead) return;
  u.cd -= dt;
  if (u.provoked > 0) u.provoked -= dt;
  if (u.barT > 0) u.barT -= dt;
  if (u.kx || u.kz) {
    moveCircle(u, u.kx * dt, u.kz * dt);
    u.kx = damp(u.kx, 0, 7, dt);
    u.kz = damp(u.kz, 0, 7, dt);
    if (Math.abs(u.kx) + Math.abs(u.kz) < 0.05) u.kx = u.kz = 0;
  }
  if (u.flash > 0) {
    u.flash -= dt;
    if (u.flash <= 0) setFlash(u, false);
  }
  if (u.ttl !== undefined) {
    // przyzwany golem rozsypuje się, gdy minie jego czas
    u.ttl -= dt;
    if (u.ttl <= 0) {
      burst(u.x, 0.6, u.z, 0xbfb6a8, 12, 3, 0.14, 0.5);
      die(u, true);
      return;
    }
  }
  if (u.frozen > 0) {
    u.frozen -= dt;
    u.vx = u.vz = 0;
    u.state = 'move';
    animUnit(u, 0);
    return;
  }
  if (u.def.lich) {
    updateLich(u, dt);
    animUnit(u, dt);
    return;
  }
  if (u.bones > 0) {
    u.bones -= dt;
    if (Math.random() < 0.08) burst(u.x, 0.3, u.z, LICH_C, 1, 0.5, 0.07, 1.0, -2);
    if (u.bones <= 0) {
      u.bones = 0;
      u.revives = (u.revives || 0) + 1;
      u.hp = Math.round(u.maxHp * 0.6);
      u.barT = 3;
      u.pop = 1;
      u.cd = 0.8;
      burst(u.x, 0.6, u.z, LICH_C, 14, 3.5, 0.12, 0.7, -2);
      waveFx(u.x, u.z, 0.2, 1.4, LICH_C, 0.4);
      sfx.spawn();
    }
    animUnit(u, dt);
    return;
  }
  if (u.dashT > 0) {
    u.dashT -= dt;
    moveCircle(u, u.dashX * DASH_SPD * dt, u.dashZ * DASH_SPD * dt);
    u.face = Math.atan2(u.dashX, u.dashZ);
    if (Math.random() < 0.8) burst(u.x, 0.9, u.z, 0x7fffd8, 1, 0.6, 0.12, 0.35, 0);
    if (!u.dashHit && !hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) < u.r + hero.r + 0.25)
      if (hurt(hero, u.dmg, u.x - u.dashX, u.z - u.dashZ, 9)) u.dashHit = true;
    animUnit(u, dt);
    return;
  }
  let mx = 0,
    mz = 0,
    sp = u.spd,
    faceTo = null;
  if (u.spawnT > 0) {
    u.spawnT -= dt;
  } else if (u.stun > 0) {
    u.stun -= dt;
  } else {
    u.scan -= dt;
    if (u.scan <= 0) {
      u.scan = 0.2 + Math.random() * 0.15;
      u.tgt = pickTarget(u);
    }
    let t = u.tgt;
    if (t && !alive(t, u)) t = u.tgt = null;
    if (u.state === 'wind') {
      u.t -= dt;
      if (t && !u.def.slam && !u.def.bomb && u.t > 0.12) {
        u.aimX = t.x;
        u.aimZ = t.z;
      }
      faceTo = Math.atan2(u.aimX - u.x, u.aimZ - u.z);
      if (u.def.ranged && !u.healTgt && !u.def.heal) aimLine(u.x, u.z, u.aimX, u.aimZ, 1 - u.t / u.windDur);
      if (u.def.dash) {
        const dx = u.aimX - u.x,
          dz = u.aimZ - u.z,
          d = Math.hypot(dx, dz) || 1,
          k = 1 - u.t / u.windDur;
        aimLine(u.x, u.z, u.x + (dx / d) * u.def.dash, u.z + (dz / d) * u.def.dash, k, 0.5 + k * 0.5, 0.07);
      }
      if (u.def.bomb && Math.floor(u.t * 14) % 2 === 0) setFlash(u, true);
      else if (u.def.bomb && u.flash <= 0) setFlash(u, false);
      if (u.t <= 0) {
        strike(u, t);
        u.state = 'rec';
        u.t = u.def.rec;
      }
    } else if (u.state === 'rec') {
      u.t -= dt;
      if (u.t <= 0) u.state = 'move';
    } else if (t) {
      const dx = t.x - u.x,
        dz = t.z - u.z,
        d = Math.hypot(dx, dz) || 0.001,
        reach = u.def.range + t.r + u.r * 0.5;
      faceTo = Math.atan2(dx, dz);
      if (u.def.ranged) {
        if (d < 4.2) {
          mx = -dx / d;
          mz = -dz / d;
          sp *= 0.8;
        } else if (d > u.def.range * 0.85) {
          steerTo(u, t, d);
          mx = DIR.x;
          mz = DIR.z;
        } else if (u.def.heal) {
          mx = (-dz / d) * u.strafe * 0.5;
          mz = (dx / d) * u.strafe * 0.5;
          sp *= 0.4;
        }
        if (d <= u.def.range && u.cd <= 0) beginWind(u, t);
      } else {
        if (d > reach * 0.8) {
          steerTo(u, t, d);
          mx = DIR.x;
          mz = DIR.z;
        }
        if (d <= reach && u.cd <= 0) {
          if (t !== hero || u.def.heavy || u.def.bomb || tokens < maxTok) {
            beginWind(u, t);
            if (t === hero) tokens++;
          } else {
            mx = (-dz / d) * u.strafe;
            mz = (dx / d) * u.strafe;
            sp *= 0.5;
          }
        }
      }
    } else {
      let moved = false;
      if (u.team === 0) {
        if (u.summon) {
          // golem z rogu trzyma się bohatera
          moved = true;
          if (!hero.dead && Math.hypot(hero.x - u.x, hero.z - u.z) > 2.6 && fieldDir(fieldHero, u.x, u.z)) {
            mx = DIR.x;
            mz = DIR.z;
          }
        } else if (u.guard && u.home) {
          const hd = Math.hypot(u.home.x - u.x, u.home.z - u.z);
          if (hd > u.home.R * 0.7 && fieldDir(u.home.field, u.x, u.z)) {
            mx = DIR.x;
            mz = DIR.z;
            moved = true;
          }
        } else if (state === 'play' && fieldDir(fieldEnemy, u.x, u.z)) {
          mx = DIR.x;
          mz = DIR.z;
          moved = true;
        }
      } else if (u.raid) {
        if (fieldDir(fieldPlayer, u.x, u.z)) {
          mx = DIR.x;
          mz = DIR.z;
          moved = true;
        }
      } else if (u.home && !u.def.boss) {
        const hd = Math.hypot(u.home.x - u.x, u.home.z - u.z);
        if (hd > u.home.R * 0.8 && fieldDir(u.home.field, u.x, u.z)) {
          mx = DIR.x;
          mz = DIR.z;
          moved = true;
        }
      }
      if (!moved) {
        u.wt -= dt;
        if (u.wt <= 0) {
          u.wt = 1.5 + Math.random() * 3;
          const c = u.home || hero,
            a = Math.random() * TAU,
            r = 2.4 + Math.random() * (c.R ? c.R * 0.5 : 3);
          u.wx = c.x + Math.cos(a) * r;
          u.wz = c.z + Math.sin(a) * r;
          u.wgo = Math.random() < 0.7;
        }
        if (u.wgo) {
          const dx = u.wx - u.x,
            dz = u.wz - u.z,
            d = Math.hypot(dx, dz);
          if (d > 0.4) {
            mx = dx / d;
            mz = dz / d;
            sp *= 0.4;
          } else u.wgo = false;
        }
      }
    }
  }
  u.vx = damp(u.vx, mx * sp, 10, dt);
  u.vz = damp(u.vz, mz * sp, 10, dt);
  if (Math.abs(u.vx) + Math.abs(u.vz) > 0.02) {
    const ox = u.x,
      oz = u.z;
    moveCircle(u, u.vx * dt, u.vz * dt);
    if (u.wgo && u.x === ox && u.z === oz) u.wgo = false;
  }
  if (faceTo === null && (mx || mz)) faceTo = Math.atan2(mx, mz);
  if (faceTo !== null) u.face = angLerp(u.face, faceTo, 1 - Math.exp(-10 * dt));
  animUnit(u, dt);
}
function animUnit(u, dt) {
  const P = u.parts,
    sp = Math.hypot(u.vx, u.vz),
    mv = clamp(sp / u.spd, 0, 1),
    root = u.root;
  const far = state === 'play' && Math.hypot(u.x - camT.x, u.z - camT.z) > 36;
  root.visible = !far;
  u.blob.visible = !far;
  if (far) return;
  u.pop = damp(u.pop, 0, 13, dt);
  u.lunge = damp(u.lunge, 0, 9, dt);
  let sc = u.baseScale,
    y = 0,
    lean = 0,
    roll = 0;
  if (u.spawnT > 0) {
    const k = 1 - u.spawnT / u.spawnDur,
      e = k * k * (3 - 2 * k);
    sc *= Math.max(0.01, e);
    y = -(1 - e) * u.h * 0.45;
  }
  const wind = u.state === 'wind',
    rec = u.state === 'rec',
    wk = wind ? clamp(1 - u.t / u.windDur, 0, 1) : 0;
  u.blink -= dt;
  if (u.blink <= 0) u.blink = 2 + Math.random() * 3.5;
  {
    const bs = u.blink < 0.11 ? 0.15 : 1,
      ey = P.eyes;
    for (let i = 0; i < ey.length; i++) ey[i].scale.y = bs;
  }
  if (P.lich) {
    sc *= animLich(u, dt).s;
    lean = -u.pop * 0.1;
  } else if (P.wraith) {
    const dash = u.dashT > 0;
    let ax = -0.35,
      lb = u.lean + mv * 0.25;
    if (wind) {
      ax = -2.5 * Math.min(1, wk * 1.5);
      lb = u.lean - 0.3 * wk;
    } else if (dash) {
      ax = -1.3;
      lb = 0.9;
    } else if (rec) {
      ax = -0.6;
      lb = u.lean + 0.1;
    }
    P.body.position.y = 0.35 + Math.sin(time * 2.4 + u.seed) * 0.12;
    P.armL.rotation.x = damp(P.armL.rotation.x, ax + Math.sin(time * 3 + u.seed) * 0.12, 14, dt);
    P.armR.rotation.x = damp(P.armR.rotation.x, ax + Math.sin(time * 3 + u.seed + 1) * 0.12, 14, dt);
    P.body.rotation.x = damp(P.body.rotation.x, lb, dash ? 30 : 10, dt);
    P.tail.rotation.x = damp(P.tail.rotation.x, 0.2 + mv * 0.5 + (dash ? 0.9 : 0), 8, dt);
    P.head.rotation.y = wind || dash ? 0 : Math.sin(time * 0.9 + u.seed) * 0.3 * (1 - mv);
    lean = -u.pop * 0.22;
  } else if (P.core) {
    const bomb = u.type === 'bomber';
    u.phase += dt * (mv > 0.05 ? (bomb ? 14 : 9) : 3);
    const b = P.body,
      hop = Math.abs(Math.sin(u.phase));
    let sx = 1,
      sy = 1,
      by = 0;
    if (wind) {
      if (bomb) {
        const q = 1 + wk * 0.35 + Math.sin(time * 40) * 0.04;
        sx = q;
        sy = q;
      } else {
        sx = 1 + 0.3 * wk;
        sy = 1 - 0.42 * wk;
      }
    } else {
      const s = Math.sin(u.phase * 2) * (bomb ? 0.07 : 0.13) * (mv > 0.05 ? 1 : 0.3);
      sx = 1 - s;
      sy = 1 + s;
      by = hop * (mv > 0.05 ? (bomb ? 0.22 : 0.4) : 0.04);
    }
    sx += u.pop * 0.3;
    sy -= u.pop * 0.28;
    b.scale.set(sx, sy, sx);
    b.position.y = by;
    P.core.position.y = P.coreY + Math.sin(time * (bomb ? 9 : 3) + u.seed) * 0.05;
    if (bomb) {
      const q = 1 + Math.sin(time * 18 + u.seed) * 0.3;
      P.core.scale.set(0.12 * q, 0.12 * q, 0.12 * q);
    }
  } else {
    const heavy = u.def.heavy,
      ty = u.type,
      A = heavy ? 0.55 : ty === 'archer' ? 0.62 : 0.9;
    if (mv > 0.05) u.phase += dt * (3 + sp * (ty === 'goblin' ? 2.8 : 2.2));
    const sn = Math.sin(u.phase),
      cs = Math.cos(u.phase);
    P.legL.rotation.x = -sn * A * mv;
    P.legR.rotation.x = sn * A * mv;
    P.kneeL.rotation.x = (0.1 + Math.max(0, cs) * 1.15) * mv;
    P.kneeR.rotation.x = (0.1 + Math.max(0, -cs) * 1.15) * mv;
    // pozy spoczynkowe i chód
    let sr,
      er,
      sl,
      el,
      bx = u.lean + mv * 0.1,
      byaw = sn * 0.12 * mv,
      hy = null,
      lam = 16,
      arz = 0,
      alz = 0;
    if (ty === 'goblin') {
      sl = sn * 0.7 * mv;
      el = -0.5;
      sr = -0.7 + sn * 0.15 * mv;
      er = -1.1;
    } else if (ty === 'archer') {
      sl = -0.25 + sn * 0.3 * mv;
      el = -0.5;
      sr = -sn * 0.45 * mv;
      er = -0.35;
    } else if (ty === 'shaman') {
      sr = -0.5;
      er = -0.65;
      sl = sn * 0.3 * mv;
      el = -0.35;
      y += 0.07 + Math.sin(time * 2.2 + u.seed) * 0.05;
    } else if (heavy) {
      sl = -0.2 + sn * 0.35 * mv;
      sr = -0.2 - sn * 0.35 * mv;
      el = er = -0.35;
    } else {
      sl = sn * 0.6 * mv;
      sr = -sn * 0.6 * mv;
      el = er = -0.45;
    }
    if (wind) {
      const k = Math.min(1, wk * 1.6);
      if (u.def.slam) {
        sr = sl = -2.95 * k;
        er = el = -0.3;
        bx = u.lean - 0.34 * k;
        arz = -0.2 * k;
        alz = 0.2 * k;
        if (wk > 0.72) y += (wk - 0.72) * 1.3;
      } else if (u.def.heal) {
        sr = -2.5 * k;
        er = -0.2;
        sl = -1.2 * k;
        el = -0.8;
        bx = u.lean - 0.15 * k;
      } else if (u.def.ranged) {
        sl = -1.5;
        el = 0;
        sr = -1.4;
        er = lerp(-0.5, -1.8, wk);
        byaw = 0.5;
        hy = -0.5;
      } else {
        sr = -2.7 * k;
        er = -0.6 - 0.5 * k;
        bx = u.lean - 0.22 * k;
        byaw = -0.35 * k;
      }
    } else if (rec) {
      lam = 45;
      if (u.def.slam) {
        sr = sl = -0.7;
        er = el = 0;
        bx = u.lean + 0.5;
      } else if (u.def.heal) {
        sr = -1.2;
        er = -0.3;
      } else if (u.def.ranged) {
        sl = -1.5;
        el = 0;
        sr = -1.2;
        er = -0.2;
        byaw = 0.5;
        hy = -0.5;
      } else {
        sr = -0.5;
        er = 0;
        bx = u.lean + 0.34;
        byaw = 0.4;
      }
    }
    P.armR.rotation.x = damp(P.armR.rotation.x, sr, lam, dt);
    P.armL.rotation.x = damp(P.armL.rotation.x, sl, lam, dt);
    P.elbR.rotation.x = damp(P.elbR.rotation.x, er, lam, dt);
    P.elbL.rotation.x = damp(P.elbL.rotation.x, el, lam, dt);
    P.armR.rotation.z = damp(P.armR.rotation.z, arz, lam, dt);
    P.armL.rotation.z = damp(P.armL.rotation.z, alz, lam, dt);
    P.body.rotation.x = damp(P.body.rotation.x, bx, rec ? 32 : 10, dt);
    P.body.rotation.y = damp(P.body.rotation.y, byaw, 14, dt);
    P.body.position.y =
      P.hipY - Math.abs(sn) * (heavy ? 0.07 : 0.05) * mv + Math.sin(time * 2.1 + u.seed) * 0.012;
    P.head.rotation.y = damp(
      P.head.rotation.y,
      hy !== null ? hy : wind || rec ? 0 : Math.sin(time * 0.8 + u.seed) * 0.32 * (1 - mv) - byaw * 0.6,
      10,
      dt
    );
    P.head.rotation.x =
      Math.sin(u.phase * 2) * 0.05 * mv - (wind && !u.def.ranged ? 0.25 * wk : 0) - u.pop * 0.3;
    roll = sn * (heavy ? 0.07 : 0.035) * mv;
    if (heavy) {
      const side = sn >= 0 ? 1 : -1;
      if (side !== u.stepS) {
        u.stepS = side;
        if (mv > 0.4) burst(u.x, 0.1, u.z, theme.dust, 3, 1.6, 0.14, 0.4, 3);
      }
    }
    lean = -u.pop * 0.22;
  }
  if (u.bones > 0) {
    // leży jako stos kości; tuż przed wstaniem drży
    lean = -1.45;
    y = -0.15;
    roll = u.bones < 1.2 ? Math.sin(time * 40) * 0.12 : 0;
  }
  root.position.set(u.x + Math.sin(u.face) * u.lunge, y, u.z + Math.cos(u.face) * u.lunge);
  root.rotation.set(lean, u.face, roll);
  const px = 1 + u.pop * 0.16;
  root.scale.set(sc * px, sc * (1 - u.pop * 0.12), sc * px);
  u.blob.position.set(u.x, 0.032, u.z);
  const showBar = (u.barT > 0 || u.elite) && u.hp < u.maxHp && !u.def.boss && !(u.bones > 0);
  setBar(u.bar, u.hp / u.maxHp, showBar);
}
