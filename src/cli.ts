#!/usr/bin/env node

import { BskyAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import langdetect from "langdetect";
import {
  discoverSwahiliPosts,
  DiscoveryOptions,
  DiscoveredPost,
} from "./discovery.js";

dotenv.config();

interface Post {
  uri: string;
  record: {
    text: string;
    createdAt: string;
  };
}

interface CLIOptions {
  handle?: string;
  discover: boolean;
  limit: number;
  sources: number;
  strategy: "random" | "trending" | "mixed";
  tags: string[];
  json: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    discover: false,
    limit: 50,
    sources: 10,
    strategy: "mixed",
    tags: [],
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-d" || arg === "--discover") {
      options.discover = true;
    } else if (arg === "--limit" && args[i + 1]) {
      options.limit = parseInt(args[++i], 10);
    } else if (arg === "--sources" && args[i + 1]) {
      options.sources = parseInt(args[++i], 10);
    } else if (arg === "--strategy" && args[i + 1]) {
      const strategy = args[++i];
      if (["random", "trending", "mixed"].includes(strategy)) {
        options.strategy = strategy as "random" | "trending" | "mixed";
      }
    } else if (arg === "--tag" && args[i + 1]) {
      options.tags.push(args[++i]);
    } else if (arg === "--json") {
      options.json = true;
    } else if (!arg.startsWith("-")) {
      options.handle = arg;
    }
  }

  return options;
}

function printUsage() {
  console.error(`
Usage: swahili [COMMAND] [OPTIONS]

COMMANDS:
  <handle>              Fetch posts from a specific Bluesky handle
  --discover, -d        Random discovery mode (find Swahili posts from random sources)

OPTIONS:
  --limit <number>      Maximum posts to find (default: 50)
  --sources <number>    Number of sources to check (default: 10)
  --strategy <type>     Discovery strategy: random|trending|mixed (default: mixed)
  --tag <hashtag>       Specific hashtag to follow (can be used multiple times)
  --json                Output results as JSON

EXAMPLES:
  swahili bsky.app                           # Fetch posts from @bsky.app
  swahili --discover                         # Random discovery of 50 Swahili posts
  swahili --discover --limit 100             # Find 100 random Swahili posts
  swahili --discover --strategy trending     # Use trending hashtags only
  swahili --discover --tag tanzania          # Discover posts with #tanzania
  swahili --discover --tag sw --tag swahili  # Multiple hashtags
  swahili bsky.app --discover                # Specific handle + discovery mode
`);
}

async function printDiscoveryResults(
  posts: DiscoveredPost[],
  options: CLIOptions
) {
  if (options.json) {
    const output = {
      mode: "discover",
      strategy: options.strategy,
      limit: options.limit,
      sources: options.sources,
      tags: options.tags.length > 0 ? options.tags : undefined,
      posts: posts,
      totalFound: posts.length,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    const uniqueSources = new Set(posts.map((p) => p.discoveredFrom));
    console.log("");
    console.log("═".repeat(65));
    console.log(
      `Found ${posts.length} Swahili posts (${uniqueSources.size} sources, ${options.strategy} strategy)`
    );
    console.log("═".repeat(65));
    console.log("");

    for (const post of posts) {
      const timestamp = new Date(post.record.createdAt).toISOString();
      const url = `https://bsky.app/profile/${post.discoveredFrom}/post/${post.uri.split("/").pop()}`;

      console.log(`[${timestamp}] [From: @${post.discoveredFrom}]`);
      console.log(post.record.text);
      console.log(`🔗 ${url}`);
      console.log("");
    }

    console.log("═".repeat(65));
    console.log(
      `Done. Printed ${posts.length} Swahili posts from ${uniqueSources.size} sources.`
    );
  }
}

async function printNormalResults(posts: Post[], handle: string, json: boolean) {
  if (json) {
    const output = {
      mode: "normal",
      handle: handle,
      posts: posts,
      totalFound: posts.length,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log("");
    console.log("═".repeat(65));
    console.log(`Found ${posts.length} Swahili posts from @${handle}`);
    console.log("═".repeat(65));
    console.log("");

    for (const post of posts) {
      const timestamp = new Date(post.record.createdAt).toISOString();
      const url = `https://bsky.app/profile/${handle}/post/${post.uri.split("/").pop()}`;

      console.log(`[${timestamp}]`);
      console.log(post.record.text);
      console.log(`🔗 ${url}`);
      console.log("");
    }

    console.log("═".repeat(65));
    console.log(`Done. Printed ${posts.length} Swahili posts.`);
  }
}

async function main() {
  const options = parseArgs();

  if (options.discover && !options.handle && options.tags.length === 0) {
    // Discovery mode without specific handle or tags
  } else if (!options.discover && !options.handle) {
    printUsage();
    process.exit(1);
  }

  const username = process.env.BSKY_USERNAME;
  const password = process.env.BSKY_PASSWORD;

  if (!username || !password) {
    console.error(
      "Error: BSKY_USERNAME and BSKY_PASSWORD environment variables are required"
    );
    console.error("See .env.example for setup instructions");
    process.exit(1);
  }

  try {
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    console.error("Logging into Bluesky...");
    await agent.login({
      identifier: username,
      password: password,
    });
    console.error("✓ Login successful");

    if (options.discover) {
      // Discovery mode
      const discoveryOptions: DiscoveryOptions = {
        limit: options.limit,
        sources: options.sources,
        strategy: options.strategy,
        tags: options.tags.length > 0 ? options.tags : undefined,
      };

      const discoveredPosts = await discoverSwahiliPosts(agent, discoveryOptions);
      await printDiscoveryResults(discoveredPosts, options);
    } else if (options.handle) {
      // Normal mode - fetch from specific handle
      console.error(`\nFetching posts from @${options.handle}...`);
      const posts: Post[] = [];
      let cursor: string | undefined;
      let fetchedCount = 0;

      // Fetch up to ~200 posts
      while (fetchedCount < 200) {
        const response = await agent.getAuthorFeed({
          actor: options.handle,
          limit: 100,
          cursor: cursor,
        });

        if (!response.data.feed || response.data.feed.length === 0) {
          break;
        }

        for (const item of response.data.feed) {
          if (
            item.post &&
            item.post.record &&
            "text" in item.post.record &&
            "createdAt" in item.post.record
          ) {
            posts.push({
              uri: item.post.uri,
              record: {
                text: (item.post.record as Record<string, unknown>)
                  .text as string,
                createdAt: (
                  item.post.record as Record<string, unknown>
                ).createdAt as string,
              },
            });
            fetchedCount++;
            if (fetchedCount >= 200) {
              break;
            }
          }
        }

        cursor = response.data.cursor;
        if (!cursor) {
          break;
        }
      }

      console.error(`✓ Fetched ${posts.length} posts\n`);

      // Filter for Swahili posts
      console.error("Filtering for Swahili posts...");
      const swahiliPosts = posts.filter((post) => {
        const text = post.record.text;
        if (!text || text.trim().length === 0) {
          return false;
        }

        try {
          const results = langdetect.detect(text);
          // results is an array of {lang, prob} objects
          const swahiliResult = results.find(
            (r: { lang: string; prob: number }) => r.lang === "sw"
          );
          return (
            swahiliResult !== undefined && swahiliResult.prob >= 0.98
          );
        } catch {
          return false;
        }
      });

      console.error(`✓ Found ${swahiliPosts.length} Swahili posts\n`);
      await printNormalResults(swahiliPosts, options.handle, options.json);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("An unknown error occurred");
    }
    process.exit(1);
  }
}

main();
