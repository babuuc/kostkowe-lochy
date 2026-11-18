/* Kostkowe Lochy: Modele postaci z klocków (z przegubami) i model bohatera.
   Pliki z folderu js/ są ładowane po kolei (zobacz index.html) i dzielą wspólne zmienne globalne. */
'use strict';
/* ================= modele ================= */
// szkielet postaci: biodra, kolana, barki i łokcie jako osobne przeguby
function humanoid(g, o) {
  const P = { hipY: o.legH, lean: 0, eyes: [] },
    body = new THREE.Group();
  body.position.y = o.legH;
  g.add(body);
  P.body = body;
  const th = o.legH * 0.52,
    sh = o.legH - th;
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * o.bodyW * 0.24, o.legH, 0);
    g.add(hip);
    box(hip, o.legW, th + 0.02, o.legW, o.legC, 0, -th / 2, 0);
    const knee = new THREE.Group();
    knee.position.y = -th;
    hip.add(knee);
    box(knee, o.legW * 0.94, sh, o.legW * 0.94, o.shinC || o.legC, 0, -sh / 2, 0);
    P[s < 0 ? 'legL' : 'legR'] = hip;
    P[s < 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  box(body, o.bodyW, o.bodyH, o.bodyD, o.bodyC, 0, o.bodyH / 2, 0);
  const head = new THREE.Group();
  head.position.set(0, o.bodyH, 0);
  body.add(head);
  P.head = head;
  box(head, o.headW, o.headH, o.headD, o.headC, 0, o.headH / 2, 0);
  const ua = o.armH * 0.5,
    fa = o.armH - ua;
  for (const s of [-1, 1]) {
    const sho = new THREE.Group();
    sho.position.set(s * (o.bodyW / 2 + o.armW / 2), o.bodyH - 0.06, 0);
    body.add(sho);
    box(sho, o.armW, ua + 0.04, o.armW, o.armC, 0, -ua / 2 + 0.06, 0);
    const el = new THREE.Group();
    el.position.y = -ua + 0.06;
    sho.add(el);
    box(el, o.armW * 0.96, fa, o.armW * 0.96, o.foreC || o.armC, 0, -fa / 2, 0);
    P[s < 0 ? 'armL' : 'armR'] = sho;
    P[s < 0 ? 'elbL' : 'elbR'] = el;
  }
  return P;
}
function eye(P, parent, w, h, color, em, x, y, z) {
  let g = P.eyeG;
  if (!g) {
    g = P.eyeG = new THREE.Group();
    g.position.y = y;
    parent.add(g);
    P.eyes.push(g);
  }
  return box(g, w, h, 0.04, color, x, 0, z, em, 1);
}
function buildModel(type, root) {
  const TH = theme,
    D = 1;
  let P;
  if (type === 'slime') {
    const b = new THREE.Group();
    root.add(b);
    P = { body: b, col: TH.slime, lean: 0, eyes: [], coreY: 0.3 };
    const shell = new THREE.Mesh(BOX, matT(TH.slime, 0.7));
    shell.scale.set(0.96, 0.72, 0.96);
    shell.position.y = 0.36;
    shell.castShadow = true;
    shell.userData.m = shell.material;
    b.add(shell);
    P.core = box(
      b,
      0.46,
      0.36,
      0.46,
      shade(TH.slime, -0.2),
      0,
      0.3,
      -0.04,
      TH.key === 'lava' ? 0x8a2a08 : 0,
      D
    );
    box(b, 0.3, 0.05, 0.3, shade(TH.slime, 0.22), -0.2, 0.735, -0.2, 0, D);
    for (const s of [-1, 1]) {
      eye(P, b, 0.16, 0.2, 0x16161c, 0, s * 0.2, 0.44, 0.485);
      box(b, 0.06, 0.07, 0.05, 0xffffff, s * 0.2 + 0.04, 0.5, 0.495, 0, D);
    }
    box(b, 0.2, 0.05, 0.05, 0x16161c, 0, 0.26, 0.485, 0, D);
  } else if (type === 'bomber') {
    const b = new THREE.Group();
    root.add(b);
    const rock = 0x3a3038,
      hot = 0xff8a2a;
    P = { body: b, col: rock, lean: 0, eyes: [], coreY: 0.92 };
    box(b, 0.64, 0.58, 0.64, rock, 0, 0.39, 0);
    box(b, 0.5, 0.1, 0.5, shade(rock, 0.06), 0, 0.72, 0, 0, D);
    box(b, 0.4, 0.05, 0.02, hot, 0.05, 0.34, 0.325, hot, D);
    box(b, 0.05, 0.26, 0.02, hot, -0.14, 0.36, 0.325, hot, D);
    box(b, 0.02, 0.05, 0.4, hot, 0.325, 0.42, 0, hot, D);
    box(b, 0.02, 0.3, 0.05, hot, -0.325, 0.36, 0.1, hot, D);
    box(b, 0.3, 0.05, 0.02, hot, -0.05, 0.44, -0.325, hot, D);
    for (const s of [-1, 1]) {
      eye(P, b, 0.13, 0.1, 0xffe08a, 0xffc040, s * 0.16, 0.54, 0.33);
      box(b, 0.18, 0.14, 0.22, 0x2a2228, s * 0.2, 0.07, 0.04, 0, D);
    }
    box(b, 0.06, 0.2, 0.06, 0x8a6a44, 0, 0.82, 0, 0, D);
    P.core = box(b, 0.12, 0.12, 0.12, 0xfff0a0, 0, 0.92, 0, 0xffe060, D);
    glowSprite(b, hot, 1.7, 0, 0.5, 0, 0.34);
  } else if (type === 'goblin') {
    const skin = 0x7fb24a,
      sd = shade(skin, -0.08);
    P = humanoid(root, {
      legH: 0.3,
      legW: 0.16,
      legC: sd,
      bodyW: 0.46,
      bodyH: 0.42,
      bodyD: 0.3,
      bodyC: 0x6b4a2e,
      headW: 0.52,
      headH: 0.4,
      headD: 0.44,
      headC: skin,
      armW: 0.14,
      armH: 0.44,
      armC: skin,
    });
    const H = P.head;
    for (const K of [P.kneeL, P.kneeR]) box(K, 0.2, 0.1, 0.26, sd, 0, -0.1, 0.04, 0, D);
    box(P.body, 0.48, 0.08, 0.32, 0x3a2a1c, 0, 0.08, 0, 0, D);
    box(P.body, 0.1, 0.44, 0.02, 0x3a2a1c, 0.1, 0.22, 0.16, 0, D);
    box(P.body, 0.3, 0.2, 0.04, 0x5a3e28, 0, -0.04, 0.15, 0, D);
    for (const s of [-1, 1]) {
      box(H, 0.24, 0.1, 0.06, sd, s * 0.37, 0.24, -0.02, 0, D);
      box(H, 0.1, 0.08, 0.05, sd, s * 0.5, 0.3, -0.03, 0, D);
      eye(P, H, 0.12, 0.1, 0xffe14a, 0xb08a10, s * 0.13, 0.22, 0.225);
      box(H, 0.05, 0.07, 0.05, 0xfff8e0, s * 0.09, 0.05, 0.225, 0, D);
      box(s < 0 ? P.elbL : P.elbR, 0.16, 0.08, 0.16, 0x3a2a1c, 0, -0.1, 0, 0, D);
    }
    box(H, 0.1, 0.1, 0.12, sd, 0, 0.13, 0.25, 0, D);
    box(H, 0.54, 0.14, 0.46, 0x5a3e28, 0, 0.38, 0, 0, D);
    box(H, 0.08, 0.14, 0.08, 0xcfd6dc, 0, 0.5, 0, 0, D);
    box(P.elbR, 0.1, 0.1, 0.5, 0x7a5a3a, 0, -0.2, 0.22);
    box(P.elbR, 0.22, 0.22, 0.24, 0x8b9198, 0, -0.2, 0.5, 0, D);
    box(P.elbR, 0.06, 0.06, 0.3, 0xcfd6dc, 0, -0.2, 0.5, 0, D);
    P.col = skin;
    P.lean = 0.2;
  } else if (type === 'archer') {
    const bone = 0xe6e2d0,
      bd = 0xbdb8a4,
      cloth = 0x8a2f3a,
      cd = 0x6e2430,
      wood = 0x7a5230;
    P = humanoid(root, {
      legH: 0.42,
      legW: 0.12,
      legC: bone,
      bodyW: 0.36,
      bodyH: 0.5,
      bodyD: 0.2,
      bodyC: bd,
      headW: 0.4,
      headH: 0.38,
      headD: 0.4,
      headC: bone,
      armW: 0.1,
      armH: 0.48,
      armC: bone,
    });
    const H = P.head,
      B = P.body,
      E = P.elbL;
    for (let k = 0; k < 3; k++) box(B, 0.3, 0.04, 0.02, 0x6a6658, 0, 0.16 + k * 0.11, 0.105, 0, D);
    box(B, 0.34, 0.1, 0.22, bone, 0, 0.02, 0, 0, D);
    for (const s of [-1, 1]) {
      box(H, 0.11, 0.11, 0.04, 0x18181c, s * 0.1, 0.2, 0.2, 0, D);
      eye(P, H, 0.04, 0.04, 0xff5040, 0xff3020, s * 0.1, 0.2, 0.21);
      box(s < 0 ? P.kneeL : P.kneeR, 0.14, 0.06, 0.2, bd, 0, -0.17, 0.03, 0, D);
    }
    box(H, 0.06, 0.06, 0.04, 0x18181c, 0, 0.1, 0.2, 0, D);
    box(H, 0.3, 0.08, 0.3, bd, 0, -0.03, 0.03, 0, D);
    box(H, 0.46, 0.18, 0.46, cloth, 0, 0.32, -0.01, 0, D);
    box(H, 0.44, 0.44, 0.08, cd, 0, 0.1, -0.24, 0, D);
    box(B, 0.4, 0.36, 0.05, cd, 0, 0.26, -0.13, 0, D);
    box(B, 0.42, 0.1, 0.26, cloth, 0, 0.48, 0, 0, D);
    box(B, 0.12, 0.4, 0.12, 0x5a3e28, 0.1, 0.3, -0.2, 0, D);
    box(B, 0.03, 0.14, 0.03, 0xefe4c4, 0.1, 0.56, -0.2, 0, D);
    box(B, 0.03, 0.14, 0.03, 0xefe4c4, 0.14, 0.54, -0.18, 0, D);
    box(E, 0.06, 0.06, 0.74, wood, 0, -0.24, 0);
    box(E, 0.06, 0.06, 0.16, wood, 0, -0.18, 0.43, 0, D);
    box(E, 0.06, 0.06, 0.16, wood, 0, -0.18, -0.43, 0, D);
    box(E, 0.02, 0.02, 0.9, 0xf2f2f2, 0, -0.12, 0, 0, D);
    P.col = bone;
  } else if (type === 'shaman') {
    const robe = 0x2a6a5a,
      rd = 0x1f5145,
      bone = 0xe6e2d0,
      wood = 0x6a4a2a,
      gl = 0x7dffb0;
    P = humanoid(root, {
      legH: 0.34,
      legW: 0.12,
      legC: rd,
      bodyW: 0.44,
      bodyH: 0.5,
      bodyD: 0.28,
      bodyC: robe,
      headW: 0.42,
      headH: 0.4,
      headD: 0.4,
      headC: bone,
      armW: 0.12,
      armH: 0.46,
      armC: robe,
    });
    const H = P.head,
      B = P.body,
      E = P.elbR;
    box(root, 0.56, 0.36, 0.44, rd, 0, 0.18, 0);
    box(root, 0.6, 0.06, 0.48, 0xc9a23a, 0, 0.03, 0, 0, D);
    box(B, 0.48, 0.1, 0.32, 0xc9a23a, 0, 0.04, 0, 0, D);
    box(B, 0.3, 0.06, 0.04, bone, 0, 0.36, 0.15, 0, D);
    box(B, 0.08, 0.08, 0.05, gl, 0, 0.26, 0.15, gl, D);
    for (const s of [-1, 1]) {
      eye(P, H, 0.1, 0.12, 0x18181c, 0, s * 0.1, 0.22, 0.205);
      box(H, 0.08, 0.3, 0.08, bone, s * 0.24, 0.5, 0, 0, D);
      box(H, 0.16, 0.08, 0.08, bone, s * 0.3, 0.66, 0, 0, D);
      box(H, 0.03, 0.1, 0.03, gl, s * 0.1, 0.08, 0.205, gl, D);
    }
    box(H, 0.5, 0.2, 0.48, rd, 0, 0.34, -0.03, 0, D);
    box(H, 0.46, 0.42, 0.08, rd, 0, 0.1, -0.25, 0, D);
    box(E, 0.06, 1.3, 0.06, wood, 0, 0.12, 0.08);
    oct(E, 0.14, 0.22, 0.14, gl, 0, 0.92, 0.08, gl);
    glowSprite(E, gl, 1.7, 0, 0.92, 0.08, 0.5);
    P.col = robe;
  } else if (type === 'brute' || type === 'boss') {
    const bossy = type === 'boss',
      skin = bossy ? 0x2c2433 : TH.brute,
      acc = bossy ? 0x6a2f9a : TH.bruteAcc,
      sd = shade(skin, -0.07),
      em = bossy ? 0x4a1870 : 0,
      ivory = 0xe8dfc8;
    P = humanoid(root, {
      legH: 0.5,
      legW: 0.4,
      legC: sd,
      bodyW: 1.15,
      bodyH: 0.95,
      bodyD: 0.78,
      bodyC: skin,
      headW: 0.56,
      headH: 0.44,
      headD: 0.5,
      headC: shade(skin, 0.05),
      armW: 0.36,
      armH: 1.05,
      armC: skin,
    });
    const B = P.body,
      H = P.head;
    box(B, 0.86, 0.5, 0.08, shade(skin, 0.09), 0, 0.36, 0.4, 0, D);
    box(B, 1.19, 0.14, 0.82, 0x3a2a1c, 0, 0.08, 0, 0, D);
    box(B, 0.2, 0.2, 0.06, acc, 0, 0.08, 0.42, em, D);
    box(B, 0.5, 0.34, 0.06, 0x5a3e28, 0, -0.12, 0.4, 0, D);
    box(B, 0.9, 0.36, 0.3, sd, 0, 0.86, -0.36);
    for (let k = 0; k < 3; k++) box(B, 0.14, 0.2, 0.14, ivory, (k - 1) * 0.3, 1.1, -0.38, 0, D);
    for (const s of [-1, 1]) {
      const A = s < 0 ? P.armL : P.armR,
        E = s < 0 ? P.elbL : P.elbR;
      box(A, 0.52, 0.24, 0.54, acc, 0, 0.08, 0, em);
      box(A, 0.12, 0.22, 0.12, ivory, s * 0.1, 0.3, 0, 0, D);
      box(E, 0.42, 0.2, 0.42, acc, 0, -0.13, 0, em, D);
      box(E, 0.46, 0.34, 0.46, sd, 0, -0.42, 0);
      box(H, 0.1, 0.2, 0.1, ivory, s * 0.17, 0.04, 0.27, 0, D);
      box(H, 0.14, 0.14, 0.14, ivory, s * 0.34, 0.36, 0, 0, D);
      box(H, 0.1, 0.18, 0.1, ivory, s * 0.4, 0.5, 0, 0, D);
      eye(P, H, 0.12, 0.08, bossy ? 0xffffff : 0xff4a3a, bossy ? COL_E : 0xaa1a10, s * 0.14, 0.26, 0.255);
      box(s < 0 ? P.kneeL : P.kneeR, 0.46, 0.14, 0.5, sd, 0, -0.17, 0.03, 0, D);
    }
    box(H, 0.4, 0.08, 0.06, sd, 0, 0.34, 0.26, 0, D);
    if (bossy) {
      box(B, 0.34, 0.34, 0.05, COL_E, 0, 0.56, 0.41, COL_E, D);
      oct(H, 0.12, 0.3, 0.12, COL_E, 0, 0.7, 0, COL_E);
      for (const s of [-1, 1]) {
        const A = s < 0 ? P.armL : P.armR;
        oct(A, 0.16, 0.4, 0.16, COL_E, 0, 0.46, 0, COL_E);
        oct(A, 0.1, 0.26, 0.1, COL_E, s * 0.2, 0.34, 0.12, COL_E);
        oct(B, 0.14, 0.36, 0.14, COL_E, s * 0.3, 1.2, -0.4, COL_E);
      }
      glowSprite(B, COL_E, 4.6, 0, 0.6, 0, 0.38);
    }
    P.col = skin;
    P.lean = 0.12;
  } else if (type === 'skelet') {
    // kościany wojownik: zardzewiały hełm, tarcza i miecz
    const bone = 0xe2ded0,
      bd = 0xb8b3a2,
      rust = 0x6a5a4a;
    P = humanoid(root, {
      legH: 0.4,
      legW: 0.12,
      legC: bone,
      bodyW: 0.4,
      bodyH: 0.48,
      bodyD: 0.22,
      bodyC: bd,
      headW: 0.42,
      headH: 0.4,
      headD: 0.42,
      headC: bone,
      armW: 0.11,
      armH: 0.48,
      armC: bone,
    });
    const H = P.head,
      B = P.body;
    for (let k = 0; k < 3; k++) box(B, 0.34, 0.04, 0.02, 0x6a6658, 0, 0.16 + k * 0.11, 0.115, 0, 1);
    box(B, 0.44, 0.12, 0.26, rust, 0, 0.44, 0, 0, 1);
    for (const s of [-1, 1]) {
      box(H, 0.11, 0.11, 0.04, 0x18181c, s * 0.1, 0.22, 0.21, 0, 1);
      eye(P, H, 0.05, 0.05, LICH_C, LICH_C, s * 0.1, 0.22, 0.225);
      box(s < 0 ? P.kneeL : P.kneeR, 0.15, 0.06, 0.2, bd, 0, -0.17, 0.03, 0, 1);
    }
    box(H, 0.48, 0.2, 0.48, rust, 0, 0.36, 0);
    box(H, 0.1, 0.24, 0.06, rust, 0, 0.24, 0.24, 0, 1);
    box(H, 0.06, 0.16, 0.06, 0x8a2f3a, 0, 0.54, 0, 0, 1);
    box(P.elbR, 0.08, 0.08, 0.3, rust, 0, -0.22, 0.08, 0, 1);
    box(P.elbR, 0.07, 0.07, 0.8, 0xa8b0b4, 0, -0.22, 0.6);
    box(P.elbL, 0.06, 0.46, 0.42, rust, -0.09, -0.2, 0.04);
    box(P.elbL, 0.04, 0.12, 0.12, 0xa8b0b4, -0.12, -0.2, 0.04, 0, 1);
    P.col = bone;
  } else if (type === 'lich') {
    P = buildLich(root);
  } else if (type === 'wraith') {
    // upiór: unosi się nad ziemią, nie ma nóg, szarżuje po linii
    const robe = 0x35525c,
      rd = 0x253b43,
      gl = 0x7fffd8;
    const b = new THREE.Group();
    b.position.y = 0.35;
    root.add(b);
    P = { body: b, eyes: [], col: robe, lean: 0.22, wraith: true };
    box(b, 0.62, 0.5, 0.46, robe, 0, 0.75, 0);
    box(b, 0.54, 0.34, 0.4, rd, 0, 0.36, -0.02);
    box(b, 0.66, 0.08, 0.5, 0x2c4a44, 0, 0.98, 0, 0, 1);
    const tail = new THREE.Group();
    tail.position.y = 0.2;
    b.add(tail);
    P.tail = tail;
    box(tail, 0.4, 0.3, 0.3, rd, 0, -0.12, -0.06);
    box(tail, 0.22, 0.26, 0.2, shade(rd, -0.04), 0, -0.38, -0.14);
    const head = new THREE.Group();
    head.position.y = 1.0;
    b.add(head);
    P.head = head;
    box(head, 0.52, 0.48, 0.52, robe, 0, 0.24, -0.02);
    box(head, 0.36, 0.3, 0.06, 0x05080a, 0, 0.2, 0.245, 0, 1);
    box(head, 0.16, 0.16, 0.24, robe, 0, 0.5, -0.24, 0, 1);
    for (const s of [-1, 1]) {
      eye(P, head, 0.09, 0.07, gl, gl, s * 0.08, 0.22, 0.28);
      const a = new THREE.Group();
      a.position.set(s * 0.4, 0.95, 0);
      b.add(a);
      box(a, 0.18, 0.52, 0.22, robe, 0, -0.22, 0.02);
      box(a, 0.12, 0.14, 0.14, 0xcfe8e0, 0, -0.54, 0.04, 0, 1);
      P[s < 0 ? 'armL' : 'armR'] = a;
    }
    glowSprite(b, gl, 2.6, 0, 0.8, 0, 0.42);
  } else if (type === 'golem') {
    const st = 0x9db4c0,
      sd = 0x7f97a4;
    P = humanoid(root, {
      legH: 0.26,
      legW: 0.2,
      legC: sd,
      bodyW: 0.62,
      bodyH: 0.52,
      bodyD: 0.42,
      bodyC: st,
      headW: 0.36,
      headH: 0.3,
      headD: 0.36,
      headC: 0xb7cbd6,
      armW: 0.2,
      armH: 0.56,
      armC: sd,
    });
    const B = P.body;
    box(B, 0.22, 0.22, 0.05, COL_P, 0, 0.28, 0.215, COL_P, D);
    box(B, 0.66, 0.12, 0.46, sd, 0, 0.5, 0, 0, D);
    box(B, 0.3, 0.07, 0.3, 0x5c9c40, -0.14, 0.58, 0.02, 0, D);
    eye(P, P.head, 0.26, 0.07, COL_P, COL_P, 0, 0.16, 0.185);
    for (const s of [-1, 1]) {
      box(s < 0 ? P.elbL : P.elbR, 0.26, 0.26, 0.26, st, 0, -0.18, 0, 0, D);
      box(s < 0 ? P.armL : P.armR, 0.28, 0.14, 0.28, st, 0, 0.06, 0, 0, D);
      box(s < 0 ? P.kneeL : P.kneeR, 0.24, 0.08, 0.26, st, 0, -0.09, 0.02, 0, D);
    }
    glowSprite(B, COL_P, 1.9, 0, 0.3, 0.1, 0.3);
    P.col = st;
    P.lean = 0.08;
  }
  return P;
}
const blobMat = new THREE.MeshBasicMaterial({
  map: glowTex,
  color: 0x000000,
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
});
function makeBlob(r) {
  const m = new THREE.Mesh(POOL_GEO, blobMat);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(r * 3.4, r * 3.4, 1);
  m.renderOrder = 1;
  return m;
}
function makeUnit(type, x, z, home) {
  const def = UNIT[type],
    ally = !!def.ally,
    sc = ally ? (1 + 0.15 * levelIdx) * (1 + 0.2 * save.up.gol) : 1 + 0.24 * levelIdx;
  const elite =
    !ally && levelIdx > 0 && !def.boss && !def.bomb && !def.heal && Math.random() < (level.elite || 0.1);
  const u = {
    type,
    def,
    x,
    z,
    vx: 0,
    vz: 0,
    kx: 0,
    kz: 0,
    r: def.r * (elite ? 1.2 : 1),
    maxHp: Math.round(def.hp * sc * (elite ? 2.3 : 1)),
    dmg: def.dmg * (ally ? 1 + 0.2 * save.up.gol : 1 + 0.2 * levelIdx) * (elite ? 1.3 : 1),
    spd: def.spd * rnd(0.9, 1.1),
    team: ally ? 0 : 1,
    face: rnd(TAU),
    state: 'move',
    t: 0,
    windDur: 1,
    cd: rnd(0.4, 1.4),
    scan: rnd(0.3),
    tgt: null,
    home,
    flash: 0,
    stun: 0,
    provoked: 0,
    barT: 0,
    phase: rnd(6),
    wt: rnd(2),
    wx: x,
    wz: z,
    wgo: false,
    aimX: x,
    aimZ: z,
    atkN: 0,
    dead: false,
    spawnT: 0.45,
    spawnDur: 0.45,
    baseScale: type === 'boss' ? 1.75 : type === 'lich' ? 1.8 : elite ? 1.28 : 1,
    h: def.h * (elite ? 1.25 : 1),
    meshes: [],
    pcol: 0xffffff,
    pop: 0,
    lunge: 0,
    seed: rnd(10),
    stepS: 1,
    dieT: 0,
    lean: 0,
    elite,
    raid: false,
    guard: false,
    strafe: Math.random() < 0.5 ? 1 : -1,
    blink: rnd(1, 4),
    healTgt: null,
    noLoot: false,
  };
  u.hp = u.maxHp;
  u.root = new THREE.Group();
  u.root.rotation.order = 'YXZ';
  u.parts = buildModel(type, u.root);
  if (elite) glowSprite(u.root, COL_E, 2.6, 0, 0.5, 0, 0.45);
  u.frags = bake(u.root, type + '|' + theme.key);
  if (def.lich) lichSkin(u.root);
  // zwykli wrogowie rzucają cień tylko tułowiem i głową (resztę załatwia miękki cień pod stopami)
  else if (u.parts.body && u.parts.legL)
    u.root.traverse(o => {
      if (o.isMesh && o.castShadow && o.parent !== u.parts.body && o.parent !== u.parts.head)
        o.castShadow = false;
    });
  u.root.traverse(o => {
    if (o.isMesh) u.meshes.push(o);
  });
  u.pcol = u.parts.col;
  u.lean = u.parts.lean || 0;
  u.bar = makeBar(
    u.root,
    (u.h + 0.45) / u.baseScale,
    def.boss ? 0 : Math.max(0.9, def.r * 2.2),
    ally ? 'a' : 'e'
  );
  u.blob = makeBlob(u.r * (def.boss ? 1.5 : 1));
  u.blob.position.set(x, 0.032, z);
  actors.add(u.blob);
  u.root.position.set(x, 0, z);
  u.root.scale.setScalar(0.01);
  actors.add(u.root);
  units.push(u);
  return u;
}
function spawnFromNode(n, quiet) {
  let x = n.x,
    z = n.z,
    ok = false;
  for (let k = 0; k < 12 && !ok; k++) {
    const a = rnd(TAU),
      d = rnd(2.6, n.R - 1.3);
    x = n.x + Math.cos(a) * d;
    z = n.z + Math.sin(a) * d;
    ok = canStand(x, z, 0.45) && n.field[cellOf(x, z)] >= 0;
  }
  if (!ok) return null;
  const type = n.own === 1 ? n.roster[n.spawnN++ % n.roster.length] : 'golem';
  const u = makeUnit(type, x, z, n);
  if (n.own === 1) n.kids++;
  else {
    u.guard = n.allies === 0;
    n.allies++;
  }
  if (!quiet) {
    const c = n.own === 1 ? COL_E : COL_P;
    burst(x, 0.3, z, c, 10, 3, 0.14, 0.6, -2);
    waveFx(x, z, 0.2, 1.3, c, 0.4);
  }
  return u;
}

