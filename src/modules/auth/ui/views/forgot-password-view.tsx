"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { getPathname, Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthCard } from "../components/auth-shell";

export const ForgotPasswordView = () => {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const formSchema = useMemo(
    () => z.object({ email: z.email(t("validation.emailInvalid")) }),
    [t],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setPending(true);
    // Always show the same message so emails cannot be enumerated.
    await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: getPathname({ href: "/reset-password", locale }),
    });
    setPending(false);
    setSent(true);
  };

  return (
    <AuthCard>
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <MailCheckIcon className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">{t("forgot.sentTitle")}</h1>
          <p className="text-muted-foreground text-balance">
            {t("forgot.sentDescription")}
          </p>
          <Button asChild variant="outline">
            <Link href="/sign-in">{t("backToSignIn")}</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
            noValidate
          >
            <div className="flex flex-col items-center text-center gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("forgot.title")}
              </h1>
              <p className="text-muted-foreground text-balance">
                {t("forgot.subtitle")}
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
            <Button className="w-full" type="submit" disabled={pending}>
              {t("forgot.submit")}
            </Button>
            <p className="text-sm text-center">
              <Link href="/sign-in" className="underline underline-offset-4">
                {t("backToSignIn")}
              </Link>
            </p>
          </form>
        </Form>
      )}
    </AuthCard>
  );
};
