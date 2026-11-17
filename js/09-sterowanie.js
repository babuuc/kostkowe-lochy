/* Kostkowe Lochy: Sterowanie: klawiatura, mysz oraz drążek i przyciski dotykowe.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= sterowanie ================= */
const keys = {},
  inp = { atk: false, bow: false, roll: 0, spec: 0, potion: 0, mouseAim: false };
const stick = { id: -1, x: 0, y: 0, cx: 0, cy: 0 },
  mouseNDC = new THREE.Vector2(),
  mouseW = { x: 0, z: 0 },
  ray = new THREE.Raycaster();
let isTouch = false;
function setTouch(v) {
  if (isTouch === v) return;
  isTouch = v;
  document.body.classList.toggle('touch', v);
  placeStick();
  if (state === 'menu' && typeof renderMenu === 'function') renderMenu();
  $('ctrlNote').textContent = v
    ? 'Lewy kciuk prowadzi bohatera, prawy walczy.'
    : 'WASD i mysz. Spacja to unik, Q wir, E mikstura.';
}
// drążek: pojawia się pod kciukiem, podąża za palcem, ma martwą strefę i szybko dochodzi do pełnej prędkości
const STICK_R = 54,
  atkPtrs = new Set();
function stickHome() {
  let sl = 0,
    sb = 0;
  try {
    const cs = getComputedStyle(document.documentElement);
    sl = parseFloat(cs.paddingLeft) || 0;
    sb = parseFloat(cs.paddingBottom) || 0;
  } catch (e) {}
  return { x: sl + 92, y: window.innerHeight - sb - 122 };
}
function placeStick(x, y) {
  const s = $('stick');
  if (x === undefined) {
    const h = stickHome();
    x = h.x;
    y = h.y;
  }
  s.style.left = x + 'px';
  s.style.top = y + 'px';
}
function setKnob(dx, dy) {
  $('knob').style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
}
function stickMove(px, py) {
  let dx = px - stick.cx,
    dy = py - stick.cy,
    d = Math.hypot(dx, dy);
  if (d > STICK_R) {
    const k = (d - STICK_R) / d;
    stick.cx += dx * k;
    stick.cy += dy * k;
    dx = px - stick.cx;
    dy = py - stick.cy;
    d = STICK_R;
    placeStick(stick.cx, stick.cy);
  }
  const dead = STICK_R * 0.14,
    full = STICK_R * 0.66,
    m = d < dead ? 0 : 0.32 + 0.68 * clamp((d - dead) / (full - dead), 0, 1);
  stick.x = d > 0 ? (dx / d) * m : 0;
  stick.y = d > 0 ? (-dy / d) * m : 0;
  setKnob(dx, dy);
}
function stickRelease() {
  stick.id = -1;
  stick.x = stick.y = 0;
  setKnob(0, 0);
  $('stick').classList.remove('on');
  placeStick();
}
function resetInput() {
  if (stick.id >= 0) stickRelease();
  atkPtrs.clear();
  inp.atk = inp.bow = false;
  inp.roll = inp.spec = inp.potion = 0;
  for (const k in keys) keys[k] = false;
  document.querySelectorAll('.act.down').forEach(el => el.classList.remove('down'));
}
const cv = $('game');
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (state !== 'play') return;
  e.preventDefault();
  if (e.pointerType === 'mouse') {
    setTouch(false);
    updMouse(e);
    if (e.button === 0) {
      inp.atk = true;
      inp.mouseAim = true;
    } else if (e.button === 2) {
      inp.bow = true;
      inp.mouseAim = true;
    }
    return;
  }
  setTouch(true);
  try {
    cv.setPointerCapture(e.pointerId);
  } catch (_) {}
  if (e.clientX < window.innerWidth * 0.5) {
    if (stick.id < 0) {
      stick.id = e.pointerId;
      stick.cx = e.clientX;
      stick.cy = e.clientY;
      stick.x = stick.y = 0;
      placeStick(stick.cx, stick.cy);
      setKnob(0, 0);
      $('stick').classList.add('on');
    }
  } else {
    atkPtrs.add(e.pointerId);
    inp.atk = true;
    inp.mouseAim = false;
  }
});
function updMouse(e) {
  mouseNDC.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
}
window.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    updMouse(e);
    return;
  }
  if (e.pointerId === stick.id) stickMove(e.clientX, e.clientY);
});
function ptrUp(e) {
  if (e.pointerType === 'mouse') {
    if (e.button === 0) inp.atk = false;
    if (e.button === 2) inp.bow = false;
    return;
  }
  if (e.pointerId === stick.id) stickRelease();
  if (atkPtrs.delete(e.pointerId) && !atkPtrs.size) inp.atk = false;
}
window.addEventListener('pointerup', ptrUp);
window.addEventListener('pointercancel', ptrUp);
cv.addEventListener('lostpointercapture', ptrUp);
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.repeat) {
    if (state === 'play' && (e.code === 'Space' || e.code.indexOf('Arrow') === 0)) e.preventDefault();
    return;
  }
  audioInit();
  keys[e.code] = true;
  if (state === 'play') {
    if (e.code === 'Space') {
      inp.roll = 0.18;
      e.preventDefault();
    } else if (e.code === 'KeyJ') {
      inp.atk = true;
      inp.mouseAim = false;
    } else if (e.code === 'KeyK') {
      inp.bow = true;
      inp.mouseAim = false;
    } else if (e.code === 'KeyQ' || e.code === 'KeyL') inp.spec = 0.18;
    else if (e.code === 'KeyE') inp.potion = 0.18;
    else if (e.code === 'Escape' || e.code === 'KeyP') pause(true);
    if (e.code.indexOf('Arrow') === 0) e.preventDefault();
  } else if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) pause(false);
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'KeyJ') inp.atk = false;
  if (e.code === 'KeyK') inp.bow = false;
});
window.addEventListener('blur', resetInput);
function bindAct(id, down, up) {
  const el = $(id);
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    audioInit();
    if (state !== 'play') return;
    if (e.pointerType !== 'mouse') setTouch(true);
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}
    el.classList.add('down');
    buzz(8);
    down();
  });
  const rel = () => {
    if (!el.classList.contains('down')) return;
    el.classList.remove('down');
    if (up) up();
  };
  el.addEventListener('pointerup', rel);
  el.addEventListener('pointercancel', rel);
  el.addEventListener('lostpointercapture', rel);
}
bindAct(
  'bAtk',
  () => {
    inp.atk = true;
    inp.mouseAim = false;
  },
  () => {
    if (!atkPtrs.size) inp.atk = false;
  }
);
bindAct(
  'bBow',
  () => {
    inp.bow = true;
    inp.mouseAim = false;
  },
  () => {
    inp.bow = false;
  }
);
bindAct('bRoll', () => {
  inp.roll = 0.2;
});
bindAct('bSpec', () => {
  inp.spec = 0.2;
});
bindAct('bPot', () => {
  inp.potion = 0.2;
});
