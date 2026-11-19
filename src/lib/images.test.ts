import { describe, expect, it } from "vitest";

import {
  collectReferencedImageKeys,
  extractReferencedImageKeys,
} from "./images";

describe("extractReferencedImageKeys", () => {
  it("collects unique internal image keys", () => {
    const markdown = [
      "![a](sticky-image://1700000000000-a-0)",
      "![b](sticky-image://1700000000000-b-1)",
      "![a again](sticky-image://1700000000000-a-0)",
    ].join("\n");

    expect([...extractReferencedImageKeys(markdown)]).toEqual([
      "1700000000000-a-0",
      "1700000000000-b-1",
    ]);
  });

  it("ignores remote, data and relative images", () => {
    const markdown = [
      "![remote](https://example.com/a.png)",
      "![data](data:image/png;base64,abc)",
      "![relative](./images/a.png)",
    ].join("\n");

    expect(extractReferencedImageKeys(markdown).size).toBe(0);
  });

  it("returns a fresh set on repeated calls", () => {
    const markdown = "![a](sticky-image://key-1)";
    const first = extractReferencedImageKeys(markdown);
    const second = extractReferencedImageKeys(markdown);

    expect(first).not.toBe(second);
    expect([...second]).toEqual(["key-1"]);
  });
});

describe("collectReferencedImageKeys", () => {
  it("merges keys from multiple markdown texts", () => {
    const texts = [
      "![a](sticky-image://key-1)",
      "![b](sticky-image://key-2)\n![a](sticky-image://key-1)",
    ];

    expect([...collectReferencedImageKeys(texts)]).toEqual([
      "key-1",
      "key-2",
    ]);
  });
});
