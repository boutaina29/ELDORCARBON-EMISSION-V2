/* global React */
// ════════════════════════════════════════════════════════════
//  ANALYTICS VIEW — Side-by-side route comparison
// ════════════════════════════════════════════════════════════

function AnalyticsView() {
  const { PROJECT_ROUTES, CONTAINER_TYPES } = window.RoutingEngine;
  const CATEGORIES = [...new Set(PROJECT_ROUTES.map(r => r.category))];
  const SEG = window.SEG_STYLE;
  const RC = window.RISK_COLOR;

  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [container, setContainer] = React.useState("40FT");

  const catRoutes = PROJECT_ROUTES.filter(r => r.category === category);
  const computed = React.useMemo(
    () => catRoutes.map(r => ({ def: r, result: r.build(container) })),
    [category, container]
  );

  const maxCO2 = Math.max(...computed.map(c => c.result.emissions.co2Total), 1);
  const maxDist = Math.max(...computed.map(c => c.result.distance), 1);
  const bestCO2 = Math.min(...computed.map(c => c.result.emissions.co2Total));
  const bestDist = Math.min(...computed.map(c => c.result.distance));

  return (
    <div className="analytics-view">
      {/* Header */}
      <div className="view-header">
        <div>
          <div className="view-header__eyebrow">Module 02</div>
          <h2 className="view-header__title">Route Analytics</h2>
          <p className="view-header__sub">
            Compare every route in a trade lane side-by-side. See which path delivers the lowest carbon footprint, shortest distance, and lowest geopolitical exposure.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="analytics-controls">
        <div className="ctrl-group">
          <label className="ctrl-label">Trade lane</label>
          <div className="seg-tabs">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`seg-tab ${category === c ? "is-active" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="ctrl-group">
          <label className="ctrl-label">Container</label>
          <div className="seg-tabs">
            {CONTAINER_TYPES.map(c => (
              <button
                key={c}
                onClick={() => setContainer(c)}
                className={`seg-tab ${container === c ? "is-active" : ""}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary winner cards */}
      <div className="winners">
        {(() => {
          const lowCO2 = computed.find(c => c.result.emissions.co2Total === bestCO2);
          const lowDist = computed.find(c => c.result.distance === bestDist);
          const lowRisk = computed.find(c => c.result.riskLevel === "Low") || computed[0];
          return [
            { eyebrow: "Lowest CO₂e", value: `${(lowCO2.result.emissions.co2Total/1000).toFixed(2)}`, unit: "t", route: lowCO2.def.label, color: "var(--leaf)" },
            { eyebrow: "Shortest distance", value: lowDist.result.distance.toLocaleString(), unit: "km", route: lowDist.def.label, color: "var(--ocean)" },
            { eyebrow: "Lowest risk exposure", value: lowRisk.result.riskLevel, unit: "", route: lowRisk.def.label, color: RC[lowRisk.result.riskLevel] },
          ].map((w, i) => (
            <div key={i} className="winner-card" style={{ "--c": w.color }}>
              <div className="winner-card__eyebrow">{w.eyebrow}</div>
              <div className="winner-card__value">
                <span>{w.value}</span>
                {w.unit && <em>{w.unit}</em>}
              </div>
              <div className="winner-card__route">{w.route}</div>
            </div>
          ));
        })()}
      </div>

      {/* Comparison table */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">01 · Side-by-side</div>
            <h3 className="card__title">Route comparison · {category}</h3>
            <div className="card__sub">{computed.length} options · {container} container</div>
          </div>
        </div>

        <div className="comparison-table">
          <div className="ct-row ct-row--head">
            <div className="ct-cell ct-cell--route">Route</div>
            <div className="ct-cell ct-cell--modes">Modes</div>
            <div className="ct-cell ct-cell--bar">Distance</div>
            <div className="ct-cell ct-cell--bar">CO₂ emissions</div>
            <div className="ct-cell ct-cell--risk">Risk</div>
            <div className="ct-cell ct-cell--num">Intensity</div>
          </div>
          {computed.map(({ def, result }) => {
            const co2 = result.emissions.co2Total;
            const isLowestCO2 = co2 === bestCO2;
            const isLowestDist = result.distance === bestDist;
            const intensity = (co2 / result.distance).toFixed(2);
            return (
              <div key={def.id} className="ct-row">
                <div className="ct-cell ct-cell--route">
                  <div className="ct-cell__title">{def.label}</div>
                  <div className="ct-cell__sub">{def.description}</div>
                </div>
                <div className="ct-cell ct-cell--modes">
                  {def.modes.map(m => (
                    <span key={m} className="ct-mode" style={{ "--c": SEG[m]?.color }}>
                      {window.MODE_GLYPH[m]}
                    </span>
                  ))}
                </div>
                <div className="ct-cell ct-cell--bar">
                  <div className="ct-bar">
                    <div className="ct-bar__fill" style={{
                      width: `${(result.distance/maxDist)*100}%`,
                      background: "var(--ocean)",
                    }}></div>
                  </div>
                  <div className="ct-bar__label">
                    {result.distance.toLocaleString()}
                    <em>km</em>
                    {isLowestDist && <span className="ct-tag">Best</span>}
                  </div>
                </div>
                <div className="ct-cell ct-cell--bar">
                  <div className="ct-bar">
                    <div className="ct-bar__fill" style={{
                      width: `${(co2/maxCO2)*100}%`,
                      background: "var(--leaf)",
                    }}></div>
                  </div>
                  <div className="ct-bar__label">
                    {(co2/1000).toFixed(2)}
                    <em>t</em>
                    {isLowestCO2 && <span className="ct-tag">Best</span>}
                  </div>
                </div>
                <div className="ct-cell ct-cell--risk">
                  <span className={`risk-badge risk-badge--${result.riskLevel.toLowerCase()}`}>
                    {result.riskLevel}
                  </span>
                </div>
                <div className="ct-cell ct-cell--num">
                  <div className="ct-num">{intensity}</div>
                  <div className="ct-num__unit">kg/km</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CO2 Breakdown stacked chart */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">02 · Emission anatomy</div>
            <h3 className="card__title">Where does the CO₂ come from?</h3>
            <div className="card__sub">Stacked by segment · pre-carriage, main transport, on-carriage</div>
          </div>
        </div>
        <div className="stacked-chart">
          {computed.map(({ def, result }) => {
            const { co2Road1, co2Main, co2Road2, co2Total, mainMode } = result.emissions;
            const mainColor = SEG[mainMode]?.color;
            return (
              <div key={def.id} className="stacked-row">
                <div className="stacked-row__label">
                  <div className="stacked-row__title">{def.label}</div>
                  <div className="stacked-row__total">{(co2Total/1000).toFixed(2)} t CO₂e</div>
                </div>
                <div className="stacked-bar" style={{ "--total": `${(co2Total/maxCO2)*100}%` }}>
                  <div className="stacked-seg" style={{ flex: co2Road1, background: SEG.road.color }} title={`Pre-carriage: ${co2Road1} kg`}>
                    {co2Road1/co2Total > 0.08 && <span>{Math.round((co2Road1/co2Total)*100)}%</span>}
                  </div>
                  <div className="stacked-seg" style={{ flex: co2Main, background: mainColor }} title={`Main (${mainMode}): ${co2Main} kg`}>
                    {co2Main/co2Total > 0.08 && <span>{Math.round((co2Main/co2Total)*100)}%</span>}
                  </div>
                  <div className="stacked-seg" style={{ flex: co2Road2, background: SEG.road.color, opacity: 0.7 }} title={`On-carriage: ${co2Road2} kg`}>
                    {co2Road2/co2Total > 0.08 && <span>{Math.round((co2Road2/co2Total)*100)}%</span>}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="stacked-legend">
            <span><i style={{background: SEG.road.color}}></i> Pre-carriage (road)</span>
            <span><i style={{background: "var(--ocean)"}}></i> Main transport</span>
            <span><i style={{background: SEG.road.color, opacity: 0.7}}></i> On-carriage (road)</span>
          </div>
        </div>
      </div>

      {/* Trade-off scatter */}
      <div className="card">
        <div className="card__head">
          <div>
            <div className="card__eyebrow">03 · Trade-off</div>
            <h3 className="card__title">Distance vs emissions</h3>
            <div className="card__sub">Bottom-left quadrant = the sweet spot</div>
          </div>
        </div>
        <ScatterChart computed={computed} maxCO2={maxCO2} maxDist={maxDist} />
      </div>
    </div>
  );
}

function ScatterChart({ computed, maxCO2, maxDist }) {
  const SEG = window.SEG_STYLE;
  const W = 760, H = 440, P = { l: 64, r: 200, t: 20, b: 50 };
  const innerW = W - P.l - P.r, innerH = H - P.t - P.b;
  const minDist = Math.min(...computed.map(c => c.result.distance));
  const minCO2 = Math.min(...computed.map(c => c.result.emissions.co2Total));
  
  const x = d => P.l + ((d - minDist*0.85) / (maxDist*1.05 - minDist*0.85)) * innerW;
  const y = c => P.t + innerH - ((c - minCO2*0.85) / (maxCO2*1.05 - minCO2*0.85)) * innerH;

  // Compute label positions with collision avoidance
  const points = computed.map(({ def, result }) => ({
    def,
    result,
    cx: x(result.distance),
    cy: y(result.emissions.co2Total),
    color: SEG[result.emissions.mainMode]?.color,
  }));

  // Separate points by label side
  const leftPoints = points.filter(p => p.cx >= P.l + innerW * 0.65).sort((a, b) => a.cy - b.cy);
  const rightPoints = points.filter(p => p.cx < P.l + innerW * 0.65).sort((a, b) => a.cy - b.cy);

  const minLabelSpacing = 24;
  
  // Function to distribute labels evenly when overlapping
  const distributeLabels = (pts, labelRight) => {
    if (pts.length === 0) return [];
    
    const positioned = [];
    
    pts.forEach((point, i) => {
      let labelY = point.cy;
      
      // Check against all previously positioned labels
      for (let j = 0; j < positioned.length; j++) {
        const prev = positioned[j];
        if (labelY < prev.labelY + minLabelSpacing) {
          labelY = prev.labelY + minLabelSpacing;
        }
      }
      
      positioned.push({ ...point, labelY, labelRight });
    });
    
    // If labels overflow the bottom, redistribute them evenly
    const lastLabel = positioned[positioned.length - 1];
    if (lastLabel && lastLabel.labelY > H - P.b - 10) {
      const totalHeight = H - P.t - P.b - 20;
      const neededHeight = positioned.length * minLabelSpacing;
      
      if (neededHeight > totalHeight) {
        // Compress spacing proportionally
        const scale = totalHeight / neededHeight;
        positioned.forEach((p, i) => {
          p.labelY = P.t + 10 + (i * minLabelSpacing * scale);
        });
      } else {
        // Distribute evenly in available space
        positioned.forEach((p, i) => {
          p.labelY = P.t + 10 + (i * minLabelSpacing);
        });
      }
    }
    
    return positioned;
  };

  const labelPositions = [
    ...distributeLabels(rightPoints, true),
    ...distributeLabels(leftPoints, false)
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="scatter-svg" preserveAspectRatio="xMidYMid meet">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={P.l} x2={W-P.r} y1={P.t + innerH*t} y2={P.t + innerH*t} stroke="var(--line-soft)" strokeDasharray="2 4" />
          <line y1={P.t} y2={P.t+innerH} x1={P.l + innerW*t} x2={P.l + innerW*t} stroke="var(--line-soft)" strokeDasharray="2 4" />
        </g>
      ))}
      {/* Axes */}
      <line x1={P.l} x2={W-P.r} y1={P.t+innerH} y2={P.t+innerH} stroke="var(--ink)" strokeWidth="1" />
      <line x1={P.l} x2={P.l} y1={P.t} y2={P.t+innerH} stroke="var(--ink)" strokeWidth="1" />
      {/* Axis labels */}
      <text x={P.l + innerW/2} y={H-12} textAnchor="middle" className="scatter-axis-label">Distance (km) →</text>
      <text x={-H/2} y={18} textAnchor="middle" className="scatter-axis-label" transform="rotate(-90)">CO₂e (tonnes) →</text>
      {/* Quadrant highlight */}
      <rect x={P.l} y={P.t + innerH*0.5} width={innerW*0.5} height={innerH*0.5} fill="var(--leaf)" opacity="0.04" />
      <text x={P.l + innerW*0.25} y={P.t + innerH*0.92} textAnchor="middle" fill="var(--leaf)" fontSize="11" fontWeight="600" opacity="0.5">SWEET SPOT</text>
      {/* Points */}
      {labelPositions.map(({ def, result, cx, cy, color, labelY, labelRight }) => {
        return (
          <g key={def.id}>
            <circle cx={cx} cy={cy} r="14" fill={color} opacity="0.15" />
            <circle cx={cx} cy={cy} r="6" fill={color} />
            <line 
              x1={cx} y1={cy} 
              x2={labelRight ? cx + 14 : cx - 14} 
              y2={labelY} 
              stroke={color} strokeWidth="1" opacity="0.4" strokeDasharray="2 2"
            />
            <text 
              x={labelRight ? cx + 18 : cx - 18} 
              y={labelY + 4} 
              textAnchor={labelRight ? "start" : "end"}
              fontSize="11" 
              fill="var(--ink)" 
              fontWeight="500"
            >
              {def.label}
            </text>
            <text 
              x={labelRight ? cx + 18 : cx - 18} 
              y={labelY + 17} 
              textAnchor={labelRight ? "start" : "end"}
              fontSize="9.5" 
              fill="var(--mute)" 
              fontFamily="var(--mono)"
            >
              {(result.emissions.co2Total/1000).toFixed(2)}t · {result.distance.toLocaleString()}km
            </text>
          </g>
        );
      })}
    </svg>
  );
}

window.AnalyticsView = AnalyticsView;
