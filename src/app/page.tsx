'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import OrientationCheck from '@/components/OrientationCheck';
import ControlPanel from '@/components/ControlPanel';
import PianoKeyboard from '@/components/PianoKeyboard';
import AudioAnalyzer from '@/components/AudioAnalyzer';
import SongManager from '@/components/SongManager';
import MusicTheory from '@/components/MusicTheory';
import AdminPanel from '@/components/AdminPanel';
import PWAInstaller from '@/components/PWAInstaller';
import { useAuth } from '@/contexts/AuthContext';
import { GAME_CONFIG } from '@/config/piano-config';

type GameMode = 'piano' | 'analyzer' | 'song-manager' | 'music-theory' | 'admin';

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
}

interface FallingTile {
  id: string;
  key: number;
  y: number;
  startTime: number;
  duration: number;
  velocity: number;
  hit: boolean;
}

export default function Home() {
  const [gameMode, setGameMode] = useState<GameMode>('piano');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [totalNotes, setTotalNotes] = useState(0);
  const [hitNotes, setHitNotes] = useState(0);
  const [missedNotes, setMissedNotes] = useState(0);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [fallingTiles, setFallingTiles] = useState<FallingTile[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongSelection, setShowSongSelection] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>([]);
  const [gameFinished, setGameFinished] = useState(false);
  const { isAdmin, isModerator } = useAuth();

  // Visual effects for hits
  const [hitEffects, setHitEffects] = useState<Array<{id: string, x: number, y: number, type: string}>>([]);

  // Load available songs from localStorage and listen for updates
  useEffect(() => {
    const loadSongs = () => {
      try {
        const savedSongs = localStorage.getItem('pink-poong-songs');
        if (savedSongs) {
          const songs = JSON.parse(savedSongs);
          console.log('Loaded songs from localStorage:', songs);
          setAvailableSongs(songs);
        } else {
          // Default demo songs if no saved songs
          const demoSongs: Song[] = [
            {
              id: 'demo-1',
              name: '🎵 Twinkle Twinkle (Demo)',
              bpm: 120,
              duration: 24,
              notes: [
                // First line: Twinkle twinkle little star
                { id: '1', key: 1, startTime: 0, duration: 0.5, velocity: 100 },    // C
                { id: '2', key: 1, startTime: 0.6, duration: 0.5, velocity: 100 },  // C
                { id: '3', key: 5, startTime: 1.2, duration: 0.5, velocity: 100 },  // G
                { id: '4', key: 5, startTime: 1.8, duration: 0.5, velocity: 100 },  // G
                { id: '5', key: 6, startTime: 2.4, duration: 0.5, velocity: 100 },  // A
                { id: '6', key: 6, startTime: 3.0, duration: 0.5, velocity: 100 },  // A
                { id: '7', key: 5, startTime: 3.6, duration: 1.0, velocity: 100 },  // G
                
                // Second line: How I wonder what you are
                { id: '8', key: 4, startTime: 4.8, duration: 0.5, velocity: 100 },  // F
                { id: '9', key: 4, startTime: 5.4, duration: 0.5, velocity: 100 },  // F
                { id: '10', key: 3, startTime: 6.0, duration: 0.5, velocity: 100 }, // E
                { id: '11', key: 3, startTime: 6.6, duration: 0.5, velocity: 100 }, // E
                { id: '12', key: 2, startTime: 7.2, duration: 0.5, velocity: 100 }, // D
                { id: '13', key: 2, startTime: 7.8, duration: 0.5, velocity: 100 }, // D
                { id: '14', key: 1, startTime: 8.4, duration: 1.0, velocity: 100 }, // C
              ]
            },
            {
              id: 'demo-2',
              name: '🎶 Scale Practice (Demo)',
              bpm: 100,
              duration: 16,
              notes: [
                // C major scale up
                { id: '1', key: 1, startTime: 0, duration: 0.5, velocity: 80 },    // C
                { id: '2', key: 2, startTime: 0.6, duration: 0.5, velocity: 80 },  // D
                { id: '3', key: 3, startTime: 1.2, duration: 0.5, velocity: 80 },  // E
                { id: '4', key: 4, startTime: 1.8, duration: 0.5, velocity: 80 },  // F
                { id: '5', key: 5, startTime: 2.4, duration: 0.5, velocity: 80 },  // G
                { id: '6', key: 6, startTime: 3.0, duration: 0.5, velocity: 80 },  // A
                { id: '7', key: 7, startTime: 3.6, duration: 0.5, velocity: 80 },  // B
                { id: '8', key: 8, startTime: 4.2, duration: 0.5, velocity: 80 },  // C
                
                // Scale down
                { id: '9', key: 7, startTime: 5.0, duration: 0.5, velocity: 80 },  // B
                { id: '10', key: 6, startTime: 5.6, duration: 0.5, velocity: 80 }, // A
                { id: '11', key: 5, startTime: 6.2, duration: 0.5, velocity: 80 }, // G
                { id: '12', key: 4, startTime: 6.8, duration: 0.5, velocity: 80 }, // F
                { id: '13', key: 3, startTime: 7.4, duration: 0.5, velocity: 80 }, // E
                { id: '14', key: 2, startTime: 8.0, duration: 0.5, velocity: 80 }, // D
                { id: '15', key: 1, startTime: 8.6, duration: 1.0, velocity: 80 }, // C
              ]
            },
            {
              id: 'demo-3',
              name: '🎹 Chord Practice (Demo)',
              bpm: 80,
              duration: 12,
              notes: [
                // C major chord
                { id: '1', key: 1, startTime: 0, duration: 2.0, velocity: 90 },    // C
                { id: '2', key: 3, startTime: 0, duration: 2.0, velocity: 90 },    // E
                { id: '3', key: 5, startTime: 0, duration: 2.0, velocity: 90 },    // G
                
                // F major chord
                { id: '4', key: 4, startTime: 2.5, duration: 2.0, velocity: 90 },  // F
                { id: '5', key: 6, startTime: 2.5, duration: 2.0, velocity: 90 },  // A
                { id: '6', key: 8, startTime: 2.5, duration: 2.0, velocity: 90 },  // C
                
                // G major chord
                { id: '7', key: 5, startTime: 5.0, duration: 2.0, velocity: 90 },  // G
                { id: '8', key: 7, startTime: 5.0, duration: 2.0, velocity: 90 },  // B
                { id: '9', key: 2, startTime: 5.0, duration: 2.0, velocity: 90 },  // D
                
                // Back to C major
                { id: '10', key: 1, startTime: 7.5, duration: 2.0, velocity: 90 }, // C
                { id: '11', key: 3, startTime: 7.5, duration: 2.0, velocity: 90 }, // E
                { id: '12', key: 5, startTime: 7.5, duration: 2.0, velocity: 90 }, // G
              ]
            }
          ];
          setAvailableSongs(demoSongs);
        }
      } catch (error) {
        console.error('Error loading songs:', error);
        setAvailableSongs([]);
      }
    };

    loadSongs();
    
    // Listen for storage changes to sync with SongManager
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pink-poong-songs') {
        console.log('Storage changed, reloading songs');
        loadSongs();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from SongManager
    const handleSongUpdate = (event: any) => {
      console.log('SongManager updated songs:', event.detail);
      loadSongs();
    };
    
    window.addEventListener('songsUpdated', handleSongUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('songsUpdated', handleSongUpdate);
    };
  }, []);

  // Auto-switch away from admin mode if user loses permissions
  useEffect(() => {
    if (gameMode === 'admin' && !isAdmin && !isModerator) {
      setGameMode('piano');
    }
  }, [gameMode, isAdmin, isModerator]);

  // Auto-collapse controls after 5 seconds of no interaction
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (gameStarted && !isControlsCollapsed) {
      timeout = setTimeout(() => {
        setIsControlsCollapsed(true);
      }, 5000);
    }

    return () => clearTimeout(timeout);
  }, [gameStarted, isControlsCollapsed]);

  // Auto-collapse controls for mobile landscape after interaction
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleUserInteraction = () => {
      // Show controls on any user interaction
      if (isControlsCollapsed) {
        setIsControlsCollapsed(false);
      }
      
      // Auto-collapse after 3 seconds on mobile (landscape orientation)
      clearTimeout(timeout);
      if (window.innerWidth < 768 && window.innerHeight < window.innerWidth) { // Mobile landscape
        timeout = setTimeout(() => {
          setIsControlsCollapsed(true);
        }, 3000);
      }
    };

    // Add event listeners for user interaction
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction);
    });

    return () => {
      clearTimeout(timeout);
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [isControlsCollapsed]);

  // Game loop for falling tiles based on selected song
  useEffect(() => {
    if (gameMode === 'piano' && gameStarted && !isPaused && selectedSong) {
      const interval = setInterval(() => {
        setGameTime(prevTime => {
          const newTime = prevTime + 0.05; // 50ms increment
          
          // Spawn tiles based on song timeline
          setFallingTiles(prev => {
            const newTiles = [...prev];
            
            // Check for notes that should start falling now
            const upcomingNotes = selectedSong.notes.filter(note => {
              const noteTime = note.startTime;
              const fallTime = 3; // 3 seconds to fall
              const spawnTime = noteTime - fallTime;
              
              return newTime >= spawnTime && 
                     newTime < spawnTime + 0.1 && // Small window to avoid duplicates
                     !prev.some(tile => tile.id === note.id);
            });

            upcomingNotes.forEach(note => {
              newTiles.push({
                id: note.id,
                key: note.key,
                y: 0,
                startTime: note.startTime,
                duration: note.duration,
                velocity: note.velocity,
                hit: false
              });
            });

            // Move existing tiles down and check for misses
            const updatedTiles = newTiles.map(tile => {
              const newY = tile.y + (2 * gameSpeed);
              
              // Check if tile passed hit zone without being hit
              if (!tile.hit && tile.y < 85 && newY >= 95) {
                setMissedNotes(prev => prev + 1);
                setCombo(0);
                return { ...tile, y: newY, hit: true }; // Mark as processed
              }
              
              return { ...tile, y: newY };
            }).filter(tile => tile.y < 110); // Remove tiles that went off screen

            return updatedTiles;
          });

          // Check if song is finished
          if (selectedSong && newTime >= selectedSong.duration + 5) {
            setGameFinished(true);
            setGameStarted(false);
          }

          return newTime;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [gameMode, gameStarted, isPaused, gameSpeed, selectedSong]);

  const handleNotePlay = useCallback((keyNumber: number) => {
    if (gameMode === 'piano' && gameStarted && !isPaused) {
      // Check if note matches falling tile in hit zone
      setFallingTiles(prev => {
        const hitTile = prev.find(tile => 
          tile.key === keyNumber && 
          !tile.hit &&
          tile.y > 75 && tile.y < 95 // Hit zone
        );

        if (hitTile) {
          // Calculate score based on accuracy
          const centerY = 85;
          const distance = Math.abs(hitTile.y - centerY);
          const maxDistance = 10;
          const accuracyPercent = Math.max(0, (maxDistance - distance) / maxDistance);
          
          let points = 0;
          let hitType = '';
          
          if (accuracyPercent > 0.9) {
            points = 300;
            hitType = 'PERFECT';
          } else if (accuracyPercent > 0.7) {
            points = 200;
            hitType = 'GREAT';
          } else if (accuracyPercent > 0.5) {
            points = 100;
            hitType = 'GOOD';
          } else {
            points = 50;
            hitType = 'OK';
          }
          
          // Apply combo multiplier
          const comboMultiplier = Math.min(2, 1 + (combo * 0.1));
          const finalPoints = Math.floor(points * comboMultiplier);
          
          setScore(s => s + finalPoints);
          setCombo(c => c + 1);
          setMaxCombo(mc => Math.max(mc, combo + 1));
          setHitNotes(h => h + 1);
          
          // Show hit effect
          console.log(`${hitType}! +${finalPoints} (${combo + 1}x combo)`);
          createHitEffect(keyNumber, hitType);
          
          return prev.map(tile => 
            tile.id === hitTile.id ? { ...tile, hit: true } : tile
          );
        }

        return prev;
      });
    }
  }, [gameMode, gameStarted, isPaused, combo]);

  const createHitEffect = (keyNumber: number, hitType: string) => {
    const position = getTilePosition(keyNumber);
    const effect = {
      id: Date.now().toString(),
      x: position + 24, // Center of tile
      y: 85, // Hit zone
      type: hitType
    };
    
    setHitEffects(prev => [...prev, effect]);
    
    // Remove effect after animation
    setTimeout(() => {
      setHitEffects(prev => prev.filter(e => e.id !== effect.id));
    }, 1000);
  };

  const handleRestart = () => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHitNotes(0);
    setMissedNotes(0);
    setAccuracy(100);
    setFallingTiles([]);
    setGameStarted(false);
    setGameFinished(false);
    setGameTime(0);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSongSelect = (song: Song) => {
    setSelectedSong(song);
    setShowSongSelection(false);
    setTotalNotes(song.notes.length);
    handleRestart();
  };

  const handleModeChange = (mode: GameMode) => {
    // Check permissions for admin mode
    if (mode === 'admin' && !isAdmin && !isModerator) {
      console.log('Access denied: User does not have admin/moderator permissions');
      return;
    }
    
    setGameMode(mode);
    
    // Reset all piano-specific states when leaving piano mode
    if (mode !== 'piano') {
      setGameStarted(false);
      setFallingTiles([]);
      setIsPaused(false);
      setShowSongSelection(false);
      setGameFinished(false);
      setSelectedSong(null);
      handleRestart();
    } else {
      // Reset game state when entering piano mode and reload songs
      handleRestart();
      // Force reload songs from localStorage
      const loadSongs = () => {
        try {
          const savedSongs = localStorage.getItem('pink-poong-songs');
          if (savedSongs) {
            const songs = JSON.parse(savedSongs);
            console.log('Force reloaded songs when entering piano mode:', songs);
            setAvailableSongs(songs);
          }
        } catch (error) {
          console.error('Error force reloading songs:', error);
        }
      };
      loadSongs();
    }
  };

  // Helper function to get tile position based on key layout
  const getTilePosition = (keyNumber: number) => {
    // Use physical key order for proper positioning
    const physicalOrder = [1, 9, 2, 10, 3, 4, 11, 5, 12, 6, 13, 7, 14, 8, 15];
    const physicalIndex = physicalOrder.indexOf(keyNumber);
    
    // Responsive tile width based on screen size
    const isSmallScreen = window.innerWidth < 640;
    const baseWidth = isSmallScreen ? 32 : 48; // Smaller on mobile
    const gap = isSmallScreen ? 2 : 4; // Smaller gap on mobile
    
    return physicalIndex * (baseWidth + gap);
  };

  const renderGameContent = () => {
    switch (gameMode) {
      case 'piano':
        return (
          <div className="relative h-full">
            {/* Song Selection Modal */}
            {showSongSelection && gameMode === 'piano' && (
              <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-purple-900 to-blue-900 p-3 sm:p-6 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg w-full mx-2 sm:mx-4 max-h-80 sm:max-h-96 overflow-y-auto modal-content"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                >
                  <div className="flex justify-between items-center mb-2 sm:mb-4">
                    <h3 className="text-lg sm:text-2xl font-bold text-white">🎵 Select a Song</h3>
                    <motion.button
                      onClick={() => {
                        console.log('Refreshing songs...');
                        const saved = localStorage.getItem('pink-poong-songs');
                        console.log('Raw data:', saved);
                        if (saved) {
                          try {
                            const songs = JSON.parse(saved);
                            console.log('Parsed songs:', songs);
                            setAvailableSongs(songs);
                          } catch (e) {
                            console.error('Parse error:', e);
                          }
                        }
                      }}
                      className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🔄
                    </motion.button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2 text-center">
                    Found {availableSongs.length} songs
                  </div>
                  
                  {availableSongs.length === 0 ? (
                    <div className="text-center text-gray-300 py-8">
                      <p className="mb-4">No songs available.</p>
                      <p className="text-sm">Create songs in Song Manager first!</p>
                      <button 
                        onClick={() => {
                          console.log('Checking localStorage...');
                          const saved = localStorage.getItem('pink-poong-songs');
                          console.log('Raw localStorage data:', saved);
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              console.log('Parsed songs:', parsed);
                            } catch (e) {
                              console.error('Parse error:', e);
                            }
                          }
                        }}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
                      >
                        🔍 Debug Songs
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableSongs.map((song) => (
                        <motion.button
                          key={song.id}
                          onClick={() => handleSongSelect(song)}
                          className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-lg text-left transition-colors group"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-white font-semibold group-hover:text-pink-300 transition-colors">
                                {song.name}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-300 mt-1">
                                <span>♪ {song.notes.length} notes</span>
                                <span>⏱ {song.duration}s</span>
                                <span>🎵 {song.bpm} BPM</span>
                              </div>
                            </div>
                            <div className="text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              ▶
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                  
                  <motion.button
                    onClick={() => setShowSongSelection(false)}
                    className="w-full mt-2 sm:mt-4 p-2 sm:p-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                </motion.div>
              </motion.div>
            )}

            {/* Game Finished Modal */}
            {gameFinished && gameMode === 'piano' && (
              <motion.div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-purple-900 to-blue-900 p-4 sm:p-8 rounded-2xl shadow-2xl max-w-xs sm:max-w-md w-full mx-2 sm:mx-4"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                >
                  <div className="text-center">
                    <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">🎉 Song Complete!</h3>
                    <div className="text-pink-300 text-base sm:text-lg mb-4 sm:mb-6">{selectedSong?.name}</div>
                    
                    <div className="space-y-2 sm:space-y-3 text-white mb-4 sm:mb-6 text-sm sm:text-base">
                      <div className="flex justify-between">
                        <span>Score:</span>
                        <span className="font-bold text-yellow-400">{score.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Combo:</span>
                        <span className="font-bold text-pink-400">{maxCombo}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <span className="font-bold text-green-400">
                          {totalNotes > 0 ? Math.round((hitNotes / totalNotes) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Notes Hit:</span>
                        <span>{hitNotes} / {totalNotes}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <motion.button
                        onClick={handleRestart}
                        className="w-full p-2 sm:p-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        🔄 Play Again
                      </motion.button>
                      <motion.button
                        onClick={() => setShowSongSelection(true)}
                        className="w-full p-2 sm:p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm sm:text-base"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        🎵 Choose Another Song
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Game Stats HUD */}
            {gameStarted && selectedSong && (
              <div className="absolute top-1 sm:top-4 left-1 sm:left-4 right-1 sm:right-4 flex justify-between items-start z-30 pointer-events-none">
                {/* Left Stats */}
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-1.5 sm:p-3 text-white space-y-0.5 sm:space-y-1 game-stats">
                  <div className="text-xs sm:text-sm opacity-80">Progress</div>
                  <div className="font-bold text-sm sm:text-base">{Math.round((gameTime / selectedSong.duration) * 100)}%</div>
                  <div className="w-16 sm:w-32 h-1 sm:h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-100"
                      style={{ width: `${Math.min(100, (gameTime / selectedSong.duration) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Center Stats */}
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-1.5 sm:p-3 text-white text-center game-stats">
                  <div className="text-xs sm:text-sm opacity-80">Combo</div>
                  <div className="text-lg sm:text-2xl font-bold text-pink-400">{combo}x</div>
                  <div className="text-xs opacity-60">Max: {maxCombo}</div>
                </div>

                {/* Right Stats */}
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-1.5 sm:p-3 text-white text-right space-y-0.5 sm:space-y-1 game-stats">
                  <div className="text-xs sm:text-sm opacity-80">Accuracy</div>
                  <div className="font-bold text-sm sm:text-base text-green-400">
                    {totalNotes > 0 ? Math.round(((hitNotes) / (hitNotes + missedNotes || 1)) * 100) : 100}%
                  </div>
                  <div className="text-xs opacity-60">{hitNotes}/{hitNotes + missedNotes}</div>
                </div>
              </div>
            )}

            {/* Hit Zone Indicator */}
            {gameStarted && (
              <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: '70%' }}>
                <div className="h-16 sm:h-20 bg-gradient-to-b from-transparent via-pink-500/20 to-transparent border-y-2 border-pink-500/50" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 sm:h-1 bg-pink-500 transform -translate-y-1/2" />
              </div>
            )}

            {/* Hit Effects */}
            <div className="absolute inset-0 pointer-events-none z-30">
              {hitEffects.map(effect => (
                <motion.div
                  key={effect.id}
                  className="absolute text-white font-bold text-lg"
                  style={{
                    left: effect.x,
                    top: `${effect.y}%`,
                  }}
                  initial={{ opacity: 1, scale: 0.5, y: 0 }}
                  animate={{ opacity: 0, scale: 1.5, y: -50 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  <span className={`
                    ${effect.type === 'PERFECT' ? 'text-yellow-400' : ''}
                    ${effect.type === 'GREAT' ? 'text-green-400' : ''}
                    ${effect.type === 'GOOD' ? 'text-blue-400' : ''}
                    ${effect.type === 'OK' ? 'text-gray-400' : ''}
                  `}>
                    {effect.type}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Falling Tiles */}
            <div className="absolute inset-0 pointer-events-none">
              {fallingTiles.map(tile => (
                <motion.div
                  key={tile.id}
                  className={`absolute w-8 sm:w-12 h-6 sm:h-8 rounded-lg shadow-lg ${
                    tile.hit 
                      ? 'bg-gradient-to-b from-green-400 to-emerald-600' 
                      : 'bg-gradient-to-b from-pink-400 to-purple-600'
                  }`}
                  style={{
                    left: `${getTilePosition(tile.key)}px`,
                    top: `${tile.y}%`,
                    opacity: tile.hit ? 0.3 : 1,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                />
              ))}
            </div>

            {/* Hit Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {hitEffects.map(effect => (
                <motion.div
                  key={effect.id}
                  className={`absolute rounded-full ${effect.type === 'PERFECT' ? 'bg-green-500' : effect.type === 'GREAT' ? 'bg-blue-500' : effect.type === 'GOOD' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{
                    left: `${effect.x}px`,
                    top: `${effect.y}px`,
                    width: '48px',
                    height: '48px',
                    opacity: 0.8,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                />
              ))}
            </div>

            {/* Piano Keyboard */}
            <div className="flex items-center justify-center h-full">
              <PianoKeyboard 
                onNotePlay={handleNotePlay} 
                gameMode={gameMode}
              />
            </div>

            {/* Song Selection Button - floating top right when no song selected */}
            {!gameStarted && !selectedSong && (
              <motion.div
                className="absolute top-16 sm:top-20 right-4 z-30"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  onClick={() => {
                    console.log('Choose song button clicked');
                    setShowSongSelection(true);
                  }}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎵 Choose Song
                </motion.button>
              </motion.div>
            )}

            {/* Play Button - floating when song selected but not started */}
            {!gameStarted && selectedSong && (
              <motion.div
                className="absolute top-16 sm:top-20 right-4 z-30 space-y-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="bg-black/60 backdrop-blur-sm text-white p-3 rounded-lg text-right">
                  <div className="text-pink-300 text-sm font-semibold">{selectedSong.name}</div>
                  <div className="text-xs text-gray-300">
                    ♪ {selectedSong.notes.length} notes • {selectedSong.duration}s • {selectedSong.bpm} BPM
                  </div>
                </div>
                <div className="flex space-x-2">
                  <motion.button
                    onClick={() => {
                      setGameStarted(true);
                      setGameTime(0);
                    }}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-colors text-sm sm:text-base font-semibold"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ▶ Play
                  </motion.button>
                  <motion.button
                    onClick={() => setShowSongSelection(true)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl transition-colors text-sm sm:text-base"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Pause Overlay */}
            {isPaused && gameStarted && gameMode === 'piano' && (
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="bg-black/80 text-white p-8 rounded-lg text-center">
                  <h3 className="text-2xl font-bold mb-4">⏸ Game Paused</h3>
                  <p className="text-gray-300 mb-6">Press any key to continue</p>
                  <motion.button
                    onClick={handlePause}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ▶ Resume Game
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        );

      case 'analyzer':
        return (
          <div className="h-full">
            <AudioAnalyzer 
              isActive={gameMode === 'analyzer'}
              onNoteDetected={(note, frequency) => {
                console.log(`Note detected: ${note} at ${frequency}Hz`);
                // Convert note name to key number using config
                const keyNumber = Object.entries(GAME_CONFIG.noteNames).find(
                  ([_, noteName]) => noteName === note
                )?.[0];
                
                if (keyNumber) {
                  handleNotePlay(parseInt(keyNumber));
                }
              }}
            />
          </div>
        );

      case 'song-manager':
        return (
          <div className="h-full">
            <SongManager isActive={gameMode === 'song-manager'} />
          </div>
        );

      case 'music-theory':
        return (
          <div className="h-full">
            <MusicTheory isActive={gameMode === 'music-theory'} />
          </div>
        );

      case 'admin':
        return (
          <div className="h-full">
            <AdminPanel isActive={gameMode === 'admin'} />
          </div>
        );

      default:
        return null;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (gameMode === 'piano') {
        switch (event.code) {
          case 'Space':
            event.preventDefault();
            if (gameStarted && selectedSong) handlePause();
            break;
          case 'KeyR':
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              handleRestart();
            }
            break;
          case 'KeyS':
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              setShowSongSelection(true);
            }
            break;
          case 'Escape':
            if (showSongSelection) {
              setShowSongSelection(false);
            } else if (gameFinished) {
              setGameFinished(false);
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameMode, gameStarted, selectedSong, showSongSelection, gameFinished]);

  // Calculate accuracy in real-time
  useEffect(() => {
    if (hitNotes + missedNotes > 0) {
      setAccuracy(Math.round((hitNotes / (hitNotes + missedNotes)) * 100));
    }
  }, [hitNotes, missedNotes]);

  return (
    <OrientationCheck>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,rgba(168,85,247,0.1)_0deg,transparent_60deg,rgba(236,72,153,0.1)_120deg,transparent_180deg,rgba(59,130,246,0.1)_240deg,transparent_300deg,rgba(168,85,247,0.1)_360deg)] animate-spin" style={{ animationDuration: '20s' }} />
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        {/* Control Panel */}
        <ControlPanel
          score={score}
          gameMode={gameMode}
          onModeChange={handleModeChange}
          isCollapsed={isControlsCollapsed}
          onToggleCollapse={() => setIsControlsCollapsed(!isControlsCollapsed)}
          gameSpeed={gameSpeed}
          onSpeedChange={setGameSpeed}
          onRestart={handleRestart}
          isPaused={isPaused}
          onPause={handlePause}
          onSongSelect={() => setShowSongSelection(true)}
          selectedSong={selectedSong}
          combo={combo}
          accuracy={totalNotes > 0 ? Math.round(((hitNotes) / (hitNotes + missedNotes || 1)) * 100) : 100}
        />

        {/* Main Content - optimized padding for mobile landscape */}
        <div 
          className={`transition-all duration-500 ${isControlsCollapsed ? 'pt-0' : 'pt-12 sm:pt-20'}`}
          onDoubleClick={gameMode === 'piano' ? () => setIsControlsCollapsed(!isControlsCollapsed) : undefined}
        >
          {renderGameContent()}
        </div>

        {/* PWA Installer */}
        <PWAInstaller />
    </div>
    </OrientationCheck>
  );
}
