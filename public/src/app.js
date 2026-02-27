// src/app.js

import { loadAll } from "./data.js";
import {
  getSunPosition, getZodiacConstellation, getTropicalSign, CONSTELLATION_NAMES,
  getMoon, getPlanetPosition, getNorthNode, getLilith, getChiron, getSolarAltAz
} from "./astronomy.js";
import { drawStarMap } from "./rendering.js";

// ─── State ──────────────────────────────────────────────────────────────────
let starData, constData, canvas, ctx, currentDate;
let lat = 60.17, lon = 24.94;
let locationName = "Helsinki, Finland";

const PLANET_KEYS = ["mercury","venus","mars","jupiter","saturn","uranus","neptune"];

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  buildStarmap();
  buildComparison();

  const data = await loadAll();
  starData  = data.stars;
  constData = data.constellations;

  currentDate = new Date();
  updateDateInputs();

  update();
});

// ─── Build starmap section ──────────────────────────────────────────────────
function buildStarmap() {
  const ph = document.querySelector("#starmap .placeholder");
  if (!ph) return;

  ph.innerHTML = `
    <style>
      .smc-bar {
        position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: rgba(8,8,18,0.96); backdrop-filter: blur(12px);
        border: 1px solid rgba(212,175,55,0.18); border-radius: 14px;
        padding: 12px 18px; display: flex; flex-direction: row;
        align-items: center; justify-content: center; gap: 18px; max-width: 95%; z-index: 10;
      }
      .smc-group { display: flex; flex-direction: column; align-items: center; gap: 5px; }
      .smc-label {
        font-size: 9px; color: rgba(212,175,55,0.4); text-transform: uppercase;
        letter-spacing: 1.5px; font-family: 'Zain', sans-serif; user-select: none;
      }
      .smc-fields { display: flex; align-items: center; gap: 3px; }
      .smc-sep { color: #444; font-size: 15px; padding: 0 1px; user-select: none; }
      .smc-spinner { display: flex; flex-direction: column; align-items: center; }
      .smc-btn {
        width: 32px; height: 18px; background: rgba(212,175,55,0.08);
        border: 1px solid rgba(212,175,55,0.2); cursor: pointer;
        color: rgba(212,175,55,0.65); font-size: 9px;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s; font-family: 'Zain', sans-serif;
      }
      .smc-btn:hover { background: rgba(212,175,55,0.22); color: #d4af37; }
      .smc-btn-wide { width: 50px; }
      .smc-btn-t { border-radius: 5px 5px 0 0; }
      .smc-btn-b { border-radius: 0 0 5px 5px; }
      .smc-input {
        width: 32px; height: 30px; background: rgba(255,255,255,0.04);
        color: #f4e4b7; border: 1px solid rgba(212,175,55,0.18);
        border-top: none; border-bottom: none;
        text-align: center; font-size: 13px; font-family: 'Zain', sans-serif;
      }
      .smc-input:focus { outline: none; background: rgba(212,175,55,0.06); }
      .smc-input-wide { width: 50px; }
      .smc-div { width: 1px; height: 58px; background: rgba(212,175,55,0.1); flex-shrink: 0; }
      .smc-loc-wrap { position: relative; }
      .smc-loc-input {
        width: 158px; height: 30px; background: rgba(255,255,255,0.04);
        color: #f4e4b7; border: 1px solid rgba(212,175,55,0.18); border-radius: 7px;
        padding: 0 10px; font-size: 12px; font-family: 'Zain', sans-serif;
        transition: border-color 0.15s;
      }
      .smc-loc-input:focus { outline: none; border-color: rgba(212,175,55,0.45); }
      .smc-loc-input::placeholder { color: rgba(244,228,183,0.3); }
      .smc-loc-results {
        position: absolute; bottom: calc(100% + 6px); left: 0; width: 100%;
        max-height: 160px; overflow-y: auto; background: #0e0e1c;
        border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; display: none; z-index: 20;
      }
      .smc-loc-item {
        padding: 9px 12px; cursor: pointer; font-size: 12px; color: #f4e4b7;
        border-bottom: 1px solid rgba(212,175,55,0.08); font-family: 'Zain', sans-serif;
        transition: background 0.12s;
      }
      .smc-loc-item:last-child { border-bottom: none; }
      .smc-loc-item:hover { background: rgba(212,175,55,0.1); }
      .smc-actions { display: flex; flex-direction: column; gap: 6px; }
      .smc-action-btn {
        height: 28px; background: rgba(212,175,55,0.08); color: #d4af37;
        border: 1px solid rgba(212,175,55,0.25); border-radius: 7px;
        padding: 0 14px; font-size: 12px; font-family: 'Zain', sans-serif;
        cursor: pointer; white-space: nowrap; transition: background 0.15s;
      }
      .smc-action-btn:hover { background: rgba(212,175,55,0.2); }

      @media (max-width: 620px) {
        .smc-bar {
          flex-wrap: wrap;
          width: calc(100% - 24px); gap: 10px 16px; padding: 12px 16px; bottom: 12px;
        }
        /* Divider between TIME and LOCATION becomes a full-width row break */
        .smc-bar > .smc-div:nth-child(4) { flex-basis: 100%; height: 1px; }
        /* Divider between LOCATION and ACTIONS not needed on mobile */
        .smc-bar > .smc-div:nth-child(6) { display: none; }
        /* Location group fills remaining space on row 2 */
        .smc-bar > .smc-group:nth-child(5) { flex: 1; }
        .smc-loc-wrap { width: 100%; }
        .smc-loc-input { width: 100%; }
        .smc-actions { align-items: stretch; }
      }
    </style>

    <div style="position:relative; width:100%; height:80vh; min-height:500px;">
      <canvas id="starmap-canvas" style="width:100%; height:100%; border-radius:12px; background:#0a0a14; cursor:grab;"></canvas>

      <div class="smc-bar">

        <!-- DATE -->
        <div class="smc-group">
          <span class="smc-label">Date</span>
          <div class="smc-fields">
            <div class="smc-spinner">
              <button id="day-up" class="smc-btn smc-btn-t">▲</button>
              <input type="text" id="birth-day" class="smc-input">
              <button id="day-down" class="smc-btn smc-btn-b">▼</button>
            </div>
            <span class="smc-sep">/</span>
            <div class="smc-spinner">
              <button id="month-up" class="smc-btn smc-btn-t">▲</button>
              <input type="text" id="birth-month" class="smc-input">
              <button id="month-down" class="smc-btn smc-btn-b">▼</button>
            </div>
            <span class="smc-sep">/</span>
            <div class="smc-spinner">
              <button id="year-up" class="smc-btn smc-btn-t smc-btn-wide">▲</button>
              <input type="text" id="birth-year" class="smc-input smc-input-wide">
              <button id="year-down" class="smc-btn smc-btn-b smc-btn-wide">▼</button>
            </div>
          </div>
        </div>

        <div class="smc-div"></div>

        <!-- TIME -->
        <div class="smc-group">
          <span class="smc-label">Time</span>
          <div class="smc-fields">
            <div class="smc-spinner">
              <button id="hour-up" class="smc-btn smc-btn-t">▲</button>
              <input type="text" id="birth-hour" class="smc-input">
              <button id="hour-down" class="smc-btn smc-btn-b">▼</button>
            </div>
            <span class="smc-sep">:</span>
            <div class="smc-spinner">
              <button id="min-up" class="smc-btn smc-btn-t">▲</button>
              <input type="text" id="birth-min" class="smc-input">
              <button id="min-down" class="smc-btn smc-btn-b">▼</button>
            </div>
          </div>
        </div>

        <div class="smc-div"></div>

        <!-- LOCATION -->
        <div class="smc-group">
          <span class="smc-label">Location</span>
          <div class="smc-loc-wrap">
            <input type="text" id="location-search" placeholder="Search city..." class="smc-loc-input" autocomplete="off">
            <div id="location-results" class="smc-loc-results"></div>
          </div>
        </div>

        <div class="smc-div"></div>

        <!-- ACTIONS -->
        <div class="smc-actions">
          <button id="btn-locate" class="smc-action-btn">⦿ Locate</button>
          <button id="btn-now" class="smc-action-btn">⏱ Now</button>
        </div>

      </div>
    </div>`;

  canvas = document.getElementById("starmap-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Date/time button controls (hold-to-repeat)
  bindHoldButton("day-up",    () => adjustDate('day', 1));
  bindHoldButton("day-down",  () => adjustDate('day', -1));
  bindHoldButton("month-up",  () => adjustDate('month', 1));
  bindHoldButton("month-down",() => adjustDate('month', -1));
  bindHoldButton("year-up",   () => adjustDate('year', 1));
  bindHoldButton("year-down", () => adjustDate('year', -1));
  bindHoldButton("hour-up",   () => adjustDate('hour', 1));
  bindHoldButton("hour-down", () => adjustDate('hour', -1));
  bindHoldButton("min-up",    () => adjustDate('minute', 1));
  bindHoldButton("min-down",  () => adjustDate('minute', -1));

  // Manual input changes
  document.getElementById("birth-day").addEventListener("input", onManualInput);
  document.getElementById("birth-month").addEventListener("input", onManualInput);
  document.getElementById("birth-year").addEventListener("input", onManualInput);
  document.getElementById("birth-hour").addEventListener("input", onManualInput);
  document.getElementById("birth-min").addEventListener("input", onManualInput);

  // Location search
  let searchTimeout;
  document.getElementById("location-search").addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchLocation(e.target.value), 300);
  });

  document.getElementById("btn-locate").addEventListener("click", onLocate);
  document.getElementById("btn-now").addEventListener("click", setNow);

  // Dragging
  setupDrag();
}

