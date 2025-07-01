// Song Manager Module
import { generateId, isLocalStorageAvailable } from '../utils/helpers.js';
import { getSongs, setSongs, saveSongsToLocalStorage, getSongStorageInfo } from '../utils/storage.js';
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

// DOM element references (cached for performance)
let saveSongBtn, newSongBtn, importSongBtn, exportSongBtn;
let playEditorBtn, stopEditorBtn, noteGrid, pianoKeysContainer;
let durationBtns, saveModeRadios;

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
    
    console.log("DOM elements cached:", {
        saveSongBtn, newSongBtn, importSongBtn, exportSongBtn, 
        playEditorBtn, stopEditorBtn, noteGrid, 
        pianoKeysContainer, durationBtns: durationBtns.length,
        saveModeRadios: saveModeRadios.length
    });
}

// Get current song
export function getCurrentSong() {
    return currentSong;
}

// Create new song
export function createNewSong() {
    currentSong = {
        id: 'temp_' + generateId(),
        name: 'New Song',
        bpm: 120,
        notes: [],
        rollLength: 32,
        createdAt: new Date().toISOString(),
        userId: getCurrentUser()?.uid || 'anonymous'
    };
    
    isEditing = true;
    clearSongInputs();
    loadSongIntoEditor(currentSong);
    
    console.log("Created new song:", currentSong.id);
    showNotification('Tạo bài hát mới', 'success');
}

// Edit existing song
export function editSong(songId) {
    const songs = getSongs();
    const song = songs.find(s => s.id === songId);
    
    if (!song) {
        showErrorMessage('Không tìm thấy bài hát');
        return;
    }
    
    currentSong = { ...song };
    isEditing = true;
    loadSongIntoEditor(currentSong);
    
    console.log("Editing song:", song.name);
    showNotification(`Đang chỉnh sửa: ${song.name}`, 'info');
}

// Load song into editor
function loadSongIntoEditor(songData) {
    // Update input fields
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) songNameInput.value = songData.name || '';
    if (songBpmInput) songBpmInput.value = songData.bpm || 120;
    if (rollLengthInput) rollLengthInput.value = songData.rollLength || 32;
    
    // Clear and recreate grid
    clearNoteGrid();
    createGridLines();
    createEditorPianoKeys();
    
    // Add notes to grid
    if (songData.notes && songData.notes.length > 0) {
        songData.notes.forEach(note => {
            addNoteToGrid(note);
        });
    }
    
    updateSaveButtonState();
}

// Clear note grid
function clearNoteGrid() {
    const noteGrid = document.querySelector('.note-grid');
    if (noteGrid) {
        const notes = noteGrid.querySelectorAll('.grid-note');
        notes.forEach(note => note.remove());
    }
}

// Create piano keys in the editor
function createEditorPianoKeys() {
    if (!pianoKeysContainer) return;
    
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

// Create grid lines in the note grid (Enhanced version from original)
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
        if (!child.classList.contains('grid-note') && child.id !== 'playhead') {
            child.remove();
        }
    });
    
    // Calculate grid width based on piano roll length (bars * 4 beats per bar * 4 sixteenth-notes per beat)
    const unitWidth = 20;
    const beatsPerBar = 4;
    const sixteenthNotesPerBeat = 4; // Each beat has 4 sixteenth notes
    const totalGridUnits = pianoRollLength * beatsPerBar * sixteenthNotesPerBeat;
    const calculatedGridWidth = totalGridUnits * (unitWidth / 4); // Each sixteenth note is 1/4 of unitWidth
    
    // Set the note grid width to the calculated width
    noteGrid.style.width = `${calculatedGridWidth}px`;
    
    // Create horizontal lines for each note
    const keyHeight = 20; // Height of each note row
    const reversedKeyOrder = [...keyOrder].reverse();
    
    reversedKeyOrder.forEach((note, index) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'grid-row';
        rowElement.style.position = 'absolute';
        rowElement.style.left = '0';
        rowElement.style.top = `${index * keyHeight}px`;
        rowElement.style.width = `${calculatedGridWidth}px`; // Use calculated width instead of 100%
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
        lineElement.style.left = `${i * (unitWidth / 2)}px`;
        lineElement.style.width = '1px';
        lineElement.style.height = '100%';
        
        // Different opacity for different types of lines
        if (i % (beatsPerBar * sixteenthNotesPerBeat) === 0) {
            // Measure line (every 4 beats)
            lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        } else if (i % sixteenthNotesPerBeat === 0) {
            // Beat line (every beat)
            lineElement.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        } else {
            // Subdivision line (every sixteenth note)
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
}

// Add note at position (when clicking on grid) - Enhanced version
export function addNoteAtPosition(e) {
    console.log("addNoteAtPosition called with event:", e);
    
    // Check if we just finished dragging/resizing - if so, don't create note
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
    // Calculate the mouse position relative to the grid, accounting for scroll
    const x = e.clientX - rect.left + noteGrid.scrollLeft;
    const y = e.clientY - rect.top + noteGrid.scrollTop;
    
    // Calculate grid position
    const keyHeight = 20; // Height of each note row
    const unitWidth = 20; // Width of each grid unit
    
    const noteIndex = Math.floor(y / keyHeight);
    // Position in 16th note units (0.25 precision for finer control)
    const position = Math.floor(x / (unitWidth / 4)) * 0.25;
    
    // Get the note based on index
    const reversedKeyOrder = [...keyOrder].reverse();
    if (noteIndex >= reversedKeyOrder.length || noteIndex < 0) {
        console.log("Invalid note index:", noteIndex, "keyOrder length:", reversedKeyOrder.length);
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
    }
    
    // Play the note sound
    playNoteSound(note);
}

// Add note to grid (Fixed to match original script.js)
function addNoteToGrid(noteData) {
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) {
        console.error("Note grid not found!");
        return;
    }
    
    console.log("🎵 Adding note to grid:", noteData);
    
    // Check if we have the right data structure
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
    
    const keyHeight = 20; // Height of each note row  
    const unitWidth = 20; // Width of each grid unit
    
    // Check for duplicates (simple check)
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
    noteElement.style.position = 'absolute'; // Critical!
    noteElement.style.top = `${noteIndex * keyHeight}px`;
    noteElement.style.left = `${position * (unitWidth / 4)}px`; // Position in 16th note units
    noteElement.style.width = `${duration * (unitWidth / 4)}px`; // Duration in 16th note units
    noteElement.style.height = `${keyHeight - 2}px`; // Leave 2px margin
    
    // Add data attributes (using same format as original)
    noteElement.setAttribute('data-note', note);
    noteElement.setAttribute('data-position', position);
    noteElement.setAttribute('data-duration', duration);
    
    // Add unique ID for debugging
    const uniqueId = 'note_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    noteElement.setAttribute('data-id', uniqueId);
    
    console.log(`✅ Created note element: ${note} at ${position}, duration ${duration}`);
    console.log("   Position: top=${noteElement.style.top}, left=${noteElement.style.left}");
    console.log("   Size: width=${noteElement.style.width}, height=${noteElement.style.height}");
    
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
    
    console.log("🎵 Note added to grid successfully!");
}

