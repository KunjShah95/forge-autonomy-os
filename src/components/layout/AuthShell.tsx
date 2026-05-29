import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { ServiceGraph } from "@/components/ServiceGraph";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  footnote: string;
  primaryAction: ReactNode;
  secondaryAction: ReactNode;
  children: ReactNode;
}

export const AuthShell = ({
  eyebrow,
  title,
  subtitle,
  footnote,
  primaryAction,
  secondaryAction,
  children,
}: AuthShellProps) => {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-white text-black selection:bg-black selection:text-white">
      {/* Left visual */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-black/5 bg-white">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/20 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/20 blur-3xl rounded-full" />
        <div className="relative flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.6)]">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display font-bold text-xl">ForgeAI</div>
            <div className="mono text-[10px] text-muted-foreground uppercase tracking-widest">production OS · v4.2</div>
          </div>
        </div>
        <div className="relative flex-1 my-10">
          <ServiceGraph height={420} />
        </div>
        <div className="relative max-w-md space-y-4">
          <div className="mono text-[10px] uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
          <h2 className="font-display text-3xl font-bold leading-tight">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {primaryAction}
            {secondaryAction}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
            {eyebrow}
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-4">{title}</h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-[11px] text-muted-foreground leading-relaxed">{footnote}</p>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-black/10" />
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:opacity-80 transition-colors">
              Return to the mission
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
