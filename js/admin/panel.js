// Admin Panel Module
import { showNotification, showErrorMessage } from '../ui/notifications.js';
import { getCurrentUser, getCurrentUserRole } from '../firebase/auth.js';
import { isAdminEmail } from '../utils/helpers.js';

// Initialize Admin Panel
export async function initAdminPanel() {
    const currentRole = getCurrentUserRole();
    if (currentRole !== 'admin') {
        showErrorMessage('Access denied: Admin privileges required');
        return;
    }
    
    console.log("Initializing admin panel...");
    
    try {
        // Load all users
        await loadAllUsers();
        
        // Load all songs for admin view
        await loadAllSongsForAdmin();
        
        // Update stats
        updateAdminStats();
        
        showNotification('Admin panel loaded', 'success');
    } catch (error) {
        console.error("Error initializing admin panel:", error);
        showErrorMessage('Error loading admin panel: ' + error.message);
    }
}

// Load all users for admin
async function loadAllUsers() {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        const usersSnapshot = await window.firebaseApp.db.collection('users').orderBy('lastLogin', 'desc').get();
        const users = [];
        
        usersSnapshot.forEach(doc => {
            users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayUsers(users);
        
    } catch (error) {
        console.error("Error loading users:", error);
        showErrorMessage('Error loading users: ' + error.message);
    }
}

// Load all songs for admin
async function loadAllSongsForAdmin() {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        const songsSnapshot = await window.firebaseApp.db.collection('songs').orderBy('createdAt', 'desc').get();
        const allSongs = [];
        
        songsSnapshot.forEach(doc => {
            allSongs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayAdminSongs(allSongs);
        
    } catch (error) {
        console.error("Error loading all songs:", error);
        showErrorMessage('Error loading songs: ' + error.message);
    }
}

// Display users in admin panel
function displayUsers(users) {
    const userList = document.getElementById('user-list');
    if (!userList) return;
    
    userList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <img src="${user.photoURL || 'https://via.placeholder.com/40'}" alt="Avatar" class="user-avatar-admin">
                <div class="user-details">
                    <div class="user-name-admin">${user.displayName || user.email}</div>
                    <div class="user-email-admin">${user.email}</div>
                    <div class="user-role-badge ${user.role}">${user.role.toUpperCase()}</div>
                </div>
            </div>
            <div class="user-actions">
                <select class="role-select" data-user-id="${user.id}">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <button class="delete-user-btn" data-user-id="${user.id}" ${isAdminEmail(user.email) ? 'disabled' : ''}>Delete</button>
            </div>
        `;
        
        userList.appendChild(userItem);
    });
    
    // Add event listeners for role changes
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.getAttribute('data-user-id');
            const newRole = e.target.value;
            await changeUserRole(userId, newRole);
        });
    });
    
    // Add event listeners for user deletion
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-user-id');
            if (confirm('Are you sure you want to delete this user?')) {
                await deleteUser(userId);
            }
        });
    });
}

// Display songs in admin panel
function displayAdminSongs(songs) {
    const adminSongList = document.getElementById('admin-song-list');
    if (!adminSongList) return;
    
    adminSongList.innerHTML = '';
    
    songs.forEach(song => {
        const songItem = document.createElement('div');
        songItem.className = 'admin-song-item';
        songItem.innerHTML = `
            <div class="song-info-admin">
                <div class="song-name-admin">${song.name}</div>
                <div class="song-meta">
                    <span>By: ${song.userEmail || 'Unknown'}</span>
                    <span>Notes: ${song.notes?.length || 0}</span>
                    <span>BPM: ${song.bpm || 120}</span>
                    <span>Created: ${new Date(song.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div class="song-actions-admin">
                <button class="play-song-btn" data-song-id="${song.id}">Play</button>
                <button class="delete-song-btn" data-song-id="${song.id}">Delete</button>
            </div>
        `;
        
        adminSongList.appendChild(songItem);
    });
    
    // Add event listeners
    document.querySelectorAll('.play-song-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const songId = e.target.getAttribute('data-song-id');
            const song = songs.find(s => s.id === songId);
            playSongFromAdmin(song);
        });
    });
    
    document.querySelectorAll('.delete-song-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const songId = e.target.getAttribute('data-song-id');
            if (confirm('Are you sure you want to delete this song?')) {
                await deleteSongAsAdmin(songId);
            }
        });
    });
}

// Update admin stats
function updateAdminStats() {
    const totalUsersSpan = document.getElementById('total-users');
    const totalSongsSpan = document.getElementById('total-songs');
    
    // Count users
    const userItems = document.querySelectorAll('.user-item');
    if (totalUsersSpan) {
        totalUsersSpan.textContent = userItems.length;
    }
    
    // Count songs
    const songItems = document.querySelectorAll('.admin-song-item');
    if (totalSongsSpan) {
        totalSongsSpan.textContent = songItems.length;
    }
}

// Change user role
async function changeUserRole(userId, newRole) {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        await window.firebaseApp.db.collection('users').doc(userId).update({
            role: newRole,
            roleUpdatedAt: window.firebaseApp.db.FieldValue.serverTimestamp(),
            roleUpdatedBy: getCurrentUser()?.uid
        });
        
        showNotification(`User role updated to ${newRole}`, 'success');
        console.log(`Updated user ${userId} role to ${newRole}`);
        
        // Reload users to reflect changes
        await loadAllUsers();
        updateAdminStats();
        
    } catch (error) {
        console.error("Error changing user role:", error);
        showErrorMessage('Error updating user role: ' + error.message);
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        // Delete user document
        await window.firebaseApp.db.collection('users').doc(userId).delete();
        
        showNotification('User deleted successfully', 'success');
        console.log(`Deleted user ${userId}`);
        
        // Reload users
        await loadAllUsers();
        updateAdminStats();
        
    } catch (error) {
        console.error("Error deleting user:", error);
        showErrorMessage('Error deleting user: ' + error.message);
    }
}

// Delete song as admin
async function deleteSongAsAdmin(songId) {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        await window.firebaseApp.db.collection('songs').doc(songId).delete();
        
        showNotification('Song deleted successfully', 'success');
        console.log(`Admin deleted song ${songId}`);
        
        // Reload songs
        await loadAllSongsForAdmin();
        updateAdminStats();
        
    } catch (error) {
        console.error("Error deleting song:", error);
        showErrorMessage('Error deleting song: ' + error.message);
    }
}

// Play song from admin panel
function playSongFromAdmin(song) {
    if (!song) {
        showErrorMessage('Song not found');
        return;
    }
    
    // Set current game song
    if (window.setCurrentSong) {
        window.setCurrentSong(song);
    }
    
    // Switch to game mode
    if (window.switchMode) {
        window.switchMode('game');
    }
    
    showNotification(`Playing: ${song.name}`, 'success');
}

// Initialize admin panel controls
export function initAdminControls() {
    // Any additional admin controls can be initialized here
    console.log("Admin controls initialized");
} 