// Add event listeners to note element
function addNoteEventListeners(noteElement) {
    // Mouse down on note
    noteElement.addEventListener('mousedown', (e) => {
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
    
    // Double click to delete
    noteElement.addEventListener('dblclick', () => {
        deleteNote(noteElement);
    });
}

// Handle mouse move (for dragging and resizing)
export function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;
    if (!draggedElement) return;
    
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) return;
    
    const rect = noteGrid.getBoundingClientRect();
    const deltaX = e.clientX - startX;
    
    if (isDragging) {
        // Update position
        const newLeft = startLeft + deltaX;
        const maxLeft = rect.width - draggedElement.offsetWidth;
        draggedElement.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
    } else if (isResizing) {
        // Update width
        const newWidth = startWidth + deltaX;
        const minWidth = 10; // Minimum width
        draggedElement.style.width = Math.max(minWidth, newWidth) + 'px';
    }
}

// Handle mouse up (end dragging/resizing)
export function handleMouseUp(e) {
    if (isDragging || isResizing) {
        if (draggedElement) {
            // Update note data
            const noteGrid = document.querySelector('.note-grid');
            if (noteGrid) {
                const rect = noteGrid.getBoundingClientRect();
                const rollLength = parseInt(document.getElementById('roll-length')?.value) || 32;
                const totalSubdivisions = rollLength * 4 * 4;
                
                // Calculate new time and duration
                const leftPercent = (draggedElement.offsetLeft / rect.width) * 100;
                const widthPercent = (draggedElement.offsetWidth / rect.width) * 100;
                
                const newTime = (leftPercent / 100) * totalSubdivisions;
                const newDuration = (widthPercent / 100) * totalSubdivisions;
                
                // Update dataset
                draggedElement.dataset.time = newTime.toFixed(2);
                draggedElement.dataset.duration = newDuration.toFixed(2);
                
                // Update song data if editing
                if (currentSong && currentSong.notes) {
                    const oldKey = draggedElement.dataset.key;
                    const oldTime = parseFloat(draggedElement.dataset.time);
                    
                    const noteIndex = currentSong.notes.findIndex(note => 
                        note.key === oldKey && Math.abs(note.time - oldTime) < 0.1
                    );
                    
                    if (noteIndex >= 0) {
                        currentSong.notes[noteIndex].time = newTime;
                        currentSong.notes[noteIndex].duration = newDuration;
                    }
                }
            }
            
            draggedElement.classList.remove('dragging');
            draggedElement = null;
            currentDraggedNote = null;
        }
        
        isDragging = false;
        isResizing = false;
        
        // Prevent click event from creating new note immediately after drag/resize
        clickProcessedOnNote = true;
        setTimeout(() => {
            clickProcessedOnNote = false;
        }, 100);
    }
}

// Delete note
function deleteNote(noteElement) {
    const key = noteElement.dataset.key;
    const time = parseFloat(noteElement.dataset.time);
    
    // Remove from current song
    if (currentSong && currentSong.notes) {
        const index = currentSong.notes.findIndex(note => 
            note.key === key && Math.abs(note.time - time) < 0.1
        );
        if (index >= 0) {
            currentSong.notes.splice(index, 1);
        }
    }
    
    // Remove from DOM
    noteElement.remove();
    updateSaveButtonState();
}

