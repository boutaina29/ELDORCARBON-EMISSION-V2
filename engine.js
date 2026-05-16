// ════════════════════════════════════════════════════════════
//  LOGISTICS CARBON ROUTING — DATA + GEO ENGINE
//  Pure JS (no JSX) — exposes window.RoutingEngine
//
//  Notes on accuracy:
//  • Sea spines hand-traced through navigable water only
//    (no land crossings, follows real shipping lanes).
//  • Road spines follow real European E-roads / Turkish O-roads;
//    Bosphorus & Gulf of İzmit only crossed where a bridge/tunnel
//    actually exists.
//  • Rail spines follow real freight corridors (Tauern, Brenner,
//    Pontebbana, Middle Corridor / BTK railway).
// ════════════════════════════════════════════════════════════

function buildPath(wps, step = 90) {
  const out = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const n = Math.max(2, Math.round(haversineKm(a, b) / step));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      out.push([a[0] * (1 - t) + b[0] * t, a[1] * (1 - t) + b[1] * t]);
    }
  }
  out.push(wps[wps.length - 1]);
  return out;
}

const LOCATIONS = {
  "Aliağa Port":  [38.80, 26.97],
  "Alsancak Port":[38.4385, 27.1430], // İzmir Limanı — central İzmir, inner bay
  "ESBAŞ":        [38.31, 27.13], // Gaziemir, İzmir — Ege Serbest Bölgesi
  "Çeşme":        [38.32, 26.30],
  "Jiangsu": [32.06, 118.80], "Shanghai": [31.23, 121.47], 
  "Ningbo": [29.87, 121.55], "Shenzhen": [22.54, 114.06],
  "Xi'an": [34.27, 108.93],
  "Genoa": [44.41, 8.93], "Milan": [45.46, 9.19],
  "Bologna": [44.50, 11.34], "Trieste": [45.65, 13.77],
  "Munich":   [48.14, 11.58], "Frankfurt": [50.11, 8.68],
  "Hamburg":  [53.55, 9.99],
};

const RISK_ZONES = [
  { name: "Gulf of Aden", center: [12.0, 47.0], radiusKm: 500, level: "High" },
  { name: "Suez Canal",   center: [30.5, 32.5], radiusKm: 280, level: "Medium" },
  { name: "Strait of Malacca", center: [2.5, 102.5], radiusKm: 320, level: "Medium" },
];

