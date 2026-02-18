import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GardenWizard from './pages/GardenWizard';
import GardenView from './pages/GardenView';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuthStore();
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/garden/new" element={<PrivateRoute><GardenWizard /></PrivateRoute>} />
        <Route path="/garden/:id" element={<PrivateRoute><GardenView /></PrivateRoute>} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </div>
  );
}
