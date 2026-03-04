"use client";

import { useState, useEffect, useRef } from "react";

const API_BASE = "";

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_THREADS = [
  {
    thread_id: "t1",
    subject: "Order #1042 - Delivery Issue",
    last_received: "2026-03-01T14:22:00Z",
    messages: [
      { id: 1, google_id: "g1", sender: "Emma Lawson <emma@example.com>", title: "Order #1042 - Delivery Issue", text: "Hi, I placed order #1042 last week and it still hasn't arrived. The tracking shows it's been stuck in transit for 4 days. Can you help?", received_date: "2026-02-27T09:10:00Z" },
      { id: 2, google_id: "g2", sender: "Support <support@ourstore.com>", title: "Re: Order #1042 - Delivery Issue", text: "Hi Emma, thanks for reaching out. We're looking into this with our shipping partner and will update you within 24 hours.", received_date: "2026-02-27T11:30:00Z" },
      { id: 3, google_id: "g3", sender: "Emma Lawson <emma@example.com>", title: "Re: Order #1042 - Delivery Issue", text: "It's been 48 hours now. I'd like to request a refund if it can't be delivered.", received_date: "2026-03-01T14:22:00Z" },
    ],
  },
  {
    thread_id: "t2",
    subject: "Question about sizing for jacket",
    last_received: "2026-02-28T18:05:00Z",
    messages: [
      { id: 4, google_id: "g4", sender: "James Park <james@example.com>", title: "Question about sizing for jacket", text: "Hello, I'm looking at the Alpine Fleece Jacket. I'm usually a medium but sometimes large. Could you advise on sizing?", received_date: "2026-02-28T18:05:00Z" },
    ],
  },
  {
    thread_id: "t3",
    subject: "Wrong item received in order #1078",
    last_received: "2026-03-02T08:15:00Z",
    messages: [
      { id: 5, google_id: "g5", sender: "Cleo Maier <cleo@example.com>", title: "Wrong item received in order #1078", text: "I received a completely wrong item. I ordered the Merino Wool Scarf in navy, but got a beige one. Order #1078. Please help asap.", received_date: "2026-03-02T08:15:00Z" },
    ],
  },
  {
    thread_id: "t4",
    subject: "Shopify Partners: Weekly digest",
    last_received: "2026-02-28T21:41:00Z",
    messages: [
      { id: 6, google_id: "g6", sender: "Shopify Partners <partners@email.shopify.com>", title: "Shopify Partners: Weekly digest", text: "Your weekly partner digest is here. You had 3 new referrals this week and earned $120 in commissions. Keep up the great work!", received_date: "2026-02-28T21:41:00Z" },
    ],
  },
];

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

// ── Sub-components ────────────────────────────────────────────────────────────
function Avatar({ sender, size = 32 }) {
  const color = avatarColor(sender);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: size * 0.38, fontWeight: 700,
      color: "#0a0a0f", flexShrink: 0, fontFamily: "'DM Mono', monospace",
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
      transition: "all 0.2s",
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
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
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
              fontSize: 12, fontWeight: 600,
              color: active ? "#e2d9f3" : "#c4b5fd",
              fontFamily: "'DM Mono', monospace",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140,
            }}>
              {senderName(last.sender)}
            </span>
            <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
              {timeAgo(thread.last_received)}
            </span>
          </div>
          <div style={{
            fontSize: 12, color: active ? "#d1fae5" : "#9ca3af",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
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
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isOwn ? "flex-end" : "flex-start",
      marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, flexDirection: isOwn ? "row-reverse" : "row" }}>
        <Avatar sender={msg.sender} size={28} />
        <div style={{ maxWidth: "72%" }}>
          <div style={{
            fontSize: 10, color: "#6b7280", marginBottom: 4,
            fontFamily: "'DM Mono', monospace",
            textAlign: isOwn ? "right" : "left",
          }}>
            {senderName(msg.sender)} · {timeAgo(msg.received_date)}
          </div>
          <div style={{
            background: isOwn ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
            border: isOwn ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: isOwn ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
            padding: "12px 16px", fontSize: 13, color: "#e5e7eb",
            lineHeight: 1.6, wordBreak: "break-word",
          }}>
            {msg.text}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComposeBar() {
  return (
    <div style={{
      padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(0,0,0,0.2)", display: "flex", gap: 10, alignItems: "center",
      flexShrink: 0,
    }}>
      <input placeholder="Reply… (coming soon)" disabled style={{
        flex: 1, background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 8, padding: "10px 14px",
        color: "#6b7280", fontSize: 13, outline: "none",
        cursor: "not-allowed", fontFamily: "inherit",
      }} />
      <button disabled style={{
        background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
        color: "#6b7280", borderRadius: 8, padding: "10px 16px",
        cursor: "not-allowed", fontSize: 12, fontFamily: "'DM Mono', monospace",
      }}>
        SEND
      </button>
    </div>
  );
}

