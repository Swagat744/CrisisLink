// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// (Optional) Analytics - safe handling for localhost
import { getAnalytics, isSupported } from "firebase/analytics";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAACy6FPe9w3Ev0QvRGFhffQkppILd-YQE",
  authDomain: "crisislink-f97ef.firebaseapp.com",
  projectId: "crisislink-f97ef",
  storageBucket: "crisislink-f97ef.firebasestorage.app",
  messagingSenderId: "833024970640",
  appId: "1:833024970640:web:be7c2ac0fc99dcc18aad15",
  measurementId: "G-GP0WX5EMDS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Secondary App for creating staff without signing out admin
const secondaryApp = initializeApp(firebaseConfig, 'secondary');

// Initialize services
export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);

// Optional Analytics (only if supported, avoids crash on localhost)
let analytics = null;
isSupported().then((yes) => {
  if (yes) {
    analytics = getAnalytics(app);
  }
});

// Export app
export default app;