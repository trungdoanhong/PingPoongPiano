// UI Controls
import { showNotification } from './notifications.js';

let sideMargin = 0;
let gameSpeed = 0.3;

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

// Initialize menu controls
export function initMenuControls() {
    const menuButton = document.getElementById('menu-button');
    if (menuButton) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenuDropdown();
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', closeMenuOnClickOutside);
    
    // Handle menu item clicks
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = item.getAttribute('data-mode');
            if (mode) {
                switchMode(mode);
                // Close menu after selection
                const menuButton = document.getElementById('menu-button');
                if (menuButton) {
                    menuButton.classList.remove('active');
                }
            }
        });
    });
}

// Initialize speed controls
export function initSpeedControls() {
    const speedDownBtn = document.getElementById('speed-down');
    const speedUpBtn = document.getElementById('speed-up');
    const speedValue = document.getElementById('speed-value');
    
    if (speedDownBtn) {
        speedDownBtn.addEventListener('click', () => {
            gameSpeed = Math.max(0.1, gameSpeed - 0.1);
            updateSpeedDisplay();
        });
    }
    
    if (speedUpBtn) {
        speedUpBtn.addEventListener('click', () => {
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

// Initialize margin controls
export function initMarginControls() {
    const marginDownBtn = document.getElementById('margin-down');
    const marginUpBtn = document.getElementById('margin-up');
    const marginValue = document.getElementById('margin-value');
    
    if (marginDownBtn) {
        marginDownBtn.addEventListener('click', () => {
            sideMargin = Math.max(0, sideMargin - 5);
            updateMargins();
            updateMarginDisplay();
        });
    }
    
    if (marginUpBtn) {
        marginUpBtn.addEventListener('click', () => {
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

// Switch between different modes
export function switchMode(mode) {
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
        case 'music-theory':
            // Music theory mode - redirect to separate page
            window.open('music-theory.html', '_blank');
            return; // Don't continue with mode switching
        case 'admin':
            targetPanel = document.getElementById('admin-panel');
            document.body.classList.add('scrollable');
            // Initialize admin panel if needed
            if (window.initAdminPanel) {
                window.initAdminPanel();
            }
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
    
    // Update controls container for analyzer mode
    const controlsContainer = document.getElementById('controls-container');
    if (controlsContainer) {
        if (mode === 'analyzer') {
            controlsContainer.classList.add('analyzer-mode');
        } else {
            controlsContainer.classList.remove('analyzer-mode');
        }
    }
    
    // Show restart control for game mode
    const restartControl = document.getElementById('restart-control');
    if (restartControl) {
        if (mode === 'game') {
            restartControl.style.display = 'block';
        } else {
            restartControl.style.display = 'none';
        }
    }
    
    showNotification(`Switched to ${mode} mode`, 'success');
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