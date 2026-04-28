# CrisisLink — Intelligent Hotel Emergency Response System

CrisisLink is a real-time, AI-assisted emergency coordination platform designed for hotels to handle crises with speed, clarity, and structure.

It eliminates delays, miscommunication, and confusion by enabling instant reporting, automated coordination, and intelligent escalation during critical situations.

---

## Problem

In real-world hotel emergencies such as fires, medical incidents, or security threats, the biggest issue is not the absence of help, but:

- Delayed communication  
- Fragmented coordination  
- Lack of clear responsibility  
- No structured response during large-scale incidents  

This leads to slow reactions and increased risk.

---

## Solution

CrisisLink provides a unified system where:

- Emergencies are reported instantly  
- Staff are automatically assigned  
- Situations are tracked in real time  
- Large-scale incidents are intelligently escalated  

---

## Key Features

### QR-Based Emergency Reporting
- QR codes placed in rooms and common areas  
- Guests or staff can report emergencies instantly  
- Location is automatically captured  

---

### Real-Time Dashboard
- Live emergency feed  
- Clear status tracking (Assigned → On the Way → Resolved)  
- Centralized visibility for all incidents  

---

### Auto Staff Assignment
- Assigns staff based on emergency type  
- Removes dependency on manual decision-making  
- Ensures faster response  

---

### Mass Emergency Escalation (Core Innovation)
When multiple rooms report the same type of emergency:

- System detects large-scale crisis automatically  
- Activates critical alert mode on dashboard  
- Highlights affected areas and scale of impact  

---

### AI-Based Crisis Intelligence (Gemini API)
During mass emergencies, the system:

- Generates a situation assessment  
- Suggests priority actions  
- Provides a ready-to-use message for emergency services  
- Recommends which facility to contact first  

This enables faster and more informed decision-making under pressure.

---

### External Facility Integration
- Pre-configured contacts (Fire, Medical, Security)  
- One-click call access  
- Faster coordination with external responders  

---

## Tech Stack

- Frontend: React.js (Vite)  
- Styling: Tailwind CSS  
- Backend: Firebase Firestore (real-time)  
- Authentication: Firebase Auth  
- AI: Google Gemini API  
- Hosting: Vercel  

---

## Architecture Overview

1. User reports emergency via QR  
2. Data stored in Firestore  
3. Dashboard updates in real time  
4. System assigns staff automatically  
5. If threshold exceeded → Mass Emergency triggered  
6. Gemini AI generates crisis intelligence  
7. Admin coordinates response  

---

## Setup Instructions

### 1. Install dependencies
```bash
npm install