/* ================= bohater ================= */
const hero = {
  isHero: true,
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  kx: 0,
  kz: 0,
  r: 0.42,
  h: 1.5,
  team: 0,
  face: 0,
  hp: 100,
  maxHp: 100,
  atk: 14,
  speed: 6.2,
  cdMul: 1,
  dead: false,
  inv: 0,
  flash: 0,
  pop: 0,
  stepS: 1,
  blink: 2,
  lives: 3,
  respawnT: 0,
  focus: 0,
  comboN: 0,
  comboT: 0,
  perfectUsed: false,
  rollT: 0,
  rollX: 0,
  rollZ: 0,
  swingT: 0,
  swingDur: 0.22,
  swingKind: 0,
  combo: -1,
  lastAtk: -9,
  hitPending: false,
  hitT: 0,
  bowT: 0,
  spinT: 0,
  phase: 0,
  healT: 0,
  cd: { atk: 0, bow: 0, roll: 0, spec: 0, potion: 0 },
  max: { bow: 0.55, roll: 0.9, spec: 8, potion: 18 },
  meshes: [],
  pcol: 0x1f9a94,
  def: { heavy: false },
};
(function buildHero() {
  const root = new THREE.Group(),
    spin = new THREE.Group(),
    model = new THREE.Group(),
    D = 1;
  spin.position.y = 0.75;
  model.position.y = -0.75;
  root.add(spin);
  spin.add(model);
  const tunic = 0x1f9a94,
    steel = 0xc2ccd4,
    gold = 0xffc23d,
    leather = 0x6b4a2e,
    red = 0xd43d3d,
    skin = 0xe8b88a,
    wood = 0x7a5230;
  const P = humanoid(model, {
    legH: 0.42,
    legW: 0.2,
    legC: 0x3b3550,
    shinC: 0x34304a,
    bodyW: 0.56,
    bodyH: 0.56,
    bodyD: 0.34,
    bodyC: tunic,
    headW: 0.5,
    headH: 0.44,
    headD: 0.46,
    headC: skin,
    armW: 0.18,
    armH: 0.52,
    armC: tunic,
    foreC: 0x178079,
  });
  const B = P.body,
    H = P.head,
    ER = P.elbR,
    EL = P.elbL;
  for (const K of [P.kneeL, P.kneeR]) {
    box(K, 0.24, 0.16, 0.3, 0x5a3a22, 0, -0.13, 0.03, 0, D);
    box(K, 0.22, 0.12, 0.06, steel, 0, -0.02, 0.1, 0, D);
  }
  box(B, 0.5, 0.3, 0.05, steel, 0, 0.34, 0.18, 0, D);
  box(B, 0.2, 0.2, 0.05, shade(steel, -0.12), 0, 0.34, 0.2, 0, D);
  box(B, 0.6, 0.1, 0.38, leather, 0, 0.06, 0, 0, D);
  box(B, 0.14, 0.14, 0.05, gold, 0, 0.06, 0.2, 0, D);
  box(B, 0.2, 0.16, 0.04, tunic, 0, -0.06, 0.16, 0, D);
  box(B, 0.6, 0.1, 0.4, red, 0, 0.54, 0, 0, D);
  box(B, 0.12, 0.4, 0.12, leather, -0.17, 0.3, -0.25, 0, D);
  box(B, 0.03, 0.12, 0.03, 0xefe4c4, -0.17, 0.55, -0.25, 0, D);
  for (const s of [-1, 1]) {
    eye(P, H, 0.08, 0.1, 0x2a2a3a, 0, s * 0.11, 0.2, 0.235);
    box(H, 0.1, 0.03, 0.04, 0x5a3a22, s * 0.11, 0.28, 0.235, 0, D);
    box(s < 0 ? P.armL : P.armR, 0.28, 0.12, 0.3, steel, 0, 0.05, 0, 0, D);
    box(s < 0 ? EL : ER, 0.2, 0.14, 0.2, leather, 0, -0.2, 0, 0, D);
  }
  box(H, 0.52, 0.3, 0.2, 0x5a3a22, 0, 0.2, -0.16, 0, D);
  box(H, 0.56, 0.2, 0.52, steel, 0, 0.4, 0);
  box(H, 0.58, 0.06, 0.54, gold, 0, 0.3, 0, 0, D);
  box(H, 0.08, 0.18, 0.06, steel, 0, 0.24, 0.25, 0, D);
  box(H, 0.1, 0.2, 0.44, 0xe04848, 0, 0.6, -0.02, 0, D);
  box(H, 0.1, 0.14, 0.14, 0xe04848, 0, 0.5, -0.3, 0, D);
  const cape = new THREE.Group();
  cape.position.set(0, 0.52, -0.18);
  B.add(cape);
  box(cape, 0.52, 0.34, 0.05, red, 0, -0.17, -0.02);
  const cape2 = new THREE.Group();
  cape2.position.set(0, -0.34, -0.02);
  cape.add(cape2);
  box(cape2, 0.56, 0.36, 0.05, shade(red, -0.06), 0, -0.18, 0);
  box(cape2, 0.56, 0.05, 0.06, gold, 0, -0.35, 0, 0, D);
  P.cape = cape;
  P.cape2 = cape2;
  // miecz w prawej dłoni
  box(ER, 0.3, 0.07, 0.1, gold, 0, -0.3, 0, 0, D);
  box(ER, 0.06, 0.14, 0.06, leather, 0, -0.22, 0, 0, D);
  box(ER, 0.08, 0.08, 0.08, gold, 0, -0.14, 0, 0, D);
  box(ER, 0.12, 0.84, 0.05, 0xdfe8f0, 0, -0.76, 0);
  box(ER, 0.04, 0.66, 0.06, COL_P, 0, -0.7, 0, COL_P, D);
  box(ER, 0.07, 0.1, 0.05, 0xdfe8f0, 0, -1.22, 0, 0, D);
  P.tipA = new THREE.Object3D();
  P.tipA.position.set(0, -0.4, 0);
  ER.add(P.tipA);
  P.tipB = new THREE.Object3D();
  P.tipB.position.set(0, -1.27, 0);
  ER.add(P.tipB);
  P.swordGlow = glowSprite(ER, 0xffe08a, 1.5, 0, -0.8, 0, 0.7);
  P.swordGlow.visible = false;
  // tarcza i łuk w lewej
  const sg = new THREE.Group();
  EL.add(sg);
  P.shield = sg;
  box(sg, 0.07, 0.5, 0.46, 0x2f5fa8, -0.13, -0.08, 0);
  box(sg, 0.05, 0.5, 0.08, gold, -0.17, -0.08, 0, 0, D);
  box(sg, 0.05, 0.08, 0.46, gold, -0.17, -0.08, 0, 0, D);
  const bg = new THREE.Group();
  EL.add(bg);
  bg.visible = false;
  P.bow = bg;
  box(bg, 0.06, 0.06, 0.8, wood, 0, -0.26, 0);
  box(bg, 0.06, 0.06, 0.18, wood, 0, -0.2, 0.46, 0, D);
  box(bg, 0.06, 0.06, 0.18, wood, 0, -0.2, -0.46, 0, D);
  box(bg, 0.02, 0.02, 1.0, 0xf2f2f2, 0, -0.14, 0, 0, D);
  P.armR.rotation.order = 'YXZ';
  root.rotation.order = 'YXZ';
  hero.root = root;
  hero.spin = spin;
  hero.parts = P;
  hero.frags = bake(root, 'hero');
  root.traverse(o => {
    if (o.isMesh) hero.meshes.push(o);
  });
  root.visible = false;
  scene.add(root);
  hero.blob = makeBlob(0.46);
  hero.blob.visible = false;
  scene.add(hero.blob);
  hero.ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.74, 32),
    new THREE.MeshBasicMaterial({
      color: COL_P,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      fog: false,
    })
  );
  hero.ring.rotation.x = -Math.PI / 2;
  hero.ring.renderOrder = 2;
  hero.ring.visible = false;
  scene.add(hero.ring);
})();
function resetHero() {
  const n = nodes[0],
    h = hero;
  const U = save.up;
  TAL = {};
  for (const id of save.tal) TAL[id] = true;
  h.maxHp = 100 + 18 * U.hp;
  h.atk = 14 * (1 + 0.12 * U.atk);
  h.speed = 6.2 * (1 + 0.03 * U.agi);
  h.cdMul = 1 - 0.05 * U.agi;
  h.critC = 0.12 + (U.atk >= 4 ? 0.05 : 0);
  h.critM = U.atk >= 8 ? 2.5 : 2;
  h.potHeal = U.hp >= 4 ? 0.7 : 0.5;
  h.regen = U.hp >= 8 ? 1 : 0;
  h.max.roll = U.agi >= 4 ? 0.6 : 0.9;
  h.rollSpd = U.agi >= 8 ? ROLL_SPD * 1.2 : ROLL_SPD;
  h.rollInv = U.agi >= 8 ? 0.25 : 0.08;
  h.max.bow = 0.55 * (TAL.quick ? 0.65 : 1);
  h.max.potion = 18 * (TAL.alch ? 0.7 : 1);
  h.secondUsed = false;
  h.hunter = false;
  h.x = n.x;
  h.z = n.z + 2.8;
  h.vx = h.vz = h.kx = h.kz = 0;
  h.face = Math.PI * 0.5;
  h.dead = false;
  h.inv = 1;
  h.flash = 0;
  h.pop = 0;
  setFlash(h, false);
  h.rollT = h.swingT = h.bowT = h.spinT = 0;
  h.hitPending = false;
  h.combo = -1;
  h.lastAtk = -9;
  h.lives = 3;
  h.respawnT = 0;
  h.focus = 0;
  h.comboN = 0;
  h.comboT = 0;
  h.cd.atk = h.cd.bow = h.cd.roll = h.cd.spec = h.cd.potion = 0;
  h.root.visible = true;
  h.blob.visible = true;
  h.ring.visible = true;
  h.root.scale.setScalar(1);
  h.spin.rotation.set(0, 0, 0);
  h.root.rotation.set(0, h.face, 0);
  camT.x = h.x;
  camT.z = h.z;
}
