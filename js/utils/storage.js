// Storage Utilities
import { STORAGE_CONFIG } from '../config/constants.js';
import { isLocalStorageAvailable, cleanupDuplicates } from './helpers.js';

let songs = [];

// Get songs array
export function getSongs() {
    return songs;
}

// Set songs array
export function setSongs(newSongs) {
    songs = newSongs;
}

// Check localStorage size and diagnostics
export function checkLocalStorageSize() {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn("localStorage is not available");
            return { total: 0, available: 0, used: 0, error: "localStorage not available" };
        }

        let total = 0;
        let used = 0;
        
        // Calculate used space
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                used += localStorage[key].length;
            }
        }
        
        // Estimate total space (most browsers have 5-10MB)
        try {
            let testKey = 'storage_test';
            let data = '0123456789';
            let iterations = 0;
            
            while (iterations < 100) { // Limit test to prevent browser hang
                try {
                    localStorage.setItem(testKey, data);
                    data += data;
                    iterations++;
                } catch (e) {
                    localStorage.removeItem(testKey);
                    total = used + data.length;
                    break;
                }
            }
        } catch (e) {
            total = 5 * 1024 * 1024; // Default 5MB estimate
        }
        
        return {
            total: total,
            used: used,
            available: total - used,
            percentage: ((used / total) * 100).toFixed(2)
        };
    } catch (e) {
        console.error("Error checking localStorage size:", e);
        return { total: 0, available: 0, used: 0, error: e.message };
    }
}

// Initialize storage diagnostics
export function initStorageDiagnostics() {
    const storageInfo = checkLocalStorageSize();
    console.log("=== STORAGE DIAGNOSTICS ===");
    console.log("localStorage available:", isLocalStorageAvailable());
    console.log("Storage info:", storageInfo);
    
    if (storageInfo.error) {
        console.error("Storage error:", storageInfo.error);
    } else {
        console.log(`Storage usage: ${storageInfo.used} bytes / ${storageInfo.total} bytes (${storageInfo.percentage}%)`);
        
        if (storageInfo.percentage > 80) {
            console.warn("⚠️ localStorage usage is high! Consider cleaning up old data.");
        }
    }
    
    // Log song data size
    try {
        const savedSongs = localStorage.getItem(STORAGE_CONFIG.localStorageKeys.songs);
        if (savedSongs) {
            console.log("Songs data size:", savedSongs.length, "bytes");
            const parsedSongs = JSON.parse(savedSongs);
            console.log("Number of songs:", parsedSongs.length);
        }
    } catch (e) {
        console.error("Error checking songs data:", e);
    }
}

// Load songs from localStorage
export function loadSongsFromLocalStorage() {
    try {
        if (!isLocalStorageAvailable()) {
            console.error("localStorage is not available");
            songs = [];
            return Promise.resolve();
        }

        const savedSongs = localStorage.getItem(STORAGE_CONFIG.localStorageKeys.songs);
        console.log("Checking localStorage for songs...");
        
        if (savedSongs) {
            try {
                songs = JSON.parse(savedSongs);
                
                if (!Array.isArray(songs)) {
                    console.error("Loaded data is not an array:", songs);
                    songs = [];
                } else {
                    console.log("Loaded songs from localStorage:", songs.length, "songs");
                }
            } catch (parseError) {
                console.error("Failed to parse saved songs:", parseError);
                songs = [];
            }
        } else {
            console.log("No songs found in localStorage");
            songs = [];
        }
        
        return Promise.resolve();
    } catch (e) {
        console.error("Error loading songs from localStorage:", e);
        songs = [];
        return Promise.resolve();
    }
}

// Save songs to localStorage
export function saveSongsToLocalStorage(songsToSave = null) {
    try {
        if (!isLocalStorageAvailable()) {
            console.error("localStorage is not available");
            throw new Error('Không thể lưu bài hát vào bộ nhớ cục bộ.');
        }
        
        const songsData = songsToSave || songs;
        
        if (!Array.isArray(songsData)) {
            console.error("Songs is not an array:", songsData);
            throw new Error("Lỗi định dạng dữ liệu bài hát.");
        }
        
        // Filter local songs only
        const localSongs = songsData.filter(song => {
            return !song.id.includes('firebase_') && !song.isFirebaseSong;
        });
        
        console.log(`Saving ${localSongs.length} local songs to localStorage`);
        
        const jsonData = JSON.stringify(localSongs);
        localStorage.setItem(STORAGE_CONFIG.localStorageKeys.songs, jsonData);
        
        // Verify save
        const savedData = localStorage.getItem(STORAGE_CONFIG.localStorageKeys.songs);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            console.log("Successfully saved songs:", parsedData.length);
            return true;
        } else {
            throw new Error("Failed to verify saved data");
        }
    } catch (e) {
        console.error("Error saving songs to localStorage:", e);
        throw e;
    }
}

// Get song storage info
export function getSongStorageInfo(song) {
    if (!song || !song.id) {
        return { type: 'unknown', icon: '❓', description: 'Unknown' };
    }
    
    if (song.id.includes('firebase_') || song.isFirebaseSong) {
        return { 
            type: 'firebase', 
            icon: '☁️', 
            description: 'Firebase' 
        };
    } else if (song.id.includes('temp_') || !song.name || song.name.trim() === '') {
        return { 
            type: 'temporary', 
            icon: '⚠️', 
            description: 'Unsaved' 
        };
    } else {
        return { 
            type: 'local', 
            icon: '💾', 
            description: 'Local Storage' 
        };
    }
}

// Create sample songs
export function createSampleSongs() {
    return [
        {
            id: generateId(),
            name: 'Twinkle Little Star',
            bpm: 120,
            notes: [
                { key: 'c5', time: 0, duration: 1 },
                { key: 'c5', time: 1, duration: 1 },
                { key: 'g5', time: 2, duration: 1 },
                { key: 'g5', time: 3, duration: 1 },
                { key: 'a5', time: 4, duration: 1 },
                { key: 'a5', time: 5, duration: 1 },
                { key: 'g5', time: 6, duration: 2 }
            ],
            rollLength: 32,
            createdAt: new Date().toISOString()
        }
    ];
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
} 