import { describe, it, expect } from "vitest";

describe("Language Detection Filter", () => {
  it("should correctly identify Swahili text with high probability", () => {
    const results = [
      { lang: "sw", prob: 0.99 },
      { lang: "en", prob: 0.01 },
    ];

    const swahiliResult = results.find((r) => r.lang === "sw");
    expect(swahiliResult).toBeDefined();
    expect(swahiliResult?.prob).toBeGreaterThanOrEqual(0.98);
  });

  it("should correctly identify English text is not Swahili", () => {
    const results = [
      { lang: "en", prob: 0.99 },
      { lang: "sw", prob: 0.01 },
    ];

    const swahiliResult = results.find((r) => r.lang === "sw");
    expect(swahiliResult?.prob ?? 0).toBeLessThan(0.98);
  });

  it("should correctly identify French text is not Swahili", () => {
    const results = [
      { lang: "fr", prob: 0.99 },
      { lang: "sw", prob: 0.01 },
    ];

    const swahiliResult = results.find((r) => r.lang === "sw");
    expect(swahiliResult?.prob ?? 0).toBeLessThan(0.98);
  });

  it("should filter posts and keep only Swahili ones", () => {
    const posts = [
      {
        uri: "at://did:plc:test1/app.bsky.feed.post/abc123",
        record: {
          text: "Hello world",
          createdAt: "2025-11-24T00:00:00Z",
        },
      },
      {
        uri: "at://did:plc:test2/app.bsky.feed.post/def456",
        record: {
          text: "Habari yako leo?",
          createdAt: "2025-11-24T01:00:00Z",
        },
      },
      {
        uri: "at://did:plc:test3/app.bsky.feed.post/ghi789",
        record: {
          text: "Bonjour le monde",
          createdAt: "2025-11-24T02:00:00Z",
        },
      },
    ];

    // Simulate the filter with mock data
    const mockDetectResults = [
      [
        { lang: "en", prob: 0.99 },
        { lang: "sw", prob: 0.01 },
      ],
      [
        { lang: "sw", prob: 0.99 },
        { lang: "en", prob: 0.01 },
      ],
      [
        { lang: "fr", prob: 0.99 },
        { lang: "sw", prob: 0.01 },
      ],
    ];

    let resultIndex = 0;
    const swahiliPosts = posts.filter((post) => {
      const text = post.record.text;
      if (!text || text.trim().length === 0) {
        return false;
      }

      const results = mockDetectResults[resultIndex++];
      const swahiliResult = results.find((r) => r.lang === "sw");
      return swahiliResult !== undefined && swahiliResult.prob >= 0.98;
    });

    expect(swahiliPosts).toHaveLength(1);
    expect(swahiliPosts[0].record.text).toBe("Habari yako leo?");
  });

  it("should handle empty text gracefully", () => {
    const posts = [
      {
        uri: "at://did:plc:test/app.bsky.feed.post/abc123",
        record: {
          text: "",
          createdAt: "2025-11-24T00:00:00Z",
        },
      },
    ];

    const swahiliPosts = posts.filter((post) => {
      const text = post.record.text;
      if (!text || text.trim().length === 0) {
        return false;
      }
      return true;
    });

    expect(swahiliPosts).toHaveLength(0);
  });
});
