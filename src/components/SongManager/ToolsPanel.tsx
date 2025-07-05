import React from 'react';
import { motion } from 'framer-motion';
import { Song, ToolType, NoteDuration } from './types';
import { TOOLS, NOTE_DURATIONS } from './constants';

interface ToolsPanelProps {
  selectedSong: Song;
  selectedTool: ToolType;
  selectedDuration: number;
  selectedNoteIds: Set<string>;
  masterVolume: number;
  zoom: number;
  historyIndex: number;
  historyLength: number;
  isPlaying: boolean;
  currentTime: number;
  onToolChange: (tool: ToolType) => void;
  onDurationChange: (duration: number) => void;
  onVolumeChange: (volume: number) => void;
  onZoomChange: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopyNotes: () => void;
  onDeleteSelectedNotes: () => void;
  onPlaySelectedNotes: () => void;
  onUpdateSongSettings: (updates: Partial<Song>) => void;
  onAutoScroll: () => void;
}

export default function ToolsPanel({
  selectedSong,
  selectedTool,
  selectedDuration,
  selectedNoteIds,
  masterVolume,
  zoom,
  historyIndex,
  historyLength,
  isPlaying,
  currentTime,
  onToolChange,
  onDurationChange,
  onVolumeChange,
  onZoomChange,
  onUndo,
  onRedo,
  onCopyNotes,
  onDeleteSelectedNotes,
  onPlaySelectedNotes,
  onUpdateSongSettings,
  onAutoScroll
}: ToolsPanelProps) {
  return (
    <div className="bg-black/40 backdrop-blur-sm border-t border-white/20 p-1 sm:p-2 lg:p-4 overflow-x-auto mobile-landscape-compact">
      <div className="flex flex-col space-y-2 sm:space-y-3">
        {/* Drawing Tools Row */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 justify-center sm:justify-start">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                onToolChange(tool.id as ToolType);
                console.log(`🛠️ Tool switched to: ${tool.id}`);
                // Clear selection when switching to non-select tools
                if (tool.id !== 'select') {
                  console.log('🧹 Cleared selection');
                }
              }}
              className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold transition-all duration-200 touch-manipulation mobile-landscape-button ${selectedTool === tool.id
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 active:bg-white/30'
                }`}
              title={tool.desc}
            >
              {tool.label}
            </button>
          ))}

          {/* Note Duration Selector */}
          {selectedTool === 'pencil' && (
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-white/70 text-sm">Note:</span>
              <div className="flex bg-black/60 rounded-lg p-1 space-x-1">
                {NOTE_DURATIONS.map(duration => (
                  <button
                    key={duration.value}
                    onClick={() => onDurationChange(duration.value)}
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
              <span className="text-white/50 text-xs">
                {NOTE_DURATIONS.find(d => d.value === selectedDuration)?.name}
              </span>
            </div>
          )}

          {/* Selection Actions */}
          {selectedNoteIds.size > 0 && (
            <>
              <div className="w-px h-8 bg-white/20 mx-2"></div>
              
              <div className="flex items-center space-x-1 bg-yellow-600/20 px-2 py-1 rounded">
                <span className="text-yellow-300 text-sm font-semibold">
                  {selectedNoteIds.size} Selected
                </span>
              </div>
              
              <button
                onClick={onPlaySelectedNotes}
                className="bg-green-600/20 text-green-300 px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-green-600/30 transition-colors text-sm mobile-landscape-button"
                title="Play selected notes"
              >
                🎵 Play
              </button>
              
              <button
                onClick={onDeleteSelectedNotes}
                className="bg-red-600/20 text-red-300 px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-red-600/30 transition-colors text-sm mobile-landscape-button"
                title="Delete selected notes (Del)"
              >
                🗑️ Delete
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-white/20 mx-2"></div>

          {/* Undo/Redo */}
          <button
            onClick={onUndo}
            disabled={historyIndex <= 0}
            className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold transition-all duration-200 mobile-landscape-button ${historyIndex <= 0
                ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={historyIndex >= historyLength - 1}
            className={`px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold transition-all duration-200 mobile-landscape-button ${historyIndex >= historyLength - 1
                ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>

          {/* Copy only - Paste removed */}
          {selectedNoteIds.size > 0 && (
            <button
              onClick={onCopyNotes}
              className="px-2 py-1 sm:px-3 sm:py-2 rounded-lg font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition-all duration-200 mobile-landscape-button"
              title={`Copy ${selectedNoteIds.size} Note${selectedNoteIds.size > 1 ? 's' : ''} (Ctrl+C)`}
            >
              📋 Copy ({selectedNoteIds.size})
            </button>
          )}
        </div>

        {/* Song Settings Row */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 lg:gap-3 justify-center sm:justify-start">
          {/* BPM Control */}
          <div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded">
            <span className="text-white/70 text-xs">BPM:</span>
            <input
              type="range"
              min="60"
              max="200"
              step="1"
              value={selectedSong.bpm}
              onChange={(e) => onUpdateSongSettings({ bpm: Number(e.target.value) })}
              className="w-16 accent-purple-500"
            />
            <span className="text-white text-xs w-8 text-center">{selectedSong.bpm}</span>
          </div>

          {/* Duration Control */}
          <div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded">
            <span className="text-white/70 text-xs">Length:</span>
            <input
              type="range"
              min="4"
              max="64"
              step="4"
              value={selectedSong.duration}
              onChange={(e) => onUpdateSongSettings({ duration: Number(e.target.value) })}
              className="w-16 accent-purple-500"
            />
            <span className="text-white text-xs w-8 text-center">{selectedSong.duration}B</span>
          </div>

          {/* Auto-scroll to playhead */}
          {isPlaying && (
            <button
              onClick={onAutoScroll}
              className="bg-blue-600/20 text-blue-300 px-2 py-1 sm:px-3 sm:py-2 rounded-lg hover:bg-blue-600/30 transition-colors text-sm mobile-landscape-button"
              title="Auto-scroll to current position"
            >
              🎯 Follow
            </button>
          )}

          {/* Zoom Control */}
          <div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded">
            <span className="text-white/70 text-xs">Zoom:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-16 accent-purple-500"
            />
            <span className="text-white text-xs w-8 text-center">{zoom}x</span>
          </div>

          {/* Master Volume */}
          <div className="flex items-center space-x-1 bg-black/40 px-2 py-1 rounded">
            <span className="text-white/70 text-xs">Vol:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={masterVolume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-16 accent-purple-500"
            />
            <span className="text-white text-xs w-8 text-center">{Math.round(masterVolume * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
