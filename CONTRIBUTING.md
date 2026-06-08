
# Gagaga 项目贡献指南

感谢参与 Gagaga 小游戏平台的开发。所有成员应遵循 Issue、任务分支、Pull Request、代码评审和合并的协作流程。

## 1. 创建或认领 Issue

开始开发前，应先创建或认领一个 Issue。Issue 应包含：

- 明确的任务标题
- 背景与目标
- 工作内容
- 可检查的验收标准
- 负责人
- 合适的标签和里程碑

一个 Issue 原则上只描述一个独立任务。

## 2. 创建任务分支

首先同步最新的主分支：

```bash
git switch main
git pull --ff-only origin main
```

然后创建与 Issue 对应的分支：
例如
```bash
git switch -c docs/issue-2-collaboration-guide
```

分支命名格式：

```text
类型/issue-编号-简短说明
```

常用类型：

- `feature`：新增功能
- `fix`：修复问题
- `docs`：修改文档
- `test`：增加测试
- `ci`：修改自动化流程
- `refactor`：代码重构

示例：

```text
feature/issue-6-chat-history
fix/issue-7-ranking-validation
docs/issue-2-collaboration-guide
test/issue-8-platform-tests
ci/issue-9-pr-check
```

禁止直接在 `main` 分支开发或推送代码。

## 3. 开发要求

- 普通游戏任务原则上只修改对应游戏目录。
- 不要混入与当前 Issue 无关的改动。
- 公共模块修改应提前与其他成员沟通。
- 不提交密码、令牌、运行数据和 `node_modules`。
- 公共平台与游戏模块约定见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 4. 提交代码

提交前检查修改：

```bash
git status
git diff
```

只暂存当前任务需要的文件：

```bash
git add README.md CONTRIBUTING.md
```

提交信息格式：

```text
类型(模块): 简要说明
```

示例：

```text
feat(chat): 增加聊天消息记录
fix(ranking): 修复非法分数提交问题
docs(contributing): 完善项目协作流程
test(auth): 增加登录接口测试
ci: 增加 Pull Request 自动检查
```

每个提交应保持目标明确，避免使用“修改代码”“完善一下”等模糊描述。

## 5. 本地检查

提交 Pull Request 前运行：

```bash
cd server
npm install
npm run check
```

同时通过统一服务进行必要的人工验证：

```bash
npm start
```

访问：

```text
http://localhost:8080
```

## 6. 推送分支

```bash
git push -u origin 分支名称
```

例如：

```bash
git push -u origin docs/issue-2-collaboration-guide
```

## 7. 创建 Pull Request

Pull Request 应包含：

- 关联的 Issue，例如 `Closes #2`
- 修改内容
- 验证方式
- 可能影响的模块
- 页面改动截图（如适用）

PR 示例：

```markdown
## 关联 Issue

Closes #2

## 修改内容

- 更新项目启动说明
- 增加分支和提交规范
- 补充 PR 与代码评审流程

## 验证方式

- [x] 检查文档内容
- [x] 运行 npm run check
- [x] 未修改无关游戏模块

## 影响范围

仅修改项目文档，不影响游戏功能。
```

## 8. Code Review

每个 Pull Request 至少需要一名其他成员评审。

评审内容包括：

- 是否满足 Issue 验收标准
- 是否包含无关修改
- 代码和文档是否清晰
- 是否可能影响其他模块
- 检查和测试是否通过

作者应根据评审意见修改。所有讨论解决并获得批准后才能合并。

## 9. 合并与清理

满足以下条件后才能合并：

- Issue 验收标准已经完成
- 自动检查通过
- 至少一名其他成员批准
- 所有评审意见已经处理
- 不存在未解决的冲突

合并后删除任务分支，Issue 由 PR 中的 `Closes #编号` 自动关闭。

## 10. 完整协作流程

```text
创建或认领 Issue
→ 同步 main
→ 创建任务分支
→ 开发并规范提交
→ 本地检查
→ 创建 Pull Request
→ 其他成员 Code Review
→ 根据意见修改
→ 检查通过后合并
→ 关闭 Issue 并删除分支
```
```

替换后保存，然后执行：

```bash
git status
git diff -- README.md CONTRIBUTING.md
```

先检查修改，不要立即提交。