// src/firebase/seed.js
// Run this once to populate your Firestore with demo data
import { db } from './config';
import { collection, addDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';

export async function seedDemoData(hotelId, adminUid) {
  // Seed locations
  const floors = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];
  const rooms = [
    { name: 'Room 101', floor: 'Floor 1' },
    { name: 'Room 102', floor: 'Floor 1' },
    { name: 'Room 201', floor: 'Floor 2' },
    { name: 'Room 202', floor: 'Floor 2' },
    { name: 'Room 301', floor: 'Floor 3' },
    { name: 'Reception', floor: 'Ground Floor' },
    { name: 'Exit A', floor: 'Ground Floor' },
    { name: 'Exit B', floor: 'Ground Floor' },
    { name: 'Restaurant', floor: 'Ground Floor' },
    { name: 'Gym', floor: 'Floor 1' },
  ];

  for (const room of rooms) {
    await addDoc(collection(db, 'locations'), {
      hotelId,
      name: room.name,
      floor: room.floor,
      createdAt: serverTimestamp(),
    });
  }

  // Seed staff
  const staffMembers = [
    { name: 'John Harris', role: 'Security', available: true, phone: '+1-555-0101' },
    { name: 'Maria Santos', role: 'Medical', available: true, phone: '+1-555-0102' },
    { name: 'David Chen', role: 'Security', available: false, phone: '+1-555-0103' },
    { name: 'Priya Patel', role: 'Medical', available: true, phone: '+1-555-0104' },
    { name: 'Tom Walker', role: 'General', available: true, phone: '+1-555-0105' },
    { name: 'Sarah Kim', role: 'General', available: true, phone: '+1-555-0106' },
  ];

  for (const member of staffMembers) {
    await addDoc(collection(db, 'staff'), {
      hotelId,
      ...member,
      createdAt: serverTimestamp(),
    });
  }

  console.log('Demo data seeded successfully.');
}
