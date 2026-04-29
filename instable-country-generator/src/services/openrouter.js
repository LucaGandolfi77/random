import { OPENROUTER_CHAT_URL, OPENROUTER_MODELS_URL } from '../config.js';

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestOpenRouter(url, options, retries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`OpenRouter temporary failure: ${response.status}`);
        await delay(350 * (attempt + 1));
        continue;
      }

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(`OpenRouter request failed with ${response.status}: ${payload}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(350 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export async function discoverFreeModels(runtimeConfig) {
  const headers = {
    Accept: 'application/json'
  };

  if (runtimeConfig.apiKey) {
    headers.Authorization = `Bearer ${runtimeConfig.apiKey}`;
  }

  const payload = await requestOpenRouter(
    OPENROUTER_MODELS_URL,
    {
      method: 'GET',
      headers
    },
    1
  );

  const remoteModels = Array.isArray(payload?.data)
    ? payload.data
        .map((entry) => entry.id)
        .filter((id) => typeof id === 'string' && id.endsWith(':free'))
        .sort((left, right) => left.localeCompare(right))
    : [];

  const combined = new Set([...runtimeConfig.configuredModels, ...remoteModels]);
  return [...combined];
}

export async function requestJsonCompletion({ runtimeConfig, model, messages, temperature = 0.7, maxTokens = 450 }) {
  const response = await requestOpenRouter(
    OPENROUTER_CHAT_URL,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${runtimeConfig.apiKey}`,
        'HTTP-Referer': runtimeConfig.siteUrl,
        'X-Title': runtimeConfig.siteName
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages
      })
    },
    2
  );

  const content = response?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenRouter returned an empty completion.');
  }

  return content;
}