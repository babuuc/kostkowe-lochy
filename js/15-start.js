/* Kostkowe Lochy: Pętla główna gry i uruchomienie.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= pętla główna ================= */
let last = performance.now(),
  ftEMA = 16,
  qT = 0,
  qLevel = 0;
function quality(raw) {
  if (window.__noQ) return;
  ftEMA = lerp(ftEMA, raw * 1000, 0.04);
  qT += raw;
  if (qT > 4) {
    qT = 0;
    if (ftEMA > 22 && qLevel < 3) {
      qLevel++;
      if (qLevel === 1) {
        pixelRatio = Math.min(pixelRatio, 1.25);
        renderer.setPixelRatio(pixelRatio);
        resize();
      } else if (qLevel === 2) {
        sun.shadow.mapSize.set(1024, 1024);
        if (sun.shadow.map) {
          sun.shadow.map.dispose();
          sun.shadow.map = null;
        }
      } else sun.castShadow = false;
      ftEMA = 16;
    }
  }
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(Math.max(raw, 0), 0.05);
  time += dt;
  if (state === 'play') {
    if (slowmo > 0) slowmo -= dt;
    if (hitstop > 0) hitstop -= dt;
    else updateSim(slowmo > 0 ? dt * 0.3 : dt);
    if (ending) {
      ending.t -= dt;
      if (ending.t <= 0) {
        const k = ending.kind;
        ending = null;
        finish(k);
      }
    }
    if (raw < 0.2) quality(raw);
  } else if (state === 'menu') {
    for (let i = 0; i < units.length; i++) updateUnit(units[i], dt);
  }
  updateAmbient(dt);
  updateCamera(dt);
  renderer.render(scene, camera);
  if (state === 'play') updateHud(dt);
  if (state === 'play' || state === 'menu') music(dt);
}
window.addEventListener('resize', resize);
setTouch(!!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
if (!isTouch) {
  $('ctrlNote').textContent = 'WASD i mysz. Spacja to unik, Q wir, E mikstura.';
}
resize();
buildWorld(selIdx);
renderMenu();
window.__game = {
  get state() {
    return state;
  },
  hero,
  get units() {
    return units;
  },
  get nodes() {
    return nodes;
  },
  startLevel,
  inp,
  keys,
  stick,
  fieldDir,
  fieldEnemy,
  DIR,
  basis: () => [camRX, camRZ, camFX, camFZ],
  get boss() {
    return boss;
  },
  get time() {
    return levelTime;
  },
  info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  scene,
  camera,
  renderer,
};
requestAnimationFrame(frame);
