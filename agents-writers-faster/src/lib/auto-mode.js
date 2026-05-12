import { spawn } from 'node:child_process';

import { withActionLog } from './action-log.js';
import { getStatus } from './workflow.js';

const DEFAULT_PORT = 4174;

export async function startAutoMode(rootPath, options = {}) {
  return withActionLog(rootPath, {
    source: 'auto',
    action: 'start-auto-mode',
    input: { options }
  }, async () => {
    const port = Number(options.port || DEFAULT_PORT);
    const url = `http://127.0.0.1:${port}`;
    const serverAlive = await isServerAlive(`${url}/api/status`);
    const server = serverAlive
      ? {
          message: 'UI server already running.',
          url,
          reused: true
        }
      : await launchDetachedUi(rootPath, port, url);
    const status = await getStatus(rootPath);

    return {
      message: 'Project started in auto mode with standard defaults.',
      mode: 'auto',
      defaults: {
        port,
        preset: 'none',
        activeBookId: status.activeBookId,
        title: status.title,
        generation: {
          count: 3,
          length: 'short chapter'
        }
      },
      server,
      status
    };
  });
}

async function launchDetachedUi(rootPath, port, url) {
  const child = spawn(process.execPath, ['src/index.js', 'serve-ui', '--', '--port', String(port)], {
    cwd: rootPath,
    detached: true,
    stdio: 'ignore'
  });

  child.unref();
  await waitForServer(`${url}/api/status`);

  return {
    message: 'UI server started.',
    url,
    reused: false,
    pid: child.pid
  };
}

async function isServerAlive(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 800);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(url, retries = 20, delayMs = 250) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (await isServerAlive(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Auto mode could not confirm the UI server at ${url}`);
}
