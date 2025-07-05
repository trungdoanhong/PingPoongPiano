'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, User, Shield, Crown } from 'lucide-react';
import { signInWithGoogle, signOutUser } from '@/lib/firebase-config';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginButton() {
  const { currentUser, userRole, isAdmin, isModerator } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = () => {
    if (isAdmin) return <Crown size={14} className="text-yellow-400" />;
    if (isModerator) return <Shield size={14} className="text-blue-400" />;
    return <User size={14} className="text-gray-400" />;
  };

  const getRoleBadge = () => {
    if (isAdmin) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (isModerator) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  if (currentUser) {
    return (
      <div className="flex items-center space-x-2">
        {/* User Info */}
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1">
            {getRoleIcon()}
            <span className="text-white text-sm font-semibold">
              {currentUser.displayName || currentUser.email?.split('@')[0]}
            </span>
          </div>
          <div className={`px-2 py-0.5 rounded text-xs border ${getRoleBadge()}`}>
            {userRole.toUpperCase()}
          </div>
        </div>

        {/* User Avatar */}
        {currentUser.photoURL && (
          <img
            src={currentUser.photoURL}
            alt="Profile"
            className="w-8 h-8 rounded-full border-2 border-white/20"
          />
        )}

        {/* Logout Button */}
        <motion.button
          onClick={handleSignOut}
          disabled={isLoading}
          className="bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-all duration-200 flex items-center space-x-1 disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut size={14} />
          <span className="text-sm">Đăng xuất</span>
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      onClick={handleSignIn}
      disabled={isLoading}
      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <LogIn size={16} />
      <span className="font-semibold">
        {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập Google'}
      </span>
    </motion.button>
  );
} 