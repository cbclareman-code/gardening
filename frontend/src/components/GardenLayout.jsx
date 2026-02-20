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

const TYPE_LABELS = {
  raised_bed: 'Raised Bed', in_ground: 'In-Ground', container: 'Container',
  vertical: 'Vertical', hugelkultur: 'Hugelkultur', straw_bale: 'Straw Bale', greenhouse: 'Greenhouse',
};

// ── Area carousel (v2 layout_data with units) ────────────────────────────────
function AreaCarousel({ units, plants, layoutData, onPlantRemove }) {
  const { plant_assignments = null, summary = null } = layoutData || {};

  // Build plant lookup by plant_id (the plants table PK)
  const plantById = {};
  plants.forEach(p => { plantById[p.plant_id] = p; });

  // Resolve unit → plant list
  const plantsByUnit = {};
  if (plant_assignments && Object.keys(plant_assignments).length > 0) {
    // AI-assigned
    for (const [uid, ids] of Object.entries(plant_assignments)) {
      plantsByUnit[Number(uid)] = ids.map(id => plantById[id]).filter(Boolean);
    }
    // Any units not in assignments get empty list
    units.forEach(u => { if (!plantsByUnit[u.id]) plantsByUnit[u.id] = []; });
  } else {
    // Fallback: round-robin distribution
    units.forEach(u => { plantsByUnit[u.id] = []; });
    plants.forEach((p, i) => {
      const u = units[i % units.length];
      if (u) plantsByUnit[u.id].push(p);
    });
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

  return (
    <div className="space-y-5">
      {/* Unassigned notice */}
      {!hasAssignments && plants.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          Plants are distributed evenly across units below. Use <strong>Get AI Plant Plan</strong> for an optimized, space-aware assignment.
        </div>
      )}

      {/* Horizontal carousel */}
      <div className="overflow-x-auto pb-3 -mx-1 px-1">
        <div className="flex gap-5" style={{ width: 'max-content' }}>
          {areaOrder.map(areaName => {
            const areaUnits = areaMap[areaName];
            return (
              <div key={areaName} className="flex-shrink-0 w-64 space-y-3">
                {/* Area header — only show when there are multiple areas */}
                {areaOrder.length > 1 && (
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5">
                    {areaName}
                  </div>
                )}

                {areaUnits.map(u => {
                  const c = TYPE_COLORS[u.type_id] || TYPE_COLORS.in_ground;
                  const unitPlants = plantsByUnit[u.id] || [];
                  const sqft = (parseFloat(u.width_ft) || 0) * (parseFloat(u.length_ft) || 0);

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

                      {/* Plant list */}
                      <div className="bg-white divide-y divide-gray-50 min-h-10">
                        {unitPlants.length === 0 ? (
                          <p className="text-xs text-gray-400 italic px-3 py-3">No plants assigned</p>
                        ) : (
                          unitPlants.map(p => (
                            <div key={p.id || p.plant_id} className="flex items-center gap-2 px-3 py-2 group hover:bg-gray-50">
                              <span className="text-lg leading-none flex-shrink-0">{p.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
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
                          ))
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

      {/* Strategy summary */}
      {summary && (
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
    if (!plants || plants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🌾</div>
          <p className="font-medium">No plants yet</p>
          <p className="text-sm mt-1">Use <strong>Get AI Plant Plan</strong> or browse plants manually</p>
        </div>
      );
    }
    return (
      <AreaCarousel
        units={layoutData.units}
        plants={plants}
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
