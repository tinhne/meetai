import { MeetingGetOne } from "../../types";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { meetingInsertSchema } from "../../schemas/schemas";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GeneratedAvatar } from "@/components/generated-avatar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState } from "react";
import { CommandSelect } from "../../../../components/command-select";
import { NewAgentDialog } from "@/modules/agents/ui/components/new-agent-dialog";
import { getQuotaInfo } from "@/modules/billing/lib/quota-dialog";
import { format } from "date-fns";
import {
  AI_MODES,
  MEETING_TEMPLATES,
  type AiMode,
  type MeetingTemplate,
} from "@/config/ai";
import { useTranslations } from "next-intl";
import {
  MEETING_LANGUAGES,
  type MeetingLanguage,
} from "../../lib/stream";



// <input type="datetime-local"> works in local time; the API expects UTC ISO.
const toLocalInputValue = (iso?: string | null) =>
  iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "";

interface MeetingFormProps {
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
  initialValues?: MeetingGetOne;
}

export const MeetingForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: MeetingFormProps) => {
  const trpc = useTRPC();
  const tAi = useTranslations("aiModes");
  const t = useTranslations("meetings");
  const tForm = useTranslations("meetings.form");
  const tLanguages = useTranslations("languages");
  const tTemplates = useTranslations("templates");
  const queryClient = useQueryClient();

  const [openNewAgentDialog, setOpenNewAgentDialog] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");

  const agents = useQuery(
    trpc.agents.getMany.queryOptions({
      pageSize: 100,
      search: agentSearch,
    }),
  );

  const createMeeting = useMutation(
    trpc.meetings.create.mutationOptions({
      onSuccess: async (data) => {
        toast.success(t("created"));

        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.billing.getOverview.queryOptions());

        onSuccess?.(data.id);
      },
      onError: (error) => {
        // Quota errors open the upgrade dialog instead.
        if (!getQuotaInfo(error)) toast.error(error.message);
      },
    }),
  );

  const updateMeeting = useMutation(
    trpc.meetings.update.mutationOptions({
      onSuccess: async () => {
        toast.success(t("updated"));

        await queryClient.invalidateQueries(
          trpc.meetings.getMany.queryOptions({}),
        );

        if (initialValues?.id) {
          await queryClient.invalidateQueries(
            trpc.meetings.getOne.queryOptions({ id: initialValues.id }),
          );
        }
        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const form = useForm<z.infer<typeof meetingInsertSchema>>({
    resolver: zodResolver(meetingInsertSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      agentId: initialValues?.agentId ?? "",
      language: (initialValues?.language as MeetingLanguage) ?? "vi",
      template: (initialValues?.template as MeetingTemplate) ?? "general",
      aiMode: (initialValues?.aiMode as AiMode) ?? "conversational",
      agenda: initialValues?.agenda ?? "",
      scheduledAt: initialValues?.scheduledAt
        ? new Date(initialValues.scheduledAt).toISOString()
        : undefined,
    },
  });

  const isEdit = !!initialValues?.id;
  // Agent and language are locked once the meeting has started.
  const isLocked = isEdit && initialValues?.status !== "upcoming";
  const isPending = createMeeting.isPending || updateMeeting.isPending;

  const onSubmit = async (values: z.infer<typeof meetingInsertSchema>) => {
    if (isEdit && initialValues?.id) {
      updateMeeting.mutate({ ...values, id: initialValues.id });
    } else {
      createMeeting.mutate(values);
    }
  };

  return (
    <>
      <NewAgentDialog
        open={openNewAgentDialog}
        onOpenChange={setOpenNewAgentDialog}
        stayOnPage
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("name")}</FormLabel>
                <FormControl>
                  <Input placeholder={tForm("namePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("agent")}</FormLabel>
                <FormControl>
                  <CommandSelect
                    disabled={isLocked}
                    options={(agents.data?.items ?? []).map((agent) => ({
                      id: agent.id,
                      value: agent.id,
                      children: (
                        <div className="flex items-center space-x-2">
                          <GeneratedAvatar
                            seed={agent.name}
                            variant="botttsNeutral"
                            className="border size-8"
                          />
                          <span>{agent.name}</span>
                        </div>
                      ),
                    }))}
                    onSelect={field.onChange}
                    onSearch={setAgentSearch}
                    value={field.value}
                    placeholder={tForm("agentPlaceholder")}
                  />
                </FormControl>
                <FormDescription>
                  {tForm("agentMissing")}{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="text-primary hover:underline"
                    onClick={() => setOpenNewAgentDialog(true)}
                  >
                    {tForm("createAgent")}
                  </Button>
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("language")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLocked}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEETING_LANGUAGES.map((language) => (
                      <SelectItem key={language} value={language}>
                        {tLanguages(language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{tForm("languageHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="aiMode"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("aiMode")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {AI_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {tAi(mode)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>{tAi(`${field.value}Hint`)}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="template"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("template")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEETING_TEMPLATES.map((template) => (
                      <SelectItem key={template} value={template}>
                        {tTemplates(template)}
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
            name="scheduledAt"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("scheduledAt")}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={toLocalInputValue(field.value)}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value
                          ? new Date(event.target.value).toISOString()
                          : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="agenda"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{tForm("agenda")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={tForm("agendaPlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between space-x-2">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                disabled={isPending}
                type="button"
              >
                {tForm("cancel")}
              </Button>
            )}
            <Button disabled={isPending} type="submit">
              {isEdit ? tForm("update") : tForm("create")}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};
