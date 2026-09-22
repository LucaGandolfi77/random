// js/gestureRecognition.js — Hand gesture recognition via camera (WebNN stub)

export class GestureRecognition {
  constructor() {
    this.active = false;
    this.video = null;
    this.lastGesture = null;
    this.onGesture = null;
  }

  async init() {
    // Stub: Would use MediaPipe Hands or TensorFlow.js
    console.warn('Gesture recognition requires MediaPipe or TensorFlow.js');
    return false;
  }

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
    if (this.video) {
      this.video.srcObject?.getTracks().forEach(t => t.stop());
      this.video = null;
    }
  }

  getGesture() {
    return this.lastGesture;
  }

  isSupported() {
    return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  }
}
