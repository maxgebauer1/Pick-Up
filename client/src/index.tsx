import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker for offline PWA support — web only. The native
// iOS/Android app bundles its own assets, so a service worker is unnecessary
// there (and unsupported under the capacitor:// scheme).
const isNative = (window as any).Capacitor?.isNativePlatform?.();
if (!isNative) {
  serviceWorker.register();
} 