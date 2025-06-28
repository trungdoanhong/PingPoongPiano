// Game Logic Module
import { GAME_CONFIG } from '../config/constants.js';
import { showNotification } from '../ui/notifications.js';
import { getGameSpeed } from '../ui/controls.js';

let score = 0;
let isGameRunning = false;
let gameLoop;
let activeAudio = [];
let songPosition = 0;
let particles = [];
let currentGameSong = [];
let selectedSongForGame = null;
let gameStartTime = 0;
let lastSpawnTime = 0;

// Game state getters
export function getScore() { return score; }
export function isRunning() { return isGameRunning; }
export function getCurrentSong() { return currentGameSong; }

// Set current game song
export function setCurrentSong(song) {
    selectedSongForGame = song;
    if (song && song.notes) {
        currentGameSong = [...song.notes].sort((a, b) => a.time - b.time);
        console.log("Game song set:", song.name, "Notes:", currentGameSong.length);
    }
}

// Start the game
export function startGame() {
    if (!selectedSongForGame || !selectedSongForGame.notes || selectedSongForGame.notes.length === 0) {
        showNotification('Vui lòng chọn bài hát trong Song Manager trước khi chơi!', 'warning');
        return;
    }
    
    console.log("Starting game with song:", selectedSongForGame.name);
    
    score = 0;
    songPosition = 0;
    particles = [];
    gameStartTime = performance.now();
    lastSpawnTime = 0;
    
    document.querySelectorAll('.tile').forEach(tile => tile.remove());
    
    updateScore();
    hideStartScreen();
    hideGameOver();
    
    isGameRunning = true;
    gameLoop = requestAnimationFrame(update);
    
    showNotification(`Bắt đầu chơi: ${selectedSongForGame.name}`, 'success');
}

// End the game
export function endGame() {
    isGameRunning = false;
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
        gameLoop = null;
    }
    
    activeAudio.forEach(audio => {
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    activeAudio = [];
    
    showGameOver();
    
    console.log("Game ended with score:", score);
    showNotification(`Game Over! Score: ${score}`, 'info');
}

// Main game update loop
function update(timestamp) {
    if (!isGameRunning) return;
    
    const deltaTime = timestamp - gameStartTime;
    const currentSpeed = getGameSpeed();
    
    updateParticles();
    checkAndSpawnNotes(deltaTime);
    
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        if (!tile.dataset.hit) {
            const currentTop = parseFloat(tile.style.top) || -25;
            const newTop = currentTop + (currentSpeed * 2);
            tile.style.top = newTop + '%';
            
            if (newTop > 100) {
                if (!tile.classList.contains('tile-missed')) {
                    tile.classList.add('tile-missed');
                    console.log("Tile missed!");
                }
                setTimeout(() => {
                    if (tile.parentNode) {
                        tile.remove();
                    }
                }, 500);
            }
        }
    });
    
    gameLoop = requestAnimationFrame(update);
}

// Check and spawn notes
function checkAndSpawnNotes(deltaTime) {
    if (!currentGameSong || currentGameSong.length === 0) return;
    
    const bpm = selectedSongForGame.bpm || 120;
    const beatInterval = 60000 / bpm;
    const noteThreshold = beatInterval * 4;
    
    while (songPosition < currentGameSong.length) {
        const note = currentGameSong[songPosition];
        const noteTime = note.time * (beatInterval / 4);
        
        if (deltaTime + noteThreshold >= noteTime) {
            spawnNote(note);
            songPosition++;
        } else {
            break;
        }
    }
    
    if (songPosition >= currentGameSong.length) {
        const remainingTiles = document.querySelectorAll('.tile:not(.tile-hit):not(.tile-missed)');
        if (remainingTiles.length === 0) {
            setTimeout(() => {
                endGame();
            }, 2000);
        }
    }
}

// Spawn a note tile
function spawnNote(noteData) {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) return;
    
    const columns = gameBoard.querySelectorAll('.column');
    const keyIndex = GAME_CONFIG.keyOrder.indexOf(noteData.key);
    
    if (keyIndex === -1 || keyIndex >= columns.length) {
        console.warn("Invalid note key:", noteData.key);
        return;
    }
    
    const column = columns[keyIndex];
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.top = '-25%';
    tile.style.position = 'absolute';
    tile.style.width = '100%';
    tile.dataset.key = noteData.key;
    tile.dataset.time = noteData.time;
    
    const duration = noteData.duration || 1;
    const heightPercent = Math.min(duration * 10, 50);
    tile.style.height = heightPercent + '%';
    
    column.appendChild(tile);
    
    console.log("Spawned note:", noteData.key, "at time:", noteData.time);
}

