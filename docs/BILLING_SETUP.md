# Cấu hình thanh toán (Polar)

Gói và hạn mức nằm trong `src/config/plans.ts`. Polar chỉ lo thu tiền; app đọc
trạng thái gói từ bảng `subscriptions` (cache) chứ không gọi Polar mỗi request.

## 1. Tạo sản phẩm trên Polar (sandbox trước, production sau)

| Sản phẩm | Loại | Giá gợi ý | Metadata |
|---|---|---|---|
| Meet.AI Pro (tháng) | Recurring, monthly | $6 | (không cần) |
| Meet.AI Pro (năm) | Recurring, yearly | $60 | (không cần) |
| 60 phút AI | One-time | $3 | `voice_minutes` = `60` |
| 300 phút AI | One-time | $12 | `voice_minutes` = `300` |

- Mọi sản phẩm recurring được coi là gói **Pro**. Khi có gói Team, thêm metadata
  `plan` = `team`.
- Sản phẩm one-time **phải** có metadata `voice_minutes`, nếu không sẽ không
  được cộng phút.

## 2. Webhook

Polar → Settings → Webhooks → Add endpoint:

- URL: `https://<domain>/api/auth/polar/webhooks`
- Format: Raw
- Events: `subscription.created`, `subscription.updated`, `subscription.active`,
  `subscription.canceled`, `subscription.uncanceled`, `subscription.revoked`,
  `order.paid`
- Copy signing secret vào env `POLAR_WEBHOOK_SECRET`.

Khi chạy local (Polar không gọi được localhost), trang **Gói & thanh toán** tự
đồng bộ sau khi checkout xong (`?checkout_id=`), và có nút **Đồng bộ** để kéo
trạng thái gói + đơn mua phút từ Polar.

## 3. Hạn mức

| | Free | Pro |
|---|---|---|
| Cuộc họp / tháng | 5 | Không giới hạn |
| Phút ghi hình / tháng | 60 | 1.200 |
| Phút AI nói / tháng | 10 | 60 |
| Agent | 1 | Không giới hạn |
| Người / phòng | 3 | 10 |

- Phút AI dùng hết hạn mức tháng trước, sau đó trừ vào phút đã mua (cũ trước).
- Hết phút: AI chào và rời phòng, cuộc họp vẫn tiếp tục ghi chép.
- Xoá cuộc họp/agent không hoàn lại lượt (bảng `usage_events` chỉ cộng thêm).
- Email cảnh báo khi dùng 80% (mỗi loại một lần mỗi tháng), email chào mừng,
  thanh toán thành công/thất bại: `src/server/billing/lifecycle-emails.ts`.

## 4. Cổng thanh toán Việt Nam (sau)

Interface ở `src/server/billing/payment-provider.ts` (SePay/PayOS: QR chuyển
khoản + webhook). Chỉ làm khi đã có API key.
