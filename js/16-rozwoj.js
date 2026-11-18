/* Kostkowe Lochy: ekran rozwoju bohatera.
   Cztery zakładki: Postać (liczby bohatera z objaśnieniami), Ulepszenia (za odłamki), Talenty (za gwiazdki)
   i Artefakty (za odłamki). Lewa część to lista do wyboru, prawa to panel szczegółów z opisem,
   podglądem zmian i przyciskami zakupu.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
let fTab = 'up',
  toastT = null;
const fSel = { hero: null, up: 'atk', tal: 'leech', art: 'horn' };
const fnum = (v, d) => v.toFixed(d || 0).replace('.', ',');
const pct = v => Math.round(v * 100) + '%';
const TAB_INFO = {
  hero: ['Postać', 'golem'],
  up: ['Ulepszenia', 'sword'],
  tal: ['Talenty', 'star'],
  art: ['Artefakty', 'crystal'],
};

// liczby bohatera pogrupowane tematycznie; każda ma objaśnienie i listę tego, co ją zmienia
const STAT_GROUPS = [
  {
    name: 'Przetrwanie',
    rows: [
      ['Zdrowie', S => fnum(S.hp), 'Ile obrażeń zniesiesz, zanim stracisz życie.', 'Serce'],
      [
        'Regeneracja',
        S => (S.regen ? fnum(S.regen) + '/s' : '—'),
        'Zdrowie odzyskiwane co sekundę, także w walce.',
        'Serce (poziom 8)',
      ],
      [
        'Mikstura leczy',
        S => pct(S.potHeal),
        'Jaką część zdrowia przywraca jedna mikstura.',
        'Serce (poziom 4)',
      ],
      [
        'Odnowienie mikstury',
        S => fnum(S.potion, 1) + ' s',
        'Ile czekasz na kolejną miksturę.',
        'talent Alchemia',
      ],
    ],
  },
  {
    name: 'Miecz',
    rows: [
      [
        'Obrażenia miecza',
        S => fnum(S.atk, 1),
        'Obrażenia jednego cięcia. Trzecie cięcie serii zadaje 180%.',
        'Ostrze',
      ],
      [
        'Szansa na krytyk',
        S => pct(S.crit),
        'Szansa, że cios mieczem zada obrażenia krytyczne.',
        'Ostrze (poziom 4)',
      ],
      [
        'Siła krytyka',
        S => '×' + fnum(S.critM, 1),
        'Mnożnik obrażeń ciosu krytycznego.',
        'Ostrze (poziom 8)',
      ],
    ],
  },
  {
    name: 'Łuk',
    rows: [
      ['Obrażenia z łuku', S => fnum(S.bowAtk, 1), 'Obrażenia jednej strzały.', 'Kołczan, Ostrze'],
      ['Strzały naraz', S => fnum(S.arrows), 'Ile strzał wylatuje przy jednym strzale.', 'talent Salwa'],
      [
        'Przebicie strzał',
        S => fnum(S.pierce),
        'Przez ilu wrogów przelatuje strzała, zanim się zatrzyma.',
        'talent Przebicie, Kołczan (poziom 4)',
      ],
      [
        'Krytyk z łuku',
        S => (S.bowCrit ? '+' + pct(S.bowCrit) : '—'),
        'Dodatkowa szansa na krytyczną strzałę.',
        'Kołczan (poziom 8)',
      ],
      [
        'Odnowienie łuku',
        S => fnum(S.bow * S.cdMul, 2) + ' s',
        'Przerwa między strzałami.',
        'Buty, talent Szybka cięciwa',
      ],
    ],
  },
  {
    name: 'Wir ostrzy',
    rows: [
      [
        'Obrażenia wiru',
        S => fnum(S.specDmg, 1),
        'Obrażenia wiru dla każdego wroga w zasięgu.',
        'Amulet dusz, Ostrze',
      ],
      ['Zasięg wiru', S => fnum(S.specR, 1) + ' m', 'Jak daleko od ciebie sięga wir.', 'talent Burza'],
      [
        'Odnowienie wiru',
        S => fnum(S.spec * S.cdMul, 1) + ' s',
        'Ile czekasz na kolejny wir.',
        'Buty, Amulet dusz (poziom 4), talent Żniwiarz',
      ],
      [
        'Drugie uderzenie',
        S => (S.spin2 ? 'tak' : '—'),
        'Wir uderza ponownie po chwili z 60% siły.',
        'Amulet dusz (poziom 8)',
      ],
    ],
  },
  {
    name: 'Ruch',
    rows: [
      ['Szybkość ruchu', S => pct(S.speed / 6.2), 'Szybkość biegu względem podstawowej.', 'Buty'],
      [
        'Odnowienie uniku',
        S => fnum(S.roll * S.cdMul, 2) + ' s',
        'Przerwa między przewrotami.',
        'Buty (poziom 4)',
      ],
    ],
  },
  {
    name: 'Mrok',
    rows: [
      [
        'Widoczność w mroku',
        S => fnum(S.sight, 1) + ' m',
        'Jak daleko widzisz w ciemnych etapach, takich jak Cytadela Mroku.',
        'Peleryna świetlików',
      ],
      [
        'Oczy wrogów',
        S => (S.eyes ? 'tak' : '—'),
        'Wrogowie poza polem widzenia zdradzają się świecącymi oczami.',
        'Peleryna świetlików (poziom 4)',
      ],
      [
        'Rozbłysk peleryny',
        S => (S.flare ? 'co 8 s' : '—'),
        'Peleryna co jakiś czas rozbłyska i na chwilę rozświetla okolicę.',
        'Peleryna świetlików (poziom 8)',
      ],
    ],
  },
  {
    name: 'Golemy',
    rows: [
      ['Siła golemów', S => pct(S.golem), 'Zdrowie i obrażenia golemów z przejętych kapliczek.', 'Golemy'],
      [
        'Golemy na kapliczkę',
        S => fnum(S.golems),
        'Ile golemów utrzymuje jedna przejęta kapliczka.',
        'Golemy (poziom 4)',
      ],
    ],
  },
];
const STAT_ROWS = STAT_GROUPS.flatMap(g => g.rows);
function heroPower(S) {
  return Math.round(
    S.hp * 0.6 +
      S.atk * 5 * (1 + S.crit * (S.critM - 1)) +
      S.bowAtk * 2 * S.arrows +
      S.specDmg +
      S.golem * 30 +
      (S.regen ? 25 : 0)
  );
}

function openForge(tab) {
  if (tab) fTab = tab;
  $('menu').hidden = true;
  $('forge').hidden = false;
  renderForge();
  $('forge').scrollTop = 0;
}
function closeForge() {
  $('forge').hidden = true;
  $('menu').hidden = false;
  renderMenu();
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function fPick(tab, id) {
  fSel[tab] = id;
  sfx.click();
  renderForge();
  if (window.innerWidth < 760) $('fDet').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function toast(txt) {
  const t = $('fToast');
  t.textContent = txt;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1800);
}
function bought() {
  const d = $('fDet');
  d.classList.remove('bought');
  void d.offsetWidth;
  d.classList.add('bought');
}
const gem = n => '<span class="price"><i class="gem"></i>' + n + '</span>';
// czego gracza stać: do odznak na zakładkach i kafelkach
function canBuyUp(u) {
  const lv = save.up[u.k];
  return lv < UP_MAX && save.gems >= upCost(lv);
}
function artPrice(a) {
  const lv = save.art.own[a.id] || 0;
  return lv >= 3 ? Infinity : lv ? a.upPrice[lv - 1] : a.price;
}

function renderForge() {
  const pts = talPoints(),
    free = pts - talSpent();
  $('fGems').textContent = save.gems;
  $('fPts').textContent = free + '/' + pts;
  const badge = {
    hero: '',
    up: UPGRADES.some(canBuyUp) ? '!' : '',
    tal: free > 0 ? String(free) : '',
    art: ARTIFACTS.some(a => save.gems >= artPrice(a)) ? '!' : '',
  };
  for (const b of document.querySelectorAll('.ftab')) {
    const t = b.dataset.tab,
      on = t === fTab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.innerHTML =
      artIcon(TAB_INFO[t][1]) +
      '<span>' +
      TAB_INFO[t][0] +
      '</span>' +
      (badge[t] ? '<i class="badge">' + badge[t] + '</i>' : '');
  }
  const L = $('fList'),
    det = $('fDet');
  L.textContent = '';
  det.textContent = '';
  L.className = 'flist ' + fTab;
  if (fTab === 'hero') renderHeroTab(L, det);
  else if (fTab === 'up') renderUpTab(L, det);
  else if (fTab === 'tal') renderTalTab(L, det);
  else renderArtTab(L, det);
}

/* ----- Postać ----- */
function renderHeroTab(L, det) {
  const S = heroStats(save.up, save.tal);
  for (const g of STAT_GROUPS) {
    const box = el('div', 'sgroup', '<h4>' + g.name + '</h4>');
    for (const r of g.rows) {
      const b = el(
        'button',
        'srow' + (fSel.hero === r[0] ? ' sel' : ''),
        '<span>' + r[0] + '</span><b>' + r[1](S) + '</b>'
      );
      b.addEventListener('click', () => fPick('hero', r[0]));
      box.appendChild(b);
    }
    L.appendChild(box);
  }
  const r = STAT_ROWS.find(x => x[0] === fSel.hero);
  if (r) {
    det.innerHTML =
      '<p class="kicker">Statystyka</p><h3>' +
      r[0] +
      '</h3><p class="bigval">' +
      r[1](S) +
      '</p><p>' +
      r[2] +
      '</p><div class="tipbox"><b>Zmieniają ją:</b> ' +
      r[3] +
      '</div>';
    const back = el('button', 'btn small', 'Podsumowanie bohatera');
    back.addEventListener('click', () => fPick('hero', null));
    det.appendChild(back);
    return;
  }
  const tal = save.tal.map(id => TALENTS.find(t => t.id === id)).filter(Boolean);
  let h = '<p class="kicker">Podsumowanie</p><h3>Moc bohatera</h3><p class="power">' + heroPower(S) + '</p>';
  h +=
    '<p class="muted small">Ogólna ocena siły: zdrowie, obrażenia, krytyki i golemy. Stuknij dowolną liczbę po lewej, żeby zobaczyć, co oznacza.</p>';
  h += '<h4>Artefakty</h4><div class="mini-slots">';
  for (let k = 0; k < 2; k++) {
    const id = save.art.eq[k],
      d = id ? artDef(id) : null;
    h +=
      '<div class="mslot' +
      (k >= slotCount() ? ' lock' : '') +
      '">' +
      (d
        ? '<span class="ic">' +
          artIcon(d.icon) +
          '</span><b>' +
          d.name +
          '</b><small>poziom ' +
          save.art.own[id] +
          ' · klawisz ' +
          (k ? 'F' : 'R') +
          '</small>'
        : '<b>' +
          (k >= slotCount() ? 'zablokowane' : 'puste') +
          '</b><small>' +
          (k >= slotCount() ? 'od ' + SLOT2_STARS + ' gwiazdek' : 'gniazdo ' + (k + 1)) +
          '</small>') +
      '</div>';
  }
  h += '</div><h4>Talenty</h4>';
  h += tal.length
    ? '<ul class="tlist">' +
      tal.map(t => '<li><b>' + t.name + '</b><span>' + t.desc + '</span></li>').join('') +
      '</ul>'
    : '<p class="muted">Jeszcze żadnych. Gwiazdki za etapy dają punkty talentów.</p>';
  det.innerHTML = h;
}

