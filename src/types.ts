export interface ParsedInput {
  handle: string;
  question: string;
}

export interface VideoResult {
  videoId: string;
  title: string;
  description: string;
}

export interface TranscriptResult {
  videoId: string;
  title: string;
  text: string;
  source: "transcript" | "description";
}

export interface ResolvedChannel {
  channelId: string;
  channelName: string;
}

export interface KeyQuote {
  quote: string;
  videoId: string;
  timestamp: string; // "M:SS" format as returned by the LLM
  videoTitle: string;
}

export interface YouTubeComment {
  text: string;
  likeCount: number;
  authorName: string;
}

export interface CommunityInsights {
  summary: string;
  points: string[];
}