function haversineKm(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b[0] - a[0]), dLon = r(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function segDist(pts) {
  if (!pts || pts.length < 2) return 0;
  let d = 0; for (let i = 1; i < pts.length; i++) d += haversineKm(pts[i - 1], pts[i]);
  return Math.round(d);
}
// segLen prefers a tagged .realKm (Google Maps verified) if present —
// great-circle interpolation can't capture motorway tortuosity.
function segLen(pts) {
  if (pts && pts.realKm != null) return Math.round(pts.realKm);
  return segDist(pts);
}
function analyseRisks(pts) {
  const hit = [];
  for (const z of RISK_ZONES)
    if (pts.some(p => haversineKm(p, z.center) <= z.radiusKm)) hit.push({ name: z.name, level: z.level });
  const level = hit.some(z => z.level === "High") ? "High" : hit.some(z => z.level === "Medium") ? "Medium" : "Low";
  return { risks: hit, riskLevel: level };
}

// ─── Shared maritime spines ────────────────────────────────
// Aegean leaving Aliağa (north→south), staying in open water, going AROUND Karaburun Peninsula.
const AGN = [
  [38.80, 26.97],          // Aliağa Port
  [38.75, 26.90],          // offshore from Aliağa (water)
  [38.65, 26.75],          // W of Foça (open water)
  [38.50, 26.60],          // NW of Karaburun tip (water)
  [38.35, 26.50],          // W of Karaburun Peninsula (offshore)
  [38.15, 26.48],          // SW of Karaburun (open Aegean)
  [38.00, 26.50],          // Chios channel (water)
  [37.60, 26.70],          // between Chios and coast (water)
  [37.20, 27.00],          // Ikaria–Samos passage (open water)
  [36.80, 27.30],          // Kos channel (water)
  [36.30, 27.70],          // S of Rhodes (open sea)
  [36.20, 28.10],          // Carpathian Sea entry
];
const AGS = [...AGN].reverse();

// Aegean leaving Alsancak (İzmir Limanı): exits inner İzmir Bay westward,
// goes AROUND Karaburun Peninsula in open water, then south through Greek islands.
const AGN_ALSANCAK = [
  [38.4385, 27.1430],      // Alsancak Port (İzmir)
  [38.45, 27.00],          // mid inner bay (off Karşıyaka / Bayraklı)
  [38.50, 26.85],          // Yenikale narrows (inner→outer İzmir Bay)
  [38.55, 26.65],          // outer bay (between Foça N & Karaburun S)
  [38.52, 26.55],          // NW approach to Karaburun (water)
  [38.45, 26.48],          // W of Karaburun tip (offshore)
  [38.35, 26.46],          // SW of Karaburun (open Aegean water)
  [38.20, 26.48],          // open Aegean, completely offshore
  [38.00, 26.50],          // Chios channel (water)
  [37.60, 26.70],          // between Chios and coast (water)
  [37.20, 27.00],          // Ikaria–Samos passage
  [36.80, 27.30],          // Kos channel
  [36.30, 27.70],          // S of Rhodes
  [36.20, 28.10],          // Carpathian Sea entry
];
const AGS_ALSANCAK = [...AGN_ALSANCAK].reverse();

// Aegean leaving Çeşme (RoRo) — exits Çeşme harbor, goes AROUND Karaburun Peninsula offshore
const CESME_AGN = [
  [38.32, 26.30],          // Çeşme Port
  [38.28, 26.25],          // offshore from Çeşme (water)
  [38.22, 26.35],          // SW of Karaburun (staying in water)
  [38.15, 26.45],          // W of Karaburun Peninsula (open water)
  [38.05, 26.48],          // SW of peninsula (offshore)
  [38.00, 26.50],          // Chios channel (water)
  [37.60, 26.65],          // S of Chios (open water)
  [37.20, 26.95],          // Ikaria–Samos area (water)
  [36.80, 27.25],          // S of Kos (water)
  [36.30, 27.70],          // S of Rhodes (open sea)
  [36.20, 28.10],          // join Carpathian Sea
];
const CESME_AGS = [...CESME_AGN].reverse();

// Cretan Sea — south of Crete, navigable open water
const CRETAN = [
  [36.20, 28.10],          // E entry (between Crete & Rhodes)
  [35.70, 26.00],          // S of Crete
  [35.40, 24.00],          // S of Crete
  [35.70, 22.50],          // SW of Crete
  [36.38, 22.49],          // S of Methoni (Peloponnese)
];
const CRETAN_R = [...CRETAN].reverse();

// Ionian Sea — between Greece (E) and S Italy (W)
const IONIAN = [
  [36.38, 22.49],          // off Methoni
  [37.00, 21.20],          // Ionian
  [37.80, 20.40],          // Ionian
  [38.70, 19.80],          // off Cephalonia/Lefkada
  [39.50, 19.40],          // Otranto Strait approach (off Corfu)
  [40.10, 19.30],          // S of Otranto Strait
];

// ─── Sea corridors (China-bound & EU-bound) ────────────────
// Suez route: Shanghai → Malacca → Indian Ocean → Red Sea → Mediterranean → Aliağa
function corridorSuez() {
  return buildPath([
    [31.23, 121.47],         // Shanghai Port
    [30.85, 121.85],         // offshore Shanghai
    [29.50, 122.50],         // East China Sea (staying in water)
    [27.50, 122.00],         // E of Taiwan (open ocean)
    [24.50, 121.20],         // E of Taiwan strait
    [22.00, 120.80],         // Luzon Strait approach
    [19.50, 120.50],         // Luzon Strait
    [17.00, 119.00],         // South China Sea (open water)
    [14.00, 116.00],         // South China Sea central
    [10.50, 112.50],         // South China Sea south
    [7.00, 109.50],          // approaching SE Asia
    [4.50, 107.00],          // South China Sea south approach
    [2.50, 105.00],          // Singapore Strait approach (water)
    [1.25, 103.82],          // Singapore Strait (navigable channel)
    [2.00, 101.50],          // Malacca Strait north
    [4.00, 98.50],           // Malacca Strait (staying in strait)
    [6.50, 95.50],           // Andaman Sea
    [8.50, 91.00],           // Bay of Bengal
    [8.00, 87.00],           // Indian Ocean central
    [5.00, 80.00],           // Indian Ocean (open water)
    [2.00, 73.00],           // approaching Maldives area
    [-2.00, 68.00],          // S Indian Ocean
    [-4.00, 63.00],          // Indian Ocean west
    [-2.00, 58.00],          // approaching Arabian Sea
    [3.00, 56.00],           // Arabian Sea south
    [8.00, 54.00],           // Arabian Sea central
    [11.50, 51.00],          // Gulf of Aden approach
    [12.00, 48.00],          // Gulf of Aden (staying in water)
    [12.50, 45.50],          // Bab al-Mandab (strait - water)
    [13.50, 43.50],          // Red Sea south
    [16.00, 40.50],          // Red Sea central
    [20.00, 38.50],          // Red Sea north-central
    [24.00, 36.50],          // Red Sea north
    [27.50, 34.00],          // Gulf of Suez (water)
    [30.00, 32.80],          // Suez Canal south
    [31.00, 32.35],          // Suez Canal (navigable water)
    [31.50, 32.30],          // Suez Canal north
    [32.30, 32.30],          // Port Said (Med entry)
    [33.50, 31.00],          // E Mediterranean (open water)
    [34.50, 29.50],          // E Med (staying offshore)
    [35.50, 28.00],          // off Crete/Rhodes (water)
    [36.20, 28.10],          // Carpathian Sea entry
    ...CRETAN_R.slice(-1),                            // continuity
    ...AGS,
  ]);
}
function corridorCape() {
  return buildPath([
    [31.23, 121.47],         // Shanghai Port
    [30.85, 121.85],         // offshore Shanghai
    [29.50, 122.50],         // East China Sea (water)
    [27.50, 122.00],         // E of Taiwan (ocean)
    [24.50, 121.20],         // E of Taiwan strait
    [22.00, 120.80],         // Luzon Strait approach
    [19.50, 120.50],         // Luzon Strait
    [17.00, 119.00],         // South China Sea
    [14.00, 116.00],         // South China Sea
    [10.50, 112.50],         // South China Sea
    [7.00, 109.50],          // approaching SE Asia
    [4.50, 107.00],          // South China Sea south
    [2.50, 105.00],          // Singapore approach
    [1.25, 103.82],          // Singapore Strait
    [2.00, 101.50],          // Malacca Strait
    [4.00, 98.50],           // Malacca Strait
    [6.50, 95.50],           // Andaman Sea
    [5.00, 90.00],           // Bay of Bengal (water)
    [2.00, 85.00],           // Indian Ocean (staying offshore)
    [-3.00, 78.00],          // Indian Ocean south
    [-8.00, 72.00],          // S Indian Ocean
    [-15.00, 68.00],         // SW Indian Ocean
    [-22.00, 62.00],         // S of Maldives (open ocean)
    [-28.00, 55.00],         // SW Indian Ocean
    [-32.00, 45.00],         // S of Madagascar (water)
    [-34.00, 35.00],         // approaching southern Africa
    [-34.50, 25.00],         // off South Africa E coast
    [-34.40, 18.50],         // Cape of Good Hope (offshore)
    [-32.00, 14.00],         // Atlantic off Cape
    [-28.00, 10.00],         // S Atlantic (open water)
    [-22.00, 5.00],          // S Atlantic
    [-15.00, 0.00],          // S Atlantic central
    [-8.00, -5.00],          // S Atlantic
    [0.00, -10.00],          // Equatorial Atlantic (water)
    [8.00, -14.00],          // off W Africa (offshore)
    [16.00, -17.00],         // W African coast (water)
    [24.00, -18.00],         // off Mauritania
    [30.00, -14.00],         // off Morocco (ocean)
    [34.00, -9.50],          // approaching Gibraltar (water)
    [35.98, -5.36],          // Strait of Gibraltar (navigable)
    [36.50, -2.00],          // Alboran Sea (water)
    [37.00, 1.00],           // Algerian Sea (offshore)
    [37.50, 5.00],           // Algerian Sea
    [37.80, 9.00],           // Sicily Channel approach (water)
    [37.50, 12.00],          // Sicily Channel (S of Sicily, water)
    [36.80, 15.50],          // Ionian Sea (open water)
    [36.30, 18.50],          // Ionian Sea
    [36.00, 21.00],          // S of Greece (water)
    ...CRETAN_R.slice(1, -1),
    [36.20, 28.10],
    ...AGS,
  ]);
}
// Same Cape transit, terminating at Alsancak (İzmir Limanı) instead of Aliağa.
// Only the Aegean approach differs — the long-haul ocean spine is identical.
function corridorCapeAlsancak() {
  return buildPath([
    [31.23, 121.47],         // Shanghai Port
    [30.85, 121.85],         // offshore Shanghai
    [29.50, 122.50],         // East China Sea (water)
    [27.50, 122.00],         // E of Taiwan (ocean)
    [24.50, 121.20],         // E of Taiwan strait
    [22.00, 120.80],         // Luzon Strait approach
    [19.50, 120.50],         // Luzon Strait
    [17.00, 119.00],         // South China Sea
    [14.00, 116.00],         // South China Sea
    [10.50, 112.50],         // South China Sea
    [7.00, 109.50],          // approaching SE Asia
    [4.50, 107.00],          // South China Sea south
    [2.50, 105.00],          // Singapore approach
    [1.25, 103.82],          // Singapore Strait
    [2.00, 101.50],          // Malacca Strait
    [4.00, 98.50],           // Malacca Strait
    [6.50, 95.50],           // Andaman Sea
    [5.00, 90.00],           // Bay of Bengal (water)
    [2.00, 85.00],           // Indian Ocean (staying offshore)
    [-3.00, 78.00],          // Indian Ocean south
    [-8.00, 72.00],          // S Indian Ocean
    [-15.00, 68.00],         // SW Indian Ocean
    [-22.00, 62.00],         // S of Maldives (open ocean)
    [-28.00, 55.00],         // SW Indian Ocean
    [-32.00, 45.00],         // S of Madagascar (water)
    [-34.00, 35.00],         // approaching southern Africa
    [-34.50, 25.00],         // off South Africa E coast
    [-34.40, 18.50],         // Cape of Good Hope (offshore)
    [-32.00, 14.00],         // Atlantic off Cape
    [-28.00, 10.00],         // S Atlantic (open water)
    [-22.00, 5.00],          // S Atlantic
    [-15.00, 0.00],          // S Atlantic central
    [-8.00, -5.00],          // S Atlantic
    [0.00, -10.00],          // Equatorial Atlantic (water)
    [8.00, -14.00],          // off W Africa (offshore)
    [16.00, -17.00],         // W African coast (water)
    [24.00, -18.00],         // off Mauritania
    [30.00, -14.00],         // off Morocco (ocean)
    [34.00, -9.50],          // approaching Gibraltar (water)
    [35.98, -5.36],          // Strait of Gibraltar (navigable)
    [36.50, -2.00],          // Alboran Sea (water)
    [37.00, 1.00],           // Algerian Sea (offshore)
    [37.50, 5.00],           // Algerian Sea
    [37.80, 9.00],           // Sicily Channel approach (water)
    [37.50, 12.00],          // Sicily Channel (S of Sicily, water)
    [36.80, 15.50],          // Ionian Sea (open water)
    [36.30, 18.50],          // Ionian Sea
    [36.00, 21.00],          // S of Greece (water)
    ...CRETAN_R.slice(1, -1),
    [36.20, 28.10],
    ...AGS_ALSANCAK,
  ]);
}
// BRI Caspian ferry spine: Aktau (Kazakhstan) → Baku (Azerbaijan) across the Caspian Sea.
// This is the Trans-Caspian International Transport Route (TITR) ferry — real sea infrastructure.
const CASPIAN_FERRY = [
  [43.65, 51.17],    // Aktau port (Kazakhstan, Caspian E coast)
  [42.50, 50.80],    // Caspian Sea mid-south (open water)
  [41.30, 50.20],    // approaching Baku (staying in Caspian)
  [40.41, 49.87],    // Baku port (Azerbaijan, Caspian W coast)
];

// BRI rail leg 1: Xi'an → Aktau (overland rail)
function corridorBRI_rail1() {
  return buildPath([
    [34.27, 108.93],   // Xi'an
    [36.06, 103.79],   // Lanzhou
    [40.50, 95.00],    // Hexi Corridor
    [43.79, 87.60],    // Urumqi
    [44.20, 80.40],    // Khorgos border (CN/KZ)
    [43.26, 76.95],    // Almaty
    [44.85, 65.50],    // Kzylorda
    [43.65, 51.17],    // Aktau (Caspian E coast)
  ], 75);
}

// BRI rail leg 2: Baku → ESBAŞ (overland rail via BTK)
function corridorBRI_rail2() {
  return buildPath([
    [40.41, 49.87],    // Baku (Caspian W coast)
    [41.69, 44.83],    // Tbilisi
    [41.20, 41.65],    // Akhalkalaki / border
    [40.60, 43.10],    // Kars
    [39.90, 41.27],    // Erzurum
    [39.74, 37.02],    // Sivas
    [39.93, 32.85],    // Ankara
    [38.79, 30.55],    // Afyon
    [38.62, 27.43],    // Manisa
    [38.31, 27.13],    // ESBAŞ
  ], 75);
}

function corridorBRI() {
  // Middle Corridor / BTK: Xi'an → Almaty → Aktau ⟶ Caspian ferry ⟶ Baku → BTK rail → İzmir.
  // Concatenates both rail legs with Caspian ferry waypoints in the middle.
  return buildPath([
    [34.27, 108.93],   // Xi'an
    [36.06, 103.79],   // Lanzhou
    [40.50, 95.00],    // Hexi Corridor
    [43.79, 87.60],    // Urumqi
    [44.20, 80.40],    // Khorgos border (CN/KZ)
    [43.26, 76.95],    // Almaty
    [44.85, 65.50],    // Kzylorda
    [43.65, 51.17],    // Aktau (Caspian E coast)
    [42.50, 50.80],    // Caspian Sea (ferry — stays in water)
    [41.30, 50.20],    // Caspian Sea (ferry continues)
    [40.41, 49.87],    // Baku (Caspian W coast)
    [41.69, 44.83],    // Tbilisi
    [41.20, 41.65],    // Akhalkalaki / border
    [40.60, 43.10],    // Kars
    [39.90, 41.27],    // Erzurum
    [39.74, 37.02],    // Sivas
    [39.93, 32.85],    // Ankara
    [38.79, 30.55],    // Afyon
    [38.62, 27.43],    // Manisa
    [38.31, 27.13],    // ESBAŞ
  ], 75);
}

// ─── EU sea / RoRo corridors (Mediterranean) ───────────────
// Cesme → Trieste (Adriatic): hugs E Adriatic, all open water.
function corridorCesmeTrieste() {
  return buildPath([
    ...CESME_AGN,
    ...CRETAN.slice(1),
    ...IONIAN.slice(1),
    [41.20, 18.50],        // off Albanian coast
    [42.30, 17.50],        // off S Croatian coast
    [43.50, 14.80],        // mid-Adriatic
    [44.80, 13.40],        // Istria offshore
    [45.65, 13.77],        // Trieste
  ]);
}
function corridorTriesteCesme() { return [...corridorCesmeTrieste()].reverse(); }

// Aliağa → Trieste (container vessel; same Adriatic spine)
function corridorAliagaTrieste() {
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    ...IONIAN.slice(1),
    [41.20, 18.50], [42.30, 17.50], [43.50, 14.80],
    [44.80, 13.40], [45.65, 13.77],
  ]);
}

