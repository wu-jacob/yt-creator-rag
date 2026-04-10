import { YoutubeTranscript } from "youtube-transcript";
import type { VideoResult, TranscriptResult } from "./types";

const CHARS_PER_VIDEO = 60_000; // ≈15,000 tokens at 4 chars/token

function formatTimestamp(offsetSeconds: number): string {
  const mins = Math.floor(offsetSeconds / 60);
  const secs = Math.floor(offsetSeconds % 60);
  return `[${mins}:${secs.toString().padStart(2, "0")}]`;
}

function takeMiddleSection(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const mid = Math.floor(text.length / 2);
  const half = Math.floor(maxChars / 2);
  return text.slice(mid - half, mid + half);
}

async function fetchOne(video: VideoResult): Promise<TranscriptResult> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(video.videoId);
    const fullText = segments
      .map((s) => `${formatTimestamp(s.offset)} ${s.text}`)
      .join(" ");
    return {
      videoId: video.videoId,
      title: video.title,
      text: takeMiddleSection(fullText, CHARS_PER_VIDEO),
      source: "transcript",
    };
  } catch {
    return {
      videoId: video.videoId,
      title: video.title,
      text: takeMiddleSection(video.description, CHARS_PER_VIDEO),
      source: "description",
    };
  }
}

export async function fetchTranscripts(
  videos: VideoResult[]
): Promise<TranscriptResult[]> {
  return Promise.all(videos.map(fetchOne));
}
