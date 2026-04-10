import type { ResolvedChannel, VideoResult, YouTubeComment } from "./types";

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(
      `YouTube API error on ${endpoint}: ${res.status} ${await res.text()}`
    );
  }
  return res.json() as Promise<T>;
}

export async function resolveChannel(handle: string): Promise<ResolvedChannel> {
  const data = await ytFetch<{
    items?: Array<{ id: string; snippet: { title: string } }>;
  }>("channels", {
    part: "id,snippet",
    forHandle: handle,
  });

  const item = data.items?.[0];
  if (!item) {
    throw new Error(`Could not find a YouTube channel for @${handle}`);
  }

  return { channelId: item.id, channelName: item.snippet.title };
}

export async function searchChannel(
  channelId: string,
  keywords: string[]
): Promise<VideoResult[]> {
  const data = await ytFetch<{
    items?: Array<{
      id: { videoId: string };
      snippet: { title: string; description: string };
    }>;
  }>("search", {
    part: "snippet",
    channelId,
    q: keywords.slice(0, 3).join(" "),
    maxResults: "8",
    type: "video",
    order: "relevance",
  });

  return (data.items ?? []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
  }));
}

export async function fetchComments(
  videoId: string,
  maxResults = 30
): Promise<YouTubeComment[]> {
  try {
    const data = await ytFetch<{
      items?: Array<{
        snippet: {
          topLevelComment: {
            snippet: {
              textDisplay: string;
              likeCount: number;
              authorDisplayName: string;
            };
          };
        };
      }>;
    }>("commentThreads", {
      part: "snippet",
      videoId,
      maxResults: String(maxResults),
      order: "relevance",
      textFormat: "plainText",
    });

    return (data.items ?? []).map((item) => ({
      text: item.snippet.topLevelComment.snippet.textDisplay,
      likeCount: item.snippet.topLevelComment.snippet.likeCount,
      authorName: item.snippet.topLevelComment.snippet.authorDisplayName,
    }));
  } catch {
    return [];
  }
}
