window.__ModuleLoader__.load({
	id: "dsh-caption-bar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
/**
 * dsh-caption-bar — client half.
 *
 * Desktop-only, POSITIONING-ONLY, and deliberately OUTSIDE the caption band.
 *
 * The band (系统标题栏, 40px) belongs to the window manager: a control placed in it has to
 * be carved out of the drag region, and every attempt at that produced a new bug — a
 * button that dragged the window, a drag strip that never registered because it sat inside
 * a no-drag box, a title that vanished whenever the app chose not to render it. So the
 * band keeps exactly one thing, the session title, and everything interactive is stacked
 * in a rail on the window's right edge, below the band, where the page is ordinary web
 * content:
 *
 *   band  ─┬─ the session title (the app's own, or a label of ours standing in)
 *          └─ the native minimise / maximise / close, painted by Windows
 *   rail  ─── the view tabs (vertical), the header clusters, our fullscreen button
 *
 * That is the whole trick: below the band there is no `-webkit-app-region` anywhere, so
 * nothing has to be handed back, no drag region has to be measured, and no control can
 * turn into window chrome.
 *
 * What it deliberately does NOT do:
 *
 *   - no colours, backgrounds, blur, radii, shadows, opacity, fonts or icons — the sheet
 *     is asserted to stay appearance-free by test/client.smoke.mjs, with exactly one
 *     agreed exception: the stock header paints a real `border-bottom` hairline that would
 *     be a stray stroke across the rail's foot, so that one declaration is removed;
 *   - no `order` and no `display: contents` — the Codex UI plugin
 *     (@michengai/dsh-codex-ui) already flattens and orders the header, and re-ordering
 *     here would fight it;
 *   - no height overrides: the app decides how tall the band and the rail are.
 *
 * Coordination with that plugin stays one-way: we set the marker it already reads,
 *
 *     body[data-dsh-title-bar-compat]  +  --dsh-title-bar-strip
 *
 * so it keeps its own band controls clear of the band we share. Nothing else about that
 * plugin is touched.
 *
 * Everything is gated on `body.dsh-capbar-on`, and every side effect (style element,
 * class, marker, title label, observer, timers, slot occupant, inline overrides) is
 * retracted by the disposer that `apply` returns.
 */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get apply () {
        return apply;
    },
    get inject () {
        return inject;
    }
});
const _jsxruntime = require("react/jsx-runtime");
const _react = require("react");
const CLIENT_ID = 'dsh-caption-bar';
const STYLE_ID = 'dsh-caption-bar-style';
/** Master switch: every rule in SHEET is gated on this body class. */ const BODY_CLASS = 'dsh-capbar-on';
/** Class of the band's own title label (SHEET yields it to the app's real title). */ const TITLE_CLASS = 'dsh-capbar-title';
/** Compact rail mode — semantic, opt-in and reversible. */ const COMPACT_CLASS = 'dsh-capbar-compact';
const COMPACT_VAR = '--dsh-capbar-compact';
/** A count we add beside the subagent status dot; the original text stays in the DOM. */ const SUBAGENT_COUNT_ATTR = 'data-dsh-capbar-subagent-count';
/** Marks the agent-preset label after the applier has identified it structurally. */ const PRESET_ATTR = 'data-dsh-capbar-preset';
/** Marks the background-job trigger; its localized count string is replaced by a number. */ const JOB_ATTR = 'data-dsh-capbar-job';
const JOB_COUNT_ATTR = 'data-dsh-capbar-job-count';
/** One latest-state bubble, outside layout. */ const BUBBLE_CLASS = 'dsh-capbar-status-bubble';
const BUBBLE_MS = 3000;
/** Slot the conversation header exposes for extra utility controls. */ const HEADER_UTILITIES_SLOT = 'conversation.session.header.utilities';
/**
 * The numbers the stylesheet interpolates, named once.
 *
 * Only one is left: the fallback width of the native caption buttons. Everything else the
 * layout needs is a CSS custom property in section 7 of SHEET, so it can be tuned in
 * devtools without a rebuild.
 */ /** Three 46px Windows 11 caption buttons, for hosts that publish no titlebar area. */ const CAPTION_FALLBACK_PX = 138;
/** Order of our header-utilities occupant inside the app's own grouping. */ const UTILITIES_ORDER = 90;
/** Gap kept along the band's row: application menu ↔ tabs ↔ title ↔ fullscreen button. */ const BAND_GAP_PX = 10;
/** Room the band's title needs before it is shown at all. */ const TITLE_MIN_ROOM_PX = 200;
/** Space kept inside that room, so the title never touches a control. */ const TITLE_ROOM_PADDING_PX = 20;
/** Re-measure cadence for the application menu. Its width follows the locale (应用 编辑 is
 *  ~98px, Application Edit ~154px) and its left edge follows the sidebar and the settings
 *  page, so the tab row's start has to be re-read — one getBoundingClientRect per tick,
 *  and the write only happens when the value changed. */ const MEASURE_INTERVAL_MS = 500;
/**
 * `document.title` is "<session title> — <product title>" (written by the app's own
 * DocumentTitle component); with no session open it is just the product title.
 */ const TITLE_SEPARATOR = ' — ';
/** Cadence of the re-applier sweep: React can drop inline styles it did not set itself. */ const SWEEP_INTERVAL_MS = 2000;
/** First-paint retries, for the same reason: React's first render lands after apply(). */ const RETRY_MS = [
    400,
    1200
];
/**
 * The conversation header, in both shapes this runtime has been seen to produce:
 * anchored to the conversation slot, or — when an extra wrapper between the slot and
 * the header breaks the direct-child form — the element that structurally holds the
 * view tabs. Every applier reads the header through this one constant, so the two
 * arms cannot drift apart.
 */ const HEADER_SELECTOR = '[data-slot="conversation.header"] header, header:has([role="tablist"])';
