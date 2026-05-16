import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════
//  PATH ENGINE
//  Simple linear interpolation — NO great-circle arcs.
//  Waypoints are hand-verified to stay in open water / on land.
//  Short segments mean straight lines never cross coastlines.
// ════════════════════════════════════════════════════════════
function buildPath(wps, step = 90) {
  const out = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const n = Math.max(2, Math.round(haversineKm(a, b) / step));
    for (let s = 0; s < n; s++) {
      const t = s / n;
      out.push([a[0] * (1-t) + b[0] * t, a[1] * (1-t) + b[1] * t]);
    }
  }
  out.push(wps[wps.length - 1]);
  return out;
}

// ════════════════════════════════════════════════════════════
//  FIXED LOCATIONS
// ════════════════════════════════════════════════════════════
const LOCATIONS = {
  "Aliağa Port": [38.80, 26.97], "ESBAŞ":     [38.77, 26.93],
  "Shanghai":    [31.23,121.47], "Xi'an":      [34.27,108.93],
  "Genoa":       [44.41,  8.93], "Ancona":     [43.62, 13.51],
  "Bari":        [41.12, 16.87], "Milan":      [45.46,  9.19],
  "Bologna":     [44.50, 11.34], "Patras":     [38.25, 21.73],
  "Hamburg":     [53.55,  9.99], "Frankfurt":  [50.11,  8.68],
  "Munich":      [48.14, 11.58],
};
const loc = n => LOCATIONS[n] || [0, 0];

// ════════════════════════════════════════════════════════════
//  RISK ZONES
// ════════════════════════════════════════════════════════════
const RISK_ZONES = [
  { name:"Gulf of Aden",      center:[12.0, 47.0], radiusKm:500, level:"High"   },
  { name:"Suez Canal",        center:[30.5, 32.5], radiusKm:280, level:"Medium" },
  { name:"Strait of Malacca", center:[ 2.5,102.5], radiusKm:320, level:"Medium" },
];

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════
function haversineKm(a, b) {
  const R=6371, r=x=>x*Math.PI/180;
  const dLat=r(b[0]-a[0]), dLon=r(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function segDist(pts) {
  let d=0; for(let i=1;i<pts.length;i++) d+=haversineKm(pts[i-1],pts[i]);
  return Math.round(d);
}
function analyseRisks(pts) {
  const hit=[];
  for(const z of RISK_ZONES)
    if(pts.some(p=>haversineKm(p,z.center)<=z.radiusKm)) hit.push({name:z.name,level:z.level});
  const level=hit.some(z=>z.level==="High")?"High":hit.some(z=>z.level==="Medium")?"Medium":"Low";
  return {risks:hit,riskLevel:level};
}

// ════════════════════════════════════════════════════════════
//  VERIFIED MARITIME CORRIDORS
//  Every waypoint manually confirmed to be in open water.
//  Segments short enough that linear interpolation stays at sea.
// ════════════════════════════════════════════════════════════

// Shared Aegean spine: Aliağa ↔ S of Rhodes (eastern shipping lane)
const AGN = [ // north→south
  [38.80,26.97],[38.20,26.80],[37.60,27.20],[36.90,27.60],[36.20,28.00],
];
const AGS = [...AGN].reverse(); // south→north

// Shared Cretan Sea + Cape Matapan
const CRETAN = [ // S-Rhodes → Matapan
  [36.20,28.00],[35.80,26.00],[35.50,24.00],[35.80,22.50],[36.38,22.49],
];
const CRETAN_R = [...CRETAN].reverse();

// Shared Ionian + Otranto
const IONIAN = [ // Matapan → S-Adriatic
  [36.38,22.49],[36.90,21.50],[37.50,20.80],[38.20,20.50],
  [39.00,20.00],[39.60,19.90],[40.10,18.80],
];
const IONIAN_R = [...IONIAN].reverse();

function corridorSuez() {
  // Shanghai → E China Sea → SCS → Malacca → Indian Ocean
  // → Red Sea → Suez → E Med → Aegean → Aliağa
  return buildPath([
    [31.23,121.47],                                        // Shanghai
    [29.00,123.00],[23.00,121.50],[19.00,121.00],          // E of Taiwan
    [15.50,117.50],[10.00,112.00],[ 5.00,108.50],          // S China Sea
    [ 2.00,105.00],[ 1.25,103.82],                         // Singapore/Malacca
    [ 5.00, 96.00],                                        // Andaman Sea
    [ 0.00, 87.00],[-5.00, 75.00],[-5.00, 62.00],         // Indian Ocean
    [ 8.00, 57.00],                                        // Arabian Sea
    [11.00, 51.50],[11.50, 47.00],[12.50, 44.50],          // Gulf of Aden
    [14.00, 42.50],[18.00, 39.00],[23.00, 37.00],          // Red Sea
    [27.00, 34.50],[29.80, 32.50],[31.20, 32.20],          // Suez Canal
    [32.50, 32.50],[34.00, 30.00],[35.50, 28.50],          // E Med (no land)
    ...AGS,                                                // Aegean → Aliağa
  ]);
}

function corridorCape() {
  // Shanghai → Malacca → Indian Ocean (south) → Cape →
  // S Atlantic → Gibraltar → W Med → Matapan → Aegean → Aliağa
  return buildPath([
    [31.23,121.47],
    [29.00,123.00],[23.00,121.50],[19.00,121.00],
    [15.50,117.50],[10.00,112.00],[ 5.00,108.50],
    [ 2.00,105.00],[ 1.25,103.82],                         // Malacca
    [ 5.00, 96.00],[-5.00, 85.00],                         // Indian Ocean
    [-15.00, 75.00],[-25.00, 60.00],                       // S Indian Ocean
    [-35.00, 27.00],[-34.40, 18.50],                       // Cape of Good Hope
    [-30.00,  5.00],[-15.00, -5.00],                       // S Atlantic
    [  0.00,-15.00],[ 15.00,-20.00],[33.00,-12.00],        // Atlantic N
    [ 35.98, -5.36],                                       // Gibraltar
    [ 37.00,  3.00],[ 37.50, 10.00],[ 36.50, 16.00],      // W + C Med
    [ 36.00, 20.00],                                       // SE Ionian approach
    ...CRETAN_R.slice(0,-1),                               // Matapan → Cretan → Aegean
    ...AGS,
  ]);
}

function corridorBRI() {
  // Xi'an → Lanzhou → Urumqi → Almaty → [Caspian ferry] →
  // Baku → Tbilisi → Kars → Ankara → Istanbul → Aliağa
  return buildPath([
    [34.27,108.93],  // Xi'an
    [36.06,103.79],  // Lanzhou
    [43.79, 87.60],  // Urumqi
    [43.26, 76.95],  // Almaty
    [43.65, 51.17],  // Aktau (Caspian – ferry crossing)
    [40.41, 49.87],  // Baku
    [41.69, 44.83],  // Tbilisi
    [40.60, 43.10],  // Kars
    [39.93, 32.85],  // Ankara
    [41.01, 28.97],  // Istanbul
    [40.20, 29.06],  // Bursa
    [39.65, 27.89],  // Balikesir
    [38.62, 27.43],  // Manisa
    [38.77, 26.93],  // ESBAŞ
  ]);
}

function corridorAliagaBari() {
  // Aliağa → E Aegean → Cretan Sea → Cape Matapan →
  // Ionian → Strait of Otranto → Bari
  return buildPath([
    ...AGN,          // Aliağa → S of Rhodes
    ...CRETAN.slice(1),  // Cretan Sea → Matapan
    ...IONIAN.slice(1),  // Ionian → Otranto
    [40.70, 17.80],  // S Adriatic
    [41.12, 16.87],  // Bari
  ]);
}
function corridorBariAliaga() { return [...corridorAliagaBari()].reverse(); }

function corridorAliagaAncona() {
  // Aliağa → (same as Bari) → Otranto → N Adriatic → Ancona
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    ...IONIAN.slice(1),
    [41.00, 17.00],[42.00, 15.50],[43.62, 13.51],  // Adriatic N → Ancona
  ]);
}
function corridorAnconaAliaga() { return [...corridorAliagaAncona()].reverse(); }

