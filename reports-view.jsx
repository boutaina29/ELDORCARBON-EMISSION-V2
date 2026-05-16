/* global React */
// ════════════════════════════════════════════════════════════
//  INSIGHTS VIEW — Carbon emissions & future regulations
//  in the European automotive industry
// ════════════════════════════════════════════════════════════

function InsightsView({ tweaks = {} }) {
  const { PROJECT_ROUTES, ECOTRANSIT } = window.RoutingEngine;
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
          <div className="ins-hero__eyebrow">Module 03 · Industry insights</div>
          <h2 className="ins-hero__title">
            The decarbonisation decade<br />
            <em>for automotive logistics</em>
          </h2>
          <p className="ins-hero__sub">
            Between <strong>2024 and 2035</strong> the European automotive supply chain will pass through
            six overlapping regulatory regimes — CSRD, CBAM, Euro 7, ETS2, FuelEU Maritime and the 2035 ICE ban.
            For a Türkiye–EU lane operator like Eldor, each one rewires the cost of carbon in a different way.
            This page sketches the landscape and ties it back to the routes you can model in the tool.
          </p>
        </div>
        <div className="ins-hero__stats">
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">{Math.round(annualFleetCO2).toLocaleString()}<em> t CO₂e</em></div>
            <div className="ins-hero__stat-lbl">Annual emissions at {annualContainers.toLocaleString()} TEU/yr · fleet-avg lane</div>
          </div>
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">€{Math.round(annualETSExposure).toLocaleString()}</div>
            <div className="ins-hero__stat-lbl">ETS-equivalent exposure at €{etsPrice}/t (illustrative)</div>
          </div>
          <div className="ins-hero__stat">
            <div className="ins-hero__stat-num">−{Math.round(((annualFleetCO2 - annualRailScenario) / annualFleetCO2) * 100)}%</div>
            <div className="ins-hero__stat-lbl">Achievable cut by shifting long-haul road to RoRo + rail</div>
          </div>
        </div>
      </div>

      {/* ─── 1. The carbon footprint of automotive logistics ─── */}
      <div className="card card--ins">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">01 · Baseline</div>
            <h3 className="card__title">Carbon intensity by transport mode</h3>
            <div className="card__sub">EcoTransit / GLEC well-to-wheel emission factors · g CO₂e per tonne-kilometre</div>
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
            <div className="card__eyebrow">02 · Timeline</div>
            <h3 className="card__title">Regulatory horizon · 2024 → 2050</h3>
            <div className="card__sub">Six overlapping regimes that price, cap or ban carbon in the European auto value chain</div>
          </div>
        </div>
        <div className="reg-timeline">
          {[
            {
              year: "2024", tag: "active", title: "CSRD · Corporate Sustainability Reporting",
              body: "Large EU companies (and non-EU with EU revenue) must disclose Scope 1/2/3 emissions to ESRS standards. Automotive OEMs cascade this to Tier-1 & Tier-2 suppliers — Türkiye exporters now face structured carbon-data requests from their German and Italian buyers.",
              touches: "Affects every lane in this tool — Scope 3 transport data becomes a contract requirement."
            },
            {
              year: "2026", tag: "tightening", title: "CBAM definitive period + Euro 7",
              body: "Carbon Border Adjustment Mechanism leaves its transitional phase: importers of iron, steel, aluminium, cement, fertilisers, hydrogen and electricity surrender certificates at the EU ETS price. Euro 7 (new emission limits for cars, vans, trucks & buses) enters force in stages from late 2026.",
              touches: "Steel & aluminium components shipped on these lanes carry a CBAM cost on top of transport cost."
            },
            {
              year: "2027", tag: "new-cost", title: "ETS2 · Road transport carbon price",
              body: "A second EU Emissions Trading System covers road transport and buildings fuels. Diesel prices for HGVs rise by an expected €0.10–0.20/litre — the long-haul Balkan road corridor (de_truck, it_imp_truck) is the most exposed.",
              touches: "The all-road Germany Export lane becomes ~12–18 % more expensive overnight."
            },
            {
              year: "2025–2030", tag: "tightening", title: "HDV CO₂ standards · −15% → −45%",
              body: "EU Regulation 2024/1610 forces truck manufacturers to cut new-vehicle fleet CO₂ by 45 % vs 2019 by 2030, 65 % by 2035, 90 % by 2040. Drives mass deployment of battery-electric & H₂ trucks on EU corridors.",
              touches: "By 2030 the Trieste–Munich tail is a realistic candidate for fully zero-emission electric haulage."
            },
            {
              year: "2025–2035", tag: "tightening", title: "FuelEU Maritime · cleaner ship fuels",
              body: "GHG intensity of energy used by ships above 5 000 GT calling at EU ports must drop −2 % (2025), −6 % (2030), −14.5 % (2035) → −80 % by 2050. Combined with EU ETS on maritime (active since 2024), shipping lines pass cost into freight rates.",
              touches: "All container & RoRo lanes in this tool carry a small but rising surcharge for ETS Maritime."
            },
            {
              year: "2035", tag: "ban", title: "100 % zero-emission new cars and vans",
              body: "Regulation (EU) 2023/851: from 1 January 2035 every new passenger car or light commercial vehicle registered in the EU must emit zero CO₂ at the tailpipe. The internal combustion engine ends its commercial life for new EU sales.",
              touches: "Transforms what Türkiye exports to the EU — battery packs, e-axles & EV body parts replace ICE-only components."
            },
            {
              year: "2040–2050", tag: "long", title: "Climate-neutral logistics",
              body: "European Green Deal target: net-zero economy by 2050, with the Climate Law making it legally binding. The Sustainable & Smart Mobility Strategy plans a 90 % cut in transport emissions and a doubling of rail freight by 2050.",
              touches: "Modal-shift away from road becomes a structural feature of every EU automotive flow."
            },
          ].map(item => (
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
            <div className="card__eyebrow">03 · Frameworks</div>
            <h3 className="card__title">Three accounting frameworks worth knowing</h3>
            <div className="card__sub">How emissions on these lanes get measured, audited and reported</div>
          </div>
        </div>
        <div className="frameworks">
          <div className="fw">
            <div className="fw__code">ISO 14083</div>
            <div className="fw__name">Transport chain emissions</div>
            <p className="fw__body">
              International standard published in 2023 that fixes the math for calculating GHG emissions of passenger and freight transport chains. Replaces the older EN 16258 and harmonises the well-to-wheel approach used throughout this tool.
            </p>
            <div className="fw__use">Used here: every EF in the engine.</div>
          </div>
          <div className="fw">
            <div className="fw__code">GLEC v3.1</div>
            <div className="fw__name">Smart Freight Centre framework</div>
            <p className="fw__body">
              The industry implementation of ISO 14083: provides default emission factors, modal allocation rules and data quality scoring. Required by most Tier-1 automotive Scope 3 reporting tools (e.g. Catena-X).
            </p>
            <div className="fw__use">Used here: payload defaults & modal hierarchy.</div>
          </div>
          <div className="fw">
            <div className="fw__code">SBTi · Auto</div>
            <div className="fw__name">Science-Based Targets — automotive guidance</div>
            <p className="fw__body">
              Sets the 1.5 °C-aligned trajectory for OEMs and their suppliers: linear absolute reduction of well-to-wheel emissions from sold vehicles (Scope 3 Cat. 11) of roughly −4.2 % per year. Many EU OEMs flow this down to Türkiye Tier-1s as contractual KPIs.
            </p>
            <div className="fw__use">Used here: implicit target line in the analytics view.</div>
          </div>
        </div>
      </div>

      {/* ─── 4. Decarbonisation levers ─────────────────────── */}
      <div className="card card--ins card--levers">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">04 · Levers</div>
            <h3 className="card__title">Five levers a Tier-1 supplier can actually pull</h3>
            <div className="card__sub">Ordered by impact-per-effort for the Türkiye→EU automotive corridor</div>
          </div>
        </div>
        <div className="levers">
          {[
            { rank: 1, title: "Modal shift to RoRo + rail via Trieste", saving: "−45 to −60 %", body: "Replace long-haul Balkan road with Çeşme→Trieste RoRo + Tauern rail. Largest single-step CO₂ cut available in this catalogue today." },
            { rank: 2, title: "Slow-steaming on the Suez corridor",      saving: "−10 to −20 %", body: "Drop service speed from 22 to 18 knots between Singapore and Suez. No CapEx, only schedule discipline." },
            { rank: 3, title: "Biofuels & e-methanol on short-sea lanes", saving: "−25 to −80 %", body: "FuelEU Maritime makes this cheaper each year. Several Trieste–Türkiye operators already offer B30 biofuel surcharge options." },
            { rank: 4, title: "Battery-electric drayage to ESBAŞ",       saving: "−95 %",         body: "The 60 km ESBAŞ↔Aliağa and 80 km ESBAŞ↔Çeşme legs are well within the range of current EU-spec electric trucks." },
            { rank: 5, title: "Container load consolidation",            saving: "−5 to −12 %",   body: "Push average 40FT loading from ~26 t to ~28.5 t (40HC). Pure logistics planning gain — no infrastructure required." },
          ].map(l => (
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
            <div className="card__eyebrow">05 · Applied</div>
            <h3 className="card__title">Your lanes ranked by climate readiness</h3>
            <div className="card__sub">Lowest-CO₂ option per trade lane is highlighted as the "ready" pick</div>
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
                  <em>Distance</em>
                  <strong>{b.distance.toLocaleString()} km</strong>
                </div>
                <div>
                  <em>Per container</em>
                  <strong>{(b.co2 / 1000).toFixed(2)} t CO₂e</strong>
                </div>
                <div>
                  <em>At {annualContainers}/yr</em>
                  <strong>{Math.round((b.co2 * annualContainers) / 1000).toLocaleString()} t CO₂e</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="ready-note">
          Open the <strong>Routing</strong> tab to recompute each lane at different container sizes, or the <strong>Analytics</strong> tab for the full scatter of distance vs CO₂.
        </div>
      </div>

      {/* ─── Footer / sources ────────────────────────────── */}
      <div className="ins-sources">
        <div className="ins-sources__label">Sources & further reading</div>
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
