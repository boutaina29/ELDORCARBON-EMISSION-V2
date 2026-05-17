/* global React */
// ════════════════════════════════════════════════════════════
//  METHODOLOGY VIEW — EcoTransit + ISO 14083 deep dive
// ════════════════════════════════════════════════════════════

function MethodologyView({ lang = "en" }) {
  const E = window.RoutingEngine.ECOTRANSIT;
  const T = window.TRANSLATIONS[lang].methodology;
  const CDESC = window.TRANSLATIONS[lang].containerDescs || window.TRANSLATIONS.en.containerDescs;

  // Worked example - Shanghai → ESBAŞ via Suez, 40FT
  const sampleRoute = window.RoutingEngine.PROJECT_ROUTES.find(r => r.id === "cn_suez_aliaga");
  const sample = sampleRoute.build("40FT");
  const { distRoad1, distMain, distRoad2, co2Road1, co2Main, co2Road2, cargoWeight } = sample.emissions;

  return (
    <div className="methodology-view">
      <div className="view-header">
        <div>
          <div className="view-header__eyebrow">{T.eyebrow}</div>
          <h2 className="view-header__title">{T.title}</h2>
          <p className="view-header__sub">{T.sub}</p>
        </div>
      </div>

      {/* Step pipeline */}
      <div className="meth-pipeline">
        {T.steps.map(s => (
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
            <div className="card__eyebrow">{T.formulaEyebrow}</div>
            <h3 className="card__title">{T.formulaTitle}</h3>
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
              <div className="card__eyebrow">{T.efEyebrow}</div>
              <h3 className="card__title">{T.efTitle}</h3>
              <div className="card__sub">{T.efSub}</div>
            </div>
          </div>
          <div className="ef-table">
            {[
              { mode: "Sea (container vessel)", ef: E.factors.sea, color: "var(--ocean)", note: T.efNotes.sea },
              { mode: "Rail (European average)", ef: E.factors.rail, color: "var(--rust)", note: T.efNotes.rail },
              { mode: "Rail (BRI Trans-Caspian)", ef: E.factors.railBRI, color: "var(--rust)", note: T.efNotes.railBRI },
              { mode: "RoRo (short-sea ferry)", ef: E.factors.roro, color: "var(--plum)", note: T.efNotes.roro },
              { mode: "Road (heavy truck)", ef: E.factors.road, color: "var(--leaf)", note: T.efNotes.road },
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
              <div className="card__eyebrow">{T.contEyebrow}</div>
              <h3 className="card__title">{T.contTitle}</h3>
              <div className="card__sub">{T.contSub}</div>
            </div>
          </div>
          <div className="cont-spec-list">
            {[
              { type: "20FT", range: "25,000 – 28,300 kg", avg: E.cargoWeight["20FT"], desc: CDESC["20FT"] },
              { type: "40FT", range: "26,500 – 28,800 kg", avg: E.cargoWeight["40FT"], desc: CDESC["40FT"] },
              { type: "40HC", range: "28,500 – 28,700 kg", avg: E.cargoWeight["40HC"], desc: CDESC["40HC"] },
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
            <div className="card__eyebrow">{T.exEyebrow}</div>
            <h3 className="card__title">{T.exTitle}</h3>
            <div className="card__sub">{T.exSub}</div>
          </div>
        </div>
        <div className="example-flow">
          {[
            {
              n: 1, label: T.preCarriage, mode: "Road", ef: E.factors.road,
              dist: distRoad1, payload: cargoWeight, co2: co2Road1,
              segment: "Xi'an → Shanghai", color: "var(--leaf)"
            },
            {
              n: 2, label: T.mainTransport, mode: "Sea", ef: E.factors.sea,
              dist: distMain, payload: cargoWeight, co2: co2Main,
              segment: "Shanghai → Aliağa", color: "var(--ocean)"
            },
            {
              n: 3, label: T.onCarriage, mode: "Road", ef: E.factors.road,
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
            <span className="ex-total__label">{T.totalCO2}</span>
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
              <div className="card__eyebrow">{T.wtwEyebrow}</div>
              <h3 className="card__title">{T.wtwTitle}</h3>
            </div>
          </div>
          <div className="wtw-compare">
            <div className="wtw-side">
              <div className="wtw-side__title">{T.ttwTitle}</div>
              <div className="wtw-side__desc">{T.ttwDesc}</div>
              <div className="wtw-side__cov">{T.ttwCov}</div>
            </div>
            <div className="wtw-arrow">{T.wtwArrow}</div>
            <div className="wtw-side wtw-side--active">
              <div className="wtw-side__title">{T.wtwTitle2}</div>
              <div className="wtw-side__desc">{T.wtwDesc2}</div>
              <div className="wtw-side__cov">{T.wtwCov2}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__eyebrow">{T.stdEyebrow}</div>
              <h3 className="card__title">{T.stdTitle}</h3>
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
