---
name: git-sync
description: >
  Stage, commit, and push code to GitHub and Gitee with proper Conventional
  Commits format. Use when user says push, commit, sync, or after completing
  a feature/bugfix. Enforces English commit messages, excludes generated
  files. Do NOT use for: reading git history, resolving merge conflicts,
  or git branching operations.
origin: ECC
---

# Git Sync — 双仓库同步

## 触发条件

- 用户说"推送"、"push"、"同步"、"commit"、"提交"
- 功能开发/Bug 修复完成后需要同步代码
- **不要用于**：查看 git log、解决合并冲突、分支管理

## 执行流程

| #   | 步骤                                                                              | 验证条件                                          |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | **检查状态** — `git status` 确认变更文件                                          | 无意外文件被修改                                  |
| 2   | **暂存文件** — `git add <相关文件>`                                               | 排除 `dist/`、`node_modules/`、`.env`、生成的文件 |
| 3   | **提交代码** — `git commit -m "type(scope): English description"`                 | 遵循 Conventional Commits 格式，英文              |
| 4   | **主动询问** — "代码已开发完成，是否需要推送到 GitHub 和 Gitee？"                 | 用户必须明确回答                                  |
| 5   | **执行推送** — 确认后运行 `zsh scripts/git-sync.sh "type(scope): msg"` 或手动双推 | 两个 remote 均推送成功                            |

## 提交信息规范

```
feat(auth): add login API
fix: correct null pointer in user service
refactor(prisma): extract PrismaService
docs(scaffolding): update project structure
chore(deps): upgrade eslint to v10
```

## 关键约束

- 所有 commit message **必须使用英文**书写
- 格式：`<type>(<scope>): <description>`，scope 可选
- **绝不**提交 `.env`、秘钥、密码到仓库
- **绝不**提交 `dist/`、`node_modules/`、`*.local` 文件
- 推送前检查 `git diff` 确保没有意外变更

## 验收清单

- [ ] git status 已检查，无意外文件
- [ ] commit message 符合 Conventional Commits 格式
- [ ] 用户已确认（或拒绝）推送
- [ ] 推送成功后确认无报错
