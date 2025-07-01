// Firebase Authentication Module
import { showNotification, showErrorMessage } from '../ui/notifications.js';

let currentUser = null;
let currentUserRole = 'user';
let auth, db, googleProvider;

// Initialize Firebase auth
export function initFirebaseAuth() {
    if (window.firebaseApp) {
        auth = window.firebaseApp.auth;
        db = window.firebaseApp.db;
        googleProvider = window.firebaseApp.googleProvider;
        
        // Listen for auth state changes
        auth.onAuthStateChanged(handleAuthStateChange);
        
        console.log("Firebase auth initialized");
        return true;
    } else {
        console.error("Firebase not available");
        return false;
    }
}

// Handle auth state changes
async function handleAuthStateChange(user) {
    if (user) {
        console.log("User signed in:", user.email);
        currentUser = user;
        
        try {
            // Get user role from Firestore
            if (window.firebaseApp && window.firebaseApp.getUserRole) {
                currentUserRole = await window.firebaseApp.getUserRole(user.uid, user.email);
            } else {
                currentUserRole = 'user';
            }
            
            updateUserUI(user, currentUserRole);
            showNotification(`Đăng nhập thành công: ${user.displayName || user.email}`, 'success');
        } catch (error) {
            console.error("Error getting user role:", error);
            currentUserRole = 'user';
            updateUserUI(user, currentUserRole);
        }
    } else {
        console.log("User signed out");
        currentUser = null;
        currentUserRole = 'user';
        updateUserUI(null, 'user');
    }
}

// Google Sign In
export async function signInWithGoogle() {
    try {
        console.log("Attempting Google sign in...");
        
        if (!auth || !googleProvider) {
            throw new Error("Firebase auth not initialized");
        }
        
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        
        console.log("Google sign in successful:", user.email);
        
        // User role will be handled in onAuthStateChanged
        return user;
    } catch (error) {
        console.error("Google sign in error:", error);
        
        let errorMessage = "Đăng nhập thất bại";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Đăng nhập bị hủy bởi người dùng";
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = "Popup bị chặn. Vui lòng cho phép popup và thử lại";
        }
        
        showErrorMessage(errorMessage);
        throw error;
    }
}

// Sign Out
export async function signOut() {
    try {
        if (!auth) {
            throw new Error("Firebase auth not initialized");
        }
        
        await auth.signOut();
        console.log("User signed out successfully");
        showNotification("Đăng xuất thành công", 'info');
    } catch (error) {
        console.error("Sign out error:", error);
        showErrorMessage("Lỗi khi đăng xuất");
        throw error;
    }
}

// Update user UI
function updateUserUI(user, role) {
    const userPanel = document.getElementById('user-panel');
    const userInfo = document.getElementById('user-info');
    const loginPanel = document.getElementById('login-panel');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const forceAdminBtn = document.getElementById('force-admin-btn');
    
    if (user) {
        // User is signed in
        if (userInfo) userInfo.style.display = 'flex';
        if (loginPanel) loginPanel.style.display = 'none';
        
        if (userAvatar) userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        if (userName) {
            const displayName = truncateNameForMobile(user.displayName || user.email);
            userName.textContent = displayName;
            userName.title = user.displayName || user.email; // Show full name on hover
        }
        if (userRole) {
            userRole.textContent = role.toUpperCase();
            userRole.className = `user-role ${role}`;
        }
        
        // Show force admin button for admin email (for testing)
        if (forceAdminBtn && window.firebaseApp && window.firebaseApp.isAdmin && window.firebaseApp.isAdmin(user.email)) {
            forceAdminBtn.style.display = 'inline-block';
        } else if (forceAdminBtn) {
            forceAdminBtn.style.display = 'none';
        }
        
        // Update save mode options based on role
        updateSaveModeOptions(role);
        
        // Show/hide admin menu item
        updateAdminMenuVisibility(role);
    } else {
        // User is signed out
        if (userInfo) userInfo.style.display = 'none';
        if (loginPanel) loginPanel.style.display = 'block';
        if (forceAdminBtn) forceAdminBtn.style.display = 'none';
        
        // Update save mode options for guest
        updateSaveModeOptions('user');
        
        // Hide admin menu item
        updateAdminMenuVisibility('user');
    }
}

