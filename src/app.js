// src/app.js
// Entry point. Handles the sections after the hero:
//   #starmap  – date picker + canvas
//   #comparison – tropical vs astronomical cards
//
// Include in index.html:
//   <script type="module" src="src/app.js"></script>

import { loadAll } from "./data.js";
import { getSunPosition, getZodiacConstellation, getTropicalSign, CONSTELLATION_NAMES } from "./astronomy.js";
import { drawStarMap } from "./rendering.js";

// --- State ---
let starData = null;
let constData = null;
let canvas = null;
let ctx = null;
let currentDate = new Date();

// --- Init ---
document.addEventListener("DOMContentLoaded", async () => {
  buildStarmapSection();
  buildComparisonSection();

  // Load data
  const { stars, constellations } = await loadAll();
  starData = stars;
  constData = constellations;

  // Initial render
  update(currentDate);
});

// --- Build #starmap content ---
function buildStarmapSection() {
  const placeholder = document.querySelector("#starmap .placeholder");
  if (!placeholder) return;

  placeholder.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:24px;">
      <canvas id="starmap-canvas" style="width:100%; max-width:600px; border-radius:16px; background:#0a0a14;"></canvas>
      <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap; justify-content:center;">
        <label style="color:#f4e4b7; font-size:18px;">Birth date</label>
        <input type="date" id="birth-date"
          style="background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); border-radius:8px;
                 padding:8px 12px; font-size:16px; font-family:'Zain',sans-serif; cursor:pointer;">
        <label style="color:#f4e4b7; font-size:18px;">Time (UTC)</label>
        <input type="time" id="birth-time"
          style="background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); border-radius:8px;
                 padding:8px 12px; font-size:16px; font-family:'Zain',sans-serif; cursor:pointer;">
      </div>
    </div>
  `;

  // Set up canvas
  canvas = document.getElementById("starmap-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Set default date to today
  const today = new Date();
  document.getElementById("birth-date").value = formatDate(today);
  document.getElementById("birth-time").value = "12:00";

  // Listen
  document.getElementById("birth-date").addEventListener("input", onDateChange);
  document.getElementById("birth-time").addEventListener("input", onDateChange);
}

// --- Build #comparison content ---
function buildComparisonSection() {
  const placeholder = document.querySelector("#comparison .placeholder");
  if (!placeholder) return;

  placeholder.innerHTML = `
    <div style="display:flex; gap:24px; justify-content:center; flex-wrap:wrap; max-width:800px; margin:0 auto;">
      <div id="card-tropical" style="flex:1; min-width:260px; background:rgba(20,20,40,0.8); border:1px solid rgba(212,175,55,0.2);
            border-radius:16px; padding:32px; text-align:center;">
        <div style="color:rgba(244,228,183,0.5); font-size:14px; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">Astrology Says</div>
        <div id="tropical-symbol" style="font-size:48px; margin-bottom:8px;"></div>
        <div id="tropical-name" style="font-family:'Waterfall',cursive; font-size:36px; color:#f4e4b7;"></div>
        <div style="color:rgba(244,228,183,0.4); font-size:13px; margin-top:12px;">Based on 2,000-year-old positions</div>
      </div>

      <div id="card-astronomical" style="flex:1; min-width:260px; background:rgba(20,20,40,0.8); border:1px solid rgba(212,175,55,0.5);
            border-radius:16px; padding:32px; text-align:center; box-shadow:0 0 30px rgba(212,175,55,0.1);">
        <div style="color:#d4af37; font-size:14px; text-transform:uppercase; letter-spacing:2px; margin-bottom:16px;">Astronomy Says</div>
        <div id="astro-symbol" style="font-size:48px; margin-bottom:8px; color:#d4af37;"></div>
        <div id="astro-name" style="font-family:'Waterfall',cursive; font-size:36px; color:#d4af37;"></div>
        <div style="color:rgba(212,175,55,0.5); font-size:13px; margin-top:12px;">Where the Sun actually was</div>
      </div>
    </div>
  `;
}

// --- Date change handler ---
function onDateChange() {
  const d = document.getElementById("birth-date").value;
  const t = document.getElementById("birth-time").value || "12:00";
  if (!d) return;

  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  currentDate = new Date(Date.UTC(y, m - 1, day, h, min));

  update(currentDate);
}

// --- Core update ---
function update(date) {
  const sun = getSunPosition(date);
  const astroId = getZodiacConstellation(sun.lon);
  const tropical = getTropicalSign(date);
  const astro = CONSTELLATION_NAMES[astroId];

  // Update cards
  document.getElementById("tropical-symbol").textContent = tropical.symbol;
  document.getElementById("tropical-name").textContent   = tropical.name;
  document.getElementById("astro-symbol").textContent    = astro.symbol;
  document.getElementById("astro-name").textContent      = astro.common;

  // Draw star map
  if (ctx && starData && constData) {
    drawStarMap(ctx, {
      stars: starData,
      constellations: constData,
      sunRA: sun.ra,
      sunDec: sun.dec,
      activeConstId: astroId
    });
  }
}

// --- Canvas resize (keeps it square, retina-sharp) ---
function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  // Re-render if data is loaded
  if (starData) update(currentDate);
}

// --- Helpers ---
function formatDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}