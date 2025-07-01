// Piano Module
import { GAME_CONFIG } from '../config/constants.js';
import { handleColumnClick } from './game.js';

// Enhanced mobile detection
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768 || 
           ('ontouchstart' in window);
}

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
        column.className = `column ${GAME_CONFIG.keyColors[key]}`;
        column.dataset.key = key;
        
        // Add note label
        const label = document.createElement('div');
        label.className = 'note-label';
        label.textContent = key.toUpperCase();
        column.appendChild(label);
        
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
                    const rect = column.getBoundingClientRect();
                    const event = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        target: column,
                        isTouchEvent: true
                    };
                    
                    // Verify touch is within column bounds
                    if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
                        touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                        handleColumnClick(column, event);
                    }
                });
            }, { passive: false });
            
            // Touch end handler
            column.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, { passive: false });
            
            // Prevent touch move to avoid scrolling
            column.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        }
        
        // Mouse events for desktop (also works as fallback)
        column.addEventListener('mousedown', (e) => {
            if (!isMobileDevice()) {
                e.preventDefault();
                handleColumnClick(column, e);
            }
        });
        
        // Click handler as ultimate fallback
        column.addEventListener('click', (e) => {
            console.log("Click fallback triggered for column:", column.dataset.key);
            e.preventDefault();
            handleColumnClick(column, e);
        });
        
        // Prevent context menu on right click/long press
        column.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Add visual feedback for mobile
        if (isMobileDevice()) {
            column.style.cursor = 'pointer';
            column.style.webkitTapHighlightColor = 'transparent';
        }
    });
    
    console.log("Enhanced column event listeners setup for", columns.length, "columns");
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
    
    const ripples = document.querySelectorAll('.ripple');
    ripples.forEach(ripple => {
        ripple.remove();
    });
    
    const flashes = document.querySelectorAll('.bottom-flash');
    flashes.forEach(flash => {
        flash.remove();
    });
    
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
        keyElement.className = `editor-key ${GAME_CONFIG.keyColors[key]}`;
        keyElement.dataset.key = key;
        keyElement.textContent = key.toUpperCase();
        
        // Add click handler to play note
        keyElement.addEventListener('click', () => {
            playEditorNote(key);
        });
        
        pianoKeys.appendChild(keyElement);
    });
    
    console.log("Editor piano keys created");
}

// Play note in editor
function playEditorNote(noteKey) {
    try {
        const frequency = GAME_CONFIG.noteFrequencies[noteKey];
        if (!frequency) return;
        
        // Create audio context if not exists
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
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
        
        // Visual feedback
        const keyElement = document.querySelector(`[data-key="${noteKey}"]`);
        if (keyElement) {
            keyElement.style.transform = 'scale(0.95)';
            setTimeout(() => {
                keyElement.style.transform = '';
            }, 100);
        }
        
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
    return GAME_CONFIG.keyColors[key] || 'white-key';
}

// Initialize piano
export function initPiano() {
    createPianoKeys();
    console.log("Piano initialized");
} 