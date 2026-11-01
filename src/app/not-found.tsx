"use client";

import Error from "next/error";

// Rendered for requests the locale middleware does not handle.
export default function GlobalNotFound() {
  return (
    <html lang="vi">
      <body>
        <Error statusCode={404} />
      </body>
    </html>
  );
}
