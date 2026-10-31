import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { JoinView } from "@/modules/join/ui/join-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

interface Props {
  params: Promise<{ code: string }>;
}

const Page = async ({ params }: Props) => {
  const { code } = await params;
  return <JoinView code={code} />;
};

export default Page;
