// src/astronomy.js
// Sun position, zodiac constellation detection, tropical sign lookup.
// No dependencies. Accuracy ~0.01° (sufficient for constellation detection).

// --- Helpers ---

function julianDate(date) {
  // Julian Date Number from a JS Date (UTC)
  return date.getTime() / 86400000 + 2440587.5;
}

function mod360(deg) {
  return ((deg % 360) + 360) % 360;
}

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

// --- Sun Position ---
// Returns { ra, dec, lon } in degrees.
// lon = ecliptic longitude (0° = vernal equinox)
// ra  = right ascension
// dec = declination
export function getSunPosition(date) {
  const jd = julianDate(date);
  const n = jd - 2451545.0; // days from J2000.0

  // Mean longitude & mean anomaly (degrees)
  const L = mod360(280.460 + 0.9856474 * n);
  const g = mod360(357.528 + 0.9856003 * n);
  const gRad = toRad(g);

  // Ecliptic longitude
  const lon = mod360(L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad));

  // Obliquity of the ecliptic
  const eps = 23.439 - 0.0000004 * n;
  const epsRad = toRad(eps);
  const lonRad = toRad(lon);

  // Convert ecliptic → equatorial
  const dec = toDeg(Math.asin(Math.sin(epsRad) * Math.sin(lonRad)));
  const ra = mod360(toDeg(Math.atan2(Math.cos(epsRad) * Math.sin(lonRad), Math.cos(lonRad))));

  return { ra, dec, lon };
}

// --- Zodiac Constellation Detection ---
// Boundaries defined by ecliptic longitude (IAU projected onto ecliptic).
// Order matters — checked sequentially.
const ZODIAC_BOUNDARIES = [
  { id: "Cap", from: 300.0, to: 327.0 },
  { id: "Aqr", from: 327.0, to: 351.6 },
  { id: "Psc", from: 351.6, to: 360.0 },  // Pisces wraps
  { id: "Psc", from:   0.0, to:  29.0 },
  { id: "Ari", from:  29.0, to:  53.5 },
  { id: "Tau", from:  53.5, to:  90.4 },
  { id: "Gem", from:  90.4, to: 118.1 },
  { id: "Cnc", from: 118.1, to: 138.1 },
  { id: "Leo", from: 138.1, to: 174.1 },
  { id: "Vir", from: 174.1, to: 217.8 },
  { id: "Lib", from: 217.8, to: 241.0 },
  { id: "Sco", from: 241.0, to: 247.7 },
  { id: "Oph", from: 247.7, to: 266.3 },
  { id: "Sgr", from: 266.3, to: 300.0 },
];

// Returns the IAU constellation id (e.g. "Leo", "Oph")
export function getZodiacConstellation(eclipticLon) {
  for (const z of ZODIAC_BOUNDARIES) {
    if (eclipticLon >= z.from && eclipticLon < z.to) return z.id;
  }
  return "Sgr"; // fallback
}

// --- Tropical (Astrological) Sign ---
// Traditional date ranges. Returns sign name.
const TROPICAL_SIGNS = [
  { name: "Capricorn",  symbol: "♑", from: [12, 22], to: [1, 19] },
  { name: "Aquarius",   symbol: "♒", from: [1, 20],  to: [2, 18] },
  { name: "Pisces",     symbol: "♓", from: [2, 19],  to: [3, 20] },
  { name: "Aries",      symbol: "♈", from: [3, 21],  to: [4, 19] },
  { name: "Taurus",     symbol: "♉", from: [4, 20],  to: [5, 20] },
  { name: "Gemini",     symbol: "♊", from: [5, 21],  to: [6, 20] },
  { name: "Cancer",     symbol: "♋", from: [6, 21],  to: [7, 22] },
  { name: "Leo",        symbol: "♌", from: [7, 23],  to: [8, 22] },
  { name: "Virgo",      symbol: "♍", from: [8, 23],  to: [9, 22] },
  { name: "Libra",      symbol: "♎", from: [9, 23],  to: [10, 22] },
  { name: "Scorpio",    symbol: "♏", from: [10, 23], to: [11, 21] },
  { name: "Sagittarius",symbol: "♐", from: [11, 22], to: [12, 21] },
];

export function getTropicalSign(date) {
  const m = date.getUTCMonth() + 1; // 1-12
  const d = date.getUTCDate();

  for (const s of TROPICAL_SIGNS) {
    const [fm, fd] = s.from;
    const [tm, td] = s.to;

    if (fm > tm) {
      // Wraps over year boundary (Capricorn: Dec 22 - Jan 19)
      if ((m === fm && d >= fd) || (m === tm && d <= td) || m > fm || m < tm) return s;
    } else {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm)) return s;
    }
  }
  return TROPICAL_SIGNS[11]; // fallback Sagittarius
}

// --- Constellation Display Names ---
export const CONSTELLATION_NAMES = {
  Cap: { name: "Capricornus", symbol: "♑", common: "Capricorn" },
  Aqr: { name: "Aquarius",   symbol: "♒", common: "Aquarius" },
  Psc: { name: "Pisces",     symbol: "♓", common: "Pisces" },
  Ari: { name: "Aries",      symbol: "♈", common: "Aries" },
  Tau: { name: "Taurus",     symbol: "♉", common: "Taurus" },
  Gem: { name: "Gemini",     symbol: "♊", common: "Gemini" },
  Cnc: { name: "Cancer",     symbol: "♋", common: "Cancer" },
  Leo: { name: "Leo",        symbol: "♌", common: "Leo" },
  Vir: { name: "Virgo",      symbol: "♍", common: "Virgo" },
  Lib: { name: "Libra",      symbol: "♎", common: "Libra" },
  Sco: { name: "Scorpius",   symbol: "♏", common: "Scorpio" },
  Oph: { name: "Ophiuchus",  symbol: "⚕", common: "Ophiuchus" },
  Sgr: { name: "Sagittarius",symbol: "♐", common: "Sagittarius" },
};

// --- Convenience: full result for a date ---
// Returns { tropical, astronomical, sun }
export function getFullResult(date) {
  const sun = getSunPosition(date);
  const astroId = getZodiacConstellation(sun.lon);
  return {
    tropical:     getTropicalSign(date),
    astronomical: CONSTELLATION_NAMES[astroId],
    sun
  };
}