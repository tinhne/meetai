import type { Metadata } from "next";

import { ResetPasswordView } from "@/modules/auth/ui/views/reset-password-view";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const Page = async ({ searchParams }: Props) => {
  const { token, error } = await searchParams;

  return <ResetPasswordView token={error || !token ? null : token} />;
};

export default Page;
