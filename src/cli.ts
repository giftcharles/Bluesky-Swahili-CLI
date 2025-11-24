#!/usr/bin/env node

import { BskyAgent } from "@atproto/api";
import * as dotenv from "dotenv";
import langdetect from "langdetect";

dotenv.config();

interface Post {
  uri: string;
  record: {
    text: string;
    createdAt: string;
  };
}

async function main() {
  const handle = process.argv[2];

  if (!handle) {
    console.error("Usage: swahili <handle>");
    console.error("Example: swahili bsky.app");
    process.exit(1);
  }

  const username = process.env.BSKY_USERNAME;
  const password = process.env.BSKY_PASSWORD;

  if (!username || !password) {
    console.error("Error: BSKY_USERNAME and BSKY_PASSWORD environment variables are required");
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

    console.error(`\nFetching posts from @${handle}...`);
    const posts: Post[] = [];
    let cursor: string | undefined;
    let fetchedCount = 0;

    // Fetch up to ~200 posts
    while (fetchedCount < 200) {
      const response = await agent.getAuthorFeed({
        actor: handle,
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
              text: (item.post.record as Record<string, unknown>).text as string,
              createdAt: (item.post.record as Record<string, unknown>).createdAt as string,
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
        const swahiliResult = results.find((r) => r.lang === "sw");
        return swahiliResult !== undefined && swahiliResult.prob >= 0.98;
      } catch {
        return false;
      }
    });

    console.error(`✓ Found ${swahiliPosts.length} Swahili posts\n`);
    console.error("═".repeat(60));
    console.error("");

    // Print results
    for (const post of swahiliPosts) {
      const timestamp = new Date(post.record.createdAt).toISOString();
      const url = `https://bsky.app/profile/${handle}/post/${post.uri.split("/").pop()}`;

      console.log(`[${timestamp}]`);
      console.log(post.record.text);
      console.log(`🔗 ${url}`);
      console.log("");
    }

    console.error("═".repeat(60));
    console.error(`\nDone. Printed ${swahiliPosts.length} Swahili posts.`);
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
