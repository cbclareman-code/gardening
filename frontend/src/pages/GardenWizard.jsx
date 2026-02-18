import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getZoneFromCity, getZoneLabel } from '../utils/api';

const GARDEN_TYPES = [
  { id: 'in_ground', emoji: '🌍', label: 'In-Ground', desc: 'Traditional row or bed garden dug into native soil' },
  { id: 'raised_bed', emoji: '📦', label: 'Raised Bed', desc: 'Elevated frames filled with premium soil mix' },
  { id: 'container', emoji: '🪴', label: 'Container', desc: 'Pots, planters, and barrels — great for patios' },
  { id: 'vertical', emoji: '🏗️', label: 'Vertical', desc: 'Walls, trellises, and stacked systems for small spaces' },
  { id: 'hugelkultur', emoji: '🌋', label: 'Hügelkultur', desc: 'Mounded beds over buried logs for moisture retention' },
  { id: 'straw_bale', emoji: '🌾', label: 'Straw Bale', desc: 'Conditioned straw bales as self-contained grow beds' },
  { id: 'greenhouse', emoji: '🏠', label: 'Greenhouse', desc: 'Climate-controlled growing space for year-round gardening' },
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

const STEPS = ['Location & Zone', 'Garden Type', 'Dimensions', 'Preferences', 'Photo'];

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
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

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
      if (form.width_ft) fd.append('width_ft', form.width_ft);
      if (form.length_ft) fd.append('length_ft', form.length_ft);
      fd.append('sun_exposure', form.sun_exposure);
      fd.append('has_fencing', form.has_fencing);
      fd.append('irrigation_type', form.irrigation_type);
      if (form.notes) fd.append('notes', form.notes);
      if (form.photo) fd.append('photo', form.photo);

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
    return true;
  };

  const progress = ((step + 1) / STEPS.length) * 100;

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
                placeholder="e.g. 6 or 7a"
              />
              {form.hardiness_zone && (
                <p className="text-xs text-garden-700 mt-1">
                  {getZoneLabel(parseInt(form.hardiness_zone))}
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

        {/* Step 2: Dimensions */}
        {step === 2 && (
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

            <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              form.has_fencing ? 'border-garden-500 bg-garden-50' : 'border-gray-200'
            }`}>
              <input
                type="checkbox"
                checked={form.has_fencing}
                onChange={(e) => update('has_fencing', e.target.checked)}
                className="w-4 h-4 accent-garden-600"
              />
              <div>
                <div className="font-medium text-sm">🦌 Wildlife / fencing protection</div>
                <div className="text-xs text-gray-500">Does your garden need deer, rabbit, or pest fencing?</div>
              </div>
            </label>

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
              onClick={() => { if (canAdvance()) { setStep(s => s + 1); setError(''); } else { setError('Please complete this step first'); } }}
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