/* ----- Ulepszenia ----- */
function lvBar(lv, max, col) {
  let h = '<div class="lvbar" style="--c:' + col + '">';
  for (let i = 0; i < max; i++)
    h += '<i class="' + (i < lv ? 'on' : '') + (i === 3 || i === 7 ? ' ms' : '') + '"></i>';
  return h + '</div>';
}
function renderUpTab(L, det) {
  for (const u of UPGRADES) {
    const lv = save.up[u.k],
      X = UP_EXTRA[u.k],
      maxed = lv >= UP_MAX,
      afford = canBuyUp(u),
      b = el(
        'button',
        'tile' + (fSel.up === u.k ? ' sel' : '') + (maxed ? ' maxed' : afford ? ' afford' : '')
      );
    b.style.setProperty('--c', X.col);
    b.innerHTML =
      '<span class="ic">' +
      artIcon(u.icon) +
      '</span><b>' +
      u.name +
      '</b><small class="cat">' +
      X.cat +
      '</small>' +
      lvBar(lv, UP_MAX, X.col) +
      '<span class="cost' +
      (afford || maxed ? '' : ' poor') +
      '">' +
      (maxed ? 'MAKS.' : gem(upCost(lv))) +
      '</span>';
    b.setAttribute(
      'aria-label',
      u.name +
        ', poziom ' +
        lv +
        ' z ' +
        UP_MAX +
        (maxed ? ', maksymalny' : ', koszt ' + upCost(lv) + ' odłamków')
    );
    b.addEventListener('click', () => fPick('up', u.k));
    L.appendChild(b);
  }
  const u = UPGRADES.find(x => x.k === fSel.up),
    X = UP_EXTRA[u.k],
    lv = save.up[u.k],
    maxed = lv >= UP_MAX,
    cost = upCost(lv);
  const A = heroStats(save.up, save.tal),
    B = heroStats(Object.assign({}, save.up, { [u.k]: Math.min(UP_MAX, lv + 1) }), save.tal);
  let h =
    '<div class="dhead" style="--c:' +
    X.col +
    '"><span class="ic big">' +
    artIcon(u.icon) +
    '</span><div><p class="kicker">Ulepszenie · ' +
    X.cat +
    '</p><h3>' +
    u.name +
    '</h3></div><span class="lvbadge">' +
    lv +
    '/' +
    UP_MAX +
    '</span></div>';
  h += '<p class="lore">' + u.lore + '</p>' + lvBar(lv, UP_MAX, X.col);
  h += '<h4>Każdy poziom</h4><p>' + u.per + '.</p>';
  if (!maxed) {
    const ch = STAT_ROWS.filter(r => r[1](A) !== r[1](B));
    h +=
      '<h4>Po ulepszeniu do poziomu ' +
      (lv + 1) +
      '</h4><ul class="diff">' +
      ch
        .map(r => '<li><span>' + r[0] + '</span><s>' + r[1](A) + '</s><b>▲ ' + r[1](B) + '</b></li>')
        .join('') +
      '</ul>';
  }
  h += '<h4>Premie</h4><div class="perks">';
  u.m.forEach((t, i) => {
    const need = i ? 8 : 4,
      got = lv >= need;
    h +=
      '<div class="perk' +
      (got ? ' got' : '') +
      '"><span class="pl">★ ' +
      need +
      '</span><span>' +
      t +
      '</span><em>' +
      (got ? 'zdobyta' : 'za ' + (need - lv) + ' poz.') +
      '</em></div>';
  });
  h += '</div><div class="tipbox"><b>Wskazówka:</b> ' + X.tip + '</div>';
  det.innerHTML = h;
  const btn = el('button', 'btn primary buy');
  if (maxed) {
    btn.textContent = 'Maksymalny poziom';
    btn.disabled = true;
  } else if (save.gems < cost) {
    btn.innerHTML = 'Brakuje ' + gem(cost - save.gems);
    btn.disabled = true;
  } else btn.innerHTML = 'Ulepsz za ' + gem(cost);
  btn.addEventListener('click', () => {
    if (maxed || save.gems < cost) return;
    audioInit();
    save.gems -= cost;
    save.up[u.k]++;
    persist();
    sfx.heal();
    renderForge();
    bought();
    const nl = save.up[u.k];
    toast(u.name + ': poziom ' + nl + (nl === 4 || nl === 8 ? ', nowa premia!' : ''));
  });
  det.appendChild(btn);
  det.appendChild(
    el(
      'p',
      'muted small center',
      'Masz ' + gem(save.gems) + '. Odłamki zdobywasz za wrogów, kapliczki i ukończone etapy.'
    )
  );
}