// Aliağa → Genoa: through Cretan Sea, Strait of Messina, Tyrrhenian Sea (east of Sardinia), Ligurian.
// Route stays east of Sardinia (lon > 10.5 while lat 38.8–41.3) to avoid crossing the island.
function corridorAliagaGenoa() {
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    [36.38, 22.49],
    [36.50, 19.00],         // Ionian
    [37.40, 15.60],         // approaching Strait of Messina
    [38.00, 15.65],         // Strait of Messina (water between Sicily & Calabria toe)
    [38.60, 15.10],         // N of Messina, Tyrrhenian entry
    [39.00, 14.20],         // Tyrrhenian Sea (clear of Sardinia E coast at ~lon 9.8)
    [39.80, 13.00],         // central Tyrrhenian (well east of Sardinia)
    [40.80, 12.00],         // N Tyrrhenian (Sardinia north tip at lat 41.2)
    [41.50, 11.20],         // off Civitavecchia / Rome coast
    [42.60, 10.50],         // off Piombino / Elba
    [43.50, 9.80],          // Ligurian Sea approach
    [44.41, 8.93],          // Genoa
  ]);
}
function corridorGenoaAliaga() { return [...corridorAliagaGenoa()].reverse(); }

// Aliağa → Hamburg: through Med (Sicily Channel), Gibraltar,
// up the Atlantic, English Channel, North Sea, Elbe.
function corridorAliagaHamburg() {
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    [36.38, 22.49],
    [36.00, 19.00],          // Ionian S
    [36.50, 16.00],          // S of Sicily
    [37.10, 13.00],          // Strait of Sicily
    [37.30, 10.00],          // off Tunisia
    [37.50, 6.00],           // Algerian Sea
    [36.50, 0.00],           // Alboran approach
    [36.10, -3.00],          // Alboran Sea
    [35.98, -5.36],          // Gibraltar
    [37.00, -9.50],          // off Portugal (Lisbon)
    [42.00, -10.50],         // off Atlantic Iberia
    [46.50, -7.50],          // Bay of Biscay
    [49.50, -3.00],          // Western Channel
    [50.80, 1.20],           // Dover Strait
    [52.50, 3.00],           // S North Sea
    [54.10, 7.00],           // German Bight
    [53.87, 8.71],           // Cuxhaven (Elbe mouth)
    [53.55, 9.99],           // Hamburg
  ]);
}

