/* Kostkowe Lochy: artefakty w grze. Do dwóch artefaktów w gniazdach, każdy z własnym odnowieniem.
   Dane i ceny są w 04-dane.js (ARTIFACTS), zakupy i zakładanie w 16-rozwoj.js.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
const art = { slots: [null, null], cd: [0, 0], max: [1, 1] };
let totems = [];
const ART_ICONS = {
  horn: '<path d="M3 15c5-1 9-4 12-9l2 1-1 4c2 1 4 3 5 6l-2 1c-2-2-4-3-7-3l-1 3H9v-3c-2 0-4 1-6 0z"/>',
  totem: '<path d="M10 2h4v3h3v4h-3v3h3v4h-3v6h-4v-6H7v-4h3V9H7V5h3z"/>',
  crystal: '<path d="M12 1l5 7-5 15-5-15zM4 9l3-1 2 7zM20 9l-3-1-2 7z"/>',
  bolt: '<path d="M13 1L4 14h6l-2 9 10-14h-6z"/>',
  cloak: '<path d="M12 2c3 0 5 2 5 5v2l3 13H4L7 9V7c0-3 2-5 5-5zm-2 6h1v2h-1zm3 0h1v2h-1z"/>',
  sword:
    '<polygon points="20,2 22,4 11,15 9,13"/><polygon points="6.5,11.5 12.5,17.5 11,19 5,13"/><polygon points="7,15.5 8.5,17 4,21.5 2.5,20"/>',
  heart: '<path d="M12 21L3 12a5 5 0 0 1 9-6 5 5 0 0 1 9 6z"/>',
  boot: '<path d="M7 2h7v10l6 3v5H4v-5l3-1z"/>',
  bow: '<path d="M7 2c9 3 12 10 11 20l-2.2-.3C16.6 13 14 7.4 6.2 4z"/><polygon points="2,21 3,22 15,10 17,11 17,7 13,7 14,9"/>',
  star: '<polygon points="12,1 14.6,9.4 23,12 14.6,14.6 12,23 9.4,14.6 1,12 9.4,9.4"/>',
  golem: '<path d="M8 2h8v5h3v8h-3v7h-3v-5h-2v5H8v-7H5V7h3z"/>',
};
function artIcon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ART_ICONS[name] || '') + '</svg>';
}
function artDef(id) {
  return ARTIFACTS.find(a => a.id === id);
}
function slotCount() {
  return save.stars.reduce((a, b) => a + b, 0) >= SLOT2_STARS ? 2 : 1;
}
// przypisanie artefaktów z zapisu do gniazd i przycisków (przy starcie etapu)
function artSetup() {
  for (let k = 0; k < 2; k++) {
    const id = k < slotCount() ? save.art.eq[k] : null,
      lvl = id ? save.art.own[id] || 0 : 0,
      d = id && lvl ? artDef(id) : null,
      el = $(k ? 'bArt2' : 'bArt1');
    art.slots[k] = d ? { d, lvl, v: d.lv[lvl - 1] } : null;
    art.cd[k] = 0;
    art.max[k] = d ? d.lv[lvl - 1].cd : 1;
    el.hidden = !d;
    if (d) {
      el.querySelector('.ico').innerHTML = artIcon(d.icon);
      el.setAttribute('aria-label', d.name);
    }
  }
}
function useArt(k) {
  const s = art.slots[k];
  if (!s || state !== 'play' || hero.dead || ending) return;
  if (art.cd[k] > 0) {
    sfx.no();
    return;
  }
  art.cd[k] = art.max[k];
  ART_FX[s.d.id](s.v);
  buzz(15);
}
const ART_FX = {
  horn(v) {
    const h = hero;
    for (let i = 0; i < v.n; i++) {
      let x = h.x,
        z = h.z;
      for (let k = 0; k < 10; k++) {
        const a = rnd(TAU),
          r = rnd(1.4, 2.6);
        if (canStand(h.x + Math.sin(a) * r, h.z + Math.cos(a) * r, 0.45)) {
          x = h.x + Math.sin(a) * r;
          z = h.z + Math.cos(a) * r;
          break;
        }
      }
      const g = makeUnit('golem', x, z, null);
      g.summon = true;
      g.ttl = v.t;
      g.maxHp = g.hp = Math.round(g.maxHp * v.str);
      g.dmg *= v.str;
      burst(x, 0.4, z, 0xbfb6a8, 12, 4, 0.16, 0.6);
      waveFx(x, z, 0.3, 1.6, COL_P, 0.4);
    }
    sfx.boss();
    shake(0.3);
  },
  totem(v) {
    const h = hero,
      g = new THREE.Group();
    g.position.set(h.x, 0, h.z);
    const pole = new THREE.Mesh(BOX, mat(0x6b4a2e));
    pole.scale.set(0.24, 1.6, 0.24);
    pole.position.y = 0.8;
    pole.castShadow = true;
    const head = new THREE.Mesh(BOX, mat(0x8a7a4a));
    head.scale.set(0.5, 0.42, 0.5);
    head.position.y = 1.7;
    const gem = new THREE.Mesh(OCT, mat(0xff8fa0, 0xc03050));
    gem.scale.set(0.16, 0.24, 0.16);
    gem.position.y = 2.15;
    const ring = new THREE.Mesh(
      RING_GEO,
      new THREE.MeshBasicMaterial({
        color: 0xff8fa0,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.scale.setScalar(v.r / 2.2);
    g.add(pole, head, gem, ring);
    glowSprite(g, 0xff8fa0, 2.2, 0, 2.15, 0, 0.6);
    fxG.add(g);
    totems.push({ x: h.x, z: h.z, t: v.t, heal: v.heal, r: v.r, g, gem, ring, tick: 0 });
    burst(h.x, 1, h.z, 0xff8fa0, 14, 3, 0.12, 0.7, -3);
    sfx.heal();
  },
  frost(v) {
    const h = hero;
    waveFx(h.x, h.z, 0.5, v.r, 0x9fe8ff, 0.5);
    waveFx(h.x, h.z, 0.3, v.r * 0.7, 0xffffff, 0.35);
    burst(h.x, 0.8, h.z, 0xcff4ff, 30, 7, 0.16, 0.7, 4);
    flash(h.x, 1.5, h.z, 0x9fe8ff, 2.4, 0.5, 12);
    sfx.crystal();
    sfx.shieldBreak();
    for (const u of units) {
      if (u.team !== 1 || u.dead || Math.hypot(u.x - h.x, u.z - h.z) > v.r + u.r) continue;
      hurt(u, v.dmg, h.x, h.z, 0);
      if (u.dead) continue;
      if (u.def.boss) dmgNum(u.x, u.h + 0.6, u.z, 'odporny', 'ally');
      else {
        // zamrożony stoi jak bryła lodu: bez odrzutu i bez przepychania
        u.frozen = v.t;
        u.kx = u.kz = 0;
        u.dashT = 0;
      }
    }
  },
  thunder(v) {
    const h = hero,
      list = units
        .filter(u => u.team === 1 && !u.dead && Math.hypot(u.x - h.x, u.z - h.z) < 9)
        .sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))
        .slice(0, v.n);
    if (!list.length) dmgNum(h.x, h.h + 0.6, h.z, 'brak celów', 'ally');
    list.forEach((u, i) => {
      boltFx(u.x, u.z, i * 0.06);
      hurt(u, v.dmg, u.x, u.z + 0.01, 3, true);
    });
    flash(h.x, 4, h.z, 0xcfe8ff, 3, 0.35, 18);
    shake(0.5);
    sfx.boom();
  },
  cloak(v) {
    const h = hero;
    h.cloakT = v.t;
    for (const m of h.meshes) m.material = GHOST;
    burst(h.x, 1, h.z, 0x2a3a50, 18, 3, 0.16, 0.6, -2);
    sfx.wail();
  },
};
const GHOST = new THREE.MeshBasicMaterial({
  color: 0x5a7aa8,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
});
function artCloakEnd() {
  const h = hero;
  for (const m of h.meshes) m.material = m.userData.m;
  burst(h.x, 1, h.z, 0x5a7aa8, 10, 3, 0.12, 0.5);
}
// pioruny: pionowe snopy światła, które szybko gasną
const bolts = [];
for (let i = 0; i < 8; i++) {
  const m = new THREE.Mesh(
    BOX,
    new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    })
  );
  m.scale.set(0.25, 14, 0.25);
  m.visible = false;
  fxG.add(m);
  bolts.push({ m, t: 0, d: 0, x: 0, z: 0 });
}
function boltFx(x, z, delay) {
  const b = bolts.find(b => b.t <= 0 && b.d <= 0);
  if (!b) return;
  b.d = delay;
  b.t = 0.28;
  b.x = x;
  b.z = z;
}
// lód wokół zamrożonych wrogów: jeden zestaw instancji
const iceMesh = new THREE.InstancedMesh(
  BOX,
  new THREE.MeshLambertMaterial({
    color: 0xbff0ff,
    emissive: 0x2a6080,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }),
  48
);
iceMesh.count = 0;
iceMesh.frustumCulled = false;
fxG.add(iceMesh);
function updateArts(dt) {
  for (let k = 0; k < 2; k++) if (art.cd[k] > 0) art.cd[k] = Math.max(0, art.cd[k] - dt);
  for (let i = totems.length - 1; i >= 0; i--) {
    const t = totems[i];
    t.t -= dt;
    t.gem.rotation.y += dt * 3;
    t.ring.rotation.z += dt;
    t.tick -= dt;
    if (t.tick <= 0) {
      t.tick = 0.5;
      const h = hero;
      if (!h.dead && Math.hypot(h.x - t.x, h.z - t.z) < t.r) {
        h.hp = Math.min(h.maxHp, h.hp + t.heal * 0.5);
        burst(h.x, 1.2, h.z, 0xff8fa0, 2, 1, 0.1, 0.6, -3);
      }
      for (const u of units)
        if (u.team === 0 && !u.dead && Math.hypot(u.x - t.x, u.z - t.z) < t.r)
          u.hp = Math.min(u.maxHp, u.hp + t.heal * 0.5);
    }
    if (t.t <= 0) {
      burst(t.x, 1, t.z, 0xff8fa0, 10, 3, 0.12, 0.5);
      fxG.remove(t.g);
      totems.splice(i, 1);
    }
  }
  for (const b of bolts) {
    if (b.d > 0) {
      b.d -= dt;
      if (b.d <= 0) {
        b.m.visible = true;
        b.m.position.set(b.x, 7, b.z);
        burst(b.x, 0.3, b.z, 0xe8f4ff, 10, 6, 0.12, 0.4);
        decal(b.x, b.z, 0.9, 1.5);
      }
      continue;
    }
    if (b.t <= 0) continue;
    b.t -= dt;
    b.m.material.opacity = Math.max(0, b.t / 0.28) * 0.95;
    b.m.scale.x = b.m.scale.z = 0.25 + Math.random() * 0.15;
    if (b.t <= 0) b.m.visible = false;
  }
  let n = 0;
  for (const u of units) {
    if (!(u.frozen > 0) || u.dead || n >= 48) continue;
    dummy.position.set(u.x, u.h * 0.5 * u.baseScale, u.z);
    dummy.rotation.set(0, u.face, 0);
    dummy.scale.set(u.r * 2.4, u.h * 1.05 * u.baseScale, u.r * 2.4);
    dummy.updateMatrix();
    iceMesh.setMatrixAt(n++, dummy.matrix);
  }
  iceMesh.count = n;
  iceMesh.instanceMatrix.needsUpdate = true;
}
function artReset() {
  for (const t of totems) fxG.remove(t.g);
  totems = [];
  for (const b of bolts) {
    b.t = b.d = 0;
    b.m.visible = false;
  }
  iceMesh.count = 0;
  if (hero.cloakT > 0) {
    hero.cloakT = 0;
    artCloakEnd();
  }
}
