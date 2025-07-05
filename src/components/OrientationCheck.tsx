'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Smartphone } from 'lucide-react';

interface OrientationCheckProps {
  children: React.ReactNode;
}

export default function OrientationCheck({ children }: OrientationCheckProps) {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if screen is landscape
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      setIsLandscape(isLandscapeMode);
    };

    // Initial check
    checkOrientation();

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isLandscape) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <motion.div 
          className="text-center space-y-8 max-w-md"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated phone rotation icon */}
          <motion.div
            className="flex justify-center"
            animate={{ rotate: [0, 90, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="relative">
              <Smartphone size={80} className="text-white/80" />
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <RotateCcw size={24} className="text-pink-400" />
              </motion.div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-4xl font-bold text-white mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            🎹 Pink Poong Piano
          </motion.h1>

          {/* Instructions */}
          <motion.div 
            className="space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p className="text-xl text-white/90 font-semibold">
              Please rotate your device
            </p>
            <p className="text-lg text-white/70">
              This game is designed for landscape mode
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-6">
              <p className="text-sm text-white/80 leading-relaxed">
                🎮 For the best experience, rotate your device to landscape mode and place it on your piano. 
                The app will detect your piano notes in real-time!
              </p>
            </div>
          </motion.div>

          {/* Pulsing indicator */}
          <motion.div
            className="flex justify-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 bg-pink-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Landscape mode - show the main app
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
} 