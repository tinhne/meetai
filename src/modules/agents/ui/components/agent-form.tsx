"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REALTIME_VOICES } from "@/config/ai";
import { useRouter } from "@/i18n/navigation";
import { useTRPC } from "@/trpc/client";
import { agentInsertSchema } from "../../schemas/schemas";
import { AgentGetOne } from "../../types";

type AgentFormValues = z.infer<typeof agentInsertSchema>;

interface AgentFormProps {
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
  // Back to the template gallery (create flow only).
  onBack?: () => void;
  initialValues?: AgentGetOne;
  defaults?: Partial<AgentFormValues>;
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const AgentForm = ({
  onSuccess,
  onCancel,
  onBack,
  initialValues,
  defaults,
}: AgentFormProps) => {
  const t = useTranslations("agents");
  const tForm = useTranslations("agents.form");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidate = async (id?: string) => {
    await queryClient.invalidateQueries(trpc.agents.getMany.queryOptions({}));
    await queryClient.invalidateQueries(trpc.premium.getFreeUsage.queryOptions());
    await queryClient.invalidateQueries(trpc.dashboard.getOverview.queryOptions());
    if (id) await queryClient.invalidateQueries(trpc.agents.getOne.queryOptions({ id }));
  };

  const createAgent = useMutation(
    trpc.agents.create.mutationOptions({
      onSuccess: async (agent) => {
        toast.success(t("created"));
        await invalidate();
        onSuccess?.(agent.id);
      },
      onError: (error) => {
        toast.error(error.message);
        if (error.data?.code === "FORBIDDEN") router.push("/dashboard/upgrade");
      },
    }),
  );

  const updateAgent = useMutation(
    trpc.agents.update.mutationOptions({
      onSuccess: async (agent) => {
        toast.success(t("updated"));
        await invalidate(agent.id);
        onSuccess?.(agent.id);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentInsertSchema),
    defaultValues: {
      name: initialValues?.name ?? defaults?.name ?? "",
      instructions: initialValues?.instructions ?? defaults?.instructions ?? "",
      voice: ((initialValues?.voice ?? defaults?.voice ?? "alloy") as AgentFormValues["voice"]),
    },
  });

  const isEdit = !!initialValues?.id;
  const isPending = createAgent.isPending || updateAgent.isPending;
  const name = form.watch("name");

  const onSubmit = (values: AgentFormValues) => {
    if (isEdit && initialValues?.id) {
      updateAgent.mutate({ ...values, id: initialValues.id });
    } else {
      createAgent.mutate(values);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="flex items-start gap-4">
          <GeneratedAvatar seed={name} variant="botttsNeutral" className="size-14 shrink-0 border" />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("name")}</FormLabel>
                <FormControl>
                  <Input placeholder={tForm("namePlaceholder")} {...field} />
                </FormControl>
                <FormDescription>{tForm("nameHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="voice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForm("voice")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {REALTIME_VOICES.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {capitalize(voice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForm("instructions")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={tForm("instructionsPlaceholder")}
                  className="min-h-40"
                  {...field}
                />
              </FormControl>
              <FormDescription>{tForm("instructionsHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {onBack && (
              <Button type="button" variant="ghost" onClick={onBack} disabled={isPending}>
                {tForm("back")}
              </Button>
            )}
            {onCancel && !onBack && (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
                {tForm("cancel")}
              </Button>
            )}
          </div>
          <Button disabled={isPending} type="submit">
            {isEdit ? tForm("update") : tForm("create")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
