class VoiceController {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  init() {
    if (!this.supported) {
      console.log('[Radice] Voice Control not supported');
      return false;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'it-IT';

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      this.transcript = finalTranscript || interimTranscript;
    };

    this.recognition.onerror = (event) => {
      console.warn('[Radice] Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    return true;
  }

  startListening(callback) {
    if (!this.recognition) {
      if (!this.init()) return false;
    }

    this.isListening = true;
    this.transcript = '';
    this.recognition.start();

    const checkInterval = setInterval(() => {
      if (this.transcript && callback) {
        callback(this.transcript);
        this.transcript = '';
      }
    }, 1000);

    this._interval = checkInterval;
    return true;
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      clearInterval(this._interval);
      this.isListening = false;
    }
  }

  async processCommand(command) {
    const cmd = command.toLowerCase().trim();
    const commands = {
      'portami all\'atrio': () => ({ action: 'switchView', target: 'tree' }),
      'portami all\'albero': () => ({ action: 'switchView', target: 'tree' }),
      'vai al gufo': () => ({ action: 'switchView', target: 'owl' }),
      'vai al gacha': () => ({ action: 'switchView', target: 'gacha' }),
      'leggi la prossima': () => ({ action: 'readerNext' }),
      'leggi la pagina precedente': () => ({ action: 'readerPrev' }),
      'tira un libro': () => ({ action: 'gachaPull' }),
      'condividi': () => ({ action: 'share' }),
      'oh gufo': () => ({ action: 'owlDialogue' }),
      'aiuto': () => ({ action: 'help' }),
      'stop': () => ({ action: 'stopListening' }),
      'pausa': () => ({ action: 'stopListening' })
    };

    for (const [keyword, action] of Object.entries(commands)) {
      if (cmd.includes(keyword)) {
        return action();
      }
    }

    return { action: 'unknown', text: cmd };
  }

  getCommands() {
    return [
      'Portami all\'atrio',
      'Vai al gufo',
      'Tira un libro',
      'Leggi la prossima',
      'Oh gufo',
      'Condividi',
      'Aiuto',
      'Stop/Pausa'
    ];
  }
}

const voiceController = new VoiceController();
export default voiceController;
export { VoiceController };
