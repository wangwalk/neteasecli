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
neteasecli auth login

# Search / 搜索
neteasecli search track "Sunny Day"

# Play a track (requires mpv) / 播放歌曲（需要 mpv）
neteasecli track play 185868

# Playback control / 播放控制
neteasecli player status
neteasecli player pause
neteasecli player stop
```

## Commands / 命令

### auth

```bash
neteasecli auth login              # Import cookies from Chrome / 从 Chrome 导入 Cookie
neteasecli auth login --profile X  # Specify Chrome profile / 指定 Chrome Profile
neteasecli auth check              # Check login status / 检查登录状态
neteasecli auth logout             # Logout / 登出
```

### search

```bash
neteasecli search track <query>    # Search tracks / 搜索歌曲
neteasecli search album <query>    # Search albums / 搜索专辑
neteasecli search playlist <query> # Search playlists / 搜索歌单
neteasecli search artist <query>   # Search artists / 搜索歌手
```

Options: `-l, --limit <n>` (default 20), `-o, --offset <n>` (default 0)

### track

```bash
neteasecli track detail <id>       # Track metadata / 歌曲详情
neteasecli track url <id>          # Streaming URL / 播放链接
neteasecli track lyric <id>        # Lyrics / 歌词
neteasecli track download <id>     # Download / 下载
neteasecli track play <id>         # Play via mpv / 用 mpv 播放
```

Options: `-q, --quality <level>` standard | higher | exhigh (default) | lossless | hires

### player

Requires [mpv](https://mpv.io/) installed. / 需要安装 [mpv](https://mpv.io/)。

```bash
neteasecli player status           # Current status / 当前状态
neteasecli player pause            # Toggle pause / 暂停或继续
neteasecli player stop             # Stop / 停止
```

### library

```bash
neteasecli library liked           # Liked tracks / 喜欢的音乐
neteasecli library like <id>       # Like a track / 收藏
neteasecli library unlike <id>     # Unlike / 取消收藏
neteasecli library recent          # Recently played / 最近播放
```

### playlist

```bash
neteasecli playlist list           # My playlists / 我的歌单
neteasecli playlist detail <id>    # Playlist tracks / 歌单详情
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
