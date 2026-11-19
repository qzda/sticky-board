# Sticky Board 分层设计审阅

- 日期：2026-11-19
- 范围：`src/main.ts`、`src/style.scss`、`index.html`、`docs/ARCHITECTURE.md`、构建与工具链配置
- 性质：只读审阅，未修改任何业务代码
- 结论：功能分层在概念上清楚（UI → 卡片交互 → 数据模型 → IndexedDB/ZIP），但物理上全部集中在 `main.ts`；部分调用链跨越了层级（指针事件直接触发 IndexedDB 写入），这是当前最值得改进的地方

## 0. 处理进度

以下条目已完成实现、浏览器验证、`npm run check` 验证，并同步更新 `docs/ARCHITECTURE.md`：

| 条目 | 状态 | 提交 |
|---|---|---|
| P0-1 持久化写放大 | 已完成 | `ac64a78` |
| P1-1 双份状态源与只写属性 | 已完成 | `33926e1` |
| P1-2 启动时序与节点校验 | 已完成 | `86de7bc` |
| P1-3 重复逻辑合并 | 已完成 | `e62ec19` |
| P2-1 常量与层级魔法数字 | 已完成 | `9531df4` |
| P2-2 导入数据校验 | 已完成 | `a425051` |

尚未处理：P0-2（Markdown HTML 信任边界）、P2-3（错误提示）、P2-4（可访问性与小缺陷）、P2-5（测试与工具链）。

## 1. 现状分层快照

| 层 | 实际位置 | 问题 |
|---|---|---|
| 展示层 | `src/style.scss`、`index.html` 内联基础样式、`createCard()` 的 DOM 构建 | DOM 结构与业务写入混在一起 |
| 应用/交互层 | 卡片事件、interactjs 配置、settings、timeline | 与展示、持久化交织 |
| 领域层 | `Sticky` 类型、图片 key、日期分组、布局默认值 | 只是若干散落函数，没有边界 |
| 基础设施层 | `openAppDb` / `readPersistedValue`、JSZip、markdown-it、object URL 缓存 | 实现本身不错，但被 UI 直接调用 |

## 2. 优先处理的问题

### P0-1 手势与输入直接写库，写放大严重

- `save()`（`src/main.ts:330`）每次调用都会 `persistStickys()`。
- 输入框每次 `input` 调用 `save`（`src/main.ts:1035`）。
- 缩放 `move` 每次调用 `save`（`src/main.ts:1941`），拖拽 `move` 也一样（`src/main.ts:2004`）。
- 每次 `writePersistedValue()` 都会新开一个 IndexedDB 连接（`src/main.ts:168`），写入整份 `stickys`。

拖动一次会产生几十次事务、序列化全部便签文本。建议拆成两层：

- `updateSticky(id, patch)`：只改内存模型；
- `schedulePersist()`：300–500ms 防抖，`pointerup`、`blur`、`visibilitychange`、`beforeunload` 时 flush；
- `persistStickys()` 保留给导入这种必须 `await` 的场景。

这是层次划分问题，也是当前最实际的性能/寿命问题。

### P0-2 Markdown 原样 HTML + `innerHTML` 的信任边界

`md` 开启了 `html: true`（`src/main.ts:649`），预览通过 `preview.innerHTML = textToHtml(...)` 注入（`src/main.ts:919`、`src/main.ts:939`、`src/main.ts:1078`）。从外部 ZIP 导入的 Markdown 如果含 `<img src=x onerror=...>` 这类内容，会在应用同源执行，可以读取 IndexedDB 里的便签并向外发请求，这与 README 的「纯本地、不上传」承诺冲突。`index.html` 也没有 CSP。

需要三选一并明确记录：

1. `html: false`（最安全，牺牲少量 Markdown 能力）；
2. 引入 sanitizer（新依赖，按 AGENTS.md 需先确认）；
3. 加 CSP + 导入时清洗（改动较大）。

