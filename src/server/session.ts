import "server-only";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// Redirects to the localized sign-in page when there is no session.
export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect({ href: "/sign-in", locale: await getLocale() });
  }

  return session;
}

// For auth pages: signed-in users go straight to the dashboard.
export async function redirectIfSignedIn() {
  const session = await getSession();

  if (session) {
    redirect({ href: "/dashboard", locale: await getLocale() });
  }
}
