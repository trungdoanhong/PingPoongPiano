// Main Application Module
import { initFirebaseAuth, initAuthControls } from './firebase/auth.js';
import { initUIControls, switchMode } from './ui/controls.js';
import { initFullscreenControls } from './ui/fullscreen.js';
import { showMobileInstructions } from './ui/notifications.js';
import { initPiano } from './game/piano.js';
import { initGameControls, setCurrentSong, startGame } from './game/game.js';
import { initAudioAnalyzer } from './audio/analyzer.js';
import { initSongManager, updateSongList } from './song/manager.js';
import { initAdminPanel, initAdminControls } from './admin/panel.js';
import { initStorageDiagnostics, loadSongsFromLocalStorage, getSongs } from './utils/storage.js';

// Global app state
let isAppInitialized = false;

// Initialize the application - MIMIC ORIGINAL SCRIPT.JS STRUCTURE
export async function initializeApp() {
    if (isAppInitialized) {
        console.log("App already initialized");
        return;
    }
    
    console.log("🎹 Initializing Pink Poong Piano...");
    
    try {
        // CRITICAL: Wait for DOM to be fully ready (like original script.js)
        if (document.readyState === 'loading') {
            console.log("⏳ DOM not ready, waiting...");
            return; // Will be called again by the DOM event listener
        }
        
        console.log("✅ DOM ready, proceeding with initialization...");
        
        // Initialize basic DOM elements first (like original script.js)
        initializeDOMElements();
        
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
        const firebaseAvailable = initFirebaseAuth();
        
        // Initialize core UI components (EXACT order like script.js)
        console.log("🎛️ Setting up UI controls...");
        initUIControls();
        initFullscreenControls();
        initAuthControls();
        
        // Initialize game components
        console.log("🎮 Setting up game...");
        initPiano();
        const gameModule = initGameControls();
        
        // Expose critical game functions globally (for backward compatibility)
        window.startGame = startGame;
        window.setCurrentSong = setCurrentSong;
        window.gameModule = gameModule;
        
        // Initialize audio analyzer
        console.log("🎵 Setting up audio analyzer...");
        initAudioAnalyzer();
        
        // Initialize song manager (ENABLE IT AGAIN)
        try {
            console.log("🎵 Initializing Song Manager...");
            initSongManager();
            console.log("✅ Song Manager initialized successfully");
        } catch (error) {
            console.error("❌ Song Manager initialization failed:", error);
            console.log("🔄 App will continue without Song Manager features");
        }
        
        // Initialize admin controls
        console.log("👑 Setting up admin controls...");
        initAdminControls();
        
        // Load songs
        console.log("📚 Loading songs...");
        if (firebaseAvailable) {
            console.log("Firebase available, will load songs after auth...");
        } else {
            console.log("Firebase not available, loading from localStorage...");
            await loadSongsFromLocalStorage();
            updateSongList();
        }
        
        // Show mobile instructions if needed
        showMobileInstructions();
        
        // Handle orientation changes
        setupOrientationHandling();
        
        // Setup window event listeners
        setupWindowEvents();
        
        // Setup critical event listeners (like original script.js)
        setupCriticalEventListeners();
        
        // Expose global functions for backward compatibility
        setupGlobalFunctions();
        
        isAppInitialized = true;
        console.log("✅ Pink Poong Piano initialized successfully!");
        
        // Test basic functionality
        testBasicFunctionality();
        
    } catch (error) {
        console.error("❌ Error initializing app:", error);
        // Show user-friendly error
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `❌ App initialization failed: ${error.message}`;
        errorDiv.style.cssText = `
            position: fixed; top: 10px; left: 10px; right: 10px;
            background: red; color: white; padding: 10px;
            border-radius: 5px; z-index: 9999; text-align: center;
        `;
        document.body.appendChild(errorDiv);
    }
}

// Initialize DOM elements (like original script.js)
function initializeDOMElements() {
    console.log("🔧 Initializing DOM elements...");
    
    // Test critical elements exist
    const criticalElements = [
        'game-container', 'menu-button', 'dropdown-menu',
        'speed-up', 'speed-down', 'margin-up', 'margin-down',
        'fullscreen-btn', 'google-login-btn'
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
        throw new Error(`Missing critical DOM elements: ${missingElements.join(', ')}`);
    }
    
    console.log("✅ All critical DOM elements found");
}

