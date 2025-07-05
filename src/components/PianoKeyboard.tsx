'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import PianoKey from './PianoKey';
import { GAME_CONFIG, getKeyLabel, isWhiteKey, getFrequency, PHYSICAL_KEY_ORDER } from '@/config/piano-config';

interface PianoKeyboardProps {
  onNotePlay: (keyNumber: number) => void;
  gameMode: 'piano' | 'analyzer' | 'game';
}

export default function PianoKeyboard({ onNotePlay, gameMode }: PianoKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Map black keys to their position relative to white keys (based on physical layout)
  const blackKeyPositions = [
    { keyNumber: 9, position: 'after-1' },  // C#5 (2#)
    { keyNumber: 10, position: 'after-2' }, // D#5 (3#)
    { keyNumber: 11, position: 'after-4' }, // F#5 (4#)
    { keyNumber: 12, position: 'after-5' }, // G#5 (5#)
    { keyNumber: 13, position: 'after-6' }, // A#5 (6#)
    { keyNumber: 14, position: 'after-7' }, // B#5 (7#)
    { keyNumber: 15, position: 'after-8' }  // C#6 (8#)
  ];

  useEffect(() => {
    // Initialize audio context and auto-enable audio detection
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Auto-enable audio detection on mount
      const autoEnableAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioContext = audioContextRef.current!;
          
          microphoneRef.current = audioContext.createMediaStreamSource(stream);
          analyserRef.current = audioContext.createAnalyser();
          
          analyserRef.current.fftSize = 2048;
          microphoneRef.current.connect(analyserRef.current);
          
          startAudioDetection();
        } catch (error) {
          console.error('Auto microphone access failed:', error);
          setIsAudioEnabled(false); // Reset if permission denied
        }
      };
      
      autoEnableAudio();
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const enableAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = audioContextRef.current!;
      
      microphoneRef.current = audioContext.createMediaStreamSource(stream);
      analyserRef.current = audioContext.createAnalyser();
      
      analyserRef.current.fftSize = 2048;
      microphoneRef.current.connect(analyserRef.current);
      
      setIsAudioEnabled(true);
      startAudioDetection();
    } catch (error) {
      console.error('Microphone access denied:', error);
    }
  };

  const startAudioDetection = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const detectNotes = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Find dominant frequency
      let maxAmplitude = 0;
      let dominantFrequencyIndex = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxAmplitude) {
          maxAmplitude = dataArray[i];
          dominantFrequencyIndex = i;
        }
      }

      if (maxAmplitude > 100) { // Threshold for note detection
        const sampleRate = audioContextRef.current!.sampleRate;
        const frequency = dominantFrequencyIndex * sampleRate / (2 * bufferLength);
        
        // Map frequency to piano key
        const detectedKey = findClosestKey(frequency);
        if (detectedKey !== -1) {
          handleKeyPress(detectedKey);
          setTimeout(() => handleKeyRelease(detectedKey), 200);
        }
      }

      requestAnimationFrame(detectNotes);
    };

    detectNotes();
  };

  const findClosestKey = (frequency: number): number => {
    let closestKey = -1;
    let minDifference = Infinity;

    // Check all 15 keys
    for (let keyNum = 1; keyNum <= 15; keyNum++) {
      const keyFreq = getFrequency(keyNum);
      const difference = Math.abs(frequency - keyFreq);
      if (difference < minDifference && difference < 50) { // 50Hz tolerance
        minDifference = difference;
        closestKey = keyNum;
      }
    }

    return closestKey;
  };

  const handleKeyPress = (keyNumber: number) => {
    setPressedKeys(prev => new Set([...prev, keyNumber]));
    onNotePlay(keyNumber);
    
    // Play note sound
    playNote(keyNumber);
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleKeyRelease = (keyNumber: number) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(keyNumber);
      return newSet;
    });
  };

  // Play note sound
  const playNote = (keyNumber: number, duration: number = 0.3) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = getFrequency(keyNumber);
    oscillator.type = 'sine';

    // Volume and envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  };

  return (
    <div className="flex flex-col items-center space-y-1 sm:space-y-4 piano-keyboard-container">

      {/* Piano Keyboard - optimized for mobile landscape with larger keys */}
      <motion.div 
        className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 sm:p-3 lg:p-6 rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-2xl"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative">
          {/* Black keys row - improved spacing for DOIGA MUSIC layout */}
          <div className="flex justify-center space-x-1 sm:space-x-2 lg:space-x-3 mb-2 sm:mb-3">
            {blackKeyPositions.map(({ keyNumber, position }) => (
              <div
                key={keyNumber}
                className={`relative ${
                  position === 'after-1' ? 'ml-3 sm:ml-4 lg:ml-8' :
                  position === 'after-2' ? 'ml-3 sm:ml-4 lg:ml-8' :
                  position === 'after-4' ? 'ml-6 sm:ml-8 lg:ml-16' :
                  position === 'after-5' ? 'ml-3 sm:ml-4 lg:ml-8' :
                  position === 'after-6' ? 'ml-3 sm:ml-4 lg:ml-8' :
                  position === 'after-7' ? 'ml-3 sm:ml-4 lg:ml-8' :
                  'ml-3 sm:ml-4 lg:ml-8'
                }`}
              >
                <div className="scale-90 sm:scale-90 lg:scale-100 origin-top">
                  <PianoKey
                    keyNumber={keyNumber}
                    isPressed={pressedKeys.has(keyNumber)}
                    onKeyPress={handleKeyPress}
                    onKeyRelease={handleKeyRelease}
                    isWhiteKey={false}
                    label={getKeyLabel(keyNumber)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* White keys row - improved spacing */}
          <div className="flex space-x-1 sm:space-x-2 lg:space-x-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(keyNumber => (
              <PianoKey
                key={keyNumber}
                keyNumber={keyNumber}
                isPressed={pressedKeys.has(keyNumber)}
                onKeyPress={handleKeyPress}
                onKeyRelease={handleKeyRelease}
                isWhiteKey={true}
                label={getKeyLabel(keyNumber)}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Game Mode Indicator - compact for mobile */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
          gameMode === 'piano' ? 'bg-blue-400' :
          gameMode === 'analyzer' ? 'bg-green-400' :
          'bg-purple-400'
        }`}></div>
        <span className="text-xs sm:text-sm text-gray-400 capitalize">
          {gameMode} Mode - 15 Keys
        </span>
      </div>
    </div>
  );
} 