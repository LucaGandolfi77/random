// js/collaborative.js — Multiplayer collaborative mode (WebRTC stub)

export class CollaborativeMode {
  constructor() {
    this.connected = false;
    this.peers = new Map();
    this.localId = null;
    this.roomId = null;
  }

  async connect(roomId) {
    // Stub: WebRTC signaling would go here
    // Requires a signaling server (e.g., PeerJS, Socket.io)
    console.warn('Collaborative mode requires a signaling server');
    return false;
  }

  disconnect() {
    this.connected = false;
    this.peers.clear();
    this.localId = null;
    this.roomId = null;
  }

  broadcast(action) {
    if (!this.connected) return;
    // Stub: Send action to all peers via WebRTC data channels
    for (const [id, peer] of this.peers) {
      try {
        peer.send(JSON.stringify(action));
      } catch {}
    }
  }

  onAction(callback) {
    // Stub: Register callback for incoming peer actions
    this._actionCallback = callback;
  }

  isConnected() {
    return this.connected;
  }

  getPeerCount() {
    return this.peers.size;
  }
}
