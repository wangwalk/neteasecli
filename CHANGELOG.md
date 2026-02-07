# Changelog

## 2.0.0

### Features

- Three output modes: colorized human-readable (TTY), JSON (pipe), plain text
- Playback via mpv with IPC control: play, pause, stop, seek, volume, repeat
- Multi-profile account support (`--profile <name>`)
- Multi-browser cookie import: Chrome, Edge, Firefox, Safari (auto-detected)
- Debug (`-d`) and verbose (`-v`) logging to stderr
- Configurable request timeout (`--timeout <seconds>`)
- Auth check with per-credential diagnostics and actionable error messages
- Track download with streaming URL resolution
- Cross-platform: macOS, Linux, Windows

### Breaking Changes

- Removed phone/SMS login — browser cookie import only
- Command renamed from `netease` to `neteasecli`

## 1.0.0

- Initial release
- Search, track detail, lyrics, library, playlist commands
- Chrome cookie-based authentication
- JSON output with `--pretty` and `--quiet` modes
