import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 90000,
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
  // Sub-zone strings (e.g. '7a') are used where the USDA map gives a clear
  // dominant sub-zone for the state. Integers are used where the state spans
  // multiple sub-zones and a single representative value is the best we can do
  // without a ZIP code. Users can always override the field manually.
  const stateZones = {
    AK: 1,   MN: '4b', ND: '3b', SD: '4b', ME: '5a', WI: '5a', VT: '5a', NH: '5b',
    MT: '4b', ID: '6a', WY: '4b', MI: '5b', NY: '6a', MA: '6b', CT: '7a', RI: '6b',
    OR: '8b', WA: '8b', CO: '5b', NE: '5b', IA: '5b', PA: '6a', NJ: '7a', OH: '5b',
    IN: '6a', IL: '5b', MO: '6a', KY: '6b', VA: '7a', MD: '7a', DE: '7a', WV: '6a',
    CA: '9b', NV: '7a', UT: '6b', KS: '6a', OK: '7a', AR: '7b', TN: '7a', NC: '7b',
    SC: '8a', GA: '8a', AL: '8a', MS: '8a', TX: '8b', NM: '7a', AZ: '9b', LA: '9a',
    FL: '10a', HI: '12a', DC: '7a',
  };
  const abbr = state?.toUpperCase().substring(0, 2);
  return stateZones[abbr] || 6; // Default to zone 6
}

export function getZoneLabel(zone) {
  const descriptions = {
    1: 'Subarctic', 2: 'Very Cold', 3: 'Cold',
    4: 'Cold-Temperate', 5: 'Temperate', 6: 'Mild-Temperate',
    7: 'Warm-Temperate', 8: 'Warm', 9: 'Hot',
    10: 'Tropical', 11: 'Tropical', 12: 'Tropical', 13: 'Tropical'
  };
  const zoneStr = String(zone);
  const num = parseInt(zoneStr);
  const sub = zoneStr.match(/[ab]$/)?.[0] || '';
  const desc = descriptions[num];
  return desc ? `Zone ${num}${sub} (${desc})` : `Zone ${zone}`;
}
