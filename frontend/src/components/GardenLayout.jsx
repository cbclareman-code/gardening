import React, { useEffect, useRef, useState, useCallback } from 'react';

const CELL_SIZE = 48; // pixels per foot
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

function generateLayout(plants, widthFt, lengthFt) {
  if (!plants || plants.length === 0) return [];
  const cols = Math.max(Math.floor(widthFt || 8), 1);
  const rows = Math.max(Math.floor(lengthFt || 4), 1);

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

export default function GardenLayout({ garden, plants, onPlantRemove }) {
  const canvasRef = useRef();
  const containerRef = useRef();
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [scale, setScale] = useState(1);

  const widthFt = garden?.width_ft || 8;
  const lengthFt = garden?.length_ft || 4;
  const placed = generateLayout(plants, widthFt, lengthFt);

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

    // Background — soil color
    ctx.fillStyle = '#92400e18';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
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
  }, [placed, widthFt, lengthFt, hoveredPlant]);

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
          📐 {widthFt} × {lengthFt} ft · {plants.length} plant varieties
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-green-400 inline-block border-dashed border-t border-green-400"></span>
            companion pair
          </span>
        </div>
      </div>

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
