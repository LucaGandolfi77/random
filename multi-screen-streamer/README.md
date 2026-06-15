# Multi-Screen Streamer PWA

A Progressive Web App for streaming Android device screens to TV with multi-viewport control capabilities.

## Features

- **Screen Capture**: Uses `getDisplayMedia()` API for screen streaming
- **Multi-Grid System**: Dynamic grid layouts (1x1, 2x2, 3x3)
- **Control Modes**: Unified, Split, Focus, and Presenter modes
- **P2P WebRTC**: Low-latency streaming with Socket.IO signaling
- **TV Optimized**: Fullscreen immersive experience with remote control support

## Installation

### Prerequisites
- Node.js 20+
- Modern Android browser (Chrome 130+, Samsung Internet 22+)

### Setup

1. Install dependencies:
```bash
npm install
cd server && npm install
```

2. Start development server:
```bash
npm run dev
```

3. Start signaling server (in another terminal):
```bash
cd server && npm run dev
```

## Deployment

### Firebase
```bash
npm run build
firebase deploy
```

### Netlify
```bash
npm run build
netlify deploy --prod
```

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Android Phone  │◄────────┤  Control Panel   │
│  (PWA Client)   │  WS     │  (Browser/TV)    │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ getDisplayMedia()         │ WebSocket
         ▼                           ▼
┌─────────────────┐         ┌──────────────────┐
│  WebRTC Stream  │◄────────┤  Multi-Grid UI   │
│  (Screen Data)  │         │  (React + Canvas)│
└─────────────────┘         └──────────────────┘
```

## Usage

1. Open the app on your phone
2. Scan the QR code on your TV browser
3. Select grid mode and control mode
4. Tap "Start Screen Stream" and select screen to share
5. Control appears on TV with multiple viewports

## Security

- End-to-end encryption for screen data
- Session timeout after 30 minutes
- No data stored on server (pure P2P WebRTC)