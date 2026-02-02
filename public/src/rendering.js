// src/rendering.js
// Canvas star map rendering. Stereographic projection centered on Sun.
// Ported drawing functions from useCanvasRendering.js (Vue version).

// ─── Projection (stereographic, centered on centerRA) ──────────────────────
export function project(ra, dec, centerRA) {
  const toRad = d => d * Math.PI / 180;
  let dra = ra - centerRA;
  if (dra > 180) dra -= 360;
  if (dra < -180) dra += 360;

  const draR = toRad(dra);
  const decR = toRad(dec);
  const cosDist = Math.cos(decR) * Math.cos(draR);
  if (cosDist < -0.01) return null; // behind the sphere

  const d = 1 + cosDist;
  return {
    x:  Math.cos(decR) * Math.sin(draR) / d,
    y: -Math.sin(decR) / d
  };
}

// ─── Star shape (smooth 4-point with quadratic curves) ─────────────────────
function drawStarShape4(ctx, x, y, size, color, glowColor) {
  ctx.save();
  ctx.translate(x, y);
  if (glowColor) {
    ctx.shadowBlur  = size * 3;
    ctx.shadowColor = glowColor;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a  = (i * Math.PI) / 2;
    const na = ((i + 1) * Math.PI) / 2;
    const tipX  = Math.cos(a)  * size;
    const tipY  = Math.sin(a)  * size;
    const ntipX = Math.cos(na) * size;
    const ntipY = Math.sin(na) * size;
    if (i === 0) ctx.moveTo(tipX, tipY);
    const mid = a + Math.PI / 4;
    ctx.quadraticCurveTo(
      Math.cos(mid) * size * 0.10,
      Math.sin(mid) * size * 0.10,
      ntipX, ntipY
    );
  }
  ctx.closePath();
  ctx.fill();
  ctx.fill(); // double fill for density
  ctx.restore();
}

// ─── Star color from B-V index ──────────────────────────────────────────────
function starColor(bv, alpha = 1) {
  if (bv <= 0.0)  return `rgba(180,200,255,${alpha})`;
  if (bv <= 0.5)  return `rgba(240,240,255,${alpha})`;
  if (bv <= 1.0)  return `rgba(255,255,220,${alpha})`;
  if (bv <= 1.5)  return `rgba(255,220,180,${alpha})`;
  return                 `rgba(255,180,140,${alpha})`;
}

// Star radius from apparent magnitude
function starRadius(mag) {
  return Math.max(0.6, 3.2 - mag * 0.45);
}