// Update save mode options based on user role
function updateSaveModeOptions(role) {
    const serverModeRadio = document.querySelector('input[name="save-mode"][value="server"]');
    const serverModeOption = serverModeRadio?.closest('.save-mode-option');
    
    if (role === 'admin' || role === 'moderator') {
        // Enable server mode
        if (serverModeRadio) serverModeRadio.disabled = false;
        if (serverModeOption) {
            serverModeOption.style.opacity = '1';
            serverModeOption.style.pointerEvents = 'auto';
        }
    } else {
        // Disable server mode
        if (serverModeRadio) {
            serverModeRadio.disabled = true;
            serverModeRadio.checked = false;
        }
        if (serverModeOption) {
            serverModeOption.style.opacity = '0.5';
            serverModeOption.style.pointerEvents = 'none';
        }
        
        // Force local mode
        const localModeRadio = document.querySelector('input[name="save-mode"][value="local"]');
        if (localModeRadio) localModeRadio.checked = true;
    }
}

// Update admin menu item visibility
function updateAdminMenuVisibility(role) {
    const adminMenuItem = document.querySelector('.menu-item[data-mode="admin"]');
    if (adminMenuItem) {
        if (role === 'admin') {
            adminMenuItem.style.display = 'block';
        } else {
            adminMenuItem.style.display = 'none';
        }
    }
}

// Force admin role (for testing)
export async function forceAdminRole() {
    try {
        if (!currentUser) {
            showErrorMessage("Vui lòng đăng nhập trước");
            return;
        }
        
        if (!window.firebaseApp || !window.firebaseApp.forceAdminRole) {
            showErrorMessage("Firebase functions not available");
            return;
        }
        
        console.log("Forcing admin role for:", currentUser.email);
        const newRole = await window.firebaseApp.forceAdminRole(currentUser.uid, currentUser.email);
        
        currentUserRole = newRole;
        updateUserUI(currentUser, currentUserRole);
        
        showNotification("Admin role granted!", 'success');
    } catch (error) {
        console.error("Error forcing admin role:", error);
        showErrorMessage("Không thể cập nhật quyền admin: " + error.message);
    }
}

// Initialize authentication controls
export function initAuthControls() {
    console.log("🔐 Initializing auth controls...");
    
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const forceAdminBtn = document.getElementById('force-admin-btn');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', function(e) {
            console.log("Google login button clicked");
            e.preventDefault();
            signInWithGoogle();
        });
        console.log("✅ Google login button event listener added");
    } else {
        console.warn("❌ Google login button not found");
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            console.log("Logout button clicked");
            e.preventDefault();
            signOut();
        });
        console.log("✅ Logout button event listener added");
    } else {
        console.log("ℹ️ Logout button not found (normal if user not logged in)");
    }
    
    if (forceAdminBtn) {
        forceAdminBtn.addEventListener('click', function(e) {
            console.log("Force admin button clicked");
            e.preventDefault();
            forceAdminRole();
        });
        console.log("✅ Force admin button event listener added");
    } else {
        console.log("ℹ️ Force admin button not found (normal if user not admin)");
    }
    
    console.log("✅ Auth controls initialized");
}

// Getters
export function getCurrentUser() {
    return currentUser;
}

export function getCurrentUserRole() {
    return currentUserRole;
}

export function isAdmin() {
    return currentUserRole === 'admin';
}

export function canSaveToServer() {
    return currentUserRole === 'admin' || currentUserRole === 'moderator';
}

// Mobile-friendly name truncation
function truncateNameForMobile(fullName) {
    if (!fullName) return '';
    
    // Check if we're on mobile
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return fullName;
    
    // For mobile, use only first name if name is too long
    const names = fullName.trim().split(' ');
    const firstName = names[0];
    
    // If first name is still too long, truncate it
    if (firstName.length > 8) {
        return firstName.substring(0, 6) + '...';
    }
    
    // If full name is short enough, use it
    if (fullName.length <= 12) {
        return fullName;
    }
    
    // Otherwise, use first name only
    return firstName;
}

// Handle responsive name updates on window resize
function handleResponsiveNameUpdate() {
    if (currentUser) {
        updateUserUI(currentUser, currentUserRole);
    }
}

// Add window resize listener for responsive name updates
window.addEventListener('resize', debounce(handleResponsiveNameUpdate, 250));

// Debounce function to limit resize event calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
} 