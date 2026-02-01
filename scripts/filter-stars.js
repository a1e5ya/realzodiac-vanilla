// scripts/filter-stars.js
// One-time script. Downloads star data from d3-celestial, filters, outputs to public/data/
// Usage: npm run filter

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "data");

// 13 zodiac constellations (IAU 3-letter codes)
const ZODIAC = [
  "Cap", "Aqr", "Psc", "Ari", "Tau", "Gem",
  "Cnc", "Leo", "Vir", "Lib", "Sco", "Oph", "Sgr"
];

// Ecliptic is tilted 23.4° to celestial equator.
// Keep stars within ±30° of ecliptic → dec range ≈ -53° to +53°
const DEC_MIN = -53;
const DEC_MAX = 53;

const STARS_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json";
const CONST_URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json";

async function main() {
  console.log("Downloading stars.6.json...");
  const starsRaw = await (await fetch(STARS_URL)).json();

  // stars.6.json is a GeoJSON FeatureCollection
  const allStars = starsRaw.features;
  console.log(`  Total stars: ${allStars.length}`);

  const filtered = allStars.filter(f => {
    const dec = f.geometry.coordinates[1];
    return dec >= DEC_MIN && dec <= DEC_MAX;
  });
  console.log(`  After ecliptic filter (dec ${DEC_MIN}° to ${DEC_MAX}°): ${filtered.length}`);

  starsRaw.features = filtered;
  writeFileSync(resolve(outDir, "stars.ecliptic.json"), JSON.stringify(starsRaw));
  console.log("  → public/data/stars.ecliptic.json");

  // --- Constellations ---
  console.log("\nDownloading constellations.lines.json...");
  const constRaw = await (await fetch(CONST_URL)).json();

  const allConst = constRaw.features;
  console.log(`  Total constellations: ${allConst.length}`);

  const zodiacConst = allConst.filter(f => ZODIAC.includes(f.id));
  console.log(`  Zodiac constellations kept: ${zodiacConst.map(f => f.id).join(", ")}`);

  constRaw.features = zodiacConst;
  writeFileSync(resolve(outDir, "constellations.zodiac.json"), JSON.stringify(constRaw));
  console.log("  → public/data/constellations.zodiac.json");

  console.log("\nDone.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});