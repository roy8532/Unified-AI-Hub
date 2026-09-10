import { useState } from "react";
import ChatColumn from "./components/ChatColumn.jsx";
import { sendChat } from "./api.js";
import "./App.css";

// `enabled: false` hides a provider from the UI without touching the backend
// support for it - flip it back to true once its API key is set up.
const ALL_PROVIDERS = [
  { id: "claude", label: "Claude", badgeClass: "claude", defaultModel: "claude-sonnet-5", enabled: false },
  { id: "openai", label: "ChatGPT", badgeClass: "openai", defaultModel: "gpt-4o-mini", enabled: true },
  { id: "gemini", label: "Gemini", badgeClass: "gemini", defaultModel: "gemini-3.6-flash", enabled: true },
  { id: "perplexity", label: "Perplexity", badgeClass: "perplexity", defaultModel: "fast", enabled: true },
];

const PROVIDERS = ALL_PROVIDERS.filter((p) => p.enabled);

function initialProviderState() {
  const state = {};
  for (const p of ALL_PROVIDERS) {
    state[p.id] = { model: p.defaultModel, messages: [], loading: false, error: null };
  }
  return state;
}

export default function App() {
  const [mode, setMode] = useState("chat");

  // Chat mode: one active provider, independent conversation thread per provider
  const [activeProvider, setActiveProvider] = useState(PROVIDERS[0].id);
  const [chatState, setChatState] = useState(initialProviderState);
  const [chatInput, setChatInput] = useState("");

  // Compare mode: one shared prompt fans out to every provider in parallel
  const [compareState, setCompareState] = useState(initialProviderState);
  const [compareInput, setCompareInput] = useState("");

  function setChatModel(model) {
    setChatState((prev) => ({ ...prev, [activeProvider]: { ...prev[activeProvider], model } }));
  }

  function setCompareModel(providerId, model) {
    setCompareState((prev) => ({ ...prev, [providerId]: { ...prev[providerId], model } }));
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    const provider = activeProvider;
    if (!text || chatState[provider].loading) return;

    const newMessages = [...chatState[provider].messages, { role: "user", content: text }];
    setChatInput("");
    setChatState((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], messages: newMessages, loading: true, error: null },
    }));

    try {
      const content = await sendChat({ provider, model: chatState[provider].model, messages: newMessages });
      setChatState((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], messages: [...newMessages, { role: "assistant", content }], loading: false },
      }));
    } catch (err) {
      setChatState((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], loading: false, error: err.message },
      }));
    }
  }

  async function handleCompareSend() {
    const text = compareInput.trim();
    if (!text || PROVIDERS.some((p) => compareState[p.id].loading)) return;

    const userMsg = { role: "user", content: text };
    setCompareInput("");
    setCompareState((prev) => {
      const next = {};
      for (const p of PROVIDERS) {
        next[p.id] = { ...prev[p.id], messages: [...prev[p.id].messages, userMsg], loading: true, error: null };
      }
      return next;
    });

    await Promise.allSettled(
      PROVIDERS.map(async (p) => {
        const priorMessages = [...compareState[p.id].messages, userMsg];
        try {
          const content = await sendChat({ provider: p.id, model: compareState[p.id].model, messages: priorMessages });
          setCompareState((prev) => ({
            ...prev,
            [p.id]: { ...prev[p.id], messages: [...prev[p.id].messages, { role: "assistant", content }], loading: false },
          }));
        } catch (err) {
          setCompareState((prev) => ({
            ...prev,
            [p.id]: { ...prev[p.id], loading: false, error: err.message },
          }));
        }
      })
    );
  }

  function handleKeyDown(e, sendFn) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendFn();
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Unified AI Hub</h1>
        <nav className="tabs">
          <button className={mode === "chat" ? "active" : ""} onClick={() => setMode("chat")}>
            Chat
          </button>
          <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>
            Compare
          </button>
        </nav>
      </header>

      {mode === "chat" ? (
        <main className="single-mode">
          <div className="provider-switch">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                className={activeProvider === p.id ? "active" : ""}
                onClick={() => setActiveProvider(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <ChatColumn
            title={PROVIDERS.find((p) => p.id === activeProvider).label}
            badgeClass={activeProvider}
            model={chatState[activeProvider].model}
            onModelChange={setChatModel}
            messages={chatState[activeProvider].messages}
            loading={chatState[activeProvider].loading}
            error={chatState[activeProvider].error}
          />
          <div className="input-bar">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleChatSend)}
              placeholder="Message... (Enter to send, Shift+Enter for new line)"
              rows={2}
            />
            <button onClick={handleChatSend} disabled={chatState[activeProvider].loading || !chatInput.trim()}>
              Send
            </button>
          </div>
        </main>
      ) : (
        <main className="compare-mode">
          <div className="compare-columns">
            {PROVIDERS.map((p) => (
              <ChatColumn
                key={p.id}
                title={p.label}
                badgeClass={p.id}
                model={compareState[p.id].model}
                onModelChange={(model) => setCompareModel(p.id, model)}
                messages={compareState[p.id].messages}
                loading={compareState[p.id].loading}
                error={compareState[p.id].error}
              />
            ))}
          </div>
          <div className="input-bar">
            <textarea
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleCompareSend)}
              placeholder="Message all providers at once... (Enter to send, Shift+Enter for new line)"
              rows={2}
            />
            <button
              onClick={handleCompareSend}
              disabled={PROVIDERS.some((p) => compareState[p.id].loading) || !compareInput.trim()}
            >
              Send to all
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
