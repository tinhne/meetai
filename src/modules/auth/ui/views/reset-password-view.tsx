"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { OctagonAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { getAuthErrorKey } from "../../lib/errors";
import { AuthCard } from "../components/auth-shell";

interface Props {
  token: string | null;
}

export const ResetPasswordView = ({ token }: Props) => {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formSchema = useMemo(
    () =>
      z
        .object({
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
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token) {
    return (
      <AuthCard>
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold">{t("reset.expiredTitle")}</h1>
          <p className="text-muted-foreground text-balance">
            {t("reset.expiredDescription")}
          </p>
          <Button asChild>
            <Link href="/forgot-password">{t("reset.requestNew")}</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setError(null);
    setPending(true);

    const { error } = await authClient.resetPassword({
      newPassword: data.password,
      token,
    });

    setPending(false);

    if (error) {
      setError(t(`errors.${getAuthErrorKey(error)}`));
      return;
    }

    toast.success(t("reset.success"));
    router.push("/sign-in");
  };

  return (
    <AuthCard>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
        >
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            {t("reset.title")}
          </h1>
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.newPassword")}</FormLabel>
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
            {t("reset.submit")}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
};
