import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the Pick Up iOS app.
 *
 * Capacitor takes the compiled React web app (the `build/` folder) and runs it
 * inside a native iOS WebView, giving you a real, installable App Store app
 * without rewriting the UI in Swift.
 *
 * IMPORTANT: A native app has no "same origin" backend. The bundled web assets
 * are served from capacitor://localhost, so relative/localhost API calls will
 * fail. You MUST point the app at a deployed backend by setting REACT_APP_API_URL
 * before you run `npm run build` (see client/.env.example and IOS_SETUP.md).
 */
const config: CapacitorConfig = {
  appId: 'com.pickup.app',
  appName: 'Pick Up',
  webDir: 'build',
  ios: {
    // Adds safe-area insets so content clears the notch / status bar.
    contentInset: 'always',
  },
  server: {
    // --- LIVE RELOAD (optional, dev only) ---
    // To develop against your running React dev server (npm start) with hot
    // reload on a physical device or simulator, uncomment these two lines and
    // set url to your Mac's LAN IP. Comment them back out before a release build.
    //
    // url: 'http://192.168.1.10:3000',
    // cleartext: true,
  },
};

export default config;
