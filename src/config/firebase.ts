import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-expect-error: getReactNativePersistence is missing from the web typings but works in Metro React Native
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD8chMmC-k_wad1URbwAaFlHjUhU1MxMYQ",
  authDomain: "ecoback-1adde.firebaseapp.com",
  projectId: "ecoback-1adde",
  storageBucket: "ecoback-1adde.firebasestorage.app",
  messagingSenderId: "589523364934",
  appId: "1:589523364934:web:336a7ae6a35065dc1b2e47",
  measurementId: "G-N759E8X93M"
};

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

import { Platform } from 'react-native';

// Initialize Auth with AsyncStorage persistence
// Use try/catch to handle hot reload: initializeAuth throws if already initialized
function getFirebaseAuth(): Auth {
  try {
    let persistence;
    if (Platform.OS === 'web') {
      const { browserLocalPersistence } = require('firebase/auth');
      persistence = browserLocalPersistence;
    } else {
      persistence = getReactNativePersistence(ReactNativeAsyncStorage);
    }
    
    return initializeAuth(app, {
      persistence: persistence,
    });
  } catch (e) {
    // Auth was already initialized (e.g. hot reload), retrieve existing instance
    return getAuth(app);
  }
}

export const auth = getFirebaseAuth();

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
