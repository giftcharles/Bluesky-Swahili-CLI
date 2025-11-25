# Random Discovery Feature Plan

## Overview
Add a discovery feature that randomly traverses Bluesky handles to find and filter Swahili content without manual curation.

## Feature Description
Enable the app to randomly discover new Swahili content by:
- Fetching random/trending handles from Bluesky
- Traversing through different accounts
- Aggregating Swahili posts from multiple sources
- Implementing intelligent sampling strategies

## Architecture

### 1. New Discovery Module (`src/discovery.ts`)
Core functions for random handle traversal and content discovery:

- `getRandomHandles()` - Fetch random or trending handles
- `discoverSwahiliPosts()` - Aggregate Swahili posts from multiple handles
- `traverseNetwork()` - Follow repliers/likers to discover new accounts
- `samplePosts()` - Smart sampling of posts to avoid duplicates

### 2. Updated CLI (`src/cli.ts`)
New command-line options:

```bash
swahili --discover              # Enable discovery mode
swahili --discover --limit 50   # Find 50 random posts
swahili --discover --sources 10 # Check 10 random handles
swahili --discover --strategy random|network|trending|mixed
swahili handle --discover       # Combine normal + discovery modes
```

### 3. Discovery Strategies

#### Strategy A: Random Popular Handles
- Query trending/popular handles from Bluesky
- Randomly select N handles
- Fetch posts from each
- Filter for Swahili content

#### Strategy B: Network Traversal
- Start from a seed handle (or random)
- Get repliers/likers from recent posts
- Follow connections to discover new accounts
- Traverse up to N levels deep

#### Strategy C: Hashtag-Based Discovery
- Find posts with common Swahili hashtags
- Extract author handles from results
- Fetch more posts from discovered handles
- Filter for Swahili content

#### Strategy D: Mixed/Adaptive
- Combine all three strategies
- Weight results by confidence
- Remove duplicates
- Sort by timestamp

## Implementation Details

### Discovery Module Functions

```typescript
interface DiscoveryOptions {
  limit?: number;           // Number of posts to find (default: 50)
  sources?: number;         // Number of handles to check (default: 10)
  strategy?: 'random' | 'network' | 'trending' | 'mixed';
  maxDepth?: number;        // For network traversal (default: 2)
  deduplicateLike?: boolean; // Remove duplicate posts (default: true)
}

interface DiscoveredPost extends Post {
  discoveredFrom: string;   // Handle where it was found
  discoveryMethod: string;  // How it was discovered
  confidence: number;       // Language detection confidence
}

function getRandomHandles(limit: number): Promise<string[]>
function getPopularHandles(limit: number): Promise<string[]>
function traverseNetwork(seedHandle: string, maxDepth: number): Promise<string[]>
function discoverSwahiliPosts(options: DiscoveryOptions): Promise<DiscoveredPost[]>
```

### CLI Changes

New flags:
- `-d, --discover` - Enable discovery mode
- `--limit <number>` - Number of posts to find (default: 50)
- `--sources <number>` - Number of handles to check (default: 10)
- `--strategy <type>` - Discovery strategy: random|network|trending|mixed (default: mixed)
- `--max-depth <number>` - Network traversal depth (default: 2)
- `--json` - Output as JSON instead of formatted text

## Usage Examples

```bash
# Random discovery - find 50 Swahili posts from random handles
swahili --discover

# Control number of posts and sources
swahili --discover --limit 100 --sources 20

# Network traversal from a specific handle
swahili bsky.app --discover --strategy network --max-depth 3

# Trending hashtag discovery
swahili --discover --strategy trending --limit 75

# Mixed strategy with JSON output
swahili --discover --strategy mixed --json > swahili-posts.json

# Combine specific handle + discovery
swahili changetanzania.bsky.social --discover
```

## Output Format

### Formatted Output
```
════════════════════════════════════════════════════════════
Found 50 Swahili posts from discovery (8 sources, mixed strategy)
════════════════════════════════════════════════════════════

[2025-11-24T10:30:00.000Z] [From: @user1.bsky.social]
Habari yako leo? Najifunza programu za kuandika kwa Python.
🔗 https://bsky.app/profile/user1.bsky.social/post/abc123def456

[2025-11-24T10:25:00.000Z] [From: @user2.bsky.social]
Asante sana kwa msaada wako!
🔗 https://bsky.app/profile/user2.bsky.social/post/xyz789uvw123

════════════════════════════════════════════════════════════
Done. Printed 50 Swahili posts from 8 sources.
```

### JSON Output
```json
{
  "mode": "discover",
  "strategy": "mixed",
  "limit": 50,
  "sources": 8,
  "posts": [
    {
      "uri": "at://did:plc:test/app.bsky.feed.post/abc123",
      "text": "Habari yako leo?",
      "createdAt": "2025-11-24T10:30:00.000Z",
      "discoveredFrom": "user1.bsky.social",
      "discoveryMethod": "random_handle",
      "confidence": 0.99
    }
  ],
  "totalFound": 50,
  "timestamp": "2025-11-24T10:35:00.000Z"
}
```

## Testing Strategy

### Unit Tests (`src/__tests__/discovery.test.ts`)
- Test `getRandomHandles()` returns valid handles
- Test `discoverSwahiliPosts()` with mock data
- Test Swahili filtering works on discovered posts
- Test deduplication logic
- Test different discovery strategies
- Test error handling (API failures, rate limits)

### Integration Tests
- Test discovery mode end-to-end
- Test with real Bluesky API (optional, with rate limiting)
- Test JSON output format

## Implementation Order

1. **Phase 1** (Core Discovery)
   - Create `src/discovery.ts` with basic functions
   - Implement random handle selection
   - Add Swahili filtering to discovered posts
   - Add tests

2. **Phase 2** (CLI Integration)
   - Update `src/cli.ts` to support `--discover` flag
   - Add discovery output formatting
   - Update README with examples

3. **Phase 3** (Advanced Features)
   - Implement network traversal strategy
   - Add JSON output support
   - Implement trending hashtag discovery
   - Optimize for rate limits

## Considerations

### Rate Limiting
- Bluesky API has rate limits
- Implement exponential backoff for retries
- Cache popular/trending handles
- Add delay between requests

### Performance
- Parallel requests where possible
- Cache handle metadata
- Implement post deduplication efficiently
- Consider streaming output for large result sets

### User Experience
- Show progress during discovery
- Display which strategy is being used
- Show number of sources being checked
- Provide time estimates

## Configuration

Add to `.env.example`:
```env
# Discovery settings
DISCOVERY_STRATEGY=mixed
DISCOVERY_LIMIT=50
DISCOVERY_SOURCES=10
DISCOVERY_MAX_DEPTH=2
DISCOVERY_CACHE_TTL=3600
```

## Documentation Updates

Update README with:
- New Discovery section
- Usage examples
- Explanation of each strategy
- Performance tips
- Rate limit information
- JSON output examples

## Questions for Refinement

1. **Discovery scope**: How many handles should it check per discovery run? (suggest: 10-50)
2. **Result size**: How many Swahili posts do you want to collect? (suggest: 20-100)
3. **Strategy preference**: 
   - A) Random popular handles only
   - B) Network traversal (follow repliers)
   - C) Hashtag-based discovery
   - D) All of the above with a mix?
4. **Output format**: Just print like current mode, or also support JSON export?
5. **Priority**: Should we focus on speed or comprehensiveness?
6. **Caching**: Should discovered handles be cached between runs?
7. **Deduplication**: Should we remove duplicate posts across multiple runs?
