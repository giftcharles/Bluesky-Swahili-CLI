/**
 * Smart Discovery Crawler for Bluesky Swahili Content
 *
 * This module implements an intelligent crawler that:
 * 1. Discovers new Swahili content creators by traversing the social graph
 * 2. Caches discovered profiles for future sessions
 * 3. Uses weighted random selection for diversity
 * 4. Learns and grows the more you use it
 */

import { BskyAgent } from "@atproto/api";
import langdetect from "langdetect";
import fs from "fs";
import path from "path";
import os from "os";

// Cache file location
const CACHE_FILE = path.join(os.homedir(), ".swahili-discovery-cache.json");

// Interfaces
export interface CachedProfile {
  did: string;
  handle: string;
  displayName?: string;
  discoveredAt: string;
  lastSeen: string;
  swahiliPostCount: number;
  engagementScore: number;
  discoveredFrom: string; // How we found this profile
  tags: string[]; // Associated hashtags
}

export interface DiscoveryCache {
  version: string;
  lastUpdated: string;
  totalDiscoveries: number;
  profiles: Record<string, CachedProfile>;
  seedProfiles: string[]; // Known good starting points
  crawlHistory: string[]; // Recent crawl targets (to avoid recrawling)
}

export interface SmartDiscoveryOptions {
  limit?: number;
  maxCrawlDepth?: number;
  explorationRate?: number; // 0-1, how much to explore vs exploit cache
  tags?: string[];
  freshness?: "recent" | "any"; // Prefer recent content?
}

export interface DiscoveredPost {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
  };
  confidence: number;
  discoveryMethod: string;
  engagementScore: number;
}

// Initialize or load cache
function loadCache(): DiscoveryCache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      const cache = JSON.parse(data) as DiscoveryCache;
      // Migrate old cache if needed
      if (!cache.version) {
        cache.version = "2.0";
        cache.seedProfiles = cache.seedProfiles || [];
        cache.crawlHistory = cache.crawlHistory || [];
      }
      return cache;
    }
  } catch (error) {
    console.error("Error loading cache, creating new one:", error);
  }

  // Default cache with diverse seed profiles from East African Swahili-speaking regions
  return {
    version: "2.0",
    lastUpdated: new Date().toISOString(),
    totalDiscoveries: 0,
    profiles: {},
    seedProfiles: ["changetanzania.bsky.social", "tanzania.bsky.social", "kenya.bsky.social"],
    crawlHistory: [],
  };
}

// Save cache to disk
function saveCache(cache: DiscoveryCache): void {
  try {
    cache.lastUpdated = new Date().toISOString();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error("Error saving cache:", error);
  }
}

// Check if text is Swahili with high confidence
function isSwahili(text: string): { isSwahili: boolean; confidence: number } {
  if (!text || text.trim().length < 10) {
    return { isSwahili: false, confidence: 0 };
  }

  try {
    const results = langdetect.detect(text);
    const swahiliResult = results.find((r: { lang: string; prob: number }) => r.lang === "sw");
    if (swahiliResult && swahiliResult.prob >= 0.9) {
      return { isSwahili: true, confidence: swahiliResult.prob };
    }
  } catch {
    // Language detection failed
  }

  return { isSwahili: false, confidence: 0 };
}

// Extract hashtags from text
function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0600-\u06FF]+/g) || [];
  return matches.map((tag) => tag.toLowerCase().replace("#", ""));
}

// Calculate engagement score from post metrics
function calculateEngagement(post: any): number {
  const likes = post.likeCount || 0;
  const reposts = post.repostCount || 0;
  const replies = post.replyCount || 0;
  return likes + reposts * 2 + replies * 3;
}

