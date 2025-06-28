// Audio Analyzer Module
import { AUDIO_CONFIG } from '../config/constants.js';
import { showNotification, showErrorMessage } from '../ui/notifications.js';

let audioContext;
let analyser;
let microphone;
let dataArray;
let isRecording = false;
let animationFrameId;
let audioPermissionGranted = false;
let mediaStream = null;

// Setup canvas
export function setupCanvas() {
    const waveformCanvas = document.getElementById('waveform');
    const canvasCtx = waveformCanvas.getContext('2d');
    
    console.log("Setting up canvas with dimensions:", 
        waveformCanvas.offsetWidth, waveformCanvas.offsetHeight);
    
    waveformCanvas.width = waveformCanvas.offsetWidth;
    waveformCanvas.height = waveformCanvas.offsetHeight;
    
    // Clear canvas to a clean state
    if (canvasCtx) {
        canvasCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        canvasCtx.fillStyle = 'rgba(30, 39, 46, 0.5)';
        canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    }
}

// Request audio permission
export async function requestAudioPermission() {
    try {
        console.log("Requesting audio permission...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioPermissionGranted = true;
        
        // Stop the stream immediately since we're just checking permissions
        stream.getTracks().forEach(track => track.stop());
        
        // Now initialize the audio analyzer
        setupAudioAnalyzer();
        
        console.log("Audio permission granted successfully");
        return true;
    } catch (e) {
        console.error("Could not get audio permission:", e);
        showErrorMessage("Audio analyzer requires microphone permission.");
        audioPermissionGranted = false;
        return false;
    }
}

// Initialize audio analyzer
export function setupAudioAnalyzer() {
    if (audioContext) {
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(err => {
                console.error("Error resuming audio context:", err);
            });
        }
        return;
    }
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = AUDIO_CONFIG.fftSize;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        analyser.smoothingTimeConstant = AUDIO_CONFIG.smoothingTimeConstant;
        analyser.minDecibels = AUDIO_CONFIG.minDecibels;
        analyser.maxDecibels = AUDIO_CONFIG.maxDecibels;
        
        console.log("Audio analyzer setup complete");
    } catch (e) {
        console.error("Error setting up audio analyzer:", e);
        showErrorMessage("Could not initialize audio.");
    }
}

// Start recording from microphone
export async function startAudioRecording() {
    console.log("Starting audio recording...");
    if (isRecording) return;
    
    if (!audioPermissionGranted) {
        const permissionGranted = await requestAudioPermission();
        if (!permissionGranted) return;
    }
    
    try {
        if (!audioContext) {
            setupAudioAnalyzer();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(mediaStream);
        microphone.connect(analyser);
        
        isRecording = true;
        visualizeAudio();
        
        console.log("Recording started successfully");
        showNotification("Audio recording started", "success");
    } catch (e) {
        console.error("Error starting audio recording:", e);
        showErrorMessage("Could not access microphone.");
    }
}

// Stop recording
export function stopAudioRecording() {
    console.log("Stopping audio recording...");
    if (!isRecording) return;
    
    isRecording = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    if (mediaStream) {
        try {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        } catch (e) {
            console.error("Error stopping tracks:", e);
        }
    }
    
    if (microphone) {
        try {
            microphone.disconnect();
            microphone = null;
        } catch (e) {
            console.error("Error disconnecting microphone:", e);
        }
    }
    
    console.log("Recording stopped successfully");
    showNotification("Audio recording stopped", "info");
}

// Visualize audio
function visualizeAudio() {
    if (!isRecording) return;
    
    animationFrameId = requestAnimationFrame(visualizeAudio);
    
    const waveformCanvas = document.getElementById('waveform');
    const canvasCtx = waveformCanvas.getContext('2d');
    
    analyser.getByteTimeDomainData(dataArray);
    
    canvasCtx.fillStyle = 'rgba(30, 39, 46, 0.5)';
    canvasCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(10, 189, 227)';
    canvasCtx.beginPath();
    
    const sliceWidth = waveformCanvas.width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * waveformCanvas.height / 2;
        
        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    canvasCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
    canvasCtx.stroke();
    
    if (Math.random() < 0.5) {
        analyzeFrequency();
    }
}

// Analyze frequency
function analyzeFrequency() {
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);
    
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
        }
    }
    
    const nyquist = audioContext.sampleRate / 2;
    const frequency = maxIndex * nyquist / frequencyData.length;
    
    const detectedNote = document.getElementById('detected-note');
    const detectedFrequency = document.getElementById('detected-frequency');
    
    if (maxValue > 128) {
        const note = getNote(frequency);
        if (detectedNote) detectedNote.textContent = note;
        if (detectedFrequency) detectedFrequency.textContent = frequency.toFixed(2) + " Hz";
    } else {
        if (detectedNote) detectedNote.textContent = "--";
        if (detectedFrequency) detectedFrequency.textContent = "0 Hz";
    }
}

// Convert frequency to note name
function getNote(frequency) {
    if (frequency < 27.5 || frequency > 4186) {
        return "--";
    }
    
    const noteNum = Math.round(12 * Math.log2(frequency / AUDIO_CONFIG.A4_FREQ)) + AUDIO_CONFIG.A4_NOTE;
    const noteName = AUDIO_CONFIG.NOTE_STRINGS[noteNum % 12];
    const octave = Math.floor(noteNum / 12) - 1;
    
    return noteName + octave;
}

// Initialize audio analyzer controls
export function initAudioAnalyzer() {
    const startRecording = document.getElementById('start-recording');
    const stopRecording = document.getElementById('stop-recording');
    
    if (startRecording) {
        startRecording.addEventListener('click', startAudioRecording);
    }
    
    if (stopRecording) {
        stopRecording.addEventListener('click', stopAudioRecording);
    }
    
    setupCanvas();
    console.log("Audio analyzer initialized");
} 