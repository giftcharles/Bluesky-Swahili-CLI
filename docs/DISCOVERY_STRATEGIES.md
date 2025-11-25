# Swahili Profile Discovery Strategies

This document details all strategies implemented in the smart crawler to discover new Swahili-speaking content creators on Bluesky.

## Overview

The crawler uses a multi-strategy approach to maximize the discovery of Swahili speakers while maintaining efficiency and respect for API rate limits. Each strategy focuses on different aspects of the social graph and content discovery.

---

## Strategy 1: Follower Network Traversal

### Purpose
Discover Swahili speakers by analyzing who follows known Swahili creators.

### How It Works

1. **Profile Selection**: Start with a known Swahili speaker (seed profile or cached profile)
2. **Follower Retrieval**: Fetch up to 50 followers of the selected profile
3. **Validation Check**: For each follower:
   - Retrieve their recent 10 posts
   - Check each post for Swahili language (≥90% confidence)
   - Extract hashtags from Swahili posts
4. **Profile Caching**: If 1+ Swahili posts found, cache the follower with:
   - Profile metadata (did, handle, displayName)
   - Discovery source: `follower_of:{sourceHandle}`
   - Swahili post count
   - Associated hashtags
   - Engagement baseline score

### Why This Works

- **Network Effect**: People who follow Swahili speakers are more likely to speak Swahili themselves
- **Social Proof**: Followers often share similar interests with followed accounts
- **Discovery Depth**: Expands from known creators to their audience

### Rate Limiting
- 50ms delay between each profile check
- Batch processing: checks up to 50 followers per crawl

### Example
```
Known Profile: @changetanzania.bsky.social
  ↓
  Fetch 50 followers
  ↓
  Check each follower's recent posts
  ↓
  If 1+ Swahili posts → Cache as new profile
```

---

## Strategy 2: Following Network Traversal

### Purpose
Discover Swahili speakers by examining who known Swahili creators follow.

### How It Works

1. **Profile Selection**: Start with a known Swahili speaker
2. **Following Retrieval**: Fetch up to 50 accounts followed by the selected profile
3. **Validation Check**: For each followed account:
   - Retrieve their recent 10 posts
   - Check each post for Swahili language (≥90% confidence)
   - Extract and deduplicate hashtags
4. **Profile Caching**: If 1+ Swahili posts found, cache with:
   - Profile metadata
   - Discovery source: `following_of:{sourceHandle}`
   - Swahili post count
   - Associated hashtags
   - Engagement baseline score

### Why This Works

- **Content Preference**: People who follow Swahili speakers likely share their interests
- **Curator Effect**: Swahili speakers follow other quality Swahili content creators
- **Bidirectional Discovery**: Different from followers strategy, gives access to different networks

### Rate Limiting
- 80ms delay between each profile check
- Batch processing: checks up to 50 following profiles per crawl

### Example
```
Known Profile: @kenya.bsky.social
  ↓
  Fetch 50 accounts they follow
  ↓
  Check each one's recent posts
  ↓
  If 1+ Swahili posts → Cache as new profile
```

---

## Strategy 3: Hashtag-Based Discovery

### Purpose
Discover Swahili creators by searching for content with Swahili-related hashtags.

### How It Works

1. **Hashtag Selection**: Choose from a curated list of Swahili hashtags
2. **Post Search**: Search for up to 30 posts with each hashtag
3. **Author Validation**: For each post found:
   - Extract author information
   - Verify post is actually in Swahili (≥90% confidence)
   - Calculate engagement metrics (likes, reposts, replies)
4. **Profile Caching**: If Swahili post found, cache author with:
   - Profile metadata
   - Discovery source: `hashtag:{tagName}`
   - Initial Swahili post count (1)
   - Engagement score from the found post
   - Extracted hashtags from post

### Hashtags Searched

Core Swahili hashtags:
- `#kiswahili` - Swahili language
- `#swahili` - Generic Swahili content
- `#habari` - News/updates
- `#jambo` - Greeting/interaction
- `#karibu` - Welcome/hospitality

Geographic hashtags (East Africa):
- `#tanzania` - Tanzania
- `#kenya` - Kenya
- `#uganda` - Uganda
- `#nairobi` - Nairobi city
- `#daressalaam` - Dar es Salaam city
- `#mombasa` - Mombasa city

