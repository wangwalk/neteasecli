# neteasecli

网易云音乐 AI Agent CLI 工具

## 特性

- 所有输出 JSON 格式，便于 AI agent 解析和链式调用
- 自包含：内置 API 加密逻辑，无需部署外部服务
- 通过 mpv IPC 实现音频播放控制
- TypeScript 开发

## 安装

```bash
# 安装依赖
npm install

# 构建
npm run build

# 全局安装（可选）
npm link
```

### 前置依赖

- Node.js >= 18 或 Bun
- mpv 播放器（用于音频播放）

```bash
# macOS
brew install mpv

# Ubuntu/Debian
sudo apt install mpv
```

## 认证

使用 [Sweet Cookie](https://github.com/nicholasxuu/sweet-cookie) 或其他工具从浏览器导出 Cookie：

```bash
# 导入 Cookie
neteasecli auth import --file cookies.json

# 查看登录状态
neteasecli auth status

# 登出
neteasecli auth logout
```

Cookie JSON 格式示例：
```json
[
  {"name": "MUSIC_U", "value": "xxx"},
  {"name": "__csrf", "value": "xxx"}
]
```

或简单 key-value 格式：
```json
{
  "MUSIC_U": "xxx",
  "__csrf": "xxx"
}
```

## 命令

### 搜索

```bash
neteasecli search track "周杰伦" --limit 10
neteasecli search album "范特西"
neteasecli search playlist "华语经典"
neteasecli search artist "林俊杰"
```

### 播放控制

```bash
neteasecli play <track_id>               # 播放歌曲
neteasecli play --playlist <id>          # 播放歌单
neteasecli pause                         # 暂停
neteasecli resume                        # 继续
neteasecli next                          # 下一首
neteasecli prev                          # 上一首
neteasecli seek <seconds>                # 跳转
neteasecli volume [0-100]                # 设置/获取音量
neteasecli mode shuffle|repeat|single    # 播放模式
```

### 状态和队列

```bash
neteasecli status                        # 当前播放状态
neteasecli queue                         # 查看队列
neteasecli queue add <track_id>          # 添加到队列
neteasecli queue clear                   # 清空队列
```

### 歌单管理

```bash
neteasecli playlist list                 # 我的歌单
neteasecli playlist detail <id>          # 歌单详情
neteasecli playlist create "名称"        # 创建歌单
neteasecli playlist add <pid> <tid>      # 添加歌曲
neteasecli playlist remove <pid> <tid>   # 移除歌曲
```

### 用户库

```bash
neteasecli library liked                 # 我喜欢的音乐
neteasecli library like <track_id>       # 收藏
neteasecli library unlike <track_id>     # 取消收藏
neteasecli library recent                # 最近播放
```

### 歌曲信息

```bash
neteasecli track detail <id>             # 歌曲详情
neteasecli track url <id> --quality high # 获取播放链接
neteasecli track lyric <id>              # 获取歌词
```

## 全局选项

```bash
neteasecli [command] --json        # JSON 输出（默认）
neteasecli [command] --pretty      # 格式化 JSON
neteasecli [command] --quiet       # 静默模式
```

## JSON 输出格式

成功响应：
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

错误响应：
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "Cookie 已过期，请重新登录"
  }
}
```

## 退出码

- `0` - 成功
- `1` - 通用错误
- `2` - 认证错误
- `3` - 网络错误
- `4` - 播放器错误

## URI 规范

```
netease:track:185868       # 歌曲
netease:album:18872        # 专辑
netease:playlist:123456    # 歌单
netease:artist:6452        # 歌手
```

## AI Agent 链式调用示例

```bash
# 搜索并播放第一首
neteasecli search track "晴天" | jq -r '.data.tracks[0].id' | xargs neteasecli play

# 获取歌单并添加到队列
neteasecli playlist detail 123456 | jq -r '.data.tracks[].id' | xargs -I {} neteasecli queue add {}
```

## 许可

MIT
