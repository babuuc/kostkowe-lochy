/* Kostkowe Lochy: Narzędzia matematyczne, generator losowy i zapis postępu w przeglądarce.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
const $ = id => document.getElementById(id);
if (typeof THREE === 'undefined') {
  $('fatal').hidden = false;
  throw new Error('Nie udało się wczytać three.js');
}

/* ================= narzędzia ================= */
const G = 72,
  TAU = Math.PI * 2,
  COL_P = 0x3fe3ff,
  COL_E = 0xb657ff;
const CAM_YAW = 0.62,
  CAM_PITCH = 0.93,
  ROLL_T = 0.3,
  ROLL_SPD = 15;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const rnd = (a, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = a => a[(Math.random() * a.length) | 0];
function angDiff(a, b) {
  return ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
}
function angLerp(a, b, t) {
  return a + angDiff(a, b) * t;
}
function mulberry(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function segDist(px, pz, a, b) {
  const vx = b.x - a.x,
    vz = b.z - a.z;
  const t = clamp(((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
}
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================= zapis ================= */
const SAVE_KEY = 'kostkowe-lochy-v1';
let save = {
  unlocked: 1,
  gems: 0,
  up: { atk: 0, hp: 0, agi: 0, gol: 0 },
  stars: [0, 0, 0],
  mute: false,
  vib: true,
};
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (s && typeof s === 'object') {
    save.unlocked = clamp(s.unlocked | 0, 1, 99);
    save.gems = Math.max(0, s.gems | 0);
    save.mute = !!s.mute;
    if (s.vib === false) save.vib = false;
    if (s.up) for (const k of ['atk', 'hp', 'agi', 'gol']) save.up[k] = clamp(s.up[k] | 0, 0, 5);
    if (Array.isArray(s.stars))
      for (let i = 0; i < Math.min(s.stars.length, 20); i++) save.stars[i] = clamp(s.stars[i] | 0, 0, 3);
  }
} catch (e) {}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {}
}