Topic hashtags:
- `#afrika` - Africa
- `#mashariki` - East Africa region
- `#swahilipost` - Swahili posts
- `#lugha` - Language

### Why This Works

- **Direct Content Match**: Users posting with Swahili hashtags are explicitly signaling Swahili content
- **Intent Indicator**: Hashtag usage shows content intent and category
- **Geographic Reach**: Location-based hashtags capture regional Swahili speakers
- **Diverse Discovery**: Different hashtags reach different creator communities

### Rate Limiting
- 200ms delay between hashtag searches
- Multiple hashtags per crawl (up to 3) for better coverage
- Search limit: 30 posts per hashtag

### Example
```
Search Query: #kiswahili
  ↓
  Retrieve up to 30 posts
  ↓
  For each post:
    - Verify Swahili language
    - Extract author
    - Get engagement metrics
  ↓
  Cache new authors
```

---

## Strategy 4: Phrase-Based Search

### Purpose
Discover Swahili speakers by searching for common Swahili phrases and expressions.

### How It Works

1. **Phrase Selection**: Choose from common Swahili phrases used in posts
2. **Post Search**: Search for up to 25 posts containing each phrase
3. **Author Validation**: For each post found:
   - Extract author information
   - Verify post contains Swahili language (≥90% confidence)
   - Calculate engagement metrics
4. **Profile Caching**: If valid Swahili post, cache author with:
   - Profile metadata
   - Discovery source: `phrase:{phrase}`
   - Initial Swahili post count (1)
   - Engagement score
   - Extracted hashtags

### Common Phrases Searched

- `habari yako` - "How are you?"
- `asante sana` - "Thank you very much"
- `karibu sana` - "Very welcome"
- `jambo` - "Hello"
- `mambo vipi` - "What's up?"

### Why This Works

- **Natural Language**: Phrase searches catch organic Swahili conversation
- **Non-Hashtag Discovery**: Finds Swahili speakers who don't use hashtags
- **Contextual Relevance**: Phrases represent actual Swahili usage patterns
- **Conversation Mining**: Discovers active Swahili speakers having discussions

### Rate Limiting
- 200ms delay between phrase searches
- Search limit: 25 posts per phrase
- Rotates through phrases randomly for variety

### Example
```
Search Query: "habari yako"
  ↓
  Retrieve up to 25 posts
  ↓
  For each post:
    - Check for Swahili
    - Extract author
    - Get engagement metrics
  ↓
  Cache authors with phrase source
```

---

## Exploration vs. Exploitation Strategy

### Full Exploration Mode
Triggered when:
- Cache has fewer than 15 profiles, OR
- Random exploration probability (40% by default)

**Actions**:
- Crawl from 5 different seed profiles
- Each crawl discovers up to 25 new profiles
- Potential total: 125 new profiles per discovery session
- More aggressive API usage

### Mini Exploration Mode
Triggered when:
- Cache has 15-49 profiles, AND
- Not in full exploration mode

**Actions**:
- Single crawl from a random profile
- Discovers up to 10 new profiles
- Maintains steady growth without overwhelming API

### Exploitation Mode
Triggered when:
- Cache has 50+ profiles, AND
- Exploration probability not triggered

**Actions**:
- Uses exclusively cached profiles
- No new discoveries
- Focuses on fetching posts from known good sources

---

## Profile Validation Process

Every discovered profile undergoes validation:

### Language Detection
- **Method**: `langdetect` library
- **Threshold**: ≥90% confidence for Swahili
- **Minimum Text**: 10 characters required
- **Fallback**: Posts <10 chars are skipped

### Hashtag Extraction
- **Pattern**: Regex matching `#[\w\u0600-\u06FF]+`
- **Deduplication**: Only unique hashtags stored
- **Normalization**: Lowercase conversion
- **Limit**: All hashtags from up to 10 posts extracted

### Engagement Calculation
```
engagementScore = likes + (reposts × 2) + (replies × 3)
```

Weighted formula prioritizes:
- Replies (most important for engagement)
- Reposts (sharing approval)
- Likes (basic engagement)

---

## Caching Strategy

### Profile Storage Structure

```typescript
{
  did: string;                        // Bluesky DID
  handle: string;                     // @handle
  displayName?: string;               // Display name
  discoveredAt: string;               // First discovery timestamp
  lastSeen: string;                   // Last activity timestamp
  swahiliPostCount: number;           // Swahili posts found
  engagementScore: number;            // Total engagement
  discoveredFrom: string;             // Discovery method (follower_of, following_of, hashtag, phrase)
  tags: string[];                     // Associated hashtags
}
```

