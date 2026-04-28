# CrisisLink — Hotel Emergency Response System

A real-time emergency coordination platform for hotels. Staff and guests can report emergencies via QR codes, staff are automatically assigned, and a live dashboard tracks all incidents.

---

## Project Structure

```
crisislink/
├── src/
│   ├── firebase/
│   │   ├── config.js          # Firebase configuration (edit this)
│   │   └── seed.js            # Optional demo data seeder
│   ├── context/
│   │   ├── AuthContext.jsx    # Auth state + login/register/logout
│   │   └── HotelContext.jsx   # Active hotel state
│   ├── utils/
│   │   └── autoAssign.js      # Staff assignment logic + severity + guidance
│   ├── components/
│   │   ├── dashboard/
│   │   │   └── Layout.jsx     # Sidebar navigation layout
│   │   └── emergencies/
│   │       └── EmergencyCard.jsx  # Emergency card + status/severity badges
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx       # Main real-time feed
│   │   ├── EmergencyDetailPage.jsx # Full timeline, assign, status update
│   │   ├── PublicReportPage.jsx    # Mobile QR target page
│   │   ├── StaffPage.jsx
│   │   ├── LocationsPage.jsx
│   │   ├── QRPage.jsx             # QR code generator + download
│   │   ├── HotelSetupPage.jsx
│   │   └── ReportPage.jsx         # Printable incident report
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── firestore.rules
├── firestore.indexes.json
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Setup Instructions

### 1. Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g., `crisislink`)
3. Enable **Google Analytics** (optional) → Create project

### 2. Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Click **Email/Password** → Enable → Save

### 3. Enable Firestore

1. **Firestore Database** → **Create database**
2. Choose **Start in test mode** (update rules before production)
3. Pick a region → Done

### 4. Deploy Firestore Rules + Indexes

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools
firebase login

# Deploy rules and indexes
firebase deploy --only firestore
```

Or paste `firestore.rules` contents directly into the Firebase Console.

### 5. Get Firebase Config

1. **Project Settings** (gear icon) → **General** → scroll to **Your apps**
2. Click **</>** (Web) → Register app → Copy the `firebaseConfig` object
3. Paste into `src/firebase/config.js`

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 6. Install & Run

```bash
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

---

## First Use Walkthrough

1. **Register** at `/register` — creates your admin account
2. You'll be redirected to **Hotel Setup** — fill in hotel name, address, floors
3. Go to **Locations** → add rooms (e.g., Room 101, Room 202, Reception)
4. Go to **Staff** → add staff members with roles (Security, Medical, General)
5. Go to **QR Codes** → download QR codes and print them for each room
6. **Test it**: click "Test" link on any QR code → opens mobile report page → submit an emergency
7. **Watch it appear** in real time on the Dashboard

---

## How Auto-Assignment Works

When an emergency is reported:

| Emergency Type | Preferred Staff Roles    |
|---------------|--------------------------|
| Fire          | Security → General       |
| Medical       | Medical → General        |
| Security      | Security → General       |

The system finds the first available staff member with the preferred role and assigns them. If no one is available, the emergency is marked **Escalated**.

---

## Severity Rules

| Type     | Condition                          | Severity  |
|----------|-----------------------------------|-----------|
| Fire     | Always                            | Critical  |
| Medical  | "unconscious", "chest", etc.      | Critical  |
| Medical  | Default                           | High      |
| Security | "weapon", "attack"                | Critical  |
| Security | Default                           | Medium    |

---

## Deployment (Vercel)

```bash
npm run build
# Upload /dist to Vercel or run:
npx vercel --prod
```

---

## Firestore Collections

| Collection           | Purpose                              |
|----------------------|--------------------------------------|
| `users`              | Admin/staff user profiles            |
| `hotels`             | Hotel registration info              |
| `locations`          | Rooms and areas (QR targets)         |
| `staff`              | Staff members + availability         |
| `emergencies`        | Live emergency records               |
| `emergencyTimeline`  | Per-emergency event log              |

---

## Important Notes

- The `firestore.rules` file allows public write to `emergencies` and `locations` (needed for QR reporting). **Tighten these before production.**
- Staff availability is toggled automatically on assignment and freed on resolution.
- QR download uses canvas to render a printable PNG with room name.
- The incident report page (`/incident-report/:id`) has print-optimized styles.
