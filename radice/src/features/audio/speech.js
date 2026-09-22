import AudioEngine from './index.js';

class SpeechSynthesizer {
  constructor() {
    this.speechAPI = window.speechSynthesis || null;
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  get isSupported() {
    return !!this.speechAPI;
  }

  async speak(text, options = {}) {
    if (!this.isSupported) {
      console.warn('Speech Synthesis not supported');
      return false;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;
    utterance.lang = options.lang || 'it-IT';
    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend = () => { this.isSpeaking = false; };
    utterance.onerror = (e) => {
      console.warn('Speech error:', e);
      this.isSpeaking = false;
    };

    this.currentUtterance = utterance;
    this.speechAPI.speak(utterance);
    return true;
  }

  stop() {
    if (this.speechAPI && this.isSpeaking) {
      this.speechAPI.cancel();
      this.isSpeaking = false;
    }
  }

  pause() {
    if (this.speechAPI && this.isSpeaking) {
      this.speechAPI.pause();
    }
  }

  resume() {
    if (this.speechAPI) {
      this.speechAPI.resume();
    }
  }

  getVoices() {
    if (!this.speechAPI) return [];
    return this.speechAPI.getVoices().filter(v => v.lang.startsWith('it') || v.lang.startsWith('en'));
  }

  async readStory(storyText, onChunk) {
    if (!this.isSupported) return false;

    const words = storyText.split(' ');
    const chunkSize = 20;

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      await this.speak(chunk, { rate: 0.85 });
      while (this.isSpeaking) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (onChunk) onChunk(Math.min(i + chunkSize, words.length), words.length);
      await new Promise(r => setTimeout(r, 500));
    }

    return true;
  }
}

const synthesizer = new SpeechSynthesizer();
export default synthesizer;
export { SpeechSynthesizer };
