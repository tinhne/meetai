"use client";

import { BookOpenIcon, BrainIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgePanel } from "./knowledge-panel";
import { AgentMemoryToggle, MemoryList } from "./memory-list";

// What an agent knows: learned memories and uploaded knowledge.
export const AgentLearning = ({ agentId, memoryEnabled }: { agentId: string; memoryEnabled: boolean }) => {
  const t = useTranslations("memory");
  const tKnowledge = useTranslations("knowledge");

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <Tabs defaultValue="memory" className="gap-4">
        <TabsList>
          <TabsTrigger value="memory">
            <BrainIcon />
            {t("tabs.memory")}
          </TabsTrigger>
          <TabsTrigger value="knowledge">
            <BookOpenIcon />
            {t("tabs.knowledge")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="memory" className="flex flex-col gap-4">
          <AgentMemoryToggle agentId={agentId} enabled={memoryEnabled} />
          <MemoryList agentId={agentId} />
        </TabsContent>
        <TabsContent value="knowledge" className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{tKnowledge("description")}</p>
          <KnowledgePanel agentId={agentId} />
        </TabsContent>
      </Tabs>
    </section>
  );
};
