"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyB7Zz3fxQtfSuk3tuc2UimeVNoX7M_5sIk",
  authDomain: "arrakis-spice-empire.firebaseapp.com",
  projectId: "arrakis-spice-empire",
  storageBucket: "arrakis-spice-empire.firebasestorage.app",
  messagingSenderId: "685304270859",
  appId: "1:685304270859:web:2d20f753db72a2de61f70e",
}

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
