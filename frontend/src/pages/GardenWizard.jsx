import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getZoneFromCity, getZoneLabel } from '../utils/api';

const GARDEN_TYPES = [
  { id: 'in_ground', emoji: '🌱', label: 'In-Ground', desc: 'Traditional garden dug into native soil — rows or beds' },
  { id: 'raised_bed', emoji: '📦', label: 'Raised Bed', desc: 'Wooden or brick frames filled with premium soil mix' },
  { id: 'container', emoji: '🪴', label: 'Container', desc: 'Pots, planters, and barrels — great for patios' },
  { id: 'vertical', emoji: '🧱', label: 'Vertical', desc: 'Walls, trellises, and tower systems for small spaces' },
  { id: 'hugelkultur', emoji: '🏔️', label: 'Hügelkultur', desc: 'Mounded beds over buried logs for moisture retention' },
  { id: 'straw_bale', emoji: '🌾', label: 'Straw Bale', desc: 'Conditioned straw bales as self-contained grow beds' },
  { id: 'greenhouse', emoji: '🫙', label: 'Greenhouse', desc: 'Climate-controlled growing space for year-round gardening' },
];

const SUN_OPTIONS = [
  { id: 'full_sun', emoji: '☀️', label: 'Full Sun', desc: '6+ hours direct sun daily' },
  { id: 'part_shade', emoji: '⛅', label: 'Part Shade', desc: '3–6 hours of sun daily' },
  { id: 'shade', emoji: '🌥️', label: 'Shade', desc: 'Less than 3 hours of sun daily' },
];

const IRRIGATION_OPTIONS = [
  { id: 'drip', emoji: '💧', label: 'Drip' },
  { id: 'hose', emoji: '🚿', label: 'Hose' },
  { id: 'hand', emoji: '🫗', label: 'Hand water' },
  { id: 'sprinkler', emoji: '⛲', label: 'Sprinkler' },
];

const BED_LAYOUTS = [
  { id: 'single', label: 'Single Bed', desc: 'One rectangular raised bed' },
  { id: 'row_2', label: 'Two Beds (Row)', desc: 'Two beds side by side with a walking path' },
  { id: 'row_3', label: 'Three Beds (Row)', desc: 'Three beds in a row with paths between' },
  { id: 'l_shape', label: 'L-Shape', desc: 'Two beds at a right angle with corner access' },
  { id: 'u_shape', label: 'U-Shape (3 beds)', desc: 'Two side beds + one connecting end bed' },
  { id: 'u_shape_4', label: 'U-Shape (4 beds)', desc: '3 parallel beds + 1 end bed — great for larger setups' },
];

function generateBedConfig(layout, bedWidth, bedLength, pathWidth) {
  const bw = parseFloat(bedWidth) || 4;
  const bl = parseFloat(bedLength) || 8;
  const pw = parseFloat(pathWidth) || 3;

  const configs = {
    single: {
      beds: [{ id: 1, label: 'Bed 1', x: 0, y: 0, width: bw, length: bl }],
      total_width: bw,
      total_length: bl,
    },
    row_2: {
      beds: [
        { id: 1, label: 'Bed A', x: 0, y: 0, width: bw, length: bl },
        { id: 2, label: 'Bed B', x: bw + pw, y: 0, width: bw, length: bl },
      ],
      total_width: 2 * bw + pw,
      total_length: bl,
    },
    row_3: {
      beds: [
        { id: 1, label: 'Bed A', x: 0, y: 0, width: bw, length: bl },
        { id: 2, label: 'Bed B', x: bw + pw, y: 0, width: bw, length: bl },
        { id: 3, label: 'Bed C', x: 2 * (bw + pw), y: 0, width: bw, length: bl },
      ],
      total_width: 3 * bw + 2 * pw,
      total_length: bl,
    },
    l_shape: {
      beds: [
        { id: 1, label: 'Long Bed', x: 0, y: 0, width: bw, length: bl },
        { id: 2, label: 'Corner Bed', x: bw + pw, y: bl - bw, width: bw, length: bw },
      ],
      total_width: 2 * bw + pw,
      total_length: bl,
    },
    u_shape: {
      beds: [
        { id: 1, label: 'Left Arm', x: 0, y: 0, width: bw, length: bl },
        { id: 2, label: 'Right Arm', x: bw + pw, y: 0, width: bw, length: bl },
        { id: 3, label: 'Back Bed', x: 0, y: bl + pw, width: 2 * bw + pw, length: bw },
      ],
      total_width: 2 * bw + pw,
      total_length: bl + pw + bw,
    },
    u_shape_4: {
      beds: [
        { id: 1, label: 'Bed 1', x: 0, y: 0, width: bw, length: bl },
        { id: 2, label: 'Bed 2', x: bw + pw, y: 0, width: bw, length: bl },
        { id: 3, label: 'Bed 3', x: 2 * (bw + pw), y: 0, width: bw, length: bl },
        { id: 4, label: 'End Bed', x: 0, y: bl + pw, width: 3 * bw + 2 * pw, length: bw },
      ],
      total_width: 3 * bw + 2 * pw,
      total_length: bl + pw + bw,
    },
  };

  const c = configs[layout];
  if (!c) return null;
  return { layout, ...c };
}

