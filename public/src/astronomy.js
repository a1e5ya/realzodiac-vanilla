// src/astronomy.js
// Sun, Moon, planets, special points, zodiac detection, solar alt/az.
// Planet positions are approximate (mean elements, circular orbits).
// Sun is accurate to ~0.01°. Good enough for visualization + zodiac detection.

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
function mod360(d) { return ((d % 360) + 360) % 360; }

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
function daysSinceJ2000(date) { return (date.getTime() - J2000) / 86400000; }

function obliquity(n) { return 23.439 - 0.0000004 * n; }

// Ecliptic lon → equatorial RA/Dec (assumes ecliptic lat = 0)
function eclToEq(lon, n) {
  const eps = toRad(obliquity(n));
  const l   = toRad(lon);
  return {
    ra:  mod360(toDeg(Math.atan2(Math.cos(eps) * Math.sin(l), Math.cos(l)))),
    dec: toDeg(Math.asin(Math.sin(eps) * Math.sin(l)))
  };
}

// ─── Sun ────────────────────────────────────────────────────────────────────
export function getSunPosition(date) {
  const n   = daysSinceJ2000(date);
  const L   = mod360(280.460 + 0.9856474 * n);
  const g   = toRad(mod360(357.528 + 0.9856003 * n));
  const lon = mod360(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  const { ra, dec } = eclToEq(lon, n);
  return { ra, dec, lon };
}

// ─── Moon ───────────────────────────────────────────────────────────────────
export function getMoon(date) {
  const knownNew = Date.UTC(2000, 0, 6, 18, 14, 0);
  const days     = (date.getTime() - knownNew) / 86400000;
  const synodic  = 29.53058867;

  let phase = (days % synodic) / synodic;
  if (phase < 0) phase += 1;

  const sun = getSunPosition(date);
  const ra  = mod360(sun.ra + (days % synodic) * 12.19);

  // Dec oscillates ±5.15° over draconic month
  const dec = 5.145 * Math.sin((days / 27.21222) * 2 * Math.PI);

  return { ra, dec, phase };
}

// ─── Planets (approximate geocentric) ──────────────────────────────────────
const EARTH_EL  = { a: 1.000, L0: 100.46, period: 365.256 };
const PLANET_EL = {
  mercury:  { a: 0.387,  L0: 252.25, period:  87.969  },
  venus:    { a: 0.723,  L0: 181.98, period: 224.701  },
  mars:     { a: 1.524,  L0: 355.45, period: 686.980  },
  jupiter:  { a: 5.203,  L0:  34.35, period: 4332.59  },
  saturn:   { a: 9.537,  L0:  50.08, period: 10759.2  },
  uranus:   { a: 19.19,  L0: 314.05, period: 30689.0  },
  neptune:  { a: 30.07,  L0: 304.97, period: 60182.0  },
};

function helioLon(el, n) { return toRad(mod360(el.L0 + (360 / el.period) * n)); }

export function getPlanetPosition(planet, date) {
  const el = PLANET_EL[planet];
  if (!el) return null;
  const n  = daysSinceJ2000(date);

  const Lp = helioLon(el, n);
  const Le = helioLon(EARTH_EL, n);

  const gx  = el.a * Math.cos(Lp) - EARTH_EL.a * Math.cos(Le);
  const gy  = el.a * Math.sin(Lp) - EARTH_EL.a * Math.sin(Le);
  const lon = mod360(toDeg(Math.atan2(gy, gx)));

  const { ra, dec } = eclToEq(lon, n);
  return { ra, dec, lon };
}

// ─── Special points ─────────────────────────────────────────────────────────
export function getNorthNode(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(125.04 - 0.05295 * n);
  const { ra, dec } = eclToEq(lon, n);
  return { ra, dec, lon };
}

export function getLilith(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(45.0 + (360 / 3232.6) * n);
  const { ra, dec } = eclToEq(lon, n);
  return { ra, dec, lon };
}

export function getChiron(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(120.5 + 0.01945 * n);
  const { ra, dec } = eclToEq(lon, n);
  return { ra, dec, lon };
}

// ─── Solar altitude / azimuth (for horizon rendering) ──────────────────────
export function getSolarAltAz(date, lat, lon) {
  const n   = daysSinceJ2000(date);
  const dec = 23.45 * Math.sin(toRad(mod360((360 / 365) * (n % 365 + 10))));

  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  const ha   = (utcH + lon / 15 - 12) * 15;

  const latR = toRad(lat), decR = toRad(dec), haR = toRad(ha);
  const sinAlt = Math.sin(latR) * Math.sin(decR) +
                 Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
  const altitude = toDeg(Math.asin(Math.max(-1, Math.min(1, sinAlt))));

  const cosAlt = Math.cos(toRad(altitude));
  let azimuth = 0;
  if (cosAlt > 0.001) {
    const sinAz = Math.cos(decR) * Math.sin(haR) / cosAlt;
    const cosAz = (Math.sin(decR) - Math.sin(latR) * sinAlt) / (Math.cos(latR) * cosAlt);
    azimuth = ((toDeg(Math.atan2(sinAz, cosAz)) % 360) + 360) % 360;
  }
  return { altitude, azimuth };
}

// ─── Zodiac detection ───────────────────────────────────────────────────────
const ZODIAC_BOUNDS = [
  { id:"Sgr", from:266.3, to:300.0 },
  { id:"Cap", from:300.0, to:327.0 },
  { id:"Aqr", from:327.0, to:351.6 },
  { id:"Psc", from:351.6, to:360.0 },
  { id:"Psc", from:  0.0, to: 29.0 },
  { id:"Ari", from: 29.0, to: 53.5 },
  { id:"Tau", from: 53.5, to: 90.4 },
  { id:"Gem", from: 90.4, to:118.1 },
  { id:"Cnc", from:118.1, to:138.1 },
  { id:"Leo", from:138.1, to:174.1 },
  { id:"Vir", from:174.1, to:217.8 },
  { id:"Lib", from:217.8, to:241.0 },
  { id:"Sco", from:241.0, to:247.7 },
  { id:"Oph", from:247.7, to:266.3 },
];

export function getZodiacConstellation(eclipticLon) {
  for (const z of ZODIAC_BOUNDS) {
    if (eclipticLon >= z.from && eclipticLon < z.to) return z.id;
  }
  return "Sgr";
}

// ─── Tropical sign ──────────────────────────────────────────────────────────
const TROPICAL = [
  { name:"Capricorn",   symbol:"♑", from:[12,22], to:[1,19]  },
  { name:"Aquarius",    symbol:"♒", from:[1,20],  to:[2,18]  },
  { name:"Pisces",      symbol:"♓", from:[2,19],  to:[3,20]  },
  { name:"Aries",       symbol:"♈", from:[3,21],  to:[4,19]  },
  { name:"Taurus",      symbol:"♉", from:[4,20],  to:[5,20]  },
  { name:"Gemini",      symbol:"♊", from:[5,21],  to:[6,20]  },
  { name:"Cancer",      symbol:"♋", from:[6,21],  to:[7,22]  },
  { name:"Leo",         symbol:"♌", from:[7,23],  to:[8,22]  },
  { name:"Virgo",       symbol:"♍", from:[8,23],  to:[9,22]  },
  { name:"Libra",       symbol:"♎", from:[9,23],  to:[10,22] },
  { name:"Scorpio",     symbol:"♏", from:[10,23], to:[11,21] },
  { name:"Sagittarius", symbol:"♐", from:[11,22], to:[12,21] },
];

export function getTropicalSign(date) {
  const m = date.getUTCMonth() + 1, d = date.getUTCDate();
  for (const s of TROPICAL) {
    const [fm, fd] = s.from, [tm, td] = s.to;
    if (fm > tm) {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || m > fm || m < tm) return s;
    } else {
      if ((m === fm && d >= fd) || (m === tm && d <= td) || (m > fm && m < tm)) return s;
    }
  }
  return TROPICAL[11];
}

