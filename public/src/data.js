// src/data.js
// Loads star and constellation data from public/data/

let stars = null;
let constellations = null;

export async function loadStars() {
  if (stars) return stars;
  const res = await fetch("/data/stars.ecliptic.json");
  const geojson = await res.json();
  // Flatten to array of { ra, dec, mag, bv }
  stars = geojson.features.map(f => ({
    ra:  f.geometry.coordinates[0],
    dec: f.geometry.coordinates[1],
    mag: f.properties.mag,
    bv:  f.properties.bv
  }));
  return stars;
}

export async function loadConstellations() {
  if (constellations) return constellations;
  const res = await fetch("/data/constellations.zodiac.json");
  const geojson = await res.json();
  // Map to { id, lines: [[[ra,dec], [ra,dec], ...], ...] }
  constellations = geojson.features.map(f => ({
    id:    f.id ?? f.properties?.id,
    lines: f.geometry.coordinates
  }));
  return constellations;
}

export async function loadAll() {
  const [s, c] = await Promise.all([loadStars(), loadConstellations()]);
  return { stars: s, constellations: c };
}