function BedPreview({ layoutId, bedWidthFt, bedLengthFt, pathWidthFt }) {
  const config = generateBedConfig(layoutId, bedWidthFt, bedLengthFt, pathWidthFt);
  if (!config || !config.beds) return null;

  const { beds, total_width, total_length } = config;
  const PAD = 10;
  const MAX_DIM = 170;
  const scale = (MAX_DIM - 2 * PAD) / Math.max(total_width, total_length);
  const svgW = Math.round(total_width * scale + 2 * PAD);
  const svgH = Math.round(total_length * scale + 2 * PAD);

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="rounded-lg border border-amber-200 bg-amber-50/40"
    >
      {beds.map((bed) => {
        const bx = PAD + bed.x * scale;
        const by = PAD + bed.y * scale;
        const bw = bed.width * scale;
        const bh = bed.length * scale;
        const fontSize = Math.max(6, Math.min(10, bw / Math.max(bed.label.length * 0.7, 1)));
        return (
          <g key={bed.id}>
            <rect x={bx} y={by} width={bw} height={bh} rx={3} fill="#92400e20" stroke="#78350f" strokeWidth={1.5} />
            {bw > 22 && bh > 12 && (
              <text
                x={bx + bw / 2}
                y={by + bh / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fill="#78350f"
                fontWeight="500"
              >
                {bed.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function GardenWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef();

  const [form, setForm] = useState({
    name: '',
    location_city: '',
    location_state: '',
    hardiness_zone: '',
    garden_type: '',
    width_ft: '',
    length_ft: '',
    sun_exposure: 'full_sun',
    has_fencing: false,
    irrigation_type: 'hand',
    notes: '',
    photo: null,
    photoPreview: null,
    bed_layout: 'single',
    bed_width_ft: 4,
    bed_length_ft: 8,
    path_width_ft: 3,
    dimensions_notes: '',
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Dynamic steps based on garden type
  const STEPS = form.garden_type === 'raised_bed'
    ? ['Location & Zone', 'Garden Type', 'Bed Layout', 'Preferences', 'Photo']
    : ['Location & Zone', 'Garden Type', 'Dimensions', 'Preferences', 'Photo'];

  const handleLocationDetect = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.village || '';
          const state = data.address?.state_code || data.address?.state || '';
          const zone = getZoneFromCity(city, state);
          setForm(f => ({ ...f, location_city: city, location_state: state, hardiness_zone: String(zone) }));
        } catch {
          setError('Could not determine location from coordinates');
        }
      },
      () => setError('Location access denied. Please enter manually.')
    );
  };

  const handleZoneFromLocation = () => {
    if (form.location_state) {
      const zone = getZoneFromCity(form.location_city, form.location_state);
      update('hardiness_zone', String(zone));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    update('photo', file);
    const reader = new FileReader();
    reader.onload = (ev) => update('photoPreview', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Garden name is required'); return; }
    if (!form.garden_type) { setError('Please select a garden type'); return; }

    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('garden_type', form.garden_type);
      if (form.location_city) fd.append('location_city', form.location_city);
      if (form.location_state) fd.append('location_state', form.location_state);
      if (form.hardiness_zone) fd.append('hardiness_zone', form.hardiness_zone);
      fd.append('sun_exposure', form.sun_exposure);
      fd.append('has_fencing', form.has_fencing);
      fd.append('irrigation_type', form.irrigation_type);
      if (form.notes) fd.append('notes', form.notes);
      if (form.photo) fd.append('photo', form.photo);

      if (form.garden_type === 'raised_bed') {
        const bedConfig = generateBedConfig(
          form.bed_layout,
          form.bed_width_ft,
          form.bed_length_ft,
          form.path_width_ft
        );
        if (bedConfig) {
          fd.append('width_ft', bedConfig.total_width);
          fd.append('length_ft', bedConfig.total_length);
          fd.append('layout_data', JSON.stringify(bedConfig));
        }
      } else {
        if (form.width_ft) fd.append('width_ft', form.width_ft);
        if (form.length_ft) fd.append('length_ft', form.length_ft);
      }

      const { data } = await api.post('/gardens', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      navigate(`/garden/${data.garden.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create garden');
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return !!form.garden_type;
    if (step === 2 && form.garden_type === 'raised_bed') {
      return !!form.bed_layout && Number(form.bed_width_ft) > 0 && Number(form.bed_length_ft) > 0;
    }
    return true;
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  const liveConfig = form.garden_type === 'raised_bed' && step === 2
    ? generateBedConfig(form.bed_layout, form.bed_width_ft, form.bed_length_ft, form.path_width_ft)
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">New Garden</h1>
          <span className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-garden-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? 'text-garden-600 font-medium' : ''}>{s}</span>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Step 0: Location & Name */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="label">Garden name <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Backyard Veggie Patch"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={form.location_city}
                  onChange={(e) => update('location_city', e.target.value)}
                  onBlur={handleZoneFromLocation}
                  placeholder="Springfield"
                />
              </div>
              <div>
                <label className="label">State (2-letter)</label>
                <input
                  className="input uppercase"
                  value={form.location_state}
                  onChange={(e) => update('location_state', e.target.value.toUpperCase())}
                  onBlur={handleZoneFromLocation}
                  placeholder="IL"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Hardiness Zone</label>
                <button
                  type="button"
                  onClick={handleLocationDetect}
                  className="text-xs text-garden-600 hover:underline"
                >
                  📍 Detect my location
                </button>
              </div>
              <input
                className="input"
                value={form.hardiness_zone}
                onChange={(e) => update('hardiness_zone', e.target.value)}
                placeholder="e.g. 6b or 7a"
              />
              {form.hardiness_zone && (
                <p className="text-xs text-garden-700 mt-1">
                  {getZoneLabel(form.hardiness_zone)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Garden Type */}
        {step === 1 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">What type of garden?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GARDEN_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => update('garden_type', type.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.garden_type === type.id
                      ? 'border-garden-500 bg-garden-50'
                      : 'border-gray-200 hover:border-garden-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.emoji}</div>
                  <div className="font-medium text-sm text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1 leading-snug">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Bed Layout Builder (raised_bed only) */}
        {step === 2 && form.garden_type === 'raised_bed' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800 mb-1">Design your bed layout</h2>
              <p className="text-sm text-gray-500 mb-4">Choose a configuration and set your bed dimensions.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                {BED_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => update('bed_layout', layout.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      form.bed_layout === layout.id
                        ? 'border-garden-500 bg-garden-50'
                        : 'border-gray-200 hover:border-garden-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 mb-0.5">{layout.label}</div>
                    <div className="text-xs text-gray-500 leading-snug">{layout.desc}</div>
                  </button>
                ))}
              </div>

              <div className={`grid gap-3 mb-4 ${form.bed_layout !== 'single' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div>
                  <label className="label">Bed Width (ft)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.bed_width_ft}
                    onChange={(e) => update('bed_width_ft', e.target.value)}
                    min="1"
                    step="0.5"
                    placeholder="4"
                  />
                </div>
                <div>
                  <label className="label">Bed Length (ft)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.bed_length_ft}
                    onChange={(e) => update('bed_length_ft', e.target.value)}
                    min="1"
                    step="0.5"
                    placeholder="8"
                  />
                </div>
                {form.bed_layout !== 'single' && (
                  <div>
                    <label className="label">Path Width (ft)</label>
                    <input
                      type="number"
                      className="input"
                      value={form.path_width_ft}
                      onChange={(e) => update('path_width_ft', e.target.value)}
                      min="1"
                      step="0.5"
                      placeholder="3"
                    />
                  </div>
                )}
              </div>

              {liveConfig && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <BedPreview
                        layoutId={form.bed_layout}
                        bedWidthFt={form.bed_width_ft}
                        bedLengthFt={form.bed_length_ft}
                        pathWidthFt={form.path_width_ft}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-900 mb-1">Layout Preview</p>
                      <p className="text-xs text-amber-700 mb-2">
                        {liveConfig.beds.length} bed{liveConfig.beds.length > 1 ? 's' : ''} ·{' '}
                        {liveConfig.total_width} × {liveConfig.total_length} ft total
                      </p>
                      <div className="space-y-0.5">
                        {liveConfig.beds.map((bed) => (
                          <div key={bed.id} className="text-xs text-amber-800">
                            <span className="font-medium">{bed.label}:</span>{' '}
                            {bed.width} × {bed.length} ft
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label mb-3">Sun exposure</label>
              <div className="grid grid-cols-3 gap-2">
                {SUN_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update('sun_exposure', s.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.sun_exposure === s.id
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

            <div>
              <label className="label">Dimension notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.dimensions_notes}
                onChange={(e) => update('dimensions_notes', e.target.value)}
                placeholder="e.g. East side gets an extra hour of morning sun..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Dimensions (non-raised-bed) */}
        {step === 2 && form.garden_type !== 'raised_bed' && (
          <div className="space-y-5">
            <h2 className="font-semibold text-gray-800">How big is your garden?</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Width (ft)</label>
                <input
                  type="number"
                  className="input"
                  value={form.width_ft}
                  onChange={(e) => update('width_ft', e.target.value)}
                  placeholder="e.g. 4"
                  min="1"
                  step="0.5"
                />
              </div>
              <div>
                <label className="label">Length (ft)</label>
                <input
                  type="number"
                  className="input"
                  value={form.length_ft}
                  onChange={(e) => update('length_ft', e.target.value)}
                  placeholder="e.g. 8"
                  min="1"
                  step="0.5"
                />
              </div>
            </div>

            {form.width_ft && form.length_ft && (
              <div className="bg-garden-50 rounded-lg p-3 text-sm text-garden-800">
                📐 Total area: <strong>{(form.width_ft * form.length_ft).toFixed(1)} sq ft</strong>
              </div>
            )}

            <div>
              <label className="label mb-3">Sun exposure</label>
              <div className="grid grid-cols-3 gap-2">
                {SUN_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => update('sun_exposure', s.id)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.sun_exposure === s.id
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

            <div>
              <label className="label">Dimension notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.dimensions_notes}
                onChange={(e) => update('dimensions_notes', e.target.value)}
                placeholder="e.g. East side gets an extra hour of morning sun..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-gray-800">Garden preferences</h2>

            <div>
              <label className="label">Irrigation method</label>
              <div className="grid grid-cols-2 gap-2">
                {IRRIGATION_OPTIONS.map((irr) => (
                  <button
                    key={irr.id}
                    onClick={() => update('irrigation_type', irr.id)}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                      form.irrigation_type === irr.id
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
              <label className="label">🦌 Wildlife / fencing protection</label>
              <p className="text-xs text-gray-500 mb-2">Do you have deer, rabbit, or pest fencing?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => update('has_fencing', true)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    form.has_fencing === true
                      ? 'border-garden-500 bg-garden-50'
                      : 'border-gray-200 hover:border-garden-300'
                  }`}
                >
                  <span className="text-sm font-medium">Yes</span>
                </button>
                <button
                  onClick={() => update('has_fencing', false)}
                  className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                    form.has_fencing === false
                      ? 'border-garden-500 bg-garden-50'
                      : 'border-gray-200 hover:border-garden-300'
                  }`}
                >
                  <span className="text-sm font-medium">No</span>
                </button>
              </div>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Anything else about your garden space..."
              />
            </div>
          </div>
        )}

        {/* Step 4: Photo */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Add a reference photo</h2>
            <p className="text-sm text-gray-500">
              Optional — upload a photo of your garden space to reference while planning.
            </p>

            {form.photoPreview ? (
              <div className="relative">
                <img
                  src={form.photoPreview}
                  alt="Garden preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  onClick={() => { update('photo', null); update('photoPreview', null); }}
                  className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 shadow"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl hover:border-garden-400 hover:bg-garden-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium">Tap to upload photo</span>
                <span className="text-xs">JPG, PNG, or HEIC up to 10MB</span>
              </button>
            )}

            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />

            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              💡 You can also skip this and add a photo later from your garden page.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => { setStep(s => s - 1); setError(''); }}
              className="btn-secondary flex-1"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => {
                if (canAdvance()) { setStep(s => s + 1); setError(''); }
                else { setError('Please complete this step first'); }
              }}
              className="btn-primary flex-1"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {saving ? '🌱 Creating garden...' : '🌱 Create Garden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
