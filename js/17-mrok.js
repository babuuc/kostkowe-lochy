/* Kostkowe Lochy: mrok w ciemnych etapach (Cytadela Mroku).
   Na obraz gry nakładana jest ciemna warstwa rysowana w niskiej rozdzielczości (piąta część ekranu),
   w której wycinane są jasne miejsca: pole widzenia bohatera, przejęte kapliczki, ogniska, a także
   wszystkie ostrzeżenia, wrogie pociski i strefy ognia, żeby niebezpieczeństwo zawsze było widać.
   Peleryna świetlików poszerza pole widzenia, na poziomie 4 pokazuje oczy wrogów w mroku,
   a na poziomie 8 co 8 s rozbłyska i na chwilę rozświetla okolicę.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
const darkCv = $('dark'),
  dctx = darkCv.getContext('2d');
let darkOn = false,
  darkMul = 1,
  darkFlare = 0,
  flareT = 8;
const darkP = [0, 0, 0];
function darkScreen(x, y, z) {
  tmpV.set(x, y, z).project(camera);
  darkP[0] = (tmpV.x * 0.5 + 0.5) * darkCv.width;
  darkP[1] = (-tmpV.y * 0.5 + 0.5) * darkCv.height;
  darkP[2] = tmpV.z;
  return darkP;
}
// promień w pikselach warstwy dla promienia r w świecie (wzdłuż osi poziomej kamery)
function darkRad(x, z, r) {
  const a = darkScreen(x, 0.6, z),
    ax = a[0],
    ay = a[1],
    b = darkScreen(x + camRX * r, 0.6, z + camRZ * r);
  return Math.hypot(b[0] - ax, b[1] - ay);
}
function darkHole(x, z, r, soft) {
  const R = darkRad(x, z, r),
    p = darkScreen(x, 0.6, z),
    px = p[0],
    py = p[1];
  if (p[2] > 1 || R < 0.5 || px < -R || py < -R || px > darkCv.width + R || py > darkCv.height + R) return;
  const g = dctx.createRadialGradient(px, py, R * soft, px, py, R);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = g;
  dctx.fillRect(px - R, py - R, R * 2, R * 2);
}
function darkReset() {
  darkMul = 1;
  darkFlare = 0;
  flareT = 8;
}
function updateDark(dt) {
  const on = !!(theme && theme.dark && state !== 'menu');
  if (on !== darkOn) {
    darkOn = on;
    darkCv.hidden = !on;
  }
  if (!on) return;
  const w = Math.ceil(window.innerWidth / 5),
    hgt = Math.ceil(window.innerHeight / 5);
  if (darkCv.width !== w || darkCv.height !== hgt) {
    darkCv.width = w;
    darkCv.height = hgt;
  }
  const h = hero,
    pr = boss && !boss.dead && boss.def.prince ? boss : null;
  if (state === 'play') {
    if (h.flare && !h.dead) {
      flareT -= dt;
      if (flareT <= 0) {
        flareT = 8;
        darkFlare = 1.6;
        burst(h.x, 1.2, h.z, 0xd8c0ff, 16, 4, 0.1, 0.8, -2);
        waveFx(h.x, h.z, 0.5, 6, 0xd8c0ff, 0.6);
      }
    }
    if (darkFlare > 0) darkFlare -= dt;
    // zaćmienie Księcia zawęża widok, krwawy księżyc go poszerza
    darkMul = damp(darkMul, pr ? (pr.ph === 2 ? 0.7 : pr.ph === 3 ? 1.3 : 1) : 1, 2, dt);
  }
  const sight = h.sight * darkMul + (darkFlare > 0 ? 7 * Math.min(1, darkFlare) : 0),
    red = pr && pr.ph === 3,
    W = darkCv.width,
    H = darkCv.height;
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = red ? 'rgba(30,2,8,0.78)' : 'rgba(3,2,8,0.9)';
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  if (!h.dead) darkHole(h.x, h.z, sight, 0.6);
  else darkHole(camT.x, camT.z, 5, 0.4);
  for (const n of nodes) if (n.own === 0) darkHole(n.x, n.z, 7.5, 0.35);
  for (const s of lightSrc) if (!s.node && !s.unit && s.d < 32) darkHole(s.x, s.z, 2.6, 0.2);
  for (const t of totems) darkHole(t.x, t.z, t.r + 0.5, 0.5);
  // niebezpieczeństwo jest widoczne zawsze
  for (const t of teles) if (t.t > 0) darkHole(t.a.position.x, t.a.position.z, t.rad + 0.8, 0.6);
  for (const c of cones) if (c.t > 0) darkHole(c.x, c.z, c.r * 0.9, 0.5);
  for (const z of fireZones) if (z.t > 0) darkHole(z.x, z.z, z.r + 0.7, 0.5);
  for (const p of projs) if (p.team === 1) darkHole(p.x, p.z, 1.2, 0.3);
  for (const q of quakes)
    if (q.t > 0 && !h.dead) {
      const dx = h.x - q.x,
        dz = h.z - q.z,
        d = Math.hypot(dx, dz) || 1;
      darkHole(q.x + (dx / d) * q.R, q.z + (dz / d) * q.R, 2.4, 0.4);
    }
  if (pr && !pr.vanish) darkHole(pr.x, pr.z, 3.6, 0.3);
  dctx.globalCompositeOperation = 'source-over';
  // Peleryna na poziomie 4: oczy wrogów poza polem widzenia
  if (h.eyes && !h.dead) {
    dctx.fillStyle = 'rgba(255,70,80,0.95)';
    for (const u of units) {
      if (u.team !== 1 || u.dead || u.spawnT > 0) continue;
      const d = Math.hypot(u.x - h.x, u.z - h.z);
      if (d < sight * 0.85 || d > sight * 2.6) continue;
      const p = darkScreen(u.x, u.h * u.baseScale * 0.85, u.z);
      if (p[2] > 1) continue;
      dctx.fillRect(p[0] - 1.2, p[1] - 0.5, 0.9, 0.9);
      dctx.fillRect(p[0] + 0.3, p[1] - 0.5, 0.9, 0.9);
    }
  }
}
