import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const AI_MODELS = {
  MODERATION: "omni-moderation-latest",
  EMBEDDING: "text-embedding-3-small",
  CHAT: "gpt-4o-mini",
  VISION: "gpt-4o-mini",
  WHISPER: "whisper-1",
} as const;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: AI_MODELS.EMBEDDING,
    input: text,
  });
  return response.data[0].embedding;
}

export async function moderateContent(text: string): Promise<{ flagged: boolean; categories: string[] }> {
  const response = await openai.moderations.create({
    model: AI_MODELS.MODERATION,
    input: text,
  });
  const result = response.results[0];
  const categories = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);
  return { flagged: result.flagged, categories };
}

export async function generateVideoMetadata(title: string, description: string) {
  const response = await openai.chat.completions.create({
    model: AI_MODELS.CHAT,
    messages: [
      {
        role: "system",
        content: `You are an SEO expert for a video platform. Generate metadata for videos.
Return JSON with: title (optimized), description (SEO-friendly, 150 chars), tags (array of 5-10 tags), suggestedChannels (array of channel slugs).`,
      },
      { role: "user", content: `Title: ${title}\nDescription: ${description}` },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(response.choices[0].message.content ?? "{}");
}
