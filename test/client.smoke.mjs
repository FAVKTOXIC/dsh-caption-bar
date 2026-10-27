/**
 * Smoke test for the dsh-caption-bar client bundle.
 *
 * Three jobs:
 *
 *   1. drive lib/client.js against a minimal fake DOM and prove it seats the rail and the
 *      band's title — style element, body class, the Codex UI compat marker, the title
 *      label, the slot occupant;
 *   2. prove it all comes back OUT — the disposer `apply()` returns is called and every
 *      side effect is checked gone: sheet, class, marker, title label, observer, timers,
 *      slot registration, inline overrides. A retry that was already scheduled must not
 *      resurrect anything;
 *   3. hold the plugin to its promise. This plugin is POSITIONING-ONLY by contract: no
 *      colours, backgrounds, blur, radii, shadows, opacity or fonts, no `order` and no
 *      `display: contents` (the Codex UI plugin owns those) — and, since everything moved
 *      out of the caption band, no drag-region bookkeeping either.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const failures = [];
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

/* ── a DOM small enough to reason about ─────────────────────────────────────── */

class FakeElement {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.id = '';
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.rect = { width: 0, height: 0, right: 0, left: 0, top: 0, bottom: 0 };
    const properties = new Map();
    const classes = new Set();
    this.style = {
      setProperty: (name, value) => properties.set(name, value),
      removeProperty: (name) => properties.delete(name),
      getPropertyValue: (name) => properties.get(name) ?? '',
      _all: properties,
    };
    this.classList = {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
      toggle: (name, force) => {
        const wanted = force === undefined ? !classes.has(name) : Boolean(force);
        if (wanted) classes.add(name);
        else classes.delete(name);
        return wanted;
      },
      _all: classes,
    };
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  appendChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }
  remove() {
    this.removed = true;
    if (this.parent) this.parent.children = this.parent.children.filter((child) => child !== this);
  }
  get parentElement() {
    return this.parent ?? null;
  }
  getBoundingClientRect() {
    return this.rect;
  }
  addEventListener(type, fn) {
    if (!this.listeners) this.listeners = new Map();
    this.listeners.set(type, fn);
  }
  click() {
    this.clicks = (this.clicks ?? 0) + 1;
    this.listeners?.get('click')?.({ stopPropagation() {} });
  }
  removeEventListener(type) {
    this.listeners?.delete(type);
  }
  /** Descendants, for the free-height sweep. */
  querySelectorAll(selector) {
    const all = [];
    const walk = (el) => {
      for (const child of el.children) {
        all.push(child);
        walk(child);
      }
    };
    walk(this);
    if (selector === '*') return all;
    if (String(selector).includes('[class*="titleRow"]')) {
      const stems = ['titleRow', 'titleCluster', 'crumbs', 'headerLeading', 'headerActions', 'headerUtilities', 'headerCorner'];
      return all.filter((el) => stems.some((stem) => String(el.className).includes(stem)));
    }
    if (selector === 'button') return all.filter((el) => el.tagName === 'BUTTON');
    return [];
  }
  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  closest(selector) {
    if (selector !== '[role="menu"]') return null;
    let el = this;
    while (el) {
      if (el.getAttribute('role') === 'menu') return el;
      el = el.parentElement;
    }
    return null;
  }
  /** What getComputedStyle reports for this element. */
  computed = {
    flexGrow: '0',
    marginLeft: '0px',
    position: 'static',
    display: 'flex',
    paddingRight: '0px',
    justifyContent: 'normal',
  };
}

