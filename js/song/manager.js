// Song Manager Module
import { generateId, isLocalStorageAvailable } from '../utils/helpers.js';
import { getSongs, setSongs, saveSongsToLocalStorage, getSongStorageInfo, loadSongsFromLocalStorage } from '../utils/storage.js';
import { showNotification, showErrorMessage } from '../ui/notifications.js';
import { getCurrentUser, getCurrentUserRole, canSaveToServer } from '../firebase/auth.js';
import { GAME_CONFIG } from '../config/constants.js';

// Global state variables
let currentSong = null;
let isEditing = false;
let currentNoteDuration = 2;
let isDragging = false;
let isResizing = false;
let draggedElement = null;
let currentDraggedNote = null;
let selectedNoteElement = null;
let startX, startLeft, startWidth;
let forcedSaveMode = 'local';
let pianoRollLength = 32;
let clickProcessedOnNote = false;

// Editor playback state
let isPlaying = false;
let playbackInterval = null;
let playbackPosition = 0;

// Enhanced features state
let currentTool = 'pencil'; // pencil, select, eraser
let selectedNotes = new Set();
let zoomLevel = 1;
let autoSaveEnabled = true;
let lastSaveTime = Date.now();

// DOM element references (cached for performance)
let saveSongBtn, newSongBtn, importSongBtn, exportSongBtn;
let playEditorBtn, stopEditorBtn, noteGrid, pianoKeysContainer;
let durationBtns, saveModeRadios;

// Enhanced UI elements
let saveStatusIndicator, performanceStats, miniToolbar, timelineRuler, playbackLine;

// Piano key configuration
const keyOrder = ['c5', 'd5', 'e5', 'f5', 'g5', 'a5', 'b5', 'c6', 'd6', 'e6', 'f6', 'g6', 'a6', 'b6', 'c7'];
const keyColors = {
    'c5': 'white', 'd5': 'black', 'e5': 'white', 'f5': 'white', 'g5': 'black', 'a5': 'black', 'b5': 'white',
    'c6': 'white', 'd6': 'black', 'e6': 'white', 'f6': 'white', 'g6': 'black', 'a6': 'black', 'b6': 'white',
    'c7': 'white'
};

// Cache DOM elements
function cacheDOMElements() {
    saveSongBtn = document.getElementById('save-song-btn');
    newSongBtn = document.getElementById('new-song-btn');
    importSongBtn = document.getElementById('import-song-btn');
    exportSongBtn = document.getElementById('export-song-btn');
    playEditorBtn = document.getElementById('play-editor-btn');
    stopEditorBtn = document.getElementById('stop-editor-btn');
    noteGrid = document.querySelector('.note-grid');
    pianoKeysContainer = document.querySelector('.piano-keys');
    durationBtns = document.querySelectorAll('.duration-btn');
    saveModeRadios = document.querySelectorAll('input[name="save-mode"]');
    
    // Enhanced UI elements
    saveStatusIndicator = document.getElementById('save-status-indicator');
    performanceStats = document.getElementById('performance-stats');
    miniToolbar = document.querySelector('.mini-toolbar');
    timelineRuler = document.querySelector('.timeline-ruler');
    playbackLine = document.getElementById('playback-line');
    
    console.log("DOM elements cached:", {
        saveSongBtn, newSongBtn, importSongBtn, exportSongBtn, 
        playEditorBtn, stopEditorBtn, noteGrid, 
        pianoKeysContainer, durationBtns: durationBtns.length,
        saveModeRadios: saveModeRadios.length,
        saveStatusIndicator, performanceStats, miniToolbar
    });
}

// Initialize Song Manager
async function initSongManager() {
    console.log("🎹 === INITIALIZING SONG MANAGER ===");
    
    cacheDOMElements();
    
    if (!validateElements()) {
        console.error("❌ Required elements not found");
        return false;
    }
    
    // CRITICAL: Load songs from storage FIRST before setting up UI
    try {
        console.log("📚 Loading songs from storage...");
        const loadedSongs = await loadSongsFromLocalStorage();
        console.log("✅ Songs loaded:", loadedSongs.length);
        console.log("✅ Song names:", loadedSongs.map(s => s.name));
        
        // Ensure songs are set in storage module
        setSongs(loadedSongs);
        console.log("✅ Songs set in storage module");
        
        // Verify songs were set
        const verifyingSongs = getSongs();
        console.log("🔍 Verifying songs in memory:", verifyingSongs.length);
        
    } catch (error) {
        console.error("❌ Failed to load songs:", error);
        // Continue with empty songs array
    }
    
    setupEventListeners();
    setupEnhancedFeatures();
    initializeUI();
    
    console.log("🎵 About to call loadAndDisplaySongs...");
    // Load and display songs AFTER everything is set up
    loadAndDisplaySongs();
    
    console.log("✅ Song Manager initialized successfully");
    return true;
}

