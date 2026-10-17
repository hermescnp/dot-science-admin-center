export const WIREFRAME_LIGHT_PALETTE = `
  --wf-fg: oklch(0.25 0.02 260);
  --wf-muted: oklch(0.45 0.02 260);
  --wf-line: oklch(0.25 0.02 260 / 0.45);
  --wf-faint: oklch(0.25 0.02 260 / 0.18);
  --wf-fill: oklch(0.25 0.02 260 / 0.05);
  --wf-card: oklch(0.99 0.005 260);`;

/**
 * Shared look for every generated component preview. Injected into the iframe and quoted in
 * the model prompt so expand/collapse and interactive bits stay visually consistent.
 */
export const COMPONENT_WIREFRAME_CSS = `
:root {
  color-scheme: light dark;${WIREFRAME_LIGHT_PALETTE}
  --wf-gap: 8px;
  --wf-radius: 6px;
  --wf-font: Excalifont, Virgil, "Architects Daughter", "Comic Sans MS", cursive, system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root {
    --wf-fg: oklch(0.92 0.01 260);
    --wf-muted: oklch(0.72 0.02 260);
    --wf-line: oklch(0.92 0.01 260 / 0.4);
    --wf-faint: oklch(0.92 0.01 260 / 0.18);
    --wf-fill: oklch(0.92 0.01 260 / 0.06);
    --wf-card: oklch(0.22 0.02 260);
  }
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  color: var(--wf-fg);
  background: transparent;
  font-family: var(--wf-font);
  font-size: 13px;
  line-height: 1.35;
}
body { padding: 4px; }
button, input, select, textarea {
  font: inherit;
  color: inherit;
  background: var(--wf-card);
  border: 1px solid var(--wf-line);
  border-radius: var(--wf-radius);
}
button { cursor: pointer; padding: 4px 10px; }
button:hover { background: var(--wf-fill); }
.wf-box, [data-wf="box"] {
  border: 1px solid var(--wf-faint);
  border-radius: var(--wf-radius);
  background: var(--wf-fill);
  padding: 8px;
}
.wf-row, [data-wf="row"] { display: flex; flex-direction: row; align-items: center; gap: var(--wf-gap); }
.wf-col, [data-wf="col"] { display: flex; flex-direction: column; gap: var(--wf-gap); }
.wf-fill, [data-wf="fill"] { flex: 1 1 0; min-width: 0; }
.wf-label, [data-wf="label"] { font-weight: 600; }
.wf-muted, [data-wf="muted"] { color: var(--wf-muted); font-size: 11px; }
.wf-btn, [data-wf="btn"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 4px 12px;
  border: 1px solid var(--wf-line);
  border-radius: var(--wf-radius);
  background: var(--wf-card);
}
.wf-btn-primary, [data-wf="btn-primary"] {
  background: var(--wf-fg);
  color: var(--wf-card);
  border-color: var(--wf-fg);
}
.wf-field, [data-wf="field"] {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}
.wf-field input, .wf-field select, [data-wf="field"] input, [data-wf="field"] select {
  min-height: 28px;
  padding: 4px 8px;
  width: 100%;
}
.wf-nav, [data-wf="nav"] { display: flex; flex-direction: column; gap: 2px; }
.wf-nav-item, [data-wf="nav-item"] {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--wf-radius);
  border: 1px solid transparent;
  cursor: pointer;
  background: transparent;
  text-align: left;
  width: 100%;
}
.wf-nav-item[aria-current="page"], [data-wf="nav-item"][aria-current="page"] {
  border-color: var(--wf-line);
  background: var(--wf-fill);
}
.wf-collapse, [data-wf="collapse"] { border: 1px solid var(--wf-faint); border-radius: var(--wf-radius); overflow: hidden; }
.wf-collapse > summary, [data-wf="collapse"] > summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--wf-fill);
  font-weight: 600;
}
.wf-collapse > summary::-webkit-details-marker { display: none; }
.wf-collapse > summary::before, [data-wf="collapse"] > summary::before {
  content: "▸";
  font-size: 10px;
  opacity: 0.7;
}
.wf-collapse[open] > summary::before, [data-wf="collapse"][open] > summary::before { content: "▾"; }
.wf-collapse > :not(summary), [data-wf="collapse"] > :not(summary) { padding: 8px; }
.wf-icon, [data-wf="icon"] {
  width: 16px;
  height: 16px;
  border: 1px solid var(--wf-line);
  border-radius: 3px;
  flex-shrink: 0;
  display: inline-block;
}
.wf-chip, [data-wf="chip"] {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--wf-faint);
  border-radius: 999px;
  font-size: 11px;
}
`.trim();

/** Message the preview posts to its host whenever its content height changes. */
export const PREVIEW_HEIGHT_MESSAGE = 'wf-preview-height';

// Measures a wrapper rather than the document: the document is never shorter than the iframe,
// so it could only ever grow.
const HEIGHT_REPORTER = `<script>(function(){var root=document.getElementById('wf-root');var last=-1;function report(){var h=Math.ceil(root.getBoundingClientRect().height+8);if(h!==last){last=h;parent.postMessage({type:'${PREVIEW_HEIGHT_MESSAGE}',height:h},'*');}}new ResizeObserver(report).observe(root);window.addEventListener('load',report);report();})();</script>`;

/** The model HTML as it goes inside `#wf-root`. */
export function componentPreviewBody(html: string): string {
  return html
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi, '');
}

/**
 * Full iframe document: shared CSS first, then the model body (no network). The static variant
 * runs no scripts and reports no height: its host reads the document directly to edit the layout.
 */
export function buildComponentPreviewSrcDoc(
  html: string,
  { scripts = true }: { scripts?: boolean } = {}
): string {
  const scriptSrc = scripts ? "'unsafe-inline'" : "'none'";
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src ${scriptSrc}; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';"/><style>${COMPONENT_WIREFRAME_CSS}</style></head><body><div id="wf-root" style="display:flow-root">${componentPreviewBody(html)}</div>${scripts ? HEIGHT_REPORTER : ''}</body></html>`;
}
