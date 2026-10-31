import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirectIfSignedIn } from "@/server/session";
import { SignInView } from "@/modules/auth/ui/views/sign-in-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("metaTitle"), robots: { index: false } };
}

const page = async () => {
  await redirectIfSignedIn();

  return <SignInView />;
};

export default page;
