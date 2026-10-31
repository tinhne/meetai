import "server-only";

import { Resend } from "resend";

import { env, isEmailDeliveryEnabled } from "@/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function actionEmail(params: {
  greeting?: string;
  name: string;
  intro: string;
  actionLabel: string;
  url: string;
  outro: string;
}) {
  const name = escapeHtml(params.name);
  const url = escapeHtml(params.url);

  return `<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f8;padding:24px;color:#111">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
      <tr><td>
        <p style="font-size:16px">${escapeHtml(params.greeting ?? "Hi")}${name ? ` ${name}` : ""},</p>
        <p style="font-size:16px;line-height:1.5">${params.intro}</p>
        <p style="margin:28px 0">
          <a href="${url}" style="background:#16a34a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${params.actionLabel}</a>
        </p>
        <p style="font-size:13px;color:#555;line-height:1.5">${params.outro}</p>
        <p style="font-size:12px;color:#888;word-break:break-all">${url}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  devLink: string;
  attachments?: { filename: string; content: string }[];
}) {
  if (!isEmailDeliveryEnabled || !resend || !env.EMAIL_FROM) {
    if (env.NODE_ENV === "development") {
      console.info(`[email] ${params.subject} -> ${params.devLink}`);
    } else {
      console.warn("[email] Email delivery is not configured; message not sent.");
    }
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
  });

  if (error) {
    console.error("[email] Failed to send email:", error.name);
    throw new Error("Failed to send email");
  }
}

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  url: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Verify your email for Meet.AI",
    devLink: params.url,
    html: actionEmail({
      name: params.name,
      intro: "Confirm your email address to finish setting up your Meet.AI account.",
      actionLabel: "Verify email",
      url: params.url,
      outro: "If you did not create an account, you can ignore this email.",
    }),
  });
}

export async function sendResetPasswordEmail(params: {
  to: string;
  name: string;
  url: string;
}) {
  await sendEmail({
    to: params.to,
    subject: "Reset your Meet.AI password",
    devLink: params.url,
    html: actionEmail({
      name: params.name,
      intro: "We received a request to reset your password. This link expires in 1 hour.",
      actionLabel: "Reset password",
      url: params.url,
      outro: "If you did not request a password reset, you can ignore this email.",
    }),
  });
}

const MEETING_READY_COPY = {
  vi: {
    subject: (meetingName: string) => `Biên bản "${meetingName}" đã sẵn sàng`,
    intro: (meetingName: string) =>
      `Biên bản, tóm tắt và danh sách việc cần làm của cuộc họp "${escapeHtml(meetingName)}" đã sẵn sàng.`,
    greeting: "Chào",
    action: "Xem biên bản",
    outro: "Bạn có thể hỏi AI bất cứ điều gì về cuộc họp ngay trên trang này.",
  },
  en: {
    subject: (meetingName: string) => `Your notes for "${meetingName}" are ready`,
    intro: (meetingName: string) =>
      `The summary, transcript and action items for "${escapeHtml(meetingName)}" are ready.`,
    greeting: "Hi",
    action: "View meeting notes",
    outro: "You can ask the AI anything about the meeting from that page.",
  },
};

export async function sendMeetingReadyEmail(params: {
  to: string;
  name: string;
  meetingName: string;
  url: string;
  language: string;
}) {
  const copy = MEETING_READY_COPY[params.language === "en" ? "en" : "vi"];

  await sendEmail({
    to: params.to,
    subject: copy.subject(params.meetingName),
    devLink: params.url,
    html: actionEmail({
      greeting: copy.greeting,
      name: params.name,
      intro: copy.intro(params.meetingName),
      actionLabel: copy.action,
      url: params.url,
      outro: copy.outro,
    }),
  });
}

const INVITE_COPY = {
  vi: {
    subject: (host: string, meeting: string) => `${host} mời bạn tham gia "${meeting}"`,
    intro: (host: string, meeting: string, when: string | null) =>
      `${escapeHtml(host)} mời bạn tham gia cuộc họp "${escapeHtml(meeting)}"${when ? ` lúc ${escapeHtml(when)}` : ""}. Cuộc họp có trợ lý AI ghi chép và trả lời câu hỏi.`,
    greeting: "Chào",
    action: "Tham gia cuộc họp",
    outro: "Không cần tài khoản: bạn có thể vào với tư cách khách.",
  },
  en: {
    subject: (host: string, meeting: string) => `${host} invited you to "${meeting}"`,
    intro: (host: string, meeting: string, when: string | null) =>
      `${escapeHtml(host)} invited you to the meeting "${escapeHtml(meeting)}"${when ? ` on ${escapeHtml(when)}` : ""}. An AI assistant will take notes and answer questions.`,
    greeting: "Hi",
    action: "Join the meeting",
    outro: "No account needed: you can join as a guest.",
  },
};

export async function sendMeetingInviteEmail(params: {
  to: string;
  hostName: string;
  meetingName: string;
  url: string;
  language: string;
  when: string | null;
  ics: string | null;
}) {
  const copy = INVITE_COPY[params.language === "en" ? "en" : "vi"];

  await sendEmail({
    to: params.to,
    subject: copy.subject(params.hostName, params.meetingName),
    devLink: params.url,
    attachments: params.ics
      ? [{ filename: "invite.ics", content: Buffer.from(params.ics).toString("base64") }]
      : undefined,
    html: actionEmail({
      greeting: copy.greeting,
      name: "",
      intro: copy.intro(params.hostName, params.meetingName, params.when),
      actionLabel: copy.action,
      url: params.url,
      outro: copy.outro,
    }),
  });
}

// Generic notice with one call to action (lifecycle and billing emails).
// `intro` is trusted HTML built by the caller with escapeHtml'd values.
export async function sendNoticeEmail(params: {
  to: string;
  name: string;
  subject: string;
  greeting: string;
  intro: string;
  actionLabel: string;
  url: string;
  outro: string;
}) {
  await sendEmail({
    to: params.to,
    subject: params.subject,
    devLink: params.url,
    html: actionEmail(params),
  });
}

export { escapeHtml };
