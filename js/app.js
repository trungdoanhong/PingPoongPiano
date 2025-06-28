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

// Setup critical event listeners (like original script.js)
function setupCriticalEventListeners() {
    console.log("🔗 Setting up critical event listeners...");
    
    // Menu button click (EXACTLY like original script.js)
    const menuButton = document.getElementById('menu-button');
    if (menuButton) {
        function handleMenuClick(e) {
            console.log("🖱️ Menu button clicked/touched!");
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle dropdown with multiple methods
            menuButton.classList.toggle('active');
            
            // Also add show class to dropdown as backup
            const dropdown = document.getElementById('dropdown-menu');
            if (dropdown) {
                if (menuButton.classList.contains('active')) {
                    dropdown.classList.add('show');
                    // Force display as fallback
                    dropdown.style.display = 'flex';
                    dropdown.style.visibility = 'visible';
                    dropdown.style.opacity = '1';
                } else {
                    dropdown.classList.remove('show');
                    // Remove forced styles to allow CSS to work
                    dropdown.style.display = '';
                    dropdown.style.visibility = '';
                    dropdown.style.opacity = '';
                }
            }
            
            console.log("Menu active:", menuButton.classList.contains('active'));
        }
        
        menuButton.addEventListener('click', handleMenuClick);
        menuButton.addEventListener('touchstart', handleMenuClick, { passive: false });
        menuButton.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        console.log("✅ Menu button event listeners added");
        
        // Debug menu styling immediately
        const dropdown = document.getElementById('dropdown-menu');
        if (dropdown) {
            console.log("🔍 Menu dropdown found, checking styles...");
            console.log("Initial display:", getComputedStyle(dropdown).display);
            console.log("Initial visibility:", getComputedStyle(dropdown).visibility);
            
            // Force dropdown to show for testing
            setTimeout(() => {
                console.log("🧪 Testing dropdown visibility...");
                menuButton.classList.add('active');
                console.log("Added 'active' class to menu button");
                console.log("Dropdown display after active:", getComputedStyle(dropdown).display);
                
                // Force show if CSS selector doesn't work
                if (getComputedStyle(dropdown).display === 'none') {
                    console.log("⚠️ CSS selector not working, forcing display");
                    dropdown.style.display = 'flex';
                    dropdown.style.visibility = 'visible';
                    dropdown.style.opacity = '1';
                    dropdown.style.zIndex = '9999';
                    dropdown.style.position = 'absolute';
                    dropdown.style.background = 'rgba(0, 0, 0, 0.95)';
                    dropdown.style.backdropFilter = 'blur(10px)';
                    dropdown.style.borderRadius = '10px';
                    dropdown.style.padding = '10px';
                    dropdown.style.minWidth = '150px';
                    dropdown.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                }
                
                // Remove active after 3 seconds for testing
                setTimeout(() => {
                    menuButton.classList.remove('active');
                    dropdown.style.display = '';
                    dropdown.style.visibility = '';
                    dropdown.style.opacity = '';
                    console.log("🔄 Reset dropdown for normal operation");
                }, 3000);
            }, 1000);
        }
    }
    
    // Menu items click (EXACTLY like original script.js)
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        function handleMenuItemClick(e) {
            console.log("🎯 Menu item clicked:", item.getAttribute('data-mode'));
            e.preventDefault();
            e.stopPropagation();
            const mode = item.getAttribute('data-mode');
            switchMode(mode);
            // Close dropdown after selection
            menuButton.classList.remove('active');
            
            // Also remove show class and forced styles
            const dropdown = document.getElementById('dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
                dropdown.style.display = '';
                dropdown.style.visibility = '';
                dropdown.style.opacity = '';
            }
        }
        
        item.addEventListener('click', handleMenuItemClick);
        item.addEventListener('touchstart', handleMenuItemClick, { passive: false });
        item.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
        
        console.log("✅ Event listeners added to menu item:", item.getAttribute('data-mode'));
    });
    
    // Close menu when clicking outside (like original script.js)
    document.addEventListener('click', function(e) {
        if (menuButton && !menuButton.contains(e.target)) {
            menuButton.classList.remove('active');
            
            // Also remove show class and forced styles
            const dropdown = document.getElementById('dropdown-menu');
            if (dropdown) {
                dropdown.classList.remove('show');
                dropdown.style.display = '';
                dropdown.style.visibility = '';
                dropdown.style.opacity = '';
            }
        }
    });
    
    console.log("✅ Critical event listeners setup complete");
    
    // Create global debug function for menu
    window.debugMenu = function() {
        console.log("🔧 Manual menu debug triggered");
        const menuBtn = document.getElementById('menu-button');
        const dropdown = document.getElementById('dropdown-menu');
        
        if (menuBtn && dropdown) {
            console.log("Elements found - forcing menu visible");
            menuBtn.classList.add('active');
            dropdown.classList.add('show');
            dropdown.style.display = 'flex';
            dropdown.style.visibility = 'visible';
            dropdown.style.opacity = '1';
            dropdown.style.zIndex = '9999';
            dropdown.style.position = 'absolute';
            dropdown.style.top = '100%';
            dropdown.style.left = '0';
            dropdown.style.background = 'rgba(0, 0, 0, 0.95)';
            dropdown.style.backdropFilter = 'blur(10px)';
            dropdown.style.borderRadius = '10px';
            dropdown.style.padding = '10px';
            dropdown.style.minWidth = '150px';
            dropdown.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            console.log("Menu should now be visible!");
        } else {
            console.error("Menu elements not found!");
        }
    };
    
    // Add keyboard shortcut for debug
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.altKey && e.key === 'm') {
            window.debugMenu();
        }
    });
    
    // Add debug button for easy testing (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            const debugBtn = document.createElement('button');
            debugBtn.innerHTML = 'DEBUG MENU';
            debugBtn.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 10000;
                background: #ff4444;
                color: white;
                padding: 10px;
                border: none;
                border-radius: 5px;
                font-size: 12px;
                cursor: pointer;
                font-weight: bold;
            `;
            debugBtn.onclick = window.debugMenu;
            document.body.appendChild(debugBtn);
            console.log("🔧 Debug button added to top-right corner");
        }, 2000);
    }
}

// Setup orientation handling
function setupOrientationHandling() {
    const orientationMessage = document.getElementById('orientation-message');
    const gameContainer = document.getElementById('game-container');
    
    function checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile && isPortrait) {
            if (orientationMessage) orientationMessage.style.display = 'flex';
            if (gameContainer) gameContainer.style.display = 'none';
        } else {
            if (orientationMessage) orientationMessage.style.display = 'none';
            if (gameContainer) gameContainer.style.display = 'block';
        }
    }
    
    // Check on load
    checkOrientation();
    
    // Check on orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(checkOrientation, 100);
    });
    
    // Check on resize
    window.addEventListener('resize', checkOrientation);
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