// Notification System
import { UI_CONFIG } from '../config/constants.js';

// Show notification to user
export function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set background color based on type
    const colors = {
        info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        error: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, UI_CONFIG.notifications.duration);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Show error message
export function showErrorMessage(message) {
    console.error("Error:", message);
    showNotification(message, 'error');
}

// Show loading indicator
export function showLoadingIndicator(message) {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;
    
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 10001;
        min-width: 200px;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .loading-message {
            font-size: 14px;
            opacity: 0.9;
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(indicator);
    return indicator;
}

// Hide loading indicator
export function hideLoadingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        }, 300);
    }
}

// Show mobile instructions
export function showMobileInstructions() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    
    if (isMobile && !isTablet) {
        const instructionOverlay = document.createElement('div');
        instructionOverlay.className = 'mobile-instruction';
        instructionOverlay.innerHTML = `
            <div class="instruction-content">
                <h3>🎹 Hướng dẫn chơi trên mobile</h3>
                <ul>
                    <li>Xoay ngang để chơi game</li>
                    <li>Chạm vào phím piano khi tile rơi xuống</li>
                    <li>Sử dụng Song Manager để tạo bài hát mới</li>
                    <li>Audio Analyzer cần quyền microphone</li>
                </ul>
                <button onclick="this.parentElement.parentElement.remove()">Đã hiểu</button>
            </div>
        `;
        
        instructionOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        document.body.appendChild(instructionOverlay);
    }
} 