// Validate required DOM elements
function validateElements() {
    const required = { saveSongBtn, newSongBtn, noteGrid, pianoKeysContainer };
    for (const [name, element] of Object.entries(required)) {
        if (!element) {
            console.error(`❌ Required element missing: ${name}`);
            return false;
        }
    }
    return true;
}

// Load and display songs in the UI
function loadAndDisplaySongs() {
    const songList = document.getElementById('song-list');
    if (!songList) {
        console.error("Song list element not found");
        return;
    }
    
    const songs = getSongs();
    console.log("🎵 loadAndDisplaySongs - Found songs:", songs.length, songs);
    
    songList.innerHTML = '';
    
    if (songs.length === 0) {
        console.warn("🎵 No songs found, showing empty message");
        songList.innerHTML = `
            <div style="text-align: center; padding: 20px; opacity: 0.7;">
                <p>Chưa có bài hát nào</p>
                <p style="font-size: 12px;">Tạo bài hát mới để bắt đầu</p>
            </div>
        `;
        return;
    }
    
    songs.forEach((song, index) => {
        console.log(`🎵 Creating song element ${index + 1}:`, song.name);
        const songElement = createSongElement(song);
        songList.appendChild(songElement);
    });
    
    console.log(`✅ Loaded ${songs.length} songs into UI`);
}

// Create song element for the list
function createSongElement(song) {
    const songElement = document.createElement('div');
    songElement.className = 'song-item';
    songElement.dataset.songId = song.id;
    
    const noteCount = song.notes ? song.notes.length : 0;
    const duration = calculateSongDuration(song);
    const storageInfo = getSongStorageInfo(song);
    
    songElement.innerHTML = `
        <div class="song-name">${song.name || 'Untitled Song'}</div>
        <div class="song-meta">
            <span>BPM: ${song.bpm || 120}</span>
            <span>Notes: ${noteCount}</span>
            <span>Duration: ${duration}</span>
        </div>
        <div class="song-duration">${storageInfo.description || 'Local'}</div>
        <div class="song-actions">
            <button class="edit-btn" data-action="edit">Edit</button>
            <button class="play-btn" data-action="play">Play</button>
            <button class="delete-btn" data-action="delete">Delete</button>
        </div>
    `;
    
    // Add event listeners
    songElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('song-actions') && !e.target.closest('.song-actions')) {
            loadSongIntoEditor(song);
        }
    });
    
    songElement.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            handleSongAction(action, song);
        });
    });
    
    return songElement;
}

// Handle song actions (edit, play, delete)
function handleSongAction(action, song) {
    switch (action) {
        case 'edit':
            loadSongIntoEditor(song);
            break;
        case 'play':
            playGameWithSong(song);
            break;
        case 'delete':
            deleteSong(song);
            break;
    }
}

// Play game with selected song
function playGameWithSong(song) {
    if (!song || !song.notes || song.notes.length === 0) {
        showNotification('Bài hát không có note để chơi', 'error');
        return;
    }
    
    // Set current song for game
    if (window.setCurrentSong) {
        window.setCurrentSong(song);
    }
    
    // Switch to game mode
    if (window.switchMode) {
        window.switchMode('game');
    }
    
    // Start the game
    setTimeout(() => {
        if (window.startGame) {
            window.startGame(song);
        }
    }, 500);
    
    showNotification(`Bắt đầu chơi: ${song.name}`, 'success');
}

// Delete song
function deleteSong(song) {
    if (confirm(`Bạn có chắc muốn xóa bài hát "${song.name}"?`)) {
        const songs = getSongs();
        const updatedSongs = songs.filter(s => s.id !== song.id);
        setSongs(updatedSongs);
        saveSongsToLocalStorage();
        loadAndDisplaySongs();
        
        // Clear editor if this song was being edited
        if (currentSong && currentSong.id === song.id) {
            createNewSong();
        }
        
        showNotification(`Đã xóa bài hát: ${song.name}`, 'success');
    }
}

// Calculate song duration
function calculateSongDuration(song) {
    if (!song.notes || song.notes.length === 0) return '0:00';
    
    const bpm = song.bpm || 120;
    const lastNote = Math.max(...song.notes.map(note => note.time || note.position || 0));
    const durationInSeconds = (lastNote * 60) / (bpm * 4);
    
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = Math.floor(durationInSeconds % 60);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Load song into editor
function loadSongIntoEditor(songData) {
    currentSong = songData;
    isEditing = true;
    
    // Update input fields
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) songNameInput.value = songData.name || '';
    if (songBpmInput) songBpmInput.value = songData.bpm || 120;
    if (rollLengthInput) rollLengthInput.value = songData.rollLength || 32;
    
    // Update roll length variable
    pianoRollLength = songData.rollLength || 32;
    
    // Clear and recreate grid
    clearNoteGrid();
    createGridLines();
    createTimelineRuler();
    createEditorPianoKeys();
    
    // Add notes to grid
    if (songData.notes && songData.notes.length > 0) {
        songData.notes.forEach(note => {
            addNoteToGrid(note);
        });
    }
    
    updateSaveButtonState();
    updatePerformanceStats();
    
    showNotification(`Loaded song: ${songData.name}`, 'success');
}