另外，笔记里的 `![](https://...)` 外部图片本来就会联网加载，建议在文档里说明这个例外，或给图片统一加 `referrerpolicy="no-referrer"`。

### P1-1 双份状态源，且有只写不读的冗余

- 卡片几何同时存在三份：`stickys`、内联样式、`data-xy/data-size/data-zindex`。
- 实际只有 `data-xy` 被读取；`data-size`、`data-zindex` 写入后从未读取，`data-image-key` 也从未使用。
- 编辑态靠 `textarea.style.display` 推断（`src/main.ts:888`、`src/main.ts:995`、`src/main.ts:1101`），布局态同时有 `isLayoutMode` 和 `body.layout-timeline` 两份。

建议：模型为唯一事实源，DOM 只做投影。抽 `applyCardGeometry(card, rect)` / `readCardGeometry(card)`，以及 `isCardEditing(card)`，删掉只写属性和重复判断。`cardElementMap` 可以扩展为 `Map<id, { el, model }>`，或至少让所有读写都走同一组函数。

### P1-2 `main.ts` 职责过载、启动时序隐式

一个文件里同时有 i18n、IDB 适配、图片仓库、ZIP 编解码、Markdown 渲染器、卡片工厂、拖拽、设置面板、时间轴、启动。并且：

- `void initializeState()`（`src/main.ts:1369`）在 settings DOM 构建（`src/main.ts:1375` 起）之前触发；
- `isLayoutMode` 在 `src/main.ts:1487` 才声明，却被前面注册的处理器引用；
- `grid`、`settingsContainer` 用 `!` 断言，HTML 一变就是运行期崩溃；
- 全局事件监听分散在 `src/main.ts:590`、`src/main.ts:595`、`src/main.ts:1252`、`src/main.ts:1259`、`src/main.ts:1903` 等多处。

建议引入显式 `bootstrap()`：`load model → 构建 settings/overlay → 渲染卡片 → 绑定交互`，模块顶层只保留常量。近期至少把启动副作用收进函数，非空节点改成带错误信息的校验。

### P1-3 可消除的重复

- `toggleEditMode`（`src/main.ts:902`）和 `toggleAllToPreview`（`src/main.ts:930`）是同一段切换逻辑写两遍 → `setCardEditing(card, editing)`。
- `animateCardLayoutChange`（`src/main.ts:1655`）与 `animateDockedMaximize`（`src/main.ts:851`）是同一套 FLIP 流程 → `animateFromRect()`。
- 拖拽 move/end、缩放 move、居中、创建都各自拼 `style.transform` + attribute + `save`（`src/main.ts:972`、`src/main.ts:1342`、`src/main.ts:1936`、`src/main.ts:1984`、`src/main.ts:2001`）→ 统一 `commitCardRect()`。
- 三个操作按钮的创建代码重复（`src/main.ts:986`–`src/main.ts:1025`）→ `createCardAction()`。
- `Number(cfg.x) || default` 连写五次（`src/main.ts:1856`）→ `normalizeLayout(cfg)`。

### P2-1 常量、单位、层级魔法数字

- `16`（网格）在 JS 多处硬编码，同时 CSS 里是 `1rem`，隐含「根字号 16px」假设。
- `Sticky` 里 `x/y` 是 px，`width/height` 是 rem，跨层传参容易出错。
- z-index：卡片 1、操作区 10、Sunny 4400、settings 6000、最大化 6100、图片预览 9999，散落在 CSS。
- 超时/阈值：200ms、1500ms、45ms、160px 等无命名。

建议抽 `constants.ts`（`GRID_SIZE`、`MIN_CARD_SIZE`、`PERSIST_DEBOUNCE_MS`、`COPY_FEEDBACK_MS`），CSS 里用 `--z-*` 变量，并在 ARCHITECTURE 里列一张层级表。

### P2-2 导入数据校验偏弱

