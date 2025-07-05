'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  BarChart3, 
  Music, 
  TrendingUp,
  Activity,
  Save,
  Download,
  Play,
  Pause,
  X
} from 'lucide-react';
import { GAME_CONFIG, getKeyLabel, getFrequency } from '@/config/piano-config';

interface AudioAnalyzerProps {
  isActive: boolean;
  onNoteDetected: (note: string, frequency: number) => void;
}

interface DetectedNote {
  note: string;
  frequency: number;
  time: number;
  keyNumber: number;
  confidence: number;
  duration: number;
}

interface AudioSettings {
  sensitivity: number;
  smoothing: number;
  fftSize: 1024 | 2048 | 4096 | 8192;
  minDecibels: number;
  maxDecibels: number;
  noiseThreshold: number;
}

export default function AudioAnalyzer({ isActive, onNoteDetected }: AudioAnalyzerProps) {
  const [isListening, setIsListening] = useState(false);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [frequencyData, setFrequencyData] = useState<number[]>([]);
  const [detectedNotes, setDetectedNotes] = useState<DetectedNote[]>([]);
  const [volume, setVolume] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<DetectedNote[]>([]);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const recordingStartTime = useRef<number>(0);

  // Advanced audio settings
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    sensitivity: 0.7,
    smoothing: 0.8,
    fftSize: 2048,
    minDecibels: -90,
    maxDecibels: -10,
    noiseThreshold: 25
  });

  // Create note data from config for all 15 keys
  const noteFrequencies = Array.from({ length: 15 }, (_, index) => {
    const keyNumber = index + 1;
    return {
      keyNumber,
      note: GAME_CONFIG.noteNames[keyNumber as keyof typeof GAME_CONFIG.noteNames],
      frequency: getFrequency(keyNumber),
      label: getKeyLabel(keyNumber)
    };
  });

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      audioContextRef.current = audioContext;
      microphoneRef.current = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      
      analyserRef.current.fftSize = audioSettings.fftSize;
      analyserRef.current.smoothingTimeConstant = audioSettings.smoothing;
      analyserRef.current.minDecibels = audioSettings.minDecibels;
      analyserRef.current.maxDecibels = audioSettings.maxDecibels;
      
      microphoneRef.current.connect(analyserRef.current);
      
      setIsListening(true);
      startAnalyzing();
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access is required for audio analysis. Please enable microphone permissions.');
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    setIsListening(false);
    setAudioData([]);
    setFrequencyData([]);
    setVolume(0);
    setPitch(0);
  };

  const startAnalyzing = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyDataArray = new Uint8Array(bufferLength);
    
    const analyze = () => {
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyDataArray);
      
      // Convert to waveform data for visualization
      const waveformData = Array.from(dataArray).map(value => (value - 128) / 128);
      setAudioData(waveformData.slice(0, 200)); // Limit for performance
      
      // Store frequency data for spectrum visualization
      const freqData = Array.from(frequencyDataArray).slice(0, 200);
      setFrequencyData(freqData);
      
      // Calculate volume (RMS)
      const rms = Math.sqrt(waveformData.reduce((sum, val) => sum + val * val, 0) / waveformData.length);
      const volumeLevel = Math.min(rms * 100 * audioSettings.sensitivity, 100);
      setVolume(volumeLevel);
      
      // Detect pitch and notes
      if (volumeLevel > audioSettings.noiseThreshold) {
        const fundamentalFreq = detectPitch(waveformData);
        if (fundamentalFreq > 0) {
          setPitch(fundamentalFreq);
          const detectedNote = findClosestNote(fundamentalFreq);
          if (detectedNote) {
            const newDetectedNote: DetectedNote = {
              note: detectedNote.note,
              frequency: fundamentalFreq,
              time: Date.now(),
              keyNumber: detectedNote.keyNumber,
              confidence: calculateConfidence(fundamentalFreq, detectedNote.frequency),
              duration: 100 // Will be updated in real-time
            };
            
            setDetectedNotes(prev => {
              // Remove old notes (keep only last 3 seconds)
              const filtered = prev.filter(n => Date.now() - n.time < 3000);
              
              // Add new note if it's different from the last one or significant time has passed
              const lastNote = filtered[filtered.length - 1];
              if (!lastNote || 
                  lastNote.keyNumber !== newDetectedNote.keyNumber || 
                  Date.now() - lastNote.time > 500) {
                onNoteDetected(newDetectedNote.note, newDetectedNote.frequency);
                
                // Add to recording if active
                if (isRecording) {
                  const recordingTime = Date.now() - recordingStartTime.current;
                  setRecordedNotes(prev => [...prev, { ...newDetectedNote, time: recordingTime }]);
                }
                
                return [...filtered, newDetectedNote];
              }
              
              return filtered;
            });
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(analyze);
    };
    
    analyze();
  };

  // YIN pitch detection algorithm (simplified)
  const detectPitch = (buffer: number[]): number => {
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const threshold = 0.1;
    const bufferSize = buffer.length;
    
    // Autocorrelation
    const yinBuffer = new Array(bufferSize / 2);
    
    for (let t = 0; t < bufferSize / 2; t++) {
      yinBuffer[t] = 0;
      for (let i = 0; i < bufferSize / 2; i++) {
        const diff = buffer[i] - buffer[i + t];
        yinBuffer[t] += diff * diff;
      }
    }
    
    // Cumulative mean normalized difference
    let cumulativeSum = 0;
    yinBuffer[0] = 1;
    for (let t = 1; t < bufferSize / 2; t++) {
      cumulativeSum += yinBuffer[t];
      yinBuffer[t] *= t / cumulativeSum;
    }
    
    // Find the first minimum below threshold
    for (let t = 2; t < bufferSize / 2; t++) {
      if (yinBuffer[t] < threshold) {
        const x0 = t < 1 ? t : t - 1;
        const x2 = t + 1 < bufferSize / 2 ? t + 1 : t;
        
        if (yinBuffer[x0] <= yinBuffer[t] && yinBuffer[t] <= yinBuffer[x2]) {
          return sampleRate / t;
        }
      }
    }
    
    return 0;
  };

  const calculateConfidence = (detectedFreq: number, targetFreq: number): number => {
    const difference = Math.abs(detectedFreq - targetFreq);
    const maxDifference = 50; // Hz
    return Math.max(0, 100 - (difference / maxDifference) * 100);
  };

  const findClosestNote = (frequency: number) => {
    let closest = null;
    let minDifference = Infinity;
    
    for (const noteData of noteFrequencies) {
      const difference = Math.abs(frequency - noteData.frequency);
      if (difference < minDifference && difference < 100) { // 100Hz tolerance
        minDifference = difference;
        closest = noteData;
      }
    }
    
    return closest;
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedNotes([]);
    recordingStartTime.current = Date.now();
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const exportRecording = () => {
    const dataStr = JSON.stringify(recordedNotes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `piano-recording-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const playRecording = () => {
    if (recordedNotes.length === 0) return;
    
    setIsPlaying(true);
    setPlaybackPosition(0);
    
    // Simple playback simulation
    recordedNotes.forEach((note, index) => {
      setTimeout(() => {
        setPlaybackPosition(index);
        onNoteDetected(note.note, note.frequency);
        
        if (index === recordedNotes.length - 1) {
          setIsPlaying(false);
          setPlaybackPosition(0);
        }
      }, note.time);
    });
  };

  useEffect(() => {
    if (!isActive && isListening) {
      stopListening();
    }
    
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isActive, isListening]);

  // Update analyser settings when changed
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = audioSettings.fftSize;
      analyserRef.current.smoothingTimeConstant = audioSettings.smoothing;
      analyserRef.current.minDecibels = audioSettings.minDecibels;
      analyserRef.current.maxDecibels = audioSettings.maxDecibels;
    }
  }, [audioSettings]);

  return (
    <div 
      className="flex flex-col space-y-3 p-2 sm:p-4 min-h-screen relative z-10"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header - Compact for mobile */}
      <motion.div 
        className="flex items-center justify-between relative z-20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg sm:text-2xl font-bold text-white">
          🎵 Audio Analyzer
        </h2>
        
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors cursor-pointer touch-manipulation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={16} />
          </motion.button>
        </div>
      </motion.div>

      {/* Main Controls - Mobile optimized */}
      <div className="flex flex-wrap gap-2 justify-center relative z-20">
        {!isListening ? (
          <motion.button
            onClick={startListening}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-400 to-blue-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg text-sm sm:text-base cursor-pointer touch-manipulation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Mic size={18} />
            <span>Start Listening</span>
          </motion.button>
        ) : (
          <motion.button
            onClick={stopListening}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-400 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg text-sm sm:text-base cursor-pointer touch-manipulation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MicOff size={18} />
            <span>Stop Listening</span>
          </motion.button>
        )}

        {isListening && (
          <>
            {!isRecording ? (
              <motion.button
                onClick={startRecording}
                className="flex items-center space-x-2 bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg text-sm cursor-pointer touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Save size={16} />
                <span>Record</span>
              </motion.button>
            ) : (
              <motion.button
                onClick={stopRecording}
                className="flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-lg font-semibold shadow-lg text-sm animate-pulse cursor-pointer touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Pause size={16} />
                <span>Stop Recording</span>
              </motion.button>
            )}
          </>
        )}

        {recordedNotes.length > 0 && (
          <div className="flex space-x-2 relative z-20">
            <motion.button
              onClick={playRecording}
              disabled={isPlaying}
              className="flex items-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm disabled:opacity-50 cursor-pointer touch-manipulation"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play size={14} />
              <span>Play</span>
            </motion.button>
            
            <motion.button
              onClick={exportRecording}
              className="flex items-center space-x-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm cursor-pointer touch-manipulation"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={14} />
              <span>Export</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Status indicators */}
      {isListening && (
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <div className="flex items-center space-x-2 bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Listening</span>
          </div>
          
          {pitch > 0 && (
            <div className="flex items-center space-x-2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
              <TrendingUp size={14} />
              <span>{Math.round(pitch)} Hz</span>
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span>Recording ({recordedNotes.length} notes)</span>
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-white/20 relative z-30"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Audio Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/70 hover:text-white cursor-pointer touch-manipulation"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-white/80 block mb-1">Sensitivity</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={audioSettings.sensitivity}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <span className="text-white/60">{audioSettings.sensitivity}</span>
              </div>
              
              <div>
                <label className="text-white/80 block mb-1">Smoothing</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioSettings.smoothing}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, smoothing: parseFloat(e.target.value) }))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <span className="text-white/60">{audioSettings.smoothing}</span>
              </div>
              
              <div>
                <label className="text-white/80 block mb-1">Noise Threshold</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={audioSettings.noiseThreshold}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, noiseThreshold: parseInt(e.target.value) }))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <span className="text-white/60">{audioSettings.noiseThreshold}</span>
              </div>
              
              <div>
                <label className="text-white/80 block mb-1">FFT Size</label>
                <select
                  value={audioSettings.fftSize}
                  onChange={(e) => setAudioSettings(prev => ({ ...prev, fftSize: parseInt(e.target.value) as any }))}
                  className="w-full bg-gray-700 text-white rounded px-2 py-1 cursor-pointer"
                >
                  <option value={1024}>1024</option>
                  <option value={2048}>2048</option>
                  <option value={4096}>4096</option>
                  <option value={8192}>8192</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volume Meter */}
      {isListening && (
        <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-white/80">
              <Volume2 size={16} />
              <span className="text-sm">Volume</span>
            </div>
            <span className="text-white/60 text-sm">{Math.round(volume)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full"
              style={{ width: `${Math.min(volume, 100)}%` }}
              animate={{ width: `${Math.min(volume, 100)}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}

      {/* Waveform Visualization */}
      {isListening && audioData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Activity size={16} className="text-white/80" />
            <span className="text-white/80 text-sm">Waveform</span>
          </div>
          <div className="w-full h-20 sm:h-24 bg-gray-900 rounded-lg overflow-hidden">
            <svg width="100%" height="100%" className="block">
              <polyline
                points={audioData.map((value, index) => 
                  `${(index / audioData.length) * 100}% ${50 + value * 40}%`
                ).join(', ')}
                fill="none"
                stroke="url(#waveformGradient)"
                strokeWidth="1.5"
              />
              <defs>
                <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}

      {/* Frequency Spectrum */}
      {isListening && frequencyData.length > 0 && (
        <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 size={16} className="text-white/80" />
            <span className="text-white/80 text-sm">Frequency Spectrum</span>
          </div>
          <div className="w-full h-20 sm:h-24 bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex items-end h-full space-x-1 px-2">
              {frequencyData.slice(0, 50).map((value, index) => (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-pink-500 to-purple-500 rounded-t"
                  style={{ height: `${(value / 255) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Piano Keys Visualization - Optimized for mobile */}
      <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
        <div className="flex items-center space-x-2 mb-3">
          <Music size={16} className="text-white/80" />
          <span className="text-white/80 text-sm">Detected Notes</span>
        </div>
        
        <div className="grid grid-cols-8 gap-1 sm:gap-2">
          {noteFrequencies.slice(0, 8).map((noteData, index) => {
            const recentNote = detectedNotes.find(n => 
              n.keyNumber === noteData.keyNumber && 
              Date.now() - n.time < 1000
            );
            const isActive = !!recentNote;
            
            return (
              <motion.div
                key={noteData.note}
                className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-b from-pink-400 to-purple-600 border-pink-400 text-white shadow-lg shadow-pink-500/50' 
                    : 'bg-gradient-to-b from-gray-100 to-gray-300 border-gray-400 text-gray-700'
                }`}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <span>{index + 1}</span>
                <span className="text-xs opacity-70">{noteData.note}</span>
                {recentNote && (
                  <span className="text-xs opacity-90">
                    {Math.round(recentNote.confidence)}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Second row for remaining keys */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
          {noteFrequencies.slice(8).map((noteData, index) => {
            const recentNote = detectedNotes.find(n => 
              n.keyNumber === noteData.keyNumber && 
              Date.now() - n.time < 1000
            );
            const isActive = !!recentNote;
            
            return (
              <motion.div
                key={noteData.note}
                className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-b from-pink-400 to-purple-600 border-pink-400 text-white shadow-lg shadow-pink-500/50' 
                    : 'bg-gradient-to-b from-gray-100 to-gray-300 border-gray-400 text-gray-700'
                }`}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ duration: 0.2 }}
              >
                <span>{index + 9}</span>
                <span className="text-xs opacity-70">{noteData.note}</span>
                {recentNote && (
                  <span className="text-xs opacity-90">
                    {Math.round(recentNote.confidence)}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Recent Notes History */}
      {detectedNotes.length > 0 && (
        <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
          <h3 className="text-white/80 text-sm font-semibold mb-2">Recent Notes</h3>
          <div className="space-y-1">
            {detectedNotes.slice(-5).reverse().map((note, index) => (
              <div key={`${note.time}-${index}`} className="flex items-center justify-between text-xs text-white/70">
                <span className="font-medium">{note.note}</span>
                <span>{Math.round(note.frequency)} Hz</span>
                <span>{Math.round(note.confidence)}%</span>
                <span className="opacity-60">
                  {Math.round((Date.now() - note.time) / 1000)}s ago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording playback progress */}
      {isPlaying && recordedNotes.length > 0 && (
        <div className="bg-black/40 backdrop-blur-sm p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm">Playing Recording</span>
            <span className="text-white/60 text-sm">
              {playbackPosition + 1} / {recordedNotes.length}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${((playbackPosition + 1) / recordedNotes.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}