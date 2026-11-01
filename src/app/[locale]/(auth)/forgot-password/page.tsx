import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordView } from "@/modules/auth/ui/views/forgot-password-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgot");
  return { title: t("metaTitle"), robots: { index: false } };
}


const Page = () => {
  return <ForgotPasswordView />;
};

export default Page;
