"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = "";


// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function senderInitials(sender) {
  const name = sender.replace(/<.*>/, "").trim();
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function senderName(sender) {
  const match = sender.match(/^(.+?)\s*</);
  return match ? match[1].trim() : sender;
}
const AVATAR_COLORS = ["#C084FC","#F472B6","#60A5FA","#34D399","#FBBF24","#F87171","#A78BFA"];
function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Action config — label, fields, executor ──────────────────────────────────
const ACTION_CONFIG = {
  fetch_order_detail: {
    label: "Fetch Order",
    color: "#60A5FA",
    fields: [{ key: "order_id", label: "Order ID", placeholder: "e.g. 4821" }],
    execute: async ({ order_id }) => {
      const res = await fetch(`${API_BASE}/shopify/fetch_order_details/${order_id}`);
      return res.json();
    },
  },
  fetch_client_detail: {
    label: "Fetch Customer",
    color: "#C084FC",
    fields: [{ key: "customer_email", label: "Customer Email", placeholder: "e.g. john@example.com" }],
    execute: async ({ customer_email }) => {
      const res = await fetch(`${API_BASE}/shopify/fetch_customer_details/${encodeURIComponent(customer_email)}`);
      return res.json();
    },
  },
  refund_order: {
    label: "Refund Order",
    color: "#F87171",
    fields: [{ key: "order_id", label: "Order ID", placeholder: "e.g. 4821" }],
    execute: async ({ order_id }) => {
      const res = await fetch(`${API_BASE}/shopify/refund_order/${order_id}`, { method: "POST" });
      return res.json();
    },
  },
};

