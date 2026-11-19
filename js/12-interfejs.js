/* Kostkowe Lochy: Interfejs: HUD, minimapa, podpowiedzi, menu etapów, ulepszenia, pauza i ekran wyniku.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= HUD ================= */
const mini = $('mini'),
  mctx = mini.getContext('2d');
let hudT = 0,
  lastHp = -1,
  lastGems = -1,
  lastLives = -1,
  lastCombo = -1;
const cdEls = { bBow: ['bow'], bRoll: ['roll'], bSpec: ['spec'], bPot: ['potion'] },
  cdLast = {};
function buildPips() {
  const p = $('pips');
  p.textContent = '';
  for (const n of nodes) {
    const i = document.createElement('i');
    if (n.own === 0) i.className = 'on';
    p.appendChild(i);
  }
}
let heartT = 0,
  ghostF = 1,
  ghostHold = 0,
  ghostLast = 1,
  ghostShown = -1;
function updateHud(dt) {
  const h = hero,
    hp = Math.max(0, Math.ceil(h.hp));
  if (hp !== lastHp) {
    lastHp = hp;
    const w = ((hp / h.maxHp) * 100).toFixed(1) + '%';
    $('hpfill').style.width = w;
    $('hptext').textContent = hp + ' / ' + h.maxHp;
  }
  if (save.gems !== lastGems) {
    lastGems = save.gems;
    $('gemn').textContent = save.gems;
    const gb = $('gemn').parentNode;
    gb.classList.remove('bump');
    void gb.offsetWidth;
    gb.classList.add('bump');
  }
  if (h.lives !== lastLives) {
    lastLives = h.lives;
    const L = $('lives');
    L.textContent = '';
    for (let i = 0; i < 3; i++) {
      const e = document.createElement('i');
      if (i < h.lives) e.className = 'on';
      L.appendChild(e);
    }
    L.setAttribute('aria-label', 'Życia: ' + h.lives);
  }
  const cn = h.comboN >= 3 ? h.comboN : 0;
  if (cn !== lastCombo) {
    lastCombo = cn;
    const c = $('combo');
    if (cn) {
      $('comboN').textContent = '×' + cn;
      const b = Math.round((comboMul() - 1) * 100);
      $('comboB').textContent = b ? '+' + b + '% obrażeń' : 'seria';
      c.classList.add('show');
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    } else c.classList.remove('show');
  }
  for (let k = 0; k < 2; k++) {
    if (!art.slots[k]) continue;
    const id = k ? 'bArt2' : 'bArt1',
      v = clamp(art.cd[k] / art.max[k], 0, 1).toFixed(2);
    if (cdLast[id] !== v) {
      const e = $(id);
      if (v === '0.00' && cdLast[id] !== undefined) {
        e.classList.remove('ready');
        void e.offsetWidth;
        e.classList.add('ready');
      }
      cdLast[id] = v;
      e.style.setProperty('--cd', v);
    }
  }
  for (const id in cdEls) {
    const k = cdEls[id][0],
      mx = h.max[k] * (k === 'potion' ? 1 : h.cdMul),
      v = clamp(h.cd[k] / mx, 0, 1).toFixed(2);
    if (cdLast[id] !== v) {
      const el = $(id);
      if (v === '0.00' && cdLast[id] !== undefined && k !== 'roll') {
        el.classList.remove('ready');
        void el.offsetWidth;
        el.classList.add('ready');
      }
      cdLast[id] = v;
      el.style.setProperty('--cd', v);
    }
  }
  if (boss) {
    $('bossfill').style.width = (clamp(boss.hp / boss.maxHp, 0, 1) * 100).toFixed(1) + '%';
    const bh = $('bosshp');
    bh.classList.toggle('phased', !!(boss.def.lich || boss.def.prince));
    bh.classList.toggle(
      'shielded',
      !!((boss.def.lich && lichImmune(boss)) || (boss.def.prince && princeImmune(boss)))
    );
    bh.classList.toggle('crimson', !!boss.def.prince);
    bh.classList.toggle('five', !!boss.def.prince);
    bh.style.setProperty('--m1', boss.def.prince ? '40%' : '33%');
    bh.style.setProperty('--m2', boss.def.prince ? '70%' : '66%');
  }
  // strzałka przy krawędzi ekranu, gdy boss jest poza kadrem
  {
    const ar = $('bossArrow');
    let show = false;
    if (boss && !boss.dead && !hero.dead) {
      tmpV.set(boss.x, 2, boss.z).project(camera);
      const W = window.innerWidth,
        Hh = window.innerHeight,
        sx = (tmpV.x * 0.5 + 0.5) * W,
        sy = (-tmpV.y * 0.5 + 0.5) * Hh,
        m = 44;
      if (sx < m || sx > W - m || sy < m + 60 || sy > Hh - m || tmpV.z > 1) {
        show = true;
        const cx = W / 2,
          cy = Hh / 2,
          ang = Math.atan2(sy - cy, sx - cx),
          px = clamp(sx, m, W - m),
          py = clamp(sy, m + 60, Hh - m);
        ar.style.transform =
          'translate(' +
          px.toFixed(0) +
          'px,' +
          py.toFixed(0) +
          'px) rotate(' +
          (ang + Math.PI / 2).toFixed(2) +
          'rad)';
      }
    }
    if (ar.hidden === show) ar.hidden = !show;
  }
  // biały „ślad” po utraconym zdrowiu: chwilę stoi, potem zjeżdża do aktualnej wartości
  const frac = clamp(h.hp / h.maxHp, 0, 1);
  if (frac < ghostLast - 0.001) ghostHold = 0.45;
  ghostLast = frac;
  if (frac >= ghostF) ghostF = frac;
  else if (ghostHold > 0) ghostHold -= dt;
  else ghostF = Math.max(frac, ghostF - dt * 0.8);
  if (Math.abs(ghostF - ghostShown) > 0.002) {
    ghostShown = ghostF;
    $('hpghost').style.width = (ghostF * 100).toFixed(1) + '%';
  }
  // bicie serca przy niskim zdrowiu
  if (!h.dead && h.hp < h.maxHp * 0.3) {
    heartT -= dt;
    if (heartT <= 0) {
      heartT = 0.85;
      sfx.heart();
    }
  } else heartT = 0;
  if (banT > 0) {
    banT -= dt;
    if (banT <= 0) $('banner').classList.remove('show');
  }
  if (banT <= 0) {
    if (hintT > 0) hintT -= dt;
    else if (hintQ.length) {
      $('hint').textContent = hintQ.shift();
      hintT = 5.5;
    }
  }
  {
    const on = hintT > 0.3 && banT <= 0;
    if (on !== hintOn) {
      hintOn = on;
      $('hint').classList.toggle('show', on);
    }
  }
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.1;
    drawMini();
  }
}
function drawMini() {
  const S = mini.width,
    g = mctx,
    b = mapB,
    pad = S * 0.08,
    sc = (S - pad * 2) / Math.max(b.w, b.h);
  const cx = b.x0 + b.w / 2,
    cz = b.z0 + b.h / 2,
    cs = Math.cos(CAM_YAW),
    sn = Math.sin(CAM_YAW),
    k = sc * 0.82;
  const X = (x, z) => S / 2 + ((x - cx) * cs - (z - cz) * sn) * k,
    Y = (x, z) => S / 2 + ((x - cx) * sn + (z - cz) * cs) * k;
  const dia = (x, y, r) => {
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r, y);
    g.lineTo(x, y + r);
    g.lineTo(x - r, y);
    g.closePath();
  };
  g.clearRect(0, 0, S, S);
  g.lineCap = 'round';
  g.lineWidth = S * 0.035;
  g.strokeStyle = 'rgba(243,236,216,.3)';
  g.beginPath();
  for (const lk of level.links) {
    const a = nodes[lk[0]],
      c = nodes[lk[1]];
    g.moveTo(X(a.x, a.z), Y(a.x, a.z));
    g.lineTo(X(c.x, c.z), Y(c.x, c.z));
  }
  g.stroke();
  const blink = Math.floor(time * 5) % 2 === 0;
  for (const n of nodes) {
    const x = X(n.x, n.z),
      y = Y(n.x, n.z),
      r = S * 0.03 + n.R * k * 0.42;
    g.fillStyle = n.own === 0 ? '#3fe3ff' : '#b657ff';
    dia(x, y, r);
    g.fill();
    if (n.hp < n.maxHp) {
      const q = r * (1 - n.hp / n.maxHp) * 0.9;
      g.fillStyle = 'rgba(8,10,16,.75)';
      dia(x, y, q);
      g.fill();
    }
    if (n.own === 1 && n.shield) {
      g.lineWidth = S * 0.02;
      g.strokeStyle = 'rgba(255,255,255,.85)';
      dia(x, y, r + S * 0.025);
      g.stroke();
    }
    if (n.own === 0 && n.hitT > 3 && blink) {
      g.lineWidth = S * 0.035;
      g.strokeStyle = '#ff4d5e';
      dia(x, y, r + S * 0.04);
      g.stroke();
    }
  }
  g.fillStyle = '#ff9a40';
  for (const u of units) {
    if (u.raid && !u.dead) {
      const x = X(u.x, u.z),
        y = Y(u.x, u.z),
        r = S * 0.018;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  if (boss) {
    g.fillStyle = '#ff4d5e';
    const x = X(boss.x, boss.z),
      y = Y(boss.x, boss.z),
      r = S * 0.045;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (!hero.dead) {
    const x = X(hero.x, hero.z),
      y = Y(hero.x, hero.z),
      r = S * 0.032;
    g.fillStyle = '#0b0d12';
    g.fillRect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4);
    g.fillStyle = '#fff';
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
let banT = 0,
  hintT = 0;
function banner(h, p, dur) {
  $('banH').textContent = h;
  $('banP').textContent = p || '';
  $('banner').classList.add('show');
  banT = dur || 2.5;
}
let hintQ = [],
  hintOn = false;
function hint(list) {
  hintQ = list.slice();
  hintT = 0;
}

/* ================= przepływ gry ================= */
// etapy z zapisu: odblokuj kolejny po każdym zdobytym (np. czwarty dla graczy, którzy przeszli trzeci przed jego dodaniem)
while (save.stars.length < LEVELS.length) save.stars.push(0);
for (let i = 0; i < LEVELS.length; i++) if (save.stars[i] > 0) save.unlocked = Math.max(save.unlocked, i + 2);
save.unlocked = clamp(save.unlocked, 1, LEVELS.length);
// talenty z zapisu: tylko znane i tylko na tyle, na ile starcza punktów
save.tal = save.tal.filter((id, i) => TALENTS.some(t => t.id === id) && save.tal.indexOf(id) === i);
if (talSpent() > talPoints()) save.tal = [];
let selIdx = save.unlocked - 1;
function talPoints() {
  return save.stars.reduce((a, b) => a + b, 0);
}
function talSpent() {
  return save.tal.reduce((a, id) => {
    const t = TALENTS.find(x => x.id === id);
    return a + (t ? t.cost : 0);
  }, 0);
}
const starStr = n => '<span>' + '★'.repeat(n) + '</span><span class="off">' + '★'.repeat(3 - n) + '</span>';
const fmtTime = s => {
  const mm = Math.floor(s / 60),
    ss = Math.floor(s % 60);
  return mm + ':' + (ss < 10 ? '0' : '') + ss;
};
function renderMenu() {
  const st = $('stages');
  st.textContent = '';
  LEVELS.forEach((L, i) => {
    if (i > 0) {
      const ln = document.createElement('span');
      ln.className = 'link' + (i < save.unlocked ? ' open' : '');
      st.appendChild(ln);
    }
    const col = document.createElement('div');
    col.className = 'stcol';
    const b = document.createElement('button');
    b.className = 'stage' + (i === selIdx ? ' sel' : '') + (i >= save.unlocked ? ' locked' : '');
    b.setAttribute(
      'aria-label',
      'Etap ' +
        (i + 1) +
        ': ' +
        L.name +
        (i >= save.unlocked ? ' (zablokowany)' : ', gwiazdki: ' + save.stars[i] + ' z 3')
    );
    b.innerHTML = '<b>' + (i + 1) + '</b>';
    b.addEventListener('click', () => {
      audioInit();
      sfx.click();
      if (selIdx !== i) {
        selIdx = i;
        buildWorld(i);
        renderMenu();
      }
    });
    const s = document.createElement('span');
    s.className = 'stars';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = i < save.unlocked ? starStr(save.stars[i]) : '';
    col.appendChild(b);
    col.appendChild(s);
    st.appendChild(col);
  });
  const L = LEVELS[selIdx],
    locked = selIdx >= save.unlocked;
  $('stName').textContent = 'Etap ' + (selIdx + 1) + '. ' + L.name;
  $('stDesc').textContent = locked ? 'Ukończ etap ' + selIdx + ', aby tu wejść.' : L.desc;
  $('playBtn').disabled = locked;
  $('menuGems').textContent = save.gems;
  // podsumowanie rozwoju; pełny ekran ulepszeń jest w 16-rozwoj.js
  {
    const S = heroStats(save.up, save.tal),
      free = talPoints() - talSpent(),
      ups = UPGRADES.reduce((a, u) => a + save.up[u.k], 0),
      arts = ARTIFACTS.filter(a => save.art.own[a.id]).length;
    $('devSum').innerHTML =
      '<span><b>' +
      heroPower(S) +
      '</b><small>moc</small></span><span><b>' +
      ups +
      '/' +
      UPGRADES.length * UP_MAX +
      '</b><small>ulepszenia</small></span><span><b>' +
      free +
      '</b><small>punkty</small></span><span><b>' +
      arts +
      '/' +
      ARTIFACTS.length +
      '</b><small>artefakty</small></span>';
    const prices = UPGRADES.filter(u => save.up[u.k] < UP_MAX)
      .map(u => upCost(save.up[u.k]))
      .concat(ARTIFACTS.filter(a => !save.art.own[a.id]).map(a => a.price));
    $('forgeBtn').classList.toggle(
      'pulse',
      free > 0 || (prices.length > 0 && save.gems >= Math.min(...prices))
    );
  }
  $('muteBtn').textContent = save.mute ? 'Dźwięk: wył.' : 'Dźwięk: wł.';
  $('vibBtn').hidden = !(isTouch && canVib);
  $('vibBtn').textContent = save.vib ? 'Wibracje: wł.' : 'Wibracje: wył.';
  renderFs();
}
function startLevel(i) {
  camZoom = 1;
  buildWorld(i);
  resetHero();
  artSetup();
  camIntro();
  // shadery wszystkich materiałów kompilujemy od razu, żeby gra nie przycinała przy pierwszym użyciu
  renderer.compile(scene, camera);
  state = 'play';
  levelTime = 0;
  kills = 0;
  runGems = 0;
  hitstop = 0;
  trauma = 0;
  slowmo = 0;
  lastHp = -1;
  lastGems = -1;
  lastLives = -1;
  lastCombo = -1;
  fieldT = 0;
  shieldHint = false;
  maxTok = 2 + i;
  raidCd = level.raid ? level.raid * 0.8 : 1e9;
  resetInput();
  enterFs();
  $('menu').hidden = true;
  $('result').hidden = true;
  $('pause').hidden = true;
  $('hud').hidden = false;
  $('bosshp').hidden = true;
  $('combo').classList.remove('show');
  buildPips();
  banner('Etap ' + (i + 1) + '. ' + level.name, 'Przejmij wszystkie kapliczki.', 3);
  const H0 = isTouch
    ? ['Lewy kciuk prowadzi bohatera, czerwony przycisk tnie mieczem.']
    : [
        'WASD to ruch, lewy przycisk myszy tnie, prawy strzela z łuku.',
        'Spacja to unik, Q wir ostrzy, E mikstura.',
      ];
  hint(
    i === 0
      ? H0.concat([
          'Kryształ chroni tarcza, dopóki żyje trzech strażników.',
          'Unik tuż przed ciosem wroga daje pewne trafienie krytyczne.',
        ])
      : LEVELS[i].hints || []
  );
}
function toMenu() {
  state = 'menu';
  persist();
  hero.root.visible = false;
  hero.blob.visible = false;
  hero.ring.visible = false;
  selIdx = Math.min(selIdx, LEVELS.length - 1);
  buildWorld(selIdx);
  $('hud').hidden = true;
  $('result').hidden = true;
  $('pause').hidden = true;
  $('menu').hidden = false;
  renderMenu();
}
function pause(on) {
  if (on && state === 'play' && !ending) {
    state = 'pause';
    $('pause').hidden = false;
    resetInput();
    renderFs();
    persist();
  } else if (!on && state === 'pause') {
    state = 'play';
    $('pause').hidden = true;
    last = performance.now();
  }
}
function finish(kind) {
  $('resTime').textContent = fmtTime(levelTime);
  $('resKills').textContent = kills;
  const crit = $('resCrit');
  crit.textContent = '';
  if (kind === 'win') {
    state = 'win';
    const noDeath = hero.lives === 3,
      fast = levelTime <= level.par,
      stars = 1 + (noDeath ? 1 : 0) + (fast ? 1 : 0),
      gained = Math.max(0, stars - save.stars[levelIdx]);
    const bonus = 25 + 15 * levelIdx + gained * 20;
    save.gems += bonus;
    runGems += bonus;
    save.stars[levelIdx] = Math.max(save.stars[levelIdx], stars);
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, levelIdx + 2));
    persist();
    const next = levelIdx < LEVELS.length - 1;
    $('resH').textContent = next ? 'Etap ukończony' : 'Lochy oczyszczone';
    $('resP').textContent = next
      ? 'Wszystkie kapliczki świecą na niebiesko. Premia: ' + bonus + ' odłamków.'
      : (level.bossName || 'Strażnik') +
        ' padł, a ostatnia kapliczka jest twoja. Premia: ' +
        bonus +
        ' odłamków.';
    {
      let st = '';
      for (let k = 0; k < 3; k++)
        st +=
          '<i class="' +
          (k < stars ? 'on' : 'off') +
          '" style="animation-delay:' +
          (0.25 + k * 0.28) +
          's">★</i>';
      $('resStars').innerHTML = st;
    }
    $('resStars').setAttribute('aria-label', 'Gwiazdki: ' + stars + ' z 3');
    for (const c of [
      [true, 'etap ukończony'],
      [noDeath, 'bez straty życia'],
      [fast, 'czas do ' + fmtTime(level.par)],
    ]) {
      const li = document.createElement('li');
      li.textContent = c[1];
      if (!c[0]) li.className = 'off';
      crit.appendChild(li);
    }
    $('resMain').textContent = next ? 'Następny etap' : 'Zagraj ponownie';
    $('resMain').onclick = () => {
      sfx.click();
      if (next) {
        selIdx = levelIdx + 1;
        startLevel(selIdx);
      } else startLevel(levelIdx);
    };
  } else {
    state = 'lose';
    persist();
    $('resH').textContent = 'Koniec żyć';
    $('resP').textContent = 'Zebrane odłamki zostają. Kup ulepszenie albo spróbuj od razu.';
    $('resStars').innerHTML = '';
    $('resMain').textContent = 'Spróbuj ponownie';
    $('resMain').onclick = () => {
      sfx.click();
      startLevel(levelIdx);
    };
  }
  $('resGems').textContent = '+' + runGems;
  $('result').hidden = false;
  resetInput();
}
$('playBtn').addEventListener('click', () => {
  audioInit();
  sfx.click();
  if (selIdx < save.unlocked) startLevel(selIdx);
});
$('pauseBtn').addEventListener('click', () => pause(true));
$('forgeBtn').addEventListener('click', () => {
  audioInit();
  sfx.click();
  openForge('up');
});
$('resForge').addEventListener('click', () => {
  sfx.click();
  selIdx = state === 'win' ? Math.min(levelIdx + 1, LEVELS.length - 1) : levelIdx;
  toMenu();
  openForge('up');
});
$('pauseBtn').addEventListener('pointerdown', e => {
  e.preventDefault();
  e.stopPropagation();
  pause(true);
});
$('resumeBtn').addEventListener('click', () => {
  sfx.click();
  pause(false);
});
$('quitBtn').addEventListener('click', () => {
  sfx.click();
  toMenu();
});
$('resMenu').addEventListener('click', () => {
  sfx.click();
  selIdx = state === 'win' ? Math.min(levelIdx + 1, LEVELS.length - 1) : levelIdx;
  toMenu();
});
const fsOK = !!(
  document.documentElement &&
  document.documentElement.requestFullscreen &&
  document.fullscreenEnabled
);
function renderFs() {
  for (const id of ['fsBtn', 'fsBtn2']) {
    const b = $(id);
    b.hidden = !fsOK || !isTouch;
    b.textContent = document.fullscreenElement ? 'Zamknij pełny ekran' : 'Pełny ekran';
  }
}
function enterFs() {
  if (fsOK && isTouch && !document.fullscreenElement && !save.noFs)
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
}
function toggleFs() {
  if (!fsOK) return;
  if (document.fullscreenElement) {
    save.noFs = true;
    document.exitFullscreen().catch(() => {});
  } else {
    save.noFs = false;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
}
$('fsBtn').addEventListener('click', () => {
  sfx.click();
  toggleFs();
});
$('fsBtn2').addEventListener('click', () => {
  sfx.click();
  toggleFs();
});
document.addEventListener('fullscreenchange', () => {
  renderFs();
  setTimeout(resize, 60);
});
$('vibBtn').addEventListener('click', () => {
  save.vib = !save.vib;
  persist();
  renderMenu();
  buzz(20);
  sfx.click();
});
$('muteBtn').addEventListener('click', () => {
  audioInit();
  save.mute = !save.mute;
  if (master) master.gain.value = save.mute ? 0 : 0.55;
  persist();
  renderMenu();
  sfx.click();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause(true);
});
