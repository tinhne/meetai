import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/page-header";
import { MemoryList } from "@/modules/memory/ui/components/memory-list";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("memory");
  return { title: t("title"), robots: { index: false } };
}

const Page = async () => {
  await requireSession();
  const t = await getTranslations("memory");

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
      <PageHeader title={t("title")} description={t("description")} />
      <MemoryList />
    </div>
  );
};

export default Page;
