// Initialize app when window loads to ensure DOM is ready
window.onload = function() {
    console.log("Window loaded");
    
    // Game variables
    let score = 0;
    let gameSpeed = 0.3;
    let isGameRunning = false;
    let gameLoop;
    let tileSpeed = 0.2;
    let minTileGap = 400;
    let lastTileTime = 0;
    let activeAudio = [];
    let songPosition = 0;
    let lastNoteDuration = 1;
    let sideMargin = 0;
    let particles = [];
    let currentMode = 'game'; // 'game' or 'analyzer'
    
    // Audio analyzer variables
    let audioContext;
    let analyser;
    let microphone;
    let dataArray;
    let isRecording = false;
    let animationFrameId;
    
    // Note detection constants
    const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const A4_FREQ = 440.0;
    const A4_NOTE = 69; // MIDI note number for A4
    
    // Piano configuration
    const keyOrder = ['c5', 'd6', 'd5', 'e6', 'e5', 'f6', 'f5', 'g6', 'g5', 'a6', 'a5', 'b6', 'b5', 'c7', 'c6'];
    const keyColors = {
        'c5': 'white-key', 'd6': 'black-key', 'd5': 'white-key', 
        'e6': 'black-key', 'e5': 'white-key', 'f6': 'black-key', 
        'f5': 'white-key', 'g6': 'black-key', 'g5': 'white-key', 
        'a6': 'black-key', 'a5': 'white-key', 'b6': 'black-key', 
        'b5': 'white-key', 'c7': 'black-key', 'c6': 'white-key'
    };
    
    // Note frequencies in Hz for each key
    const noteFrequencies = {
        'c5': 523.25, 'd5': 587.33, 'e5': 659.25, 'f5': 698.46, 'g5': 783.99, 'a5': 880.00, 'b5': 987.77,
        'c6': 1046.50, 'd6': 1174.66, 'e6': 1318.51, 'f6': 1396.91, 'g6': 1567.98, 'a6': 1760.00, 'b6': 1975.53,
        'c7': 2093.00
    };
    
    // Happy Birthday song sequence
    const happyBirthdaySong = [
        ['c5', 0.5], ['c5', 0.5], ['d5', 1], ['c5', 1], ['f5', 1], ['e5', 2],
        ['c5', 0.5], ['c5', 0.5], ['d5', 1], ['c5', 1], ['g5', 1], ['f5', 2],
        ['c5', 0.5], ['c5', 0.5], ['c6', 1], ['a5', 1], ['f5', 1], ['e5', 1], ['d5', 1],
        ['a5', 0.5], ['a5', 0.5], ['a5', 1], ['f5', 1], ['g5', 1], ['f5', 2]
    ];
    
    // Get DOM elements
    const gameBoard = document.getElementById('game-board');
    console.log("Game board element:", gameBoard);
    
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('final-score');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const fullscreenHint = document.getElementById('fullscreen-hint');
    
    // Speed control
    const speedDownBtn = document.getElementById('speed-down');
    const speedUpBtn = document.getElementById('speed-up');
    const speedValue = document.getElementById('speed-value');
    
    // Margin control
    const marginDownBtn = document.getElementById('margin-down');
    const marginUpBtn = document.getElementById('margin-up');
    const marginValue = document.getElementById('margin-value');
    
    // Mode switch button
    const modeSwitch = document.getElementById('mode-switch');
    const audioAnalyzer = document.getElementById('audio-analyzer');
    const startRecording = document.getElementById('start-recording');
    const stopRecording = document.getElementById('stop-recording');
    const waveformCanvas = document.getElementById('waveform');
    const detectedNote = document.getElementById('detected-note');
    const detectedFrequency = document.getElementById('detected-frequency');
    
    // Canvas context
    const canvasCtx = waveformCanvas.getContext('2d');
    
    // Set canvas dimensions
    function setupCanvas() {
        waveformCanvas.width = waveformCanvas.offsetWidth;
        waveformCanvas.height = waveformCanvas.offsetHeight;
    }
    
    // Initialize audio analyzer
    function setupAudioAnalyzer() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Configure analyzer for better frequency resolution
            analyser.smoothingTimeConstant = 0.8;
            analyser.minDecibels = -100;
            analyser.maxDecibels = -10;
        } catch (e) {
            console.error("Error setting up audio analyzer:", e);
            alert("Could not initialize audio. Please make sure your browser supports audio recording.");
        }
    }
    
    // Start recording from microphone
    async function startAudioRecording() {
        if (isRecording) return;
        
        try {
            if (!audioContext) {
                setupAudioAnalyzer();
            }
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            
            isRecording = true;
            visualizeAudio();
        } catch (e) {
            console.error("Error starting audio recording:", e);
            alert("Could not access microphone. Please ensure you have given permission for microphone access.");
        }
    }
    
    // Stop recording
    function stopAudioRecording() {
        if (!isRecording) return;
        
        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        isRecording = false;
        detectedNote.textContent = "--";
        detectedFrequency.textContent = "0 Hz";
        
        // Clear canvas
        canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    }
    
    // Draw waveform and analyze frequency
    function visualizeAudio() {
        if (!isRecording) return;
        
        animationFrameId = requestAnimationFrame(visualizeAudio);
        
        // Get time domain data for waveform
        analyser.getByteTimeDomainData(dataArray);
        
        // Clear canvas
        canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        
        // Draw background
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        
        // Draw waveform
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(10, 189, 227)';
        canvasCtx.beginPath();
        
        const sliceWidth = waveformCanvas.width / dataArray.length;
        let x = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * waveformCanvas.height / 2;
            
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        canvasCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
        canvasCtx.stroke();
        
        // Draw glow effect
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = 'rgba(10, 189, 227, 0.7)';
        canvasCtx.stroke();
        
        // Analyze frequency for note detection
        analyzeFrequency();
    }
    
    // Analyze the frequency to detect the note
    function analyzeFrequency() {
        // Get frequency data
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);
        
        // Find the peak frequency
        let maxIndex = 0;
        let maxValue = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxIndex = i;
            }
        }
        
        // Convert index to frequency
        const nyquist = audioContext.sampleRate / 2;
        const frequency = maxIndex * nyquist / frequencyData.length;
        
        // Only process if there's a significant sound
        if (maxValue > 128) { // Threshold to avoid background noise
            // Get the note from frequency
            const note = getNote(frequency);
            
            // Update UI
            detectedNote.textContent = note;
            detectedFrequency.textContent = frequency.toFixed(2) + " Hz";
        } else {
            detectedNote.textContent = "--";
            detectedFrequency.textContent = "0 Hz";
        }
    }
    
    // Convert frequency to note name
    function getNote(frequency) {
        if (frequency < 27.5 || frequency > 4186) {
            return "--"; // Out of piano range
        }
        
        // Calculate the note using the formula: note = 12 * log2(f/A4)
        const noteNum = Math.round(12 * Math.log2(frequency / A4_FREQ)) + A4_NOTE;
        
        // Get note name and octave
        const noteName = NOTE_STRINGS[noteNum % 12];
        const octave = Math.floor(noteNum / 12) - 1;
        
        return noteName + octave;
    }
    
    // Mode switch event listener
    modeSwitch.addEventListener('click', function() {
        if (currentMode === 'game') {
            // Switch to analyzer mode
            currentMode = 'analyzer';
            modeSwitch.textContent = 'Switch to Game';
            gameBoard.style.display = 'none';
            audioAnalyzer.style.display = 'flex';
            
            // Pause game if running
            if (isGameRunning) {
                isGameRunning = false;
                cancelAnimationFrame(gameLoop);
            }
            
            // Set up audio analyzer
            setupCanvas();
        } else {
            // Switch to game mode
            currentMode = 'game';
            modeSwitch.textContent = 'Switch to Audio Analyzer';
            gameBoard.style.display = 'flex';
            audioAnalyzer.style.display = 'none';
            
            // Stop audio recording if active
            stopAudioRecording();
        }
    });
    
    // Audio control buttons
    startRecording.addEventListener('click', startAudioRecording);
    stopRecording.addEventListener('click', stopAudioRecording);
    
    // Resize event for canvas
    window.addEventListener('resize', function() {
        if (currentMode === 'analyzer') {
            setupCanvas();
        }
    });
    
    // Create piano keys
    function createPianoKeys() {
        console.log("Creating piano keys");
        if (!gameBoard) {
            console.error("Game board element not found!");
            return;
        }
        
        gameBoard.innerHTML = ''; // Clear existing columns
        
        keyOrder.forEach((key, index) => {
            const column = document.createElement('div');
            column.className = `column ${keyColors[key]}`;
            column.id = `column-${index}`;
            column.setAttribute('data-note', key);
            
            // Add note label at bottom
            const label = document.createElement('div');
            label.className = 'note-label';
            label.textContent = key.toUpperCase();
            column.appendChild(label);
            
            gameBoard.appendChild(column);
        });
        
        console.log("Piano keys created:", gameBoard.children.length);
    }
    
    // Create ripple effect on click
    function createRipple(event, element) {
        const circle = document.createElement('div');
        const rect = element.getBoundingClientRect();
        
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        circle.style.width = circle.style.height = `${size}px`;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.classList.add('ripple');
        
        element.appendChild(circle);
        
        setTimeout(() => {
            circle.remove();
        }, 600);
    }
    
    // Create particles effect
    function createParticles(x, y, color) {
        const particleCount = 15;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            const size = Math.random() * 10 + 5;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            particle.style.background = color || `hsl(${Math.random() * 60 + 180}, 100%, 70%)`;
            particle.style.opacity = Math.random() * 0.5 + 0.5;
            
            document.body.appendChild(particle);
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            // Start position
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            
            // Animate
            const startTime = Date.now();
            const duration = Math.random() * 1000 + 500;
            
            particles.push({
                element: particle,
                startTime,
                duration,
                x, y, vx, vy
            });
        }
    }
    
    // Update particles
    function updateParticles() {
        const currentTime = Date.now();
        
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const elapsed = currentTime - p.startTime;
            
            if (elapsed > p.duration) {
                p.element.remove();
                particles.splice(i, 1);
                continue;
            }
            
            const progress = elapsed / p.duration;
            const x = p.x + p.vx * progress;
            const y = p.y + p.vy * progress - 200 * progress * progress; // Add gravity
            
            p.element.style.left = `${x}px`;
            p.element.style.top = `${y}px`;
            p.element.style.opacity = 1 - progress;
            p.element.style.transform = `scale(${1 - progress})`;
        }
    }
    
    // Set up event listeners for columns
    function setupColumnEventListeners() {
        console.log("Setting up column event listeners");
        const columns = document.querySelectorAll('.column');
        console.log("Found columns:", columns.length);
        
        columns.forEach((column, index) => {
            ['click', 'touchstart'].forEach(eventType => {
                column.addEventListener(eventType, (e) => {
                    if (eventType === 'touchstart') {
                        e.preventDefault();
                    }
                    
                    if (!isGameRunning) return;
                    
                    // Add ripple effect
                    if (eventType === 'click') {
                        createRipple(e, column);
                    } else {
                        const touch = e.touches[0];
                        const touchEvent = {
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        };
                        createRipple(touchEvent, column);
                    }
                    
                    const tiles = column.querySelectorAll('.tile');
                    let validTileClicked = false;
                    
                    tiles.forEach(tile => {
                        const rect = tile.getBoundingClientRect();
                        const bottomPosition = rect.bottom;
                        const tileHeight = rect.height;
                        
                        if (bottomPosition >= window.innerHeight * 0.3 && 
                            bottomPosition <= window.innerHeight + tileHeight) {
                            validTileClicked = true;
                            score++;
                            scoreElement.textContent = score;
                            
                            tileSpeed = 0.2 + Math.floor(score / 15) * 0.06;
                            
                            // Visual effects for tile hit
                            tile.classList.add('tile-hit');
                            
                            // Create particles effect
                            const tileRect = tile.getBoundingClientRect();
                            createParticles(
                                tileRect.left + tileRect.width / 2,
                                tileRect.bottom,
                                getComputedStyle(tile).background
                            );
                            
                            const noteKey = column.getAttribute('data-note');
                            playNote(noteKey);
                            
                            setTimeout(() => {
                                tile.remove();
                            }, 300);
                        }
                    });
                    
                    if (!validTileClicked && tiles.length === 0) {
                        const columnRect = column.getBoundingClientRect();
                        const clickY = e.clientY || (e.touches && e.touches[0].clientY);
                        
                        if (clickY && clickY > window.innerHeight * 0.7) {
                            score++;
                            scoreElement.textContent = score;
                            const noteKey = column.getAttribute('data-note');
                            playNote(noteKey);
                            
                            // Create particles at click point
                            const x = e.clientX || (e.touches && e.touches[0].clientX);
                            const y = clickY;
                            createParticles(x, y);
                        }
                    }
                }, { passive: false });
            });
        });
    }
    
    // Speed control event listeners
    speedDownBtn.addEventListener('click', function() {
        let newSpeed = parseFloat(speedValue.textContent) - 0.1;
        if (newSpeed < 0.1) newSpeed = 0.1;
        tileSpeed = newSpeed;
        speedValue.textContent = newSpeed.toFixed(1);
        
        minTileGap = 400 * (0.2 / newSpeed);
    });
    
    speedUpBtn.addEventListener('click', function() {
        let newSpeed = parseFloat(speedValue.textContent) + 0.1;
        if (newSpeed > 1.0) newSpeed = 1.0;
        tileSpeed = newSpeed;
        speedValue.textContent = newSpeed.toFixed(1);
        
        minTileGap = 400 * (0.2 / newSpeed);
    });
    
    // Margin control event listeners
    marginDownBtn.addEventListener('click', function() {
        sideMargin = Math.max(0, sideMargin - 0.5);
        updateMargins();
    });
    
    marginUpBtn.addEventListener('click', function() {
        sideMargin = Math.min(40, sideMargin + 0.5);
        updateMargins();
    });
    
    function updateMargins() {
        marginValue.textContent = sideMargin + '%';
        gameBoard.style.marginLeft = sideMargin + '%';
        gameBoard.style.marginRight = sideMargin + '%';
        gameBoard.style.width = (100 - (sideMargin * 2)) + '%';
    }
    
    // Create initial piano keys and set up event listeners
    createPianoKeys();
    setupColumnEventListeners();
    createBottomHighlight();
    
    // Apply initial margins
    updateMargins();
    
    // Fullscreen API function
    function toggleFullScreen() {
        const doc = window.document;
        const docEl = doc.documentElement;
        
        const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || 
                                docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || 
                                doc.webkitExitFullscreen || doc.msExitFullscreen;
        
        if (!doc.fullscreenElement && !doc.mozFullScreenElement && 
            !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            requestFullScreen.call(docEl);
        } else {
            cancelFullScreen.call(doc);
        }
    }
    
    // Auto request fullscreen when starting game
    startButton.addEventListener('click', function() {
        startGame();
        toggleFullScreen();
    });
    
    // Set up event listeners
    restartButton.addEventListener('click', startGame);
    fullscreenHint.addEventListener('click', toggleFullScreen);
    
    function startGame() {
        console.log("Starting game");
        score = 0;
        tileSpeed = parseFloat(speedValue.textContent);
        scoreElement.textContent = score;
        isGameRunning = true;
        songPosition = 0;
        
        document.querySelectorAll('.tile').forEach(tile => tile.remove());
        document.querySelectorAll('.particle').forEach(p => p.remove());
        particles = [];
        
        createPianoKeys();
        setupColumnEventListeners();
        
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        
        lastTileTime = 0;
        gameLoop = requestAnimationFrame(update);
    }
    
    function endGame() {
        isGameRunning = false;
        finalScoreElement.textContent = score;
        gameOverScreen.style.display = 'flex';
        
        activeAudio.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        activeAudio = [];
        
        cancelAnimationFrame(gameLoop);
    }
    
    function update(timestamp) {
        if (!isGameRunning) return;
        
        const tiles = document.querySelectorAll('.tile');
        
        tiles.forEach(tile => {
            const currentBottom = parseFloat(tile.style.bottom || '100');
            const newBottom = currentBottom - tileSpeed;
            tile.style.bottom = `${newBottom}%`;
            
            // Check if tile has reached the bottom zone
            if (newBottom <= 0 && newBottom > -10 && !tile.classList.contains('tile-missed')) {
                // Tile hit bottom - show miss effect
                tile.classList.add('tile-missed');
                
                // Flash effect on the column
                const column = tile.parentElement;
                column.classList.add('column-flash');
                setTimeout(() => {
                    column.classList.remove('column-flash');
                }, 300);
                
                // Create global bottom flash effect
                createBottomFlash();
                
                // Create particles for missed tile
                const tileRect = tile.getBoundingClientRect();
                createParticles(
                    tileRect.left + tileRect.width / 2,
                    tileRect.bottom,
                    '#0abde3'
                );
            }
            
            if (newBottom < -50) {
                tile.remove();
            }
        });
        
        if (timestamp - lastTileTime > getNextTileGap()) {
            lastTileTime = timestamp;
            createNewTileFromSong();
        }
        
        // Update particles
        updateParticles();
        
        gameLoop = requestAnimationFrame(update);
    }
    
    function getNextTileGap() {
        if (songPosition < happyBirthdaySong.length) {
            const [_, duration] = happyBirthdaySong[songPosition];
            
            let gap = minTileGap * (duration * 2.5);
            
            if (songPosition % 6 === 0) {
                gap += minTileGap * 1.5;
            }
            
            if (songPosition % 12 === 0 && songPosition > 0) {
                gap += minTileGap * 2;
            }
            
            return gap;
        }
        return minTileGap;
    }
    
    function createNewTileFromSong() {
        if (songPosition >= happyBirthdaySong.length) {
            songPosition = 0;
        }
        
        const [note, duration] = happyBirthdaySong[songPosition];
        lastNoteDuration = duration;
        songPosition++;
        
        const columnIndex = keyOrder.indexOf(note);
        if (columnIndex === -1) return;
        
        const columns = document.querySelectorAll('.column');
        if (columnIndex >= columns.length) {
            console.error("Column index out of range:", columnIndex, columns.length);
            return;
        }
        
        const column = columns[columnIndex];
        
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.style.bottom = '100%';
        
        tile.style.height = `${Math.min(25 * duration, 40)}%`;
        
        column.appendChild(tile);
    }
    
    function playNote(noteKey) {
        const frequency = noteFrequencies[noteKey];
        if (!frequency) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.3;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        
        setTimeout(() => {
            oscillator.stop();
        }, 500);
        
        activeAudio.push(oscillator);
    }
    
    // Create a flash effect at the bottom of the screen
    function createBottomFlash() {
        // Check if there's already a flash animation in progress
        let flash = document.querySelector('.bottom-flash');
        
        if (!flash) {
            flash = document.createElement('div');
            flash.className = 'bottom-flash';
            gameBoard.appendChild(flash);
        }
        
        // Reset the animation
        flash.classList.remove('bottom-flash-animate');
        void flash.offsetWidth; // Trigger reflow
        flash.classList.add('bottom-flash-animate');
        
        // Remove the flash after animation completes
        setTimeout(() => {
            flash.classList.remove('bottom-flash-animate');
        }, 500);
    }
    
    // Add a highlight line at the bottom to show the target zone
    function createBottomHighlight() {
        const highlight = document.createElement('div');
        highlight.className = 'bottom-highlight';
        gameBoard.appendChild(highlight);
    }
    
    // Check for orientation change
    window.addEventListener('resize', function() {
        const orientationMessage = document.getElementById('orientation-message');
        const gameContainer = document.getElementById('game-container');
        
        if (window.innerWidth < window.innerHeight) {
            orientationMessage.style.display = 'flex';
            gameContainer.style.display = 'none';
            if (isGameRunning) {
                cancelAnimationFrame(gameLoop);
            }
        } else {
            orientationMessage.style.display = 'none';
            gameContainer.style.display = 'block';
            if (isGameRunning) {
                gameLoop = requestAnimationFrame(update);
            }
        }
    });
    
    // Force initial orientation check
    window.dispatchEvent(new Event('resize'));
    
    // Enable auto fullscreen for iOS devices when added to home screen
    if (window.navigator.standalone) {
        document.documentElement.style.width = '100%';
        document.documentElement.style.height = '100%';
    }
    
    // Hide fullscreen button on iOS (not supported in Safari)
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        fullscreenHint.style.display = 'none';
    }
}; 