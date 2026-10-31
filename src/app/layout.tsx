// The real root layout (with <html>) lives in app/[locale]/layout.tsx.
// This file only exists so app/not-found.tsx has a parent layout.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
