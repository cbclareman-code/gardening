import React from 'react';

const SUN_ICONS = { full_sun: '☀️', part_shade: '⛅', shade: '🌥️' };
const WATER_ICONS = { low: '💧', moderate: '💧💧', high: '💧💧💧' };

export default function PlantCard({ plant, selected, onToggle, compact = false, isCustom = false }) {
  if (compact) {
    return (
      <div
        onClick={() => onToggle?.(plant)}
        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
          selected
            ? 'border-garden-500 bg-garden-50'
            : 'border-gray-200 hover:border-garden-300 hover:bg-gray-50'
        }`}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: plant.color + '30' }}
        >
          {plant.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{plant.name}</div>
          <div className="text-xs text-gray-500 capitalize">{plant.category}</div>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-garden-500 bg-garden-500' : 'border-gray-300'
        }`}>
          {selected && <span className="text-white text-xs">✓</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onToggle?.(plant)}
      className={`card p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'ring-2 ring-garden-500 ring-offset-1' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: plant.color + '25' }}
        >
          {plant.emoji}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCustom && (
            <div className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
              custom
            </div>
          )}
          {selected && (
            <div className="bg-garden-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              Added ✓
            </div>
          )}
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-0.5">{plant.name}</h3>
      <p className="text-xs text-gray-500 italic mb-2">{plant.scientific_name}</p>
      <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{plant.description}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center mb-3">
        <div className="bg-gray-50 rounded-lg p-1.5">
          <div className="text-sm">{SUN_ICONS[plant.sun_requirement] || '☀️'}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-none">
            {plant.sun_requirement?.replace('_', ' ')}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-1.5">
          <div className="text-xs font-semibold text-gray-700">{plant.days_to_maturity}d</div>
          <div className="text-xs text-gray-500 mt-0.5">to harvest</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-1.5">
          <div className="text-xs font-semibold text-gray-700">{plant.spacing_inches}"</div>
          <div className="text-xs text-gray-500 mt-0.5">spacing</div>
        </div>
      </div>

      {/* Companions */}
      {plant.companions && (
        <div className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1 truncate">
          🤝 Likes: {plant.companions.split(',').map(s => s.trim()).join(', ')}
        </div>
      )}

      {/* Zone badge */}
      <div className="flex gap-1 mt-2 flex-wrap">
        <span className="bg-garden-100 text-garden-800 text-xs px-2 py-0.5 rounded-full">
          Zones {plant.min_zone}–{plant.max_zone}
        </span>
        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full capitalize">
          {plant.category}
        </span>
      </div>
    </div>
  );
}
