'use strict';

/* VNC screen connector — ESM module loaded on demand by app.js */

import RFB from '/vendor/novnc/core/rfb.js';

let rfb = null;
let ws = null;

export function connectScreen(canvas, creds) {
  if (!canvas || !creds) {
    console.warn('VNC: no canvas or credentials');
    return;
  }

  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(proto + location.host + '/vnc');

  ws.onopen = () => {
    const msg = {
      type: 'connect',
      host: creds.host,
      port: creds.port,
      username: creds.username,
      vncHost: creds.vncHost || '127.0.0.1',
      vncPort: creds.vncPort || 5900,
      token: creds.token || undefined,
    };
    if (creds.privateKey) {
      msg.privateKey = creds.privateKey;
      if (creds.passphrase) msg.passphrase = creds.passphrase;
    }
    if (creds.password) msg.password = creds.password;
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (ev) => {
    if (typeof ev.data !== 'string') return;

    let pkt;
    try { pkt = JSON.parse(ev.data); } catch { return; }

    if (pkt.type === 'vnc-ready') {
      // Hand the WebSocket to noVNC RFB
      if (rfb) try { rfb.disconnect(); } catch {}
      rfb = new RFB(canvas, ws, {
        credentials: { password: creds.vncPassword || '' },
      });
      canvas.rfb = rfb;

      rfb.addEventListener('connect', () => {
        console.log('VNC connected');
      });
      rfb.addEventListener('disconnect', (e) => {
        console.log('VNC disconnected', e.detail);
        rfb = null;
        ws = null;
      });
      rfb.addEventListener('securityfailure', (e) => {
        console.error('VNC security', e.detail);
      });
      rfb.addEventListener('credentialsrequired', (e) => {
        const pwd = prompt('VNC password required:');
        if (pwd) rfb.sendCredentials({ password: pwd });
      });
    } else if (pkt.type === 'error') {
      console.error('VNC error:', pkt.message);
    } else if (pkt.type === 'status') {
      console.log('VNC status:', pkt.message);
    }
  };

  ws.onerror = (e) => {
    console.error('VNC WebSocket error', e);
  };

  ws.onclose = () => {
    if (rfb) { try { rfb.disconnect(); } catch {} rfb = null; }
    canvas.rfb = null;
    ws = null;
  };
}

export function disconnectScreen() {
  if (rfb) { try { rfb.disconnect(); } catch {} rfb = null; }
  if (ws) { try { ws.close(); } catch {} ws = null; }
}
