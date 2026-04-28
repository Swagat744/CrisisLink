# CrisisLink — Intelligent Hotel Emergency Response System

CrisisLink is a real-time, AI-assisted emergency coordination platform designed for hotels to handle crises with speed, clarity, and precision.

It transforms emergency response from a fragmented, reactive process into a structured, intelligent, and coordinated system.

---

## Problem

In high-risk environments like hotels, emergencies such as fires, medical incidents, or security threats often fail not because help is unavailable, but because:

* Communication is delayed or unclear
* Staff response is uncoordinated
* Decision-making is manual and slow
* Large-scale incidents lack structured handling

This leads to confusion, delayed action, and increased risk.

---

## Solution

CrisisLink provides a unified system that enables:

* Instant emergency reporting with precise location
* Automatic staff assignment based on situation
* Real-time tracking and coordination
* Intelligent escalation during large-scale crises

---

## Key Features

### QR-Based Emergency Reporting

QR codes placed across rooms and common areas allow guests or staff to report emergencies instantly. Each report automatically includes the exact location, eliminating ambiguity.

---

### Real-Time Emergency Dashboard

A centralized dashboard displays all active emergencies with live updates, ensuring complete visibility and faster decision-making.

---

### Auto Staff Assignment

The system automatically assigns the most relevant available staff based on emergency type, ensuring rapid response without manual coordination.

---

### Mass Emergency Escalation (Core Innovation)

When multiple rooms report the same type of emergency simultaneously beyond a defined threshold, the system:

* Detects a large-scale crisis automatically
* Activates a critical alert mode
* Highlights affected areas and severity across the dashboard

---

### AI-Based Crisis Intelligence (Gemini API)

During mass emergencies, the system generates:

* A situation assessment explaining what is happening
* A prioritized action plan for responders
* A ready-to-use communication message for emergency services
* A recommendation on which facility to contact first

This enables faster and more informed decision-making under pressure.

---

### External Facility Integration

Pre-configured emergency contacts (Fire, Medical, Security) allow one-click calling, enabling immediate coordination with external responders.

---

## System Workflow

1. User reports emergency via QR
2. Data is stored in Firestore
3. Dashboard updates in real time
4. System assigns staff automatically
5. If multiple alerts exceed threshold → Mass Emergency triggered
6. AI generates crisis intelligence
7. Admin coordinates response and external communication

---

## Tech Stack

* Frontend: React.js (Vite)
* Styling: Tailwind CSS
* Backend: Firebase Firestore (real-time database)
* Authentication: Firebase Auth
* AI Integration: Google Gemini API
* Deployment: Vercel

---

## Project Structure

```
crisislink/
├── src/
│   ├── firebase/
│   ├── context/
│   ├── utils/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── firestore.rules
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Setup Instructions

1. Install dependencies:

```
npm install
```

2. Configure Firebase in:

```
src/firebase/config.js
```

3. Run the project:

```
npm run dev
```

---

## Deployment

```
npm run build
npx vercel --prod
```

---

## Firestore Collections

* users
* hotels
* locations
* staff
* emergencies
* emergencyTimeline

---

## Impact

CrisisLink significantly reduces response time, eliminates confusion, and ensures coordinated action during both individual incidents and large-scale emergencies.

It enables hotels to respond faster, smarter, and more reliably under pressure.

---

## Future Scope

* IoT-based automatic detection (fire/smoke sensors)
* Dedicated mobile app for staff
* Predictive risk analysis
* Multi-property crisis coordination

---

## Live Demo

https://crisislink-sandy.vercel.app

---

## Repository

https://github.com/Swagat744/CrisisLink