// Play editor song
export function playEditorSong() {
    if (!currentSong || !currentSong.notes || currentSong.notes.length === 0) {
        showNotification('Không có note nào để phát', 'warning');
        return;
    }
    
    if (isPlaying) {
        stopEditorSong();
        return;
    }
    
    isPlaying = true;
    playbackPosition = 0;
    
    const playBtn = document.getElementById('play-editor-btn');
    const stopBtn = document.getElementById('stop-editor-btn');
    
    if (playBtn) playBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    
    // Sort notes by time
    const sortedNotes = [...currentSong.notes].sort((a, b) => a.time - b.time);
    const bpm = currentSong.bpm || 120;
    const beatDuration = 60000 / bpm; // ms per beat
    
    let noteIndex = 0;
    const startTime = Date.now();
    
    playbackInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const currentBeat = elapsedTime / beatDuration;
        
        // Play notes that should be triggered now
        while (noteIndex < sortedNotes.length && sortedNotes[noteIndex].time <= currentBeat) {
            const note = sortedNotes[noteIndex];
            playNoteSound(note.key);
            noteIndex++;
        }
        
        // Update playback indicator
        updatePlaybackIndicator(currentBeat);
        
        // Stop when all notes played
        if (noteIndex >= sortedNotes.length) {
            stopEditorSong();
        }
    }, 50); // Update every 50ms
    
    showNotification('Bắt đầu phát', 'info');
}

// Stop editor song
export function stopEditorSong() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    
    isPlaying = false;
    playbackPosition = 0;
    
    const playBtn = document.getElementById('play-editor-btn');
    const stopBtn = document.getElementById('stop-editor-btn');
    
    if (playBtn) playBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    
    // Remove playback indicator
    removePlaybackIndicator();
    
    showNotification('Dừng phát', 'info');
}

// Update playback indicator
function updatePlaybackIndicator(currentBeat) {
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) return;
    
    // Remove existing indicator
    removePlaybackIndicator();
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'playback-indicator';
    indicator.style.position = 'absolute';
    indicator.style.left = `${(currentBeat / 128) * 100}%`; // Assuming 128 beat total
    indicator.style.top = '0';
    indicator.style.width = '2px';
    indicator.style.height = '100%';
    indicator.style.background = '#ff4444';
    indicator.style.zIndex = '1000';
    indicator.style.pointerEvents = 'none';
    
    noteGrid.appendChild(indicator);
}

// Remove playback indicator
function removePlaybackIndicator() {
    const indicator = document.querySelector('.playback-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Play note sound
function playNoteSound(key) {
    // Create audio context if needed
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Simple tone generation
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Note frequencies (simplified)
        const frequencies = {
            'c5': 523.25, 'd5': 587.33, 'e5': 659.25, 'f5': 698.46, 'g5': 783.99, 'a5': 880.00, 'b5': 987.77,
            'c6': 1046.50, 'd6': 1174.66, 'e6': 1318.51, 'f6': 1396.91, 'g6': 1567.98, 'a6': 1760.00, 'b6': 1975.53,
            'c7': 2093.00
        };
        
        oscillator.frequency.setValueAtTime(frequencies[key] || 440, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log("Audio playback not available:", error);
    }
}

// Toggle song list (for mobile)
export function toggleSongList() {
    const songListContainer = document.querySelector('.song-list-container');
    const toggle = document.getElementById('song-list-toggle');
    
    if (songListContainer && toggle) {
        const isCollapsed = songListContainer.classList.contains('collapsed');
        
        if (isCollapsed) {
            songListContainer.classList.remove('collapsed');
            toggle.textContent = '◀';
        } else {
            songListContainer.classList.add('collapsed');
            toggle.textContent = '▶';
        }
    }
}

// Save song
export function saveSong() {
    if (!currentSong) {
        showErrorMessage('Không có bài hát để lưu');
        return;
    }
    
    // Get song details from form
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) currentSong.name = songNameInput.value || 'Untitled';
    if (songBpmInput) currentSong.bpm = parseInt(songBpmInput.value) || 120;
    if (rollLengthInput) currentSong.rollLength = parseInt(rollLengthInput.value) || 32;
    
    currentSong.updatedAt = new Date().toISOString();
    
    // Check save mode
    const saveMode = getCurrentSaveMode();
    
    if (saveMode === 'server') {
        saveToServer();
    } else {
        saveToLocalStorage();
    }
}

// Save to localStorage
function saveToLocalStorage() {
    try {
        const songs = getSongs();
        const existingIndex = songs.findIndex(s => s.id === currentSong.id);
        
        if (existingIndex >= 0) {
            songs[existingIndex] = { ...currentSong };
        } else {
            songs.push({ ...currentSong });
        }
        
        setSongs(songs);
        saveSongsToLocalStorage();
        updateSongList();
        
        showNotification(`Đã lưu "${currentSong.name}" vào Local Storage`, 'success');
        console.log("Song saved to localStorage:", currentSong.name);
    } catch (error) {
        console.error("Error saving to localStorage:", error);
        showErrorMessage('Lỗi khi lưu vào Local Storage');
    }
}

// Save to server (Firebase)
async function saveToServer() {
    try {
        if (!window.firebaseApp || !window.firebaseApp.db) {
            throw new Error("Firebase not available");
        }
        
        const user = getCurrentUser();
        if (!user) {
            throw new Error("User not authenticated");
        }
        
        // Prepare song data for server
        const songData = {
            ...currentSong,
            userId: user.uid,
            userEmail: user.email,
            isFirebaseSong: true
        };
        
        // Update ID format for Firebase
        if (!songData.id.startsWith('firebase_')) {
            songData.id = 'firebase_' + generateId();
        }
        
        // Save to Firestore
        await window.firebaseApp.db.collection('songs').doc(songData.id).set(songData);
        
        // Update local song list
        const songs = getSongs();
        const existingIndex = songs.findIndex(s => s.id === currentSong.id);
        
        if (existingIndex >= 0) {
            songs[existingIndex] = { ...songData };
        } else {
            songs.push({ ...songData });
        }
        
        setSongs(songs);
        currentSong = songData;
        updateSongList();
        
        showNotification(`Đã lưu "${songData.name}" lên Firebase`, 'success');
        console.log("Song saved to Firebase:", songData.name);
    } catch (error) {
        console.error("Error saving to Firebase:", error);
        showErrorMessage('Lỗi khi lưu lên server: ' + error.message);
    }
}

// Get current save mode
function getCurrentSaveMode() {
    // Use forced save mode if set, otherwise check radio buttons
    if (forcedSaveMode) {
        return forcedSaveMode;
    }
    
    const serverRadio = document.querySelector('input[name="save-mode"][value="server"]');
    return serverRadio && serverRadio.checked ? 'server' : 'local';
}

// Update save button state
function updateSaveButtonState() {
    const saveBtn = document.getElementById('save-song-btn');
    if (saveBtn) {
        if (currentSong && currentSong.name) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        } else {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Save';
        }
    }
}