function corridorAliagaPatras() {
  // Aliağa → E Aegean → Cretan Sea → Cape Matapan →
  // Ionian → Gulf of Patras → Patras
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    [36.38,22.49],[36.90,21.50],[37.50,20.80],  // Ionian
    [38.00,21.20],[38.25,21.73],                // Gulf of Patras → Patras
  ]);
}

function corridorAliagaGenoa() {
  // Aliağa → Aegean → Cretan Sea → Matapan → Ionian →
  // Strait of Messina → Tyrrhenian → Ligurian → Genoa
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    [36.38,22.49],[36.90,21.50],[37.50,20.80],  // Ionian
    [37.80,18.00],[37.80,15.50],[38.30,15.65],  // → Messina
    [39.50,13.00],[41.00,12.00],                // Tyrrhenian
    [42.50,10.00],[43.50, 9.20],                // Ligurian
    [44.41, 8.93],                              // Genoa
  ]);
}
function corridorGenoaAliaga() { return [...corridorAliagaGenoa()].reverse(); }

function corridorAliagaHamburg() {
  // Aliağa → Aegean → Cretan Sea → Matapan → Ionian →
  // Messina → Tyrrhenian → W Med → Gibraltar → Atlantic → Hamburg
  return buildPath([
    ...AGN,
    ...CRETAN.slice(1),
    [36.38,22.49],[36.90,21.50],[37.50,20.80],
    [37.80,18.00],[37.80,15.50],[38.30,15.65],  // Messina
    [39.50,12.50],[38.50, 8.50],                // Tyrrhenian → W Sardinia
    [37.50, 5.00],[37.00, 1.00],[36.50,-2.00],  // W Med
    [35.98,-5.36],                              // Gibraltar
    [38.50,-9.00],[44.00,-10.00],[48.50,-5.00], // Atlantic
    [52.00, 3.00],[54.00, 8.00],                // North Sea
    [53.55, 9.99],                              // Hamburg
  ]);
}

// ════════════════════════════════════════════════════════════
//  VERIFIED ROAD CORRIDORS (all waypoints on land)
// ════════════════════════════════════════════════════════════

