// Audio utilities for Song Manager
import { getFrequency } from '@/config/piano-config';

export class AudioManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  playNote(keyNumber: number, duration: number = 0.5, velocity: number = 100, masterVolume: number = 0.5) {
    if (!this.audioContext) {
      console.warn('No AudioContext available');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const frequency = getFrequency(keyNumber);
      if (!frequency || frequency <= 0) {
        console.warn(`Invalid frequency for key ${keyNumber}: ${frequency}`);
        return;
      }

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const volume = Math.max(0, Math.min(1, (velocity / 127) * masterVolume * 0.3));
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      // Prevent clicking sounds at the end
      const fadeOutStart = this.audioContext.currentTime + Math.max(0, duration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, fadeOutStart + 0.05);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);

      // Clean up after playback
      oscillator.addEventListener('ended', () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Already disconnected, ignore
        }
      });

      console.log(`Playing note: key=${keyNumber}, freq=${frequency.toFixed(1)}Hz, duration=${duration.toFixed(2)}s, velocity=${velocity}`);
    } catch (error) {
      console.error('Error in playNote:', error);
    }
  }

  close() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
