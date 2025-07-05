'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  Maximize, 
  Play, 
  Mic2, 
  Music, 
  BookOpen, 
  Shield,
  Settings,
  RotateCcw,
  Volume2,
  Gauge,
  Pause,
  PlayCircle,
  ListMusic
} from 'lucide-react';
import LoginButton from './LoginButton';
import { useAuth } from '@/contexts/AuthContext';

interface ControlPanelProps {
  score: number;
  gameMode: 'piano' | 'analyzer' | 'song-manager' | 'music-theory' | 'admin';
  onModeChange: (mode: 'piano' | 'analyzer' | 'song-manager' | 'music-theory' | 'admin') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  gameSpeed: number;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
  isPaused?: boolean;
  onPause?: () => void;
  onSongSelect?: () => void;
  selectedSong?: { id: string; name: string; } | null;
  combo?: number;
  accuracy?: number;
}

export default function ControlPanel({ 
  score, 
  gameMode, 
  onModeChange, 
  isCollapsed,
  onToggleCollapse,
  gameSpeed,
  onSpeedChange,
  onRestart,
  isPaused = false,
  onPause,
  onSongSelect,
  selectedSong,
  combo = 0,
  accuracy = 100
}: ControlPanelProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isAdmin, isModerator } = useAuth();

  const allMenuItems = [
    { id: 'piano', label: 'Piano Game', icon: Play, description: 'Play falling tiles game' },
    { id: 'analyzer', label: 'Audio Analyzer', icon: Mic2, description: 'Real-time audio analysis' },
    { id: 'song-manager', label: 'Song Manager', icon: Music, description: 'Create and edit songs' },
    { id: 'music-theory', label: 'Music Theory', icon: BookOpen, description: 'Learn music theory' },
    { id: 'admin', label: 'Admin Panel', icon: Shield, description: 'User management' },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (item.id === 'admin') {
      return isAdmin || isModerator;
    }
    return true;
  });

  const currentMode = menuItems.find(item => item.id === gameMode);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isCollapsed) {
    return (
      <motion.div
        className="fixed top-1 left-1/2 transform -translate-x-1/2 z-[100]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <motion.button
          onClick={onToggleCollapse}
          className="bg-black/30 backdrop-blur-sm text-white p-1.5 rounded-md hover:bg-black/40 transition-colors cursor-pointer touch-manipulation"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu size={16} />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[90] bg-black/80 backdrop-blur-sm border-b border-white/20"
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        {/* Left Section: Score & Menu */}
        <div className="flex items-center space-x-1 md:space-x-3">
          {/* Score Display */}
          <motion.div 
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2 py-1 rounded-md font-bold text-xs md:text-sm"
            whileHover={{ scale: 1.05 }}
          >
            <span className="hidden sm:inline text-xs opacity-80">Score: </span>
            <span className="text-sm">{score.toLocaleString()}</span>
            {gameMode === 'piano' && combo > 1 && (
              <span className="text-xs ml-1 text-pink-200">{combo}x</span>
            )}
          </motion.div>

          {/* Additional Stats for Piano Mode - Hide on very small screens */}
          {gameMode === 'piano' && accuracy < 100 && (
            <motion.div 
              className="hidden md:flex bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 py-1 rounded-md text-xs"
              whileHover={{ scale: 1.05 }}
            >
              <span className="opacity-80">Acc: </span>
              <span className="font-bold ml-1">{accuracy}%</span>
            </motion.div>
          )}

          {/* Menu Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center space-x-1 bg-white/10 text-white px-2 py-1 rounded-md hover:bg-white/20 transition-colors cursor-pointer touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentMode && <currentMode.icon size={14} />}
              <span className="hidden md:inline text-xs">{currentMode?.label || 'Mode'}</span>
              <Menu size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  className="absolute top-full left-0 mt-1 w-48 bg-black/95 backdrop-blur-sm rounded-md border border-white/20 overflow-hidden z-[110]"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {menuItems.map((item) => (
                    <motion.button
                      key={item.id}
                      onClick={() => {
                        onModeChange(item.id as any);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-white/10 transition-colors cursor-pointer touch-manipulation ${
                        gameMode === item.id ? 'bg-purple-600/30 text-purple-200' : 'text-white'
                      }`}
                      whileHover={{ x: 4 }}
                    >
                      <item.icon size={14} />
                      <div>
                        <div className="font-medium text-xs">{item.label}</div>
                        <div className="text-xs opacity-70 hidden sm:block">{item.description}</div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Section: Game Controls (context-sensitive) */}
        {gameMode === 'piano' && (
          <div className="flex items-center space-x-1">
            {/* Song Selection Button */}
            {onSongSelect && (
              <motion.button
                onClick={() => {
                  console.log('Song selection button clicked');
                  const saved = localStorage.getItem('pink-poong-songs');
                  console.log('Current localStorage songs:', saved);
                  onSongSelect();
                }}
                className="flex items-center space-x-1 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md hover:bg-purple-500/30 transition-colors cursor-pointer touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ListMusic size={12} />
                <span className="hidden sm:inline text-xs">Songs</span>
              </motion.button>
            )}

            {/* Pause/Resume Button */}
            {onPause && (
              <motion.button
                onClick={() => {
                  console.log('Pause button clicked');
                  onPause();
                }}
                className="flex items-center space-x-1 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-md hover:bg-blue-500/30 transition-colors cursor-pointer touch-manipulation"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isPaused ? <PlayCircle size={12} /> : <Pause size={12} />}
                <span className="hidden sm:inline text-xs">{isPaused ? 'Play' : 'Pause'}</span>
              </motion.button>
            )}

            {/* Speed Control - Simplified for mobile */}
            <div className="flex items-center space-x-1">
              <Gauge size={10} className="text-white/70" />
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={gameSpeed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="w-10 accent-pink-500"
              />
              <span className="text-white/70 text-xs">{gameSpeed}x</span>
            </div>

            {/* Restart Button */}
            <motion.button
              onClick={() => {
                console.log('Restart button clicked');
                onRestart();
              }}
              className="flex items-center space-x-1 bg-orange-500/20 text-orange-300 px-2 py-1 rounded-md hover:bg-orange-500/30 transition-colors cursor-pointer touch-manipulation"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline text-xs">Restart</span>
            </motion.button>
          </div>
        )}

        {/* Right Section: User & Settings */}
        <div className="flex items-center space-x-1">{/* User Auth Panel */}
          <LoginButton />

          {/* Collapse Button */}
          <motion.button
            onClick={onToggleCollapse}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer touch-manipulation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
} 