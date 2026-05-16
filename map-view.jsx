/* global React */
// ════════════════════════════════════════════════════════════
//  MAP VIEW — Leaflet wrapper with redesigned overlays
// ════════════════════════════════════════════════════════════
const { useState, useEffect, useRef, useMemo } = React;

const SEG_STYLE = {
  sea:  { color: "#1d4275", weight: 2.8, dashArray: "10 6", label: "Sea" },
  road: { color: "#3a6b3a", weight: 2.4, dashArray: null,    label: "Road" },
  rail: { color: "#9d4421", weight: 2.4, dashArray: "6 4",   label: "Rail" },
  roro: { color: "#5d3a6e", weight: 2.6, dashArray: "8 5",   label: "RoRo" },
};
const RISK_COLOR = { High: "#a8392a", Medium: "#b6791a", Low: "#3a6b3a" };
const MODE_GLYPH = { sea: "≈", road: "—", rail: "═", roro: "◊" };

function mainStyle(modes) {
  if (modes.includes("sea")) return SEG_STYLE.sea;
  if (modes.includes("roro")) return SEG_STYLE.roro;
  if (modes.includes("rail")) return SEG_STYLE.rail;
  return SEG_STYLE.road;
}

function MapView({ result, showRiskZones = true }) {
  const mapEl = useRef(null), mapObj = useRef(null), layers = useRef([]);

  useEffect(() => {
    if (!mapEl.current || mapObj.current) return;
    const L = window.L;
    mapObj.current = L.map(mapEl.current, {
      center: [35, 25], zoom: 3, zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(mapObj.current);
    // Cartography with clearly blue sea: OSM Standard has rendered water
    // (#aad3df) which contrasts cleanly with all four route mode colours.
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapObj.current);
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!mapObj.current || !L) return;
    layers.current.forEach(l => l.remove());
    layers.current = [];
    if (!result) {
      mapObj.current.setView([35, 25], 3);
      return;
    }
    const { segments, modes, risks } = result;
    const ms = mainStyle(modes);
    const allPts = [];

    const poly = (pts, style, isMain) => {
      if (!pts?.length || pts.length < 2) {
        // single-point segments still contribute to bounds
        if (pts && pts.length === 1) allPts.push(pts[0]);
        return;
      }
      // Shadow underlay
      const shadow = L.polyline(pts, {
        color: "#0d0f12", weight: style.weight + 3,
        opacity: 0.05, lineCap: "round",
      }).addTo(mapObj.current);
      const p = L.polyline(pts, {
        ...style, opacity: isMain ? 0.95 : 0.75, lineCap: "round", lineJoin: "round",
      }).addTo(mapObj.current);
      layers.current.push(shadow, p);
      pts.forEach(c => allPts.push(c));
    };
    poly(segments.pickupToPort, SEG_STYLE.road, false);
    poly(segments.mainTransport, ms, true);
    if (segments.inlandTransport && segments.inlandTransport.points?.length > 1) {
      const inlandStyle = SEG_STYLE[segments.inlandTransport.mode] || SEG_STYLE.road;
      poly(segments.inlandTransport.points, inlandStyle, true);
    }
    // portToDelivery: use main transport style if it's a rail/sea continuation (e.g. BRI Baku→ESBAŞ)
    // otherwise default to road styling for local drayage legs.
    const deliveryStyle = (result.isBRI && segments.portToDelivery?.length > 2)
      ? SEG_STYLE.rail
      : SEG_STYLE.road;
    poly(segments.portToDelivery, deliveryStyle, false);

    // Risk circles
    if (showRiskZones) {
      risks.forEach(r => {
        const z = window.RoutingEngine.RISK_ZONES.find(z => z.name === r.name);
        if (!z) return;
        const col = RISK_COLOR[r.level];
        const c = L.circle(z.center, {
          radius: z.radiusKm * 1000, color: col, fillColor: col,
          fillOpacity: 0.06, weight: 1.2, dashArray: "4 4",
        }).addTo(mapObj.current);
        c.bindTooltip(
          `<div class="risk-tip" style="--c:${col}"><div class="risk-tip__name">${r.name}</div><div class="risk-tip__lvl">${r.level.toUpperCase()} RISK</div></div>`,
          { permanent: true, direction: "center", className: "rtip" }
        );
        layers.current.push(c);
      });
    }

    // Markers
    const mkr = (coord, kind, name) => {
      const map = {
        pickup:   { glyph: "①", label: "Pickup",   bg: "#0d0f12" },
        pol:      { glyph: "②", label: "POL",      bg: "#1d4275" },
        pod:      { glyph: "③", label: "POD",      bg: "#5d3a6e" },
        delivery: { glyph: "④", label: "Delivery", bg: "#9d4421" },
      }[kind];
      return L.marker(coord, {
        icon: L.divIcon({
          html: `<div class="m-pin" style="--bg:${map.bg}">
                   <div class="m-pin__dot">${map.glyph}</div>
                   <div class="m-pin__card">
                     <div class="m-pin__kind">${map.label}</div>
                     <div class="m-pin__name">${name}</div>
                   </div>
                 </div>`,
          className: "", iconSize: [0, 0], iconAnchor: [0, 0],
        }),
      }).addTo(mapObj.current);
    };

    const legs = result.legs;
    const s = segments.pickupToPort?.[0];
    const e = segments.portToDelivery?.[segments.portToDelivery.length - 1];
    const polPt = segments.mainTransport?.[0];
    const podPt = segments.mainTransport?.[segments.mainTransport.length - 1];
    if (s)     layers.current.push(mkr(s, "pickup", legs.pickup));
    if (polPt) layers.current.push(mkr(polPt, "pol", legs.pol));
    if (podPt) layers.current.push(mkr(podPt, "pod", legs.pod));
    if (e)     layers.current.push(mkr(e, "delivery", legs.delivery));

    if (allPts.length > 1) {
      mapObj.current.fitBounds(L.latLngBounds(allPts), { padding: [70, 70] });
    }
  }, [result, showRiskZones]);

  return (
    <div className="map-wrap">
      <div ref={mapEl} className="map-el"></div>
      <div className="map-legend">
        {Object.entries(SEG_STYLE).map(([m, s]) => (
          <div key={m} className="map-legend__item">
            <span className="map-legend__swatch" style={{
              borderColor: s.color,
              borderStyle: s.dashArray ? "dashed" : "solid",
            }}></span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.MapView = MapView;
window.SEG_STYLE = SEG_STYLE;
window.RISK_COLOR = RISK_COLOR;
window.MODE_GLYPH = MODE_GLYPH;
window.mainStyle = mainStyle;
