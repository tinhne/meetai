import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PracticeView } from "@/modules/practice/ui/practice-view";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("practice");
  return { title: t("title"), robots: { index: false } };
}

const Page = async () => {
  await requireSession();
  return <PracticeView />;
};

export default Page;
