import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, setLogLevel, enableNetwork, disableNetwork, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, query, where, orderBy, limit, startAfter, serverTimestamp, increment } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCsv9YAbuQ8uwYLzjBkYXt3IIbl3RWKsRE",
  authDomain: "yoonek-laundry.firebaseapp.com",
  databaseURL: "https://yoonek-laundry-default-rtdb.firebaseio.com",
  projectId: "yoonek-laundry",
  storageBucket: "yoonek-laundry.firebasestorage.app",
  messagingSenderId: "632666046972",
  appId: "1:632666046972:web:8a7b6ab85476342aca3279",
  measurementId: "G-707895WDE2"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
})

setLogLevel('error')

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => {
    disableNetwork(db).catch(() => {})
  })
  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {})
  })
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {})
  }
}

const googleProvider = new GoogleAuthProvider()

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment
}