/* ----- Talenty ----- */
function talState(T) {
  const own = save.tal.includes(T.id),
    prevT = T.t ? TALENTS.find(x => x.b === T.b && x.t === T.t - 1) : null,
    prev = !prevT || save.tal.includes(prevT.id),
    free = talPoints() - talSpent();
  return { own, prev, prevT, can: !own && prev && free >= T.cost, free };
}
const ROMAN = ['I', 'II', 'III', 'IV'];
function renderTalTab(L, det) {
  BRANCHES.forEach((bn, bi) => {
    const col = el('div', 'tcol', '<h4>' + bn + '</h4><small class="bdesc">' + BRANCH_DESC[bi] + '</small>');
    for (let t = 0; t < 4; t++) {
      const T = TALENTS.find(x => x.b === bi && x.t === t),
        st = talState(T),
        b = el(
          'button',
          'tnode' +
            (st.own ? ' own' : st.can ? ' can' : st.prev ? '' : ' lock') +
            (fSel.tal === T.id ? ' sel' : '')
        );
      b.innerHTML =
        '<i class="tier">' +
        ROMAN[t] +
        '</i><b>' +
        T.name +
        '</b><small>' +
        (st.own ? 'aktywny' : T.cost + ' pkt') +
        '</small>';
      b.setAttribute(
        'aria-label',
        T.name + ', stopień ' + (t + 1) + (st.own ? ', aktywny' : ', koszt ' + T.cost + ' pkt')
      );
      b.addEventListener('click', () => fPick('tal', T.id));
      col.appendChild(b);
    }
    L.appendChild(col);
  });
  const T = TALENTS.find(x => x.id === fSel.tal),
    st = talState(T);
  let h =
    '<div class="dhead"><span class="ic big">' +
    artIcon(['sword', 'bow', 'star'][T.b]) +
    '</span><div><p class="kicker">Talent · ' +
    BRANCHES[T.b] +
    ', stopień ' +
    ROMAN[T.t] +
    '</p><h3>' +
    T.name +
    '</h3></div><span class="lvbadge">' +
    T.cost +
    ' pkt</span></div>';
  h += '<p>' + (TALENT_LONG[T.id] || T.desc) + '</p>';
  h += '<div class="tipbox"><b>Wskazówka:</b> ' + TALENT_TIP[T.id] + '</div>';
  if (st.own) h += '<p class="ok">Ten talent jest aktywny.</p>';
  else if (!st.prev) h += '<p class="warn">Najpierw odblokuj talent ' + st.prevT.name + '.</p>';
  else if (st.free < T.cost)
    h += '<p class="warn">Potrzebujesz ' + T.cost + ' pkt, masz ' + st.free + '.</p>';
  det.innerHTML = h;
  const btn = el('button', 'btn primary buy');
  btn.textContent = st.own ? 'Aktywny' : 'Odblokuj za ' + T.cost + ' pkt';
  btn.disabled = !st.can;
  btn.addEventListener('click', () => {
    if (!talState(T).can) return;
    audioInit();
    save.tal.push(T.id);
    persist();
    sfx.heal();
    renderForge();
    bought();
    toast('Nowy talent: ' + T.name);
  });
  det.appendChild(btn);
  const r = el('button', 'btn small');
  r.textContent = 'Zresetuj wszystkie talenty';
  r.disabled = !save.tal.length;
  r.addEventListener('click', () => {
    save.tal = [];
    persist();
    sfx.click();
    renderForge();
    toast('Punkty talentów zwrócone');
  });
  det.appendChild(r);
  det.appendChild(
    el(
      'p',
      'muted small',
      'Każda gwiazdka zdobyta za etap to punkt talentu. Reset jest darmowy, więc możesz próbować różnych zestawów.'
    )
  );
}

