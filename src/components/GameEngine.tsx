'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FallingTile {
  id: number;
  key: number;
  y: number;
  speed: number;
  color: string;
  type: 'normal' | 'bonus' | 'combo';
}

interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  accuracy: number;
}

interface GameEngineProps {
  gameSpeed: number;
  onScoreChange: (score: number) => void;
  onGameStateChange: (state: 'idle' | 'playing' | 'paused' | 'gameOver') => void;
  onNoteHit: (keyNumber: number, timing: 'perfect' | 'good' | 'miss') => void;
  isActive: boolean;
  onKeyPress?: (handler: (keyNumber: number) => void) => void;
}

export default function GameEngine({ 
  gameSpeed, 
  onScoreChange, 
  onGameStateChange, 
  onNoteHit,
  isActive,
  onKeyPress 
}: GameEngineProps) {
  const [tiles, setTiles] = useState<FallingTile[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameOver'>('idle');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    accuracy: 0
  });
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, color: string}>>([]);
  const gameLoopRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const spawnTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const tileIdCounter = useRef(0);

  // Game constants
  const TILE_SPEED_BASE = 1.5;
  const SPAWN_INTERVAL = 1000; // ms
  const HIT_ZONE_TOP = 75;
  const HIT_ZONE_BOTTOM = 85;
  const PERFECT_THRESHOLD = 2;
  const GOOD_THRESHOLD = 5;

  // Start game
  const startGame = useCallback(() => {
    setGameState('playing');
    setStats({
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfect: 0,
      good: 0,
      miss: 0,
      accuracy: 0
    });
    setTiles([]);
    setParticles([]);
    onGameStateChange('playing');
  }, [onGameStateChange]);

  // End game
  const endGame = useCallback(() => {
    setGameState('gameOver');
    onGameStateChange('gameOver');
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }
    if (spawnTimerRef.current) {
      clearInterval(spawnTimerRef.current);
    }
  }, [onGameStateChange]);

  // Spawn new tile
  const spawnTile = useCallback(() => {
    if (gameState !== 'playing') return;

    const keyNumber = Math.floor(Math.random() * 8) + 1;
    const tileType = Math.random() < 0.1 ? 'bonus' : Math.random() < 0.05 ? 'combo' : 'normal';
    
    const newTile: FallingTile = {
      id: tileIdCounter.current++,
      key: keyNumber,
      y: -10,
      speed: TILE_SPEED_BASE * gameSpeed * (0.8 + Math.random() * 0.4),
      color: tileType === 'bonus' ? 'gold' : tileType === 'combo' ? 'rainbow' : 'pink',
      type: tileType
    };

    setTiles(prev => [...prev, newTile]);
  }, [gameState, gameSpeed]);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing' && isActive) {
      gameLoopRef.current = setInterval(() => {
        setTiles(prev => {
          const updatedTiles = prev.map(tile => ({
            ...tile,
            y: tile.y + tile.speed
          }));

          // Remove tiles that went off screen and count as miss
          const onScreenTiles = updatedTiles.filter(tile => {
            if (tile.y > 100) {
              // Miss
              setStats(s => ({
                ...s,
                miss: s.miss + 1,
                combo: 0,
                accuracy: ((s.perfect + s.good) / (s.perfect + s.good + s.miss + 1)) * 100
              }));
              return false;
            }
            return true;
          });

          return onScreenTiles;
        });
      }, 16); // ~60 FPS

      // Spawn tiles
      spawnTimerRef.current = setInterval(spawnTile, SPAWN_INTERVAL / gameSpeed);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState, isActive, gameSpeed, spawnTile]);

  // Handle key press
  const handleKeyPress = useCallback((keyNumber: number) => {
    if (gameState !== 'playing') {
      if (gameState === 'idle') {
        startGame();
      }
      return;
    }

    const hitTile = tiles.find(tile => 
      tile.key === keyNumber && 
      tile.y >= HIT_ZONE_TOP - GOOD_THRESHOLD && 
      tile.y <= HIT_ZONE_BOTTOM + GOOD_THRESHOLD
    );

    if (hitTile) {
      const distance = Math.abs(hitTile.y - (HIT_ZONE_TOP + HIT_ZONE_BOTTOM) / 2);
      const timing = distance <= PERFECT_THRESHOLD ? 'perfect' : 
                    distance <= GOOD_THRESHOLD ? 'good' : 'miss';

      // Calculate score
      let points = 0;
      if (timing === 'perfect') {
        points = 100 * (stats.combo + 1);
        if (hitTile.type === 'bonus') points *= 2;
        if (hitTile.type === 'combo') points *= 3;
      } else if (timing === 'good') {
        points = 50 * Math.max(1, stats.combo);
        if (hitTile.type === 'bonus') points *= 1.5;
      }

      // Update stats
      setStats(prev => {
        const newCombo = timing === 'miss' ? 0 : prev.combo + 1;
        const newScore = prev.score + points;
        const newStats = {
          ...prev,
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          [timing]: prev[timing] + 1,
          accuracy: ((prev.perfect + prev.good + (timing === 'perfect' ? 1 : 0) + (timing === 'good' ? 1 : 0)) / 
                    (prev.perfect + prev.good + prev.miss + 1)) * 100
        };
        onScoreChange(newScore);
        return newStats;
      });

      // Create particles
      const keyPosition = 12 + (keyNumber - 1) * 72;
      for (let i = 0; i < 5; i++) {
        setParticles(prev => [...prev, {
          id: Date.now() + i,
          x: keyPosition + Math.random() * 60,
          y: 80 + Math.random() * 20,
          color: timing === 'perfect' ? '#ffd700' : timing === 'good' ? '#00ff00' : '#ff0000'
        }]);
      }

      // Remove hit tile
      setTiles(prev => prev.filter(tile => tile.id !== hitTile.id));
      onNoteHit(keyNumber, timing);

      // Remove particles after animation
      setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id < Date.now() - 500));
      }, 1000);
    }
  }, [tiles, gameState, stats, onScoreChange, onNoteHit, startGame]);

  // Expose handleKeyPress to parent
  useEffect(() => {
    if (onKeyPress) {
      onKeyPress(handleKeyPress);
    }
  }, [handleKeyPress, onKeyPress]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Falling Tiles */}
      <AnimatePresence>
        {tiles.map(tile => (
          <motion.div
            key={tile.id}
            className={`absolute w-12 h-8 rounded-lg shadow-lg border-2 ${
              tile.type === 'bonus' ? 'bg-gradient-to-b from-yellow-400 to-orange-500 border-yellow-300' :
              tile.type === 'combo' ? 'bg-gradient-to-b from-purple-400 to-pink-500 border-purple-300' :
              'bg-gradient-to-b from-pink-400 to-purple-600 border-pink-300'
            }`}
            style={{
              left: `${12 + (tile.key - 1) * 72}px`,
              top: `${tile.y}%`,
            }}
            initial={{ scale: 0, rotate: 0 }}
            animate={{ 
              scale: 1, 
              rotate: tile.type === 'combo' ? 360 : 0,
              boxShadow: tile.type === 'bonus' ? '0 0 20px rgba(255, 215, 0, 0.6)' : 
                         tile.type === 'combo' ? '0 0 20px rgba(168, 85, 247, 0.6)' : 
                         '0 0 10px rgba(236, 72, 153, 0.4)'
            }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.2 }
            }}
          >
            {/* Tile number */}
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
              {tile.key}
            </div>
            
            {/* Special effects */}
            {tile.type === 'bonus' && (
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/50 to-orange-500/50 rounded-lg animate-pulse" />
            )}
            {tile.type === 'combo' && (
              <div className="absolute inset-0 bg-gradient-to-b from-purple-400/50 to-pink-500/50 rounded-lg animate-ping" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Hit Zone Indicator */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${HIT_ZONE_TOP}%` }}>
        <div className="h-16 bg-gradient-to-b from-green-400/20 to-green-600/20 border-t-2 border-b-2 border-green-400/50 backdrop-blur-sm">
          <div className="h-full flex items-center justify-center">
            <div className="bg-green-400/30 px-4 py-1 rounded-full">
              <span className="text-green-200 text-sm font-semibold">HIT ZONE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Particles */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: particle.x,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 1, 0],
              opacity: [1, 1, 0],
              y: [-20, -40, -60]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        ))}
      </AnimatePresence>

      {/* Game Stats Overlay */}
      {gameState === 'playing' && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm p-4 rounded-lg text-white pointer-events-none">
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold text-pink-400">
              {stats.combo > 0 && <span className="text-lg">×{stats.combo} </span>}
              {stats.score.toLocaleString()}
            </div>
            <div className="text-sm text-white/70">
              <span className="text-green-400">Perfect: {stats.perfect}</span> | 
              <span className="text-yellow-400"> Good: {stats.good}</span> | 
              <span className="text-red-400"> Miss: {stats.miss}</span>
            </div>
            <div className="text-xs text-white/50">
              Accuracy: {stats.accuracy.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameOver' && (
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="bg-gradient-to-b from-purple-900/90 to-blue-900/90 backdrop-blur-sm p-8 rounded-2xl text-center max-w-md mx-4">
            <h2 className="text-3xl font-bold text-white mb-4">🎮 Game Over!</h2>
            <div className="space-y-4 text-white">
              <div className="text-4xl font-bold text-pink-400">
                {stats.score.toLocaleString()}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/10 p-3 rounded-lg">
                  <div className="text-green-400 font-semibold">Perfect</div>
                  <div className="text-2xl">{stats.perfect}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-lg">
                  <div className="text-yellow-400 font-semibold">Good</div>
                  <div className="text-2xl">{stats.good}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-lg">
                  <div className="text-red-400 font-semibold">Miss</div>
                  <div className="text-2xl">{stats.miss}</div>
                </div>
                <div className="bg-white/10 p-3 rounded-lg">
                  <div className="text-blue-400 font-semibold">Max Combo</div>
                  <div className="text-2xl">{stats.maxCombo}</div>
                </div>
              </div>
              <div className="text-lg">
                <span className="text-white/70">Accuracy: </span>
                <span className="text-purple-400 font-bold">{stats.accuracy.toFixed(1)}%</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="mt-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
            >
              🔄 Play Again
            </button>
          </div>
        </motion.div>
      )}

      {/* Click handler */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        onClick={() => {
          // This will be handled by the parent component
        }}
      />
    </div>
  );
} 