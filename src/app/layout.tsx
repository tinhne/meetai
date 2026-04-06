import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next";

import { TRPCReactProvider } from "@/trpc/client";

import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://meetai-assistant.vercel.app",
  ),
  title: {
    default: "AI Meeting Assistant - Transcribe, Summarize & Chat | Meet.AI",
    template: "%s | Meet.AI",
  },
  description:
    "Record meetings, generate transcripts, summaries, and chat with your meetings using AI. Built for teams and developers.",
  keywords: [
    "AI",
    "Meeting Assistant",
    "Meeting Notes",
    "Transcriptions",
    "AI Agents",
    "Meet.AI",
  ],
  authors: [{ name: "Meet.AI" }],
  creator: "Meet.AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://meetai-assistant.vercel.app",
    title: "Meet.AI - AI Meeting Assistant",
    description: "AI-powered meeting notes, summaries, and AI-driven agents.",
    siteName: "Meet.AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet.AI - AI Meeting Assistant",
    description:
      "AI-powered meeting notes, summaries, and actionable insights.",
    creator: "@meetai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <NuqsAdapter>
          <TRPCReactProvider>
            <Toaster position="top-right" />
            {children}
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
