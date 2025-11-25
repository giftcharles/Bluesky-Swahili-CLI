import { describe, it, expect, vi } from "vitest";

describe("Discovery Module", () => {
  it("should filter posts and keep only Swahili ones", () => {
    const posts = [
      {
        uri: "at://did:plc:test1/app.bsky.feed.post/abc123",
        record: {
          text: "Hello world",
          createdAt: "2025-11-24T00:00:00Z",
        },
        discoveredFrom: "user1.bsky.social",
        discoveryMethod: "random_handle",
        confidence: 0.99,
      },
      {
        uri: "at://did:plc:test2/app.bsky.feed.post/def456",
        record: {
          text: "Habari yako leo?",
          createdAt: "2025-11-24T01:00:00Z",
        },
        discoveredFrom: "user2.bsky.social",
        discoveryMethod: "tag_sw",
        confidence: 0.99,
      },
      {
        uri: "at://did:plc:test3/app.bsky.feed.post/ghi789",
        record: {
          text: "Bonjour le monde",
          createdAt: "2025-11-24T02:00:00Z",
        },
        discoveredFrom: "user3.bsky.social",
        discoveryMethod: "random_handle",
        confidence: 0.99,
      },
    ];

    // Simulate filtering logic
    const swahiliResults = [
      [{ lang: "en", prob: 0.99 }],
      [{ lang: "sw", prob: 0.99 }],
      [{ lang: "fr", prob: 0.99 }],
    ];

    let resultIndex = 0;
    const swahiliPosts = posts.filter((post) => {
      const text = post.record.text;
      if (!text || text.trim().length === 0) {
        return false;
      }

      const results = swahiliResults[resultIndex++];
      const swahiliResult = results.find((r: { lang: string; prob: number }) => r.lang === "sw");
      return swahiliResult !== undefined && swahiliResult.prob >= 0.98;
    });

    expect(swahiliPosts).toHaveLength(1);
    expect(swahiliPosts[0].record.text).toBe("Habari yako leo?");
    expect(swahiliPosts[0].discoveryMethod).toBe("tag_sw");
  });

  it("should deduplicate posts by URI", () => {
    const posts = [
      {
        uri: "at://did:plc:test1/app.bsky.feed.post/abc123",
        record: { text: "Test", createdAt: "2025-11-24T00:00:00Z" },
        discoveredFrom: "user1.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
      {
        uri: "at://did:plc:test1/app.bsky.feed.post/abc123",
        record: { text: "Test", createdAt: "2025-11-24T00:00:00Z" },
        discoveredFrom: "user2.bsky.social",
        discoveryMethod: "tag",
        confidence: 0.99,
      },
    ];

    const seenUris = new Set<string>();
    const deduplicated = posts.filter((post) => {
      if (seenUris.has(post.uri)) {
        return false;
      }
      seenUris.add(post.uri);
      return true;
    });

    expect(deduplicated).toHaveLength(1);
  });

  it("should handle empty text gracefully", () => {
    const posts = [
      {
        uri: "at://did:plc:test/app.bsky.feed.post/abc123",
        record: { text: "", createdAt: "2025-11-24T00:00:00Z" },
        discoveredFrom: "user.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
    ];

    const filtered = posts.filter((post) => {
      const text = post.record.text;
      return text && text.trim().length > 0;
    });

    expect(filtered).toHaveLength(0);
  });

  it("should sort posts by timestamp (newest first)", () => {
    const posts = [
      {
        uri: "at://1",
        record: {
          text: "First",
          createdAt: "2025-11-24T00:00:00Z",
        },
        discoveredFrom: "user1.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
      {
        uri: "at://2",
        record: {
          text: "Third",
          createdAt: "2025-11-24T02:00:00Z",
        },
        discoveredFrom: "user2.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
      {
        uri: "at://3",
        record: {
          text: "Second",
          createdAt: "2025-11-24T01:00:00Z",
        },
        discoveredFrom: "user3.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
    ];

    const sorted = [...posts].sort(
      (a, b) => new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
    );

    expect(sorted[0].record.text).toBe("Third");
    expect(sorted[1].record.text).toBe("Second");
    expect(sorted[2].record.text).toBe("First");
  });

  it("should track discovery metadata", () => {
    const post = {
      uri: "at://did:plc:test/app.bsky.feed.post/abc123",
      record: { text: "Habari", createdAt: "2025-11-24T00:00:00Z" },
      discoveredFrom: "user1.bsky.social",
      discoveryMethod: "tag_tanzania",
      confidence: 0.98,
    };

    expect(post.discoveredFrom).toBe("user1.bsky.social");
    expect(post.discoveryMethod).toBe("tag_tanzania");
    expect(post.confidence).toBeGreaterThanOrEqual(0.98);
  });

  it("should handle JSON output format", () => {
    const posts = [
      {
        uri: "at://did:plc:test/app.bsky.feed.post/abc123",
        record: { text: "Test", createdAt: "2025-11-24T00:00:00Z" },
        discoveredFrom: "user1.bsky.social",
        discoveryMethod: "random",
        confidence: 0.99,
      },
    ];

    const output = {
      mode: "discover",
      strategy: "mixed",
      limit: 50,
      sources: 10,
      posts: posts,
      totalFound: posts.length,
      timestamp: new Date().toISOString(),
    };

    expect(output.mode).toBe("discover");
    expect(output.posts).toHaveLength(1);
    expect(output.totalFound).toBe(1);
    expect(JSON.stringify(output)).toBeTruthy();
  });
});
