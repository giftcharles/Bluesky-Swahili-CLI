import { BskyAgent } from "@atproto/api";
import { detect } from "langdetect";

export interface DiscoveryOptions {
  limit?: number; // Number of posts to find (default: 50)
  sources?: number; // Number of handles to check (default: 10)
  strategy?: "random" | "trending" | "mixed";
  tags?: string[]; // Hashtags to search for
  deduplicateLike?: boolean; // Remove duplicate posts (default: true)
}

export interface DiscoveredPost {
  uri: string;
  record: {
    text: string;
    createdAt: string;
  };
  discoveredFrom: string; // Handle where it was found
  discoveryMethod: string; // How it was discovered
  confidence: number; // Language detection confidence
}

const POPULAR_SWAHILI_HASHTAGS = [
  "sw",
  "swahili",
  "habari",
  "tanzania",
  "kenya",
  "uganda",
  "rwanda",
  "burundi",
  "congo",
  "swahilinews",
  "kiswahili",
];

const SWAHILI_HANDLES = ["changetanzania.bsky.social", "bsky.app", "tanzania.bsky.social"];

/**
 * Get random popular Bluesky handles
 */
export async function getRandomHandles(agent: BskyAgent, limit: number): Promise<string[]> {
  try {
    const handles: Set<string> = new Set();

    // Use known Swahili handles as seed
    for (const handle of SWAHILI_HANDLES.slice(0, limit)) {
      handles.add(handle);
    }

    // Add more random ones if needed
    while (handles.size < limit) {
      const randomStr = Math.random().toString(36).substring(2, 8);
      handles.add(`${randomStr}.bsky.social`);
    }

    return Array.from(handles).slice(0, limit);
  } catch (error) {
    console.error("Error getting random handles:", error);
    return SWAHILI_HANDLES.slice(0, limit);
  }
}

/**
 * Find posts with specific hashtags
 */
export async function findPostsByTags(
  agent: BskyAgent,
  tags: string[],
  limit: number = 100
): Promise<DiscoveredPost[]> {
  const posts: DiscoveredPost[] = [];
  const seenUris = new Set<string>();

  try {
    for (const tag of tags) {
      let cursor: string | undefined;
      let fetchedCount = 0;

      // Search for posts with hashtag
      while (fetchedCount < limit && posts.length < limit) {
        try {
          const response = await agent.api.app.bsky.feed.searchPosts(
            {
              q: `#${tag}`,
              limit: 25,
              cursor: cursor,
            },
            { headers: {} }
          );

          if (!response.data.posts || response.data.posts.length === 0) {
            break;
          }

          for (const post of response.data.posts) {
            if (seenUris.has(post.uri) || posts.length >= limit) {
              continue;
            }

            const text = (post.record as Record<string, unknown>).text as string;
            if (!text || text.trim().length === 0) {
              continue;
            }

            try {
              const results = detect(text);
              const swahiliResult = results.find(
                (r: { lang: string; prob: number }) => r.lang === "sw"
              );

              if (swahiliResult && swahiliResult.prob >= 0.98) {
                const authorHandle = post.author.handle || "unknown.bsky.social";
                posts.push({
                  uri: post.uri,
                  record: {
                    text: text,
                    createdAt: (post.record as Record<string, unknown>).createdAt as string,
                  },
                  discoveredFrom: authorHandle,
                  discoveryMethod: `tag_${tag}`,
                  confidence: swahiliResult.prob,
                });
                seenUris.add(post.uri);
              }
            } catch {
              // Skip posts that can't be detected
            }

            fetchedCount++;
          }

          cursor = response.data.cursor;
          if (!cursor) {
            break;
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error searching tag #${tag}:`, error);
          break;
        }
      }
    }

    return posts;
  } catch (error) {
    console.error("Error finding posts by tags:", error);
    return posts;
  }
}

/**
 * Discover Swahili posts from random handles
 */
export async function discoverSwahiliPosts(
  agent: BskyAgent,
  options: DiscoveryOptions
): Promise<DiscoveredPost[]> {
  const limit = options.limit || 50;
  const sources = options.sources || 10;
  const strategy = options.strategy || "mixed";
  const tags = options.tags || POPULAR_SWAHILI_HASHTAGS;
  const deduplicateLike = options.deduplicateLike !== false;

  const allPosts: DiscoveredPost[] = [];
  const seenUris = new Set<string>();

  console.error(`\n📡 Starting discovery (strategy: ${strategy})...`);
  console.error(`📊 Target: ${limit} posts from ~${sources} sources`);

  try {
    // Strategy 1: Tag-based discovery
    if (strategy === "trending" || strategy === "mixed") {
      console.error(`\n🏷️  Searching ${tags.length} hashtags...`);
      const tagPosts = await findPostsByTags(agent, tags, limit);
      console.error(`✓ Found ${tagPosts.length} Swahili posts from tags`);

      for (const post of tagPosts) {
        if (!seenUris.has(post.uri)) {
          allPosts.push(post);
          seenUris.add(post.uri);
        }
      }
    }

    // Strategy 2: Random popular handles (mixed or random strategy)
    if (strategy === "random" || (strategy === "mixed" && allPosts.length < limit)) {
      console.error(`\n🎲 Checking ${sources} random handles...`);
      const handles = await getRandomHandles(agent, sources);

      for (const handle of handles) {
        if (allPosts.length >= limit) {
          break;
        }

        try {
          let cursor: string | undefined;
          let fetchedCount = 0;

          while (fetchedCount < 20 && allPosts.length < limit) {
            const response = await agent.getAuthorFeed({
              actor: handle,
              limit: 25,
              cursor: cursor,
            });

            if (!response.data.feed || response.data.feed.length === 0) {
              break;
            }

            for (const item of response.data.feed) {
              if (!item.post || !item.post.record || seenUris.has(item.post.uri)) {
                continue;
              }

              const text = (item.post.record as Record<string, unknown>).text as string;
              if (!text || text.trim().length === 0) {
                continue;
              }

              try {
                const results = detect(text);
                const swahiliResult = results.find(
                  (r: { lang: string; prob: number }) => r.lang === "sw"
                );

                if (swahiliResult && swahiliResult.prob >= 0.98) {
                  allPosts.push({
                    uri: item.post.uri,
                    record: {
                      text: text,
                      createdAt: (item.post.record as Record<string, unknown>).createdAt as string,
                    },
                    discoveredFrom: handle,
                    discoveryMethod: "random_handle",
                    confidence: swahiliResult.prob,
                  });
                  seenUris.add(item.post.uri);
                }
              } catch {
                // Skip posts that can't be detected
              }

              fetchedCount++;
            }

            cursor = response.data.cursor;
            if (!cursor) {
              break;
            }

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(
            `  ⚠️  Error fetching from @${handle}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      console.error(`✓ Found ${allPosts.length} Swahili posts from random handles`);
    }

    // Deduplicate if requested
    if (deduplicateLike) {
      const uniquePosts: DiscoveredPost[] = [];
      const seenTexts = new Set<string>();

      for (const post of allPosts) {
        const textHash = post.record.text.slice(0, 100);
        if (!seenTexts.has(textHash)) {
          uniquePosts.push(post);
          seenTexts.add(textHash);
        }
      }

      allPosts.length = 0;
      allPosts.push(...uniquePosts);
    }

    // Sort by timestamp (newest first)
    allPosts.sort(
      (a, b) => new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
    );

    // Trim to limit
    return allPosts.slice(0, limit);
  } catch (error) {
    console.error("Error during discovery:", error);
    return allPosts;
  }
}
