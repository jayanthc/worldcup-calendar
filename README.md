# ⚽ FIFA World Cup 2026 Match Calendar

A premium, high-fidelity single-page web application to view the FIFA World Cup 2026 match schedule, filter matches by team, group, and host city, download custom `.ics` calendar files, and subscribe to matching fixtures directly on Google Calendar, Apple Calendar, or Outlook.

The application has **zero runtime dependencies**, compiling completely statically and cleanly for high performance (optimized Core Web Vitals, including Largest Contentful Paint) and is designed specifically to be hosted on **Firebase Hosting**.

---

## 🚀 Technology Stack & Architecture

1. **Frontend Core**: Pure HTML5 (semantic layout, SEO-optimized) and Javascript (ES6+, 100% vanilla client-side).
2. **Styling**: Modern, premium Vanilla CSS featuring:
   * Sleek dark-mode theme first approach with deep emerald-green gradients.
   * Premium gold accents (`#d4af37`) and clean micro-animations.
   * Advanced **Glassmorphism** using `backdrop-filter: blur(12px)` for custom dropdowns and modals.
3. **Icons**: Loaded dynamically via Lucide Icons.
4. **Flag CDNs**: High-quality SVG flag rendering powered by [FlagCDN](https://flagcdn.com/).
5. **iCalendar Engine**: 
   * **Client-Side**: Dynamically generates merged `.ics` files based on user-selected filters on the fly.
   * **Offline Generator**: Pre-compiles static, hosted `.ics` subscription files for each of the 48 participating countries and the global tournament schedule.
6. **Hosting**: Hosted statically on Firebase Hosting Classic.

---

## 🛠️ Folder Structure

```text
worldcup_calendar/
├── README.md                 # Project documentation & instructions
├── firebase.json            # Firebase Hosting configuration
├── .firebaserc              # Associated Firebase project targets
├── generate_calendars.py    # Offline Python iCalendar compiler
└── public/
    ├── index.html           # Main Single-Page Website
    ├── style.css            # Custom CSS Styles (Layout, Animations, Glassmorphism)
    ├── app.js               # Core app logic (CSV Parsing, Timezones, Client ICS generation)
    ├── favicon.svg          # Custom tournament-themed vector favicon
    ├── worldcup_2026.ics    # Pre-generated global tournament calendar file
    ├── worldcup_2026_schedule.csv # Standardized master schedule database
    └── calendars/           # Offline pre-generated feeds (all.ics, USA.ics, Mexico.ics, etc.)
```

---

## 💻 Local Development & Testing

You can run and test the application completely locally without any complicated setup or dependencies.

### Prerequisite: Regenerate Calendar Feeds (Optional)
If you update the master match schedule inside `public/worldcup_2026_schedule.csv`, re-run the Python offline compiler to propagate the changes into all country-specific static subscription calendars:
```bash
python3 generate_calendars.py
```
*(No external Python dependencies required; uses standard libraries `os`, `csv`, `re`, and `datetime`)*

### 1. Test Using Firebase Local Emulator (Recommended)
This method emulates the production environment exactly, including custom headers and caching rules configured in `firebase.json`:

```bash
# Start the Hosting Emulator
npx -y firebase-tools@latest emulators:start --only hosting
```
Once initialized, open your browser and navigate to the address logged in your terminal (typically `http://127.0.0.1:5000` or the first available port fallback).

### 2. Test Using a Lightweight Server
Alternatively, you can spin up any simple local web server from the `public/` directory:

* **Using Python**:
  ```bash
  python3 -m http.server 8000 --directory public
  ```
  Open `http://localhost:8000` in your web browser.

* **Using Node.js (`serve`)**:
  ```bash
  npx -y serve public
  ```

---

## ☁️ Firebase Deployment Instructions

Follow these steps to deploy your finalized static assets to live production hosting.

### Prerequisite: Firebase CLI Installation
Ensure you have Node.js installed, then install the Firebase Command Line Tool globally:
```bash
npm install -g firebase-tools
```

### 1. Authenticate with Firebase
Log in to your Google Account associated with the Firebase console:
```bash
firebase login
```

### 2. Connect Your Project
We use the project target `worldcup-calendar` (configured in `.firebaserc`). To confirm or select it, run:
```bash
firebase use worldcup-calendar
```

### 3. Deploy Static Assets
Run the deployment command to push your local `public/` folder, custom `.ics` mime-type headers, and rules directly to Firebase Hosting:
```bash
firebase deploy --only hosting
```
Once completed, Firebase will provide your live URL (e.g., `https://worldcup-calendar.web.app`).

---

## 🌐 Custom Domain Migration

The application has been fully migrated to use the premium custom domain **`worldcupcalendar.football`**.

### Connecting the Custom Domain in Firebase Console:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project **worldcup-calendar**.
3. In the left navigation sidebar, go to **Build** > **Hosting**.
4. Scroll down to the **Domains** section and click **Add Custom Domain**.
5. Enter `worldcupcalendar.football` (and `www.worldcupcalendar.football` as desired).
6. Follow the instructions to verify ownership and update your DNS records (A and TXT records) with your domain provider (e.g. GoDaddy, Namecheap, etc.).
7. Once DNS propagates and the SSL certificate is provisioned by Firebase, the site will be fully operational at `https://worldcupcalendar.football`.

---

## 🔒 Calendar Subscription Notes
* **Event UIDs**: The event UIDs generated are formatted as `match_2026_[id]_[teams]@worldcupcalendar.football`. This ensures calendar applications correctly map, index, and update match fixtures under the correct custom domain without overlapping existing feeds.
* **Direct Google Calendar Subscriptions**: When users click "Open Google Calendar", the app utilizes Google's direct subscription parameter:
  `https://calendar.google.com/calendar/render?cid=https://worldcupcalendar.football/calendars/[country].ics`
  This lets calendar apps directly register the calendar rather than importing a snapshot, allowing live updates to propagate automatically if the schedule is updated.
