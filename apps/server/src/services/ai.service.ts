import Anthropic from "@anthropic-ai/sdk";
import { getValue, setValue } from "../lib/redis";

const client =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null;

// ─── Claude call with strict JSON enforcement ─────────────────────────────────

async function callClaude(prompt: string, maxTokens = 400): Promise<string | null> {
  if (!client) return null;
  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      system: "You are a helpful assistant. Always respond with ONLY valid JSON. No markdown, no explanation, no code fences.",
      messages: [{ role: "user", content: prompt }]
    });
    const text = response.content.find((item) => item.type === "text");
    if (!text || text.type !== "text") return null;
    // Strip any accidental markdown fences
    return text.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  } catch (err) {
    console.error("[ai.service] Claude error:", err);
    return null;
  }
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ─── Message rewrite ──────────────────────────────────────────────────────────

export async function rewriteMessage(input: {
  context: string;
  draft: string;
}): Promise<{ formal: string; warmer: string; funnier: string }> {
  const fallback = {
    formal: input.draft,
    warmer: `${input.draft} 🙂`,
    funnier: `${input.draft} 😄`
  };

  const prompt = `Rewrite this chat message in 3 tones. Context: "${input.context.slice(0, 300)}". Draft: "${input.draft}". Return JSON: {"formal":"...","warmer":"...","funnier":"..."}`;
  const raw = await callClaude(prompt);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}

// ─── Emotion detection ────────────────────────────────────────────────────────

export async function detectEmotion(input: {
  message: string;
}): Promise<{ emotion: "happy" | "sad" | "angry" | "anxious" | "neutral"; score: number; reason: string }> {
  const lowered = input.message.toLowerCase();
  const heuristic =
    lowered.includes("angry") || lowered.includes("hate") || lowered.includes("stupid")
      ? { emotion: "angry" as const, score: 0.7, reason: "Detected negative intensity words." }
      : lowered.includes("worried") || lowered.includes("anxious") || lowered.includes("scared")
        ? { emotion: "anxious" as const, score: 0.65, reason: "Detected concern-oriented words." }
        : lowered.includes("happy") || lowered.includes("great") || lowered.includes("love")
          ? { emotion: "happy" as const, score: 0.7, reason: "Detected positive sentiment words." }
          : lowered.includes("sad") || lowered.includes("miss") || lowered.includes("lonely")
            ? { emotion: "sad" as const, score: 0.65, reason: "Detected sadness markers." }
            : { emotion: "neutral" as const, score: 0.55, reason: "No strong emotional markers found." };

  const prompt = `Analyze the emotion in this message: "${input.message.replaceAll('"', "'")}". Return JSON: {"emotion":"happy"|"sad"|"angry"|"anxious"|"neutral","score":0.0-1.0,"reason":"..."}`;
  const raw = await callClaude(prompt, 150);
  if (!raw) return heuristic;
  return parseJson(raw, heuristic);
}

// ─── Context briefing (Redis-cached 1 hour) ───────────────────────────────────

export async function summarizeContext(input: {
  messages: string[];
  chatId?: string;
}): Promise<{ summary: string; mood: string; urgentCount: number }> {
  const fallback = {
    summary: "You missed a few updates. Open the latest messages for details.",
    mood: "neutral",
    urgentCount: 0
  };

  const cacheKey = input.chatId ? `briefing:${input.chatId}` : null;
  if (cacheKey) {
    const cached = await getValue(cacheKey).catch(() => null);
    if (cached) return parseJson(cached, fallback);
  }

  const prompt = `Summarize this chat history for someone returning after being away. Be brief (max 2 sentences). Messages:\n${input.messages.slice(0, 20).join("\n")}\nReturn JSON: {"summary":"...","mood":"happy"|"sad"|"tense"|"neutral","urgentCount":0}`;
  const raw = await callClaude(prompt, 200);
  if (!raw) return fallback;
  const result = parseJson(raw, fallback);

  if (cacheKey) {
    await setValue(cacheKey, JSON.stringify(result), 60 * 60).catch(() => null);
  }

  return result;
}

