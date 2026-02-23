import React, { useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_BORDER = {
  raised_bed: '#d97706', in_ground: '#16a34a', container: '#2563eb',
  vertical: '#9333ea', hugelkultur: '#db2777', straw_bale: '#ea580c', greenhouse: '#15803d',
};

// Event config — ordered by rendering priority (later entries can overwrite earlier)
const EVENTS = {
  soil_prep:  { bg: '#d97706', text: '#fff', label: 'Soil Prep'  },
  uproot:     { bg: '#fb7185', text: '#fff', label: 'Uproot'     },
  harvest:    { bg: '#fb923c', text: '#fff', label: 'Harvest'    },
  growing:    { bg: '#4ade80', text: '#14532d', label: 'Growing' },
  transplant: { bg: '#fbbf24', text: '#78350f', label: 'Transplant' },
  indoors:    { bg: '#818cf8', text: '#fff', label: 'Indoors'    },
};

// Parse a YYYY-MM-DD string and return the 0-based month index (or null)
function monthOf(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return isNaN(d) ? null : d.getMonth();
}

// Return the event key (or null) for a given month index and schedule item
function getMonthEvent(mi, item) {
  const sow       = monthOf(item.sow_indoors);
  const trans     = monthOf(item.transplant_outdoors);
  const sprout    = monthOf(item.first_sprout);
  const hStart    = monthOf(item.first_harvest);
  const hEnd      = monthOf(item.last_harvest);
  const clear     = monthOf(item.clear_date);
  const soilPrep  = monthOf(item.soil_prep_date);

  // Apply in priority order (highest priority last — overwrites lower-priority)
  let evt = null;

  if (soilPrep !== null && mi === soilPrep) evt = 'soil_prep';

  if (clear !== null && mi === clear) evt = 'uproot';

  if (hStart !== null && hEnd !== null && mi >= hStart && mi <= hEnd) evt = 'harvest';

  // Growing: from first_sprout (or day after transplant, or day after sow) to first_harvest
  const growStart = sprout ?? (trans !== null ? trans + 1 : null) ?? (sow !== null ? sow + 1 : null);
  if (growStart !== null && hStart !== null && mi >= growStart && mi < hStart) evt = 'growing';

  if (trans !== null && mi === trans) evt = 'transplant';

  // Start indoors: from sow to the month before transplant
  if (sow !== null && (trans !== null ? mi >= sow && mi < trans : mi === sow)) evt = 'indoors';

  return evt;
}

export default function PlantingTimeline({ schedule, units, plants }) {
  const [activeArea, setActiveArea] = useState(null);

  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <p className="font-medium">No planting schedule yet</p>
        <p className="text-sm mt-1">Get an AI plant plan to see your {new Date().getFullYear()} growing timeline</p>
      </div>
    );
  }

  const today = new Date();
  const todayMonth = today.getMonth();

  // Build plant emoji lookup
  const emojiByName = {};
  plants.forEach(p => { emojiByName[p.name] = p.emoji; });

  // Group units by area
  const areaOrder = [];
  const areaUnits = {};
  units.forEach(u => {
    const area = u.area_name || 'Garden';
    if (!areaUnits[area]) { areaUnits[area] = []; areaOrder.push(area); }
    areaUnits[area].push(u);
  });

  // Also collect area names from the schedule itself (in case units list differs)
  schedule.forEach(item => {
    const area = item.area_name || 'Garden';
    if (!areaUnits[area]) { areaUnits[area] = []; areaOrder.push(area); }
  });

  const areas = areaOrder.length > 0 ? areaOrder : ['Garden'];
  const currentArea = activeArea ?? areas[0];

  // Get units for this area
  const thisAreaUnits = areaUnits[currentArea] || [];

  // Get schedule items for this area, grouped by unit_id
  const scheduleForArea = schedule.filter(item =>
    (item.area_name || 'Garden') === currentArea ||
    thisAreaUnits.some(u => u.id === item.unit_id)
  );

  const byUnit = {};
  scheduleForArea.forEach(item => {
    if (!byUnit[item.unit_id]) byUnit[item.unit_id] = [];
    byUnit[item.unit_id].push(item);
  });

  // Units that have schedule data for this area
  const activeUnitIds = [...new Set(scheduleForArea.map(i => i.unit_id))];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {new Date().getFullYear()} growing calendar — dates are estimates, check your local last frost date.
      </p>

      {/* Area tabs */}
      {areas.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          {areas.map(area => (
            <button
              key={area}
              onClick={() => setActiveArea(area)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                area === currentArea
                  ? 'bg-garden-600 text-white border-garden-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-garden-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      {/* Timeline grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="border-collapse" style={{ minWidth: 680 }}>
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              {/* Plant label column */}
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2.5 text-xs font-bold text-gray-500 border-r border-gray-200 whitespace-nowrap min-w-36">
                Bed / Plant
              </th>
              {MONTHS.map((m, mi) => (
                <th
                  key={m}
                  className={`text-center py-2.5 text-xs font-semibold border-r border-gray-100 w-14 ${
                    mi === todayMonth ? 'text-red-500 bg-red-50' : 'text-gray-600'
                  }`}
                >
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeUnitIds.map((unitId, ui) => {
              const unit = units.find(u => u.id === unitId);
              const unitItems = byUnit[unitId] || [];
              const borderColor = TYPE_BORDER[unit?.type_id] || '#6b7280';

              return (
                <React.Fragment key={unitId}>
                  {/* Unit header row */}
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <td
                      colSpan={13}
                      className="px-3 py-1.5 text-xs font-bold text-gray-700"
                      style={{ borderLeft: `3px solid ${borderColor}` }}
                    >
                      {unit?.label || `Unit ${unitId}`}
                      {unit?.area_name && unit.area_name !== currentArea && (
                        <span className="ml-2 text-gray-400 font-normal">({unit.area_name})</span>
                      )}
                    </td>
                  </tr>

                  {/* Plant rows */}
                  {unitItems.map((item, ii) => {
                    const emoji = emojiByName[item.plant_name] || '🌱';
                    return (
                      <tr
                        key={`${unitId}-${ii}`}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 ${
                          ui > 0 || ii > 0 ? '' : ''
                        }`}
                      >
                        {/* Plant name cell */}
                        <td
                          className="sticky left-0 bg-white border-r border-gray-200 px-3 py-1.5"
                          style={{ borderLeft: `3px solid ${borderColor}` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base leading-none flex-shrink-0">{emoji}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate leading-tight">
                                {item.plant_name}
                              </div>
                              {item.notes && (
                                <div className="text-xs text-gray-400 truncate leading-tight mt-0.5">
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Month cells */}
                        {MONTHS.map((_, mi) => {
                          const evt = getMonthEvent(mi, item);
                          const cfg = evt ? EVENTS[evt] : null;
                          const isToday = mi === todayMonth;
                          return (
                            <td
                              key={mi}
                              className={`border-r border-gray-100 text-center align-middle p-0 ${
                                isToday && !evt ? 'bg-red-50/40' : ''
                              }`}
                              style={{
                                backgroundColor: cfg ? cfg.bg : undefined,
                              }}
                              title={cfg ? cfg.label : undefined}
                            >
                              {cfg && (
                                <span
                                  className="block text-center leading-tight px-0.5 py-1.5 text-xs font-medium whitespace-nowrap overflow-hidden"
                                  style={{ color: cfg.text, fontSize: '10px' }}
                                >
                                  {cfg.label}
                                </span>
                              )}
                              {/* Today marker when no event */}
                              {!cfg && isToday && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-px h-4 bg-red-400 opacity-60 mx-auto" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 px-1">
        {Object.entries(EVENTS).reverse().map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-6 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: cfg.bg }}
            />
            <span>{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-red-400 flex-shrink-0" />
          <span>Current month</span>
        </div>
      </div>
    </div>
  );
}
