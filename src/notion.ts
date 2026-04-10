import { Client } from "@notionhq/client";
import type {
  TranscriptResult,
  KeyQuote,
  CommunityInsights,
} from "./types";

const EXCERPT_DISPLAY_CHARS = 1_500;

function richText(content: string) {
  return [{ type: "text" as const, text: { content } }];
}

function paragraph(content: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: richText(content) },
  };
}

function heading1(content: string) {
  return {
    object: "block" as const,
    type: "heading_1" as const,
    heading_1: { rich_text: richText(content) },
  };
}

function callout(content: string, emoji: string, color: string) {
  return {
    object: "block" as const,
    type: "callout" as const,
    callout: {
      rich_text: richText(content),
      icon: { type: "emoji" as const, emoji },
      color,
    },
  };
}

function bulletItem(text: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: richText(text) },
  };
}

function chunkIntoParagraphs(text: string) {
  const MAX_CHARS = 2_000;
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .flatMap((section) => {
      const chunks: ReturnType<typeof paragraph>[] = [];
      for (let i = 0; i < section.length; i += MAX_CHARS) {
        chunks.push(paragraph(section.slice(i, i + MAX_CHARS)));
      }
      return chunks;
    });
}

function sourceListItem(transcript: TranscriptResult) {
  const url = `https://www.youtube.com/watch?v=${transcript.videoId}`;
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [
        {
          type: "text" as const,
          text: { content: transcript.title, link: { url } },
        },
        {
          type: "text" as const,
          text: { content: ` — used ${transcript.source}` },
        },
      ],
    },
  };
}

function keyQuoteItem(quote: KeyQuote) {
  const [minStr, secStr] = quote.timestamp.split(":");
  const offsetSeconds = parseInt(minStr, 10) * 60 + parseInt(secStr ?? "0", 10);
  const url = `https://www.youtube.com/watch?v=${quote.videoId}&t=${offsetSeconds}`;

  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [
        { type: "text" as const, text: { content: `"${quote.quote}" — ` } },
        {
          type: "text" as const,
          text: {
            content: `${quote.videoTitle} [${quote.timestamp}]`,
            link: { url },
          },
        },
      ],
    },
  };
}

function transcriptToggle(transcripts: TranscriptResult[]) {
  return {
    object: "block" as const,
    type: "toggle" as const,
    toggle: {
      rich_text: richText("📄 Raw transcript excerpts"),
      children: transcripts.map((t) =>
        paragraph(`${t.title}\n\n${t.text.slice(0, EXCERPT_DISPLAY_CHARS)}`)
      ),
    },
  };
}

export async function writeResultPage(params: {
  handle: string;
  question: string;
  answer: string;
  transcripts: TranscriptResult[];
  quotes: KeyQuote[];
  communityInsights: CommunityInsights | null;
  notionToken: string;
  notionPageId: string;
}): Promise<string> {
  const { handle, question, answer, transcripts, quotes, communityInsights, notionToken, notionPageId } = params;
  const notion = new Client({ auth: notionToken });

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const title = `@${handle} — "${question}" · ${dateStr}`;

  const transcriptCount = transcripts.filter(
    (t) => t.source === "transcript"
  ).length;

  const page = await notion.pages.create({
    parent: { page_id: notionPageId },
    properties: {
      title: { title: richText(title) },
    },
  });

  const hasCounterpoints =
    communityInsights &&
    (communityInsights.points.length > 0 ||
      communityInsights.summary.length > 0);

  const blocks = [
    callout(
      `✨ Answer synthesized from ${transcripts.length} video${transcripts.length !== 1 ? "s" : ""} (${transcriptCount} with transcripts). May not reflect complete views.`,
      "ℹ️",
      "blue_background"
    ),
    ...(transcriptCount === 0
      ? [
          callout(
            "⚠️ No transcripts were available. All excerpts are from video descriptions only.",
            "⚠️",
            "yellow_background"
          ),
        ]
      : []),

    heading1("📝 Answer"),
    ...chunkIntoParagraphs(answer),

    ...(quotes.length > 0
      ? [
          heading1("🗣️ Key Quotes"),
          callout(
            "Timestamps link directly to the moment in the video. May be off by a few seconds.",
            "🕐",
            "gray_background"
          ),
          ...quotes.map(keyQuoteItem),
        ]
      : []),

    ...(hasCounterpoints
      ? [
          heading1("💬 Community Perspectives"),
          callout(communityInsights.summary, "💡", "gray_background"),
          ...communityInsights.points.map((p) => bulletItem(p)),
        ]
      : []),

    heading1("🎥 Sources"),
    ...transcripts.map(sourceListItem),
    { object: "block" as const, type: "divider" as const, divider: {} },
    transcriptToggle(transcripts),
  ];

  // Cast required: SDK's block union types don't accommodate manually
  // constructed blocks with nested children without complex type gymnastics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await notion.blocks.children.append({ block_id: page.id, children: blocks as any });

  return `https://notion.so/${page.id.replace(/-/g, "")}`;
}