// Clear note grid
function clearNoteGrid() {
    const noteGrid = document.querySelector('.note-grid');
    if (noteGrid) {
        const notes = noteGrid.querySelectorAll('.grid-note');
        notes.forEach(note => note.remove());
    }
    selectedNotes.clear();
    updatePerformanceStats();
}

// Update song list (for external use)
function updateSongList() {
    loadAndDisplaySongs();
    updatePerformanceStats();
}

// Create new song
function createNewSong() {
    currentSong = {
        id: generateId(),
        name: '',
        bpm: 120,
        notes: [],
        rollLength: 32,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
    };
    
    isEditing = true;
    
    // Clear form
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) songNameInput.value = '';
    if (songBpmInput) songBpmInput.value = '120';
    if (rollLengthInput) rollLengthInput.value = '32';
    
    pianoRollLength = 32;
    
    // Clear and recreate grid
    clearNoteGrid();
    createGridLines();
    createTimelineRuler();
    createEditorPianoKeys();
    
    updateSaveButtonState();
    updatePerformanceStats();
    
    showNotification('Created new song', 'success');
}

// Save song
function saveSong(isAutoSave = false) {
    if (!currentSong) return;
    
    // Update song data from form
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) currentSong.name = songNameInput.value || 'Untitled Song';
    if (songBpmInput) currentSong.bpm = parseInt(songBpmInput.value) || 120;
    if (rollLengthInput) currentSong.rollLength = parseInt(rollLengthInput.value) || 32;
    
    // Update timestamp
    currentSong.modifiedAt = new Date().toISOString();
    
    // Get current notes from grid
    const noteElements = document.querySelectorAll('.grid-note');
    currentSong.notes = [];
    
    noteElements.forEach(noteElement => {
        const note = noteElement.getAttribute('data-note');
        const position = parseFloat(noteElement.getAttribute('data-position'));
        const duration = parseFloat(noteElement.getAttribute('data-duration'));
        
        if (note && !isNaN(position) && !isNaN(duration)) {
            currentSong.notes.push({
                note,
                key: note, // For compatibility
                time: position,
                position,
                duration
            });
        }
    });
    
    // Save to storage
    const songs = getSongs();
    const existingIndex = songs.findIndex(s => s.id === currentSong.id);
    
    if (existingIndex >= 0) {
        songs[existingIndex] = currentSong;
    } else {
        songs.push(currentSong);
    }
    
    setSongs(songs);
    saveSongsToLocalStorage();
    
    // Update UI
    loadAndDisplaySongs();
    updateSaveButtonState();
    updateSaveStatusIndicator('saved');
    
    if (!isAutoSave) {
        showNotification(`Saved: ${currentSong.name}`, 'success');
    }
    
    lastSaveTime = Date.now();
}

// Export functions for external use
export { 
    initSongManager,
    addNoteAtPosition, 
    handleMouseMove, 
    handleMouseUp,
    loadSongIntoEditor,
    clearNoteGrid,
    updateSongList,
    createNewSong,
    saveSong,
    playGameWithSong
};

// Create enhanced timeline ruler with beat markers
function createTimelineRuler() {
    if (!timelineRuler) return;
    
    // Clear existing markers
    timelineRuler.innerHTML = '';
    
    const unitWidth = 20;
    const beatsPerBar = 4;
    const totalBars = pianoRollLength;
    const totalBeats = totalBars * beatsPerBar;
    
    for (let beat = 0; beat <= totalBeats; beat++) {
        const marker = document.createElement('div');
        marker.className = 'beat-marker';
        
        // Major markers every 4 beats (bar lines)
        if (beat % beatsPerBar === 0) {
            marker.classList.add('major');
            marker.textContent = `${Math.floor(beat / beatsPerBar) + 1}`;
        } else {
            marker.textContent = `${(beat % beatsPerBar) + 1}`;
        }
        
        marker.style.left = `${beat * unitWidth * zoomLevel}px`;
        timelineRuler.appendChild(marker);
    }
}

