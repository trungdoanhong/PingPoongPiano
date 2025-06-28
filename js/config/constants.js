// Constants and Configuration
export const GAME_CONFIG = {
    keyOrder: ['c5', 'd6', 'd5', 'e6', 'e5', 'f6', 'f5', 'g6', 'g5', 'a6', 'a5', 'b6', 'b5', 'c7', 'c6'],
    keyColors: {
        'c5': 'white-key', 'd6': 'black-key', 'd5': 'white-key', 
        'e6': 'black-key', 'e5': 'white-key', 'f6': 'black-key', 
        'f5': 'white-key', 'g6': 'black-key', 'g5': 'white-key', 
        'a6': 'black-key', 'a5': 'white-key', 'b6': 'black-key', 
        'b5': 'white-key', 'c7': 'black-key', 'c6': 'white-key'
    },
    noteFrequencies: {
        'c5': 523.25, 'd5': 587.33, 'e5': 659.25, 'f5': 698.46, 'g5': 783.99, 'a5': 880.00, 'b5': 987.77,
        'c6': 1046.50, 'd6': 1174.66, 'e6': 1318.51, 'f6': 1396.91, 'g6': 1567.98, 'a6': 1760.00, 'b6': 1975.53,
        'c7': 2093.00
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

export const UI_CONFIG = {
    modes: {
        GAME: 'game',
        ANALYZER: 'analyzer', 
        SONG_MANAGER: 'song-manager',
        ADMIN: 'admin'
    },
    notifications: {
        duration: 3000,
        types: ['info', 'success', 'warning', 'error']
    }
};

export const STORAGE_CONFIG = {
    localStorageKeys: {
        songs: 'piano_tiles_songs',
        settings: 'piano_tiles_settings',
        apiLogs: 'piano_tiles_api_logs',
        errorLogs: 'piano_tiles_error_logs'
    },
    maxLogs: 20
}; 