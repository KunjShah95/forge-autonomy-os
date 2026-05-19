import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "@/components/CommandPalette";
import { AssistantPanel } from "@/components/AssistantPanel";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onCommand={() => setCmdOpen(true)} onAssistant={() => setAiOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto bg-grid">
          <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <AssistantPanel open={aiOpen} onOpenChange={setAiOpen} />
    </div>
  );
};
