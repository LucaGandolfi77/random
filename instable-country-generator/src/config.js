export const TURN_LIMIT = 12;
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function isFreeModel(model) {
  return typeof model === 'string' && model.trim().endsWith(':free');
}

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function roundMetric(value) {
  return Math.round(clamp(Number.isFinite(value) ? value : 0));
}

export function getConfiguredFreeModels() {
  return Array.from(
    new Set(
      String(process.env.OPENROUTER_FREE_MODELS || '')
        .split(',')
        .map((model) => model.trim())
        .filter(isFreeModel)
    )
  );
}

export function getRuntimeConfig() {
  const configuredModels = getConfiguredFreeModels();
  const requestedDefault = String(process.env.OPENROUTER_DEFAULT_MODEL || '').trim();
  const defaultModel = isFreeModel(requestedDefault)
    ? requestedDefault
    : configuredModels[0] || '';

  return {
    apiKey: String(process.env.OPENROUTER_API_KEY || '').trim(),
    siteUrl: String(process.env.OPENROUTER_SITE_URL || 'http://localhost:3000').trim(),
    siteName: String(process.env.OPENROUTER_SITE_NAME || 'Unstable Imaginary Countries Generator').trim(),
    defaultModel,
    configuredModels
  };
}

export function normalizeRequestedModel(model, availableModels = []) {
  const normalized = String(model || '').trim();

  if (isFreeModel(normalized) && (availableModels.length === 0 || availableModels.includes(normalized))) {
    return normalized;
  }

  return availableModels[0] || '';
}