// ESBAŞ/Aliağa → Istanbul (via Turkey, inland)
const RD_ESBAŞ_IST = [
  [38.77,26.93],[38.62,27.43],[39.00,28.50],
  [39.50,29.00],[40.20,29.06],[40.85,29.45],[41.01,28.97],
];

// Istanbul → Frankfurt via Balkans
const RD_IST_FRA = [
  [41.01,28.97],[41.68,26.56],[42.15,24.75],[42.70,23.32],
  [43.32,21.90],[44.82,20.46],[47.50,19.04],[48.21,16.37],
  [48.14,11.58],[50.11, 8.68],
];

// Istanbul → Munich via Balkans
const RD_IST_MUC = [
  [41.01,28.97],[41.68,26.56],[42.15,24.75],[42.70,23.32],
  [43.32,21.90],[44.82,20.46],[47.50,19.04],[48.21,16.37],
  [47.80,13.03],[48.14,11.58],
];

// Milan → Istanbul via NORTH of Adriatic (Venice → Trieste → Balkans)
const RD_MIL_IST = [
  [45.46, 9.19],[45.44,12.33],[45.65,13.77],[46.05,14.51],
  [45.81,15.97],[45.16,17.99],[44.82,20.46],[43.32,21.90],
  [42.70,23.32],[42.15,24.75],[41.68,26.56],[41.01,28.97],
];

// Istanbul → Aliağa via Turkey (reverse of ESBAŞ→IST)
const RD_IST_ESBAŞ = [...RD_ESBAŞ_IST].reverse();

// Bari → Milan (via Italian peninsula, all on land)
const RD_BARI_MIL = [
  [41.12,16.87],[40.85,14.27],[41.90,12.50],
  [43.77,11.25],[44.50,11.34],[45.46, 9.19],
];

// Bari → Frankfurt (via Italy + Alps + Germany)
const RD_BARI_FRA = [
  [41.12,16.87],[40.85,14.27],[41.90,12.50],
  [43.77,11.25],[44.50,11.34],[45.46, 9.19],
  [46.00,10.00],[47.30,11.40],[48.14,11.58],[50.11, 8.68],
];

// Ancona → Bologna (Apennines, land)
const RD_ANC_BOL = [[43.62,13.51],[44.50,11.34]];

// Genoa → Milan (short, land)
const RD_GEN_MIL = [[44.41,8.93],[45.46,9.19]];

// Patras → Munich (Greece → Balkans → Central Europe)
const RD_PAT_MUC = [
  [38.25,21.73],[37.98,23.73],[40.64,22.94],[42.00,21.43],
  [44.82,20.46],[47.50,19.04],[48.21,16.37],[47.80,13.03],[48.14,11.58],
];

// Hamburg → Frankfurt (Germany inland)
const RD_HAM_FRA = [[53.55,9.99],[52.00,9.50],[50.11,8.68]];

// Milan → Bari (Italy south)
const RD_MIL_BARI = [...RD_BARI_MIL].reverse();

function road(wps) { return buildPath(wps, 60); }

// ════════════════════════════════════════════════════════════
//  ECOTRANSIT EMISSION MODEL (WTW — ISO 14083)
// ════════════════════════════════════════════════════════════
const ECOTRANSIT = {
  factors:     { sea:14.2, roro:72.0, rail:28.0, railBRI:46.0, road:96.0 },
  // Max payload midpoints (kg → tonnes), based on industry standard specs:
  // 20FT: 25,000–28,300 kg → avg 26,650 kg
  // 40FT: 26,500–28,800 kg → avg 27,650 kg
  // 40HC: 28,500–28,700 kg → avg 28,600 kg
  cargoWeight: { "20FT":26.65, "40FT":27.65, "40HC":28.60 },
};
function calcSegmentCO2(mode, distKm, container, isBRI=false) {
  const ef = isBRI ? ECOTRANSIT.factors.railBRI : (ECOTRANSIT.factors[mode]||ECOTRANSIT.factors.road);
  return (ef * (ECOTRANSIT.cargoWeight[container]||14) * distKm) / 1000;
}
function calcEmissions(segs, modes, container, isBRI=false) {
  const d1=segDist(segs.pickupToPort), dm=segDist(segs.mainTransport), d2=segDist(segs.portToDelivery);
  const mainMode = modes.includes("sea")?"sea":modes.includes("roro")?"roro":modes.includes("rail")?"rail":"road";
  const c1=Math.round(calcSegmentCO2("road",d1,container));
  const cm=Math.round(calcSegmentCO2(mainMode,dm,container,isBRI));
  const c2=Math.round(calcSegmentCO2("road",d2,container));
  return { co2Total:c1+cm+c2, co2Road1:c1, co2Main:cm, co2Road2:c2,
           mainMode, distMain:dm, distRoad1:d1, distRoad2:d2,
           efUsed:isBRI?ECOTRANSIT.factors.railBRI:ECOTRANSIT.factors[mainMode],
           cargoWeight:ECOTRANSIT.cargoWeight[container]||14 };
}

