'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  Edit, 
  Trash2, 
  Crown, 
  User,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Mail,
  Calendar,
  Activity,
  TrendingUp,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  db, 
  auth,
  USER_ROLES, 
  UserRole, 
  ADMIN_EMAILS, 
  canSaveToServer,
  testFirebaseConnectivity,
  debugUserPermissions,
  isFirebaseEmulator
} from '@/lib/firebase-config';
import { ToastContainer, useToast } from './Toast';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  Timestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  createdAt?: any;
  lastLogin?: any;
  songsCreated?: number;
  totalScore?: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalSongs: number;
  totalSessions: number;
  avgSessionTime: number;
}

interface AdminPanelProps {
  isActive: boolean;
}

export default function AdminPanel({ isActive }: AdminPanelProps) {
  const { currentUser, isAdmin } = useAuth();
  const { toasts, removeToast, success, error: showError, warning, info } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    totalSongs: 0,
    totalSessions: 0,
    avgSessionTime: 0
  });
  const [selectedTab, setSelectedTab] = useState<'users' | 'analytics' | 'settings'>('users');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [systemSettings, setSystemSettings] = useState({
    userRegistration: true,
    guestAccess: true,
    dataCollection: true,
    pushNotifications: true
  });

  // Load users from Firebase
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users...');
      
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('lastLogin', 'desc')
      );
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        console.log('Users snapshot received:', snapshot.size, 'documents');
        const usersData: User[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('User data:', doc.id, data);
          usersData.push({
            uid: doc.id,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            role: data.role || USER_ROLES.USER,
            createdAt: data.createdAt,
            lastLogin: data.lastLogin,
            songsCreated: data.songsCreated || 0,
            totalScore: data.totalScore || 0
          });
        });
        
        console.log('Processed users:', usersData);
        setUsers(usersData);
        calculateStats(usersData);
        setLoading(false);
        
        if (usersData.length === 0) {
          info('No Users Found', 'No users have been registered yet.');
        }
      }, (error) => {
        console.error('Error loading users:', error);
        showError('Failed to Load Users', error.message || 'Unable to connect to database');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up user listener:', error);
      showError('Connection Error', 'Failed to connect to user database');
      setLoading(false);
    }
  };

  // Calculate system statistics
  const calculateStats = (usersData: User[]) => {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    
    const activeUsers = usersData.filter(user => {
      if (user.lastLogin) {
        const lastLogin = user.lastLogin.toDate ? user.lastLogin.toDate().getTime() : user.lastLogin;
        return lastLogin > dayAgo;
      }
      return false;
    }).length;

    const adminUsers = usersData.filter(user => user.role === USER_ROLES.ADMIN).length;
    const totalSongs = usersData.reduce((sum, user) => sum + (user.songsCreated || 0), 0);

    setStats({
      totalUsers: usersData.length,
      activeUsers,
      adminUsers,
      totalSongs,
      totalSessions: usersData.length * 3, // Mock data
      avgSessionTime: 15 // Mock data in minutes
    });
  };

  // Ensure current user exists in Firestore
  const ensureCurrentUserExists = async () => {
    if (!currentUser) return;
    
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('Creating current user in Firestore');
        await setDoc(userDocRef, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          role: isAdmin ? USER_ROLES.ADMIN : USER_ROLES.USER,
          createdAt: new Date(),
          lastLogin: new Date()
        });
        info('User Created', 'Current user has been added to the database');
      } else {
        // Update last login
        await updateDoc(userDocRef, {
          lastLogin: new Date()
        });
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  };

  useEffect(() => {
    if (isActive && isAdmin) {
      console.log('🚀 AdminPanel: Starting initialization...');
      console.log('🔐 Current user:', currentUser?.email);
      console.log('👑 Is admin:', isAdmin);
      console.log('🔥 Firebase config:', { 
        projectId: db.app.options.projectId,
        authDomain: db.app.options.authDomain 
      });
      
      // Ensure current user exists first
      ensureCurrentUserExists().then(() => {
        console.log('✅ User existence check complete');
        loadUsers().then((unsubscribe) => {
          console.log('📊 Users loaded, setting up real-time listener');
          return () => {
            if (unsubscribe) {
              console.log('🔄 Cleaning up user listener');
              unsubscribe();
            }
          };
        });
      }).catch((error) => {
        console.error('❌ Error in AdminPanel initialization:', error);
        showError('Initialization Failed', `Failed to initialize admin panel: ${error.message}`);
      });
    } else {
      console.log('⚠️ AdminPanel not active or user not admin:', { isActive, isAdmin });
    }
  }, [isActive, isAdmin, currentUser]);

  const formatLastActive = (timestamp: any) => {
    if (!timestamp) return 'Never';
    
    const lastLoginTime = timestamp.toDate ? timestamp.toDate().getTime() : timestamp;
    const diff = Date.now() - lastLoginTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Change user role
  const changeUserRole = async (uid: string, newRole: UserRole) => {
    try {
      console.log('Updating user role:', uid, 'to', newRole);
      const user = users.find(u => u.uid === uid);
      
      if (!user) {
        showError('User Not Found', 'Unable to find the user to update.');
        return;
      }
      
      // Check if current user has permission
      if (!isAdmin) {
        showError('Permission Denied', 'You do not have permission to change user roles.');
        return;
      }
      
      const userDocRef = doc(db, 'users', uid);
      console.log('Updating document:', userDocRef.path);
      
      await updateDoc(userDocRef, { 
        role: newRole,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid
      });
      
      console.log('Role updated successfully');
      success(
        'Role Updated',
        `${user.email} is now ${newRole.toUpperCase()}`
      );
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permission denied. Make sure you have admin privileges.'
        : error.message || 'There was an error updating the user role. Please try again.';
      
      showError('Failed to Update Role', errorMessage);
      setEditingUser(null);
    }
  };

  // Delete user
  const deleteUser = async (uid: string) => {
    try {
      const user = users.find(u => u.uid === uid);
      
      if (!user) {
        showError('User Not Found', 'Unable to find the user to delete.');
        return;
      }
      
      // Prevent deleting admin emails
      if (ADMIN_EMAILS.includes(user.email)) {
        showError('Cannot Delete Admin', 'Admin users cannot be deleted.');
        return;
      }
      
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);
      
      success(
        'User Deleted',
        `${user.email} has been removed from the system`
      );
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.code === 'permission-denied' 
        ? 'Permission denied. Make sure you have admin privileges.'
        : error.message || 'There was an error deleting the user. Please try again.';
      
      showError('Failed to Delete User', errorMessage);
      setShowDeleteConfirm(null);
    }
  };

  // Create test user for development
  const createTestUser = async () => {
    try {
      const testId = `test-${Date.now()}`;
      const testUserRef = doc(db, 'users', testId);
      
      await setDoc(testUserRef, {
        email: `testuser${Date.now()}@example.com`,
        displayName: `Test User ${Date.now()}`,
        role: USER_ROLES.USER,
        createdAt: new Date(),
        lastLogin: new Date(),
        songsCreated: Math.floor(Math.random() * 10),
        totalScore: Math.floor(Math.random() * 10000)
      });
      
      success('Test User Created', 'A test user has been added to the system');
    } catch (error: any) {
      console.error('Error creating test user:', error);
      showError('Failed to Create Test User', error.message);
    }
  };

  // Test Firebase connection
  const testFirebaseConnection = async () => {
    try {
      console.log('🔥 Testing Firebase connection...');
      console.log('🌍 Environment:', process.env.NODE_ENV);
      console.log('🏠 Hostname:', window.location.hostname);
      console.log('🔧 Emulator mode:', isFirebaseEmulator());
      
      // Test 1: Check auth
      console.log('👤 Auth current user:', auth.currentUser?.email);
      console.log('🆔 User UID:', auth.currentUser?.uid);
      
      // Test 2: Test basic connectivity
      const connectivityTest = await testFirebaseConnectivity();
      if (!connectivityTest.success) {
        throw new Error(`Connectivity test failed: ${connectivityTest.error}`);
      }
      console.log('✅ Basic connectivity test passed');
      
      // Test 3: Debug user permissions
      if (currentUser?.uid) {
        await debugUserPermissions(currentUser.uid);
      }
      
      // Test 4: Try to write to Firestore
      const testDocRef = doc(db, 'test', 'admin-connection-test');
      await setDoc(testDocRef, {
        timestamp: new Date(),
        testMessage: 'Admin panel connection test',
        user: currentUser?.email,
        userRole: isAdmin ? 'admin' : 'user'
      });
      console.log('✅ Admin write test successful');
      
      // Test 5: Try to read from Firestore
      const testDoc = await getDoc(testDocRef);
      if (testDoc.exists()) {
        console.log('✅ Admin read test successful:', testDoc.data());
      } else {
        console.log('❌ Admin read test failed: document not found');
      }
      
      // Test 6: Delete test document
      await deleteDoc(testDocRef);
      console.log('✅ Admin delete test successful');
      
      success('Firebase Test Passed', 'All Firebase operations working correctly');
    } catch (error: any) {
      console.error('❌ Firebase test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      showError('Firebase Test Failed', `${error.code || 'Error'}: ${error.message}`);
    }
  };

  // Test role change function
  const testRoleChange = async () => {
    try {
      if (users.length === 0) {
        showError('No Users', 'Create a test user first');
        return;
      }
      
      const testUser = users.find(u => u.email.includes('testuser'));
      if (!testUser) {
        showError('No Test User', 'Create a test user first to test role changes');
        return;
      }
      
      const newRole = testUser.role === USER_ROLES.USER ? USER_ROLES.MODERATOR : USER_ROLES.USER;
      console.log('Testing role change:', testUser.uid, 'from', testUser.role, 'to', newRole);
      
      await changeUserRole(testUser.uid, newRole);
    } catch (error: any) {
      console.error('Error testing role change:', error);
      showError('Test Failed', error.message);
    }
  };

  // Refresh data manually
  const refreshData = async () => {
    setLoading(true);
    try {
      await ensureCurrentUserExists();
      // The loadUsers function will be called automatically due to the real-time listener
      success('Data Refreshed', 'User data has been refreshed');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      showError('Refresh Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Save system settings
  const saveSystemSettings = async (newSettings: typeof systemSettings) => {
    try {
      const settingsRef = doc(db, 'settings', 'system');
      await setDoc(settingsRef, {
        ...newSettings,
        updatedAt: new Date(),
        updatedBy: currentUser?.uid
      }, { merge: true });
      
      setSystemSettings(newSettings);
      success('Settings Saved', 'System settings have been updated');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showError('Save Failed', error.message);
    }
  };

  // Load system settings
  const loadSystemSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'system');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSystemSettings({
          userRegistration: data.userRegistration ?? true,
          guestAccess: data.guestAccess ?? true,
          dataCollection: data.dataCollection ?? true,
          pushNotifications: data.pushNotifications ?? true
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    if (isActive && isAdmin) {
      loadSystemSettings();
    }
  }, [isActive, isAdmin]);

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-white/70">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
          <p>You need administrator privileges to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row relative z-20">
      {/* Mobile Header */}
      <div className="lg:hidden bg-black/40 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="text-red-400" size={20} />
            <h2 className="text-white text-lg font-bold">Admin Panel</h2>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <Crown size={12} className="text-yellow-400" />
            <span className="text-white/70">{currentUser?.email?.split('@')[0]}</span>
          </div>
        </div>
        
        {/* Mobile Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 p-2 rounded-lg text-xs transition-all duration-200 ${
                selectedTab === tab.id
                  ? 'bg-red-600/30 text-red-200 border border-red-400'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 bg-black/40 backdrop-blur-sm border-r border-white/20 p-4">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="text-red-400" size={24} />
          <h2 className="text-white text-xl font-bold">Admin Panel</h2>
        </div>

        <nav className="space-y-2">
          {[
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <motion.button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all duration-200 ${
                selectedTab === tab.id
                  ? 'bg-red-600/30 text-red-200 border border-red-400'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              whileHover={{ x: 4 }}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </nav>

        {/* Admin Info */}
        <div className="mt-6 p-3 bg-red-600/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Crown size={16} className="text-yellow-400" />
            <span className="text-white text-sm font-semibold">Administrator</span>
          </div>
          <p className="text-white/70 text-xs">
            {currentUser?.email}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-3 text-white">
              <RefreshCw className="animate-spin" size={24} />
              <span>Loading admin data...</span>
            </div>
          </div>
        ) : (
          <>
            {selectedTab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                  <h1 className="text-2xl lg:text-3xl font-bold text-white">User Management</h1>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔄 Header Refresh button clicked');
                      refreshData();
                    }}
                    className="flex items-center space-x-2 bg-blue-600/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-600/30 transition-colors text-sm cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                  <div className="bg-black/40 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl lg:text-2xl font-bold text-blue-400">{stats.totalUsers}</div>
                        <div className="text-white/70 text-xs lg:text-sm">Total Users</div>
                      </div>
                      <Users className="text-blue-400" size={16} />
                    </div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl lg:text-2xl font-bold text-green-400">{stats.activeUsers}</div>
                        <div className="text-white/70 text-xs lg:text-sm">Active Today</div>
                      </div>
                      <Activity className="text-green-400" size={16} />
                    </div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl lg:text-2xl font-bold text-red-400">{stats.adminUsers}</div>
                        <div className="text-white/70 text-xs lg:text-sm">Admins</div>
                      </div>
                      <Crown className="text-red-400" size={16} />
                    </div>
                  </div>
                  <div className="bg-black/40 backdrop-blur-sm p-3 lg:p-4 rounded-lg border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl lg:text-2xl font-bold text-purple-400">{stats.totalSongs}</div>
                        <div className="text-white/70 text-xs lg:text-sm">Total Songs</div>
                      </div>
                      <Database className="text-purple-400" size={16} />
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden">
                  <div className="p-3 lg:p-4 border-b border-white/20">
                    <h3 className="text-white font-semibold text-sm lg:text-base">All Users ({users.length})</h3>
                  </div>
                  
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">User</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Email</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Role</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Last Login</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Songs</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Score</th>
                          <th className="text-left p-4 text-white/70 font-semibold text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <motion.tr
                            key={user.uid}
                            className="border-b border-white/10 hover:bg-white/5"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td className="p-4">
                              <div className="flex items-center space-x-3">
                                {user.photoURL ? (
                                  <img
                                    src={user.photoURL}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {(user.displayName || user.email)?.[0]?.toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="text-white font-semibold text-sm">
                                    {user.displayName || user.email?.split('@')[0]}
                                  </span>
                                  {ADMIN_EMAILS.includes(user.email) && (
                                    <Crown size={12} className="inline ml-1 text-yellow-400" />
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-white/70 text-sm">{user.email}</td>
                            <td className="p-4">
                              {editingUser === user.uid ? (
                                <select
                                  value={user.role}
                                  onChange={(e) => changeUserRole(user.uid, e.target.value as UserRole)}
                                  onBlur={() => setEditingUser(null)}
                                  className="bg-black/60 text-white border border-white/20 rounded px-2 py-1 text-sm"
                                  autoFocus
                                >
                                  <option value={USER_ROLES.USER}>User</option>
                                  <option value={USER_ROLES.MODERATOR}>Moderator</option>
                                  <option value={USER_ROLES.ADMIN}>Admin</option>
                                </select>
                              ) : (
                                <span 
                                  className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                                    user.role === USER_ROLES.ADMIN
                                      ? 'bg-red-500/20 text-red-300' 
                                      : user.role === USER_ROLES.MODERATOR
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-gray-500/20 text-gray-300'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🎯 Desktop role badge clicked for user:', user.uid, 'current role:', user.role);
                                    setEditingUser(user.uid);
                                  }}
                                >
                                  {user.role.toUpperCase()}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-white/70 text-sm">{formatLastActive(user.lastLogin)}</td>
                            <td className="p-4 text-white/70 text-sm">{user.songsCreated || 0}</td>
                            <td className="p-4 text-white/70 text-sm">{(user.totalScore || 0).toLocaleString()}</td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('🖱️ Edit button clicked for user:', user.uid);
                                    setEditingUser(user.uid);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 p-1 cursor-pointer"
                                  title="Edit Role"
                                >
                                  <Edit size={14} />
                                </button>
                                {!ADMIN_EMAILS.includes(user.email) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('🗑️ Desktop delete button clicked for user:', user.uid);
                                      setShowDeleteConfirm(user.uid);
                                    }}
                                    className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden space-y-2 p-3">
                    {users.map(user => (
                      <motion.div
                        key={user.uid}
                        className="bg-white/5 rounded-lg p-3 border border-white/10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt="Profile"
                                className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 mt-0.5">
                                {(user.displayName || user.email)?.[0]?.toUpperCase()}
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              {/* Name + Role + Stats Line */}
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                                <span className="text-white font-semibold text-sm">
                                  {user.displayName || user.email?.split('@')[0]}
                                </span>
                                {ADMIN_EMAILS.includes(user.email) && (
                                  <Crown size={12} className="text-yellow-400 flex-shrink-0" />
                                )}
                                <div className="flex-shrink-0">
                                  {editingUser === user.uid ? (
                                    <select
                                      value={user.role}
                                      onChange={(e) => changeUserRole(user.uid, e.target.value as UserRole)}
                                      onBlur={() => setEditingUser(null)}
                                      className="bg-black/60 text-white border border-white/20 rounded px-1 py-0.5 text-xs"
                                      autoFocus
                                    >
                                      <option value={USER_ROLES.USER}>User</option>
                                      <option value={USER_ROLES.MODERATOR}>Moderator</option>
                                      <option value={USER_ROLES.ADMIN}>Admin</option>
                                    </select>
                                  ) : (
                                    <span 
                                      className={`px-1.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                                        user.role === USER_ROLES.ADMIN
                                          ? 'bg-red-500/20 text-red-300' 
                                          : user.role === USER_ROLES.MODERATOR
                                          ? 'bg-blue-500/20 text-blue-300'
                                          : 'bg-gray-500/20 text-gray-300'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('📱 Mobile role badge clicked for user:', user.uid, 'current role:', user.role);
                                        setEditingUser(user.uid);
                                      }}
                                    >
                                      {user.role.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Stats inline */}
                                <div className="flex items-center flex-wrap gap-x-2 text-xs text-white/60">
                                  <span className="flex items-center space-x-1">
                                    <span className="text-white/40">Last:</span>
                                    <span>{formatLastActive(user.lastLogin)}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <span className="text-white/40">Songs:</span>
                                    <span>{user.songsCreated || 0}</span>
                                  </span>
                                  <span className="flex items-center space-x-1">
                                    <span className="text-white/40">Score:</span>
                                    <span>{(user.totalScore || 0).toLocaleString()}</span>
                                  </span>
                                </div>
                              </div>
                              
                              {/* Email */}
                              <p className="text-white/70 text-xs truncate">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('📱 Mobile edit button clicked for user:', user.uid);
                                setEditingUser(user.uid);
                              }}
                              className="text-blue-400 hover:text-blue-300 p-1.5 cursor-pointer"
                              title="Edit Role"
                            >
                              <Edit size={14} />
                            </button>
                            {!ADMIN_EMAILS.includes(user.email) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🗑️ Mobile delete button clicked for user:', user.uid);
                                  setShowDeleteConfirm(user.uid);
                                }}
                                className="text-red-400 hover:text-red-300 p-1.5 cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'analytics' && (
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6">Analytics Dashboard</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                  <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                    <h3 className="text-white font-semibold mb-4 flex items-center">
                      <TrendingUp className="mr-2" size={20} />
                      User Activity
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/70">Daily Active Users</span>
                        <span className="text-green-400 font-semibold">{stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Users</span>
                        <span className="text-blue-400 font-semibold">{stats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Admin Users</span>
                        <span className="text-red-400 font-semibold">{stats.adminUsers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                    <h3 className="text-white font-semibold mb-4 flex items-center">
                      <Database className="mr-2" size={20} />
                      Content Statistics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Songs</span>
                        <span className="text-pink-400 font-semibold">{stats.totalSongs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Avg Songs per User</span>
                        <span className="text-cyan-400 font-semibold">
                          {stats.totalUsers > 0 ? Math.round(stats.totalSongs / stats.totalUsers) : 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Total Sessions</span>
                        <span className="text-purple-400 font-semibold">{stats.totalSessions}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 backdrop-blur-sm p-4 lg:p-6 rounded-lg border border-white/20">
                  <h3 className="text-white font-semibold mb-4 text-sm lg:text-base">Usage Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-400 mb-1">{stats.avgSessionTime}m</div>
                      <div className="text-white/70 text-sm">Avg Session Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                      </div>
                      <div className="text-white/70 text-sm">User Retention</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        {stats.totalUsers > 0 ? Math.round(stats.totalSessions / stats.totalUsers) : 0}
                      </div>
                      <div className="text-white/70 text-sm">Sessions per User</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'settings' && (
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-6">System Settings</h1>
                
                <div className="space-y-4 lg:space-y-6">
                  <div className="bg-black/40 backdrop-blur-sm p-4 lg:p-6 rounded-lg border border-white/20">
                    <h3 className="text-white font-semibold mb-4 text-sm lg:text-base">Application Settings</h3>
                    <div className="space-y-4">
                      {Object.entries(systemSettings).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                          <div className="flex-1">
                            <span className="text-white font-medium capitalize text-sm lg:text-base">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <p className="text-white/70 text-xs lg:text-sm">
                              {key === 'userRegistration' && 'Allow new users to register'}
                              {key === 'guestAccess' && 'Allow guest users to access app'}
                              {key === 'dataCollection' && 'Collect usage analytics'}
                              {key === 'pushNotifications' && 'Enable push notifications'}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const newSettings = { ...systemSettings, [key]: !value };
                              saveSystemSettings(newSettings);
                            }}
                            className={`w-12 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                              value ? 'bg-green-600' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-0.5'
                            }`}></div>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-white/20">
                    <h3 className="text-white font-semibold mb-4">Admin Configuration</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-white/70">Admin Emails</span>
                        <span className="text-green-400 font-semibold">{ADMIN_EMAILS.length}</span>
                      </div>
                      <div className="text-sm text-white/60">
                        {ADMIN_EMAILS.map(email => (
                          <div key={email} className="flex items-center space-x-2 py-1">
                            <Mail size={12} />
                            <span>{email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-sm p-4 lg:p-6 rounded-lg border border-white/20">
                    <h3 className="text-white font-semibold mb-4 text-sm lg:text-base">Development Tools</h3>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm lg:text-base">Create Test User</span>
                          <p className="text-white/70 text-xs lg:text-sm">Add a test user for development purposes</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔨 Create Test User button clicked');
                            createTestUser();
                          }}
                          className="bg-purple-600/20 text-purple-300 px-3 py-2 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center space-x-2 text-sm flex-shrink-0 cursor-pointer"
                        >
                          <User size={14} />
                          <span className="hidden sm:inline">Create Test User</span>
                          <span className="sm:hidden">Create</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm lg:text-base">Force Refresh</span>
                          <p className="text-white/70 text-xs lg:text-sm">Manually refresh all data from the database</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔄 Refresh Data button clicked');
                            refreshData();
                          }}
                          className="bg-blue-600/20 text-blue-300 px-3 py-2 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center space-x-2 text-sm flex-shrink-0 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                          <span className="hidden sm:inline">Refresh Data</span>
                          <span className="sm:hidden">Refresh</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm lg:text-base">Debug Console</span>
                          <p className="text-white/70 text-xs lg:text-sm">Open browser console to see detailed logs</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🐛 Debug Console button clicked');
                            console.log('=== DEBUG INFO ===');
                            console.log('Current User:', currentUser);
                            console.log('Is Admin:', isAdmin);
                            console.log('Users loaded:', users.length);
                            console.log('Users:', users);
                            console.log('Editing User:', editingUser);
                            console.log('Firebase Auth:', auth.currentUser);
                            console.log('Admin Emails:', ADMIN_EMAILS);
                            info('Debug Info', 'Check browser console for detailed logs');
                          }}
                          className="bg-yellow-600/20 text-yellow-300 px-3 py-2 rounded-lg hover:bg-yellow-600/30 transition-colors flex items-center space-x-2 text-sm flex-shrink-0 cursor-pointer"
                        >
                          <Settings size={14} />
                          <span className="hidden sm:inline">Debug Console</span>
                          <span className="sm:hidden">Debug</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm lg:text-base">Test Firebase Connection</span>
                          <p className="text-white/70 text-xs lg:text-sm">Test Firestore read/write operations and permissions</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔥 Test Firebase button clicked');
                            testFirebaseConnection();
                          }}
                          className="bg-orange-600/20 text-orange-300 px-3 py-2 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center space-x-2 text-sm flex-shrink-0 cursor-pointer"
                        >
                          <Database size={14} />
                          <span className="hidden sm:inline">Test Firebase</span>
                          <span className="sm:hidden">Test DB</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm lg:text-base">Test Role Change</span>
                          <p className="text-white/70 text-xs lg:text-sm">Test role changing functionality with a test user</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🧪 Test Role Change button clicked');
                            testRoleChange();
                          }}
                          className="bg-green-600/20 text-green-300 px-3 py-2 rounded-lg hover:bg-green-600/30 transition-colors flex items-center space-x-2 text-sm flex-shrink-0 cursor-pointer"
                        >
                          <Edit size={14} />
                          <span className="hidden sm:inline">Test Role Change</span>
                          <span className="sm:hidden">Test Role</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-lg border border-red-500/50 max-w-md mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="text-red-400" size={24} />
                <h3 className="text-white text-xl font-semibold">Delete User</h3>
              </div>
              <p className="text-white/70 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => deleteUser(showDeleteConfirm)}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Check size={16} />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
       
       {/* Toast Notifications */}
       <ToastContainer toasts={toasts} onClose={removeToast} />
     </div>
   );
} 