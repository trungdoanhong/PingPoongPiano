'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface PianoKeyProps {
  keyNumber: number;
  isPressed: boolean;
  onKeyPress: (keyNumber: number) => void;
  onKeyRelease: (keyNumber: number) => void;
  isWhiteKey?: boolean;
  label?: string;
}

export default function PianoKey({ 
  keyNumber, 
  isPressed, 
  onKeyPress, 
  onKeyRelease, 
  isWhiteKey = true,
  label 
}: PianoKeyProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const displayLabel = label || keyNumber.toString();

  return (
    <motion.div
      className={`
        relative flex flex-col items-center justify-end
        h-32 w-12 sm:h-40 sm:w-16 lg:h-48 lg:w-20 rounded-lg cursor-pointer select-none
        transition-all duration-150 ease-out
        ${isPressed 
          ? 'bg-gradient-to-b from-pink-400 to-purple-600 shadow-2xl shadow-pink-500/50' 
          : isWhiteKey
            ? 'bg-gradient-to-b from-gray-100 to-gray-300 hover:from-gray-200 hover:to-gray-400'
            : 'bg-gradient-to-b from-gray-700 to-gray-900 hover:from-gray-600 hover:to-gray-800'
        }
        border-2 ${isPressed ? 'border-pink-400' : isWhiteKey ? 'border-gray-400' : 'border-gray-600'}
        shadow-lg
        touch-manipulation
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        y: isPressed ? 2 : 0,
        rotateX: isPressed ? 3 : 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => onKeyPress(keyNumber)}
      onMouseUp={() => onKeyRelease(keyNumber)}
      onTouchStart={(e) => {
        e.preventDefault(); // Prevent default touch behavior
        onKeyPress(keyNumber);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onKeyRelease(keyNumber);
      }}
    >
      {/* Key number on top (like DOIGA MUSIC) - responsive */}
      <div className={`
        absolute top-1 sm:top-2 lg:top-3 w-6 h-4 sm:w-8 sm:h-6 lg:w-10 lg:h-8 rounded-md flex items-center justify-center
        text-sm sm:text-base lg:text-lg font-bold transition-colors duration-150
        ${isPressed 
          ? 'bg-white/90 text-purple-600' 
          : isWhiteKey
            ? 'bg-gradient-to-b from-amber-400 to-orange-500 text-white'
            : 'bg-gradient-to-b from-yellow-400 to-orange-400 text-gray-900'
        }
      `}>
        <span className="text-sm sm:text-base lg:text-lg">{displayLabel}</span>
      </div>

      {/* Key number on bottom - responsive */}
      <div className={`
        mb-1 sm:mb-2 lg:mb-3 text-lg sm:text-2xl lg:text-3xl font-bold transition-colors duration-150
        ${isPressed 
          ? 'text-white' 
          : isWhiteKey 
            ? 'text-gray-700' 
            : 'text-gray-300'
        }
      `}>
        {displayLabel}
      </div>

      {/* Glow effect when pressed */}
      {isPressed && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-gradient-to-b from-pink-400/50 to-purple-600/50 blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Hover effect */}
      {isHovered && !isPressed && (
        <motion.div
          className={`absolute inset-0 rounded-lg ${
            isWhiteKey 
              ? 'bg-gradient-to-b from-blue-200/30 to-purple-200/30'
              : 'bg-gradient-to-b from-gray-500/30 to-gray-600/30'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
} 