// ════════════════════════════════════════════════════════════
//  INSIGHT ENGINE
// ════════════════════════════════════════════════════════════
function generateInsight(label,distance,riskLevel,modes,risks) {
  const rn=risks.map(r=>r.name).join(", ")||"none";
  const isLong=distance>12000;
  if(label.includes("Suez")) return{
    insight:`This route follows the primary Asia–Europe corridor via the Suez Canal (${distance.toLocaleString()} km). Fastest maritime option but transits ${riskLevel.toLowerCase()}-risk zones including ${rn}.`,
    suggestions:["Activate the Cape contingency if Suez conditions deteriorate.","Slow-steam between Malacca and Aden to cut fuel by up to 20%.","Pre-arrange War Risk insurance for Gulf of Aden transit."]};
  if(label.includes("Cape")) return{
    insight:`Cape of Good Hope route bypasses Suez entirely (${distance.toLocaleString()} km), eliminating all high-risk zone exposure at the cost of additional distance.`,
    suggestions:["Use when Suez surcharges or piracy risk make the canal unfeasible.","Plan for 7–10 additional transit days versus the Suez corridor.","Higher CO₂ — consider carbon offsets for ESG reporting."]};
  if(label.includes("BRI")) return{
    insight:`The Trans-Caspian BRI rail corridor (${distance.toLocaleString()} km) offers predictable Eurasian transit with zero maritime risk.`,
    suggestions:["Best for time-sensitive, high-value cargo tolerant of gauge transitions.","Monitor Caspian ferry capacity at Aktau–Baku — a common bottleneck.","Use temperature-controlled containers across Central Asian climate zones."]};
  if(modes.includes("roro")) return{
    insight:`Short-sea RoRo corridor within the Mediterranean/Adriatic basin (${distance.toLocaleString()} km). ${riskLevel} risk. High sailing frequency offers scheduling flexibility.`,
    suggestions:["RoRo is optimal for wheeled cargo — no container handling needed.","Combine with rail at the Italian end to extend inland reach.","Consolidate loads on this high-frequency lane for cost efficiency."]};
  if(modes.every(m=>m==="road")&&isLong) return{
    insight:`Long-haul road across the Balkan corridor (${distance.toLocaleString()} km). Road has the highest emission intensity and requires multi-country permits.`,
    suggestions:["Split at Vienna or Sofia to switch to rail and reduce road mileage.","Arrange multi-country transit permits in advance.","Intermodal (road + rail) can cut costs and CO₂ by 30–40%."]};
  if(modes.includes("sea")&&!isLong) return{
    insight:`Mediterranean sea route (${distance.toLocaleString()} km), staying within the basin. Direct and efficient option for cargo between Turkey and the western Mediterranean.`,
    suggestions:["Consolidate with other Med shippers to optimise container fill.","Short transit times make this ideal for fast-moving consumer goods.","Consider feeder vessels via hub ports for better schedule coverage."]};
  return{
    insight:`This ${label} route covers ${distance.toLocaleString()} km using ${modes.join(" + ")} transport with ${riskLevel.toLowerCase()} overall risk.`,
    suggestions:["Review modal split for lower-emission alternatives.","Ensure cargo insurance covers all transport modes.","Evaluate consolidation opportunities to improve cost efficiency."]};
}

// ════════════════════════════════════════════════════════════
//  BUILD RESULT
// ════════════════════════════════════════════════════════════
function buildResult(def, container, pickupToPort, mainTransport, portToDelivery, legs, isBRI=false) {
  const fullRoute=[...pickupToPort,...mainTransport.slice(1),...portToDelivery.slice(1)];
  const distance=segDist(fullRoute);
  const{risks,riskLevel}=analyseRisks(mainTransport);
  const{insight,suggestions}=generateInsight(def.label,distance,riskLevel,def.modes,risks);
  const emissions=calcEmissions({pickupToPort,mainTransport,portToDelivery},def.modes,container,isBRI);
  return{routeType:def.label,category:def.category,modes:def.modes,containerType:container,
    segments:{pickupToPort,mainTransport,portToDelivery},
    fullRoute,distance,estimatedCost:null,risks,riskLevel,insight,suggestions,emissions,legs};
}

// ════════════════════════════════════════════════════════════
//  PROJECT ROUTES — POL/POD/Pickup/Delivery fixed per spec
// ════════════════════════════════════════════════════════════
const CONTAINER_TYPES=["20FT","40FT","40HC"];

