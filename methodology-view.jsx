/* global React */
// ════════════════════════════════════════════════════════════
//  METHODOLOGY VIEW — EcoTransit + ISO 14083 deep dive
// ════════════════════════════════════════════════════════════

function MethodologyView() {
  const E = window.RoutingEngine.ECOTRANSIT;

  const formula = "CO₂e = EF × payload × distance ÷ 1000";

  // Worked example - Shanghai → ESBAŞ via Suez, 40FT
  const sampleRoute = window.RoutingEngine.PROJECT_ROUTES.find(r => r.id === "cn_suez_sha");
  const sample = sampleRoute.build("40FT");
  const { distRoad1, distMain, distRoad2, co2Road1, co2Main, co2Road2, cargoWeight } = sample.emissions;

  return (
    <div className="methodology-view">
      <div className="view-header">
        <div>
          <div className="view-header__eyebrow">Module 04</div>
          <h2 className="view-header__title">Methodology — EcoTransit WTW</h2>
          <p className="view-header__sub">
            Every kilogram of CO₂ in this dashboard is calculated using the EcoTransit emission model, aligned with <strong>ISO 14083:2023</strong>—the international standard for quantifying greenhouse gas emissions from transport chains.
          </p>
        </div>
      </div>

      {/* Step pipeline */}
      <div className="meth-pipeline">
        {[
          { n: "01", t: "Identify segments", d: "Decompose route into pickup → POL → POD → delivery legs." },
          { n: "02", t: "Assign modes & EFs", d: "Pull EcoTransit emission factor per mode (g CO₂e per t-km)." },
          { n: "03", t: "Apply payload", d: "Multiply by container average payload (ISO standard)." },
          { n: "04", t: "Sum & report", d: "Aggregate WTW (well-to-wheel) emissions across all legs." },
        ].map(s => (
          <div key={s.n} className="meth-step">
            <div className="meth-step__num">{s.n}</div>
            <div className="meth-step__title">{s.t}</div>
            <div className="meth-step__desc">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Formula card */}
      <div className="card card--formula">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">The formula</div>
            <h3 className="card__title">Core calculation per segment</h3>
          </div>
          <div className="formula-iso">
            <span className="formula-iso__chip">ISO 14083</span>
            <span className="formula-iso__chip">WTW basis</span>
          </div>
        </div>
        <div className="formula-block">
          <div className="formula-display">
            <span className="formula-result">CO₂e</span>
            <span className="formula-eq">=</span>
            <span className="formula-var formula-var--ef">EF</span>
            <span className="formula-op">×</span>
            <span className="formula-var formula-var--payload">payload</span>
            <span className="formula-op">×</span>
            <span className="formula-var formula-var--dist">distance</span>
            <span className="formula-eq">÷</span>
            <span className="formula-const">1000</span>
          </div>
          <div className="formula-legend">
            <div className="fl-item">
              <span className="fl-dot" style={{ background: "var(--leaf)" }}></span>
              <div>
                <strong>EF</strong> · Emission factor in <em>g CO₂e per tonne-km</em> · varies per mode
              </div>
            </div>
            <div className="fl-item">
              <span className="fl-dot" style={{ background: "var(--rust)" }}></span>
              <div>
                <strong>payload</strong> · Average container payload in <em>tonnes</em>
              </div>
            </div>
            <div className="fl-item">
              <span className="fl-dot" style={{ background: "var(--ocean)" }}></span>
              <div>
                <strong>distance</strong> · Segment length in <em>kilometres</em>
              </div>
            </div>
            <div className="fl-item">
              <span className="fl-dot" style={{ background: "var(--plum)" }}></span>
              <div>
                <strong>÷1000</strong> · Converts grams to kilograms CO₂e
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-col: Emission factors + Payload table */}
      <div className="meth-grid">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__eyebrow">Emission factors</div>
              <h3 className="card__title">Per transport mode</h3>
              <div className="card__sub">g CO₂e per tonne-kilometre · WTW basis</div>
            </div>
          </div>
          <div className="ef-table">
            {[
              { mode: "Sea (container vessel)", ef: E.factors.sea, color: "var(--ocean)", note: "Lowest intensity; ideal for long-haul bulk." },
              { mode: "Rail (European average)", ef: E.factors.rail, color: "var(--rust)", note: "Electric traction; low-carbon for inland." },
              { mode: "Rail (BRI Trans-Caspian)", ef: E.factors.railBRI, color: "var(--rust)", note: "Higher EF — diesel + gauge breaks." },
              { mode: "RoRo (short-sea ferry)", ef: E.factors.roro, color: "var(--plum)", note: "Roll-on/roll-off · medium intensity." },
              { mode: "Road (heavy truck)", ef: E.factors.road, color: "var(--leaf)", note: "Highest intensity; door-to-door flex." },
            ].map((r, i) => {
              const maxEF = Math.max(E.factors.road, E.factors.roro);
              return (
                <div key={i} className="ef-row" style={{ "--c": r.color }}>
                  <div className="ef-row__head">
                    <span className="ef-row__mode">{r.mode}</span>
                    <span className="ef-row__num">
                      {r.ef.toFixed(1)}
                      <em>g/t-km</em>
                    </span>
                  </div>
                  <div className="ef-row__bar">
                    <div className="ef-row__fill" style={{ width: `${(r.ef/maxEF)*100}%`, background: r.color }}></div>
                  </div>
                  <div className="ef-row__note">{r.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__eyebrow">Container payloads</div>
              <h3 className="card__title">Average cargo weight</h3>
              <div className="card__sub">ISO container specs · midpoint of operational range</div>
            </div>
          </div>
          <div className="cont-spec-list">
            {[
              { type: "20FT", range: "25,000 – 28,300 kg", avg: E.cargoWeight["20FT"], desc: "Standard 20-foot dry container. Common for dense cargo." },
              { type: "40FT", range: "26,500 – 28,800 kg", avg: E.cargoWeight["40FT"], desc: "Standard 40-foot dry. The workhorse of containerised freight." },
              { type: "40HC", range: "28,500 – 28,700 kg", avg: E.cargoWeight["40HC"], desc: "40-foot high-cube. Extra height for volumetric cargo." },
            ].map(c => (
              <div key={c.type} className="cont-spec">
                <div className="cont-spec__head">
                  <span className="cont-spec__type">{c.type}</span>
                  <span className="cont-spec__avg">{c.avg} <em>t avg</em></span>
                </div>
                <div className="cont-spec__range">Operational range: {c.range}</div>
                <div className="cont-spec__desc">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worked example */}
      <div className="card card--example">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">Worked example</div>
            <h3 className="card__title">Shanghai → ESBAŞ via Suez · 40FT</h3>
            <div className="card__sub">Every number in this dashboard is built from operations like this</div>
          </div>
        </div>
        <div className="example-flow">
          {[
            { 
              n: 1, label: "Pre-carriage", mode: "Road", ef: E.factors.road,
              dist: distRoad1, payload: cargoWeight, co2: co2Road1,
              segment: "Xi'an → Shanghai", color: "var(--leaf)"
            },
            { 
              n: 2, label: "Main transport", mode: "Sea", ef: E.factors.sea,
              dist: distMain, payload: cargoWeight, co2: co2Main,
              segment: "Shanghai → Aliağa", color: "var(--ocean)"
            },
            { 
              n: 3, label: "On-carriage", mode: "Road", ef: E.factors.road,
              dist: distRoad2, payload: cargoWeight, co2: co2Road2,
              segment: "Aliağa → ESBAŞ", color: "var(--leaf)"
            },
          ].map(seg => (
            <div key={seg.n} className="ex-seg" style={{ "--c": seg.color }}>
              <div className="ex-seg__num">{seg.n}</div>
              <div className="ex-seg__body">
                <div className="ex-seg__title">{seg.label} · <span>{seg.segment}</span></div>
                <div className="ex-seg__calc">
                  <span className="ex-token ex-token--ef">{seg.ef}</span>
                  <span className="ex-op">×</span>
                  <span className="ex-token ex-token--p">{seg.payload}</span>
                  <span className="ex-op">×</span>
                  <span className="ex-token ex-token--d">{seg.dist.toLocaleString()}</span>
                  <span className="ex-op">÷</span>
                  <span className="ex-token ex-token--c">1000</span>
                  <span className="ex-op">=</span>
                  <span className="ex-token ex-token--r">{seg.co2.toLocaleString()} <em>kg</em></span>
                </div>
              </div>
            </div>
          ))}
          <div className="ex-total">
            <span className="ex-total__label">TOTAL CO₂e</span>
            <span className="ex-total__value">{sample.emissions.co2Total.toLocaleString()} kg</span>
            <span className="ex-total__sub">= {(sample.emissions.co2Total/1000).toFixed(3)} tonnes</span>
          </div>
        </div>
      </div>

      {/* WTW vs TTW + standards */}
      <div className="meth-grid">
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__eyebrow">WTW vs TTW</div>
              <h3 className="card__title">Why well-to-wheel matters</h3>
            </div>
          </div>
          <div className="wtw-compare">
            <div className="wtw-side">
              <div className="wtw-side__title">Tank-to-wheel (TTW)</div>
              <div className="wtw-side__desc">Tailpipe emissions only — what comes out the exhaust during transport.</div>
              <div className="wtw-side__cov">Covers: combustion only</div>
            </div>
            <div className="wtw-arrow">→ extends to →</div>
            <div className="wtw-side wtw-side--active">
              <div className="wtw-side__title">Well-to-wheel (WTW)</div>
              <div className="wtw-side__desc">Full lifecycle: fuel extraction, refining, distribution, AND combustion. Always 20–30% higher than TTW.</div>
              <div className="wtw-side__cov">Covers: upstream + tailpipe</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__eyebrow">Standards & sources</div>
              <h3 className="card__title">Why these numbers can be trusted</h3>
            </div>
          </div>
          <div className="standards-list">
            {[
              { code: "ISO 14083:2023", title: "GHG emissions from transport operations", desc: "International standard published March 2023. Defines methodology for quantifying emissions of passenger and freight transport chains." },
              { code: "EcoTransit World", title: "ifeu-Heidelberg emission model", desc: "Independent research institute's freight emission database. Industry reference since 2003, used by DB Schenker, Kuehne+Nagel, EU agencies." },
              { code: "GLEC Framework v3", title: "Smart Freight Centre", desc: "Compatible methodology endorsed by the Smart Freight Centre and aligned with the ISO standard." },
            ].map((s, i) => (
              <div key={i} className="std-row">
                <div className="std-row__code">{s.code}</div>
                <div className="std-row__body">
                  <div className="std-row__title">{s.title}</div>
                  <div className="std-row__desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.MethodologyView = MethodologyView;
