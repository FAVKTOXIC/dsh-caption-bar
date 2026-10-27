#!/usr/bin/env node
/**
 * Read-only compatibility probe for private DOM/CSS contracts used by the client half.
 *
 * Codex UI lives in the desktop profile and is checked by default. Harness core packages
 * are normally packed inside app.asar (not addressable as ordinary files), so set
 * DSH_CORE_DIR to an extracted node_modules/@deepseek-ai directory to check them too. A
 * local development dependency is used as a fallback where one exists. Skipping an
 * inaccessible packed core package is explicit and does not pretend it was checked.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const profile = process.env.DSH_PROFILE_DIR || join(homedir(), '.dsh', 'profiles', 'desktop');
const core = process.env.DSH_CORE_DIR || '';

const packages = [
  {
    name: '@michengai/dsh-codex-ui',
    required: true,
    candidates: [join(profile, 'node_modules', '@michengai', 'dsh-codex-ui')],
    anchors: [
      ['inline-tabs marker', 'data-dcu-inline-tabs'],
      ['selection slider', 'data-dcu-tab-slider'],
      ['title-bar compatibility marker', 'data-dsh-title-bar-compat'],
      ['title-bar strip variable', '--dsh-title-bar-strip'],
    ],
  },
  {
    name: '@deepseek-ai/dsh-client-ui-conversation',
    candidates: [core && join(core, 'dsh-client-ui-conversation')],
    anchors: [
      ['view tabs', 'data-conversation-tabs'],
      ['tab role', 'role: "tab"'],
      ['session-header utility slot', 'conversation.session.header.utilities'],
      ['session-header corner slot', 'conversation.session.header.corner'],
      ['views-more menu', 'ViewsMoreMenu'],
    ],
  },
  {
    name: '@deepseek-ai/dsh-client-ui-open-in-app',
    candidates: [core && join(core, 'dsh-client-ui-open-in-app')],
    anchors: [
      ['directory split marker', 'data-open-target'],
      ['directory split value', 'directory'],
      ['menu chevron', 'aria-haspopup'],
    ],
  },
  {
    name: '@deepseek-ai/dsh-client-ui-jobs',
    candidates: [core && join(core, 'dsh-client-ui-jobs')],
    anchors: [
      ['header action slot', 'conversation.session.header.actions'],
      ['job trigger count label', 'countLabel'],
      ['running status', 'status === "running"'],
    ],
  },
  {
    name: '@deepseek-ai/dsh-client-ui-subagent',
    candidates: [core && join(core, 'dsh-client-ui-subagent')],
    anchors: [
      ['subagent catalog action', 'SubagentCatalogAction'],
      ['tree-popup trigger', 'aria-haspopup'],
      ['header action slot', 'conversation.session.header.actions'],
    ],
  },
];

let failed = 0;
let checked = 0;
let skipped = 0;
console.log(`compat: profile ${profile}`);
if (!core) console.log('compat: DSH_CORE_DIR is unset; packed app.asar-only packages may be skipped');

for (const pkg of packages) {
  const packagePath = pkg.candidates
    .filter(Boolean)
    .find((candidate) => existsSync(join(candidate, 'package.json')) && existsSync(join(candidate, 'lib', 'client.js')));
  if (!packagePath) {
    if (pkg.required) {
      console.log(`  FAIL ${pkg.name} — package or lib/client.js not found`);
      failed += 1;
    } else {
      console.log(`  SKIP ${pkg.name} — packed core package not available as files`);
      skipped += 1;
    }
    continue;
  }
  checked += 1;
  const version = JSON.parse(readFileSync(join(packagePath, 'package.json'), 'utf8')).version ?? 'unknown';
  const source = readFileSync(join(packagePath, 'lib', 'client.js'), 'utf8');
  const missing = pkg.anchors.filter(([, needle]) => !source.includes(needle)).map(([label]) => label);
  if (missing.length > 0) {
    console.log(`  FAIL ${pkg.name}@${version} — missing: ${missing.join(', ')}`);
    failed += 1;
  } else {
    console.log(`  ok   ${pkg.name}@${version} (${pkg.anchors.length} anchors)`);
  }
}

if (failed > 0) {
  console.error(`compat: INCOMPATIBLE (${failed} failed, ${checked} checked, ${skipped} skipped)`);
  process.exit(1);
}
console.log(`compat: COMPATIBLE (${checked} checked, ${skipped} skipped)`);
