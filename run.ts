import "dotenv/config";
import run from "./src/index";

const prompt = process.argv.slice(2).join(" ");

if (!prompt) {
  console.error('Usage: npx tsx run.ts "@handle — your question here"');
  process.exit(1);
}

run({
  prompt,
  notionToken: process.env.NOTION_TOKEN!,
  notionPageId: process.env.NOTION_TARGET_PAGE_ID!,
}).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
