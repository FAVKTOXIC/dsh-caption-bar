/**
 * Host-side half of dsh-caption-bar.
 *
 * All of the work happens in the client bundle (`lib/client.js`), which the host
 * injects into the renderer's module graph. This module exists only so the
 * package becomes a row on the cordis tree — without a host entry the
 * `dsh.client` bundle is never scanned into the startup graph.
 *
 * Deliberately empty: no hooks, no services, no config. That keeps the plugin
 * fail-open (there is no host-side code that can throw) and trivially
 * uninstallable.
 */
export function apply(): void {}
