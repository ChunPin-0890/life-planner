import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth'
import { getFirestore, initializeFirestore } from 'firebase/firestore'

// Values come from the Firebase console (Project settings → Your apps → Web
// app). EXPO_PUBLIC_* vars are inlined at build time — these are client
// identifiers, not secrets; access control is enforced by firestore.rules.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error('Missing Firebase config — copy .env.example to .env and fill in your project values.')
}

// Guard against re-initialising on Fast Refresh.
const isFirstInit = getApps().length === 0
export const app = isFirstInit ? initializeApp(firebaseConfig) : getApp()

// Persist the signed-in user across app restarts.
export const auth: Auth = isFirstInit
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app)

// ignoreUndefinedProperties: the model uses optional fields (goalId?, etc.)
// and Firestore otherwise rejects any write containing an undefined value.
export const db = isFirstInit ? initializeFirestore(app, { ignoreUndefinedProperties: true }) : getFirestore(app)
