const BRIDGE_CONFIG = {
  BASE_URL: import.meta.env.VITE_BRIDGE_BASE_URL || 'http://localhost:7999',
  TOKEN: import.meta.env.VITE_BRIDGE_TOKEN || 'K7P9M2X5R8T4W6N1ABCD123',
  TIMEOUT: 60000
};

export default BRIDGE_CONFIG;
export { BRIDGE_CONFIG };

