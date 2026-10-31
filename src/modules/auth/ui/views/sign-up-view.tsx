"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon, OctagonAlertIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { track } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorKey } from "../../lib/errors";
import { AuthCard, AuthShell } from "../components/auth-shell";
import { SocialButtons, type SocialProvider } from "../components/social-buttons";

export const SignUpView = () => {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );

  const formSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().trim().min(2, t("validation.nameMin")),
          email: z.email(t("validation.emailInvalid")),
          password: z.string().min(8, t("validation.passwordMin")),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("validation.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const callbackURL = getPathname({ href: "/dashboard", locale });

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

    authClient.signUp.email(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL,
      },
      {
        onSuccess: ({ data: result }) => {
          setPending(false);
          track("signup_completed", { method: "email" });
          // No session token means the email must be verified first.
          if (result?.token) {
            router.push("/dashboard");
          } else {
            setVerificationEmail(data.email);
          }
        },
        onError: ({ error }) => {
          setPending(false);
          setError(t(`errors.${getAuthErrorKey(error)}`));
        },
      },
    );
  };

  if (verificationEmail) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheckIcon className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">
            {t("signUp.checkInboxTitle")}
          </h1>
          <p className="text-muted-foreground text-balance">
            {t("signUp.checkInboxDescription", { email: verificationEmail })}
          </p>
          <Button asChild variant="outline">
            <Link href="/sign-in">{t("backToSignIn")}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthShell>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("signUp.title")}
              </h1>
              <p className="text-muted-foreground text-balance">
                {t("signUp.subtitle")}
              </p>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.name")}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder={t("fields.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormLabel>{t("fields.password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("fields.confirmPassword")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
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
              {t("signUp.submit")}
            </Button>
            <SocialButtons disabled={pending} onSelect={onSocial} />
            <p className="text-sm text-center">
              {t("signUp.haveAccount")}{" "}
              <Link href="/sign-in" className="font-medium underline underline-offset-4">
                {t("signUp.signInLink")}
              </Link>
            </p>
          </div>
        </form>
      </Form>
    </AuthShell>
  );
};
