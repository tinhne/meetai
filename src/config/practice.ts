// Practice mode scenarios. Each one reuses an agent template persona and adds
// a focused brief for the session.

export type PracticeKind = "ielts" | "interview" | "sales";

export interface PracticeScenario {
  id: string;
  kind: PracticeKind;
  templateId: string;
  // Language the session is held in.
  language: "vi" | "en";
  icon: "languages" | "briefcase" | "trending";
  name: Record<"vi" | "en", string>;
  description: Record<"vi" | "en", string>;
  brief: string;
}

export const PRACTICE_SCENARIOS: PracticeScenario[] = [
  {
    id: "ielts-full",
    kind: "ielts",
    templateId: "ielts",
    language: "en",
    icon: "languages",
    name: { vi: "IELTS Speaking (Part 1–3)", en: "IELTS Speaking (Part 1–3)" },
    description: {
      vi: "Thi thử đủ 3 phần, khoảng 12 phút, nhận band ước lượng theo 4 tiêu chí.",
      en: "A full ~12-minute mock test with an estimated band on four criteria.",
    },
    brief: "Run a complete IELTS Speaking mock test: Part 1 (4-5 questions), Part 2 (cue card), Part 3 (4-5 questions). Start right away with a short greeting.",
  },
  {
    id: "interview-frontend",
    kind: "interview",
    templateId: "interviewer",
    language: "vi",
    icon: "briefcase",
    name: { vi: "Phỏng vấn Frontend Developer", en: "Frontend Developer interview" },
    description: {
      vi: "React, hiệu năng web, CSS, kinh nghiệm dự án và câu hỏi tình huống.",
      en: "React, web performance, CSS, project experience and behavioural questions.",
    },
    brief: "Interview for a mid-level Frontend Developer role (React, TypeScript, web performance, accessibility). About 15 minutes, 6-8 questions.",
  },
  {
    id: "interview-backend",
    kind: "interview",
    templateId: "interviewer",
    language: "vi",
    icon: "briefcase",
    name: { vi: "Phỏng vấn Backend Developer", en: "Backend Developer interview" },
    description: {
      vi: "Thiết kế API, cơ sở dữ liệu, hệ thống phân tán và xử lý sự cố.",
      en: "API design, databases, distributed systems and incident handling.",
    },
    brief: "Interview for a mid-level Backend Developer role (API design, SQL, caching, queues, scalability, debugging production issues). About 15 minutes, 6-8 questions.",
  },
  {
    id: "interview-pm",
    kind: "interview",
    templateId: "interviewer",
    language: "vi",
    icon: "briefcase",
    name: { vi: "Phỏng vấn Product Manager", en: "Product Manager interview" },
    description: {
      vi: "Tư duy sản phẩm, ưu tiên tính năng, số liệu và làm việc với team.",
      en: "Product sense, prioritisation, metrics and stakeholder management.",
    },
    brief: "Interview for a Product Manager role: product sense, prioritisation, metrics, stakeholder management and one product case. About 15 minutes.",
  },
  {
    id: "sales-cold-call",
    kind: "sales",
    templateId: "sales-coach",
    language: "vi",
    icon: "trending",
    name: { vi: "Gọi điện bán hàng (cold call)", en: "Sales cold call" },
    description: {
      vi: "Khách hàng bận rộn, nhiều phản đối. Luyện mở đầu, khai thác nhu cầu và chốt bước tiếp theo.",
      en: "A busy prospect with objections. Practise the opener, discovery and next step.",
    },
    brief: "This is a cold call: you did not expect the call and are busy. Give the seller 10 minutes at most.",
  },
];

export function getPracticeScenario(id: string) {
  return PRACTICE_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}
