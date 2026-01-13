// Auth JavaScript
console.log("🔐 Auth JS loaded");

// Global variables
let auth, db;

// Initialize Firebase if available
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing auth...");
    
    // Check if Firebase is available
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        try {
            auth = firebase.auth();
            db = firebase.firestore();
            console.log("✅ Firebase auth initialized");
        } catch (error) {
            console.log("⚠️ Firebase auth not available, using demo mode");
        }
    } else {
        console.log("⚠️ Running in demo mode without Firebase");
    }
    
    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Check existing login
    checkExistingLogin();
});

// Handle login
function handleLogin(e) {
    e.preventDefault();
    console.log("Login attempt...");
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    // If Firebase auth is available, use it
    if (auth) {
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Firebase login successful:", user.email);
                
                // Get user data from Firestore
                return db.collection('users').doc(user.uid).get();
            })
            .then((doc) => {
                if (doc.exists) {
                    const userData = doc.data();
                    saveUserToLocalStorage(doc.id, userData, email);
                    redirectToDashboard();
                } else {
                    // Create user document if doesn't exist
                    const userData = {
                        name: email.split('@')[0],
                        email: email,
                        hostel: 'Unknown',
                        joinedDate: new Date().toISOString()
                    };
                    saveUserToLocalStorage(auth.currentUser.uid, userData, email);
                    redirectToDashboard();
                }
            })
            .catch((error) => {
                console.error("Firebase login error:", error);
                alert('Login failed: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    } else {
        // Demo mode - simulate login
        setTimeout(() => {
            // Demo user data
            const userData = {
                uid: 'demo-user-' + Date.now(),
                name: email.split('@')[0],
                email: email,
                hostel: 'Hostel B',
                room: '205',
                joinedDate: new Date().toISOString()
            };
            
            saveUserToLocalStorage(userData.uid, userData, email);
            redirectToDashboard();
        }, 1500);
    }
}

// Handle signup
function handleSignup(e) {
    e.preventDefault();
    console.log("Signup attempt...");
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const hostel = document.getElementById('signupHostel').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!name || !email || !hostel || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    // Show loading
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    // If Firebase auth is available, use it
    if (auth) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Firebase signup successful:", user.email);
                
                // Create user document in Firestore
                const userData = {
                    name: name,
                    email: email,
                    hostel: hostel,
                    room: document.getElementById('signupRoom').value || '',
                    joinedDate: new Date().toISOString(),
                    stats: {
                        poolsCreated: 0,
                        poolsJoined: 0,
                        totalSaved: 0
                    }
                };
                
                return db.collection('users').doc(user.uid).set(userData);
            })
            .then(() => {
                alert('Account created successfully!');
                saveUserToLocalStorage(auth.currentUser.uid, { name, email, hostel }, email);
                redirectToDashboard();
            })
            .catch((error) => {
                console.error("Firebase signup error:", error);
                alert('Signup failed: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
    } else {
        // Demo mode - simulate signup
        setTimeout(() => {
            // Demo user data
            const userData = {
                uid: 'new-user-' + Date.now(),
                name: name,
                email: email,
                hostel: hostel,
                room: document.getElementById('signupRoom').value || '',
                joinedDate: new Date().toISOString(),
                stats: {
                    poolsCreated: 0,
                    poolsJoined: 0,
                    totalSaved: 0
                }
            };
            
            saveUserToLocalStorage(userData.uid, userData, email);
            alert('Account created successfully!');
            redirectToDashboard();
        }, 1500);
    }
}

// Save user to localStorage
function saveUserToLocalStorage(uid, userData, email) {
    const userObj = {
        uid: uid,
        name: userData.name || email.split('@')[0],
        email: email,
        hostel: userData.hostel || 'Unknown',
        room: userData.room || '',
        joinedDate: userData.joinedDate || new Date().toISOString()
    };
    
    localStorage.setItem('poolify_user', JSON.stringify(userObj));
    console.log("User saved to localStorage:", userObj);
}

// Redirect to dashboard
function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

// Check existing login
function checkExistingLogin() {
    const user = localStorage.getItem('poolify_user');
    if (user) {
        console.log("User already logged in, redirecting to dashboard");
        // Don't auto-redirect from login page, only check on other pages
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html') && !currentPage.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

// Make functions globally available for HTML onclick events
window.showSignupForm = function() {
    document.getElementById('loginFormContainer').style.display = 'none';
    document.getElementById('signupFormContainer').style.display = 'block';
    window.location.hash = 'signup';
};

window.showLoginForm = function() {
    document.getElementById('signupFormContainer').style.display = 'none';
    document.getElementById('loginFormContainer').style.display = 'block';
    window.location.hash = '';
};

// Check URL hash on load for login page
if (window.location.hash === '#signup') {
    if (document.getElementById('signupFormContainer')) {
        showSignupForm();
    }
}