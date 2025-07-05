'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Plus, Download, Upload, Save, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase-config';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { useToast } from './Toast';
import { GAME_CONFIG, getKeyLabel, isWhiteKey, getFrequency } from '@/config/piano-config';

interface Note {
  id: string;
  key: number;
  startTime: number;
  duration: number;
  velocity: number;
}

interface Song {
  id: string;
  name: string;
  notes: Note[];
  bpm: number;
  duration: number;
  lastModified: number;
}

interface SongManagerProps {
  isActive: boolean;
}

export default function SongManager({ isActive }: SongManagerProps) {
  const { currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedTool, setSelectedTool] = useState<'select' | 'pencil' | 'eraser'>('pencil');
  const [showSongList, setShowSongList] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<Song[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // copiedNotes state removed for simplicity
  const [saveMode, setSaveMode] = useState<'firebase' | 'local'>('local');
  const [selectedDuration, setSelectedDuration] = useState(1); // Default quarter note
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const playedNotesRef = useRef<Set<string>>(new Set()); // Track played notes
  const isPlayingRef = useRef<boolean>(false); // Track playing state reliably

  // Piano roll constants
  const PIANO_KEYS = 15;
  const KEY_HEIGHT = 30;
  const GRID_WIDTH = 50;
  const BEAT_WIDTH = GRID_WIDTH * 4;

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sync isPlayingRef with isPlaying state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Use shared piano configuration

  // Play a single note
  const playNote = (keyNumber: number, duration: number = 0.5, velocity: number = 100) => {
    if (!audioContextRef.current) {
      console.warn('No AudioContext available');
      return;
    }

    try {
      const audioContext = audioContextRef.current;
      
      // Check if AudioContext is in correct state
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequency = getFrequency(keyNumber);
      if (!frequency || frequency <= 0) {
        console.warn(`Invalid frequency for key ${keyNumber}: ${frequency}`);
        return;
      }

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const volume = Math.max(0, Math.min(1, (velocity / 127) * masterVolume * 0.3)); // Scale with master volume
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      // Prevent clicking sounds at the end
      const fadeOutStart = audioContext.currentTime + Math.max(0, duration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, fadeOutStart + 0.05);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      // Clean up after playback
      oscillator.addEventListener('ended', () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected, ignore
        }
      });

      console.log(`Playing note: key=${keyNumber}, freq=${frequency.toFixed(1)}Hz, duration=${duration.toFixed(2)}s, velocity=${velocity}`);
    } catch (error) {
      console.error('Error in playNote:', error);
    }
  };

  // Play/pause functionality
  const togglePlayback = async () => {
    if (!selectedSong) return;

    if (isPlaying) {
      // Pause
      console.log('⏸️ Pausing playback');
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      // Play
      console.log('Starting playback, song:', selectedSong.name, 'notes:', selectedSong.notes.length);
      
      try {
        // Ensure AudioContext is created and resumed
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('AudioContext resumed');
        }

        console.log(`🚀 About to start playback...`);
        setIsPlaying(true);
        isPlayingRef.current = true;
        
        const bpm = selectedSong.bpm || 120;
        const beatDuration = 60 / bpm;
        startTimeRef.current = Date.now() - (currentTime * beatDuration * 1000);
        
        console.log(`🚀 Playback details: BPM=${bpm}, beatDuration=${beatDuration.toFixed(3)}s, currentTime=${currentTime.toFixed(2)}`);
        console.log(`📋 Song has ${selectedSong.notes.length} notes:`, selectedSong.notes.map(n => `key${n.key}@${n.startTime}`));
        
        // Reset played notes tracking
        playedNotesRef.current.clear();
        
        playSequence();
              } catch (error) {
          console.error('Error starting playback:', error);
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
    }
  };

  // Play the song sequence
  const playSequence = () => {
    if (!selectedSong || !isPlayingRef.current) {
      console.log('playSequence stopped: selectedSong=', !!selectedSong, 'isPlayingRef=', isPlayingRef.current, 'isPlaying state=', isPlaying);
      return;
    }

    try {
      // Ensure AudioContext is resumed (required by browsers)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const now = Date.now();
      const elapsedTime = (now - startTimeRef.current) / 1000;
      const bpm = selectedSong.bpm || 120;
      const beatDuration = 60 / bpm;
      const currentBeat = elapsedTime / beatDuration;

      setCurrentTime(currentBeat);

      // Debug log every few beats to avoid spam
      if (Math.floor(currentBeat * 4) % 4 === 0) {
        console.log(`🎵 Playback: beat=${currentBeat.toFixed(2)}, duration=${selectedSong.duration}, notes=${selectedSong.notes.length}, elapsed=${elapsedTime.toFixed(2)}s`);
        
        // Log first few notes for debugging
        if (selectedSong.notes.length > 0) {
          const upcomingNotes = selectedSong.notes.filter(n => n.startTime >= currentBeat && n.startTime <= currentBeat + 2);
          if (upcomingNotes.length > 0) {
            console.log(`📋 Upcoming notes:`, upcomingNotes.map(n => `key${n.key}@${n.startTime}`));
          }
        }
      }

      // Track which notes we've already played to avoid repeats
      const notesToPlay = selectedSong.notes.filter(note => {
        const noteStartTime = note.startTime;
        const timeSinceNoteStart = currentBeat - noteStartTime;
        const noteKey = `${note.id}-${note.startTime}`;
        
        // Note should start now (within tolerance and hasn't been played yet)
        const shouldPlay = timeSinceNoteStart >= 0 && timeSinceNoteStart < 0.15 && !playedNotesRef.current.has(noteKey);
        
        if (shouldPlay) {
          playedNotesRef.current.add(noteKey); // Mark as played
        }
        
        return shouldPlay;
      });

      // Play notes that should start now
      notesToPlay.forEach(note => {
        const noteName = getKeyLabel ? getKeyLabel(note.key) : `key${note.key}`;
        console.log(`🎹 Playing note: ${noteName} (key=${note.key}), beat=${note.startTime}, duration=${note.duration}`);
        try {
          const noteDuration = Math.max(0.1, Math.min(note.duration * beatDuration, 4));
          playNote(note.key, noteDuration, note.velocity);
        } catch (error) {
          console.error('Error playing note:', error);
          playNote(note.key, 0.5, note.velocity); // Fallback
        }
      });

      // Stop if we've reached the end (add small buffer)
      if (currentBeat >= selectedSong.duration + 0.5) {
        console.log('🏁 Song ended, stopping playback');
        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentTime(0);
        playedNotesRef.current.clear(); // Reset played notes tracking
        return;
      }

      animationRef.current = requestAnimationFrame(playSequence);
    } catch (error) {
      console.error('❌ Error in playSequence:', error);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  // Stop playback
  const stopPlayback = () => {
    console.log('⏹️ Stopping playback');
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentTime(0);
    playedNotesRef.current.clear(); // Reset played notes tracking
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const loadSongsFromFirebase = async () => {
    if (!currentUser) return;

    try {
      const songsQuery = query(
        collection(db, 'songs'),
        where('userId', '==', currentUser.uid),
        orderBy('lastModified', 'desc')
      );

      const unsubscribe = onSnapshot(songsQuery, (snapshot) => {
        const songsData: Song[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          songsData.push({
            id: doc.id,
            name: data.name,
            notes: data.notes || [],
            bpm: data.bpm || 120,
            duration: data.duration || 16,
            lastModified: data.lastModified?.toDate?.()?.getTime() || data.lastModified
          });
        });

        setSongs(songsData);

        // Create demo song if no songs exist
        if (songsData.length === 0) {
          createDemoSong();
        }
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading songs:', error);
      showError('Failed to Load Songs', 'Unable to load songs from server');
    }
  };

  useEffect(() => {
    // Load songs based on save mode
    if (saveMode === 'firebase' && currentUser) {
      loadSongsFromFirebase();
    } else {
      loadSongsFromLocal();
    }
  }, [currentUser, saveMode]);

  const createNewSong = () => {
    const newSong: Song = {
      id: `song-${Date.now()}`,
      name: `New Song ${songs.length + 1}`,
      notes: [],
      bpm: 120,
      duration: 16,
      lastModified: Date.now()
    };
    setSelectedSong(newSong);
    setShowSongList(false);

    // Auto-save new song
    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(newSong);
    } else if (saveMode === 'local') {
      saveSongToLocal(newSong);
    }
  };

  const addNote = (key: number, startTime: number) => {
    if (!selectedSong || selectedTool !== 'pencil') return;

    addToHistory(selectedSong);

    const newNote: Note = {
      id: `note-${Date.now()}`,
      key,
      startTime,
      duration: selectedDuration,
      velocity: 100
    };

    // Play the note sound immediately when adding (duration based on selected note duration and BPM)
    try {
      const bpm = selectedSong.bpm || 120; // Fallback to 120 BPM
      const noteDuration = selectedDuration || 1; // Fallback to 1 beat
      const beatDuration = 60 / bpm; // Duration of one beat in seconds
      const previewDuration = Math.max(0.1, Math.min(noteDuration * beatDuration, 4)); // Clamp between 0.1s and 4s
      console.log(`Playing note ${key} for ${previewDuration}s (${noteDuration} beats at ${bpm} BPM)`);
      playNote(key, previewDuration, 100);
    } catch (error) {
      console.error('Error calculating preview duration:', error);
      // Fallback to simple preview
      playNote(key, 0.5, 100);
    }

    // Auto-extend song duration if note goes beyond current duration
    const noteEndTime = startTime + selectedDuration;
    const newDuration = noteEndTime > selectedSong.duration
      ? Math.ceil(noteEndTime / 4) * 4 // Round up to nearest 4 beats
      : selectedSong.duration;

    const updatedSong = {
      ...selectedSong,
      notes: [...selectedSong.notes, newNote],
      duration: newDuration,
      lastModified: Date.now()
    };
    setSelectedSong(updatedSong);

    // Auto-save when adding notes
    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(updatedSong);
    } else if (saveMode === 'local') {
      saveSongToLocal(updatedSong);
    }
  };

  const removeNote = (noteId: string) => {
    console.log(`🔄 removeNote called with noteId: ${noteId}`);
    
    if (!selectedSong) {
      console.log(`❌ No selectedSong, cannot remove note`);
      return;
    }

    try {
      console.log(`📋 Current song has ${selectedSong.notes.length} notes before removal`);
      addToHistory(selectedSong);

      const updatedSong = {
        ...selectedSong,
        notes: selectedSong.notes.filter(note => note.id !== noteId),
        lastModified: Date.now()
      };
      
      console.log(`📋 Updated song will have ${updatedSong.notes.length} notes after removal`);
      setSelectedSong(updatedSong);

      // Clear selection if removed note was selected
      if (selectedNoteIds.has(noteId)) {
        const newSelection = new Set(selectedNoteIds);
        newSelection.delete(noteId);
        setSelectedNoteIds(newSelection);
        console.log(`🧹 Removed note ${noteId} from selection`);
      }

      // Auto-save when removing notes
      if (saveMode === 'firebase' && currentUser) {
        console.log(`☁️ Auto-saving to Firebase...`);
        saveSongToFirebase(updatedSong);
      } else if (saveMode === 'local') {
        console.log(`💾 Auto-saving to Local Storage...`);
        saveSongToLocal(updatedSong);
      }
      
      console.log(`✅ Note ${noteId} removed successfully`);
    } catch (error) {
      console.error(`❌ Error removing note ${noteId}:`, error);
    }
  };

  const saveSong = () => {
    if (!selectedSong) return;

    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(selectedSong);
    } else {
      saveSongToLocal(selectedSong);
    }
  };

  // Smart delete function
  const deleteSong = (songId: string) => {
    if (saveMode === 'firebase' && currentUser) {
      deleteSongFromFirebase(songId);
    } else {
      deleteSongFromLocal(songId);
    }
  };

  // Add to history for undo/redo
  const addToHistory = (song: Song) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...song });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Keep history size manageable
    if (newHistory.length > 50) {
      setHistory(newHistory.slice(-50));
      setHistoryIndex(49);
    }
  };

  // Undo/Redo functions
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setSelectedSong(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setSelectedSong(history[historyIndex + 1]);
    }
  };

  // Copy function removed for simplicity

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          // Copy shortcut removed for simplicity
          case 's':
            e.preventDefault();
            saveSong();
            break;
          case 'a':
            e.preventDefault();
            // Select all notes
            if (selectedSong) {
              setSelectedNoteIds(new Set(selectedSong.notes.map(n => n.id)));
            }
            break;
          case 'Delete':
          case 'Backspace':
            if (selectedNoteIds.size > 0) {
              e.preventDefault();
              deleteSelectedNotes();
            }
            break;
        }
      } else if (e.key === 'Escape') {
        // Clear selection
        setSelectedNoteIds(new Set());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, historyIndex, history.length]);

  const updateSongSettings = (updates: Partial<Song>) => {
    if (!selectedSong) return;

    addToHistory(selectedSong);

    const updatedSong = {
      ...selectedSong,
      ...updates,
      lastModified: Date.now()
    };
    setSelectedSong(updatedSong);

    // Auto-save when updating settings
    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(updatedSong);
    } else if (saveMode === 'local') {
      saveSongToLocal(updatedSong);
    }
  };

  // Save song to Firebase
  const saveSongToFirebase = async (song: Song) => {
    if (!currentUser) {
      showError('Not Logged In', 'Please log in to save songs');
      return;
    }

    try {
      setIsSaving(true);
      const songDocRef = doc(db, 'songs', song.id);
      await setDoc(songDocRef, {
        name: song.name,
        notes: song.notes,
        bpm: song.bpm,
        duration: song.duration,
        lastModified: new Date(),
        userId: currentUser.uid,
        userEmail: currentUser.email
      });

      success('Song Saved', `"${song.name}" has been saved successfully`);
    } catch (error: any) {
      console.error('Error saving song:', error);
      showError('Save Failed', error.message || 'Failed to save song');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete song from Firebase
  const deleteSongFromFirebase = async (songId: string) => {
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, 'songs', songId));
      success('Song Deleted', 'Song has been deleted successfully');

      // Clear selection if deleted song was selected
      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
    } catch (error: any) {
      console.error('Error deleting song:', error);
      showError('Delete Failed', error.message || 'Failed to delete song');
    }
  };

  // Create demo song
  const createDemoSong = async () => {
    const demoSong: Song = {
      id: `demo-${Date.now()}`,
      name: 'Demo Song',
      notes: [
        // Simple melody using white keys (C major scale)
        { id: '1', key: 1, startTime: 0, duration: 1, velocity: 100 },    // C5 (1)
        { id: '2', key: 2, startTime: 1, duration: 1, velocity: 100 },    // D5 (2)
        { id: '3', key: 3, startTime: 2, duration: 1, velocity: 100 },    // E5 (3)
        { id: '4', key: 4, startTime: 3, duration: 1, velocity: 100 },    // F5 (4)
        { id: '5', key: 5, startTime: 4, duration: 1, velocity: 100 },    // G5 (5)
        { id: '6', key: 6, startTime: 5, duration: 1, velocity: 100 },    // A5 (6)
        { id: '7', key: 7, startTime: 6, duration: 1, velocity: 100 },    // B5 (7)
        { id: '8', key: 8, startTime: 7, duration: 2, velocity: 100 },    // C6 (8)
        
        // Add some black keys for harmony
        { id: '9', key: 9, startTime: 1.5, duration: 0.5, velocity: 80 },  // C#5 (2#)
        { id: '10', key: 10, startTime: 2.5, duration: 0.5, velocity: 80 }, // D#5 (3#)
        { id: '11', key: 11, startTime: 4.5, duration: 0.5, velocity: 80 }, // F#5 (4#)
        { id: '12', key: 12, startTime: 5.5, duration: 0.5, velocity: 80 }, // G#5 (5#)
        { id: '13', key: 13, startTime: 6.5, duration: 0.5, velocity: 80 }, // A#5 (6#)
      ],
      bpm: 120,
      duration: 12,
      lastModified: Date.now()
    };

    if (saveMode === 'firebase' && currentUser) {
      await saveSongToFirebase(demoSong);
    } else {
      await saveSongToLocal(demoSong);
    }
  };

  const selectNote = (noteId: string, multiSelect: boolean = false) => {
    console.log(`🎯 selectNote called: noteId=${noteId}, multiSelect=${multiSelect}, current selection size=${selectedNoteIds.size}`);
    
    if (multiSelect) {
      const newSelection = new Set(selectedNoteIds);
      if (newSelection.has(noteId)) {
        newSelection.delete(noteId);
        console.log(`➖ Removed from selection: ${noteId}`);
      } else {
        newSelection.add(noteId);
        console.log(`➕ Added to selection: ${noteId}`);
      }
      setSelectedNoteIds(newSelection);
    } else {
      if (selectedNoteIds.has(noteId) && selectedNoteIds.size === 1) {
        setSelectedNoteIds(new Set());
        console.log(`🧹 Cleared selection (was only item)`);
      } else {
        setSelectedNoteIds(new Set([noteId]));
        console.log(`🎯 Set single selection: ${noteId}`);
      }
    }
  };

  const deleteSelectedNotes = () => {
    if (!selectedSong || selectedNoteIds.size === 0) return;

    addToHistory(selectedSong);

    const updatedSong = {
      ...selectedSong,
      notes: selectedSong.notes.filter(note => !selectedNoteIds.has(note.id)),
      lastModified: Date.now()
    };
    setSelectedSong(updatedSong);
    setSelectedNoteIds(new Set());

    // Auto-save when removing notes
    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(updatedSong);
    } else if (saveMode === 'local') {
      saveSongToLocal(updatedSong);
    }
  };

  const moveSelectedNotes = (deltaTime: number, deltaKey: number = 0) => {
    if (!selectedSong || selectedNoteIds.size === 0) return;

    addToHistory(selectedSong);

    const updatedNotes = selectedSong.notes.map(note => {
      if (selectedNoteIds.has(note.id)) {
        const newStartTime = Math.max(0, note.startTime + deltaTime);
        const newKey = Math.max(1, Math.min(15, note.key + deltaKey));
        return { ...note, startTime: newStartTime, key: newKey };
      }
      return note;
    });

    // Auto-extend song duration if moved notes go beyond current duration
    const maxEndTime = Math.max(...updatedNotes.map(note => note.startTime + note.duration));
    const newDuration = maxEndTime > selectedSong.duration
      ? Math.ceil(maxEndTime / 4) * 4 // Round up to nearest 4 beats
      : selectedSong.duration;

    const updatedSong = {
      ...selectedSong,
      notes: updatedNotes,
      duration: newDuration,
      lastModified: Date.now()
    };
    setSelectedSong(updatedSong);

    // Auto-save when moving notes
    if (saveMode === 'firebase' && currentUser) {
      saveSongToFirebase(updatedSong);
    } else if (saveMode === 'local') {
      saveSongToLocal(updatedSong);
    }
  };

  // updateNoteVelocity function removed for simplicity

  const getSelectedNote = () => {
    if (!selectedSong || selectedNoteIds.size !== 1) return null;
    const noteId = Array.from(selectedNoteIds)[0];
    return selectedSong.notes.find(note => note.id === noteId) || null;
  };

  const getSelectedNotes = () => {
    if (!selectedSong || selectedNoteIds.size === 0) return [];
    return selectedSong.notes.filter(note => selectedNoteIds.has(note.id));
  };

  // Note durations (in beats)
  const noteDurations = [
    { value: 4, label: '○', name: 'Whole Note (4 beats)' },
    { value: 2, label: '♩', name: 'Half Note (2 beats)' },
    { value: 1, label: '♪', name: 'Quarter Note (1 beat)' },
    { value: 0.5, label: '♫', name: 'Eighth Note (1/2 beat)' },
    { value: 0.25, label: '♬', name: 'Sixteenth Note (1/4 beat)' }
  ];

  // Save to localStorage
  const saveSongToLocal = (song: Song) => {
    try {
      const savedSongs = localStorage.getItem('pink-poong-songs') || '[]';
      const songs: Song[] = JSON.parse(savedSongs);

      const existingIndex = songs.findIndex(s => s.id === song.id);
      if (existingIndex >= 0) {
        songs[existingIndex] = song;
      } else {
        songs.push(song);
      }

      localStorage.setItem('pink-poong-songs', JSON.stringify(songs));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('songsUpdated', { detail: songs }));
      
      success('Song Saved Locally', `"${song.name}" saved to your device`);
    } catch (error: any) {
      console.error('Error saving to localStorage:', error);
      showError('Local Save Failed', error.message);
    }
  };

  // Load from localStorage
  const loadSongsFromLocal = () => {
    try {
      const savedSongs = localStorage.getItem('pink-poong-songs') || '[]';
      const localSongs: Song[] = JSON.parse(savedSongs);
      setSongs(localSongs);

      if (localSongs.length === 0) {
        createDemoSong();
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      showError('Local Load Failed', 'Failed to load local songs');
    }
  };

  // Delete from localStorage
  const deleteSongFromLocal = (songId: string) => {
    try {
      const savedSongs = localStorage.getItem('pink-poong-songs') || '[]';
      const songs: Song[] = JSON.parse(savedSongs);
      const filteredSongs = songs.filter(s => s.id !== songId);

      localStorage.setItem('pink-poong-songs', JSON.stringify(filteredSongs));
      setSongs(filteredSongs);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('songsUpdated', { detail: filteredSongs }));
      
      success('Song Deleted', 'Song removed from local storage');

      if (selectedSong?.id === songId) {
        setSelectedSong(null);
      }
    } catch (error: any) {
      console.error('Error deleting from localStorage:', error);
      showError('Delete Failed', error.message);
    }
  };

  // Create CSS for scrollbar and mobile responsiveness - optimized for landscape
  const scrollbarStyles = `
    .piano-roll-container {
      overflow: auto !important;
      scrollbar-width: thin;
      scrollbar-color: #9333ea #374151;
    }
    
    .piano-roll-container::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    
    .piano-roll-container::-webkit-scrollbar-track {
      background: #374151;
      border-radius: 6px;
    }
    
    .piano-roll-container::-webkit-scrollbar-thumb {
      background: #9333ea;
      border-radius: 6px;
    }
    
    .piano-roll-container::-webkit-scrollbar-thumb:hover {
      background: #a855f7;
    }
    
    .piano-roll-container::-webkit-scrollbar-corner {
      background: #374151;
    }
    
    /* Mobile landscape optimization */
    @media (max-width: 768px) {
      .piano-roll-container::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
    }
    
    /* Landscape mobile - reduce margins and padding */
    @media (max-width: 768px) and (orientation: landscape) {
      .mobile-landscape-compact {
        padding: 0.25rem !important;
      }
      
      .mobile-landscape-text {
        font-size: 0.75rem !important;
      }
      
      .mobile-landscape-button {
        padding: 0.25rem 0.5rem !important;
        font-size: 0.75rem !important;
      }
      
      .mobile-landscape-header {
        padding: 0.5rem !important;
      }
    }
  `;

  return (
    <>
      {/* Custom scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />

      <div className="flex h-full">
        {/* Song List Panel */}
        <AnimatePresence>
          {showSongList && (
            <motion.div
              className="w-80 bg-black/40 backdrop-blur-sm border-r border-white/20 p-4"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-semibold">Song Library</h3>
                <button
                  onClick={() => setShowSongList(false)}
                  className="text-white/70 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Save Mode Toggle */}
              <div className="mb-4 p-3 bg-black/40 rounded-lg border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-sm">Save Mode:</span>
                  <div className="flex bg-black/60 rounded-lg p-1">
                    <button
                      onClick={() => setSaveMode('local')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all duration-200 ${saveMode === 'local'
                          ? 'bg-purple-600 text-white'
                          : 'text-white/70 hover:text-white'
                        }`}
                    >
                      💾 Local
                    </button>
                    <button
                      onClick={() => setSaveMode('firebase')}
                      disabled={!currentUser}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all duration-200 ${saveMode === 'firebase'
                          ? 'bg-purple-600 text-white'
                          : !currentUser
                            ? 'text-gray-500 cursor-not-allowed'
                            : 'text-white/70 hover:text-white'
                        }`}
                    >
                      ☁️ Cloud
                    </button>
                  </div>
                </div>
                <p className="text-white/50 text-xs">
                  {saveMode === 'local'
                    ? 'Songs saved to your device only'
                    : currentUser
                      ? 'Songs synced across all devices'
                      : 'Login required for cloud saves'
                  }
                </p>
              </div>

              {/* Controls */}
              <div className="space-y-2 mb-4">
                <button
                  onClick={createNewSong}
                  className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-blue-600 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus size={16} />
                  <span>New Song</span>
                </button>
              </div>

              {/* Song List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {songs.map(song => (
                  <motion.div
                    key={song.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group relative ${selectedSong?.id === song.id
                        ? 'bg-purple-600/30 border border-purple-400'
                        : 'bg-white/10 hover:bg-white/20'
                      }`}
                    onClick={() => {
                      setSelectedSong(song);
                      setShowSongList(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold">{song.name}</h4>
                        <p className="text-white/70 text-sm">
                          {song.notes.length} notes • {song.bpm} BPM
                        </p>
                        <p className="text-white/50 text-xs">
                          Modified: {new Date(song.lastModified).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {currentUser && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSong(song.id);
                            }}
                            className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/20 transition-colors"
                            title="Delete Song"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {songs.length === 0 && (
                  <div className="text-center text-white/50 py-8">
                    <p>No songs yet</p>
                    <p className="text-xs mt-1">Create your first song to get started</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Piano Roll Editor */}
        <div className="flex-1 flex flex-col">
          {/* Header - compact for landscape mobile */}
          <div className="bg-black/40 backdrop-blur-sm border-b border-white/20 p-2 sm:p-4 mobile-landscape-header">
            <div className="flex flex-col space-y-1 sm:space-y-2">
              {/* Top row - Title, Tools, and Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {!showSongList && (
                    <button
                      onClick={() => setShowSongList(true)}
                      className="bg-white/10 text-white px-2 py-1 rounded text-sm hover:bg-white/20 transition-colors mobile-landscape-button"
                      title="Songs"
                    >
                      📁
                    </button>
                  )}

                  {selectedSong && (
                    <h2 className="text-white text-base sm:text-lg font-semibold truncate mobile-landscape-text min-w-0">
                      {selectedSong.name}
                    </h2>
                  )}

                  {/* Drawing Tools - moved to header */}
                  {selectedSong && (
                    <div className="flex items-center space-x-1 ml-2">
                      {[
                        { id: 'select', icon: '↖️', desc: 'Select' },
                        { id: 'pencil', icon: '✏️', desc: 'Draw' },
                        { id: 'eraser', icon: '🗑️', desc: 'Erase' }
                      ].map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setSelectedTool(tool.id as any);
                            console.log(`🛠️ Tool switched to: ${tool.id}`);
                            if (tool.id !== 'select') {
                              setSelectedNoteIds(new Set());
                              console.log('🧹 Cleared selection');
                            }
                          }}
                          className={`px-2 py-1 rounded text-sm font-semibold transition-all duration-200 ${selectedTool === tool.id
                              ? 'bg-purple-600 text-white ring-1 ring-purple-400'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                          title={tool.desc}
                        >
                          {tool.icon}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Undo/Redo - moved to header */}
                  {selectedSong && (
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className={`px-2 py-1 rounded text-sm font-semibold transition-all duration-200 ${historyIndex <= 0
                            ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        title="Undo (Ctrl+Z)"
                      >
                        ↶
                      </button>
                      <button
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className={`px-2 py-1 rounded text-sm font-semibold transition-all duration-200 ${historyIndex >= history.length - 1
                            ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}
                        title="Redo (Ctrl+Shift+Z)"
                      >
                        ↷
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side controls */}
                <div className="flex items-center space-x-2">
                  {/* Settings Button - moved to header */}
                  {selectedSong && (
                    <button
                      onClick={() => setShowSettings(true)}
                      className="bg-white/10 text-white/70 px-2 py-1 rounded text-sm hover:bg-white/20 transition-all duration-200 mobile-landscape-button"
                      title="Song Settings"
                    >
                      ⚙️
                    </button>
                  )}

                  {/* Auto-scroll to playhead - moved to header */}
                  {selectedSong && isPlaying && (
                    <button
                      onClick={() => {
                        const container = document.querySelector('.piano-roll-container');
                        if (container) {
                          const scrollLeft = (currentTime * BEAT_WIDTH * zoom) - (container.clientWidth / 2);
                          container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
                        }
                      }}
                      className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-sm hover:bg-blue-600/30 transition-colors mobile-landscape-button"
                      title="Auto-scroll to current position"
                    >
                      🎯
                    </button>
                  )}

                  {/* Status info - mobile landscape compact */}
                  {selectedSong && (
                    <div className="flex items-center space-x-1 text-white/60 text-xs lg:hidden">
                      <span>{selectedSong.bpm}BPM</span>
                      <span>•</span>
                      <span>{Math.floor(currentTime * 100) / 100}s</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Second row - Note Duration, Selection Actions, and Playback Controls */}
              {selectedSong && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Note Duration Selector - moved to header */}
                    {selectedTool === 'pencil' && (
                      <div className="flex items-center space-x-2">
                        <span className="text-white/70 text-sm">Note:</span>
                        <div className="flex bg-black/60 rounded-lg p-1 space-x-1">
                          {noteDurations.map(duration => (
                            <button
                              key={duration.value}
                              onClick={() => setSelectedDuration(duration.value)}
                              className={`px-2 py-1 rounded text-sm font-bold transition-all duration-200 ${selectedDuration === duration.value
                                  ? 'bg-purple-600 text-white'
                                  : 'text-white/70 hover:text-white hover:bg-white/10'
                                }`}
                              title={duration.name}
                            >
                              {duration.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selection Actions - moved to header */}
                    {selectedNoteIds.size > 0 && (
                      <div className="flex items-center space-x-2 ml-4">
                        <div className="flex items-center space-x-1 bg-yellow-600/20 px-2 py-1 rounded">
                          <span className="text-yellow-300 text-sm font-semibold">
                            {selectedNoteIds.size} Selected
                          </span>
                        </div>
                        
                        <button
                          onClick={() => {
                            const notes = getSelectedNotes();
                            notes.forEach((note, index) => {
                              setTimeout(() => {
                                const bpm = selectedSong.bpm || 120;
                                const beatDuration = 60 / bpm;
                                const previewDuration = Math.max(0.1, Math.min(note.duration * beatDuration, 4));
                                playNote(note.key, previewDuration, note.velocity);
                              }, index * 100);
                            });
                          }}
                          className="bg-green-600/20 text-green-300 px-2 py-1 rounded text-sm hover:bg-green-600/30 transition-colors"
                          title="Play selected notes"
                        >
                          🎵
                        </button>
                        
                        <button
                          onClick={deleteSelectedNotes}
                          className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-sm hover:bg-red-600/30 transition-colors"
                          title="Delete selected notes (Del)"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Playback Controls - moved to header */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={saveSong}
                      disabled={saveMode === 'firebase' && (!currentUser || isSaving)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold transition-all duration-200 mobile-landscape-button ${saveMode === 'firebase' && (!currentUser || isSaving)
                          ? 'bg-gray-600/20 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                        }`}
                    >
                      <Save size={12} />
                      <span className="hidden sm:inline">
                        {isSaving ? 'Saving...' : saveMode === 'local' ? 'Save' : 'Cloud'}
                      </span>
                    </button>

                    <button
                      onClick={togglePlayback}
                      className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold transition-all duration-200 mobile-landscape-button ${isPlaying
                          ? 'bg-orange-600/20 text-orange-300 hover:bg-orange-600/30'
                          : 'bg-green-600/20 text-green-300 hover:bg-green-600/30'
                        }`}
                    >
                      {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                      <span className="hidden lg:inline">{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <button
                      onClick={stopPlayback}
                      className="flex items-center space-x-1 bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs hover:bg-red-600/30 transition-colors mobile-landscape-button"
                    >
                      <Square size={12} />
                      <span className="hidden lg:inline">Stop</span>
                    </button>

                    {/* Status info - desktop */}
                    <div className="hidden lg:flex items-center space-x-2 text-white/70 text-sm">
                      <span>BPM: {selectedSong.bpm}</span>
                      <span>•</span>
                      <span>Time: {Math.floor(currentTime * 100) / 100}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Editor */}
          {selectedSong ? (
            <div className="flex-1 flex flex-col sm:flex-row">
              {/* Piano Keys Reference - optimized for landscape */}
              <div className="w-full sm:w-16 lg:w-20 bg-black/60 border-b sm:border-b-0 sm:border-r border-white/20">
                {/* Mobile: Horizontal layout - Physical key order - more compact for landscape */}
                <div className="flex sm:hidden overflow-x-auto">
                  {[1, 9, 2, 10, 3, 4, 11, 5, 12, 6, 13, 7, 14, 8, 15].map(keyNum => (
                    <div
                      key={keyNum}
                      className={`min-w-[2.5rem] h-6 border-r border-white/10 flex items-center justify-center text-xs font-semibold ${isWhiteKey(keyNum) ? 'text-white/70 bg-black/60' : 'text-yellow-300 bg-black/80'
                        }`}
                      title={`Key ${getKeyLabel(keyNum)} - ${GAME_CONFIG.noteNames[keyNum as keyof typeof GAME_CONFIG.noteNames]}`}
                    >
                      {getKeyLabel(keyNum)}
                    </div>
                  ))}
                </div>

                {/* Desktop: Vertical layout - Logical order for editing */}
                <div className="hidden sm:block">
                  {[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(keyNum => (
                    <div
                      key={keyNum}
                      className={`h-8 border-b border-white/10 flex items-center justify-center text-sm font-semibold ${isWhiteKey(keyNum) ? 'text-white/70 bg-black/60' : 'text-yellow-300 bg-black/80'
                        }`}
                      title={`Key ${getKeyLabel(keyNum)} - ${GAME_CONFIG.noteNames[keyNum as keyof typeof GAME_CONFIG.noteNames]}`}
                    >
                      {getKeyLabel(keyNum)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Note Grid */}
              <div className="flex-1 bg-gray-900 relative">
                <div
                  className="piano-roll-container absolute inset-0"
                  style={{
                    overflow: 'auto'
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: `${selectedSong.duration * BEAT_WIDTH * zoom + (BEAT_WIDTH * 12 * zoom)}px`,
                      height: `${PIANO_KEYS * KEY_HEIGHT}px`
                    }}
                  >
                    {/* Grid Lines */}
                    {Array.from({ length: Math.max(selectedSong.duration * 4, 16) + 32 }).map((_, i) => (
                      <div
                        key={i}
                        className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? 'border-white/30' : 'border-white/10'
                          } ${i >= selectedSong.duration * 4 ? 'opacity-30' : ''}`}
                        style={{ left: i * GRID_WIDTH * zoom }}
                      />
                    ))}

                    {Array.from({ length: PIANO_KEYS }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-b border-white/10"
                        style={{ top: i * KEY_HEIGHT, height: KEY_HEIGHT }}
                      />
                    ))}

                    {/* Notes */}
                    {selectedSong.notes.map(note => (
                      <motion.div
                        key={note.id}
                        className={`absolute rounded border cursor-pointer flex items-center justify-center text-white text-xs font-semibold transition-all duration-200 z-10 ${selectedNoteIds.has(note.id)
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-600 border-yellow-300 z-20 ring-2 ring-yellow-400/50'
                            : selectedTool === 'eraser'
                            ? 'bg-gradient-to-r from-red-400 to-red-600 border-red-300 hover:from-red-500 hover:to-red-700'
                            : 'bg-gradient-to-r from-pink-400 to-purple-600 border-pink-300 hover:from-pink-500 hover:to-purple-700'
                          }`}
                        style={{
                          left: note.startTime * BEAT_WIDTH * zoom,
                          top: (15 - note.key) * KEY_HEIGHT + 2,
                          width: note.duration * BEAT_WIDTH * zoom - 2,
                          height: KEY_HEIGHT - 4,
                          opacity: note.velocity / 100, // Visual velocity indication
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log(`🎯 Note clicked! Tool: ${selectedTool}, Note ID: ${note.id}`);
                          
                          if (selectedTool === 'eraser') {
                            // Direct erase - simple and immediate
                            console.log(`🗑️ Erasing note: ${note.id} (key ${note.key})`);
                            removeNote(note.id);
                            // Haptic feedback
                            if ('vibrate' in navigator) {
                              navigator.vibrate(100);
                            }
                          } else if (selectedTool === 'select') {
                            console.log(`↖️ Selecting note: ${note.id} (key ${note.key}), multi: ${e.ctrlKey || e.metaKey}`);
                            selectNote(note.id, e.ctrlKey || e.metaKey);
                          } else if (selectedTool === 'pencil') {
                            // Play the note for preview
                            console.log(`✏️ Playing note preview: ${note.id} (key ${note.key})`);
                            const bpm = selectedSong.bpm || 120;
                            const beatDuration = 60 / bpm;
                            const previewDuration = Math.max(0.1, Math.min(note.duration * beatDuration, 4));
                            playNote(note.key, previewDuration, note.velocity);
                          }
                        }}
                        whileHover={{ 
                          scale: selectedTool === 'eraser' ? 0.95 : 1.05,
                          rotate: selectedTool === 'eraser' ? -2 : 0
                        }}
                        drag={selectedTool === 'select' && selectedNoteIds.has(note.id)}
                        dragMomentum={false}
                        onTouchStart={(e) => {
                          if (selectedTool === 'select') {
                            setIsDragging(true);
                            setDraggedNoteId(note.id);
                            // Haptic feedback on mobile if available
                            if ('vibrate' in navigator) {
                              navigator.vibrate(50);
                            }
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (selectedTool === 'eraser') {
                            e.stopPropagation();
                            removeNote(note.id);
                            // Haptic feedback for deletion
                            if ('vibrate' in navigator) {
                              navigator.vibrate(100);
                            }
                          } else if (selectedTool === 'select') {
                            setIsDragging(false);
                            setDraggedNoteId(null);
                          }
                        }}
                        onDragStart={() => {
                          setIsDragging(true);
                          setDraggedNoteId(note.id);
                        }}
                        onDragEnd={(event, info) => {
                          setIsDragging(false);
                          setDraggedNoteId(null);
                          
                          if (Math.abs(info.offset.x) > 10 || Math.abs(info.offset.y) > 10) {
                            const deltaTime = info.offset.x / (BEAT_WIDTH * zoom);
                            const deltaKey = -Math.round(info.offset.y / KEY_HEIGHT);
                            moveSelectedNotes(deltaTime, deltaKey);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span>{getKeyLabel(note.key)}</span>
                          <span className="text-xs opacity-80">{note.velocity}</span>
                        </div>
                        
                        {/* Selection indicator */}
                        {selectedNoteIds.has(note.id) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-yellow-300 flex items-center justify-center">
                            <span className="text-yellow-900 text-xs font-bold">✓</span>
                          </div>
                        )}
                        
                        {/* Erase indicator - with pointer-events-none to not block clicks */}
                        {selectedTool === 'eraser' && (
                          <div className="absolute inset-0 bg-red-500/30 rounded flex items-center justify-center pointer-events-none">
                            <span className="text-white text-lg">🗑️</span>
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Current Time Indicator (Playhead) */}
                    {isPlaying && (
                      <motion.div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg z-10"
                        style={{
                          left: currentTime * BEAT_WIDTH * zoom,
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="absolute -top-2 -left-1 w-3 h-3 bg-red-500 rotate-45 shadow-lg"></div>
                      </motion.div>
                    )}

                    {/* Click handler for adding notes - only active for pencil tool */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ pointerEvents: selectedTool === 'pencil' ? 'auto' : 'none' }}
                      onClick={(e) => {
                        if (selectedTool === 'pencil') {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;

                          const time = x / (BEAT_WIDTH * zoom);
                          const key = 15 - Math.floor(y / KEY_HEIGHT);

                          if (key >= 1 && key <= 15) {
                            addNote(key, Math.floor(time * 4) / 4); // Snap to 1/4 beat
                          }
                        }
                      }}
                    />

                    {/* Selection and background click handler - separate from notes */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ pointerEvents: selectedTool === 'select' ? 'auto' : 'none' }}
                      onClick={(e) => {
                        if (selectedTool === 'select') {
                          // Clear selection if clicking empty space (not on a note)
                          if (!e.ctrlKey && !e.metaKey) {
                            setSelectedNoteIds(new Set());
                            console.log('🧹 Cleared selection - clicked empty space');
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        if (selectedTool === 'select' && e.button === 0) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setDragStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }
                      }}
                      onMouseMove={(e) => {
                        if (selectedTool === 'select' && dragStartPos && e.buttons === 1) {
                          // Visual feedback during drag - could add selection preview here
                        }
                      }}
                      onMouseUp={(e) => {
                        if (selectedTool === 'select' && dragStartPos && !isDragging) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const endX = e.clientX - rect.left;
                          const endY = e.clientY - rect.top;
                          
                          // Box selection
                          const left = Math.min(dragStartPos.x, endX);
                          const right = Math.max(dragStartPos.x, endX);
                          const top = Math.min(dragStartPos.y, endY);
                          const bottom = Math.max(dragStartPos.y, endY);
                          
                          // Only perform box selection if drag distance is significant
                          if (Math.abs(right - left) > 20 || Math.abs(bottom - top) > 20) {
                            const selectedNotes = selectedSong.notes.filter(note => {
                              const noteLeft = note.startTime * BEAT_WIDTH * zoom;
                              const noteRight = noteLeft + (note.duration * BEAT_WIDTH * zoom);
                              const noteTop = (15 - note.key) * KEY_HEIGHT;
                              const noteBottom = noteTop + KEY_HEIGHT;
                              
                              // Check if note overlaps with selection box
                              return noteLeft < right && noteRight > left && noteTop < bottom && noteBottom > top;
                            });
                            
                            if (e.ctrlKey || e.metaKey) {
                              // Add to existing selection
                              const newSelection = new Set(selectedNoteIds);
                              selectedNotes.forEach(note => newSelection.add(note.id));
                              setSelectedNoteIds(newSelection);
                            } else {
                              // Replace selection
                              setSelectedNoteIds(new Set(selectedNotes.map(n => n.id)));
                            }
                            console.log(`📦 Box selection: ${selectedNotes.length} notes selected`);
                          }
                        }
                        setDragStartPos(null);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        // Right-click menu removed for simplicity
                      }}
                    />

                    {/* Selection Box Visual Indicator - Simplified */}
                    {selectedTool === 'select' && dragStartPos && (
                      <div className="absolute top-2 right-2 text-white/60 text-xs bg-black/60 px-2 py-1 rounded pointer-events-none z-30">
                        Box Selection Active
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/70">
                <h3 className="text-xl font-semibold mb-2">No Song Selected</h3>
                <p className="mb-4">Create a new song or select one from the library</p>
                <button
                  onClick={createNewSong}
                  className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-500 hover:to-blue-600 transition-all duration-200"
                >
                  Create New Song
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Song Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* BPM Control */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">BPM (Beats Per Minute)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="60"
                    max="200"
                    step="1"
                    value={selectedSong?.bpm || 120}
                    onChange={(e) => updateSongSettings({ bpm: Number(e.target.value) })}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white text-sm w-12 text-center bg-black/60 px-2 py-1 rounded">
                    {selectedSong?.bpm || 120}
                  </span>
                </div>
              </div>

              {/* Duration Control */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Song Length (Beats)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="4"
                    max="64"
                    step="4"
                    value={selectedSong?.duration || 16}
                    onChange={(e) => updateSongSettings({ duration: Number(e.target.value) })}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white text-sm w-12 text-center bg-black/60 px-2 py-1 rounded">
                    {selectedSong?.duration || 16}B
                  </span>
                </div>
              </div>

              {/* Zoom Control */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Editor Zoom</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white text-sm w-12 text-center bg-black/60 px-2 py-1 rounded">
                    {zoom}x
                  </span>
                </div>
              </div>

              {/* Master Volume */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm">Master Volume</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white text-sm w-12 text-center bg-black/60 px-2 py-1 rounded">
                    {Math.round(masterVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50">
        {/* ToastContainer will be automatically included from useToast hook */}
      </div>
    </>
  );
}