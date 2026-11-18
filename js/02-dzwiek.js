/* Kostkowe Lochy: Efekty dźwiękowe i muzyka tła syntezowane w Web Audio (bez plików audio).
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= dźwięk ================= */
let actx = null,
  master = null,
  noiseBuf = null;
function audioInit() {
  if (actx) {
    if (actx.state === 'suspended') actx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = save.mute ? 0 : 0.55;
    master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const sb = actx.createBufferSource();
    sb.buffer = actx.createBuffer(1, 1, 22050);
    sb.connect(actx.destination);
    sb.start(0);
  } catch (e) {
    actx = null;
  }
}
for (const ev of ['touchend', 'click', 'keydown'])
  document.addEventListener(ev, () => audioInit(), { passive: true });
const canVib = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
function buzz(p) {
  if (save.vib && isTouch && canVib)
    try {
      navigator.vibrate(p);
    } catch (e) {}
}
function tone(f, dur, type, vol, slide, delay) {
  if (!actx) return;
  const t = actx.currentTime + (delay || 0);
  const o = actx.createOscillator(),
    g = actx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
  g.gain.setValueAtTime(vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}
function noise(dur, vol, freq, q, delay, type) {
  if (!actx) return;
  const t = actx.currentTime + (delay || 0);
  const s = actx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = actx.createBiquadFilter();
  f.type = type || 'bandpass';
  f.frequency.value = freq || 1000;
  f.Q.value = q || 1;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t);
  s.stop(t + dur + 0.03);
}
const sfx = {
  swing(fin) {
    noise(fin ? 0.2 : 0.13, 0.16, fin ? 1300 : 2000, 0.7);
  },
  hit() {
    noise(0.07, 0.3, 700, 1);
    tone(160, 0.09, 'square', 0.13, -80);
  },
  crit() {
    noise(0.1, 0.34, 500, 1);
    tone(520, 0.12, 'square', 0.1, 300);
  },
  crystal() {
    tone(rnd(900, 1200), 0.14, 'triangle', 0.16, -300);
    noise(0.05, 0.15, 3200, 2);
  },
  die() {
    noise(0.16, 0.22, 380, 0.8);
    tone(120, 0.16, 'square', 0.1, -70);
  },
  hurt() {
    tone(220, 0.2, 'sawtooth', 0.2, -140);
    noise(0.12, 0.25, 300, 0.7);
  },
  roll() {
    noise(0.2, 0.14, 900, 0.5, 0, 'highpass');
  },
  bow() {
    tone(420, 0.1, 'triangle', 0.16, -250);
    noise(0.06, 0.1, 2600, 1);
  },
  gem() {
    tone(pick([988, 1175, 1319]), 0.09, 'square', 0.06);
  },
  heal() {
    tone(523, 0.14, 'triangle', 0.14);
    tone(659, 0.14, 'triangle', 0.14, 0, 0.09);
    tone(784, 0.22, 'triangle', 0.14, 0, 0.18);
  },
  spec() {
    noise(0.4, 0.25, 800, 0.4);
    tone(300, 0.35, 'sawtooth', 0.1, 500);
  },
  slam() {
    noise(0.35, 0.4, 140, 0.6, 0, 'lowpass');
    tone(70, 0.3, 'sine', 0.35, -30);
  },
  capture() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'square', 0.1, 0, i * 0.09));
    noise(0.5, 0.2, 2400, 0.5);
  },
  spawn() {
    tone(180, 0.25, 'triangle', 0.08, 160);
  },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.4, 'square', 0.1, 0, i * 0.13));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, 'triangle', 0.16, 0, i * 0.2));
  },
  wail() {
    tone(330, 0.55, 'sine', 0.07, 260);
    tone(336, 0.55, 'sine', 0.05, 250);
  },
  dash() {
    noise(0.3, 0.22, 1700, 0.6);
    tone(620, 0.28, 'sine', 0.08, -380);
  },
  trap() {
    noise(0.12, 0.25, 2600, 1.2);
    tone(180, 0.12, 'square', 0.08, -60);
  },
  block() {
    tone(900, 0.06, 'square', 0.1, -300);
    noise(0.08, 0.2, 2400, 1.5);
  },
  sweep() {
    noise(0.35, 0.3, 900, 0.5);
    tone(180, 0.3, 'sawtooth', 0.1, -100);
  },
  quake() {
    noise(0.6, 0.45, 120, 0.5, 0, 'lowpass');
    tone(55, 0.5, 'sine', 0.4, -20);
  },
  meteor() {
    noise(0.5, 0.35, 300, 0.6);
    tone(140, 0.4, 'sawtooth', 0.12, -90);
  },
  click() {
    tone(660, 0.06, 'square', 0.07);
  },
  shield() {
    tone(1400, 0.08, 'triangle', 0.1, -200);
  },
  shieldBreak() {
    noise(0.3, 0.25, 3000, 0.6);
    tone(700, 0.3, 'triangle', 0.14, -500);
  },
  alarm() {
    tone(440, 0.14, 'square', 0.12);
    tone(440, 0.14, 'square', 0.12, 0, 0.2);
  },
  lost() {
    [330, 262, 196].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.12, 0, i * 0.16));
  },
  perfect() {
    tone(880, 0.1, 'triangle', 0.14, 400);
    tone(1320, 0.22, 'triangle', 0.12, 0, 0.07);
  },
  fuse() {
    noise(0.7, 0.08, 5000, 2);
  },
  boom() {
    noise(0.45, 0.5, 160, 0.5, 0, 'lowpass');
    tone(90, 0.35, 'sine', 0.4, -50);
    noise(0.2, 0.3, 1200, 0.6);
  },
  chant() {
    tone(392, 0.25, 'sine', 0.12);
    tone(587, 0.3, 'sine', 0.1, 0, 0.1);
  },
  no() {
    tone(160, 0.1, 'square', 0.08);
  },
  boss() {
    tone(60, 1.2, 'sawtooth', 0.3, 30);
    noise(1, 0.3, 200, 0.5, 0, 'lowpass');
  },
};
const SCALES = {
  forest: [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3],
  desert: [196, 207.7, 246.9, 261.6, 293.7, 311.1, 392, 415.3],
  lava: [146.8, 174.6, 196, 220, 233.1, 293.7, 349.2, 392],
  crypt: [110, 130.8, 146.8, 155.6, 196, 207.7, 261.6, 311.1],
  dusk: [98, 116.5, 130.8, 146.8, 174.6, 196, 233.1, 261.6],
};
let musT = 0,
  musStep = 0,
  musNote = 3;
function music(dt) {
  if (!actx || save.mute || !theme) return;
  musT -= dt;
  if (musT > 0) return;
  musT += boss ? 0.3 : 0.44;
  musStep++;
  const sc = SCALES[theme.key];
  if (musStep % (boss ? 4 : 8) === 1) tone(sc[0] / 2, 1.8, 'sine', 0.07);
  if (Math.random() < 0.62) {
    musNote = clamp(musNote + ((Math.random() * 5) | 0) - 2, 0, sc.length - 1);
    tone(sc[musNote], 0.9, 'triangle', 0.035);
  }
}
