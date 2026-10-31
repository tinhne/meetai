// Blog posts (markdown bodies, per locale).

type Localized<T> = Record<"vi" | "en", T>;

export interface BlogPost {
  slug: string;
  date: string; // ISO date
  title: Localized<string>;
  description: Localized<string>;
  body: Localized<string>;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "cach-viet-bien-ban-cuoc-hop",
    date: "2026-10-20",
    title: {
      vi: "Cách viết biên bản cuộc họp chuẩn (kèm mẫu) và để AI làm thay bạn",
      en: "How to write proper meeting minutes (with a template) and let AI do it",
    },
    description: {
      vi: "Biên bản cuộc họp gồm những phần nào, lỗi thường gặp và cách tự động hoá bằng trợ lý AI.",
      en: "What meeting minutes should contain, common mistakes, and how to automate them with an AI assistant.",
    },
    body: {
      vi: `Biên bản cuộc họp tốt giúp mọi người nhớ cùng một kết quả và biết rõ ai làm gì. Dưới đây là cấu trúc dùng được cho hầu hết cuộc họp nội bộ.

## Biên bản cần có những phần nào?

1. **Thông tin chung**: tên cuộc họp, thời gian, hình thức (trực tuyến hay trực tiếp).
2. **Thành phần tham dự**: người chủ trì, thư ký, người tham dự, người vắng mặt.
3. **Nội dung thảo luận**: tóm tắt theo từng mục trong agenda, không chép lại nguyên văn.
4. **Kết luận / quyết định**: viết thành câu khẳng định, ví dụ "Chốt giá gói Pro 149.000đ/tháng".
5. **Phân công**: mỗi việc có một người phụ trách và một hạn chót.
6. **Vấn đề còn mở**: những gì chưa quyết, sẽ bàn ở cuộc họp sau.

## Lỗi thường gặp

- **Ghi quá chi tiết**: biên bản không phải transcript. Người đọc cần kết quả, không cần từng câu nói.
- **Việc không có người nhận**: "Cần cập nhật bảng giá" khác hoàn toàn với "Nam cập nhật bảng giá trước thứ Sáu".
- **Gửi biên bản quá muộn**: sau một ngày, mọi người đã quên chi tiết và khó phản hồi.

## Để AI viết biên bản

Thay vì để một người vừa họp vừa ghi chép, bạn có thể mời một trợ lý AI vào cuộc họp. Với Meet.AI:

- Chọn mẫu **Biên bản họp (hành chính)** khi tạo cuộc họp.
- AI nghe toàn bộ cuộc họp, rồi tạo biên bản theo đúng cấu trúc ở trên.
- Mỗi quyết định và việc cần làm có **mốc thời gian**, bấm vào là tua tới đúng đoạn video.
- Người vắng mặt nhận link chia sẻ để đọc, không cần tài khoản.

Bạn vẫn nên đọc lại biên bản trước khi gửi, nhưng thời gian giảm từ 30 phút xuống còn vài phút.`,
      en: `Good minutes make everyone remember the same outcome and know who does what. Here is a structure that works for most internal meetings.

## What should minutes contain?

1. **General info**: meeting name, time, format (online or in person).
2. **Attendees**: chair, note-taker, participants, absentees.
3. **Discussion**: a summary per agenda item, not a verbatim record.
4. **Decisions**: written as statements, e.g. "Pro is priced at 149k VND/month".
5. **Assignments**: every task has one owner and one deadline.
6. **Open issues**: what is still undecided and goes to the next meeting.

## Common mistakes

- **Too much detail**: minutes are not a transcript. Readers want outcomes.
- **Tasks without owners**: "Update the pricing page" is not the same as "Nam updates the pricing page by Friday".
- **Sending them late**: after a day, people have forgotten the details.

## Let AI write the minutes

Instead of one person taking notes while trying to participate, invite an AI assistant. With Meet.AI:

- Pick the **Formal minutes** format when creating the meeting.
- The AI listens to the whole meeting and writes minutes with the structure above.
- Every decision and action item has a **timestamp** that jumps the video to the moment.
- People who missed it get a read-only link, no account needed.

Still read the minutes before sending them, but it takes minutes instead of half an hour.`,
    },
  },
  {
    slug: "luyen-ielts-speaking-voi-ai",
    date: "2026-10-24",
    title: {
      vi: "Luyện IELTS Speaking với AI: lộ trình 30 ngày cho người tự học",
      en: "IELTS Speaking practice with AI: a 30-day plan for self-learners",
    },
    description: {
      vi: "Lộ trình 4 tuần luyện nói với giám khảo AI: từ phản xạ Part 1 đến lập luận Part 3, kèm cách đọc band ước lượng.",
      en: "A four-week plan with an AI examiner: from Part 1 fluency to Part 3 reasoning, plus how to read the estimated band.",
    },
    body: {
      vi: `Khó nhất khi tự học IELTS Speaking là thiếu người để nói cùng. Một giám khảo AI giải quyết đúng điểm đó: bạn có thể luyện bất cứ lúc nào, và nhận nhận xét ngay sau mỗi buổi.

## Tuần 1: Phản xạ với Part 1

- Mỗi ngày một buổi 5–7 phút, chỉ Part 1.
- Mục tiêu: trả lời 2–3 câu cho mỗi câu hỏi, có lý do và ví dụ.
- Sau buổi, đọc transcript và gạch chân những chỗ bạn ngập ngừng.

## Tuần 2: Part 2 và cách dùng 1 phút chuẩn bị

- Luyện cue card: ghi 4–5 từ khoá trong 1 phút, rồi nói đủ 2 phút.
- Dùng khung: bối cảnh → chi tiết → cảm xúc → điều bạn học được.
- Xem tab Phân tích để biết bạn dùng bao nhiêu từ đệm như "um", "like".

## Tuần 3: Part 3 và lập luận

- Câu hỏi Part 3 cần so sánh, nguyên nhân – kết quả, ý kiến cá nhân.
- Tập mở rộng câu trả lời: nêu ý kiến, giải thích, đưa ví dụ, nhắc lại kết luận.

## Tuần 4: Thi thử trọn bộ

- 2–3 buổi thi thử đủ Part 1–3 (11–14 phút).
- So sánh band ước lượng giữa các buổi để thấy tiến bộ.

## Đọc band ước lượng thế nào?

AI ước lượng theo 4 tiêu chí: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Đây là **ước lượng tham khảo** để luyện tập, không thay thế điểm thi chính thức. Hãy chú ý nhất vào phần gợi ý cải thiện và câu trả lời mẫu.

Bắt đầu bằng agent **Giám khảo IELTS Speaking** trong Meet.AI, đặt ngôn ngữ cuộc họp là tiếng Anh, rồi bấm "Họp ngay".`,
      en: `The hardest part of self-studying IELTS Speaking is having nobody to speak with. An AI examiner fixes exactly that: practise any time and get feedback right after each session.

## Week 1: Part 1 fluency

- One 5–7 minute session a day, Part 1 only.
- Goal: answer each question in 2–3 sentences with a reason and an example.
- Afterwards, read the transcript and mark where you hesitated.

## Week 2: Part 2 and the one-minute preparation

- Practise cue cards: note 4–5 keywords in one minute, then speak for two.
- Use a frame: context → details → feelings → what you learned.
- Check the Analytics tab for filler words like "um" and "like".

## Week 3: Part 3 reasoning

- Part 3 asks for comparisons, causes and effects, and opinions.
- Extend answers: state your view, explain, give an example, conclude.

## Week 4: Full mock tests

- Two or three full mock tests covering Parts 1–3 (11–14 minutes).
- Compare the estimated bands between sessions to see progress.

## How to read the estimated band

The AI estimates the four criteria: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy and Pronunciation. It is an **estimate for practice**, not an official score. Focus on the improvement tips and sample answers.

Start with the **IELTS Speaking examiner** agent in Meet.AI, set the meeting language to English and press "Meet now".`,
    },
  },
  {
    slug: "hop-online-hieu-qua-voi-tro-ly-ai",
    date: "2026-10-28",
    title: {
      vi: "5 cách giúp cuộc họp online hiệu quả hơn với trợ lý AI",
      en: "5 ways an AI assistant makes online meetings more effective",
    },
    description: {
      vi: "Agenda rõ ràng, AI chỉ nói khi được hỏi, việc cần làm có người nhận… những thói quen giúp họp ngắn hơn mà kết quả tốt hơn.",
      en: "A clear agenda, an AI that only speaks when asked, owned action items… habits for shorter meetings with better outcomes.",
    },
    body: {
      vi: `Trợ lý AI không làm cuộc họp tốt hơn nếu cách họp vẫn như cũ. Năm thói quen dưới đây giúp bạn tận dụng AI tối đa.

## 1. Viết agenda trước khi họp

Khi tạo cuộc họp, điền phần agenda. AI dùng agenda để hiểu bối cảnh, và ở chế độ **Điều phối** sẽ nhắc giờ theo agenda.

## 2. Chọn đúng chế độ AI

- **Trò chuyện**: cho buổi 1-1, luyện tập.
- **Chỉ trả lời khi được gọi**: cho họp nhóm; AI im lặng đến khi có người gọi tên hoặc bấm "Hỏi AI".
- **Im lặng**: chỉ ghi chép, không tốn phút AI.

## 3. Chốt quyết định thành câu rõ ràng

Hãy nói to kết luận, ví dụ "Vậy mình chốt ra mắt thứ Ba". Câu càng rõ, biên bản càng chính xác.

## 4. Giao việc kèm tên và hạn

"Nam cập nhật bảng giá trước thứ Sáu" sẽ được AI ghi thành việc cần làm có người phụ trách và hạn chót. Tick xong ngay trên trang chủ.

## 5. Hỏi lại thay vì họp lại

Quên một chi tiết? Mở trang biên bản và hỏi AI. Câu trả lời có mốc thời gian để bạn nghe lại đúng đoạn đó, không cần thêm một cuộc họp nữa.`,
      en: `An AI assistant won't fix meetings if nothing else changes. These five habits help you get the most out of it.

## 1. Write an agenda first

Fill in the agenda when creating the meeting. The AI uses it for context, and in **Facilitator** mode it keeps time against it.

## 2. Pick the right AI mode

- **Conversational**: for 1:1 sessions and practice.
- **Answers when asked**: for team meetings; the AI stays quiet until called by name or someone presses "Ask AI".
- **Silent**: notes only, no AI minutes used.

## 3. State decisions clearly

Say conclusions out loud, e.g. "So we launch on Tuesday". Clearer sentences make better notes.

## 4. Assign tasks with a name and a date

"Nam updates the pricing page by Friday" becomes an action item with an owner and due date. Tick it off from the home page.

## 5. Ask instead of meeting again

Forgot a detail? Open the notes and ask the AI. Answers include timestamps so you can replay the moment, no extra meeting needed.`,
    },
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}
