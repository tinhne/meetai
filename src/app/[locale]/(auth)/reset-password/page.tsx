import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ResetPasswordView } from "@/modules/auth/ui/views/reset-password-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  return { title: t("metaTitle"), robots: { index: false } };
}


interface Props {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const Page = async ({ searchParams }: Props) => {
  const { token, error } = await searchParams;

  return <ResetPasswordView token={error || !token ? null : token} />;
};

export default Page;