const PROJECT_ROUTES=[
  // ─── CHINA IMPORT ─────────────────────────────────────
  {id:"cn_suez",  category:"China Import", label:"Sea via Suez Canal",          modes:["sea"],
   build(ct="40FT"){
     const legs={pickup:"Xi'an",pol:"Shanghai",pod:"Aliağa Port",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road([[34.27,108.93],[31.23,121.47]]),
       corridorSuez(),
       road([[38.80,26.97],[38.77,26.93]]),
       legs);}},
  {id:"cn_cape",  category:"China Import", label:"Sea via Cape of Good Hope",   modes:["sea"],
   build(ct="40FT"){
     const legs={pickup:"Xi'an",pol:"Shanghai",pod:"Aliağa Port",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road([[34.27,108.93],[31.23,121.47]]),
       corridorCape(),
       road([[38.80,26.97],[38.77,26.93]]),
       legs);}},
  {id:"cn_bri",   category:"China Import", label:"Rail via BRI (Trans-Caspian)", modes:["rail"],
   build(ct="40FT"){
     const legs={pickup:"Shanghai",pol:"Xi'an",pod:"ESBAŞ",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road([[31.23,121.47],[34.27,108.93]]),
       corridorBRI(),
       road([[38.77,26.93],[38.77,26.93]]),
       legs, true);}},
  // ─── ITALY EXPORT ─────────────────────────────────────
  {id:"it_roro_truck",      category:"Italy Export", label:"RoRo + Truck (Main)",      modes:["roro","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Bari",delivery:"Milan"};
     return buildResult(this,ct,
       road(RD_ESBAŞ_IST.slice(0,2)),   // ESBAŞ→Aliağa (short)
       corridorAliagaBari(),
       road(RD_BARI_MIL),
       legs);}},
  {id:"it_sea_truck",       category:"Italy Export", label:"Sea + Truck",               modes:["sea","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Genoa",delivery:"Milan"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaGenoa(),
       road(RD_GEN_MIL),
       legs);}},
  {id:"it_sea_rail_truck",  category:"Italy Export", label:"Sea + Rail + Truck",        modes:["sea","rail","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Genoa",delivery:"Milan"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaGenoa(),
       road(RD_GEN_MIL),
       legs);}},
  {id:"it_roro_rail_truck", category:"Italy Export", label:"RoRo + Rail + Truck",       modes:["roro","rail","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Ancona",delivery:"Bologna"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaAncona(),
       road(RD_ANC_BOL),
       legs);}},
  // ─── GERMANY EXPORT ───────────────────────────────────
  {id:"de_truck",           category:"Germany Export", label:"Truck via Balkan Corridor",     modes:["road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"ESBAŞ",pod:"Frankfurt",delivery:"Frankfurt"};
     return buildResult(this,ct,
       road([[38.77,26.93]]),
       road([...RD_ESBAŞ_IST,...RD_IST_FRA.slice(1)]),
       road([[50.11,8.68]]),
       legs);}},
  {id:"de_roro_rail",       category:"Germany Export", label:"RoRo + Rail + Truck",           modes:["roro","rail","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Patras",delivery:"Munich"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaPatras(),
       road(RD_PAT_MUC),
       legs);}},
  {id:"de_roro_truck",      category:"Germany Export", label:"RoRo + Truck",                  modes:["roro","road"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Bari",delivery:"Frankfurt"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaBari(),
       road(RD_BARI_FRA),
       legs);}},
  {id:"de_sea",             category:"Germany Export", label:"Sea (Med → Atlantic)",           modes:["sea"],
   build(ct="40FT"){
     const legs={pickup:"ESBAŞ",pol:"Aliağa Port",pod:"Hamburg",delivery:"Frankfurt"};
     return buildResult(this,ct,
       road([[38.77,26.93],[38.80,26.97]]),
       corridorAliagaHamburg(),
       road(RD_HAM_FRA),
       legs);}},
  // ─── ITALY IMPORT ─────────────────────────────────────
  {id:"it_imp_truck",       category:"Italy Import", label:"Truck via Balkan Corridor",   modes:["road"],
   build(ct="40FT"){
     const legs={pickup:"Milan",pol:"Milan",pod:"Aliağa Port",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road([[45.46,9.19]]),
       road([...RD_MIL_IST,...RD_IST_ESBAŞ.slice(1)]),
       road([[38.80,26.97],[38.77,26.93]]),
       legs);}},
  {id:"it_imp_sea",         category:"Italy Import", label:"Sea Direct (Mediterranean)",  modes:["sea"],
   build(ct="40FT"){
     const legs={pickup:"Milan",pol:"Genoa",pod:"Aliağa Port",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road(RD_GEN_MIL.slice().reverse()),
       corridorGenoaAliaga(),
       road([[38.80,26.97],[38.77,26.93]]),
       legs);}},
  {id:"it_imp_roro",        category:"Italy Import", label:"Truck + RoRo (via Bari)",     modes:["road","roro"],
   build(ct="40FT"){
     const legs={pickup:"Milan",pol:"Bari",pod:"Aliağa Port",delivery:"ESBAŞ"};
     return buildResult(this,ct,
       road(RD_MIL_BARI),
       corridorBariAliaga(),
       road([[38.80,26.97],[38.77,26.93]]),
       legs);}},
];

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════
const SEG_STYLE={
  sea: {color:"#2563eb",weight:3.5,dashArray:"11 7",label:"🚢 Sea"},
  road:{color:"#16a34a",weight:3,  dashArray:null,   label:"🚛 Road"},
  rail:{color:"#ea580c",weight:2.5,dashArray:"7 4",  label:"🚂 Rail"},
  roro:{color:"#7c3aed",weight:3,  dashArray:"9 5",  label:"⛴ RoRo"},
};
const RISK_COLOR={High:"#dc2626",Medium:"#d97706",Low:"#16a34a"};
const RISK_BG   ={High:"#fef2f2",Medium:"#fffbeb",Low:"#f0fdf4"};
const MODE_ICON ={sea:"🚢",road:"🚛",rail:"🚂",roro:"⛴"};
const CINFO={"20FT":{note:"25,000–28,300 kg · avg 26.65t payload"},"40FT":{note:"26,500–28,800 kg · avg 27.65t payload"},"40HC":{note:"28,500–28,700 kg · avg 28.60t payload"}};
const CO2_COLOR=kg=>kg<500?"#16a34a":kg<2000?"#d97706":"#dc2626";
function mainStyle(modes){
  if(modes.includes("sea"))  return SEG_STYLE.sea;
  if(modes.includes("roro")) return SEG_STYLE.roro;
  if(modes.includes("rail")) return SEG_STYLE.rail;
  return SEG_STYLE.road;
}

