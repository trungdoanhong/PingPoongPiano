// UI Controls
import { showNotification } from './notifications.js';

let sideMargin = 0;
let gameSpeed = 0.3;

// Enhanced mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768 || 
           ('ontouchstart' in window);
}

// Enhanced touch event handler
function addMobileEventListeners(element, callback) {
    if (isMobileDevice()) {
        // Touch events
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            callback(e);
        }, { passive: false });
        
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
    }
    
    // Standard click for all devices
    element.addEventListener('click', callback);
}

// Menu dropdown functionality
export function toggleMenuDropdown() {
    const menuButton = document.getElementById('menu-button');
    const dropdown = document.getElementById('dropdown-menu');
    
    if (menuButton && dropdown) {
        menuButton.classList.toggle('active');
        console.log("Menu toggled, active:", menuButton.classList.contains('active'));
    }
}

// Close menu when clicking outside
export function closeMenuOnClickOutside(e) {
    const menuButton = document.getElementById('menu-button');
    const dropdown = document.getElementById('dropdown-menu');
    
    if (menuButton && dropdown && !menuButton.contains(e.target)) {
        menuButton.classList.remove('active');
    }
}

// Initialize menu controls - MOBILE ENHANCED VERSION
export function initMenuControls() {
    const menuButton = document.getElementById('menu-button');
    const dropdown = document.getElementById('dropdown-menu');
    
    if (menuButton && dropdown) {
        // Remove any existing event listeners
        menuButton.replaceWith(menuButton.cloneNode(true));
        const newMenuButton = document.getElementById('menu-button');
        const newDropdown = document.getElementById('dropdown-menu');
        
        // Enhanced mobile-compatible event handler
        const toggleMenu = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const isActive = newMenuButton.classList.contains('active');
            console.log('Menu button triggered, currently active:', isActive);
            
            if (isActive) {
                // Close menu
                newMenuButton.classList.remove('active');
                newDropdown.style.display = 'none';
                console.log('Menu closed');
            } else {
                // Open menu
                newMenuButton.classList.add('active');
                newDropdown.style.display = 'flex';
                newDropdown.style.position = 'absolute';
                newDropdown.style.top = '100%';
                newDropdown.style.left = '0';
                newDropdown.style.zIndex = '1002';
                console.log('Menu opened');
            }
        };
        
        // Add enhanced mobile event listeners
        addMobileEventListeners(newMenuButton, toggleMenu);
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!newMenuButton.contains(e.target) && !newDropdown.contains(e.target)) {
                newMenuButton.classList.remove('active');
                newDropdown.style.display = 'none';
                console.log('Menu closed by outside click');
            }
        });
        
        // Add mobile-friendly touch handler for outside clicks
        if (isMobileDevice()) {
            document.addEventListener('touchstart', (e) => {
                if (!newMenuButton.contains(e.target) && !newDropdown.contains(e.target)) {
                    newMenuButton.classList.remove('active');
                    newDropdown.style.display = 'none';
                }
            }, { passive: true });
        }
        
        // Handle menu item clicks with enhanced mobile support
        const menuItems = newDropdown.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const itemClickHandler = (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                const mode = item.getAttribute('data-mode');
                console.log('Menu item clicked:', mode);
                
                if (mode) {
                    switchMode(mode);
                    // Close menu after selection
                    newMenuButton.classList.remove('active');
                    newDropdown.style.display = 'none';
                    console.log('Menu closed after mode switch');
                }
            };
            
            // Add enhanced mobile event listeners
            addMobileEventListeners(item, itemClickHandler);
        });
        
        console.log('Menu controls initialized with enhanced mobile support');
    } else {
        console.error('Menu button or dropdown not found');
    }
}

// Initialize speed controls with mobile support
export function initSpeedControls() {
    const speedDownBtn = document.getElementById('speed-down');
    const speedUpBtn = document.getElementById('speed-up');
    const speedValue = document.getElementById('speed-value');
    
    if (speedDownBtn) {
        addMobileEventListeners(speedDownBtn, () => {
            gameSpeed = Math.max(0.1, gameSpeed - 0.1);
            updateSpeedDisplay();
        });
    }
    
    if (speedUpBtn) {
        addMobileEventListeners(speedUpBtn, () => {
            gameSpeed = Math.min(1.0, gameSpeed + 0.1);
            updateSpeedDisplay();
        });
    }
    
    function updateSpeedDisplay() {
        if (speedValue) {
            speedValue.textContent = gameSpeed.toFixed(1);
        }
    }
}

