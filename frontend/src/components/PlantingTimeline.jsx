import React from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_W = 72;   // px per month column
const ROW_H   = 38;   // px per plant row
const LABEL_W = 156;  // px for left label column

const TYPE_BORDER = {
  raised_bed: '#d97706', in_ground: '#16a34a', container: '#2563eb',
  vertical: '#9333ea', hugelkultur: '#db2777', straw_bale: '#ea580c', greenhouse: '#15803d',
};

function dateToFrac(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d)) return null;
  return d.getMonth() + d.getDate() / 31; // 0–12 fractional month
}

export default function PlantingTimeline({ schedule, units, plants }) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📅</div>
        <p className="font-medium">No planting schedule yet</p>
        <p className="text-sm mt-1">Get an AI plant plan to see your 2026 growing timeline</p>
      </div>
    );
  }

  const today = new Date();
  const todayFrac = today.getMonth() + today.getDate() / 31;

  // Build plant emoji lookup
  const emojiByName = {};
  plants.forEach(p => { emojiByName[p.name] = p.emoji; });

  // Group schedule entries by unit_id
  const byUnit = {};
  schedule.forEach(item => {
    const uid = item.unit_id;
    if (!byUnit[uid]) byUnit[uid] = [];
    byUnit[uid].push(item);
  });

  // Only render units that have schedule entries
  const activeUnits = units.filter(u => byUnit[u.id]?.length > 0);

  const totalW = LABEL_W + MONTH_W * 12;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Week-by-week 2026 growing schedule based on your hardiness zone.
        Dates are estimates — check your local last frost date.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div style={{ minWidth: totalW }}>

          {/* Month header row */}
          <div className="flex border-b-2 border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div
              className="flex-shrink-0 px-3 py-2.5 text-xs font-bold text-gray-500 border-r border-gray-200"
              style={{ width: LABEL_W, minWidth: LABEL_W }}
            >
              Bed / Plant
            </div>
            {MONTHS.map((m, mi) => {
              const isCurrentMonth = mi === today.getMonth();
              return (
                <div
                  key={m}
                  className={`flex-shrink-0 text-center py-2.5 text-xs font-semibold border-r border-gray-100 ${
                    isCurrentMonth ? 'text-red-500 bg-red-50' : 'text-gray-600'
                  }`}
                  style={{ width: MONTH_W, minWidth: MONTH_W }}
                >
                  {m}
                </div>
              );
            })}
          </div>

          {/* One section per unit */}
          {activeUnits.map((unit, ui) => {
            const items = byUnit[unit.id] || [];
            const borderColor = TYPE_BORDER[unit.type_id] || '#6b7280';

            return (
              <div key={unit.id} className={ui > 0 ? 'border-t border-gray-100' : ''}>
                {/* Unit label row */}
                <div className="flex items-center bg-gray-50/70 border-b border-gray-100">
                  <div
                    className="flex-shrink-0 px-3 py-1.5 border-r border-gray-200 flex items-center gap-2"
                    style={{ width: LABEL_W, minWidth: LABEL_W, borderLeft: `3px solid ${borderColor}` }}
                  >
                    <span className="text-xs font-bold text-gray-700 truncate">{unit.label}</span>
                    {unit.area_name && unit.area_name !== 'Garden' && (
                      <span className="text-xs text-gray-400 truncate">({unit.area_name})</span>
                    )}
                  </div>
                  {/* Today line across full width */}
                  <div className="flex-1 relative" style={{ height: 20 }}>
                    <TodayLine frac={todayFrac} />
                  </div>
                </div>

                {/* Plant rows */}
                {items.map((item, i) => {
                  const sowFrac        = dateToFrac(item.sow_indoors);
                  const transplantFrac = dateToFrac(item.transplant_outdoors);
                  const harvestStart   = dateToFrac(item.first_harvest);
                  const harvestEnd     = dateToFrac(item.last_harvest);
                  const growStart      = transplantFrac ?? sowFrac;
                  const emoji          = emojiByName[item.plant_name] || '🌱';

                  return (
                    <div
                      key={i}
                      className={`flex items-center ${i < items.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50`}
                      style={{ height: ROW_H }}
                    >
                      {/* Plant label */}
                      <div
                        className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-gray-200"
                        style={{ width: LABEL_W, minWidth: LABEL_W, height: '100%' }}
                      >
                        <span className="text-base leading-none">{emoji}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-700 truncate">{item.plant_name}</div>
                          {item.notes && (
                            <div className="text-xs text-gray-400 truncate">{item.notes}</div>
                          )}
                        </div>
                      </div>

                      {/* Timeline track */}
                      <div className="flex-1 relative" style={{ height: '100%' }}>
                        {/* Month grid lines */}
                        {MONTHS.map((_, mi) => (
                          <div
                            key={mi}
                            className="absolute inset-y-0 border-r border-gray-100 pointer-events-none"
                            style={{ left: `${(mi + 1) / 12 * 100}%` }}
                          />
                        ))}

                        {/* Today line */}
                        <TodayLine frac={todayFrac} />

                        {/* Indoor sow → transplant bar (purple) */}
                        {sowFrac != null && (transplantFrac ?? harvestStart) != null && (
                          <Bar
                            start={sowFrac}
                            end={transplantFrac ?? harvestStart}
                            color="#818cf8"
                            label="🏠 Indoors"
                            roundLeft
                          />
                        )}

                        {/* Transplant → first harvest bar (green) */}
                        {growStart != null && harvestStart != null && (
                          <Bar
                            start={growStart}
                            end={harvestStart}
                            color="#4ade80"
                            label="🌱 Growing"
                          />
                        )}

                        {/* Harvest window bar (orange) */}
                        {harvestStart != null && harvestEnd != null && (
                          <Bar
                            start={harvestStart}
                            end={harvestEnd}
                            color="#fb923c"
                            label="🌾 Harvest"
                            roundRight
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-5 text-xs text-gray-600 px-1">
        {[
          { color: '#818cf8', label: 'Start indoors' },
          { color: '#4ade80', label: 'Growing outdoors' },
          { color: '#fb923c', label: 'Harvest window' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-px h-4 bg-red-400" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}

function Bar({ start, end, color, label, roundLeft, roundRight }) {
  if (start == null || end == null || end <= start) return null;
  const left  = `${start / 12 * 100}%`;
  const width = `${(end - start) / 12 * 100}%`;
  const radius = `${roundLeft ? '6px' : '0'} ${roundRight ? '6px' : '0'} ${roundRight ? '6px' : '0'} ${roundLeft ? '6px' : '0'}`;

  return (
    <div
      className="absolute top-2 bottom-2 flex items-center px-1.5 overflow-hidden"
      style={{ left, width, backgroundColor: color, borderRadius: radius }}
      title={label}
    >
      <span className="text-white text-xs font-medium whitespace-nowrap select-none">{label}</span>
    </div>
  );
}

function TodayLine({ frac }) {
  return (
    <div
      className="absolute inset-y-0 w-px bg-red-400 z-10 pointer-events-none"
      style={{ left: `${frac / 12 * 100}%`, opacity: 0.6 }}
    />
  );
}