// ─── Road spines (overland, real highways) ─────────────────
// Each road carries `realKm` — the Google Maps-verified driving distance
// for the corresponding motorway. The waypoint polyline is a schematic
// representation; reported distance & emissions use realKm. This is
// standard practice in logistics platforms (great-circle interpolation
// cannot capture real motorway tortuosity through mountains/cities).

// ESBAŞ ↔ Alsancak Port: D300/D550 south through Buca to Konak waterfront (per map 17 km).
// Traced from screenshot showing route through central İzmir
const RD_ESBAS_ALSANCAK = [
  [38.31, 27.13],          // ESBAŞ (Gaziemir)
  [38.33, 27.14],          // north from ESBAŞ
  [38.36, 27.15],          // Buca interchange
  [38.38, 27.15],          // Buca center
  [38.40, 27.14],          // approaching Konak
  [38.42, 27.14],          // Konak area
  [38.4385, 27.1430],      // Alsancak Port
];
RD_ESBAS_ALSANCAK.realKm = 17;
const RD_ALSANCAK_ESBAS = [...RD_ESBAS_ALSANCAK].reverse();
RD_ALSANCAK_ESBAS.realKm = 17;

// ESBAŞ ↔ Aliağa Port: O-33/D300 north via Bornova, Karşıyaka, Menemen (per map 86.8 km).
// Traced from screenshot showing coastal route north
const RD_ESBAS_ALIAGA = [
  [38.31, 27.13],          // ESBAŞ (Gaziemir)
  [38.34, 27.16],          // northeast from ESBAŞ
  [38.37, 27.18],          // approaching Bornova
  [38.40, 27.19],          // Bornova center
  [38.43, 27.18],          // Bornova north
  [38.46, 27.16],          // approaching Karşıyaka
  [38.49, 27.14],          // Karşıyaka area
  [38.52, 27.11],          // Çiğli area
  [38.56, 27.09],          // between Çiğli-Menemen
  [38.60, 27.08],          // Menemen south
  [38.64, 27.06],          // Menemen north
  [38.68, 27.03],          // between Menemen-Aliağa
  [38.72, 27.01],          // Aliağa south approach
  [38.76, 26.99],          // Aliağa town
  [38.80, 26.97],          // Aliağa Port
];
RD_ESBAS_ALIAGA.realKm = 88;
const RD_ALIAGA_ESBAS = [...RD_ESBAS_ALIAGA].reverse();
RD_ALIAGA_ESBAS.realKm = 88;

// ESBAŞ ↔ Çeşme: O-32 İzmir-Çeşme Otoyolu via Güzelbahçe & Urla (87 km).
// Follows coastal motorway west
const RD_ESBAS_CESME = [
  [38.31, 27.13],          // ESBAŞ
  [38.32, 27.09],          // west from ESBAŞ
  [38.34, 27.05],          // Karabağlar
  [38.37, 27.01],          // approaching Balçova
  [38.39, 26.97],          // Balçova
  [38.40, 26.93],          // Üçkuyular
  [38.39, 26.89],          // approaching Güzelbahçe
  [38.37, 26.85],          // Güzelbahçe
  [38.35, 26.80],          // between Güzelbahçe-Urla
  [38.34, 26.77],          // Urla north
  [38.32, 26.72],          // Urla center
  [38.30, 26.65],          // Zeytineli
  [38.28, 26.58],          // Seferihisar exit
  [38.27, 26.52],          // coastal route
  [38.28, 26.46],          // open coast
  [38.30, 26.40],          // Alaçatı approach
  [38.31, 26.35],          // Alaçatı
  [38.32, 26.30],          // Çeşme
];
RD_ESBAS_CESME.realKm = 87;
const RD_CESME_ESBAS = [...RD_ESBAS_CESME].reverse();
RD_CESME_ESBAS.realKm = 87;

// İzmir → Istanbul: O-7 motorway (Osmangazi Bridge real infra).
const RD_ESBAS_IST = [
  [38.31, 27.13],          // ESBAŞ
  [38.45, 27.20],          // Bornova
  [38.62, 27.43],          // Manisa
  [38.85, 27.78],          // Saruhanlı
  [39.10, 27.95],          // Akhisar S
  [39.20, 28.10],          // Akhisar
  [39.42, 28.18],          // Soma
  [39.65, 27.90],          // Balıkesir
  [39.85, 28.20],          // Susurluk
  [40.00, 28.60],          // Karacabey
  [40.20, 29.06],          // Bursa
  [40.40, 29.18],          // Gemlik
  [40.50, 29.30],          // Orhangazi
  [40.60, 29.43],          // Altınova coastal road (south shore of Gulf of Izmit — avoids crossing water)
  [40.74, 29.51],          // Hersek (S end Osmangazi Bridge)
  [40.80, 29.50],          // N end → Gebze
  [40.92, 29.32],          // Tuzla
  [40.99, 29.10],          // Pendik
  [41.01, 28.97],          // Istanbul
];
RD_ESBAS_IST.realKm = 481;
const RD_IST_ESBAS = [...RD_ESBAS_IST].reverse();
RD_IST_ESBAS.realKm = 481;

// Istanbul → Frankfurt: E-80 Balkans → A4 → A1 → A3.
const RD_IST_FRA = [
  [41.01, 28.97], [41.30, 28.20], [41.55, 27.40], [41.68, 26.56],
  [41.85, 26.15], [42.00, 25.50], [42.15, 24.75], [42.40, 24.20],
  [42.55, 23.70], [42.70, 23.32], [42.95, 22.40], [43.15, 22.10],
  [43.32, 21.90], [43.65, 21.40], [44.05, 21.00], [44.45, 20.80],
  [44.82, 20.46], [45.25, 19.85], [45.95, 19.55], [46.55, 19.05],
  [47.10, 19.05], [47.50, 19.04], [47.78, 18.10], [47.92, 17.20],
  [48.00, 16.80], [48.21, 16.37], [48.30, 15.00], [48.22, 13.90],
  [48.45, 13.10], [48.30, 12.30], [48.14, 11.58], [48.75, 11.40],
  [49.20, 11.20], [49.45, 11.08], [49.78, 10.20], [49.92, 9.65],
  [50.05, 8.90], [50.11, 8.68],
];
RD_IST_FRA.realKm = 2310;

// Milan → Istanbul (mirror): A4 → Slovenia → Croatia → E-70.
const RD_MIL_IST = [
  [45.46, 9.19], [45.54, 10.22], [45.44, 10.99], [45.41, 11.88],
  [45.49, 12.24], [45.65, 13.20], [45.65, 13.77], [45.95, 14.30],
  [46.05, 14.51], [45.85, 15.30], [45.81, 15.97], [45.30, 16.80],
  [45.16, 17.99], [45.20, 18.80], [45.05, 19.65], [44.85, 20.25],
  [44.82, 20.46], [44.45, 20.80], [44.05, 21.00], [43.65, 21.40],
  [43.32, 21.90], [43.15, 22.10], [42.95, 22.40], [42.70, 23.32],
  [42.55, 23.70], [42.40, 24.20], [42.15, 24.75], [42.00, 25.50],
  [41.85, 26.15], [41.68, 26.56], [41.55, 27.40], [41.30, 28.20],
  [41.01, 28.97],
];
RD_MIL_IST.realKm = 2160;

