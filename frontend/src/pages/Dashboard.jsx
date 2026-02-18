import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

const GARDEN_TYPE_ICONS = {
  in_ground: '🌍',
  raised_bed: '📦',
  container: '🪴',
  vertical: '🏗️',
  hugelkultur: '🌋',
  straw_bale: '🌾',
  greenhouse: '🏠',
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/gardens')
      .then(({ data }) => setGardens(data.gardens))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const deleteGarden = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this garden?')) return;
    await api.delete(`/gardens/${id}`);
    setGardens(g => g.filter(x => x.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user?.username} 👋
          </h1>
          <p className="text-gray-600 mt-1">Your gardens are looking great.</p>
        </div>
        <Link to="/garden/new" className="btn-primary">
          + New Garden
        </Link>
      </div>

      {/* Gardens grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">🌱</div>
            <p>Loading your gardens...</p>
          </div>
        </div>
      ) : gardens.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🪴</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No gardens yet</h2>
          <p className="text-gray-500 mb-6">Create your first garden to get started planning.</p>
          <Link to="/garden/new" className="btn-primary">
            Create your first garden
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gardens.map((garden) => (
            <div
              key={garden.id}
              onClick={() => navigate(`/garden/${garden.id}`)}
              className="card p-5 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group"
            >
              {/* Photo or type icon */}
              <div className="h-32 rounded-lg bg-garden-50 flex items-center justify-center mb-4 overflow-hidden">
                {garden.photo_path ? (
                  <img
                    src={garden.photo_path}
                    alt={garden.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-5xl">
                    {GARDEN_TYPE_ICONS[garden.garden_type] || '🌱'}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{garden.name}</h3>
                  <p className="text-sm text-gray-500 capitalize mt-0.5">
                    {garden.garden_type?.replace('_', ' ')}
                    {garden.width_ft && garden.length_ft &&
                      ` · ${garden.width_ft}×${garden.length_ft} ft`}
                  </p>
                  {garden.hardiness_zone && (
                    <p className="text-xs text-garden-700 mt-1 font-medium">
                      Zone {garden.hardiness_zone}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => deleteGarden(garden.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all ml-2 text-sm"
                  title="Delete garden"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>🌿 {garden.plant_count || 0} plants</span>
                {garden.location_city && (
                  <span>📍 {garden.location_city}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
