# Unified AI Hub

A single web app for chatting with ChatGPT (OpenAI) and Gemini (Google), with two modes:

- **Chat** — one conversation, switch between ChatGPT and Gemini with a toggle.
- **Compare** — send one message to both models at once and see their answers side by side.

API keys live only in the backend `.env` file and are never sent to the browser.

## Setup

1. Get API keys:
   - OpenAI: https://platform.openai.com/api-keys
   - Gemini: https://aistudio.google.com/apikey
2. Open `.env` in the project root and paste your keys into `OPENAI_API_KEY` and `GEMINI_API_KEY`.
3. Install dependencies (first time only):
   ```bash
   npm run install:all
   ```
4. Start both the backend and frontend:
   ```bash
   npm run dev
   ```
5. Open the URL Vite prints (typically http://localhost:5173).

## How it's built

- `server/` — Express backend. Proxies chat requests to OpenAI's Chat Completions API and Google's Gemini `generateContent` API, holding both API keys server-side.
- `client/` — Vite + React frontend. Talks only to the local backend at `/api/chat`; Vite's dev server proxies `/api` to `http://localhost:5174`.

You can change which model each provider uses right from the UI (the small text field next to each model's badge) — defaults are `gpt-4o-mini` and `gemini-3.6-flash`.
