import { initializeApp } from "firebase/app";
import { firebaseEnv } from "../env";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase client configuration for web app
const firebaseConfig = {
  apiKey: firebaseEnv.apiKey,
  authDomain:
    firebaseEnv.authDomain || `${firebaseEnv.projectId}.firebaseapp.com`,
  projectId: firebaseEnv.projectId,
  storageBucket:
    firebaseEnv.storageBucket || `${firebaseEnv.projectId}.firebasestorage.app`,
  messagingSenderId: firebaseEnv.messagingSenderId,
  appId: firebaseEnv.appId,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with persistent cache (new API - replaces enableMultiTabIndexedDbPersistence)
// This allows the app to cache Firestore data locally and work offline
// Multi-tab support allows multiple tabs to share the same cache
// IMPORTANT: This must be the FIRST initialization of Firestore for this app
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

export { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider };
