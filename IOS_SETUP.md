# Building Pick Up as an iOS App 🍏

This turns the existing React web app into a **real, installable iOS app** using
[Capacitor](https://capacitorjs.com). Capacitor wraps your compiled React build
(`client/build/`) inside a native iOS shell (a `WKWebView`), so you reuse 100% of
your existing UI code — no Swift, no React Native rewrite.

> **What's already done in this repo:** Capacitor dependencies, `capacitor.config.ts`,
> npm scripts, and the API-URL fix for native apps. What's left are the steps that
> *must* run on a Mac (generating and building the Xcode project).

---

## Why Capacitor (and not the alternatives)

| Option | Effort | Result |
|---|---|---|
| **Capacitor** ✅ | Low — reuses your React code | Real native app, App Store-ready |
| PWA "Add to Home Screen" | None | Works today, but not in the App Store, limited native APIs |
| React Native | High — full UI rewrite | Native, but you'd rebuild every screen |
| Native Swift | Very high — full rewrite | Native, most work |

Since you already have a polished React app, Capacitor is the clear choice.

---

## Prerequisites (Mac only)

Apple requires a Mac to build iOS apps. You need:

1. **macOS** with **[Xcode](https://apps.apple.com/app/xcode/id497799835)** (free, from the Mac App Store).
2. **Xcode Command Line Tools:** `xcode-select --install`
3. **CocoaPods** (native dependency manager): `sudo gem install cocoapods`
4. **Node.js 18+** and this repo cloned locally.
5. For installing on your own iPhone: a **free Apple ID**. For the App Store: a paid
   **[Apple Developer account](https://developer.apple.com/programs/)** ($99/year).

No Mac? See **"No Mac?"** at the bottom.

---

## Step-by-step

### 1. Install dependencies
```bash
cd client
npm install
```

### 2. Point the app at your backend ⚠️ (most important step)
A phone has no `localhost:5001`. The app **must** call a backend that's deployed on
the internet. Create `client/.env`:

```bash
cp .env.example .env
```
Edit `.env` and set your deployed backend URL (see `BACKEND_GUIDE.md` for how to deploy it):
```env
REACT_APP_API_URL=https://your-backend-url.com
```
If you skip this, the app builds but every login/game request fails silently.

### 3. Build the web app
```bash
npm run build
```
This creates `client/build/`, which Capacitor bundles into the app.

### 4. Add the native iOS project (run once, on your Mac)
```bash
npx cap add ios
```
This generates a `client/ios/` folder containing a native Xcode project.

### 5. Sync your build into the iOS project
Run this **every time** you change the web code and rebuild:
```bash
npm run cap:sync
```
(That's shorthand for `npm run build && npx cap sync ios`.)

### 6. Open in Xcode
```bash
npm run cap:open
```
Or all-in-one (build + sync + open): `npm run ios`

### 7. Run it
In Xcode:
1. Select a **simulator** (e.g. "iPhone 15") or plug in your iPhone.
2. Click the ▶︎ **Run** button.
3. To run on a **physical iPhone**: select your device, then in
   **Signing & Capabilities** pick your Apple ID under "Team". Xcode handles the
   provisioning profile. On the phone, trust the developer under
   *Settings → General → VPN & Device Management*.

---

## App icon & splash screen

Replace the placeholder art with your own:
```bash
npm install --save-dev @capacitor/assets
# Put a 1024x1024 icon.png and a 2732x2732 splash.png in client/assets/
npx capacitor-assets generate --ios
```
This generates every required icon/splash size into the iOS project automatically.

---

## Native permissions you'll likely need

Pick Up uses **location** (finding nearby games). iOS requires a usage string or the
app crashes when it asks for location. In Xcode, open `ios/App/App/Info.plist` and add:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Pick Up uses your location to find pickup games near you.</string>
```
For live-updating chat over `http://` during local testing, you'd also need an
App Transport Security exception — but if your backend is **HTTPS** (recommended,
and automatic on Render/Railway/Vercel), you don't need this.

---

## Shipping to the App Store (when ready)

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/yr).
2. In [App Store Connect](https://appstoreconnect.apple.com), create an app record
   with the bundle ID `com.pickup.app` (matches `capacitor.config.ts`).
3. In Xcode: **Product → Archive**, then **Distribute App → App Store Connect**.
4. Fill in screenshots, description, and privacy details, then submit for review.

---

## Everyday workflow cheat sheet

```bash
# after editing React code:
cd client
npm run cap:sync      # rebuild web + copy into iOS project
npm run cap:open      # open Xcode, press Run

# or one shot:
npm run ios
```

---

## The `ios/` folder and git

`npx cap add ios` creates `client/ios/`. It's a normal Xcode project. Committing it
is fine and lets teammates build without regenerating it. If you'd rather keep the
repo lean, add `client/ios/` to `.gitignore` and let each developer run
`npx cap add ios` themselves. Either is valid — committing it is friendlier for a
solo project.

---

## No Mac?

- **Cloud Mac:** [MacinCloud](https://www.macincloud.com) or
  [MacStadium](https://www.macstadium.com) rent macOS by the hour/month.
- **Ionic Appflow** or **Codemagic / EAS-style CI** can build iOS in the cloud from
  your Capacitor project without you owning a Mac (still needs an Apple Developer
  account to sign).
- **Meanwhile:** the app ships a web manifest, so on an iPhone you can open the
  deployed site in Safari → Share → *Add to Home Screen* for a home-screen icon and
  full-screen, app-like launch today. (Note: CRA doesn't register a service worker by
  default, so there's no true offline mode yet — that's a separate add-on.)

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank white screen in the app | You forgot `npm run build` before `cap sync`, or `webDir` is wrong (should be `build`). |
| Login/games do nothing | `REACT_APP_API_URL` not set, or backend not reachable over HTTPS. |
| `pod install` fails | Run `sudo gem install cocoapods`, then `cd ios/App && pod install`. |
| App crashes asking for location | Add `NSLocationWhenInUseUsageDescription` to `Info.plist`. |
| Changes not showing | You didn't re-run `npm run cap:sync` after editing React code. |
