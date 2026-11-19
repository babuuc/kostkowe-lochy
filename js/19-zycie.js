/* Kostkowe Lochy: życie świata i odczucia z gry.
   - kamera: wjazd na początku etapu, kopnięcie przy mocnych ciosach i przyjętych trafieniach, przybliżenie przy
     przejęciu kapliczki i spowolnienie przy wygranej,
   - życie biomów: motyle i spadające liście w gaju, ryby wyskakujące z wody, wiry piasku na pustyni,
     bąble i gejzery lawy w Żarzących Głębiach,
   - dźwięki otoczenia: ptaki, wiatr, dudnienie lawy; ciche kroki bohatera zależne od podłoża.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';

/* ---------- kamera ---------- */
const camFx = { intro: 0, px: 0, pz: 0, kick: 0 };
function camIntro() {
  camFx.intro = 1.7;
  camFx.px = camFx.pz = camFx.kick = 0;
}
// kopnięcie kamery w kierunku (dx, dz) o siłę a
function camPunch(dx, dz, a) {
  if (!isFinite(dx) || !isFinite(dz)) return;
  if (reduceMotion) a *= 0.3;
  const d = Math.hypot(dx, dz) || 1;
  camFx.px += (dx / d) * a;
  camFx.pz += (dz / d) * a;
}
function camZoomKick(a) {
  camFx.kick += reduceMotion ? a * 0.3 : a;
}
// wywoływane z updateCamera: zwraca mnożnik odległości i przesunięcie
function camFxStep(dt) {
  let mul = 1;
  if (camFx.intro > 0) {
    camFx.intro = Math.max(0, camFx.intro - dt);
    const k = camFx.intro / 1.7;
    mul += k * k * (3 - 2 * k) * 1.1;
  }
  camFx.px = damp(camFx.px, 0, 9, dt);
  camFx.pz = damp(camFx.pz, 0, 9, dt);
  camFx.kick = damp(camFx.kick, 0, 5, dt);
  return mul + camFx.kick;
}

