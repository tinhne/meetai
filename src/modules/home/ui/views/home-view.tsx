"use client";

import { authClient } from "@/lib/auth-client";
import { BotIcon, VideoIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export const HomeView = () => {
  const { data } = authClient.useSession();

  const userName = data?.user?.name || "there";
  const userInitial = userName.charAt(0).toUpperCase();

  const quickLinks = [
    {
      href: "/dashboard/meetings",
      icon: VideoIcon,
      label: "My Meetings",
      description: "View and manage all your scheduled meetings",
      color: "bg-info/10 text-info",
    },
    {
      href: "/dashboard/agents",
      icon: BotIcon,
      label: "My Agents",
      description: "Configure and manage your AI agents",
      color: "bg-ai/10 text-ai",
    },
    {
      href: "/dashboard/upgrade",
      icon: SparklesIcon,
      label: "Upgrade Plan",
      description: "Unlock unlimited meetings and advanced features",
      color: "bg-warning/10 text-warning",
    },
  ];

  return (
    <div className="flex-1 py-8 px-4 md:px-8 flex flex-col gap-y-8 max-w-4xl mx-auto w-full">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        {data?.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.user.image}
            alt={userName}
            className="size-14 rounded-full border-2 border-primary/30"
          />
        ) : (
          <div className="size-14 rounded-full border-2 border-primary/30 bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
            {userInitial}
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground font-medium">Welcome back,</p>
          <h1 className="text-2xl font-bold tracking-tight">{userName} 👋</h1>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Quick Navigation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-3 p-5 rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200"
            >
              <div className={`p-2.5 rounded-xl w-fit ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Open <ArrowRightIcon className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started Tips */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="font-semibold text-base mb-1">Get started with Meet.AI</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Follow these steps to fully unlock the power of your AI meeting assistant.
        </p>
        <ol className="space-y-3">
          {[
            { step: "1", text: "Create an AI Agent in the Agents section", done: false },
            { step: "2", text: "Schedule a new Meeting and assign your agent", done: false },
            { step: "3", text: "Join the call — your agent will take notes automatically", done: false },
            { step: "4", text: "Review the AI-generated summary after the call", done: false },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                {item.step}
              </span>
              <span className="text-muted-foreground pt-0.5">{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};