// Weighted random selection - prefers higher scores but maintains randomness
function weightedRandomSelect<T extends { weight: number }>(items: T[], count: number): T[] {
  if (items.length <= count) return items;

  const selected: T[] = [];
  const remaining = [...items];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Add randomness factor
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight + Math.random() * 0.5, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight + Math.random() * 0.5;
      if (random <= 0) {
        selected.push(remaining[j]);
        remaining.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

// Shuffle array randomly
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Discover new profiles by crawling interactions
async function crawlForNewProfiles(
  agent: BskyAgent,
  cache: DiscoveryCache,
  startHandle: string,
  maxProfiles: number = 20
): Promise<CachedProfile[]> {
  const newProfiles: CachedProfile[] = [];
  // Only check against already cached profiles, not crawl history (allow re-crawling)
  const checked = new Set<string>(Object.keys(cache.profiles));

  try {
    // Get the profile
    const profile = await agent.getProfile({ actor: startHandle });
    if (!profile.data) return newProfiles;

    const did = profile.data.did;

    // Strategy 1: Get followers of this Swahili speaker (increased limit)
    try {
      const followers = await agent.getFollowers({
        actor: did,
        limit: 50, // Increased from 30
      });

      for (const follower of followers.data.followers) {
        if (checked.has(follower.did)) continue;
        checked.add(follower.did);

        // Quick check: fetch a few posts to see if they post in Swahili
        try {
          const feed = await agent.getAuthorFeed({
            actor: follower.did,
            limit: 10, // Increased from 5
          });

          let swahiliCount = 0;
          const tags: string[] = [];
          for (const item of feed.data.feed) {
            const record = item.post.record as { text?: string };
            if (record?.text) {
              const { isSwahili: isSw } = isSwahili(record.text);
              if (isSw) {
                swahiliCount++;
                tags.push(...extractHashtags(record.text));
              }
            }
          }

          if (swahiliCount > 0) {
            newProfiles.push({
              did: follower.did,
              handle: follower.handle,
              displayName: follower.displayName,
              discoveredAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              swahiliPostCount: swahiliCount,
              engagementScore: 1,
              discoveredFrom: `follower_of:${startHandle}`,
              tags: [...new Set(tags)],
            });
          }
        } catch {
          // Skip on error
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 80));

        if (newProfiles.length >= maxProfiles) break;
      }
    } catch (error) {
      console.error("Error crawling followers:", error);
    }

    // Strategy 2: Get who they follow (increased limit)
    try {
      const following = await agent.getFollows({
        actor: did,
        limit: 50, // Increased from 30
      });

      for (const followed of following.data.follows) {
        if (checked.has(followed.did)) continue;
        if (newProfiles.length >= maxProfiles) break;

        checked.add(followed.did);

        try {
          const feed = await agent.getAuthorFeed({
            actor: followed.did,
            limit: 10, // Increased from 5
          });

          let swahiliCount = 0;
          const tags: string[] = [];

          for (const item of feed.data.feed) {
            const record = item.post.record as { text?: string };
            if (record?.text) {
              const { isSwahili: isSw } = isSwahili(record.text);
              if (isSw) {
                swahiliCount++;
                tags.push(...extractHashtags(record.text));
              }
            }
          }

          if (swahiliCount > 0) {
            newProfiles.push({
              did: followed.did,
              handle: followed.handle,
              displayName: followed.displayName,
              discoveredAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              swahiliPostCount: swahiliCount,
              engagementScore: 1,
              discoveredFrom: `following_of:${startHandle}`,
              tags: [...new Set(tags)],
            });
          }
        } catch {
          // Skip on error
        }

        await new Promise((r) => setTimeout(r, 80));
      }
    } catch (error) {
      console.error("Error crawling following:", error);
    }

    // Strategy 3: Search for multiple Swahili hashtags (not just one random)
    const swahiliHashtags = [
      "kiswahili",
      "swahili",
      "habari",
      "tanzania",
      "kenya",
      "uganda",
      "jambo",
      "karibu",
      "afrika",
      "mashariki",
      "nairobi",
      "daressalaam",
      "mombasa",
      "swahilipost",
      "lugha",
    ];

    // Search multiple hashtags for better coverage
    const tagsToSearch = shuffle(swahiliHashtags).slice(0, 3);

    for (const randomTag of tagsToSearch) {
      if (newProfiles.length >= maxProfiles) break;

      try {
        const searchResults = await agent.app.bsky.feed.searchPosts({
          q: `#${randomTag}`,
          limit: 30,
        });

        for (const post of searchResults.data.posts) {
          const authorDid = post.author.did;
          if (checked.has(authorDid)) continue;
          if (newProfiles.length >= maxProfiles) break;

          checked.add(authorDid);

          const record = post.record as { text?: string };
          if (record?.text) {
            const { isSwahili: isSw } = isSwahili(record.text);
            if (isSw) {
              newProfiles.push({
                did: authorDid,
                handle: post.author.handle,
                displayName: post.author.displayName,
                discoveredAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                swahiliPostCount: 1,
                engagementScore: calculateEngagement(post),
                discoveredFrom: `hashtag:${randomTag}`,
                tags: extractHashtags(record.text),
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error searching #${randomTag}:`, error);
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    // Strategy 4: Search for common Swahili words/phrases (new!)
    const swahiliPhrases = ["habari yako", "asante sana", "karibu sana", "jambo", "mambo vipi"];
    const randomPhrase = swahiliPhrases[Math.floor(Math.random() * swahiliPhrases.length)];

    try {
      const searchResults = await agent.app.bsky.feed.searchPosts({
        q: randomPhrase,
        limit: 25,
      });

      for (const post of searchResults.data.posts) {
        const authorDid = post.author.did;
        if (checked.has(authorDid)) continue;
        if (newProfiles.length >= maxProfiles) break;

        checked.add(authorDid);

        const record = post.record as { text?: string };
        if (record?.text) {
          const { isSwahili: isSw } = isSwahili(record.text);
          if (isSw) {
            newProfiles.push({
              did: authorDid,
              handle: post.author.handle,
              displayName: post.author.displayName,
              discoveredAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              swahiliPostCount: 1,
              engagementScore: calculateEngagement(post),
              discoveredFrom: `phrase:${randomPhrase}`,
              tags: extractHashtags(record.text),
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error searching phrase "${randomPhrase}":`, error);
    }
  } catch (error) {
    console.error("Error in crawl:", error);
  }

  // Update crawl history (keep it shorter to allow re-crawling sooner)
  cache.crawlHistory.push(startHandle);
  if (cache.crawlHistory.length > 50) {
    cache.crawlHistory = cache.crawlHistory.slice(-25);
  }

  return newProfiles;
}

// Main smart discovery function
export async function smartDiscoverSwahiliPosts(
  agent: BskyAgent,
  options: SmartDiscoveryOptions = {}
): Promise<{
  posts: DiscoveredPost[];
  cacheStats: {
    totalProfiles: number;
    newProfilesDiscovered: number;
    profilesUsed: number;
  };
}> {
  const {
    limit = 50,
    maxCrawlDepth = 2,
    explorationRate = 0.4, // 40% exploration, 60% exploitation
    tags = [],
    freshness = "any",
  } = options;

  const cache = loadCache();
  const posts: DiscoveredPost[] = [];
  const seenUris = new Set<string>();
  const seenTexts = new Set<string>();
  let newProfilesDiscovered = 0;

  console.log(`📊 Cache has ${Object.keys(cache.profiles).length} known Swahili profiles`);

  // Always explore if cache is small, otherwise use exploration rate
  // Also do a mini-exploration even when not fully exploring
  const cacheSize = Object.keys(cache.profiles).length;
  const shouldFullExplore = Math.random() < explorationRate || cacheSize < 15;
  const shouldMiniExplore = cacheSize < 50; // Always do mini exploration until we have 50 profiles

  // Get starting profiles for crawling
  const allSeeds = [
    ...cache.seedProfiles,
    ...Object.values(cache.profiles)
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 30)
      .map((p) => p.handle),
  ];
  const seeds = shuffle(allSeeds);

  if (shouldFullExplore) {
    // Full exploration mode: crawl from multiple starting points
    console.log("🔍 Full exploration mode: discovering new profiles...");

    const crawlCount = Math.min(5, seeds.length); // Increased from 3
    for (let i = 0; i < crawlCount; i++) {
      const startHandle = seeds[i];
      console.log(`🕷️ Crawling from @${startHandle}...`);

      try {
        const newProfiles = await crawlForNewProfiles(agent, cache, startHandle, 25); // Increased from 15

        for (const profile of newProfiles) {
          if (!cache.profiles[profile.did]) {
            cache.profiles[profile.did] = profile;
            newProfilesDiscovered++;
            cache.totalDiscoveries++;
          }
        }

        console.log(`  ✓ Found ${newProfiles.length} new Swahili profiles`);
      } catch (error) {
        console.error(`  ✗ Error crawling ${startHandle}:`, error);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  } else if (shouldMiniExplore) {
    // Mini exploration: just one quick crawl to keep growing
    console.log("🔍 Mini exploration mode...");
    const startHandle = seeds[0];

    try {
      const newProfiles = await crawlForNewProfiles(agent, cache, startHandle, 10);

      for (const profile of newProfiles) {
        if (!cache.profiles[profile.did]) {
          cache.profiles[profile.did] = profile;
          newProfilesDiscovered++;
          cache.totalDiscoveries++;
        }
      }

      console.log(`  ✓ Mini crawl found ${newProfiles.length} new profiles`);
    } catch (error) {
      console.error(`  ✗ Mini crawl error:`, error);
    }
  }

  // Build weighted list of profiles to fetch from
  const profileList = Object.values(cache.profiles).map((p) => ({
    ...p,
    weight:
      p.swahiliPostCount * 2 +
      p.engagementScore * 0.1 +
      (tags.length > 0 && p.tags.some((t) => tags.includes(t)) ? 5 : 0) +
      Math.random() * 3, // Add randomness
  }));

  // Select profiles with weighted randomness
  const selectedProfiles = weightedRandomSelect(
    shuffle(profileList),
    Math.min(20, profileList.length)
  );

  console.log(`📡 Fetching posts from ${selectedProfiles.length} profiles...`);

  // Fetch posts from selected profiles
  for (const profile of selectedProfiles) {
    if (posts.length >= limit) break;

    try {
      const feed = await agent.getAuthorFeed({
        actor: profile.did,
        limit: 15,
      });

      for (const item of feed.data.feed) {
        if (posts.length >= limit) break;

        const record = item.post.record as {
          text?: string;
          createdAt?: string;
        };
        if (!record?.text) continue;

        // Skip duplicates
        const textHash = record.text.slice(0, 100);
        if (seenUris.has(item.post.uri) || seenTexts.has(textHash)) continue;

        // Check freshness if required
        if (freshness === "recent" && record.createdAt) {
          const postDate = new Date(record.createdAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (postDate < weekAgo) continue;
        }

        // Check if Swahili
        const { isSwahili: isSw, confidence } = isSwahili(record.text);
        if (!isSw) continue;

        // Check tag filter
        if (tags.length > 0) {
          const postTags = extractHashtags(record.text);
          if (!postTags.some((t) => tags.includes(t))) continue;
        }

        seenUris.add(item.post.uri);
        seenTexts.add(textHash);

        posts.push({
          uri: item.post.uri,
          cid: item.post.cid,
          text: record.text,
          createdAt: record.createdAt || new Date().toISOString(),
          author: {
            did: item.post.author.did,
            handle: item.post.author.handle,
            displayName: item.post.author.displayName,
          },
          confidence,
          discoveryMethod: profile.discoveredFrom,
          engagementScore: calculateEngagement(item.post),
        });

        // Update profile stats
        if (cache.profiles[profile.did]) {
          cache.profiles[profile.did].lastSeen = new Date().toISOString();
          cache.profiles[profile.did].swahiliPostCount++;
        }
      }
    } catch (error) {
      console.error(`Error fetching from @${profile.handle}:`, error);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  // If we still need more posts, do additional hashtag search
  if (posts.length < limit) {
    console.log("🏷️ Searching hashtags for more posts...");

    const hashtagsToSearch =
      tags.length > 0 ? tags : ["kiswahili", "swahili", "habari", "tanzania", "kenya"];

    for (const tag of shuffle(hashtagsToSearch).slice(0, 3)) {
      if (posts.length >= limit) break;

      try {
        const searchResults = await agent.app.bsky.feed.searchPosts({
          q: `#${tag}`,
          limit: 30,
        });

        for (const post of searchResults.data.posts) {
          if (posts.length >= limit) break;

          const record = post.record as { text?: string; createdAt?: string };
          if (!record?.text) continue;

          const textHash = record.text.slice(0, 100);
          if (seenUris.has(post.uri) || seenTexts.has(textHash)) continue;

          const { isSwahili: isSw, confidence } = isSwahili(record.text);
          if (!isSw) continue;

          seenUris.add(post.uri);
          seenTexts.add(textHash);

          posts.push({
            uri: post.uri,
            cid: post.cid,
            text: record.text,
            createdAt: record.createdAt || new Date().toISOString(),
            author: {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
            },
            confidence,
            discoveryMethod: `hashtag:${tag}`,
            engagementScore: calculateEngagement(post),
          });

          // Add author to cache if new Swahili speaker
          if (!cache.profiles[post.author.did]) {
            cache.profiles[post.author.did] = {
              did: post.author.did,
              handle: post.author.handle,
              displayName: post.author.displayName,
              discoveredAt: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              swahiliPostCount: 1,
              engagementScore: calculateEngagement(post),
              discoveredFrom: `hashtag:${tag}`,
              tags: extractHashtags(record.text),
            };
            newProfilesDiscovered++;
            cache.totalDiscoveries++;
          }
        }
      } catch (error) {
        console.error(`Error searching #${tag}:`, error);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Sort by engagement and recency, with some randomness
  posts.sort((a, b) => {
    const scoreA =
      a.engagementScore * 0.3 + new Date(a.createdAt).getTime() / 1e12 + Math.random() * 0.2;
    const scoreB =
      b.engagementScore * 0.3 + new Date(b.createdAt).getTime() / 1e12 + Math.random() * 0.2;
    return scoreB - scoreA;
  });

  // Save updated cache
  saveCache(cache);

  console.log(`✅ Found ${posts.length} posts, discovered ${newProfilesDiscovered} new profiles`);
  console.log(`📊 Cache now has ${Object.keys(cache.profiles).length} Swahili profiles`);

  return {
    posts: posts.slice(0, limit),
    cacheStats: {
      totalProfiles: Object.keys(cache.profiles).length,
      newProfilesDiscovered,
      profilesUsed: selectedProfiles.length,
    },
  };
}

// Get cache statistics
export function getCacheStats(): {
  totalProfiles: number;
  totalDiscoveries: number;
  lastUpdated: string;
  topTags: { tag: string; count: number }[];
  recentProfiles: CachedProfile[];
} {
  const cache = loadCache();

  // Count tags
  const tagCounts: Record<string, number> = {};
  for (const profile of Object.values(cache.profiles)) {
    for (const tag of profile.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  const recentProfiles = Object.values(cache.profiles)
    .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime())
    .slice(0, 10);

  return {
    totalProfiles: Object.keys(cache.profiles).length,
    totalDiscoveries: cache.totalDiscoveries,
    lastUpdated: cache.lastUpdated,
    topTags,
    recentProfiles,
  };
}

// Clear cache (for testing or reset)
export function clearCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

// Export for CLI compatibility
export { loadCache, saveCache };
