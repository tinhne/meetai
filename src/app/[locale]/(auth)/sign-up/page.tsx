import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirectIfSignedIn } from "@/server/session";
import { SignUpView } from "@/modules/auth/ui/views/sign-up-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("metaTitle"), robots: { index: false } };
}

const page = async () => {
  await redirectIfSignedIn();

  return <SignUpView />;
};

export default page;
