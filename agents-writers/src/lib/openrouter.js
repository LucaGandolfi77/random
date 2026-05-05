function extractJsonObject(content) {
  const normalized = String(content ?? '').trim();

  if (!normalized) {
    throw new Error('Model returned an empty response.');
  }

  try {
    return JSON.parse(normalized);
  } catch {
    // Continue.
  }

  const fencedMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {
      // Continue.
    }
  }

  const firstBrace = normalized.indexOf('{');
  const lastBrace = normalized.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = normalized.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  throw new Error(`Could not parse JSON from model response:\n${normalized}`);
}

export async function callOpenRouter({
  apiKey,
  appTitle,
  httpReferer,
  model,
  systemPrompt,
  input,
  temperature,
  maxTokens,
  dryRun = false
}) {
  if (dryRun) {
    return {
      model,
      raw: JSON.stringify({ dryRun: true, input }, null, 2),
      data: {
        type: 'dry_run',
        model,
        echoed_input: input
      }
    };
  }

  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY. Copy .env.example to .env and set the key.');
  }

  // 30-second timeout per request — prevents indefinite hangs on slow free models.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response;

  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': httpReferer || 'https://localhost',
        'X-Title': appTitle || 'Book Agents Lab'
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: JSON.stringify(input, null, 2)
          }
        ]
      })
    });
  } catch (fetchError) {
    if (fetchError.name === 'AbortError') {
      throw new Error(`OpenRouter request timed out after 30s for model ${model}.`);
    }

    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`OpenRouter request failed for ${model}: ${payload.error?.message || response.statusText}`);
  }

  const messageContent = payload.choices?.[0]?.message?.content;
  const raw = Array.isArray(messageContent)
    ? messageContent.map((part) => part.text || part.content || '').join('\n')
    : String(messageContent ?? '');

  return {
    model,
    raw,
    data: extractJsonObject(raw)
  };
}
