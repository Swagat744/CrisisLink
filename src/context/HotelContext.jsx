// src/context/HotelContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const HotelContext = createContext(null);

export function HotelProvider({ children }) {
  const { user } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'hotels'), where('adminUid', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setHotel({ id: d.id, ...d.data() });
      } else {
        setHotel(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return (
    <HotelContext.Provider value={{ hotel, loading }}>
      {children}
    </HotelContext.Provider>
  );
}

export const useHotel = () => useContext(HotelContext);
