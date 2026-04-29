import { clamp, isFreeModel } from '../config.js';
import { AGENT_DEFINITIONS, METRIC_KEYS } from './catalog.js';

function toText(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

function extractJson(text) {
  const normalized = toText(text);
  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return normalized.slice(firstBrace, lastBrace + 1);
}

export function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  const normalized = toText(value);

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    const extracted = extractJson(normalized);

    if (!extracted) {
      return null;
    }

    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

function normalizeExpectedEffect(rawExpectedEffect = {}) {
  if (!rawExpectedEffect || typeof rawExpectedEffect !== 'object' || Array.isArray(rawExpectedEffect)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawExpectedEffect)
      .filter(([key]) => METRIC_KEYS.includes(key))
      .map(([key, value]) => [key, Math.round(clamp(Number(value) || 0, -20, 20))])
  );
}

function normalizeTarget(rawTarget, regions = []) {
  const target = toText(rawTarget, 'nationwide').toLowerCase();

  if (!target || ['nationwide', 'national', 'statewide', 'countrywide', 'all'].includes(target)) {
    return 'nationwide';
  }

  const region = regions.find(
    (entry) =>
      target === entry.slot.toLowerCase() ||
      target.includes(entry.slot.toLowerCase()) ||
      target.includes(entry.name.toLowerCase())
  );

  return region ? region.slot : 'nationwide';
}

export function sanitizeAgentAction(payload, agentKey, regions = []) {
  const definition = AGENT_DEFINITIONS[agentKey];
  const rawActionType = toText(payload?.actionType || payload?.action_type || definition.defaultAction);
  const actionType = definition.actionTypes.includes(rawActionType)
    ? rawActionType
    : definition.defaultAction;

  return {
    agentKey,
    agentName: definition.name,
    actionType,
    target: normalizeTarget(payload?.target, regions),
    intensity: Math.round(clamp(Number(payload?.intensity) || 55, 10, 100)),
    rationale: toText(payload?.rationale, `${definition.name} reacts to mounting pressure.`).slice(0, 220),
    expectedEffect: normalizeExpectedEffect(payload?.expectedEffect || payload?.expected_effect),
    source: 'openrouter'
  };
}

export function sanitizeSummary(payload, fallback) {
  const reasons = Array.isArray(payload?.reasons)
    ? payload.reasons.map((reason) => toText(reason)).filter(Boolean).slice(0, 3)
    : [];

  return {
    headline: toText(payload?.headline, fallback.headline).slice(0, 120),
    summary: toText(payload?.summary, fallback.summary).slice(0, 320),
    reasons: reasons.length > 0 ? reasons : fallback.reasons.slice(0, 3)
  };
}

export function ensureFreeModel(model) {
  return isFreeModel(model) ? model : '';
}