// Setup mobile optimizations
function setupMobileOptimizations() {
    console.log("🔧 Setting up mobile optimizations...");
    
    try {
        // Prevent bounce scrolling
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'manipulation';
        
        // Prevent zoom on input focus
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }
        
        // Add mobile-specific body classes
        document.body.classList.add('mobile-device');
        
        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // Handle orientation changes
        let orientationChangeTimeout;
        window.addEventListener('orientationchange', () => {
            clearTimeout(orientationChangeTimeout);
            orientationChangeTimeout = setTimeout(() => {
                console.log('📱 Orientation changed, updating layout...');
                // Force a layout recalculation
                window.dispatchEvent(new Event('resize'));
            }, 500);
        });
        
        // Improve touch responsiveness
        document.addEventListener('touchstart', () => {}, { passive: true });
        
        // Add visual feedback for all interactive elements
        const interactiveElements = document.querySelectorAll('button, .control-btn, .menu-item');
        interactiveElements.forEach(element => {
            element.style.webkitTapHighlightColor = 'transparent';
            element.style.touchAction = 'manipulation';
        });
        
        console.log("✅ Mobile optimizations applied successfully");
        
    } catch (error) {
        console.error("❌ Error setting up mobile optimizations:", error);
    }
}

// Setup critical event listeners (like original script.js)
function setupCriticalEventListeners() {
    console.log("🔗 Setting up critical event listeners...");
    
    // NOTE: Menu controls are now handled by initMenuControls() in ui/controls.js
    // This prevents conflicts and simplifies the code
    console.log("✅ Menu controls delegated to ui/controls.js");
    
    // Handle menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
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
        });
    });
}

// Enhanced mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768 || 
           ('ontouchstart' in window);
}

// Setup orientation handling - MOBILE ENHANCED VERSION
function setupOrientationHandling() {
    const orientationMessage = document.getElementById('orientation-message');
    const gameContainer = document.getElementById('game-container');
    
    function checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = isMobileDevice();
        const isVerySmallScreen = window.innerWidth <= 480 || window.innerHeight <= 400;
        
        console.log('Orientation check:', {
            width: window.innerWidth,
            height: window.innerHeight,
            isPortrait,
            isMobile,
            isVerySmallScreen,
            userAgent: navigator.userAgent
        });
        
        // Show orientation message only for mobile devices in portrait
        if (isMobile && isPortrait && isVerySmallScreen) {
            if (orientationMessage) {
                orientationMessage.style.display = 'flex';
                orientationMessage.style.zIndex = '2000';
            }
            if (gameContainer) gameContainer.style.display = 'none';
            console.log('Showing orientation message');
        } else {
            if (orientationMessage) orientationMessage.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'block';
            console.log('Hiding orientation message');
            
            // Apply mobile landscape optimizations
            if (isMobile && !isPortrait) {
                document.body.classList.add('mobile-landscape');
                console.log('Applied mobile landscape class');
            } else {
                document.body.classList.remove('mobile-landscape');
            }
        }
    }
    
    // Check on load
    checkOrientation();
    
    // Check on orientation change with delay for mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(checkOrientation, 300); // Increased delay for mobile
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
    // Expose functions that need to be accessible globally
    window.setCurrentSong = setCurrentSong;
    window.initAdminPanel = initAdminPanel;
    window.getSongs = getSongs;
    window.switchMode = switchMode;
    
    // Legacy switch mode function (deprecated - use import instead)
    window.switchModeLegacy = function(mode) {
        console.log("Switching to mode:", mode);
        
        // Hide all mode panels
        const panels = ['game-content', 'audio-analyzer', 'song-manager', 'admin-panel'];
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'none';
            }
        });
        
        // Show selected mode panel
        let targetPanel;
        switch (mode) {
            case 'game':
                targetPanel = document.getElementById('game-content');
                document.body.classList.remove('scrollable');
                break;
            case 'analyzer':
                targetPanel = document.getElementById('audio-analyzer');
                document.body.classList.add('scrollable');
                break;
            case 'song-manager':
                targetPanel = document.getElementById('song-manager');
                document.body.classList.add('scrollable');
                break;
            case 'admin':
                targetPanel = document.getElementById('admin-panel');
                document.body.classList.add('scrollable');
                initAdminPanel();
                break;
        }
        
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }
        
        // Update menu item active state
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-mode') === mode) {
                item.classList.add('active');
            }
        });
    };
}

// Get current mode
function getCurrentMode() {
    // Determine current mode based on visible panels
    const panels = ['game-content', 'audio-analyzer', 'song-manager', 'admin-panel'];
    for (const panelId of panels) {
        const panel = document.getElementById(panelId);
        if (panel && panel.style.display !== 'none') {
            return panelId.replace('-', ''); // Convert 'song-manager' to 'songmanager'
        }
    }
    return 'game'; // Default
}

// Test basic functionality
function testBasicFunctionality() {
    console.log("🧪 Testing basic functionality...");
    
    // Test button accessibility
    setTimeout(() => {
        const testClick = function() {
            console.log("✅ Test button click works");
        };
        
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
        
        // Test menu functionality
        const menuButton = document.getElementById('menu-button');
        if (menuButton) {
            const testHandler = function() {
                console.log("✅ Menu test click works");
            };
            
            // Test if we can programmatically trigger click
            try {
                menuButton.click();
                console.log("✅ Menu button programmatic click works");
            } catch (e) {
                console.warn("⚠️ Menu button programmatic click failed:", e);
            }
        }
        
        console.log("🧪 Basic functionality test complete");
    }, 1000);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
} 