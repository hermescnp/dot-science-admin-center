import { COMPONENT_WIREFRAME_CSS, WIREFRAME_LIGHT_PALETTE } from './component-wireframe-css';

export interface ComponentSvg {
  dataURL: string;
  width: number;
  height: number;
}

const FALLBACK_HEIGHT = 160;

/**
 * The height of the image's markup, laid out in a hidden frame. The frame is same-origin and
 * script-free, so its layout can be read synchronously, and like the image it can't load web
 * fonts, so text wraps the same way.
 */
function measureHeight(xhtml: string): Promise<number> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    Object.assign(frame.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '100px',
      height: '100px',
      border: '0',
      visibility: 'hidden'
    });
    frame.addEventListener(
      'load',
      () => {
        const root = frame.contentDocument?.getElementById('wf-root');
        const height = root ? Math.ceil(root.getBoundingClientRect().height) : 0;
        frame.remove();
        resolve(height || FALLBACK_HEIGHT);
      },
      { once: true }
    );
    frame.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"/></head><body style="margin:0">${xhtml}</body></html>`;
    document.body.append(frame);
  });
}

/** The preview's static markup as well-formed XHTML, which an SVG document requires. */
function toXhtml(html: string, width: number): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, iframe, object, embed, link, meta, base').forEach((element) => {
    element.remove();
  });
  const root = doc.createElement('div');
  root.id = 'wf-root';
  const style = doc.createElement('style');
  // The board inverts SVG images along with the drawings in dark mode, so the light palette
  // reads right on both themes.
  style.textContent = `${COMPONENT_WIREFRAME_CSS}
#wf-root {${WIREFRAME_LIGHT_PALETTE}
  display: flow-root;
  box-sizing: border-box;
  width: ${width}px;
  padding: 4px;
  color: var(--wf-fg);
  font-family: var(--wf-font);
  font-size: 13px;
  line-height: 1.35;
}`;
  root.append(style, ...doc.head.querySelectorAll('style'), ...doc.body.childNodes);
  return new XMLSerializer().serializeToString(root);
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

/** A still image of a component preview, `width` px wide and as tall as its content. */
export async function componentSvg(html: string, width: number): Promise<ComponentSvg> {
  const xhtml = toXhtml(html, width);
  const height = await measureHeight(xhtml);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;
  return { dataURL: `data:image/svg+xml;base64,${toBase64(svg)}`, width, height };
}