// ── Action Popup ──────────────────────────────────────────────────────────────
function ActionPopup({ action, onConfirm, onClose }) {
  const config = ACTION_CONFIG[action.type];
  const [params, setParams] = useState(() => {
    // Pre-fill from detected parameters
    const initial = {};
    config.fields.forEach(f => { initial[f.key] = action[f.key] || ""; });
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const data = await config.execute(params);
      setResult(data);
      onConfirm(action.type, data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#111118", border: `1px solid ${config.color}40`,
        borderRadius: 12, padding: 24, width: 400, maxWidth: "90vw",
        boxShadow: `0 0 40px ${config.color}20`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.color, boxShadow: `0 0 6px ${config.color}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: config.color, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
              {config.label.toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Fields */}
        {!result && config.fields.map(field => (
          <div key={field.key} style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 10, color: "#9ca3af", fontFamily: "'DM Mono', monospace", marginBottom: 6, letterSpacing: "0.08em" }}>
              {field.label.toUpperCase()}
            </label>
            <input
              value={params[field.key]}
              onChange={e => setParams(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${params[field.key] ? config.color + "60" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, padding: "10px 12px",
                color: "#e5e7eb", fontSize: 13, outline: "none", fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
            />
          </div>
        ))}

        {/* Result */}
        {result && (
          <div style={{
            background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)",
            borderRadius: 8, padding: 12, marginBottom: 14,
            fontSize: 11, color: "#34d399", fontFamily: "'DM Mono', monospace",
            whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 200, overflow: "auto",
          }}>
            {JSON.stringify(result, null, 2)}
          </div>
        )}

        {error && (
          <div style={{ color: "#F87171", fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
            ✗ {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {!result && (
            <>
              <button onClick={onClose} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                color: "#9ca3af", borderRadius: 7, padding: "8px 16px",
                cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                CANCEL
              </button>
              <button onClick={handleRun} disabled={loading || config.fields.some(f => !params[f.key])} style={{
                background: `${config.color}25`, border: `1px solid ${config.color}60`,
                color: config.color, borderRadius: 7, padding: "8px 20px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 12, fontFamily: "'DM Mono', monospace",
                opacity: config.fields.some(f => !params[f.key]) ? 0.4 : 1,
              }}>
                {loading ? "RUNNING..." : "RUN"}
              </button>
            </>
          )}
          {result && (
            <button onClick={onClose} style={{
              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)",
              color: "#34d399", borderRadius: 7, padding: "8px 20px",
              cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace",
            }}>
              DONE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Avatar({ sender, size = 32 }) {
  const color = avatarColor(sender);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#0a0a0f",
      flexShrink: 0, fontFamily: "'DM Mono', monospace",
    }}>
      {senderInitials(sender)}
    </div>
  );
}

function SyncButton({ onSync, syncing }) {
  return (
    <button onClick={onSync} disabled={syncing} style={{
      display: "flex", alignItems: "center", gap: 6,
      background: syncing ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.2)",
      border: "1px solid rgba(139,92,246,0.5)",
      color: syncing ? "#a78bfa" : "#c4b5fd",
      padding: "6px 14px", borderRadius: 6,
      cursor: syncing ? "not-allowed" : "pointer",
      fontSize: 12, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}>
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      {syncing ? "SYNCING..." : "SYNC"}
    </button>
  );
}

function ThreadItem({ thread, active, onClick }) {
  const last = thread.messages[thread.messages.length - 1];
  return (
    <div onClick={onClick} style={{
      padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)",
      cursor: "pointer",
      background: active ? "rgba(139,92,246,0.12)" : "transparent",
      borderLeft: active ? "2px solid #8b5cf6" : "2px solid transparent",
      transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar sender={last.sender} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{
              fontSize: 12, fontWeight: 600, color: active ? "#e2d9f3" : "#c4b5fd",
              fontFamily: "'DM Mono', monospace",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
            }}>
              {senderName(last.sender)}
            </span>
            <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
              {timeAgo(thread.last_received)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: active ? "#d1fae5" : "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {thread.subject}
          </div>
          {thread.messages.length > 1 && (
            <span style={{
              display: "inline-block", marginTop: 4,
              fontSize: 10, color: "#6b7280", fontFamily: "'DM Mono', monospace",
              background: "rgba(255,255,255,0.05)", padding: "1px 6px", borderRadius: 3,
            }}>
              {thread.messages.length} msgs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isOwn = msg.sender.toLowerCase().includes("support@") || msg.sender.toLowerCase().includes("ourstore");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOwn ? "row-reverse" : "row" }}>
        <Avatar sender={msg.sender} size={28} />
        <div style={{ maxWidth: "72%" }}>
          <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4, fontFamily: "'DM Mono', monospace", textAlign: isOwn ? "right" : "left" }}>
            {senderName(msg.sender)} · {timeAgo(msg.received_date)}
          </div>
          <div style={{
            background: isOwn ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
            border: isOwn ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            padding: "12px 16px", fontSize: 13, color: "#e5e7eb", lineHeight: 1.6, wordBreak: "break-word",
          }}>
            {msg.text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposeBar({ thread, onReplySent }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  async function handleSend() {
    if (!text.trim() || sending || !thread) return;
    const msgText = text.trim();
    setSending(true);
    setError(null);
    try {
      const lastMsg = thread.messages[thread.messages.length - 1];
      const res = await fetch(`${API_BASE}/emails/thread/${thread.thread_id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lastMsg.sender,
          subject: thread.subject,
          text: msgText,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.status === "sent") {
        setText("");
        // Optimistically add the sent message to the thread
        if (onReplySent) onReplySent(msgText);
      }
    } catch (e) {
      setError(e.message);
    }
    setSending(false);
  }

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)", flexShrink: 0 }}>
      {error && (
        <div style={{ padding: "6px 20px", fontSize: 11, color: "#F87171", fontFamily: "'DM Mono', monospace" }}>
          ✗ {error}
        </div>
      )}
      <div style={{ padding: "12px 20px", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSend(); }}
          placeholder="Reply to this thread… (⌘Enter to send)"
          rows={2}
          style={{
            flex: 1, background: "rgba(255,255,255,0.04)",
            border: `1px solid ${text ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 8, padding: "10px 14px",
            color: "#e5e7eb", fontSize: 13, outline: "none",
            fontFamily: "inherit", resize: "none", lineHeight: 1.5,
            transition: "border-color 0.15s",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            background: (!text.trim() || sending) ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.3)",
            border: "1px solid rgba(139,92,246,0.5)",
            color: (!text.trim() || sending) ? "#6b7280" : "#c4b5fd",
            borderRadius: 8, padding: "10px 16px",
            cursor: (!text.trim() || sending) ? "not-allowed" : "pointer",
            fontSize: 12, fontFamily: "'DM Mono', monospace",
            transition: "all 0.15s", whiteSpace: "nowrap",
          }}
        >
          {sending ? "SENDING..." : "SEND"}
        </button>
      </div>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────────────────────
function AIPanel({ thread }) {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actions, setActions] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [popup, setPopup] = useState(null); // action object being confirmed
  const [results, setResults] = useState([]); // list of {type, data} after execution

  // Reset when thread changes
  useEffect(() => {
    setSummary(null);
    setActions(null);
    setResults([]);
    setPopup(null);
  }, [thread?.thread_id]);

  async function handleSummarize() {
    if (!thread || summaryLoading) return;
    setSummaryLoading(true);
    setSummary(null);
    try {
      const res = await fetch(`${API_BASE}/openai/thread/${thread.thread_id}/summarize`, { method: "POST" });
      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setSummary("Failed to load summary.");
    }
    setSummaryLoading(false);
  }

  async function handleDetectActions() {
    if (!thread || actionsLoading) return;
    setActionsLoading(true);
    setActions(null);
    try {
      const res = await fetch(`${API_BASE}/openai/thread/${thread.thread_id}/actions`, { method: "POST" });
      const data = await res.json();
      setActions(data.actions || []);
    } catch {
      setActions([]);
    }
    setActionsLoading(false);
  }

  function handleActionConfirmed(type, data) {
    setResults(prev => [...prev, { type, data }]);
  }

  if (!thread) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <AIPanelHeader />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <p style={{ fontSize: 12, color: "#4b5563", textAlign: "center", fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
            SELECT A THREAD<br />TO GET STARTED
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <AIPanelHeader />

      {/* Action buttons */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8, flexShrink: 0 }}>
        <AIButton onClick={handleSummarize} loading={summaryLoading} label="SUMMARIZE" color="#a78bfa" />
        <AIButton onClick={handleDetectActions} loading={actionsLoading} label="DETECT ACTIONS" color="#34d399" />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>

        {/* Summary */}
        {(summary || summaryLoading) && (
          <Section title="SUMMARY" color="#a78bfa">
            {summaryLoading
              ? <LoadingDots />
              : <p style={{ fontSize: 12, color: "#d1d5db", lineHeight: 1.7, margin: 0 }}>{summary}</p>
            }
          </Section>
        )}

        {/* Detected actions */}
        {(actions !== null || actionsLoading) && (
          <Section title="DETECTED ACTIONS" color="#34d399">
            {actionsLoading
              ? <LoadingDots />
              : actions.length === 0
                ? <p style={{ fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono', monospace", margin: 0 }}>No relevant actions detected.</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {actions.map((action, i) => {
                      const config = ACTION_CONFIG[action.type];
                      if (!config) return null;
                      return (
                        <button key={i} onClick={() => setPopup(action)} style={{
                          background: `${config.color}12`,
                          border: `1px solid ${config.color}40`,
                          color: config.color, borderRadius: 8, padding: "10px 14px",
                          cursor: "pointer", fontFamily: "'DM Mono', monospace",
                          textAlign: "left", transition: "all 0.15s",
                          display: "flex", flexDirection: "column", gap: 4,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                              {config.label.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 10, opacity: 0.6 }}>▶ run</span>
                          </div>
                          {/* Show pre-filled params as hint */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {config.fields.map(f => action[f.key] && (
                              <span key={f.key} style={{
                                fontSize: 10, background: `${config.color}20`,
                                padding: "1px 7px", borderRadius: 4, opacity: 0.8,
                              }}>
                                {f.label}: {action[f.key]}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
            }
          </Section>
        )}

        {/* Execution results */}
        {results.map((r, i) => {
          const config = ACTION_CONFIG[r.type];
          return (
            <Section key={i} title={`✓ ${config?.label || r.type}`.toUpperCase()} color="#34d399">
              <pre style={{ fontSize: 10, color: "#9ca3af", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
                {JSON.stringify(r.data, null, 2)}
              </pre>
            </Section>
          );
        })}
      </div>

      {/* Popup */}
      {popup && (
        <ActionPopup
          action={popup}
          onConfirm={(type, data) => { handleActionConfirmed(type, data); setPopup(null); }}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

function AIPanelHeader() {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
      <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#9ca3af", letterSpacing: "0.1em" }}>AI ASSISTANT</span>
    </div>
  );
}

function AIButton({ onClick, loading, label, color }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      flex: 1, background: `${color}12`, border: `1px solid ${color}40`,
      color: loading ? `${color}80` : color,
      borderRadius: 6, padding: "7px 10px", cursor: loading ? "not-allowed" : "pointer",
      fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      transition: "all 0.15s",
    }}>
      {loading
        ? <><LoadingDot /><LoadingDot delay={0.15} /><LoadingDot delay={0.3} /></>
        : label
      }
    </button>
  );
}

function LoadingDot({ delay = 0 }) {
  return <div style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", animation: `bounce 1s ease-in-out ${delay}s infinite` }} />;
}

function LoadingDots() {
  return <div style={{ display: "flex", gap: 6, padding: "4px 0" }}><LoadingDot /><LoadingDot delay={0.15} /><LoadingDot delay={0.3} /></div>;
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: `${color}0a` }}>
        <span style={{ fontSize: 9, color, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function MaildeskApp() {
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const selected = threads.find(t => t.thread_id === selectedId) || null;

  async function loadThreads() {
    try {
      const res = await fetch(`${API_BASE}/emails`);
      const data = await res.json();
      const fetched = data.threads || [];
      setThreads(fetched);
      if (fetched.length > 0 && !selectedId) setSelectedId(fetched[0].thread_id);
    } catch {
      setThreads([]);
    }
  }

  useEffect(() => {
    loadThreads().finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/emails`, { method: "POST" });
      const data = await res.json();
      setSyncMsg(`Saved ${data.saved}, skipped ${data.skipped}`);
      await loadThreads();
    } catch {
      setSyncMsg("Sync failed");
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 4000);
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#080810", color: "#e5e7eb", fontFamily: "'Syne', sans-serif" }}>
        {/* Topbar */}
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✉</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#f3f4f6" }}>maildesk</span>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#6b7280", letterSpacing: "0.12em" }}>SUPPORT CLIENT</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {syncMsg && <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#34d399", animation: "fadeIn 0.3s ease" }}>{syncMsg}</span>}
            <SyncButton onSync={handleSync} syncing={syncing} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Thread list */}
          <div style={{ width: 280, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", overflow: "auto", background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px 8px", fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#4b5563", letterSpacing: "0.12em", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
              INBOX — {loading ? "..." : `${threads.length} THREADS`}
            </div>
            {loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", animation: `bounce 1s ease-in-out ${i*0.15}s infinite` }} />)}
                </div>
              </div>
            ) : threads.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }}>
                <div style={{ fontSize: 28, opacity: 0.3 }}>✉</div>
                <p style={{ fontSize: 11, color: "#4b5563", fontFamily: "'DM Mono', monospace", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                  NO EMAILS YET<br />PRESS SYNC TO FETCH
                </p>
              </div>
            ) : (
              threads.map(t => (
                <ThreadItem key={t.thread_id} thread={t} active={t.thread_id === selectedId} onClick={() => setSelectedId(t.thread_id)} />
              ))
            )}
          </div>

          {/* Reader */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selected ? (
              <>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f9fafb", marginBottom: 4, letterSpacing: "-0.02em" }}>{selected.subject}</h2>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#6b7280" }}>
                    {selected.messages.length} message{selected.messages.length !== 1 ? "s" : ""} · last {timeAgo(selected.last_received)}
                  </span>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "24px 24px 12px" }}>
                  {selected.messages.map(m => <MessageBubble key={m.id} msg={m} />)}
                </div>
                <ComposeBar thread={selected} onReplySent={(msgText) => {
                    setThreads(prev => prev.map(t => {
                      if (t.thread_id !== selected.thread_id) return t;
                      const newMsg = {
                        id: Date.now(),
                        google_id: `optimistic-${Date.now()}`,
                        sender: "Support <support@ourstore.com>",
                        title: `Re: ${t.subject}`,
                        text: msgText,
                        received_date: new Date().toISOString(),
                      };
                      return { ...t, messages: [...t.messages, newMsg], last_received: newMsg.received_date };
                    }));
                  }} />
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>Select a thread to read</div>
            )}
          </div>

          {/* AI panel */}
          <div style={{ width: 320, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <AIPanel thread={selected} />
          </div>
        </div>
      </div>
    </>
  );
}
