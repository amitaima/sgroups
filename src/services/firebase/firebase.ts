import { initializeApp } from "firebase/app";
import type { User } from "firebase/auth";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: unknown;
  lastLoginAt: unknown;
}

export const upsertUserProfile = async (user: User): Promise<void> => {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const existingCreatedAt = snapshot.exists()
    ? snapshot.data()?.createdAt
    : null;
  const provider = user.providerData[0]?.providerId || "password";

  const payload: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
    createdAt: existingCreatedAt ?? serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
};
