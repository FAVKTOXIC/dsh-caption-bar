# 更新日志 / Changelog

## 0.2.0

首个完成验收的版本。独立于 `dsh-theme-liquid-glass`，与 Codex UI 1.1.49 配合使用。

### 最终布局

- **标题栏带子**：`应用 / 编辑 / ⋯` → `对话 / 轨迹 / 上下文 / 编队` → 居中会话标题 → 全屏 → 原生最小化 / 最大化 / 关闭。
- **标签样式**：复用 preload 菜单栏的 28px 高、10px 内边距、6px 圆角、2px 间距、14px 字号，以及相同 hover token；保留 Codex UI 的滑动选中底色。
- **右侧竖轨**：标准模式、子智能体、后台任务、文件管理器、工具菜单、右侧栏按钮。
- **全屏按钮**：位于原生最小化按钮左侧，同中心线、同间距。
- **正文让位**：会话正文按竖轨实际宽度预留右侧空间，不被覆盖。

### 紧凑模式（默认开启）

- `--dsh-capbar-compact: 1`：42px 竖轨、30px 控件，左右各 6px。
- 标准模式保留自带图标；子智能体与后台任务保留状态点、动态数量、下拉箭头；完整文字放入 title。
- 文件管理器主按钮和下拉按钮纵向排列，保留各自点击逻辑、外框与圆角，移除横排遗留的左分隔线。
- 文件、工具菜单、右侧栏等原本已是图标的控件不替换、不重绘。
- 设置 `--dsh-capbar-compact: 0` 可恢复完整标签与 104px 竖轨；无需刷新，布局扫描自动切换。

### 状态气泡

- 后台任务首次出现、数量/状态变化，以及子智能体状态变化时，在对应按钮左侧显示最新状态三秒。
- 新状态替换旧状态；点击气泡打开原控件。
- 气泡 fixed 在 body 下，不参与竖轨 flex 尺寸，不会改变正文宽度。
- 只使用 app 的背景、边框、圆角与文字 token；无自定义颜色、阴影、模糊或动画。

### 兼容与防御性布局

- 标签条维持 100vw 计量盒，避免 app 的 `max(1, floor((clientWidth - 48) / 120))` 溢出算法折叠标签；盒子零高、pointer-transparent，不夺走带子空白处的拖拽命中。
- 标签列表保持 `position: relative`，作为 Codex UI `[data-dcu-tab-slider]` 的包含块。
- 标题居中在标签行右缘和全屏按钮左缘之间；用 `visibility` 单一开关，不覆盖 app 面包屑的 flex 居中。
- 菜单 / popover 子树（`[role="menu"]`）明确排除在竖轨文本规则与 `packColumn()` 扫描之外；扫描只访问七类 header layout seat，不遍历全部后代。
- 文件管理器使用运行时稳定语义 `[data-open-target="directory"]`，不依赖 CSS-module 哈希。
- compact 语义标记、replacement count、plugin-owned title、observer/timer/listener 均由 disposer 完整撤回。

### 视觉契约

插件不引入自定义颜色、字体、图标、模糊、透明、阴影或动画；不设置 app 布局的 `order`，也不使用 `display: contents`。仅有四类明确、由测试白名单约束的例外：

1. 删除 stock header 的 `border-bottom` 细线；
2. 标签镜像 app 菜单栏已有的尺寸、圆角、颜色和 hover token；
3. compact 模式隐藏文字，保留 app 自带图标、状态和动态计数；
4. 状态气泡仅复用 app token。

### 生命周期与测试

- `apply()` 向 Cordis 返回 disposer；禁用 / fiber 重启时撤回所有 DOM、样式、变量、observer、timer、listener、slot 注册和 inline override。
- build 阶段拒绝 `SHEET` 内的反引号，避免模板字符串被注释提前截断。
- smoke test 共 **118 项**：覆盖几何、语义选择器、视觉白名单、compact 开关、状态气泡、菜单隔离、标题与标签计量，以及完整卸载与陈旧重试防复活。
- 详细问题复盘见工作区 `dev-troubleshooting.md` 故障 27–36。

## 0.1.0

内部开发原型：探索把会话顶栏并入 Windows caption band。该实现经过多轮实测后被 0.2.0 的“标签在带子、其余控件在右轨”架构替代，未作为最终版本发布。