// Handle column click/tap
export function handleColumnClick(columnElement, event) {
    if (!isGameRunning) return;
    
    const key = columnElement.dataset.key;
    if (!key) return;
    
    const tiles = columnElement.querySelectorAll('.tile:not(.tile-hit):not(.tile-missed)');
    let hitTile = null;
    
    tiles.forEach(tile => {
        const tileTop = parseFloat(tile.style.top);
        if (tileTop >= 70 && tileTop <= 100) {
            hitTile = tile;
        }
    });
    
    if (hitTile) {
        hitTile.classList.add('tile-hit');
        hitTile.dataset.hit = 'true';
        score += 10;
        updateScore();
        
        playNote(key);
        createRipple(event, columnElement);
        createParticles(event.clientX, event.clientY, '#0abde3');
        createBottomFlash();
        
        setTimeout(() => {
            if (hitTile.parentNode) {
                hitTile.remove();
            }
        }, 300);
        
        console.log("Hit! Score:", score);
    } else {
        createRipple(event, columnElement);
        console.log("Miss - no tile in hit zone");
    }
}

// Play note sound
function playNote(noteKey) {
    try {
        const frequency = GAME_CONFIG.noteFrequencies[noteKey];
        if (!frequency) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        
    } catch (e) {
        console.error("Error playing note:", e);
    }
}

// Create ripple effect
function createRipple(event, element) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.remove();
        }
    }, 600);
}

// Create particle effects
function createParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
        const particle = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            life: 1,
            decay: Math.random() * 0.02 + 0.02,
            color: color,
            element: null
        };
        
        particle.element = document.createElement('div');
        particle.element.className = 'particle';
        particle.element.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            left: ${x}px;
            top: ${y}px;
        `;
        
        document.body.appendChild(particle.element);
        particles.push(particle);
    }
}

// Update particles
function updateParticles() {
    particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1;
        particle.life -= particle.decay;
        
        if (particle.element) {
            particle.element.style.left = particle.x + 'px';
            particle.element.style.top = particle.y + 'px';
            particle.element.style.opacity = particle.life;
        }
        
        if (particle.life <= 0) {
            if (particle.element && particle.element.parentNode) {
                particle.element.remove();
            }
            particles.splice(index, 1);
        }
    });
}

// Create bottom flash effect
function createBottomFlash() {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) return;
    
    const flash = document.createElement('div');
    flash.className = 'bottom-flash';
    flash.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 20%;
        background: linear-gradient(to top, rgba(10, 189, 227, 0.8), transparent);
        pointer-events: none;
        z-index: 100;
    `;
    
    gameBoard.appendChild(flash);
    flash.classList.add('bottom-flash-animate');
    
    setTimeout(() => {
        if (flash.parentNode) {
            flash.remove();
        }
    }, 300);
}

// Update score display
function updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = score;
    }
}

// Show/hide UI screens
function hideStartScreen() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.display = 'none';
    }
}

function showGameOver() {
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    
    if (gameOverScreen) {
        gameOverScreen.style.display = 'flex';
    }
    if (finalScoreElement) {
        finalScoreElement.textContent = score;
    }
}

function hideGameOver() {
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
        gameOverScreen.style.display = 'none';
    }
}

// Initialize game controls
export function initGameControls() {
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const restartGameBtn = document.getElementById('restart-game-btn');
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            // Switch to song manager to select a song
            if (window.switchMode) {
                window.switchMode('song-manager');
            }
        });
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            if (currentGameSong) {
                startGame();
            } else {
                showNotification('Vui lòng chọn bài hát từ Song Manager', 'info');
                if (window.switchMode) {
                    window.switchMode('song-manager');
                }
            }
        });
    }
    
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', () => {
            if (currentGameSong) {
                startGame();
            } else {
                showNotification('Vui lòng chọn bài hát từ Song Manager', 'info');
                if (window.switchMode) {
                    window.switchMode('song-manager');
                }
            }
        });
    }
    
    console.log("Game controls initialized");
} 