// Initialize margin controls with mobile support
export function initMarginControls() {
    const marginDownBtn = document.getElementById('margin-down');
    const marginUpBtn = document.getElementById('margin-up');
    const marginValue = document.getElementById('margin-value');
    
    if (marginDownBtn) {
        addMobileEventListeners(marginDownBtn, () => {
            sideMargin = Math.max(0, sideMargin - 5);
            updateMargins();
            updateMarginDisplay();
        });
    }
    
    if (marginUpBtn) {
        addMobileEventListeners(marginUpBtn, () => {
            sideMargin = Math.min(30, sideMargin + 5);
            updateMargins();
            updateMarginDisplay();
        });
    }
    
    function updateMarginDisplay() {
        if (marginValue) {
            marginValue.textContent = sideMargin + '%';
        }
    }
}

// Update margins
function updateMargins() {
    const gameBoard = document.getElementById('game-board');
    if (gameBoard) {
        gameBoard.style.marginLeft = sideMargin + '%';
        gameBoard.style.marginRight = sideMargin + '%';
    }
}

// Switch between different modes - MOBILE OPTIMIZED VERSION
export function switchMode(mode) {
    console.log("Switching to mode:", mode);
    
    // Remove all mode classes from body
    document.body.classList.remove('game-mode', 'analyzer-mode', 'song-manager-mode', 'admin-mode', 'scrollable', 'playing');
    
    // Hide all mode panels
    const panels = ['game-content', 'audio-analyzer', 'song-manager', 'admin-panel'];
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'none';
        }
    });
    
    // Hide secondary controls by default on mobile
    const secondaryControls = document.querySelector('.secondary-controls');
    const isMobile = window.innerWidth <= 900;
    
    // Show selected mode panel and add appropriate body class
    let targetPanel;
    switch (mode) {
        case 'game':
            targetPanel = document.getElementById('game-content');
            document.body.classList.add('game-mode');
            
            // Show game-specific controls but NOT secondary controls initially
            const gameControls = document.querySelectorAll('.game-only-control');
            gameControls.forEach(control => {
                control.style.display = 'flex';
            });
            
            // Hide secondary controls until actually playing on mobile
            if (isMobile && secondaryControls) {
                secondaryControls.style.display = 'none';
            }
            break;
            
        case 'analyzer':
            targetPanel = document.getElementById('audio-analyzer');
            document.body.classList.add('analyzer-mode', 'scrollable');
            
            // Hide secondary controls in analyzer mode
            if (secondaryControls) {
                secondaryControls.style.display = 'none';
            }
            
            // Setup audio analyzer if needed
            if (window.setupCanvas) {
                setTimeout(() => window.setupCanvas(), 100);
            }
            break;
            
        case 'song-manager':
            targetPanel = document.getElementById('song-manager');
            document.body.classList.add('song-manager-mode', 'scrollable');
            
            // Hide secondary controls in song manager
            if (secondaryControls) {
                secondaryControls.style.display = 'none';
            }
            
            // Initialize song manager mobile features
            setTimeout(() => {
                initSongManagerMobile();
            }, 100);
            break;
            
        case 'music-theory':
            // Music theory mode - redirect to separate page
            window.open('music-theory.html', '_blank');
            return; // Don't continue with mode switching
            
        case 'admin':
            targetPanel = document.getElementById('admin-panel');
            document.body.classList.add('admin-mode', 'scrollable');
            
            // Hide secondary controls in admin mode
            if (secondaryControls) {
                secondaryControls.style.display = 'none';
            }
            
            // Initialize admin panel if needed
            if (window.initAdminPanel) {
                setTimeout(() => window.initAdminPanel(), 100);
            }
            break;
    }
    
    if (targetPanel) {
        targetPanel.style.display = 'block';
        
        // Force reflow to ensure proper rendering
        targetPanel.offsetHeight;
    }
    
    // Update menu item active state
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-mode') === mode) {
            item.classList.add('active');
        }
    });
    
    // Show/hide restart control for game mode
    const restartControl = document.getElementById('restart-control');
    if (restartControl) {
        if (mode === 'game') {
            restartControl.style.display = 'block';
        } else {
            restartControl.style.display = 'none';
        }
    }
    
    // Trigger resize event to update layouts
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
    
    showNotification(`Switched to ${mode} mode`, 'success');
}

// Function to show secondary controls when game actually starts
export function showGameControls() {
    const isMobile = window.innerWidth <= 900;
    const secondaryControls = document.querySelector('.secondary-controls');
    
    if (isMobile && secondaryControls && document.body.classList.contains('game-mode')) {
        document.body.classList.add('playing');
        secondaryControls.style.display = 'flex';
        console.log('Showing secondary controls for mobile game');
    }
}

