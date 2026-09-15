/* ---------- digit cylinder ----------
   A column of numerals wrapped around a vertical cylinder and rotated.
   Characters are placed by angle, so horizontal compression and brightness
   falloff at the edges come out of the geometry rather than being faked with
   gradients. After the block is scrolled into view, three rows sweep green
   from left to right, one row at a time. */
export function createDigitCylinder(canvasId, opts) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const container = canvas.parentElement;
  const reduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const allowHover = !opts || opts.allowHover !== false;

  // ---------- config ----------
  const AROUND = 108; // characters around the full circumference
  const ROW_H = 13; // px between rows
  const FONT_PX = 12;
  const RADIUS_FRAC = 0.3; // cylinder radius as a fraction of canvas width
  const BOW = 9; // px of downward bow at the cylinder's edges
  const SPIN_MS = 52000; // one full revolution (halved speed)
  const BG = "#000000";

  const GREEN = [124, 232, 160];
  const SWEEP_MS = 3200; // one row's left-to-right reveal
  const SWEEP_GAP_MS = 900; // pause between rows
  const SWEEP_SOFT = 0.14; // width of the soft leading edge, 0-1

  const SPEED_SPREAD = 0.22; // ±% variation in per-row rotation speed
  const REVERSE_ROWS = 10; // rows that turn right-to-left; all others L→R

  // wrap-around silhouette: near cos≈0 the angular fade band used to be
  // defined, but x = centerX + radius*sin(theta) barely moves per unit of
  // cos once cos is already small (dx/dcos → 0 there), so a "wide" band in
  // cos terms was actually only a couple of physical pixels wide — the
  // cylinder still looked like it hit a hard rectangular cutoff right at
  // its own gutter, meeting the currency field in a visible seam. Fading is
  // now defined directly in screen pixels instead, so it's a real, visible
  // gradient that the currency field can crossfade against.
  const EDGE_BLEND_PX = 26;

  // ---------- currency field ----------
  const CURRENCIES = [
    "$",
    "€",
    "£",
    "¥",
    "₹",
    "₽",
    "₩",
    "₪",
    "₫",
    "₦",
    "₱",
    "₺",
    "₴",
    "₡",
    "₸",
    "฿",
    "₾",
    "¢",
    "₨",
    "₼",
    "₲",
    "₵",
    "₭",
    "₮",
    "元",
    "円",
    "₠",
    "﷼",
  ];
  const CUR_ALPHA = 0.05; // resting opacity — barely off the background
  const CUR_GUTTER = 8; // clear margin either side of the cylinder
  const BRUSH_R = 130; // radius of the hover brush, px
  const BRUSH_FADE_MS = 1100; // how long a brush stroke lingers
  const TRAIL_MAX = 48; // pointer samples kept

  let cssW,
    cssH,
    dpr,
    rows,
    radius,
    centerX,
    grid = [];
  let rowPhase = [],
    rowSpeed = [];
  let curGrid = [],
    curCols = 0,
    curPitchX = 0;
  let curLayer = null,
    curLayerCtx = null;
  let trail = [];
  let startTime = null,
    revealAt = null;

  // ---------- glyph atlases ----------
  // Digits are pre-rendered and blitted with drawImage rather than laid out
  // with fillText every frame: fillText re-hints each glyph to the pixel
  // grid, so a character creeping across the screen by fractions of a pixel
  // visibly twitches.
  //
  // They are kept as a horizontal mip chain — successive copies at half
  // width, full height — instead of one 4× atlas. A glyph is squashed
  // toward zero width as it turns toward the cylinder's edge, and
  // drawImage only samples a 2×2 neighbourhood, so minifying a single
  // high-res atlas by 4× or more skips source pixels outright. Which
  // pixels get hit then changes frame to frame as the glyph creeps, and
  // stroke weights visibly flicker. Choosing a level at most 2× wider
  // than the target keeps every blit inside what bilinear resolves
  // correctly. Only width is halved, so vertical detail stays crisp.
  let mipsWhite = [],
    mipsGreen = [];
  let atlasCH = 0,
    atlasW = 0,
    atlasH = 0;

  function buildMips(fill) {
    // the base level sits at exactly device resolution, so a glyph facing
    // the viewer blits 1:1 rather than being resampled at all
    const f = FONT_PX * dpr;
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = f + 'px "JetBrains Mono", monospace';
    let w = 0;
    for (let d = 0; d < 10; d++)
      w = Math.max(w, probe.measureText(String(d)).width);

    const cw = Math.ceil(w) + Math.ceil(dpr * 4);
    const ch = Math.ceil(f * 1.35);

    const base = document.createElement("canvas");
    base.width = cw * 10;
    base.height = ch;
    const g = base.getContext("2d");
    g.font = f + 'px "JetBrains Mono", monospace';
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = fill;
    for (let d = 0; d < 10; d++) {
      g.fillText(String(d), d * cw + cw / 2, ch / 2);
    }

    const levels = [{ cv: base, cw: cw }];
    let prev = base,
      pcw = cw;
    while (pcw > 2) {
      // ceil, not floor: flooring lets a step land at a ratio above 2
      // (17→8), which is exactly the regime bilinear starts skipping
      // source pixels in
      const ncw = Math.max(1, Math.ceil(pcw / 2));
      if (ncw >= pcw) break; // ceil(2/2)===2 would otherwise spin forever
      const cv = document.createElement("canvas");
      cv.width = ncw * 10;
      cv.height = ch;
      const c = cv.getContext("2d");
      c.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in c) c.imageSmoothingQuality = "high";
      // one cell at a time, so neighbouring digits can't bleed into each other
      for (let d = 0; d < 10; d++) {
        c.drawImage(prev, d * pcw, 0, pcw, ch, d * ncw, 0, ncw, ch);
      }
      levels.push({ cv: cv, cw: ncw });
      prev = cv;
      pcw = ncw;
    }

    atlasCH = ch;
    atlasW = cw / dpr; // on-screen width of a full cell, head-on
    atlasH = ch / dpr;
    return levels;
  }

  function buildAtlases() {
    mipsWhite = buildMips("#ffffff");
    mipsGreen = buildMips(
      "rgb(" + GREEN[0] + "," + GREEN[1] + "," + GREEN[2] + ")",
    );
  }

  // narrowest level that is still at least as wide as the target
  function pickMip(levels, targetDeviceW) {
    let k = 0;
    while (k + 1 < levels.length && levels[k + 1].cw >= targetDeviceW)
      k++;
    return levels[k];
  }

  function computeSize() {
    cssW = Math.max(1, container.clientWidth);
    cssH = Math.max(1, container.clientHeight);
    // capped at 2 for the desktop cylinder (full-height canvas, cost adds up);
    // the mobile canvas is much shorter, so it can afford real device
    // resolution — capping it at 2 on a 3x phone was blurring/aliasing the
    // already-thin edge glyphs into that shimmer
    const nextDpr = Math.min(
      window.devicePixelRatio || 1,
      cssW < 700 ? 3 : 2,
    );
    const dprChanged = nextDpr !== dpr;
    dpr = nextDpr;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx)
      ctx.imageSmoothingQuality = "high";

    // the mip chain is built at device resolution, so it is only valid for
    // the dpr it was built under
    if (dprChanged || !mipsWhite.length) buildAtlases();

    radius = cssW * RADIUS_FRAC;
    centerX = cssW / 2;
    rows = Math.ceil(cssH / ROW_H) + 2;

    // fixed digits: the cylinder turns, the numerals printed on it do not change
    // every row is its own ring — independent start angle and slightly
    // different speed — so the lines shear against each other instead of
    // sliding as one rigid block
    // exactly ten rows, picked at random, run the other way; the rest all
    // turn left-to-right
    const reverse = new Set();
    while (reverse.size < Math.min(REVERSE_ROWS, rows)) {
      reverse.add(Math.floor(Math.random() * rows));
    }

    grid = [];
    rowPhase = [];
    rowSpeed = [];
    for (let r = 0; r < rows; r++) {
      const line = new Array(AROUND);
      for (let c = 0; c < AROUND; c++)
        line[c] = Math.floor(Math.random() * 10);
      grid.push(line);
      rowPhase.push(Math.random() * Math.PI * 2);
      rowSpeed.push(
        (reverse.has(r) ? -1 : 1) *
          (1 + (Math.random() * 2 - 1) * SPEED_SPREAD),
      );
    }

    // The currency field is the cylinder's own pattern laid out flat: same
    // font size, same row pitch, and a column pitch equal to the cylinder's
    // character spacing where it faces the viewer (radius × angular step).
    curPitchX = radius * ((Math.PI * 2) / AROUND);
    curCols = Math.ceil(cssW / curPitchX) + 1;
    curGrid = [];
    for (let r = 0; r < rows; r++) {
      const line = new Array(curCols);
      for (let c = 0; c < curCols; c++) {
        line[c] =
          CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
      }
      curGrid.push(line);
    }
    buildCurrencyLayer();
  }

  // the resting field never changes, so it is rendered once and blitted
  function buildCurrencyLayer() {
    if (!curLayer) {
      curLayer = document.createElement("canvas");
      curLayerCtx = curLayer.getContext("2d");
    }
    curLayer.width = canvas.width;
    curLayer.height = canvas.height;
    const c2 = curLayerCtx;
    c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    c2.clearRect(0, 0, cssW, cssH);
    c2.textAlign = "center";
    c2.textBaseline = "middle";
    c2.font = FONT_PX + 'px "JetBrains Mono", monospace';
    for (let r = 0; r < rows; r++) {
      const y = r * ROW_H + ROW_H / 2;
      for (let c = 0; c < curCols; c++) {
        const x = c * curPitchX + curPitchX / 2;
        const a = curFieldAlpha(x);
        if (a <= 0.004) continue;
        c2.fillStyle = "rgba(255,255,255," + CUR_ALPHA * a + ")";
        c2.fillText(curGrid[r][c], x, y);
      }
    }
  }

  // 1 well inside the cylinder's silhouette, ramping down to 0 exactly at
  // its edge (radius), over the last EDGE_BLEND_PX of pixels
  function cylCoreAlpha(x) {
    const d = radius - Math.abs(x - centerX);
    if (d <= 0) return 0;
    if (d >= EDGE_BLEND_PX) return 1;
    return d / EDGE_BLEND_PX;
  }
  // the mirror image: 0 under the cylinder, ramping up to 1 once clear of it
  // plus a small gutter — the currency field crossfades in exactly as the
  // cylinder fades out, instead of the two meeting at a hard seam
  function curFieldAlpha(x) {
    const core = radius + CUR_GUTTER - Math.abs(x - centerX);
    if (core >= EDGE_BLEND_PX) return 0;
    if (core <= 0) return 1;
    return 1 - core / EDGE_BLEND_PX;
  }

  // ---------- hover brush ----------
  function addTrail(e) {
    const rect = canvas.getBoundingClientRect();
    trail.push({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: performance.now(),
    });
    if (trail.length > TRAIL_MAX) trail.shift();
  }
  // hover brush is desktop-only: it needs a real cursor, and on touch the
  // finger would just smear green under itself. Gated on both a real
  // instance opt-out (the mobile canvas passes allowHover:false outright)
  // and the media query, so it can't activate on a touch device that
  // happens to report a pointer capability.
  const canHover =
    allowHover &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover) container.addEventListener("pointermove", addTrail);

  // strongest brush influence on a point, 0 → 1
  function brushAt(x, y, now) {
    let best = 0;
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const age = now - p.t;
      if (age > BRUSH_FADE_MS) {
        trail.splice(0, i + 1);
        break;
      }
      const dx = x - p.x,
        dy = y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > BRUSH_R) continue;
      const v = (1 - d / BRUSH_R) * (1 - age / BRUSH_FADE_MS);
      if (v > best) best = v;
    }
    return best;
  }

  function drawCurrencies(now) {
    if (curLayer) ctx.drawImage(curLayer, 0, 0, cssW, cssH);
    if (!trail.length) return;

    // only the cells the brush can currently reach are repainted
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const c0 = Math.max(0, Math.floor((minX - BRUSH_R) / curPitchX));
    const c1 = Math.min(
      curCols - 1,
      Math.ceil((maxX + BRUSH_R) / curPitchX),
    );
    const r0 = Math.max(0, Math.floor((minY - BRUSH_R) / ROW_H));
    const r1 = Math.min(rows - 1, Math.ceil((maxY + BRUSH_R) / ROW_H));

    ctx.font = FONT_PX + 'px "JetBrains Mono", monospace';
    for (let r = r0; r <= r1; r++) {
      const y = r * ROW_H + ROW_H / 2;
      for (let c = c0; c <= c1; c++) {
        const x = c * curPitchX + curPitchX / 2;
        const a = curFieldAlpha(x);
        if (a <= 0.004) continue;
        const b = brushAt(x, y, now);
        if (b <= 0.01) continue;

        // metallic: slide between a deep green and a pale mint highlight, with
        // the band drifting slowly so the stroke reads as brushed, not flat
        const sheen =
          0.5 +
          0.5 *
            Math.sin((r * 31 + c * 17) * 0.11 + x * 0.012 + now * 0.0009);
        const rr = Math.round(46 + (208 - 46) * sheen);
        const gg = Math.round(120 + (255 - 120) * sheen);
        const bb = Math.round(84 + (226 - 84) * sheen);
        const eased = b * b * (3 - 2 * b);
        ctx.fillStyle =
          "rgba(" +
          rr +
          "," +
          gg +
          "," +
          bb +
          "," +
          a * (CUR_ALPHA + 0.82 * eased) +
          ")";
        ctx.fillText(curGrid[r][c], x, y);
      }
    }
  }

  // the three rows that light up, spaced across the height
  function highlightRows() {
    return [
      Math.round(rows * 0.3),
      Math.round(rows * 0.5),
      Math.round(rows * 0.7),
    ];
  }

  // 0 → 1 sweep position for row n of the sequence, or -1 if not started
  function sweepProgress(i, now) {
    if (revealAt === null) return -1;
    const t = now - revealAt - i * (SWEEP_MS + SWEEP_GAP_MS);
    if (t <= 0) return -1;
    return Math.min(1, t / SWEEP_MS);
  }

  function render(now) {
    if (startTime === null) startTime = now;
    // base turn, in radians — each row scales this by its own speed
    const turn = reduced
      ? 0
      : ((now - startTime) / SPIN_MS) * Math.PI * 2;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // currency field sits behind the cylinder
    drawCurrencies(now);
    if (!mipsWhite.length) {
      requestAnimationFrame(render);
      return;
    }

    const hl = highlightRows();
    const step = (Math.PI * 2) / AROUND;

    for (let r = 0; r < rows; r++) {
      const baseY = r * ROW_H + ROW_H / 2;
      const hlIndex = hl.indexOf(r);
      const sweep = hlIndex === -1 ? -1 : sweepProgress(hlIndex, now);
      const line = grid[r];
      const spin = turn * rowSpeed[r] + rowPhase[r];

      for (let c = 0; c < AROUND; c++) {
        const theta = c * step + spin;
        const cos = Math.cos(theta);
        if (cos <= 0) continue; // back of the cylinder

        const x = centerX + radius * Math.sin(theta);
        // real pixel-space fade — see cylCoreAlpha — rather than a fade
        // defined in cos, which barely moves x near the silhouette and so
        // still looked like a hard cutoff
        const edge = cylCoreAlpha(x);
        if (edge <= 0) continue;

        const y = baseY + BOW * (1 - cos); // rows bow down at the edges
        const shade = Math.pow(cos, 0.85);

        const d = line[c];
        const dw = atlasW * cos;
        const dx = x - dw / 2;
        const dy = y - atlasH / 2;
        // pick the mip level closest above this glyph's on-screen width
        const targetW = dw * dpr;

        let lit = 0;
        if (sweep >= 0) {
          // reveal keyed to screen position, so it reads as one pass across
          // the whole graphic rather than around the cylinder
          const at = x / cssW;
          lit = Math.max(0, Math.min(1, (sweep - at) / SWEEP_SOFT + 1));
        }

        if (lit < 1) {
          const m = pickMip(mipsWhite, targetW);
          ctx.globalAlpha = (0.16 + 0.74 * shade) * edge * (1 - lit);
          ctx.drawImage(
            m.cv,
            d * m.cw,
            0,
            m.cw,
            atlasCH,
            dx,
            dy,
            dw,
            atlasH,
          );
        }
        if (lit > 0) {
          const m = pickMip(mipsGreen, targetW);
          ctx.globalAlpha = (0.25 + 0.75 * shade) * edge * lit;
          ctx.drawImage(
            m.cv,
            d * m.cw,
            0,
            m.cw,
            atlasCH,
            dx,
            dy,
            dw,
            atlasH,
          );
        }
      }
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(render);
  }

  // start the green sequence once the graphic has been scrolled into view
  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && revealAt === null) {
          revealAt = performance.now() + 600;
          io.disconnect();
        }
      });
    },
    { threshold: 0.35 },
  );
  io.observe(container);

  let resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(computeSize, 200);
  });

  // computeSize builds the mip chain itself, since it needs dpr first
  computeSize();
  // both the atlases and the currency field are baked bitmaps, so they are
  // re-rendered once the mono font has actually loaded
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      buildAtlases();
      buildCurrencyLayer();
    });
  }
  requestAnimationFrame(render);
}
