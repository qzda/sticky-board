import { describe, expect, it } from "vitest";

import {
  getBlobExtension,
  isExternalImagePath,
  normalizeZipPath,
  resolveZipImagePath,
  toZipMarkdown,
} from "./zip";

describe("normalizeZipPath", () => {
  it("normalizes separators and leading prefixes", () => {
    expect(normalizeZipPath("./images/a.png")).toBe("images/a.png");
    expect(normalizeZipPath("/images/a.png")).toBe("images/a.png");
    expect(normalizeZipPath("\\images\\a.png")).toBe("images/a.png");
    expect(normalizeZipPath("images/a.png")).toBe("images/a.png");
  });

  it("resolves dot segments", () => {
    expect(normalizeZipPath("notes/./img/a.png")).toBe("notes/img/a.png");
    expect(normalizeZipPath("notes/../images/a.png")).toBe("images/a.png");
    expect(normalizeZipPath("notes/img/../../a.png")).toBe("a.png");
  });
});

describe("getBlobExtension", () => {
  it("maps known MIME types", () => {
    const blob = (type: string) => new Blob([""], { type });
    expect(getBlobExtension(blob("image/jpeg"))).toBe("jpg");
    expect(getBlobExtension(blob("image/PNG"))).toBe("png");
    expect(getBlobExtension(blob("image/webp"))).toBe("webp");
    expect(getBlobExtension(blob("image/svg+xml"))).toBe("svg");
  });

  it("falls back to bin", () => {
    expect(getBlobExtension(new Blob([""], { type: "application/pdf" }))).toBe(
      "bin",
    );
  });
});

describe("isExternalImagePath", () => {
  it("detects remote, data and internal paths", () => {
    expect(isExternalImagePath("https://example.com/a.png")).toBe(true);
    expect(isExternalImagePath("http://example.com/a.png")).toBe(true);
    expect(isExternalImagePath("data:image/png;base64,abc")).toBe(true);
    expect(isExternalImagePath("sticky-image://a-1")).toBe(true);
    expect(isExternalImagePath("./images/a.png")).toBe(false);
  });
});

describe("resolveZipImagePath", () => {
  it("resolves paths relative to the markdown directory", () => {
    expect(resolveZipImagePath("notes/a.md", "img/x.png")).toBe(
      "notes/img/x.png",
    );
    expect(resolveZipImagePath("a.md", "img/x.png")).toBe("img/x.png");
    expect(resolveZipImagePath("./notes/a.md", "./img/x.png")).toBe(
      "notes/img/x.png",
    );
    expect(resolveZipImagePath("notes/a.md", "../images/x.png")).toBe(
      "images/x.png",
    );
  });
});

describe("toZipMarkdown", () => {
  it("rewrites mapped internal images", () => {
    const markdown = "![a](sticky-image://key-1)\n![b](sticky-image://key-2)";

    expect(
      toZipMarkdown(markdown, {
        "key-1": "./images/key-1.png",
        "key-2": "./images/key-2.jpg",
      }),
    ).toBe("![a](./images/key-1.png)\n![b](./images/key-2.jpg)");
  });

  it("keeps unmapped and external images unchanged", () => {
    const markdown =
      "![missing](sticky-image://missing)\n![remote](https://example.com/a.png)";

    expect(toZipMarkdown(markdown, {})).toBe(markdown);
  });
});
