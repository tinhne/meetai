import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsView } from "@/modules/settings/ui/views/settings-view";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title"), robots: { index: false } };
}

const Page = async () => {
  await requireSession();

  return <SettingsView />;
};

export default Page;
