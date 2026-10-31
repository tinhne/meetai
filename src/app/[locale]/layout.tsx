import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NuqsAdapter } from "nuqs/adapters/next";

import { TRPCReactProvider } from "@/trpc/client";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "../globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "metadata",
  });

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "https://meetai-assistant.vercel.app",
    ),
    title: {
      default: t("title"),
      template: "%s | Meet.AI",
    },
    description: t("description"),
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
      locale: locale === "en" ? "en_US" : "vi_VN",
      url: "https://meetai-assistant.vercel.app",
      title: t("title"),
      description: t("description"),
      siteName: "Meet.AI",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      creator: "@meetai",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} className={beVietnamPro.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            <NuqsAdapter>
              <TRPCReactProvider>
                <Toaster position="top-right" />
                {children}
              </TRPCReactProvider>
            </NuqsAdapter>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
