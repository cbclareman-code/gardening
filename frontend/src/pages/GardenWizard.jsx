import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getZoneFromCity, getZoneLabel } from '../utils/api';

const GARDEN_TYPES = [
  { id: 'in_ground',   emoji: '🌱', label: 'In-Ground',   desc: 'Traditional garden dug into native soil' },
  { id: 'raised_bed',  emoji: '📦', label: 'Raised Bed',  desc: 'Wooden or brick frames filled with premium soil mix' },
  { id: 'container',   emoji: '🪴', label: 'Container',   desc: 'Pots, planters, and barrels' },
  { id: 'vertical',    emoji: '🧱', label: 'Vertical',    desc: 'Walls, trellises, and tower systems' },
  { id: 'hugelkultur', emoji: '🏔️', label: 'Hügelkultur', desc: 'Mounded beds over buried logs' },
  { id: 'straw_bale',  emoji: '🌾', label: 'Straw Bale',  desc: 'Conditioned straw bales as grow beds' },
  { id: 'greenhouse',  emoji: '🏠', label: 'Greenhouse',  desc: 'Climate-controlled growing space' },
];

const SUN_OPTIONS = [
  { id: 'full_sun',   emoji: '☀️',  label: 'Full Sun',   desc: '6+ hours direct sun daily' },
  { id: 'part_shade', emoji: '⛅',  label: 'Part Shade', desc: '3–6 hours of sun daily' },
  { id: 'shade',      emoji: '🌥️', label: 'Shade',       desc: 'Less than 3 hours of sun daily' },
];

const IRRIGATION_OPTIONS = [
  { id: 'drip',      emoji: '💧', label: 'Drip' },
  { id: 'hose',      emoji: '🚿', label: 'Hose' },
  { id: 'hand',      emoji: '🫗', label: 'Hand water' },
  { id: 'sprinkler', emoji: '⛲', label: 'Sprinkler' },
];

const COMMON_CROPS = [
  'Tomatoes','Cherry tomatoes','Peppers','Eggplant','Tomatillos',
  'Cucumbers','Zucchini','Summer squash','Winter squash','Pumpkins','Melons','Corn',
  'Beans','Bush beans','Pole beans','Runner beans','Soybeans',
  'Peas','Snow peas','Sugar snap peas',
  'Lettuce','Spinach','Arugula','Swiss chard','Kale','Collards',
  'Broccoli','Cabbage','Cauliflower','Brussels sprouts','Kohlrabi','Bok choy','Turnips',
  'Carrots','Beets','Parsnips','Radishes','Daikon',
  'Onions','Garlic','Leeks','Shallots','Chives',
  'Potatoes','Sweet potatoes',
  'Basil','Cilantro','Parsley','Dill','Fennel','Mint','Rosemary','Thyme','Sage','Oregano','Tarragon','Lemon balm',
  'Strawberries','Sunflowers','Marigolds','Nasturtiums','Borage','Zinnias',
];

