// Public site settings used for SEO, structured data and the footer.

export const SITE = {
  name: "Meet.AI",
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://meetai-assistant.vercel.app").replace(/\/$/, ""),
  logo: "/logo.svg",
  // Shown on the contact and legal pages; set it once a domain mailbox exists.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  github: "https://github.com/tinhne/meetai",
};
