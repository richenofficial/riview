import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiLuG_nM1ASeLdLggEfjSjCAREhl-tTV8",
    authDomain: "riview-card.firebaseapp.com",
    projectId: "riview-card",
    storageBucket: "riview-card.firebasestorage.app",
    messagingSenderId: "75278422286",
    appId: "1:75278422286:web:fc47020c9325ffe745c75f",
    measurementId: "G-S7PN1NFZDJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, getDoc, setDoc };