import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const sample = [
  "I've analyzed the last 24h of telemetry. p99 latency on billing-svc rose 38% — root cause likely the new connection pool config in v1.22.0. Want me to draft a rollback?",
  "3 deployments scheduled in the next hour. Risk score: 12 / 28 / 41. The third (billing-svc) hits a known canary regression — I'd suggest promoting only to 5% traffic first.",
  "I drafted remediation plans for INC-2847 and pre-warmed a rollback branch. Approve?",
];

export const AssistantPanel = ({ open, onOpenChange }: Props) => {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Forge online. I'm watching 14 services and 6 agents across prod-us-east-1. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const q = input;
    setMessages(m => [...m, { role: "user", text: q }]);
    setInput("");
    setTimeout(() => setMessages(m => [...m, { role: "ai", text: sample[Math.floor(Math.random() * sample.length)] }]), 600);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 30 }}
          className="fixed top-20 right-6 bottom-6 w-96 glass-strong rounded-xl z-40 flex flex-col overflow-hidden border-primary/30 shadow-[0_0_60px_hsl(var(--primary)/0.25)]">
          <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <div className="font-display text-sm font-semibold">Forge Assistant</div>
            <span className="mono text-[10px] text-neon-green ml-auto flex items-center gap-1"><span className="status-dot bg-neon-green" /> online</span>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "bg-primary/15 border border-primary/30 px-3 py-2 rounded-lg max-w-[85%]"
                  : "bg-secondary/60 border border-border px-3 py-2 rounded-lg max-w-[85%]"}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything about production..."
              className="flex-1 bg-secondary/60 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50" />
            <button onClick={send} className="px-3 rounded-md bg-gradient-to-r from-primary to-accent text-primary-foreground"><Send className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
