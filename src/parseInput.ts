import type { ParsedInput } from "./types";

export function parseInput(prompt: string): ParsedInput {
  const urlMatch = prompt.match(/youtube\.com\/@([\w-]+)/i);
  const handleMatch = urlMatch ?? prompt.match(/@([\w-]+)/);

  if (!handleMatch) {
    throw new Error(
      "No YouTube channel handle found in prompt. Include @handle or a youtube.com/@handle URL."
    );
  }

  const handle = handleMatch[1];
  const matchStart = prompt.indexOf(handleMatch[0]);
  const afterHandle = prompt.slice(matchStart + handleMatch[0].length);
  const question = afterHandle.replace(/^\s*[—–-]+\s*/, "").trim();

  if (!question) {
    throw new Error(
      "No question found in prompt. Add a question after the channel handle."
    );
  }

  return { handle, question };
}
