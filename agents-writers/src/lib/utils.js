import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson(filePath, fallback = null) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readText(filePath, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
}

export async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

export function deepMerge(base, override) {
  if (Array.isArray(base) && Array.isArray(override)) {
    return [...override];
  }

  if (isObject(base) && isObject(override)) {
    const result = { ...base };

    for (const [key, value] of Object.entries(override)) {
      result[key] = key in result ? deepMerge(result[key], value) : value;
    }

    return result;
  }

  return override === undefined ? base : override;
}

export function parseScalarValue(value) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed);

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

export function setNestedValue(target, pathParts, value) {
  let cursor = target;

  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index];
    cursor[key] ??= {};
    cursor = cursor[key];
  }

  cursor[pathParts[pathParts.length - 1]] = value;
  return target;
}

export function padChapter(chapterNumber) {
  return String(chapterNumber).padStart(2, '0');
}

export function appendUniqueStrings(target, additions) {
  const set = new Set(Array.isArray(target) ? target : []);

  for (const item of additions ?? []) {
    if (typeof item === 'string' && item.trim()) {
      set.add(item.trim());
    }
  }

  return [...set];
}

export async function loadEnv(rootPath) {
  const envPath = path.join(rootPath, '.env');
  const content = await readText(envPath, '');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

export async function setEnvVariable(rootPath, key, value) {
  const envPath = path.join(rootPath, '.env');
  const content = await readText(envPath, '');
  const lines = content ? content.split(/\r?\n/) : [];
  const nextLines = [];
  let updated = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      nextLines.push(line);
      continue;
    }

    const separatorIndex = line.indexOf('=');
    const currentKey = line.slice(0, separatorIndex).trim();
    if (currentKey === key) {
      nextLines.push(`${key}=${value}`);
      updated = true;
      continue;
    }

    nextLines.push(line);
  }

  if (!updated) {
    if (nextLines.length && nextLines.at(-1)?.trim()) {
      nextLines.push('');
    }
    nextLines.push(`${key}=${value}`);
  }

  await writeText(envPath, `${nextLines.join('\n').replace(/\n*$/g, '')}\n`);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
