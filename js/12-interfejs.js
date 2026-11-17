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
function updateHud(dt) {
  const h = hero,
    hp = Math.max(0, Math.ceil(h.hp));
  if (hp !== lastHp) {
    lastHp = hp;
    $('hpfill').style.width = ((hp / h.maxHp) * 100).toFixed(1) + '%';
    $('hptext').textContent = hp + ' / ' + h.maxHp;
  }
  if (save.gems !== lastGems) {
    lastGems = save.gems;
    $('gemn').textContent = save.gems;
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
  if (boss) $('bossfill').style.width = (clamp(boss.hp / boss.maxHp, 0, 1) * 100).toFixed(1) + '%';
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
let selIdx = Math.min(save.unlocked, 3) - 1;
const UPG = [
  { k: 'atk', name: 'Ostrze', desc: '+15% obrażeń' },
  { k: 'hp', name: 'Serce', desc: '+20 zdrowia' },
  { k: 'agi', name: 'Buty', desc: 'ruch i odnowienia' },
  { k: 'gol', name: 'Golemy', desc: '+25% siły golemów' },
];
const upCost = l => 30 + 30 * l;
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
  const up = $('upg');
  up.textContent = '';
  for (const u of UPG) {
    const lv = save.up[u.k],
      maxed = lv >= 5,
      cost = upCost(lv);
    const b = document.createElement('button');
    b.className = 'up';
    b.disabled = maxed || save.gems < cost;
    let pips = '';
    for (let i = 0; i < 5; i++) pips += '<i' + (i < lv ? ' class="on"' : '') + '></i>';
    b.innerHTML =
      '<b>' +
      u.name +
      '</b><small>' +
      u.desc +
      '</small><span class="lv">' +
      pips +
      '</span><span class="cost">' +
      (maxed ? 'maks.' : '<i class="gem"></i>' + cost) +
      '</span>';
    b.setAttribute(
      'aria-label',
      u.name + ', poziom ' + lv + ' z 5' + (maxed ? '' : ', koszt ' + cost + ' odłamków')
    );
    b.addEventListener('click', () => {
      if (save.gems < cost || maxed) return;
      audioInit();
      save.gems -= cost;
      save.up[u.k]++;
      persist();
      sfx.heal();
      renderMenu();
    });
    up.appendChild(b);
  }
  $('muteBtn').textContent = save.mute ? 'Dźwięk: wył.' : 'Dźwięk: wł.';
  $('vibBtn').hidden = !(isTouch && canVib);
  $('vibBtn').textContent = save.vib ? 'Wibracje: wł.' : 'Wibracje: wył.';
  renderFs();
}
function startLevel(i) {
  buildWorld(i);
  resetHero();
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
      : i === 1
        ? [
            'Wróg wysyła wypady na twoje kapliczki. Atak miga na mapie w rogu.',
            'Szaman leczy strażników. Zdejmij go pierwszego.',
          ]
        : ['Elity świecą na fioletowo i biją mocniej, ale gubią więcej odłamków.']
  );
}
function toMenu() {
  state = 'menu';
  persist();
  hero.root.visible = false;
  hero.blob.visible = false;
  hero.ring.visible = false;
  selIdx = Math.min(selIdx, 2);
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
    save.unlocked = Math.max(save.unlocked, Math.min(3, levelIdx + 2));
    persist();
    const next = levelIdx < LEVELS.length - 1;
    $('resH').textContent = next ? 'Etap ukończony' : 'Lochy oczyszczone';
    $('resP').textContent = next
      ? 'Wszystkie kapliczki świecą na niebiesko. Premia: ' + bonus + ' odłamków.'
      : 'Strażnik padł, a ostatnia kapliczka jest twoja. Premia: ' + bonus + ' odłamków.';
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
