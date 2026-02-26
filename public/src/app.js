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
let dragOffset = 0; // horizontal drag offset for map rotation

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
    <div style="position:relative; width:100%; height:80vh; min-height:500px;">
      <canvas id="starmap-canvas" style="width:100%; height:100%; border-radius:12px; background:#0a0a14; cursor:grab;"></canvas>
      
      <div style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
        background:rgba(10,10,20,0.95); backdrop-filter:blur(10px); border:1px solid rgba(212,175,55,0.2);
        border-radius:12px; padding:12px; display:flex; gap:10px; flex-wrap:wrap; max-width:95%; justify-content:center;">
        
        <!-- Date controls -->
        <div style="display:flex; gap:4px; align-items:center;">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button id="day-up" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px 4px 0 0; cursor:pointer; color:#d4af37; font-size:10px;">▲</button>
            <input type="text" id="birth-day" style="width:32px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); text-align:center; font-size:13px; font-family:'Zain',sans-serif;">
            <button id="day-down" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:0 0 4px 4px; cursor:pointer; color:#d4af37; font-size:10px;">▼</button>
          </div>
          <span style="color:#666; margin-top:20px;">/</span>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button id="month-up" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px 4px 0 0; cursor:pointer; color:#d4af37; font-size:10px;">▲</button>
            <input type="text" id="birth-month" style="width:32px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); text-align:center; font-size:13px; font-family:'Zain',sans-serif;">
            <button id="month-down" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:0 0 4px 4px; cursor:pointer; color:#d4af37; font-size:10px;">▼</button>
          </div>
          <span style="color:#666; margin-top:20px;">/</span>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button id="year-up" style="width:52px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px 4px 0 0; cursor:pointer; color:#d4af37; font-size:10px;">▲</button>
            <input type="text" id="birth-year" style="width:52px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); text-align:center; font-size:13px; font-family:'Zain',sans-serif;">
            <button id="year-down" style="width:52px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:0 0 4px 4px; cursor:pointer; color:#d4af37; font-size:10px;">▼</button>
          </div>
        </div>

        <!-- Time controls -->
        <div style="display:flex; gap:4px; align-items:center;">
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button id="hour-up" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px 4px 0 0; cursor:pointer; color:#d4af37; font-size:10px;">▲</button>
            <input type="text" id="birth-hour" style="width:32px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); text-align:center; font-size:13px; font-family:'Zain',sans-serif;">
            <button id="hour-down" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:0 0 4px 4px; cursor:pointer; color:#d4af37; font-size:10px;">▼</button>
          </div>
          <span style="color:#666; margin-top:20px;">:</span>
          <div style="display:flex; flex-direction:column; align-items:center;">
            <button id="min-up" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:4px 4px 0 0; cursor:pointer; color:#d4af37; font-size:10px;">▲</button>
            <input type="text" id="birth-min" style="width:32px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); text-align:center; font-size:13px; font-family:'Zain',sans-serif;">
            <button id="min-down" style="width:32px; height:20px; background:rgba(212,175,55,0.15); border:1px solid rgba(212,175,55,0.3); border-radius:0 0 4px 4px; cursor:pointer; color:#d4af37; font-size:10px;">▼</button>
          </div>
        </div>

        <!-- Location -->
        <div style="position:relative;">
          <input type="text" id="location-search" placeholder="Search location..." 
            style="width:160px; height:28px; background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3); border-radius:6px; padding:0 8px; font-size:12px; font-family:'Zain',sans-serif;">
          <div id="location-results" style="position:absolute; bottom:100%; left:0; width:100%; max-height:150px; overflow-y:auto; background:#111; border:1px solid rgba(212,175,55,0.3); border-radius:6px; margin-bottom:4px; display:none;"></div>
        </div>

        <button id="btn-locate" style="height:28px; background:rgba(212,175,55,0.15); color:#d4af37;
          border:1px solid rgba(212,175,55,0.4); border-radius:6px; padding:0 12px;
          font-size:12px; font-family:'Zain',sans-serif; cursor:pointer; white-space:nowrap;">⦿ Locate</button>
        
        <button id="btn-now" style="height:28px; background:rgba(212,175,55,0.15); color:#d4af37;
          border:1px solid rgba(212,175,55,0.4); border-radius:6px; padding:0 12px;
          font-size:12px; font-family:'Zain',sans-serif; cursor:pointer;">Now</button>
      </div>
    </div>`;

  canvas = document.getElementById("starmap-canvas");
  ctx = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // Date/time button controls
  document.getElementById("day-up").addEventListener("click", () => adjustDate('day', 1));
  document.getElementById("day-down").addEventListener("click", () => adjustDate('day', -1));
  document.getElementById("month-up").addEventListener("click", () => adjustDate('month', 1));
  document.getElementById("month-down").addEventListener("click", () => adjustDate('month', -1));
  document.getElementById("year-up").addEventListener("click", () => adjustDate('year', 1));
  document.getElementById("year-down").addEventListener("click", () => adjustDate('year', -1));
  document.getElementById("hour-up").addEventListener("click", () => adjustDate('hour', 1));
  document.getElementById("hour-down").addEventListener("click", () => adjustDate('hour', -1));
  document.getElementById("min-up").addEventListener("click", () => adjustDate('minute', 1));
  document.getElementById("min-down").addEventListener("click", () => adjustDate('minute', -1));

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
    
    resultsDiv.innerHTML = data.features.map((f, i) => {
      const name = [f.properties.name, f.properties.city, f.properties.country]
        .filter(Boolean).join(', ');
      return `<div style="padding:8px; cursor:pointer; border-bottom:1px solid rgba(212,175,55,0.1); font-size:11px; color:#f4e4b7;" 
        onmouseover="this.style.background='rgba(212,175,55,0.1)'" 
        onmouseout="this.style.background='transparent'"
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
  let startOffset = 0;

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startOffset = dragOffset;
    canvas.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    dragOffset = startOffset + dx * 0.1; // adjust sensitivity
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
    startOffset = dragOffset;
  });

  canvas.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - startX;
    dragOffset = startOffset + dx * 0.1;
    update();
    e.preventDefault();
  });

  canvas.addEventListener("touchend", () => {
    isDragging = false;
  });
}