// Create grid lines in the note grid (Enhanced version)
function createGridLines() {
    if (!noteGrid) return;
    
    // Store existing notes before clearing
    const existingNotes = Array.from(noteGrid.querySelectorAll('.grid-note')).map(note => {
        return {
            element: note.cloneNode(true),
            note: note.getAttribute('data-note'),
            position: parseFloat(note.getAttribute('data-position')),
            duration: parseFloat(note.getAttribute('data-duration'))
        };
    });
    
    // Clear only grid lines and rows, not notes
    const gridLines = noteGrid.querySelectorAll('.grid-row, div[style*="position: absolute"][style*="width: 1px"]');
    gridLines.forEach(line => line.remove());
    
    // Also clear any remaining background elements that aren't notes
    const allChildren = Array.from(noteGrid.children);
    allChildren.forEach(child => {
        if (!child.classList.contains('grid-note') && child.id !== 'playback-line') {
            child.remove();
        }
    });
    
    // Calculate grid width based on piano roll length
    const unitWidth = 20;
    const beatsPerBar = 4;
    const sixteenthNotesPerBeat = 4;
    const totalGridUnits = pianoRollLength * beatsPerBar * sixteenthNotesPerBeat;
    const calculatedGridWidth = totalGridUnits * (unitWidth / 4) * zoomLevel;
    
    // Set the note grid width
    noteGrid.style.width = `${calculatedGridWidth}px`;
    
    // Create horizontal lines for each note
    const keyHeight = 20;
    const reversedKeyOrder = [...keyOrder].reverse();
    
    reversedKeyOrder.forEach((note, index) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'grid-row';
        rowElement.style.position = 'absolute';
        rowElement.style.left = '0';
        rowElement.style.top = `${index * keyHeight}px`;
        rowElement.style.width = `${calculatedGridWidth}px`;
        rowElement.style.height = `${keyHeight}px`;
        rowElement.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        rowElement.setAttribute('data-note', note);
        
        noteGrid.appendChild(rowElement);
    });
    
    // Add vertical lines for beat subdivisions
    const numVerticalLines = totalGridUnits;
    
    for (let i = 0; i <= numVerticalLines; i++) {
        const lineElement = document.createElement('div');
        lineElement.style.position = 'absolute';
        lineElement.style.top = '0';
        lineElement.style.left = `${i * (unitWidth / 2) * zoomLevel}px`;
        lineElement.style.width = '1px';
        lineElement.style.height = '100%';
        
        // Different opacity for different types of lines
        if (i % (beatsPerBar * sixteenthNotesPerBeat) === 0) {
            lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        } else if (i % sixteenthNotesPerBeat === 0) {
            lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        } else {
            lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        }
        
        noteGrid.appendChild(lineElement);
    }
    
    // Restore existing notes if any
    existingNotes.forEach(noteData => {
        if (noteData.element) {
            noteGrid.appendChild(noteData.element);
        }
    });
    
    updatePerformanceStats();
}

// Add note at position (Enhanced version)
function addNoteAtPosition(e) {
    console.log("addNoteAtPosition called with event:", e);
    
    // Only add notes with pencil tool
    if (currentTool !== 'pencil') {
        if (currentTool === 'eraser') {
            handleEraserClick(e);
        } else if (currentTool === 'select') {
            handleSelectClick(e);
        }
        return;
    }
    
    // Check if we just finished dragging/resizing
    if (clickProcessedOnNote) {
        console.log("Ignoring click - just finished dragging/resizing");
        return;
    }
    
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) {
        console.error("Grid not found in addNoteAtPosition");
        return;
    }
    
    const rect = noteGrid.getBoundingClientRect();
    const x = e.clientX - rect.left + noteGrid.scrollLeft;
    const y = e.clientY - rect.top + noteGrid.scrollTop;
    
    // Calculate grid position
    const keyHeight = 20;
    const unitWidth = 20 * zoomLevel;
    
    const noteIndex = Math.floor(y / keyHeight);
    const position = Math.floor(x / (unitWidth / 4)) * 0.25;
    
    // Get the note based on index
    const reversedKeyOrder = [...keyOrder].reverse();
    if (noteIndex >= reversedKeyOrder.length || noteIndex < 0) {
        console.log("Invalid note index:", noteIndex);
        return;
    }
    
    const note = reversedKeyOrder[noteIndex];
    console.log("Creating note:", note, "at position:", position, "duration:", currentNoteDuration);
    
    // Create note data
    const noteData = {
        note,
        position,
        duration: currentNoteDuration
    };
    
    // Add to grid
    addNoteToGrid(noteData);
    
    // Add to current song if editing
    if (currentSong) {
        currentSong.notes = currentSong.notes || [];
        currentSong.notes.push(noteData);
        console.log("Added note to currentSong:", noteData);
        updateSaveButtonState();
        updatePerformanceStats();
    }
    
    // Play the note sound
    playNoteSound(note);
}

// Handle eraser tool click
function handleEraserClick(e) {
    if (e.target.classList.contains('grid-note')) {
        deleteNote(e.target);
    }
}

// Handle select tool click
function handleSelectClick(e) {
    if (e.target.classList.contains('grid-note')) {
        toggleNoteSelection(e.target);
    } else {
        // Clear selection if clicking on empty area
        clearNoteSelection();
    }
}

// Toggle note selection
function toggleNoteSelection(noteElement) {
    if (selectedNotes.has(noteElement)) {
        selectedNotes.delete(noteElement);
        noteElement.classList.remove('selected');
    } else {
        selectedNotes.add(noteElement);
        noteElement.classList.add('selected');
    }
}

// Clear note selection
function clearNoteSelection() {
    selectedNotes.forEach(note => note.classList.remove('selected'));
    selectedNotes.clear();
}

