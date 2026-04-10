# YouTube Creator Q&A — RAG Pipeline

Ask any question about a YouTube creator and get an answer in their voice with timestamped citations, written to a Notion page.

---

## How to use

### 1. Get the API keys

**YouTube Data API:**
- [console.cloud.google.com](https://console.cloud.google.com) → New project → APIs & Services → Enable "YouTube Data API v3" → Credentials → Create API key
- Free tier: 10,000 units/day

**Gemini API (you can use another model if you're feeling rich hehe):**
- [aistudio.google.com](https://aistudio.google.com) → Get API key
- Free tier: 15 requests/minute, 1,500 requests/day

**Notion:**
- [notion.so/my-integrations](https://notion.so/my-integrations) → New integration → copy secret token (make sure you check the permissions given)
- Share the target Notion page with this integration

### 2. Install and run the app

```bash
npm install
npm start
```

---

## Environment Variables

Create a `.env` file:

```env
YOUTUBE_API_KEY=AIzaSy...
GEMINI_API_KEY=AIzaSy...
NOTION_TOKEN=secret_...
NOTION_TARGET_PAGE_ID=2c0e38b3b6a1804497c0de4e97c7f2b8
PORT=3000
```

When using the web UI, Notion credentials can be entered per-request instead of relying on env vars.

Made with ❤️ by Jacob Wu
