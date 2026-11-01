import {
  BriefcaseIcon,
  GraduationCapIcon,
  LanguagesIcon,
  NotebookPenIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

import type { AgentTemplate } from "@/config/agent-templates";

const ICONS = {
  notebook: NotebookPenIcon,
  users: UsersIcon,
  briefcase: BriefcaseIcon,
  languages: LanguagesIcon,
  graduation: GraduationCapIcon,
  trending: TrendingUpIcon,
  sparkles: SparklesIcon,
};

export const TemplateIcon = ({
  icon,
  className,
}: {
  icon: AgentTemplate["icon"];
  className?: string;
}) => {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden />;
};