// Add note to grid (Enhanced version)
function addNoteToGrid(noteData) {
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) {
        console.error("Note grid not found!");
        return;
    }
    
    console.log("🎵 Adding note to grid:", noteData);
    
    const note = noteData.note || noteData.key;
    const position = noteData.position || noteData.time || 0;
    const duration = noteData.duration || 2;
    
    if (!note) {
        console.error("Note data missing 'note' field:", noteData);
        return;
    }
    
    // Find the row for this note
    const reversedKeyOrder = [...keyOrder].reverse();
    const noteIndex = reversedKeyOrder.indexOf(note);
    
    if (noteIndex === -1) {
        console.error("Invalid note:", note, "not found in keyOrder");
        return;
    }
    
    const keyHeight = 20;
    const unitWidth = 20 * zoomLevel;
    
    // Check for duplicates
    const existingNotes = noteGrid.querySelectorAll('.grid-note');
    for (let existingNote of existingNotes) {
        const existingPosition = parseFloat(existingNote.getAttribute('data-position') || '0');
        const existingNoteValue = existingNote.getAttribute('data-note');
        
        if (existingNoteValue === note && Math.abs(existingPosition - position) < 0.1) {
            console.log("Duplicate note detected, skipping");
            return;
        }
    }
    
    // Create the note element
    const noteElement = document.createElement('div');
    noteElement.className = 'grid-note';
    noteElement.style.position = 'absolute';
    noteElement.style.top = `${noteIndex * keyHeight}px`;
    noteElement.style.left = `${position * (unitWidth / 4)}px`;
    noteElement.style.width = `${duration * (unitWidth / 4)}px`;
    noteElement.style.height = `${keyHeight - 2}px`;
    
    // Add data attributes
    noteElement.setAttribute('data-note', note);
    noteElement.setAttribute('data-position', position);
    noteElement.setAttribute('data-duration', duration);
    
    // Add unique ID
    const uniqueId = 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    noteElement.setAttribute('data-id', uniqueId);
    
    console.log(`✅ Created note element: ${note} at ${position}, duration ${duration}`);
    
    // Add resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.right = '0';
    resizeHandle.style.top = '0';
    resizeHandle.style.width = '5px';
    resizeHandle.style.height = '100%';
    resizeHandle.style.cursor = 'ew-resize';
    
    noteElement.appendChild(resizeHandle);
    
    // Add event listeners
    addNoteEventListeners(noteElement);
    
    // Add to grid
    noteGrid.appendChild(noteElement);
    
    updatePerformanceStats();
    console.log("🎵 Note added to grid successfully!");
}

// Delete note
function deleteNote(noteElement) {
    if (!noteElement) return;
    
    // Remove from selected notes
    selectedNotes.delete(noteElement);
    
    // Remove from current song data
    if (currentSong && currentSong.notes) {
        const noteValue = noteElement.getAttribute('data-note');
        const position = parseFloat(noteElement.getAttribute('data-position'));
        
        currentSong.notes = currentSong.notes.filter(note => 
            !(note.note === noteValue && Math.abs(note.position - position) < 0.1)
        );
    }
    
    // Animate removal
    noteElement.classList.add('deleting');
    setTimeout(() => {
        if (noteElement.parentNode) {
            noteElement.parentNode.removeChild(noteElement);
        }
        updatePerformanceStats();
        updateSaveButtonState();
    }, 300);
}

// Setup enhanced features
function setupEnhancedFeatures() {
    console.log("🎵 Setting up enhanced features...");
    
    setupMiniToolbar();
    setupAutoSave();
    setupZoomControls();
    
    // Duration buttons
    durationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            durationBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentNoteDuration = parseFloat(btn.dataset.value);
            console.log("Duration changed to:", currentNoteDuration);
        });
    });
    
    // Save mode radio buttons
    saveModeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                forcedSaveMode = radio.value;
                console.log("Save mode changed to:", forcedSaveMode);
            }
        });
    });
    
    // Playback controls
    if (playEditorBtn) {
        playEditorBtn.addEventListener('click', startPlayback);
    }
    
    if (stopEditorBtn) {
        stopEditorBtn.addEventListener('click', stopPlayback);
    }
    
    // Global mouse events for drag and resize
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    console.log("✅ Enhanced features set up");
}

