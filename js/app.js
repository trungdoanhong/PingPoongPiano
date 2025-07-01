// Main Application Module - ENHANCED FOR MOBILE
import { initFirebaseAuth, initAuthControls } from './firebase/auth.js';
import { initUIControls, switchMode } from './ui/controls.js';
import { initFullscreenControls } from './ui/fullscreen.js';
import { showMobileInstructions } from './ui/notifications.js';
import { initPiano } from './game/piano.js';
import { initGameControls, setCurrentSong, startGame } from './game/game.js';
import { initAudioAnalyzer } from './audio/analyzer.js';
import { initSongManager, updateSongList } from './song/manager.js';
import { initAdminPanel, initAdminControls } from './admin/panel.js';
import { initStorageDiagnostics, loadSongsFromLocalStorage, getSongs, setSongs, saveSongsToLocalStorage } from './utils/storage.js';

// Global app state
let isAppInitialized = false;

// Enhanced mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768 || 
           ('ontouchstart' in window);
}

// Initialize the application - ENHANCED FOR MOBILE
export async function initializeApp() {
    if (isAppInitialized) {
        console.log("App already initialized");
        return;
    }
    
    console.log("🎹 Initializing Pink Poong Piano...");
    
    try {
        // CRITICAL: Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            console.log("⏳ DOM not ready, waiting...");
            return; // Will be called again by the DOM event listener
        }
        
        console.log("✅ DOM ready, proceeding with initialization...");
        
        // Initialize basic DOM elements first
        if (!initializeDOMElements()) {
            throw new Error("Critical DOM elements missing");
        }
        
        // Mobile-specific initialization
        if (isMobileDevice()) {
            console.log("📱 Mobile device detected, applying mobile optimizations...");
            setupMobileOptimizations();
        }
        
        // Set default mode to game IMMEDIATELY
        console.log("🎮 Setting default mode to game...");
        switchMode('game');
        
        // Initialize storage diagnostics
        initStorageDiagnostics();
        
        // Initialize Firebase authentication
        const firebaseAvailable = await initFirebaseAuth();
        
        // Initialize core UI components (EXACT order like script.js)
        console.log("🎛️ Setting up UI controls...");
        initUIControls();
        initFullscreenControls();
        initAuthControls();
        
        // Initialize game components
        console.log("🎮 Setting up game...");
        if (!initPiano()) {
            throw new Error("Piano initialization failed");
        }
        
        const gameModule = initGameControls();
        
        // Expose critical game functions globally (for backward compatibility)
        window.startGame = startGame;
        window.setCurrentSong = setCurrentSong;
        window.gameModule = gameModule;
        
        // Initialize audio analyzer
        console.log("🎵 Setting up audio analyzer...");
        try {
            await initAudioAnalyzer();
        } catch (error) {
            console.warn("⚠️ Audio analyzer initialization failed:", error);
        }
        
        // Initialize song manager (ENABLE IT AGAIN)
        try {
            console.log("🎵 Initializing Song Manager...");
            const songManagerResult = await initSongManager();
            if (songManagerResult) {
                console.log("✅ Song Manager initialized successfully");
            } else {
                throw new Error("Song Manager initialization returned false");
            }
        } catch (error) {
            console.error("❌ Song Manager initialization failed:", error);
            console.log("🔄 App will continue without Song Manager features");
        }
        
        // Initialize admin controls
        console.log("👑 Setting up admin controls...");
        try {
            initAdminControls();
        } catch (error) {
            console.warn("⚠️ Admin controls initialization failed:", error);
        }
        
        // Load songs - UPDATED to avoid conflicts with Song Manager
        console.log("📚 Loading songs...");
        if (firebaseAvailable) {
            console.log("Firebase available, will load songs after auth...");
        } else {
            console.log("Firebase not available, songs already loaded by Song Manager");
            // Songs are already loaded by Song Manager, just update the list
            if (typeof updateSongList === 'function') {
                updateSongList();
            }
        }
        
        // Show mobile instructions if needed
        if (isMobileDevice()) {
            showMobileInstructions();
        }
        
        // Handle orientation changes
        setupOrientationHandling();
        
        // Setup window event listeners
        setupWindowEvents();
        
        // Setup critical event listeners
        setupCriticalEventListeners();
        
        // Expose global functions for backward compatibility
        setupGlobalFunctions();
        
        // Expose global functions for debugging (only in development)
        window.debugPinkPoong = {
            loadSongs: async function() {
                console.log("🔧 Manual song loading...");
                if (window.loadSongsFromLocalStorage) {
                    const songs = await window.loadSongsFromLocalStorage();
                    console.log("🔧 Loaded songs:", songs.length);
                    return songs;
                }
            },
            clearSongs: function() {
                console.log("🔧 Clearing all songs...");
                localStorage.removeItem('pinkPoongPiano_songs');
                if (window.setSongs) {
                    window.setSongs([]);
                }
                console.log("🔧 Songs cleared");
            },
            reloadSongManager: async function() {
                console.log("🔧 Reloading Song Manager...");
                if (window.initSongManager) {
                    await window.initSongManager();
                }
            },
            getCurrentSongs: function() {
                if (window.getSongs) {
                    const songs = window.getSongs();
                    console.log("🔧 Current songs:", songs.length, songs.map(s => s.name));
                    return songs;
                }
            },
            showSongList: function() {
                if (window.updateSongList) {
                    window.updateSongList();
                }
            }
        };
        
        console.log("🔧 Debug functions available: window.debugPinkPoong");
        console.log("🔧 Try: debugPinkPoong.getCurrentSongs()");
        
        isAppInitialized = true;
        console.log("✅ App initialization complete!");
        
    } catch (error) {
        console.error("❌ Critical error during app initialization:", error);
        
        // Show error to user
        try {
            showErrorMessage(`Lỗi khởi tạo ứng dụng: ${error.message}`);
        } catch (uiError) {
            // Fallback if UI functions aren't available
            alert(`Lỗi khởi tạo ứng dụng: ${error.message}`);
        }
        
        isAppInitialized = false;
        throw error;
    }
}

