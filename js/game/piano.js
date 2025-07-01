// Piano Module - ENHANCED FOR MOBILE
import { GAME_CONFIG } from '../config/constants.js';
import { handleColumnClick } from './game.js';

// Enhanced mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768 || 
           ('ontouchstart' in window);
}

// Track active touches to prevent duplicate events
const activeTouches = new Map();

// Create piano keys/columns
export function createPianoKeys() {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) {
        console.error("Game board not found");
        return;
    }
    
    // Clear existing columns
    gameBoard.innerHTML = '';
    
    console.log("Creating piano keys...");
    
    GAME_CONFIG.keyOrder.forEach((key, index) => {
        const column = document.createElement('div');
        column.className = `column ${GAME_CONFIG.keyColors[key]}-key`;
        column.dataset.key = key;
        column.dataset.index = index;
        
        // Add bottom highlight for hit zone visualization
        const bottomHighlight = document.createElement('div');
        bottomHighlight.className = 'bottom-highlight';
        column.appendChild(bottomHighlight);
        
        // Add note label
        const label = document.createElement('div');
        label.className = 'note-label';
        label.textContent = key.toUpperCase();
        column.appendChild(label);
        
        // Mobile optimizations
        if (isMobileDevice()) {
            column.style.touchAction = 'none';
            column.style.webkitUserSelect = 'none';
            column.style.userSelect = 'none';
        }
        
        gameBoard.appendChild(column);
    });
    
    // Setup event listeners for columns
    setupColumnEventListeners();
    console.log("Piano keys created:", GAME_CONFIG.keyOrder.length, "keys");
}

// Setup event listeners for piano columns - ENHANCED MOBILE VERSION
function setupColumnEventListeners() {
    const columns = document.querySelectorAll('.column');
    
    columns.forEach(column => {
        // Enhanced touch handling for mobile
        if (isMobileDevice()) {
            console.log("Setting up mobile touch events for column:", column.dataset.key);
            
            // Enhanced touchstart handler
            column.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("Touch started on column:", column.dataset.key);
                
                // Handle multiple touches
                Array.from(e.touches).forEach(touch => {
                    const touchId = touch.identifier;
                    
                    // Prevent duplicate touch events
                    if (activeTouches.has(touchId)) {
                        return;
                    }
                    
                    activeTouches.set(touchId, {
                        column: column,
                        startTime: Date.now()
                    });
                    
                    const rect = column.getBoundingClientRect();
                    const event = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        touches: [{ clientX: touch.clientX, clientY: touch.clientY }],
                        target: column,
                        isTouchEvent: true
                    };
                    
                    // Verify touch is within column bounds
                    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                        
                        // Add visual feedback immediately
                        column.classList.add('column-active');
                        
                        // Handle the column click
                        handleColumnClick(column, event);
                        
                        // Create immediate visual ripple
                        createTouchRipple(touch.clientX - rect.left, touch.clientY - rect.top, column);
                    }
                });
            }, { passive: false });
            
            // Touch end handler
            column.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Clean up active touches
                Array.from(e.changedTouches).forEach(touch => {
                    const touchId = touch.identifier;
                    if (activeTouches.has(touchId)) {
                        activeTouches.delete(touchId);
                    }
                });
                
                // Remove visual feedback
                column.classList.remove('column-active');
            }, { passive: false });
            
            // Touch cancel handler
            column.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                
                // Clean up active touches
                Array.from(e.changedTouches).forEach(touch => {
                    const touchId = touch.identifier;
                    if (activeTouches.has(touchId)) {
                        activeTouches.delete(touchId);
                    }
                });
                
                // Remove visual feedback
                column.classList.remove('column-active');
            }, { passive: false });
            
            // Prevent touch move to avoid scrolling
            column.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
            
        } else {
            // Mouse events for desktop
            column.addEventListener('mousedown', (e) => {
                e.preventDefault();
                column.classList.add('column-active');
                handleColumnClick(column, e);
            });
            
            column.addEventListener('mouseup', (e) => {
                column.classList.remove('column-active');
            });
            
            column.addEventListener('mouseleave', (e) => {
                column.classList.remove('column-active');
            });
        }
        
        // Click handler as ultimate fallback
        column.addEventListener('click', (e) => {
            console.log("Click fallback triggered for column:", column.dataset.key);
            e.preventDefault();
            
            // Only trigger if not a touch device or if touch failed
            if (!isMobileDevice()) {
                handleColumnClick(column, e);
            }
        });
        
        // Prevent context menu on right click/long press
        column.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Add CSS for mobile optimizations
        if (isMobileDevice()) {
            column.style.cursor = 'pointer';
            column.style.webkitTapHighlightColor = 'transparent';
            column.style.webkitTouchCallout = 'none';
        }
    });
    
    console.log("Enhanced column event listeners setup for", columns.length, "columns");
}