/** The view-tab strip inside that header; its box is the band's row. */ const STRIP_SELECTOR = '[data-slot="conversation.header"] header [class*="_tabs"], header:has([role="tablist"]) [class*="_tabs"]';
/** The application-menu overlay the preload mounts (its menubar lives in a shadow root). */ const MENU_SELECTOR = 'div[data-windows-menu]';
/** Our own fullscreen button, which marks the right end of the title's room. */ const FULLSCREEN_SELECTOR = 'button.dsh-capbar-fullscreen';
/**
 * Diagnostics are kept, but silent by default.
 *
 * Every branch in this file that used to fight the app's layout logic was settled by
 * reading the numbers these logs print: which elements claimed the free space, what the
 * band's title resolved to, which page the rail was seated on. Deleting them would mean
 * re-deriving all of that the next time something moves. Set DEBUG to true and reload to
 * get them back; nothing is printed otherwise.
 */ const DEBUG = false;
const debug = (...args)=>{
    if (DEBUG) console.log(...args);
};
const SHEET = `
/* ── 1. the rail: the conversation bar, vertical, on the window's right edge ── */
/* Everything interactive lives OUTSIDE the caption band, and that is the whole point:
   the band is the window manager's area, so any control placed in it has to be carved
   out of the drag region — which is what produced "this button drags the window",
   "only one patch of the band drags" and "the drag strip never registers at all".
   Below the band the page is ordinary web content: no -webkit-app-region anywhere, no
   hand-back lists, no drag strip, nothing to keep in step with the window buttons. */
html[data-windows-titlebar] body.dsh-capbar-on [data-slot="conversation.header"] header,
html[data-windows-titlebar] body.dsh-capbar-on header:has([role="tablist"]) {
  position: fixed;
  top: var(--dsh-windows-titlebar-height, 40px);
  right: 0;
  bottom: 0;
  left: auto;
  width: var(--dsh-capbar-rail);
  z-index: 30;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: var(--dsh-capbar-rail-gap);
  padding: var(--dsh-capbar-rail-gap) 0;
  /* The tab strip below deliberately keeps a box far WIDER than the rail (the app counts
     tabs from it), so this must not clip. */
  overflow: visible;
  /* The stock header paints its own hairline along its bottom edge; in a narrow rail that
     would be a stray stroke across the rail's foot. */
  border-bottom: none;
}

/* Hosts WITHOUT Codex UI: the stock header is a two-row grid, which has no meaning in a
   column. With Codex UI present its marker is in the DOM and this arm never matches. */
html[data-windows-titlebar] body.dsh-capbar-on header:not(:has([data-dcu-inline-tabs])) {
  display: flex;
  flex-wrap: nowrap;
  min-height: 0;
}

/* ── 2. the clusters stack ─────────────────────────────────────────────────── */
/* The app lays its header out as a row of clusters (and Codex UI flatttens it into one).
   Stacking is all that "vertical" means here: each cluster becomes a column of its own. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerLeading"],
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerActions"],
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerUtilities"],
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerCorner"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dsh-capbar-rail-gap);
  width: 100%;
  min-width: 0;
  margin: 0;
}
/* In a row an empty title block steals WIDTH (flex: 1), which is why the applier used to
   neutralise it; in a column the same declaration steals HEIGHT. Declared here as well so
   the layout does not depend on the sweep having run. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="titleCluster"] {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}
/* The stock corner carries margin-right: -16px, a second-row trick that would now push it
   out of the rail. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerCorner"] {
  margin-right: 0;
}
/* Keep a long chip label inside the rail instead of letting it widen the column. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerUtilities"] > *,
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerCorner"] > * {
  max-width: 100%;
}
/* A label longer than the rail (the subagent count is the one that does it: its text is a
   single localized string, so it cannot be shortened without touching another package)
   still has to wrap. Make that wrap look deliberate: balanced lines, tight leading and a
   centred axis, instead of an orphan on the second line. The label span is a flex item of
   the chip's button, so it is already a block container and text-wrap applies. */
/* Label wrapping applies to chrome, never to a menu surface mounted under that chrome.
   The menu primitive may keep its portal DOM under headerUtilities; broad descendant rules
   otherwise turn menu labels into centred/wrapped rail text. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerUtilities"] span:not([role="menu"] *),
html[data-windows-titlebar] body.dsh-capbar-on header [class*="headerCorner"] span:not([role="menu"] *) {
  text-wrap: balance;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}

/* ── 3. the view tabs: the next items of the caption menu's own row ───────────── */
/* Asked for at the live review: 对话 / 轨迹 / 上下文 / 编队 on the band's row, right after
   应用 / 编辑, with that row's metrics and its hover treatment. The menubar lives in the
   preload's shadow root, but its stylesheet is readable, so every number below is copied
   from it rather than guessed:

     :host { position: fixed; top: 0; left: var(--dsh-windows-menu-start, 48px);
             z-index: 1100; height: var(--dsh-windows-titlebar-height);
             display: flex; align-items: center; -webkit-app-region: no-drag; }
     [role=menubar] { display: flex; gap: 2px; }
     button { height: 28px; padding: 0 10px; border-radius: 6px; font-size: 14px;
              background: transparent; color: var(--dsw-alias-label-secondary); }
     button:hover, button[aria-expanded=true] {
              background: var(--dsw-alias-interactive-bg-hover);
              color: var(--dsw-alias-label-primary); }

   The shape matters as much as the numbers: the menubar is a fixed, high-z-index box that
   declares no-drag on the CONTAINER, and it is clickable in the band every day. That is
   not the shape that failed in fault 29 — there the bar itself claimed the drag region and
   tried to hand it back control by control. Its children inherit the hand-back here.

   The box itself stays 100vw wide, because the app counts tabs from its clientWidth —
   max(1, floor((w - 48) / 120)), i.e. 120px per tab, 48px of chrome — and hides the rest
   behind the views-more menu: a narrow box loses tabs (fault 34). Only the first items of that box are visible — it is
   transparent and pointer-transparent, and its own controls take the events back. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] {
  position: fixed;
  /* On the band's centre line, with NO height of its own — and that is load-bearing. The
     box has to stay viewport-wide (the app counts tabs from its clientWidth), but the drag
     region is decided by the topmost box at a point: a 40px-tall no-drag box across the
     band would take the whole band away from the window manager, and the empty stretch
     stopped moving the window. A zero-height box covers nothing, so only the row's own
     controls — which inherit the hand-back — sit in the band. */
  top: calc(var(--dsh-windows-titlebar-height, 40px) / 2);
  left: var(--dsh-capbar-lead);
  z-index: 1100;
  height: 0;
  width: 100vw;
  min-width: 100vw;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  margin: 0;
  overflow: visible;
  pointer-events: none;
  -webkit-app-region: no-drag;
}
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [data-conversation-tabs],
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [class*="viewTabs"] {
  /* RELATIVE, and this is load-bearing: the Codex UI plugin prepends a
     span[data-dcu-tab-slider] to this list and positions it absolutely at left 0 / top 0, then
     moves it with translateX(tab.left - list.left). That arithmetic only holds when the LIST
     is the slider's containing block. With static the containing block became this fixed row
     instead, so the slider started at the row's left edge and on the row's zero-height centre
     line — the selected tab's background sat ~42px to the left and half a band too low. */
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  width: auto;
  height: auto;
  min-width: 0;
  margin: 0;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}
/* The menubar's button metrics. The label is a block in the app's markup, so the button
   has to be a centred flex box or the text sits at the top of the pill and the hover
   background looks shifted off it. The app keeps its own active underline. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [role="tab"] {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 14px;
  line-height: 1;
  margin: 0;
  pointer-events: auto;
}
/* The views-more menu is an ICON button, not a text item: the menubar's 10px text padding
   would leave its 13px glyph inside a 2px content box (reported as "the ellipsis is
   squeezed"), so it keeps a square box and gets a little room after the last tab. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [class*="viewsMoreAnchor"],
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] button:not([role="tab"]) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  margin: 0 0 0 4px;
  pointer-events: auto;
}
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [role="tab"]:hover,
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] button:hover,
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [aria-expanded="true"] {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
/* The app's indicator is a 2px bar at the button's foot; with the pill metrics it needs to
   sit inside the rounded edge rather than one pixel below it. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [role="tab"]::after {
  bottom: 0;
}
/* The app wraps each tab's LABEL in a Tooltip. In the band the label is right there, and the
   tooltip renders as a light box hanging below it — read as a hover background that is off
   the text. Taking the pointer events off the label (not off the button) leaves the hover
   treatment and the click intact while the tooltip never opens. */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="_tabs"] [role="tab"] [class*="tabLabel"] {
  pointer-events: none;
}

/* ── 4. the band keeps exactly one thing: the session title ────────────────── */
/* The app renders its own title element CONDITIONALLY (a sessionless header, an open side
   panel, or a host that flattens the header away all mean there is none), so a label of
   ours stands in when it is absent — and the rule below hides that label the moment the
   app's own element is there, so there is never a double title. The app's breadcrumb is
   clickable navigation, so it must not be part of the drag surface; our label is a label
   and makes a natural drag handle. */
/* The title is centred in the room LEFT OVER between the tabs' measured end and the
   fullscreen button — both published by the applier — so it can never sit on top of a
   control. It keeps ONE switch (--dsh-capbar-title-visibility), written from the room it
   actually measured: an earlier revision had a media query and a class disagreeing about
   whether the title was visible (fault 28). */
html[data-windows-titlebar] body.dsh-capbar-on header [class*="crumbs"] {
  position: fixed;
  top: 0;
  left: var(--dsh-capbar-title-left, var(--dsh-capbar-lead));
  right: var(--dsh-capbar-title-right, 40%);
  height: var(--dsh-windows-titlebar-height, 40px);
  /* Visibility, NOT display: the app's breadcrumb is a flex row whose vertical centring
     comes from its own display: flex + align-items: center. Overriding display to hide it
     dropped that centring, and the title sat ~5px high (measured from a screenshot: ink
     centre 15.5 instead of 20 in a 40px band). */
  visibility: var(--dsh-capbar-title-visibility, visible);
  margin-inline: auto;
  width: max-content;
  max-width: var(--dsh-capbar-title-max, 40vw);
  overflow: hidden;
  -webkit-app-region: no-drag;
}
body.dsh-capbar-on .dsh-capbar-title {
  position: fixed;
  top: 0;
  left: var(--dsh-capbar-title-left, var(--dsh-capbar-lead));
  right: var(--dsh-capbar-title-right, 40%);
  height: var(--dsh-windows-titlebar-height, 40px);
  visibility: var(--dsh-capbar-title-visibility, visible);
  margin-inline: auto;
  width: max-content;
  max-width: var(--dsh-capbar-title-max, 40vw);
  padding: 0 8px;
  box-sizing: border-box;
  line-height: var(--dsh-windows-titlebar-height, 40px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  -webkit-app-region: drag;
}
body.dsh-capbar-on:has(header [class*="crumbs"]) .dsh-capbar-title {
  display: none;
}

/* ── 5. the fullscreen button: on the caption buttons' line, not in the rail ── */
/* Asked for at the live review: it belongs next to the native minimise/maximise/close —
   same centre line, same gap — rather than at the bottom of the rail. That places it back
   inside the caption band, which is why it carries the second and last app-region
   declaration in this sheet: an explicit no-drag, the thing that keeps a control in the
   band clickable (fault 29). It is out of the rail's column flow by being fixed. */
body.dsh-capbar-on button.dsh-capbar-fullscreen {
  position: fixed;
  top: calc((var(--dsh-windows-titlebar-height, 40px) - var(--dsh-capbar-button)) / 2);
  right: calc(var(--dsh-capbar-controls) + var(--dsh-capbar-gap));
  z-index: 31;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--dsh-capbar-button);
  height: var(--dsh-capbar-button);
  /* Neutral resets only — a bare button would otherwise paint the UA's own chrome.
     No hover/active treatment, no colour of our own: the icon inherits. */
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

/* ── 6. the conversation keeps clear of the rail ───────────────────────────── */
/* The rail is fixed and as wide as the variable below, so the app's own frame gives up
   that width instead of letting the controls sit on top of the transcript. */
body.dsh-capbar-on {
  padding-right: var(--dsh-capbar-rail);
}

/* ── 6b. compact rail: semantic icons, not a blanket text massacre ──────────── */
/* On by default; set --dsh-capbar-compact: 0 to restore full labels. Semantic compression:

     - preset: keep its existing icon, hide the localized text;
     - subagent / background job: keep state dot + chevron, replace their one-piece
       localized count label with its integer;
     - directory split: stack its existing primary/menu buttons vertically;
     - views-more and right-sidebar controls are already icon-only and stay untouched. */
body.dsh-capbar-compact [${PRESET_ATTR}] {
  box-sizing: border-box;
  width: var(--dsh-capbar-compact-box);
  min-width: var(--dsh-capbar-compact-box);
  overflow: hidden;
  white-space: nowrap;
  /* The owning component explicitly sets 12px in a separately injected stylesheet. This
     switch intentionally wins regardless of which stylesheet arrives last: hiding that localized text is
     what compact mode means, and the component's SVG keeps its own 14px size. */
  font-size: 0 !important;
  justify-content: center;
}
body.dsh-capbar-compact [${PRESET_ATTR}] > svg {
  flex: none;
}
body.dsh-capbar-compact header [class*="headerActions"] button[aria-haspopup="tree"] {
  box-sizing: border-box;
  width: var(--dsh-capbar-compact-box);
  min-width: var(--dsh-capbar-compact-box);
  justify-content: center;
  padding-inline: 4px;
}
/* The original count span is still in the accessibility tree; only its ink is hidden. */
body.dsh-capbar-compact header [class*="headerActions"] button[aria-haspopup="tree"] span:not(:has(svg)) {
  display: none;
}
body.dsh-capbar-compact header [class*="headerActions"] button[aria-haspopup="tree"]::after {
  content: attr(${SUBAGENT_COUNT_ATTR});
  font: inherit;
  line-height: 1;
}
/* Background jobs have the same semantic shape as the subagent trigger (state dot +
   localized count + chevron), but no aria-haspopup. The applier marks the trigger after
   identifying its running/settled count label and publishes only the integer. The full
   status stays in aria-label/title and appears in the transient bubble. */
body.dsh-capbar-compact [${JOB_ATTR}] {
  box-sizing: border-box;
  width: var(--dsh-capbar-compact-box);
  min-width: var(--dsh-capbar-compact-box);
  justify-content: center;
  padding-inline: 2px;
}
body.dsh-capbar-compact [${JOB_ATTR}] span:not(:has(svg)) {
  display: none;
}
body.dsh-capbar-compact [${JOB_ATTR}]::after {
  content: attr(${JOB_COUNT_ATTR});
  font: inherit;
  line-height: 1;
}

/* The bubble is fixed to the viewport and therefore never participates in the rail's
   flex sizing. Its vertical position is an inline top written from the trigger's box. The
   appearance only uses existing app tokens — no custom colour, blur, animation or shadow. */
body.dsh-capbar-on .${BUBBLE_CLASS} {
  position: fixed;
  right: calc(var(--dsh-capbar-rail) + 8px);
  z-index: 1200;
  max-width: 280px;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-elevated);
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
body.dsh-capbar-on .${BUBBLE_CLASS}[hidden] {
  display: none;
}

/* The file opener exposes the exact split control as data-open-target="directory". Its
   two DIRECT children are the primary file-manager button and the menu chevron — confirmed
   from the live DOM, so no wrapper discovery or CSS-module hash is needed. The owner styles
   the split as a row; compact mode wins the axis explicitly. */
body.dsh-capbar-compact header [data-open-target="directory"] {
  box-sizing: border-box;
  display: inline-flex;
  flex-direction: column !important;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: var(--dsh-capbar-compact-box);
  /* The owner's horizontal split is height:24px + overflow:hidden. With a column, two
     controls cannot fit into that old one-row box: the chevron was correctly stacked but
     clipped away. Give the semantic split its natural column height and let its own border
     contain both rows. */
  height: auto !important;
  min-height: 38px;
  overflow: visible !important;
}
body.dsh-capbar-compact header [data-open-target="directory"] > button {
  box-sizing: border-box;
  flex: 0 0 19px;
  width: 100%;
  min-width: 0;
  height: 19px;
  min-height: 0;
  justify-content: center;
  padding: 0;
  margin: 0;
  /* The owner's horizontal split draws border-left on the chevron. Once the buttons stack,
     that remains a stray vertical line to the arrow's left. No replacement divider was
     requested, so compact mode removes it rather than rotating it to border-top. */
  border-left: 0;
}

/* Compact clusters are exact-width columns: no inherited horizontal padding or minimum
   can make the 30px controls look wider than their 30px box. */
body.dsh-capbar-compact header [class*="headerActions"],
body.dsh-capbar-compact header [class*="headerUtilities"],
body.dsh-capbar-compact header [class*="headerCorner"] {
  box-sizing: border-box;
  width: var(--dsh-capbar-rail);
  min-width: 0;
  padding-inline: 0;
  margin-inline: 0;
}

/* ── 7. the measurements the rules above read ──────────────────────────────── */
body.dsh-capbar-on {
  /* Full-label default. The compact override comes AFTER this rule — same specificity,
     so source order is the switch. Putting compact first silently left the rail at 104px. */
  --dsh-capbar-rail: 104px;
  /* Compact by default; set to 0 in devtools to restore full labels and the 104px rail. */
  --dsh-capbar-compact: 1;
  /* Click target of each semantic compact control — comfortably larger than its icon. */
  --dsh-capbar-compact-box: 30px;
  --dsh-capbar-rail-gap: 6px;
  /* The fullscreen button's box, and the gap between it and the native caption buttons —
     the same shape the app uses for its own caption controls. */
  --dsh-capbar-button: 28px;
  --dsh-capbar-gap: 10px;
  /* Where the band's row starts, before the applier has measured the application menu: the
     menu's own left edge plus the width it falls back to (zh menus are ~98px wide, en ~154px).
     The tab row is positioned from this, so it sits immediately right of 应用 / 编辑. */
  --dsh-capbar-lead: calc(var(--dsh-windows-menu-start, 48px) + 134px);
  /* Reserved for the native caption buttons: the band's title has to stay left of them.
     The window-controls overlay reports the draggable area it leaves; the floor is
     3 x 46px on Windows 11. */
  --dsh-capbar-controls: max(${CAPTION_FALLBACK_PX}px, calc(100vw - env(titlebar-area-width, 100vw)));
}
/* The whole rail can now be an icon rail instead of a text rail. MUST follow the
   full-label default above: both selectors have one class, so the later rule wins. */
body.dsh-capbar-compact {
  /* 30px controls in a 42px rail: 4px on the content side, 8px at the screen edge. */
  --dsh-capbar-rail: 42px;
}

/* Fullscreen has no caption buttons, so nothing has to be reserved for them. */
html[data-windows-titlebar][data-fullscreen] body.dsh-capbar-on {
  --dsh-capbar-controls: 0px;
}
`;
/** Localised label without pulling in the locale service for two strings. */ function label(active) {
    const chinese = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
    if (chinese) return active ? '退出全屏' : '全屏';
    return active ? 'Exit fullscreen' : 'Fullscreen';
}
/**
 * Fullscreen toggle contributed to the conversation header.
 *
 * The desktop build ships no fullscreen entry point of its own: the frameless
 * caption only offers minimize/maximize/close, the application menu carries just
 * `toggleDevTools` (F12) with no `togglefullscreen` role, and the main process
 * never calls `setFullScreen(true)`. Its window is still fullscreenable and the
 * preload mirrors the OS state onto `<html data-fullscreen>`, so the app's own
 * fullscreen-aware layout kicks in as soon as the DOCUMENT goes fullscreen —
 * which is what this button asks for through the Fullscreen API.
 */ /**
 * A 16px stroke glyph at the caption controls' weight.
 *
 * The two states of the toggle differ only in their path, so they share this
 * instead of repeating the same eight SVG attributes twice.
 */ function Glyph({ d }) {
    return /*#__PURE__*/ (0, _jsxruntime.jsx)("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        children: /*#__PURE__*/ (0, _jsxruntime.jsx)("path", {
            d: d
        })
    });
}
/** Arrows pointing out of / into the four corners. */ const GLYPH_ENTER = 'M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5';
const GLYPH_EXIT = 'M9 4v5H4M15 20v-5h5M4 15h5v5M20 9h-5V4';
function FullscreenToggle() {
    const [active, setActive] = (0, _react.useState)(false);
    (0, _react.useEffect)(()=>{
        const sync = ()=>setActive(document.fullscreenElement !== null);
        sync();
        document.addEventListener('fullscreenchange', sync);
        return ()=>document.removeEventListener('fullscreenchange', sync);
    }, []);
    const toggle = (0, _react.useCallback)(()=>{
        const request = document.fullscreenElement === null ? document.documentElement.requestFullscreen() : document.exitFullscreen();
        // A rejected request (no user gesture, unsupported surface) must not bubble
        // out of the click handler as an unhandled rejection.
        void request?.catch?.(()=>undefined);
    }, []);
    const text = label(active);
    return /*#__PURE__*/ (0, _jsxruntime.jsx)("button", {
        type: "button",
        className: "dsh-capbar-fullscreen",
        onClick: toggle,
        "aria-pressed": active,
        title: text,
        "aria-label": text,
        children: /*#__PURE__*/ (0, _jsxruntime.jsx)(Glyph, {
            d: active ? GLYPH_EXIT : GLYPH_ENTER
        })
    });
}
/** Retract whatever a service returned: a function or a `{ dispose }` handle. */ function retractHandle(handle) {
    if (typeof handle === 'function') handle();
    else if (handle && typeof handle.dispose === 'function') {
        handle.dispose();
    }
}
/**
 * Seat the rail and the band's title, and hand back the retraction.
 *
 * Separated from `apply` so the smoke test can drive it against a fake DOM.
 */ function applyCore(client) {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    if (!body) return undefined;
    /**
   * Retraction state.
   *
   * `disposed` is the belt to the timer's braces: a retry that has already been dispatched
   * cannot be cancelled, so every writer below checks it first.
   */ let disposed = false;
    const timeouts = new Set();
    /** window.setTimeout that the disposer can actually cancel. */ const after = (ms, run)=>{
        const id = window.setTimeout(()=>{
            timeouts.delete(id);
            run();
        }, ms);
        timeouts.add(id);
    };
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-plugin', CLIENT_ID);
    style.textContent = SHEET;
    document.head.appendChild(style);
    body.classList.add(BODY_CLASS);
    // The marker Codex UI already reads: it means "something compat-aware is using the
    // caption band", and it responds by keeping its own band controls clear of it. The
    // strip height is the same variable the rest of our sheet reads.
    body.setAttribute('data-dsh-title-bar-compat', '');
    body.style.setProperty('--dsh-title-bar-strip', 'var(--dsh-windows-titlebar-height, 40px)');
    /**
   * The band's title.
   *
   * The app renders its own title element conditionally, so this label stands in when it
   * is absent — and SHEET hides it again the moment the app's own element is there, so the
   * two can never both show.
   */ const titleEl = document.createElement('div');
    titleEl.className = TITLE_CLASS;
    let appliedTitle = '';
    const syncTitle = ()=>{
        if (disposed) return;
        const raw = typeof document.title === 'string' ? document.title : '';
        const at = raw.lastIndexOf(TITLE_SEPARATOR);
        const next = at > 0 ? raw.slice(0, at).trim() : '';
        if (next === appliedTitle) return;
        appliedTitle = next;
        titleEl.textContent = next;
        debug(`[${CLIENT_ID}] band title -> ${next || '(none)'}`);
    };
    body.appendChild(titleEl);
    syncTitle();
    // The app rewrites <title> whenever the selected session or the active panel changes.
    const titleObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(syncTitle);
    titleObserver?.observe(document.head, {
        childList: true,
        subtree: true,
        characterData: true
    });
    // One latest-state bubble: fixed to the trigger, never part of the rail's layout.
    const bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = BUBBLE_CLASS;
    bubble.hidden = true;
    body.appendChild(bubble);
    let bubbleTimer;
    let bubbleTarget;
    const hideBubble = ()=>{
        if (bubbleTimer !== undefined) window.clearTimeout(bubbleTimer);
        bubbleTimer = undefined;
        bubbleTarget = undefined;
        bubble.hidden = true;
    };
    const showBubble = (target, text)=>{
        if (disposed || !text) return;
        const box = target.getBoundingClientRect();
        bubble.textContent = text;
        bubble.setAttribute('aria-label', text);
        bubble.style.top = `${Math.max(8, Math.round(box.top + box.height / 2 - 17))}px`;
        bubbleTarget = target;
        bubble.hidden = false;
        if (bubbleTimer !== undefined) window.clearTimeout(bubbleTimer);
        bubbleTimer = window.setTimeout(hideBubble, BUBBLE_MS);
    };
    const openBubbleTarget = ()=>{
        const target = bubbleTarget;
        hideBubble();
        target?.click();
    };
    bubble.addEventListener('click', openBubbleTarget);
    // The fullscreen button rides the header's own utilities seat; in the rail it is simply
    // the next item of the column.
    let unregister;
    let injection;
    try {
        const slots = client.slots;
        if (slots) {
            // The loader can hold the injection until its dependency and the slot are both
            // there, which may be AFTER this plugin was retracted — so the callback has to
            // check for that instead of registering into a disposed plugin.
            injection = slots.inject(HEADER_UTILITIES_SLOT, ()=>{
                if (disposed) return undefined;
                unregister = slots.register({
                    name: HEADER_UTILITIES_SLOT,
                    id: `${CLIENT_ID}-fullscreen`,
                    order: UTILITIES_ORDER
                }, FullscreenToggle);
                return unregister;
            });
        }
    } catch (error) {
        console.error(`[${CLIENT_ID}] fullscreen button registration failed:`, error);
    }
    // ── the band's row ─────────────────────────────────────────────────────────
    // Where it starts: measured off the application menu, never guessed (its width follows
    // the locale, and its left edge follows the sidebar and the settings page). The menubar
    // lives in an open shadow root, so the real bar can be read directly; the overlay host
    // stays as a fallback.
    let appliedLead = '';
    const measureLead = ()=>{
        if (disposed) return;
        const host = document.querySelector(MENU_SELECTOR);
        const menubar = host?.shadowRoot?.querySelector('[role="menubar"]') ?? null;
        const rect = (menubar ?? host)?.getBoundingClientRect();
        const next = rect && rect.width > 0 && rect.right > 0 ? `calc(${Math.ceil(rect.right)}px + ${BAND_GAP_PX}px)` : '';
        if (next === appliedLead) return;
        appliedLead = next;
        if (next) body.style.setProperty('--dsh-capbar-lead', next);
        else body.style.removeProperty('--dsh-capbar-lead');
    };
    let resizeObserver;
    const measureTimer = window.setInterval(()=>{
        if (disposed) return;
        const host = document.querySelector(MENU_SELECTOR);
        // The overlay is mounted by the preload, separately from this plugin, and can appear
        // after apply() — so the observer attaches on the first tick that finds it.
        if (host && !resizeObserver && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(measureLead);
            resizeObserver.observe(host);
        }
        measureLead();
    }, MEASURE_INTERVAL_MS);
    measureLead();
    /**
   * How much room the title has, and where it starts.
   *
   * The tab row now lives in the band to the title's left, and the fullscreen button to its
   * right, so the title is centred in what is left over rather than in the whole band. The
   * strip's box is 100vw wide by design (the app counts tabs from it), so the row's end is
   * the right edge of its last visible child, not the box's.
   */ let appliedTitleLeft = '';
    let appliedTitleRight = '';
    let appliedTitleMax = '';
    const placeTitle = ()=>{
        if (disposed) return;
        const strip = document.querySelector(STRIP_SELECTOR);
        if (!strip) return;
        let rowRight = 0;
        for (const child of Array.from(strip.children)){
            const box = child.getBoundingClientRect();
            if (box.width > 0) rowRight = Math.max(rowRight, box.right);
        }
        if (rowRight <= 0) return;
        const from = Math.ceil(rowRight + BAND_GAP_PX);
        const button = document.querySelector(FULLSCREEN_SELECTOR);
        const to = button ? Math.floor(button.getBoundingClientRect().left - BAND_GAP_PX) : null;
        const room = to === null ? 0 : to - from;
        const write = (name, value, applied)=>{
            if (value === applied) return applied;
            body.style.setProperty(name, value);
            return value;
        };
        appliedTitleLeft = write('--dsh-capbar-title-left', `${from}px`, appliedTitleLeft);
        if (to !== null) {
            appliedTitleRight = write('--dsh-capbar-title-right', `${Math.max(0, Math.round(window.innerWidth - to))}px`, appliedTitleRight);
        }
        // ONE switch, written from the measured room — never a media query plus a class, which
        // is what let the title "calculate a position and stay invisible" in fault 28.
        const wanted = to === null || room < TITLE_MIN_ROOM_PX ? 'hidden' : 'visible';
        if (body.style.getPropertyValue('--dsh-capbar-title-visibility') !== wanted) {
            body.style.setProperty('--dsh-capbar-title-visibility', wanted);
            debug(`[${CLIENT_ID}] title ${wanted} (${Math.max(0, room)}px of room from ${from}px)`);
        }
        if (wanted === 'hidden') return;
        appliedTitleMax = write('--dsh-capbar-title-max', `${Math.max(80, Math.round(room - TITLE_ROOM_PADDING_PX))}px`, appliedTitleMax);
    };
    placeTitle();
    const onResize = ()=>{
        if (disposed) return;
        measureLead();
        placeTitle();
    };
    window.addEventListener('resize', onResize);
    /**
   * Silence the app's own tooltip on a band control.
   *
   * They are portalled and open at the band's midline, hanging into the conversation — read
   * as "the hover background does not line up with the text". The tooltip listens on the
   * element itself, so no stylesheet rule can remove it. The event is stopped in the bubble
   * phase, after it reached the element: the CSS hover and the click are untouched, React
   * never sees the hover, and the label moves to a native title so it stays discoverable.
   */ const quieted = new Map();
    const stopHover = (event)=>{
        event.stopPropagation();
    };
    /** Every way the primitive could notice the pointer or the focus. */ const QUIET_EVENTS = [
        'mouseover',
        'pointerover',
        'focusin'
    ];
    const quietTooltip = (el)=>{
        const html = el;
        if (!html || quieted.has(html)) return;
        const label = html.getAttribute('aria-label');
        const addedTitle = Boolean(label) && !html.hasAttribute('title');
        if (addedTitle && label) html.setAttribute('title', label);
        for (const type of QUIET_EVENTS)html.addEventListener(type, stopHover);
        quieted.set(html, addedTitle);
    };
    const quietBandTooltips = ()=>{
        if (disposed) return;
        // Everything in the band's row except the tabs: their labels are on screen and their
        // tooltips are switched off in the sheet instead (SHEET, section 3).
        const selector = 'header [class*="_tabs"] button:not([role="tab"])';
        for (const el of Array.from(document.querySelectorAll(selector)))quietTooltip(el);
    };
    debug(`[${CLIENT_ID}] rail seated`);
    /**
   * Inline overrides, each remembering the value it displaced.
   *
   * The disposer puts that value back, not '': React sets inline styles of its own, and
   * blanking the property would silently drop them on retraction.
   */ const overridden = new Map();
    /** @returns true the first time this property is overridden on this element. */ const override = (el, property, value)=>{
        let before = overridden.get(el);
        if (!before) {
            before = new Map();
            overridden.set(el, before);
        }
        const first = !before.has(property);
        if (first) before.set(property, el.style[property] ?? '');
        el.style[property] = value;
        return first;
    };
    /** Restore one element immediately when it turns out to be app content, not header chrome. */ const releaseOverride = (el)=>{
        const before = overridden.get(el);
        if (!before) return;
        for (const [property, value] of before)el.style[property] = value;
        overridden.delete(el);
    };
    const packColumn = ()=>{
        if (disposed) return;
        const header = document.querySelector(HEADER_SELECTOR);
        if (!header) return;
        const found = [];
        const headerComputed = getComputedStyle(header);
        if (headerComputed.justifyContent !== 'flex-start' && headerComputed.justifyContent !== 'normal') {
            if (override(header, 'justifyContent', 'flex-start')) {
                found.push(`header justify-content:${headerComputed.justifyContent} -> flex-start`);
            }
        }
        // Never sweep the whole subtree. Header slots can mount menus, dialogs and popovers
        // underneath themselves; changing every descendant's flex is what broke menu labels.
        // These are the app's actual header-layout seats/claimers (CSS-module prefixes are
        // stable semantic stems even though their hashes change), including nodes below a
        // display:contents slot wrapper.
        const layoutSelector = [
            '[class*="titleRow"]',
            '[class*="titleCluster"]',
            '[class*="crumbs"]',
            '[class*="headerLeading"]',
            '[class*="headerActions"]',
            '[class*="headerUtilities"]',
            '[class*="headerCorner"]'
        ].join(',');
        for (const el of [
            header,
            ...Array.from(header.querySelectorAll(layoutSelector))
        ]){
            const html = el;
            // Menus/popovers are app content, even when their DOM is mounted under a header slot.
            // The live failure exposed our inline style directly: _itemLabel had
            // style="flex-grow:0", written by this sweep. Restore it now, and never descend with
            // layout neutralisation into any role=menu subtree.
            // closest() is intentional: matching a compound descendant selector against a node
            // proved timing-sensitive when MenuSurface mounts its root, then React seats the item
            // subtree a frame later. Every menuitem has a real [role=menu] ancestor once visible,
            // so closest is the direct semantic question and keeps working after re-renders.
            if (html.closest?.('[role="menu"]')) {
                releaseOverride(html);
                continue;
            }
            const computed = getComputedStyle(el);
            const name = `${html.tagName.toLowerCase()}.${(html.className || '').toString().split(' ')[0] || '?'}`;
            if (Number.parseFloat(computed.flexGrow || '0') > 0) {
                if (override(html, 'flexGrow', '0')) found.push(`${name} flex-grow:${computed.flexGrow}`);
            }
            if (computed.marginLeft === 'auto') {
                if (override(html, 'marginLeft', '0')) found.push(`${name} margin-left:auto`);
            }
        }
        if (found.length > 0) debug(`[${CLIENT_ID}] free-height claimers neutralised: ${found.join(', ')}`);
    };
    packColumn();
    // React re-renders the header and can drop inline styles it did not set itself, so the
    // sweep repeats — slowly, and it is a no-op once nothing claims space. The title text is
    // refreshed from the same tick as a backstop for the observer.
    /**
   * Compact mode is a CUSTOM PROPERTY so devtools can toggle it without a rebuild. The
   * applier mirrors it onto a class (CSS cannot branch on a numeric variable reliably) and
   * keeps the subagent count in sync from the component's own aria-label.
   */ const compactTitles = new Map();
    const compactCounts = new Set();
    const compactJobs = new Set();
    const compactJobTitles = new Set();
    const statusSnapshots = new WeakMap();
    const syncCompact = ()=>{
        if (disposed) return;
        const inline = body.style.getPropertyValue(COMPACT_VAR).trim();
        const computed = getComputedStyle(body);
        const inherited = typeof computed?.getPropertyValue === 'function' ? computed.getPropertyValue(COMPACT_VAR).trim() : '';
        const compact = (inline || inherited) === '1';
        body.classList.toggle(COMPACT_CLASS, compact);
        const presets = Array.from(// A display:contents slot wrapper can sit between headerActions and the component, so
        // this is deliberately descendant, not direct-child. Its exact shape is unique here:
        // AgentPresetLabel is a span with a direct SVG; the subagent control is a button.
        document.querySelectorAll('header [class*="headerActions"] span:has(> svg)'));
        for (const el of presets)if (!el.hasAttribute(PRESET_ATTR)) el.setAttribute(PRESET_ATTR, '');
        const triggers = Array.from(document.querySelectorAll('header [class*="headerActions"] button[aria-haspopup="tree"]'));
        // JobListAction's trigger is the remaining headerActions button with an aria-label,
        // a localized count span and a chevron SVG. It is unrelated to the directory split.
        const jobTriggers = Array.from(document.querySelectorAll('header [class*="headerActions"] button[aria-label]:not([aria-haspopup="tree"]):has(> span):has(> svg)'));
        for (const el of [
            ...presets,
            ...triggers
        ]){
            if (compact) {
                if (!compactTitles.has(el)) {
                    const ownsTitle = el.hasAttribute('title');
                    const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
                    if (!ownsTitle && label) el.setAttribute('title', label.slice(0, 80));
                    compactTitles.set(el, !ownsTitle && Boolean(label));
                }
            } else if (compactTitles.has(el)) {
                if (compactTitles.get(el)) el.removeAttribute('title');
                compactTitles.delete(el);
            }
            if (!compact) el.removeAttribute(PRESET_ATTR);
        }
        for (const el of triggers){
            if (!compact) {
                el.removeAttribute(SUBAGENT_COUNT_ATTR);
                compactCounts.delete(el);
                continue;
            }
            const source = `${el.getAttribute('aria-label') || ''} ${el.textContent || ''}`;
            const count = source.match(/\d+/)?.[0] ?? '';
            if (el.getAttribute(SUBAGENT_COUNT_ATTR) !== count) el.setAttribute(SUBAGENT_COUNT_ATTR, count);
            compactCounts.add(el);
            const status = el.getAttribute('aria-label') || source.trim();
            const before = statusSnapshots.get(el);
            statusSnapshots.set(el, status);
            if (before !== undefined && before !== status) showBubble(el, status);
        }
        for (const el of jobTriggers){
            if (!compact) {
                el.removeAttribute(JOB_ATTR);
                el.removeAttribute(JOB_COUNT_ATTR);
                if (compactJobTitles.has(el)) el.removeAttribute('title');
                compactJobTitles.delete(el);
                compactJobs.delete(el);
                continue;
            }
            const label = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ');
            const count = label.match(/\d+/)?.[0] ?? '';
            if (!el.hasAttribute(JOB_ATTR)) el.setAttribute(JOB_ATTR, '');
            if (el.getAttribute(JOB_COUNT_ATTR) !== count) el.setAttribute(JOB_COUNT_ATTR, count);
            if (label && (!el.hasAttribute('title') || compactJobTitles.has(el))) {
                el.setAttribute('title', label);
                compactJobTitles.add(el);
            }
            compactJobs.add(el);
            const before = statusSnapshots.get(el);
            statusSnapshots.set(el, label);
            // A job trigger only exists when jobs exist, so its first appearance is itself a
            // meaningful transition; later text changes (count/status) replace the bubble.
            if (label && before !== label) showBubble(el, label);
        }
    };
    const refresh = ()=>{
        packColumn();
        syncTitle();
        placeTitle();
        quietBandTooltips();
        syncCompact();
    };
    quietBandTooltips();
    syncCompact();
    let compactQueued = false;
    const compactObserver = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(()=>{
        if (disposed || compactQueued) return;
        compactQueued = true;
        queueMicrotask(()=>{
            compactQueued = false;
            syncCompact();
        });
    });
    compactObserver?.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
            'aria-label'
        ]
    });
    const sweep = window.setInterval(refresh, SWEEP_INTERVAL_MS);
    for (const ms of RETRY_MS)after(ms, refresh);
    return ()=>{
        // Order matters: stop the writers first, then take the state back out.
        disposed = true;
        window.clearInterval(sweep);
        window.clearInterval(measureTimer);
        window.removeEventListener('resize', onResize);
        resizeObserver?.disconnect();
        for (const id of timeouts)window.clearTimeout(id);
        timeouts.clear();
        titleObserver?.disconnect();
        compactObserver?.disconnect();
        hideBubble();
        bubble.removeEventListener('click', openBubbleTarget);
        bubble.remove();
        for (const [el, before] of overridden)for (const [property, value] of before)el.style[property] = value;
        overridden.clear();
        retractHandle(unregister);
        unregister = undefined;
        retractHandle(injection);
        injection = undefined;
        titleEl.remove();
        style.remove();
        body.classList.remove(BODY_CLASS);
        body.removeAttribute('data-dsh-title-bar-compat');
        body.style.removeProperty('--dsh-title-bar-strip');
        body.style.removeProperty('--dsh-capbar-lead');
        body.style.removeProperty('--dsh-capbar-title-left');
        body.style.removeProperty('--dsh-capbar-title-right');
        body.style.removeProperty('--dsh-capbar-title-max');
        body.style.removeProperty('--dsh-capbar-title-visibility');
        for (const [el, addedTitle] of quieted){
            for (const type of QUIET_EVENTS)el.removeEventListener(type, stopHover);
            if (addedTitle) el.removeAttribute('title');
        }
        quieted.clear();
        for (const [el, addedTitle] of compactTitles){
            if (addedTitle) el.removeAttribute('title');
            el.removeAttribute(PRESET_ATTR);
        }
        compactTitles.clear();
        for (const el of compactCounts)el.removeAttribute(SUBAGENT_COUNT_ATTR);
        compactCounts.clear();
        for (const el of compactJobs){
            el.removeAttribute(JOB_ATTR);
            el.removeAttribute(JOB_COUNT_ATTR);
            if (compactJobTitles.has(el)) el.removeAttribute('title');
        }
        compactJobs.clear();
        compactJobTitles.clear();
        body.classList.remove(COMPACT_CLASS);
    };
}
const inject = [
    'slots'
];
function apply(ctx) {
    try {
        return applyCore(ctx ?? {});
    } catch (error) {
        console.error(`[${CLIENT_ID}] apply failed:`, error);
        return undefined;
    }
}

		return module.exports;
	}
});
