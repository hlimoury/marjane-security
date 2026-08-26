# Marjane Admin Dashboard — iOS App

Native iPhone app that loads the existing web admin dashboard in a full-screen browser view. Log in with an authorized account to use the same dashboard as on the website.

## Current URLs

- Frontend: `https://marjane-security-1.onrender.com`
- Backend: `https://marjane-security.onrender.com`

The iOS app is already configured to open the frontend URL above. The deployed frontend must be built with `VITE_API_URL=https://marjane-security.onrender.com`.

---

## Step 1 — Confirm your website URL

Open `MarjaneAdmin/AppConfig.swift` and confirm this value:

```swift
static let webAppURL = "https://marjane-security-1.onrender.com"
```

The app opens `#/login`; after admin login it goes to the dashboard.

---

## Build WITHOUT a Mac (GitHub Actions + Sideloadly) — recommended for you

You have a Windows PC + iPhone and a free Apple ID. This path builds the app in
GitHub's free macOS cloud, then you install it with Sideloadly.

### A) Build the unsigned IPA in the cloud

A workflow already exists at `.github/workflows/build-ios.yml`.

1. Commit and push this project to GitHub (repo `hlimoury/marjane-security`):

```powershell
cd "C:\Users\hlimo\Downloads\project marjane react"
git add ios-app .github
git commit -m "Add iOS dashboard app + GitHub Actions IPA build"
git push
```

2. On GitHub, open the **Actions** tab → **Build iOS IPA (unsigned)** → it runs automatically
   (or click **Run workflow**).
3. When it finishes (green check), open the run → **Artifacts** → download
   **`MarjaneAdmin-unsigned-ipa`**. Unzip it to get `MarjaneAdmin-unsigned.ipa`.

### B) Install on the iPhone with Sideloadly (free Apple ID)

1. Download **Sideloadly** for Windows: https://sideloadly.io
2. Install **iTunes** (Apple version) so Windows detects the iPhone.
3. Connect your dad's iPhone by USB.
4. Open Sideloadly → drag in `MarjaneAdmin-unsigned.ipa`.
5. Enter your **free Apple ID** → click **Start**. Sideloadly signs and installs it.
6. On the iPhone: **Settings → General → VPN & Device Management** → trust your Apple ID.

The app icon appears on the home screen. It **expires after 7 days** with a free Apple
ID — just re-run Sideloadly to reinstall. (A paid Apple Developer account makes it last
1 year via TestFlight/Ad Hoc instead.)

---

## Alternative — Open in Xcode (only if you get a Mac)

1. Copy the `ios-app` folder to a Mac
2. Double-click `MarjaneAdmin.xcodeproj`
3. Select the **MarjaneAdmin** target → **Signing & Capabilities**
4. Choose your **Team** (Apple Developer account)
5. Change **Bundle Identifier** if needed (e.g. `com.yourname.marjane.dashboard`)

---

## Step 3 — Build IPA for your dad's iPhone

### Option A — TestFlight (recommended)

1. In Xcode: **Product → Archive**
2. **Distribute App → App Store Connect → Upload**
3. In [App Store Connect](https://appstoreconnect.apple.com), add the build to **TestFlight**
4. Invite your dad by email — he installs **TestFlight** from the App Store, then your app

Works for up to 10,000 testers. Updates are easy.

### Option B — Ad Hoc (direct IPA install)

1. Get your dad's iPhone **UDID**:
   - Connect iPhone to Mac → open **Finder** → select the device → click serial number until UDID appears, copy it
   - Or use [https://udid.tech](https://udid.tech) on his phone
2. In [developer.apple.com](https://developer.apple.com) → **Certificates, Identifiers & Profiles** → **Devices** → register his UDID
3. Create an **Ad Hoc** provisioning profile including that device
4. In Xcode: **Product → Archive → Distribute App → Ad Hoc**
5. Export the `.ipa` file
6. Install via:
   - **Apple Configurator** (Mac + USB cable), or
   - **Diawi** / similar (upload IPA, open link on iPhone)

### Option C — Free Apple ID (not recommended for dad)

Sideloading with a free Apple ID makes the app **expire after 7 days** and must be reinstalled. Only use for quick testing.

---

## How the app works

- Full-screen **WebView** loads your React site (HashRouter: `#/dashboard`, etc.)
- Starts on the login page
- After login, only **login** and **dashboard** routes are allowed (including category detail pages under `/dashboard/...`)
- Other sections (Magasins, Totaux, etc.) redirect back to the dashboard
- Session is stored in the WebView (same as the browser — stays logged in until logout)
- Pull-to-navigate and standard scrolling work like Safari

---

## Optional — App icon

Add a 1024×1024 PNG named `AppIcon.png` in Xcode: **Assets.xcassets → AppIcon**. You can use the Marjane logo from `client/public/marjane-logo.png` (resize to 1024×1024).

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Blank white screen | Check `webAppURL` in `AppConfig.swift` and that the site loads in Safari on the phone |
| Login fails | Confirm `VITE_API_URL` on the deployed frontend points to your live API |
| "Untrusted developer" on iPhone | Settings → General → VPN & Device Management → trust your developer certificate |
| API errors on Render free tier | Backend may be sleeping; first request can take ~30 seconds |

---

## Project structure

```
ios-app/
├── MarjaneAdmin.xcodeproj/
└── MarjaneAdmin/
    ├── MarjaneAdminApp.swift   # App entry
    ├── ContentView.swift       # Main screen + loading indicator
    ├── WebView.swift           # WKWebView wrapper
    ├── AppConfig.swift         # SET YOUR URL HERE
    ├── Info.plist
    └── Assets.xcassets/
```
