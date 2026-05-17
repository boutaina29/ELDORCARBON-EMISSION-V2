/* global React */
// ════════════════════════════════════════════════════════════
//  RESULT PANELS — Emissions, route legs, risk, insights
// ════════════════════════════════════════════════════════════
const { useMemo: _useMemo } = React;

function pct(v, max) { return Math.max(2, Math.round((v / Math.max(max, 1)) * 100)); }
function fmtT(v) { return (v / 1000).toFixed(2); }

// ─── KPI strip ────────────────────────────────────────────
function KpiStrip({ result, lang = "en" }) {
  if (!result) return null;
  const { distance, emissions, containerType, modes, isBRI } = result;
  const TK = window.TRANSLATIONS[lang].kpi;
  const intensity = (emissions.co2Total / Math.max(distance, 1)).toFixed(2);
  const efDisplay = isBRI ? "46.0" : emissions.efMain;
  const kpis = [
    { label: TK.totalDist, val: distance.toLocaleString(), unit: "km", sub: TK.allLegs },
    { label: TK.totalCO2, val: fmtT(emissions.co2Total), unit: TK.tonnes, sub: `${emissions.co2Total.toLocaleString()} kg` },
    { label: TK.intensity, val: intensity, unit: "kg / km", sub: `EF ${efDisplay} g/t-km` },
    { label: TK.payload, val: emissions.cargoWeight.toFixed(2), unit: "t", sub: `${containerType} ${TK.avgPayload}` },
  ];
  return (
    <div className="kpi-strip">
      {kpis.map(k => (
        <div key={k.label} className="kpi">
          <div className="kpi__label">{k.label}</div>
          <div className="kpi__value">
            <span className="kpi__num">{k.val}</span>
            <span className="kpi__unit">{k.unit}</span>
          </div>
          <div className="kpi__sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Emissions panel ──────────────────────────────────────
function EmissionsPanel({ emissions, containerType, lang = "en" }) {
  const E = window.RoutingEngine.ECOTRANSIT;
  const SEG = window.SEG_STYLE;
  const TE = window.TRANSLATIONS[lang].emissions;
  const {
    co2Total, co2Main, co2Inland, co2Road1, co2Road2,
    mainMode, inlandMode, distMain, distInland, distRoad1, distRoad2,
    efMain, efInland, cargoWeight,
  } = emissions;
  const maxVal = Math.max(co2Road1, co2Main, co2Inland || 0, co2Road2, 1);
  const mainColor = SEG[mainMode]?.color || SEG.road.color;
  const inlandColor = inlandMode ? (SEG[inlandMode]?.color || SEG.road.color) : null;
  const others = ["20FT", "40FT", "40HC"].map(c => {
    const w = E.cargoWeight[c];
    const main = Math.round((efMain * w * distMain) / 1000);
    const inland = inlandMode ? Math.round((efInland * w * distInland) / 1000) : 0;
    const r1 = Math.round((96 * w * distRoad1) / 1000);
    const r2 = Math.round((96 * w * distRoad2) / 1000);
    return { type: c, total: main + inland + r1 + r2, isSelected: c === containerType };
  });
  const bestTotal = Math.min(...others.map(o => o.total));

  const rows = [
    distRoad1 > 0 && { name: TE.preCarriage, sub: `${TE.pickupPOL} · ${distRoad1.toLocaleString()} km · ${TE.road}`, val: co2Road1, color: SEG.road.color, glyph: "—" },
    distMain  > 0 && { name: TE.mainTransport, sub: `${mainMode.toUpperCase()} · ${distMain.toLocaleString()} km`, val: co2Main, color: mainColor, glyph: window.MODE_GLYPH[mainMode] },
    inlandMode && distInland > 0 && { name: TE.inlandMainline, sub: `${inlandMode.toUpperCase()} · ${distInland.toLocaleString()} km`, val: co2Inland, color: inlandColor, glyph: window.MODE_GLYPH[inlandMode] },
    distRoad2 > 0 && { name: TE.onCarriage, sub: `${TE.podDelivery} · ${distRoad2.toLocaleString()} km · ${TE.road}`, val: co2Road2, color: SEG.road.color, glyph: "—" },
  ].filter(Boolean);

  return (
    <div className="card card--emissions">
      <div className="card__head">
        <div>
          <div className="card__eyebrow">{TE.eyebrow}</div>
          <h3 className="card__title">{TE.title}</h3>
          <div className="card__sub">EcoTransit · ISO 14083 · payload {cargoWeight.toFixed(2)} t · EF {efMain} g CO₂e/t-km</div>
        </div>
        <div className="big-num">
          <div className="big-num__value">{fmtT(co2Total)}</div>
          <div className="big-num__unit">tonnes CO₂e</div>
          <div className="big-num__sub">{co2Total.toLocaleString()} kg total</div>
        </div>
      </div>

      <div className="emissions-grid">
        <div className="emissions-bars">
          <div className="emissions-bars__title">Segment breakdown</div>
          {rows.map(row => (
            <div key={row.name} className="bar-row">
              <div className="bar-row__head">
                <span className="bar-row__glyph" style={{ color: row.color }}>{row.glyph}</span>
                <span className="bar-row__name">{row.name}</span>
                <span className="bar-row__sub">{row.sub}</span>
                <span className="bar-row__val">{row.val.toLocaleString()} <em>kg</em></span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${pct(row.val, maxVal)}%`, background: row.color }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="emissions-compare">
          <div className="emissions-bars__title">Container comparison</div>
          {others.map(o => {
            const delta = o.total - co2Total;
            const isBest = o.total === bestTotal && !o.isSelected;
            return (
              <div key={o.type} className={`compare-row ${o.isSelected ? "is-selected" : ""}`}>
                <div className="compare-row__head">
                  <span className="compare-row__type">{o.type}</span>
                  {o.isSelected && <span className="compare-row__tag">{TE.selected}</span>}
                  {isBest && <span className="compare-row__tag compare-row__tag--best">Lowest</span>}
                  <span className="compare-row__sub">{E.cargoWeight[o.type]} t payload</span>
                </div>
                <div className="compare-row__num">
                  <span>{fmtT(o.total)}</span>
                  <em>t CO₂e</em>
                </div>
                {!o.isSelected && (
                  <div className="compare-row__delta" style={{ color: delta > 0 ? "#a8392a" : "#3a6b3a" }}>
                    {delta > 0 ? "+" : "−"}{Math.abs(delta).toLocaleString()} kg vs selected
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Route Legs ───────────────────────────────────────────
function LegsPanel({ result, lang = "en" }) {
  const { legs, modes, distance, emissions } = result;
  const SEG = window.SEG_STYLE;
  const TR = window.TRANSLATIONS[lang].route;
  const items = [
    { kind: "pickup",   label: "Pickup",   name: legs.pickup,   color: "#0d0f12" },
    { kind: "pol",      label: "POL",      name: legs.pol,      color: "#1d4275" },
    { kind: "pod",      label: "POD",      name: legs.pod,      color: "#5d3a6e" },
    { kind: "delivery", label: "Delivery", name: legs.delivery, color: "#9d4421" },
  ];
  return (
    <div className="card card--legs">
      <div className="card__head">
        <div>
          <div className="card__eyebrow">{TR.eyebrow}</div>
          <h3 className="card__title">{TR.title}</h3>
        </div>
        <div className="mode-chips">
          {modes.map(m => (
            <span key={m} className="mode-chip" style={{ "--c": SEG[m]?.color }}>
              <span className="mode-chip__glyph">{window.MODE_GLYPH[m]}</span>
              <span>{m}</span>
            </span>
          ))}
        </div>
      </div>
      <ol className="legs">
        {items.map((it, i) => (
          <li key={it.kind} className="leg">
            <div className="leg__rail">
              <span className="leg__dot" style={{ background: it.color }}>
                <span>{i + 1}</span>
              </span>
              {i < items.length - 1 && <span className="leg__line" style={{ borderColor: it.color }}></span>}
            </div>
            <div className="leg__body">
              <div className="leg__label">{it.label}</div>
              <div className="leg__name">{it.name}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="legs-footer">
        <div>
          <div className="legs-footer__label">Distance</div>
          <div className="legs-footer__val">{distance.toLocaleString()} <em>km</em></div>
        </div>
        <div>
          <div className="legs-footer__label">Main mode</div>
          <div className="legs-footer__val">{emissions.mainMode.toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Risk panel ───────────────────────────────────────────
function RiskPanel({ result, lang = "en" }) {
  const { risks, riskLevel } = result;
  const RC = window.RISK_COLOR;
  const TRISK = window.TRANSLATIONS[lang].risk;
  return (
    <div className="card card--risk" style={{ "--accent": RC[riskLevel] }}>
      <div className="card__head">
        <div>
          <div className="card__eyebrow">{TRISK.eyebrow}</div>
          <h3 className="card__title">{TRISK.title}</h3>
        </div>
        <div className={`risk-badge risk-badge--${riskLevel.toLowerCase()}`}>{riskLevel}</div>
      </div>
      {risks.length === 0 ? (
        <div className="risk-empty">
          <div className="risk-empty__title">No high-risk zones intersected</div>
          <div className="risk-empty__sub">The sea segment of this route stays clear of all monitored chokepoints.</div>
        </div>
      ) : (
        <div className="risk-list">
          {risks.map(r => (
            <div key={r.name} className="risk-row" style={{ "--c": RC[r.level] }}>
              <span className="risk-row__pulse"><span></span></span>
              <div className="risk-row__body">
                <div className="risk-row__name">{r.name}</div>
                <div className="risk-row__level">{r.level} risk corridor</div>
              </div>
              <span className="risk-row__chip">{r.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Insight + suggestions ────────────────────────────────
function InsightPanel({ result, lang = "en" }) {
  const { insight, suggestions } = result;
  const TINS = window.TRANSLATIONS[lang].insight;
  
  // Survey insights based on route characteristics
  const getSurveyInsights = () => {
    const { tradeLane, isBRI, legs, risks } = result;
    const insights = [];
    
    // Italy routes analysis
    if (legs.pol?.includes("Italy") || legs.pod?.includes("Italy") || legs.pol?.includes("Trieste") || legs.pod?.includes("Trieste")) {
      insights.push({
        title: "Italy corridors rank highest in logistics survey",
        text: "Based on 32 industry experts evaluating 461 routes: Italy Export Main (RoRo+Truck via Trieste) scores 4.05/5.0 with lowest variability (SD=0.34), while Italy Import Main rates 4.01/5.0. Italy Export Main significantly outperforms Germany Export Main (p=0.0009)."
      });
    }
    
    // Germany routes analysis
    if (legs.pol?.includes("Germany") || legs.pod?.includes("Germany")) {
      insights.push({
        title: "Germany corridor performance",
        text: "Survey shows Germany Export Main averages 3.57/5.0. Germany Export Alternative Route 1 (RoRo+Rail+Truck) scores higher at 4.14/5.0, suggesting multimodal options merit consideration for German lanes."
      });
    }
    
    // Suez vs Cape analysis
    if (risks.some(r => r.name === "Suez Canal")) {
      insights.push({
        title: "Suez Canal critical weakness confirmed",
        text: "Survey reveals Suez geopolitical safety scores 2.50/5.0 vs Cape Route 3.70/5.0 — a highly significant gap (t=-7.09, p<0.001, n=89). This is the strongest statistical finding across all evaluated trade lanes."
      });
    }
    
    // BRI/Rail analysis
    if (isBRI) {
      insights.push({
        title: "Rail corridor challenges validated",
        text: "Trans-Caspian/BRI rail scores lowest overall (3.26/5.0) despite best sustainability performance. Infrastructure quality (2.85) and operational risk remain primary barriers. Survey respondents cite geopolitical uncertainty and reliability concerns."
      });
    }
    
    // China import general
    if (tradeLane?.includes("China Import") || legs.pol?.includes("China") || legs.pol?.includes("Shanghai")) {
      insights.push({
        title: "China import route strategy",
        text: "Survey recommends Cape/ALIAGA or Cape/ALSANCAK for China imports (both score 3.5+). Avoid Suez Canal due to geopolitical risk. Port congestion (3.35/5.0) and On-Time Performance (3.51/5.0) are weakest reliability factors across China lanes."
      });
    }
    
    // Sustainability gap
    insights.push({
      title: "Industry sustainability gap persists",
      text: "Green Options scores lowest across entire survey dataset (3.35/5.0), indicating persistent infrastructure gaps for low-emission routing. CO₂ Emissions average 3.66/5.0, EU Fit-55 Alignment 3.58/5.0."
    });
    
    return insights;
  };
  
  const surveyInsights = getSurveyInsights();
  
  return (
    <div className="card card--insight">
      <div className="card__eyebrow">{TINS.eyebrow}</div>
      <p className="insight-body">{insight}</p>
      
      {surveyInsights.length > 0 && (
        <>
          <div className="insight-divider"></div>
          <div className="card__eyebrow card__eyebrow--inline">Survey analysis · 32 experts · 461 routes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
            {surveyInsights.map((si, i) => (
              <div key={i} style={{ 
                padding: "14px 16px", 
                background: "var(--paper-2)", 
                border: "1px solid var(--line-soft)",
                borderLeft: "3px solid var(--ocean)",
                borderRadius: "6px",
                fontSize: "13px",
                lineHeight: "1.6"
              }}>
                <div style={{ fontWeight: 600, color: "var(--ocean)", marginBottom: "6px", fontSize: "13.5px" }}>
                  {si.title}
                </div>
                <div style={{ color: "var(--ink-2)" }}>
                  {si.text}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      <div className="insight-divider"></div>
      <div className="card__eyebrow card__eyebrow--inline">Optimisation suggestions</div>
      <ol className="suggestions">
        {suggestions.map((s, i) => (
          <li key={i} className="suggestion">
            <span className="suggestion__num">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ResultsPanel({ result, lang = "en" }) {
  if (!result) return null;
  return (
    <div className="results">
      <KpiStrip result={result} lang={lang} />
      <div className="results-grid">
        <LegsPanel result={result} lang={lang} />
        <RiskPanel result={result} lang={lang} />
      </div>
      <EmissionsPanel emissions={result.emissions} containerType={result.containerType} lang={lang} />
      <InsightPanel result={result} lang={lang} />
    </div>
  );
}

window.ResultsPanel = ResultsPanel;
