// src/rendering.js
// Draws the star map onto a canvas element.
// Expects data from data.js (stars array, constellations array)
// and sun position from astronomy.js.

// --- Projection ---
// Stereographic projection centered on a given RA.
// centerRA: right ascension of the center (degrees) — typically sun's RA
// fieldOfView: visible angular width in degrees (default 180)
// Returns { x, y } in range [-1, 1] or null if behind the sphere.

function toRad(deg) { return deg * Math.PI / 180; }

export function project(ra, dec, centerRA, fov = 180) {
  const halfFov = toRad(fov / 2);

  const raRad  = toRad(ra - centerRA);
  const decRad = toRad(dec);

  // Angular distance from center
  const cosDist = Math.cos(decRad) * Math.cos(raRad);
  if (cosDist < -0.01) return null; // behind the sphere

  // Stereographic
  const x =  Math.cos(decRad) * Math.sin(raRad);
  const y =  Math.sin(decRad);
  const d =  1 + cosDist;

  return { x: x / d, y: -y / d }; // y flipped so dec+ is up
}

// --- Star color from B-V index ---
function starColor(bv) {
  // bv < 0: blue-white, bv ~ 0.5: white-yellow, bv > 1.5: red
  if (bv <= 0.0)  return "rgba(180, 200, 255, ";
  if (bv <= 0.5)  return "rgba(240, 240, 255, ";
  if (bv <= 1.0)  return "rgba(255, 255, 220, ";
  if (bv <= 1.5)  return "rgba(255, 220, 180, ";
  return "rgba(255, 180, 140, ";
}

// --- Star size from magnitude ---
// mag 0 → largest, mag 6 → smallest
function starRadius(mag) {
  return Math.max(0.5, 3.0 - mag * 0.45);
}

// --- Draw a 4-point star (matches hero style) ---
function draw4PointStar(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowBlur = size * 3;
  ctx.shadowColor = color + "0.5)";
  ctx.fillStyle = color + "1)";
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 - Math.PI / 4;
    const ox = Math.cos(angle) * size;
    const oy = Math.sin(angle) * size;
    const ia = angle + Math.PI / 4;
    const ix = Math.cos(ia) * size * 0.25;
    const iy = Math.sin(ia) * size * 0.25;
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- Main draw function ---
// Call each frame or on date change.
//
// ctx          – 2D canvas context
// stars        – array from data.js
// constellations – array from data.js
// sunRA        – sun's right ascension (degrees)
// sunDec       – sun's declination (degrees)
// activeConstId– currently active constellation id (e.g. "Leo")
// fov          – field of view in degrees (default 180)

export function drawStarMap(ctx, { stars, constellations, sunRA, sunDec, activeConstId, fov = 180 }) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) * 0.45; // map [-1,1] to canvas

  ctx.clearRect(0, 0, w, h);

  // --- Constellation lines ---
  constellations.forEach(c => {
    const isActive = c.id === activeConstId;
    ctx.strokeStyle = isActive
      ? "rgba(212, 175, 55, 0.85)"  // gold — active
      : "rgba(212, 175, 55, 0.2)";  // dim — inactive
    ctx.lineWidth = isActive ? 1.8 : 1.0;
    ctx.shadowBlur = isActive ? 10 : 0;
    ctx.shadowColor = "rgba(212, 175, 55, 0.6)";

    c.lines.forEach(line => {
      let started = false;
      ctx.beginPath();
      for (const [ra, dec] of line) {
        const p = project(ra, dec, sunRA, fov);
        if (!p) { started = false; continue; }
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  });

  ctx.shadowBlur = 0;

  // --- Stars ---
  stars.forEach(s => {
    const p = project(s.ra, s.dec, sunRA, fov);
    if (!p) return;
    const px = cx + p.x * scale;
    const py = cy + p.y * scale;
    const r = starRadius(s.mag);
    draw4PointStar(ctx, px, py, r, starColor(s.bv));
  });

  // --- Sun ---
  const sunP = project(sunRA, sunDec, sunRA, fov);
  if (sunP) {
    const sx = cx + sunP.x * scale;
    const sy = cy + sunP.y * scale;

    // Glow
    ctx.save();
    ctx.shadowBlur = 40;
    ctx.shadowColor = "rgba(251, 191, 36, 0.8)";
    ctx.fillStyle = "rgba(251, 191, 36, 1)";
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}