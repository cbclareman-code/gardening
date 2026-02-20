import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import PlantCard from '../components/PlantCard';
import GardenLayout from '../components/GardenLayout';
import PlantingTimeline from '../components/PlantingTimeline';
import NLIChat from '../components/NLIChat';

const CATEGORY_FILTERS = ['all', 'vegetable', 'herb', 'fruit', 'flower'];
const GARDEN_TYPE_ICONS = {
  in_ground: '🌿', raised_bed: '🪵', container: '🪴', vertical: '🪜',
  hugelkultur: '⛰️', straw_bale: '🌾', greenhouse: '🏡',
};

export default function GardenView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [garden, setGarden]           = useState(null);
  const [gardenPlants, setGardenPlants] = useState([]);
  const [allPlants, setAllPlants]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState('layout'); // 'layout' | 'plants' | 'timeline'
  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('all');
  const [chatOpen, setChatOpen]       = useState(false);
  const [actionMsg, setActionMsg]     = useState('');
  const [recommending, setRecommending] = useState(false);

  // ── load ─────────────────────────────────────────────────────────────────
  const loadGarden = useCallback(async () => {
    try {
      const [gardenRes, plantsRes] = await Promise.all([
        api.get(`/gardens/${id}`),
        api.get('/plants'),
      ]);
      setGarden(gardenRes.data.garden);
      setGardenPlants(gardenRes.data.plants);
      setAllPlants(plantsRes.data.plants);
    } catch (err) {
      if (err.response?.status === 404) navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadGarden(); }, [loadGarden]);

  // ── derived layout data ──────────────────────────────────────────────────
  const layoutData = (() => {
    try { return garden?.layout_data ? JSON.parse(garden.layout_data) : null; } catch { return null; }
  })();
  const units           = layoutData?.units || [];
  const planningSchedule = layoutData?.planting_schedule || [];
  const hasPlan         = !!(layoutData?.plant_assignments && Object.keys(layoutData.plant_assignments).length > 0);

  // ── plant browsing ───────────────────────────────────────────────────────
  const zone = garden?.hardiness_zone ? parseInt(garden.hardiness_zone) : null;
  const filteredPlants = allPlants.filter(p => {
    if (zone && (p.min_zone > zone || p.max_zone < zone)) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const gardenPlantIds = new Set(gardenPlants.map(gp => gp.plant_id));

  // ── actions ──────────────────────────────────────────────────────────────
  const toast = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const togglePlant = async (plant) => {
    const existing = gardenPlants.find(gp => gp.plant_id === plant.id);
    if (existing) {
      await api.delete(`/gardens/${id}/plants/${existing.id}`);
      setGardenPlants(prev => prev.filter(gp => gp.id !== existing.id));
      toast(`Removed ${plant.name}`);
    } else {
      const { data } = await api.post(`/gardens/${id}/plants`, { plant_id: plant.id });
      const full = allPlants.find(p => p.id === plant.id);
      setGardenPlants(prev => [...prev, { ...data.garden_plant, ...full, plant_id: plant.id }]);
      toast(`Added ${plant.name}`);
    }
  };

  const handleRecommend = async () => {
    setRecommending(true);
    try {
      const { data } = await api.post(`/nli/recommend/${id}`);
      setGarden(data.garden);
      if (data.plants) {
        const enriched = data.plants.map(gp => {
          const full = allPlants.find(p => p.id === gp.plant_id);
          return { ...gp, ...(full || {}) };
        });
        setGardenPlants(enriched);
      }
      toast('AI plan ready!');
    } catch (err) {
      toast(err.response?.data?.error || 'Recommendation failed — try again');
    } finally {
      setRecommending(false);
    }
  };

  const handleNLIUpdate = useCallback((updatedGarden, updatedPlants) => {
    if (updatedGarden) setGarden(updatedGarden);
    if (updatedPlants) {
      const enriched = updatedPlants.map(gp => {
        const full = allPlants.find(p => p.id === gp.plant_id);
        return { ...gp, ...(full || {}) };
      });
      setGardenPlants(enriched);
    }
    toast('Garden updated via chat');
  }, [allPlants]);

  // ── loading / empty ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">🌱</div>
          <p>Loading garden...</p>
        </div>
      </div>
    );
  }
  if (!garden) return null;

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Toast */}
      {actionMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-garden-700 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          {actionMsg}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link to="/dashboard" className="hover:text-gray-600 transition-colors">My Gardens</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{garden.name}</span>
      </div>

      {/* Garden header */}
      <div className="flex items-start gap-4 mb-6 bg-garden-50 border border-garden-100 rounded-2xl p-4">
        {garden.photo_path ? (
          <img src={garden.photo_path} alt={garden.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-white border border-garden-200 flex items-center justify-center text-3xl flex-shrink-0">
            {GARDEN_TYPE_ICONS[garden.garden_type] || '🌱'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-garden-600 uppercase tracking-wide mb-0.5">You're planning</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{garden.name}</h1>
          <div className="flex flex-wrap gap-2 mt-1.5 text-sm text-gray-500">
            <span className="capitalize">{garden.garden_type?.replace(/_/g, ' ')}</span>
            {garden.width_ft && garden.length_ft && <span>· {garden.width_ft}×{garden.length_ft} ft</span>}
            {garden.hardiness_zone && <span className="text-garden-700 font-medium">· Zone {garden.hardiness_zone}</span>}
            {garden.location_city && (
              <span>· 📍 {garden.location_city}{garden.location_state ? `, ${garden.location_state}` : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'layout',   label: '🗺️ Layout',   desc: `${units.length} units` },
          { id: 'plants',   label: '🌿 Add Plants', desc: `${filteredPlants.length} available` },
          { id: 'timeline', label: '📅 Timeline',   desc: planningSchedule.length > 0 ? `${planningSchedule.length} crops` : 'needs plan' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* ── Layout tab ──────────────────────────────────────────────────────── */}
      {tab === 'layout' && (
        <div className="space-y-5">

          {/* AI plan CTA */}
          <div className={`rounded-xl border p-4 flex items-start justify-between gap-4 ${
            hasPlan ? 'bg-garden-50 border-garden-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div>
              {hasPlan ? (
                <>
                  <p className="text-sm font-semibold text-garden-800">AI plant plan active</p>
                  <p className="text-xs text-garden-700 mt-0.5">
                    Plants are assigned to units based on space, companions, and sun. You can still add or remove plants manually.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-800">No plant plan yet</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    ChatGRD can suggest an optimized layout based on your zone, sun exposure, and companion planting.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={handleRecommend}
              disabled={recommending}
              className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60 ${
                hasPlan
                  ? 'bg-garden-600 hover:bg-garden-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {recommending ? '🌱 Planning…' : hasPlan ? '↺ Refresh Plan' : '✨ Get AI Plant Plan'}
            </button>
          </div>

          {/* Layout card */}
          <div className="card p-5">
            <GardenLayout
              garden={garden}
              plants={gardenPlants}
              onPlantRemove={(p) => togglePlant({ id: p.plant_id, name: p.name, ...p })}
            />
          </div>

          {/* Plants in this garden list */}
          {gardenPlants.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  Plants in this garden ({gardenPlants.length})
                </h3>
                <button onClick={() => setTab('plants')} className="text-xs text-garden-600 hover:underline">
                  + Add more
                </button>
              </div>
              <div className="space-y-1">
                {gardenPlants.map(gp => (
                  <div key={gp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{gp.emoji}</span>
                      <div>
                        <span className="font-medium text-sm">{gp.name}</span>
                        <span className="text-xs text-gray-500 ml-2 capitalize">{gp.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {gp.days_to_maturity && <span>{gp.days_to_maturity}d</span>}
                      {gp.spacing_inches && <span>{gp.spacing_inches}" spacing</span>}
                      <button
                        onClick={() => togglePlant({ id: gp.plant_id, name: gp.name })}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gardenPlants.length === 0 && !recommending && (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">No plants added yet.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setTab('plants')} className="btn-primary">Browse Plants</button>
                <button onClick={handleRecommend} className="btn-secondary">✨ AI Plan</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Plants tab ──────────────────────────────────────────────────────── */}
      {tab === 'plants' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-start justify-between gap-3">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">Tap a plant card to add it to {garden.name}.</span>
              {' '}Switch to the <strong>Layout</strong> tab to see your planting map, or get an <strong>AI Plan</strong> for a fully optimized layout.
            </div>
            {gardenPlants.length > 0 && (
              <button
                onClick={() => setTab('layout')}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                View Layout ({gardenPlants.length}) →
              </button>
            )}
          </div>

          {zone && (
            <div className="bg-garden-50 border border-garden-200 rounded-xl px-4 py-3 mb-4 text-sm text-garden-800">
              🌡️ Showing plants suitable for <strong>Zone {zone}</strong>
              {garden.location_city && ` (${garden.location_city})`}
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search plants…"
              className="input flex-1"
            />
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  category === cat
                    ? 'bg-garden-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-garden-300'
                }`}
              >{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlants.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                selected={gardenPlantIds.has(plant.id)}
                onToggle={togglePlant}
              />
            ))}
          </div>

          {filteredPlants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No plants match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Timeline tab ────────────────────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          {!hasPlan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-800">Get an AI plan first</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  The timeline is generated alongside the AI plant plan, with dates tailored to your zone.
                </p>
              </div>
              <button
                onClick={() => { setTab('layout'); setTimeout(handleRecommend, 100); }}
                disabled={recommending}
                className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
              >
                {recommending ? '🌱 Planning…' : '✨ Get AI Plan'}
              </button>
            </div>
          )}

          <div className="card p-5">
            <PlantingTimeline
              schedule={planningSchedule}
              units={units}
              plants={gardenPlants}
            />
          </div>
        </div>
      )}

      {/* NLI Chat */}
      <NLIChat
        gardenId={id}
        onGardenUpdate={handleNLIUpdate}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(prev => !prev)}
      />
    </div>
  );
}