// Clear song inputs
function clearSongInputs() {
    const songNameInput = document.getElementById('song-name');
    const songBpmInput = document.getElementById('song-bpm');
    const rollLengthInput = document.getElementById('roll-length');
    
    if (songNameInput) songNameInput.value = '';
    if (songBpmInput) songBpmInput.value = '120';
    if (rollLengthInput) rollLengthInput.value = '32';
}

// Update song list display (Enhanced version like the original)
export function updateSongList() {
    const songList = document.getElementById('song-list');
    if (!songList) {
        console.error("Không tìm thấy phần tử song-list!");
        return;
    }

    console.log(`[updateSongList] Bắt đầu cập nhật danh sách`);
    
    try {
        // Clear existing content
        while (songList.firstChild) {
            songList.removeChild(songList.firstChild);
        }

        const songs = getSongs();
        
        // Check if songs is valid array
        if (!Array.isArray(songs)) {
            console.error("[updateSongList] songs không phải là mảng:", songs);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-songs-message';
            errorMessage.textContent = 'Lỗi dữ liệu bài hát!';
            errorMessage.style.textAlign = 'center';
            errorMessage.style.padding = '20px';
            errorMessage.style.color = 'rgba(255, 71, 87, 0.9)';
            songList.appendChild(errorMessage);
            return;
        }

        // Sort songs by creation time
        try {
            songs.sort((a, b) => {
                if (a.id && b.id) {
                    const aTime = a.id.split('_')[1];
                    const bTime = b.id.split('_')[1];
                    if (aTime && bTime) {
                        return parseInt(bTime) - parseInt(aTime); // Newest first
                    }
                }
                return 0;
            });
        } catch (sortError) {
            console.error("[updateSongList] Lỗi khi sắp xếp bài hát:", sortError);
        }

        // Show empty message if no songs
        if (songs.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-songs-message';
            emptyMessage.textContent = 'Chưa có bài hát nào';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.color = 'rgba(255, 255, 255, 0.5)';
            songList.appendChild(emptyMessage);
            console.log("[updateSongList] Không có bài hát để hiển thị");
            return;
        }

        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();
        let validSongCount = 0;

        console.log("[updateSongList] Danh sách bài hát:", songs.map(s => s ? s.id : 'null').join(', '));

        songs.forEach((song, index) => {
            try {
                // Validate song
                if (!song || !song.id || !song.name) {
                    console.error(`[updateSongList] Bài hát không hợp lệ tại vị trí ${index}:`, song);
                    return;
                }

                const songItem = createSongItem(song);
                
                // Mark active song
                if (currentSong && song.id === currentSong.id) {
                    songItem.classList.add('active-song');
                }

                fragment.appendChild(songItem);
                validSongCount++;
            } catch (error) {
                console.error(`[updateSongList] Lỗi khi tạo phần tử cho bài hát ${index}:`, error);
            }
        });

        // Add fragment to song list
        songList.appendChild(fragment);
        console.log(`[updateSongList] Đã render ${validSongCount}/${songs.length} bài hát`);

        // Add active song styles if not exist
        if (!document.getElementById('song-list-styles')) {
            const styleEl = document.createElement('style');
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

        // Scroll to active song
        if (currentSong) {
            const activeSong = songList.querySelector('.active-song');
            if (activeSong) {
                setTimeout(() => {
                    activeSong.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }

        // Add event listeners with delay to ensure DOM is rendered
        setTimeout(() => {
            addSongItemEventListeners();
        }, 100);

        console.log("[updateSongList] Cập nhật danh sách bài hát hoàn tất");
    } catch (error) {
        console.error("[updateSongList] Lỗi nghiêm trọng khi cập nhật danh sách bài hát:", error);
        
        showErrorMessage("Lỗi hiển thị danh sách bài hát. Vui lòng nhấn nút Làm mới.");
        
        // Create refresh button
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Làm mới danh sách';
        refreshButton.style.margin = '20px auto';
        refreshButton.style.display = 'block';
        refreshButton.style.padding = '10px 20px';
        refreshButton.style.background = 'rgba(10, 189, 227, 0.5)';
        refreshButton.style.border = 'none';
        refreshButton.style.borderRadius = '5px';
        refreshButton.style.color = 'white';
        refreshButton.style.cursor = 'pointer';
        refreshButton.addEventListener('click', () => updateSongList());
        
        // Clear content and add button
        while (songList.firstChild) {
            songList.removeChild(songList.firstChild);
        }
        songList.appendChild(refreshButton);
    }
}

// Create song item element
function createSongItem(song) {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';
    songItem.dataset.songId = song.id;
    
    const storageInfo = getSongStorageInfo(song);
    
    songItem.innerHTML = `
        <div class="song-header">
            <div class="song-name">${song.name}</div>
            <div class="storage-indicator" title="${storageInfo.tooltip}">
                ${storageInfo.icon}
            </div>
        </div>
        <div class="song-info">
            ${song.notes ? song.notes.length : 0} notes
            <span class="storage-label">${storageInfo.label}</span>
        </div>
        <div class="song-actions">
            ${storageInfo.type !== 'server-readonly' ? '<button class="edit-song-btn" data-song-id="' + song.id + '">Edit</button>' : ''}
            <button class="play-song-btn" data-song-id="${song.id}">Play</button>
            ${storageInfo.type !== 'server-readonly' ? '<button class="delete-song-btn" data-song-id="' + song.id + '">Delete</button>' : ''}
        </div>
    `;
    
    // Add storage type attribute
    songItem.setAttribute('data-storage-type', storageInfo.type);
    
    return songItem;
}

// Add event listeners to song items
function addSongItemEventListeners() {
    console.log("=== ADDING SONG ITEM EVENT LISTENERS ===");
    
    // Edit song buttons
    const editButtons = document.querySelectorAll('.edit-song-btn');
    console.log(`Found ${editButtons.length} edit buttons`);
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const songId = this.dataset.songId;
            editSong(songId);
        });
    });
    
    // Play song buttons
    const playButtons = document.querySelectorAll('.play-song-btn');
    console.log(`Found ${playButtons.length} play buttons`);
    playButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const songId = this.dataset.songId;
            playSong(songId);
        });
    });
    
    // Delete song buttons with enhanced confirmation
    const deleteButtons = document.querySelectorAll('.delete-song-btn');
    console.log(`Found ${deleteButtons.length} delete buttons`);
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const songId = this.dataset.songId;
            const songItem = this.closest('.song-item');
            const songNameElement = songItem?.querySelector('.song-name');
            const songName = songNameElement ? songNameElement.textContent : 'Unnamed Song';
            
            showDeleteConfirmation(songItem, songId, songName);
        });
    });
}

