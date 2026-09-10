# Unified AI Hub

A single web app for chatting with ChatGPT (OpenAI), Gemini (Google), and Perplexity — Claude
(Anthropic) is wired in but hidden until its API key is added. Two modes:

- **Chat** — one conversation per provider; switch between them with a tab.
- **Compare** — send one message and see every provider's answer side by side.

API keys live only in the backend `.env` file and are never sent to the browser.

## Local setup

1. Get API keys for whichever providers you want:
   - OpenAI: https://platform.openai.com/api-keys
   - Gemini: https://aistudio.google.com/apikey
   - Perplexity: https://www.perplexity.ai/settings/api
   - Claude (Anthropic): https://console.anthropic.com/settings/keys
2. Copy `.env.example` to `.env` and paste your keys in.
3. Install dependencies (first time only):
   ```bash
   npm run install:all
   ```
4. Start both the backend and frontend in dev mode:
   ```bash
   npm run dev
   ```
5. Open the URL Vite prints (typically http://localhost:5173).

To re-enable Claude in the UI once you've added `ANTHROPIC_API_KEY`, flip `enabled: false` to
`true` for the `claude` entry in `client/src/App.jsx` (`ALL_PROVIDERS`).

## How it's built

- `server/` — Express backend. Calls each provider's own API (OpenAI Chat Completions, Gemini
  `generateContent`, the Anthropic SDK, Perplexity's Agent API), holding every API key
  server-side. In production it also serves the built frontend as static files, so the whole
  app is one deployable process.
- `client/` — Vite + React frontend. Talks only to the local backend at `/api/chat`.

You can change which model/preset each provider uses right from the UI (the small text field
next to each badge).

## Deploying (Render)

This repo includes a `render.yaml` blueprint:

1. Push this repo to GitHub (already done if you're reading this from there).
2. On [Render](https://dashboard.render.com), click **New +** → **Blueprint**, and point it at
   this repo. Render will read `render.yaml` and set up the build/start commands automatically.
3. When prompted, fill in whichever API key env vars you have (`OPENAI_API_KEY`,
   `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `ANTHROPIC_API_KEY`) — leave the rest blank.
4. Deploy. Render builds with `npm run build` (builds the React app) and starts with
   `npm start` (runs the Express server, which now also serves the built frontend).
5. Your app is live at the `.onrender.com` URL Render gives you.

Every subsequent `git push` to `main` redeploys automatically.
