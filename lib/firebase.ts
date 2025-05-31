"use client"

import { initializeApp } from "firebase/app"
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

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
