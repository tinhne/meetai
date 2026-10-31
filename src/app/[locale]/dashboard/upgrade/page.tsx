import { redirect } from "@/i18n/navigation";
import { toAppLocale } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

// Old URL (emails, bookmarks) → billing page.
const Page = async ({ params }: Props) => {
  const { locale } = await params;
  redirect({ href: "/dashboard/billing", locale: toAppLocale(locale) });
};

export default Page;