// ─── Constellation names ────────────────────────────────────────────────────
export const CONSTELLATION_NAMES = {
  Cap: { name:"Capricornus",  symbol:"♑", common:"Capricorn"   },
  Aqr: { name:"Aquarius",    symbol:"♒", common:"Aquarius"    },
  Psc: { name:"Pisces",      symbol:"♓", common:"Pisces"      },
  Ari: { name:"Aries",       symbol:"♈", common:"Aries"       },
  Tau: { name:"Taurus",      symbol:"♉", common:"Taurus"      },
  Gem: { name:"Gemini",      symbol:"♊", common:"Gemini"      },
  Cnc: { name:"Cancer",      symbol:"♋", common:"Cancer"      },
  Leo: { name:"Leo",         symbol:"♌", common:"Leo"         },
  Vir: { name:"Virgo",       symbol:"♍", common:"Virgo"       },
  Lib: { name:"Libra",       symbol:"♎", common:"Libra"       },
  Sco: { name:"Scorpius",    symbol:"♏", common:"Scorpio"     },
  Oph: { name:"Ophiuchus",   symbol:"⚕", common:"Ophiuchus"   },
  Sgr: { name:"Sagittarius", symbol:"♐", common:"Sagittarius" },
};

// ─── Convenience ────────────────────────────────────────────────────────────
export function getFullResult(date) {
  const sun     = getSunPosition(date);
  const astroId = getZodiacConstellation(sun.lon);
  return {
    tropical:     getTropicalSign(date),
    astronomical: CONSTELLATION_NAMES[astroId],
    astroId,
    sun
  };
}