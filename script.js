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
    let currentMode = 'game'; // 'game' or 'analyzer' or 'song-manager'
    
    // Audio analyzer variables
    let audioContext;
    let analyser;
    let microphone;
    let dataArray;
    let isRecording = false;
    let animationFrameId;
    let audioPermissionGranted = false;
    let mediaStream = null; // Store the media stream for proper cleanup
    
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
    const gameContent = document.getElementById('game-content');
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
    
    // Menu and mode elements
    const menuItems = document.querySelectorAll('.menu-item');
    const menuButton = document.getElementById('menu-button');
    const controlsContainer = document.getElementById('controls-container');
    const audioAnalyzer = document.getElementById('audio-analyzer');
    const songManager = document.getElementById('song-manager');
    const startRecording = document.getElementById('start-recording');
    const stopRecording = document.getElementById('stop-recording');
    const waveformCanvas = document.getElementById('waveform');
    const detectedNote = document.getElementById('detected-note');
    const detectedFrequency = document.getElementById('detected-frequency');
    
    // Canvas context
    const canvasCtx = waveformCanvas.getContext('2d');
    
    // Set canvas dimensions
    function setupCanvas() {
        console.log("Setting up canvas with dimensions:", 
            waveformCanvas.offsetWidth, waveformCanvas.offsetHeight);
        
        waveformCanvas.width = waveformCanvas.offsetWidth;
        waveformCanvas.height = waveformCanvas.offsetHeight;
        
        // Clear canvas to a clean state
        if (canvasCtx) {
            canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
            canvasCtx.fillStyle = 'rgba(30, 39, 46, 0.5)';
            canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        }
    }
    
    // Request audio permission before initializing
    async function requestAudioPermission() {
        try {
            console.log("Requesting audio permission...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioPermissionGranted = true;
            
            // Stop the stream immediately since we're just checking permissions
            stream.getTracks().forEach(track => track.stop());
            
            // Now initialize the audio analyzer
            setupAudioAnalyzer();
            
            console.log("Audio permission granted successfully");
            return true;
        } catch (e) {
            console.error("Could not get audio permission:", e);
            alert("Audio analyzer requires microphone permission. Please allow microphone access to use this feature.");
            audioPermissionGranted = false;
            return false;
        }
    }
    
    // Initialize audio analyzer
    function setupAudioAnalyzer() {
        if (audioContext) {
            // If context is suspended, resume it
            if (audioContext.state === 'suspended') {
                audioContext.resume().catch(err => {
                    console.error("Error resuming audio context:", err);
                });
            }
            return; // Avoid re-initializing
        }
        
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
            
            console.log("Audio analyzer setup complete");
        } catch (e) {
            console.error("Error setting up audio analyzer:", e);
            alert("Could not initialize audio. Please make sure your browser supports audio recording.");
        }
    }
    
    // Start recording from microphone
    async function startAudioRecording() {
        console.log("Starting audio recording...");
        if (isRecording) return;
        
        // Check if permission has been granted
        if (!audioPermissionGranted) {
            const permissionGranted = await requestAudioPermission();
            if (!permissionGranted) return;
        }
        
        try {
            if (!audioContext) {
                setupAudioAnalyzer();
            }
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            
            // Clean up any existing stream first
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphone = audioContext.createMediaStreamSource(mediaStream);
            microphone.connect(analyser);
            
            isRecording = true;
            visualizeAudio();
            
            // Update button appearance
            startRecording.style.background = 'rgba(10, 189, 227, 0.7)';
            stopRecording.style.background = 'rgba(0, 0, 0, 0.3)';
            
            console.log("Recording started successfully");
        } catch (e) {
            console.error("Error starting audio recording:", e);
            alert("Could not access microphone. Please ensure you have given permission for microphone access.");
        }
    }
    
    // Stop recording
    function stopAudioRecording() {
        console.log("Stopping audio recording...");
        if (!isRecording) return;
        
        isRecording = false;
        
        // Cancel animation frame to stop visualization
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        
        // Clean up the media stream
        if (mediaStream) {
            try {
                mediaStream.getTracks().forEach(track => {
                    track.stop();
                });
                mediaStream = null;
            } catch (e) {
                console.error("Error stopping tracks:", e);
            }
        }
        
        if (microphone) {
            try {
                microphone.disconnect();
                microphone = null;
            } catch (e) {
                console.error("Error disconnecting microphone:", e);
            }
        }
        
        // Update button appearance
        startRecording.style.background = 'rgba(0, 0, 0, 0.3)';
        stopRecording.style.background = 'rgba(255, 0, 0, 0.4)';
        
        // Reset displays
        detectedNote.textContent = "--";
        detectedFrequency.textContent = "0 Hz";
        
        // Clear canvas
        if (canvasCtx && waveformCanvas) {
            canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        }
        
        console.log("Recording stopped successfully");
    }
    
    // Visualize audio
    function visualizeAudio() {
        if (!isRecording) return;
        
        animationFrameId = requestAnimationFrame(visualizeAudio);
        
        analyser.getByteTimeDomainData(dataArray);
        
        // Clear canvas
        canvasCtx.fillStyle = 'rgba(30, 39, 46, 0.5)';
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
        
        // Analyze frequency on every other frame
        if (Math.random() < 0.5) {
            analyzeFrequency();
        }
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
    
    // Toggle the menu dropdown
    function toggleMenuDropdown() {
        menuButton.classList.toggle('active');
        
        // Close dropdown when clicking outside
        if (menuButton.classList.contains('active')) {
            setTimeout(() => {
                document.addEventListener('click', closeMenuOnClickOutside);
            }, 0);
        }
    }
    
    // Close the menu dropdown when clicking outside
    function closeMenuOnClickOutside(e) {
        if (!menuButton.contains(e.target)) {
            menuButton.classList.remove('active');
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
    
    // Reset trạng thái note
    function resetNoteStates() {
        // Đặt lại các biến trạng thái
        isDragging = false;
        isResizing = false;
        currentDraggedNote = null;
        
        // Nếu đang ở trong chế độ Song Manager, dọn dẹp các note
        if (currentMode === 'song-manager') {
            cleanupNotes();
        }
    }
    
    // Switch between game modes
    function switchMode(mode) {
        if (mode === currentMode) return;
        
        console.log("Switching to mode:", mode);
        
        // Reset note states when switching modes
        resetNoteStates();
        
        // Update menu button text based on mode
        if (mode === 'game') {
            menuButton.firstChild.textContent = 'Piano Game ▾';
        } else if (mode === 'analyzer') {
            menuButton.firstChild.textContent = 'Audio Analyzer ▾';
        } else if (mode === 'song-manager') {
            menuButton.firstChild.textContent = 'Song Manager ▾';
        } else if (mode === 'music-theory') {
            menuButton.firstChild.textContent = 'Music Theory ▾';
            // Redirect to music theory page
            window.location.href = 'music-theory.html';
            return; // Exit function since we're redirecting
        }
        
        // Update menu items
        menuItems.forEach(item => {
            if (item.getAttribute('data-mode') === mode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Close the dropdown
        menuButton.classList.remove('active');
        
        // Hide all content sections first
        gameContent.style.display = 'none';
        audioAnalyzer.style.display = 'none';
        songManager.style.display = 'none';
        
        // Switch mode
        currentMode = mode;
        
        if (mode === 'game') {
            // Switch to game mode
            gameContent.style.display = 'block';
            
            // Show score panel and controls
            scoreElement.parentElement.style.display = 'block';
            speedDownBtn.parentElement.style.display = 'flex';
            marginDownBtn.parentElement.style.display = 'flex';
            
            // Remove analyzer mode class
            controlsContainer.classList.remove('analyzer-mode');
            
            // Stop audio recording if active
            if (isRecording) {
                stopAudioRecording();
            }
            
            // If game was running, resume it
            if (isGameRunning) {
                gameLoop = requestAnimationFrame(update);
            } else {
                // Show start screen if game isn't running
                startScreen.style.display = 'flex';
                gameOverScreen.style.display = 'none';
            }
        } else if (mode === 'analyzer') {
            // Switch to analyzer mode
            audioAnalyzer.style.display = 'flex';
            
            // Hide score panel and game controls (but keep menu button visible)
            scoreElement.parentElement.style.display = 'none';
            speedDownBtn.parentElement.style.display = 'none';
            marginDownBtn.parentElement.style.display = 'none';
            
            // Add analyzer mode class to align menu button to right
            controlsContainer.classList.add('analyzer-mode');
            
            // Pause game if running
            if (isGameRunning) {
                cancelAnimationFrame(gameLoop);
            }
            
            // Set up audio analyzer
            setupCanvas();
            
            // Request audio permission if not already granted
            if (!audioPermissionGranted) {
                requestAudioPermission();
            }
        } else if (mode === 'song-manager') {
            // Switch to song manager mode
            songManager.style.display = 'flex';
            
            // Hide score panel and game controls (but keep menu button visible)
            scoreElement.parentElement.style.display = 'none';
            speedDownBtn.parentElement.style.display = 'none';
            marginDownBtn.parentElement.style.display = 'none';
            
            // Add analyzer mode class to align menu button to right
            controlsContainer.classList.add('analyzer-mode');
            
            // Pause game if running
            if (isGameRunning) {
                cancelAnimationFrame(gameLoop);
            }
            
            // Initialize song manager if not already done
            initSongManager();
        }
    }
    
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
    
    // Auto request fullscreen when starting game - event listeners set in initializeApp
    
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
        
        // Switch to game mode if in analyzer mode
        if (currentMode !== 'game') {
            switchMode('game');
        }
        
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
            if (isGameRunning && currentMode === 'game') {
                gameLoop = requestAnimationFrame(update);
            }
        }
        
        // Resize canvas if in analyzer mode
        if (currentMode === 'analyzer') {
            setupCanvas();
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

    // Kiểm tra xem localStorage có khả dụng không
    function isLocalStorageAvailable() {
        try {
            const test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Check for browser audio support and initialize the app
    function initializeApp() {
        // Check if Web Audio API is supported
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.error("Web Audio API is not supported in this browser");
            alert("Your browser doesn't support audio features. Please use a modern browser like Chrome, Firefox, or Edge.");
            return;
        }
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("getUserMedia is not supported in this browser");
            alert("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Firefox, or Edge.");
            return;
        }
        
        // Create piano keys and set up event listeners
        createPianoKeys();
        setupColumnEventListeners();
        createBottomHighlight();
        
        // Apply initial margins
        updateMargins();
        
        // Force initial orientation check
        window.dispatchEvent(new Event('resize'));
        
        // Setup menu button click event
        menuButton.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenuDropdown();
        });
        
        // Setup menu click events
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = item.getAttribute('data-mode');
                switchMode(mode);
            });
        });
        
        // Set initial menu button text
        menuButton.firstChild.textContent = 'Piano Game ▾';
        
        // Audio control buttons
        startRecording.addEventListener('click', function() {
            console.log("Start recording button clicked");
            startAudioRecording();
        });
        
        stopRecording.addEventListener('click', function() {
            console.log("Stop recording button clicked");
            stopAudioRecording();
        });
        
        // Set up start and restart button listeners
        startButton.addEventListener('click', function() {
            startGame();
            toggleFullScreen();
        });
        
        restartButton.addEventListener('click', startGame);
        fullscreenHint.addEventListener('click', toggleFullScreen);
        
        console.log("App initialized successfully");
    }
    
    // Initialize the app
    initializeApp();
    
    // Song Manager Variables
    let songs = [];
    let currentSong = null;
    let currentNoteDuration = 2; // Default to 1/2 note
    let isEditorPlaying = false;
    let editorPlaybackInterval;
    let currentPlayPosition = 0;
    let selectedNoteElement = null;
    let serverAvailable = false;
    let isLoadingSongs = false; // Biến theo dõi trạng thái đang tải bài hát
    const API_URL = 'http://localhost:3000/api/songs';
    
    // Biến cho tính năng kéo-thả note
    let isDragging = false;
    let isResizing = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let originalNotePosition = 0;
    let originalNoteWidth = 0;
    let currentDraggedNote = null;
    let dragOffsetX = 0; // Thêm offset để tính toán chính xác vị trí
    let dragOffsetY = 0; // Thêm offset để tính toán chính xác vị trí
    let lastInteractionTime = 0; // Thời gian tương tác cuối cùng để tránh xung đột sự kiện
    let clickProcessedOnNote = false; // Biến mới để theo dõi xem click đã được xử lý trên note hay chưa
    
    // Biến cho tính năng nhấn giữ (long press) để xóa note trên điện thoại
    let longPressTimer = null;
    let longPressThreshold = 600; // 600ms để được tính là nhấn giữ
    
    // Song Manager DOM Elements
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const songList = document.getElementById('song-list');
    const newSongBtn = document.getElementById('new-song-btn');
    const importSongBtn = document.getElementById('import-song-btn');
    const saveSongBtn = document.getElementById('save-song-btn');
    const exportSongBtn = document.getElementById('export-song-btn');
    const testSongBtn = document.getElementById('test-song-btn');
    const playEditorBtn = document.getElementById('play-editor-btn');
    const stopEditorBtn = document.getElementById('stop-editor-btn');
    const durationBtns = document.querySelectorAll('.duration-btn');
    const pianoKeysContainer = document.querySelector('.piano-keys');
    const noteGrid = document.querySelector('.note-grid');
    
    // Initialize the Song Manager
    function initSongManager() {
        // If already initialized, just return
        if (pianoKeysContainer.children.length > 0) return;
        
        // Check if server is available
        checkServerAvailability();
        
        // Create piano keys in the editor
        createEditorPianoKeys();
        
        // Create grid lines
        createGridLines();
        
        // Load songs
        loadSongs();
        
        // Setup event listeners
        setupSongManagerEvents();
        
        // Thêm nút sửa lỗi notes
        addFixButton();
        
        // Thêm nút làm mới danh sách bài hát
        addRefreshButton();
    }
    
    // Thêm nút làm mới danh sách bài hát
    function addRefreshButton() {
        // Kiểm tra xem nút đã tồn tại chưa
        if (document.getElementById('refresh-songs-btn')) return;
        
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refresh-songs-btn';
        refreshButton.innerHTML = '<span style="font-size: 16px;">&#x21bb;</span> Làm mới';
        refreshButton.style.position = 'absolute';
        refreshButton.style.right = '10px';
        refreshButton.style.top = '10px';
        refreshButton.style.padding = '5px 10px';
        refreshButton.style.fontSize = '12px';
        refreshButton.style.background = 'rgba(10, 189, 227, 0.2)';
        refreshButton.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        refreshButton.style.borderRadius = '4px';
        refreshButton.style.color = 'white';
        refreshButton.style.cursor = 'pointer';
        
        refreshButton.addEventListener('click', function() {
            this.innerHTML = '<span style="font-size: 16px;">&#x21bb;</span> Đang tải...';
            this.style.opacity = '0.7';
            this.disabled = true;
            
            // Làm mới danh sách bài hát
            loadSongs(true).then(() => {
                this.innerHTML = '<span style="font-size: 16px;">&#x21bb;</span> Làm mới';
                this.style.opacity = '1';
                this.disabled = false;
            }).catch(() => {
                this.innerHTML = '<span style="font-size: 16px;">&#x21bb;</span> Thất bại';
                setTimeout(() => {
                    this.innerHTML = '<span style="font-size: 16px;">&#x21bb;</span> Làm mới';
                    this.style.opacity = '1';
                    this.disabled = false;
                }, 2000);
            });
        });
        
        // Thêm vào vùng chứa danh sách bài hát
        const songListContainer = document.querySelector('.song-list-container');
        if (songListContainer) {
            songListContainer.appendChild(refreshButton);
        }
    }
    
    // Check if server is available
    function checkServerAvailability() {
        // Thêm hiển thị trạng thái kết nối
        updateConnectionStatus('Đang kiểm tra kết nối...');
        
        return fetch(API_URL)
            .then(response => {
                serverAvailable = true;
                updateConnectionStatus('Đã kết nối với server');
                console.log("Server is available");
                return true;
            })
            .catch(error => {
                serverAvailable = false;
                updateConnectionStatus('Đang sử dụng lưu trữ cục bộ');
                console.log("Server is not available, using localStorage");
                return false;
            });
    }
    
    // Hiển thị trạng thái kết nối
    function updateConnectionStatus(message) {
        let statusElement = document.getElementById('connection-status');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'connection-status';
            statusElement.style.position = 'absolute';
            statusElement.style.left = '10px';
            statusElement.style.top = '10px';
            statusElement.style.fontSize = '12px';
            statusElement.style.color = 'rgba(255, 255, 255, 0.7)';
            statusElement.style.padding = '5px';
            statusElement.style.borderRadius = '3px';
            statusElement.style.background = 'rgba(0, 0, 0, 0.2)';
            
            const songListContainer = document.querySelector('.song-list-container');
            if (songListContainer) {
                songListContainer.appendChild(statusElement);
            }
        }
        
        statusElement.textContent = message;
        
        // Đổi màu theo trạng thái
        if (message.includes('server')) {
            statusElement.style.color = '#4ecca3'; // Màu xanh lá
        } else if (message.includes('cục bộ')) {
            statusElement.style.color = '#ffbe76'; // Màu cam
        } else {
            statusElement.style.color = 'rgba(255, 255, 255, 0.7)'; // Màu trắng mờ
        }
    }
    
    // Load songs from server or localStorage
    function loadSongs(forceRefresh = false) {
        // Tránh tải lại nếu đang tải
        if (isLoadingSongs && !forceRefresh) return Promise.resolve();
        
        isLoadingSongs = true;
        
        // Hiển thị trạng thái tải
        updateSongLoadingStatus('Đang tải bài hát...');
        
        if (serverAvailable) {
            // Load from server
            return fetch(API_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Không thể kết nối với server');
                    }
                    return response.json();
                })
                .then(data => {
                    songs = data;
                    // Add default song if no songs exist
                    if (songs.length === 0) {
                        return addHappyBirthdaySong().then(() => {
                            updateSongList();
                            updateSongLoadingStatus('');
                            isLoadingSongs = false;
                        });
                    } else {
                        updateSongList();
                        updateSongLoadingStatus('');
                        isLoadingSongs = false;
                    }
                })
                .catch(error => {
                    console.error("Error loading songs from server:", error);
                    // Fallback to localStorage if server fails
                    updateConnectionStatus('Đang sử dụng lưu trữ cục bộ');
                    serverAvailable = false;
                    return loadSongsFromLocalStorage();
                });
        } else {
            // Load from localStorage
            return loadSongsFromLocalStorage();
        }
    }
    
    // Hiển thị trạng thái tải bài hát
    function updateSongLoadingStatus(message) {
        let loadingElement = document.getElementById('songs-loading-status');
        
        if (!loadingElement && message) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'songs-loading-status';
            loadingElement.style.position = 'absolute';
            loadingElement.style.left = '50%';
            loadingElement.style.top = '50%';
            loadingElement.style.transform = 'translate(-50%, -50%)';
            loadingElement.style.fontSize = '14px';
            loadingElement.style.color = 'white';
            loadingElement.style.padding = '10px 20px';
            loadingElement.style.borderRadius = '5px';
            loadingElement.style.background = 'rgba(0, 0, 0, 0.7)';
            loadingElement.style.zIndex = '10';
            
            const songList = document.getElementById('song-list');
            if (songList) {
                songList.appendChild(loadingElement);
            }
        }
        
        if (loadingElement) {
            if (message) {
                loadingElement.textContent = message;
                loadingElement.style.display = 'block';
            } else {
                loadingElement.style.display = 'none';
            }
        }
    }
    
    // Load songs from localStorage
    function loadSongsFromLocalStorage() {
        try {
            // Kiểm tra xem localStorage có khả dụng không
            if (!isLocalStorageAvailable()) {
                console.error("localStorage is not available");
                songs = [];
                return addHappyBirthdaySong().then(() => {
                    updateSongList();
                    updateSongLoadingStatus('');
                    isLoadingSongs = false;
                    
                    // Thông báo về việc không thể sử dụng localStorage
                    showErrorMessage('Không thể sử dụng bộ nhớ cục bộ. Các bài hát sẽ không được lưu khi làm mới trang.');
                });
            }
            
            const savedSongs = localStorage.getItem('piano_tiles_songs');
            if (savedSongs) {
                songs = JSON.parse(savedSongs);
                console.log("Loaded songs from localStorage:", songs.length);
            }
            
            // Add default song if no songs exist
            if (songs.length === 0) {
                return addHappyBirthdaySong().then(() => {
                    updateSongList();
                    updateSongLoadingStatus('');
                    isLoadingSongs = false;
                });
            } else {
                updateSongList();
                updateSongLoadingStatus('');
                isLoadingSongs = false;
                return Promise.resolve();
            }
        } catch (e) {
            console.error("Error loading songs from localStorage:", e);
            songs = [];
            return addHappyBirthdaySong().then(() => {
                updateSongList();
                updateSongLoadingStatus('');
                isLoadingSongs = false;
            });
        }
    }
    
    // Save songs to server or localStorage
    function saveSongs() {
        if (serverAvailable) {
            // Note: Server saves individual songs via API endpoints
            // This function is used only when using localStorage
            console.log("Using server API for song management");
        } else {
            // Kiểm tra xem localStorage có khả dụng không
            if (!isLocalStorageAvailable()) {
                console.error("localStorage is not available");
                showErrorMessage('Không thể lưu bài hát vào bộ nhớ cục bộ. Vui lòng xuất bài hát để lưu trữ.');
                
                // Gợi ý người dùng xuất bài hát
                if (currentSong) {
                    showNotification('Nên xuất bài hát ra file để đảm bảo không mất dữ liệu.', 'info');
                }
                return;
            }
            
            // Save to localStorage
            try {
                localStorage.setItem('piano_tiles_songs', JSON.stringify(songs));
                console.log("Saved songs to localStorage:", songs.length);
            } catch (e) {
                console.error("Error saving songs to localStorage:", e);
                
                // Hiển thị thông báo lỗi khi không thể lưu vào localStorage
                showErrorMessage('Không thể lưu bài hát vào bộ nhớ cục bộ. Vui lòng xuất bài hát để lưu trữ.');
                
                // Gợi ý người dùng xuất bài hát
                if (currentSong) {
                    showNotification('Nên xuất bài hát ra file để đảm bảo không mất dữ liệu.', 'info');
                }
            }
        }
    }
    
    // Save the current song
    function saveSong() {
        if (!currentSong) return;
        
        // Update song info
        currentSong.name = songNameInput.value || 'Untitled Song';
        currentSong.bpm = parseInt(songBpmInput.value) || 120;
        
        // Collect notes from the grid
        const noteElements = noteGrid.querySelectorAll('.grid-note');
        currentSong.notes = Array.from(noteElements).map(el => ({
            note: el.getAttribute('data-note'),
            position: parseFloat(el.getAttribute('data-position')),
            duration: parseFloat(el.getAttribute('data-duration'))
        }));
        
        // Sort notes by position
        currentSong.notes.sort((a, b) => a.position - b.position);
        
        if (serverAvailable) {
            // Save to server
            const method = currentSong.id.startsWith('temp_') ? 'POST' : 'PUT';
            const url = method === 'POST' ? API_URL : `${API_URL}/${currentSong.id}`;
            
            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(currentSong),
            })
            .then(response => response.json())
            .then(data => {
                // Update the song ID if it was a new song
                if (method === 'POST') {
                    // Find and replace the temporary song with the saved one
                    const index = songs.findIndex(s => s.id === currentSong.id);
                    if (index !== -1) {
                        songs[index] = data;
                        currentSong = data;
                    }
                }
                
                // Update the song list
                updateSongList();
                
                // Hiển thị thông báo thành công (không dùng alert)
                showNotification(`Song "${currentSong.name}" saved successfully!`, 'success');
            })
            .catch(error => {
                console.error('Error saving song to server:', error);
                showNotification('Failed to save song to server. Using localStorage as fallback.', 'error');
                
                // Fallback to localStorage
                const index = songs.findIndex(s => s.id === currentSong.id);
                if (index !== -1) {
                    songs[index] = currentSong;
                } else {
                    songs.push(currentSong);
                }
                saveSongs();
                updateSongList();
            });
        } else {
            // Save to localStorage
            const index = songs.findIndex(s => s.id === currentSong.id);
            if (index !== -1) {
                songs[index] = currentSong;
            } else {
                songs.push(currentSong);
            }
            
            saveSongs();
            updateSongList();
            
            showNotification(`Song "${currentSong.name}" saved successfully!`, 'success');
        }
    }
    
    // Create a new song
    function createNewSong() {
        // Generate a unique ID (temporary if using server)
        const songId = serverAvailable ? 'temp_' + Date.now() : 'song_' + Date.now();
        
        // Create new song object
        const newSong = {
            id: songId,
            name: 'New Song',
            bpm: 120,
            notes: []
        };
        
        // Add to songs array
        songs.push(newSong);
        
        // If using localStorage, save immediately
        if (!serverAvailable) {
            saveSongs();
        }
        
        updateSongList();
        
        // Open the editor for the new song
        editSong(songId);
    }
    
    // Edit a song
    function editSong(songId) {
        // Hiển thị trạng thái đang tải
        const loadingIndicator = showLoadingIndicator('Đang tải bài hát...');
        
        // Nếu sử dụng server và đây không phải bài hát mặc định, tải lại từ server
        if (serverAvailable && songId !== 'default-happy-birthday' && !songId.startsWith('temp_')) {
            fetch(`${API_URL}/${songId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Không thể tải bài hát từ server');
                    }
                    return response.json();
                })
                .then(songData => {
                    // Cập nhật bài hát trong danh sách cục bộ
                    const songIndex = songs.findIndex(s => s.id === songId);
                    if (songIndex !== -1) {
                        songs[songIndex] = songData;
                    } else {
                        songs.push(songData);
                    }
                    
                    // Tiếp tục chỉnh sửa
                    loadSongIntoEditor(songData);
                    hideLoadingIndicator(loadingIndicator);
                })
                .catch(error => {
                    console.error("Error loading song from server:", error);
                    
                    // Tìm bài hát trong danh sách cục bộ
                    const song = songs.find(s => s.id === songId);
                    if (song) {
                        loadSongIntoEditor(song);
                    } else {
                        showErrorMessage('Không thể tải bài hát!');
                    }
                    hideLoadingIndicator(loadingIndicator);
                });
        } else {
            // Find the song by ID
            const song = songs.find(song => song.id === songId);
            
            if (!song) {
                console.error("Song not found:", songId);
                showErrorMessage('Không tìm thấy bài hát!');
                hideLoadingIndicator(loadingIndicator);
                return;
            }
            
            // Tải bài hát vào trình sửa
            loadSongIntoEditor(song);
            hideLoadingIndicator(loadingIndicator);
        }
    }
    
    // Tải bài hát vào trình soạn nhạc
    function loadSongIntoEditor(songData) {
        // Đặt bài hát hiện tại
        currentSong = songData;
        
        // Clear the note grid
        clearNoteGrid();
        
        // Update the editor fields
        songNameInput.value = currentSong.name;
        songBpmInput.value = currentSong.bpm || 120;
        
        // Kiểm tra cấu trúc notes
        if (!Array.isArray(currentSong.notes)) {
            console.error("Invalid notes format:", currentSong.notes);
            currentSong.notes = [];
            showErrorMessage('Cấu trúc bài hát không hợp lệ, đã tạo bài hát trống.');
            return;
        }
        
        // Add notes to the grid
        currentSong.notes.forEach(note => {
            try {
                addNoteToGrid(note);
            } catch (error) {
                console.error("Error adding note to grid:", error, note);
            }
        });
        
        // Cập nhật danh sách bài hát để hiển thị bài hát đang được chọn
        updateSongList();
        
        // Hiển thị thông báo hướng dẫn cho thiết bị di động
        showMobileInstructions();
    }
    
    // Hiển thị indicator đang tải
    function showLoadingIndicator(message) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'editor-loading-indicator';
        loadingIndicator.textContent = message || 'Đang tải...';
        loadingIndicator.style.position = 'absolute';
        loadingIndicator.style.left = '50%';
        loadingIndicator.style.top = '50%';
        loadingIndicator.style.transform = 'translate(-50%, -50%)';
        loadingIndicator.style.background = 'rgba(0, 0, 0, 0.8)';
        loadingIndicator.style.color = 'white';
        loadingIndicator.style.padding = '15px 30px';
        loadingIndicator.style.borderRadius = '10px';
        loadingIndicator.style.zIndex = '999';
        
        const editor = document.querySelector('.song-editor');
        if (editor) {
            editor.appendChild(loadingIndicator);
        } else {
            document.body.appendChild(loadingIndicator);
        }
        
        return loadingIndicator;
    }
    
    // Ẩn indicator đang tải
    function hideLoadingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }
    
    // Hiển thị thông báo lỗi
    function showErrorMessage(message) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = message;
        errorMessage.style.position = 'fixed';
        errorMessage.style.top = '20px';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translateX(-50%)';
        errorMessage.style.background = 'rgba(255, 50, 50, 0.9)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '10px 20px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.zIndex = '1000';
        errorMessage.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.3)';
        
        document.body.appendChild(errorMessage);
        
        setTimeout(() => {
            errorMessage.style.opacity = '0';
            errorMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (errorMessage.parentNode) {
                    document.body.removeChild(errorMessage);
                }
            }, 500);
        }, 3000);
    }
    
    // Hiển thị thông báo thành công hoặc thất bại
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.3)';
        
        // Thiết lập màu sắc dựa trên loại thông báo
        if (type === 'success') {
            notification.style.background = 'rgba(46, 213, 115, 0.9)'; // Màu xanh lá
            notification.style.color = 'white';
        } else if (type === 'error') {
            notification.style.background = 'rgba(255, 71, 87, 0.9)'; // Màu đỏ
            notification.style.color = 'white';
        } else {
            notification.style.background = 'rgba(54, 159, 255, 0.9)'; // Màu xanh dương
            notification.style.color = 'white';
        }
        
        document.body.appendChild(notification);
        
        // Tự động ẩn thông báo sau 3 giây
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 3000);
        
        // Ghi log thông báo
        console.log(`Notification (${type}):`, message);
    }
    
    // Hiển thị hướng dẫn cho thiết bị di động
    function showMobileInstructions() {
        // Kiểm tra nếu là thiết bị di động (có thể dùng touchscreen)
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            // Tạo thông báo
            const instruction = document.createElement('div');
            instruction.className = 'mobile-instruction';
            instruction.innerHTML = `
                <div class="instruction-content">
                    <h3>Hướng dẫn sử dụng:</h3>
                    <ul>
                        <li>Nhấn vào lưới để thêm note</li>
                        <li>Kéo note để di chuyển</li>
                        <li>Nhấn giữ note để xóa</li>
                        <li>Kéo cạnh phải note để thay đổi độ dài</li>
                    </ul>
                    <button id="close-instruction">Đã hiểu</button>
                </div>
            `;
            
            // Kiểm tra xem người dùng đã thấy hướng dẫn chưa
            const hasSeenInstructions = localStorage.getItem('piano_tiles_seen_instructions');
            
            if (!hasSeenInstructions) {
                // Thêm vào trang và hiển thị
                document.body.appendChild(instruction);
                
                // Thêm sự kiện đóng thông báo
                document.getElementById('close-instruction').addEventListener('click', function() {
                    instruction.style.opacity = '0';
                    setTimeout(function() {
                        instruction.remove();
                        localStorage.setItem('piano_tiles_seen_instructions', 'true');
                    }, 300);
                });
                
                // Tự động đóng sau 10 giây
                setTimeout(function() {
                    if (document.body.contains(instruction)) {
                        instruction.style.opacity = '0';
                        setTimeout(function() {
                            instruction.remove();
                            localStorage.setItem('piano_tiles_seen_instructions', 'true');
                        }, 300);
                    }
                }, 10000);
            }
        }
    }
    
    // Clear the note grid
    function clearNoteGrid() {
        // Remove all notes but keep grid lines
        const notes = noteGrid.querySelectorAll('.grid-note');
        notes.forEach(note => note.remove());
    }
    
    // Add a note to the grid from data
    function addNoteToGrid(noteData) {
        const { note, position, duration } = noteData;
        
        // Find the row for this note
        const reversedKeyOrder = [...keyOrder].reverse();
        const noteIndex = reversedKeyOrder.indexOf(note);
        
        if (noteIndex === -1) return;
        
        const keyHeight = 20; // Height of each note row
        const unitWidth = 20; // Width of each grid unit (giảm từ 40 xuống 20)
        
        // Create the note element
        const noteElement = document.createElement('div');
        noteElement.className = 'grid-note';
        noteElement.style.top = `${noteIndex * keyHeight}px`;
        noteElement.style.left = `${position * unitWidth}px`;
        noteElement.style.width = `${duration * unitWidth}px`;
        noteElement.style.position = 'absolute';
        
        // Add data attributes
        noteElement.setAttribute('data-note', note);
        noteElement.setAttribute('data-position', position);
        noteElement.setAttribute('data-duration', duration);
        
        // Thêm handle điều chỉnh độ dài note
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.right = '0';
        resizeHandle.style.top = '0';
        resizeHandle.style.width = '5px';
        resizeHandle.style.height = '100%';
        resizeHandle.style.cursor = 'ew-resize';
        
        // Thêm xử lý sự kiện click cho resize handle để ngăn tạo note mới
        resizeHandle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Đánh dấu là click đã được xử lý trên note/handle
            clickProcessedOnNote = true;
            
            console.log("Resize handle clicked - preventing note creation");
        });
        
        noteElement.appendChild(resizeHandle);
        
        // Thêm uniqueId cho note để dễ quản lý và debug
        const uniqueId = 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        noteElement.setAttribute('data-id', uniqueId);
        
        // Add click handler to select/delete
        noteElement.addEventListener('click', function(e) {
            // Ngăn chặn hoàn toàn sự kiện để không tạo note mới
            e.stopPropagation();
            e.preventDefault();
            
            // Đánh dấu là click đã được xử lý trên note
            clickProcessedOnNote = true;
            
            // Bỏ qua nếu vừa mới kéo thả hoặc đổi kích thước
            const now = Date.now();
            if (now - lastInteractionTime < 300) return;
            
            console.log("Note clicked. Ctrl key:", e.ctrlKey, "Meta key:", e.metaKey);
            
            // Kiểm tra xem người dùng có đang nhấn Ctrl hoặc Command không
            if (e.ctrlKey || e.metaKey) {
                console.log("Attempting to delete note:", uniqueId);
                // Delete note if Ctrl/Cmd key is pressed
                noteElement.remove();
                
                // Hiển thị thông báo cho người dùng
                showNotification("Note deleted", "info");
            } else {
                // Select note
                if (selectedNoteElement) {
                    selectedNoteElement.style.boxShadow = 'none';
                }
                selectedNoteElement = this;
                this.style.boxShadow = '0 0 0 2px white';
                console.log("Note selected:", uniqueId);
            }
        });
        
        // Thêm một event listener riêng cho việc xóa để đảm bảo không bị chặn
        noteElement.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
                console.log("Ctrl+Delete pressed on note:", uniqueId);
                noteElement.remove();
                showNotification("Note deleted", "info");
            }
        });
        
        // Thêm mousedown event để bắt đầu kéo note
        noteElement.addEventListener('mousedown', function(e) {
            e.stopPropagation(); // Ngăn sự kiện mousedown lan tỏa đến noteGrid
            
            // Đánh dấu là tương tác đã được xử lý trên note
            clickProcessedOnNote = true;
            
            // Kiểm tra nếu người dùng đang nhấn Ctrl hoặc Command để xóa note
            if (e.ctrlKey || e.metaKey) {
                console.log("Ctrl+mousedown detected, deleting note:", uniqueId);
                e.preventDefault(); // Ngăn chặn hành vi mặc định
                
                // Thêm hiệu ứng xóa
                this.style.opacity = '0.3';
                this.classList.add('deleting');
                
                // Xóa note sau một hiệu ứng ngắn
                const noteToDelete = this;
                setTimeout(function() {
                    noteToDelete.remove();
                    showNotification("Note deleted", "info");
                }, 100);
                
                return; // Ngừng xử lý các sự kiện khác
            }
            
            lastInteractionTime = Date.now();
            
            // Reset trạng thái kéo thả trước đó
            if (currentDraggedNote && currentDraggedNote !== this) {
                currentDraggedNote.classList.remove('dragging');
            }
            
            // Nếu click vào handle điều chỉnh độ dài
            if (e.target === resizeHandle) {
                isResizing = true;
                currentDraggedNote = this;
                originalNoteWidth = parseFloat(this.style.width);
                dragStartX = e.clientX;
            } 
            // Nếu không phải là handle điều chỉnh, thì là di chuyển note
            else {
                isDragging = true;
                currentDraggedNote = this;
                
                // Tính toán offset từ điểm click đến góc note
                const noteRect = this.getBoundingClientRect();
                dragOffsetX = e.clientX - noteRect.left;
                dragOffsetY = e.clientY - noteRect.top;
                
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                originalNotePosition = parseFloat(this.getAttribute('data-position'));
                
                // Thêm class khi đang kéo
                this.classList.add('dragging');
            }
            
            // Select note khi bắt đầu kéo
            if (selectedNoteElement) {
                selectedNoteElement.style.boxShadow = 'none';
            }
            selectedNoteElement = this;
            this.style.boxShadow = '0 0 0 2px white';
            
            // Đảm bảo note này có z-index cao nhất
            this.style.zIndex = "100";
        });
        
        // Thêm các xử lý cho thiết bị cảm ứng
        // Nhấn giữ (long press) để xóa note
        noteElement.addEventListener('touchstart', function(e) {
            e.stopPropagation(); // Ngăn sự kiện touchstart lan tỏa đến noteGrid
            
            const touch = e.touches[0];
            const noteEl = this;
            
            // Bắt đầu đếm thời gian cho nhấn giữ
            longPressTimer = setTimeout(function() {
                // Xóa note sau khi nhấn giữ đủ lâu
                noteEl.classList.add('deleting');
                noteEl.style.opacity = '0.3';
                
                // Hiển thị thông báo và rung nhẹ nếu thiết bị hỗ trợ
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                // Xóa note sau hiệu ứng
                setTimeout(function() {
                    noteEl.remove();
                    showNotification("Note deleted", "info");
                }, 300);
                
                // Đặt lại timer
                longPressTimer = null;
            }, longPressThreshold);
            
            // Lưu thông tin cho việc di chuyển nếu không phải là nhấn giữ để xóa
            isDragging = true;
            currentDraggedNote = this;
            
            // Tính toán offset từ điểm chạm đến góc note
            const noteRect = this.getBoundingClientRect();
            dragOffsetX = touch.clientX - noteRect.left;
            dragOffsetY = touch.clientY - noteRect.top;
            
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            originalNotePosition = parseFloat(this.getAttribute('data-position'));
            
            // Thêm class khi đang kéo
            this.classList.add('dragging');
            
            // Select note
            if (selectedNoteElement) {
                selectedNoteElement.style.boxShadow = 'none';
            }
            selectedNoteElement = this;
            this.style.boxShadow = '0 0 0 2px white';
            
            e.preventDefault(); // Ngăn chặn các hành vi mặc định như cuộn trang
        });
        
        // Hủy bỏ nhấn giữ khi di chuyển ngón tay
        noteElement.addEventListener('touchmove', function(e) {
            e.stopPropagation(); // Ngăn sự kiện touchmove lan tỏa đến noteGrid
            
            // Hủy bỏ đếm thời gian nhấn giữ nếu người dùng di chuyển ngón tay
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            // Xử lý di chuyển note tương tự như kéo chuột
            if (isDragging && currentDraggedNote) {
                const touch = e.touches[0];
                
                // Tính toán vị trí mới dựa trên vị trí chạm và offset
                const noteGridRect = noteGrid.getBoundingClientRect();
                
                // Tính toán vị trí chạm tương đối so với lưới
                const touchX = touch.clientX - noteGridRect.left - dragOffsetX;
                const touchY = touch.clientY - noteGridRect.top;
                
                // Tính toán vị trí mới theo grid (làm tròn đến 0.5 đơn vị)
                const unitWidth = 20;
                const keyHeight = 20;
                const newPosition = Math.max(0, Math.floor((touchX / unitWidth) * 2) / 2);
                
                // Tính toán hàng mới
                const newRowIndex = Math.floor(touchY / keyHeight);
                
                // Đảm bảo hàng mới nằm trong phạm vi hợp lệ
                const reversedKeyOrder = [...keyOrder].reverse();
                if (newRowIndex >= 0 && newRowIndex < reversedKeyOrder.length) {
                    const newNote = reversedKeyOrder[newRowIndex];
                    
                    // Cập nhật vị trí dọc (note)
                    currentDraggedNote.style.top = `${newRowIndex * keyHeight}px`;
                    currentDraggedNote.setAttribute('data-note', newNote);
                    
                    // Cập nhật vị trí ngang (thời gian)
                    currentDraggedNote.style.left = `${newPosition * unitWidth}px`;
                    currentDraggedNote.setAttribute('data-position', newPosition);
                    
                    // Phát âm thanh khi di chuyển đến một note mới
                    if (Math.abs(touch.clientX - dragStartX) > 20 || Math.abs(touch.clientY - dragStartY) > 20) {
                        playNote(newNote);
                        dragStartX = touch.clientX;
                        dragStartY = touch.clientY;
                    }
                }
            }
            
            e.preventDefault();
        });
        
        // Kết thúc thao tác kéo khi nhấc ngón tay
        noteElement.addEventListener('touchend', function(e) {
            e.stopPropagation(); // Ngăn sự kiện touchend lan tỏa đến noteGrid
            
            // Hủy bỏ đếm thời gian nhấn giữ
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            // Xóa class khi kết thúc kéo
            if (currentDraggedNote) {
                currentDraggedNote.classList.remove('dragging');
            }
            
            // Phát âm thanh note để người dùng biết vị trí mới
            playNote(this.getAttribute('data-note'));
            
            // Đặt lại biến trạng thái sau một khoảng thời gian ngắn
            // để tránh xung đột với các sự kiện khác
            setTimeout(() => {
                isDragging = false;
                currentDraggedNote = null;
            }, 10);
            
            e.preventDefault();
        });
        
        // Add to grid
        noteGrid.appendChild(noteElement);
    }
    
    // Thêm sự kiện touchstart cho noteGrid để thêm note mới khi chạm vào lưới trống
    noteGrid.addEventListener('touchstart', function(e) {
        // Bỏ qua nếu đang kéo thả hoặc nếu đang chạm vào note đã tồn tại
        if (isDragging || isResizing) return;
        
        // Kiểm tra xem đang chạm vào note hay handle hay không
        const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        const isNoteTouch = target.classList.contains('grid-note') || 
                           target.classList.contains('resize-handle') ||
                           (target.parentElement && target.parentElement.classList.contains('grid-note'));
        
        if (!isNoteTouch) {
            addNoteAtPosition(e.touches[0]);
        }
    });
    
    // Add a note at the clicked position
    function addNoteAtPosition(e) {
        // Get the grid coordinates
        const rect = noteGrid.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Calculate grid position
        const keyHeight = 20; // Height of each note row
        const unitWidth = 20; // Width of each grid unit (giảm từ 40 xuống 20)
        
        const noteIndex = Math.floor(y / keyHeight);
        // Làm tròn chính xác đến 0.5 để cho phép đặt note ở nửa vị trí
        const position = Math.floor(x / (unitWidth / 2)) * 0.5;
        
        // Get the note based on index
        const reversedKeyOrder = [...keyOrder].reverse();
        if (noteIndex >= reversedKeyOrder.length) return;
        
        const note = reversedKeyOrder[noteIndex];
        
        // Create note data
        const noteData = {
            note,
            position,
            duration: currentNoteDuration
        };
        
        // Add to grid
        addNoteToGrid(noteData);
        
        // Play the note
        playNote(note);
    }
    
    // Update the song list in the UI
    function updateSongList() {
        // Clear the list except for the default song
        const songList = document.getElementById('song-list');
        if (!songList) return;
        
        songList.innerHTML = '';
        
        if (songs.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-songs-message';
            emptyMessage.textContent = 'Chưa có bài hát nào';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = 'rgba(255, 255, 255, 0.5)';
            songList.appendChild(emptyMessage);
            return;
        }
        
        // Add each song to the list
        songs.forEach(song => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            if (song.id === 'default-happy-birthday') {
                songItem.classList.add('default-song');
            }
            
            // Đánh dấu bài hát đang được chỉnh sửa
            if (currentSong && song.id === currentSong.id) {
                songItem.classList.add('active-song');
            }
            
            songItem.innerHTML = `
                <div class="song-name">${song.name}</div>
                <div class="song-actions">
                    <button class="edit-song-btn">Edit</button>
                    <button class="play-song-btn">Play</button>
                    ${song.id !== 'default-happy-birthday' ? '<button class="delete-song-btn">Delete</button>' : ''}
                </div>
            `;
            
            // Add data attribute to identify the song
            songItem.setAttribute('data-song-id', song.id);
            
            // Add the song item to the list
            songList.appendChild(songItem);
        });
        
        // Thêm style cho bài hát đang chọn
        const styleEl = document.createElement('style');
        if (!document.getElementById('song-list-styles')) {
            styleEl.id = 'song-list-styles';
            styleEl.textContent = `
                .song-item.active-song {
                    background: rgba(54, 159, 255, 0.3) !important;
                    border-left: 3px solid #36c2ff !important;
                    box-shadow: 0 0 5px rgba(54, 159, 255, 0.5) !important;
                }
            `;
            document.head.appendChild(styleEl);
        }
        
        // Cuộn đến bài hát đang được chọn
        if (currentSong) {
            const activeSong = songList.querySelector('.active-song');
            if (activeSong) {
                setTimeout(() => {
                    activeSong.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
        
        // Add event listeners to the new buttons
        addSongItemEventListeners();
    }
    
    // Add event listeners to song items
    function addSongItemEventListeners() {
        // Edit song buttons
        document.querySelectorAll('.edit-song-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const songId = this.closest('.song-item').getAttribute('data-song-id');
                editSong(songId);
            });
        });
        
        // Play song buttons
        document.querySelectorAll('.play-song-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const songId = this.closest('.song-item').getAttribute('data-song-id');
                playSong(songId);
            });
        });
        
        // Delete song buttons
        document.querySelectorAll('.delete-song-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const songId = this.closest('.song-item').getAttribute('data-song-id');
                deleteSong(songId);
            });
        });
    }
    
    // Create piano keys in the editor
    function createEditorPianoKeys() {
        pianoKeysContainer.innerHTML = '';
        
        // Create keys in reverse order (highest note at top)
        const reversedKeyOrder = [...keyOrder].reverse();
        
        reversedKeyOrder.forEach(note => {
            const keyElement = document.createElement('div');
            keyElement.className = `editor-key ${keyColors[note]}`;
            keyElement.setAttribute('data-note', note);
            keyElement.textContent = note.toUpperCase();
            
            pianoKeysContainer.appendChild(keyElement);
        });
    }
    
    // Create grid lines in the note grid
    function createGridLines() {
        // Clear any existing grid
        noteGrid.innerHTML = '';
        
        // Create horizontal lines for each note
        const keyHeight = 20; // Height of each note row
        const reversedKeyOrder = [...keyOrder].reverse();
        
        reversedKeyOrder.forEach((note, index) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'grid-row';
            rowElement.style.position = 'absolute';
            rowElement.style.left = '0';
            rowElement.style.top = `${index * keyHeight}px`;
            rowElement.style.width = '100%';
            rowElement.style.height = `${keyHeight}px`;
            rowElement.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
            rowElement.setAttribute('data-note', note);
            
            noteGrid.appendChild(rowElement);
        });
        
        // Thêm các đường kẻ dọc cho các đơn vị 1/8
        const gridWidth = noteGrid.clientWidth;
        const unitWidth = 20;
        const numVerticalLines = Math.floor(gridWidth / (unitWidth / 2));
        
        for (let i = 0; i <= numVerticalLines; i++) {
            const lineElement = document.createElement('div');
            lineElement.style.position = 'absolute';
            lineElement.style.top = '0';
            lineElement.style.left = `${i * (unitWidth / 2)}px`;
            lineElement.style.width = '1px';
            lineElement.style.height = '100%';
            
            // Màu đậm cho đường bắt đầu mỗi phách
            if (i % 4 === 0) {
                lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            } else {
                lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }
            
            noteGrid.appendChild(lineElement);
        }
    }
    
    // Setup Song Manager Event Listeners
    function setupSongManagerEvents() {
        // New Song button
        newSongBtn.addEventListener('click', createNewSong);
        
        // Import Song button
        importSongBtn.addEventListener('click', importSong);
        
        // Save Song button
        saveSongBtn.addEventListener('click', saveSong);
        
        // Export Song button
        exportSongBtn.addEventListener('click', exportSong);
        
        // Test Song button
        testSongBtn.addEventListener('click', testSong);
        
        // Play Editor button
        playEditorBtn.addEventListener('click', playEditorSong);
        
        // Stop Editor button
        stopEditorBtn.addEventListener('click', stopEditorSong);
        
        // Duration buttons
        durationBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Update active class
                durationBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update current note duration
                currentNoteDuration = parseFloat(this.getAttribute('data-value'));
            });
        });
        
        // Note grid click handler - FIX: Improve note creation click handling
        noteGrid.addEventListener('click', function(e) {
            console.log("Grid click detected, clickProcessedOnNote =", clickProcessedOnNote);
            
            // Nếu click đã được xử lý trên note hoặc handle, không tạo note mới
            if (clickProcessedOnNote) {
                console.log("Click already handled by a note or handle, not creating new note");
                // Đặt lại biến để sẵn sàng cho lần click tiếp theo
                setTimeout(() => {
                    clickProcessedOnNote = false;
                }, 50);
                return;
            }
            
            // Kiểm tra xem đang click vào note hay handle hay không
            const target = e.target;
            const isNoteClick = target.classList.contains('grid-note') || 
                               target.classList.contains('resize-handle') ||
                               (target.parentElement && target.parentElement.classList.contains('grid-note'));
            
            // Nếu đang click trực tiếp vào note hoặc handle, không tạo note mới
            if (isNoteClick) {
                console.log("Click detected on existing note or handle - not creating new note");
                return;
            }
            
            // Kiểm tra xem có đang kéo thả hay không
            if (!isDragging && !isResizing) {
                console.log("Creating new note at position");
                addNoteAtPosition(e);
            }
            
            // Đặt lại biến để sẵn sàng cho lần click tiếp theo
            setTimeout(() => {
                clickProcessedOnNote = false;
            }, 50);
        });
        
        // Thêm sự kiện mousemove và mouseup để xử lý kéo thả
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Thêm phím tắt Delete để xóa note đã chọn
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Delete' && selectedNoteElement) {
                // Xóa note đã chọn khi nhấn phím Delete
                console.log("Delete key pressed, removing selected note");
                
                // Thêm hiệu ứng xóa
                selectedNoteElement.style.opacity = '0.3';
                selectedNoteElement.classList.add('deleting');
                
                const noteToDelete = selectedNoteElement;
                selectedNoteElement = null;
                
                // Xóa note sau một hiệu ứng ngắn
                setTimeout(function() {
                    noteToDelete.remove();
                    showNotification("Note deleted", "info");
                }, 100);
            }
        });
    }
    
    // Xử lý sự kiện mousemove để di chuyển note hoặc thay đổi kích thước
    function handleMouseMove(e) {
        // Cập nhật thời gian tương tác cuối cùng
        lastInteractionTime = Date.now();
        
        if (!isDragging && !isResizing) return;
        
        e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt
        
        const unitWidth = 20; // Width of each grid unit
        const keyHeight = 20; // Height of each note row
        
        if (isDragging && currentDraggedNote) {
            // Thêm class dragging nếu chưa có
            if (!currentDraggedNote.classList.contains('dragging')) {
                currentDraggedNote.classList.add('dragging');
            }
            
            // Tính toán vị trí mới dựa trên vị trí con trỏ chuột và offset
            const noteGridRect = noteGrid.getBoundingClientRect();
            
            // Tính toán vị trí chuột tương đối so với lưới
            const mouseX = e.clientX - noteGridRect.left - dragOffsetX;
            const mouseY = e.clientY - noteGridRect.top;
            
            // Tính toán vị trí mới theo grid (làm tròn đến 0.5 đơn vị)
            const newPosition = Math.max(0, Math.floor((mouseX / unitWidth) * 2) / 2);
            
            // Tính toán hàng mới
            const newRowIndex = Math.floor(mouseY / keyHeight);
            
            // Đảm bảo hàng mới nằm trong phạm vi hợp lệ
            const reversedKeyOrder = [...keyOrder].reverse();
            if (newRowIndex >= 0 && newRowIndex < reversedKeyOrder.length) {
                const newNote = reversedKeyOrder[newRowIndex];
                
                // Cập nhật vị trí dọc (note)
                currentDraggedNote.style.top = `${newRowIndex * keyHeight}px`;
                currentDraggedNote.setAttribute('data-note', newNote);
                
                // Cập nhật vị trí ngang (thời gian)
                currentDraggedNote.style.left = `${newPosition * unitWidth}px`;
                currentDraggedNote.setAttribute('data-position', newPosition);
                
                // Phát âm thanh khi di chuyển đến một note mới
                const currentNote = currentDraggedNote.getAttribute('data-note');
                if (e.type === 'mousemove' && Math.abs(e.clientX - dragStartX) > 20 || Math.abs(e.clientY - dragStartY) > 20) {
                    playNote(currentNote);
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                }
            }
        }
        
        if (isResizing && currentDraggedNote) {
            // Tính toán chiều rộng mới
            const deltaX = e.clientX - dragStartX;
            const newWidth = Math.max(10, originalNoteWidth + deltaX); // Tối thiểu 10px
            
            // Tính toán độ dài mới theo grid (làm tròn đến 0.5 đơn vị)
            const newDuration = Math.max(0.5, Math.floor((newWidth / unitWidth) * 2) / 2);
            
            // Cập nhật chiều rộng và thuộc tính độ dài
            currentDraggedNote.style.width = `${newDuration * unitWidth}px`;
            currentDraggedNote.setAttribute('data-duration', newDuration);
        }
    }
    
    // Xử lý sự kiện mouseup để kết thúc kéo thả
    function handleMouseUp(e) {
        // Cập nhật thời gian tương tác cuối cùng
        lastInteractionTime = Date.now();
        
        // Nếu đang kéo thả hoặc thay đổi kích thước, đánh dấu là đã xử lý sự kiện
        if (isDragging || isResizing) {
            // Đánh dấu rằng chúng ta đã xử lý sự kiện này, để tránh tạo note mới
            e.stopPropagation();
            e.preventDefault();
            
            if (currentDraggedNote) {
                // Xóa class khi kết thúc kéo
                currentDraggedNote.classList.remove('dragging');
                
                // Phát âm thanh note cuối cùng
                if (isDragging) {
                    playNote(currentDraggedNote.getAttribute('data-note'));
                }
                
                // Reset z-index về giá trị bình thường ngay lập tức
                currentDraggedNote.style.zIndex = "5";
            }
        }
        
        // Đặt lại biến trạng thái ngay lập tức
        isDragging = false;
        isResizing = false;
        
        // Lưu tham chiếu để xử lý sau khi đặt trạng thái
        const noteToReset = currentDraggedNote;
        currentDraggedNote = null;
        
        // Đặt lại biến theo dõi click trên note sau một thời gian ngắn
        setTimeout(() => {
            clickProcessedOnNote = false;
        }, 100);
        
        // Đặt lại vị trí chính xác và z-index cho note sau khi kéo
        if (noteToReset) {
            // Đảm bảo note được đặt đúng vị trí trên lưới
            const unitWidth = 20;
            const keyHeight = 20;
            
            const top = parseFloat(noteToReset.style.top || '0');
            const left = parseFloat(noteToReset.style.left || '0');
            
            // Làm tròn vị trí để khớp với lưới
            const rowIndex = Math.floor(top / keyHeight);
            const position = Math.floor(left / unitWidth * 2) / 2;
            
            noteToReset.style.top = `${rowIndex * keyHeight}px`;
            noteToReset.style.left = `${position * unitWidth}px`;
            noteToReset.setAttribute('data-position', position);
            
            // Cập nhật note dựa vào rowIndex
            const reversedKeyOrder = [...keyOrder].reverse();
            if (rowIndex >= 0 && rowIndex < reversedKeyOrder.length) {
                const noteValue = reversedKeyOrder[rowIndex];
                noteToReset.setAttribute('data-note', noteValue);
            }
        }
    }
    
    // Export the current song
    function exportSong() {
        if (!currentSong) return;
        
        // First save any changes
        saveSong();
        
        // Create a JSON string
        const songData = JSON.stringify(currentSong);
        
        // Create a data URL
        const dataUrl = 'data:text/json;charset=utf-8,' + encodeURIComponent(songData);
        
        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', dataUrl);
        downloadLink.setAttribute('download', `${currentSong.name.replace(/\s+/g, '_')}.json`);
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    
    // Import a song
    function importSong() {
        // Create an input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const songData = JSON.parse(e.target.result);
                    
                    // Validate the song data
                    if (!songData.name || !songData.notes || !Array.isArray(songData.notes)) {
                        throw new Error('Invalid song format');
                    }
                    
                    // Generate a new ID
                    songData.id = 'song_' + Date.now();
                    
                    // Add to songs array
                    songs.push(songData);
                    saveSongs();
                    updateSongList();
                    
                    // Open the editor for the new song
                    editSong(songData.id);
                    
                    alert(`Song "${songData.name}" imported successfully!`);
                } catch (err) {
                    console.error('Error importing song:', err);
                    alert('Error importing song. Please check the file format.');
                }
            };
            reader.readAsText(file);
        });
        
        // Trigger file selection
        fileInput.click();
    }
    
    // Test the current song
    function testSong() {
        if (!currentSong) return;
        
        // First save any changes
        saveSong();
        
        // Stop current playback if any
        stopEditorSong();
        
        // Set current position to 0
        currentPlayPosition = 0;
        
        // Start playback
        isEditorPlaying = true;
        playEditorBtn.disabled = true;
        stopEditorBtn.disabled = false;
        
        // Calculate time per grid unit based on BPM
        const gridUnitTimeMs = (60000 / currentSong.bpm) / 2; // 16th note duration
        
        // Create a visual indicator
        const playhead = document.createElement('div');
        playhead.style.position = 'absolute';
        playhead.style.top = '0';
        playhead.style.height = '100%';
        playhead.style.width = '2px';
        playhead.style.background = 'red';
        playhead.style.zIndex = '10';
        playhead.id = 'playhead';
        noteGrid.appendChild(playhead);
        
        // Update function for playback
        function updatePlayback() {
            if (!isEditorPlaying) return;
            
            // Move the playhead
            const unitWidth = 20; // Width of each grid unit (giảm từ 40 xuống 20)
            playhead.style.left = `${currentPlayPosition * unitWidth}px`;
            
            // Find notes that start at this position
            const notesToPlay = currentSong.notes.filter(note => 
                Math.abs(note.position - currentPlayPosition) < 0.1
            );
            
            // Play the notes
            notesToPlay.forEach(note => {
                playNote(note.note);
            });
            
            // Increment position - Giảm bước nhảy để hỗ trợ vị trí 0.5
            currentPlayPosition += 0.25; // Move by a 16th note
            
            // Check if we've reached the end
            const lastNote = currentSong.notes.reduce((latest, note) => {
                const noteEnd = note.position + note.duration;
                return noteEnd > latest ? noteEnd : latest;
            }, 0);
            
            if (currentPlayPosition > lastNote + 4) { // Add some padding at the end
                stopEditorSong();
                return;
            }
            
            // Schedule next update
            editorPlaybackInterval = setTimeout(updatePlayback, gridUnitTimeMs / 2); // Điều chỉnh tốc độ phát
        }
        
        // Start playback
        updatePlayback();
    }
    
    // Play the song in the editor
    function playEditorSong() {
        // Same as testSong for now
        testSong();
    }
    
    // Stop playback in the editor
    function stopEditorSong() {
        isEditorPlaying = false;
        clearTimeout(editorPlaybackInterval);
        
        playEditorBtn.disabled = false;
        stopEditorBtn.disabled = true;
        
        // Remove playhead
        const playhead = document.getElementById('playhead');
        if (playhead) playhead.remove();
    }
    
    // Play a song in the game
    function playSong(songId) {
        // Find the song
        const song = songs.find(s => s.id === songId);
        if (!song) {
            alert('Không tìm thấy bài hát!');
            return;
        }
        
        // Hiển thị thông báo đang tải
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'loading-message';
        loadingMessage.textContent = 'Đang tải bài hát...';
        loadingMessage.style.position = 'fixed';
        loadingMessage.style.top = '50%';
        loadingMessage.style.left = '50%';
        loadingMessage.style.transform = 'translate(-50%, -50%)';
        loadingMessage.style.background = 'rgba(0, 0, 0, 0.8)';
        loadingMessage.style.color = 'white';
        loadingMessage.style.padding = '20px';
        loadingMessage.style.borderRadius = '10px';
        loadingMessage.style.zIndex = '9999';
        document.body.appendChild(loadingMessage);
        
        // Sử dụng setTimeout để cho phép UI cập nhật trước khi xử lý
        setTimeout(() => {
            try {
                // Convert to game format
                const gameFormatSong = song.notes.map(note => [note.note, note.duration]);
                
                // Replace the happy birthday song
                happyBirthdaySong.length = 0;
                happyBirthdaySong.push(...gameFormatSong);
                
                // Thông báo đã sẵn sàng
                loadingMessage.textContent = 'Bắt đầu chơi!';
                
                // Switch to game mode sau một chút delay để người dùng thấy thông báo
                setTimeout(() => {
                    document.body.removeChild(loadingMessage);
                    switchMode('game');
                    
                    // Thêm tên bài hát vào màn hình bắt đầu
                    const startScreenTitle = document.querySelector('#start-screen h1');
                    if (startScreenTitle) {
                        startScreenTitle.textContent = song.name;
                    }
                    
                    const startScreenDesc = document.querySelector('#start-screen p');
                    if (startScreenDesc) {
                        startScreenDesc.textContent = 'Nhấn vào các ô đen khi chúng xuất hiện.';
                    }
                    
                    // Start the game
                    startGame();
                }, 500);
            } catch (error) {
                console.error('Error loading song for gameplay:', error);
                loadingMessage.textContent = 'Lỗi khi tải bài hát!';
                loadingMessage.style.background = 'rgba(255, 0, 0, 0.8)';
                
                setTimeout(() => {
                    document.body.removeChild(loadingMessage);
                }, 2000);
            }
        }, 100);
    }
    
    // Add the default Happy Birthday song
    function addHappyBirthdaySong() {
        const happyBirthdaySongData = {
            id: 'default-happy-birthday',
            name: 'Happy Birthday',
            bpm: 120,
            notes: happyBirthdaySong.map(([note, duration]) => ({
                note,
                duration,
                position: 0 // We'll calculate this based on the sequence
            }))
        };
        
        // Calculate positions based on durations
        let position = 0;
        happyBirthdaySongData.notes.forEach(note => {
            note.position = position;
            position += note.duration * 2; // Convert musical duration to grid units
        });
        
        songs.push(happyBirthdaySongData);
        
        // If using server, save the song to server
        if (serverAvailable) {
            return fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(happyBirthdaySongData),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Không thể lưu bài hát mặc định');
                }
                return response.json();
            })
            .then(data => {
                console.log('Happy Birthday song saved to server:', data);
                return Promise.resolve();
            })
            .catch(error => {
                console.error('Error saving default song to server:', error);
                // If server fails, save to localStorage
                saveSongs();
                return Promise.resolve();
            });
        } else {
            // Save to localStorage
            saveSongs();
            return Promise.resolve();
        }
    }
    
    // Delete a song
    function deleteSong(songId) {
        // Không sử dụng confirm để tránh popup
        
        if (serverAvailable) {
            // Delete from server
            fetch(`${API_URL}/${songId}`, {
                method: 'DELETE',
            })
            .then(response => {
                if (response.ok) {
                    // Remove from local array
                    songs = songs.filter(s => s.id !== songId);
                    updateSongList();
                    
                    // Clear editor if the current song was deleted
                    if (currentSong && currentSong.id === songId) {
                        currentSong = null;
                        clearNoteGrid();
                        songNameInput.value = '';
                        songBpmInput.value = 120;
                    }
                    
                    alert('Song deleted successfully!');
                } else {
                    throw new Error('Failed to delete song');
                }
            })
            .catch(error => {
                console.error('Error deleting song:', error);
                alert('Failed to delete song from server. Using localStorage as fallback.');
                
                // Fallback to localStorage
                songs = songs.filter(s => s.id !== songId);
                saveSongs();
                updateSongList();
            });
        } else {
            // Delete from localStorage
            songs = songs.filter(s => s.id !== songId);
            saveSongs();
            updateSongList();
            
            // Clear editor if the current song was deleted
            if (currentSong && currentSong.id === songId) {
                currentSong = null;
                clearNoteGrid();
                songNameInput.value = '';
                songBpmInput.value = 120;
            }
            
            alert('Song deleted successfully!');
        }
    }
    
    // Thêm xử lý sự kiện mouseout cho noteGrid để đảm bảo kết thúc kéo thả khi chuột ra khỏi lưới
    noteGrid.addEventListener('mouseleave', function(e) {
        if (isDragging || isResizing) {
            handleMouseUp(e);
        }
    });
    
    // Thêm nút để làm sạch các note bị lỗi
    function addFixButton() {
        // Kiểm tra xem nút đã tồn tại chưa
        if (document.getElementById('fix-notes-btn')) return;
        
        const fixButton = document.createElement('button');
        fixButton.id = 'fix-notes-btn';
        fixButton.textContent = 'Sửa lỗi notes';
        fixButton.style.position = 'absolute';
        fixButton.style.right = '10px';
        fixButton.style.bottom = '10px';
        fixButton.style.zIndex = '1000';
        fixButton.style.padding = '5px 10px';
        fixButton.style.fontSize = '12px';
        fixButton.style.background = 'rgba(255, 71, 87, 0.6)';
        fixButton.style.color = 'white';
        fixButton.style.border = 'none';
        fixButton.style.borderRadius = '4px';
        fixButton.style.cursor = 'pointer';
        // Luôn hiển thị nút để người dùng có thể sửa lỗi bất cứ lúc nào
        fixButton.style.display = 'block';
        
        fixButton.addEventListener('click', function() {
            cleanupNotes();
            this.textContent = 'Đã sửa xong';
            this.style.background = 'rgba(46, 213, 115, 0.6)';
            setTimeout(() => {
                this.textContent = 'Sửa lỗi notes';
                this.style.background = 'rgba(255, 71, 87, 0.6)';
            }, 2000);
        });
        
        songManager.appendChild(fixButton);
    }
    
    // Làm sạch các note bị lỗi
    function cleanupNotes() {
        // Lấy tất cả các note
        const notes = noteGrid.querySelectorAll('.grid-note');
        let fixedCount = 0;
        
        // Đặt lại trạng thái kéo thả và điều chỉnh kích thước
        isDragging = false;
        isResizing = false;
        currentDraggedNote = null;
        
        // Đặt lại các thuộc tính và style cho mỗi note
        notes.forEach((note, index) => {
            const wasBroken = 
                note.classList.contains('dragging') || 
                note.style.pointerEvents === 'none' || 
                note.style.opacity !== '1' && note.style.opacity !== '';
            
            // Đặt lại z-index theo thứ tự đúng
            note.style.zIndex = 5 + index;
            
            // Đặt lại các class
            note.classList.remove('dragging');
            note.classList.remove('deleting');
            
            // Đặt lại pointer-events
            note.style.pointerEvents = 'auto';
            
            // Đặt lại style khác
            note.style.transform = '';
            note.style.opacity = '1';
            
            // Đảm bảo note có vị trí absolute
            note.style.position = 'absolute';
            
            // Xóa shadow box (trừ note đang chọn)
            if (note !== selectedNoteElement) {
                note.style.boxShadow = '';
            }
            
            // Đảm bảo note có đủ thuộc tính dữ liệu
            if (!note.hasAttribute('data-note') || !note.hasAttribute('data-position') || !note.hasAttribute('data-duration')) {
                const noteRect = note.getBoundingClientRect();
                const gridRect = noteGrid.getBoundingClientRect();
                const unitWidth = 20;
                const keyHeight = 20;
                
                // Tính toán lại vị trí dựa trên vị trí hiện tại
                const top = parseFloat(note.style.top || '0');
                const left = parseFloat(note.style.left || '0');
                const width = parseFloat(note.style.width || '20px');
                
                const rowIndex = Math.floor(top / keyHeight);
                const position = Math.floor(left / unitWidth * 2) / 2;
                const duration = Math.max(0.5, Math.floor(width / unitWidth * 2) / 2);
                
                // Lấy note dựa vào rowIndex
                const reversedKeyOrder = [...keyOrder].reverse();
                if (rowIndex >= 0 && rowIndex < reversedKeyOrder.length) {
                    const noteValue = reversedKeyOrder[rowIndex];
                    
                    // Cập nhật thuộc tính
                    note.setAttribute('data-note', noteValue);
                    note.setAttribute('data-position', position);
                    note.setAttribute('data-duration', duration);
                }
            }
            
            if (wasBroken) fixedCount++;
        });
        
        console.log("Đã làm sạch " + notes.length + " notes, sửa " + fixedCount + " notes bị lỗi");
        showNotification(`Đã sửa ${fixedCount} notes bị lỗi`, "success");
    }
    
    // Hàm kiểm tra nếu có lỗi note và hiển thị nút sửa
    function checkForNoteIssues() {
        const fixButton = document.getElementById('fix-notes-btn');
        if (!fixButton) return;
        
        const notes = noteGrid.querySelectorAll('.grid-note');
        
        // Kiểm tra các note có dấu hiệu bị lỗi
        let hasIssues = false;
        notes.forEach(note => {
            if (note.classList.contains('dragging') || 
                note.style.pointerEvents === 'none' ||
                parseInt(note.style.zIndex) > 50) {
                hasIssues = true;
            }
        });
        
        // Hiển thị nút nếu có lỗi
        if (hasIssues) {
            fixButton.style.display = 'block';
            fixButton.textContent = 'Sửa lỗi notes';
        }
    }
    
    // Kiểm tra định kỳ các note bị lỗi
    setInterval(checkForNoteIssues, 5000);
}; 