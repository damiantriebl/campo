// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0OINpP6cOeAno5m9a8EXcaRJbT69Lbqo",
  authDomain: "campo-9fb40.firebaseapp.com",
  projectId: "campo-9fb40",
  storageBucket: "campo-9fb40.appspot.com",
  messagingSenderId: "149722424399",
  appId: "1:149722424399:web:099267684d39d0e910f63a",
  measurementId: "G-VHT54J6WM6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
