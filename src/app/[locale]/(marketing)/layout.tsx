import { setRequestLocale } from "next-intl/server";

import { toAppLocale } from "@/i18n/routing";

import { CookieConsent } from "@/modules/marketing/ui/cookie-consent";
import { JsonLd } from "@/modules/marketing/ui/json-ld";
import { MarketingFooter } from "@/modules/marketing/ui/marketing-footer";
import { MarketingNavbar } from "@/modules/marketing/ui/marketing-navbar";
import { organizationSchema, websiteSchema } from "@/modules/marketing/lib/structured-data";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// Static marketing shell: no session lookups here (the CTAs decide on the client).
const MarketingLayout = async ({ children, params }: Props) => {
  const { locale } = await params;
  setRequestLocale(toAppLocale(locale));

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <MarketingNavbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter locale={toAppLocale(locale)} />
      <CookieConsent />
      <JsonLd data={[organizationSchema(), websiteSchema(locale)]} />
    </div>
  );
};

export default MarketingLayout;
