export default function ChatColumn({ title, badgeClass, model, onModelChange, messages, loading, error }) {
  return (
    <div className="chat-column">
      <div className="chat-column-header">
        <span className={`badge ${badgeClass}`}>{title}</span>
        <input
          className="model-input"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="messages">
        {messages.length === 0 && !loading && (
          <div className="empty-state">Say something to get started.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-role">{m.role === "user" ? "You" : title}</div>
            <div className="message-content">{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-role">{title}</div>
            <div className="message-content typing">thinking…</div>
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
}
