import type { Metadata } from "next";

import { ForgotPasswordView } from "@/modules/auth/ui/views/forgot-password-view";

export const metadata: Metadata = {
  title: "Forgot password",
  robots: { index: false },
};

const Page = () => {
  return <ForgotPasswordView />;
};

export default Page;
