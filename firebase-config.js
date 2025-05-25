// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNeSH1py2mpGp9_8CQZHyRW27Gd8ujV8s",
  authDomain: "pinkpoongpiano.firebaseapp.com",
  projectId: "pinkpoongpiano",
  storageBucket: "pinkpoongpiano.firebasestorage.app",
  messagingSenderId: "986795675541",
  appId: "1:986795675541:web:4d4f72a1b5a9515d34309c",
  measurementId: "G-DE7KF4BMCQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Admin email
const ADMIN_EMAIL = 'trungdoanhong@gmail.com';

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator', 
  USER: 'user'
};

// Current user info
let currentUser = null;
let currentUserRole = USER_ROLES.USER;

// Check if user is admin
function isAdmin(email) {
  return email === ADMIN_EMAIL;
}

// Check if user can save to server (admin or moderator)
function canSaveToServer(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MODERATOR;
}

// Get user role from Firestore
async function getUserRole(uid, email) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (userDoc.exists) {
      return userDoc.data().role || USER_ROLES.USER;
    } else {
      // First time user - set role
      const role = isAdmin(email) ? USER_ROLES.ADMIN : USER_ROLES.USER;
      await db.collection('users').doc(uid).set({
        email: email,
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      return role;
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    return USER_ROLES.USER;
  }
}

// Update user last login
async function updateUserLastLogin(uid) {
  try {
    await db.collection('users').doc(uid).update({
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// Export for use in other files
window.firebaseApp = {
  auth,
  db,
  googleProvider,
  ADMIN_EMAIL,
  USER_ROLES,
  currentUser,
  currentUserRole,
  isAdmin,
  canSaveToServer,
  getUserRole,
  updateUserLastLogin
}; 