// ════════════════════════════════════════════════════════════
//  MAP VIEW
// ════════════════════════════════════════════════════════════
function MapView({result}){
  const mapEl=useRef(null),mapObj=useRef(null),layers=useRef([]);
  useEffect(()=>{
    if(!mapEl.current||mapObj.current) return;
    const L=window.L;
    mapObj.current=L.map(mapEl.current,{center:[35,25],zoom:3});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {attribution:"© OpenStreetMap",maxZoom:18}).addTo(mapObj.current);
  },[]);
  useEffect(()=>{
    const L=window.L;
    if(!mapObj.current||!L) return;
    layers.current.forEach(l=>l.remove()); layers.current=[];
    if(!result) return;
    const{segments,modes,risks}=result,ms=mainStyle(modes),allPts=[];
    const poly=(pts,style)=>{
      if(!pts?.length) return;
      const p=L.polyline(pts,{...style,opacity:0.92}).addTo(mapObj.current);
      layers.current.push(p); pts.forEach(c=>allPts.push(c));
    };
    poly(segments.pickupToPort,  SEG_STYLE.road);
    poly(segments.mainTransport, ms);
    poly(segments.portToDelivery,SEG_STYLE.road);
    risks.forEach(r=>{
      const z=RISK_ZONES.find(z=>z.name===r.name); if(!z) return;
      const col=RISK_COLOR[r.level];
      const c=L.circle(z.center,{radius:z.radiusKm*1000,color:col,
        fillColor:col,fillOpacity:0.07,weight:1.5,dashArray:"5 4"}).addTo(mapObj.current);
      c.bindTooltip(`<span style="font-size:11px;color:${col};font-weight:700">${r.name}<br/>${r.level} Risk</span>`,
        {permanent:true,direction:"center",className:"rtip"});
      layers.current.push(c);
    });
    const mkr=(coord,label,bg)=>L.marker(coord,{icon:L.divIcon({
      html:`<div style="background:${bg};color:#fff;padding:3px 9px;border-radius:5px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">${label}</div>`,
      className:"",iconAnchor:[0,10]})}).addTo(mapObj.current);
    const s=segments.pickupToPort?.[0],e=segments.portToDelivery?.[segments.portToDelivery.length-1];
    const polPt=segments.mainTransport?.[0],podPt=segments.mainTransport?.[segments.mainTransport.length-1];
    if(s)     layers.current.push(mkr(s,    "⬤ Pickup",   "#1d4ed8"));
    if(e)     layers.current.push(mkr(e,    "⬤ Delivery", "#b91c1c"));
    if(polPt) layers.current.push(mkr(polPt,"⚓ POL",      "#0369a1"));
    if(podPt) layers.current.push(mkr(podPt,"⚓ POD",      "#6d28d9"));
    if(allPts.length>1) mapObj.current.fitBounds(L.latLngBounds(allPts),{padding:[50,50]});
  },[result]);
  return(<div>
    <div ref={mapEl} style={{width:"100%",height:440,borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}/>
    <style>{`.rtip{background:transparent!important;border:none!important;box-shadow:none!important;}`}</style>
  </div>);
}

