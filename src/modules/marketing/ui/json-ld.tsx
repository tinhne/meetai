// Structured data for search engines. Content is our own static data.
export const JsonLd = ({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) => (
  <script
    type="application/ld+json"
    // JSON.stringify output with "<" escaped cannot break out of the script tag.
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
  />
);