// Play song
function playSong(songId) {
    const songs = getSongs();
    const song = songs.find(s => s.id === songId);
    
    if (!song) {
        showErrorMessage('Không tìm thấy bài hát');
        return;
    }
    
    // Set current game song
    if (window.setCurrentSong) {
        window.setCurrentSong(song);
    }
    
    // Switch to game mode
    if (window.switchMode) {
        window.switchMode('game');
    }
    
    showNotification(`Đã chọn bài: ${song.name}`, 'success');
}

// Delete song
function deleteSong(songId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài hát này?')) {
        return;
    }
    
    const songs = getSongs();
    const songIndex = songs.findIndex(s => s.id === songId);
    
    if (songIndex === -1) {
        showErrorMessage('Không tìm thấy bài hát');
        return;
    }
    
    const song = songs[songIndex];
    
    // Delete from Firebase if needed
    if (song.isFirebaseSong || song.id.startsWith('firebase_')) {
        deleteFromFirebase(songId);
    }
    
    // Remove from local array
    songs.splice(songIndex, 1);
    setSongs(songs);
    saveSongsToLocalStorage();
    updateSongList();
    
    showNotification(`Đã xóa bài hát: ${song.name}`, 'info');
}

// Delete from Firebase
async function deleteFromFirebase(songId) {
    try {
        if (window.firebaseApp && window.firebaseApp.db) {
            await window.firebaseApp.db.collection('songs').doc(songId).delete();
            console.log("Song deleted from Firebase:", songId);
        }
    } catch (error) {
        console.error("Error deleting from Firebase:", error);
    }
}

// Setup Save Mode Event Listeners
function setupSaveModeEvents() {
    if (!saveModeRadios || saveModeRadios.length === 0) {
        console.warn("No save mode radio buttons found");
        return;
    }
    
    // Save mode radio button change
    saveModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            handleSaveModeChange(this.value);
        });
    });
}

// Handle save mode change
function handleSaveModeChange(mode) {
    console.log("Save mode changed to:", mode);
    forcedSaveMode = mode;
    
    if (mode === 'server') {
        // Check if user has permission
        if (window.firebaseApp && window.firebaseApp.canSaveToServer(getCurrentUserRole())) {
            showNotification('Server mode enabled for ' + getCurrentUserRole(), 'success');
        } else {
            showNotification('Server mode requires admin/moderator permissions', 'warning');
            // Switch back to local mode
            const localModeRadio = document.querySelector('input[name="save-mode"][value="local"]');
            if (localModeRadio) {
                localModeRadio.checked = true;
            }
            forcedSaveMode = 'local';
        }
    } else {
        forcedSaveMode = 'local';
    }
    
    updateSaveButtonStateAdvanced();
}

