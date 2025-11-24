# Bluesky Swahili CLI

[![CI](https://github.com/your-username/bluesky-swahili-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/bluesky-swahili-cli/actions/workflows/ci.yml)

A command-line tool to fetch and filter Bluesky posts by Swahili language with ≥98% accuracy.

## Features

- 🔐 Secure authentication with Bluesky app passwords
- 📝 Fetches up to ~200 posts from any public handle
- 🗣️ Filters posts for Swahili language with 98%+ confidence
- 🔗 Prints posts with timestamps and direct URLs
- ⚡ Fast language detection using langdetect
- ✅ Fully tested with 100% coverage on filter logic

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
git clone https://github.com/your-username/bluesky-swahili-cli.git
cd bluesky-swahili-cli
npm install
npm run build
npm start -- bsky.app
```

## Setup

### 1. Create a Bluesky App Password

1. Go to [Bluesky Settings](https://bsky.app/settings)
2. Navigate to **App Passwords** section
3. Create a new app password for this CLI

### 2. Set Environment Variables

Create a `.env` file in your working directory:

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

```bash
swahili <handle>
```

### Example

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

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `BSKY_USERNAME` | ✅ Yes | Your Bluesky handle | `user.bsky.social` |
| `BSKY_PASSWORD` | ✅ Yes | Your Bluesky app password | `abcd-efgh-ijkl-mnop` |

For more info on Bluesky app passwords, see the [Bluesky docs](https://atproto.com/guides/working-with-app-passwords).

## Development

### Available Scripts

```bash
# Install dependencies
npm install

# Development: compile and run on the fly
npm run dev -- bsky.app

# Build: compile TypeScript to JavaScript
npm run build

# Test: run unit tests
npm test

# Lint & Format: check code style
npm run lint

# Format: auto-fix code style issues
npm run lint:fix

# Start: run compiled CLI
npm start -- bsky.app
```

### Project Structure

```
bluesky-swahili-cli/
├── src/
│   ├── cli.ts                 # Main CLI entry point
│   └── __tests__/
│       └── cli.test.ts        # Unit tests
├── dist/                      # Compiled JavaScript (generated)
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI configuration
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── vitest.config.ts
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

For issues or feature requests, please open an issue on GitHub.

---

**Note**: This CLI requires valid Bluesky credentials. Never share your app password or commit it to version control.
