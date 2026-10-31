import { describe, expect, it } from "vitest";

import { htmlToText, isPrivateAddress } from "./html";

describe("htmlToText", () => {
  it("keeps readable text and drops scripts", () => {
    const { title, text } = htmlToText(
      "<html><head><title>Bảng giá &amp; gói</title><script>alert(1)</script></head><body><h1>Gói Pro</h1><p>149.000&nbsp;đ/tháng</p><ul><li>Không giới hạn</li></ul></body></html>",
    );
    expect(title).toBe("Bảng giá & gói");
    expect(text).toContain("Gói Pro");
    expect(text).toContain("149.000 đ/tháng");
    expect(text).toContain("- Không giới hạn");
    expect(text).not.toContain("alert");
  });
});

describe("isPrivateAddress", () => {
  it("blocks internal addresses", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.79", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "104.16.0.1", "2606:4700::1111"]) {
      expect(isPrivateAddress(ip)).toBe(false);
    }
  });
});