// Update save button state based on mode and user permissions
function updateSaveButtonStateAdvanced() {
    if (!saveSongBtn) return;
    
    if (forcedSaveMode === 'server') {
        // Check if user has permission to save to server
        if (window.firebaseApp && window.firebaseApp.canSaveToServer(getCurrentUserRole())) {
            saveSongBtn.style.opacity = '1';
            saveSongBtn.disabled = false;
            saveSongBtn.title = 'Save to server (Firebase)';
        } else {
            saveSongBtn.style.opacity = '0.5';
            saveSongBtn.disabled = true;
            saveSongBtn.title = 'Server save requires admin/moderator permissions';
        }
    } else {
        // Local storage mode
        saveSongBtn.style.opacity = '1';
        saveSongBtn.disabled = false;
        saveSongBtn.title = 'Save to local storage';
    }
}

// Setup grid and piano (wrapper function)
function setupGridAndPiano() {
    try {
        createGridLines();
        createEditorPianoKeys();
        console.log("✅ Grid and piano setup complete");
    } catch (error) {
        console.error("❌ Grid and piano setup failed:", error);
        throw error;
    }
}

// Setup comprehensive event listeners
function setupSongManagerEvents() {
    console.log("=== SETTING UP SONG MANAGER EVENTS ===");
    
    // Check required elements
    if (!saveSongBtn || !newSongBtn) {
        console.error("Critical buttons not found!");
        return;
    }
    
    // Button event listeners
    newSongBtn.addEventListener('click', function() {
        console.log("New song button clicked!");
        try {
            createNewSong();
        } catch (error) {
            console.error("Error creating new song:", error);
            showNotification('Error creating new song: ' + error.message, 'error');
        }
    });
    
    saveSongBtn.addEventListener('click', function() {
        console.log("Save button clicked!");
        console.log("Current song before save:", currentSong);
        try {
            saveSong();
        } catch (error) {
            console.error("Error saving song:", error);
            showNotification('Error saving song: ' + error.message, 'error');
        }
    });
    
    if (exportSongBtn) {
        exportSongBtn.addEventListener('click', exportSong);
    }
    
    if (importSongBtn) {
        importSongBtn.addEventListener('click', function() {
            console.log("Import song button clicked!");
            try {
                importSong();
            } catch (error) {
                console.error("Error importing song:", error);
                showNotification('Error importing song: ' + error.message, 'error');
            }
        });
    }
    

    
    if (playEditorBtn) {
        playEditorBtn.addEventListener('click', playEditorSong);
    }
    
    if (stopEditorBtn) {
        stopEditorBtn.addEventListener('click', stopEditorSong);
        stopEditorBtn.disabled = true;
    }
    
    // Duration buttons
    if (durationBtns && durationBtns.length > 0) {
        durationBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Update active class
                durationBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update current note duration
                currentNoteDuration = parseFloat(this.getAttribute('data-value'));
                console.log("Selected duration:", currentNoteDuration);
            });
        });
    }
    
    // Grid event listeners
    if (noteGrid) {
        console.log("Setting up note grid click handler");
        noteGrid.addEventListener('click', function(e) {
            console.log("Grid click detected! Event:", e);
            
            // Skip if clicking on existing note
            if (e.target.classList.contains('grid-note') || e.target.classList.contains('resize-handle')) {
                console.log("Clicked on existing note/handle - skipping");
                return;
            }
            
            console.log("Attempting to create note...");
            addNoteAtPosition(e);
        });
        
        // Mouse leave event
        noteGrid.addEventListener('mouseleave', function(e) {
            if (isDragging || isResizing) {
                console.log("Mouse left note grid while dragging/resizing, ending interaction");
                isDragging = false;
                isResizing = false;
                if (currentDraggedNote) {
                    currentDraggedNote.classList.remove('dragging');
                    currentDraggedNote.style.zIndex = '';
                    currentDraggedNote = null;
                }
            }
        });
    }
    
    // Global mouse events
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Keyboard events
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Delete' && selectedNoteElement) {
            console.log("Delete key pressed, removing selected note");
            
            selectedNoteElement.style.opacity = '0.3';
            selectedNoteElement.classList.add('deleting');
            
            const noteToDelete = selectedNoteElement;
            selectedNoteElement = null;
            
            setTimeout(function() {
                deleteNote(noteToDelete);
                showNotification("Note deleted", "info");
            }, 100);
        }
    });
    
    // Setup save mode events
    setupSaveModeEvents();
    
    // Mobile song list toggle - IMPROVED CALL
    setupMobileSongListToggle();
    
    // Listen for orientation/resize changes with improved handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            setupMobileSongListToggle();
            console.log('Song Manager layout updated for resize');
        }, 150);
    });
    
    let orientationTimeout;
    window.addEventListener('orientationchange', () => {
        clearTimeout(orientationTimeout);
        orientationTimeout = setTimeout(() => {
            setupMobileSongListToggle();
            console.log('Song Manager layout updated for orientation change');
        }, 400);
    });
    
    console.log("Song manager events setup complete with mobile support");
}

