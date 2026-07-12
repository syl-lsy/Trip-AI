---
title: 上下文自动压缩
date: 2026-07-12
type: feature
layer: fullstack
---

## 功能概述

OpenCode TUI 底部状态栏显示上下文使用率（如 `143.3K(14%)`）。当使用率超过 60% 时，AI 回复质量开始下降。本工具自动监控并在超过阈值时触发 `/compact`，保持上下文在舒适区间。

## 安装位置

| 文件                                                    | 说明         |
| ------------------------------------------------------- | ------------ |
| `~/.local/bin/opencode-auto-compact.sh`                 | 监控脚本     |
| `~/Library/LaunchAgents/com.opencode.autocompact.plist` | launchd 配置 |
| `~/.local/state/opencode-auto-compact.log`              | 运行日志     |

## 工作原理

```
launchd（每 60 秒）
  └→ pgrep -f opencode（快速判断 OpenCode 是否运行）
       ├→ 未运行 → 退出（零开销）
       └→ 运行中 → osascript 获取终端内容
                      └→ 解析状态栏 (XX%)
                           ├→ < 60% → 退出
                           └→ ≥ 60% → System Events 发送 ctrl+x c
                                        └→ 冷却 5 分钟
```

## 配置参数

| 参数        | 默认值 | 说明                               |
| ----------- | ------ | ---------------------------------- |
| `THRESHOLD` | `60`   | 上下文使用率触发阈值（百分比）     |
| `COOLDOWN`  | `300`  | 触发后冷却时间（秒），避免频繁压缩 |

修改阈值：编辑 `~/.local/bin/opencode-auto-compact.sh` 顶部变量。

## 终端兼容性

| 终端         | 支持状态            |
| ------------ | ------------------- |
| Terminal.app | ✅ 完整支持         |
| iTerm2       | ✅ 完整支持         |
| Warp         | ⚠️ 尝试兼容，需测试 |

## 管理命令

```bash
# 加载（开机自启）
launchctl load ~/Library/LaunchAgents/com.opencode.autocompact.plist

# 卸载
launchctl unload ~/Library/LaunchAgents/com.opencode.autocompact.plist

# 查看状态
launchctl list com.opencode.autocompact

# 查看日志
tail -f ~/.local/state/opencode-auto-compact.log
```

## 注意事项

- 首次触发压缩时需在系统设置 → 隐私 → 辅助功能中允许终端发送按键
- 冷却期内不会重复触发，但手动 `/compact` 不受限制
- 脚本使用 `mkdir` 文件锁防并发，不存在竞态条件
