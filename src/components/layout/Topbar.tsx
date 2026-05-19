import { Bell, Command, Search, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

interface Props { onCommand: () => void; onAssistant: () => void; }

export const Topbar = ({ onCommand, onAssistant }: Props) => {
  const { theme, toggle } = useTheme();
  return (
    <header className="h-16 shrink-0 border-b border-border bg-background/60 backdrop-blur-xl flex items-center px-6 gap-4">
      <div className="flex items-center gap-2 text-xs mono text-muted-foreground">
        <span className="status-dot bg-neon-green animate-pulse-glow" />
        <span className="uppercase tracking-widest">Live · prod-us-east-1</span>
        <span className="text-border">/</span>
        <span>{new Date().toUTCString().slice(17, 25)} UTC</span>
      </div>
      <button onClick={onCommand}
        className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/60 border border-border hover:border-primary/40 transition text-sm text-muted-foreground w-72">
        <Search className="h-4 w-4" />
        <span>Search or run command…</span>
        <kbd className="ml-auto mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border">⌘K</kbd>
      </button>
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-neon-pink animate-pulse" />
      </Button>
      <Button onClick={onAssistant} size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
        <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Ask Forge
      </Button>
    </header>
  );
};
