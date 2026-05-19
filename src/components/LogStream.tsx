import { useEffect, useState } from "react";
import { events as seed } from "@/lib/mock";

const levelColor: Record<string, string> = {
  info: "text-primary",
  ok: "text-neon-green",
  warn: "text-neon-amber",
  err: "text-neon-red",
};

const extras = [
  { agent: "SRE", msg: "Auto-scaled orders-svc 4→7 replicas (CPU 78%)", level: "info" },
  { agent: "QA", msg: "Synthesized 12 edge-case tests for billing-svc", level: "ok" },
  { agent: "Security", msg: "Rotated KMS key kms-prod-04 (90-day policy)", level: "ok" },
  { agent: "Arch", msg: "Proposed extracting payments → payments-svc (debt -18%)", level: "info" },
  { agent: "DevOps", msg: "Cache hit ratio +4.2% after redis warmup", level: "ok" },
  { agent: "SRE", msg: "Error budget for users-svc burned 3.1x in 10m window", level: "warn" },
];

export const LogStream = ({ max = 12 }: { max?: number }) => {
  const [items, setItems] = useState(seed.slice(0, max));
  useEffect(() => {
    const id = setInterval(() => {
      const e = extras[Math.floor(Math.random() * extras.length)];
      const t = new Date().toISOString().slice(11, 19);
      setItems(prev => [{ t, ...e }, ...prev].slice(0, max));
    }, 2400);
    return () => clearInterval(id);
  }, [max]);
  return (
    <div className="font-mono text-[11px] leading-relaxed p-4 overflow-y-auto h-full">
      {items.map((e, i) => (
        <div key={i} className="flex gap-2 py-0.5 animate-fade-in">
          <span className="text-muted-foreground/60">{e.t}</span>
          <span className="text-accent">[{e.agent}]</span>
          <span className={levelColor[e.level]}>›</span>
          <span className="text-foreground/80 flex-1">{e.msg}</span>
        </div>
      ))}
    </div>
  );
};