// ─── Hold-to-repeat button helper ───────────────────────────────────────────
function bindHoldButton(id, fn) {
  let holdTimer, repeatTimer;
  const el = document.getElementById(id);
  const start = () => {
    fn();
    holdTimer = setTimeout(() => { repeatTimer = setInterval(fn, 80); }, 400);
  };
  const stop = () => { clearTimeout(holdTimer); clearInterval(repeatTimer); };
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", stop);
  el.addEventListener("mouseleave", stop);
  el.addEventListener("touchstart", e => { e.preventDefault(); start(); });
  el.addEventListener("touchend", stop);
}

// ─── Date adjustments ───────────────────────────────────────────────────────
function adjustDate(field, dir) {
  const d = currentDate;
  if (field === 'day') d.setUTCDate(d.getUTCDate() + dir);
  else if (field === 'month') d.setUTCMonth(d.getUTCMonth() + dir);
  else if (field === 'year') d.setUTCFullYear(d.getUTCFullYear() + dir);
  else if (field === 'hour') d.setUTCHours(d.getUTCHours() + dir);
  else if (field === 'minute') d.setUTCMinutes(d.getUTCMinutes() + dir);
  
  currentDate = new Date(d);
  updateDateInputs();
  update();
}

function onManualInput() {
  const day = parseInt(document.getElementById("birth-day").value) || 1;
  const month = parseInt(document.getElementById("birth-month").value) || 1;
  const year = parseInt(document.getElementById("birth-year").value) || 2026;
  const hour = parseInt(document.getElementById("birth-hour").value) || 0;
  const min = parseInt(document.getElementById("birth-min").value) || 0;
  
  currentDate = new Date(Date.UTC(year, month - 1, day, hour, min));
  update();
}

