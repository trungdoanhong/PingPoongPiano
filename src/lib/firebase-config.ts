import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Admin emails
export const ADMIN_EMAILS = [
  'trungdoanhong@gmail.com',
  'jonyvanthan@gmail.com'
];

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator', 
  USER: 'user'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Check if user is admin
export function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Check if user can save to server (admin or moderator)
export function canSaveToServer(role: UserRole): boolean {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.MODERATOR;
}

// Get user role from Firestore and ensure user exists
export async function getUserRole(uid: string, email: string): Promise<UserRole> {
  try {
    // Always check if user should be admin first
    const shouldBeAdmin = isAdmin(email);
    const correctRole = shouldBeAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER;
    
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentRole = userData.role || USER_ROLES.USER;
        
        // Update role if user should be admin but isn't
        const updateData: any = {
          lastLogin: serverTimestamp()
        };
        
        if (shouldBeAdmin && currentRole !== USER_ROLES.ADMIN) {
          updateData.role = USER_ROLES.ADMIN;
          console.log('Updating user to admin role');
        }
        
        // Update user info from current auth user
        const currentUser = auth.currentUser;
        if (currentUser) {
          updateData.displayName = currentUser.displayName || userData.displayName;
          updateData.photoURL = currentUser.photoURL || userData.photoURL;
          updateData.email = currentUser.email || userData.email;
        }
        
        try {
          await updateDoc(userDocRef, updateData);
        } catch (updateError) {
          console.warn('Could not update user data:', updateError);
        }
        
        return shouldBeAdmin ? USER_ROLES.ADMIN : (currentRole as UserRole);
      } else {
        // First time user - create complete profile
        console.log('Creating new user with role:', correctRole);
        const currentUser = auth.currentUser;
        
        try {
          await setDoc(userDocRef, {
            email: email,
            displayName: currentUser?.displayName || null,
            photoURL: currentUser?.photoURL || null,
            role: correctRole,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            songsCreated: 0,
            totalScore: 0
          });
          console.log('User created successfully in Firestore');
        } catch (createError) {
          console.warn('Could not create user record:', createError);
        }
        return correctRole;
      }
    } catch (firestoreError) {
      console.warn('Firestore error, returning default role:', firestoreError);
      return correctRole;
    }
  } catch (error) {
    console.error('Error getting user role:', error);
    const shouldBeAdmin = isAdmin(email);
    return shouldBeAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER;
  }
}

// Google Sign In
export async function signInWithGoogle(): Promise<{ user: User; role: UserRole } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    if (user && user.email) {
      const role = await getUserRole(user.uid, user.email);
      console.log(`User ${user.email} signed in with role: ${role}`);
      return { user, role };
    }
    
    return null;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log('User signed out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Update user last login
export async function updateUserLastLogin(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// Debug helper function to test Firebase connectivity
export async function testFirebaseConnectivity(): Promise<{success: boolean, error?: string}> {
  try {
    // Test basic Firestore connection
    const testDocRef = doc(db, 'connectivity-test', 'test');
    await setDoc(testDocRef, {
      timestamp: new Date(),
      test: true
    });
    
    const testDoc = await getDoc(testDocRef);
    if (!testDoc.exists()) {
      throw new Error('Document write/read test failed');
    }
    
    // Clean up
    await updateDoc(testDocRef, { cleaned: true });
    
    return { success: true };
  } catch (error: any) {
    console.error('Firebase connectivity test failed:', error);
    return { 
      success: false, 
      error: `${error.code || 'unknown'}: ${error.message}` 
    };
  }
}

// Debug function to check current user permissions
export async function debugUserPermissions(uid: string): Promise<void> {
  try {
    console.log('🔍 Debugging user permissions for:', uid);
    
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📋 User data:', userData);
      console.log('👤 User role:', userData.role);
      console.log('📧 User email:', userData.email);
      console.log('🕒 Last login:', userData.lastLogin);
    } else {
      console.log('❌ User document does not exist in Firestore');
    }
    
    // Test if we can write to users collection
    try {
      await updateDoc(userDocRef, {
        lastDebugCheck: new Date()
      });
      console.log('✅ Can write to user document');
    } catch (writeError) {
      console.log('❌ Cannot write to user document:', writeError);
    }
    
  } catch (error) {
    console.error('❌ Error debugging user permissions:', error);
  }
}

// Check if Firebase is in emulator mode
export function isFirebaseEmulator(): boolean {
  return process.env.NODE_ENV === 'development' && 
         (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === 'true' ||
          window.location.hostname === 'localhost');
}

export default app; 