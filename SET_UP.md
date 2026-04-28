# SMS Setup Guide — CrisisLink + Twilio

## Step 1 — Twilio Account

1. Go to https://twilio.com → Sign up (free trial = ~$15 credits, enough for 100+ SMS)
2. After signup, go to your **Console Dashboard**
3. Note down:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal)
4. Go to **Phone Numbers → Manage → Buy a number**
   - Pick any number with SMS capability (~$1/month)
   - Note it down as `+1XXXXXXXXXX` format

---

## Step 2 — Make sure staff phone numbers are saved

In CrisisLink → **Staff page** → when adding staff, enter their phone number in **international format**:
- India: `+919876543210`
- US: `+15550001234`
- UK: `+447700900000`

---

## Step 3 — Set Firebase Environment Variables

Run these commands in your terminal (from the root `crisislink/` folder):

```bash
firebase functions:config:set \
  twilio.sid="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  twilio.token="your_auth_token_here" \
  twilio.from="+1your_twilio_number"
```

Example:
```bash
firebase functions:config:set \
  twilio.sid="AC1234567890abcdef1234567890abcdef" \
  twilio.token="abc123def456ghi789" \
  twilio.from="+15550001234"
```

Verify it saved:
```bash
firebase functions:config:get
```

---

## Step 4 — Install & Deploy Functions

```bash
# Go into functions folder and install dependencies
cd functions
npm install
cd ..

# Deploy only the functions
firebase deploy --only functions
```

You should see:
```
✔ functions[onEmergencyAssigned]: Successful
✔ functions[onEmergencyCreated]: Successful
```

---

## Step 5 — Test It

1. Open CrisisLink dashboard
2. Scan a QR code or open `/report/:locationId`
3. Submit a Medical or Fire emergency
4. Watch the auto-assign fire
5. Staff should receive SMS within 5-10 seconds like:

```
[CrisisLink] 🔵 MEDICAL EMERGENCY — ASSIGNED
Hotel: Grand Palace Hotel
Location: Room 202 (Floor 2)
Severity: High
Details: Guest fell in bathroom
Report immediately. Do not delay.
```

---

## What triggers an SMS?

| Event | SMS Sent? |
|-------|-----------|
| Emergency created + auto-assigned | ✅ Yes |
| Staff manually assigned from dashboard | ✅ Yes |
| Staff reassigned to different person | ✅ Yes (new staff gets SMS) |
| Status updated (On the Way, Resolved) | ❌ No |
| Emergency created but no staff available | ❌ No (escalated instead) |

---

## Troubleshooting

**SMS not sending?**
- Check Firebase Functions logs: `firebase functions:log`
- Make sure staff phone number is in international format (`+91...`)
- Check Twilio trial account — trial accounts can only SMS **verified numbers** (verify in Twilio Console → Verified Caller IDs)

**Functions not deploying?**
- Make sure you're on Firebase **Blaze plan** (pay-as-you-go) — free Spark plan doesn't support Cloud Functions with external network calls (Twilio)
- Upgrade at: console.firebase.google.com → project settings → billing

**Config not found error?**
- Re-run `firebase functions:config:set ...` and redeploy
