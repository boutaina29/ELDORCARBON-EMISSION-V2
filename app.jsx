/* global React, ReactDOM */
// ════════════════════════════════════════════════════════════
//  APP SHELL
// ════════════════════════════════════════════════════════════
const { useState: _useState, useEffect: _useEffect } = React;
const { TweaksPanel, useTweaks, TweakSelect, TweakSection, TweakToggle, TweakSlider } = window;

const CAT_META = {
  "China Import":   { code: "CN→TR", color: "#1b7fb8" },
  "Italy Export":   { code: "TR→IT", color: "#e66f2e" },
  "Germany Export": { code: "TR→DE", color: "#2d8f45" },
  "Italy Import":   { code: "IT→TR", color: "#8b5ba8" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{"etsPriceEur":95,"annualContainers":600,"showRiskZones":true}/*EDITMODE-END*/;

// ─── Routing view ──────────────────────────────────────────
function RoutingView({ tweaks, lang }) {
  const T = window.TRANSLATIONS[lang];
  const { PROJECT_ROUTES, CONTAINER_TYPES, CONTAINER_INFO } = window.RoutingEngine;
  const CATEGORIES = [...new Set(PROJECT_ROUTES.map(r => r.category))];

  const [ready, setReady] = _useState(false);
  const [category, setCategory] = _useState(CATEGORIES[0]);
  const [routeId, setRouteId] = _useState(PROJECT_ROUTES.find(r => r.category === CATEGORIES[0])?.id || "");
  const [container, setContainer] = _useState("40FT");
  const [result, setResult] = _useState(null);
  const [computing, setComputing] = _useState(false);

  _useEffect(() => {
    if (window.L) { setReady(true); return; }
    const R = window.__resources || {};
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = R.leafletCss || "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = R.leafletJs || "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = () => setReady(true);
    document.head.appendChild(js);
  }, []);

  const catRoutes = PROJECT_ROUTES.filter(r => r.category === category);
  const selectedRoute = PROJECT_ROUTES.find(r => r.id === routeId);

  function handleCat(c) {
    setCategory(c);
    const first = PROJECT_ROUTES.find(r => r.category === c);
    setRouteId(first?.id || "");
  }

  function compute() {
    if (!selectedRoute) return;
    setComputing(true);
    setTimeout(() => {
      setResult(selectedRoute.build(container));
      setComputing(false);
    }, 380);
  }

  _useEffect(() => {
    if (ready && !result && selectedRoute) {
      setResult(selectedRoute.build(container));
    }
    // eslint-disable-next-line
  }, [ready]);

  const meta = CAT_META[category];

  return (
    <div className="body">
      <aside className="rail">
        <div className="rail__sec">
          <div className="rail__eyebrow">{T.routing.step1}</div>
          <div className="rail__heading">{T.routing.tradeLane}</div>
          <div className="cat-tabs">
            {CATEGORIES.map(c => {
              const m = CAT_META[c];
              return (
                <button key={c} onClick={() => handleCat(c)}
                  className={`cat-tab ${category === c ? "is-active" : ""}`}
                  style={{ "--c": m.color }}>
                  <div className="cat-tab__code">{m.code}</div>
                  <div className="cat-tab__name">{c}</div>
                </button>
              );
            })}
          </div>
          <div className="rail__hint">{T.catDesc[category]}</div>
        </div>

        <div className="rail__sec">
          <div className="rail__eyebrow">{T.routing.step2}</div>
          <div className="rail__heading">{T.routing.routeOption} ({catRoutes.length})</div>
          <div className="route-list">
            {catRoutes.map(r => (
              <button key={r.id} onClick={() => setRouteId(r.id)}
                className={`route-card ${routeId === r.id ? "is-active" : ""}`}>
                <div className="route-card__top">
                  <div className="route-card__modes">
                    {r.modes.map(m => (
                      <span key={m} className="route-card__mode" style={{ "--c": window.SEG_STYLE[m]?.color }}>
                        {window.MODE_GLYPH[m]}
                      </span>
                    ))}
                  </div>
                  {routeId === r.id && <span className="route-card__check">✓</span>}
                </div>
                <div className="route-card__label">
                  {(T.routeLabels && T.routeLabels[r.id]) || r.label}
                </div>
                <div className="route-card__desc">
                  {(T.routeDescs && T.routeDescs[r.id]) || r.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rail__sec">
          <div className="rail__eyebrow">{T.routing.step3}</div>
          <div className="rail__heading">{T.routing.container}</div>
          <div className="cont-tabs">
            {CONTAINER_TYPES.map(c => (
              <button key={c} onClick={() => setContainer(c)}
                className={`cont-tab ${container === c ? "is-active" : ""}`}>
                <div className="cont-tab__type">{c}</div>
                <div className="cont-tab__sub">{CONTAINER_INFO[c].short}</div>
              </button>
            ))}
          </div>
          <div className="rail__hint">{CONTAINER_INFO[container].note}</div>
        </div>

        <div className="rail__cta-wrap">
          <button onClick={compute} disabled={!ready || computing} className="cta">
            <span>{computing ? T.routing.computing : T.routing.compute}</span>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M2 8 H13 M9 4 L13 8 L9 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="rail__methodology">
            <strong>Method</strong> · {T.routing.method}
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="map-shell">
          <div className="map-shell__head">
            <div>
              <div className="map-shell__eyebrow">{T.routing.geoPreview}</div>
              <div className="map-shell__title">
                {result
                  ? ((T.routeLabels && T.routeLabels[result.routeType]) || result.routeType)
                  : T.routing.selectRoute}
              </div>
            </div>
            {result && (
              <div className="map-shell__pills">
                <div className="pill"><span>{result.distance.toLocaleString()}</span><em>km</em></div>
                <div className="pill pill--accent" style={{ "--c": window.RISK_COLOR[result.riskLevel] }}>
                  <span>{result.riskLevel}</span><em>{T.routing.risk}</em>
                </div>
                <div className="pill"><span>{(result.emissions.co2Total / 1000).toFixed(2)}</span><em>t CO₂e</em></div>
              </div>
            )}
          </div>
          {ready
            ? <window.MapView result={result} showRiskZones={tweaks.showRiskZones !== false} />
            : <div className="map-loading">
                <div className="map-loading__spinner"></div>
                <div>{T.routing.loadingMap}</div>
              </div>
          }
        </div>

        {result
          ? <window.ResultsPanel result={result} lang={lang} />
          : <div className="empty">
              <div className="empty__title">{T.routing.configureRoute}</div>
              <div className="empty__sub">{T.routing.pickLane} <strong>{T.routing.compute}</strong>.</div>
            </div>
        }
      </main>
    </div>
  );
}

function App() {
  const tweaksHook = useTweaks ? useTweaks(TWEAK_DEFAULTS) : null;
  const t = tweaksHook?.tweaks || TWEAK_DEFAULTS;
  const setTweak = tweaksHook?.setTweak || (() => {});

  const [view, setView] = _useState("routing");
  const [lang, setLang] = _useState("en");

  const T = window.TRANSLATIONS[lang];

  const NAV = [
    { id: "routing",     label: T.nav.routing },
    { id: "analytics",   label: T.nav.analytics },
    { id: "reports",     label: T.nav.insights },
    { id: "methodology", label: T.nav.methodology },
  ];

  const Methodology = window.MethodologyView;
  const Analytics   = window.AnalyticsView;
  const Reports     = window.ReportsView;

  return (
    <div className="app" data-screen-label="Carbon Routing Tool">
      {TweaksPanel && TweakToggle && (
        <TweaksPanel>
          <TweakSection label="Carbon scenario">
            <TweakSlider label="EU ETS price" value={t.etsPriceEur}
              min={50} max={250} step={5} unit=" €/t"
              onChange={v => setTweak("etsPriceEur", v)} />
            <TweakSlider label="Annual containers" value={t.annualContainers}
              min={100} max={5000} step={100} unit=""
              onChange={v => setTweak("annualContainers", v)} />
          </TweakSection>
          <TweakSection label="Routing map">
            <TweakToggle label="Show maritime risk zones" value={t.showRiskZones}
              onChange={v => setTweak("showRiskZones", v)} />
          </TweakSection>
        </TweaksPanel>
      )}

      <header className="topbar">
        <div className="topbar__left">
          <div className="brand">
            <div className="brand__mark">🌱</div>
            <div>
              <div className="brand__name">Eldor Trade Lanes</div>
              <div className="brand__sub">{T.brand.sub}</div>
            </div>
          </div>
        </div>
        <nav className="topbar__nav">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`nav-item ${view === n.id ? "is-active" : ""}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="topbar__right">
          <button
            onClick={() => setLang(l => l === "en" ? "tr" : "en")}
            className="lang-btn"
            title={lang === "en" ? "Türkçeye geç" : "Switch to English"}
          >
            {T.langBtn}
          </button>
          <div className="meta-chip">
            <span className="meta-chip__dot"></span>
            <span>v9.0 · Live</span>
          </div>
          <div className="meta-chip meta-chip--quiet">
            <span>ESBAŞ / Aliağa</span>
          </div>
        </div>
      </header>

      {view === "routing" && <RoutingView tweaks={t} lang={lang} />}
      {view === "analytics" && Analytics && (
        <main className="page"><Analytics lang={lang} /></main>
      )}
      {view === "reports" && Reports && (
        <main className="page"><Reports tweaks={t} lang={lang} /></main>
      )}
      {view === "methodology" && Methodology && (
        <main className="page"><Methodology lang={lang} /></main>
      )}

      <footer className="footnote">
        <div className="footnote__col">
          <div className="footnote__label">{T.footer.dataset}</div>
          <div>{T.footer.datasetVal}</div>
        </div>
        <div className="footnote__col">
          <div className="footnote__label">{T.footer.emission}</div>
          <div>{T.footer.emissionVal}</div>
        </div>
        <div className="footnote__col">
          <div className="footnote__label">{T.footer.carto}</div>
          <div>{T.footer.cartoVal}</div>
        </div>
        <div className="footnote__col footnote__col--right">
          <div>{T.footer.copy}</div>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