// Show enhanced delete confirmation dialog
function showDeleteConfirmation(songItem, songId, songName) {
    // Create confirmation overlay
    const confirmDelete = document.createElement('div');
    confirmDelete.className = 'confirm-delete';
    confirmDelete.innerHTML = `
        <div class="confirm-message">Xóa bài hát "${songName}"?</div>
        <div class="confirm-buttons">
            <button class="confirm-yes">Xóa</button>
            <button class="confirm-no">Hủy</button>
        </div>
    `;
    
    // Style the confirmation overlay
    confirmDelete.style.position = 'absolute';
    confirmDelete.style.top = '0';
    confirmDelete.style.left = '0';
    confirmDelete.style.width = '100%';
    confirmDelete.style.height = '100%';
    confirmDelete.style.display = 'flex';
    confirmDelete.style.flexDirection = 'column';
    confirmDelete.style.justifyContent = 'center';
    confirmDelete.style.alignItems = 'center';
    confirmDelete.style.background = 'rgba(255, 71, 87, 0.9)';
    confirmDelete.style.color = 'white';
    confirmDelete.style.zIndex = '10';
    confirmDelete.style.borderRadius = 'inherit';
    
    // Style buttons
    const yesBtn = confirmDelete.querySelector('.confirm-yes');
    yesBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    yesBtn.style.border = 'none';
    yesBtn.style.color = 'white';
    yesBtn.style.padding = '5px 15px';
    yesBtn.style.margin = '0 5px';
    yesBtn.style.borderRadius = '3px';
    yesBtn.style.cursor = 'pointer';
    
    const noBtn = confirmDelete.querySelector('.confirm-no');
    noBtn.style.background = 'rgba(255, 255, 255, 0.5)';
    noBtn.style.border = 'none';
    noBtn.style.color = 'black';
    noBtn.style.padding = '5px 15px';
    noBtn.style.margin = '0 5px';
    noBtn.style.borderRadius = '3px';
    noBtn.style.cursor = 'pointer';
    
    // Add event listeners
    yesBtn.addEventListener('click', function() {
        // Add fade-out effect
        songItem.style.opacity = '0.5';
        songItem.style.transition = 'opacity 0.3s';
        
        // Delete after animation
        setTimeout(() => {
            deleteSong(songId);
        }, 300);
    });
    
    noBtn.addEventListener('click', function() {
        songItem.removeChild(confirmDelete);
    });
    
    // Add to song item
    songItem.style.position = 'relative';
    songItem.appendChild(confirmDelete);
}

// Setup mobile song list toggle - IMPROVED VERSION
function setupSongListToggle() {
    const songListContainer = document.querySelector('.song-list-container');
    const isMobileLandscape = window.innerWidth <= 900 && window.innerHeight < window.innerWidth;
    
    if (!songListContainer) return;
    
    // Remove existing toggle if any
    const existingToggle = songListContainer.querySelector('.song-list-toggle');
    if (existingToggle) {
        existingToggle.remove();
    }
    
    if (isMobileLandscape) {
        // Create new toggle button
        const toggle = document.createElement('div');
        toggle.className = 'song-list-toggle';
        toggle.innerHTML = '◀';
        toggle.title = 'Toggle song list';
        
        // Add click handler
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const isCollapsed = songListContainer.classList.contains('collapsed');
            
            if (isCollapsed) {
                songListContainer.classList.remove('collapsed');
                toggle.innerHTML = '◀';
                console.log('Song list expanded');
            } else {
                songListContainer.classList.add('collapsed');
                toggle.innerHTML = '▶';
                console.log('Song list collapsed');
            }
        });
        
        // Add touch support
        toggle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        
        songListContainer.appendChild(toggle);
        
        // Auto-collapse on very small screens
        if (window.innerHeight < 500 || window.innerWidth < 700) {
            songListContainer.classList.add('collapsed');
            toggle.innerHTML = '▶';
            console.log('Auto-collapsed song list for small screen');
        }
        
        console.log('Mobile song list toggle created for landscape mode');
    } else {
        // Ensure expanded on desktop
        songListContainer.classList.remove('collapsed');
        console.log('Song list toggle removed for desktop mode');
    }
}



// Enhanced mobile grid setup
function setupMobileGridAndPiano() {
    const isMobile = window.innerWidth <= 900;
    
    if (isMobile) {
        console.log("Setting up mobile grid and piano");
        
        // Recreate grid for mobile
        createGridLines();
        createEditorPianoKeys();
        
        // Add mobile-specific event listeners
        setupMobileNoteGridEvents();
    }
}

// Setup mobile-specific note grid events
function setupMobileNoteGridEvents() {
    const noteGrid = document.querySelector('.note-grid');
    if (!noteGrid) return;
    
    // Enhanced touch handling for mobile
    noteGrid.addEventListener('touchstart', handleMobileTouchStart, { passive: false });
    noteGrid.addEventListener('touchmove', handleMobileTouchMove, { passive: false });
    noteGrid.addEventListener('touchend', handleMobileTouchEnd, { passive: false });
    
    console.log("Mobile note grid events setup");
}

// Handle mobile touch start
function handleMobileTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = e.target.getBoundingClientRect();
        
        // Convert touch to mouse-like event
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: e.target,
            preventDefault: () => {},
            isTouchEvent: true
        };
        
        // Handle as regular click
        if (e.target.classList.contains('grid-note')) {
            // Handle note interaction
            handleNoteMouseDown(mouseEvent);
        } else {
            // Handle grid click (add note)
            addNoteAtPosition(mouseEvent);
        }
    }
}

// Handle mobile touch move
function handleMobileTouchMove(e) {
    e.preventDefault();
    
    if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {}
        };
        
        handleMouseMove(mouseEvent);
    }
}

// Handle mobile touch end
function handleMobileTouchEnd(e) {
    e.preventDefault();
    
    if (isDragging || isResizing) {
        const mouseEvent = {
            preventDefault: () => {}
        };
        
        handleMouseUp(mouseEvent);
    }
}

