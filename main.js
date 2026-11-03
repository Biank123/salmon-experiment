// Script clásico + import() dinámico: así funciona también abriendo el index.html directo (file://).
(async () => {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const V3 = THREE.Vector3, TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = x => x * x * (3 - 2 * x);
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Cede el hilo para que la pantalla de carga siga animando frases/burbujas.
  const yieldBoot = () => new Promise(r => setTimeout(r, 0));

  /* ---------------- renderer ---------------- */
  const canvas = document.getElementById('gl');
  const isMobile = matchMedia('(max-width: 760px)').matches;
  await yieldBoot();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = .85;
  await yieldBoot();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c9b8, .35));
  const sun = new THREE.DirectionalLight(0xfff1e2, 2.2);
  sun.position.set(2, 9, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 1536, isMobile ? 1024 : 1536);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 25 });
  sun.shadow.bias = -.0005;
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
  // Antes 4096²: subida a GPU y pintado en CPU tardaban varios segundos.
  const skinTex = canvasTex(isMobile ? 1536 : 2048, isMobile ? 768 : 1024, (g, W, H) => {
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
    for (let i = 0; i < (isMobile ? 280 : 450); i++) {
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
    for (let i = 0; i < (isMobile ? 320 : 520); i++) {
      const u = rnd(.02, .97), r = rnd(-1, 1);
      const y = H * (.5 + Math.sign(r) * Math.pow(Math.abs(r), 1.15) * .27), s = rnd(4, 9) * (u > HEAD_U ? .8 : 1);
      g.fillStyle = `rgba(${12 + rnd(0, 15)},${16 + rnd(0, 12)},${18 + rnd(0, 10)},${rnd(.55, .85)})`;
      const a = rnd(0, Math.PI);
      if (Math.random() < .55) {
        for (const d of [0, Math.PI / 2 + rnd(-.3, .3)]) { g.beginPath(); g.ellipse(u * W, y, s, s * .32, a + d, 0, TAU); g.fill(); }
      } else { g.beginPath(); g.ellipse(u * W, y, s * .75, s * .6, a, 0, TAU); g.fill(); }
    }
    // escamas (muy sutiles en color; el relieve va en el bump)
    const scaleStep = isMobile ? 14 : 10;
    g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath();
    for (let y = 0, r = 0; y < H + 10; y += scaleStep, r++)
      for (let x = (r % 2) * 7; x < hx; x += 14) { g.moveTo(x, y + 7); g.arc(x, y, 7, Math.PI / 2, Math.PI * 1.5); }
    g.stroke();
    // poros de la línea lateral
    g.fillStyle = 'rgba(25,35,40,.5)';
    for (const yc of [.25 * H, .75 * H]) for (let x = .02 * W; x < hx; x += isMobile ? 14 : 9) { g.beginPath(); g.arc(x, yc + Math.sin(x * .002) * 6, 1.8, 0, TAU); g.fill(); }
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
  await yieldBoot();

  // Relieve: escamas, opérculo, boca y poros
  const skinBump = canvasTex(isMobile ? 768 : 1024, isMobile ? 384 : 512, (g, W, H) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    const hx = HEAD_U * W;
    const bumpStep = isMobile ? 8 : 5;
    for (const [col, dx] of [['rgba(0,0,0,.45)', 0], ['rgba(255,255,255,.3)', 1.2]]) {
      g.strokeStyle = col; g.lineWidth = 1.1; g.beginPath();
      for (let y = 0, r = 0; y < H + 6; y += bumpStep, r++)
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
  await yieldBoot();

  // Rugosidad (G) y metalicidad (B): lomo mate, flancos y vientre plateados
  const skinRM = canvasTex(256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    [[0, 'rgb(0,60,130)'], [.25, 'rgb(0,50,175)'], [.36, 'rgb(0,85,70)'], [.5, 'rgb(0,100,35)']].forEach(([o, c]) => { gr.addColorStop(o, c); gr.addColorStop(1 - o, c); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, false);
  await yieldBoot();

  // Carne, corte transversal (con el contorno real de la sección)
  const fleshXTex = canvasTex(isMobile ? 512 : 768, isMobile ? 512 : 768, (g, S) => {
    const path = (k = 1) => { g.beginPath(); SEC.forEach(([x, y], i) => { const px = (.5 + (x - .5) * k) * S, py = (.5 + (y - .5) * k) * S; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath(); };
    g.fillStyle = '#e8653a'; g.fillRect(0, 0, S, S);
    g.save(); path(); g.clip();
    const r = g.createRadialGradient(S * .5, S * .45, 20, S * .5, S * .5, S * .55);
    r.addColorStop(0, '#fb8a5c'); r.addColorStop(.7, '#f4743f'); r.addColorStop(1, '#e9663a');
    g.fillStyle = r; g.fillRect(0, 0, S, S);
    for (let i = 0; i < (isMobile ? 160 : 280); i++) {
      g.fillStyle = Math.random() < .5 ? 'rgba(255,190,150,.06)' : 'rgba(190,60,30,.06)';
      g.beginPath(); g.arc(rnd(0, S), rnd(0, S), rnd(6, 40), 0, TAU); g.fill();
    }
    // miosepta: anillos concéntricos por cuadrante, más gruesos hacia el vientre
    for (const qx of [-1, 1]) for (const qy of [-1, 1]) {
      g.save(); g.beginPath(); g.rect(qx < 0 ? 0 : S / 2, qy < 0 ? 0 : S / 2, S / 2, S / 2); g.clip();
      const cx = S * (.5 + qx * .2), cy = S * (.5 + qy * .22);
      for (let k = 1; k < (isMobile ? 9 : 12); k++) {
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
  await yieldBoot();

  // Carne, corte longitudinal (plano horizontal por la espina): chevrones
  const fleshLTex = canvasTex(isMobile ? 1024 : 1536, isMobile ? 256 : 384, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    [[0, '#4e5b62'], [.02, '#f6ddcc'], [.045, '#e9663a'], [.08, '#6e2e24'], [.12, '#ef6e40'], [.5, '#fb8a5c']].forEach(([o, c]) => { gr.addColorStop(o, c); gr.addColorStop(1 - o, c); });
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < (isMobile ? 120 : 220); i++) {
      g.fillStyle = Math.random() < .5 ? 'rgba(255,190,150,.06)' : 'rgba(190,60,30,.06)';
      g.beginPath(); g.arc(rnd(0, W), rnd(.1 * H, .9 * H), rnd(6, 30), 0, TAU); g.fill();
    }
    for (let x = 0; x < W; x += isMobile ? 40 : 32) {
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
  await yieldBoot();

  // Aleta: radios en abanico desde la base, membrana translúcida
  function finTex(pts, spots, dark) {
    const S = isMobile ? 256 : 384, xs = pts.map(p => p.x), ys = pts.map(p => p.y);
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
    const densU = isMobile ? 110 : 160, densV = isMobile ? 72 : 96;
    const nu = Math.max(3, Math.ceil((t1 - t0) * densU)), nv = Math.ceil((phi1 - phi0) / TAU * densV);
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
      m.userData = {
        base: ctr.clone(),
        ex: new V3(...(p.ex || c.ex)),
        cut: c,
        bindPos: new Float32Array(geo.attributes.position.array),
        swimming: false,
      };
      fish.add(m); pickables.push(m);
      return m;
    });
    c.anchor = c.meshes[Math.floor(c.meshes.length / 2)];
    await yieldBoot();
  }
  const own = (c, mat, op = 1, pow = 1) => { mat.transparent = true; Object.assign(mat.userData, { op, pow }); c.mats.push(mat); return mat; };

  /* Nado continuo por vértice: misma onda en X en todas las piezas, sin abrir los cortes.
     Vista lateral = giro del cuerpo. Vista dorsal = flancos antagónicos (uno entra, el otro sale). */
  function swimBend(fx, fy, fz, phase, amount) {
    const fromNose = clamp((XT + LEN - fx) / LEN);
    const tail = Math.pow(fromNose, 1.2);
    const wave = Math.sin(phase - fromNose * 2.75);
    const ang = wave * .36 * tail * amount;
    const s = Math.sin(ang), c = Math.cos(ang);
    let nx = fx + fz * s;
    // Menos “aplastado” por cos: el ancho no late como fluido.
    let nz = fz * (1 - (1 - c) * .35);
    // Vientre: un lado se hunde hacia el eje, el otro se abre (misma onda, signos opuestos).
    const ventral = clamp((-fy + .06) / .52);
    const anti = wave * .2 * tail * amount * (.3 + .7 * ventral);
    const side = fz >= 0 ? 1 : -1;
    nz -= side * anti * Math.max(Math.abs(fz), .05);
    return [nx, nz, ang];
  }
  function deformSwim(m, phase, amount) {
    const bind = m.userData.bindPos, pos = m.geometry.attributes.position, arr = pos.array;
    const bx = m.userData.base.x, by = m.userData.base.y, bz = m.userData.base.z;
    if (amount < .01) {
      if (m.userData.deformed) {
        arr.set(bind);
        pos.needsUpdate = true;
        m.geometry.computeVertexNormals();
        m.userData.deformed = false;
      }
      return;
    }
    m.userData.deformed = true;
    for (let i = 0; i < arr.length; i += 3) {
      const lx = bind[i], ly = bind[i + 1], lz = bind[i + 2];
      const [nx, nz] = swimBend(bx + lx, by + ly, bz + lz, phase, amount);
      arr[i] = nx - bx;
      arr[i + 1] = ly;
      arr[i + 2] = nz - bz;
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
    m.geometry.computeBoundingSphere();
  }

  /* ---------------- aletas y ojos ---------------- */
  const fins = [];
  const swimFollowers = [];
  let bubbleOrigin = null;
  const wakeOrigins = [];
  function addWake(mesh, points, weight = 1) {
    for (const [x, y, z] of points) {
      const o = new THREE.Object3D();
      o.position.set(x, y, z);
      mesh.add(o);
      wakeOrigins.push({ o, weight });
    }
  }
  function attach(m, obj, x, y, z, follow = true) {
    obj.position.set(x, y, z).sub(m.userData.base);
    obj.userData.swimRest = obj.position.clone();
    m.add(obj);
    if (follow) swimFollowers.push(obj);
    return obj;
  }
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
  function registerFin(mesh, kind, side = 1) {
    fins.push({ mesh, kind, side, bx: mesh.rotation.x, by: mesh.rotation.y, bz: mesh.rotation.z });
    return mesh;
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
    // Origen de burbujas en la punta del hocico
    bubbleOrigin = new THREE.Object3D();
    attach(head, bubbleOrigin, xOf(.992), (TOP(.992) + BOT(.992)) * .35, 0);

    const col = byId.collar, cm = col.meshes[0];
    for (const s of [1, -1]) {
      const p = P(.795, s * Math.acos(.62));
      const f = attach(cm, fin(col, [[.04, .03], [-.12, -.05], [-.32, -.13], [-.46, -.15], [-.42, -.05], [-.2, .02], [.04, -.02]]), p.x, p.y, p.z * .98);
      f.rotation.set(s * .25, s * .42, -.2);
      registerFin(f, 'pectoral', s);
      addWake(f, [[-.2, -.04, s * .1], [-.28, -.08, s * .06]], .35);
    }
    const lo = byId.lomo;
    const dorsalMesh = registerFin(attach(lo.meshes[0], fin(lo, [[.02, -.05], [-.1, .44], [-.2, .47], [-.3, .3], [-.46, .12], [-.6, .04], [-.62, -.05]], { spots: 10 }), xOf(.63), TOP(.63) - .03, 0), 'dorsal');
    addWake(dorsalMesh, [[-.22, .28, .1], [-.35, .2, -.1]], .45);
    const ve = byId.ventresca;
    for (const s of [1, -1]) {
      const f = attach(ve.meshes[0], fin(ve, [[.02, .03], [-.1, -.24], [-.2, -.25], [-.3, -.06], [-.32, .03]]), xOf(.52), BOT(.52) + .04, s * .07);
      f.rotation.x = -s * .45;
      registerFin(f, 'pelvic', s);
      addWake(f, [[-.14, -.1, s * .08]], .3);
    }
    const co = byId.cola, tm = co.meshes[0];
    const caudalMesh = registerFin(attach(tm, fin(co, [[.08, .13], [-.45, .36], [-1.02, .66], [-.9, .3], [-.84, 0], [-.9, -.3], [-1.02, -.64], [-.45, -.35], [.08, -.13]], { spots: 14, dark: true }), XT + .03, 0, 0), 'caudal');
    registerFin(attach(tm, fin(co, [[0, -.02], [-.04, .08], [-.14, .12], [-.24, .06], [-.26, -.02]], { fleshy: true }), xOf(.17), TOP(.17) - .02, 0), 'adipose');
    const analMesh = registerFin(attach(tm, fin(co, [[.02, .04], [-.06, -.3], [-.14, -.32], [-.3, -.12], [-.4, -.04], [-.42, .04]]), xOf(.27), BOT(.27) + .03, 0), 'anal');
    addWake(analMesh, [[-.16, -.14, .08], [-.2, -.1, -.08]], .35);
    // Caudal: pocos puntos un poco separados de la aleta (alrededor).
    addWake(caudalMesh, [[-.48, .45, .12], [-.48, -.45, -.12], [-.7, .18, .11], [-.7, -.18, -.11]], 1);
  }
  fish.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .12 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -2.1; ground.receiveShadow = true;
  scene.add(ground);

  /* ---------------- burbujas (hocico, cola y rastro del mouse) ---------------- */
  const bubbleTex = canvasTex(256, 256, (g, S) => {
    g.clearRect(0, 0, S, S);
    const c = S / 2, r = S * .4;
    const fill = g.createRadialGradient(c - r * .25, c - r * .3, r * .04, c, c, r);
    fill.addColorStop(0, 'rgba(255,255,255,1)');
    fill.addColorStop(.25, 'rgba(235,248,255,.75)');
    fill.addColorStop(.65, 'rgba(210,236,248,.4)');
    fill.addColorStop(.9, 'rgba(190,220,235,.55)');
    fill.addColorStop(1, 'rgba(190,220,235,0)');
    g.fillStyle = fill;
    g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(90,140,170,.85)'; g.lineWidth = S * .028;
    g.beginPath(); g.arc(c, c, r * .9, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.98)';
    g.beginPath(); g.ellipse(c - r * .28, c - r * .32, r * .22, r * .14, -.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.65)';
    g.beginPath(); g.arc(c + r * .2, c + r * .26, r * .07, 0, TAU); g.fill();
  });
  bubbleTex.wrapS = bubbleTex.wrapT = THREE.ClampToEdgeWrapping;
  const bubbles = Array.from({ length: 48 }, () => {
    const mat = new THREE.SpriteMaterial({
      map: bubbleTex, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true,
    });
    const mesh = new THREE.Sprite(mat);
    mesh.visible = false;
    mesh.renderOrder = 4;
    scene.add(mesh);
    return { mesh, life: 0, max: 1, r0: .1, vx: 0, vy: 0, vz: 0 };
  });
  const bubbleWorld = new V3(), mouseWorld = new V3(), mousePlane = new THREE.Plane(), camDir = new V3();
  let bubbleAccMouth = 0, bubbleAccTail = 0, bubbleAccMouse = 0, prevPtrX = -1, prevPtrY = -1;
  function takeBubble() {
    return bubbles.find(x => x.life <= 0) || bubbles[Math.floor(Math.random() * bubbles.length)];
  }
  function spawnBubble(origin, { dir = 1, big = false, drift = 1, wake = false } = {}) {
    if (!origin) return;
    origin.getWorldPosition(bubbleWorld);
    const b = takeBubble();
    b.max = b.life = rnd(.75, 1.65);
    b.r0 = big ? rnd(.14, .26) : rnd(.08, .17);
    if (wake) {
      const ang = rnd(0, TAU), rad = rnd(.05, .14);
      b.vx = -rnd(.05, .2) * drift + rnd(-.04, .04);
      b.vy = rnd(.15, .5);
      b.vz = rnd(-.16, .16);
      b.mesh.position.copy(bubbleWorld);
      b.mesh.position.x += rnd(-.05, .03);
      b.mesh.position.y += Math.sin(ang) * rad;
      b.mesh.position.z += Math.cos(ang) * rad;
    } else {
      b.vx = dir * rnd(.05, .24) * drift;
      b.vy = rnd(.22, .7);
      b.vz = rnd(-.14, .14);
      b.mesh.position.copy(bubbleWorld);
      b.mesh.position.x += rnd(-.02, .03);
      b.mesh.position.y += rnd(-.025, .02);
      b.mesh.position.z += rnd(-.03, .03);
    }
    b.mesh.scale.setScalar(b.r0);
    b.mesh.material.opacity = .95;
    b.mesh.visible = true;
  }
  function pickWakeOrigin() {
    let total = 0;
    for (const w of wakeOrigins) total += w.weight;
    let r = Math.random() * total;
    for (const w of wakeOrigins) {
      r -= w.weight;
      if (r <= 0) return w.o;
    }
    return wakeOrigins[0]?.o;
  }
  function spawnBubbleAt(pos, sizeMul = 1) {
    const b = takeBubble();
    b.max = b.life = rnd(.5, 1.1);
    b.r0 = rnd(.07, .16) * sizeMul;
    b.vx = rnd(-.08, .08);
    b.vy = rnd(.15, .45);
    b.vz = rnd(-.08, .08);
    b.mesh.position.copy(pos);
    b.mesh.position.x += rnd(-.02, .02);
    b.mesh.position.y += rnd(-.02, .02);
    b.mesh.scale.setScalar(b.r0);
    b.mesh.material.opacity = .88;
    b.mesh.visible = true;
  }
  function pointerToWorld(clientX, clientY, out) {
    ndc.set(clientX / W * 2 - 1, -(clientY / Hh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    camera.getWorldDirection(camDir);
    mousePlane.setFromNormalAndCoplanarPoint(camDir, fish.position);
    return ray.ray.intersectPlane(mousePlane, out);
  }
  function updateBubbles(dt, active) {
    if (active) {
      bubbleAccMouth += dt * (2.2 + haste * 4);
      while (bubbleAccMouth >= 1) {
        bubbleAccMouth -= 1;
        spawnBubble(bubbleOrigin, { dir: 1, big: Math.random() < .28 });
      }
      if (haste > .15 && wakeOrigins.length) {
        bubbleAccTail += dt * (1.4 + haste * 3.2);
        while (bubbleAccTail >= 1) {
          bubbleAccTail -= 1;
          spawnBubble(pickWakeOrigin(), { big: Math.random() < .22, drift: 1, wake: true });
        }
      } else bubbleAccTail = Math.min(bubbleAccTail, 1);
    } else {
      bubbleAccMouth = Math.min(bubbleAccMouth, 1);
      bubbleAccTail = Math.min(bubbleAccTail, 1);
    }
    if (ptrX >= 0) {
      const moved = prevPtrX < 0 ? 0 : Math.hypot(ptrX - prevPtrX, ptrY - prevPtrY);
      prevPtrX = ptrX; prevPtrY = ptrY;
      if (moved > 3 && pointerToWorld(ptrX, ptrY, mouseWorld)) {
        bubbleAccMouse += moved * .035;
        while (bubbleAccMouse >= 1) {
          bubbleAccMouse -= 1;
          spawnBubbleAt(mouseWorld, Math.random() < .25 ? 1.35 : .85);
        }
      }
    }
    for (const b of bubbles) {
      if (b.life <= 0) { b.mesh.visible = false; continue; }
      b.life -= dt;
      const t = 1 - Math.max(b.life, 0) / b.max;
      b.vx *= 1 - dt * .25;
      b.vy += dt * .4;
      b.vz *= 1 - dt * .25;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      b.mesh.scale.setScalar(b.r0 * (1 + t * .35));
      b.mesh.material.opacity = .95 * (1 - t * t);
      if (b.life <= 0) b.mesh.visible = false;
    }
  }

  /* ---------------- pins (tooltips anclados en 3D) ---------------- */
  const pinsEl = document.getElementById('pins');
  for (const c of CUTS) {
    const box = new THREE.Box3().setFromObject(c.anchor);
    c.pinLocal = new V3(0, (c.below ? box.min.y - .12 : box.max.y + .12) - c.anchor.position.y, 0);
    const el = document.createElement('button');
    el.className = 'pin' + (c.below ? ' b' : '');
    el.innerHTML = `<i></i><span><b>${c.name}</b><em>${c.tag}</em></span>`;
    el.onclick = () => goToId(c.id);
    pinsEl.append(el);
    c.pinEl = el;
  }

  /* ---------------- keyframes de scroll ---------------- */
  const KFDEF = {
    // mobileFit ↑ = pez más chico; mobileSy: mismo centro vertical en overview.
    hero:       { cam: [0, .4, 9.8], look: [0, .05, 0], e: 0, rotY: -.38, pins: 0, sy: .1, sway: 1, mobileFit: 2.3, mobileSy: .16 },
    diseccion:  { cam: [-.4, 3.6, 13.6], look: [-.45, -.6, 0], sx: .14, mobileFit: 2.05, mobileSy: .16 },
    cabeza:     { focus: 'cabeza', off: [-2.2, .9, 3], sx: .2 },
    collar:     { focus: 'collar', off: [1.7, .6, 3.1], sx: -.2 },
    lomo:       { focus: 'lomo', off: [.9, 1.5, 3.6], sx: .2 },
    ventresca:  { focus: 'ventresca', off: [.6, 2.3, 3.1], sx: -.2 },
    medallones: { focus: 'medallones', off: [-2.5, 1, 2.8], sx: .2 },
    cola:       { focus: 'cola', off: [2.2, .8, 3], sx: -.2 },
    final:      { cam: [-.4, 3.6, 13.6], look: [-.45, -.6, 0], sy: .13, sway: 1, mobileFit: 2.05, mobileSy: .16 },
  };
  const sections = [...document.querySelectorAll('[data-kf]')];
  const KF = sections.map(s => {
    const k = { e: 1, rotY: -.2, pins: 1, sx: 0, sy: 0, sway: 0, mobileFit: 2.05, mobileSy: .22, ...KFDEF[s.dataset.kf] };
    k.dim = k.focus ? 1 : 0;
    return k;
  });

  // UI: nav, barras de grasa, reveal
  const nav = document.getElementById('nav'), chapEl = document.getElementById('chap'), bar = document.getElementById('bar');
  const navBtns = sections.map((s, n) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${s.dataset.title}</span>`;
    b.onclick = () => goTo(n);
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
  let overFish = false, haste = 0, swimPhase = 0, finPhase = 0, ptrX = -1, ptrY = -1;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitAt(clientX, clientY) {
    ndc.set(clientX / W * 2 - 1, -(clientY / Hh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(pickables, true)[0]?.object || null;
  }
  function cutFrom(o) {
    while (o && !o.userData.cut) o = o.parent;
    return o?.userData.cut || null;
  }
  function pick(e) {
    if (!pickOn) return null;
    return cutFrom(hitAt(e.clientX, e.clientY));
  }
  function refreshHover() {
    if (ptrX < 0 || drag) return;
    const top = document.elementFromPoint(ptrX, ptrY);
    if (top?.closest?.('.panel, #nav, .top, .grid, .foot')) {
      overFish = false;
      hovered = null;
      return;
    }
    const hit = hitAt(ptrX, ptrY);
    overFish = !!hit;
    hovered = pickOn ? cutFrom(hit) : null;
  }
  addEventListener('pointermove', e => { ptrX = e.clientX; ptrY = e.clientY; }, { passive: true });
  canvas.addEventListener('pointerdown', e => {
    ptrX = e.clientX; ptrY = e.clientY;
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    uyT += dx * .008; uxT = clamp(uxT + dy * .005, -.6, .6);
    canvas.style.cursor = drag.moved > 4 ? 'grabbing' : 'grab';
  });
  canvas.addEventListener('pointerup', e => { if (drag && drag.moved < 5) { const c = pick(e); if (c) goToId(c.id); } drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  /* ---------------- layout + loop ---------------- */
  let W = 0, Hh = 0, tops = [], mobile = false;
  function layout() {
    W = innerWidth; Hh = innerHeight;
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    tops = sections.map(s => s.offsetTop);
    mobile = W < 760;
    if (CUTS[0]?.pinEl) measurePins();
  }
  function measurePins() {
    for (const c of CUTS) {
      const span = c.pinEl.querySelector('span');
      c.labelW = span.offsetWidth;
      c.labelH = span.offsetHeight;
    }
  }
  addEventListener('resize', layout);
  visualViewport?.addEventListener('resize', layout);
  layout();

  /* El scroll no se queda entre escenas: un gesto corto vuelve a la actual
     y uno claro anima hasta la visualización siguiente completa. */
  let snapIndex = 0, animating = false, animTimer = 0, gestureDelta = 0, gestureTimer = 0, snapLock = 0;
  const motionOK = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sectionTop(i) { return sections[i].offsetTop; }
  function nearestIndex() {
    let best = 0, dist = Infinity;
    sections.forEach((s, i) => {
      const d = Math.abs(scrollY - s.offsetTop);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }
  function goTo(i) {
    i = Math.max(0, Math.min(sections.length - 1, i));
    const top = sectionTop(i);
    if (i === snapIndex && Math.abs(scrollY - top) <= 2) return;
    snapIndex = i;
    animating = true;
    snapLock = performance.now() + 700;
    clearTimeout(animTimer);
    animTimer = setTimeout(() => {
      animating = false;
      if (Math.abs(scrollY - sectionTop(snapIndex)) > 16) onScrollEnd();
    }, 1600);
    scrollTo({ top, behavior: motionOK() ? 'smooth' : 'auto' });
  }
  function goToId(id) {
    const i = sections.indexOf(document.getElementById(id));
    if (i >= 0) goTo(i);
  }
  function onScrollEnd() {
    const top = sectionTop(snapIndex);
    if (Math.abs(scrollY - top) <= 16) { animating = false; return; }
    if (animating) return;
    const threshold = Math.max(48, innerHeight * 0.08);
    const delta = scrollY - top;
    if (delta > threshold) goTo(snapIndex + 1);
    else if (delta < -threshold) goTo(snapIndex - 1);
    else goTo(snapIndex);
  }
  let scrollEndTimer = 0;
  addEventListener('scroll', () => {
    clearTimeout(scrollEndTimer);
    scrollEndTimer = setTimeout(onScrollEnd, 140);
  }, { passive: true });
  addEventListener('scrollend', onScrollEnd);
  addEventListener('wheel', e => {
    if (e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (animating || performance.now() < snapLock) return;
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
    gestureDelta += px;
    clearTimeout(gestureTimer);
    const threshold = Math.max(48, innerHeight * 0.06);
    if (Math.abs(gestureDelta) >= threshold) {
      const dir = gestureDelta > 0 ? 1 : -1;
      gestureDelta = 0;
      goTo(snapIndex + dir);
      return;
    }
    gestureTimer = setTimeout(() => { gestureDelta = 0; }, 180);
  }, { passive: false });
  let touch = null;
  addEventListener('touchstart', e => {
    if (e.touches.length !== 1) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: null };
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (!touch || !e.touches.length) return;
    const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y;
    if (!touch.lock && Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    if (!touch.lock) touch.lock = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    if (touch.lock === 'y') e.preventDefault();
  }, { passive: false });
  addEventListener('touchend', e => {
    if (!touch) return;
    const dy = touch.y - e.changedTouches[0].clientY;
    const lock = touch.lock;
    touch = null;
    if (lock !== 'y' || animating || Math.abs(dy) < 48) return;
    goTo(snapIndex + (dy > 0 ? 1 : -1));
  });
  addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((e.key === ' ' || e.key === 'Enter') && (tag === 'BUTTON' || tag === 'A')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goTo(snapIndex + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goTo(snapIndex - 1); }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0); }
    else if (e.key === 'End') { e.preventDefault(); goTo(sections.length - 1); }
  });
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const i = sections.indexOf(document.getElementById(id));
      if (i >= 0) { e.preventDefault(); goTo(i); }
    });
  });
  snapIndex = nearestIndex();
  if (Math.abs(scrollY - sectionTop(snapIndex)) > 4) goTo(snapIndex);
  document.fonts?.ready.then(() => {
    layout();
    if (!animating && Math.abs(scrollY - sectionTop(snapIndex)) > 16) scrollTo({ top: sectionTop(snapIndex), behavior: 'auto' });
  });

  const camA = new V3(), camB = new V3(), lookA = new V3(), lookB = new V3(), look = new V3(), tmp = new V3();
  function placePins(dim) {
    const gap = mobile ? 12 : 18;
    const items = CUTS.map(c => {
      tmp.copy(c.pinLocal);
      c.anchor.localToWorld(tmp);
      tmp.project(camera);
      const x = (tmp.x * .5 + .5) * W;
      const y = (-tmp.y * .5 + .5) * Hh;
      const w = c.labelW || 0, h = c.labelH || 0;
      const below = !mobile && !!c.below;
      return { c, x, y, w, h, below, visible: tmp.z < 1, left: x - w / 2, top: below ? y + gap : y - gap - h };
    });
    if (mobile && items.some(it => it.w > 2)) {
      let blockTop = Hh - 8;
      sections.forEach(s => {
        if (!s.classList.contains('in')) return;
        const r = s.querySelector('.panel').getBoundingClientRect();
        if (r.top > 48 && r.top < Hh) blockTop = Math.min(blockTop, r.top - 8);
      });
      const pad = 5;
      for (let pass = 0; pass < 12; pass++) {
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
          const A = items[a], B = items[b];
          if (!A.visible || !B.visible) continue;
          const dx = (A.left + A.w / 2) - (B.left + B.w / 2);
          const dy = (A.top + A.h / 2) - (B.top + B.h / 2);
          const ox = (A.w + B.w) / 2 + pad - Math.abs(dx);
          const oy = (A.h + B.h) / 2 + pad - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (oy <= ox) {
              const s = dy === 0 ? -1 : Math.sign(dy);
              A.top += s * oy / 2; B.top -= s * oy / 2;
            } else {
              const s = dx === 0 ? 1 : Math.sign(dx);
              A.left += s * ox / 2; B.left -= s * ox / 2;
            }
          }
        }
        for (const it of items) {
          if (!it.visible || it.w < 2) continue;
          it.left = clamp(it.left, 8, Math.max(8, W - it.w - 8));
          it.top = clamp(it.top, 52, Math.max(52, blockTop - it.h));
        }
      }
    }
    for (const it of items) {
      it.c.pinEl.style.transform = `translate(${it.x}px,${it.y}px)`;
      if (mobile && it.w > 2) {
        const baseTop = it.below ? it.y + gap : it.y - gap - it.h;
        it.c.pinEl.style.setProperty('--lx', `${it.left - (it.x - it.w / 2)}px`);
        it.c.pinEl.style.setProperty('--ly', `${it.top - baseTop}px`);
      } else {
        it.c.pinEl.style.setProperty('--lx', '0px');
        it.c.pinEl.style.setProperty('--ly', '0px');
      }
      let pinOp = it.visible ? .3 + .7 * (1 - Math.max(0, dim - it.c.w)) : 0;
      // En un corte enfocado solo se ve su etiqueta; el resto sigue clickeable en la malla.
      if (dim > .4 && it.c.w < .45) pinOp = 0;
      it.c.pinEl.style.opacity = pinOp;
      it.c.pinEl.style.pointerEvents = pinOp < .05 ? 'none' : '';
      it.c.pinEl.classList.toggle('active', it.c.w > .5);
      it.c.pinEl.classList.toggle('hover', it.c === hovered);
    }
  }
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
    const live = clamp(1 - e);
    const swim = live * (.65 + .35 * Math.max(L('sway'), .4));
    refreshHover();
    const engaged = (overFish || !!drag) && live > .08;
    const hasteT = engaged ? 1 : 0;
    haste += (hasteT - haste) * (1 - Math.exp(-dt * 7));
    const tempo = 1 + haste * 1.55;
    const power = 1 + haste * 1.05;
    swimPhase += dt * 2.35 * tempo;
    finPhase += dt * 2.35;
    if (!drag) canvas.style.cursor = (hovered || (!pickOn && overFish)) ? 'pointer' : 'grab';
    const k = 1 - Math.exp(-dt * 8);
    ux += (uxT - ux) * k; uy += (uyT - uy) * k;
    // Móvil: de lado, diagonal leve hacia abajo-derecha.
    const focused = dim > .25 && !!(A.focus || B.focus);
    const mobPose = mobile ? clamp(1 - dim * 1.35) : 0;
    const baseY = L('rotY'), mobY = -.52;
    fish.rotation.set(
      ux + mobPose * .03 + Math.sin(swimPhase * .45) * (.03 + .04 * haste) * swim,
      baseY + (mobY - baseY) * mobPose + uy
        + Math.sin(time * .28) * .1 * L('sway') + Math.sin(swimPhase * .9) * .04 * haste * swim,
      -mobPose * .32 + Math.sin(swimPhase * .3) * (.025 + .03 * haste) * swim
    );
    fish.position.y = Math.sin(time * .65) * .035 + Math.sin(swimPhase * .4) * (.03 + .04 * haste) * swim;

    const bendAmt = swim * power;
    // En móvil la disección se abre menos para no salirse del ancho.
    const spreadMul = mobile ? (focused ? .75 : .42) : 1;
    for (const c of CUTS) {
      c.w = (A.focus === c.id ? 1 - f : 0) + (B.focus === c.id ? f : 0);
      const op = 1 - .86 * Math.max(0, dim - c.w);
      c.mats.forEach((mat, mi) => {
        let alpha = Math.pow(op, mat.userData.pow ?? 1) * (mat.userData.op ?? 1);
        if (mi === 1 || mi === 2) alpha *= 1 - .96 * live;
        mat.opacity = alpha;
        if (mat.userData.op === undefined) mat.depthWrite = alpha > .95;
      });
      for (const m of c.meshes) {
        m.position.copy(m.userData.base).addScaledVector(m.userData.ex, (e + .3 * c.w) * spreadMul);
        if (m.castShadow !== op > .5) m.traverse(o => { o.castShadow = op > .5; });
        m.rotation.set(0, (c.rotY || 0) * e + c.w * .3 * Math.sin(time * .8), 0);
        deformSwim(m, swimPhase, bendAmt);
      }
    }
    for (const obj of swimFollowers) {
      const p = obj.parent, rest = obj.userData.swimRest;
      if (!p?.userData?.base || !rest) continue;
      if (bendAmt < .01) { obj.position.copy(rest); continue; }
      const fx = p.userData.base.x + rest.x, fy = p.userData.base.y + rest.y, fz = p.userData.base.z + rest.z;
      const [nx, nz] = swimBend(fx, fy, fz, swimPhase, bendAmt);
      obj.position.set(nx - p.userData.base.x, fy - p.userData.base.y, nz - p.userData.base.z);
    }
    // Las aletas mantienen el mismo aleteo; la sensación de velocidad la da el cuerpo.
    const flap = .11 * swim;
    for (const fin of fins) {
      const base = fin.mesh.parent?.userData?.base;
      const fromNose = clamp((XT + LEN - (base?.x ?? 0)) / LEN);
      const phase = finPhase - fromNose * 2.75 + (fin.kind === 'pectoral' ? fin.side * .5 : 0);
      const wave = Math.sin(phase);
      let dx = 0, dy = 0, dz = 0;
      if (fin.kind === 'pectoral') {
        dx = wave * flap * .45 * fin.side;
        dy = Math.sin(phase + .4) * flap * .3 * fin.side;
        dz = wave * flap * 1.05;
      } else if (fin.kind === 'caudal') {
        dy = wave * flap * .55;
        dz = Math.sin(phase + .3) * flap * .12;
      } else if (fin.kind === 'dorsal' || fin.kind === 'adipose') {
        dx = wave * flap * 1.05;
        dy = Math.sin(phase + .3) * flap * .1;
      } else if (fin.kind === 'pelvic') {
        dx = wave * flap * .65 * -fin.side;
        dy = Math.sin(phase + .3) * flap * .18 * fin.side;
      } else if (fin.kind === 'anal') {
        dx = wave * flap * 1.05;
        dy = Math.sin(phase + .25) * flap * .12;
      }
      fin.mesh.rotation.set(fin.bx + dx, fin.by + dy, fin.bz + dz);
    }
    fish.updateMatrixWorld(true);
    updateBubbles(dt, engaged);

    // Móvil: fit/sy por slide (inicio más lejos; disección baja el pez hacia el texto).
    const fit = mobile
      ? (focused ? 1.85 : L('mobileFit'))
      : Math.max(1, 1.2 / camera.aspect);
    camState(A, camA, lookA, fit); camState(B, camB, lookB, fit);
    if (mobile && focused) {
      camA.lerp(lookA, .1);
      camB.lerp(lookB, .1);
    }
    camera.position.lerpVectors(camA, camB, f);
    look.lerpVectors(lookA, lookB, f);
    if (mobile && !focused) {
      // Mismo centro vertical en inicio / disección / resumen.
      look.set(0, .05, 0);
      camera.position.x *= .4;
      camera.position.y = .45;
    }
    camera.lookAt(look);
    const sx = mobile ? 0 : L('sx');
    const sy = mobile ? (focused ? .22 : L('mobileSy')) : L('sy');
    camera.setViewOffset(W, Hh, -sx * W, sy * Hh, W, Hh);
    camera.updateMatrixWorld();

    // pins
    pinsEl.style.opacity = pins;
    pinsEl.classList.toggle('off', pins < .5);
    placePins(dim);

    // header / nav / barra de progreso
    const cur = raw > .5 ? j : i;
    if (cur !== lastChap) {
      lastChap = cur;
      chapEl.textContent = `${String(cur + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')} — ${sections[cur].dataset.title}`;
      navBtns.forEach((b, n) => b.classList.toggle('on', n === cur));
    }
    bar.style.transform = `scaleX(${scrollY / Math.max(1, document.documentElement.scrollHeight - Hh)})`;

    renderer.render(scene, camera);
    if (!canvas.classList.contains('ready')) {
      canvas.classList.add('ready');
      const finishBoot = () => {
        document.body.classList.remove('is-loading');
        document.body.classList.add('is-ready');
        const boot = document.getElementById('boot');
        if (boot) {
          boot.classList.add('done');
          boot.setAttribute('aria-busy', 'false');
          setTimeout(() => boot.remove(), 900);
        }
        window.__stopBoot?.();
      };
      const wait = Math.max(0, (window.__bootReadyAt || 0) - performance.now());
      setTimeout(finishBoot, wait);
    }
  });
})();
