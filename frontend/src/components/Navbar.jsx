import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-garden-700 text-lg">
          <span className="text-2xl">🌱</span>
          <span>ChatGRD</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/garden/new"
            className="btn-primary text-sm py-1.5 px-3"
          >
            + New Garden
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
