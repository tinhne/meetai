// Minimal iCalendar (RFC 5545) invite for "add to calendar".

function formatDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcsInvite(params: {
  uid: string;
  title: string;
  description: string;
  url: string;
  start: Date;
  durationMinutes: number;
  now?: Date;
}) {
  const end = new Date(params.start.getTime() + params.durationMinutes * 60_000);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meet.AI//Meeting invite//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@meetai`,
    `DTSTAMP:${formatDate(params.now ?? new Date())}`,
    `DTSTART:${formatDate(params.start)}`,
    `DTEND:${formatDate(end)}`,
    `SUMMARY:${escapeText(params.title)}`,
    `DESCRIPTION:${escapeText(`${params.description}\n${params.url}`)}`,
    `URL:${params.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
