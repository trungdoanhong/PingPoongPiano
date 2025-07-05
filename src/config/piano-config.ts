// Piano Configuration for 15-key piano
// Order from left to right: 1, 2#, 2, 3#, 3, 4, 4#, 5, 5#, 6, 6#, 7, 7#, 8, 8#

export const GAME_CONFIG = {
    // Key order from left to right (key numbers 1-15)
    keyOrder: [1, 9, 2, 10, 3, 4, 11, 5, 12, 6, 13, 7, 14, 8, 15],
    
    // Key colors mapping
    keyColors: {
        1: 'white-key',    // C5
        2: 'white-key',    // D5  
        3: 'white-key',    // E5
        4: 'white-key',    // F5
        5: 'white-key',    // G5
        6: 'white-key',    // A5
        7: 'white-key',    // B5
        8: 'white-key',    // C6
        9: 'black-key',    // C#5/D♭5 (2#)
        10: 'black-key',   // D#5/E♭5 (3#)
        11: 'black-key',   // F#5/G♭5 (4#)
        12: 'black-key',   // G#5/A♭5 (5#)
        13: 'black-key',   // A#5/B♭5 (6#)
        14: 'black-key',   // B#5/C6 (7#)
        15: 'black-key'    // C#6/D♭6 (8#)
    },
    
    // Note frequencies for each key (Hz)
    noteFrequencies: [
        // White keys (1-8)
        261.63,  // C5 (1)
        293.66,  // D5 (2)
        329.63,  // E5 (3)
        349.23,  // F5 (4)
        392.00,  // G5 (5)
        440.00,  // A5 (6)
        493.88,  // B5 (7)
        523.25,  // C6 (8)
        // Black keys (9-15)  
        277.18,  // C#5/D♭5 (9 = 2#)
        311.13,  // D#5/E♭5 (10 = 3#)
        369.99,  // F#5/G♭5 (11 = 4#)
        415.30,  // G#5/A♭5 (12 = 5#)
        466.16,  // A#5/B♭5 (13 = 6#)
        523.25,  // B#5/C6 (14 = 7#) - equivalent to C6
        554.37   // C#6/D♭6 (15 = 8#)
    ],
    
    // Key labels for display
    keyLabels: {
        1: '1',     // C5
        2: '2',     // D5
        3: '3',     // E5
        4: '4',     // F5
        5: '5',     // G5
        6: '6',     // A5
        7: '7',     // B5
        8: '8',     // C6
        9: '2#',    // C#5/D♭5
        10: '3#',   // D#5/E♭5
        11: '4#',   // F#5/G♭5
        12: '5#',   // G#5/A♭5
        13: '6#',   // A#5/B♭5
        14: '7#',   // B#5/C6
        15: '8#'    // C#6/D♭6
    },
    
    // Musical note names
    noteNames: {
        1: 'C5',    2: 'D5',    3: 'E5',    4: 'F5',
        5: 'G5',    6: 'A5',    7: 'B5',    8: 'C6',
        9: 'C#5',   10: 'D#5',  11: 'F#5',  12: 'G#5',
        13: 'A#5',  14: 'B#5',  15: 'C#6'
    },
    
    defaultGameSpeed: 0.3,
    defaultTileSpeed: 0.2,
    minTileGap: 400,
    timePerUnit: 125 // 16th note at 120 BPM: 60000/120/4 = 125ms
};

export const AUDIO_CONFIG = {
    NOTE_STRINGS: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    A4_FREQ: 440.0,
    A4_NOTE: 69, // MIDI note number for A4
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    minDecibels: -100,
    maxDecibels: -10
};

// Helper functions
export const getKeyLabel = (keyNumber: number): string => {
    return GAME_CONFIG.keyLabels[keyNumber as keyof typeof GAME_CONFIG.keyLabels] || keyNumber.toString();
};

export const isWhiteKey = (keyNumber: number): boolean => {
    return keyNumber <= 8;
};

export const getFrequency = (keyNumber: number): number => {
    return GAME_CONFIG.noteFrequencies[keyNumber - 1] || 440;
};

export const getKeyColor = (keyNumber: number): string => {
    return GAME_CONFIG.keyColors[keyNumber as keyof typeof GAME_CONFIG.keyColors] || 'white-key';
};

// Physical layout order (left to right as seen on the piano)
export const PHYSICAL_KEY_ORDER = [1, 9, 2, 10, 3, 4, 11, 5, 12, 6, 13, 7, 14, 8, 15]; 