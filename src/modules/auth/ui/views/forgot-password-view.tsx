"use client";

import { z } from "zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.email(),
});

export const ForgotPasswordView = () => {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setPending(true);
    // Always show the same message so emails cannot be enumerated.
    await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    setSent(true);
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="text-muted-foreground text-balance">
              If an account exists for that email, we sent a link to reset
              your password. The link expires in 1 hour.
            </p>
            <Button asChild variant="outline">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Forgot your password?</h1>
                <p className="text-muted-foreground text-balance">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full" type="submit" disabled={pending}>
                Send reset link
              </Button>
              <div className="text-sm text-center">
                <Link href="/sign-in" className="underline underline-offset-4">
                  Back to sign in
                </Link>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};
