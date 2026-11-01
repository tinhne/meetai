import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// next/og only bundles a Latin font, so Vietnamese glyphs need Be Vietnam Pro.
// Google Fonts returns a TTF subset for just the characters we draw.
async function loadFont(text: string, weight: number) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&text=${encodeURIComponent(text)}`,
    ).then((res) => res.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function renderOgImage({ eyebrow, title }: { eyebrow: string; title: string }) {
  const text = `Meet.AI${eyebrow}${title}`;
  const [regular, bold] = await Promise.all([loadFont(text, 500), loadFont(text, 700)]);
  const fonts = [
    regular && { name: "Be Vietnam Pro", data: regular, weight: 500 as const, style: "normal" as const },
    bold && { name: "Be Vietnam Pro", data: bold, weight: 700 as const, style: "normal" as const },
  ].filter((font) => !!font);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #052e1c 0%, #0b3d2a 55%, #1e1b4b 100%)",
          color: "#ffffff",
          fontFamily: "Be Vietnam Pro",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 700,
              color: "#052e1c",
            }}
          >
            M
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>Meet.AI</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#86efac" }}>{eyebrow}</div>
          <div style={{ fontSize: title.length > 60 ? 54 : 66, fontWeight: 700, lineHeight: 1.15 }}>{title}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