### Cache Hierarchy

1. **Seed Profiles** (always available)
   - `changetanzania.bsky.social`
   - `tanzania.bsky.social`
   - `kenya.bsky.social`

2. **Discovered Profiles** (grown over time)
   - Most recent first
   - Weighted by engagement
   - Tagged for filtering

### Crawl History Management

- **Purpose**: Avoid redundant crawls from the same profile
- **Size**: Limited to last 25 crawls (down from 100)
- **Benefit**: Allows re-crawling after time, enabling discovery of new followers
- **Rotation**: Old entries naturally aged out as new crawls added

---

## API Rate Limiting Considerations

### Bluesky API Limits
- No strict rate limit documents, but practical limits observed
- Conservative approach: 80-200ms between API calls
- Batch requests: Up to 50 items per request when possible

### Per-Strategy Delays

| Strategy | Delay | Batch Size |
|----------|-------|-----------|
| Followers | 80ms | 50 |
| Following | 80ms | 50 |
| Hashtag Search | 200ms | 30 posts |
| Phrase Search | 200ms | 25 posts |

### Error Handling
- Individual profile errors don't stop crawl
- Silently skips problematic profiles
- Logs errors for debugging
- Continues with next profile/strategy

---

## Growth Trajectory

### Initial Phase (0-15 profiles)
- **Mode**: Full exploration
- **Frequency**: Every discovery request
- **Expected Growth**: 50-125 profiles per request

### Growth Phase (15-50 profiles)
- **Mode**: Full exploration + Mini exploration
- **Frequency**: Full (40% chance) or Mini (always)
- **Expected Growth**: 10-125 profiles per request

### Mature Phase (50+ profiles)
- **Mode**: Exploitation with occasional full exploration
- **Frequency**: Full (40% chance), Mini (never), Exploit (60%)
- **Expected Growth**: 0-125 profiles per request (depends on exploration)

---

## Deduplication

### Profile Deduplication
- Profiles checked against `cache.profiles` (DID-based)
- Prevents duplicate entries for same person
- Checked before profile information fetch

### Post Deduplication
- URI-based: Exact post ID matching
- Text-based: First 100 characters matching
- Prevents showing same post multiple times

---

## Quality Metrics

### Discovery Success Metrics
- **Profiles Discovered Per Request**: 0-125
- **Average Swahili Post Count**: 1-10 per profile
- **Hashtag Coverage**: 15+ unique hashtags tracked
- **Cache Growth Rate**: Logarithmic (slows as cache grows)

### Validation Success Metrics
- **Language Detection Accuracy**: ≥90% Swahili confidence
- **Profile Validation Success**: ~70-80% of followers/following
- **False Positive Rate**: Low (language detection filters non-Swahili)

---

## Future Enhancement Opportunities

### Additional Strategies Could Include:
1. **Quoted Repost Chain Analysis**: Follow threads to discover participants
2. **Like Network Analysis**: Users who like Swahili posts likely speak Swahili
3. **Thread Participation**: Comments and replies from Swahili speakers
4. **List Membership**: Curated lists of Swahili creators
5. **Feed Timeline Analysis**: Popular Swahili posts and their authors
6. **Language Co-occurrence**: Detect multilingual patterns
7. **Hashtag Co-occurrence**: Related hashtags from Swahili posts

### Optimization Opportunities:
1. **Caching API Responses**: Store follower/following lists for faster re-crawls
2. **Batch Profile Fetches**: Get multiple profiles in single API call
3. **Weighted Starting Points**: Start crawls from highest-engagement profiles
4. **Geographic Clustering**: Group profiles by region for location-based discovery
5. **Time-Based Exploration**: Different strategies for different times of day

---

## Summary

The discovery system uses **4 primary strategies** plus **2 operational modes** to comprehensively find Swahili speakers:

- **Follower Network** - Expand through audiences
- **Following Network** - Expand through curators  
- **Hashtag Search** - Direct content matching
- **Phrase Search** - Natural language discovery

Combined with **adaptive exploration/exploitation**, the system grows the profile cache intelligently while respecting API limits and maintaining discovery quality.
