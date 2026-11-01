// Use-case landing pages (/use-cases/:slug). Copy is per locale; slugs are
// Vietnamese keywords on purpose (SEO for the main market).

type Localized<T> = Record<"vi" | "en", T>;

export interface UseCase {
  slug: string;
  icon: "users" | "briefcase" | "languages" | "trending" | "graduation";
  templateId: string;
  title: Localized<string>;
  metaTitle: Localized<string>;
  metaDescription: Localized<string>;
  heroTitle: Localized<string>;
  heroSubtitle: Localized<string>;
  bullets: Localized<string[]>;
  pains: Localized<string[]>;
  benefits: Localized<{ title: string; description: string }[]>;
  steps: Localized<string[]>;
  faq: Localized<{ question: string; answer: string }[]>;
}

export const USE_CASES: UseCase[] = [
  {
    slug: "hop-team",
    icon: "users",
    templateId: "secretary",
    title: { vi: "Họp nhóm", en: "Team meetings" },
    metaTitle: {
      vi: "Phần mềm ghi biên bản cuộc họp bằng AI cho đội nhóm",
      en: "AI meeting notes and minutes for teams",
    },
    metaDescription: {
      vi: "AI tham gia cuộc họp, trả lời khi được gọi tên và tự viết biên bản tiếng Việt chuẩn: quyết định, việc cần làm, người phụ trách, hạn chót.",
      en: "An AI that joins your meetings, answers when called by name and writes the minutes: decisions, action items, owners and deadlines.",
    },
    heroTitle: {
      vi: "Họp xong là có biên bản. Không ai phải ghi chép nữa.",
      en: "The meeting ends, the minutes are ready. Nobody takes notes.",
    },
    heroSubtitle: {
      vi: "Mời trợ lý AI vào phòng họp như một thành viên: nó lắng nghe, trả lời khi được gọi tên và ghi lại mọi quyết định của team.",
      en: "Invite an AI assistant like a teammate: it listens, answers when called by name and records every decision.",
    },
    bullets: {
      vi: ["Biên bản chuẩn hành chính sau vài phút", "Việc cần làm có người phụ trách và hạn", "Gọi tên AI để hỏi nhanh giữa cuộc họp"],
      en: ["Formal minutes within minutes", "Action items with owners and deadlines", "Ask the AI by name during the meeting"],
    },
    pains: {
      vi: [
        "Một người vừa họp vừa ghi chép nên không tập trung được.",
        "Họp xong mỗi người nhớ một kiểu, việc ai nấy quên.",
        "Người vắng mặt không biết đã chốt những gì.",
      ],
      en: [
        "Someone has to take notes instead of taking part.",
        "Everyone remembers the outcome differently and tasks slip.",
        "People who missed the meeting don't know what was decided.",
      ],
    },
    benefits: {
      vi: [
        { title: "Biên bản tự động", description: "Thành phần, nội dung, kết luận và phân công theo mẫu biên bản quen thuộc." },
        { title: "AI chỉ nói khi cần", description: "Chế độ “chỉ trả lời khi được gọi” giúp AI không chen ngang cuộc thảo luận." },
        { title: "Chia sẻ một chạm", description: "Gửi link biên bản cho người vắng mặt, không cần tài khoản." },
      ],
      en: [
        { title: "Automatic minutes", description: "Attendees, discussion, conclusions and assignments in a familiar format." },
        { title: "AI speaks only when asked", description: "“Answers when asked” mode keeps the AI out of the way until someone needs it." },
        { title: "One-click sharing", description: "Send a read-only link to anyone who missed it, no account needed." },
      ],
    },
    steps: {
      vi: ["Tạo cuộc họp với agent “Thư ký họp”", "Gửi link mời cho cả team, kể cả khách", "Họp như bình thường, gọi tên AI khi cần", "Nhận biên bản và việc cần làm ngay sau đó"],
      en: ["Create a meeting with the “Meeting secretary” agent", "Share the invite link with the team, guests included", "Meet as usual and call the AI by name when needed", "Get the minutes and action items right after"],
    },
    faq: {
      vi: [
        { question: "AI có hiểu tiếng Việt không?", answer: "Có. Biên bản tiếng Việt được tạo từ bản ghi âm sau cuộc họp, giữ đúng dấu và tên riêng." },
        { question: "Người ngoài công ty có tham gia được không?", answer: "Được. Khách chỉ cần mở link và nhập tên; host duyệt trong phòng chờ." },
      ],
      en: [
        { question: "Does it work in Vietnamese?", answer: "Yes. Vietnamese notes are generated from the recording after the meeting, with correct diacritics and names." },
        { question: "Can external people join?", answer: "Yes. Guests open the link and type their name; the host admits them from the waiting room." },
      ],
    },
  },
  {
    slug: "luyen-phong-van",
    icon: "briefcase",
    templateId: "interviewer",
    title: { vi: "Luyện phỏng vấn", en: "Interview practice" },
    metaTitle: {
      vi: "Luyện phỏng vấn với AI bằng giọng nói, có nhận xét chi tiết",
      en: "Practise job interviews with an AI interviewer",
    },
    metaDescription: {
      vi: "Phỏng vấn thử với AI như người thật: hỏi đào sâu theo STAR, nhận xét điểm mạnh, điểm yếu và gợi ý câu trả lời tốt hơn sau mỗi buổi.",
      en: "Mock interviews with an AI that probes like a real recruiter, then gives strengths, gaps and better sample answers.",
    },
    heroTitle: {
      vi: "Phỏng vấn thử với AI, tự tin khi gặp nhà tuyển dụng thật",
      en: "Rehearse with an AI interviewer, walk in confident",
    },
    heroSubtitle: {
      vi: "Luyện nói to, trả lời có cấu trúc và nhận nhận xét ngay. Không ngại, không tốn thời gian của ai.",
      en: "Practise out loud, structure your answers and get feedback immediately, without taking anyone's time.",
    },
    bullets: {
      vi: ["Câu hỏi đào sâu theo phương pháp STAR", "Nhận xét và câu trả lời mẫu sau buổi", "Xem lại transcript từng câu"],
      en: ["Follow-up questions using the STAR method", "Feedback and sample answers afterwards", "Review every answer in the transcript"],
    },
    pains: {
      vi: ["Tự luyện trước gương thì không ai hỏi vặn.", "Nhờ bạn bè phỏng vấn thử thì ngại và khó sắp xếp.", "Không biết mình trả lời dài dòng hay thiếu ý."],
      en: ["Practising alone means nobody pushes back.", "Asking friends is awkward and hard to schedule.", "You can't tell whether your answers ramble or miss the point."],
    },
    benefits: {
      vi: [
        { title: "Như phỏng vấn thật", description: "AI hỏi từng câu, lắng nghe và hỏi tiếp khi câu trả lời còn chung chung." },
        { title: "Nhận xét cụ thể", description: "Điểm mạnh, điểm cần cải thiện, kèm câu trả lời mẫu tốt hơn." },
        { title: "Theo dõi tiến bộ", description: "Mỗi buổi có biên bản và transcript để so sánh qua thời gian." },
      ],
      en: [
        { title: "Feels real", description: "One question at a time, with follow-ups when answers are vague." },
        { title: "Concrete feedback", description: "Strengths, gaps and stronger sample answers." },
        { title: "Track progress", description: "Every session has notes and a transcript to compare over time." },
      ],
    },
    steps: {
      vi: ["Chọn agent “Người phỏng vấn”, ghi vị trí bạn ứng tuyển", "Bấm “Họp ngay” và trả lời bằng giọng nói", "Nói “kết thúc” để nhận nhận xét", "Xem lại biên bản và luyện tiếp"],
      en: ["Pick the “Interviewer” agent and state the role", "Press “Meet now” and answer out loud", "Say “finish” to get feedback", "Review the notes and practise again"],
    },
    faq: {
      vi: [
        { question: "Có luyện phỏng vấn tiếng Anh được không?", answer: "Được. Chọn ngôn ngữ cuộc họp là tiếng Anh và AI sẽ phỏng vấn bằng tiếng Anh." },
        { question: "Mỗi buổi tốn bao nhiêu phút AI?", answer: "Chỉ tính thời gian AI nói. Gói miễn phí có 10 phút AI nói mỗi tháng." },
      ],
      en: [
        { question: "Can I practise in English?", answer: "Yes. Set the meeting language to English and the AI interviews you in English." },
        { question: "How many AI minutes does a session use?", answer: "Only the time the AI is speaking counts. The free plan includes 10 AI minutes a month." },
      ],
    },
  },
  {
    slug: "ielts-speaking",
    icon: "languages",
    templateId: "ielts",
    title: { vi: "IELTS Speaking", en: "IELTS Speaking" },
    metaTitle: {
      vi: "Luyện IELTS Speaking với AI: thi thử Part 1–3, ước lượng band",
      en: "IELTS Speaking practice with AI: Part 1–3 mock tests",
    },
    metaDescription: {
      vi: "Thi thử IELTS Speaking với giám khảo AI bằng giọng nói. Đủ Part 1, 2, 3, ước lượng band theo 4 tiêu chí và gợi ý cải thiện cụ thể.",
      en: "Speak with an AI examiner through Part 1, 2 and 3, then get an estimated band on all four criteria with concrete tips.",
    },
    heroTitle: {
      vi: "Thi thử IELTS Speaking với giám khảo AI, mọi lúc bạn muốn",
      en: "Mock IELTS Speaking tests with an AI examiner, any time",
    },
    heroSubtitle: {
      vi: "Luyện phản xạ nói tiếng Anh, làm quen áp lực phòng thi và biết mình cần cải thiện gì.",
      en: "Build fluency, get used to exam pressure and learn exactly what to improve.",
    },
    bullets: {
      vi: ["Đủ Part 1, 2 (cue card) và 3", "Ước lượng band 4 tiêu chí", "Gợi ý từ vựng và cấu trúc tốt hơn"],
      en: ["Full Part 1, Part 2 (cue card) and Part 3", "Estimated band on four criteria", "Better vocabulary and structures"],
    },
    pains: {
      vi: ["Thiếu người để luyện nói hằng ngày.", "Học phí thi thử với giáo viên khá cao.", "Không biết mình đang ở band nào."],
      en: ["No one to practise speaking with every day.", "Mock tests with tutors are expensive.", "No idea which band you're at."],
    },
    benefits: {
      vi: [
        { title: "Giống phòng thi", description: "Giám khảo AI chạy đúng trình tự, không sửa lỗi giữa chừng." },
        { title: "Band tham khảo", description: "Fluency & Coherence, Lexical Resource, Grammar, Pronunciation kèm lời khuyên." },
        { title: "Luyện không giới hạn chủ đề", description: "Mỗi buổi một bộ câu hỏi và cue card khác nhau." },
      ],
      en: [
        { title: "Exam-like", description: "The AI examiner follows the real order and doesn't correct you mid-test." },
        { title: "Estimated band", description: "Fluency & Coherence, Lexical Resource, Grammar and Pronunciation, with advice." },
        { title: "Endless topics", description: "A different set of questions and cue cards every session." },
      ],
    },
    steps: {
      vi: ["Chọn agent “Giám khảo IELTS Speaking”", "Đặt ngôn ngữ cuộc họp là tiếng Anh", "Thi thử 11–14 phút như thật", "Đọc nhận xét và band ước lượng"],
      en: ["Pick the “IELTS Speaking examiner” agent", "Set the meeting language to English", "Take an 11–14 minute mock test", "Read the feedback and estimated band"],
    },
    faq: {
      vi: [
        { question: "Band AI chấm có chính xác không?", answer: "Đây là ước lượng tham khảo để luyện tập, không thay thế điểm thi chính thức." },
        { question: "Phát âm có được đánh giá không?", answer: "Có ở mức ước lượng, dựa trên độ rõ ràng và tự nhiên của câu trả lời." },
      ],
      en: [
        { question: "Is the band accurate?", answer: "It's an estimate for practice and does not replace an official score." },
        { question: "Is pronunciation assessed?", answer: "Yes, as an estimate based on how clear and natural your answers are." },
      ],
    },
  },
  {
    slug: "sales-call",
    icon: "trending",
    templateId: "sales-coach",
    title: { vi: "Cuộc gọi bán hàng", en: "Sales calls" },
    metaTitle: {
      vi: "Luyện chào bán và tóm tắt cuộc gọi bán hàng bằng AI",
      en: "Practise sales pitches and summarize sales calls with AI",
    },
    metaDescription: {
      vi: "Đóng vai khách hàng khó tính để luyện xử lý từ chối, và tự tóm tắt cuộc gọi thật theo BANT: nhu cầu, ngân sách, thời điểm, bước tiếp theo.",
      en: "Role-play a tough prospect to practise objection handling, and summarize real calls with BANT: needs, budget, timeline, next steps.",
    },
    heroTitle: {
      vi: "Luyện chào bán với khách hàng AI, chốt deal tự tin hơn",
      en: "Practise with an AI prospect, close with more confidence",
    },
    heroSubtitle: {
      vi: "Tập xử lý từ chối trước khi gặp khách thật, và có biên bản cuộc gọi theo khung BANT ngay sau đó.",
      en: "Rehearse objections before real calls, and get BANT-style call notes right after.",
    },
    bullets: {
      vi: ["Khách hàng AI phản đối như thật", "Biên bản theo khung BANT", "Bước tiếp theo rõ ràng"],
      en: ["An AI prospect with real objections", "BANT-style call notes", "Clear next steps"],
    },
    pains: {
      vi: ["Nhân viên mới chưa quen xử lý từ chối.", "Ghi chú cuộc gọi sơ sài, khó bàn giao.", "Quản lý không có thời gian nghe lại từng cuộc gọi."],
      en: ["New reps struggle with objections.", "Call notes are thin and hard to hand over.", "Managers can't listen to every call."],
    },
    benefits: {
      vi: [
        { title: "Luyện tập an toàn", description: "Sai bao nhiêu cũng được, AI nhận xét cách chào bán sau mỗi buổi." },
        { title: "Biên bản bán hàng", description: "Nhu cầu, phản đối, ngân sách, thời điểm và bước tiếp theo." },
        { title: "Phân tích cuộc gọi", description: "Ai nói nhiều hơn, bao nhiêu câu hỏi, có dùng từ đệm không." },
      ],
      en: [
        { title: "Safe practice", description: "Make mistakes freely; the AI reviews your pitch afterwards." },
        { title: "Sales notes", description: "Needs, objections, budget, timeline and next steps." },
        { title: "Call analytics", description: "Talk ratio, questions asked and filler words." },
      ],
    },
    steps: {
      vi: ["Chọn agent “Khách hàng khó tính” để luyện", "Hoặc dùng mẫu biên bản “Cuộc gọi bán hàng” cho cuộc gọi thật", "Gọi như bình thường", "Xem biên bản, phân tích và nhận xét"],
      en: ["Pick the “Tough prospect” agent to practise", "Or use the “Sales call” notes format for real calls", "Talk as usual", "Review notes, analytics and feedback"],
    },
    faq: {
      vi: [
        { question: "Khách hàng có cần cài gì không?", answer: "Không. Khách mở link trên trình duyệt là vào được." },
        { question: "Có ghi âm cuộc gọi không?", answer: "Có, và mọi người đều thấy thông báo ghi âm trước khi vào phòng." },
      ],
      en: [
        { question: "Does the customer need to install anything?", answer: "No. They open the link in a browser." },
        { question: "Is the call recorded?", answer: "Yes, and everyone sees a recording notice before joining." },
      ],
    },
  },
  {
    slug: "lop-hoc-online",
    icon: "graduation",
    templateId: "tutor",
    title: { vi: "Lớp học online", en: "Online classes" },
    metaTitle: {
      vi: "Trợ lý AI cho lớp học online: ghi chú bài giảng, câu hỏi ôn tập",
      en: "AI assistant for online classes: lecture notes and review questions",
    },
    metaDescription: {
      vi: "Ghi lại bài giảng, tự tạo ghi chú học tập và câu hỏi ôn tập; học viên hỏi lại AI về nội dung buổi học bất cứ lúc nào.",
      en: "Record lectures, get study notes and review questions automatically, and let students ask the AI about the class later.",
    },
    heroTitle: {
      vi: "Mỗi buổi học online đều có ghi chú và câu hỏi ôn tập",
      en: "Every online class comes with notes and review questions",
    },
    heroSubtitle: {
      vi: "Giáo viên tập trung giảng, AI lo phần ghi chép. Học viên ôn lại bằng cách hỏi AI.",
      en: "Teachers focus on teaching while the AI takes notes. Students review by asking the AI.",
    },
    bullets: {
      vi: ["Ghi chú bài giảng theo chủ đề", "5 câu hỏi ôn tập có đáp án", "Hỏi AI về nội dung buổi học"],
      en: ["Lecture notes by topic", "Five review questions with answers", "Ask the AI about the class"],
    },
    pains: {
      vi: ["Học viên vừa nghe vừa chép nên bỏ lỡ ý.", "Xem lại video dài để tìm một đoạn rất mất thời gian.", "Giáo viên không có thời gian soạn câu hỏi ôn tập."],
      en: ["Students miss points while writing.", "Finding a moment in a long video takes forever.", "Teachers have no time to write review questions."],
    },
    benefits: {
      vi: [
        { title: "Ghi chú tự động", description: "Khái niệm chính, ví dụ và câu hỏi ôn tập sau mỗi buổi." },
        { title: "Tìm lại nhanh", description: "Bấm một câu trong transcript để tua video tới đúng đoạn đó." },
        { title: "Gia sư AI", description: "Agent “Gia sư” giải thích lại và hỏi để kiểm tra hiểu bài." },
      ],
      en: [
        { title: "Automatic notes", description: "Key concepts, examples and review questions after each class." },
        { title: "Find moments fast", description: "Click a transcript line to jump the video there." },
        { title: "AI tutor", description: "The “Tutor” agent explains again and checks understanding." },
      ],
    },
    steps: {
      vi: ["Tạo cuộc họp với mẫu biên bản “Bài giảng”", "Gửi link cho học viên", "Dạy như bình thường", "Chia sẻ link ghi chú cho cả lớp"],
      en: ["Create a meeting with the “Lecture” notes format", "Share the link with students", "Teach as usual", "Share the notes link with the class"],
    },
    faq: {
      vi: [
        { question: "Lớp học tối đa bao nhiêu người?", answer: "Gói Pro cho tối đa 10 người mỗi phòng; lớp lớn hơn sẽ có ở gói Team." },
        { question: "Học viên có cần tài khoản không?", answer: "Không cần. Học viên vào bằng link với tư cách khách." },
      ],
      en: [
        { question: "How big can a class be?", answer: "Pro allows up to 10 people per room; larger classes come with the Team plan." },
        { question: "Do students need an account?", answer: "No. Students join through the link as guests." },
      ],
    },
  },
];

export function getUseCase(slug: string) {
  return USE_CASES.find((useCase) => useCase.slug === slug) ?? null;
}
