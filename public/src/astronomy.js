// src/astronomy.js
// Uses astronomy-engine (loaded globally via <script> tag) for Sun, Moon, planets.
// Special points (Lilith, Chiron, North Node) use mean-element approximations.
// Zodiac detection: ecliptic longitude → IAU constellation boundaries.

// astronomy-engine is loaded as window.Astronomy via script tag in index.html
const Astronomy = window.Astronomy;

// ─── Helpers ────────────────────────────────────────────────────────────────
const toRad  = d => d * Math.PI / 180;
const toDeg  = r => r * 180 / Math.PI;
const mod360 = d => ((d % 360) + 360) % 360;

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
function daysSinceJ2000(date) { return (date.getTime() - J2000_MS) / 86400000; }

// Ecliptic (lon, lat) → equatorial (RA, Dec). Obliquity 23.4393° is constant.
function eclToEq(lon, lat) {
  const eps = toRad(23.4393);
  const lonR = toRad(lon), latR = toRad(lat);
  const sinDec = Math.sin(latR) * Math.cos(eps) +
                 Math.cos(latR) * Math.sin(eps) * Math.sin(lonR);
  const dec = toDeg(Math.asin(Math.max(-1, Math.min(1, sinDec))));
  const ra  = mod360(toDeg(Math.atan2(
    Math.sin(lonR) * Math.cos(eps) - Math.tan(latR) * Math.sin(eps),
    Math.cos(lonR)
  )));
  return { ra, dec };
}

// ─── Sun (astronomy-engine) ─────────────────────────────────────────────────
export function getSunPosition(date) {
  const sp  = Astronomy.SunPosition(date);
  const lon = sp.elon;                         // ecliptic longitude
  const { ra, dec } = eclToEq(lon, 0);        // Sun is on ecliptic (lat=0)
  return { ra, dec, lon };
}

// ─── Moon (astronomy-engine) ────────────────────────────────────────────────
export function getMoon(date) {
  const vec = Astronomy.GeoVector('Moon', date, false);
  const ecl = Astronomy.Ecliptic(vec);
  const { ra, dec } = eclToEq(ecl.elon, ecl.elat);

  // MoonPhase: 0°=new, 180°=full. Convert to 0–1 (0=new, 0.5=full).
  const phase = mod360(Astronomy.MoonPhase(date)) / 360;

  return { ra, dec, phase };
}

// ─── Planets (astronomy-engine) ─────────────────────────────────────────────
const PLANET_BODY = {
  mercury:'Mercury', venus:'Venus', mars:'Mars',
  jupiter:'Jupiter', saturn:'Saturn', uranus:'Uranus', neptune:'Neptune'
};

export function getPlanetPosition(planet, date) {
  const body = PLANET_BODY[planet];
  if (!body) return null;
  const vec = Astronomy.GeoVector(body, date, false);
  const ecl = Astronomy.Ecliptic(vec);
  const { ra, dec } = eclToEq(ecl.elon, ecl.elat);
  return { ra, dec };
}

// ─── Special points (mean-element approximations) ──────────────────────────
export function getNorthNode(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(125.04 - 0.05295 * n);
  return { ...eclToEq(lon, 0), lon };
}

export function getLilith(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(45.0 + (360 / 3232.6) * n);
  return { ...eclToEq(lon, 0), lon };
}

export function getChiron(date) {
  const n   = daysSinceJ2000(date);
  const lon = mod360(120.5 + 0.01945 * n);
  return { ...eclToEq(lon, 0), lon };
}

// ─── Solar altitude / azimuth ───────────────────────────────────────────────
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
  let azimuth  = 0;
  if (cosAlt > 0.001) {
    const sinAz = Math.cos(decR) * Math.sin(haR) / cosAlt;
    const cosAz = (Math.sin(decR) - Math.sin(latR) * sinAlt) /
                  (Math.cos(latR) * cosAlt);
    azimuth = mod360(toDeg(Math.atan2(sinAz, cosAz)));
  }
  return { altitude, azimuth };
}

// ─── Zodiac detection (ecliptic longitude → IAU constellation) ──────────────
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