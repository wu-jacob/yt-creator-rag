import "dotenv/config";
import express from "express";
import path from "path";
import run from "./src/index";

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

app.post("/ask", async (req, res) => {
  const { handle, question, notionToken, notionPageId } = req.body as {
    handle: string;
    question: string;
    notionToken: string;
    notionPageId: string;
  };

  if (!handle || !question || !notionToken || !notionPageId) {
    res.status(400).json({ error: "handle, question, Notion secret, and Notion page ID are all required" });
    return;
  }

  try {
    const result = await run({ prompt: `@${handle} — ${question}`, notionToken, notionPageId });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