`src/main.ts:1799` 只校验了 `isRecord(parsed)` 和 `path` 是字符串，随后 `Number(cfg.width)` 允许负数/`Infinity`，`x/y` 可为负，卡片可能直接落在视口外。建议抽 `normalizeImportedSticky(cfg, defaults)`：数值有限、取整、尺寸下限、坐标夹取，`text` 强制字符串。

### P2-3 错误只进控制台

存储失败（`src/main.ts:335`、`src/main.ts:349`、`src/main.ts:361`）和初始化失败（`src/main.ts:1364`）用户完全无感。加到一定规模后，静默丢数据是最大风险。建议加一个非阻塞、`aria-live` 的状态提示，并支持重试。

### P2-4 可访问性与小缺陷

- **重复 id**：`card.id = id`（`src/main.ts:968`）和 `textarea.id = id`（`src/main.ts:1033`）相同，违反 HTML 唯一 id；建议改为 `${id}-input`。
- `#settings` 的 settings/layout 图标是 SVG 直接挂 `click`（`src/main.ts:1406`–`src/main.ts:1423`、`src/main.ts:1717`），不可聚焦、无键盘操作，建议包一层 `<button>`。
- 进入编辑后 `setTimeout(focus, 200)`（`src/main.ts:912`）会延迟抢焦点，用户已点到别处也会被拉回，建议改到下一帧。
- 缺图 alt 写死英文 `[missing image]`（`src/main.ts:687`），未走 i18n。
- 拖拽创建中途切到时间轴时没有 `finishCreateDragging()` 清理；按钮位于拖拽热区内，建议确认从按钮按下拖动是否会移动卡片（可在 `ignoreFrom` 里补 `.card-actions`）。
- 时间轴下最大化后退出时间轴，卡片仍是 `card-maximized` 全屏态，建议确认是否符合预期并写进文档。

### P2-5 测试与工具链

- 没有任何单元测试；`check` 只有 lint + 类型。ZIP 路径映射、图片引用清理、日期分组、导入归一化都是纯函数，适合抽到 `src/lib/` 后用 vitest 覆盖。
- 仓库里还有 `pnpm-workspace.yaml`，`pnpm-lock.yaml` 被忽略，脚本却统一用 npm（`package.json:5`）。既然部署用 npm，建议清掉 pnpm 残留，避免下一位协作者装错依赖。

## 3. 建议的目标结构

```text
src/
  main.ts                 # 仅 bootstrap：装配各层
  i18n.ts
  constants.ts
  domain/
    sticky.ts             # 类型、尺寸/坐标不变量、ID、日期
    images.ts             # key、引用提取、清理策略
  storage/
    idb.ts                # 连接缓存 + read/write
    repository.ts         # stickys/images、防抖持久化
  markdown/
    renderer.ts           # md 实例、自定义规则
  cards/
    card-view.ts          # DOM 创建、模式/最大化投影
    card-controller.ts    # 事件、拖拽、缩放
  layout/
    timeline.ts
  zip/
    export.ts
    import.ts
  ui/
    settings.ts
    overlays.ts
  style.scss
```

## 4. 落地顺序（风险从低到高）

1. **纯搬运**：抽 `constants.ts`、`i18n.ts`、`domain/*`、`zip/*`、`markdown/*`，不改行为。
2. **持久化分层**：`repository` + 防抖，修高频写库。
3. **卡片状态收敛**：删只写属性、统一 getter/setter、修重复 id。
4. **安全决策**：确认 `html: true` 的取舍（可能涉及新依赖或行为变更）。
5. **测试**：给纯函数补 vitest，再考虑 Playwright 回归。
6. 最后再考虑拆 `main.ts` 交互层。

## 5. 约束提醒

- `AGENTS.md` 目前要求「入口与核心交互集中在 `src/main.ts`」。要做到完整分层，需要先同意修改这条规则，并同步 `docs/ARCHITECTURE.md` 第 2、15 节。
- sanitizer 属于新增依赖，按项目规则需要先确认隐私、包体积和必要性。
