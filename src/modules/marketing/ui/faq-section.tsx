import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLd } from "./json-ld";
import { SectionHeading } from "./landing-sections";

type FaqItem = { question: string; answer: string };

export const FaqList = ({ title, items, id }: { title: string; items: FaqItem[]; id?: string }) => (
  <section id={id} className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 md:px-6">
    <SectionHeading title={title} />
    <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
      {items.map((item, index) => (
        <AccordionItem key={item.question} value={`faq-${index}`}>
          <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  </section>
);

export const FaqSection = () => {
  const t = useTranslations("landing.faq");
  return <FaqList id="faq" title={t("title")} items={t.raw("items") as FaqItem[]} />;
};
