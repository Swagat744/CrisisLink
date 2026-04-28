// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();
const db = admin.firestore();

// ─── Twilio credentials ───────────────────────────────────────────────────────
// Set these via Firebase environment config (see setup instructions)
// Never hardcode these values here
const TWILIO_SID = functions.config().twilio.sid;
const TWILIO_TOKEN = functions.config().twilio.token;
const TWILIO_FROM = functions.config().twilio.from; // your Twilio number e.g. +15550001234

const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// ─── Trigger: fires when any emergency document is updated ────────────────────
exports.onEmergencyAssigned = functions.firestore
  .document("emergencies/{emergencyId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const emergencyId = context.params.emergencyId;

    // Only proceed if assignedStaffId just got set (wasn't set before)
    const justAssigned =
      !before.assignedStaffId && after.assignedStaffId;

    // Or if staff was REASSIGNED (different staff ID)
    const wasReassigned =
      before.assignedStaffId &&
      after.assignedStaffId &&
      before.assignedStaffId !== after.assignedStaffId;

    if (!justAssigned && !wasReassigned) {
      return null; // nothing to do
    }

    try {
      // Fetch staff document
      const staffSnap = await db
        .collection("staff")
        .doc(after.assignedStaffId)
        .get();

      if (!staffSnap.exists) {
        console.log("Staff doc not found:", after.assignedStaffId);
        return null;
      }

      const staff = staffSnap.data();

      if (!staff.phone) {
        console.log(`Staff ${staff.name} has no phone number. Skipping SMS.`);
        return null;
      }

      // Fetch hotel name
      let hotelName = "Your Hotel";
      if (after.hotelId) {
        const hotelSnap = await db.collection("hotels").doc(after.hotelId).get();
        if (hotelSnap.exists) hotelName = hotelSnap.data().name;
      }

      // Build SMS message
      const emoji = {
        Fire: "🔴 FIRE",
        Medical: "🔵 MEDICAL",
        Security: "🟡 SECURITY",
      };

      const typeLabel = emoji[after.type] || after.type;
      const action = wasReassigned ? "REASSIGNED" : "ASSIGNED";

      const message =
        `[CrisisLink] ${typeLabel} EMERGENCY — ${action}\n` +
        `Hotel: ${hotelName}\n` +
        `Location: ${after.locationName}${after.floor ? ` (${after.floor})` : ""}\n` +
        `Severity: ${after.severity}\n` +
        `${after.message ? `Details: ${after.message}\n` : ""}` +
        `Report immediately. Do not delay.`;

      // Send SMS via Twilio
      const smsResult = await client.messages.create({
        body: message,
        from: TWILIO_FROM,
        to: staff.phone,
      });

      console.log(
        `SMS sent to ${staff.name} (${staff.phone}). SID: ${smsResult.sid}`
      );

      // Log to timeline
      await db.collection("emergencyTimeline").add({
        emergencyId,
        event: `SMS alert sent to ${staff.name} at ${staff.phone}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: "notification",
      });

      return null;
    } catch (err) {
      console.error("SMS send failed:", err);
      return null;
    }
  });


// ─── Trigger: fires when emergency is created (status = New) ─────────────────
// This handles the case where staff is assigned at creation time
exports.onEmergencyCreated = functions.firestore
  .document("emergencies/{emergencyId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const emergencyId = context.params.emergencyId;

    // If staff was already assigned at creation, send SMS
    if (!data.assignedStaffId) return null;

    try {
      const staffSnap = await db
        .collection("staff")
        .doc(data.assignedStaffId)
        .get();

      if (!staffSnap.exists || !staffSnap.data().phone) return null;

      const staff = staffSnap.data();

      let hotelName = "Your Hotel";
      if (data.hotelId) {
        const hotelSnap = await db.collection("hotels").doc(data.hotelId).get();
        if (hotelSnap.exists) hotelName = hotelSnap.data().name;
      }

      const emoji = { Fire: "🔴 FIRE", Medical: "🔵 MEDICAL", Security: "🟡 SECURITY" };
      const typeLabel = emoji[data.type] || data.type;

      const message =
        `[CrisisLink] ${typeLabel} EMERGENCY — ASSIGNED\n` +
        `Hotel: ${hotelName}\n` +
        `Location: ${data.locationName}${data.floor ? ` (${data.floor})` : ""}\n` +
        `Severity: ${data.severity}\n` +
        `${data.message ? `Details: ${data.message}\n` : ""}` +
        `Report immediately. Do not delay.`;

      const smsResult = await client.messages.create({
        body: message,
        from: TWILIO_FROM,
        to: staff.phone,
      });

      console.log(`SMS sent to ${staff.name}. SID: ${smsResult.sid}`);

      await db.collection("emergencyTimeline").add({
        emergencyId,
        event: `SMS alert sent to ${staff.name} at ${staff.phone}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: "notification",
      });

      return null;
    } catch (err) {
      console.error("SMS on create failed:", err);
      return null;
    }
  });
