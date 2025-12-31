// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBJ7tJy_oSH7TPwyMHFP4Tq37_mQkscpHg",
  authDomain: "hack-battle.firebaseapp.com",
  projectId: "hack-battle",
  storageBucket: "hack-battle.firebasestorage.app",
  messagingSenderId: "422575576978",
  appId: "1:422575576978:web:e5ab8d71a270087c98934b",
  measurementId: "G-XGCWLRWT8Q",
  databaseURL: "https://hack-battle-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, get, update, onValue, push, remove };
