// Constants for Song Manager
export const PIANO_KEYS = 15;
export const KEY_HEIGHT = 30;
export const GRID_WIDTH = 50;
export const BEAT_WIDTH = GRID_WIDTH * 4;

// Note durations (in beats)
export const NOTE_DURATIONS = [
  { value: 4, label: '○', name: 'Whole Note (4 beats)' },
  { value: 2, label: '♩', name: 'Half Note (2 beats)' },
  { value: 1, label: '♪', name: 'Quarter Note (1 beat)' },
  { value: 0.5, label: '♫', name: 'Eighth Note (1/2 beat)' },
  { value: 0.25, label: '♬', name: 'Sixteenth Note (1/4 beat)' }
];

// Tools configuration
export const TOOLS = [
  { id: 'select', label: '↖️ Select', desc: 'Click notes to select, drag to move, Ctrl+Click for multi-select' },
  { id: 'pencil', label: '✏️ Draw', desc: 'Click to add notes, choose duration below' },
  { id: 'eraser', label: '🗑️ Erase', desc: 'Click notes to delete them' }
] as const;
