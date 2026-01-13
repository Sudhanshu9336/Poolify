// POOLIFY - FIREBASE CONFIGURATION
console.log("🔥 Initializing Firebase...");

const firebaseConfig = {
    apiKey: "AIzaSyAcuPp5tT8yiD_WQjCV0LYiU7ZpRqQlL-Y",
    authDomain: "poolify-743f0.firebaseapp.com",
    databaseURL: "https://poolify-743f0-default-rtdb.firebaseio.com",
    projectId: "poolify-743f0",
    storageBucket: "poolify-743f0.firebasestorage.app",
    messagingSenderId: "261302180910",
    appId: "1:261302180910:web:485f2a1f2e9923728a93bf"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase initialized");
    }
} catch (error) {
    console.error("❌ Firebase error:", error);
}

// Create services
const auth = firebase.auth();
const db = firebase.database();

console.log("✅ Auth service:", auth ? "Ready" : "Failed");
console.log("✅ Database service:", db ? "Ready" : "Failed");

// Make globally available
window.firebase = firebase;
window.auth = auth;
window.db = db;

console.log("🔥 Firebase setup complete");