// Trieste → Milan: A4 Serenissima.
const RD_TRI_MIL = [
  [45.65, 13.77],          // Trieste
  [45.78, 13.55],          // Sistiana
  [45.80, 13.20],          // Monfalcone
  [45.65, 12.80],          // Latisana
  [45.49, 12.24],          // Venezia / Mestre
  [45.41, 11.88],          // Padova
  [45.46, 11.40],          // Vicenza
  [45.44, 10.99],          // Verona
  [45.54, 10.22],          // Brescia
  [45.50, 9.55],           // Bergamo turnoff
  [45.46, 9.19],           // Milano
];
RD_TRI_MIL.realKm = 413;
const RD_MIL_TRI = [...RD_TRI_MIL].reverse();
RD_MIL_TRI.realKm = 413;

// Trieste → Munich: A23 → A2 → A10 Tauern → A8.
const RD_TRI_MUC = [
  [45.65, 13.77],          // Trieste
  [45.95, 13.30],          // Palmanova
  [46.07, 13.23],          // Udine
  [46.32, 13.35],          // Pontebba
  [46.50, 13.58],          // Tarvisio (IT/AT border)
  [46.62, 13.85],          // Villach
  [46.85, 13.45],          // Spittal
  [47.10, 13.10],          // Bad Gastein (Tauern)
  [47.30, 13.05],          // Bischofshofen
  [47.50, 13.05],          // Hallein
  [47.80, 13.04],          // Salzburg
  [48.00, 12.40],          // Rosenheim approach
  [48.14, 11.58],          // München
];
RD_TRI_MUC.realKm = 491;
const RD_MUC_TRI = [...RD_TRI_MUC].reverse();
RD_MUC_TRI.realKm = 491;

// Genoa → Milan: A7 Serravalle.
const RD_GEN_MIL = [
  [44.41, 8.93],           // Genova
  [44.58, 8.88],           // Busalla
  [44.74, 8.85],           // Serravalle / Ovada
  [44.90, 8.88],           // Tortona
  [45.10, 8.95],           // Voghera / Pavia approach
  [45.25, 9.10],           // Binasco
  [45.46, 9.19],           // Milano
];
RD_GEN_MIL.realKm = 142;
const RD_MIL_GEN = [...RD_GEN_MIL].reverse();
RD_MIL_GEN.realKm = 142;

// Bologna → Milan: A1 Autosole.
const RD_BOL_MIL = [
  [44.50, 11.34],          // Bologna
  [44.65, 10.93],          // Modena
  [44.70, 10.63],          // Reggio Emilia
  [44.80, 10.30],          // Parma
  [44.92, 10.05],          // Fidenza
  [45.05, 9.70],           // Piacenza
  [45.20, 9.55],           // Lodi
  [45.46, 9.19],           // Milano
];
RD_BOL_MIL.realKm = 217;

// Hamburg → Frankfurt: A7 motorway.
const RD_HAM_FRA = [
  [53.55, 9.99],           // Hamburg
  [53.05, 9.85],           // Lüneburg
  [52.72, 9.80],           // Soltau
  [52.40, 9.71],           // Hannover
  [52.10, 9.75],           // Hildesheim
  [51.80, 9.85],           // Göttingen
  [51.30, 9.50],           // Kassel
  [50.87, 9.75],           // Bad Hersfeld
  [50.55, 9.68],           // Fulda
  [50.20, 9.10],           // Bad Vilbel
  [50.11, 8.68],           // Frankfurt
];
RD_HAM_FRA.realKm = 493;

// Jiangsu → Shanghai: G42/G312 NORTH of Taihu Lake (per map 407-421 km).
// Traced from screenshot showing route through Changzhou → Wuxi → Suzhou → Shanghai
const RD_JIANGSU_SHA = [
  [32.06, 118.80],         // Jiangsu (start)
  [32.00, 119.00],         // G42 east from Jiangsu
  [31.92, 119.18],         // approaching Zhenjiang
  [31.87, 119.42],         // Changzhou west
  [31.83, 119.58],         // Changzhou center (visible on map)
  [31.76, 119.85],         // between Changzhou-Wuxi
  [31.68, 120.15],         // Wuxi west approach
  [31.65, 120.35],         // Wuxi center (north of Taihu)
  [31.63, 120.55],         // east of Wuxi
  [31.60, 120.75],         // approaching Suzhou (staying north)
  [31.58, 120.95],         // Suzhou area
  [31.52, 121.15],         // Kunshan area
  [31.45, 121.28],         // approaching Shanghai suburbs
  [31.35, 121.38],         // Shanghai west
  [31.23, 121.47],         // Shanghai Port
];
RD_JIANGSU_SHA.realKm = 417;

// Jiangsu → Ningbo: G15 SOUTH of Taihu Lake via Jiaxing, Hangzhou (per map 451 km).
// Traced from screenshot showing southern route avoiding lake
const RD_JIANGSU_NINGBO = [
  [32.06, 118.80],         // Jiangsu (start)
  [32.00, 119.00],         // G15 southeast
  [31.92, 119.18],         // toward Changzhou
  [31.75, 119.50],         // Changzhou south
  [31.48, 119.85],         // south of Changzhou (avoiding lake)
  [31.18, 120.20],         // Suzhou industrial zone south
  [31.02, 120.48],         // Jiaxing north approach
  [30.88, 120.65],         // Jiaxing center
  [30.58, 120.38],         // turning south toward Hangzhou
  [30.32, 120.18],         // Hangzhou north
  [30.25, 120.15],         // Hangzhou Bay area
  [30.15, 120.55],         // Hangzhou Bay Bridge approach
  [29.98, 121.05],         // crossing bay area (bridge)
  [29.92, 121.28],         // approaching Ningbo
  [29.87, 121.55],         // Ningbo Port
];
RD_JIANGSU_NINGBO.realKm = 451;

// Jiangsu → Shenzhen: G25 southwest through Anhui, Jiangxi, Guangdong (per map 1361-1395 km).
// Traced from screenshot showing route through interior provinces
const RD_JIANGSU_SHENZHEN = [
  [32.06, 118.80],         // Jiangsu (start)
  [31.95, 118.65],         // southwest from Jiangsu
  [31.75, 118.35],         // Anhui border area
  [31.45, 118.10],         // northern Anhui
  [31.05, 117.65],         // approaching Hefei
  [30.75, 117.25],         // Hefei area
  [30.35, 116.85],         // south of Hefei
  [29.95, 116.35],         // southern Anhui
  [29.55, 115.95],         // Jiangxi border
  [29.15, 115.65],         // northern Jiangxi
  [28.68, 115.88],         // Nanchang area
  [27.85, 115.35],         // central Jiangxi
  [26.95, 114.95],         // Ganzhou north
  [26.15, 114.50],         // Ganzhou area
  [25.45, 114.18],         // Jiangxi-Guangdong border
  [24.85, 113.85],         // northern Guangdong
  [24.25, 113.55],         // central Guangdong
  [23.65, 113.35],         // approaching Guangzhou
  [23.13, 113.26],         // Guangzhou north
  [22.95, 113.45],         // Guangzhou-Shenzhen corridor
  [22.72, 113.78],         // approaching Shenzhen
  [22.54, 114.06],         // Shenzhen Port
];
RD_JIANGSU_SHENZHEN.realKm = 1380;

