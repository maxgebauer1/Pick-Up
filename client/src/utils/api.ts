// Dynamic API base URL that works for local dev, ngrok, web deploys, and the
// native iOS/Android (Capacitor) app.
export const getApiBaseUrl = () => {
  // 1. Explicit env var always wins. Set REACT_APP_API_URL to your deployed
  //    backend URL for production web AND for every native (iOS) build.
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // 2. Native app (Capacitor). The bundled web assets are served from
  //    capacitor://localhost, so window.location.hostname is "localhost" but
  //    there is NO backend on the device. It must talk to a remote server.
  //    Capacitor injects window.Capacitor at runtime — no import needed.
  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    // eslint-disable-next-line no-console
    console.error(
      'REACT_APP_API_URL is not set. The native app cannot reach a backend on ' +
        'localhost — set REACT_APP_API_URL to your deployed server before ' +
        'running `npm run build`. See IOS_SETUP.md.'
    );
    return 'http://localhost:5001';
  }

  const { protocol, hostname, origin } = window.location;

  // 3. Served over HTTPS (an ngrok tunnel, or any production deploy where the
  //    server also serves the built frontend): the API is on the same origin.
  if (protocol === 'https:') {
    return origin;
  }

  // 4. Local network IP over http (e.g. your phone on the same WiFi hitting the
  //    dev server): use the same IP for the API (backend runs on port 5001).
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:5001`;
  }

  // 5. Default to localhost for local development
  return 'http://localhost:5001';
};
