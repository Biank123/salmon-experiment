// Script clásico + import() dinámico: así funciona también abriendo el index.html directo (file://).
(async () => {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => x * x * (3 - 2 * x);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------------- renderer ---------------- */
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .85;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c9b8, .35));
  const sun = new THREE.DirectionalLight(0xfff1e2, 2.2);
  sun.position.set(2, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
  sun.shadow.radius = 28; sun.shadow.blurSamples = 25; sun.shadow.bias = -.0005;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xdbe7ff, 1.3);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  const ANISO = renderer.capabilities.getMaxAnisotropy();

  /* ---------------- perfil (Salmo salar) ---------------- */
  // t: 0 = pedúnculo caudal, 1 = punta del hocico. top/bot = borde dorsal/ventral, wid = medio ancho.
  const XT = -2.8, LEN = 5.6, xOf = t => XT + t * LEN;
  function curve(T, Y) {
    const n = T.length, m = Y.map((_, k) => k === 0 ? (Y[1] - Y[0]) / (T[1] - T[0]) : k === n - 1 ? (Y[k] - Y[k - 1]) / (T[k] - T[k - 1]) : (Y[k + 1] - Y[k - 1]) / (T[k + 1] - T[k - 1]));
    return t => {
      t = clamp(t); let k = 0;
      while (k < n - 2 && t > T[k + 1]) k++;
      const h = T[k + 1] - T[k], s = (t - T[k]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * Y[k] + (s3 - 2 * s2 + s) * h * m[k] + (-2 * s3 + 3 * s2) * Y[k + 1] + (s3 - s2) * h * m[k + 1];
    };
  }
  const KT = [0, .04, .1, .2, .3, .42, .55, .65, .74, .82, .88, .93, .97, 1];
  const TOP = curve(KT, [.15, .155, .21, .32, .43, .53, .59, .59, .555, .48, .4, .3, .17, .02]);
  const BOT = curve(KT, [-.15, -.15, -.185, -.28, -.39, -.49, -.55, -.56, -.52, -.45, -.37, -.27, -.16, -.05]);
  const WID = curve(KT, [.06, .065, .09, .15, .2, .25, .28, .29, .29, .27, .23, .17, .1, .015]);
  // sección: vientre redondo, lomo en quilla
  const secY = (c, tp, bt) => -c * (tp + (-bt - tp) * (.5 + .5 * Math.tanh(3 * c)));
  const secZ = (c, s) => s * (1 - .3 * Math.pow(Math.max(0, -c), 2));
  // phi: 0 vientre, PI/2 lado +z, PI lomo
  function P(t, phi, out = new V3()) {
    const c = Math.cos(phi);
    return out.set(xOf(t), secY(c, TOP(t), BOT(t)), WID(t) * secZ(c, Math.sin(phi)));
  }
  const _a = new V3(), _b = new V3(), _c = new V3(), _d = new V3();
  function N(t, phi, out = new V3()) {
    const e = 1e-3; t = clamp(t, e, 1 - e);
    P(t + e, phi, _a).sub(P(t - e, phi, _b));
    P(t, phi + e, _c).sub(P(t, phi - e, _d));
    return out.crossVectors(_a, _c).normalize();
  }
  // contorno normalizado de una sección típica (para dibujar la textura del corte)
  const SEC = [];
  for (let i = 0; i <= 160; i++) {
    const f = i / 160 * TAU, c = Math.cos(f);
    SEC.push([.5 + secZ(c, Math.sin(f)) / 2, 1 - (secY(c, .59, -.55) + .55) / 1.14]);
  }

  /* ---------------- texturas procedurales ---------------- */
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const wobblyEllipse = (g, cx, cy, rx, ry, amp) => {
    const ph = rnd(0, TAU), ph2 = rnd(0, TAU);
    g.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * TAU, k = 1 + amp * Math.sin(3 * a + ph) + amp * .6 * Math.sin(7 * a + ph2);
      i ? g.lineTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k) : g.moveTo(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
    }
    g.stroke();
  };
  const HEAD_U = .835; // borde del opérculo

  // Piel. u = largo (cola→hocico), v = vuelta. En el canvas: y=0 y y=H vientre, y=H/2 lomo, y=.25H / .75H flancos.
  const skinTex = canvasTex(4096, 2048, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    const stops = [[0, '#f2f3f1'], [.12, '#e6e9e9'], [.2, '#ccd4d8'], [.26, '#a9b6bd'], [.32, '#6c7d87'], [.38, '#45555d'], [.44, '#313e44'], [.5, '#263136']];
    stops.forEach(([o, c]) => { gr.addColorStop(o, c); gr.addColorStop(1 - o, c); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // brillo rosado/violeta sobre la línea lateral
    for (const yc of [.25 * H, .75 * H]) {
      const b = g.createLinearGradient(0, yc - .06 * H, 0, yc + .06 * H);
      b.addColorStop(0, 'rgba(205,170,200,0)'); b.addColorStop(.5, 'rgba(205,170,200,.16)'); b.addColorStop(1, 'rgba(205,170,200,0)');
      g.fillStyle = b; g.fillRect(0, yc - .06 * H, W, .12 * H);
    }
    // moteado suave
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.02)' : 'rgba(20,35,40,.025)';
      g.beginPath(); g.ellipse(rnd(0, W), rnd(0, H), rnd(20, 90), rnd(12, 50), 0, 0, TAU); g.fill();
    }
    // cabeza: hocico y nuca más oscuros, mejilla bronceada
    const hx = HEAD_U * W;
    const hg = g.createLinearGradient(hx, 0, W, 0);
    hg.addColorStop(0, 'rgba(30,40,45,0)'); hg.addColorStop(1, 'rgba(30,40,45,.35)');
    g.fillStyle = hg; g.fillRect(hx, .36 * H, W - hx, .28 * H);
    for (const yc of [.25 * H, .75 * H]) {
      g.fillStyle = 'rgba(190,160,110,.1)';
      g.beginPath(); g.ellipse(.9 * W, yc, .05 * W, .1 * H, 0, 0, TAU); g.fill();
    }
    // manchas en X y redondas, sobre todo sobre la línea lateral
    for (let i = 0; i < 950; i++) {
      const u = rnd(.02, .97), r = rnd(-1, 1);
      const y = H * (.5 + Math.sign(r) * Math.pow(Math.abs(r), 1.15) * .27), s = rnd(4, 9) * (u > HEAD_U ? .8 : 1);
      g.fillStyle = `rgba(${12 + rnd(0, 15)},${16 + rnd(0, 12)},${18 + rnd(0, 10)},${rnd(.55, .85)})`;
      const a = rnd(0, Math.PI);
      if (Math.random() < .55) {
        for (const d of [0, Math.PI / 2 + rnd(-.3, .3)]) { g.beginPath(); g.ellipse(u * W, y, s, s * .32, a + d, 0, TAU); g.fill(); }
      } else { g.beginPath(); g.ellipse(u * W, y, s * .75, s * .6, a, 0, TAU); g.fill(); }
    }
    // escamas (muy sutiles en color; el relieve va en el bump)
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath();
    for (let y = 0, r = 0; y < H + 10; y += 10, r++)
      for (let x = (r % 2) * 7; x < hx; x += 14) { g.moveTo(x, y + 7); g.arc(x, y, 7, Math.PI / 2, Math.PI * 1.5); }
    g.stroke();
    // poros de la línea lateral
    g.fillStyle = 'rgba(25,35,40,.5)';
    for (const yc of [.25 * H, .75 * H]) for (let x = .02 * W; x < hx; x += 9) { g.beginPath(); g.arc(x, yc + Math.sin(x * .002) * 6, 1.8, 0, TAU); g.fill(); }
    // opérculo, preopérculo y boca
    for (const [yc, dir] of [[.25 * H, -1], [.75 * H, 1]]) {
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(28,36,40,.55)'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(hx + 30, yc - .2 * H); g.bezierCurveTo(hx - 50, yc - .08 * H, hx - 50, yc + .1 * H, hx + 40, yc + .22 * H); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(hx + 36, yc - .2 * H); g.bezierCurveTo(hx - 44, yc - .08 * H, hx - 44, yc + .1 * H, hx + 46, yc + .22 * H); g.stroke();
      g.strokeStyle = 'rgba(28,36,40,.28)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(.875 * W, yc - .14 * H); g.quadraticCurveTo(.86 * W, yc + .02 * H, .885 * W, yc + .16 * H); g.stroke();
      const my = yc + dir * .07 * H;
      g.strokeStyle = 'rgba(18,22,25,.8)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(W, yc + dir * .03 * H); g.quadraticCurveTo(.955 * W, my, .915 * W, my + dir * .015 * H); g.stroke();
      g.fillStyle = 'rgba(15,18,20,.7)';
      g.beginPath(); g.ellipse(.975 * W, yc - dir * .05 * H, 6, 4, 0, 0, TAU); g.fill();
    }
  });

  // Relieve: escamas, opérculo, boca y poros
  const skinBump = canvasTex(2048, 1024, (g, W, H) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    const hx = HEAD_U * W;
    for (const [col, dx] of [['rgba(0,0,0,.45)', 0], ['rgba(255,255,255,.3)', 1.2]]) {
      g.strokeStyle = col; g.lineWidth = 1.1; g.beginPath();
      for (let y = 0, r = 0; y < H + 6; y += 5, r++)
        for (let x = (r % 2) * 3.5; x < hx; x += 7) { g.moveTo(x + dx, y + 3.5); g.arc(x + dx, y, 3.5, Math.PI / 2, Math.PI * 1.5); }
      g.stroke();
    }
    g.lineCap = 'round';
    for (const [yc, dir] of [[.25 * H, -1], [.75 * H, 1]]) {
      g.strokeStyle = '#303030'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(hx + 15, yc - .2 * H); g.bezierCurveTo(hx - 25, yc - .08 * H, hx - 25, yc + .1 * H, hx + 20, yc + .22 * H); g.stroke();
      const my = yc + dir * .07 * H;
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(W, yc + dir * .03 * H); g.quadraticCurveTo(.955 * W, my, .915 * W, my + dir * .015 * H); g.stroke();
      g.fillStyle = '#404040';
      for (let x = .02 * W; x < hx; x += 4.5) { g.beginPath(); g.arc(x, yc + Math.sin(x * .004) * 3, 1, 0, TAU); g.fill(); }
    }
  }, false);

  // Rugosidad (G) y metalicidad (B): lomo mate, flancos y vientre plateados
  const skinRM = canvasTex(256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    [[0, 'rgb(0,60,130)'], [.25, 'rgb(0,50,175)'], [.36, 'rgb(0,85,70)'], [.5, 'rgb(0,100,35)']].forEach(([o, c]) => { gr.addColorStop(o, c); gr.addColorStop(1 - o, c); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, false);

  // Carne, corte transversal (con el contorno real de la sección)
  const fleshXTex = canvasTex(1024, 1024, (g, S) => {
    const path = (k = 1) => { g.beginPath(); SEC.forEach(([x, y], i) => { const px = (.5 + (x - .5) * k) * S, py = (.5 + (y - .5) * k) * S; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
    g.fillStyle = '#e8653a'; g.fillRect(0, 0, S, S);
    g.save(); path(); g.clip();
    const r = g.createRadialGradient(S * .5, S * .45, 20, S * .5, S * .5, S * .55);
    r.addColorStop(0, '#fb8a5c'); r.addColorStop(.7, '#f4743f'); r.addColorStop(1, '#e9663a');
    g.fillStyle = r; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = Math.random() < .5 ? 'rgba(255,190,150,.06)' : 'rgba(190,60,30,.06)';
      g.beginPath(); g.arc(rnd(0, S), rnd(0, S), rnd(6, 40), 0, TAU); g.fill();
    }
    // miosepta: anillos concéntricos por cuadrante, más gruesos hacia el vientre
    for (const qx of [-1, 1]) for (const qy of [-1, 1]) {
      g.save(); g.beginPath(); g.rect(qx < 0 ? 0 : S / 2, qy < 0 ? 0 : S / 2, S / 2, S / 2); g.clip();
      const cx = S * (.5 + qx * .2), cy = S * (.5 + qy * .22);
      for (let k = 1; k < 14; k++) {
        g.strokeStyle = `rgba(255,236,222,${rnd(.35, .7)})`;
        g.lineWidth = rnd(1.5, 3.5) + (qy > 0 ? 1.5 : 0);
        wobblyEllipse(g, cx, cy, k * .026 * S, k * .022 * S, .035);
      }
      g.restore();
    }
    // septos horizontal y vertical
    g.strokeStyle = 'rgba(255,240,228,.85)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, S / 2); g.lineTo(S, S / 2); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
    // línea de sangre bajo la línea lateral
    g.shadowColor = 'rgba(95,40,30,.8)'; g.shadowBlur = 10;
    g.fillStyle = 'rgba(100,42,32,.78)';
    for (const sx of [-1, 1]) {
      const ex = sx < 0 ? .01 * S : .99 * S, ix = sx < 0 ? .13 * S : .87 * S;
      g.beginPath(); g.moveTo(ex, S / 2 - .045 * S); g.quadraticCurveTo(ix, S / 2, ex, S / 2 + .045 * S); g.closePath(); g.fill();
    }
    g.shadowBlur = 0;
    // vértebra y espinas
    g.strokeStyle = 'rgba(245,232,218,.95)'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(S / 2, S / 2 - .04 * S); g.lineTo(S / 2, S / 2 - .17 * S); g.moveTo(S / 2, S / 2 + .04 * S); g.lineTo(S / 2, S / 2 + .14 * S); g.stroke();
    g.fillStyle = '#f2e5d4'; g.beginPath(); g.arc(S / 2, S / 2, .04 * S, 0, TAU); g.fill();
    g.strokeStyle = '#cdb49c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#b39684'; g.beginPath(); g.arc(S / 2, S / 2, .012 * S, 0, TAU); g.fill();
    g.restore();
    // grasa subcutánea + piel
    g.strokeStyle = 'rgba(255,238,226,.8)'; g.lineWidth = .012 * S; path(.965); g.stroke();
    g.strokeStyle = '#4e5b62'; g.lineWidth = .014 * S; path(); g.stroke();
  });

  // Carne, corte longitudinal (plano horizontal por la espina): chevrones
  const fleshLTex = canvasTex(2048, 512, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    [[0, '#4e5b62'], [.02, '#f6ddcc'], [.045, '#e9663a'], [.08, '#6e2e24'], [.12, '#ef6e40'], [.5, '#fb8a5c']].forEach(([o, c]) => { gr.addColorStop(o, c); gr.addColorStop(1 - o, c); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = Math.random() < .5 ? 'rgba(255,190,150,.06)' : 'rgba(190,60,30,.06)';
      g.beginPath(); g.arc(rnd(0, W), rnd(.1 * H, .9 * H), rnd(6, 30), 0, TAU); g.fill();
    }
    for (let x = 0; x < W; x += 32) {
      g.strokeStyle = `rgba(255,236,222,${rnd(.4, .7)})`; g.lineWidth = rnd(2, 4);
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const v = i / 40, d = Math.abs(v - .5) * 2, px = x + 60 * (1 - d) - 14 * Math.sin(d * Math.PI) + Math.sin(i * .7 + x) * 1.5;
        i ? g.lineTo(px, v * H) : g.moveTo(px, v * H);
      }
      g.stroke();
    }
    g.fillStyle = '#f2e5d4'; g.fillRect(0, H / 2 - 9, W, 18);
    g.fillStyle = 'rgba(180,150,130,.7)';
    for (let x = 0; x < W; x += 16) g.fillRect(x, H / 2 - 9, 2, 18);
  });

  // Aleta: radios en abanico desde la base, membrana translúcida
  function finTex(pts, spots, dark) {
    const S = 512, xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const m = p => [(p.x - x0) / (x1 - x0) * S, (1 - (p.y - y0) / (y1 - y0)) * S];
    const tex = canvasTex(S, S, g => {
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...m(p)) : g.moveTo(...m(p))); g.closePath();
      g.save(); g.clip();
      const b0 = pts[0].clone().lerp(pts[pts.length - 1], .5);
      let far = pts[0]; for (const p of pts) if (p.distanceTo(b0) > far.distanceTo(b0)) far = p;
      const gr = g.createLinearGradient(...m(b0), ...m(far));
      gr.addColorStop(0, 'rgba(62,74,80,.95)'); gr.addColorStop(1, dark ? 'rgba(55,65,72,.75)' : 'rgba(125,138,146,.5)');
      g.fillStyle = gr; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(30,38,44,.5)'; g.lineWidth = 2.2;
      for (let k = 0; k < pts.length; k += 2) {
        const b = pts[0].clone().lerp(pts[pts.length - 1], k / (pts.length - 1));
        g.beginPath(); g.moveTo(...m(b)); g.lineTo(...m(pts[k])); g.stroke();
      }
      g.fillStyle = 'rgba(15,20,24,.75)';
      for (let i = 0; i < spots; i++) { g.beginPath(); g.ellipse(rnd(0, S), rnd(0, S), rnd(5, 10), rnd(3, 7), rnd(0, 3), 0, TAU); g.fill(); }
      g.restore();
      g.strokeStyle = 'rgba(35,42,48,.6)'; g.lineWidth = 3;
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...m(p)) : g.moveTo(...m(p))); g.closePath(); g.stroke();
    });
    return { tex, x0, x1, y0, y1 };
  }

  /* ---------------- geometría de cada pieza ---------------- */
  // grupos: 0 piel, 1 corte transversal, 2 corte longitudinal
  function buildPiece(t0, t1, half) {
    const G = [0, 1, 2].map(() => ({ p: [], n: [], uv: [], i: [] }));
    const [phi0, phi1] = half === 'top' ? [Math.PI / 2, Math.PI * 1.5] : half === 'bottom' ? [-Math.PI / 2, Math.PI / 2] : [0, TAU];
    const nu = Math.max(3, Math.ceil((t1 - t0) * 180)), nv = Math.ceil((phi1 - phi0) / TAU * 112);
    const v = new V3(), n = new V3();

    const S = G[0];
    for (let i = 0; i <= nu; i++) {
      const t = t0 + (t1 - t0) * i / nu;
      for (let j = 0; j <= nv; j++) {
        const f = phi0 + (phi1 - phi0) * j / nv;
        P(t, f, v); N(t, f, n);
        S.p.push(v.x, v.y, v.z); S.n.push(n.x, n.y, n.z); S.uv.push(t, f / TAU);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      S.i.push(a, b, a + 1, b, b + 1, a + 1);
    }

    // tapas: carne si es un corte; piel en los extremos del pez (pedúnculo, hocico)
    const cap = (t, dir) => {
      const skin = t <= 0 || t >= 1, C = G[skin ? 0 : 1], base = C.p.length / 3;
      const tp = TOP(t), bt = BOT(t), w = WID(t);
      C.p.push(xOf(t), 0, 0); C.n.push(dir, 0, 0); C.uv.push(skin ? t : .5, .5);
      for (let j = 0; j <= nv; j++) {
        const f = phi0 + (phi1 - phi0) * j / nv;
        P(t, f, v);
        C.p.push(v.x, v.y, v.z); C.n.push(dir, 0, 0);
        C.uv.push(skin ? t : .5 + v.z / (2 * w), skin ? f / TAU : (v.y - bt) / (tp - bt));
      }
      for (let j = 0; j < nv; j++) dir > 0 ? C.i.push(base, base + 2 + j, base + 1 + j) : C.i.push(base, base + 1 + j, base + 2 + j);
    };
    cap(t0, -1); cap(t1, 1);

    if (half) {
      const C = G[2], base = C.p.length / 3, s = half === 'top' ? -1 : 1;
      for (let i = 0; i <= nu; i++) {
        const t = t0 + (t1 - t0) * i / nu, w = WID(t), x = xOf(t);
        C.p.push(x, 0, -w, x, 0, w); C.n.push(0, s, 0, 0, s, 0); C.uv.push(t, 0, t, 1);
      }
      for (let i = 0; i < nu; i++) {
        const a = base + 2 * i, b = a + 2, c = a + 1, d = a + 3;
        s < 0 ? C.i.push(a, b, c, b, d, c) : C.i.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry(), pos = [], nor = [], uv = [], idx = [];
    let off = 0;
    G.forEach((C, gi) => {
      geo.addGroup(idx.length, C.i.length, gi);
      for (const k of C.i) idx.push(k + off);
      for (const x of C.p) pos.push(x);
      for (const x of C.n) nor.push(x);
      for (const x of C.uv) uv.push(x);
      off += C.p.length / 3;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    return geo;
  }

  /* ---------------- materiales ---------------- */
  const skinMat = new THREE.MeshPhysicalMaterial({
    map: skinTex, bumpMap: skinBump, bumpScale: .6, roughnessMap: skinRM, metalnessMap: skinRM, roughness: 1, metalness: 1,
    clearcoat: 1, clearcoatRoughness: .12, iridescence: .15, iridescenceIOR: 1.35, iridescenceThicknessRange: [200, 500], transparent: true,
  });
  const fleshXMat = new THREE.MeshPhysicalMaterial({
    map: fleshXTex, roughness: .42, clearcoat: .55, clearcoatRoughness: .25, sheen: .6, sheenColor: 0xffa27a, sheenRoughness: .5,
    emissive: 0xff4a1a, emissiveIntensity: .04, transparent: true,
  });
  const fleshLMat = fleshXMat.clone(); fleshLMat.map = fleshLTex;

  /* ---------------- cortes ---------------- */
  // ex = desplazamiento al diseccionar (espacio del pez)
  const CUTS = [
    { id: 'cabeza', name: 'Cabeza', tag: 'El alma del caldillo', parts: [{ t: [.82, 1] }], ex: [1.15, .15, 0] },
    { id: 'collar', name: 'Collar', tag: 'El secreto del parrillero', parts: [{ t: [.75, .82] }], ex: [.6, .1, 0] },
    { id: 'lomo', name: 'Lomo', tag: 'El corte noble', parts: [{ t: [.45, .75], half: 'top' }], ex: [.15, .8, 0] },
    { id: 'ventresca', name: 'Ventresca', tag: 'La mantequilla del mar', parts: [{ t: [.45, .75], half: 'bottom' }], ex: [.15, -.75, 0], below: true },
    { id: 'medallones', name: 'Medallones', tag: 'Para el horno y la parrilla', rotY: .35,
      parts: [{ t: [.395, .45], ex: [-.35, 0, 0] }, { t: [.34, .395], ex: [-.7, 0, 0] }, { t: [.285, .34], ex: [-1.05, 0, 0] }] },
    { id: 'cola', name: 'Cola', tag: 'Magra, firme y rápida', parts: [{ t: [0, .285] }], ex: [-1.35, 0, 0] },
  ];
  const byId = Object.fromEntries(CUTS.map(c => [c.id, c]));

  const fish = new THREE.Group();
  scene.add(fish);
  const pickables = [];
  for (const c of CUTS) {
    // cada corte tiene sus propios materiales para poder atenuarlo (incluye aletas y ojos, que se agregan después)
    c.mats = [skinMat.clone(), fleshXMat.clone(), fleshLMat.clone()];
    c.meshes = c.parts.map(p => {
      const geo = buildPiece(p.t[0], p.t[1], p.half);
      geo.computeBoundingBox();
      const ctr = geo.boundingBox.getCenter(new V3());
      geo.translate(-ctr.x, -ctr.y, -ctr.z);
      const m = new THREE.Mesh(geo, c.mats);
      m.position.copy(ctr);
      m.userData = { base: ctr.clone(), ex: new V3(...(p.ex || c.ex)), cut: c };
      fish.add(m); pickables.push(m);
      return m;
    });
    c.anchor = c.meshes[Math.floor(c.meshes.length / 2)];
  }
  const own = (c, mat, op = 1, pow = 1) => { mat.transparent = true; Object.assign(mat.userData, { op, pow }); c.mats.push(mat); return mat; };

  /* ---------------- aletas y ojos ---------------- */
  function attach(m, obj, x, y, z) { obj.position.set(x, y, z).sub(m.userData.base); m.add(obj); return obj; }
  function fin(c, raw, { spots = 0, dark = false, fleshy = false } = {}) {
    const s = new THREE.Shape();
    s.moveTo(...raw[0]);
    s.splineThru(raw.slice(1).map(p => new THREE.Vector2(...p)));
    s.closePath();
    const pts = s.getPoints(48);
    const geo = new THREE.ShapeGeometry(s, 48);
    let mat;
    if (fleshy) mat = new THREE.MeshPhysicalMaterial({ color: 0x3a4850, roughness: .35, clearcoat: 1, clearcoatRoughness: .15, side: THREE.DoubleSide });
    else {
      const { tex, x0, x1, y0, y1 } = finTex(pts, spots, dark);
      const p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x0) / (x1 - x0), (p.getY(i) - y0) / (y1 - y0));
      mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .45, metalness: .1, clearcoat: .6, clearcoatRoughness: .2, side: THREE.DoubleSide, alphaTest: .02 });
    }
    return new THREE.Mesh(geo, own(c, mat));
  }
  {
    // ojos (dentro de los materiales de la cabeza → se atenúan con ella)
    const hd = byId.cabeza, head = hd.meshes[0], t = .935;
    const irisMat = own(hd, new THREE.MeshPhysicalMaterial({ color: 0xbfae84, metalness: .85, roughness: .28 }), 1, 6);
    const pupilMat = own(hd, new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: .08, clearcoat: 1 }), 1, 6);
    const corneaMat = own(hd, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, clearcoat: 1, depthWrite: false }), .12, 6);
    for (const s of [1, -1]) {
      const phi = s > 0 ? 1.83 : TAU - 1.83, p = P(t, phi), n = N(t, phi);
      const eye = new THREE.Group();
      const sph = (r, mat, sz, z = 0) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); m.scale.set(1, 1, sz); m.position.z = z; eye.add(m); };
      sph(.064, irisMat, .45);
      sph(.036, pupilMat, .5, .02);
      sph(.068, corneaMat, .6, .005);
      eye.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
      attach(head, eye, p.x - n.x * .012, p.y - n.y * .012, p.z - n.z * .012);
    }

    const col = byId.collar, cm = col.meshes[0];
    for (const s of [1, -1]) {
      const p = P(.795, s * Math.acos(.62));
      const f = attach(cm, fin(col, [[.04, .03], [-.12, -.05], [-.32, -.13], [-.46, -.15], [-.42, -.05], [-.2, .02], [.04, -.02]]), p.x, p.y, p.z * .98);
      f.rotation.set(s * .25, s * .42, -.2);
    }
    const lo = byId.lomo;
    attach(lo.meshes[0], fin(lo, [[.02, -.05], [-.1, .44], [-.2, .47], [-.3, .3], [-.46, .12], [-.6, .04], [-.62, -.05]], { spots: 10 }), xOf(.63), TOP(.63) - .03, 0);
    const ve = byId.ventresca;
    for (const s of [1, -1]) {
      const f = attach(ve.meshes[0], fin(ve, [[.02, .03], [-.1, -.24], [-.2, -.25], [-.3, -.06], [-.32, .03]]), xOf(.52), BOT(.52) + .04, s * .07);
      f.rotation.x = -s * .45;
    }
    const co = byId.cola, tm = co.meshes[0];
    attach(tm, fin(co, [[.08, .13], [-.45, .36], [-1.02, .66], [-.9, .3], [-.84, 0], [-.9, -.3], [-1.02, -.64], [-.45, -.35], [.08, -.13]], { spots: 14, dark: true }), XT + .03, 0, 0);
    attach(tm, fin(co, [[0, -.02], [-.04, .08], [-.14, .12], [-.24, .06], [-.26, -.02]], { fleshy: true }), xOf(.17), TOP(.17) - .02, 0);
    attach(tm, fin(co, [[.02, .04], [-.06, -.3], [-.14, -.32], [-.3, -.12], [-.4, -.04], [-.42, .04]]), xOf(.27), BOT(.27) + .03, 0);
  }
  fish.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2.1; ground.receiveShadow = true;
  scene.add(ground);

  /* ---------------- pins (tooltips anclados en 3D) ---------------- */
  const pinsEl = document.getElementById('pins');
  const goto = id => document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
  for (const c of CUTS) {
    const box = new THREE.Box3().setFromObject(c.anchor);
    c.pinLocal = new V3(0, (c.below ? box.min.y - .12 : box.max.y + .12) - c.anchor.position.y, 0);
    const el = document.createElement('button');
    el.className = 'pin' + (c.below ? ' b' : '');
    el.innerHTML = `<i></i><span><b>${c.name}</b><em>${c.tag}</em></span>`;
    el.onclick = () => goto(c.id);
    pinsEl.append(el);
    c.pinEl = el;
  }

  /* ---------------- keyframes de scroll ---------------- */
  const KFDEF = {
    hero:       { cam: [0, .4, 9.8], look: [0, .05, 0], e: 0, rotY: -.38, pins: 0, sy: .1, sway: 1 },
    diseccion:  { cam: [.1, 2.8, 12.2], look: [-.45, -.15, 0], sx: .14 },
    cabeza:     { focus: 'cabeza', off: [-2.2, .9, 3], sx: .2 },
    collar:     { focus: 'collar', off: [1.7, .6, 3.1], sx: -.2 },
    lomo:       { focus: 'lomo', off: [.9, 1.5, 3.6], sx: .2 },
    ventresca:  { focus: 'ventresca', off: [.6, 2.3, 3.1], sx: -.2 },
    medallones: { focus: 'medallones', off: [-2.5, 1, 2.8], sx: .2 },
    cola:       { focus: 'cola', off: [2.2, .8, 3], sx: -.2 },
    final:      { cam: [-.4, 3.6, 13.6], look: [-.45, -.6, 0], sy: .13, sway: 1 },
  };
  const sections = [...document.querySelectorAll('[data-kf]')];
  const KF = sections.map(s => {
    const k = { e: 1, rotY: -.2, pins: 1, sx: 0, sy: 0, sway: 0, ...KFDEF[s.dataset.kf] };
    k.dim = k.focus ? 1 : 0;
    return k;
  });

  // UI: nav, barras de grasa, reveal
  const nav = document.getElementById('nav'), chapEl = document.getElementById('chap'), bar = document.getElementById('bar');
  const navBtns = sections.map(s => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${s.dataset.title}</span>`;
    b.onclick = () => s.scrollIntoView({ behavior: 'smooth' });
    nav.append(b);
    return b;
  });
  document.querySelectorAll('.fat').forEach(el => {
    for (let k = 0; k < 5; k++) el.insertAdjacentHTML('beforeend', `<i class="${k < +el.dataset.fat ? 'on' : ''}"></i>`);
  });
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in', e.isIntersecting)), { threshold: .25 });
  sections.forEach(s => io.observe(s));

  /* ---------------- interacción: arrastrar + hover/click ---------------- */
  let drag = null, ux = 0, uy = 0, uxT = 0, uyT = 0, hovered = null, pickOn = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(e) {
    if (!pickOn) return null;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let o = ray.intersectObjects(pickables, true)[0]?.object;
    while (o && !o.userData.cut) o = o.parent;
    return o?.userData.cut || null;
  }
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      uyT += dx * .008; uxT = clamp(uxT + dy * .005, -.6, .6);
    } else hovered = pick(e);
    canvas.style.cursor = drag && drag.moved > 4 ? 'grabbing' : hovered ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerup', e => { if (drag && drag.moved < 5) { const c = pick(e); if (c) goto(c.id); } drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  /* ---------------- layout + loop ---------------- */
  let W = 0, Hh = 0, tops = [], mobile = false;
  function layout() {
    W = innerWidth; Hh = innerHeight;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    tops = sections.map(s => s.offsetTop);
    mobile = W < 760;
  }
  addEventListener('resize', layout);
  layout();

  const camA = new V3(), camB = new V3(), lookA = new V3(), lookB = new V3(), look = new V3(), tmp = new V3();
  function camState(k, cam, lk, fit) {
    if (k.focus) { byId[k.focus].anchor.getWorldPosition(lk); cam.copy(lk).add(tmp.set(...k.off).multiplyScalar(1.45)); }
    else { lk.set(...k.look); cam.set(...k.cam); }
    cam.sub(lk).multiplyScalar(fit).add(lk);
  }

  let sCur = scrollY, lastChap = -1;
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime;
    sCur += (scrollY - sCur) * (1 - Math.exp(-dt * 7));

    let i = 0;
    while (i < tops.length - 1 && sCur >= tops[i + 1]) i++;
    const j = Math.min(i + 1, KF.length - 1);
    const raw = j === i ? 0 : clamp((sCur - tops[i]) / (tops[j] - tops[i]));
    const f = ease(clamp((raw - .12) / .76));
    const A = KF[i], B = KF[j], L = k => A[k] + (B[k] - A[k]) * f;

    const e = L('e'), dim = L('dim'), pins = L('pins');
    pickOn = e > .5;
    const k = 1 - Math.exp(-dt * 8);
    ux += (uxT - ux) * k; uy += (uyT - uy) * k;
    fish.rotation.set(ux, L('rotY') + uy + Math.sin(time * .35) * .18 * L('sway'), Math.sin(time * .7) * .015);
    fish.position.y = Math.sin(time * .9) * .05;

    for (const c of CUTS) {
      c.w = (A.focus === c.id ? 1 - f : 0) + (B.focus === c.id ? f : 0);
      const op = 1 - .86 * Math.max(0, dim - c.w);
      c.mats.forEach(m => { m.opacity = Math.pow(op, m.userData.pow ?? 1) * (m.userData.op ?? 1); if (m.userData.op === undefined) m.depthWrite = op > .95; });
      for (const m of c.meshes) {
        m.position.copy(m.userData.base).addScaledVector(m.userData.ex, e + .3 * c.w);
        if (m.castShadow !== op > .5) m.traverse(o => { o.castShadow = op > .5; });
        m.rotation.set(0, (c.rotY || 0) * e + c.w * .3 * Math.sin(time * .8), 0);
      }
    }
    fish.updateMatrixWorld(true);

    const fit = Math.max(1, 1.2 / camera.aspect);
    camState(A, camA, lookA, fit); camState(B, camB, lookB, fit);
    camera.position.lerpVectors(camA, camB, f);
    look.lerpVectors(lookA, lookB, f);
    camera.lookAt(look);
    const sx = mobile ? 0 : L('sx'), sy = mobile ? .16 : L('sy');
    camera.setViewOffset(W, Hh, -sx * W, sy * Hh, W, Hh);
    camera.updateMatrixWorld();

    // pins
    pinsEl.style.opacity = pins;
    pinsEl.classList.toggle('off', pins < .5);
    for (const c of CUTS) {
      tmp.copy(c.pinLocal); c.anchor.localToWorld(tmp); tmp.project(camera);
      c.pinEl.style.transform = `translate(${(tmp.x * .5 + .5) * W}px,${(-tmp.y * .5 + .5) * Hh}px)`;
      c.pinEl.style.opacity = tmp.z < 1 ? .3 + .7 * (1 - Math.max(0, dim - c.w)) : 0;
      c.pinEl.classList.toggle('active', c.w > .5);
      c.pinEl.classList.toggle('hover', c === hovered);
    }

    // header / nav / barra de progreso
    const cur = raw > .5 ? j : i;
    if (cur !== lastChap) {
      lastChap = cur;
      chapEl.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')} — ${sections[cur].dataset.title}`;
      navBtns.forEach((b, n) => b.classList.toggle('on', n === cur));
    }
    bar.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - Hh)})`;

    renderer.render(scene, camera);
    canvas.classList.add('ready');
  });
})();
