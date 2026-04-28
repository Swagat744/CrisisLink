// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) setUserProfile(snap.data());
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password, name, role = 'admin') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    });
    return cred;
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