// Setup mini toolbar
function setupMiniToolbar() {
    if (!miniToolbar) return;
    
    const toolButtons = miniToolbar.querySelectorAll('.mini-btn');
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const toolId = this.id;
            
            // Remove active class from all buttons
            toolButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Handle tool selection
            if (toolId === 'select-tool') {
                currentTool = 'select';
                document.body.style.cursor = 'default';
            } else if (toolId === 'pencil-tool') {
                currentTool = 'pencil';
                document.body.style.cursor = 'default';
            } else if (toolId === 'eraser-tool') {
                currentTool = 'eraser';
                document.body.style.cursor = 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><rect x=\'2\' y=\'2\' width=\'16\' height=\'16\' fill=\'%23ff4444\' opacity=\'0.8\'/></svg>") 10 10, auto';
            } else if (toolId === 'zoom-in') {
                handleZoom(0.2);
                // Reset to previous tool
                setTimeout(() => {
                    const prevActive = miniToolbar.querySelector('.mini-btn.active[id$="-tool"]');
                    if (prevActive) {
                        prevActive.click();
                    }
                }, 100);
            } else if (toolId === 'zoom-out') {
                handleZoom(-0.2);
                // Reset to previous tool
                setTimeout(() => {
                    const prevActive = miniToolbar.querySelector('.mini-btn.active[id$="-tool"]');
                    if (prevActive) {
                        prevActive.click();
                    }
                }, 100);
            }
            
            console.log("Tool changed to:", currentTool);
        });
    });
}

// Handle zoom
function handleZoom(delta) {
    zoomLevel = Math.max(0.5, Math.min(3, zoomLevel + delta));
    createGridLines();
    createTimelineRuler();
    
    showNotification(`Zoom: ${Math.round(zoomLevel * 100)}%`, 'info');
}

// Setup auto save
function setupAutoSave() {
    if (!autoSaveEnabled) return;
    
    setInterval(() => {
        if (currentSong && Date.now() - lastSaveTime > 30000) { // 30 seconds
            saveSong(true); // Auto save
        }
    }, 5000); // Check every 5 seconds
}

// Update save status indicator
function updateSaveStatusIndicator(status) {
    if (!saveStatusIndicator) return;
    
    const statusDot = saveStatusIndicator.querySelector('.status-dot');
    const statusText = saveStatusIndicator.querySelector('span');
    
    // Remove all status classes
    saveStatusIndicator.classList.remove('saved', 'unsaved', 'saving');
    statusDot.classList.remove('saved', 'unsaved', 'saving');
    
    // Add current status
    saveStatusIndicator.classList.add(status);
    statusDot.classList.add(status);
    
    // Update text
    switch (status) {
        case 'saved':
            statusText.textContent = 'Saved';
            break;
        case 'unsaved':
            statusText.textContent = 'Unsaved';
            break;
        case 'saving':
            statusText.textContent = 'Saving...';
            break;
    }
}

