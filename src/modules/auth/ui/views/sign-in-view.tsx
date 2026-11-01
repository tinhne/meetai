"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { OctagonAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getPathname, Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorKey } from "../../lib/errors";
import { AuthShell } from "../components/auth-shell";
import { SocialButtons, type SocialProvider } from "../components/social-buttons";

export const SignInView = () => {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.email(t("validation.emailInvalid")),
        password: z.string().min(1, t("validation.passwordRequired")),
      }),
    [t],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // Only same-site relative paths, e.g. a meeting join link.
  const next = useSearchParams().get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const callbackURL = getPathname({ href: target, locale });

  const onSocial = (provider: SocialProvider) => {
    setError(null);
    setPending(true);

    authClient.signIn.social(
      { provider, callbackURL },
      {
        onError: ({ error }) => {
          setPending(false);
          setError(t(`errors.${getAuthErrorKey(error)}`));
        },
      },
    );
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setError(null);
    setPending(true);

    authClient.signIn.email(
      { email: data.email, password: data.password, callbackURL },
      {
        onSuccess: () => {
          setPending(false);
          router.push(target);
        },
        onError: ({ error }) => {
          setPending(false);
          setError(t(`errors.${getAuthErrorKey(error)}`));
        },
      },
    );
  };

  return (
    <AuthShell>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("signIn.title")}
              </h1>
              <p className="text-muted-foreground text-balance">
                {t("signIn.subtitle")}
              </p>
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.email")}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder={t("fields.emailPlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("fields.password")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {t("signIn.forgotPassword")}
                    </Link>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!!error && (
              <Alert className="bg-destructive/10 border-none" role="alert">
                <OctagonAlertIcon className="h-4 w-4 !text-destructive" />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            <Button className="w-full" type="submit" disabled={pending}>
              {t("signIn.submit")}
            </Button>
            <SocialButtons disabled={pending} onSelect={onSocial} />
            <p className="text-sm text-center">
              {t("signIn.noAccount")}{" "}
              <Link href="/sign-up" className="font-medium underline underline-offset-4">
                {t("signIn.signUpLink")}
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </AuthShell>
  );
};
