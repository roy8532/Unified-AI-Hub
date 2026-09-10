import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 5174;

const DEFAULT_MODELS = {
  claude: "claude-sonnet-5",
  openai: "gpt-4o-mini",
  gemini: "gemini-3.6-flash",
  perplexity: "fast",
};

const PROVIDERS = Object.keys(DEFAULT_MODELS);

const API_KEY_ENV = {
  claude: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
};

app.get("/api/health", (req, res) => {
  const configured = {};
  for (const provider of PROVIDERS) {
    configured[provider] = Boolean(process.env[API_KEY_ENV[provider]]);
  }
  res.json({ ok: true, configured });
});

app.post("/api/chat", async (req, res) => {
  const { provider, model, messages } = req.body || {};

  if (!provider || !PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `provider must be one of: ${PROVIDERS.join(", ")}` });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages must be a non-empty array" });
  }

  const chosenModel = model || DEFAULT_MODELS[provider];
  const callers = {
    claude: callClaude,
    openai: callOpenAI,
    gemini: callGemini,
    perplexity: callPerplexity,
  };

  try {
    const content = await callers[provider](chosenModel, messages);
    res.json({ content, model: chosenModel });
  } catch (err) {
    console.error(`[${provider}] error:`, err.message);
    res.status(502).json({ error: err.message });
  }
});

async function callClaude(model, messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set on the server (.env)");

  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

async function callOpenAI(model, messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set on the server (.env)");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed (${response.status})`);
  }
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(model, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set on the server (.env)");

  // Gemini has no "assistant" role and uses "model" instead; system messages
  // are merged into the first user turn since generateContent has no system role here.
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed (${response.status})`);
  }
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text).join("") || "";
}

async function callPerplexity(preset, messages) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set on the server (.env)");

  // Perplexity retired /chat/completions in favor of the Agent API, which takes
  // a `preset` (fast|low|medium|high|xhigh) instead of a specific model name,
  // and `input` (OpenAI-Responses-style message array) instead of `messages`.
  const response = await fetch("https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      preset,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : data?.error?.message;
    throw new Error(message || `Perplexity request failed (${response.status})`);
  }
  const messageItem = (data.output || []).find((item) => item.type === "message");
  const text = (messageItem?.content || []).map((c) => c.text).filter(Boolean).join("");
  return text;
}

// Serve the built React app (npm run build) so this one process can host
// both the API and the frontend - no separate static site needed to deploy.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Unified AI Hub server listening on http://localhost:${PORT}`);
});
