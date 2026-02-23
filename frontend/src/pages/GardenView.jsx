import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import PlantCard from '../components/PlantCard';
import GardenLayout from '../components/GardenLayout';
import PlantingTimeline from '../components/PlantingTimeline';
import NLIChat from '../components/NLIChat';

const CATEGORY_FILTERS = ['all', 'vegetable', 'herb', 'fruit', 'flower'];
const GARDEN_TYPE_ICONS = {
  in_ground: '🌿', raised_bed: '🪵', container: '🪴', vertical: '🪜',
  hugelkultur: '⛰️', straw_bale: '🌾', greenhouse: '🏠',
};

const PLAN_STATUS_MESSAGES = [
  'Reviewing your beds and available space…',
  'Calculating capacity per unit…',
  'Selecting companion plant groupings…',
  'Checking sun requirements per bed…',
  'Planning crop rotation based on history…',
  'Scheduling succession harvests…',
  'Avoiding antagonist pairs…',
  'Finalising your planting plan…',
];

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
  const [manualPlanOpen, setManualPlanOpen] = useState(false);
  const [manualAssignments, setManualAssignments] = useState({});
  const [savingManual, setSavingManual]   = useState(false);
  const [draggedPlantId, setDraggedPlantId] = useState(null);
  const [dragOverUnitId, setDragOverUnitId] = useState(null);
  // Custom plant
  const [customPlantOpen, setCustomPlantOpen]       = useState(false);
  const [customPlantName, setCustomPlantName]       = useState('');
  const [customPlantCategory, setCustomPlantCategory] = useState('vegetable');
  const [customPlantAdding, setCustomPlantAdding]   = useState(false);
  // Variety note editing
  const [editingVarietyId, setEditingVarietyId]     = useState(null);
  const [varietyDraft, setVarietyDraft]             = useState('');
  const [editOpen, setEditOpen]       = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [editSaving, setEditSaving]   = useState(false);
  const [planStatusIdx, setPlanStatusIdx] = useState(0);
  const statusIntervalRef = useRef(null);

  // Cycle through status messages while the AI plan is loading
  useEffect(() => {
    if (recommending) {
      setPlanStatusIdx(0);
      statusIntervalRef.current = setInterval(() => {
        setPlanStatusIdx(i => (i + 1) % PLAN_STATUS_MESSAGES.length);
      }, 3500);
    } else {
      clearInterval(statusIntervalRef.current);
    }
    return () => clearInterval(statusIntervalRef.current);
  }, [recommending]);

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
      await api.post(`/nli/recommend/${id}`);
      await loadGarden();
      toast('AI plan ready!');
      setTab('timeline'); // Jump straight to the timeline so users see the plan
    } catch (err) {
      console.error('Recommend error:', err);
      const msg = err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Request timed out — the garden may be complex. Try again or simplify your layout.' : null)
        || (err.message?.includes('Network') ? 'Network error — check your connection and try again.' : null)
        || 'Recommendation failed — try again';
      toast(msg);
    } finally {
      setRecommending(false);
    }
  };

  const handleSaveManualPlan = async () => {
    setSavingManual(true);
    try {
      await api.post(`/nli/manual-assign/${id}`, { plant_assignments: manualAssignments });
      await loadGarden();
      toast('Plan saved!');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save plan — try again');
    } finally {
      setSavingManual(false);
    }
  };

  const handleAddCustomPlant = async () => {
    if (!customPlantName.trim()) return;
    setCustomPlantAdding(true);
    try {
      const { data } = await api.post('/plants/custom', {
        name: customPlantName.trim(),
        category: customPlantCategory,
      });
      const plant = data.plant;
      setAllPlants(prev => [plant, ...prev]);
      // Immediately add to the garden
      const { data: gpData } = await api.post(`/gardens/${id}/plants`, { plant_id: plant.id });
      setGardenPlants(prev => [...prev, { ...gpData.garden_plant, ...plant, plant_id: plant.id }]);
      toast(`Added "${plant.name}" to your garden`);
      setCustomPlantOpen(false);
      setCustomPlantName('');
      setSearch('');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add custom plant');
    } finally {
      setCustomPlantAdding(false);
    }
  };

  const handleSaveVariety = async (gpId) => {
    try {
      await api.put(`/gardens/${id}/plants/${gpId}`, { notes: varietyDraft });
      setGardenPlants(prev => prev.map(gp => gp.id === gpId ? { ...gp, notes: varietyDraft } : gp));
      setEditingVarietyId(null);
    } catch {
      toast('Failed to save variety — try again');
    }
  };

  const openEdit = () => {
    setEditForm({
      name: garden.name || '',
      location_city: garden.location_city || '',
      location_state: garden.location_state || '',
      hardiness_zone: garden.hardiness_zone || '',
      notes: garden.notes || '',
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.name?.trim()) return;
    setEditSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', editForm.name.trim());
      if (editForm.location_city)  fd.append('location_city',  editForm.location_city);
      if (editForm.location_state) fd.append('location_state', editForm.location_state);
      if (editForm.hardiness_zone) fd.append('hardiness_zone', editForm.hardiness_zone);
      fd.append('notes', editForm.notes || '');
      const { data } = await api.put(`/gardens/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setGarden(data.garden);
      setEditOpen(false);
      toast('Garden settings saved');
    } catch {
      toast('Failed to save — try again');
    } finally {
      setEditSaving(false);
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
      <div className="mb-6">
        <div className="flex items-start gap-4 bg-garden-50 border border-garden-100 rounded-2xl p-4">
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
          <button
            onClick={editOpen ? () => setEditOpen(false) : openEdit}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-white transition-all"
          >
            {editOpen ? '✕ Close' : '⚙️ Edit'}
          </button>
        </div>

        {/* Inline edit panel */}
        {editOpen && (
          <div className="mt-2 card p-5 space-y-4 border-2 border-garden-200">
            <h3 className="font-semibold text-gray-800 text-sm">Edit garden settings</h3>
            <div>
              <label className="label text-xs">Garden name</label>
              <input className="input" value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="My Garden" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">City</label>
                <input className="input" value={editForm.location_city}
                  onChange={e => setEditForm(f => ({ ...f, location_city: e.target.value }))}
                  placeholder="Springfield" />
              </div>
              <div>
                <label className="label text-xs">State</label>
                <input className="input uppercase" maxLength={2} value={editForm.location_state}
                  onChange={e => setEditForm(f => ({ ...f, location_state: e.target.value.toUpperCase() }))}
                  placeholder="IL" />
              </div>
            </div>
            <div>
              <label className="label text-xs">Hardiness Zone</label>
              <input className="input" value={editForm.hardiness_zone}
                onChange={e => setEditForm(f => ({ ...f, hardiness_zone: e.target.value }))}
                placeholder="e.g. 6b" />
            </div>
            <div>
              <label className="label text-xs">Notes</label>
              <textarea className="input resize-none" rows={2} value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Anything else about your garden..." />
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditSave} disabled={editSaving || !editForm.name?.trim()}
                className="btn-primary flex-1 disabled:opacity-50 text-sm">
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditOpen(false)} className="btn-secondary text-sm px-4">
                Cancel
              </button>
            </div>
          </div>
        )}
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
          {!hasPlan && gardenPlants.length === 0 ? (
            /* Hero state — brand new garden, no plants yet */
            <div className="card p-8 text-center space-y-5 border-2 border-dashed border-garden-200">
              <div className="text-5xl">🌱</div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to plan your beds?</h2>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  ChatGRD's AI assigns plants to each bed based on your zone, sun, spacing, companion grouping, and crop rotation — all in one click.
                </p>
              </div>
              <ul className="text-left text-sm text-gray-600 space-y-1.5 inline-block">
                <li>✅ Companion pairing (Tomato + Basil + Marigold)</li>
                <li>✅ Space-aware — no overcrowding</li>
                <li>✅ Succession planting for year-round harvests</li>
                <li>✅ Crop rotation based on your history</li>
              </ul>
              <div className="space-y-2">
                <button
                  onClick={handleRecommend}
                  disabled={recommending}
                  className="btn-primary text-base px-10 py-3 disabled:opacity-60 w-full sm:w-auto"
                >
                  {recommending ? '🌱 Building your plan…' : '✨ Get AI Plant Plan'}
                </button>
                {recommending && (
                  <div className="space-y-1">
                    <p className="text-sm text-garden-700 font-medium animate-pulse">
                      {PLAN_STATUS_MESSAGES[planStatusIdx]}
                    </p>
                    <p className="text-xs text-gray-400">Usually takes 15–30 seconds</p>
                  </div>
                )}
                <div>
                  <button onClick={() => setTab('plants')} className="text-sm text-garden-600 hover:underline">
                    Or browse plants to add manually →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Compact banner when plan exists or plants have been manually added */
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
                    <p className="text-sm font-semibold text-amber-800">No AI plan yet</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Get an optimized layout based on your zone, sun, companion planting, and crop rotation.
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
              {recommending && (
                <p className="text-xs text-gray-500 mt-1 animate-pulse">{PLAN_STATUS_MESSAGES[planStatusIdx]}</p>
              )}
            </div>
          )}

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
              <div className="space-y-0">
                {gardenPlants.map(gp => (
                  <div key={gp.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{gp.emoji}</span>
                        <div>
                          <span className="font-medium text-sm">{gp.name}</span>
                          {gp.user_id && <span className="text-xs text-garden-600 ml-1.5">custom</span>}
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
                    {/* Variety note — inline editable */}
                    {editingVarietyId === gp.id ? (
                      <div className="mt-1 flex items-center gap-2 ml-8">
                        <input
                          autoFocus
                          className="input text-xs py-1 flex-1"
                          value={varietyDraft}
                          onChange={e => setVarietyDraft(e.target.value)}
                          placeholder="e.g. Sungold, Cherokee Purple, Brandywine"
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveVariety(gp.id); if (e.key === 'Escape') setEditingVarietyId(null); }}
                        />
                        <button onClick={() => handleSaveVariety(gp.id)} className="text-xs text-garden-600 font-medium hover:text-garden-800">Save</button>
                        <button onClick={() => setEditingVarietyId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <button
                        className="mt-0.5 ml-8 text-xs text-gray-400 hover:text-garden-600 transition-colors"
                        onClick={() => { setEditingVarietyId(gp.id); setVarietyDraft(gp.notes || ''); }}
                      >
                        {gp.notes ? `variety: ${gp.notes} ✏️` : '+ add variety'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag-and-drop manual planner */}
          {gardenPlants.length > 0 && units.length > 0 && (
            <div className="card p-5 border border-dashed border-gray-200">
              <button
                onClick={() => setManualPlanOpen(o => !o)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span>🧩 Plan it yourself — drag plants into beds</span>
                <span className="text-gray-400 text-xs">{manualPlanOpen ? '▲ hide' : '▼ show'}</span>
              </button>

              {manualPlanOpen && (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-gray-500">
                    Drag any plant chip below into a bed. Save when you're done — the AI will still be available to refine or give feedback afterward.
                  </p>

                  {/* Draggable plant chips */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your plants</p>
                    <div className="flex flex-wrap gap-2">
                      {gardenPlants.map(gp => (
                        <div
                          key={gp.plant_id}
                          draggable
                          onDragStart={() => setDraggedPlantId(gp.plant_id)}
                          onDragEnd={() => setDraggedPlantId(null)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium cursor-grab active:cursor-grabbing select-none border transition-all ${
                            draggedPlantId === gp.plant_id
                              ? 'border-garden-400 bg-garden-100 text-garden-800 shadow-md scale-105'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-garden-300 hover:bg-garden-50'
                          }`}
                        >
                          <span>{gp.emoji}</span>
                          <span>{gp.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drop zones */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {units.map(unit => {
                      const assignedIds    = manualAssignments[unit.id] || [];
                      const assignedPlants = assignedIds
                        .map(pid => gardenPlants.find(gp => gp.plant_id === pid))
                        .filter(Boolean);
                      const isOver = dragOverUnitId === unit.id;
                      return (
                        <div
                          key={unit.id}
                          onDragOver={e => { e.preventDefault(); setDragOverUnitId(unit.id); }}
                          onDragLeave={() => setDragOverUnitId(null)}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverUnitId(null);
                            if (!draggedPlantId) return;
                            setManualAssignments(prev => {
                              const existing = prev[unit.id] || [];
                              if (existing.includes(draggedPlantId)) return prev;
                              return { ...prev, [unit.id]: [...existing, draggedPlantId] };
                            });
                            setDraggedPlantId(null);
                          }}
                          className={`rounded-xl border-2 p-3 min-h-[80px] transition-all ${
                            isOver
                              ? 'border-garden-400 bg-garden-50 shadow-inner'
                              : 'border-dashed border-gray-300 hover:border-garden-300'
                          }`}
                        >
                          <p className="text-xs font-semibold text-gray-600 mb-2">{unit.label}</p>
                          {assignedPlants.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">
                              {isOver ? '↓ Drop here' : 'Drag a plant here'}
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedPlants.map(gp => (
                                <span
                                  key={gp.plant_id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-garden-100 text-garden-800 border border-garden-200"
                                >
                                  {gp.emoji} {gp.name}
                                  <button
                                    onClick={() => setManualAssignments(prev => ({
                                      ...prev,
                                      [unit.id]: (prev[unit.id] || []).filter(pid => pid !== gp.plant_id),
                                    }))}
                                    className="ml-0.5 text-garden-500 hover:text-red-500 transition-colors leading-none"
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSaveManualPlan}
                      disabled={savingManual || Object.values(manualAssignments).every(a => a.length === 0)}
                      className="btn-primary text-sm px-6 py-2 disabled:opacity-50"
                    >
                      {savingManual ? '💾 Saving…' : '💾 Save my plan'}
                    </button>
                    <button
                      onClick={() => setManualAssignments({})}
                      className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
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
              onChange={e => { setSearch(e.target.value); setCustomPlantName(e.target.value); setCustomPlantOpen(false); }}
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
                isCustom={!!plant.user_id}
              />
            ))}
          </div>

          {/* No results: offer to add as custom plant */}
          {filteredPlants.length === 0 && search && (
            <div className="text-center py-8 space-y-3">
              <div className="text-4xl">🔍</div>
              <p className="text-gray-500 text-sm">No plants found for "<strong>{search}</strong>"</p>
              {!customPlantOpen ? (
                <button
                  onClick={() => setCustomPlantOpen(true)}
                  className="btn-primary text-sm px-5 py-2"
                >
                  + Add "{search}" as a custom plant
                </button>
              ) : (
                <div className="max-w-sm mx-auto text-left bg-garden-50 border border-garden-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-garden-800 text-sm">Add custom plant</h4>
                  <div>
                    <label className="label text-xs">Plant name</label>
                    <input
                      className="input text-sm"
                      value={customPlantName}
                      onChange={e => setCustomPlantName(e.target.value)}
                      placeholder="e.g. Summer Fireworks Coleus"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Category</label>
                    <select
                      className="input text-sm"
                      value={customPlantCategory}
                      onChange={e => setCustomPlantCategory(e.target.value)}
                    >
                      <option value="vegetable">Vegetable</option>
                      <option value="herb">Herb</option>
                      <option value="fruit">Fruit</option>
                      <option value="flower">Flower / Ornamental</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    The AI will treat this plant based on its name and category. For best results, be specific (e.g. "Summer Fireworks Coleus" rather than just "Coleus").
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCustomPlant}
                      disabled={customPlantAdding || !customPlantName.trim()}
                      className="btn-primary flex-1 text-sm py-2 disabled:opacity-50"
                    >
                      {customPlantAdding ? 'Adding…' : 'Add to garden'}
                    </button>
                    <button onClick={() => setCustomPlantOpen(false)} className="btn-secondary text-sm px-3 py-2">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {filteredPlants.length === 0 && !search && (
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