function AIPanel({ thread }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Select a thread and ask me to summarize it, detect possible actions, or apply them to Shopify." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const [applyingAction, setApplyingAction] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { setActions([]); }, [thread?.thread_id]);

  async function callClaude(userMessage) {
    const threadText = thread?.messages.map(m =>
      `From: ${m.sender}\nDate: ${m.received_date}\n\n${m.text}`
    ).join("\n\n---\n\n") || "No thread selected.";

    const systemPrompt = `You are an AI assistant for a Shopify customer support email client.

You have access to these Shopify actions:
- fetch_order_detail: Look up order details by order number
- fetch_client_detail: Look up customer details by email
- refund_order: Process a refund for an order

When asked to detect actions, respond with a JSON block like:
\`\`\`json
{"actions": ["fetch_order_detail", "refund_order"], "order_id": "1042", "customer_email": "emma@example.com"}
\`\`\`

When asked to summarize, give a concise 2-3 sentence summary.

Current email thread:
${threadText}`;

    const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [...history, { role: "user", content: userMessage }],
      }),
    });
    const data = await response.json();
    return data.content?.[0]?.text || "Sorry, I couldn't process that.";
  }

  function parseActions(text) {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1]); } catch { return null; }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const reply = await callClaude(userMsg);
      const parsed = parseActions(reply);
      if (parsed?.actions) setActions(parsed.actions.map(a => ({ type: a, ...parsed })));
      const displayText = reply.replace(/```json[\s\S]*?```/g, "").trim();
      setMessages(prev => [...prev, { role: "assistant", content: displayText || reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error contacting AI. Please try again." }]);
    }
    setLoading(false);
  }

  async function handleApply(action) {
    setApplyingAction(action.type);
    try {
      let result;
      if (action.type === "fetch_order_detail" && action.order_id) {
        const res = await fetch(`${API_BASE}/fetch_order_details/${action.order_id}`);
        result = await res.json();
      } else if (action.type === "fetch_client_detail" && action.customer_email) {
        const res = await fetch(`${API_BASE}/fetch_customer_details/${encodeURIComponent(action.customer_email)}`);
        result = await res.json();
      } else if (action.type === "refund_order" && action.order_id) {
        const res = await fetch(`${API_BASE}/refund_order/${action.order_id}`, { method: "POST" });
        result = await res.json();
      } else {
        result = { note: "Missing required parameters." };
      }
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✓ ${action.type} completed:\n${JSON.stringify(result, null, 2)}`
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `Failed: ${e.message}` }]);
    }
    setApplyingAction(null);
  }

  function QuickBtn({ label, prompt }) {
    return (
      <button onClick={() => setInput(prompt)} style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        color: "#9ca3af", borderRadius: 5, padding: "4px 10px",
        fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace",
        whiteSpace: "nowrap", transition: "all 0.15s",
      }}>
        {label}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
        <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#9ca3af", letterSpacing: "0.1em" }}>
          AI ASSISTANT
        </span>
      </div>

      {thread && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          <QuickBtn label="Summarize" prompt="Please summarize this email thread." />
          <QuickBtn label="Detect actions" prompt="What Shopify actions are relevant for this thread? Return JSON." />
          <QuickBtn label="Should I refund?" prompt="Based on this thread, should I issue a refund?" />
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 0" }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 14, display: "flex", flexDirection: "column",
            alignItems: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            {m.role === "assistant" && (
              <div style={{ fontSize: 9, color: "#6b7280", fontFamily: "'DM Mono', monospace", marginBottom: 4, letterSpacing: "0.08em" }}>
                ASSISTANT
              </div>
            )}
            <div style={{
              maxWidth: "90%",
              background: m.role === "user" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
              border: m.role === "user" ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.07)",
              borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
              padding: "10px 14px", fontSize: 12, color: "#e5e7eb",
              lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6",
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div style={{
            margin: "12px 0", background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: 12,
          }}>
            <div style={{ fontSize: 10, color: "#34d399", fontFamily: "'DM Mono', monospace", marginBottom: 10, letterSpacing: "0.08em" }}>
              DETECTED ACTIONS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {actions.map((action, i) => (
                <button key={i} onClick={() => handleApply(action)} disabled={applyingAction === action.type} style={{
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                  color: "#34d399", borderRadius: 6, padding: "7px 12px",
                  fontSize: 11, cursor: applyingAction === action.type ? "not-allowed" : "pointer",
                  fontFamily: "'DM Mono', monospace", textAlign: "left",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span>{action.type.replace(/_/g, " ").toUpperCase()}</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {applyingAction === action.type ? "applying..." : "▶ apply"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={thread ? "Ask about this thread…" : "Select a thread first…"}
            disabled={!thread || loading}
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "9px 12px",
              color: "#e5e7eb", fontSize: 12, outline: "none", fontFamily: "inherit",
            }}
          />
          <button onClick={handleSend} disabled={!thread || loading || !input.trim()} style={{
            background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.5)",
            color: "#c4b5fd", borderRadius: 8, padding: "9px 14px",
            cursor: (!thread || loading || !input.trim()) ? "not-allowed" : "pointer",
            fontSize: 14, opacity: (!thread || loading || !input.trim()) ? 0.4 : 1,
          }}>↑</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function MaildeskApp() {
  const [threads, setThreads] = useState(MOCK_THREADS);
  const [selectedId, setSelectedId] = useState(MOCK_THREADS[0].thread_id);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const selected = threads.find(t => t.thread_id === selectedId);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_BASE}/emails`, { method: "POST" });
      const data = await res.json();
      setSyncMsg(`Saved ${data.saved}, skipped ${data.skipped}`);
      const res2 = await fetch(`${API_BASE}/emails`);
      const data2 = await res2.json();
      if (data2.threads?.length) setThreads(data2.threads);
    } catch {
      setSyncMsg("Sync failed — using mock data");
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

      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: "#080810", color: "#e5e7eb",
        fontFamily: "'Syne', sans-serif",
      }}>
        {/* Topbar */}
        <div style={{
          height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.4)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>✉</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#f3f4f6" }}>
              maildesk
            </span>
            <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "#6b7280", letterSpacing: "0.12em" }}>
              SUPPORT CLIENT
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {syncMsg && (
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "#34d399", animation: "fadeIn 0.3s ease" }}>
                {syncMsg}
              </span>
            )}
            <SyncButton onSync={handleSync} syncing={syncing} />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Thread list */}
          <div style={{
            width: 280, flexShrink: 0,
            borderRight: "1px solid rgba(255,255,255,0.07)",
            overflow: "auto", background: "rgba(255,255,255,0.01)",
          }}>
            <div style={{
              padding: "12px 16px 8px", fontSize: 9,
              fontFamily: "'DM Mono', monospace", color: "#4b5563",
              letterSpacing: "0.12em", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              INBOX — {threads.length} THREADS
            </div>
            {threads.map(t => (
              <ThreadItem key={t.thread_id} thread={t} active={t.thread_id === selectedId} onClick={() => setSelectedId(t.thread_id)} />
            ))}
          </div>

          {/* Reader */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {selected ? (
              <>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f9fafb", marginBottom: 4, letterSpacing: "-0.02em" }}>
                    {selected.subject}
                  </h2>
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#6b7280" }}>
                    {selected.messages.length} message{selected.messages.length !== 1 ? "s" : ""} · last {timeAgo(selected.last_received)}
                  </span>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "24px 24px 12px" }}>
                  {selected.messages.map(m => <MessageBubble key={m.id} msg={m} />)}
                </div>
                <ComposeBar />
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" }}>
                Select a thread to read
              </div>
            )}
          </div>

          {/* AI panel */}
          <div style={{
            width: 320, flexShrink: 0,
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <AIPanel thread={selected} />
          </div>
        </div>
      </div>
    </>
  );
}