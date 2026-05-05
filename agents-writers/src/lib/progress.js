/**
 * Lightweight progress event emitter for SSE streaming.
 *
 * workflow.js calls emitProgress() at each agent boundary; server.js
 * subscribes active SSE connections to the 'progress' events.
 */

import { EventEmitter } from 'node:events';

export const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(100);

/**
 * Emit a single progress event.
 *
 * @param {string} event  Short event name, e.g. 'agent-start', 'agent-done', 'chapter-done'.
 * @param {object} data   Arbitrary JSON-serialisable payload.
 */
export function emitProgress(event, data = {}) {
  progressEmitter.emit('progress', {
    event,
    data,
    timestamp: new Date().toISOString()
  });
}
