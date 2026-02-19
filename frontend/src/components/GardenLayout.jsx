import React, { useEffect, useRef, useState, useCallback } from 'react';

const CELL_SIZE = 48; // pixels per foot

// Same color scheme as GardenWizard builder
const TYPE_COLORS = {
  raised_bed:   { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  in_ground:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  container:    { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  vertical:     { bg: '#f3e8ff', border: '#9333ea', text: '#581c87' },
  hugelkultur:  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  straw_bale:   { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12' },
  greenhouse:   { bg: '#f0fdf4', border: '#15803d', text: '#052e16' },
};
const BUILDER_SCALE = 14; // px per foot, matches wizard builder
const COMPANION_PAIRS = {
  'Tomato': ['Basil', 'Marigold', 'Carrot'],
  'Basil': ['Tomato', 'Pepper'],
  'Carrot': ['Tomato', 'Onion', 'Lettuce'],
  'Marigold': ['Tomato', 'Pepper', 'Squash'],
  'Cucumber': ['Radish', 'Beans', 'Peas'],
  'Strawberry': ['Lettuce', 'Spinach', 'Thyme'],
};

function isCompanion(nameA, nameB) {
  return (COMPANION_PAIRS[nameA]?.includes(nameB)) || (COMPANION_PAIRS[nameB]?.includes(nameA));
}

// Single-bed sequential layout
function generateLayout(plants, widthFt, lengthFt) {
  if (!plants || plants.length === 0) return [];
  const cols = Math.max(Math.floor(widthFt || 8), 1);

  const placed = [];
  let col = 0, row = 0;

  for (const gp of plants) {
    const sqFt = Math.max(1, Math.round((gp.spacing_inches || 12) / 12));
    placed.push({ ...gp, col, row, sqFt });
    col += sqFt;
    if (col >= cols) { col = 0; row += 1; }
  }
  return placed;
}

// Multi-bed layout: distribute plants across beds in order
function generateMultiBedLayout(plants, beds) {
  if (!plants || plants.length === 0 || !beds || beds.length === 0) return [];

  const placed = [];
  let bedIdx = 0;
  let col = 0;
  let row = 0;

  for (const gp of plants) {
    const sqFt = Math.max(1, Math.round((gp.spacing_inches || 12) / 12));

    // Try to fit in current bed
    let bed = beds[Math.min(bedIdx, beds.length - 1)];
    const bedCols = Math.max(Math.floor(bed.width), 1);
    const bedRows = Math.max(Math.floor(bed.length), 1);

    // Move to next row if needed
    if (col + sqFt > bedCols) {
      col = 0;
      row += 1;
    }
    // Move to next bed if current bed is full
    if (row >= bedRows && bedIdx < beds.length - 1) {
      bedIdx += 1;
      col = 0;
      row = 0;
      bed = beds[bedIdx];
    }

    placed.push({
      ...gp,
      col: bed.x + col,
      row: bed.y + row,
      sqFt,
      bedId: bed.id,
    });
    col += sqFt;
  }
  return placed;
}

// Builder-familiar layout: renders garden units as colored boxes (v2 layout_data)
function UnitBasedLayout({ units, plants, onPlantRemove }) {
  const containerRef = useRef();
  const [scale, setScale] = useState(1);

  // Compute bounding box from unit pixel positions
  const maxRight  = Math.max(...units.map(u => (u.x ?? 12) + Math.max((parseFloat(u.width_ft)  || 3) * BUILDER_SCALE, 38)), 200);
  const maxBottom = Math.max(...units.map(u => (u.y ?? 12) + Math.max((parseFloat(u.length_ft) || 3) * BUILDER_SCALE, 26)), 160);
  const canvasW = maxRight  + 20;
  const canvasH = maxBottom + 20;

  // Scale to fit container
  useEffect(() => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      setScale(cw < canvasW ? cw / canvasW : 1);
    }
  }, [canvasW]);

  // Distribute plants evenly across units
  const plantsByUnit = {};
  units.forEach(u => { plantsByUnit[u.id] = []; });
  plants.forEach((p, i) => {
    const u = units[i % units.length];
    if (u) plantsByUnit[u.id].push(p);
  });

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">
        📐 {units.length} unit{units.length !== 1 ? 's' : ''} · {plants.length} plant variet{plants.length !== 1 ? 'ies' : 'y'}
        <span className="ml-3 text-xs text-gray-400">This is your garden as you designed it</span>
      </div>

      <div ref={containerRef} className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50">
        <div
          className="relative select-none"
          style={{ width: canvasW * scale, height: canvasH * scale, minHeight: 120 }}
        >
          {/* Grid background */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW * scale}
            height={canvasH * scale}
          >
            <defs>
              <pattern id="layout-grid" width={7 * 2 * scale} height={7 * 2 * scale} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${7 * 2 * scale} 0 L 0 0 0 ${7 * 2 * scale}`}
                  fill="none" stroke="#e5e7eb" strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width={canvasW * scale} height={canvasH * scale} fill="url(#layout-grid)" />
          </svg>

          {units.map(u => {
            const x = (u.x ?? 12) * scale;
            const y = (u.y ?? 12) * scale;
            const w = Math.max((parseFloat(u.width_ft)  || 3) * BUILDER_SCALE, 38) * scale;
            const h = Math.max((parseFloat(u.length_ft) || 3) * BUILDER_SCALE, 26) * scale;
            const c = TYPE_COLORS[u.type_id] || TYPE_COLORS.in_ground;
            const unitPlants = plantsByUnit[u.id] || [];
            return (
              <div
                key={u.id}
                className="absolute rounded-lg border-2 overflow-hidden"
                style={{ left: x, top: y, width: w, height: h, backgroundColor: c.bg, borderColor: c.border }}
              >
                <div
                  className="text-xs font-bold px-1.5 pt-1 leading-tight truncate"
                  style={{ color: c.text, fontSize: Math.max(9, 11 * scale) }}
                >
                  {u.label}
                </div>
                {unitPlants.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 px-1.5 pt-0.5">
                    {unitPlants.map(p => (
                      <span
                        key={p.id}
                        title={p.name}
                        style={{ fontSize: Math.max(12, 16 * scale) }}
                        className="leading-none cursor-default"
                      >
                        {p.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Plant legend with remove */}
      {plants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plants.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 group"
            >
              <span>{p.emoji}</span>
              <span className="text-gray-700">{p.name}</span>
              {onPlantRemove && (
                <button
                  onClick={() => onPlantRemove(p)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Wrapper: routes to the right layout renderer based on layout_data version
export default function GardenLayout({ garden, plants, onPlantRemove }) {
  const layoutConfig = (() => {
    if (garden?.layout_data) {
      try { return JSON.parse(garden.layout_data); } catch { return null; }
    }
    return null;
  })();

  if (layoutConfig?.version === 2 && layoutConfig?.units?.length > 0) {
    if (!plants || plants.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🌾</div>
          <p className="font-medium">No plants yet</p>
          <p className="text-sm mt-1">Add plants from the Plants tab to see them placed in your garden</p>
        </div>
      );
    }
    return (
      <UnitBasedLayout
        units={layoutConfig.units}
        plants={plants}
        onPlantRemove={onPlantRemove}
      />
    );
  }

  return <CanvasGardenLayout garden={garden} plants={plants} onPlantRemove={onPlantRemove} />;
}

function CanvasGardenLayout({ garden, plants, onPlantRemove }) {
  const canvasRef = useRef();
  const containerRef = useRef();
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [scale, setScale] = useState(1);

  const layoutConfig = (() => {
    if (garden?.layout_data) {
      try { return JSON.parse(garden.layout_data); } catch { return null; }
    }
    return null;
  })();

  const hasBeds = layoutConfig?.beds?.length > 1;
  const beds = layoutConfig?.beds || null;

  const widthFt = hasBeds ? layoutConfig.total_width : (garden?.width_ft || 8);
  const lengthFt = hasBeds ? layoutConfig.total_length : (garden?.length_ft || 4);

  const placed = hasBeds
    ? generateMultiBedLayout(plants, beds)
    : generateLayout(plants, widthFt, lengthFt);

  const canvasWidth = widthFt * CELL_SIZE;
  const canvasHeight = lengthFt * CELL_SIZE;

  // Scale to fit container
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      if (canvasWidth > containerWidth) {
        setScale(containerWidth / canvasWidth);
      } else {
        setScale(1);
      }
    }
  }, [canvasWidth]);

  // Draw garden
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = widthFt * CELL_SIZE;
    const h = lengthFt * CELL_SIZE;

    canvas.width = w;
    canvas.height = h;

    if (hasBeds && beds) {
      // Multi-bed: draw path background first, then individual beds
      ctx.fillStyle = '#d6b49630'; // path/walkway color
      ctx.fillRect(0, 0, w, h);

      // Draw each bed
      for (const bed of beds) {
        const bx = bed.x * CELL_SIZE;
        const by = bed.y * CELL_SIZE;
        const bw = bed.width * CELL_SIZE;
        const bh = bed.length * CELL_SIZE;

        // Bed soil background
        ctx.fillStyle = '#92400e18';
        ctx.fillRect(bx, by, bw, bh);

        // Bed border
        ctx.strokeStyle = '#78350f60';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Grid lines within bed
        ctx.strokeStyle = '#d6b89615';
        ctx.lineWidth = 1;
        for (let c = 0; c <= bed.width; c++) {
          ctx.beginPath();
          ctx.moveTo(bx + c * CELL_SIZE, by);
          ctx.lineTo(bx + c * CELL_SIZE, by + bh);
          ctx.stroke();
        }
        for (let r = 0; r <= bed.length; r++) {
          ctx.beginPath();
          ctx.moveTo(bx, by + r * CELL_SIZE);
          ctx.lineTo(bx + bw, by + r * CELL_SIZE);
          ctx.stroke();
        }

        // Bed label
        ctx.font = 'bold 10px system-ui';
        ctx.fillStyle = '#78350f90';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(bed.label, bx + 4, by + 4);
      }
    } else {
      // Single bed: original background + grid
      ctx.fillStyle = '#92400e18';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d6b89620';
      ctx.lineWidth = 1;
      for (let c = 0; c <= widthFt; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL_SIZE, 0);
        ctx.lineTo(c * CELL_SIZE, h);
        ctx.stroke();
      }
      for (let r = 0; r <= lengthFt; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL_SIZE);
        ctx.lineTo(w, r * CELL_SIZE);
        ctx.stroke();
      }
    }

    // Draw companion lines
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (isCompanion(placed[i].name, placed[j].name)) {
          const ax = (placed[i].col + placed[i].sqFt / 2) * CELL_SIZE;
          const ay = (placed[i].row + 0.5) * CELL_SIZE;
          const bx = (placed[j].col + placed[j].sqFt / 2) * CELL_SIZE;
          const by = (placed[j].row + 0.5) * CELL_SIZE;
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#22c55e50';
          ctx.lineWidth = 1.5;
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw plants
    for (const p of placed) {
      const x = p.col * CELL_SIZE;
      const y = p.row * CELL_SIZE;
      const size = Math.min(p.sqFt * CELL_SIZE - 4, CELL_SIZE - 4);
      const cx = x + (p.sqFt * CELL_SIZE) / 2;
      const cy = y + CELL_SIZE / 2;

      // Plant circle background
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = (p.color || '#4ade80') + '40';
      ctx.fill();
      ctx.strokeStyle = p.color || '#4ade80';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Emoji
      ctx.font = `${Math.min(size * 0.45, 20)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji || '🌱', cx, cy);

      // Name label
      if (CELL_SIZE >= 40) {
        ctx.font = `bold ${Math.min(size * 0.2, 9)}px system-ui`;
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = p.name.length > 8 ? p.name.substring(0, 7) + '…' : p.name;
        ctx.fillText(label, cx, y + CELL_SIZE - 13);
      }
    }
  }, [placed, widthFt, lengthFt, beds, hasBeds, hoveredPlant]);

  const handleCanvasClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    const clicked = placed.find(p => p.col <= col && col < p.col + p.sqFt && p.row === row);
    if (clicked) setHoveredPlant(clicked);
  }, [placed, scale]);

  if (!plants || plants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-3">🌾</div>
        <p className="font-medium">No plants yet</p>
        <p className="text-sm mt-1">Add plants from the Plants tab to see your layout</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600">
          {hasBeds
            ? `📐 ${beds.length} beds · ${widthFt} × ${lengthFt} ft total · ${plants.length} plant varieties`
            : `📐 ${widthFt} × ${lengthFt} ft · ${plants.length} plant varieties`}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-green-400 inline-block border-dashed border-t border-green-400"></span>
            companion pair
          </span>
        </div>
      </div>

      {hasBeds && (
        <div className="flex flex-wrap gap-2 text-xs text-amber-700">
          {beds.map(bed => (
            <span key={bed.id} className="bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              {bed.label}: {bed.width} × {bed.length} ft
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="overflow-x-auto rounded-xl border border-gray-200 bg-amber-50/30">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: canvasWidth * scale, height: canvasHeight * scale }}>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="cursor-pointer"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {plants.map(p => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 group"
          >
            <span>{p.emoji}</span>
            <span className="text-gray-700">{p.name}</span>
            {onPlantRemove && (
              <button
                onClick={() => onPlantRemove(p)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5 transition-opacity"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Clicked plant info */}
      {hoveredPlant && (
        <div className="card p-4 border-l-4 border-garden-500">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{hoveredPlant.emoji}</span>
                <span className="font-semibold">{hoveredPlant.name}</span>
              </div>
              {hoveredPlant.planting_tips && (
                <p className="text-sm text-gray-600 mt-1">{hoveredPlant.planting_tips}</p>
              )}
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>⏱ {hoveredPlant.days_to_maturity}d to harvest</span>
                <span>📏 {hoveredPlant.spacing_inches}" spacing</span>
                {hoveredPlant.bedId && hasBeds && (
                  <span>📍 {beds.find(b => b.id === hoveredPlant.bedId)?.label}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setHoveredPlant(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
