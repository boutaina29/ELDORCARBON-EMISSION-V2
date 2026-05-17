/* global React */
// ════════════════════════════════════════════════════════════
//  INSIGHTS VIEW — Carbon emissions & future regulations
//  in the European automotive industry
// ════════════════════════════════════════════════════════════

function InsightsView({ tweaks = {}, lang = "en" }) {
  const { PROJECT_ROUTES, ECOTRANSIT } = window.RoutingEngine;
  const TI = window.TRANSLATIONS[lang].insights;
  const TIS = window.TRANSLATIONS[lang].insightsSections || window.TRANSLATIONS.en.insightsSections;
  const TREG = window.TRANSLATIONS[lang].regulatoryTimeline || window.TRANSLATIONS.en.regulatoryTimeline;
  const TFW = window.TRANSLATIONS[lang].frameworks || window.TRANSLATIONS.en.frameworks;
  const TLEV = window.TRANSLATIONS[lang].levers || window.TRANSLATIONS.en.levers;
  const SEG = window.SEG_STYLE;
  const etsPrice = tweaks.etsPriceEur || 95;
  const annualContainers = tweaks.annualContainers || 600;

  // Build a quick lane-vs-lane comparison for the user's catalogue
  const lanes = React.useMemo(() => {
    return PROJECT_ROUTES.map(r => {
      const result = r.build("40FT");
      return {
        id: r.id, label: r.label, category: r.category, modes: r.modes,
        distance: result.distance,
        co2: result.emissions.co2Total,
        mainMode: result.emissions.mainMode,
      };
    });
  }, []);

  const bestPerCategory = React.useMemo(() => {
    const map = {};
    lanes.forEach(l => {
      if (!map[l.category] || l.co2 < map[l.category].co2) map[l.category] = l;
    });
    return map;
  }, [lanes]);

  const fleetAvg = lanes.reduce((a, b) => a + b.co2, 0) / lanes.length;
  const annualFleetCO2 = (fleetAvg * annualContainers) / 1000; // tonnes
  const annualETSExposure = annualFleetCO2 * etsPrice;          // €
  const annualRailScenario = annualFleetCO2 * 0.45;             // approx if 55% shift to rail/sea

  const [openYear, setOpenYear] = React.useState("2026");

  return (
    <div className="reports-view">
      {/* ─── Hero ───────────────────────────────────────── */}
      <div className="ins-hero">
        <div className="ins-hero__col">
          <div className="ins-hero__eyebrow">{TI.eyebrow}</div>
          <h2 className="ins-hero__title">
            {TI.title}<br />
            <em>{TI.titleEm}</em>
          </h2>
          <p className="ins-hero__sub" dangerouslySetInnerHTML={{ __html: TI.sub }} />
        </div>
        <div className="ins-hero__stats">
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">{Math.round(annualFleetCO2).toLocaleString()}<em> t CO₂e</em></div>
            <div className="ins-hero__stat-lbl">{TI.annualStat(annualContainers)}</div>
          </div>
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">€{Math.round(annualETSExposure).toLocaleString()}</div>
            <div className="ins-hero__stat-lbl">{TI.etsStat(etsPrice)}</div>
          </div>
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">−{Math.round(((annualFleetCO2 - annualRailScenario) / annualFleetCO2) * 100)}%</div>
            <div className="ins-hero__stat-lbl">{TI.railStat}</div>
          </div>
        </div>
      </div>

      {/* ─── 1. The carbon footprint of automotive logistics ─── */}
      <div className="card card--ins">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">{TI.s1eyebrow}</div>
            <h3 className="card__title">{TI.s1title}</h3>
            <div className="card__sub">{TI.s1sub}</div>
          </div>
        </div>
        <div className="mode-bars">
          {[
            { mode: "sea",  label: "Container vessel",      ef: ECOTRANSIT.factors.sea,     note: "Large deep-sea container ships, 8 000+ TEU. Best intensity per tonne-km but routing is fixed." },
            { mode: "rail", label: "Electric rail (EU)",     ef: ECOTRANSIT.factors.rail,    note: "European electrified freight rail. The single biggest lever for inland decarbonisation." },
            { mode: "rail", label: "BRI / Middle Corridor",  ef: ECOTRANSIT.factors.railBRI, note: "Mixed electric + diesel traction, gauge changes, ferry crossing → higher EF than EU rail.", brand: true },
            { mode: "roro", label: "RoRo ferry",             ef: ECOTRANSIT.factors.roro,    note: "Short-sea Med/Adriatic. Higher EF per tonne-km than container but eliminates long road legs." },
            { mode: "road", label: "Diesel heavy-goods truck", ef: ECOTRANSIT.factors.road,   note: "EU-average 40t artic. Will face ETS2 carbon pricing from 2027 + Euro 7 from 2026." },
          ].map((row, i) => {
            const max = Math.max(...Object.values(ECOTRANSIT.factors));
            const w = Math.max(6, (row.ef / max) * 100);
            const c = SEG[row.mode]?.color || "#888";
            return (
              <div key={i} className="mode-bar">
                <div className="mode-bar__name">
                  <span className="mode-bar__sw" style={{ background: c }}></span>
                  <span>{row.label}</span>
                  {row.brand && <span className="mode-bar__tag">BRI</span>}
                </div>
                <div className="mode-bar__track">
                  <div className="mode-bar__fill" style={{ width: `${w}%`, background: c }}></div>
                </div>
                <div className="mode-bar__val">
                  <strong>{row.ef.toFixed(1)}</strong>
                  <em>g CO₂e/t·km</em>
                </div>
                <div className="mode-bar__note">{row.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 2. Regulatory timeline ─────────────────────────── */}
      <div className="card card--ins">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">{TI.s2eyebrow}</div>
            <h3 className="card__title">{TI.s2title}</h3>
            <div className="card__sub">Six overlapping regimes that price, cap or ban carbon in the European auto value chain</div>
          </div>
        </div>
        <div className="reg-timeline">
          {TREG.map(item => (
            <button
              key={item.year}
              className={`reg-row ${openYear === item.year ? "is-open" : ""}`}
              onClick={() => setOpenYear(openYear === item.year ? "" : item.year)}
            >
              <div className="reg-row__head">
                <div className="reg-row__year">{item.year}</div>
                <div className="reg-row__title">{item.title}</div>
                <div className={`reg-row__tag reg-row__tag--${item.tag}`}>{item.tag.replace("-", " ")}</div>
                <div className="reg-row__chev">{openYear === item.year ? "−" : "+"}</div>
              </div>
              {openYear === item.year && (
                <div className="reg-row__body">
                  <p>{item.body}</p>
                  <div className="reg-row__touches">
                    <span>Lane impact</span>
                    <strong>{item.touches}</strong>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. Frameworks every logistics manager should know ─── */}
      <div className="card card--ins">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">{TIS.s3eyebrow}</div>
            <h3 className="card__title">{TIS.s3title}</h3>
            <div className="card__sub">{TIS.s3sub}</div>
          </div>
        </div>
        <div className="frameworks">
          {TFW.map(fw => (
            <div key={fw.code} className="fw">
              <div className="fw__code">{fw.code}</div>
              <div className="fw__name">{fw.name}</div>
              <p className="fw__body">{fw.body}</p>
              <div className="fw__use">{fw.use}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Decarbonisation levers ─────────────────────── */}
      <div className="card card--ins card--levers">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">{TIS.s4eyebrow}</div>
            <h3 className="card__title">{TIS.s4title}</h3>
            <div className="card__sub">{TIS.s4sub}</div>
          </div>
        </div>
        <div className="levers">
          {TLEV.map(l => (
            <div key={l.rank} className="lever">
              <div className="lever__rank">{String(l.rank).padStart(2, "0")}</div>
              <div className="lever__body">
                <div className="lever__title">{l.title}</div>
                <div className="lever__copy">{l.body}</div>
              </div>
              <div className="lever__saving">{l.saving}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 5. What this means for THIS catalogue ──────────── */}
      <div className="card card--ins">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">{TIS.s5eyebrow}</div>
            <h3 className="card__title">{TIS.s5title}</h3>
            <div className="card__sub">{TIS.s5sub}</div>
          </div>
        </div>
        <div className="ready-grid">
          {Object.values(bestPerCategory).map(b => (
            <div key={b.id} className="ready">
              <div className="ready__cat">{b.category}</div>
              <div className="ready__pick" style={{ "--c": SEG[b.mainMode]?.color }}>
                <span className="ready__mode">{window.MODE_GLYPH[b.mainMode]}</span>
                <span className="ready__label">{b.label}</span>
              </div>
              <div className="ready__nums">
                <div>
                  <em>{window.TRANSLATIONS[lang].ui ? window.TRANSLATIONS[lang].ui.distLabel : "Distance"}</em>
                  <strong>{b.distance.toLocaleString()} km</strong>
                </div>
                <div>
                  <em>{TIS.perContainer}</em>
                  <strong>{(b.co2 / 1000).toFixed(2)} t CO₂e</strong>
                </div>
                <div>
                  <em>{TIS.at} {annualContainers}{TIS.perYr}</em>
                  <strong>{Math.round((b.co2 * annualContainers) / 1000).toLocaleString()} t CO₂e</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="ready-note" dangerouslySetInnerHTML={{ __html: TIS.readyNote }} />
      </div>

      {/* ─── Footer / sources ────────────────────────────── */}
      <div className="ins-sources">
        <div className="ins-sources__label">{TIS.sourcesLabel}</div>
        <ul>
          <li>Regulation (EU) 2023/956 — Carbon Border Adjustment Mechanism.</li>
          <li>Regulation (EU) 2023/851 — CO₂ emission performance standards for new cars and vans (2035 ICE phase-out).</li>
          <li>Regulation (EU) 2024/1610 — Strengthened CO₂ standards for new heavy-duty vehicles.</li>
          <li>Directive (EU) 2023/959 — ETS revision incl. maritime + ETS2 buildings & road transport (2027).</li>
          <li>Regulation (EU) 2023/1805 — FuelEU Maritime: GHG intensity of maritime energy.</li>
          <li>ISO 14083:2023 — Quantification and reporting of GHG emissions of transport chain operations.</li>
          <li>Smart Freight Centre — GLEC Framework v3.1 (2024).</li>
        </ul>
      </div>
    </div>
  );
}

window.ReportsView = InsightsView;
