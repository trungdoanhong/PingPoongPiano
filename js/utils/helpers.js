// Helper Utilities
import { STORAGE_CONFIG } from '../config/constants.js';

// Check if localStorage is available
export function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Generate unique ID
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Extract timestamp from ID
export function extractTimestamp(id) {
    try {
        const timestampPart = id.split('_')[0] || id.substring(0, 8);
        const timestamp = parseInt(timestampPart, 36);
        return isNaN(timestamp) ? Date.now() : timestamp;
    } catch (e) {
        return Date.now();
    }
}

// Debounce function
export function debounce(func, wait) {
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

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Safe clear inputs helper
export function safeClearInputs() {
    try {
        const songNameInput = document.getElementById('song-name');
        const songBpmInput = document.getElementById('song-bpm');
        const rollLengthInput = document.getElementById('roll-length');
        
        if (songNameInput) songNameInput.value = '';
        if (songBpmInput) songBpmInput.value = '120';
        if (rollLengthInput) rollLengthInput.value = '32';
        
        console.log("Safely cleared song inputs");
    } catch (e) {
        console.error("Error clearing inputs:", e);
    }
}

// Log API requests
export function logApiRequest(method, url, data, logToConsole = true) {
    const logData = {
        timestamp: new Date().toISOString(),
        method: method,
        url: url,
        data: data
    };
    
    // Save to localStorage for debugging
    try {
        const apiLogs = JSON.parse(localStorage.getItem(STORAGE_CONFIG.localStorageKeys.apiLogs) || '[]');
        apiLogs.push(logData);
        if (apiLogs.length > STORAGE_CONFIG.maxLogs) apiLogs.shift();
        localStorage.setItem(STORAGE_CONFIG.localStorageKeys.apiLogs, JSON.stringify(apiLogs));
    } catch (e) {
        console.error("Failed to save API log:", e);
    }
    
    if (logToConsole) {
        console.group(`API Request: ${method} ${url}`);
        console.log("Request data:", data);
        console.log("Timestamp:", logData.timestamp);
        console.groupEnd();
    }
    
    return logData;
}

// Handle API errors
export function handleApiError(error, operation) {
    console.error(`API Error during ${operation}:`, error);
    
    let errorMessage = `Lỗi khi ${operation}`;
    
    if (error.message) {
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
        } else if (error.message.includes('404')) {
            errorMessage = 'Không tìm thấy dữ liệu trên server.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
        } else if (error.message.includes('403')) {
            errorMessage = 'Không có quyền truy cập dữ liệu.';
        }
    }
    
    // Save error logs
    try {
        const errorLogs = JSON.parse(localStorage.getItem(STORAGE_CONFIG.localStorageKeys.errorLogs) || '[]');
        errorLogs.push({
            timestamp: new Date().toISOString(),
            operation: operation,
            error: error.toString(),
            message: errorMessage
        });
        if (errorLogs.length > STORAGE_CONFIG.maxLogs) errorLogs.shift();
        localStorage.setItem(STORAGE_CONFIG.localStorageKeys.errorLogs, JSON.stringify(errorLogs));
    } catch (e) {
        console.error("Failed to save error log:", e);
    }
    
    return errorMessage;
}

// Clean up duplicates from array
export function cleanupDuplicates(songsArray) {
    const seen = new Set();
    return songsArray.filter(song => {
        if (seen.has(song.id)) {
            console.log("Removing duplicate song:", song.name, song.id);
            return false;
        }
        seen.add(song.id);
        return true;
    });
}

// Check if email is admin
export function isAdminEmail(email) {
    if (!email || !window.firebaseApp?.ADMIN_EMAILS) {
        return false;
    }
    return window.firebaseApp.ADMIN_EMAILS.includes(email);
}

// Get all admin emails
export function getAdminEmails() {
    return window.firebaseApp?.ADMIN_EMAILS || [];
} 