// ─── Build comparison cards ─────────────────────────────────────────────────
function buildComparison() {
  const ph = document.querySelector("#comparison .placeholder");
  if (!ph) return;

  ph.innerHTML = `
    <div style="display:flex; gap:24px; justify-content:center; flex-wrap:wrap; max-width:800px; margin:0 auto;">
      <div style="flex:1; min-width:240px; background:rgba(20,20,40,0.8);
            border:1px solid rgba(212,175,55,0.2); border-radius:16px; padding:32px; text-align:center;">
        <div style="color:rgba(244,228,183,0.5); font-size:14px; text-transform:uppercase;
              letter-spacing:2px; margin-bottom:16px;">Astrology Says</div>
        <div id="tropical-symbol" style="font-size:48px; margin-bottom:8px;"></div>
        <div id="tropical-name"   style="font-family:'Waterfall',cursive; font-size:36px; color:#f4e4b7;"></div>
        <div style="color:rgba(244,228,183,0.4); font-size:13px; margin-top:12px;">Based on 2,000-year-old positions</div>
      </div>
      <div style="flex:1; min-width:240px; background:rgba(20,20,40,0.8);
            border:1px solid rgba(212,175,55,0.5); border-radius:16px; padding:32px; text-align:center;
            box-shadow:0 0 30px rgba(212,175,55,0.1);">
        <div style="color:#d4af37; font-size:14px; text-transform:uppercase;
              letter-spacing:2px; margin-bottom:16px;">Astronomy Says</div>
        <div id="astro-symbol" style="font-size:48px; color:#d4af37; margin-bottom:8px;"></div>
        <div id="astro-name"   style="font-family:'Waterfall',cursive; font-size:36px; color:#d4af37;"></div>
        <div style="color:rgba(212,175,55,0.5); font-size:13px; margin-top:12px;">Where the Sun actually was</div>
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
  document.getElementById("tropical-symbol").textContent = tropical.symbol;
  document.getElementById("tropical-name").textContent   = tropical.name;
  document.getElementById("astro-symbol").textContent    = astro.symbol;
  document.getElementById("astro-name").textContent      = astro.common;

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
      sunRA: sun.ra + dragOffset,
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