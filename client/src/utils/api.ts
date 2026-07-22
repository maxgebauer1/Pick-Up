// Dynamic API base URL that works both locally and via ngrok
export const getApiBaseUrl = () => {
  // Check for environment variable first (for production deployments)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // If accessing via ngrok (ngrok-free.app domain), use the same domain for API
  if (hostname.includes('ngrok-free.app')) {
    return `https://${hostname}`;
  }
  
  // If accessing via local network IP, use the same IP for API (backend is on port 5001)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:5001`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5001';
}; 