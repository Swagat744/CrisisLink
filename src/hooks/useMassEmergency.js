// src/hooks/useMassEmergency.js
import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useHotel } from '../context/HotelContext';

export function useMassEmergency() {
  const { hotel } = useHotel();
  const [massEmergencies, setMassEmergencies] = useState({});

  useEffect(() => {
    if (!hotel?.id) return;

    const threshold = hotel.massEmergencyThreshold || 3;
    const q = query(
      collection(db, 'emergencies'),
      where('hotelId', '==', hotel.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const activeEmergencies = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status !== 'Resolved' && e.status !== 'Incomplete');

      // Group by type
      const groups = activeEmergencies.reduce((acc, e) => {
        if (!acc[e.type]) acc[e.type] = [];
        acc[e.type].push(e);
        return acc;
      }, {});

      // Filter by threshold
      const mass = {};
      Object.keys(groups).forEach(type => {
        if (groups[type].length >= threshold) {
          mass[type] = groups[type];
        }
      });

      setMassEmergencies(mass);
    });

    return unsub;
  }, [hotel]);

  return { massEmergencies };
}