// Initialize DOM elements (like original script.js)
function initializeDOMElements() {
    console.log("🔧 Initializing DOM elements...");
    
    // Test critical elements exist
    const criticalElements = [
        'game-container', 'menu-button', 'dropdown-menu',
        'speed-up', 'speed-down', 'margin-up', 'margin-down',
        'fullscreen-btn', 'google-login-btn', 'game-board'
    ];
    
    const missingElements = [];
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            missingElements.push(id);
            console.error(`❌ Critical element missing: ${id}`);
        } else {
            console.log(`✅ Found critical element: ${id}`);
        }
    });
    
    if (missingElements.length > 0) {
        console.error(`Missing critical DOM elements: ${missingElements.join(', ')}`);
        return false;
    }
    
    console.log("✅ All critical DOM elements found");
    return true;
}

// Setup mobile optimizations - ENHANCED
function setupMobileOptimizations() {
    console.log("🔧 Setting up mobile optimizations...");
    
    try {
        // Prevent bounce scrolling
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'manipulation';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100vh';
        
        // Prevent zoom on input focus
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }
        
        // Add mobile-specific body classes
        document.body.classList.add('mobile-device');
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#game-board') || e.target.closest('.column')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle orientation changes with enhanced detection
        let orientationChangeTimeout;
        const handleOrientationChange = () => {
            clearTimeout(orientationChangeTimeout);
            orientationChangeTimeout = setTimeout(() => {
                console.log('📱 Orientation changed, updating layout...');
                // Force a layout recalculation
                window.dispatchEvent(new Event('resize'));
                
                // Re-check orientation message
                checkOrientation();
            }, 500);
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        screen.orientation?.addEventListener('change', handleOrientationChange);
        
        // Improve touch responsiveness
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Add visual feedback for all interactive elements
        const interactiveElements = document.querySelectorAll('button, .control-btn, .menu-item, .column');
        interactiveElements.forEach(element => {
            element.style.webkitTapHighlightColor = 'transparent';
            element.style.touchAction = 'manipulation';
        });
        
        // Prevent pull-to-refresh on some mobile browsers
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#game-board')) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Handle safe area insets for devices with notches
        const safeAreaStyle = document.createElement('style');
        safeAreaStyle.textContent = `
            body {
                padding-top: env(safe-area-inset-top);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                padding-bottom: env(safe-area-inset-bottom);
            }
        `;
        document.head.appendChild(safeAreaStyle);
        
        console.log("✅ Mobile optimizations applied successfully");
        
    } catch (error) {
        console.error("❌ Error setting up mobile optimizations:", error);
    }
}

// Setup critical event listeners
function setupCriticalEventListeners() {
    console.log("🔗 Setting up critical event listeners...");
    
    // Handle menu item clicks with enhanced mobile support
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const itemClickHandler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const mode = item.getAttribute('data-mode');
            console.log('Menu item clicked:', mode);
            
            if (mode) {
                switchMode(mode);
                // Close menu after selection
                const menuButton = document.getElementById('menu-button');
                const dropdown = document.getElementById('dropdown-menu');
                if (menuButton) menuButton.classList.remove('active');
                if (dropdown) {
                    dropdown.classList.remove('show');
                    dropdown.style.display = 'none';
                }
            }
        };
        
        // Enhanced mobile event listeners
        if (isMobileDevice()) {
            item.addEventListener('touchstart', itemClickHandler, { passive: false });
        }
        item.addEventListener('click', itemClickHandler);
    });
    
    console.log("✅ Critical event listeners set up");
}