// Create touch ripple effect
function createTouchRipple(x, y, element) {
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 10px;
        height: 10px;
        background: rgba(72, 219, 251, 0.6);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: touchRipple 0.4s ease-out;
        pointer-events: none;
        z-index: 1000;
    `;
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.remove();
        }
    }, 400);
}

// Add CSS animation for touch ripple
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes touchRipple {
            to {
                transform: translate(-50%, -50%) scale(8);
                opacity: 0;
            }
        }
        
        .column-active {
            background: rgba(72, 219, 251, 0.3) !important;
            transform: scale(0.98);
            transition: all 0.1s ease;
        }
        
        .column {
            transition: transform 0.1s ease, background 0.1s ease;
        }
    `;
    document.head.appendChild(style);
}

// Reset note states (remove any active effects)
export function resetNoteStates() {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.remove();
    });
    
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
        particle.remove();
    });
    
    const ripples = document.querySelectorAll('.ripple, .touch-ripple');
    ripples.forEach(ripple => {
        ripple.remove();
    });
    
    const flashes = document.querySelectorAll('.bottom-flash');
    flashes.forEach(flash => {
        flash.remove();
    });
    
    // Clear active touches
    activeTouches.clear();
    
    // Remove active states
    const activeColumns = document.querySelectorAll('.column-active');
    activeColumns.forEach(col => col.classList.remove('column-active'));
    
    console.log("Note states reset");
}

// Create piano keys for song editor
export function createEditorPianoKeys() {
    const pianoKeys = document.querySelector('.piano-keys');
    if (!pianoKeys) return;
    
    pianoKeys.innerHTML = '';
    
    // Create keys in reverse order for editor (top to bottom)
    const reversedKeys = [...GAME_CONFIG.keyOrder].reverse();
    
    reversedKeys.forEach(key => {
        const keyElement = document.createElement('div');
        keyElement.className = `editor-key ${GAME_CONFIG.keyColors[key]}-key`;
        keyElement.dataset.key = key;
        keyElement.textContent = key.toUpperCase();
        
        // Enhanced event handling for mobile
        if (isMobileDevice()) {
            keyElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                playEditorNote(key);
                keyElement.style.transform = 'scale(0.95)';
            }, { passive: false });
            
            keyElement.addEventListener('touchend', (e) => {
                e.preventDefault();
                keyElement.style.transform = '';
            }, { passive: false });
        } else {
            keyElement.addEventListener('mousedown', () => {
                playEditorNote(key);
                keyElement.style.transform = 'scale(0.95)';
            });
            
            keyElement.addEventListener('mouseup', () => {
                keyElement.style.transform = '';
            });
            
            keyElement.addEventListener('mouseleave', () => {
                keyElement.style.transform = '';
            });
        }
        
        // Click fallback
        keyElement.addEventListener('click', () => {
            if (!isMobileDevice()) {
                playEditorNote(key);
            }
        });
        
        pianoKeys.appendChild(keyElement);
    });
    
    console.log("Editor piano keys created");
}

// Play note in editor - ENHANCED
function playEditorNote(noteKey) {
    try {
        const frequency = GAME_CONFIG.noteFrequencies[noteKey];
        if (!frequency) return;
        
        // Check if AudioContext is supported
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.log("AudioContext not supported");
            return;
        }
        
        // Create audio context if not exists
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Resume AudioContext if suspended (required by some browsers)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create oscillator for note sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        // Envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log(`🎵 Playing editor note: ${noteKey}`);
        
    } catch (e) {
        console.error("Error playing editor note:", e);
    }
}

// Get note frequency
export function getNoteFrequency(key) {
    return GAME_CONFIG.noteFrequencies[key] || 0;
}

// Get key color
export function getKeyColor(key) {
    return GAME_CONFIG.keyColors[key] || 'white';
}

// Initialize piano - ENHANCED
export function initPiano() {
    console.log("🎹 Initializing Piano...");
    
    // Ensure game board exists before creating keys
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) {
        console.error("❌ Game board not found, piano initialization failed");
        return false;
    }
    
    createPianoKeys();
    
    // Add global touch prevention for better performance
    if (isMobileDevice()) {
        document.body.addEventListener('touchstart', () => {}, { passive: true });
        document.body.addEventListener('touchmove', (e) => {
            // Only prevent default on game board area
            if (e.target.closest('#game-board')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    console.log("✅ Piano initialized successfully");
    return true;
} 