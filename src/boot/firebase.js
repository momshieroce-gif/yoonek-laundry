import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'

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
const db = getFirestore(app)

const googleProvider = new GoogleAuthProvider()

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
  query,
  where,
  orderBy,
  serverTimestamp
}
