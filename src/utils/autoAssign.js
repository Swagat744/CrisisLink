// src/utils/autoAssign.js
import { db } from '../firebase/config';
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore';

const ROLE_MAP = {
  Fire: ['Security', 'General'],
  Medical: ['Medical', 'General'],
  Security: ['Security', 'General'],
};

export async function autoAssignStaff(hotelId, emergencyId, emergencyType) {
  const roles = ROLE_MAP[emergencyType] || ['General'];

  // Try each preferred role in order
  for (const role of roles) {
    const q = query(
      collection(db, 'staff'),
      where('hotelId', '==', hotelId),
      where('role', '==', role),
      where('available', '==', true)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const staffDoc = snap.docs[0];
      const staffData = { id: staffDoc.id, ...staffDoc.data() };

      // Mark staff as unavailable
      await updateDoc(doc(db, 'staff', staffData.id), { available: false });

      // Update emergency
      await updateDoc(doc(db, 'emergencies', emergencyId), {
        assignedStaffId: staffData.id,
        assignedStaffName: staffData.name,
        status: 'Assigned',
        updatedAt: serverTimestamp(),
      });

      // Add timeline entry
      await addDoc(collection(db, 'emergencyTimeline'), {
        emergencyId,
        event: `Staff assigned: ${staffData.name} (${staffData.role})`,
        timestamp: serverTimestamp(),
        type: 'assignment',
      });

      return staffData;
    }
  }

  // No staff available — escalate
  await updateDoc(doc(db, 'emergencies', emergencyId), {
    status: 'Escalated',
    escalationReason: 'No available staff',
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'emergencyTimeline'), {
    emergencyId,
    event: 'ESCALATED: No available staff found. Manual intervention required.',
    timestamp: serverTimestamp(),
    type: 'escalation',
  });

  return null;
}

export function getSeverity(type, message = '') {
  const msg = message.toLowerCase();
  if (type === 'Fire') return 'Critical';
  if (type === 'Medical') {
    if (msg.includes('unconscious') || msg.includes('not breathing') || msg.includes('chest')) return 'Critical';
    return 'High';
  }
  if (type === 'Security') {
    if (msg.includes('weapon') || msg.includes('attack')) return 'Critical';
    return 'Medium';
  }
  return 'Low';
}

export function getFloorGuidance(type, floor) {
  const baseGuidance = {
    Fire: [
      `Evacuate ${floor} immediately.`,
      'Use stairwells only — do NOT use elevators.',
      'Activate nearest fire alarm pull station.',
      'Proceed to the nearest marked exit.',
      'Do not re-enter the building until cleared.',
    ],
    Medical: [
      `A medical emergency is in progress on ${floor}.`,
      'Keep the area clear for first responders.',
      'If trained, prepare to assist until medical staff arrive.',
      'Do not move the patient unless in immediate danger.',
    ],
    Security: [
      `Security alert active on ${floor}.`,
      'Remain in your room and lock your door.',
      'Do not approach the affected area.',
      'Await instructions from hotel security.',
    ],
  };
  return baseGuidance[type] || ['Follow hotel staff instructions.'];
}