/* ----- Artefakty ----- */
function renderArtTab(L, det) {
  const slots = el('div', 'slots');
  for (let k = 0; k < 2; k++) {
    const id = save.art.eq[k],
      d = id ? artDef(id) : null,
      locked = k >= slotCount();
    slots.appendChild(
      el(
        'div',
        'slot' + (locked ? ' lock' : d ? ' full' : ''),
        '<small>Gniazdo ' +
          (k + 1) +
          ' · klawisz ' +
          (k ? 'F' : 'R') +
          '</small>' +
          (locked
            ? '<b>zablokowane</b><small>od ' + SLOT2_STARS + ' gwiazdek</small>'
            : d
              ? '<span class="ic">' +
                artIcon(d.icon) +
                '</span><b>' +
                d.name +
                '</b><small>poziom ' +
                save.art.own[id] +
                '</small>'
              : '<b>puste</b><small>wybierz artefakt poniżej</small>')
      )
    );
  }
  L.appendChild(slots);
  for (const a of ARTIFACTS) {
    const lv = save.art.own[a.id] || 0,
      eq = save.art.eq.indexOf(a.id),
      pr = artPrice(a),
      afford = save.gems >= pr,
      b = el(
        'button',
        'tile art' +
          (fSel.art === a.id ? ' sel' : '') +
          (lv ? '' : ' dim') +
          (lv >= 3 ? ' maxed' : afford ? ' afford' : '')
      );
    b.innerHTML =
      '<span class="ic">' +
      artIcon(a.icon) +
      '</span><b>' +
      a.name +
      '</b>' +
      (lv ? lvBar(lv, 3, '#46f0c8') : '<small class="cat">nie posiadasz</small>') +
      '<span class="cost' +
      (afford || lv >= 3 ? '' : ' poor') +
      '">' +
      (eq >= 0 ? '<em class="eqtag">' + (eq ? 'F' : 'R') + '</em>' : '') +
      (lv >= 3 ? 'MAKS.' : gem(pr)) +
      '</span>';
    b.addEventListener('click', () => fPick('art', a.id));
    L.appendChild(b);
  }
  const a = artDef(fSel.art),
    lv = save.art.own[a.id] || 0;
  let h =
    '<div class="dhead"><span class="ic big art">' +
    artIcon(a.icon) +
    '</span><div><p class="kicker">Artefakt</p><h3>' +
    a.name +
    '</h3></div><span class="lvbadge">' +
    (lv ? lv + '/3' : 'brak') +
    '</span></div><p>' +
    a.desc +
    '</p>';
  const cur = a.lv[Math.max(0, lv - 1)];
  h +=
    '<div class="cols"><div><h4>' +
    (lv ? 'Teraz (poziom ' + lv + ')' : 'Po zakupie') +
    '</h4><ul class="plain">' +
    a
      .lines(cur)
      .map(x => '<li>' + x + '</li>')
      .join('') +
    '</ul></div>';
  if (lv && lv < 3)
    h +=
      '<div><h4>Poziom ' +
      (lv + 1) +
      '</h4><ul class="plain next">' +
      a
        .lines(a.lv[lv])
        .map(x => '<li>▲ ' + x + '</li>')
        .join('') +
      '</ul></div>';
  h += '</div><div class="tipbox"><b>Najlepszy na:</b> ' + ART_TIP[a.id] + '</div>';
  det.innerHTML = h;
  const price = artPrice(a),
    btn = el('button', 'btn primary buy');
  if (lv >= 3) {
    btn.textContent = 'Maksymalny poziom';
    btn.disabled = true;
  } else if (save.gems < price) {
    btn.innerHTML = 'Brakuje ' + gem(price - save.gems);
    btn.disabled = true;
  } else btn.innerHTML = (lv ? 'Ulepsz za ' : 'Kup za ') + gem(price);
  btn.addEventListener('click', () => {
    if (lv >= 3 || save.gems < price) return;
    audioInit();
    save.gems -= price;
    save.art.own[a.id] = lv + 1;
    // pierwszy kupiony artefakt trafia od razu do wolnego gniazda
    let slot = -1;
    if (!lv)
      for (let k = 0; k < slotCount(); k++)
        if (!save.art.eq[k] && !save.art.eq.includes(a.id)) {
          save.art.eq[k] = a.id;
          slot = k;
        }
    persist();
    sfx.heal();
    renderForge();
    bought();
    toast(
      lv
        ? a.name + ': poziom ' + (lv + 1)
        : 'Kupiono: ' + a.name + (slot >= 0 ? ' (gniazdo ' + (slot + 1) + ')' : '')
    );
  });
  det.appendChild(btn);
  if (lv) {
    const row = el('div', 'row eqrow');
    for (let k = 0; k < 2; k++) {
      const on = save.art.eq[k] === a.id,
        b = el('button', 'btn small' + (on ? ' on' : ''));
      b.textContent = on ? 'Zdejmij z gniazda ' + (k + 1) : 'Załóż do gniazda ' + (k + 1);
      b.disabled = k >= slotCount();
      b.addEventListener('click', () => {
        if (k >= slotCount()) return;
        if (on) save.art.eq[k] = null;
        else {
          const o = save.art.eq.indexOf(a.id);
          if (o >= 0) save.art.eq[o] = null;
          save.art.eq[k] = a.id;
        }
        persist();
        sfx.click();
        renderForge();
      });
      row.appendChild(b);
    }
    det.appendChild(row);
  }
  if (slotCount() < 2)
    det.appendChild(
      el(
        'p',
        'muted small',
        'Drugie gniazdo otworzy się, gdy zdobędziesz łącznie ' + SLOT2_STARS + ' gwiazdek.'
      )
    );
}

$('forgeBack').addEventListener('click', () => {
  sfx.click();
  closeForge();
});
for (const b of document.querySelectorAll('.ftab'))
  b.addEventListener('click', () => {
    fTab = b.dataset.tab;
    sfx.click();
    renderForge();
  });
