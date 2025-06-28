// Piano Module
import { GAME_CONFIG } from '../config/constants.js';
import { handleColumnClick } from './game.js';

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

// Setup event listeners for piano columns
function setupColumnEventListeners() {
    const columns = document.querySelectorAll('.column');
    
    columns.forEach(column => {
        // Mouse events
        column.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleColumnClick(column, e);
        });
        
        // Touch events for mobile
        column.addEventListener('touchstart', (e) => {
            e.preventDefault();
            
            // Handle multiple touches
            Array.from(e.touches).forEach(touch => {
                const event = {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
                handleColumnClick(column, event);
            });
        });
        
        // Prevent context menu on right click
        column.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
    
    console.log("Column event listeners setup for", columns.length, "columns");
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