// Per-type colors used in the builder and dimension cards
const TYPE_COLORS = {
  raised_bed:   { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  in_ground:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d' },
  container:    { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
  vertical:     { bg: '#f3e8ff', border: '#9333ea', text: '#581c87' },
  hugelkultur:  { bg: '#fce7f3', border: '#db2777', text: '#831843' },
  straw_bale:   { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12' },
  greenhouse:   { bg: '#f0fdf4', border: '#15803d', text: '#052e16' },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeArea(index) {
  return {
    id: index + 1,
    name: `Area ${index + 1}`,
    type_selections: [], // [{ type_id, quantity }]
    units: [],           // [{ id, type_id, label, width_ft, length_ft, x, y, rotation }]
    sun_exposure: 'full_sun',
    syncDims: false,
    sharedSoil: false,
    has_fencing: false,
    irrigation_type: 'hand',
  };
}

function totalUnitsInArea(area) {
  return area.type_selections.reduce((sum, s) => sum + s.quantity, 0);
}

// Merge type_selections + quantities into a flat units array, preserving
// existing dimension/position data where the unit id matches.
function syncUnits(area) {
  const next = [];
  let id = 1;
  for (const sel of area.type_selections) {
    const typeInfo = GARDEN_TYPES.find(t => t.id === sel.type_id);
    for (let i = 0; i < sel.quantity; i++) {
      const prev = area.units.find(u => u.id === id);
      next.push({
        id,
        type_id: sel.type_id,
        label: sel.quantity > 1 ? `${typeInfo.label} ${i + 1}` : typeInfo.label,
        width_ft:  prev?.width_ft  ?? '',
        length_ft: prev?.length_ft ?? '',
        previous_plants: prev?.previous_plants ?? '',
        x: prev?.x ?? 230 + (id - 1) * 24,  // start near canvas center (CVS_W=560, so 560/2-50=230)
        y: prev?.y ?? 170,                   // vertically centered (CVS_H=400, so 400/2-30=170)
      });
      id++;
    }
  }
  return next;
}

// ─── CommaAutocomplete ────────────────────────────────────────────────────────
// Input that provides autocomplete for comma-separated lists (e.g. previous crops)
function CommaAutocomplete({ value, onChange, placeholder, suggestions = COMMON_CROPS }) {
  const [open, setOpen]             = useState(false);
  const [filtered, setFiltered]     = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const activeTokenIdx = useRef(0); // which comma-delimited segment the cursor is in
  const justSelected = useRef(false); // skip blur-cleanup right after a dropdown pick

  // Returns the token under the cursor and its index among comma-separated parts
  const getTokenAtCursor = (text, cursorPos) => {
    const before = text.slice(0, cursorPos);
    const parts  = before.split(',');
    return { idx: parts.length - 1, token: parts[parts.length - 1].trimStart() };
  };

  const handleChange = (e) => {
    const val       = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(val);
    const { idx, token } = getTokenAtCursor(val, cursorPos);
    activeTokenIdx.current = idx;
    if (token.length > 0) {
      const matches = suggestions
        .filter(s => s.toLowerCase().startsWith(token.toLowerCase()))
        .slice(0, 6);
      setFiltered(matches);
      setOpen(matches.length > 0);
      setActiveIndex(-1);
    } else {
      setOpen(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    const parts = value.split(',');
    const idx   = activeTokenIdx.current;
    parts[idx]  = (idx === 0 ? '' : ' ') + suggestion;
    const newVal = parts.join(',') + ', ';
    onChange(newVal);
    justSelected.current = true;
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    // place cursor at end of new value
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = newVal.length;
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        className="input text-sm"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          if (justSelected.current) { justSelected.current = false; return; }
          // If user clicked away without typing another item, strip the trailing ", "
          const currentVal = inputRef.current?.value ?? '';
          const trimmed = currentVal.replace(/,\s*$/, '');
          if (trimmed !== currentVal) onChange(trimmed);
        }, 150)}
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => selectSuggestion(s)}
              className={`w-full text-left px-3 py-2 text-sm text-gray-700 ${
                i === activeIndex ? 'bg-garden-100 font-medium' : 'hover:bg-garden-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GardenBuilder ────────────────────────────────────────────────────────────

const SCALE  = 14;   // px per foot
const SNAP   = 7;    // snap increment = 0.5 ft
const CVS_W  = 560;
const CVS_H  = 400;

function snapVal(v) { return Math.round(v / SNAP) * SNAP; }

function unitPx(unit) {
  return {
    w: Math.max((parseFloat(unit.width_ft)  || 3) * SCALE, 38),
    h: Math.max((parseFloat(unit.length_ft) || 3) * SCALE, 26),
  };
}

// Axis-aligned bounding box of a rotated rectangle
function rotatedBounds(w, h, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return { bw: w * cos + h * sin, bh: w * sin + h * cos };
}

function GardenBuilder({ units, onLayoutChange, onUnitEdit, cropList = COMMON_CROPS }) {
  const [pos, setPos] = useState(() => {
    const p = {};
    units.forEach(u => { p[u.id] = { x: u.x ?? 12, y: u.y ?? 12 }; });
    return p;
  });
  const [rotations, setRotations] = useState(() => {
    const r = {};
    units.forEach(u => { r[u.id] = u.rotation ?? 0; });
    return r;
  });
  const [selectedId, setSelectedId] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null); // { id, width_ft, length_ft, previous_plants }

  const openEdit = (unit, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingUnit({
      id: unit.id,
      label: unit.label,
      width_ft: unit.width_ft ?? '',
      length_ft: unit.length_ft ?? '',
      previous_plants: unit.previous_plants ?? '',
    });
  };

  const saveEdit = () => {
    if (!editingUnit) return;
    onUnitEdit?.(editingUnit.id, {
      width_ft:  editingUnit.width_ft,
      length_ft: editingUnit.length_ft,
      previous_plants: editingUnit.previous_plants,
    });
    setEditingUnit(null);
  };

  // Seed new units if the list grows
  useEffect(() => {
    setPos(prev => {
      const p = { ...prev };
      units.forEach(u => { if (!p[u.id]) p[u.id] = { x: 12 + u.id * 20, y: 12 }; });
      return p;
    });
    setRotations(prev => {
      const r = { ...prev };
      units.forEach(u => { if (r[u.id] === undefined) r[u.id] = u.rotation ?? 0; });
      return r;
    });
  }, [units.length]);

  const dragging = useRef(null);
  const canvasRef = useRef();

  const onPointerDown = (e, unitId) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedId(unitId);
    const rect = canvasRef.current.getBoundingClientRect();
    const cur = pos[unitId] || { x: 12, y: 12 };
    dragging.current = {
      unitId,
      ox: e.clientX - rect.left - cur.x,
      oy: e.clientY - rect.top  - cur.y,
    };
  };

  const onPointerMove = e => {
    if (!dragging.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { unitId, ox, oy } = dragging.current;
    const unit = units.find(u => u.id === unitId);
    const { w, h } = unitPx(unit);
    const { bw, bh } = rotatedBounds(w, h, rotations[unitId] ?? 0);
    const x = Math.max(0, Math.min(CVS_W - bw, snapVal(e.clientX - rect.left - ox)));
    const y = Math.max(0, Math.min(CVS_H - bh, snapVal(e.clientY - rect.top  - oy)));
    setPos(prev => ({ ...prev, [unitId]: { x, y } }));
  };

  const onPointerUp = () => {
    if (dragging.current) {
      onLayoutChange(pos, rotations);
      dragging.current = null;
    }
  };

  const handleRotate = (unitId) => {
    setRotations(prev => {
      const next = { ...prev, [unitId]: ((prev[unitId] ?? 0) + 45) % 360 };
      onLayoutChange(pos, next);
      return next;
    });
  };

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="flex justify-center">
      <div
        ref={canvasRef}
        className="relative rounded-xl border-2 border-gray-200 bg-gray-50 select-none touch-none"
        style={{ width: CVS_W, height: CVS_H }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 pointer-events-none" width={CVS_W} height={CVS_H}>
          <defs>
            <pattern id="builder-grid" width={SNAP * 2} height={SNAP * 2} patternUnits="userSpaceOnUse">
              <path d={`M ${SNAP * 2} 0 L 0 0 0 ${SNAP * 2}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={CVS_W} height={CVS_H} fill="url(#builder-grid)" />
        </svg>

        {/* Units */}
        {units.map(unit => {
          const p   = pos[unit.id] || { x: 12, y: 12 };
          const rot = rotations[unit.id] ?? 0;
          const { w, h } = unitPx(unit);
          const { bw, bh } = rotatedBounds(w, h, rot);
          const c   = TYPE_COLORS[unit.type_id] || TYPE_COLORS.in_ground;
          const isSelected = unit.id === selectedId;
          return (
            <div
              key={unit.id}
              className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing ${isSelected ? 'z-10' : ''}`}
              style={{ left: p.x, top: p.y, width: bw, height: bh }}
              onPointerDown={e => onPointerDown(e, unit.id)}
              onDoubleClick={e => openEdit(unit, e)}
              title={unit.previous_plants ? `Previously grew: ${unit.previous_plants} — double-click to edit` : 'Double-click to edit dimensions & history'}
            >
              <div
                className={`rounded-lg border-2 flex flex-col items-center justify-center gap-0.5 ${isSelected ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                style={{
                  width: w, height: h,
                  backgroundColor: c.bg, borderColor: c.border,
                  transform: `rotate(${rot}deg)`,
                  position: 'absolute',
                  top: '50%', left: '50%',
                  marginTop: -h / 2, marginLeft: -w / 2,
                }}
              >
                <span
                  className="text-xs font-semibold text-center px-1 leading-tight pointer-events-none"
                  style={{ color: c.text }}
                >
                  {unit.label}
                </span>
                {unit.previous_plants && (
                  <span
                    className="text-center px-1 leading-none pointer-events-none italic opacity-70 truncate max-w-full"
                    style={{ color: c.text, fontSize: '8px' }}
                  >
                    ↩ {unit.previous_plants.split(',')[0].trim()}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Rotate toolbar — absolute top-right inside canvas, always visible */}
        <div
          className="absolute top-2 right-2 z-20 flex flex-col items-center gap-1"
          onPointerDown={e => e.stopPropagation()}
        >
          <button
            title={selectedId ? 'Rotate 45°' : 'Tap a unit to select it, then rotate'}
            onClick={() => selectedId && handleRotate(selectedId)}
            className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center text-lg shadow-sm transition-all ${
              selectedId
                ? 'border-garden-400 bg-white text-garden-700 hover:bg-garden-50 cursor-pointer'
                : 'border-gray-200 bg-white/70 text-gray-300 cursor-not-allowed'
            }`}
          >
            ↻
          </button>
          {selectedId && (
            <span className="text-xs text-gray-500 bg-white/80 rounded px-1 leading-tight">
              {rotations[selectedId] ?? 0}°
            </span>
          )}
        </div>
      </div>
      </div>{/* end flex justify-center */}

      {/* Hint row */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        Tap to select · drag to arrange · ↻ to rotate · <strong>double-click</strong> to edit · hover to see crop history
      </p>

      {/* Double-click edit overlay */}
      {editingUnit && (
        <div className="mt-3 rounded-xl border-2 border-garden-300 bg-garden-50 p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-garden-800">Edit {editingUnit.label}</h4>
            <button onClick={() => setEditingUnit(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Width (ft)</label>
              <input
                type="number" className="input" min="0.5" step="0.5"
                value={editingUnit.width_ft}
                onChange={e => setEditingUnit(u => ({ ...u, width_ft: e.target.value }))}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="label text-xs">Length (ft)</label>
              <input
                type="number" className="input" min="0.5" step="0.5"
                value={editingUnit.length_ft}
                onChange={e => setEditingUnit(u => ({ ...u, length_ft: e.target.value }))}
                placeholder="e.g. 6"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">What grew here before? <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text" className="input text-sm" list="crops-datalist"
              value={editingUnit.previous_plants}
              onChange={e => setEditingUnit(u => ({ ...u, previous_plants: e.target.value }))}
              placeholder="e.g. Tomatoes, Basil"
            />
            <p className="text-xs text-gray-400 mt-1">List both if crops rotated mid-season (e.g. "Bush beans, Bok choy")</p>
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} className="btn-primary flex-1 text-sm py-2">Save</button>
            <button onClick={() => setEditingUnit(null)} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          </div>
        </div>
      )}

      <datalist id="crops-datalist">
        {cropList.map(c => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}

// ─── GardenWizard ─────────────────────────────────────────────────────────────

export default function GardenWizard() {
  const navigate = useNavigate();
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');
  const photoRef = useRef();

  // Dynamic plant name list — fetched from API so it stays in sync with the plant catalog
  const [cropSuggestions, setCropSuggestions] = useState(COMMON_CROPS);
  useEffect(() => {
    api.get('/plants').then(res => {
      const dbNames = (res.data.plants || []).map(p => p.name);
      // DB names take priority; COMMON_CROPS fills in user-friendly variants
      const combined = [...dbNames, ...COMMON_CROPS];

      // Step 1: case-insensitive dedup — first occurrence (DB name) wins
      const seenLower = new Map();
      for (const name of combined) {
        const lower = name.toLowerCase();
        if (!seenLower.has(lower)) seenLower.set(lower, name);
      }
      const candidates = [...seenLower.values()];
      const lowerSet = new Set(candidates.map(n => n.toLowerCase()));

      // Step 2: drop plural forms when the singular already exists
      // e.g. "Cucumbers" drops if "Cucumber" is present; "Radishes" drops if "Radish" is present
      const merged = candidates.filter(name => {
        const lower = name.toLowerCase();
        if (lower.endsWith('ies') && lowerSet.has(lower.slice(0, -3) + 'y')) return false; // strawberries→strawberry
        if (lower.endsWith('es') && lowerSet.has(lower.slice(0, -2))) return false;          // radishes→radish
        if (lower.endsWith('s') && !lower.endsWith('ss') && lowerSet.has(lower.slice(0, -1))) return false; // cucumbers→cucumber
        return true;
      }).sort((a, b) => a.localeCompare(b));

      if (merged.length > 0) setCropSuggestions(merged);
    }).catch(() => {}); // silently fall back to COMMON_CROPS on error
  }, []);

  // Main steps: 0=Location, 1=Area count, 2=Area config loop, 3=Preferences, 4=Photo
  const [step,        setStep]        = useState(0);
  const [areaIndex,   setAreaIndex]   = useState(0);
  const [areaSubStep, setAreaSubStep] = useState(0); // 0=types, 1=dims, 2=builder

  const [form, setForm] = useState({
    name: '',
    zip_code: '',
    location_city: '',
    location_state: '',
    hardiness_zone: '',
    num_areas: 1,
    areas: [makeArea(0)],
    notes: '',
    photo: null,
    photoPreview: null,
  });

  const update     = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateArea = (idx, changes) =>
    setForm(f => {
      const areas = [...f.areas];
      areas[idx] = { ...areas[idx], ...changes };
      return { ...f, areas };
    });
  const updateUnit = (areaIdx, unitId, changes) =>
    setForm(f => {
      const areas = [...f.areas];
      areas[areaIdx] = {
        ...areas[areaIdx],
        units: areas[areaIdx].units.map(u => u.id === unitId ? { ...u, ...changes } : u),
      };
      return { ...f, areas };
    });

  // Previous plants are always edited individually regardless of syncDims.
  const updateUnitMaybeSynced = updateUnit;

  // Remove a unit from an area and keep type_selections in sync
  const removeUnit = (areaIdx, unitToRemove) => {
    setForm(f => {
      const areas = [...f.areas];
      const area = areas[areaIdx];

      // Decrement quantity for this type (remove selection entirely if it hits 0)
      const newTypeSelections = area.type_selections.map(s =>
        s.type_id === unitToRemove.type_id ? { ...s, quantity: s.quantity - 1 } : s
      ).filter(s => s.quantity > 0);

      // Remove unit and re-number IDs + labels
      const remaining = area.units.filter(u => u.id !== unitToRemove.id);
      const typeCounters = {};
      const relabeled = remaining.map((u, idx) => {
        typeCounters[u.type_id] = (typeCounters[u.type_id] || 0) + 1;
        const typeInfo = GARDEN_TYPES.find(t => t.id === u.type_id);
        const countOfType = newTypeSelections.find(s => s.type_id === u.type_id)?.quantity ?? 0;
        return {
          ...u,
          id: idx + 1,
          label: countOfType > 1
            ? `${typeInfo?.label} ${typeCounters[u.type_id]}`
            : (typeInfo?.label || u.type_id),
        };
      });

      areas[areaIdx] = { ...area, units: relabeled, type_selections: newTypeSelections };
      return { ...f, areas };
    });
  };

  // ── area-count change ──────────────────────────────────────────────────────
  const handleNumAreasChange = n => {
    const count = Math.max(1, Math.min(6, n));
    setForm(f => {
      const areas = Array.from({ length: count }, (_, i) => f.areas[i] || makeArea(i));
      return { ...f, num_areas: count, areas };
    });
  };

  // ── type selection ─────────────────────────────────────────────────────────
  const toggleType = (areaIdx, typeId) =>
    setForm(f => {
      const areas = [...f.areas];
      const area  = { ...areas[areaIdx] };
      const has   = area.type_selections.find(s => s.type_id === typeId);
      area.type_selections = has
        ? area.type_selections.filter(s => s.type_id !== typeId)
        : [...area.type_selections, { type_id: typeId, quantity: 1 }];
      areas[areaIdx] = area;
      return { ...f, areas };
    });

  const setQty = (areaIdx, typeId, qty) =>
    setForm(f => {
      const areas = [...f.areas];
      const area  = { ...areas[areaIdx] };
      area.type_selections = area.type_selections.map(s =>
        s.type_id === typeId ? { ...s, quantity: Math.max(0, qty) } : s
      );
      areas[areaIdx] = area;
      return { ...f, areas };
    });

  // ── location helpers ───────────────────────────────────────────────────────
  const handleLocationDetect = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const city  = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state_code || data.address?.state || '';
          const zone  = getZoneFromCity(city, state);
          setForm(f => ({ ...f, location_city: city, location_state: state, hardiness_zone: String(zone) }));
        } catch { setError('Could not determine location'); }
      },
      () => setError('Location access denied.')
    );
  };

  const handleZoneBlur = () => {
    if (form.location_state) {
      update('hardiness_zone', String(getZoneFromCity(form.location_city, form.location_state)));
    }
  };

  // Zip code → auto-populate city, state, and hardiness zone via zippopotam.us (free, no key)
  const handleZipBlur = async () => {
    const zip = form.zip_code.replace(/\D/g, '');
    if (zip.length !== 5) return;
    try {
      const resp = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!resp.ok) return; // invalid zip — silently ignore
      const data = await resp.json();
      const city  = data.places?.[0]?.['place name'] || '';
      const state = data.places?.[0]?.['state abbreviation'] || '';
      if (city || state) {
        const zone = getZoneFromCity(city, state);
        setForm(f => ({ ...f, location_city: city, location_state: state, hardiness_zone: String(zone) }));
      }
    } catch { /* network error — silently ignore */ }
  };

  // ── photo ──────────────────────────────────────────────────────────────────
  const handlePhotoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    update('photo', file);
    const reader = new FileReader();
    reader.onload = ev => update('photoPreview', ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Garden name is required'); return; }
    if (form.areas.some(a => a.type_selections.length === 0)) {
      setError('Please select at least one garden type for each area'); return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      if (form.location_city)  fd.append('location_city',  form.location_city);
      if (form.location_state) fd.append('location_state', form.location_state);
      if (form.hardiness_zone) fd.append('hardiness_zone', form.hardiness_zone);
      if (form.notes)  fd.append('notes', form.notes);
      if (form.photo)  fd.append('photo', form.photo);
      fd.append('areas', JSON.stringify(form.areas));

      // Primary area fields (backwards-compat + per-area prefs)
      const primary = form.areas[0];
      fd.append('has_fencing',     primary.has_fencing ?? false);
      fd.append('irrigation_type', primary.irrigation_type || 'hand');
      if (primary.type_selections.length > 0) {
        fd.append('garden_type',  primary.type_selections[0].type_id);
        fd.append('sun_exposure', primary.sun_exposure);
        const u0 = primary.units[0];
        if (u0) {
          if (u0.width_ft)  fd.append('width_ft',  u0.width_ft);
          if (u0.length_ft) fd.append('length_ft', u0.length_ft);
        }
      }

      // Save unit positions + per-area metadata so AI planner has full context.
      // Reassign globally unique IDs across all areas (each area's syncUnits starts at 1).
      let globalUnitId = 1;
      const allUnits = form.areas.flatMap(a => a.units.map(u => ({
        ...u,
        id: globalUnitId++,
        area_name: a.name,
        sun_exposure: a.sun_exposure,
        has_fencing: a.has_fencing,
        irrigation_type: a.irrigation_type,
        shared_soil: a.sharedSoil || false,
      })));
      if (allUnits.length > 0) {
        fd.append('layout_data', JSON.stringify({ version: 2, units: allUnits }));
      }

      const { data } = await api.post('/gardens', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      navigate(`/garden/${data.garden.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create garden');
    } finally {
      setSaving(false);
    }
  };

  // ── navigation ─────────────────────────────────────────────────────────────
  const currentArea = form.areas[areaIndex];
  const isMultiUnit = currentArea ? totalUnitsInArea(currentArea) > 1 : false;

  const canAdvance = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.num_areas >= 1;
    if (step === 2 && currentArea) {
      if (areaSubStep === 0) return currentArea.type_selections.length > 0 && currentArea.type_selections.every(s => s.quantity >= 1);
      if (areaSubStep === 1) {
        return currentArea.units.every(u => u && Number(u.width_ft) > 0 && Number(u.length_ft) > 0);
      }
      return true; // builder is optional
    }
    return true;
  };

  const goNextArea = () => {
    if (areaIndex < form.num_areas - 1) {
      setAreaIndex(i => i + 1);
      setAreaSubStep(0);
    } else {
      setStep(3);
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 0) { setStep(1); return; }
    if (step === 1) { setStep(2); setAreaIndex(0); setAreaSubStep(0); return; }
    if (step === 2) {
      if (areaSubStep === 0) {
        // Sync units from type selections, preserving existing dimension data
        const synced = syncUnits(currentArea);
        updateArea(areaIndex, { units: synced });
        setAreaSubStep(1);
      } else if (areaSubStep === 1) {
        if (isMultiUnit) setAreaSubStep(2); // → Previous Plants (separate screen for multi-unit)
        else setAreaSubStep(4);             // → Preferences (single-unit: history already on dims screen)
      } else if (areaSubStep === 2) {
        if (isMultiUnit) setAreaSubStep(3); // → Builder
        else setAreaSubStep(4);             // → Preferences (skip builder for 1 unit)
      } else if (areaSubStep === 3) {
        setAreaSubStep(4); // Builder → Preferences
      } else {
        goNextArea(); // Preferences done → next area or Photo step
      }
      return;
    }
  };

  const handleBack = () => {
    setError('');
    if (step <= 0) return;
    if (step === 1) { setStep(0); return; }
    if (step === 2) {
      if (areaSubStep === 4) { setAreaSubStep(isMultiUnit ? 3 : 1); return; }
      if (areaSubStep === 3) { setAreaSubStep(2); return; }
      if (areaSubStep === 2) { setAreaSubStep(1); return; }
      if (areaSubStep === 1) { setAreaSubStep(0); return; }
      // areaSubStep === 0 — go back to previous area's preferences
      if (areaIndex === 0) { setStep(1); }
      else {
        setAreaIndex(i => i - 1);
        setAreaSubStep(4); // land on preferences of previous area
      }
      return;
    }
    if (step === 3) {
      // Photo — go back to last area's preferences (subStep 4)
      setStep(2);
      const lastIdx = form.num_areas - 1;
      setAreaIndex(lastIdx);
      setAreaSubStep(4);
      return;
    }
  };

  // ── progress bar ───────────────────────────────────────────────────────────
  // Each area has 5 sub-steps (multi-unit) or 3 (single-unit: dims+history merged, builder skipped)
  const areaSlots  = form.areas.reduce((s, a) => s + (totalUnitsInArea(a) > 1 ? 5 : 3), 0);
  const totalSlots = 2 + areaSlots + 1; // location + area-count + area-loop + photo
  // For single-unit areas subSteps are 0→1→4 (mapped to progress slots 0,1,2)
  const currentSubSlot = isMultiUnit ? areaSubStep : (areaSubStep >= 4 ? 2 : areaSubStep);
  const doneSlots  = step === 0 ? 0
    : step === 1 ? 1
    : step === 2 ? 2 + form.areas.slice(0, areaIndex).reduce((s, a) => s + (totalUnitsInArea(a) > 1 ? 5 : 3), 0) + currentSubSlot
    : 2 + areaSlots;

  const progress = Math.round((doneSlots / totalSlots) * 100);

  const stepLabel = step === 0 ? 'Location'
    : step === 1 ? 'Garden Areas'
    : step === 2 && areaSubStep === 0 ? `${currentArea?.name}: Types`
    : step === 2 && areaSubStep === 1 ? `${currentArea?.name}: ${isMultiUnit ? 'Dimensions' : 'Setup'}`
    : step === 2 && areaSubStep === 2 ? `${currentArea?.name}: History`
    : step === 2 && areaSubStep === 3 ? `${currentArea?.name}: Layout`
    : step === 2 && areaSubStep === 4 ? `${currentArea?.name}: Preferences`
    : 'Photo';

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">New Garden</h1>
          <span className="text-sm text-gray-500">{stepLabel}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-garden-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* ── Step 0: Location & Name ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="label">Garden name <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g. My Home Garden"
                autoFocus
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">ZIP Code</label>
                <input
                  className="input"
                  value={form.zip_code}
                  onChange={e => update('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  onBlur={handleZipBlur}
                  placeholder="e.g. 60614"
                  maxLength={5}
                  inputMode="numeric"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Auto-fills city, state &amp; hardiness zone
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or enter manually</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City</label>
                  <input className="input" value={form.location_city}
                    onChange={e => update('location_city', e.target.value)}
                    onBlur={handleZoneBlur} placeholder="Springfield" />
                </div>
                <div>
                  <label className="label">State (2-letter)</label>
                  <input className="input uppercase" value={form.location_state}
                    onChange={e => update('location_state', e.target.value.toUpperCase())}
                    onBlur={handleZoneBlur} placeholder="IL" maxLength={2} />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Hardiness Zone</label>
                <button type="button" onClick={handleLocationDetect} className="text-xs text-garden-600 hover:underline">
                  📍 Detect my location
                </button>
              </div>
              <input className="input" value={form.hardiness_zone}
                onChange={e => update('hardiness_zone', e.target.value)}
                placeholder="e.g. 6b or 7a" />
              {form.hardiness_zone && (
                <p className="text-xs text-garden-700 mt-1">{getZoneLabel(form.hardiness_zone)}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 1: Number of garden areas ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">How many garden areas do you have?</h2>
              <p className="text-sm text-gray-500 mb-5">
                A garden area is a distinct section of your property with its own boundaries — like a backyard raised-bed setup, a front-porch container garden, a side-yard in-ground plot, or good old fashioned pots on separate window sills.
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => handleNumAreasChange(n)}
                    className={`py-5 rounded-xl border-2 font-bold text-2xl transition-all ${
                      form.num_areas === n
                        ? 'border-garden-500 bg-garden-50 text-garden-700'
                        : 'border-gray-200 hover:border-garden-300 text-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {form.num_areas > 1 && (
              <div className="space-y-2">
                <label className="label">Name your areas <span className="text-gray-400 font-normal">(optional)</span></label>
                {form.areas.map((area, i) => (
                  <input
                    key={area.id}
                    className="input"
                    value={area.name}
                    onChange={e => updateArea(i, { name: e.target.value })}
                    placeholder={`Area ${i + 1} — e.g. Backyard Beds, Front Porch, Side Yard`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Area config ─────────────────────────────────────────── */}
        {step === 2 && currentArea && (
          <>
            {/* Area indicator when multiple areas */}
            {form.num_areas > 1 && (
              <div className="flex gap-1.5 mb-5">
                {form.areas.map((a, i) => (
                  <div key={a.id} className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < areaIndex ? 'bg-garden-500'
                    : i === areaIndex ? 'bg-garden-400'
                    : 'bg-gray-200'
                  }`} />
                ))}
              </div>
            )}

            {/* Sub-step 0: Types + quantities ──────────────────────────── */}
            {areaSubStep === 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">
                    {form.num_areas > 1 ? `${currentArea.name}: ` : ''}What type{' '}
                    {form.num_areas === 1 ? 'of garden' : 'of gardens'}?
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Select all that apply and set the quantity of each.
                  </p>
                </div>

                <div className="space-y-2">
                  {GARDEN_TYPES.map(type => {
                    const sel        = currentArea.type_selections.find(s => s.type_id === type.id);
                    const isSelected = !!sel;
                    return (
                      <div
                        key={type.id}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${
                          isSelected ? 'border-garden-500 bg-garden-50' : 'border-gray-200'
                        }`}
                      >
                        <button
                          className="w-full flex items-center gap-3 p-3 text-left"
                          onClick={() => toggleType(areaIndex, type.id)}
                        >
                          <span className="text-2xl">{type.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{type.label}</div>
                            <div className="text-xs text-gray-500 truncate">{type.desc}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                            isSelected ? 'bg-garden-500 border-garden-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="text-white text-xs leading-none">✓</span>}
                          </div>
                        </button>

                        {isSelected && (
                          <div className="flex items-center px-4 pb-3 gap-3 border-t border-garden-100">
                            <span className="text-xs text-gray-600 font-medium">How many?</span>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={() => setQty(areaIndex, type.id, sel.quantity - 1)}
                                disabled={sel.quantity <= 1}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold"
                              >−</button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={sel.quantity === 0 ? '' : sel.quantity}
                                onChange={e => {
                                  const v = e.target.value.replace(/\D/g, '');
                                  if (v === '') { setQty(areaIndex, type.id, 0); return; }
                                  const n = parseInt(v, 10);
                                  if (n >= 1) setQty(areaIndex, type.id, n);
                                }}
                                className="w-10 text-center font-bold text-gray-800 text-sm border border-gray-300 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-garden-400"
                              />
                              <button
                                onClick={() => setQty(areaIndex, type.id, sel.quantity + 1)}
                                className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-sm font-bold"
                              >+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalUnitsInArea(currentArea) > 1 && (
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                    💡 {totalUnitsInArea(currentArea)} units selected — you'll enter dimensions then
                    arrange them visually on the next two screens.
                  </div>
                )}
              </div>
            )}

            {/* Sub-step 1: Dimensions (enter first, builder uses these for scale) */}
            {areaSubStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">
                    {form.num_areas > 1 ? `${currentArea.name}: ` : ''}Dimensions
                  </h2>
                  <p className="text-sm text-gray-500">
                    {currentArea.units.length === 1
                      ? 'How big is this garden?'
                      : 'Enter each unit\'s dimensions — the layout builder uses these to draw to-scale shapes.'}
                  </p>
                </div>

                {/* Persistent "all same dimensions" toggle */}
                {currentArea.units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newSync = !currentArea.syncDims;
                      const baseW = currentArea.units[0]?.width_ft ?? '';
                      const baseL = currentArea.units[0]?.length_ft ?? '';
                      updateArea(areaIndex, {
                        syncDims: newSync,
                        units: newSync
                          ? currentArea.units.map(u => ({ ...u, width_ft: baseW, length_ft: baseL }))
                          : currentArea.units,
                      });
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      currentArea.syncDims
                        ? 'border-garden-400 bg-garden-50 text-garden-700'
                        : 'border-gray-200 text-gray-600 hover:border-garden-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      currentArea.syncDims ? 'bg-garden-500 border-garden-500' : 'border-gray-300'
                    }`}>
                      {currentArea.syncDims && <span className="text-white text-xs leading-none">✓</span>}
                    </span>
                    <span>All units have the same dimensions</span>
                    <span className="text-xs font-normal opacity-60 ml-auto">uncheck to edit individually</span>
                  </button>
                )}

                {/* Shared soil toggle — shown for multi-unit areas */}
                {currentArea.units.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateArea(areaIndex, { sharedSoil: !currentArea.sharedSoil })}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      currentArea.sharedSoil
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      currentArea.sharedSoil ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {currentArea.sharedSoil && <span className="text-white text-xs leading-none">✓</span>}
                    </span>
                    <div className="text-left">
                      <div>These beds share the same soil (e.g. connected U-shaped beds)</div>
                      <div className="font-normal text-xs opacity-70 mt-0.5">The AI will treat them as one growing zone for crop rotation</div>
                    </div>
                  </button>
                )}

                {/* Synced: one shared input + compact unit list; Un-synced: individual inputs */}
                {currentArea.syncDims && currentArea.units.length > 1 ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-garden-300 bg-garden-50 p-4 space-y-3">
                      <p className="text-xs font-medium text-garden-700">
                        Shared dimensions — applies to all {currentArea.units.length} units
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Width (ft)</label>
                          <input
                            type="number" className="input"
                            value={currentArea.units[0]?.width_ft ?? ''}
                            onChange={e => updateArea(areaIndex, {
                              units: currentArea.units.map(u => ({ ...u, width_ft: e.target.value })),
                            })}
                            placeholder="e.g. 4" min="0.5" step="0.5"
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Length (ft)</label>
                          <input
                            type="number" className="input"
                            value={currentArea.units[0]?.length_ft ?? ''}
                            onChange={e => updateArea(areaIndex, {
                              units: currentArea.units.map(u => ({ ...u, length_ft: e.target.value })),
                            })}
                            placeholder="e.g. 8" min="0.5" step="0.5"
                          />
                        </div>
                      </div>
                    </div>
                    {currentArea.units.map(unit => {
                      const c = TYPE_COLORS[unit.type_id] || TYPE_COLORS.in_ground;
                      const typeInfo = GARDEN_TYPES.find(t => t.id === unit.type_id);
                      const sqft = unit.width_ft && unit.length_ft
                        ? (parseFloat(unit.width_ft) * parseFloat(unit.length_ft)).toFixed(1) : null;
                      return (
                        <div key={unit.id}
                          className="rounded-lg border px-3 py-2 flex items-center gap-2"
                          style={{ borderColor: c.border, backgroundColor: c.bg + '88' }}
                        >
                          <span className="text-base">{typeInfo?.emoji}</span>
                          <span className="text-sm font-medium" style={{ color: c.text }}>{unit.label}</span>
                          {sqft && <span className="text-xs" style={{ color: c.text }}>📐 {sqft} sq ft</span>}
                          {currentArea.units.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeUnit(areaIndex, unit)}
                              className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                              title="Remove this unit"
                            >✕</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentArea.units.map((unit) => {
                      const c        = TYPE_COLORS[unit.type_id] || TYPE_COLORS.in_ground;
                      const typeInfo = GARDEN_TYPES.find(t => t.id === unit.type_id);
                      const sqft     = unit.width_ft && unit.length_ft
                        ? (parseFloat(unit.width_ft) * parseFloat(unit.length_ft)).toFixed(1)
                        : null;
                      return (
                        <div
                          key={unit.id}
                          className="rounded-xl border-2 p-4 space-y-3"
                          style={{ borderColor: c.border, backgroundColor: c.bg + 'cc' }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{typeInfo?.emoji}</span>
                            <span className="font-semibold text-sm" style={{ color: c.text }}>{unit.label}</span>
                            {sqft && (
                              <span className="text-xs font-medium" style={{ color: c.text }}>
                                📐 {sqft} sq ft
                              </span>
                            )}
                            {currentArea.units.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeUnit(areaIndex, unit)}
                                className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                                title="Remove this unit"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="label text-xs">Width (ft)</label>
                              <input
                                type="number" className="input"
                                value={unit.width_ft}
                                onChange={e => updateUnit(areaIndex, unit.id, { width_ft: e.target.value })}
                                placeholder="e.g. 4" min="0.5" step="0.5"
                              />
                            </div>
                            <div>
                              <label className="label text-xs">Length (ft)</label>
                              <input
                                type="number" className="input"
                                value={unit.length_ft}
                                onChange={e => updateUnit(areaIndex, unit.id, { length_ft: e.target.value })}
                                placeholder="e.g. 8" min="0.5" step="0.5"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <p className="font-semibold text-gray-800 mb-3">Sun exposure</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SUN_OPTIONS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => updateArea(areaIndex, { sun_exposure: s.id })}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          currentArea.sun_exposure === s.id
                            ? 'border-garden-500 bg-garden-50'
                            : 'border-gray-200 hover:border-garden-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{s.emoji}</div>
                        <div className="text-xs font-medium">{s.label}</div>
                        <div className="text-xs text-gray-500">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Single-unit areas: collect history here to save a screen */}
                {currentArea.units.length === 1 && (
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">What grew here before? <span className="text-gray-400 font-normal text-sm">(optional)</span></p>
                    <p className="text-xs text-gray-500 mb-2">
                      Helps the AI plan crop rotation — leave blank if new or unknown.
                      If crops rotated mid-season, list both (e.g. "Bush beans, Bok choy").
                    </p>
                    <CommaAutocomplete
                      value={currentArea.units[0]?.previous_plants ?? ''}
                      onChange={val => updateUnit(areaIndex, currentArea.units[0].id, { previous_plants: val })}
                      placeholder="e.g. Tomatoes, Basil — separate multiple crops with commas"
                      suggestions={cropSuggestions}
                    />
                  </div>
                )}

              </div>
            )}

            {/* Sub-step 2: Previous Plants (history per unit, multi-unit only) ── */}
            {areaSubStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">
                    {form.num_areas > 1 ? `${currentArea.name}: ` : ''}What grew here before?
                  </h2>
                  <p className="text-sm text-gray-500">
                    Helps the AI plan crop rotation — all fields are optional.{' '}
                    <span className="font-medium text-gray-600">Leave blank to skip.</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 -mt-1">
                  If two crops rotated in the same bed at different times of year, list both
                  (e.g. "Bush beans, Bok choy") — both matter for crop rotation.
                </p>
                <div className="space-y-3">
                  {currentArea.units.map(unit => {
                    const c = TYPE_COLORS[unit.type_id] || TYPE_COLORS.in_ground;
                    const typeInfo = GARDEN_TYPES.find(t => t.id === unit.type_id);
                    return (
                      <div key={unit.id}
                        className="rounded-xl border-2 p-4 space-y-2"
                        style={{ borderColor: c.border, backgroundColor: c.bg + 'cc' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{typeInfo?.emoji}</span>
                          <span className="font-semibold text-sm" style={{ color: c.text }}>{unit.label}</span>
                          {unit.width_ft && unit.length_ft && (
                            <span className="text-xs" style={{ color: c.text }}>
                              {unit.width_ft}×{unit.length_ft} ft
                            </span>
                          )}
                        </div>
                        <CommaAutocomplete
                          value={unit.previous_plants ?? ''}
                          onChange={val => updateUnitMaybeSynced(areaIndex, unit.id, { previous_plants: val })}
                          placeholder="e.g. Tomatoes, Basil — separate multiple with commas"
                          suggestions={cropSuggestions}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-step 3: Builder ──────────────────────────────────────── */}
            {areaSubStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">
                    {form.num_areas > 1 ? `${currentArea.name}: ` : ''}Arrange your layout
                  </h2>
                  <p className="text-sm text-gray-500">
                    Drag each piece into position. <strong>Hover</strong> a bed to see what grew there before.
                    <strong> Double-click</strong> a bed to edit its size or crop history.
                  </p>
                </div>

                <GardenBuilder
                  units={currentArea.units}
                  cropList={cropSuggestions}
                  onUnitEdit={(unitId, changes) => updateUnit(areaIndex, unitId, changes)}
                  onLayoutChange={(positions, rots) => {
                    setForm(f => {
                      const areas = [...f.areas];
                      areas[areaIndex] = {
                        ...areas[areaIndex],
                        units: areas[areaIndex].units.map(u => ({
                          ...u,
                          x: positions[u.id]?.x ?? u.x,
                          y: positions[u.id]?.y ?? u.y,
                          rotation: rots?.[u.id] ?? u.rotation ?? 0,
                        })),
                      };
                      return { ...f, areas };
                    });
                  }}
                />
              </div>
            )}
            {/* Sub-step 4: Preferences for this area ───────────────────── */}
            {areaSubStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-semibold text-gray-800 mb-1">
                    {form.num_areas > 1 ? `${currentArea.name}: ` : ''}Area preferences
                  </h2>
                  <p className="text-sm text-gray-500">
                    These help the AI pick the right plants for this spot.
                  </p>
                </div>

                <div>
                  <label className="label">Irrigation method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {IRRIGATION_OPTIONS.map(irr => (
                      <button
                        key={irr.id}
                        onClick={() => updateArea(areaIndex, { irrigation_type: irr.id })}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                          currentArea.irrigation_type === irr.id
                            ? 'border-garden-500 bg-garden-50'
                            : 'border-gray-200 hover:border-garden-300'
                        }`}
                      >
                        <span className="text-xl">{irr.emoji}</span>
                        <span className="text-sm font-medium">{irr.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">🦌 Wildlife access</label>
                  <p className="text-xs text-gray-500 mb-2">Can deer, rabbits, or large pests reach this area?</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => updateArea(areaIndex, { has_fencing: true })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        currentArea.has_fencing === true ? 'border-garden-500 bg-garden-50' : 'border-gray-200 hover:border-garden-300'
                      }`}
                    >
                      <span className="text-xl">🚧</span>
                      <span className="text-xs font-medium text-center">Fenced / gated</span>
                    </button>
                    <button
                      onClick={() => updateArea(areaIndex, { has_fencing: 'sheltered' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        currentArea.has_fencing === 'sheltered' ? 'border-garden-500 bg-garden-50' : 'border-gray-200 hover:border-garden-300'
                      }`}
                    >
                      <span className="text-xl">🏡</span>
                      <span className="text-xs font-medium text-center">Naturally sheltered (porch, deck)</span>
                    </button>
                    <button
                      onClick={() => updateArea(areaIndex, { has_fencing: false })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        currentArea.has_fencing === false ? 'border-garden-500 bg-garden-50' : 'border-gray-200 hover:border-garden-300'
                      }`}
                    >
                      <span className="text-xl">🌿</span>
                      <span className="text-xs font-medium text-center">Open / exposed</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Photo + Notes ───────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Almost done!</h2>
            <p className="text-sm text-gray-500">
              Add an optional photo and any notes about your garden.
            </p>
            {form.photoPreview ? (
              <div className="relative">
                <img src={form.photoPreview} alt="Garden preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  onClick={() => { update('photo', null); update('photoPreview', null); }}
                  className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 shadow"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => photoRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl hover:border-garden-400 hover:bg-garden-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium">Add a reference photo (optional)</span>
                <span className="text-xs">JPG, PNG, or HEIC up to 10MB</span>
              </button>
            )}
            <p className="text-xs text-gray-400">
              📷 Your photo is stored for <strong>your reference</strong> and displays in your garden profile. The AI planner uses the details you entered (zone, dimensions, sun) — not image analysis.
            </p>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div>
              <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea
                className="input resize-none" rows={3}
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                placeholder="Anything else about your garden space..."
              />
            </div>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={handleBack} className="btn-secondary flex-1">← Back</button>
          )}
          {step === 3 ? (
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? '🌱 Creating garden...' : '🌱 Create Garden'}
            </button>
          ) : (
            <button
              onClick={() => { if (canAdvance()) handleNext(); else setError('Please complete this step first'); }}
              className="btn-primary flex-1"
            >
              {step === 2 && areaSubStep === 2 && currentArea?.units.every(u => !u.previous_plants)
                ? 'Skip →'
                : 'Continue →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
