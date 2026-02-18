import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import NLIChat from '../components/NLIChat';

export default function Welcome() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-garden-50 via-white to-emerald-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-garden-700 text-xl">
          <span className="text-3xl">🌱</span>
          <span>ChatGRD</span>
        </div>
        <div className="flex gap-3 items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:block">Hi, {user.username} 👋</span>
              <Link to="/dashboard" className="btn-primary text-sm py-1.5 px-3">My Gardens</Link>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1.5 px-3">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-3">Get started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-6xl mb-6">🌻🥕🍅</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Plan your perfect garden<br />
          <span className="text-garden-600">in minutes</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-lg mb-8">
          ChatGRD makes garden planning easy and visual. Pick your plants, get zone-smart recommendations,
          and chat with AI to build your ideal garden layout.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          {user ? (
            <>
              <Link
                to="/garden/new"
                className="btn-primary text-base py-3 px-8 rounded-xl"
              >
                + New Garden (Wizard)
              </Link>
              <button
                onClick={() => setChatOpen(true)}
                className="btn-secondary text-base py-3 px-8 rounded-xl"
              >
                💬 Chat with AI (NLI)
              </button>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="btn-primary text-base py-3 px-8 rounded-xl"
              >
                Start with the Wizard
              </Link>
              <Link
                to="/register"
                className="btn-secondary text-base py-3 px-8 rounded-xl"
              >
                Use Chat (NLI)
              </Link>
            </>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          {[
            { emoji: '📍', title: 'Zone-smart', desc: 'Get plant recommendations tailored to your hardiness zone and climate.' },
            { emoji: '🗺️', title: 'Visual layouts', desc: 'See your garden plan come to life with a clear visual layout.' },
            { emoji: '💬', title: 'AI chat', desc: '"Add strawberries" — just type it and your plan updates instantly.' },
          ].map((f) => (
            <div key={f.title} className="card p-5 text-left">
              <div className="text-3xl mb-2">{f.emoji}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-400">
        Built for new and suburban gardeners everywhere 🌍
      </footer>

      {/* NLI Chat (only shown when logged in) */}
      {user && (
        <NLIChat
          gardenId={null}
          onGardenUpdate={null}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(prev => !prev)}
        />
      )}
    </div>
  );
}
