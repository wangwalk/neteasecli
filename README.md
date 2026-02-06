# neteasecli

> Simple CLI for Netease Cloud Music

Retrieve music data from Netease Cloud Music. Returns JSON for easy scripting.

## Installation

```bash
# Run without installing
npx neteasecli search track "周杰伦"
# or
pnpx neteasecli search track "周杰伦"
# or
bunx neteasecli search track "周杰伦"

# Install globally
npm install -g neteasecli
# or
pnpm install -g neteasecli
# or
bun install -g neteasecli
```

## Quick Start

```bash
# Login via Chrome cookies
neteasecli auth login

# Search for music
neteasecli search track "晴天" --limit 5

# Get streaming URL
neteasecli track url 185868 --pretty

# Pipe to your player
neteasecli track url 185868 | jq -r '.data.url' | xargs mpv
```

## Commands

### Authentication
```bash
neteasecli auth login              # Import cookies from Chrome
neteasecli auth check              # Verify login status
neteasecli auth logout             # Clear session
```

### Search
```bash
neteasecli search track <query>    # Search songs
neteasecli search album <query>    # Search albums
neteasecli search playlist <query> # Search playlists
neteasecli search artist <query>   # Search artists
```

### Track Info
```bash
neteasecli track detail <id>       # Get metadata
neteasecli track url <id>          # Get streaming URL
neteasecli track lyric <id>        # Get lyrics
```

### Library
```bash
neteasecli library liked           # List liked songs
neteasecli library like <id>       # Like a song
neteasecli library unlike <id>     # Unlike a song
```

### Playlists
```bash
neteasecli playlist list           # List your playlists
neteasecli playlist detail <id>    # Get playlist tracks
```

## Options

All commands support:
- `--json` - JSON output (default)
- `--pretty` - Pretty-print JSON
- `--quiet` - Suppress messages

## Playback

This tool doesn't include a player. Get URLs and use whatever you like:

```bash
# mpv
neteasecli track url 185868 | jq -r '.data.url' | xargs mpv

# VLC
neteasecli track url 185868 | jq -r '.data.url' | xargs vlc

# wget
neteasecli track url 185868 | jq -r '.data.url' | xargs wget -O song.mp3
```

## Scripting

All commands return JSON with exit code 0 on success:

```bash
# Get first search result and play
neteasecli search track "周杰伦" | \
  jq -r '.data.tracks[0].id' | \
  xargs neteasecli track url | \
  jq -r '.data.url' | \
  xargs mpv
```

## Output Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_ERROR",
    "message": "Cookie expired"
  }
}
```

## Requirements

- Node.js >= 22
- Chrome (for auth cookies)
- macOS or Linux

## Known Issues

- Netease API may change without notice
- Cookies expire and need re-login
- Streaming URLs expire after ~20 minutes
- VIP content requires membership
- Rate limiting exists

## License

MIT
