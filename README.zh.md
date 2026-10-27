# dsh-caption-bar

[English](README.md) | 中文

**为 DeepSeek Harness 省下一整行垂直空间。** 原本单独占一行的会话导航与顶栏工具，被重新安排到 Windows 系统标题栏和右侧 42px 紧凑竖轨中。对话区获得更多高度，尤其适合笔记本、小尺寸屏幕以及需要尽量多展示消息内容的场景。

![应用菜单、会话视图和居中标题共用一条 Windows 标题栏](assets/screenshots/caption-row.png)

插件会：

- 把 **对话 / 轨迹 / 上下文 / 编队** 放到 Windows 标题栏，紧跟在原生 **应用 / 编辑 / ⋯** 菜单右边，并复用相同间距与悬停效果；
- 把当前会话标题居中在视图标签与窗口按钮之间；
- 把全屏按钮放在原生最小化 / 最大化 / 关闭按钮左侧；
- 把剩余顶栏工具纵向压缩到窗口右侧的 42px 竖轨；
- 用不参与布局的悬浮气泡展示后台任务与子智能体状态，状态变化不会再撑宽竖轨。

已验证 Codex UI 1.1.49，以及 DSH Desktop 0.2.1-rc.3 及更新的 0.2.x 版本。

## 最终布局

| 区域 | 内容 |
|---|---|
| 系统标题栏 | 应用菜单 → 会话视图 / 更多视图 → 居中会话标题 → 全屏 → 原生窗口按钮 |
| 右侧竖轨 | 标准模式、子智能体状态/数量/菜单、后台任务状态/数量/菜单、文件管理器、工具菜单、右侧栏按钮 |
| 对话区 | 自动让出 `--dsh-capbar-rail`，消息不会被竖轨覆盖 |

视图标签直接复用 preload 菜单栏的尺寸和 token：28px 高、10px 横向内边距、6px 圆角、2px 间距、14px 字号，以及同款 `--dsw-alias-interactive-bg-hover` 悬停底色。Codex UI 原本的滑动选中底色继续生效。

## 紧凑竖轨

紧凑模式默认开启：

```css
--dsh-capbar-compact: 1;
```

| 控件 | 紧凑形态 |
|---|---|
| 标准模式 | 保留组件自带图标，完整说明保留在 `title` |
| 子智能体 | 状态点 + 动态数量 + 原下拉箭头 |
| 后台任务 | 状态点 + 动态数量 + 原下拉箭头 |
| 文件管理器 | 原主按钮与下拉按钮纵向排列，点击逻辑独立保留 |
| 工具菜单 / 右侧栏 | 保持原图标控件不变 |

紧凑竖轨宽 **42px**，控件宽 30px，左右各保留 6px。若希望恢复完整文字与 104px 竖轨，在 `body` 上设置：

```css
--dsh-capbar-compact: 0;
```

布局扫描会在两秒内发现变化，无需刷新。关闭紧凑模式或卸载插件时，插件添加的标记、替代计数和 title 都会恢复。

## 状态气泡

后台任务和子智能体的动态文案不参与竖轨布局：

- 最新状态会在竖轨左侧显示三秒；
- 新状态替换旧状态；
- 点击气泡会打开原控件；
- 气泡只复用 app 的背景、边框、圆角与文字 token，不使用自定义颜色、阴影、模糊或动画；
- 气泡 fixed 在 `body` 下，不会改变竖轨或对话区宽度。

插件读取组件已经公开到 DOM 的语义状态（`aria-label`、状态点和稳定 data 属性），不接入私有 jobs store。

## 设计边界

插件以布局为主，不引入自定义颜色、字体、图标、模糊、透明、阴影或动画。明确且受测试约束的视觉例外只有：

1. 删除 stock header 的 `border-bottom` 细线；
2. 让会话标签镜像 app 菜单栏已有尺寸、圆角、颜色和 hover token；
3. 紧凑模式隐藏文字，但保留 app 自带图标、状态和动态计数；
4. 状态气泡只使用 app token。

插件不设置 app 布局的 `order`，不使用 `display: contents`，也不会重画一套假的 app 控件。

## 兼容性

- 与 Codex UI 协作：设置 `body[data-dsh-title-bar-compat]` 和 `--dsh-title-bar-strip`；
- 保持标签列表为 `[data-dcu-tab-slider]` 的定位祖先，选中态不会偏移；
- 优先使用 `role`、`aria-*`、`data-open-target="directory"` 等语义选择器；
- 菜单 / popover 子树（`[role="menu"]`）明确排除在竖轨文本规则与布局扫描之外；
- 没有 Codex UI 的宿主会获得最小竖列回退布局。

## 安装

```powershell
dsh plugin --profile desktop add dsh-caption-bar
```

首次安装后重启一次桌面应用。卸载：

```powershell
dsh plugin --profile desktop remove dsh-caption-bar
```

## 开发与验证

```powershell
pnpm install
node build.mjs
node test/client.smoke.mjs  # 118 项
pnpm exec tsc --noEmit
pnpm exec tsc -p tsconfig.types.json
pnpm compat
```

`src/client/index.tsx` 包含样式表、applier、标题回退、全屏按钮、紧凑模式状态投影和状态气泡。宿主直接加载 `lib/`，所以构建产物会提交到仓库。

`apply()` 会向 Cordis 返回 disposer。禁用或重启插件时，会撤回样式、DOM、observer、timer、listener、slot 注册、测量变量、语义标记、插件添加的 title，以及恢复所有 inline override 的原值。smoke test 会实际执行这条卸载路径。

## 调节变量

| 变量 | 默认值 | 作用 |
|---|---:|---|
| `--dsh-capbar-compact` | `1` | `1`：42px 紧凑轨；`0`：104px 完整文字轨 |
| `--dsh-capbar-compact-box` | `30px` | 紧凑控件点击盒 |
| `--dsh-capbar-rail` | `104px` | 完整模式宽度；紧凑模式覆盖为 42px |
| `--dsh-capbar-rail-gap` | `6px` | 竖轨控件纵向间距 |
| `--dsh-capbar-button` | `28px` | 全屏按钮尺寸 |
| `--dsh-capbar-gap` | `10px` | 全屏与原生窗口按钮之间的间距 |
| `--dsh-capbar-lead` | 运行时测量 | 应用菜单右缘 + 标签行间距 |
| `--dsh-capbar-title-*` | 运行时测量 | 标题左右边界、宽度上限和显示开关 |

## 故障记录

详细的五段式排查记录位于工作区 `dev-troubleshooting.md`（故障 27–36），覆盖标签溢出反馈循环、标题可见性、app-region 命中、包含块漂移、disposer 丢失、条件渲染标题、右轨重构、选中态滑块、动态状态撑宽、compact 层叠顺序以及菜单浮层隔离。

## 许可

MIT
