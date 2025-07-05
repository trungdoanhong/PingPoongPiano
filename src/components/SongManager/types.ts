// Types for Song Manager
export interface Note {
  id: string;
  key: number;
  startTime: number;
  duration: number;
  velocity: number;
}

export interface Song {
  id: string;
  name: string;
  notes: Note[];
  bpm: number;
  duration: number;
  lastModified: number;
}

export type ToolType = 'select' | 'pencil' | 'eraser';

export interface SongManagerProps {
  isActive: boolean;
}

export interface NoteDuration {
  value: number;
  label: string;
  name: string;
}
