'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, getUserRole, updateUserLastLogin, UserRole, USER_ROLES } from '@/lib/firebase-config';

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(USER_ROLES.USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user && user.email) {
        try {
          // Get user role from Firestore
          const role = await getUserRole(user.uid, user.email);
          setUserRole(role);
          
          // Update last login
          await updateUserLastLogin(user.uid);
          
          console.log(`User authenticated: ${user.email} with role: ${role}`);
        } catch (error) {
          console.error('Error getting user role:', error);
          setUserRole(USER_ROLES.USER);
        }
      } else {
        setUserRole(USER_ROLES.USER);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userRole === USER_ROLES.ADMIN;
  const isModerator = userRole === USER_ROLES.MODERATOR;

  const value: AuthContextType = {
    currentUser,
    userRole,
    loading,
    isAdmin,
    isModerator
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 