// Jiangsu → Xi'an: G42 west via Hefei, Henan, Shaanxi (per map 1086-1118 km).
// Traced from screenshot showing route through Hefei, Zhengzhou, Xi'an corridor
const RD_JIANGSU_XIAN = [
  [32.06, 118.80],         // Jiangsu (start)
  [32.05, 118.50],         // G42 west
  [32.04, 118.10],         // approaching Nanjing west
  [32.03, 117.75],         // Nanjing western suburbs
  [31.92, 117.45],         // between Nanjing-Hefei
  [31.86, 117.27],         // Hefei east approach
  [31.85, 117.05],         // Hefei center
  [32.15, 116.25],         // north from Hefei
  [32.50, 115.75],         // northern Anhui
  [32.85, 115.25],         // Anhui-Henan border
  [33.25, 114.65],         // eastern Henan
  [33.65, 114.05],         // approaching Zhengzhou corridor
  [34.05, 113.65],         // Luoyang area
  [34.25, 112.95],         // central Henan
  [34.38, 112.35],         // Henan-Shaanxi border approach
  [34.45, 111.65],         // eastern Shaanxi
  [34.48, 110.95],         // Weinan area
  [34.42, 110.25],         // approaching Xi'an
  [34.35, 109.55],         // Xi'an east
  [34.27, 108.93],         // Xi'an (rail terminal)
];
RD_JIANGSU_XIAN.realKm = 1100;

// road() interpolates waypoints into a dense polyline for drawing,
// and propagates the .realKm tag so distance reporting stays accurate.
// Pass multiple road arrays to concatenate (sums their realKm too).
function road(...wpsList) {
  if (wpsList.length === 1) {
    const wps = wpsList[0];
    const out = buildPath(wps, 50);
    if (wps.realKm != null) out.realKm = wps.realKm;
    return out;
  }
  const allPts = [];
  let totalKm = 0, hasRealKm = true;
  for (let i = 0; i < wpsList.length; i++) {
    const w = wpsList[i];
    allPts.push(...(i === 0 ? w : w.slice(1)));
    if (w.realKm != null) totalKm += w.realKm;
    else hasRealKm = false;
  }
  const out = buildPath(allPts, 50);
  if (hasRealKm) out.realKm = totalKm;
  return out;
}

// ─── Rail spines (real freight corridors) ──────────────────
// Trieste → Munich: Pontebbana / Tauern freight line.
const RAIL_TRI_MUC = [
  [45.65, 13.77],          // Trieste Marittima
  [45.97, 13.36],          // Cervignano
  [46.07, 13.23],          // Udine
  [46.30, 13.40],          // Pontebba
  [46.50, 13.58],          // Tarvisio
  [46.62, 13.85],          // Villach Hbf
  [47.07, 13.20],          // Bad Gastein (Tauern)
  [47.80, 13.04],          // Salzburg
  [47.95, 12.79],          // Freilassing
  [48.14, 11.58],          // München
];

// Trieste → Milano: Adriatic-Tirreno corridor (RFI) via Mestre, Verona.
const RAIL_TRI_MIL = [
  [45.65, 13.77],          // Trieste
  [45.97, 13.36],          // Cervignano
  [45.49, 12.24],          // Venezia Mestre
  [45.41, 11.88],          // Padova
  [45.44, 10.99],          // Verona Quadrante Europa
  [45.54, 10.22],          // Brescia
  [45.46, 9.19],           // Milano
];

// Trieste → Bologna: Adriatic rail corridor via Venice & Ferrara.
const RAIL_TRI_BOL = [
  [45.65, 13.77],          // Trieste
  [45.97, 13.36],          // Cervignano
  [45.49, 12.24],          // Venezia Mestre
  [45.41, 11.88],          // Padova
  [45.07, 11.78],          // Rovigo
  [44.84, 11.62],          // Ferrara
  [44.50, 11.34],          // Bologna
];

function rail(wps) { return buildPath(wps, 40); }

// ─── EcoTransit emission model (ISO 14083, WTW) ─────────────
const ECOTRANSIT = {
  factors: { sea: 14.2, roro: 72.0, rail: 28.0, railBRI: 46.0, road: 96.0 },
  cargoWeight: { "20FT": 26.65, "40FT": 27.65, "40HC": 28.60 },
};
function calcSegmentCO2(mode, distKm, container, isBRI = false) {
  const ef = (mode === "rail" && isBRI) ? ECOTRANSIT.factors.railBRI
           : (ECOTRANSIT.factors[mode] || ECOTRANSIT.factors.road);
  return (ef * (ECOTRANSIT.cargoWeight[container] || 14) * distKm) / 1000;
}
function calcEmissions(segs, modes, container, isBRI = false) {
  const d1 = segLen(segs.pickupToPort);
  const dm = segLen(segs.mainTransport);
  const di = segs.inlandTransport ? segLen(segs.inlandTransport.points) : 0;
  const d2 = segLen(segs.portToDelivery);

  const mainMode = modes.includes("sea")  ? "sea"
                 : modes.includes("roro") ? "roro"
                 : modes.includes("rail") ? "rail" : "road";
  const inlandMode = segs.inlandTransport?.mode || null;

  const c1 = Math.round(calcSegmentCO2("road", d1, container));
  const cm = Math.round(calcSegmentCO2(mainMode, dm, container, isBRI && mainMode === "rail"));
  const ci = inlandMode ? Math.round(calcSegmentCO2(inlandMode, di, container)) : 0;
  const c2 = Math.round(calcSegmentCO2("road", d2, container));

  return {
    co2Total: c1 + cm + ci + c2,
    co2Road1: c1, co2Main: cm, co2Inland: ci, co2Road2: c2,
    mainMode, inlandMode,
    distRoad1: d1, distMain: dm, distInland: di, distRoad2: d2,
    efMain: isBRI && mainMode === "rail" ? ECOTRANSIT.factors.railBRI : ECOTRANSIT.factors[mainMode],
    efInland: inlandMode ? ECOTRANSIT.factors[inlandMode] : null,
    cargoWeight: ECOTRANSIT.cargoWeight[container] || 14,
  };
}