function updateDateInputs() {
  document.getElementById("birth-day").value = currentDate.getUTCDate();
  document.getElementById("birth-month").value = currentDate.getUTCMonth() + 1;
  document.getElementById("birth-year").value = currentDate.getUTCFullYear();
  document.getElementById("birth-hour").value = String(currentDate.getUTCHours()).padStart(2, '0');
  document.getElementById("birth-min").value = String(currentDate.getUTCMinutes()).padStart(2, '0');
}

function setNow() {
  currentDate = new Date();
  updateDateInputs();
  update();
}

// ─── Location search (Photon API) ───────────────────────────────────────────
async function searchLocation(query) {
  const resultsDiv = document.getElementById("location-results");
  
  if (!query || query.length < 2) {
    resultsDiv.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`);
    const data = await res.json();
    
    resultsDiv.innerHTML = data.features.map((f) => {
      const name = [f.properties.name, f.properties.city, f.properties.country]
        .filter(Boolean).join(', ');
      return `<div class="smc-loc-item"
        onclick="window.selectLocation(${f.geometry.coordinates[1]}, ${f.geometry.coordinates[0]}, '${name.replace(/'/g, "\\'")}')">
        ${name}
      </div>`;
    }).join('');
    
    resultsDiv.style.display = data.features.length ? 'block' : 'none';
  } catch (err) {
    console.error('Location search error:', err);
  }
}

window.selectLocation = (newLat, newLon, name) => {
  lat = newLat;
  lon = newLon;
  locationName = name;
  document.getElementById("location-search").value = name;
  document.getElementById("location-results").style.display = 'none';
  update();
};

function onLocate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    
    try {
      const res = await fetch(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`);
      const data = await res.json();
      const f = data.features[0];
      locationName = [f.properties.name, f.properties.city, f.properties.country]
        .filter(Boolean).join(', ') || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch {
      locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
    
    document.getElementById("location-search").value = locationName;
    update();
  });
}