// Update performance stats
function updatePerformanceStats() {
    if (!performanceStats) return;
    
    const noteCountEl = document.getElementById('note-count');
    const songLengthEl = document.getElementById('song-length');
    const currentBpmEl = document.getElementById('current-bpm');
    const songKeyEl = document.getElementById('song-key');
    
    // Count notes
    const noteCount = noteGrid ? noteGrid.querySelectorAll('.grid-note').length : 0;
    if (noteCountEl) noteCountEl.textContent = noteCount;
    
    // Calculate song length
    if (songLengthEl) {
        const bpm = parseInt(document.getElementById('song-bpm')?.value) || 120;
        const length = (pianoRollLength * 4) / (bpm / 60); // Length in seconds
        const minutes = Math.floor(length / 60);
        const seconds = Math.floor(length % 60);
        songLengthEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update BPM
    if (currentBpmEl) {
        const bpm = document.getElementById('song-bpm')?.value || '120';
        currentBpmEl.textContent = bpm;
    }
    
    // Analyze key (simple detection based on notes)
    if (songKeyEl && currentSong && currentSong.notes) {
        const keySignature = detectKey(currentSong.notes);
        songKeyEl.textContent = keySignature;
    }
}

// Simple key detection
function detectKey(notes) {
    if (!notes || notes.length === 0) return 'C';
    
    const noteCount = {};
    notes.forEach(note => {
        const baseName = note.note.replace(/\d+/, '').toLowerCase();
        noteCount[baseName] = (noteCount[baseName] || 0) + 1;
    });
    
    // Find most common note
    const mostCommon = Object.keys(noteCount).reduce((a, b) => 
        noteCount[a] > noteCount[b] ? a : b
    );
    
    return mostCommon.toUpperCase();
}

// Enhanced playback with visual indicator
function startPlayback() {
    if (isPlaying) return;
    
    isPlaying = true;
    playbackPosition = 0;
    
    if (playbackLine) {
        playbackLine.classList.add('playing');
    }
    
    playbackInterval = setInterval(() => {
        updatePlaybackPosition();
        
        if (playbackPosition >= pianoRollLength * 4) { // End of song
            stopPlayback();
        }
    }, 100); // Update every 100ms
    
    showNotification('Playback started', 'info');
}

// Stop playback
function stopPlayback() {
    isPlaying = false;
    playbackPosition = 0;
    
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    
    if (playbackLine) {
        playbackLine.classList.remove('playing');
        playbackLine.style.left = '0px';
    }
    
    showNotification('Playback stopped', 'info');
}

// Update playback position
function updatePlaybackPosition() {
    if (!playbackLine || !noteGrid) return;
    
    const gridWidth = noteGrid.offsetWidth;
    const progress = playbackPosition / (pianoRollLength * 4);
    playbackLine.style.left = `${progress * gridWidth}px`;
    playbackPosition += 0.1; // Increment playback position
}

// Add note event listeners
function addNoteEventListeners(noteElement) {
    // Mouse down on note
    noteElement.addEventListener('mousedown', (e) => {
        if (currentTool === 'eraser') {
            deleteNote(noteElement);
            return;
        }
        
        if (currentTool === 'select') {
            toggleNoteSelection(noteElement);
            return;
        }
        
        if (e.target.classList.contains('resize-handle')) {
            isResizing = true;
            startX = e.clientX;
            startWidth = noteElement.offsetWidth;
        } else {
            isDragging = true;
            startX = e.clientX;
            startLeft = noteElement.offsetLeft;
        }
        
        draggedElement = noteElement;
        currentDraggedNote = noteElement;
        noteElement.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Double click to delete (if using pencil tool)
    noteElement.addEventListener('dblclick', () => {
        if (currentTool === 'pencil') {
            deleteNote(noteElement);
        }
    });
}

// Handle mouse move (Enhanced version)
function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;
    if (!draggedElement) return;
    
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) return;
    
    const rect = noteGrid.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    
    if (isDragging) {
        const newLeft = startLeft + deltaX;
        const maxLeft = rect.width - draggedElement.offsetWidth;
        draggedElement.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
    } else if (isResizing) {
        const newWidth = startWidth + deltaX;
        const minWidth = 10;
        draggedElement.style.width = Math.max(minWidth, newWidth) + 'px';
    }
}

// Handle mouse up (Enhanced version)
function handleMouseUp(e) {
    if (isDragging || isResizing) {
        if (draggedElement) {
            // Update note data
            const noteGrid = document.querySelector('.note-grid');
            if (noteGrid) {
                const rect = noteGrid.getBoundingClientRect();
                const unitWidth = 20 * zoomLevel;
                
                const newPosition = (draggedElement.offsetLeft / (unitWidth / 4));
                const newDuration = (draggedElement.offsetWidth / (unitWidth / 4));
                
                // Update attributes
                draggedElement.setAttribute('data-position', newPosition.toFixed(2));
                draggedElement.setAttribute('data-duration', newDuration.toFixed(2));
                
                // Update song data
                if (currentSong && currentSong.notes) {
                    const noteValue = draggedElement.getAttribute('data-note');
                    const noteIndex = currentSong.notes.findIndex(note => 
                        note.note === noteValue && 
                        Math.abs(note.position - parseFloat(draggedElement.getAttribute('data-position'))) < 0.1
                    );
                    
                    if (noteIndex >= 0) {
                        currentSong.notes[noteIndex].position = newPosition;
                        currentSong.notes[noteIndex].duration = newDuration;
                    }
                }
                
                updateSaveButtonState();
                updatePerformanceStats();
            }
            
            draggedElement.classList.remove('dragging');
            draggedElement = null;
            currentDraggedNote = null;
        }
        
        isDragging = false;
        isResizing = false;
        clickProcessedOnNote = true;
        
        setTimeout(() => {
            clickProcessedOnNote = false;
        }, 50);
    }
}

// Create editor piano keys
function createEditorPianoKeys() {
    if (!pianoKeysContainer) return;
    
    pianoKeysContainer.innerHTML = '';
    
    const keyHeight = 20;
    const reversedKeyOrder = [...keyOrder].reverse();
    
    reversedKeyOrder.forEach((note, index) => {
        const keyElement = document.createElement('div');
        keyElement.className = `editor-key ${keyColors[note]}-key`;
        keyElement.style.height = `${keyHeight}px`;
        keyElement.style.lineHeight = `${keyHeight}px`;
        keyElement.textContent = note.toUpperCase();
        keyElement.setAttribute('data-note', note);
        
        // Add click listener to play note
        keyElement.addEventListener('click', () => {
            playNoteSound(note);
        });
        
        pianoKeysContainer.appendChild(keyElement);
    });
}

// Play note sound (placeholder)
function playNoteSound(note) {
    console.log(`🎵 Playing note: ${note}`);
    // TODO: Implement actual audio playback
}

// Update save button state
function updateSaveButtonState() {
    if (currentSong) {
        updateSaveStatusIndicator('unsaved');
        lastSaveTime = Date.now();
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log("🎵 Setting up Song Manager event listeners...");
    
    if (newSongBtn) {
        newSongBtn.addEventListener('click', createNewSong);
    }
    
    if (importSongBtn) {
        importSongBtn.addEventListener('click', importSong);
    }
    
    if (saveSongBtn) {
        saveSongBtn.addEventListener('click', () => saveSong(false));
    }
    
    if (exportSongBtn) {
        exportSongBtn.addEventListener('click', exportSong);
    }
    
    // Song list toggle for mobile
    const songListToggle = document.getElementById('song-list-toggle');
    const songListContainer = document.querySelector('.song-list-container');
    if (songListToggle && songListContainer) {
        songListToggle.addEventListener('click', () => {
            songListContainer.classList.toggle('collapsed');
            const isCollapsed = songListContainer.classList.contains('collapsed');
            songListToggle.textContent = isCollapsed ? '▶' : '◀';
            console.log("🎵 Song list toggle:", isCollapsed ? 'collapsed' : 'expanded');
        });
    }
    
    // Song list container header toggle for mobile
    const songListHeader = songListContainer?.querySelector('h2');
    if (songListHeader) {
        songListHeader.addEventListener('click', () => {
            if (songListContainer) {
                songListContainer.classList.toggle('collapsed');
                const isCollapsed = songListContainer.classList.contains('collapsed');
                console.log("🎵 Song list header toggle:", isCollapsed ? 'collapsed' : 'expanded');
            }
        });
    }
    
    // Song name input
    if (songNameInput) {
        songNameInput.addEventListener('input', () => {
            updateSaveButtonState();
        });
    }
    
    // BPM input
    if (songBpmInput) {
        songBpmInput.addEventListener('input', () => {
            updateSaveButtonState();
            updatePerformanceStats();
        });
    }
    
    // Roll length input
    if (rollLengthInput) {
        rollLengthInput.addEventListener('input', () => {
            pianoRollLength = parseInt(rollLengthInput.value) || 32;
            createGridLines();
            createTimelineRuler();
            updateSaveButtonState();
            updatePerformanceStats();
        });
    }
    
    // Grid interactions
    if (noteGrid) {
        noteGrid.addEventListener('click', addNoteAtPosition);
        noteGrid.addEventListener('mousedown', (e) => {
            if (currentTool === 'select' && !e.target.classList.contains('grid-note')) {
                clearNoteSelection();
            }
        });
        
        // Prevent context menu
        noteGrid.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    console.log("✅ Song Manager event listeners set up");
}

// Initialize UI
function initializeUI() {
    console.log("🎵 Initializing Song Manager UI...");
    
    // Create initial song if none exists
    if (!currentSong) {
        createNewSong();
    }
    
    // Initialize grid and timeline
    createGridLines();
    createTimelineRuler();
    createEditorPianoKeys();
    
    // Update initial UI state
    updateSaveStatusIndicator('saved');
    updatePerformanceStats();
    updateSaveButtonState();
    
    // Set initial collapsed state for mobile
    const songListContainer = document.querySelector('.song-list-container');
    if (songListContainer) {
        // Start with expanded state on mobile
        songListContainer.classList.remove('collapsed');
    }
    
    console.log("✅ Song Manager UI initialized");
}

// Import song
function importSong() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const songData = JSON.parse(event.target.result);
                
                // Validate song data
                if (!songData.name || !Array.isArray(songData.notes)) {
                    throw new Error('Invalid song file format');
                }
                
                // Generate new ID to avoid conflicts
                songData.id = generateId();
                songData.importedAt = new Date().toISOString();
                
                // Add to songs list
                const songs = getSongs();
                songs.push(songData);
                setSongs(songs);
                saveSongsToLocalStorage();
                
                // Load into editor
                loadSongIntoEditor(songData);
                loadAndDisplaySongs();
                
                showNotification(`Imported: ${songData.name}`, 'success');
                
            } catch (error) {
                console.error('Import error:', error);
                showErrorMessage('Failed to import song: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Export song
function exportSong() {
    if (!currentSong) {
        showNotification('No song to export', 'warning');
        return;
    }
    
    // Update current song data before export
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) currentSong.name = songNameInput.value || 'Untitled Song';
    if (songBpmInput) currentSong.bpm = parseInt(songBpmInput.value) || 120;
    if (rollLengthInput) currentSong.rollLength = parseInt(rollLengthInput.value) || 32;
    
    // Collect current notes from grid
    const noteElements = document.querySelectorAll('.grid-note');
    currentSong.notes = [];
    
    noteElements.forEach(noteElement => {
        const note = noteElement.getAttribute('data-note');
        const position = parseFloat(noteElement.getAttribute('data-position'));
        const duration = parseFloat(noteElement.getAttribute('data-duration'));
        
        if (note && !isNaN(position) && !isNaN(duration)) {
            currentSong.notes.push({
                note,
                key: note,
                time: position,
                position,
                duration
            });
        }
    });
    
    // Add export metadata
    const exportData = {
        ...currentSong,
        exportedAt: new Date().toISOString(),
        exportedBy: 'Pink Poong Piano'
    };
    
    // Create and download file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${currentSong.name || 'song'}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Exported: ${currentSong.name}`, 'success');
}

// Setup zoom controls
function setupZoomControls() {
    // Zoom controls are handled in setupMiniToolbar
    console.log("Zoom controls setup completed");
}

// Add global exports for external access
if (typeof window !== 'undefined') {
    window.songManager = {
        initSongManager,
        loadSongIntoEditor,
        createNewSong,
        saveSong,
        playGameWithSong,
        updateSongList
    };
}

console.log("Song Manager module loaded successfully");

 
 