/* ---------- motyle w gaju ---------- */
const BF_N = 14;
const bfMesh = new THREE.InstancedMesh(
  BOX,
  new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  BF_N * 2
);
bfMesh.frustumCulled = false;
const flies = [];
{
  const cols = [0xffd84a, 0xff8ab0, 0xb48cff, 0xffffff, 0x8ad8ff];
  for (let i = 0; i < BF_N; i++) {
    const c = cols[i % cols.length];
    bfMesh.setColorAt(i * 2, tmpC.setHex(c));
    bfMesh.setColorAt(i * 2 + 1, tmpC.setHex(c));
    flies.push({ x: 0, z: 0, y: 1, a: rnd(TAU), ph: rnd(TAU), sp: rnd(0.8, 1.6), ok: false });
  }
}
bfMesh.visible = false;
fxG.add(bfMesh);
const bfE = new THREE.Euler();
function updateButterflies(dt) {
  const on = theme && theme.key === 'forest';
  bfMesh.visible = on;
  if (!on) return;
  for (let i = 0; i < BF_N; i++) {
    const b = flies[i];
    // motyl, który odleciał za daleko, pojawia się z drugiej strony kamery
    if (!b.ok || Math.hypot(b.x - camT.x, b.z - camT.z) > 16) {
      for (let k = 0; k < 8; k++) {
        const x = camT.x + rnd(-13, 13),
          z = camT.z + rnd(-13, 13);
        if (walkAt(x, z)) {
          b.x = x;
          b.z = z;
          b.ok = true;
          break;
        }
      }
    }
    b.ph += dt * 18 * b.sp;
    b.a += Math.sin(time * 0.7 + i) * dt * 1.4;
    const nx = b.x + Math.sin(b.a) * dt * b.sp,
      nz = b.z + Math.cos(b.a) * dt * b.sp;
    if (walkAt(nx, nz)) {
      b.x = nx;
      b.z = nz;
    } else b.a += Math.PI * 0.6;
    b.y = 0.9 + Math.sin(time * 1.3 + i * 2) * 0.45;
    const flap = Math.sin(b.ph) * 1.1;
    for (let s = 0; s < 2; s++) {
      const sg = s ? 1 : -1;
      bfE.set(0, b.a, sg * flap);
      dummy.quaternion.setFromEuler(bfE);
      dummy.position.set(b.x + Math.cos(b.a) * sg * 0.07, b.y, b.z - Math.sin(b.a) * sg * 0.07);
      dummy.scale.set(0.16, 0.02, 0.12);
      dummy.updateMatrix();
      bfMesh.setMatrixAt(i * 2 + s, dummy.matrix);
    }
  }
  dummy.rotation.set(0, 0, 0);
  bfMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- zdarzenia otoczenia ---------- */
let ambT = 2,
  devils = [],
  ambSndT = 3;
function ambientSpot(inVoid) {
  for (let k = 0; k < 10; k++) {
    const x = camT.x + rnd(-14, 14),
      z = camT.z + rnd(-11, 11);
    if (x > 1 && z > 1 && x < G - 1 && z < G - 1 && walkAt(x, z) !== inVoid) return [x, z];
  }
  return null;
}
function updateWorldLife(dt) {
  if (!theme) return;
  updateButterflies(dt);
  const k = theme.key;
  ambT -= dt;
  if (ambT <= 0) {
    if (k === 'forest') {
      ambT = rnd(2.5, 5);
      // ryba wyskakuje z wody
      const p = ambientSpot(true);
      if (p) {
        sparks.burst(p[0], theme.underY + 0.2, p[1], 0xbfefff, 8, 2.6, 0.08, 0.6, 9);
        debris.burst(p[0], theme.underY + 0.3, p[1], 0xe08a40, 1, 3.4, 0.22, 0.7, 12);
        waveFx(p[0], p[1], 0.2, 1.3, 0xbfefff, 0.7, theme.underY + 0.05);
      }
    } else if (k === 'desert') {
      ambT = rnd(6, 10);
      // wir piasku przechodzący przez wyspę
      const p = ambientSpot(false);
      if (p && devils.length < 2) devils.push({ x: p[0], z: p[1], a: rnd(TAU), t: rnd(5, 8) });
    } else if (k === 'lava') {
      ambT = rnd(1.6, 3.2);
      const p = ambientSpot(true);
      if (p) {
        if (Math.random() < 0.35) {
          // gejzer lawy
          sparks.burst(p[0], theme.underY + 0.2, p[1], 0xffb040, 26, 8, 0.16, 1.1, 9);
          sparks.burst(p[0], theme.underY + 0.2, p[1], 0xff5010, 14, 5, 0.22, 0.9, 7);
          flash(p[0], 1, p[1], 0xff8030, 1.4, 0.5, 9);
          if (Math.hypot(p[0] - hero.x, p[1] - hero.z) < 14) sfx.lava();
        } else {
          // bąbel na powierzchni
          sparks.burst(p[0], theme.underY + 0.1, p[1], 0xffd060, 6, 2, 0.1, 0.5, 6);
          waveFx(p[0], p[1], 0.1, 1.0, 0xffa030, 0.5, theme.underY + 0.05);
        }
      }
    } else ambT = 3;
  }
  // spadające liście w gaju
  if (k === 'forest' && Math.random() < dt * 3)
    sparks.burst(
      camT.x + rnd(-12, 12),
      rnd(3.5, 5.5),
      camT.z + rnd(-10, 10),
      pick([0x7fc84a, 0xd8c040, 0x5fa83a]),
      1,
      0.5,
      0.09,
      4,
      0.5
    );
  for (let i = devils.length - 1; i >= 0; i--) {
    const d = devils[i];
    d.t -= dt;
    d.a += Math.sin(time * 0.6 + i) * dt;
    const nx = d.x + Math.sin(d.a) * dt * 1.6,
      nz = d.z + Math.cos(d.a) * dt * 1.6;
    if (walkAt(nx, nz)) {
      d.x = nx;
      d.z = nz;
    } else d.a += 2;
    for (let q = 0; q < 2; q++) {
      const ang = time * 9 + q * Math.PI,
        r = 0.25 + Math.random() * 0.5;
      sparks.burst(
        d.x + Math.sin(ang) * r,
        rnd(0.1, 0.6),
        d.z + Math.cos(ang) * r,
        pick([0xe8cf98, 0xd2b077]),
        1,
        0.6,
        0.07,
        1.1,
        -2.6
      );
    }
    if (d.t <= 0) devils.splice(i, 1);
  }
  ambientSound(dt);
}
function ambientSound(dt) {
  if (!actx || save.mute || state !== 'play') return;
  ambSndT -= dt;
  if (ambSndT > 0) return;
  const k = theme.key;
  if (k === 'forest') {
    ambSndT = rnd(2, 5);
    const f = rnd(2200, 3200);
    for (let i = 0; i < 2 + ((Math.random() * 3) | 0); i++)
      tone(f + rnd(-200, 300), 0.08, 'sine', 0.025, rnd(-500, 600), i * 0.11);
  } else if (k === 'desert') {
    ambSndT = rnd(4, 7);
    noise(2.2, 0.035, 500, 0.4, 0, 'bandpass');
  } else if (k === 'lava' || k === 'dusk') {
    ambSndT = rnd(3, 6);
    noise(1.8, 0.06, 90, 0.4, 0, 'lowpass');
  } else if (k === 'crypt') {
    ambSndT = rnd(5, 9);
    tone(rnd(180, 260), 1.6, 'sine', 0.02, rnd(-40, 40));
  } else ambSndT = 4;
}
// ciche kroki bohatera, brzmienie zależne od podłoża
function heroStep() {
  if (!actx || save.mute) return;
  const k = theme.key,
    c = grid[cellOf(hero.x, hero.z)];
  const f = c === 2 ? 700 : k === 'forest' ? 1600 : k === 'desert' ? 2600 : 1100;
  noise(0.05, 0.03, f, 0.9);
}
function lifeReset() {
  devils = [];
  for (const b of flies) b.ok = false;
  ambT = 2;
}
