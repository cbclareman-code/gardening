import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import PlantCard from '../components/PlantCard';
import GardenLayout from '../components/GardenLayout';
import PlantingTimeline from '../components/PlantingTimeline';
import NLIChat from '../components/NLIChat';

const CATEGORY_FILTERS = ['all', 'vegetable', 'herb', 'fruit', 'flower'];
const MAX_MUST_HAVES = 10;
const PICKER_CATEGORY_ORDER  = ['vegetable', 'fruit', 'herb', 'flower'];
const PICKER_CATEGORY_LABELS = { vegetable: 'Vegetables', fruit: 'Fruits', herb: 'Herbs', flower: 'Flowers' };
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
  // Must Haves + AI mode
  const [mustHavesMode, setMustHavesMode] = useState(false);
  const [mustHavePlantIds, setMustHavePlantIds] = useState([]);
  const [mustHaveSearch, setMustHaveSearch] = useState('');
  const [mustHaveCapWarning, setMustHaveCapWarning] = useState(false);
  // Per-area planning flow
  const [planningAreaName, setPlanningAreaName] = useState(null);    // area currently being set up
  const [pendingReviewAreaName, setPendingReviewAreaName] = useState(null); // plan returned, awaiting accept

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

  // ── area grouping ────────────────────────────────────────────────────────
  // Group units by area_name so we can plan one area at a time
  const areaGroups = units.reduce((acc, unit) => {
    const name = unit.area_name || garden?.name || 'My Garden';
    if (!acc[name]) acc[name] = [];
    acc[name].push(unit);
    return acc;
  }, {});
  const areaNames = Object.keys(areaGroups);

  // Does an area have any plant assignments yet?
  const areaHasPlan = (areaName) => {
    const areaUnits = areaGroups[areaName] || [];
    return areaUnits.some(u => layoutData?.plant_assignments?.[String(u.id)]?.length > 0);
  };

  // Units belonging to the area currently being planned
  const planningAreaUnits = planningAreaName ? (areaGroups[planningAreaName] || []) : [];

  // Sun/type compatibility check — returns true if a plant can work in at least one unit of the area
  const isPlantCompatibleWithArea = (plant, areaUnits) => {
    if (!areaUnits || areaUnits.length === 0) return true;
    const gardenSun = garden?.sun_exposure || 'full_sun';
    const sunOk = areaUnits.some(unit => {
      const unitSun = unit.sun_exposure || gardenSun;
      if (plant.sun_requirement === 'full_sun') return unitSun === 'full_sun' || unitSun === 'part_shade';
      if (plant.sun_requirement === 'part_shade') return unitSun !== 'shade';
      if (plant.sun_requirement === 'shade') return unitSun === 'shade' || unitSun === 'part_shade';
      return true;
    });
    const plantTypes = (plant.garden_types || 'all').split(',').map(s => s.trim());
    const typeOk = plantTypes.includes('all') || areaUnits.some(u => u.type_id && plantTypes.includes(u.type_id));
    return sunOk && typeOk;
  };

  // ── plant browsing ───────────────────────────────────────────────────────
  const zone = garden?.hardiness_zone ? parseInt(garden.hardiness_zone) : null;

  // Plants shown in the must-haves picker: zone-filtered, search-filtered, grouped by category.
  // When an area is selected, incompatible plants (wrong sun/type) are tagged and sorted last.
  const mustHavePickerGroups = PICKER_CATEGORY_ORDER.map(cat => ({
    key: cat,
    label: PICKER_CATEGORY_LABELS[cat],
    plants: allPlants
      .filter(p => {
        if (p.category !== cat) return false;
        if (zone && (p.min_zone > zone || p.max_zone < zone)) return false;
        if (mustHaveSearch && !p.name.toLowerCase().includes(mustHaveSearch.toLowerCase())) return false;
        return true;
      })
      .map(p => ({
        ...p,
        _incompatible: planningAreaUnits.length > 0 && !isPlantCompatibleWithArea(p, planningAreaUnits),
      }))
      .sort((a, b) => {
        if (a._incompatible && !b._incompatible) return 1;
        if (!a._incompatible && b._incompatible) return -1;
        return a.name.localeCompare(b.name);
      }),
  })).filter(g => g.plants.length > 0);

  const filteredPlants = allPlants.filter(p => {
    if (zone && (p.min_zone > zone || p.max_zone < zone)) return false;
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const gardenPlantIds = new Set(gardenPlants.map(gp => gp.plant_id));

  // ── actions ──────────────────────────────────────────────────────────────
  const toast = (msg) => { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000); };

  const toggleMustHavePlant = (plantId) => {
    const selected = mustHavePlantIds.includes(plantId);
    if (!selected && mustHavePlantIds.length >= MAX_MUST_HAVES) {
      setMustHaveCapWarning(true);
      setTimeout(() => setMustHaveCapWarning(false), 3000);
      return;
    }
    setMustHavePlantIds(prev => selected ? prev.filter(i => i !== plantId) : [...prev, plantId]);
  };

  const togglePlant = async (plant) => {
    // Normalise the plant id — callers may pass either { id } or { plant_id }
    const plantId = plant.plant_id ?? plant.id;
    try {
      const existing = gardenPlants.find(gp => gp.plant_id === plantId);
      if (existing) {
        await api.delete(`/gardens/${id}/plants/${existing.id}`);
        setGardenPlants(prev => prev.filter(gp => gp.id !== existing.id));
        toast(`Removed ${plant.name}`);
      } else {
        const { data } = await api.post(`/gardens/${id}/plants`, { plant_id: plantId });
        const full = allPlants.find(p => p.id === plantId);
        setGardenPlants(prev => [...prev, { ...data.garden_plant, ...full, plant_id: plantId }]);
        toast(`Added ${plant.name}`);
      }
    } catch (err) {
      toast(err.response?.data?.error || `Failed to update ${plant.name} — try again`);
    }
  };

  const handleRecommend = async (requiredPlantIds = [], areaName = null) => {
    setRecommending(true);
    try {
      const body = {};
      if (requiredPlantIds.length > 0) body.required_plant_ids = requiredPlantIds;
      // Scope planning to specific units when an area is selected
      if (areaName) {
        const areaUnitIds = (areaGroups[areaName] || []).map(u => u.id);
        if (areaUnitIds.length > 0) body.unit_ids = areaUnitIds;
      }
      await api.post(`/nli/recommend/${id}`, body);
      await loadGarden();
      toast(`Plan ready for ${areaName || 'your garden'}!`);
      // Show review panel for this area instead of auto-navigating to timeline
      setPendingReviewAreaName(areaName || areaNames[0] || null);
      setMustHavesMode(false);
      setMustHavePlantIds([]);
      setPlanningAreaName(null);
    } catch (err) {
      console.error('Recommend error:', err);
      const msg = err.response?.data?.error
        || (err.code === 'ECONNABORTED' ? 'Request timed out — please try again.' : null)
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

          {/* ── Planning flow: area picker → method picker → must-haves → review ── */}

          {/* Loading state */}
          {recommending && (
            <div className="card p-8 text-center space-y-3 border-2 border-garden-200">
              <div className="text-4xl animate-pulse">🌱</div>
              <p className="text-base font-semibold text-garden-700">
                Building plan{planningAreaName ? ` for ${planningAreaName}` : ''}…
              </p>
              <p className="text-sm text-garden-600 animate-pulse">{PLAN_STATUS_MESSAGES[planStatusIdx]}</p>
              <p className="text-xs text-gray-400">Usually takes about a minute</p>
            </div>
          )}

          {/* Review panel — plan just came back for an area, awaiting accept */}
          {!recommending && pendingReviewAreaName && (
            <div className="card p-5 border-2 border-garden-300 bg-garden-50 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌿</span>
                <div>
                  <p className="font-semibold text-garden-800 text-sm">
                    Plan ready for <span className="font-bold">{pendingReviewAreaName}</span>
                  </p>
                  <p className="text-xs text-garden-700 mt-0.5">
                    Review the beds below — plants have been assigned with companion grouping, rotation, and sun requirements in mind.
                  </p>
                </div>
              </div>
              {(() => {
                const unplanned = areaNames.filter(n => !areaHasPlan(n) && n !== pendingReviewAreaName);
                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {unplanned.length > 0 ? (
                        <>
                          <button
                            onClick={() => { setPendingReviewAreaName(null); setPlanningAreaName(unplanned[0]); }}
                            className="btn-primary text-sm"
                          >
                            Plan <span className="font-bold">{unplanned[0]}</span> next →
                          </button>
                          <button
                            onClick={() => { setPendingReviewAreaName(null); setTab('timeline'); }}
                            className="btn-secondary text-sm px-4 py-2.5"
                          >
                            📅 View timeline so far
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setPendingReviewAreaName(null); setTab('timeline'); }}
                          className="btn-primary flex-1 text-sm py-2.5"
                        >
                          ✓ All areas planned — view full timeline →
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => { setPlanningAreaName(pendingReviewAreaName); setPendingReviewAreaName(null); }}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ↺ Not happy with this area? Re-plan it
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Must-haves picker — shown when area is selected and user chose Must Haves + AI */}
          {!recommending && !pendingReviewAreaName && mustHavesMode && planningAreaName && (
            <div className="card p-6 space-y-4 border-2 border-amber-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMustHavesMode(false); setMustHavePlantIds([]); setMustHaveSearch(''); }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back
                </button>
                <h3 className="font-semibold text-gray-900 text-sm">
                  📌 Must-haves for <span className="text-amber-700">{planningAreaName}</span>
                  <span className="text-gray-400 font-normal ml-1">(up to {MAX_MUST_HAVES})</span>
                </h3>
                {mustHavePlantIds.length > 0 && (
                  <span className="ml-auto text-xs text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                    {mustHavePlantIds.length} selected
                  </span>
                )}
              </div>

              {/* Area constraint summary */}
              {planningAreaUnits.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {[...new Set(planningAreaUnits.map(u => u.sun_exposure || garden?.sun_exposure || 'full_sun'))].map(sun => (
                    <span key={sun} className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full px-2 py-0.5 capitalize">
                      ☀️ {sun.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {[...new Set(planningAreaUnits.map(u => u.type_id).filter(Boolean))].map(type => (
                    <span key={type} className="bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                      {GARDEN_TYPE_ICONS[type]} {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                  <span className="text-gray-400 italic">Plants with <span className="not-italic">⚠️</span> may not suit this area's conditions</span>
                </div>
              )}

              {/* Selected plant chips */}
              {mustHavePlantIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mustHavePlantIds.map(pid => {
                    const plant = allPlants.find(p => p.id === pid);
                    if (!plant) return null;
                    return (
                      <span key={pid} className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-sm font-medium">
                        {plant.emoji} {plant.name}
                        <button
                          onClick={() => setMustHavePlantIds(prev => prev.filter(i => i !== pid))}
                          className="ml-0.5 text-amber-600 hover:text-amber-900 leading-none"
                        >×</button>
                      </span>
                    );
                  })}
                </div>
              )}

              <input
                type="text"
                placeholder="Search plants…"
                value={mustHaveSearch}
                onChange={e => setMustHaveSearch(e.target.value)}
                className="input w-full text-sm"
              />

              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {mustHavePickerGroups.map(group => (
                  <div key={group.key}>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group.label}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {group.plants.map(plant => {
                        const selected = mustHavePlantIds.includes(plant.id);
                        const atCap = !selected && mustHavePlantIds.length >= MAX_MUST_HAVES;
                        return (
                          <button
                            key={plant.id}
                            onClick={() => toggleMustHavePlant(plant.id)}
                            title={plant._incompatible ? 'Sun or bed type may not suit this area' : ''}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                              selected          ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300'
                              : atCap           ? 'border-gray-100 opacity-40 cursor-not-allowed'
                              : plant._incompatible ? 'border-orange-200 hover:border-orange-300 hover:bg-orange-50/40'
                              : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
                            }`}
                          >
                            <span className="text-lg flex-shrink-0">{plant.emoji}</span>
                            <span className={`font-medium truncate text-xs leading-tight ${plant._incompatible && !selected ? 'text-gray-500' : 'text-gray-800'}`}>
                              {plant.name}
                            </span>
                            {selected && <span className="ml-auto text-amber-600 text-xs flex-shrink-0">✓</span>}
                            {!selected && plant._incompatible && <span className="ml-auto text-orange-400 text-xs flex-shrink-0">⚠️</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {mustHaveCapWarning && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Up to {MAX_MUST_HAVES} anchors — the AI will add more compatible plants to fill the beds. Remove one to swap in a different anchor.
                </p>
              )}

              <button
                onClick={() => handleRecommend(mustHavePlantIds, planningAreaName)}
                disabled={mustHavePlantIds.length === 0}
                className="btn-primary w-full py-3 text-sm disabled:opacity-50"
              >
                {mustHavePlantIds.length === 0
                  ? 'Select at least one plant to continue'
                  : `Build Plan Around ${mustHavePlantIds.length} Plant${mustHavePlantIds.length !== 1 ? 's' : ''} →`}
              </button>
            </div>
          )}

          {/* Method picker — shown once an area is selected but no mode chosen yet */}
          {!recommending && !pendingReviewAreaName && !mustHavesMode && planningAreaName && (
            <div className="card p-6 space-y-4 border-2 border-garden-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPlanningAreaName(null); setMustHavesMode(false); setMustHavePlantIds([]); }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ←
                </button>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Planning: <span className="text-garden-700">{planningAreaName}</span></p>
                  <p className="text-xs text-gray-500">
                    {planningAreaUnits.length} unit{planningAreaUnits.length !== 1 ? 's' : ''}
                    {planningAreaUnits[0] && ` · ${(planningAreaUnits[0].sun_exposure || garden?.sun_exposure || 'full_sun').replace(/_/g, ' ')}`}
                    {' · '}
                    {planningAreaUnits.reduce((sum, u) => sum + ((parseFloat(u.width_ft) || 0) * (parseFloat(u.length_ft) || 0)), 0).toFixed(0)} sqft total
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMustHavesMode(true)}
                  className="text-left p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-50 transition-all space-y-1.5"
                >
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">⭐ Recommended</div>
                  <div className="text-2xl">📌</div>
                  <div className="font-semibold text-gray-900 text-sm">Must Haves + AI</div>
                  <p className="text-xs text-gray-500 leading-relaxed">Pick your anchor plants — only shows what suits this area's sun &amp; bed type — AI fills the rest</p>
                </button>
                <button
                  onClick={() => handleRecommend([], planningAreaName)}
                  className="text-left p-4 rounded-xl border-2 border-garden-200 hover:border-garden-400 hover:bg-garden-50 transition-all space-y-1.5"
                >
                  <div className="text-2xl">✨</div>
                  <div className="font-semibold text-gray-900 text-sm">Full AI Plan</div>
                  <p className="text-xs text-gray-500 leading-relaxed">AI picks and places everything for this area — companions, rotation, succession, sun</p>
                </button>
              </div>
            </div>
          )}

          {/* Area picker — top-level entry point */}
          {!recommending && !pendingReviewAreaName && !mustHavesMode && !planningAreaName && areaNames.length > 0 && (
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {areaNames.every(n => areaHasPlan(n)) ? 'Garden plan active' : 'Plan your garden'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {areaNames.every(n => areaHasPlan(n))
                      ? 'All areas planned. Re-plan any area below, or view the full timeline.'
                      : 'Pick an area to plan — AI will be scoped to just that area\'s beds.'}
                  </p>
                </div>
                {hasPlan && (
                  <button onClick={() => setTab('timeline')} className="flex-shrink-0 text-sm text-garden-600 font-medium hover:text-garden-800 transition-colors">
                    View timeline →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {areaNames.map(areaName => {
                  const areaUnits = areaGroups[areaName];
                  const planned = areaHasPlan(areaName);
                  const sunValues = [...new Set(areaUnits.map(u => u.sun_exposure || garden?.sun_exposure || 'full_sun'))];
                  const totalSqft = areaUnits.reduce((sum, u) => sum + ((parseFloat(u.width_ft) || 0) * (parseFloat(u.length_ft) || 0)), 0);
                  return (
                    <button
                      key={areaName}
                      onClick={() => setPlanningAreaName(areaName)}
                      className={`text-left p-4 rounded-xl border-2 transition-all space-y-2 h-full ${
                        planned
                          ? 'border-garden-300 bg-garden-50 hover:border-garden-400 hover:bg-garden-100'
                          : 'border-dashed border-gray-300 hover:border-garden-400 hover:bg-garden-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm leading-tight">{areaName}</span>
                        {planned
                          ? <span className="flex-shrink-0 text-xs font-medium text-garden-700 bg-garden-100 border border-garden-200 rounded-full px-2 py-0.5">✓ Planned</span>
                          : <span className="flex-shrink-0 text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Unplanned</span>
                        }
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                        <span>{areaUnits.length} bed{areaUnits.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{totalSqft.toFixed(0)} sqft</span>
                        <span>·</span>
                        <span className="capitalize">{sunValues.join(' / ').replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs text-garden-600 font-medium">{planned ? '↺ Re-plan this area' : '→ Plan this area'}</p>
                    </button>
                  );
                })}
              </div>
              {/* Manual option at the bottom */}
              <div className="pt-1 border-t border-gray-100">
                <button
                  onClick={() => setTab('plants')}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  🖊 Prefer to pick plants manually?
                </button>
              </div>
            </div>
          )}

          {/* Layout card */}
          <div className="card p-5">
            <GardenLayout
              garden={garden}
              plants={gardenPlants}
              onPlantRemove={(p) => togglePlant(p)}
            />
          </div>


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
                onClick={() => setTab('layout')}
                className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
              >
                Plan my garden →
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
