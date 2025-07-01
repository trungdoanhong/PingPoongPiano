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

// Load songs from localStorage and create demo if needed
export async function loadSongsFromLocalStorage() {
    console.log("🎵 === LOADING SONGS FROM LOCALSTORAGE ===");
    
    try {
        if (!isLocalStorageAvailable()) {
            console.error("❌ localStorage is not available");
            songs = [];
            return [];
        }

        const savedSongs = localStorage.getItem(STORAGE_CONFIG.localStorageKeys.songs);
        console.log("🔍 Checking localStorage for songs...");
        console.log("🔍 Storage key:", STORAGE_CONFIG.localStorageKeys.songs);
        console.log("🔍 Raw localStorage data:", savedSongs ? savedSongs.substring(0, 100) + '...' : 'null');
        
        if (savedSongs) {
            try {
                const parsedSongs = JSON.parse(savedSongs);
                
                if (!Array.isArray(parsedSongs)) {
                    console.error("❌ Loaded data is not an array:", parsedSongs);
                    songs = [];
                } else {
                    songs = parsedSongs;
                    console.log("✅ Loaded songs from localStorage:", songs.length, "songs");
                    console.log("✅ Songs data:", songs.map(s => ({ id: s.id, name: s.name, notes: s.notes?.length })));
                }
            } catch (parseError) {
                console.error("❌ Failed to parse saved songs:", parseError);
                songs = [];
            }
        } else {
            console.log("ℹ️ No songs found in localStorage");
            songs = [];
        }
        
        // Create demo songs if no songs exist
        if (songs.length === 0) {
            console.log("🎨 Creating demo songs...");
            
            const demoSongs = [
                {
                    id: 'demo_song_1',
                    name: 'Twinkle Twinkle Little Star',
                    bpm: 120,
                    rollLength: 32,
                    notes: [
                        // Twinkle twinkle little star
                        { note: 'c5', position: 0, duration: 2, key: 'c5', time: 0 },
                        { note: 'c5', position: 2, duration: 2, key: 'c5', time: 2 },
                        { note: 'g5', position: 4, duration: 2, key: 'g5', time: 4 },
                        { note: 'g5', position: 6, duration: 2, key: 'g5', time: 6 },
                        { note: 'a5', position: 8, duration: 2, key: 'a5', time: 8 },
                        { note: 'a5', position: 10, duration: 2, key: 'a5', time: 10 },
                        { note: 'g5', position: 12, duration: 4, key: 'g5', time: 12 },
                        
                        // How I wonder what you are
                        { note: 'f5', position: 16, duration: 2, key: 'f5', time: 16 },
                        { note: 'f5', position: 18, duration: 2, key: 'f5', time: 18 },
                        { note: 'e5', position: 20, duration: 2, key: 'e5', time: 20 },
                        { note: 'e5', position: 22, duration: 2, key: 'e5', time: 22 },
                        { note: 'd5', position: 24, duration: 2, key: 'd5', time: 24 },
                        { note: 'd5', position: 26, duration: 2, key: 'd5', time: 26 },
                        { note: 'c5', position: 28, duration: 4, key: 'c5', time: 28 },
                    ],
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString(),
                    isDemo: true
                },
                {
                    id: 'demo_song_2',
                    name: 'Happy Birthday (Simple)',
                    bpm: 100,
                    rollLength: 24,
                    notes: [
                        // Happy birthday to you
                        { note: 'c5', position: 0, duration: 1, key: 'c5', time: 0 },
                        { note: 'c5', position: 1.5, duration: 1, key: 'c5', time: 1.5 },
                        { note: 'd5', position: 3, duration: 2, key: 'd5', time: 3 },
                        { note: 'c5', position: 5, duration: 2, key: 'c5', time: 5 },
                        { note: 'f5', position: 7, duration: 2, key: 'f5', time: 7 },
                        { note: 'e5', position: 9, duration: 3, key: 'e5', time: 9 },
                        
                        // Happy birthday to you
                        { note: 'c5', position: 12, duration: 1, key: 'c5', time: 12 },
                        { note: 'c5', position: 13.5, duration: 1, key: 'c5', time: 13.5 },
                        { note: 'd5', position: 15, duration: 2, key: 'd5', time: 15 },
                        { note: 'c5', position: 17, duration: 2, key: 'c5', time: 17 },
                        { note: 'g5', position: 19, duration: 2, key: 'g5', time: 19 },
                        { note: 'f5', position: 21, duration: 3, key: 'f5', time: 21 },
                    ],
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString(),
                    isDemo: true
                },
                {
                    id: 'demo_song_3',
                    name: 'Scale Practice (C Major)',
                    bpm: 140,
                    rollLength: 16,
                    notes: [
                        // C major scale up
                        { note: 'c5', position: 0, duration: 1, key: 'c5', time: 0 },
                        { note: 'd5', position: 1, duration: 1, key: 'd5', time: 1 },
                        { note: 'e5', position: 2, duration: 1, key: 'e5', time: 2 },
                        { note: 'f5', position: 3, duration: 1, key: 'f5', time: 3 },
                        { note: 'g5', position: 4, duration: 1, key: 'g5', time: 4 },
                        { note: 'a5', position: 5, duration: 1, key: 'a5', time: 5 },
                        { note: 'b5', position: 6, duration: 1, key: 'b5', time: 6 },
                        { note: 'c6', position: 7, duration: 1, key: 'c6', time: 7 },
                        
                        // C major scale down
                        { note: 'c6', position: 8, duration: 1, key: 'c6', time: 8 },
                        { note: 'b5', position: 9, duration: 1, key: 'b5', time: 9 },
                        { note: 'a5', position: 10, duration: 1, key: 'a5', time: 10 },
                        { note: 'g5', position: 11, duration: 1, key: 'g5', time: 11 },
                        { note: 'f5', position: 12, duration: 1, key: 'f5', time: 12 },
                        { note: 'e5', position: 13, duration: 1, key: 'e5', time: 13 },
                        { note: 'd5', position: 14, duration: 1, key: 'd5', time: 14 },
                        { note: 'c5', position: 15, duration: 1, key: 'c5', time: 15 },
                    ],
                    createdAt: new Date().toISOString(),
                    modifiedAt: new Date().toISOString(),
                    isDemo: true
                }
            ];
            
            songs = demoSongs;
            console.log("🎨 Demo songs array created:", songs.length);
            console.log("🎨 Demo song names:", songs.map(s => s.name));
            
            try {
                saveSongsToLocalStorage();
                console.log("💾 Demo songs saved to localStorage");
            } catch (saveError) {
                console.error("❌ Failed to save demo songs:", saveError);
            }
        }
        
        console.log("🎵 === FINAL RESULT ===");
        console.log(`✅ Returning ${songs.length} songs:`, songs.map(s => s.name));
        return songs;
        
    } catch (error) {
        console.error("❌ Error loading songs from localStorage:", error);
        songs = [];
        return [];
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