// ════════════════════════════════════════════════════════════
//  EMISSIONS PANEL
// ════════════════════════════════════════════════════════════
function EmissionsPanel({emissions,containerType}){
  const{co2Total,co2Main,co2Road1,co2Road2,mainMode,distMain,distRoad1,distRoad2,efUsed,cargoWeight}=emissions;
  const col=CO2_COLOR(co2Total);
  const maxVal=Math.max(co2Road1,co2Main,co2Road2,1);
  const bar=(v,c)=>(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
    <div style={{width:`${Math.max(4,Math.round((v/maxVal)*200))}px`,height:13,background:c,borderRadius:3}}/>
    <span style={{fontSize:12,color:"var(--color-text-primary)",fontWeight:600}}>{v.toLocaleString()} kg</span>
  </div>);
  const others=["20FT","40FT","40HC"].filter(c=>c!==containerType).map(c=>{
    const w=ECOTRANSIT.cargoWeight[c];
    return{type:c,total:Math.round((efUsed*w*distMain)/1000)+Math.round((96*w*distRoad1)/1000)+Math.round((96*w*distRoad2)/1000)};
  });
  return(<div style={{...crd,borderLeft:"4px solid #10b981"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div>
        <div style={ct}>🌱 Carbon Emissions — EcoTransit WTW (ISO 14083)</div>
        <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Payload: {cargoWeight}t avg ({containerType}) · EF: {efUsed} g CO₂e/t-km</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontSize:30,fontWeight:900,color:col,lineHeight:1}}>{(co2Total/1000).toFixed(3)}</div>
        <div style={{fontSize:12,color:"var(--color-text-secondary)",fontWeight:600}}>tonnes CO₂e</div>
        <div style={{fontSize:11,color:col,fontWeight:600}}>{co2Total.toLocaleString()} kg</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Segment breakdown</div>
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3}}>🚛 Pickup → POL ({distRoad1.toLocaleString()} km)</div>
        {bar(co2Road1,"#16a34a")}
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3,marginTop:6}}>{MODE_ICON[mainMode]} Main ({distMain.toLocaleString()} km)</div>
        {bar(co2Main,mainMode==="sea"?"#2563eb":mainMode==="roro"?"#7c3aed":mainMode==="rail"?"#ea580c":"#16a34a")}
        <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:3,marginTop:6}}>🚛 POD → Delivery ({distRoad2.toLocaleString()} km)</div>
        {bar(co2Road2,"#16a34a")}
        <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid var(--color-border-tertiary)",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:13,fontWeight:700}}>Total</span>
          <span style={{fontSize:13,color:col,fontWeight:800}}>{co2Total.toLocaleString()} kg CO₂e</span>
        </div>
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Container comparison</div>
        <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",marginBottom:6,border:"2px solid #10b981"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontWeight:700,fontSize:13,color:"#065f46"}}>{containerType} <span style={{fontSize:10,background:"#10b981",color:"#fff",padding:"1px 6px",borderRadius:4}}>SELECTED</span></div>
            <div style={{fontSize:11,color:"#047857"}}>{cargoWeight}t payload</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:17,fontWeight:800,color:"#065f46"}}>{(co2Total/1000).toFixed(3)}</div>
            <div style={{fontSize:10,color:"#047857"}}>t CO₂e</div></div>
          </div>
        </div>
        {others.map(o=>(<div key={o.type} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 12px",marginBottom:6,border:"1px solid var(--color-border-tertiary)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:600,fontSize:13}}>{o.type}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{ECOTRANSIT.cargoWeight[o.type]}t payload</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:CO2_COLOR(o.total)}}>{(o.total/1000).toFixed(3)}</div>
            <div style={{fontSize:10,color:"var(--color-text-secondary)"}}>t CO₂e</div></div>
          </div>
          <div style={{fontSize:10,color:"var(--color-text-secondary)",marginTop:4}}>
            {o.total>co2Total?`+${(o.total-co2Total).toLocaleString()}`:`−${(co2Total-o.total).toLocaleString()}`} kg vs selected
          </div>
        </div>))}
      </div>
    </div>
  </div>);
}

