import Link from "next/link";
import {
  ArrowRightIcon,
  BotIcon,
  ShieldCheckIcon,
  VideoIcon,
  ZapIcon,
} from "lucide-react";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border/10">
        <Link className="flex items-center justify-center gap-2" href="/">
          <Image
            src="/logo.svg"
            alt="Meet.AI Logo"
            width={28}
            height={28}
            className="w-7 h-7"
          />
          <span className="font-semibold text-xl tracking-tight">Meet.AI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link
            className="text-sm font-medium hover:text-[#5D6B68] underline-offset-4 hover:underline transition-colors"
            href="#features"
          >
            Features
          </Link>
          {session ? (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#5D6B68] px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-[#5D6B68]/90"
              href="/dashboard"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                className="text-sm font-medium hover:text-[#5D6B68] underline-offset-4 hover:underline transition-colors"
                href="/sign-in"
              >
                Sign In
              </Link>
              <Link
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#5D6B68] px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-[#5D6B68]/90 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                href="/sign-up"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex items-center justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-4 max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-border/20 bg-muted/50 px-3 py-1 text-sm font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-[#5D6B68] mr-2"></span>
                  The Future of Meetings is Here
                </div>
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
                  AI Meeting Assistant for Transcription, Summaries & Smart
                  Notes
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Enhance your team&apos;s productivity with AI-driven
                  summaries, autonomous agents, and real-time meeting
                  intelligence. Meet.AI handles the notes so you can focus on
                  the conversation.
                </p>
              </div>
              <div className="space-x-4 pt-4">
                {session ? (
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-md bg-[#5D6B68] px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[#5D6B68]/90 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    href="/dashboard"
                  >
                    Go to Dashboard <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      className="inline-flex h-11 items-center justify-center rounded-md bg-[#5D6B68] px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[#5D6B68]/90 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      href="/sign-up"
                    >
                      Start for free <ArrowRightIcon className="ml-2 h-4 w-4" />
                    </Link>
                    <Link
                      className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      href="/sign-in"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32 bg-muted/50 flex flex-col items-center justify-center border-y border-border/10"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                Smart Features for Smart Teams
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl">
                Everything you need to run effective meetings and manage your
                video calls effortlessly.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-background shadow-xs border border-border/10 hover:border-[#5D6B68]/30 transition-colors">
                <div className="p-3 bg-[#5D6B68]/10 rounded-full text-[#5D6B68]">
                  <VideoIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">HD Video Meetings</h3>
                <p className="text-muted-foreground">
                  Crystal clear video calls with low latency, powered by
                  advanced streaming technology.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-background shadow-xs border border-border/10 hover:border-[#5D6B68]/30 transition-colors">
                <div className="p-3 bg-[#5D6B68]/10 rounded-full text-[#5D6B68]">
                  <BotIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">AI Agents</h3>
                <p className="text-muted-foreground">
                  Deploy autonomous agents to join meetings, take notes, and
                  extract actionable insights contextually.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-6 rounded-2xl bg-background shadow-xs border border-border/10 hover:border-[#5D6B68]/30 transition-colors">
                <div className="p-3 bg-[#5D6B68]/10 rounded-full text-[#5D6B68]">
                  <ZapIcon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Instant Summaries</h3>
                <p className="text-muted-foreground">
                  Get high-quality transcriptions and bullet-point summaries
                  seconds after your meeting ends.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 flex items-center justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-8 md:p-12 lg:p-16 rounded-3xl bg-linear-to-b from-[#5D6B68]/10 to-transparent border border-[#5D6B68]/20">
              <ShieldCheckIcon className="h-12 w-12 text-[#5D6B68] mb-4" />
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Ready to transform your meetings?
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Join thousands of productive teams who have upgraded their
                workflow with Meet.AI.
              </p>
              {session ? (
                <Link
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[#5D6B68] px-10 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[#5D6B68]/90"
                  href="/dashboard"
                >
                  Go to your Dashboard
                </Link>
              ) : (
                <Link
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-[#5D6B68] px-10 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[#5D6B68]/90"
                  href="/sign-up"
                >
                  Create your free account
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Seo section */}

      <section className="w-full py-16 border-t border-border/10">
        <div className="container max-w-4xl mx-auto px-4 space-y-10">
          <div>
            <h2 className="text-2xl font-bold mb-4">
              What is an AI Meeting Assistant?
            </h2>
            <p className="text-muted-foreground">
              An AI meeting assistant helps you automatically record,
              transcribe, and summarize meetings. With Meet.AI, you can generate
              accurate meeting transcripts, extract action items, and even chat
              with your meeting content using AI.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">How Meet.AI Works</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>1. Join or record your meeting</li>
              <li>2. AI transcribes audio in real-time</li>
              <li>3. Generate summaries and key insights</li>
              <li>4. Ask questions using AI chat</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Use Cases</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Team meetings and standups</li>
              <li>• Sales calls and customer interviews</li>
              <li>• Online classes and lectures</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 flex flex-col sm:flex-row items-center justify-between px-4 lg:px-6 border-t border-border/10 flex-shrink-0">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Meet.AI Inc. All rights reserved.
        </p>
        <nav className="flex gap-4 sm:gap-6 mt-4 sm:mt-0">
          <Link
            className="text-xs hover:underline underline-offset-4 text-muted-foreground"
            href="#"
          >
            Terms of Service
          </Link>
          <Link
            className="text-xs hover:underline underline-offset-4 text-muted-foreground"
            href="#"
          >
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
