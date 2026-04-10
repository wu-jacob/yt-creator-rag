import { parseInput } from "./parseInput";
import { resolveChannel, searchChannel, fetchComments } from "./youtube";
import { fetchTranscripts } from "./transcripts";
import {
  extractKeywords,
  generateAnswer,
  extractKeyQuotes,
  analyzeCommunityFeedback,
} from "./llm";
import { writeResultPage } from "./notion";

export default async function run(input: {
  prompt: string;
  notionToken: string;
  notionPageId: string;
}): Promise<{ pageUrl: string }> {
  const { handle, question } = parseInput(input.prompt);
  console.log(`\nChannel: @${handle}`);
  console.log(`Question: ${question}\n`);

  const [{ channelId, channelName }, keywords] = await Promise.all([
    resolveChannel(handle),
    extractKeywords(question),
  ]);
  console.log(`Resolved: ${channelName} (${channelId})`);
  console.log(`Keywords: ${keywords.join(", ")}`);

  const videos = await searchChannel(channelId, keywords);
  if (videos.length === 0) {
    throw new Error(
      `No relevant videos found on @${handle}'s channel for: "${question}"`
    );
  }
  console.log(`\nFound ${videos.length} videos:`);
  videos.forEach((v) => console.log(`  • ${v.title}`));

  const transcripts = await fetchTranscripts(videos);
  const withTranscript = transcripts.filter(
    (t) => t.source === "transcript"
  ).length;
  console.log(
    `\nFetched transcripts: ${withTranscript}/${transcripts.length} had captions`
  );
  console.log("Generating answer, extracting quotes, and scanning comments...");

  // All three are independent — run in parallel
  const [answer, quotes, communityInsights] = await Promise.all([
    generateAnswer(question, channelName, handle, transcripts),
    extractKeyQuotes(question, transcripts),
    fetchComments(videos[0].videoId).then((comments) =>
      analyzeCommunityFeedback(question, channelName, comments)
    ),
  ]);

  console.log(`Extracted ${quotes.length} timestamped quotes`);
  console.log(`Community insights: ${communityInsights ? "found" : "none"}`);

  const pageUrl = await writeResultPage({
    handle,
    question,
    answer,
    transcripts,
    quotes,
    communityInsights,
    notionToken: input.notionToken,
    notionPageId: input.notionPageId,
  });

  console.log(`\nDone. Notion page: ${pageUrl}`);
  return { pageUrl };
}
