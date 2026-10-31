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
  name: string;
  intro: string;
  actionLabel: string;
  url: string;
  outro: string;
}) {
  const name = escapeHtml(params.name || "there");
  const url = escapeHtml(params.url);

  return `<!doctype html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f6f7f8;padding:24px;color:#111">
    <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
      <tr><td>
        <p style="font-size:16px">Hi ${name},</p>
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