function installFakeDom(options = {}) {
  const head = new FakeElement('head');
  const body = new FakeElement('body');
  const html = new FakeElement('html');
  html.lang = options.lang ?? 'zh-CN';

  const header = options.headerChildren
    ? Object.assign(new FakeElement('header'), { children: options.headerChildren })
    : null;

  // The application-menu overlay: the preload mounts a host with an open shadow root whose
  // [role=menubar] is the real, measurable bar.
  const menu = options.menubarRight
    ? Object.assign(new FakeElement('div'), { rect: { ...FakeElement.prototype.rect, width: 300, right: options.menubarRight, left: 48 } })
    : null;
  if (menu) {
    menu.shadowRoot = { querySelector: (selector) => (selector === '[role="menubar"]' ? menu : null) };
  }

  const strip = options.stripChildren
    ? Object.assign(new FakeElement('div'), { className: 'x_tabs', children: options.stripChildren })
    : null;
  const fullscreenButton = Object.assign(new FakeElement('button'), {
    className: 'dsh-capbar-fullscreen',
    rect: { width: 28, height: 28, left: options.buttonLeft ?? 1200, right: (options.buttonLeft ?? 1200) + 28, top: 6, bottom: 34 },
  });

  const document = {
    head,
    body,
    documentElement: html,
    fullscreenElement: null,
    title: options.title ?? '',
    createElement: (tag) => new FakeElement(tag),
    querySelectorAll: () => options.quietButtons ?? [],
    querySelector: (selector) => {
      const value = String(selector);
      if (value === 'div[data-windows-menu]') return menu;
      if (value.includes('_tabs')) return strip;
      if (value.includes('dsh-capbar-fullscreen')) return fullscreenButton;
      if (value.includes('header')) return header;
      return null;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const intervals = new Map();
  const timeouts = new Map();
  const listeners = new Map();
  /**
   * Timers are keyed by a made-up id, not by their delay: two retries can share a delay,
   * and a delay-keyed map would silently drop one of them — the same shape of bug the
   * disposer test exists to catch.
   */
  let nextTimerId = 1;
  const window = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
    setInterval: (fn, ms) => {
      const id = nextTimerId++;
      intervals.set(id, { fn, ms });
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    setTimeout: (fn, ms) => {
      const id = nextTimerId++;
      timeouts.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timeouts.delete(id),
  };

  return { document, window, head, body, html, header, strip, menu, intervals, timeouts, listeners };
}

function loadBundle(dom) {
  const source = readFileSync(join(root, 'lib', 'client.js'), 'utf8');
  let loaded;
  const logs = [];
  const observers = [];
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      observers.push(this);
    }
    observe(target, init) {
      this.observed.push({ target, init });
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const sandbox = {
    window: Object.assign(dom.window, {
      __ModuleLoader__: {
        load: (entry) => {
          loaded = { id: entry.id, exports: entry.factory(require) };
        },
      },
    }),
    document: dom.document,
    MutationObserver: FakeMutationObserver,
    getComputedStyle: (el) => ({
      ...el.computed,
      getPropertyValue: (name) => el.style?.getPropertyValue(name) ?? '',
    }),
    console: { log: (...args) => logs.push(args.join(' ')), error: () => {} },
  };
  const factory = new Function(
    'window',
    'document',
    'MutationObserver',
    'getComputedStyle',
    'queueMicrotask',
    'console',
    source,
  );
  factory(
    sandbox.window,
    sandbox.document,
    sandbox.MutationObserver,
    sandbox.getComputedStyle,
    (fn) => fn(),
    sandbox.console,
  );
  return { source, loaded, logs, observers };
}

/** Registration bookkeeping the fake slots service records. */
function fakeSlots() {
  const calls = { inject: [], register: [] };
  return {
    calls,
    service: {
      inject: (name, load) => {
        calls.inject.push(name);
        calls.register.push(load());
        return {
          dispose: () => {
            calls.injectionDisposed = true;
          },
        };
      },
      register: (options, component) => {
        calls.register.push({ options, component });
        return () => {
          calls.unregistered = true;
        };
      },
    },
  };
}

/* ── assertions ─────────────────────────────────────────────────────────────── */

const SESSION_TITLE = '会话标题';
const PRODUCT_TITLE = 'DeepSeek Harness';

const dom = installFakeDom({ title: `${SESSION_TITLE} \u2014 ${PRODUCT_TITLE}` });
const { source, loaded, observers } = loadBundle(dom);
const slots = fakeSlots();

console.log('bundle');
check('wrapped for the module loader with our id', /__ModuleLoader__\.load\(\{\s*id: "dsh-caption-bar"/.test(source));
check('exports apply()', typeof loaded.exports.apply === 'function');
check('exports inject[]', Array.isArray(loaded.exports.inject) && loaded.exports.inject.includes('slots'));

const retract = loaded.exports.apply({ slots: slots.service });

const style = dom.head.children.find((el) => el.id === 'dsh-caption-bar-style');
const sheet = style?.textContent ?? '';
const titleEl = dom.body.children.find((el) => String(el.className).includes('dsh-capbar-title'));

console.log('seating');
check('apply hands the disposer back to the host', typeof retract === 'function', typeof retract);
check('style element injected', Boolean(style));
check('body class applied', dom.body.classList.contains('dsh-capbar-on'));
check('Codex UI compat marker applied', dom.body.hasAttribute('data-dsh-title-bar-compat'));
check(
  'strip height published for that plugin',
  dom.body.style.getPropertyValue('--dsh-title-bar-strip') === 'var(--dsh-windows-titlebar-height, 40px)',
);
check('slot injected', slots.calls.inject.includes('conversation.session.header.utilities'));
const registration = slots.calls.register.find((entry) => entry && entry.options);
check(
  'fullscreen button registered with a stable id',
  registration?.options?.id === 'dsh-caption-bar-fullscreen' && registration.options.order === 90,
  JSON.stringify(registration?.options ?? null),
);

console.log('the band keeps one thing: the session title');
check('a title label is seated in the band', Boolean(titleEl));
check('and it carries the session title from document.title', titleEl?.textContent === SESSION_TITLE, titleEl?.textContent);
check('the head is watched for title changes', observers[0]?.observed[0]?.target === dom.head);
{
  dom.document.title = `另一个会话 \u2014 ${PRODUCT_TITLE}`;
  observers[0]?.callback();
  check('a title change updates the label', titleEl?.textContent === '另一个会话', titleEl?.textContent);
  dom.document.title = PRODUCT_TITLE;
  observers[0]?.callback();
  check('with no session open the label is empty, not the product name', titleEl?.textContent === '', titleEl?.textContent);
  dom.document.title = `${SESSION_TITLE} \u2014 ${PRODUCT_TITLE}`;
  observers[0]?.callback();
}

console.log('geometry: a vertical rail outside the caption band');
const railRule = sheet.match(/body\.dsh-capbar-on \[data-slot="conversation\.header"\] header,[\s\S]*?\n\}/)?.[0] ?? '';
check('the rail has its own rule', railRule !== '', railRule.slice(0, 60));
check(
  'the rail starts below the band and runs to the window edge',
  /position: fixed;/.test(railRule) &&
    /top: var\(--dsh-windows-titlebar-height, 40px\);/.test(railRule) &&
    /right: 0;/.test(railRule) &&
    /bottom: 0;/.test(railRule),
);
check(
  'the rail is a column as wide as its variable',
  /width: var\(--dsh-capbar-rail\);/.test(railRule) && /flex-direction: column;/.test(railRule),
);
check('the rail never claims a drag region', !/app-region/.test(railRule), railRule.match(/app-region[^;]*/)?.[0]);
check('the rail does not set a height (the app owns that)', !/\bheight:/.test(railRule), railRule.match(/\bheight:[^;]+/)?.[0]);
check(
  'the header stacks its clusters into columns',
  /header \[class\*="headerUtilities"\][\s\S]*?flex-direction: column;/.test(sheet),
);
check(
  'the view tabs keep a box wide enough for all of them',
  // The app renders max(1, floor((clientWidth - 48) / 120)) tabs, so the box is sized to the
  // viewport and the app's own per-tab allowance is quoted where it is used.
  /\[class\*="_tabs"\] \{[\s\S]*?width: 100vw;/.test(sheet) &&
    /\[class\*="_tabs"\] \{[\s\S]*?min-width: 100vw;/.test(sheet) &&
    /120px per tab, 48px of chrome/.test(sheet),
);
check(
  'the tab row sits on the band, right after the application menu',
  /\[class\*="_tabs"\] \{[\s\S]*?position: fixed;[\s\S]*?top: calc\(var\(--dsh-windows-titlebar-height, 40px\) \/ 2\);[\s\S]*?left: var\(--dsh-capbar-lead\);/.test(
    sheet,
  ) && /--dsh-capbar-lead: calc\(var\(--dsh-windows-menu-start, 48px\) \+ 134px\);/.test(sheet),
);
const stripRowRule = sheet.match(/body\.dsh-capbar-on header \[class\*="_tabs"\] \{[\s\S]*?\n\}/)?.[0] ?? '';
check(
  'but its box has no height, so it cannot take the band from the window manager',
  // The drag region follows the topmost box at a point: a 40px-tall no-drag box across the
  // band made the empty stretch stop dragging the window.
  /height: 0;/.test(stripRowRule) && !/height: var\(/.test(stripRowRule),
  stripRowRule.slice(0, 120),
);
check(
  'the tab row is a row again, with the menubar metrics',
  /\[class\*="_tabs"\] \{[\s\S]*?flex-direction: row;[\s\S]*?gap: 2px;/.test(sheet) &&
    /\[class\*="_tabs"\] \[role="tab"\] \{[\s\S]*?height: 28px;[\s\S]*?padding: 0 10px;[\s\S]*?border-radius: 6px;/.test(sheet),
);
check(
  'the tab list is a positioned container for the Codex UI selection slider',
  // The slider is absolutely positioned and moved with translateX(tab.left - list.left);
  // that only lands on the tab when this list is its containing block.
  /\[data-conversation-tabs\][\s\S]*?position: relative;/.test(sheet) &&
    !/\[data-conversation-tabs\][\s\S]*?position: static;/.test(sheet),
);
check(
  'the tabs carry no tooltip (their labels are already in the band)',
  /\[class\*="_tabs"\] \[role="tab"\] \[class\*="tabLabel"\] \{\s*pointer-events: none;/.test(sheet),
);
check(
  'a tab label is centred in its pill (the app renders it as a block)',
  /\[class\*="_tabs"\] \[role="tab"\] \{[\s\S]*?display: flex;[\s\S]*?align-items: center;[\s\S]*?justify-content: center;/.test(sheet),
);
check(
  'the views-more menu keeps a square icon box instead of the text padding',
  /\[class\*="_tabs"\] \[class\*="viewsMoreAnchor"\],[\s\S]*?width: 28px;[\s\S]*?height: 28px;[\s\S]*?padding: 0;/.test(sheet),
);
check(
  'and it copies the menubar hover treatment',
  /\[class\*="_tabs"\] \[role="tab"\]:hover[\s\S]*?background: var\(--dsw-alias-interactive-bg-hover\);[\s\S]*?color: var\(--dsw-alias-label-primary\);/.test(
    sheet,
  ),
);
check(
  'the band row hands the drag region back on its container (the menubar shape)',
  /\[class\*="_tabs"\] \{[\s\S]*?-webkit-app-region: no-drag;/.test(sheet),
);
check(
  'and its own controls take pointer events back',
  /\[class\*="_tabs"\] \[role="tab"\] \{[\s\S]*?pointer-events: auto;/.test(sheet) &&
    /\[class\*="_tabs"\] \[class\*="viewsMoreAnchor"\],[\s\S]*?pointer-events: auto;/.test(sheet),
);
check(
  'the header lookup keeps a suffix on BOTH of its arms',
  // Appending to a two-arm selector only suffixed the last arm, so the strip lookup resolved
  // to the header itself and the title measured a nonsense room (it stayed hidden).
  /\[data-slot="conversation\.header"\] header \[class\*="_tabs"\], header:has\(\[role="tablist"\]\) \[class\*="_tabs"\]/.test(
    source,
  ),
);

const bandTitleRule = sheet.match(/body\.dsh-capbar-on \.dsh-capbar-title \{[\s\S]*?\n\}/)?.[0] ?? '';
check(
  'the band title is centred in the room the applier measured',
  /left: var\(--dsh-capbar-title-left, var\(--dsh-capbar-lead\)\)/.test(bandTitleRule) &&
    /right: var\(--dsh-capbar-title-right, /.test(bandTitleRule) &&
    /margin-inline: auto;/.test(bandTitleRule) &&
    /max-width: var\(--dsh-capbar-title-max, /.test(bandTitleRule),
  bandTitleRule.slice(0, 120),
);
check(
  'the title switch is visibility, not display (the app breadcrumb is a flex row)',
  !/@media/.test(sheet) &&
    /visibility: var\(--dsh-capbar-title-visibility, visible\)/.test(sheet) &&
    !/--dsh-capbar-title-display/.test(sheet),
);
check(
  'the app own title takes over from ours when it renders one',
  /body\.dsh-capbar-on:has\(header \[class\*="crumbs"\]\) \.dsh-capbar-title \{\s*display: none;/.test(sheet),
);
check(
  'the app breadcrumb is not a drag surface (it is clickable)',
  /header \[class\*="crumbs"\] \{[\s\S]*?-webkit-app-region: no-drag;/.test(sheet),
);
check('our label is a drag handle', /body\.dsh-capbar-on \.dsh-capbar-title \{[\s\S]*?-webkit-app-region: drag;/.test(sheet));
check(
  'the conversation column gives up the rail width',
  /body\.dsh-capbar-on \{\s*padding-right: var\(--dsh-capbar-rail\);/.test(sheet),
);
check(
  'the fullscreen button is back on the caption buttons line',
  /button\.dsh-capbar-fullscreen \{[\s\S]*?position: fixed;/.test(sheet) &&
    /top: calc\(\(var\(--dsh-windows-titlebar-height, 40px\) - var\(--dsh-capbar-button\)\) \/ 2\)/.test(sheet) &&
    /right: calc\(var\(--dsh-capbar-controls\) \+ var\(--dsh-capbar-gap\)\)/.test(sheet),
);
check(
  'and it hands the caption region back (a control in the band must)',
  /button\.dsh-capbar-fullscreen \{[\s\S]*?-webkit-app-region: no-drag;/.test(sheet),
);
check(
  'the preset is marked structurally and its explicit 12px label cannot win back',
  /document\.querySelectorAll\('header \[class\*="headerActions"\] span:has\(> svg\)'\)/.test(source) &&
    /body\.dsh-capbar-compact \[data-dsh-capbar-preset\][\s\S]*?font-size: 0 !important;/.test(sheet),
);
check(
  'background jobs have a fixed semantic count control',
  /body\.dsh-capbar-compact \[data-dsh-capbar-job\][\s\S]*?width: var\(--dsh-capbar-compact-box\);/.test(sheet) &&
    /\[data-dsh-capbar-job\]::after \{[\s\S]*?content: attr\(data-dsh-capbar-job-count\);/.test(sheet),
);
check(
  'the status bubble is fixed outside layout and uses app tokens only',
  /\.dsh-capbar-status-bubble \{[\s\S]*?position: fixed;[\s\S]*?right: calc\(var\(--dsh-capbar-rail\) \+ 8px\);/.test(sheet) &&
    /background: var\(--dsw-alias-bg-elevated\);/.test(sheet) &&
    /border: 1px solid var\(--dsw-alias-border-l2\);/.test(sheet) &&
    !/\.dsh-capbar-status-bubble \{[\s\S]*?(?:box-shadow|filter|animation|transition):/.test(sheet),
);
check(
  'the compact rail override comes after the full-label default (same specificity)',
  sheet.indexOf('body.dsh-capbar-compact {') >
    sheet.indexOf('body.dsh-capbar-on {', sheet.indexOf('7. the measurements')),
  'compact rule must be later or 104px wins',
);
check(
  'compact controls leave six pixels on each side',
  /--dsh-capbar-rail: 42px;/.test(sheet) && /--dsh-capbar-compact-box: 30px;/.test(sheet) &&
    /body\.dsh-capbar-compact header \[class\*="headerActions"\][\s\S]*?padding-inline: 0;/.test(sheet),
);
check(
  'compact mode narrows the rail and keeps semantic control boxes stable',
  /body\.dsh-capbar-compact \{[\s\S]*?--dsh-capbar-rail: 42px;/.test(sheet) &&
    /--dsh-capbar-compact: 1;/.test(sheet) &&
    /--dsh-capbar-compact-box: 30px;/.test(sheet),
);
check(
  'the subagent count is preserved by a semantic replacement, not lost with the label',
  /button\[aria-haspopup="tree"\]::after \{[\s\S]*?content: attr\(data-dsh-capbar-subagent-count\);/.test(sheet),
);
check(
  'the live directory split is the vertical file-control wrapper',
  /body\.dsh-capbar-compact header \[data-open-target="directory"\] \{[\s\S]*?flex-direction: column !important;/.test(
    sheet,
  ) && /\[data-open-target="directory"\] > button \{[\s\S]*?flex: 0 0 19px;/.test(sheet),
);
check(
  'the horizontal split divider is gone in the vertical layout',
  /\[data-open-target="directory"\] > button \{[\s\S]*?border-left: 0;/.test(sheet) &&
    !/\[data-open-target="directory"\] > button \{[\s\S]*?border-top:/.test(sheet),
);
check(
  'the old 24px horizontal box cannot clip the two vertical rows',
  /\[data-open-target="directory"\] \{[\s\S]*?height: auto !important;[\s\S]*?min-height: 38px;[\s\S]*?overflow: visible !important;/.test(
    sheet,
  ) && /\[data-open-target="directory"\] > button \{[\s\S]*?height: 19px;/.test(sheet),
);
check(
  'the compact selectors still leave the sidebar and views-more controls alone',
  !/data-sidebar-right-expand|viewsMore/.test(
    sheet.match(/6b\. compact rail:[\s\S]*?7\. the measurements/)?.[0] ?? '',
  ),
);
check(
  'the rail is wide enough for the widest chip',
  /--dsh-capbar-rail: 104px;/.test(sheet) && /body\.dsh-capbar-on \{\s*padding-right: var\(--dsh-capbar-rail\);/.test(sheet),
);
check(
  'a label that still does not fit wraps in balanced lines',
  /header \[class\*="headerUtilities"\] span[\s\S]*?text-wrap: balance;/.test(sheet) &&
    /header \[class\*="headerUtilities"\] span[\s\S]*?line-height: 1\.25;/.test(sheet),
);
check(
  'caption button width comes from the window-controls overlay',
  /--dsh-capbar-controls: max\(138px, calc\(100vw - env\(titlebar-area-width, 100vw\)\)\)/.test(sheet),
);
check('fullscreen reserves nothing for absent caption buttons', /\[data-fullscreen\][^{]*\{[^}]*--dsh-capbar-controls: 0px/.test(sheet));
check('the stock header hairline removed (the one agreed exception)', /border-bottom: none;/.test(sheet));

console.log('stays positioning-only');
const declarations = [...sheet.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/g)].map((m) => [m[1], m[2].trim()]);
const forbidden = [
  ['backdrop-filter', null],
  ['filter', null],
  ['box-shadow', null],
  ['border-radius', null],
  ['opacity', null],
  ['text-shadow', null],
  ['outline', null],
  ['font', null],
  ['font-size', null],
  ['font-weight', null],
  ['transition', null],
  ['animation', null],
  ['fill', null],
  ['stroke', null],
  ['order', null],
];
/**
 * The menubar mirror in section 3 is a deliberate visual change: the tabs are styled like
 * the application menu's own buttons, so exactly these declarations are allowed. Anything
 * else that paints or re-typesets is still a failure — this list is the contract.
 */
const mirrorAllowed = new Set([
  'font-size: 14px',
  'line-height: 1',
  'border-radius: 6px',
  'color: var(--dsw-alias-label-secondary)',
  'color: var(--dsw-alias-label-primary)',
  'background: var(--dsw-alias-interactive-bg-hover)',
  /* Opt-in compact mode: hide a localized label, and let the replacement count inherit. */
  'font-size: 0',
  'font: inherit',
  /* Approved status-bubble exception: app tokens only, no custom colour/shadow/blur. */
  'border-radius: var(--dsw-radius-md)',
  'border: 1px solid var(--dsw-alias-border-l2)',
  'background: var(--dsw-alias-bg-elevated)',
  'color: var(--dsw-alias-label-primary)',
]);
const offenders = declarations.filter(
  ([property, value]) =>
    forbidden.some(([name]) => property === name || property.startsWith(`${name}-`)) &&
    !mirrorAllowed.has(`${property}: ${value}`),
);
check('no appearance or ordering declarations', offenders.length === 0, offenders.map(([p, v]) => `${p}: ${v}`).join(' | '));
const colourOffenders = declarations.filter(
  ([property, value]) =>
    ((property === 'color' && value !== 'inherit') ||
      (property.startsWith('background') && value !== 'transparent') ||
      (property.startsWith('border') && !['none', '0'].includes(value))) &&
    !mirrorAllowed.has(`${property}: ${value}`),
);
check('no painted colour of our own', colourOffenders.length === 0, colourOffenders.map(([p, v]) => `${p}: ${v}`).join(' | '));
check(
  'rail label rules explicitly exclude menu surfaces',
  /span:not\(\[role="menu"\] \*\)/.test(sheet),
);
check('does not flatten the header itself', !/display: contents/.test(sheet));
check(
  'internals are only laid out when the Codex UI marker is absent',
  /header:not\(:has\(\[data-dcu-inline-tabs\]\)\)/.test(sheet),
);
const ruled = [...sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
  sel: sel.trim().replace(/\s+/g, ' '),
  body,
}));
const dragRules = ruled.filter((rule) => /-webkit-app-region:\s*drag/.test(rule.body));
const noDragRules = ruled.filter((rule) => /-webkit-app-region:\s*no-drag/.test(rule.body));
check(
  'exactly one drag region exists, and it is the band title label',
  dragRules.length === 1 && dragRules[0].sel === 'body.dsh-capbar-on .dsh-capbar-title',
  dragRules.map((rule) => rule.sel).join(' ; '),
);
check(
  'every band element that must receive clicks hands the region back',
  noDragRules.length === 4 && noDragRules.every((rule) => /_tabs|crumbs|dsh-capbar-fullscreen/.test(rule.sel)),
  noDragRules.map((rule) => rule.sel).join(' ; '),
);

console.log('the band row is measured, and the title lives in what is left');
{
  const tablist = Object.assign(new FakeElement('div'), {
    className: 'x_viewTabs',
    rect: { width: 240, height: 28, left: 380, right: 620, top: 6, bottom: 34 },
  });
  const more = Object.assign(new FakeElement('div'), {
    className: 'x_viewsMoreAnchor',
    rect: { width: 22, height: 22, left: 622, right: 644, top: 9, bottom: 31 },
  });

  const wide = installFakeDom({ menubarRight: 348, stripChildren: [tablist, more], buttonLeft: 1200 });
  wide.window.innerWidth = 1400;
  const wideBundle = loadBundle(wide);
  const retractWide = wideBundle.loaded.exports.apply({ slots: fakeSlots().service });
  check(
    'the row starts right after the measured application menu',
    wide.body.style.getPropertyValue('--dsh-capbar-lead') === 'calc(348px + 10px)',
    wide.body.style.getPropertyValue('--dsh-capbar-lead'),
  );
  check(
    'the title starts after the last tab-row item',
    wide.body.style.getPropertyValue('--dsh-capbar-title-left') === '654px',
    wide.body.style.getPropertyValue('--dsh-capbar-title-left'),
  );
  check(
    'it stops before the fullscreen button',
    wide.body.style.getPropertyValue('--dsh-capbar-title-right') === '210px',
    wide.body.style.getPropertyValue('--dsh-capbar-title-right'),
  );
  check(
    'and it gets exactly the room left over',
    wide.body.style.getPropertyValue('--dsh-capbar-title-visibility') === 'visible' &&
      wide.body.style.getPropertyValue('--dsh-capbar-title-max') === '516px',
    `${wide.body.style.getPropertyValue('--dsh-capbar-title-visibility')} / ${wide.body.style.getPropertyValue('--dsh-capbar-title-max')}`,
  );
  retractWide();

  const narrow = installFakeDom({ menubarRight: 348, stripChildren: [tablist, more], buttonLeft: 800 });
  narrow.window.innerWidth = 1400;
  loadBundle(narrow).loaded.exports.apply({ slots: fakeSlots().service });
  check(
    'too little room switches the title off (one switch, from the measurement)',
    narrow.body.style.getPropertyValue('--dsh-capbar-title-visibility') === 'hidden',
    narrow.body.style.getPropertyValue('--dsh-capbar-title-visibility'),
  );
}

console.log('the band tooltips are silenced without losing the label');
{
  const more = Object.assign(new FakeElement('button'), { className: 'x_viewsMore' });
  more.setAttribute('aria-label', '更多视图');
  const dom = installFakeDom({ quietButtons: [more] });
  const bundle = loadBundle(dom);
  const retract = bundle.loaded.exports.apply({ slots: fakeSlots().service });
  check(
    'the portal tooltip cannot see the pointer or the focus',
    ['mouseover', 'pointerover', 'focusin'].every((type) => more.listeners?.has(type) === true),
    [...(more.listeners?.keys() ?? [])].join(', '),
  );
  check('and the label moves to a native title', more.getAttribute('title') === '更多视图', String(more.getAttribute('title')));
  if (typeof retract === 'function') retract();
  check(
    'the listeners are removed again',
    ['mouseover', 'pointerover', 'focusin'].every((type) => more.listeners?.has(type) !== true),
    [...(more.listeners?.keys() ?? [])].join(', '),
  );
  check('and the title we added goes with it', more.getAttribute('title') === null, String(more.getAttribute('title')));
  check('an aria-label the app owns is left alone', more.getAttribute('aria-label') === '更多视图');
}

console.log('compact mode is semantic, opt-in and reversible');
{
  const preset = Object.assign(new FakeElement('span'), { className: 'x_agentPreset', textContent: '标准模式' });
  const subagent = Object.assign(new FakeElement('button'), { className: 'x_subagentTrigger', textContent: '1 个子智能体' });
  subagent.setAttribute('aria-haspopup', 'tree');
  subagent.setAttribute('aria-label', '1 个子智能体');
  // Real live DOM: span.menuAnchor > div[data-open-target=directory] > two direct buttons.
  const fileMenuAnchor = new FakeElement('span');
  const fileSplit = new FakeElement('div');
  fileSplit.setAttribute('data-open-target', 'directory');
  const fileMain = new FakeElement('button');
  const fileMore = new FakeElement('button');
  fileMore.setAttribute('aria-haspopup', 'menu');
  fileSplit.appendChild(fileMain);
  fileSplit.appendChild(fileMore);
  fileMenuAnchor.appendChild(fileSplit);
  const compactDom = installFakeDom();
  compactDom.body.style.setProperty('--dsh-capbar-compact', '1');
  compactDom.document.querySelectorAll = (selector) => {
    const value = String(selector);
    if (value.includes('button[aria-haspopup="tree"]')) return [subagent];
    if (value.includes('span:has(> svg)')) return [preset];
    return [];
  };
  const compactBundle = loadBundle(compactDom);
  const retractCompact = compactBundle.loaded.exports.apply({ slots: fakeSlots().service });
  check('the variable switches the compact class on', compactDom.body.classList.contains('dsh-capbar-compact'));
  check('the standard-mode label moves to a title', preset.getAttribute('title') === '标准模式', String(preset.getAttribute('title')));
  check('and the preset gets the compact marker', preset.hasAttribute('data-dsh-capbar-preset'));
  check(
    'the subagent trigger keeps its dynamic number',
    subagent.getAttribute('data-dsh-capbar-subagent-count') === '1',
    String(subagent.getAttribute('data-dsh-capbar-subagent-count')),
  );
  check('and its full label stays available on hover', subagent.getAttribute('title') === '1 个子智能体');

  compactDom.body.style.setProperty('--dsh-capbar-compact', '0');
  const sweep = [...compactDom.intervals.values()].find((timer) => timer.ms === 2000)?.fn;
  sweep?.();
  check('the class goes away when the switch is off', !compactDom.body.classList.contains('dsh-capbar-compact'));
  check('titles we added go away too', preset.getAttribute('title') === null && subagent.getAttribute('title') === null);
  check('and the preset marker goes away too', !preset.hasAttribute('data-dsh-capbar-preset'));

  check('and the replacement count is retracted', subagent.getAttribute('data-dsh-capbar-subagent-count') === null);

  compactDom.body.style.setProperty('--dsh-capbar-compact', '1');
  sweep?.();
  if (typeof retractCompact === 'function') retractCompact();
  check('uninstall removes the compact class', !compactDom.body.classList.contains('dsh-capbar-compact'));
  check(
    'and fully restores both components',
    preset.getAttribute('title') === null &&
      !preset.hasAttribute('data-dsh-capbar-preset') &&
      subagent.getAttribute('title') === null &&
      subagent.getAttribute('data-dsh-capbar-subagent-count') === null,
  );
}

console.log('background status is compact and announces itself outside layout');
{
  const job = Object.assign(new FakeElement('button'), {
    className: 'x_jobTrigger',
    textContent: '1 个后台任务运行中',
    rect: { width: 32, height: 28, left: 1600, right: 1632, top: 180, bottom: 208 },
  });
  job.setAttribute('aria-label', '1 个后台任务运行中');
  const statusDom = installFakeDom();
  statusDom.body.style.setProperty('--dsh-capbar-compact', '1');
  statusDom.document.querySelectorAll = (selector) => {
    const value = String(selector);
    if (value.includes(':not([aria-haspopup="tree"]):has(> span):has(> svg)')) return [job];
    return [];
  };
  const statusBundle = loadBundle(statusDom);
  const retractStatus = statusBundle.loaded.exports.apply({ slots: fakeSlots().service });
  const bubble = statusDom.body.children.find((el) => String(el.className).includes('dsh-capbar-status-bubble'));
  check('a job trigger gets the compact marker and count',
    job.hasAttribute('data-dsh-capbar-job') && job.getAttribute('data-dsh-capbar-job-count') === '1');
  check('its full status stays available on hover', job.getAttribute('title') === '1 个后台任务运行中');
  check('its first appearance announces itself in a fixed bubble',
    bubble?.hidden === false && bubble.textContent === '1 个后台任务运行中' && /px$/.test(bubble.style.top));

  job.setAttribute('aria-label', '2 个后台任务运行中');
  job.textContent = '2 个后台任务运行中';
  statusBundle.observers.at(-1)?.callback();
  check('a state/count change replaces the same bubble',
    bubble?.textContent === '2 个后台任务运行中' && job.getAttribute('data-dsh-capbar-job-count') === '2');

  bubble.click();
  check('clicking the bubble opens the original job control', job.clicks === 1);
  check('and hides the bubble immediately', bubble.hidden === true);

  job.setAttribute('aria-label', '1 个后台任务已完成');
  job.textContent = '1 个后台任务已完成';
  statusBundle.observers.at(-1)?.callback();
  const timeout = [...statusDom.timeouts.values()].find((timer) => timer.ms === 3000)?.fn;
  timeout?.();
  check('the latest state disappears after three seconds', bubble.hidden === true);

  if (typeof retractStatus === 'function') retractStatus();
  check('uninstall removes the bubble and semantic job attributes',
    bubble.removed === true &&
      !job.hasAttribute('data-dsh-capbar-job') &&
      !job.hasAttribute('data-dsh-capbar-job-count') &&
      job.getAttribute('title') === null);
}

console.log('retraction');
{
  const pending = [...dom.timeouts.values()].map((timer) => timer.fn);
  const callable = typeof retract === 'function' ? retract : () => {};

  callable();

  check('the sheet is removed', style.removed === true);
  check('the body class is removed', !dom.body.classList.contains('dsh-capbar-on'));
  check('the Codex UI marker is removed', !dom.body.hasAttribute('data-dsh-title-bar-compat'));
  check('the title label is removed', titleEl.removed === true && !dom.body.children.includes(titleEl));
  check('the title observer is disconnected', observers[0]?.disconnected === true);
  check(
    'no measured variable survives',
    [...dom.body.style._all.keys()].length === 0,
    [...dom.body.style._all.keys()].join(', '),
  );
  check('the sweep is cleared', dom.intervals.size === 0, String(dom.intervals.size));
  check('the scheduled retries are cleared', dom.timeouts.size === 0, String(dom.timeouts.size));
  check('the button registration is retracted', slots.calls.unregistered === true);
  check('the slot injection is retracted', slots.calls.injectionDisposed === true);

  for (const run of pending) run();
  check('a stale retry cannot re-seat the rail', !dom.body.classList.contains('dsh-capbar-on'));
  check('a stale retry cannot rewrite the title', titleEl.textContent === SESSION_TITLE, titleEl.textContent);
}

console.log('re-seating after a retraction');
{
  const again = loaded.exports.apply({ slots: fakeSlots().service });
  const live = dom.head.children.filter((el) => el.id === 'dsh-caption-bar-style' && !el.removed);
  check('a re-seating leaves exactly one live sheet', live.length === 1, String(live.length));
  check('the second seating also hands back a disposer', typeof again === 'function');
  if (typeof again === 'function') again();
}

console.log('free-height claimers are neutralised');
{
  const grower = new FakeElement('div');
  grower.className = 'x_titleCluster';
  grower.computed = { flexGrow: '1', marginLeft: '0px' };
  const autoMargin = new FakeElement('div');
  autoMargin.className = 'x_headerCorner';
  autoMargin.computed = { flexGrow: '0', marginLeft: 'auto' };
  const spacing = new FakeElement('div');
  spacing.className = 'x_headerUtilities';
  spacing.computed = { flexGrow: '0', marginLeft: '20px' };
  const menu = new FakeElement('div');
  menu.setAttribute('role', 'menu');
  const menuLabel = new FakeElement('span');
  menuLabel.className = 'x_itemLabel';
  menuLabel.computed = { flexGrow: '1', marginLeft: '0px' };
  menu.appendChild(menuLabel);
  spacing.appendChild(menu);
  const packDom = installFakeDom({ headerChildren: [grower, autoMargin, spacing] });
  // The stock header row is not top-justified, so the applier has to override it too.
  packDom.header.computed.justifyContent = 'space-between';
  const packBundle = loadBundle(packDom);
  const retractPack = packBundle.loaded.exports.apply({ slots: fakeSlots().service });
  check('flex-grow is zeroed', grower.style.flexGrow === '0', String(grower.style.flexGrow));
  check('auto left margin is zeroed', autoMargin.style.marginLeft === '0', String(autoMargin.style.marginLeft));
  check('spacing margins are left alone', spacing.style.marginLeft === undefined, String(spacing.style.marginLeft));
  check(
    'menu surfaces are outside the rail layout sweep',
    menuLabel.style.flexGrow === undefined,
    String(menuLabel.style.flexGrow),
  );
  check(
    'the exclusion asks for the semantic menu ancestor directly',
    /html\.closest\?\.\('\[role="menu"\]'\)/.test(source),
  );
  check(
    'the sweep only visits named header layout seats, never every descendant',
    /const layoutSelector =/.test(source) &&
      /header\.querySelectorAll\(layoutSelector\)/.test(source) &&
      !/header\.querySelectorAll\('\*'\)/.test(source),
  );
  check(
    'the column starts at the top',
    packDom.header.style.justifyContent === 'flex-start',
    String(packDom.header.style.justifyContent),
  );
  check(
    'diagnostics are gated behind DEBUG (silent by default)',
    /const DEBUG = false;/.test(readFileSync(join(root, 'lib', 'client.js'), 'utf8')) && packBundle.logs.length === 0,
    packBundle.logs.join(' | '),
  );
  check(
    'the sweep is re-armed',
    [...packDom.intervals.values()].some((timer) => timer.ms === 2000),
  );

  // An inline override must be put back, not blanked: React sets inline styles of its own,
  // and the disposer used to wipe them.
  if (typeof retractPack === 'function') retractPack();
  check(
    'inline overrides are restored, not blanked',
    grower.style.flexGrow === '' && autoMargin.style.marginLeft === '' && packDom.header.style.justifyContent === '',
    [grower.style.flexGrow, autoMargin.style.marginLeft, packDom.header.style.justifyContent].join(' | '),
  );
  check('an untouched margin stays untouched', spacing.style.marginLeft === undefined, String(spacing.style.marginLeft));
}

console.log('');
if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('client smoke: all checks passed');
