import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { BskyAgent } from "@atproto/api";
import langdetect from "langdetect";
import { smartDiscoverSwahiliPosts, getCacheStats, clearCache } from "./crawler.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8888;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from web build
const distPath = path.join(__dirname, "..", "dist-web");
app.use(express.static(distPath));

// Type definitions for request bodies
interface DiscoverBody {
  limit?: number;
  explorationRate?: number;
  tags?: string[];
  freshness?: "recent" | "any";
}

interface PostsBody {
  handle: string;
  limit?: number;
}

// Health check endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    version: "1.2.0",
    timestamp: new Date().toISOString(),
  });
});

// Cache stats endpoint
app.get("/api/cache", (_req: Request, res: Response) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get cache stats" });
  }
});

// Clear cache endpoint
app.post("/api/cache/clear", (_req: Request, res: Response) => {
  try {
    clearCache();
    res.json({ message: "Cache cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// Discovery endpoint - now uses smart crawler
app.post("/api/discover", async (req: Request, res: Response) => {
  try {
    const body = req.body as DiscoverBody;
    const { limit = 30, explorationRate = 0.4, tags = [], freshness = "any" } = body;

    if (!process.env.BSKY_USERNAME || !process.env.BSKY_PASSWORD) {
      res.status(401).json({ error: "Missing BSKY_USERNAME or BSKY_PASSWORD" });
      return;
    }

    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    await agent.login({
      identifier: process.env.BSKY_USERNAME,
      password: process.env.BSKY_PASSWORD,
    });

    const result = await smartDiscoverSwahiliPosts(agent, {
      limit,
      explorationRate,
      tags: tags.length > 0 ? tags : undefined,
      freshness,
    });

    res.json({
      mode: "discover",
      posts: result.posts,
      totalFound: result.posts.length,
      cacheStats: result.cacheStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Discovery error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Discovery failed",
    });
  }
});

// Normal posts endpoint
app.post("/api/posts", async (req: Request, res: Response) => {
  try {
    const body = req.body as PostsBody;
    const { handle, limit = 50 } = body;

    if (!handle) {
      res.status(400).json({ error: "Handle is required" });
      return;
    }

    if (!process.env.BSKY_USERNAME || !process.env.BSKY_PASSWORD) {
      res.status(401).json({ error: "Missing BSKY_USERNAME or BSKY_PASSWORD" });
      return;
    }

    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    await agent.login({
      identifier: process.env.BSKY_USERNAME,
      password: process.env.BSKY_PASSWORD,
    });

    // Fetch posts from the handle
    const posts: { uri: string; text: string; createdAt: string; confidence: number }[] = [];
    let cursor: string | undefined;
    let fetchedCount = 0;

    while (fetchedCount < limit * 2) {
      const response = await agent.getAuthorFeed({
        actor: handle,
        cursor,
        limit: Math.min(50, limit * 2 - fetchedCount),
      });

      for (const post of response.data.feed) {
        if (
          post.post.record &&
          typeof post.post.record === "object" &&
          "text" in post.post.record
        ) {
          const text = (post.post.record as { text: string }).text;
          const langResults = langdetect.detect(text);
          const swahiliResult = langResults.find(
            (r: { lang: string; prob: number }) => r.lang === "sw"
          );

          if (swahiliResult && swahiliResult.prob >= 0.98) {
            posts.push({
              uri: post.post.uri,
              text,
              createdAt: (post.post.record as { createdAt: string }).createdAt,
              confidence: swahiliResult.prob,
            });

            if (posts.length >= limit) break;
          }
        }
      }

      if (posts.length >= limit) break;
      if (!response.data.cursor) break;

      cursor = response.data.cursor;
      fetchedCount += response.data.feed.length;
    }

    res.json({
      mode: "posts",
      handle,
      posts: posts.slice(0, limit),
      totalFound: posts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Posts fetch error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch posts",
    });
  }
});

// Serve React app for all other routes
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
    status: 500,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Web app available at http://localhost:${PORT}`);
});
