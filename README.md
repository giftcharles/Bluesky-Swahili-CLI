# Bluesky Swahili CLI

[![CI](https://github.com/giftcharles/Bluesky-Swahili-CLI/actions/workflows/ci.yml/badge.svg)](https://github.com/giftcharles/Bluesky-Swahili-CLI/actions/workflows/ci.yml)

A command-line tool and REST API to fetch and filter Bluesky posts by Swahili language with ≥98% accuracy. Features intelligent profile caching and smart network traversal for discovering Swahili content creators.

## Features

- 🔐 Secure authentication with Bluesky app passwords
- 📝 Fetches up to ~200 posts from any public handle
- 🗣️ Filters posts for Swahili language with 98%+ confidence
- 🔗 Prints posts with timestamps and direct URLs
- ⚡ Fast language detection using langdetect
- ✅ Fully tested with 100% coverage on filter logic
- 🕷️ **NEW**: Smart crawler with profile caching and network traversal
- 🌐 **NEW**: REST API for programmatic access
- 💻 **NEW**: Web UI for discovery and exploration
- 📊 **NEW**: Profile cache that learns and grows over time

## Installation

### Global Installation

```bash
npm install -g bluesky-swahili-cli
swahili bsky.app
```

### Using npx (No installation required)

```bash
npx bluesky-swahili-cli bsky.app
```

### Local Development

```bash
git clone https://github.com/giftcharles/Bluesky-Swahili-CLI.git
cd Bluesky-Swahili-CLI
npm install
npm run build
npm start -- bsky.app
```

### Run Web App and REST API (Local)

```bash
# Install dependencies
npm install

# Build backend and frontend
npm run build:backend
npm run build:web

# Start REST API + Web App with pm2
pm2 start ecosystem.config.cjs

# Web app will be available at http://localhost:8888
# REST API at http://localhost:8888/api
```

## Setup

### 1. Create a Bluesky App Password

1. Go to [Bluesky Settings](https://bsky.app/settings)
2. Navigate to **App Passwords** section
3. Create a new app password for this CLI

### 2. Set Environment Variables

#### For Global Installation

When using `npm install -g bluesky-swahili-cli`, create a `.env` file in your working directory or home directory:

**Option A: Per-directory setup** (create `.env` where you run the command)

```bash
# Navigate to your working directory
cd ~/my-project

# Create .env file
cat > .env << 'EOF'
BSKY_USERNAME=your-handle.bsky.social
BSKY_PASSWORD=your-app-password
EOF

# Run the CLI
swahili bsky.app
```

**Option B: Home directory setup** (recommended - works from anywhere)

```bash
# Create .env in home directory
cat > ~/.env << 'EOF'
BSKY_USERNAME=your-handle.bsky.social
BSKY_PASSWORD=your-app-password
EOF

# Now run from any directory
swahili bsky.app
```

**Option C: Environment variables** (no file needed)

```bash
export BSKY_USERNAME="your-handle.bsky.social"
export BSKY_PASSWORD="your-app-password"
swahili bsky.app
```

#### For Local Development

Create a `.env` file in the project root:

```env
BSKY_USERNAME=your-handle.bsky.social
BSKY_PASSWORD=your-app-password
```

Or set environment variables directly:

```bash
export BSKY_USERNAME="your-handle.bsky.social"
export BSKY_PASSWORD="your-app-password"
```

## Usage

### Normal Mode: Fetch from a Specific Handle

```bash
swahili <handle>
```

#### Example

```bash
$ swahili bsky.app

Logging into Bluesky...
✓ Login successful

Fetching posts from @bsky.app...
✓ Fetched 150 posts

Filtering for Swahili posts...
✓ Found 3 Swahili posts

═══════════════════════════════════════════════════════════════

[2025-11-24T10:30:00.000Z]
Habari yako leo? Najifunza programu za kuandika kwa Python.
🔗 https://bsky.app/profile/bsky.app/post/abc123def456

[2025-11-24T10:25:00.000Z]
Asante sana kwa msaada wako!
🔗 https://bsky.app/profile/bsky.app/post/xyz789uvw123

[2025-11-24T10:20:00.000Z]
Karibu! Tutaonana upande ujao.
🔗 https://bsky.app/profile/bsky.app/post/jkl456mno789

═══════════════════════════════════════════════════════════════

Done. Printed 3 Swahili posts.
```

### Discovery Mode: Find Swahili Content Automatically

Discover Swahili posts without manually specifying accounts using intelligent traversal strategies:

```bash
swahili --discover [OPTIONS]
```

#### Discovery Options

| Option | Description | Default |
|--------|-------------|---------|
| `--limit <number>` | Maximum posts to find | 50 |
| `--sources <number>` | Number of handles to check | 10 |
| `--strategy <type>` | Discovery strategy: `random`, `trending`, or `mixed` | `mixed` |
| `--tag <hashtag>` | Specific hashtag to follow (use multiple times for OR) | - |
| `--json` | Output results as JSON | text |

#### Discovery Strategies

- **random**: Randomly select handles and fetch their posts
- **trending**: Search popular Swahili hashtags (#sw, #tanzania, #kenya, etc.)
- **mixed**: Combine trending hashtags and random handles for comprehensive coverage (recommended)

#### Discovery Examples

```bash
# Find 50 Swahili posts from random sources (mixed strategy)
swahili --discover

# Find 100 posts using only trending hashtags
swahili --discover --limit 100 --strategy trending

# Find 50 posts specific to Tanzania
swahili --discover --tag tanzania

# Find posts with multiple hashtags
swahili --discover --tag tanzania --tag kenya --tag uganda

# Find 75 posts and export as JSON
swahili --discover --limit 75 --json > swahili-posts.json

# Find 200 posts checking more sources
swahili --discover --limit 200 --sources 30

# Combine specific handle with discovery
swahili changetanzania.bsky.social --discover
```

#### Discovery Output Example

```bash
$ swahili --discover --limit 20

Logging into Bluesky...
✓ Login successful

Discovering Swahili posts...
✓ Searched hashtags: #sw, #swahili, #tanzania, #kenya
✓ Checked 12 handles
✓ Found 20 Swahili posts

═══════════════════════════════════════════════════════════════

[2025-11-24T10:45:00.000Z] [From: @user1.bsky.social | Method: tag_sw]
Habari yako leo? Najifunza programu za kuandika.
🔗 https://bsky.app/profile/user1.bsky.social/post/abc123

[2025-11-24T10:43:00.000Z] [From: @user2.bsky.social | Method: random_handle]
Asante sana kwa msaada!
🔗 https://bsky.app/profile/user2.bsky.social/post/def456

═══════════════════════════════════════════════════════════════

Done. Found 20 Swahili posts from 12 sources (mixed strategy).
```

#### Discovery JSON Output

```bash
$ swahili --discover --limit 5 --json

{
  "mode": "discover",
  "strategy": "mixed",
  "limit": 50,
  "sources": 12,
  "posts": [
    {
      "uri": "at://did:plc:user1/app.bsky.feed.post/abc123",
      "text": "Habari yako leo?",
      "createdAt": "2025-11-24T10:45:00.000Z",
      "discoveredFrom": "user1.bsky.social",
      "discoveryMethod": "tag_sw",
      "confidence": 0.99
    },
    {
      "uri": "at://did:plc:user2/app.bsky.feed.post/def456",
      "text": "Asante sana!",
      "createdAt": "2025-11-24T10:43:00.000Z",
      "discoveredFrom": "user2.bsky.social",
      "discoveryMethod": "random_handle",
      "confidence": 0.98
    }
  ],
  "totalFound": 5,
  "timestamp": "2025-11-24T10:50:00.000Z"
}
```

#### Discovery Tips

- Use `--strategy trending` for quality (hashtag-based) results
- Use `--strategy random` for quantity and diverse sources
- Use `--strategy mixed` for balanced results (recommended)
- Add multiple `--tag` options to narrow results: `--tag tanzania --tag kenya`
- Export to JSON for further processing: `--json > results.json`
- Discovery respects the ≥98% Swahili confidence threshold

## REST API

The project includes a REST API server for programmatic access to discovery and post fetching features.

### Starting the API Server

```bash
# With npm
npm run build:backend
node dist/server.js

# With pm2 (production)
pm2 start ecosystem.config.cjs

# With Docker (coming soon)
docker run -e BSKY_USERNAME=... -e BSKY_PASSWORD=... -p 8888:8888 bluesky-swahili-cli
```

### API Endpoints

#### Health Check

```bash
GET /api/health
```

Returns server status and version.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.2.0",
  "timestamp": "2025-11-25T11:14:41.000Z"
}
```

#### Smart Discovery

```bash
POST /api/discover
Content-Type: application/json
```

Discovers Swahili posts using intelligent crawler with profile caching.

**Request Body:**
```json
{
  "limit": 30,
  "explorationRate": 0.4,
  "tags": ["kiswahili", "tanzania"],
  "freshness": "any"
}
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 30 | Max posts to return |
| `explorationRate` | number (0-1) | 0.4 | Ratio of new profiles to explore vs cached (0=use cache, 1=full exploration) |
| `tags` | array | [] | Filter by hashtags |
| `freshness` | string | "any" | "any" or "recent" (last week) |

**Response:**
```json
{
  "mode": "discover",
  "posts": [
    {
      "uri": "at://did:plc:user1/app.bsky.feed.post/abc123",
      "cid": "bafy...",
      "text": "Habari yako leo?",
      "createdAt": "2025-11-24T10:45:00.000Z",
      "author": {
        "did": "did:plc:user1",
        "handle": "user1.bsky.social",
        "displayName": "User One"
      },
      "confidence": 0.99,
      "discoveryMethod": "follower_of:changetanzania.bsky.social",
      "engagementScore": 15
    }
  ],
  "totalFound": 30,
  "cacheStats": {
    "totalProfiles": 145,
    "newProfilesDiscovered": 8,
    "profilesUsed": 12
  },
  "timestamp": "2025-11-25T11:14:41.000Z"
}
```

#### Fetch Posts from Handle

```bash
POST /api/posts
Content-Type: application/json
```

Fetches Swahili posts from a specific handle.

**Request Body:**
```json
{
  "handle": "changetanzania.bsky.social",
  "limit": 50
}
```

**Response:**
```json
{
  "mode": "posts",
  "handle": "changetanzania.bsky.social",
  "posts": [
    {
      "uri": "at://did:plc:user1/app.bsky.feed.post/abc123",
      "text": "Habari yako leo?",
      "createdAt": "2025-11-24T10:45:00.000Z",
      "confidence": 0.99
    }
  ],
  "totalFound": 15,
  "timestamp": "2025-11-25T11:14:41.000Z"
}
```

#### Cache Statistics

```bash
GET /api/cache
```

Returns profile cache statistics.

**Response:**
```json
{
  "totalProfiles": 145,
  "totalDiscoveries": 523,
  "lastUpdated": "2025-11-25T11:14:41.000Z",
  "topTags": [
    { "tag": "kiswahili", "count": 45 },
    { "tag": "tanzania", "count": 38 },
    { "tag": "kenya", "count": 32 }
  ],
  "recentProfiles": [
    {
      "handle": "user1.bsky.social",
      "displayName": "User One",
      "discoveredAt": "2025-11-25T10:50:00.000Z"
    }
  ]
}
```

#### Clear Cache

```bash
POST /api/cache/clear
```

Clears the profile discovery cache (use with caution).

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

### Example API Usage

**Using cURL:**
```bash
# Discovery with exploration
curl -X POST http://localhost:8888/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "explorationRate": 0.6,
    "tags": ["kiswahili"],
    "freshness": "recent"
  }'

# Fetch from specific handle
curl -X POST http://localhost:8888/api/posts \
  -H "Content-Type: application/json" \
  -d '{"handle": "changetanzania.bsky.social", "limit": 30}'

# Get cache stats
curl http://localhost:8888/api/cache
```

**Using JavaScript/Node.js:**
```javascript
// Discovery
const response = await fetch('http://localhost:8888/api/discover', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    limit: 30,
    explorationRate: 0.4,
    tags: ['kiswahili']
  })
});

const data = await response.json();
console.log(`Found ${data.posts.length} posts`);
console.log(`Cache has ${data.cacheStats.totalProfiles} profiles`);
```

**Using Python:**
```python
import requests

# Discovery
response = requests.post('http://localhost:8888/api/discover', json={
    'limit': 30,
    'explorationRate': 0.4,
    'tags': ['kiswahili']
})

data = response.json()
print(f"Found {len(data['posts'])} posts")
print(f"Cache has {data['cacheStats']['totalProfiles']} profiles")
```

## Web App

Interactive web interface for exploring and discovering Swahili content.

### Features

- 🎯 **Smart Discovery**: Uses intelligent crawler to find Swahili content creators
- 🧠 **Learning System**: Profile cache grows and improves with each use
- 📊 **Exploration Rate Slider**: Balance between cached profiles and new discoveries
- 🏷️ **Hashtag Filtering**: Filter by popular Swahili hashtags
- ⏱️ **Freshness Options**: Find recent or any-time posts
- 🎨 **Beautiful UI**: React-based responsive design
- 📈 **Cache Statistics**: See profile counts, discovery trends, and popular tags

### Running the Web App

```bash
# Development
npm run dev  # Starts both backend and frontend

# Production
npm run build:backend
npm run build:web
pm2 start ecosystem.config.cjs
# Access at http://localhost:8888
```

## Smart Crawler System

The intelligent crawler discovers Swahili content creators through multiple strategies:

### Discovery Methods

1. **Network Traversal**: Crawls followers and following lists of known Swahili speakers
2. **Engagement Analysis**: Discovers profiles from likes and reposts on Swahili posts
3. **Hashtag Search**: Finds creators posting in Swahili hashtags (#kiswahili, #tanzania, etc.)
4. **Weighted Random Selection**: Balances engagement scores, recency, and exploration

### Profile Caching

Discovered profiles are cached in `~/.swahili-discovery-cache.json` with metadata:
- Handle and display name
- Swahili confidence score
- Discovery method (how we found them)
- Associated hashtags
- Last activity timestamp
- Discovery depth in network

### How It Works

1. **Initialization**: Starts from seed profiles or random cached profiles
2. **Exploration**: Crawls social graph at configurable depth
3. **Filtering**: Evaluates profiles for Swahili content
4. **Caching**: Stores new profiles for future sessions
5. **Selection**: Uses weighted randomness to pick diverse profiles
6. **Learning**: Subsequent runs use cached profiles + new exploration

### Configuration

Configure crawler behavior in code (crawler.ts):

```typescript
const config = {
  maxDepth: 3,              // How deep to traverse social graph
  explorationRate: 0.4,     // 0-1 ratio of new vs cached profiles
  minSwahiliScore: 0.7,     // Minimum confidence to cache a profile
  maxProfilesPerRun: 50,    // Max profiles to cache per crawl
  cacheExpiry: 7 * 24 * 60 * 60 * 1000  // 7 days
};
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BSKY_USERNAME` | ✅ Yes | Your Bluesky handle | `user.bsky.social` |
| `BSKY_PASSWORD` | ✅ Yes | Your Bluesky app password | `abcd-efgh-ijkl-mnop` |

## Development

### Available Scripts

```bash
# Install dependencies
npm install

# Development: compile and run on the fly
npm run dev -- bsky.app

# Build: compile TypeScript to JavaScript
npm run build
npm run build:backend
npm run build:web

# Test: run unit tests
npm test

# Lint & Format: check code style
npm run lint

# Format: auto-fix code style issues
npm run lint:fix

# Start: run compiled CLI
npm start -- bsky.app

# Start API + Web App with pm2
pm2 start ecosystem.config.cjs
pm2 logs bluesky-swahili-app
pm2 stop bluesky-swahili-app
pm2 delete bluesky-swahili-app
```

### Project Structure

```
bluesky-swahili-cli/
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   ├── server.ts              # Express REST API server
│   ├── crawler.ts             # Smart discovery crawler
│   ├── discovery.ts           # Discovery strategies (deprecated)
│   └── __tests__/
│       ├── cli.test.ts        # CLI unit tests
│       └── discovery.test.ts  # Discovery tests
├── web/
│   ├── index.html             # Web app HTML
│   └── src/
│       ├── App.tsx            # React main component
│       ├── main.tsx           # Entry point
│       └── index.css          # Styles
├── dist/                      # Compiled backend (generated)
├── dist-web/                  # Built web app (generated)
├── logs/                      # pm2 logs
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI configuration
├── package.json
├── tsconfig.json
├── vite.config.ts             # Vite config for web app
├── vitest.config.ts           # Test config
├── ecosystem.config.cjs        # pm2 configuration
├── .eslintrc.json
├── .prettierrc
├── .env.example
└── README.md
```

## How It Works

1. **Authentication**: Logs into Bluesky using provided credentials
2. **Fetching**: Retrieves up to 200 posts from the specified handle using cursor-based pagination
3. **Detection**: Uses `langdetect` library to identify language with confidence scores
4. **Filtering**: Keeps only posts detected as Swahili with ≥98% confidence
5. **Output**: Prints each filtered post with:
   - ISO timestamp
   - Post text
   - Direct URL to the post on Bluesky

## Testing

```bash
npm test
```

All tests use Vitest and include unit tests for:
- Swahili language detection
- English/French language filtering
- Post filtering logic
- Empty text handling

## License

MIT - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues or feature requests, please open an issue on [GitHub](https://github.com/giftcharles/Bluesky-Swahili-CLI/issues).

## Publishing

This package is published on npm and can be installed globally or used with npx.

To publish updates:

```bash
npm version patch|minor|major
npm publish
git push origin main --tags
```

---

**Note**: This CLI requires valid Bluesky credentials. Never share your app password or commit it to version control.