// Setup orientation handling - ENHANCED VERSION
function setupOrientationHandling() {
    const orientationMessage = document.getElementById('orientation-message');
    const gameContainer = document.getElementById('game-container');
    
    window.checkOrientation = checkOrientation; // Make globally accessible
    
    function checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = isMobileDevice();
        const isVerySmallScreen = window.innerWidth <= 600 || window.innerHeight <= 400;
        
        console.log('Orientation check:', {
            width: window.innerWidth,
            height: window.innerHeight,
            isPortrait,
            isMobile,
            isVerySmallScreen,
            orientation: screen.orientation?.angle
        });
        
        // Show orientation message only for mobile devices in portrait
        if (isMobile && isPortrait && isVerySmallScreen) {
            if (orientationMessage) {
                orientationMessage.style.display = 'flex';
                orientationMessage.style.zIndex = '2000';
            }
            if (gameContainer) gameContainer.style.display = 'none';
            console.log('📱 Showing orientation message');
        } else {
            if (orientationMessage) orientationMessage.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'block';
            console.log('📱 Hiding orientation message');
            
            // Apply mobile landscape optimizations
            if (isMobile && !isPortrait) {
                document.body.classList.add('mobile-landscape');
                console.log('📱 Applied mobile landscape class');
            } else {
                document.body.classList.remove('mobile-landscape');
            }
        }
    }
    
    // Check on load
    checkOrientation();
    
    // Check on orientation change with delay for mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(checkOrientation, 300);
    });
    
    // Check on resize with throttling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(checkOrientation, 100);
    });
    
    // Initial check after DOM is fully loaded
    setTimeout(checkOrientation, 500);
}

// Show initialization error
function showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: rgba(231, 76, 60, 0.95); color: white; padding: 20px; 
                    border-radius: 10px; z-index: 9999; text-align: center; max-width: 90vw;">
            <h3>🚫 Initialization Error</h3>
            <p>Pink Poong Piano failed to load properly.</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 10px;">
                Error: ${error.message}
            </p>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; 
                           background: white; color: #e74c3c; border: none; border-radius: 5px; cursor: pointer;">
                Reload Page
            </button>
        </div>
    `;
    document.body.appendChild(errorDiv);
}

// Setup window event listeners
function setupWindowEvents() {
    // Handle visibility change (for audio context)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log("Page hidden, pausing audio contexts...");
        } else {
            console.log("Page visible, resuming audio contexts...");
        }
    });
    
    // Handle before unload (warn about unsaved changes)
    window.addEventListener('beforeunload', (e) => {
        // This will be handled by individual modules if needed
    });
    
    // Handle errors
    window.addEventListener('error', (e) => {
        console.error("Global error:", e.error);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
        console.error("Unhandled promise rejection:", e.reason);
    });
}

// Setup global functions for backward compatibility
function setupGlobalFunctions() {
    // Expose functions globally for backward compatibility and external access
    if (getSongs) window.getSongs = getSongs;
    if (setSongs) window.setSongs = setSongs;
    if (loadSongsFromLocalStorage) window.loadSongsFromLocalStorage = loadSongsFromLocalStorage;
    if (saveSongsToLocalStorage) window.saveSongsToLocalStorage = saveSongsToLocalStorage;
    
    // Song Manager functions
    if (initSongManager) window.initSongManager = initSongManager;
    if (updateSongList) window.updateSongList = updateSongList;
    
    // Game functions 
    if (startGame) window.startGame = startGame;
    if (setCurrentSong) window.setCurrentSong = setCurrentSong;
    if (switchMode) window.switchMode = switchMode;
    
    // UI functions
    if (showNotification) window.showNotification = showNotification;
    if (showErrorMessage) window.showErrorMessage = showErrorMessage;
    
    console.log("✅ Global functions exposed for compatibility");
}

// Test basic functionality
function testBasicFunctionality() {
    console.log("🧪 Testing basic functionality...");
    
    setTimeout(() => {
        const testButtons = [
            'menu-button', 'speed-up', 'speed-down', 
            'margin-up', 'margin-down', 'fullscreen-btn'
        ];
        
        testButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const rect = btn.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const hasPointerEvents = getComputedStyle(btn).pointerEvents !== 'none';
                
                console.log(`🔍 Button ${id}: visible=${isVisible}, clickable=${hasPointerEvents}`);
                
                if (!isVisible || !hasPointerEvents) {
                    console.warn(`⚠️ Button ${id} may not be accessible`);
                }
            } else {
                console.warn(`⚠️ Button ${id} not found`);
            }
        });
        
        console.log("🧪 Basic functionality test complete");
    }, 1000);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Also listen for window load as fallback
window.addEventListener('load', () => {
    if (!isAppInitialized) {
        console.log("🎹 Window loaded - trying to initialize...");
        setTimeout(initializeApp, 100);
    }
}); 