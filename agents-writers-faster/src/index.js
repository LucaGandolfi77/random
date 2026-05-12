#!/usr/bin/env node

import { withActionLog } from './lib/action-log.js';
import { startAutoMode } from './lib/auto-mode.js';
import { exportBundle } from './lib/exporter.js';
import { startUiServer } from './lib/server.js';
import {
  applyPreset,
  createBook,
  generateBook,
  generateChapter,
  getStatus,
  initBook,
  planBook,
  selectBook,
  setBehavior,
  writeBook,
  translateChapter
} from './lib/workflow.js';

async function main() {
  const rootPath = process.cwd();
  const [command, ...rest] = process.argv.slice(2);

  const result = await withActionLog(rootPath, {
    source: 'cli',
    action: command || 'help',
    input: {
      argv: process.argv.slice(2),
      rawArgs: rest
    }
  }, async () => {
    switch (command) {
      case 'init-book': {
        const options = parseFlags(rest);
        return initBook(rootPath, options);
      }

      case 'new-book': {
        const options = parseFlags(rest);
        return createBook(rootPath, options);
      }

      case 'write-book': {
        const options = parseFlags(rest);
        return writeBook(rootPath, options);
      }

      case 'plan-book': {
        const options = parseFlags(rest);
        return planBook(rootPath, options);
      }

      case 'use-book': {
        const options = parseFlags(rest);
        const bookId = options.bookId || rest[0];
        if (!bookId) {
          throw new Error('Usage: npm run use-book -- --book-id <id>');
        }

        return selectBook(rootPath, bookId);
      }

      case 'generate': {
        const options = parseFlags(rest);
        return generateChapter(rootPath, options);
      }

      case 'generate-book': {
        const options = parseFlags(rest);
        return generateBook(rootPath, options);
      }

      case 'translate': {
        const options = parseFlags(rest);
        return translateChapter(rootPath, options);
      }

      case 'set': {
        const [agentName, key, rawValue] = rest;
        if (!agentName || !key || rawValue === undefined) {
          throw new Error('Usage: npm run set -- <agent> <behaviorKey> <value>');
        }

        return setBehavior(rootPath, agentName, key, rawValue);
      }

      case 'preset': {
        const presetName = rest.join(' ').trim();
        if (!presetName) {
          throw new Error('Usage: npm run preset -- "Preset Name"');
        }

        return applyPreset(rootPath, presetName);
      }

      case 'status': {
        return getStatus(rootPath);
      }

      case 'export': {
        const options = parseFlags(rest);
        return exportBundle(rootPath, options);
      }

      case 'serve-ui': {
        const options = parseFlags(rest);
        return startUiServer(rootPath, options);
      }

      case 'auto': {
        const options = parseFlags(rest);
        return startAutoMode(rootPath, options);
      }

      default:
        return {
          message: 'Available commands: init-book, new-book, write-book, plan-book, use-book, generate, generate-book, translate, export, set, preset, status, serve-ui, auto.'
        };
    }
  });

  print(result);
}

function parseFlags(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const key = camelCase(token.slice(2));
    const nextToken = args[index + 1];

    if (!nextToken || nextToken.startsWith('--')) {
      options[key] = true;
      continue;
    }

    if (key === 'theme') {
      options[key] ??= [];
      options[key].push(nextToken);
    } else {
      options[key] = nextToken;
    }

    index += 1;
  }

  return options;
}

function camelCase(input) {
  return input.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
