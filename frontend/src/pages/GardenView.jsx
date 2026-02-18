import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import PlantCard from '../components/PlantCard';
import GardenLayout from '../components/GardenLayout';
import NLIChat from '../components/NLIChat';

const CATEGORY_FILTERS = ['all', 'vegetable', 'herb', 'fruit', 'flower'];
const GARDEN_TYPE_ICONS = {
  in_ground: '🌍', raised_bed: '📦', container: '🪴', vertical: '🏗️',
  hugelkultur: '🌋', straw_bale: '🌾', greenhouse: '🏠',
};

export default function GardenView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [garden, setGarden] = useState(null);
  const [gardenPlants, setGardenPlants] = useState([]); // plants in this garden
  const [allPlants, setAllPlants] = useState([]); // available plants db
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('layout'); // 'layout' | 'plants'
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [chatOpen, setChatOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Load garden + plants
  const loadGarden = useCallback(async () => {
    try {
      const [gardenRes, plantsRes] = await Promise.all([
        api.get(`/gardens/${id}`),
        api.get('/plants', {
          params: {
            zone: undefined, // fetch all, filter client-side
          }
        })
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

  // Filter available plants
  const zone = garden?.hardiness_zone ? parseInt(garden.hardiness_zone) : null;

  const filteredPlants = allPlants.filter(p => {
    if (zone && (p.min_zone > zone || p.max_zone < zone)) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const gardenPlantIds = new Set(gardenPlants.map(gp => gp.plant_id));

  const togglePlant = async (plant) => {
    const existing = gardenPlants.find(gp => gp.plant_id === plant.id);
    if (existing) {
      // Remove
      await api.delete(`/gardens/${id}/plants/${existing.id}`);
      setGardenPlants(prev => prev.filter(gp => gp.id !== existing.id));
      setActionMsg(`Removed ${plant.name} from garden`);
    } else {
      // Add
      const { data } = await api.post(`/gardens/${id}/plants`, { plant_id: plant.id });
      // Merge full plant data
      const fullPlant = allPlants.find(p => p.id === plant.id);
      setGardenPlants(prev => [...prev, { ...data.garden_plant, ...fullPlant, plant_id: plant.id }]);
      setActionMsg(`Added ${plant.name} to garden`);
    }
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleNLIUpdate = useCallback((updatedGarden, updatedPlants) => {
    if (updatedGarden) setGarden(updatedGarden);
    if (updatedPlants) {
      // Merge full plant data into NLI-returned plants
      const enriched = updatedPlants.map(gp => {
        const full = allPlants.find(p => p.id === gp.plant_id);
        return { ...gp, ...(full || {}) };
      });
      setGardenPlants(enriched);
    }
    setActionMsg('Garden updated via chat');
    setTimeout(() => setActionMsg(''), 3000);
  }, [allPlants]);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Toast notification */}
      {actionMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-garden-700 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-bounce">
          {actionMsg}
        </div>
      )}

      {/* Garden Header */}
      <div className="flex items-start gap-4 mb-6">
        {garden.photo_path ? (
          <img src={garden.photo_path} alt={garden.name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-garden-100 flex items-center justify-center text-3xl flex-shrink-0">
            {GARDEN_TYPE_ICONS[garden.garden_type] || '🌱'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{garden.name}</h1>
          <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
            <span className="capitalize">{garden.garden_type?.replace('_', ' ')}</span>
            {garden.width_ft && garden.length_ft && (
              <span>· {garden.width_ft}×{garden.length_ft} ft</span>
            )}
            {garden.hardiness_zone && (
              <span className="text-garden-700 font-medium">· Zone {garden.hardiness_zone}</span>
            )}
            {garden.location_city && (
              <span>· 📍 {garden.location_city}{garden.location_state ? `, ${garden.location_state}` : ''}</span>
            )}
          </div>
        </div>
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 flex-shrink-0">
          ← Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'layout', label: '🗺️ Layout', desc: `${gardenPlants.length} plants` },
          { id: 'plants', label: '🌿 Add Plants', desc: `${filteredPlants.length} available` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">{t.desc}</span>
          </button>
        ))}
      </div>

      {/* Layout Tab */}
      {tab === 'layout' && (
        <div className="space-y-4">
          <div className="card p-5">
            <GardenLayout
              garden={garden}
              plants={gardenPlants}
              onPlantRemove={(p) => togglePlant({ id: p.plant_id, name: p.name, ...p })}
            />
          </div>

          {/* Plant list for layout */}
          {gardenPlants.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Plants in this garden</h3>
              <div className="space-y-2">
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
                      <span>{gp.days_to_maturity}d</span>
                      <span>{gp.spacing_inches}" spacing</span>
                      <button
                        onClick={() => togglePlant({ id: gp.plant_id, name: gp.name })}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gardenPlants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-3">No plants added yet.</p>
              <button onClick={() => setTab('plants')} className="btn-primary">
                Browse Plants →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plants Tab */}
      {tab === 'plants' && (
        <div>
          {/* Zone notice */}
          {zone && (
            <div className="bg-garden-50 border border-garden-200 rounded-xl px-4 py-3 mb-4 text-sm text-garden-800">
              🌡️ Showing plants suitable for <strong>Zone {zone}</strong>
              {garden.location_city && ` (${garden.location_city})`}
            </div>
          )}

          {/* Search & filters */}
          <div className="flex gap-3 mb-4">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plants..."
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
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Plant grid */}
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
              {zone && <p className="text-sm mt-1">Try clearing the search or adjusting your zone.</p>}
            </div>
          )}
        </div>
      )}

      {/* NLI Chat floating button */}
      <NLIChat
        gardenId={id}
        onGardenUpdate={handleNLIUpdate}
        isOpen={chatOpen}
        onToggle={() => setChatOpen(prev => !prev)}
      />
    </div>
  );
}
