// Sample meeting for the interactive demo on the landing page (static data,
// no API calls). Timestamps are seconds from the start of the meeting.

type Localized<T> = Record<"vi" | "en", T>;

export interface DemoLine {
  sec: number;
  speaker: string;
  text: string;
}

export interface DemoQuestion {
  question: string;
  answer: string;
  // Lines the answer cites (highlighted in the transcript).
  cites: number[];
}

export const DEMO_MEETING: Localized<{
  transcript: DemoLine[];
  tldr: string;
  decisions: { text: string; sec: number }[];
  actionItems: { text: string; owner: string; due: string; sec: number }[];
  questions: DemoQuestion[];
}> = {
  vi: {
    transcript: [
      { sec: 4, speaker: "Lan", text: "Chào mọi người, hôm nay mình chốt kế hoạch ra mắt bản mới nhé." },
      { sec: 12, speaker: "Nam", text: "Bên kỹ thuật xong phần thanh toán rồi, còn trang bảng giá thôi." },
      { sec: 27, speaker: "Lan", text: "Giá gói Pro mình chốt 149 nghìn một tháng, mọi người đồng ý không?" },
      { sec: 35, speaker: "Hà", text: "Đồng ý. Gói năm thì giảm hai tháng cho dễ chốt." },
      { sec: 48, speaker: "Lan", text: "Mia ơi, mình nên ra mắt ngày nào để kịp truyền thông?" },
      { sec: 53, speaker: "Mia (AI)", text: "Nếu bảng giá xong thứ Sáu thì ra mắt thứ Ba tuần sau là vừa, còn ba ngày làm truyền thông." },
      { sec: 66, speaker: "Nam", text: "Ok, em cập nhật trang bảng giá trước thứ Sáu." },
      { sec: 74, speaker: "Hà", text: "Chị viết bài thông báo và gửi email cho khách cũ vào thứ Hai." },
      { sec: 88, speaker: "Lan", text: "Kênh quảng cáo Q4 thì tuần sau bàn tiếp nhé." },
    ],
    tldr: "Team chốt giá gói Pro 149.000đ/tháng (giảm 2 tháng khi trả theo năm) và ra mắt vào thứ Ba tuần sau. Kênh quảng cáo Q4 sẽ bàn tiếp.",
    decisions: [
      { text: "Giá gói Pro: 149.000đ/tháng, gói năm giảm 2 tháng", sec: 27 },
      { text: "Ra mắt vào thứ Ba tuần sau", sec: 53 },
    ],
    actionItems: [
      { text: "Cập nhật trang bảng giá", owner: "Nam", due: "Thứ Sáu", sec: 66 },
      { text: "Viết bài thông báo, gửi email khách cũ", owner: "Hà", due: "Thứ Hai", sec: 74 },
    ],
    questions: [
      {
        question: "Giá gói Pro đã chốt là bao nhiêu?",
        answer: "Team chốt 149.000đ/tháng [0:27], gói năm giảm hai tháng [0:35].",
        cites: [2, 3],
      },
      {
        question: "Ai làm gì trước ngày ra mắt?",
        answer: "Nam cập nhật trang bảng giá trước thứ Sáu [1:06]; Hà viết bài thông báo và gửi email khách cũ vào thứ Hai [1:14].",
        cites: [6, 7],
      },
      {
        question: "Còn việc gì chưa quyết?",
        answer: "Kênh quảng cáo Q4 chưa chốt, sẽ bàn tiếp vào tuần sau [1:28].",
        cites: [8],
      },
    ],
  },
  en: {
    transcript: [
      { sec: 4, speaker: "Lan", text: "Hi everyone, today let's sign off the launch plan for the new version." },
      { sec: 12, speaker: "Nam", text: "Engineering has finished payments; only the pricing page is left." },
      { sec: 27, speaker: "Lan", text: "Let's set Pro at 149k VND a month. Everyone agree?" },
      { sec: 35, speaker: "Ha", text: "Agreed. Yearly gets two months free to make it easy." },
      { sec: 48, speaker: "Lan", text: "Mia, which day should we launch to leave time for marketing?" },
      { sec: 53, speaker: "Mia (AI)", text: "If pricing is done by Friday, next Tuesday works and leaves three days for marketing." },
      { sec: 66, speaker: "Nam", text: "OK, I'll update the pricing page before Friday." },
      { sec: 74, speaker: "Ha", text: "I'll write the announcement and email existing customers on Monday." },
      { sec: 88, speaker: "Lan", text: "Let's discuss Q4 ad channels next week." },
    ],
    tldr: "The team set Pro at 149k VND a month (two months free yearly) and will launch next Tuesday. Q4 ad channels are still open.",
    decisions: [
      { text: "Pro price: 149k VND/month, two months free yearly", sec: 27 },
      { text: "Launch next Tuesday", sec: 53 },
    ],
    actionItems: [
      { text: "Update the pricing page", owner: "Nam", due: "Friday", sec: 66 },
      { text: "Write the announcement, email existing customers", owner: "Ha", due: "Monday", sec: 74 },
    ],
    questions: [
      {
        question: "What price did we set for Pro?",
        answer: "The team set 149k VND a month [0:27], with two months free on yearly plans [0:35].",
        cites: [2, 3],
      },
      {
        question: "Who does what before launch?",
        answer: "Nam updates the pricing page before Friday [1:06]; Ha writes the announcement and emails existing customers on Monday [1:14].",
        cites: [6, 7],
      },
      {
        question: "What is still undecided?",
        answer: "The Q4 ad channels are still open and will be discussed next week [1:28].",
        cites: [8],
      },
    ],
  },
};
