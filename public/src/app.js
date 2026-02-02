// src/app.js

import { loadAll } from "./data.js";
import {
  getSunPosition, getZodiacConstellation, getTropicalSign, CONSTELLATION_NAMES,
  getMoon, getPlanetPosition, getNorthNode, getLilith, getChiron, getSolarAltAz
} from "./astronomy.js";
import { drawStarMap } from "./rendering.js";

// ─── State ──────────────────────────────────────────────────────────────────
let starData, constData, canvas, ctx, currentDate;
let lat = 60.17, lon = 24.94; // default: Helsinki

const PLANET_KEYS = ["mercury","venus","mars","jupiter","saturn","uranus","neptune"];

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  buildStarmap();
  buildComparison();

  const data = await loadAll();
  starData  = data.stars;
  constData = data.constellations;

  currentDate = new Date();
  document.getElementById("birth-date").value = fmtDate(currentDate);
  document.getElementById("birth-time").value = "12:00";
  document.getElementById("birth-lat").value  = lat.toFixed(2);
  document.getElementById("birth-lon").value  = lon.toFixed(2);

  update();
});

// ─── Build starmap section ──────────────────────────────────────────────────
function buildStarmap() {
  const ph = document.querySelector("#starmap .placeholder");
  if (!ph) return;

  const inp = `background:#111; color:#f4e4b7; border:1px solid rgba(212,175,55,0.3);
    border-radius:8px; padding:8px 12px; font-size:16px; font-family:'Zain',sans-serif;`;

  ph.innerHTML = `
    <div style="width:100%; display:flex; flex-direction:column; align-items:center; gap:20px;">
      <canvas id="starmap-canvas"
        style="width:100%; max-width:600px; aspect-ratio:1; border-radius:16px; background:#0a0a14;"></canvas>

      <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:center; max-width:600px; width:100%;">
        <label style="color:#f4e4b7; font-size:16px; min-width:40px;">Date</label>
        <input type="date" id="birth-date" style="${inp}">
        <label style="color:#f4e4b7; font-size:16px; min-width:40px;">Time</label>
        <input type="time" id="birth-time" style="${inp}">
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:center; max-width:600px; width:100%;">
        <label style="color:#f4e4b7; font-size:16px; min-width:28px;">Lat</label>
        <input type="number" id="birth-lat" step="0.01" style="${inp} max-width:110px;">
        <label style="color:#f4e4b7; font-size:16px; min-width:28px;">Lon</label>
        <input type="number" id="birth-lon" step="0.01" style="${inp} max-width:110px;">
        <button id="btn-locate" style="background:rgba(212,175,55,0.12); color:#d4af37;
          border:1px solid rgba(212,175,55,0.3); border-radius:8px; padding:8px 16px;
          font-size:14px; font-family:'Zain',sans-serif; cursor:pointer;">⦿ Locate me</button>
      </div>
    </div>`;

  canvas = document.getElementById("starmap-canvas");
  ctx    = canvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  document.getElementById("birth-date").addEventListener("input",  onInputChange);
  document.getElementById("birth-time").addEventListener("input",  onInputChange);
  document.getElementById("birth-lat").addEventListener("input",   onInputChange);
  document.getElementById("birth-lon").addEventListener("input",   onInputChange);
  document.getElementById("btn-locate").addEventListener("click",  onLocate);
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

// ─── Input handling ─────────────────────────────────────────────────────────
function onInputChange() {
  const d = document.getElementById("birth-date").value;
  const t = document.getElementById("birth-time").value || "12:00";
  lat = parseFloat(document.getElementById("birth-lat").value) || 0;
  lon = parseFloat(document.getElementById("birth-lon").value) || 0;
  if (!d) return;

  const [y, m, day]  = d.split("-").map(Number);
  const [h, min]     = t.split(":").map(Number);
  currentDate = new Date(Date.UTC(y, m - 1, day, h, min));
  update();
}

function onLocate() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    document.getElementById("birth-lat").value = lat.toFixed(2);
    document.getElementById("birth-lon").value = lon.toFixed(2);
    update();
  });
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

  // Draw star map
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
  // Setting .width/.height resets context state, so scale fresh
  ctx.scale(dpr, dpr);
  update();
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}