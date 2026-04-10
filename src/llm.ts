import { GoogleGenAI } from "@google/genai";
import type {
  TranscriptResult,
  KeyQuote,
  YouTubeComment,
  CommunityInsights,
} from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-2.5-flash";

function parseJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

export async function extractKeywords(question: string): Promise<string[]> {
  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction:
        "You extract short YouTube search keywords from questions. Each keyword must be 1-3 words maximum — single words are best. Return only a JSON array of 3-5 strings. No preamble, no markdown fences.",
    },
    contents: `Question: ${question}`,
  });

  return parseJson<string[]>(response.text ?? "[]", []);
}

export async function generateAnswer(
  question: string,
  channelName: string,
  handle: string,
  transcripts: TranscriptResult[]
): Promise<string> {
  const excerpts = transcripts
    .map((t) => `--- Video: ${t.title} ---\n${t.text}`)
    .join("\n\n");

  const prompt = `Question: ${question}\n\nTranscript excerpts:\n${excerpts}\n\nAnswer the question in ${channelName}'s voice. Be specific and reference the ideas from the transcripts.`;

  const attempt = () =>
    ai.models.generateContent({
      model: MODEL,
      config: {
        maxOutputTokens: 2048,
        systemInstruction: `You are answering questions about YouTube creator ${channelName} (@${handle}). Use ONLY the transcript excerpts provided. Do not invent positions they haven't expressed. Match their reasoning style, vocabulary, and tone. If the transcripts don't contain enough information to answer confidently, say so explicitly.`,
      },
      contents: prompt,
    });

  let response;
  try {
    response = await attempt();
  } catch {
    response = await attempt();
  }

  return response.text ?? "";
}

export async function extractKeyQuotes(
  question: string,
  transcripts: TranscriptResult[]
): Promise<KeyQuote[]> {
  const transcriptOnly = transcripts.filter((t) => t.source === "transcript");
  if (transcriptOnly.length === 0) return [];

  const excerpts = transcriptOnly
    .map((t) => `--- Video: "${t.title}" (videoId: ${t.videoId}) ---\n${t.text}`)
    .join("\n\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction:
        "You extract verbatim quotes from timestamped video transcripts. Return only a JSON array. No preamble, no markdown fences.",
    },
    contents: `Question: ${question}\n\nTimestamped transcripts (format: [M:SS] text):\n${excerpts}\n\nExtract 3-5 short, specific quotes that directly address the question. Each must include the timestamp visible just before the quoted text.\n\nReturn a JSON array with this shape: [{quote, videoId, timestamp, videoTitle}] where timestamp is the "M:SS" string (e.g. "4:32") and videoId matches the ID in the transcript header.`,
  });

  return parseJson<KeyQuote[]>(response.text ?? "[]", []);
}

export async function analyzeCommunityFeedback(
  question: string,
  channelName: string,
  comments: YouTubeComment[]
): Promise<CommunityInsights | null> {
  if (comments.length === 0) return null;

  const commentText = comments
    .map((c) => `[${c.likeCount} likes] ${c.text}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    config: {
      systemInstruction:
        "You analyze YouTube comments to surface criticism, counterpoints, and notable additions to a creator's views. Return only JSON. No preamble, no markdown fences.",
    },
    contents: `Question about ${channelName}: ${question}\n\nTop YouTube comments (sorted by relevance):\n${commentText}\n\nIdentify the most significant criticisms, counterpoints, or valuable additions from commenters. Return JSON: {summary: string, points: string[]} where points contains 3-5 specific insights. If comments are purely supportive with no counterpoints, return {summary: "Viewers were largely supportive with no significant counterpoints.", points: []}.`,
  });

  return parseJson<CommunityInsights>(response.text ?? "null", {
    summary: "",
    points: [],
  });
}