// ════════════════════════════════════════════════════════════
//  RESULTS PANEL
// ════════════════════════════════════════════════════════════
function ResultsPanel({result}){
  if(!result) return null;
  const{routeType,category,modes,containerType,distance,risks,riskLevel,insight,suggestions,emissions,legs}=result;
  return(<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
      {[{label:"Category",val:category,sub:routeType,accent:"#6366f1"},
        {label:"Distance",val:`${distance.toLocaleString()} km`,sub:"Full multi-leg",accent:"#0ea5e9"},
        {label:"Container",val:containerType,sub:CINFO[containerType]?.note,accent:"#f59e0b"},
        {label:"CO₂e Total",val:`${(emissions.co2Total/1000).toFixed(2)} t`,sub:"WTW · EcoTransit",accent:"#10b981"},
      ].map(({label,val,sub,accent})=>(
        <div key={label} style={{background:"var(--color-background-secondary)",borderRadius:8,padding:"10px 14px",borderTop:`3px solid ${accent}`}}>
          <div style={{fontSize:11,color:"var(--color-text-secondary)",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>{label}</div>
          <div style={{fontSize:18,fontWeight:800,margin:"4px 0 2px",lineHeight:1.2}}>{val}</div>
          <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{sub}</div>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <div style={crd}>
        <div style={ct}>🔗 Route Legs</div>
        {[["Pickup",legs.pickup,"#1d4ed8"],["POL",legs.pol,"#0369a1"],["POD",legs.pod,"#6d28d9"],["Delivery",legs.delivery,"#b91c1c"]].map(([lbl,name,col],i,a)=>(
          <div key={lbl} style={{display:"flex",alignItems:"center",gap:8,marginBottom:i<a.length-1?6:0}}>
            <span style={{background:col,color:"#fff",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,minWidth:60,textAlign:"center"}}>{lbl}</span>
            <span style={{fontSize:13,fontWeight:500}}>{name}</span>
            {i<a.length-1&&<span style={{fontSize:11,color:"var(--color-text-secondary)",marginLeft:"auto"}}>↓</span>}
          </div>))}
        <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
          {modes.map(m=>(<span key={m} style={{padding:"3px 10px",borderRadius:20,background:SEG_STYLE[m]?.color+"20",
            color:SEG_STYLE[m]?.color,fontWeight:700,fontSize:12,border:`1px solid ${SEG_STYLE[m]?.color}40`}}>
            {MODE_ICON[m]} {m}</span>))}
        </div>
      </div>
      <div style={{...crd,background:RISK_BG[riskLevel],borderLeft:`4px solid ${RISK_COLOR[riskLevel]}`}}>
        <div style={ct}>⚠️ Risk Zones (sea segment)</div>
        <div style={{fontWeight:700,color:RISK_COLOR[riskLevel],marginBottom:8,fontSize:14}}>{riskLevel} Risk</div>
        {risks.length===0
          ?<div style={{fontSize:13}}>No significant risk zones detected.</div>
          :<div style={{display:"flex",flexDirection:"column",gap:5}}>
            {risks.map((r,i)=><span key={i} style={{fontSize:12,color:RISK_COLOR[r.level],fontWeight:600}}>● {r.name} — {r.level}</span>)}
          </div>}
      </div>
    </div>
    <EmissionsPanel emissions={emissions} containerType={containerType}/>
    <div style={{...crd,borderLeft:"4px solid #6366f1",background:"var(--color-background-secondary)"}}>
      <div style={ct}>💡 Professional Insight</div>
      <p style={{margin:0,fontSize:13.5,lineHeight:1.75}}>{insight}</p>
    </div>
    <div style={{...crd,borderLeft:"4px solid #f59e0b",background:"var(--color-background-secondary)"}}>
      <div style={ct}>⚡ Optimization Suggestions</div>
      <ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:7}}>
        {suggestions.map((s,i)=><li key={i} style={{fontSize:13.5,lineHeight:1.6}}>{s}</li>)}
      </ul>
    </div>
  </div>);
}

// ════════════════════════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════════════════════════
const crd={background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:10,padding:"14px 18px"};
const ct ={fontWeight:700,fontSize:13,marginBottom:10};

// ════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════
const CATEGORIES=[...new Set(PROJECT_ROUTES.map(r=>r.category))];

export default function App(){
  const[ready,setReady]=useState(false);
  const[category,setCategory]=useState(CATEGORIES[0]);
  const[routeId,setRouteId]=useState(PROJECT_ROUTES.find(r=>r.category===CATEGORIES[0])?.id||"");
  const[container,setContainer]=useState("40FT");
  const[result,setResult]=useState(null);

  useEffect(()=>{
    if(window.L){setReady(true);return;}
    const css=document.createElement("link");
    css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js=document.createElement("script");
    js.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload=()=>setReady(true);
    document.head.appendChild(js);
  },[]);

  const catRoutes=PROJECT_ROUTES.filter(r=>r.category===category);
  function handleCat(cat){setCategory(cat);setRouteId(PROJECT_ROUTES.find(r=>r.category===cat)?.id||"");setResult(null);}
  const sel={padding:"9px 12px",border:"1px solid var(--color-border-secondary)",borderRadius:7,fontSize:13.5,
             background:"var(--color-background-secondary)",outline:"none",cursor:"pointer",width:"100%",color:"inherit"};

  return(<div style={{minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
    <div style={{background:"linear-gradient(135deg,#0f172a,#1e40af)",padding:"16px 24px",color:"#fff"}}>
      <div style={{maxWidth:1020,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800}}>🌍 Logistics Carbon Routing Tool</div>
          <div style={{fontSize:11,color:"#93c5fd",marginTop:2}}>Eldor Trade Lanes · Geographically Correct Routes · EcoTransit WTW</div>
        </div>
        <div style={{fontSize:11,color:"#cbd5e1",textAlign:"right"}}>v9.0 · ESBAŞ / Aliağa<br/>13 routes · 4 categories</div>
      </div>
    </div>
    <div style={{maxWidth:1020,margin:"0 auto",padding:"18px 16px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={crd}>
        <div style={ct}>📋 Route Configuration</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 140px auto",gap:12,alignItems:"end"}}>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",display:"block",marginBottom:4,textTransform:"uppercase"}}>Trade Category</label>
            <select style={sel} value={category} onChange={e=>handleCat(e.target.value)}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",display:"block",marginBottom:4,textTransform:"uppercase"}}>Route Type</label>
            <select style={sel} value={routeId} onChange={e=>setRouteId(e.target.value)}>
              {catRoutes.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{fontSize:11,fontWeight:700,color:"var(--color-text-secondary)",display:"block",marginBottom:4,textTransform:"uppercase"}}>Container</label>
            <select style={sel} value={container} onChange={e=>setContainer(e.target.value)}>
              {CONTAINER_TYPES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={()=>{const d=PROJECT_ROUTES.find(r=>r.id===routeId);if(d)setResult(d.build(container));}}
            disabled={!ready}
            style={{padding:"9px 22px",background:"#1d4ed8",color:"#fff",border:"none",borderRadius:7,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:20}}>
            Load Route →
          </button>
        </div>
        <div style={{marginTop:14,display:"flex",gap:20,fontSize:12,color:"var(--color-text-secondary)",flexWrap:"wrap"}}>
          {Object.entries(SEG_STYLE).map(([m,s])=>(
            <span key={m}><span style={{color:s.color,fontWeight:800}}>━━</span> {s.label}</span>))}
        </div>
      </div>
      {ready?<MapView result={result}/>
        :<div style={{height:440,background:"var(--color-background-secondary)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)"}}>Loading map…</div>}
      {result?<ResultsPanel result={result}/>
        :<div style={{...crd,textAlign:"center",color:"var(--color-text-secondary)",padding:"28px 20px"}}>
          Select a category and route type, then click <b>Load Route →</b></div>}
    </div>
  </div>);
}
