# neteasecli

网易云音乐命令行工具 / Netease Cloud Music CLI

JSON output for easy scripting and agent integration.

## Installation / 安装

```bash
# Run without installing / 免安装运行
npx neteasecli search track "Jay Chou"

# Install globally / 全局安装
npm install -g neteasecli
```

## Quick Start / 快速开始

```bash
# Login via Chrome cookies / 从 Chrome 导入登录信息
netease auth login

# Search / 搜索
netease search track "Sunny Day"

# Play a track (requires mpv) / 播放歌曲（需要 mpv）
netease track play 185868

# Playback control / 播放控制
netease player status
netease player pause
netease player stop
```

## Commands / 命令

### auth

```bash
netease auth login              # Import cookies from Chrome / 从 Chrome 导入 Cookie
netease auth login --profile X  # Specify Chrome profile / 指定 Chrome Profile
netease auth check              # Check login status / 检查登录状态
netease auth logout             # Logout / 登出
```

### search

```bash
netease search track <query>    # Search tracks / 搜索歌曲
netease search album <query>    # Search albums / 搜索专辑
netease search playlist <query> # Search playlists / 搜索歌单
netease search artist <query>   # Search artists / 搜索歌手
```

Options: `-l, --limit <n>` (default 20), `-o, --offset <n>` (default 0)

### track

```bash
netease track detail <id>       # Track metadata / 歌曲详情
netease track url <id>          # Streaming URL / 播放链接
netease track lyric <id>        # Lyrics / 歌词
netease track download <id>     # Download / 下载
netease track play <id>         # Play via mpv / 用 mpv 播放
```

Options: `-q, --quality <level>` standard | higher | exhigh (default) | lossless | hires

### player

Requires [mpv](https://mpv.io/) installed. / 需要安装 [mpv](https://mpv.io/)。

```bash
netease player status           # Current status / 当前状态
netease player pause            # Toggle pause / 暂停或继续
netease player stop             # Stop / 停止
```

### library

```bash
netease library liked           # Liked tracks / 喜欢的音乐
netease library like <id>       # Like a track / 收藏
netease library unlike <id>     # Unlike / 取消收藏
netease library recent          # Recently played / 最近播放
```

### playlist

```bash
netease playlist list           # My playlists / 我的歌单
netease playlist detail <id>    # Playlist tracks / 歌单详情
```

## Global Options / 全局选项

- `--pretty` Pretty-print JSON / 格式化输出
- `--quiet` Suppress output / 静默模式

## Output Format / 输出格式

```jsonc
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "AUTH_ERROR", "message": "..." } }
```

## Requirements / 环境要求

- Node.js >= 22
- Chrome (for cookie import / 用于导入 Cookie)
- [mpv](https://mpv.io/) (for playback / 用于播放)
- macOS, Linux, or Windows

## License

MIT
