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

// Admin emails
const ADMIN_EMAILS = [
  'trungdoanhong@gmail.com',
  'jonyvanthan@gmail.com'
];

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
  const isAdminUser = ADMIN_EMAILS.includes(email);
  console.log('Checking if admin:', {
    email: email,
    adminEmails: ADMIN_EMAILS,
    isAdminUser: isAdminUser,
    emailType: typeof email,
    emailTrimmed: email?.trim()
  });
  return isAdminUser;
}

// Check if user can save to server (admin or moderator)
function canSaveToServer(role) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MODERATOR;
}

// Get user role from Firestore
async function getUserRole(uid, email) {
  try {
    console.log('Getting user role for:', email, 'Admin emails:', ADMIN_EMAILS);
    console.log('Is admin check:', ADMIN_EMAILS.includes(email));
    
    // Always check if user should be admin first
    const shouldBeAdmin = isAdmin(email);
    const correctRole = shouldBeAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER;
    
    // If user is admin email, return admin role regardless of Firestore
    if (shouldBeAdmin) {
      console.log('User is admin email, returning admin role');
      return USER_ROLES.ADMIN;
    }
    
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        const currentRole = userDoc.data().role || USER_ROLES.USER;
        
        // Update last login
        try {
          await db.collection('users').doc(uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (updateError) {
          console.warn('Could not update last login:', updateError.message);
        }
        
        return currentRole;
      } else {
        // First time user - set role
        console.log('Creating new user with role:', correctRole);
        try {
          await db.collection('users').doc(uid).set({
            email: email,
            role: correctRole,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (createError) {
          console.warn('Could not create user record:', createError.message);
        }
        return correctRole;
      }
    } catch (firestoreError) {
      console.warn('Firestore error, returning default role:', firestoreError.message);
      // If Firestore fails, return the correct role based on email
      return correctRole;
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    // If user should be admin, return admin even on error
    const shouldBeAdmin = isAdmin(email);
    return shouldBeAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER;
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

// Force update user to admin role
async function forceAdminRole(uid, email) {
  try {
    console.log('Forcing admin role for:', email);
    
    // If user is admin email, bypass Firestore and return admin role
    if (ADMIN_EMAILS.includes(email)) {
      console.log('User is admin email, bypassing Firestore check');
      return USER_ROLES.ADMIN;
    }
    
    // Try to update Firestore, but if it fails due to permissions, still return admin for admin email
    try {
      await db.collection('users').doc(uid).set({
        email: email,
        role: USER_ROLES.ADMIN,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        forceUpdated: true
      }, { merge: true });
      console.log('Successfully forced admin role in Firestore');
    } catch (firestoreError) {
      console.warn('Firestore permission error, but user is admin:', firestoreError.message);
      // If it's an admin email, we still return admin role even if Firestore fails
      if (ADMIN_EMAILS.includes(email)) {
        console.log('Bypassing Firestore error for admin user');
        return USER_ROLES.ADMIN;
      }
      throw firestoreError;
    }
    
    return USER_ROLES.ADMIN;
  } catch (error) {
    console.error('Error forcing admin role:', error);
    throw error;
  }
}

// Delete user record from Firestore
async function deleteUserRecord(uid) {
  try {
    console.log('Deleting user record for UID:', uid);
    await db.collection('users').doc(uid).delete();
    console.log('Successfully deleted user record');
  } catch (error) {
    console.error('Error deleting user record:', error);
    throw error;
  }
}

// Export for use in other files
window.firebaseApp = {
  auth,
  db,
  googleProvider,
  ADMIN_EMAILS,
  USER_ROLES,
  currentUser,
  currentUserRole,
  isAdmin,
  canSaveToServer,
  getUserRole,
  updateUserLastLogin,
  forceAdminRole,
  deleteUserRecord
}; 