import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { env } from "@/env";
import { emailLog, user } from "@/db/schema";
import { escapeHtml, sendNoticeEmail } from "@/lib/email";

export type LifecycleEmailKind = "welcome" | "quota_warning" | "payment_succeeded" | "payment_failed";

type EmailData = {
  productName?: string;
  voiceMinutes?: number;
  quotaLabel?: string;
  used?: number;
  limit?: number;
};

const APP_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

// Accounts have no language preference yet, so these are Vietnamese first
// with a short English line.
function buildCopy(kind: LifecycleEmailKind, data: EmailData) {
  switch (kind) {
    case "welcome":
      return {
        subject: "Chào mừng bạn đến với Meet.AI",
        intro:
          "Tài khoản của bạn đã sẵn sàng. Hãy họp thử 2 phút với trợ lý AI để xem biên bản được tạo thế nào.<br><br><em>Welcome to Meet.AI — try a 2-minute meeting with an AI assistant.</em>",
        action: "Bắt đầu cuộc họp đầu tiên",
        path: "/dashboard",
        outro: "Bạn cần hỗ trợ? Trả lời email này hoặc dùng trang Liên hệ.",
      };
    case "quota_warning":
      return {
        subject: `Bạn đã dùng ${data.used}/${data.limit} ${data.quotaLabel} tháng này`,
        intro: `Bạn đã dùng ${data.used}/${data.limit} ${escapeHtml(data.quotaLabel ?? "")} của tháng này. Khi hết, AI sẽ chuyển sang chế độ chỉ ghi chép.<br><br><em>You have used most of this month's quota. Upgrade or buy a minute pack to keep the AI talking.</em>`,
        action: "Xem gói và mua thêm phút",
        path: "/dashboard/billing",
        outro: "Hạn mức được làm mới vào ngày 1 hằng tháng (UTC).",
      };
    case "payment_succeeded":
      return {
        subject: "Thanh toán thành công",
        intro: `Cảm ơn bạn! Thanh toán cho <strong>${escapeHtml(data.productName ?? "Meet.AI")}</strong> đã hoàn tất${data.voiceMinutes ? ` và ${data.voiceMinutes} phút AI đã được cộng vào tài khoản` : ""}.<br><br><em>Payment received, thank you!</em>`,
        action: "Xem thanh toán",
        path: "/dashboard/billing",
        outro: "Hoá đơn chi tiết được gửi riêng từ Polar, đơn vị xử lý thanh toán.",
      };
    case "payment_failed":
      return {
        subject: "Thanh toán gói Pro chưa thành công",
        intro:
          "Chúng tôi chưa thu được phí gia hạn gói Pro. Gói vẫn hoạt động trong lúc hệ thống thử lại; hãy cập nhật phương thức thanh toán để không bị gián đoạn.<br><br><em>Your renewal payment failed. Please update your payment method.</em>",
        action: "Cập nhật thanh toán",
        path: "/dashboard/billing",
        outro: "Nếu bạn đã cập nhật, có thể bỏ qua email này.",
      };
  }
}

// Sends each (kind, dedupeKey) at most once per user.
export async function sendLifecycleEmail(
  userId: string,
  kind: LifecycleEmailKind,
  dedupeKey: string,
  data: EmailData = {},
) {
  const inserted = await db
    .insert(emailLog)
    .values({ userId, kind, dedupeKey })
    .onConflictDoNothing()
    .returning({ id: emailLog.id });
  if (inserted.length === 0) return false;

  const [recipient] = await db
    .select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, userId));
  if (!recipient) return false;

  const copy = buildCopy(kind, data);
  try {
    await sendNoticeEmail({
      to: recipient.email,
      name: recipient.name,
      subject: copy.subject,
      greeting: "Chào",
      intro: copy.intro,
      actionLabel: copy.action,
      url: `${APP_URL}${copy.path}`,
      outro: copy.outro,
    });
    return true;
  } catch {
    // Let a later trigger retry.
    await db.delete(emailLog).where(eq(emailLog.id, inserted[0].id));
    return false;
  }
}

