// Public changelog (newest first).

type Localized<T> = Record<"vi" | "en", T>;

export interface ChangelogEntry {
  date: string;
  title: Localized<string>;
  items: Localized<string[]>;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-01",
    title: { vi: "Website mới, bảng giá và blog", en: "New website, pricing and blog" },
    items: {
      vi: [
        "Trang chủ mới với demo biên bản tương tác.",
        "Trang giải pháp cho họp nhóm, phỏng vấn, IELTS, bán hàng và lớp học.",
        "Bảng giá theo tháng/năm, VND và USD.",
        "Trang bảo mật, điều khoản, quyền riêng tư và cookie.",
      ],
      en: [
        "New home page with an interactive notes demo.",
        "Use-case pages for teams, interviews, IELTS, sales and classes.",
        "Monthly/yearly pricing in VND and USD.",
        "Security, terms, privacy and cookie pages.",
      ],
    },
  },
  {
    date: "2026-10-30",
    title: { vi: "Trang chủ, biên bản và agent mới", en: "New home, notes and agents" },
    items: {
      vi: [
        "Trang chủ có cuộc họp sắp tới, việc cần làm và mức sử dụng.",
        "Biên bản có mốc thời gian, tua video đúng đoạn, chia sẻ link chỉ đọc.",
        "6 mẫu agent sẵn có và chat thử trước khi họp.",
        "Xuất biên bản Markdown, PDF và lịch .ics.",
      ],
      en: [
        "Home shows upcoming meetings, action items and usage.",
        "Notes with timestamps, jump-to-video and read-only share links.",
        "Six ready-made agent templates and a test chat.",
        "Export notes as Markdown, PDF and calendar .ics.",
      ],
    },
  },
  {
    date: "2026-10-25",
    title: { vi: "Họp nhiều người", en: "Multi-person meetings" },
    items: {
      vi: [
        "Mời đồng nghiệp và khách qua link, phòng chờ để host duyệt.",
        "4 chế độ AI: trò chuyện, chỉ trả lời khi được gọi, điều phối, im lặng.",
        "Phòng họp mới: phụ đề, giơ tay, chat, bảng điều khiển của host.",
      ],
      en: [
        "Invite teammates and guests by link, with a waiting room.",
        "Four AI modes: conversational, on demand, facilitator, silent.",
        "New call room: captions, raise hand, chat, host controls.",
      ],
    },
  },
  {
    date: "2026-10-20",
    title: { vi: "Transcript tiếng Việt chuẩn", en: "Accurate Vietnamese transcripts" },
    items: {
      vi: [
        "Chép lời lại từ bản ghi, đúng dấu và đúng người nói.",
        "Biên bản theo 6 mẫu, có quyết định và việc cần làm.",
        "Hỏi AI về cuộc họp, câu trả lời kèm mốc thời gian.",
        "Giọng nói AI tự nhiên hơn, ít bị ngắt quãng.",
      ],
      en: [
        "Re-transcription from the recording with correct diacritics and speakers.",
        "Six note formats with decisions and action items.",
        "Ask AI about a meeting, with timestamped answers.",
        "More natural AI voice with fewer interruptions.",
      ],
    },
  },
];