// ─── Sun ────────────────────────────────────────────────────────────────────
function drawSun(ctx, x, y) {
  const size = 12;
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
  g.addColorStop(0,   'rgba(251,191,36,0.8)');
  g.addColorStop(0.5, 'rgba(251,191,36,0.4)');
  g.addColorStop(1,   'rgba(251,191,36,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Moon (with accurate phase rendering) ──────────────────────────────────
function drawMoon(ctx, x, y, phase) {
  const size = 10;

  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
  glow.addColorStop(0, 'rgba(226,232,240,0.5)');
  glow.addColorStop(1, 'rgba(226,232,240,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Dark base
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Lit portion
  const inv = 1 - phase; // invert to match visual convention
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  if (inv < 0.5) {
    const t = inv * 2;
    ctx.arc(x, y, size, -Math.PI / 2, Math.PI / 2, true);
    ctx.ellipse(x, y, (1 - t) * size, size, 0, Math.PI / 2, -Math.PI / 2, false);
  } else {
    const t = (inv - 0.5) * 2;
    ctx.arc(x, y, size, Math.PI / 2, -Math.PI / 2, true);
    ctx.ellipse(x, y, t * size, size, 0, -Math.PI / 2, Math.PI / 2, false);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();

  // Label
  drawLabel(ctx, x, y, size, '☽ Moon', '#e2e8f0');
}

// ─── Planet ─────────────────────────────────────────────────────────────────
function drawPlanet(ctx, x, y, def) {
  // Glow
  const glow = ctx.createRadialGradient(x, y, 0, x, y, def.size * 2.5);
  glow.addColorStop(0, def.color + '99');
  glow.addColorStop(1, def.color + '00');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, def.size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(x, y, def.size, 0, Math.PI * 2);
  ctx.fill();

  // Saturn rings
  if (def.hasRings) {
    ctx.strokeStyle = def.color + '80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, def.size * 1.8, def.size * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawLabel(ctx, x, y, def.size, `${def.symbol} ${def.name}`, def.color);
}

// ─── Special point (node = diamond, others = circle) ───────────────────────
function drawSpecialPoint(ctx, x, y, def) {
  if (def.isNode) {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(x, y - def.size);
    ctx.lineTo(x + def.size * 0.7, y);
    ctx.lineTo(x, y + def.size);
    ctx.lineTo(x - def.size * 0.7, y);
    ctx.closePath();
    ctx.fill();
  } else {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, def.size * 2);
    glow.addColorStop(0, def.color + '99');
    glow.addColorStop(1, def.color + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, def.size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x, y, def.size, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLabel(ctx, x, y, def.size, `${def.symbol} ${def.name}`, def.color);
}

// ─── Shared label helper ────────────────────────────────────────────────────
function drawLabel(ctx, x, y, offset, text, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillText(text, x + offset + 6, y + 4);
  ctx.restore();
}

// ─── Earth / Horizon ────────────────────────────────────────────────────────
function drawEarth(ctx, w, h, altitude) {
  // Opacity: smooth transition around horizon (altitude -5° to +5°)
  let opacity;
  if      (altitude >  5) opacity = 1;
  else if (altitude < -5) opacity = 0.1;
  else                     opacity = 0.1 + ((altitude + 5) / 10) * 0.9;

  const earthRadius = Math.min(w, h) * 3;
  const earthY = h / 2 + earthRadius * (1 + altitude / 90);
  const earthX = w / 2;

  ctx.save();
  ctx.filter      = `blur(${(1 - opacity) * 5}px)`;
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, earthY - earthRadius, 0, earthY + earthRadius);
  grad.addColorStop(0,   'rgba(34,50,30,0.6)');
  grad.addColorStop(0.3, 'rgba(20,35,20,0.8)');
  grad.addColorStop(1,   'rgba(10,15,10,1)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Planet & special-point definitions ─────────────────────────────────────
export const PLANETS = {
  mercury:  { name:"Mercury",  symbol:"☿", color:"#a0a0a0", size:3,   hasRings:false },
  venus:    { name:"Venus",    symbol:"♀", color:"#e8c88a", size:4,   hasRings:false },
  mars:     { name:"Mars",     symbol:"♂", color:"#c1440e", size:3.5, hasRings:false },
  jupiter:  { name:"Jupiter",  symbol:"♃", color:"#c88b3a", size:5,   hasRings:false },
  saturn:   { name:"Saturn",   symbol:"♄", color:"#d4a855", size:4.5, hasRings:true  },
  uranus:   { name:"Uranus",   symbol:"⛢", color:"#7de8e8", size:3.5, hasRings:false },
  neptune:  { name:"Neptune",  symbol:"♆", color:"#3a5fcd", size:3.5, hasRings:false },
};

export const SPECIALS = {
  lilith:    { name:"Lilith",     symbol:"⛰", color:"#a855f7", size:2.5, isNode:false },
  northNode: { name:"North Node", symbol:"☊", color:"#22d3ee", size:2.5, isNode:true  },
  chiron:    { name:"Chiron",     symbol:"⚕", color:"#f472b6", size:2.5, isNode:false },
};

// ─── Main draw ──────────────────────────────────────────────────────────────
// opts: { stars, constellations, sunRA, sunDec, activeConstId,
//         moon:{ra,dec,phase}, planets:{id:{ra,dec},...},
//         specials:{moon,lilith,northNode,chiron}, altitude }
export function drawStarMap(ctx, opts) {
  const dpr = window.devicePixelRatio || 1;
  const w   = ctx.canvas.width  / dpr;
  const h   = ctx.canvas.height / dpr;
  const cx  = w / 2, cy = h / 2;
  const scale = Math.min(w, h) * 0.45;
  const { stars, constellations, sunRA, sunDec, activeConstId,
          moon, planets, specials, altitude } = opts;

  ctx.clearRect(0, 0, w, h);

  // Earth/horizon
  if (altitude !== undefined && altitude !== null) {
    drawEarth(ctx, w, h, altitude);
  }

  // Constellation lines
  constellations.forEach(c => {
    const active = (c.id === activeConstId);
    ctx.strokeStyle = active ? 'rgba(212,175,55,0.85)' : 'rgba(212,175,55,0.2)';
    ctx.lineWidth   = active ? 1.8 : 1.0;
    ctx.shadowBlur  = active ? 10  : 0;
    ctx.shadowColor = 'rgba(212,175,55,0.6)';

    c.lines.forEach(line => {
      let started = false;
      ctx.beginPath();
      for (const [ra, dec] of line) {
        const p = project(ra, dec, sunRA);
        if (!p) { started = false; continue; }
        const px = cx + p.x * scale;
        const py = cy + p.y * scale;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else           ctx.lineTo(px, py);
      }
      ctx.stroke();
    });
  });
  ctx.shadowBlur = 0;

  // Stars (shadows only for bright stars, mag < 3)
  stars.forEach(s => {
    const p = project(s.ra, s.dec, sunRA);
    if (!p) return;
    const px = cx + p.x * scale;
    const py = cy + p.y * scale;
    const r  = starRadius(s.mag);
    drawStarShape4(ctx, px, py, r, starColor(s.bv), s.mag < 3 ? starColor(s.bv, 0.4) : null);
  });

  // Planets
  if (planets) {
    Object.entries(planets).forEach(([id, pos]) => {
      const def = PLANETS[id];
      if (!def || !pos) return;
      const p = project(pos.ra, pos.dec, sunRA);
      if (!p) return;
      drawPlanet(ctx, cx + p.x * scale, cy + p.y * scale, def);
    });
  }

  // Special points
  if (specials) {
    if (specials.moon) {
      const p = project(specials.moon.ra, specials.moon.dec, sunRA);
      if (p) drawMoon(ctx, cx + p.x * scale, cy + p.y * scale, specials.moon.phase);
    }
    ['lilith', 'northNode', 'chiron'].forEach(key => {
      if (!specials[key]) return;
      const p = project(specials[key].ra, specials[key].dec, sunRA);
      if (p) drawSpecialPoint(ctx, cx + p.x * scale, cy + p.y * scale, SPECIALS[key]);
    });
  }

  // Sun — drawn last, on top
  const sunP = project(sunRA, sunDec, sunRA);
  if (sunP) drawSun(ctx, cx + sunP.x * scale, cy + sunP.y * scale);
}