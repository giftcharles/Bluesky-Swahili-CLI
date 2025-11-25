import { useState, useEffect } from "react";

interface Post {
  uri: string;
  cid?: string;
  text?: string;
  createdAt: string;
  confidence: number;
  discoveryMethod?: string;
  engagementScore?: number;
  author?: {
    did: string;
    handle: string;
    displayName?: string;
  };
  record?: {
    text: string;
    createdAt: string;
  };
}

interface CacheStats {
  totalProfiles: number;
  newProfilesDiscovered: number;
  profilesUsed: number;
}

interface DiscoverResponse {
  mode: string;
  posts: Post[];
  totalFound: number;
  cacheStats?: CacheStats;
  timestamp: string;
}

interface PostsResponse {
  mode: string;
  handle: string;
  posts: Post[];
  totalFound: number;
  timestamp: string;
}

interface CacheInfo {
  totalProfiles: number;
  totalDiscoveries: number;
  lastUpdated: string;
  topTags: { tag: string; count: number }[];
  recentProfiles: { handle: string; displayName?: string; discoveredAt: string }[];
}

const PRESET_TAGS = [
  "kiswahili",
  "swahili",
  "habari",
  "tanzania",
  "kenya",
  "uganda",
  "jambo",
  "afrika",
];

function App() {
  const [mode, setMode] = useState<"discover" | "posts" | "cache">("discover");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscoverResponse | PostsResponse | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  // Discovery form state
  const [limit, setLimit] = useState(20);
  const [explorationRate, setExplorationRate] = useState(0.4);
  const [freshness, setFreshness] = useState<"recent" | "any">("any");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  // Posts form state
  const [handle, setHandle] = useState("");

  // Fetch cache stats on load
  useEffect(() => {
    fetch("/api/cache")
      .then((r) => r.json())
      .then(setCacheInfo)
      .catch(() => {});
  }, [results]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag.toLowerCase())) {
      setSelectedTags((prev) => [...prev, customTag.toLowerCase()]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit,
          explorationRate,
          freshness,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to discover posts");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchPosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, limit }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch posts");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getPostText = (post: Post): string => {
    return post.text || post.record?.text || "";
  };

  const getPostTime = (post: Post): string => {
    const date = post.createdAt || post.record?.createdAt;
    if (!date) return "";
    return new Date(date).toLocaleString();
  };

  const getPostUrl = (post: Post): string => {
    const parts = post.uri.split("/");
    const postId = parts[4];
    const source = post.author?.handle || handle;
    return `https://bsky.app/profile/${source}/post/${postId}`;
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌍 Bluesky Swahili Explorer</h1>
        <p>Smart discovery of Swahili content across Bluesky</p>
        {cacheInfo && (
          <div className="cache-info">
            <span>🧠 {cacheInfo.totalProfiles} Swahili profiles discovered</span>
            <span>📊 {cacheInfo.totalDiscoveries} total discoveries</span>
          </div>
        )}
      </header>

      <div className="tabs">
        <button
          className={`tab ${mode === "discover" ? "active" : ""}`}
          onClick={() => setMode("discover")}
        >
          🕷️ Smart Discovery
        </button>
        <button
          className={`tab ${mode === "posts" ? "active" : ""}`}
          onClick={() => setMode("posts")}
        >
          👤 Specific Handle
        </button>
        <button
          className={`tab ${mode === "cache" ? "active" : ""}`}
          onClick={() => setMode("cache")}
        >
          📊 Cache Viewer
        </button>
      </div>

      {mode === "discover" ? (
        <form className="search-form" onSubmit={handleDiscover}>
          <p className="form-description">
            🧠 The crawler learns and discovers new Swahili content creators as you use it. Each
            search grows the knowledge base for better future discoveries.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Max Posts</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 20)}
                min={1}
                max={100}
              />
            </div>
            <div className="form-group">
              <label>Exploration Rate</label>
              <select
                value={explorationRate}
                onChange={(e) => setExplorationRate(parseFloat(e.target.value))}
              >
                <option value={0.2}>Low (use cache mostly)</option>
                <option value={0.4}>Balanced</option>
                <option value={0.6}>High (discover new profiles)</option>
                <option value={0.8}>Very High (maximum exploration)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Freshness</label>
              <select
                value={freshness}
                onChange={(e) => setFreshness(e.target.value as "recent" | "any")}
              >
                <option value="any">Any time</option>
                <option value="recent">Recent only (last week)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Filter by Hashtags (optional)</label>
            <div className="preset-tags">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`preset-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
              />
              <button
                type="button"
                className="preset-tag"
                onClick={addCustomTag}
                style={{ whiteSpace: "nowrap" }}
              >
                + Add
              </button>
            </div>
            {selectedTags.length > 0 && (
              <div className="tags-container">
                {selectedTags.map((tag) => (
                  <span key={tag} className="tag">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "🕷️ Crawling..." : "🔍 Discover Swahili Posts"}
          </button>
        </form>
      ) : mode === "posts" ? (
        <form className="search-form" onSubmit={handleFetchPosts}>
          <div className="form-row">
            <div className="form-group">
              <label>Bluesky Handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g., changetanzania.bsky.social"
                required
              />
            </div>
            <div className="form-group">
              <label>Max Posts</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 20)}
                min={1}
                max={100}
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !handle}>
            {loading ? "Fetching..." : "📥 Fetch Swahili Posts"}
          </button>
        </form>
      ) : (
        <div className="cache-viewer">
          {cacheInfo ? (
            <>
              <div className="cache-header">
                <div className="cache-stats-grid">
                  <div className="cache-stat-card">
                    <span className="cache-stat-label">Total Profiles</span>
                    <span className="cache-stat-value">{cacheInfo.totalProfiles}</span>
                  </div>
                  <div className="cache-stat-card">
                    <span className="cache-stat-label">Total Discoveries</span>
                    <span className="cache-stat-value">{cacheInfo.totalDiscoveries}</span>
                  </div>
                  <div className="cache-stat-card">
                    <span className="cache-stat-label">Last Updated</span>
                    <span className="cache-stat-value">
                      {new Date(cacheInfo.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                </div>

                {cacheInfo.topTags.length > 0 && (
                  <div className="top-tags-section">
                    <h3>Top Hashtags</h3>
                    <div className="top-tags">
                      {cacheInfo.topTags.map((tagInfo) => (
                        <span key={tagInfo.tag} className="tag">
                          #{tagInfo.tag} <span className="tag-count">({tagInfo.count})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="profiles-section">
                <h3>Recently Discovered Profiles</h3>
                {cacheInfo.recentProfiles.length > 0 ? (
                  <div className="profiles-list">
                    {cacheInfo.recentProfiles.map((profile) => (
                      <div key={profile.handle} className="profile-card">
                        <div className="profile-info">
                          <a
                            href={`https://bsky.app/profile/${profile.handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="profile-handle"
                          >
                            @{profile.handle}
                          </a>
                          {profile.displayName && (
                            <span className="profile-display-name">{profile.displayName}</span>
                          )}
                        </div>
                        <span className="profile-discovered">
                          {new Date(profile.discoveredAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-message">No profiles in cache yet. Start discovering!</p>
                )}
              </div>
            </>
          ) : (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading cache information...</p>
            </div>
          )}
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>
            {mode === "discover"
              ? "🕷️ Crawling Bluesky for Swahili content..."
              : `Fetching posts from @${handle}...`}
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {mode === "discover"
              ? "Discovering new profiles and fetching posts. The more you use it, the smarter it gets!"
              : "This may take a moment due to rate limiting"}
          </p>
        </div>
      )}

      {results && !loading && (
        <div className="results">
          <div className="results-header">
            <h2>
              {results.mode === "discover"
                ? "🎯 Discovery Results"
                : `📝 Posts from @${(results as PostsResponse).handle}`}
            </h2>
            <div className="results-stats">
              <span className="stat">
                <span className="stat-value">{results.posts.length}</span> posts
              </span>
              {results.mode === "discover" && (results as DiscoverResponse).cacheStats && (
                <>
                  <span className="stat">
                    <span className="stat-value">
                      {(results as DiscoverResponse).cacheStats?.profilesUsed}
                    </span>{" "}
                    profiles used
                  </span>
                  <span className="stat">
                    <span className="stat-value">
                      +{(results as DiscoverResponse).cacheStats?.newProfilesDiscovered}
                    </span>{" "}
                    new profiles
                  </span>
                </>
              )}
            </div>
          </div>

          {results.posts.length === 0 ? (
            <div className="empty-state">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3>No Swahili posts found</h3>
              <p>Try adjusting your search parameters or try again later</p>
            </div>
          ) : (
            <div className="posts-list">
              {results.posts.map((post, index) => (
                <article key={post.uri || index} className="post-card">
                  <div className="post-header">
                    <div className="post-meta">
                      {post.author && (
                        <span className="post-source">
                          @{post.author.handle}
                          {post.author.displayName && (
                            <span className="display-name"> ({post.author.displayName})</span>
                          )}
                        </span>
                      )}
                      <span className="post-time">{getPostTime(post)}</span>
                    </div>
                    {post.discoveryMethod && (
                      <span className="post-badge">{post.discoveryMethod}</span>
                    )}
                  </div>
                  <p className="post-text">{getPostText(post)}</p>
                  <div className="post-footer">
                    <a
                      href={getPostUrl(post)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="post-link"
                    >
                      🔗 View on Bluesky
                    </a>
                    <div className="post-stats">
                      {post.engagementScore !== undefined && post.engagementScore > 0 && (
                        <span className="engagement">⚡ {post.engagementScore}</span>
                      )}
                      <span
                        className={`confidence ${post.confidence >= 0.99 ? "confidence-high" : ""}`}
                      >
                        {(post.confidence * 100).toFixed(1)}% Swahili
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