// Handle note mouse down (for mobile compatibility)
function handleNoteMouseDown(e) {
    if (e.target.classList.contains('grid-note')) {
        selectedNoteElement = e.target;
        
        // Check if clicking on resize handle
        const rect = e.target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const noteWidth = rect.width;
        
        if (clickX > noteWidth - 10) {
            // Resize mode
            isResizing = true;
            startX = e.clientX;
            startWidth = parseFloat(e.target.style.width);
            e.target.style.cursor = 'e-resize';
        } else {
            // Drag mode
            isDragging = true;
            startX = e.clientX;
            startLeft = parseFloat(e.target.style.left);
            e.target.style.cursor = 'move';
        }
        
        draggedElement = e.target;
        e.preventDefault();
    }
}

// Enhanced window resize handler for mobile
function handleMobileResize() {
    const isMobile = window.innerWidth <= 900;
    
    if (isMobile && document.body.classList.contains('song-manager-mode')) {
        console.log("Mobile resize detected, updating song manager layout");
        
        // Re-setup mobile elements
        setupSongListToggle();
        setupMobileGridAndPiano();
        
        // Adjust layout if needed
        setTimeout(() => {
            const songManager = document.getElementById('song-manager');
            if (songManager && songManager.style.display !== 'none') {
                loadSongIntoEditor(currentSong || {
                    id: 'temp',
                    name: 'New Song',
                    bpm: 120,
                    notes: [],
                    rollLength: 32
                });
            }
        }, 100);
    }
}

// Add mobile resize listener
window.addEventListener('resize', debounce(handleMobileResize, 250));

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Setup auto-save functionality
function setupAutoSave() {
    const autoSave = function() {
        if (currentSong && currentSong.notes && currentSong.notes.length > 0) {
            try {
                // Save to local storage only for auto-save
                saveToLocalStorage();
                
                // Show auto-save notification
                const autoSaveNotif = document.createElement('div');
                autoSaveNotif.textContent = "Đã tự động lưu";
                autoSaveNotif.style.position = 'fixed';
                autoSaveNotif.style.bottom = '10px';
                autoSaveNotif.style.right = '10px';
                autoSaveNotif.style.background = 'rgba(46, 213, 115, 0.7)';
                autoSaveNotif.style.color = 'white';
                autoSaveNotif.style.padding = '5px 10px';
                autoSaveNotif.style.borderRadius = '3px';
                autoSaveNotif.style.fontSize = '12px';
                autoSaveNotif.style.opacity = '0.9';
                autoSaveNotif.style.zIndex = '1000';
                
                document.body.appendChild(autoSaveNotif);
                
                // Fade out after 2 seconds
                setTimeout(() => {
                    autoSaveNotif.style.opacity = '0';
                    autoSaveNotif.style.transition = 'opacity 0.5s';
                    
                    setTimeout(() => {
                        if (autoSaveNotif.parentNode) {
                            document.body.removeChild(autoSaveNotif);
                        }
                    }, 500);
                }, 2000);
                
                console.log("Auto-saved current song");
            } catch (error) {
                console.error("Auto-save failed:", error);
            }
        }
        
        // Schedule next auto-save
        setTimeout(autoSave, 30000); // Auto-save every 30 seconds
    };
    
    // Start auto-save timer
    setTimeout(autoSave, 30000); // First auto-save after 30 seconds
    console.log("Auto-save enabled (every 30 seconds)");
}

// Initialize song manager (Enhanced version)
export function initSongManager() {
    console.log("🎵 Initializing Song Manager...");
    
    try {
        // Cache DOM elements first
        cacheDOMElements();
        
        // Setup basic events
        setupSongManagerEvents();
        
        // Setup grid and piano
        setupGridAndPiano();
        
        // Setup save mode events
        setupSaveModeEvents();
        
        // Setup mobile-specific features
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            console.log("📱 Setting up mobile Song Manager features");
            setupSongListToggle();
            setupMobileGridAndPiano();
        }
        
        // Update song list
        updateSongList();
        
        // Setup auto-save
        setupAutoSave();
        
        console.log("✅ Song Manager initialized successfully");
        
    } catch (error) {
        console.error("❌ Error initializing Song Manager:", error);
        showErrorMessage("Không thể khởi tạo Song Manager: " + error.message);
    }
}

// Export song
function exportSong() {
    if (!currentSong || !currentSong.name) {
        showErrorMessage('Không có bài hát để xuất');
        return;
    }
    
    const dataStr = JSON.stringify(currentSong, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${currentSong.name}.json`;
    link.click();
    
    showNotification(`Đã xuất bài hát: ${currentSong.name}`, 'success');
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
        reader.onload = function(e) {
            try {
                const songData = JSON.parse(e.target.result);
                
                // Validate song data
                if (!songData.name || !songData.notes) {
                    throw new Error('Invalid song format');
                }
                
                // Generate new ID and set as current song
                songData.id = 'temp_' + generateId();
                songData.importedAt = new Date().toISOString();
                
                currentSong = songData;
                loadSongIntoEditor(currentSong);
                
                showNotification(`Đã nhập bài hát: ${songData.name}`, 'success');
            } catch (error) {
                console.error('Error importing song:', error);
                showErrorMessage('Lỗi khi nhập bài hát. Vui lòng kiểm tra định dạng file.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Functions removed - back to original Song Manager

 