// ─── Conflict detection ───────────────────────────────────────────────────────

export async function checkConflict(input: {
  messages: string[];
}): Promise<{ hasConflict: boolean; suggestion: string | null; severity: "low" | "medium" | "high" }> {
  const joined = input.messages.join(" ").toLowerCase();
  const hasKeywords = /(stupid|hate|angry|shut up|idiot|awful|terrible|worst)/.test(joined);

  if (!hasKeywords) {
    return { hasConflict: false, suggestion: null, severity: "low" };
  }

  const heuristic = {
    hasConflict: true,
    suggestion: "Let's pause and restate our goals calmly so everyone feels heard.",
    severity: "medium" as const
  };

  const prompt = `You are a neutral mediator. Analyze these messages for tension:\n${input.messages.slice(-10).join("\n")}\nReturn JSON: {"hasConflict":true|false,"suggestion":"..."|null,"severity":"low"|"medium"|"high"}`;
  const raw = await callClaude(prompt, 200);
  if (!raw) return heuristic;
  return parseJson(raw, heuristic);
}

// ─── Story narration ──────────────────────────────────────────────────────────

export async function narrateStory(input: {
  segments: string[];
  theme?: string;
}): Promise<{ narration: string; illustrationPrompt: string }> {
  const fallback = { narration: "", illustrationPrompt: "" };
  const prompt = `You are a creative storyteller. Continue this collaborative story with a short paragraph (max 3 sentences). Theme: ${input.theme ?? "general"}. Story so far:\n${input.segments.join("\n")}\nReturn JSON: {"narration":"...","illustrationPrompt":"..."}`;
  const raw = await callClaude(prompt, 300);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}

// ─── Memory curation ─────────────────────────────────────────────────────────

export async function curateMemories(input: {
  messages: string[];
}): Promise<Array<{ title: string; content: string }>> {
  const fallback: Array<{ title: string; content: string }> = [];
  const prompt = `From these chat messages, extract 1-3 memorable moments worth saving. Return JSON array: [{"title":"...","content":"..."}]\nMessages:\n${input.messages.slice(0, 30).join("\n")}`;
  const raw = await callClaude(prompt, 400);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}

// ─── Cultural translation ─────────────────────────────────────────────────────

export async function translateMessage(input: {
  text: string;
  targetLanguage: string;
}): Promise<{ original: string; translated: string }> {
  const fallback = { original: input.text, translated: input.text };
  const prompt = `Translate this message to ${input.targetLanguage}. Preserve tone and emoji. Return JSON: {"original":"...","translated":"..."}\nMessage: "${input.text}"`;
  const raw = await callClaude(prompt, 200);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}

// ─── Bill OCR ─────────────────────────────────────────────────────────────────

export async function readBillItems(input: {
  imageDescription: string;
}): Promise<Array<{ item: string; amount: number }>> {
  const fallback: Array<{ item: string; amount: number }> = [];
  const prompt = `Extract line items from this receipt description. Return JSON array: [{"item":"...","amount":0.00}]\nReceipt: "${input.imageDescription}"`;
  const raw = await callClaude(prompt, 300);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}

// ─── Trivia generation ────────────────────────────────────────────────────────

export async function generateTrivia(input: {
  topic?: string;
  count?: number;
}): Promise<Array<{ question: string; options: string[]; answer: string }>> {
  const fallback: Array<{ question: string; options: string[]; answer: string }> = [];
  const count = input.count ?? 5;
  const prompt = `Generate ${count} trivia questions about "${input.topic ?? "general knowledge"}". Return JSON array: [{"question":"...","options":["A","B","C","D"],"answer":"A"}]`;
  const raw = await callClaude(prompt, 600);
  if (!raw) return fallback;
  return parseJson(raw, fallback);
}
