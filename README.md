# dsh-caption-bar

English | [中文](README.zh.md)

**Reclaim a full row of vertical space in DeepSeek Harness.** Instead of spending a separate row on conversation navigation and session utilities, this desktop layout plugin seats the view tabs in the Windows caption row and compresses the remaining utilities into a 42px right rail. More of the window is left for the conversation—especially valuable on laptops and other short displays.

![Caption row with application menu, conversation views and centred session title](assets/screenshots/caption-row.png)

It:

- places **对话 / 轨迹 / 上下文 / 编队** on the Windows caption row, immediately after the native **应用 / 编辑 / ⋯** menu, with matching spacing and hover treatment;
- centres the current session title in the room left between those tabs and the native window controls;
- keeps fullscreen immediately left of minimise / maximise / close;
- stacks the remaining header utilities in a compact 42px rail at the right edge;
- shows background-job and subagent status changes in a fixed bubble that never changes rail width.

Verified with Codex UI 1.1.49 and DSH desktop 0.2.1-rc.3+.

## Final layout

| Area | Contents |
|---|---|
| Caption row | application menu → view tabs / more-views → centred session title → fullscreen → native window buttons |
| Right rail | agent preset, subagent status/count/menu, background-job status/count/menu, file-manager split control, utilities menu, right-sidebar control |
| Conversation | gives up exactly `--dsh-capbar-rail` on the right, so the rail never covers messages |

The tab row uses the preload menu's own dimensions and tokens: 28px controls, 10px horizontal padding, 6px radius, 2px gaps, 14px text, and `--dsw-alias-interactive-bg-hover` on hover. Codex UI's active-tab slider remains the selection indicator.

## Compact rail

Compact mode is on by default:

```css
--dsh-capbar-compact: 1;
```

| Control | Compact representation |
|---|---|
| Agent preset | existing preset icon; full description remains in `title` |
| Subagent | existing state dot + extracted count + existing chevron |
| Background jobs | existing state dot + extracted count + existing chevron |
| File manager | existing primary button above its existing menu chevron |
| Utilities / right sidebar | unchanged icon controls |

The compact rail is **42px** wide with 30px controls (6px on each side). Set this on `body` to restore complete labels and the 104px rail; the layout sweep notices within two seconds:

```css
--dsh-capbar-compact: 0;
```

All compact markers, replacement counts and titles added by this plugin are removed when compact mode is disabled or the plugin is unloaded.

## Status bubble

Background jobs and subagents publish dynamic status without participating in rail layout:

- the latest change appears for three seconds in one fixed bubble to the rail's left;
- a newer status replaces the previous one;
- clicking the bubble opens the original control;
- the bubble uses only app background, border, radius and text tokens—no custom colour, shadow, blur or animation.

The plugin reads semantic DOM projections (`aria-label`, status dots and stable data attributes), not private jobs-store APIs.

## Visual contract

The plugin is layout-focused. It does not add custom colours, fonts, icons, blur, opacity, shadows or animations. Its deliberate visual exceptions are narrowly tested:

1. remove the stock header's `border-bottom` hairline;
2. mirror the preload menubar's existing button dimensions, radius, label colours and hover token for the view tabs;
3. hide selected labels in compact mode while preserving existing iconography and dynamic counts;
4. style the transient status bubble exclusively with existing app tokens.

It never sets `order` or `display: contents`, and it does not replace app controls with custom replicas.

## Compatibility notes

The plugin intentionally coordinates with Codex UI:

- sets `body[data-dsh-title-bar-compat]` and `--dsh-title-bar-strip`;
- preserves `[data-dcu-tab-slider]` by keeping the tab list as its positioned containing block;
- relies on semantic selectors where available (`role`, `aria-*`, `data-open-target="directory"`), with CSS-module class stems only for stable header layout seats;
- excludes `[role="menu"]` trees from rail text rules and from the layout sweep.

Hosts without Codex UI receive a minimal one-column fallback.

## Install

```powershell
dsh plugin --profile desktop add dsh-caption-bar
```

Restart the desktop app once after first installation. Uninstall:

```powershell
dsh plugin --profile desktop remove dsh-caption-bar
```

## Develop

```powershell
pnpm install
node build.mjs
node test/client.smoke.mjs  # 118 assertions
pnpm exec tsc --noEmit
pnpm exec tsc -p tsconfig.types.json
pnpm compat               # Codex UI anchors; set DSH_CORE_DIR for extracted core packages
```

`src/client/index.tsx` contains the stylesheet, applier, title fallback, fullscreen button, compact-mode projection and status bubble. `lib/` is committed because the host serves it directly.

The build refuses to run if a backtick appears inside the `SHEET` template literal, which turns an otherwise distant SWC syntax error into a precise message.

Diagnostics are compiled but silent by default; set `DEBUG = true` in the client source while investigating layout state.

## Lifecycle

`apply()` returns its disposer to Cordis. Unloading the plugin retracts:

- injected stylesheet, body class and Codex UI compatibility marker;
- title fallback and status bubble;
- MutationObserver / ResizeObserver instances, intervals and pending timeouts;
- event listeners and slot occupants;
- measured CSS variables, semantic data markers and plugin-owned titles;
- inline layout overrides, restored to the values they displaced.

The smoke suite drives the real disposer and asserts this contract.

## Tuning

| Variable | Default | Meaning |
|---|---:|---|
| `--dsh-capbar-compact` | `1` | `1`: compact 42px rail; `0`: full-label 104px rail |
| `--dsh-capbar-compact-box` | `30px` | compact control target |
| `--dsh-capbar-rail` | `104px` | full-label width; compact mode overrides it to 42px |
| `--dsh-capbar-rail-gap` | `6px` | vertical gap between rail items |
| `--dsh-capbar-button` | `28px` | fullscreen button box |
| `--dsh-capbar-gap` | `10px` | gap before native caption buttons |
| `--dsh-capbar-controls` | measured / 138px floor | native caption-button reservation; 0 in fullscreen |
| `--dsh-capbar-lead` | measured | application menu's right edge plus band gap |
| `--dsh-capbar-title-*` | measured | title bounds, width cap and visibility |

## Troubleshooting history

The detailed five-part incident records live in the workspace's `dev-troubleshooting.md` (faults 27–36). They cover the tab overflow feedback loop, title visibility, app-region hit testing, containing-block drift, disposer loss, conditional title markup, rail redesign, active-slider containing block, dynamic status width, compact cascade order and menu-surface isolation.

## License

MIT
