import React, { useRef, useState, useEffect } from 'react';

const TYPE_COLORS = {
  raised_bed:   { bg: '#fef3c7', border: '#d97706', text: '#92400e', pill: '#d97706' },
  in_ground:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d', pill: '#16a34a' },
  container:    { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a', pill: '#2563eb' },
  vertical:     { bg: '#f3e8ff', border: '#9333ea', text: '#581c87', pill: '#9333ea' },
  hugelkultur:  { bg: '#fce7f3', border: '#db2777', text: '#831843', pill: '#db2777' },
  straw_bale:   { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12', pill: '#ea580c' },
  greenhouse:   { bg: '#f0fdf4', border: '#15803d', text: '#052e16', pill: '#15803d' },
};

// ── Spatial mini-map of units (reflects builder arrangement) ─────────────────
const BUILDER_SCALE = 14; // px per foot — same as builder
function unitBuilderSize(u) {
  return {
    w: Math.max((parseFloat(u.width_ft) || 3) * BUILDER_SCALE, 38),
    h: Math.max((parseFloat(u.length_ft) || 3) * BUILDER_SCALE, 26),
  };
}

function AreaMiniMap({ units, plantsByUnit = {}, maxHeight = 360 }) {
  if (!units.length) return null;
  const rects = units.map(u => {
    const { w, h } = unitBuilderSize(u);
    const rot = u.rotation ?? 0;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const bw = w * cos + h * sin, bh = w * sin + h * cos;
    return { ...u, cx: (u.x ?? 12) + bw / 2, cy: (u.y ?? 12) + bh / 2, w, h, rot, c: TYPE_COLORS[u.type_id] || TYPE_COLORS.in_ground };
  });

  const minX = Math.min(...rects.map(r => r.cx - r.w / 2)) - 4;
  const minY = Math.min(...rects.map(r => r.cy - r.h / 2)) - 4;
  const maxX = Math.max(...rects.map(r => r.cx + r.w / 2)) + 4;
  const maxY = Math.max(...rects.map(r => r.cy + r.h / 2)) + 4;
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const MAP_W = 232;
  // Scale to fit both width and the given maxHeight so the map never overflows its container
  const physicalScale = 2.0;
  const scale = Math.min(physicalScale, MAP_W / contentW, maxHeight / contentH);
  const mapH = Math.round(contentH * scale) + 1;

  return (
    <svg
      width={MAP_W} height={mapH}
      className="rounded-lg border border-gray-200 bg-gray-50 w-full"
      style={{ display: 'block' }}
      viewBox={`0 0 ${MAP_W} ${mapH}`}
    >
      {rects.map(r => {
        const sx = (r.cx - minX) * scale;
        const sy = (r.cy - minY) * scale;
        const sw = r.w * scale;
        const sh = r.h * scale;

        // Unique plant emojis assigned to this unit (deduplicated by name)
        const unitPlants = plantsByUnit[r.id] || [];
        const seenNames = new Set();
        const emojis = unitPlants
          .filter(p => { if (seenNames.has(p.name)) return false; seenNames.add(p.name); return true; })
          .map(p => p.emoji || '🌱')
          .slice(0, 6);

        const hasEmojis = emojis.length > 0 && sw > 22 && sh > 14;
        const cols = emojis.length <= 1 ? 1 : emojis.length <= 4 ? 2 : 3;
        const rows = Math.ceil(emojis.length / cols);
        const emojiSize = Math.min(sw / (cols + 0.8), sh / (rows + 0.6), 12);
        const gridW = cols * emojiSize * 1.15;
        const gridH = rows * emojiSize * 1.15;

        return (
          <g key={r.id} transform={`translate(${sx},${sy}) rotate(${r.rot})`}>
            <rect x={-sw / 2} y={-sh / 2} width={sw} height={sh} rx={2}
              fill={r.c.bg} stroke={r.c.border} strokeWidth={1.5} />

            {/* Bed number in top-left corner */}
            {sw > 16 && (
              <text x={-sw / 2 + 2} y={-sh / 2 + 1.5}
                textAnchor="start" dominantBaseline="hanging"
                fontSize={Math.min(6, sw / 6)} fill={r.c.text} fontWeight="bold"
                style={{ pointerEvents: 'none' }}>
                {r.id}
              </text>
            )}

            {/* Plant emojis centered in the bed */}
            {hasEmojis && emojis.map((emoji, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              const ex = -gridW / 2 + (col + 0.5) * (gridW / cols);
              const ey = -gridH / 2 + (row + 0.5) * (gridH / rows);
              return (
                <text key={i} x={ex} y={ey}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={emojiSize} style={{ pointerEvents: 'none' }}>
                  {emoji}
                </text>
              );
            })}

            {/* Fall back to label text when no plant assignments */}
            {!hasEmojis && sw > 24 && (
              <text textAnchor="middle" dy="0.35em" fontSize={Math.min(7, sw / 5)}
                fill={r.c.text} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                {r.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

const TYPE_LABELS = {
  raised_bed: 'Raised Bed', in_ground: 'In-Ground', container: 'Container',
  vertical: 'Vertical', hugelkultur: 'Hugelkultur', straw_bale: 'Straw Bale', greenhouse: 'Greenhouse',
};

// ── Area carousel (v2 layout_data with units) ────────────────────────────────
function AreaCarousel({ units, plants, layoutData, onPlantRemove }) {
  const { plant_assignments = null, unit_plans = null, summary = null, planting_schedule = [], capacity_warnings = [] } = layoutData || {};

  // Build plant lookup by plant_id (the plants table PK)
  const plantById = {};
  plants.forEach(p => { plantById[p.plant_id] = p; });

  // Resolve unit → plant list — ONLY from AI assignments; never guess
  const plantsByUnit = {};
  units.forEach(u => { plantsByUnit[u.id] = []; }); // default empty
  if (plant_assignments && Object.keys(plant_assignments).length > 0) {
    for (const [uid, ids] of Object.entries(plant_assignments)) {
      plantsByUnit[Number(uid)] = ids.map(id => plantById[id]).filter(Boolean);
    }
  }

  // Group units by area_name, preserving insertion order
  const areaOrder = [];
  const areaMap = {};
  units.forEach(u => {
    const key = u.area_name || 'Garden';
    if (!areaMap[key]) { areaMap[key] = []; areaOrder.push(key); }
    areaMap[key].push(u);
  });

  const hasAssignments = plant_assignments && Object.keys(plant_assignments).length > 0;

  // Build per-unit wave grouping from planting_schedule
  // scheduleByUnit[uid] = { 1: ['Radish'], 2: ['Tomato', 'Basil'] }
  const scheduleByUnit = {};
  planting_schedule.forEach(item => {
    const uid = item.unit_id;
    if (!scheduleByUnit[uid]) scheduleByUnit[uid] = {};
    const wave = item.wave || 2;
    if (!scheduleByUnit[uid][wave]) scheduleByUnit[uid][wave] = [];
    scheduleByUnit[uid][wave].push(item.plant_name);
  });

  return (
    <div className="space-y-5">
      {/* Capacity warnings */}
      {capacity_warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1">
          <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            ⚠️ Capacity notes from AI
          </div>
          {capacity_warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {/* No plants yet — show prompt but still render the spatial map */}
      {plants.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          Your beds are set up. Use <strong>Get AI Plant Plan</strong> to fill them with an optimized planting strategy, or browse plants to add manually.
        </div>
      )}

      {/* Unassigned notice */}
      {!hasAssignments && plants.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>{plants.length} plant{plants.length !== 1 ? 's' : ''} added to your garden.</strong>{' '}
          Use <strong>Get AI Plant Plan</strong> above to assign them to specific beds — or scroll down to describe your own plan and get AI feedback on it.
        </div>
      )}

      {/* Horizontal carousel */}
      <div className="overflow-x-auto pb-3 -mx-1 px-1">
        <div className="flex gap-5" style={{ width: 'max-content' }}>
          {areaOrder.map(areaName => {
            const areaUnits = areaMap[areaName];
            return (
              <div key={areaName} className="flex-shrink-0 w-64 space-y-3">
                {/* Area header */}
                {areaOrder.length > 1 && (
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5">
                    {areaName}
                  </div>
                )}
                {/* Spatial mini-map — fixed-height container so unit cards align across columns */}
                <div className="rounded-lg overflow-hidden" style={{ height: 140 }}>
                  <AreaMiniMap units={areaUnits} plantsByUnit={plantsByUnit} maxHeight={140} />
                </div>

                {areaUnits.map(u => {
                  const c = TYPE_COLORS[u.type_id] || TYPE_COLORS.in_ground;
                  const unitPlants = plantsByUnit[u.id] || [];
                  const sqft = (parseFloat(u.width_ft) || 0) * (parseFloat(u.length_ft) || 0);

                  // Determine if we have wave/succession data for this unit
                  const unitSchedule = scheduleByUnit[u.id] || {};
                  const waveNums = Object.keys(unitSchedule).map(Number).sort();
                  const hasWaves = waveNums.length > 1;

                  // Build plant rows grouped by wave (if available)
                  const renderPlantRow = (p) => (
                    <div key={p.id || p.plant_id} className="flex items-center gap-2 px-3 py-2 group hover:bg-gray-50">
                      <span className="text-lg leading-none flex-shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                        {p.notes && <div className="text-xs text-garden-600 italic truncate">{p.notes}</div>}
                        <div className="text-xs text-gray-400 flex gap-2">
                          {p.spacing_inches && <span>{p.spacing_inches}" apart</span>}
                          {p.days_to_maturity && <span>{p.days_to_maturity}d</span>}
                        </div>
                      </div>
                      {onPlantRemove && (
                        <button
                          onClick={() => onPlantRemove(p)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity text-sm flex-shrink-0"
                          title={`Remove ${p.name}`}
                        >✕</button>
                      )}
                    </div>
                  );

                  return (
                    <div key={u.id} className="rounded-xl border-2 overflow-hidden shadow-sm" style={{ borderColor: c.border }}>
                      {/* Unit header */}
                      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: c.bg }}>
                        <span className="font-semibold text-sm flex-1" style={{ color: c.text }}>
                          {u.label}
                        </span>
                        <span className="text-xs rounded-full px-1.5 py-0.5 bg-white/60 font-medium" style={{ color: c.text }}>
                          {TYPE_LABELS[u.type_id] || u.type_id}
                        </span>
                        {sqft > 0 && (
                          <span className="text-xs font-medium" style={{ color: c.text, opacity: 0.7 }}>
                            {sqft.toFixed(0)} sqft
                          </span>
                        )}
                      </div>

                      {/* Plant list — grouped by wave if succession data exists */}
                      <div className="bg-white divide-y divide-gray-50 min-h-10">
                        {unitPlants.length === 0 ? (
                          <p className="text-xs text-gray-400 italic px-3 py-3">No plants assigned</p>
                        ) : hasWaves ? (
                          waveNums.map((wave, wi) => {
                            const waveNames = new Set((unitSchedule[wave] || []).map(n => n.toLowerCase()));
                            const wavePlants = unitPlants.filter(p => waveNames.has(p.name.toLowerCase()));
                            const waveLabel = wave === 1 ? 'Early / cool season' : `Main season${wi > 0 ? ' (after wave ' + (wave - 1) + ')' : ''}`;
                            if (!wavePlants.length) return null;
                            return (
                              <div key={wave}>
                                <div className="px-3 pt-2 pb-0.5 flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{waveLabel}</span>
                                  {wi > 0 && <span className="text-xs text-gray-300">↩ succession</span>}
                                </div>
                                {wavePlants.map(renderPlantRow)}
                              </div>
                            );
                          })
                        ) : (
                          unitPlants.map(renderPlantRow)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-unit plan table (new format) */}
      {unit_plans && unit_plans.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            <span>🌱</span> This Season's Plan
          </h4>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Bed</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">This year's plan</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">Last year's growth</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {unit_plans.map((up, i) => {
                  const unit = units.find(u => u.id === up.unit_id);
                  const c = TYPE_COLORS[unit?.type_id] || TYPE_COLORS.in_ground;
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0 align-top">
                      <td className="px-3 py-2 font-semibold whitespace-nowrap" style={{ color: c.text }}>
                        {unit?.label || `Unit ${up.unit_id}`}
                      </td>
                      <td className="px-3 py-2 text-gray-700 leading-relaxed">{up.this_year}</td>
                      <td className="px-3 py-2 text-gray-500 italic leading-relaxed">{up.last_year || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 leading-relaxed">{up.rationale}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy summary fallback (gardens created before unit_plans) */}
      {!unit_plans?.length && summary && (
        <div className="bg-garden-50 border border-garden-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <h4 className="font-semibold text-garden-800 text-sm">Planting Strategy</h4>
          </div>
          <div className="text-sm text-garden-800 leading-relaxed whitespace-pre-line">
            {summary}
          </div>
        </div>
      )}

      {/* Legend */}
      {plants.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {plants.map(p => (
            <div
              key={p.id || p.plant_id}
              className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 group"
            >
              <span>{p.emoji}</span>
              <span className="text-gray-700">{p.name}</span>
              {onPlantRemove && (
                <button
                  onClick={() => onPlantRemove(p)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5 transition-opacity"
                >✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function GardenLayout({ garden, plants, onPlantRemove }) {
  let layoutData = null;
  try { layoutData = garden?.layout_data ? JSON.parse(garden.layout_data) : null; } catch {}

  if (layoutData?.version === 2 && layoutData?.units?.length > 0) {
    return (
      <AreaCarousel
        units={layoutData.units}
        plants={plants || []}
        layoutData={layoutData}
        onPlantRemove={onPlantRemove}
      />
    );
  }

  // Fallback for gardens without v2 layout_data
  return <LegacyLayout garden={garden} plants={plants} onPlantRemove={onPlantRemove} />;
}

// ── Legacy canvas layout (gardens without unit-based layout_data) ─────────────
function LegacyLayout({ garden, plants, onPlantRemove }) {
  const canvasRef  = useRef();
  const containerRef = useRef();
  const [scale, setScale] = useState(1);
  const [hoveredPlant, setHoveredPlant] = useState(null);

  const CELL = 48;
  const widthFt  = garden?.width_ft  || 8;
  const lengthFt = garden?.length_ft || 4;
  const canvasW  = widthFt  * CELL;
  const canvasH  = lengthFt * CELL;

  useEffect(() => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      setScale(cw < canvasW ? cw / canvasW : 1);
    }
  }, [canvasW]);

  const placed = (() => {
    if (!plants || plants.length === 0) return [];
    const cols = Math.max(Math.floor(widthFt), 1);
    let col = 0, row = 0;
    return plants.map(gp => {
      const sqFt = Math.max(1, Math.round((gp.spacing_inches || 12) / 12));
      const p = { ...gp, col, row, sqFt };
      col += sqFt;
      if (col >= cols) { col = 0; row += 1; }
      return p;
    });
  })();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !placed.length) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    ctx.fillStyle = '#92400e18';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.strokeStyle = '#d6b89620';
    ctx.lineWidth = 1;
    for (let c = 0; c <= widthFt; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvasH); ctx.stroke();
    }
    for (let r = 0; r <= lengthFt; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvasW, r * CELL); ctx.stroke();
    }
    for (const p of placed) {
      const x = p.col * CELL, y = p.row * CELL;
      const size = Math.min(p.sqFt * CELL - 4, CELL - 4);
      const cx = x + (p.sqFt * CELL) / 2, cy = y + CELL / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = (p.color || '#4ade80') + '40';
      ctx.fill();
      ctx.strokeStyle = p.color || '#4ade80';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `${Math.min(size * 0.45, 20)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji || '🌱', cx, cy);
      ctx.font = `bold ${Math.min(size * 0.2, 9)}px system-ui`;
      ctx.fillStyle = '#374151';
      ctx.textBaseline = 'top';
      const label = p.name.length > 8 ? p.name.slice(0, 7) + '…' : p.name;
      ctx.fillText(label, cx, y + CELL - 13);
    }
  }, [placed, canvasW, canvasH, widthFt, lengthFt]);

  if (!plants || plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🌾</div>
        <p className="font-medium">No plants yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="overflow-x-auto rounded-xl border border-gray-200 bg-amber-50/30">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: canvasW * scale, height: canvasH * scale }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {plants.map(p => (
          <div key={p.id || p.plant_id} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 group">
            <span>{p.emoji}</span>
            <span className="text-gray-700">{p.name}</span>
            {onPlantRemove && (
              <button onClick={() => onPlantRemove(p)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5 transition-opacity">✕</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