// ─── Insight strings (auto-tailored) ───────────────────────
function generateInsight(label, distance, riskLevel, modes, risks) {
  const rn = risks.map(r => r.name).join(", ") || "none";
  const isLong = distance > 12000;
  if (label.includes("Suez")) return {
    insight: `Primary Asia–Europe corridor via the Suez Canal (${distance.toLocaleString()} km). Fastest maritime option but transits ${riskLevel.toLowerCase()}-risk zones including ${rn}.`,
    suggestions: ["Activate the Cape contingency if Suez conditions deteriorate.", "Slow-steam between Malacca and Aden to cut fuel by up to 20%.", "Pre-arrange War Risk insurance for Gulf of Aden transit."]
  };
  if (label.includes("Cape")) return {
    insight: `Cape of Good Hope route bypasses Suez entirely (${distance.toLocaleString()} km), eliminating all high-risk zone exposure at the cost of additional distance.`,
    suggestions: ["Use when Suez surcharges or piracy risk make the canal unfeasible.", "Plan for 7–10 additional transit days versus the Suez corridor.", "Higher CO₂ — consider carbon offsets for ESG reporting."]
  };
  if (label.includes("BRI") || label.includes("Trans-Caspian")) return {
    insight: `Trans-Caspian Middle Corridor rail (${distance.toLocaleString()} km) crosses Kazakhstan, the Caspian, the South Caucasus and the BTK railway into Türkiye — zero maritime risk.`,
    suggestions: ["Best for time-sensitive, high-value automotive components.", "Monitor Caspian ferry capacity at Aktau–Baku — a known bottleneck.", "Plan for two gauge changes (China/Kazakhstan & Georgia/Türkiye)."]
  };
  if (modes.includes("rail") && (label.includes("Rail") || label.includes("rail"))) return {
    insight: `Intermodal route with a rail mainline (${distance.toLocaleString()} km). Inland rail typically cuts CO₂ by 60–70 % versus an equivalent road leg.`,
    suggestions: ["Book block trains in advance for the Tauern / Brenner corridors.", "Pair with Trieste's RFI on-dock rail to minimise drayage.", "ETS2 (2027) will add carbon cost to the truck legs — rail share will improve."]
  };
  if (modes.includes("roro")) return {
    insight: `Short-sea RoRo corridor within the Adriatic basin (${distance.toLocaleString()} km). ${riskLevel} risk. Daily Çeşme–Trieste sailings offer scheduling flexibility for wheeled cargo.`,
    suggestions: ["RoRo eliminates container handling — ideal for finished vehicles and trailers.", "Trieste has direct A4/A23 motorway and Tauern rail access inland.", "Consolidate loads on this high-frequency lane for cost efficiency."]
  };
  if (modes.every(m => m === "road") && isLong) return {
    insight: `Long-haul road across the Balkan corridor (${distance.toLocaleString()} km). Road has the highest emission intensity and is exposed to ETS2 carbon pricing from 2027.`,
    suggestions: ["Split at Vienna or Sofia to switch to rail and reduce road mileage.", "Arrange multi-country transit permits in advance.", "Intermodal (road + rail) can cut costs and CO₂ by 30–40 %."]
  };
  if (modes.includes("sea") && !isLong) return {
    insight: `Mediterranean sea route (${distance.toLocaleString()} km), staying within the basin. Direct and efficient option for cargo between Türkiye and the western Mediterranean.`,
    suggestions: ["Consolidate with other Med shippers to optimise container fill.", "Short transit times make this ideal for fast-moving consumer goods.", "Consider feeder vessels via hub ports for better schedule coverage."]
  };
  return {
    insight: `This ${label} route covers ${distance.toLocaleString()} km using ${modes.join(" + ")} transport with ${riskLevel.toLowerCase()} overall risk.`,
    suggestions: ["Review modal split for lower-emission alternatives.", "Ensure cargo insurance covers all transport modes.", "Evaluate consolidation opportunities to improve cost efficiency."]
  };
}

function buildResult(def, container, pickupToPort, mainTransport, portToDelivery, legs, opts = {}) {
  const { inlandTransport = null, isBRI = false } = opts;
  const inlandPts = inlandTransport ? inlandTransport.points : [];
  const fullRoute = [
    ...pickupToPort,
    ...mainTransport.slice(1),
    ...inlandPts.slice(inlandPts.length ? 1 : 0),
    ...portToDelivery.slice(1),
  ];
  // Sum per-segment so .realKm tags propagate (great-circle interpolation
  // on the merged route would discard them).
  const distance =
      segLen(pickupToPort)
    + segLen(mainTransport)
    + (inlandTransport ? segLen(inlandTransport.points) : 0)
    + segLen(portToDelivery);
  const { risks, riskLevel } = analyseRisks(mainTransport);
  const { insight, suggestions } = generateInsight(def.label, distance, riskLevel, def.modes, risks);
  const emissions = calcEmissions(
    { pickupToPort, mainTransport, inlandTransport, portToDelivery },
    def.modes, container, isBRI
  );
  return {
    routeType: def.label, category: def.category, modes: def.modes, containerType: container,
    segments: { pickupToPort, mainTransport, inlandTransport, portToDelivery },
    fullRoute, distance, risks, riskLevel, insight, suggestions, emissions, legs, isBRI,
  };
}

const CONTAINER_TYPES = ["20FT", "40FT", "40HC"];