// ─── Dragging ───────────────────────────────────────────────────────────────
function setupDrag() {
  let isDragging = false;
  let startX = 0;
  let startDate = null;
  const MS_PER_PX = 0.1 * 86400000; // 0.1 days per pixel

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startDate = new Date(currentDate);
    canvas.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    currentDate = new Date(startDate.getTime() - dx * MS_PER_PX);
    updateDateInputs();
    update();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  // Touch support
  canvas.addEventListener("touchstart", (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    startDate = new Date(currentDate);
  });

  canvas.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    currentDate = new Date(startDate.getTime() - dx * MS_PER_PX);
    updateDateInputs();
    update();
    e.preventDefault();
  });

  canvas.addEventListener("touchend", () => {
    isDragging = false;
  });
}

// ─── Sign name → cathedral filename ─────────────────────────────────────────
function signToCathedral(name) {
  if (name.toLowerCase() === 'capricorn') return 'capricornus';
  return name.toLowerCase();
}

// ─── Build comparison cards ─────────────────────────────────────────────────
function buildComparison() {
  const ph = document.querySelector("#comparison .placeholder");
  if (!ph) return;

  ph.innerHTML = `
    <style>
      .cmp-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 20px 16px 40px;
        box-sizing: border-box;
      }
      .cmp-card {
        position: relative;
        border-radius: 18px;
        overflow: hidden;
        flex-shrink: 0;
        aspect-ratio: 3 / 4;
      }
      /* Background image layer — zooms on hover */
      .cmp-bg {
        position: absolute;
        inset: -2px;
        background-size: cover;
        background-position: center top;
        border-radius: 20px;
        z-index: 0;
        transition: transform 0.85s ease;
      }
      .cmp-card:hover .cmp-bg { transform: scale(1.07); }
      /* Gradient overlay */
      .cmp-card::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        border-radius: 18px;
      }
      .cmp-card.astro-old::before {
        background: linear-gradient(to bottom,
          rgba(0,0,0,0.4) 0%,
          rgba(5,4,18,0.58) 55%,
          rgba(5,4,18,0.95) 100%);
      }
      .cmp-card.astro-real::before {
        background: linear-gradient(to bottom,
          rgba(0,0,0,0.18) 0%,
          rgba(5,4,18,0.36) 50%,
          rgba(5,4,18,0.9) 100%);
      }
      .cmp-card-inner {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 0 16px 22px;
      }
      /* Astrology card — faded, visually suppressed */
      .cmp-card.astro-old {
        width: 82%;
        max-width: 290px;
        filter: saturate(0.3) brightness(0.58);
        border: 1px solid rgba(120,110,90,0.22);
        z-index: 1;
        margin-bottom: -70px;
      }
      /* Astronomy card — dominant, animated */
      .cmp-card.astro-real {
        width: 96%;
        max-width: 345px;
        border: 1.5px solid rgba(212,175,55,0.55);
        z-index: 2;
        animation: cmp-float 10s ease-in-out infinite,
                   cmp-glow  10s ease-in-out infinite;
      }
      @keyframes cmp-float {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-9px); }
      }
      @keyframes cmp-glow {
        0%, 100% { box-shadow: 0 0 38px rgba(212,175,55,0.18), 0 22px 52px rgba(0,0,0,0.55); }
        50%       { box-shadow: 0 0 66px rgba(212,175,55,0.36), 0 32px 70px rgba(0,0,0,0.65); }
      }
      .cmp-bottom { text-align: center; }
      .cmp-name {
        font-family: 'Waterfall', cursive;
        font-size: 58px;
        line-height: 1;
        margin-bottom: 10px;
      }
      .astro-old .cmp-name { color: rgba(200,183,148,0.62); }
      .astro-real .cmp-name {
        color: #f4e4b7;
        text-shadow: 0 0 26px rgba(212,175,55,0.42);
      }
      .cmp-svg {
        width: 52px;
        height: 52px;
        display: block;
        margin: 0 auto;
      }
      .astro-old .cmp-svg { filter: invert(1); opacity: 0.32; }
      .astro-real .cmp-svg {
        filter: invert(76%) sepia(54%) saturate(438%) hue-rotate(5deg) brightness(98%);
        opacity: 0.88;
      }
      @media (min-width: 640px) {
        .cmp-wrap {
          flex-direction: row;
          align-items: flex-end;
          justify-content: center;
          gap: 0;
          padding: 28px 20px 40px;
        }
        .cmp-card.astro-old {
          width: 220px;
          max-width: 220px;
          margin-bottom: 0;
          margin-right: -14px;
          transform: scale(0.88);
          transform-origin: right bottom;
        }
        .cmp-card.astro-real {
          width: 285px;
          max-width: 285px;
        }
      }
    </style>

    <div class="cmp-wrap">
      <!-- Astrology card (tropical — old, faded, suppressed) -->
      <div class="cmp-card astro-old" id="cmp-astrology">
        <div class="cmp-bg" id="cmp-astrology-bg"></div>
        <div class="cmp-card-inner">
          <div class="cmp-bottom">
            <div id="tropical-name" class="cmp-name">—</div>
            <img id="tropical-svg" class="cmp-svg" src="" alt="">
          </div>
        </div>
      </div>

      <!-- Astronomy card (real — dominant, gold-accented) -->
      <div class="cmp-card astro-real" id="cmp-astronomy">
        <div class="cmp-bg" id="cmp-astronomy-bg"></div>
        <div class="cmp-card-inner">
          <div class="cmp-bottom">
            <div id="astro-name" class="cmp-name">—</div>
            <img id="astro-svg" class="cmp-svg" src="" alt="">
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Main update ────────────────────────────────────────────────────────────
function update() {
  if (!currentDate) return;

  const sun     = getSunPosition(currentDate);
  const astroId = getZodiacConstellation(sun.lon);
  const tropical = getTropicalSign(currentDate);
  const astro   = CONSTELLATION_NAMES[astroId];

  // Update comparison cards
  const tropName  = tropical.name;
  const astroName = astro.common;

  document.getElementById("tropical-name").textContent = tropName;
  document.getElementById("cmp-astrology-bg").style.backgroundImage =
    `url('/assets/cathedral/${signToCathedral(tropName)}.webp')`;
  document.getElementById("tropical-svg").src =
    `/assets/signs/${tropName.toLowerCase()}.svg`;

  document.getElementById("astro-name").textContent = astroName;
  document.getElementById("cmp-astronomy-bg").style.backgroundImage =
    `url('/assets/cathedral/${signToCathedral(astroName)}.webp')`;
  document.getElementById("astro-svg").src =
    `/assets/signs/${astroName.toLowerCase()}.svg`;

  // Compute celestial bodies
  const moon = getMoon(currentDate);

  const planets = {};
  PLANET_KEYS.forEach(p => { planets[p] = getPlanetPosition(p, currentDate); });

  const specials = {
    moon,
    lilith:    getLilith(currentDate),
    northNode: getNorthNode(currentDate),
    chiron:    getChiron(currentDate),
  };

  const { altitude } = getSolarAltAz(currentDate, lat, lon);

  // Draw star map (with drag offset applied to Sun RA)
  if (ctx && starData && constData) {
    drawStarMap(ctx, {
      stars: starData,
      constellations: constData,
      sunRA: sun.ra,
      sunDec: sun.dec,
      activeConstId: astroId,
      moon, planets, specials, altitude
    });
  }
}

// ─── Canvas resize (retina) ─────────────────────────────────────────────────
function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  update();
}