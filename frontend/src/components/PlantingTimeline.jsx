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

const ICS_LABELS = {
  sow_indoors:         '🪴 Start indoors',
  transplant_outdoors: '🌿 Transplant outdoors',
  first_harvest:       '🧺 Begin harvesting',
  clear_date:          '🫧 Clear bed',
  soil_prep_date:      '🪱 Prep soil',
};

function buildICS(schedule, units) {
  const icsDate = str => str.replace(/-/g, '');
  const nextDay = str => {
    const d = new Date(str + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  };

  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Garden Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  ];

  schedule.forEach(item => {
    Object.entries(ICS_LABELS).forEach(([key, label]) => {
      if (!item[key]) return;
      const bed = units.find(u => u.id === item.unit_id)?.label || item.area_name || 'Garden';
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.plant_name}-${key}-${item[key]}-${item.unit_id}@gardenplanner`,
        `DTSTART;VALUE=DATE:${icsDate(item[key])}`,
        `DTEND;VALUE=DATE:${nextDay(item[key])}`,
        `SUMMARY:${label}: ${item.plant_name} (${bed})`,
        `DESCRIPTION:${bed}${item.notes ? ' — ' + item.notes.replace(/,/g, '\\,') : ''}`,
        'END:VEVENT',
      );
    });
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export default function PlantingTimeline({ schedule, units, plants }) {
  const [activeArea, setActiveArea] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);
  const [calendarDone, setCalendarDone] = useState(false);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [checkedSupplies, setCheckedSupplies] = useState(new Set());

  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <p className="font-medium">No planting schedule yet</p>
        <p className="text-sm mt-1">Get an AI plant plan to see your {new Date().getFullYear()} growing calendar</p>
      </div>
    );
  }

  const today = new Date();
  const todayMonth = today.getMonth();

  // Build plant emoji lookup
  const emojiByName = {};
  plants.forEach(p => { emojiByName[p.name] = p.emoji; });

  // Compute "this week" tasks (today through next 7 days)
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const TASK_TYPES = [
    { key: 'sow_indoors',         label: 'Start indoors',    icon: '🪴' },
    { key: 'transplant_outdoors', label: 'Transplant out',   icon: '🌿' },
    { key: 'first_harvest',       label: 'Begin harvesting', icon: '🧺' },
    { key: 'clear_date',          label: 'Clear bed',        icon: '🫧' },
    { key: 'soil_prep_date',      label: 'Prep soil',        icon: '🪱' },
  ];

  const thisWeekTasks = [];
  schedule.forEach(item => {
    TASK_TYPES.forEach(({ key, label, icon }) => {
      if (!item[key]) return;
      const d = new Date(item[key] + 'T12:00:00');
      if (d >= today && d <= weekEnd) {
        const unit = units.find(u => u.id === item.unit_id);
        thisWeekTasks.push({ date: d, label, icon, plant: item.plant_name, unitLabel: unit?.label || item.area_name || 'Garden', areaName: unit?.area_name || item.area_name || 'Garden' });
      }
    });
  });
  thisWeekTasks.sort((a, b) => a.date - b.date);

  const fmtDate = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Group this-week tasks by date then by unit (for new layout)
  const tasksByDate = {};
  thisWeekTasks.forEach(task => {
    const ds = fmtDate(task.date);
    if (!tasksByDate[ds]) tasksByDate[ds] = {};
    if (!tasksByDate[ds][task.unitLabel]) tasksByDate[ds][task.unitLabel] = [];
    tasksByDate[ds][task.unitLabel].push(task);
  });

  // Contextual supplies checklist
  const hasIndoorSowing  = schedule.some(i => i.sow_indoors);
  const hasVertical      = units.some(u => u.type_id === 'vertical');
  const coldMonths       = [0, 1, 2, 3, 9, 10, 11];
  const hasColdTransplant = schedule.some(i => {
    if (!i.transplant_outdoors) return false;
    return coldMonths.includes(monthOf(i.transplant_outdoors));
  });
  const hasBeds = units.some(u => ['raised_bed', 'in_ground', 'hugelkultur'].includes(u.type_id));

  const supplies = [
    ...(hasIndoorSowing ? [
      { icon: '🌱', item: 'Seed trays or cell packs',   why: 'For starting seeds indoors before transplanting out' },
      { icon: '🪨', item: 'Seed-starting mix',           why: 'Lighter than potting soil — better germination rates' },
      { icon: '🌡️', item: 'Heat mat',                    why: 'Speeds up germination for tomatoes, peppers, and basil' },
    ] : []),
    ...(hasVertical ? [
      { icon: '🪵', item: 'Trellis or stakes',           why: 'Your vertical bed needs a support structure' },
    ] : []),
    ...(hasColdTransplant ? [
      { icon: '🧊', item: 'Row cover / frost cloth',     why: 'Protects early transplants if frost threatens' },
    ] : []),
    ...(hasBeds ? [
      { icon: '🥄', item: 'Trowel',                      why: 'Essential for transplanting and spot digging' },
      { icon: '📏', item: 'Spacing ruler or dibber',     why: 'Helps you plant at the right distance every time' },
    ] : []),
    { icon: '🪣', item: 'Mulch',                         why: 'Retains moisture and suppresses weeds — universally useful' },
    { icon: '🧺', item: 'Harvest basket',                why: 'You\'ll have plenty to bring in once things get going' },
    { icon: '✂️', item: 'Garden scissors or snips',      why: 'For herbs, leafy greens, and deadheading' },
  ];

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

  // Units that have schedule data — filtered by active unit if one is selected
  let activeUnitIds = [...new Set(scheduleForArea.map(i => i.unit_id))];
  if (activeUnit !== null) activeUnitIds = activeUnitIds.filter(id => id === activeUnit);

  const showAreaTabs = areas.length > 1;
  const showUnitTabs = thisAreaUnits.length > 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        {new Date().getFullYear()} growing calendar — dates are estimates, check your local last frost date.
      </p>

      {/* This week panel */}
      {thisWeekTasks.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span className="text-sm font-semibold text-amber-900">Coming up this week</span>
          </div>
          {Object.entries(tasksByDate).map(([dateStr, unitMap]) => (
            <div key={dateStr} className="flex gap-4 items-start">
              <div className="w-24 flex-shrink-0 pt-0.5">
                <span className="text-xs font-semibold text-amber-800">{dateStr}</span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 flex-1">
                {Object.entries(unitMap).map(([unitLabel, tasks]) => (
                  <div key={unitLabel} className="space-y-1 min-w-0">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{unitLabel}</div>
                    {tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-gray-700">
                        <span className="text-base leading-none flex-shrink-0">{task.icon}</span>
                        <span>{task.label} <span className="font-medium">{task.plant}</span></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Two-level filter: area row then unit row */}
      {(showAreaTabs || showUnitTabs) && (
        <div className="space-y-2">
          {/* Row 1: Area tabs */}
          {showAreaTabs && (
            <div className="flex gap-1 flex-wrap">
              {areas.map(area => (
                <button
                  key={area}
                  onClick={() => { setActiveArea(area); setActiveUnit(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
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

          {/* Row 2: Unit tabs */}
          {showUnitTabs && (
            <div className={`flex gap-1 flex-wrap ${showAreaTabs ? 'pl-3 border-l-2 border-garden-100' : ''}`}>
              <button
                onClick={() => setActiveUnit(null)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all border ${
                  activeUnit === null
                    ? 'bg-garden-100 text-garden-700 border-garden-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-garden-200'
                }`}
              >
                All beds
              </button>
              {thisAreaUnits.map(u => (
                <button
                  key={u.id}
                  onClick={() => setActiveUnit(u.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all border ${
                    activeUnit === u.id
                      ? 'bg-garden-100 text-garden-700 border-garden-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-garden-200'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline + persistent legend side by side */}
      <div className="flex gap-3 items-start">
        {/* Timeline grid */}
        <div className="overflow-x-auto flex-1 rounded-xl border border-gray-200 bg-white">
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
                          className="border-b border-gray-50 hover:bg-gray-50/50"
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
                              </div>
                            </div>
                          </td>

                          {/* Month cells — pure color bars, no text (use legend + tooltip) */}
                          {MONTHS.map((m, mi) => {
                            const evt = getMonthEvent(mi, item);
                            const cfg = evt ? EVENTS[evt] : null;
                            const isToday = mi === todayMonth;
                            const prevEvt = mi > 0 ? getMonthEvent(mi - 1, item) : null;
                            const nextEvt = mi < 11 ? getMonthEvent(mi + 1, item) : null;
                            const isFirst = evt && evt !== prevEvt;
                            const isLast  = evt && evt !== nextEvt;
                            return (
                              <td
                                key={mi}
                                className={`relative border-r border-gray-100 p-0 h-8 ${
                                  isToday && !evt ? 'bg-red-50/40' : ''
                                }`}
                                style={{ backgroundColor: cfg ? cfg.bg : undefined }}
                                title={cfg ? `${item.plant_name} — ${cfg.label} (${m})` : `${item.plant_name} (${m})`}
                              >
                                {/* Round the leading and trailing edge of each activity segment */}
                                {cfg && isFirst && (
                                  <div className="absolute left-0 inset-y-1 w-1.5 rounded-l-full"
                                    style={{ backgroundColor: cfg.bg, filter: 'brightness(0.85)' }} />
                                )}
                                {cfg && isLast && (
                                  <div className="absolute right-0 inset-y-1 w-1.5 rounded-r-full"
                                    style={{ backgroundColor: cfg.bg, filter: 'brightness(0.85)' }} />
                                )}
                                {/* Today marker line */}
                                {isToday && (
                                  <div className="absolute inset-0 flex items-stretch pointer-events-none z-10">
                                    <div className="w-0.5 bg-red-400 opacity-80 mx-auto" />
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

        {/* Persistent legend — sits to the right of the scrollable table, below the CTA panel */}
        <div className="flex-shrink-0 rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2 text-xs text-gray-600 self-stretch">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Key</div>
          {Object.entries(EVENTS).reverse().map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: cfg.bg }} />
              <span className="whitespace-nowrap">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-px h-4 bg-red-400 flex-shrink-0 mx-1.5" />
            <span className="whitespace-nowrap">This month</span>
          </div>
        </div>
      </div>

      {/* Next steps CTAs */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Next steps</p>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Primary: calendar download */}
          <button
            onClick={() => {
              const blob = new Blob([buildICS(schedule, units)], { type: 'text/calendar;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'garden-plan.ics'; a.click();
              URL.revokeObjectURL(url);
              setCalendarDone(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              calendarDone
                ? 'bg-white text-garden-700 border-garden-300'
                : 'bg-garden-600 text-white border-garden-600 hover:bg-garden-700'
            }`}
          >
            <span>{calendarDone ? '✓' : '📅'}</span>
            <span>{calendarDone ? 'Calendar downloaded' : 'Add to calendar'}</span>
          </button>

          {/* Secondary → Primary after calendar done */}
          <button
            onClick={() => setSuppliesOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              calendarDone
                ? 'bg-garden-600 text-white border-garden-600 hover:bg-garden-700'
                : 'bg-white text-gray-600 border-gray-200 hover:border-garden-300'
            }`}
          >
            <span>🛒</span>
            <span>{suppliesOpen ? 'Hide checklist' : 'What to buy'}</span>
          </button>

          {calendarDone && !suppliesOpen && (
            <span className="text-xs text-gray-400">Open the downloaded file to import into Google Calendar, Apple Calendar, or Outlook.</span>
          )}
        </div>

        {/* Supplies checklist — expands when button is clicked */}
        {suppliesOpen && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            <p className="text-xs text-gray-500 mb-3">Based on your specific plan:</p>
            {supplies.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg leading-none flex-shrink-0 mt-0.5">{s.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-800">{s.item}</span>
                  <span className="text-xs text-gray-500 ml-2">{s.why}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