// ─── Route catalogue ───────────────────────────────────────
const PROJECT_ROUTES = [
  // CHINA IMPORT — automotive components from Jiangsu
  { id: "cn_suez_sha", category: "China Import", label: "Sea via Suez — Shanghai POL → Aliağa", modes: ["sea"],
    description: "Jiangsu → Shanghai port, Suez Canal route to Aliağa.",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shanghai", pod: "Aliağa Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHA),
        corridorSuez(),
        road(RD_ALIAGA_ESBAS),
        legs);
    } },
  { id: "cn_suez_ningbo", category: "China Import", label: "Sea via Suez — Ningbo POL → Aliağa", modes: ["sea"],
    description: "Jiangsu → Ningbo port, Suez Canal route to Aliağa.",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Ningbo", pod: "Aliağa Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_NINGBO),
        corridorSuez(),
        road(RD_ALIAGA_ESBAS),
        legs);
    } },
  { id: "cn_suez_shenzhen", category: "China Import", label: "Sea via Suez — Shenzhen POL → Aliağa", modes: ["sea"],
    description: "Jiangsu → Shenzhen port, Suez Canal route to Aliağa.",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shenzhen", pod: "Aliağa Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHENZHEN),
        corridorSuez(),
        road(RD_ALIAGA_ESBAS),
        legs);
    } },
  { id: "cn_suez_sha_alsancak", category: "China Import", label: "Sea via Suez — Shanghai POL → Alsancak", modes: ["sea"],
    description: "Jiangsu → Shanghai port, Suez Canal route to Alsancak (İzmir).",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shanghai", pod: "Alsancak Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHA),
        corridorSuez(),
        road(RD_ALSANCAK_ESBAS),
        legs);
    } },
  { id: "cn_suez_ningbo_alsancak", category: "China Import", label: "Sea via Suez — Ningbo POL → Alsancak", modes: ["sea"],
    description: "Jiangsu → Ningbo port, Suez Canal route to Alsancak (İzmir).",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Ningbo", pod: "Alsancak Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_NINGBO),
        corridorSuez(),
        road(RD_ALSANCAK_ESBAS),
        legs);
    } },
  { id: "cn_suez_shenzhen_alsancak", category: "China Import", label: "Sea via Suez — Shenzhen POL → Alsancak", modes: ["sea"],
    description: "Jiangsu → Shenzhen port, Suez Canal route to Alsancak (İzmir).",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shenzhen", pod: "Alsancak Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHENZHEN),
        corridorSuez(),
        road(RD_ALSANCAK_ESBAS),
        legs);
    } },
  { id: "cn_cape_sha", category: "China Import", label: "Sea via Cape — Shanghai POL → Aliağa", modes: ["sea"],
    description: "Jiangsu → Shanghai port, Cape of Good Hope to Aliağa.",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shanghai", pod: "Aliağa Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHA),
        corridorCape(),
        road(RD_ALIAGA_ESBAS),
        legs);
    } },
  { id: "cn_cape_sha_alsancak", category: "China Import", label: "Sea via Cape — Shanghai POL → Alsancak", modes: ["sea"],
    description: "Jiangsu → Shanghai port, Cape of Good Hope to Alsancak (İzmir).",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Shanghai", pod: "Alsancak Port", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_SHA),
        corridorCapeAlsancak(),
        road(RD_ALSANCAK_ESBAS),
        legs);
    } },
  { id: "cn_bri", category: "China Import", label: "Rail via Middle Corridor (Jiangsu → Xi'an → BTK)", modes: ["rail"],
    description: "Jiangsu → Xi'an by road, then Trans-Caspian rail+ferry+BTK rail to İzmir.",
    build(ct = "40FT") {
      const legs = { pickup: "Jiangsu", pol: "Xi'an", pod: "ESBAŞ", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        road(RD_JIANGSU_XIAN),
        corridorBRI_rail1(),                                          // rail: Xi'an → Aktau
        corridorBRI_rail2(),                                          // rail: Baku → ESBAŞ
        legs,
        { isBRI: true, inlandTransport: { mode: "sea", points: buildPath(CASPIAN_FERRY, 30) } }
      );
    } },

  // ITALY EXPORT — all RoRo lanes via Trieste
  { id: "it_roro_truck", category: "Italy Export", label: "RoRo + Truck via Trieste", modes: ["roro", "road"],
    description: "Çeşme → Trieste ferry, A4 truck to Milan.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Çeşme", pod: "Trieste", delivery: "Milan" };
      return buildResult(this, ct, road(RD_ESBAS_CESME), corridorCesmeTrieste(), road(RD_TRI_MIL), legs);
    } },
  { id: "it_sea_truck", category: "Italy Export", label: "Sea + Truck via Genoa", modes: ["sea", "road"],
    description: "Container vessel to Genoa, A7 to Milan.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Aliağa Port", pod: "Genoa", delivery: "Milan" };
      return buildResult(this, ct, road(RD_ESBAS_ALIAGA), corridorAliagaGenoa(), road(RD_GEN_MIL), legs);
    } },
  { id: "it_sea_rail", category: "Italy Export", label: "Sea + Rail via Trieste", modes: ["sea", "rail"],
    description: "Vessel to Trieste, RFI block train to Milan.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Aliağa Port", pod: "Trieste", delivery: "Milan" };
      return buildResult(this, ct,
        road(RD_ESBAS_ALIAGA),
        corridorAliagaTrieste(),
        [[45.46, 9.19]],
        legs,
        { inlandTransport: { mode: "rail", points: rail(RAIL_TRI_MIL) } });
    } },
  { id: "it_roro_rail_truck", category: "Italy Export", label: "RoRo + Rail + Truck via Trieste", modes: ["roro", "rail", "road"],
    description: "Ferry to Trieste, rail to Bologna, truck to Milan.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Çeşme", pod: "Trieste", delivery: "Milan" };
      return buildResult(this, ct,
        road(RD_ESBAS_CESME),
        corridorCesmeTrieste(),
        road(RD_BOL_MIL),
        legs,
        { inlandTransport: { mode: "rail", points: rail(RAIL_TRI_BOL) } });
    } },

  // GERMANY EXPORT — RoRo via Trieste; direct truck / direct sea
  { id: "de_truck", category: "Germany Export", label: "Truck via Balkan Corridor", modes: ["road"],
    description: "Door-to-door overland (long haul).",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "ESBAŞ", pod: "Frankfurt", delivery: "Frankfurt" };
      return buildResult(this, ct,
        [[38.31, 27.13]],
        road(RD_ESBAS_IST, RD_IST_FRA),
        [[50.11, 8.68]],
        legs);
    } },
  { id: "de_roro_rail", category: "Germany Export", label: "RoRo + Rail via Trieste", modes: ["roro", "rail"],
    description: "Ferry to Trieste, Tauern rail to Munich.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Çeşme", pod: "Trieste", delivery: "Munich" };
      return buildResult(this, ct,
        road(RD_ESBAS_CESME),
        corridorCesmeTrieste(),
        [[48.14, 11.58]],
        legs,
        { inlandTransport: { mode: "rail", points: rail(RAIL_TRI_MUC) } });
    } },
  { id: "de_roro_truck", category: "Germany Export", label: "RoRo + Truck via Trieste", modes: ["roro", "road"],
    description: "Ferry to Trieste, A23 truck through Austria.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Çeşme", pod: "Trieste", delivery: "Munich" };
      return buildResult(this, ct, road(RD_ESBAS_CESME), corridorCesmeTrieste(), road(RD_TRI_MUC), legs);
    } },
  { id: "de_sea", category: "Germany Export", label: "Sea (Med → Atlantic → Hamburg)", modes: ["sea"],
    description: "Through Gibraltar to Hamburg, truck to Frankfurt.",
    build(ct = "40FT") {
      const legs = { pickup: "ESBAŞ", pol: "Aliağa Port", pod: "Hamburg", delivery: "Frankfurt" };
      return buildResult(this, ct, road(RD_ESBAS_ALIAGA), corridorAliagaHamburg(), road(RD_HAM_FRA), legs);
    } },

  // ITALY IMPORT — inbound to ESBAŞ
  { id: "it_imp_truck", category: "Italy Import", label: "Truck via Balkan Corridor", modes: ["road"],
    description: "Milan → İzmir overland.",
    build(ct = "40FT") {
      const legs = { pickup: "Milan", pol: "Milan", pod: "ESBAŞ", delivery: "ESBAŞ" };
      return buildResult(this, ct,
        [[45.46, 9.19]],
        road(RD_MIL_IST, RD_IST_ESBAS),
        [[38.31, 27.13]],
        legs);
    } },
  { id: "it_imp_sea", category: "Italy Import", label: "Sea Direct (Mediterranean)", modes: ["sea"],
    description: "Container vessel Genoa → Aliağa.",
    build(ct = "40FT") {
      const legs = { pickup: "Milan", pol: "Genoa", pod: "Aliağa Port", delivery: "ESBAŞ" };
      return buildResult(this, ct, road(RD_MIL_GEN), corridorGenoaAliaga(), road(RD_ALIAGA_ESBAS), legs);
    } },
  { id: "it_imp_roro", category: "Italy Import", label: "Truck + RoRo via Trieste", modes: ["road", "roro"],
    description: "Truck Milan → Trieste, RoRo to Çeşme.",
    build(ct = "40FT") {
      const legs = { pickup: "Milan", pol: "Trieste", pod: "Çeşme", delivery: "ESBAŞ" };
      return buildResult(this, ct, road(RD_MIL_TRI), corridorTriesteCesme(), road(RD_CESME_ESBAS), legs);
    } },
];

const CONTAINER_INFO = {
  "20FT": { note: "25,000–28,300 kg · avg 26.65 t", short: "20-foot dry" },
  "40FT": { note: "26,500–28,800 kg · avg 27.65 t", short: "40-foot dry" },
  "40HC": { note: "28,500–28,700 kg · avg 28.60 t", short: "40-foot high cube" },
};

window.RoutingEngine = {
  PROJECT_ROUTES, CONTAINER_TYPES, CONTAINER_INFO, RISK_ZONES, LOCATIONS, ECOTRANSIT,
  segDist, haversineKm, analyseRisks, calcEmissions,
};