// Function to hide secondary controls when game stops
export function hideGameControls() {
    const secondaryControls = document.querySelector('.secondary-controls');
    
    document.body.classList.remove('playing');
    if (window.innerWidth <= 900 && secondaryControls) {
        secondaryControls.style.display = 'none';
        console.log('Hiding secondary controls for mobile');
    }
}

// Initialize Song Manager mobile features
function initSongManagerMobile() {
    const songListContainer = document.querySelector('.song-list-container');
    const songListHeader = document.querySelector('.song-list-container h2');
    
    if (songListContainer && window.innerWidth <= 1024) {
        console.log('🎹 Setting up mobile Song Manager features...');
        console.log('📱 Current songListContainer classes:', songListContainer.className);
        
        // Force remove collapsed class initially
        songListContainer.classList.remove('collapsed');
        console.log('📱 Forced expansion of song list');
        
        // Make header clickable for toggle
        if (songListHeader) {
            songListHeader.style.cursor = 'pointer';
            songListHeader.addEventListener('click', () => {
                console.log('📱 Song list header clicked, toggling collapsed state');
                songListContainer.classList.toggle('collapsed');
                
                // Update the header arrow indicator
                const isCollapsed = songListContainer.classList.contains('collapsed');
                console.log(`📱 Song list is now ${isCollapsed ? 'collapsed' : 'expanded'}`);
                console.log('📱 Updated classes:', songListContainer.className);
            });
            
            console.log('📱 Song list header click handler added');
        }
        
        // Only auto-collapse on very small screens
        if (window.innerHeight < 400) {
            songListContainer.classList.add('collapsed');
            console.log('📱 Auto-collapsed song list for very small screen');
        } else {
            // Ensure it's expanded by default on normal mobile screens
            songListContainer.classList.remove('collapsed');
            console.log('📱 Song list expanded by default');
        }
        
        // Handle window resize
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                songListContainer.classList.remove('collapsed');
                console.log('📱 Auto-expanded song list for desktop');
            } else if (window.innerHeight < 400) {
                songListContainer.classList.add('collapsed');
                console.log('📱 Auto-collapsed song list for very small screen');
            }
        };
        
        window.addEventListener('resize', handleResize);
        
        console.log('✅ Song Manager mobile features initialized');
    }
}

// Get current game speed
export function getGameSpeed() {
    return gameSpeed;
}

// Set game speed
export function setGameSpeed(speed) {
    gameSpeed = Math.max(0.1, Math.min(1.0, speed));
    const speedValue = document.getElementById('speed-value');
    if (speedValue) {
        speedValue.textContent = gameSpeed.toFixed(1);
    }
}

// Get current margin
export function getSideMargin() {
    return sideMargin;
}

// Initialize restart game controls
export function initRestartControls() {
    const restartGameBtn = document.getElementById('restart-game-btn');
    
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', function() {
            console.log("Restart game button clicked");
            // Import and call startGame function
            if (window.startGame) {
                window.startGame();
            } else {
                console.warn("startGame function not available");
            }
        });
    }
}

// Initialize start screen controls
export function initStartScreenControls() {
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    
    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log("Start button clicked - switching to song manager");
            switchMode('song-manager');
        });
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            console.log("Restart button clicked");
            if (window.startGame) {
                window.startGame();
            } else {
                console.warn("startGame function not available");
            }
        });
    }
}

// Initialize user panel controls
export function initUserPanelControls() {
    const userInfo = document.getElementById('user-info');
    
    if (userInfo) {
        userInfo.addEventListener('click', function(e) {
            // Only toggle on mobile
            if (window.innerWidth <= 1024) {
                e.stopPropagation(); // Prevent event bubbling
                
                if (userInfo.classList.contains('collapsed')) {
                    userInfo.classList.remove('collapsed');
                    userInfo.classList.add('expanded');
                } else {
                    userInfo.classList.add('collapsed');
                    userInfo.classList.remove('expanded');
                }
            }
        });
        
        // Close expanded user panel when clicking outside
        document.addEventListener('click', function(e) {
            if (userInfo.classList.contains('expanded') && !userInfo.contains(e.target)) {
                userInfo.classList.add('collapsed');
                userInfo.classList.remove('expanded');
            }
        });
    }
}

// Initialize all UI controls
export function initUIControls() {
    console.log("🎛️ Initializing UI controls...");
    
    initMenuControls();
    initSpeedControls();
    initMarginControls();
    initRestartControls();
    initStartScreenControls();
    initUserPanelControls();
    
    console.log("✅ UI controls initialized");
} 