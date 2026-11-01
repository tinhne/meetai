// DRAFT legal pages — written as a starting point, NOT reviewed by a lawyer.
// Have them reviewed (Vietnam Decree 13/2023/ND-CP on personal data, and
// GDPR if you serve EU users) before relying on them.

type Localized<T> = Record<"vi" | "en", T>;

export interface LegalPage {
  slug: "terms" | "privacy" | "cookies";
  updated: string;
  title: Localized<string>;
  description: Localized<string>;
  body: Localized<string>;
}

const SUBPROCESSORS = {
  vi: `- **Vercel**: lưu trữ và vận hành website
- **Neon**: cơ sở dữ liệu
- **Stream (GetStream.io)**: gọi video, ghi hình, chuyển giọng nói thành văn bản
- **OpenAI**: giọng nói AI trong cuộc họp
- **Google (Gemini API)**: chép lời, tóm tắt, hỏi đáp AI
- **Inngest**: xử lý tác vụ nền
- **Polar**: thanh toán
- **Resend**: gửi email
- **Cloudflare R2** (nếu bật): lưu trữ bản ghi
- **PostHog** (chỉ khi bạn đồng ý): phân tích sử dụng`,
  en: `- **Vercel**: website hosting
- **Neon**: database
- **Stream (GetStream.io)**: video calls, recording, speech-to-text
- **OpenAI**: AI voice in meetings
- **Google (Gemini API)**: transcription, summaries, AI answers
- **Inngest**: background jobs
- **Polar**: payments
- **Resend**: email delivery
- **Cloudflare R2** (if enabled): recording storage
- **PostHog** (only with your consent): usage analytics`,
};

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "terms",
    updated: "2026-11-01",
    title: { vi: "Điều khoản dịch vụ", en: "Terms of Service" },
    description: {
      vi: "Điều khoản sử dụng dịch vụ Meet.AI.",
      en: "The terms for using Meet.AI.",
    },
    body: {
      vi: `## 1. Chấp nhận điều khoản
Khi tạo tài khoản hoặc sử dụng Meet.AI, bạn đồng ý với các điều khoản này. Nếu không đồng ý, vui lòng không sử dụng dịch vụ.

## 2. Tài khoản
Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động trong tài khoản của mình. Khách tham gia cuộc họp qua link mời không cần tài khoản nhưng vẫn phải tuân thủ các điều khoản này.

## 3. Ghi âm, ghi hình và sự đồng ý
Cuộc họp trên Meet.AI có thể được ghi âm, ghi hình và xử lý bởi AI. Người tổ chức cuộc họp có trách nhiệm đảm bảo mọi người tham dự được thông báo và đồng ý theo quy định pháp luật áp dụng. Meet.AI hiển thị thông báo ghi âm và yêu cầu xác nhận trước khi vào phòng.

## 4. Nội dung của bạn
Bạn giữ toàn bộ quyền đối với nội dung cuộc họp. Bạn cấp cho Meet.AI quyền xử lý nội dung đó chỉ để cung cấp dịch vụ (chép lời, tóm tắt, trả lời câu hỏi).

## 5. Kết quả do AI tạo ra
Biên bản, tóm tắt, câu trả lời và điểm số ước lượng do AI tạo ra có thể không chính xác hoàn toàn. Hãy kiểm tra lại trước khi dùng cho quyết định quan trọng.

## 6. Sử dụng được chấp nhận
Không dùng dịch vụ để vi phạm pháp luật, xâm phạm quyền riêng tư người khác, ghi âm người khác trái phép, phát tán nội dung độc hại hoặc cố tình làm quá tải hệ thống.

## 7. Gói dịch vụ và thanh toán
Gói trả phí được gia hạn tự động theo kỳ cho đến khi bạn huỷ. Khi huỷ, gói vẫn dùng được đến hết kỳ đã thanh toán. Thanh toán được xử lý bởi Polar.

## 8. Chấm dứt
Bạn có thể xoá tài khoản bất cứ lúc nào trong phần Cài đặt. Chúng tôi có thể tạm khoá tài khoản vi phạm các điều khoản này.

## 9. Giới hạn trách nhiệm
Dịch vụ được cung cấp "như hiện có". Trong phạm vi pháp luật cho phép, Meet.AI không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc sử dụng dịch vụ.

## 10. Luật áp dụng
Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam.`,
      en: `## 1. Acceptance
By creating an account or using Meet.AI you agree to these terms. If you don't agree, please don't use the service.

## 2. Accounts
You are responsible for keeping your credentials safe and for activity in your account. Guests joining through an invite link need no account but must follow these terms.

## 3. Recording and consent
Meetings on Meet.AI may be recorded and processed by AI. The meeting organizer is responsible for informing participants and obtaining consent as required by applicable law. Meet.AI shows a recording notice and asks for confirmation before anyone joins.

## 4. Your content
You keep all rights to your meeting content. You grant Meet.AI permission to process it only to provide the service (transcription, summaries, answers).

## 5. AI-generated output
Notes, summaries, answers and estimated scores produced by AI may contain mistakes. Review them before relying on them for important decisions.

## 6. Acceptable use
Do not use the service to break the law, violate others' privacy, record people unlawfully, distribute harmful content or deliberately overload the system.

## 7. Plans and payment
Paid plans renew automatically each period until cancelled. After cancelling, the plan stays active until the end of the paid period. Payments are processed by Polar.

## 8. Termination
You can delete your account at any time in Settings. We may suspend accounts that violate these terms.

## 9. Limitation of liability
The service is provided "as is". To the extent permitted by law, Meet.AI is not liable for indirect damages arising from its use.

## 10. Governing law
These terms are governed by the laws of Vietnam.`,
    },
  },
  {
    slug: "privacy",
    updated: "2026-11-01",
    title: { vi: "Chính sách quyền riêng tư", en: "Privacy Policy" },
    description: {
      vi: "Meet.AI thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn như thế nào.",
      en: "How Meet.AI collects, uses and protects your personal data.",
    },
    body: {
      vi: `## 1. Dữ liệu chúng tôi thu thập
- **Tài khoản**: họ tên, email, ảnh đại diện (nếu đăng nhập bằng Google/GitHub/Facebook).
- **Cuộc họp**: bản ghi hình, âm thanh, transcript, biên bản, việc cần làm, câu hỏi bạn gửi cho AI.
- **Khách mời**: tên hiển thị bạn nhập khi tham gia.
- **Kỹ thuật**: địa chỉ IP, trình duyệt, thời gian đăng nhập (để bảo mật và chống lạm dụng).
- **Phân tích**: chỉ khi bạn đồng ý cookie phân tích.

## 2. Mục đích sử dụng
Cung cấp dịch vụ (gọi video, chép lời, tóm tắt, trả lời câu hỏi), bảo mật tài khoản, xử lý thanh toán, gửi email cần thiết và cải thiện sản phẩm.

## 3. Xử lý bởi AI và bên thứ ba
Nội dung cuộc họp được gửi tới các nhà cung cấp AI để xử lý. **Lưu ý:** khi dùng Gemini API ở hạn mức miễn phí, Google có thể sử dụng dữ liệu gửi lên để cải thiện sản phẩm của họ. Khi chuyển sang hạn mức trả phí, dữ liệu không được dùng để huấn luyện. Danh sách nhà cung cấp:

${SUBPROCESSORS.vi}

## 4. Lưu trữ
Dữ liệu được lưu cho đến khi bạn xoá cuộc họp hoặc tài khoản. Bản ghi hình có thể bị giới hạn thời gian lưu theo gói dịch vụ.

## 5. Quyền của bạn
Bạn có quyền xem, sửa, tải về (Cài đặt → Dữ liệu & quyền riêng tư → Tải dữ liệu) và xoá dữ liệu của mình (xoá cuộc họp hoặc xoá tài khoản), cũng như rút lại sự đồng ý với cookie phân tích. Chúng tôi xử lý dữ liệu theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.

## 6. Bảo mật
Kết nối được mã hoá, bản ghi chỉ truy cập qua link ký có thời hạn sau khi kiểm tra quyền, và mỗi người chỉ vào được cuộc họp được mời.

## 7. Liên hệ
Gửi yêu cầu về dữ liệu cá nhân qua trang Liên hệ.`,
      en: `## 1. Data we collect
- **Account**: name, email, profile picture (when signing in with Google/GitHub/Facebook).
- **Meetings**: recordings, audio, transcripts, notes, action items, questions you ask the AI.
- **Guests**: the display name entered when joining.
- **Technical**: IP address, browser and sign-in times (for security and abuse prevention).
- **Analytics**: only if you accept analytics cookies.

## 2. How we use it
To provide the service (video calls, transcription, summaries, answers), secure accounts, process payments, send necessary emails and improve the product.

## 3. AI and third-party processing
Meeting content is sent to AI providers for processing. **Note:** when the Gemini API is used on its free tier, Google may use submitted data to improve its products. On paid tiers, data is not used for training. Providers:

${SUBPROCESSORS.en}

## 4. Retention
Data is kept until you delete the meeting or your account. Recordings may have plan-based retention limits.

## 5. Your rights
You can access, correct, export (Settings → Data & privacy → Download my data) and delete your data (delete meetings or your account), and withdraw analytics consent. Data is processed in line with Vietnam's Decree 13/2023/ND-CP on personal data protection.

## 6. Security
Connections are encrypted, recordings are only reachable through short-lived signed links after an access check, and people can only join meetings they are invited to.

## 7. Contact
Send personal data requests through the Contact page.`,
    },
  },
  {
    slug: "cookies",
    updated: "2026-11-01",
    title: { vi: "Chính sách cookie", en: "Cookie Policy" },
    description: {
      vi: "Các loại cookie Meet.AI sử dụng.",
      en: "The cookies Meet.AI uses.",
    },
    body: {
      vi: `## Cookie cần thiết (luôn bật)
- **Phiên đăng nhập**: giữ bạn đăng nhập an toàn.
- **Ngôn ngữ**: ghi nhớ ngôn ngữ bạn chọn.
- **Phiên khách**: cho phép khách quay lại đúng cuộc họp đã được duyệt.

## Cookie phân tích (chỉ khi bạn đồng ý)
Giúp chúng tôi hiểu cách mọi người dùng sản phẩm (ví dụ: bao nhiêu người hoàn tất cuộc họp đầu tiên) để cải thiện trải nghiệm. Bạn có thể từ chối trong thông báo cookie; trang vẫn hoạt động bình thường.

## Thay đổi lựa chọn
Xoá dữ liệu trang web trong trình duyệt để thông báo cookie hiện lại và chọn lại.`,
      en: `## Essential cookies (always on)
- **Session**: keeps you signed in securely.
- **Language**: remembers your language.
- **Guest session**: lets guests return to a meeting they were admitted to.

## Analytics cookies (only with consent)
Help us understand how people use the product (for example, how many complete a first meeting) to improve it. You can decline in the cookie notice; the site keeps working.

## Changing your choice
Clear this site's data in your browser to see the cookie notice again.`,
    },
  },
];

export function getLegalPage(slug: string) {
  return LEGAL_PAGES.find((page) => page.slug === slug) ?? null;
}
