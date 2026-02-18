import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 by clearing auth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Zone lookup helper
export function getZoneFromCity(city, state) {
  // Basic US zone lookup by state — for a real app, use a ZIP/geolocation API
  const stateZones = {
    AK: 1, MN: 4, ND: 3, SD: 4, ME: 4, WI: 4, VT: 4, NH: 5,
    MT: 4, ID: 5, WY: 4, MI: 5, NY: 5, MA: 6, CT: 6, RI: 6,
    OR: 7, WA: 7, CO: 5, NE: 5, IA: 5, PA: 6, NJ: 6, OH: 5,
    IN: 5, IL: 5, MO: 6, KY: 6, VA: 6, MD: 7, DE: 7, WV: 6,
    CA: 9, NV: 7, UT: 6, KS: 6, OK: 7, AR: 7, TN: 6, NC: 7,
    SC: 8, GA: 8, AL: 8, MS: 8, TX: 8, NM: 7, AZ: 9, LA: 9,
    FL: 10, HI: 12, DC: 7,
  };
  const abbr = state?.toUpperCase().substring(0, 2);
  return stateZones[abbr] || 6; // Default to zone 6
}

export function getZoneLabel(zone) {
  const labels = {
    1: '1 (Subarctic)', 2: '2 (Very Cold)', 3: '3 (Cold)',
    4: '4 (Cold-Temperate)', 5: '5 (Temperate)', 6: '6 (Mild-Temperate)',
    7: '7 (Warm-Temperate)', 8: '8 (Warm)', 9: '9 (Hot)',
    10: '10 (Tropical)', 11: '11 (Tropical)', 12: '12 (Tropical)', 13: '13 (Tropical)'
  };
  return labels[zone] || `Zone ${zone}`;
}
