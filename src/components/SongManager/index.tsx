import React from 'react';
import { Song, ToolType } from './types';

interface SongManagerProps {
  isActive: boolean;
}

// This will be the main entry point that imports and orchestrates all the sub-components
export default function SongManager({ isActive }: SongManagerProps) {
  // For now, import the full component until we complete the refactoring
  const FullSongManager = require('../SongManager').default;
  return <FullSongManager isActive={isActive} />;
}
