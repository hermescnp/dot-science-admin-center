import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';
import { overviewIndicatorsQueryOptions } from '@/features/overview/api/queries';
import { formatChangePercent } from '@/features/overview/api/service';
import type { OverviewIndicator } from '@/features/overview/api/types';
import { virtualOfficeAsset } from '../../lib/assets';

// The picture inside the frame on the stairs wall (Metrics Dashboard zone); its 0.72 × 1.02 m quad
// matches the 600 × 850 artboard below.
const METRICS_FRAME_MESH_NAME = 'Object_222';
const WIDTH = 600;
const HEIGHT = 850;
const PIXEL_RATIO = 2;
const PADDING = 36;

// Golden Papers "Create document" modal palette (resonance.module.css).
const BRAND_CYAN = '#68dbff';
const BRAND_NAVY = '#0a5e95';
const TILE_FILL = '#0a1727';
const TILE_BORDER = '#416679';
const DOWN_LIGHT = '#fca5a5';
const DOWN_DARK = '#7f3b3b';

const STYLES = `
  text { font-family: 'Quicksand', ui-sans-serif, system-ui, sans-serif; }
  .title { font-size: 26px; font-weight: 600; letter-spacing: -0.3px; fill: #fff; }
  .subtitle { font-size: 14px; font-weight: 500; fill: rgb(255 255 255 / 0.5); }
  .eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 4px; fill: rgb(255 255 255 / 0.4); }
  .label { font-size: 15px; font-weight: 600; fill: rgb(255 255 255 / 0.72); }
  .value { font-size: 15px; font-weight: 700; }
  .ring-value { font-size: 25px; font-weight: 700; fill: #fff; }
  .panel { fill: rgb(10 23 39 / 0.5); stroke: rgb(65 102 121 / 0.55); stroke-width: 1; }
  .track { fill: rgb(255 255 255 / 0.05); }
  .axis { stroke: rgb(65 102 121 / 0.6); stroke-width: 1; stroke-dasharray: 3 4; }
  .ring-track { fill: none; stroke: ${TILE_FILL}; stroke-width: 10; }
  .ring-hairline { fill: none; stroke: rgb(65 102 121 / 0.55); stroke-width: 0.75; }
  .ring-arc { fill: none; stroke-width: 10; stroke-linecap: round; }
`;

const DEFS = `
  <radialGradient id='glowNavy' cx='0.15' cy='-0.08' r='0.75'>
    <stop offset='0' stop-color='${BRAND_NAVY}' stop-opacity='0.22' />
    <stop offset='0.6' stop-color='${BRAND_NAVY}' stop-opacity='0' />
  </radialGradient>
  <radialGradient id='glowCyan' cx='1.02' cy='1.08' r='0.7'>
    <stop offset='0' stop-color='${BRAND_CYAN}' stop-opacity='0.1' />
    <stop offset='0.58' stop-color='${BRAND_CYAN}' stop-opacity='0' />
  </radialGradient>
  <linearGradient id='hairlineCyan' x1='0' x2='1'>
    <stop offset='0' stop-color='${BRAND_CYAN}' stop-opacity='0' />
    <stop offset='0.5' stop-color='${BRAND_CYAN}' stop-opacity='0.5' />
    <stop offset='1' stop-color='${BRAND_CYAN}' stop-opacity='0' />
  </linearGradient>
  <linearGradient id='hairlineSlate' x1='0' x2='1'>
    <stop offset='0' stop-color='${TILE_BORDER}' stop-opacity='0' />
    <stop offset='0.5' stop-color='${TILE_BORDER}' stop-opacity='0.45' />
    <stop offset='1' stop-color='${TILE_BORDER}' stop-opacity='0' />
  </linearGradient>
  <linearGradient id='sectionLine' x1='0' x2='1'>
    <stop offset='0' stop-color='${TILE_BORDER}' stop-opacity='0.5' />
    <stop offset='1' stop-color='${TILE_BORDER}' stop-opacity='0' />
  </linearGradient>
  <linearGradient id='barUp' x1='0' x2='1'>
    <stop offset='0' stop-color='${BRAND_NAVY}' />
    <stop offset='1' stop-color='${BRAND_CYAN}' />
  </linearGradient>
  <linearGradient id='barDown' x1='1' x2='0'>
    <stop offset='0' stop-color='${DOWN_DARK}' />
    <stop offset='1' stop-color='${DOWN_LIGHT}' />
  </linearGradient>
  <linearGradient id='ringUp' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0' stop-color='${BRAND_CYAN}' />
    <stop offset='1' stop-color='${BRAND_NAVY}' />
  </linearGradient>
  <linearGradient id='ringDown' x1='0' y1='0' x2='1' y2='1'>
    <stop offset='0' stop-color='${DOWN_LIGHT}' />
    <stop offset='1' stop-color='${DOWN_DARK}' />
  </linearGradient>
  <radialGradient id='ringGlowUp'>
    <stop offset='0' stop-color='${BRAND_CYAN}' stop-opacity='0.2' />
    <stop offset='0.58' stop-color='${BRAND_NAVY}' stop-opacity='0.12' />
    <stop offset='1' stop-color='${BRAND_NAVY}' stop-opacity='0' />
  </radialGradient>
  <radialGradient id='ringGlowDown'>
    <stop offset='0' stop-color='${DOWN_LIGHT}' stop-opacity='0.16' />
    <stop offset='0.58' stop-color='${DOWN_DARK}' stop-opacity='0.1' />
    <stop offset='1' stop-color='${DOWN_DARK}' stop-opacity='0' />
  </radialGradient>
  <filter id='blur' x='-50%' y='-50%' width='200%' height='200%'>
    <feGaussianBlur stdDeviation='10' />
  </filter>
`;

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

const isDown = (indicator: OverviewIndicator) => indicator.changePercent < 0;
const trendColor = (indicator: OverviewIndicator) => (isDown(indicator) ? DOWN_LIGHT : BRAND_CYAN);

function trendArrow(x: number, y: number, indicator: OverviewIndicator): string {
  const points = isDown(indicator)
    ? `${x},${y - 4} ${x + 9},${y - 4} ${x + 4.5},${y + 3}`
    : `${x},${y + 3} ${x + 9},${y + 3} ${x + 4.5},${y - 4}`;
  return `<polygon points='${points}' fill='${trendColor(indicator)}' />`;
}

function renderHeader(): string {
  const tileX = PADDING;
  const tileY = 34;
  // Bar-chart glyph, centered in the 64px tile.
  const glyph = [
    [tileX + 20, tileY + 34, 16],
    [tileX + 29, tileY + 24, 26],
    [tileX + 38, tileY + 29, 21]
  ]
    .map(
      ([x, y, h]) =>
        `<rect x='${x}' y='${y}' width='6' height='${h}' rx='2' fill='${BRAND_CYAN}' />`
    )
    .join('');
  return `
    <rect x='${tileX}' y='${tileY}' width='64' height='64' rx='18' fill='${TILE_FILL}' stroke='${TILE_BORDER}' stroke-width='0.75' />
    ${glyph}
    <text class='title' x='${tileX + 82}' y='${tileY + 30}'>Metrics dashboard</text>
    <text class='subtitle' x='${tileX + 82}' y='${tileY + 54}'>Change vs. previous period</text>
    <rect x='${PADDING}' y='128' width='${WIDTH - PADDING * 2}' height='1' fill='url(#hairlineSlate)' />`;
}

// Eyebrow text followed by a line that fades out towards the right edge.
function renderSectionLabel(label: string, y: number): string {
  const lineStart = PADDING + label.length * 12 + 10;
  return `
    <text class='eyebrow' x='${PADDING}' y='${y}'>${escapeXml(label.toUpperCase())}</text>
    <rect x='${lineStart}' y='${y - 4}' width='${WIDTH - PADDING - lineStart}' height='1' fill='url(#sectionLine)' />`;
}

// Diverging bars around a zero axis, one row per indicator.
function renderBarChart(indicators: OverviewIndicator[], scale: number, top: number): string {
  const left = PADDING + 24;
  const right = WIDTH - PADDING - 24;
  const axis = (left + right) / 2;
  const halfWidth = (right - left) / 2;
  const height = 34 + indicators.length * 52;
  const rows = indicators.map((indicator, index) => {
    const y = top + 38 + index * 52;
    const length = Math.max((Math.abs(indicator.changePercent) / scale) * halfWidth, 6);
    const barX = isDown(indicator) ? axis - length : axis;
    return `
      <text class='label' x='${left}' y='${y}'>${escapeXml(indicator.label)}</text>
      <text class='value' x='${right}' y='${y}' text-anchor='end' fill='${trendColor(indicator)}'>${formatChangePercent(indicator.changePercent)}</text>
      <rect class='track' x='${left}' y='${y + 11}' width='${right - left}' height='10' rx='5' />
      <rect x='${barX}' y='${y + 11}' width='${length}' height='10' rx='5' fill='url(#${isDown(indicator) ? 'barDown' : 'barUp'})' />`;
  });
  return `
    <rect class='panel' x='${PADDING}' y='${top}' width='${WIDTH - PADDING * 2}' height='${height}' rx='14' />
    <line class='axis' x1='${axis}' y1='${top + 18}' x2='${axis}' y2='${top + height - 18}' />
    ${rows.join('')}`;
}

// 2 × 2 ring gauges, each filled by the indicator's share of the chart scale.
function renderRings(indicators: OverviewIndicator[], scale: number, top: number): string {
  const gap = 16;
  const panelWidth = (WIDTH - PADDING * 2 - gap) / 2;
  const panelHeight = 150;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return indicators
    .map((indicator, index) => {
      const x = PADDING + (index % 2) * (panelWidth + gap);
      const y = top + Math.floor(index / 2) * (panelHeight + gap);
      const cx = x + panelWidth / 2;
      const cy = y + 64;
      const arc = Math.max((Math.abs(indicator.changePercent) / scale) * circumference, 4);
      const variant = isDown(indicator) ? 'Down' : 'Up';
      const label = escapeXml(indicator.label.toUpperCase());
      const labelWidth = indicator.label.length * 10.2;
      return `
        <rect class='panel' x='${x}' y='${y}' width='${panelWidth}' height='${panelHeight}' rx='14' />
        <circle cx='${cx}' cy='${cy}' r='${radius + 22}' fill='url(#ringGlow${variant})' filter='url(#blur)' />
        <circle class='ring-track' cx='${cx}' cy='${cy}' r='${radius}' />
        <circle class='ring-hairline' cx='${cx}' cy='${cy}' r='${radius + 5.5}' />
        <circle class='ring-arc' cx='${cx}' cy='${cy}' r='${radius}' stroke='url(#ring${variant})'
          stroke-dasharray='${arc} ${circumference}' transform='rotate(-90 ${cx} ${cy})' />
        <text class='ring-value' x='${cx}' y='${cy + 9}' text-anchor='middle'>${formatChangePercent(indicator.changePercent)}</text>
        ${trendArrow(cx - labelWidth / 2 - 10, y + 127, indicator)}
        <text class='eyebrow' style='letter-spacing: 2.5px; font-size: 11px' x='${cx + 6}' y='${y + 131}' text-anchor='middle'>${label}</text>`;
    })
    .join('');
}

function buildMetricsSvg(indicators: OverviewIndicator[], fontFace: string): string {
  const maxChange = Math.max(...indicators.map((indicator) => Math.abs(indicator.changePercent)));
  const scale = Math.max(25, Math.ceil(maxChange / 5) * 5);
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}' viewBox='0 0 ${WIDTH} ${HEIGHT}'>
    <style>${fontFace}${STYLES}</style>
    <defs>${DEFS}</defs>
    <rect width='${WIDTH}' height='${HEIGHT}' fill='#050508' />
    <rect width='${WIDTH}' height='${HEIGHT}' fill='url(#glowNavy)' />
    <rect width='${WIDTH}' height='${HEIGHT}' fill='url(#glowCyan)' />
    <rect x='${WIDTH * 0.12}' y='0' width='${WIDTH * 0.76}' height='1.5' fill='url(#hairlineCyan)' />
    ${renderHeader()}
    ${renderSectionLabel('Performance', 168)}
    ${renderBarChart(indicators, scale, 184)}
    ${renderSectionLabel('Indicators', 470)}
    ${renderRings(indicators, scale, 486)}
  </svg>`;
}

// An SVG drawn as an image can't reach the page's next/font faces, so Quicksand is inlined as a
// data URL. Resolves to an empty rule (system font fallback) if the file can't be loaded.
let fontFacePromise: Promise<string> | null = null;
function loadFontFace(): Promise<string> {
  fontFacePromise ??= fetch(virtualOfficeAsset('/fonts/quicksand-latin.woff2'))
    .then((response) => {
      if (!response.ok) throw new Error('Font unavailable');
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener('load', () => resolve(String(reader.result)));
          reader.addEventListener('error', () => reject(reader.error));
          reader.readAsDataURL(blob);
        })
    )
    .then(
      (dataUrl) =>
        `@font-face { font-family: 'Quicksand'; font-weight: 300 700; src: url(${dataUrl.replace(/^data:[^;]*/, 'data:font/woff2')}) format('woff2'); }`
    )
    .catch(() => '');
  return fontFacePromise;
}

// Rasterizes the CSS-styled SVG once per data load; nothing is laid out or repainted afterwards.
function useMetricsTexture(): THREE.CanvasTexture | null {
  const { data: indicators } = useQuery(overviewIndicatorsQueryOptions());
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (!indicators?.length) return;
    let isCancelled = false;
    let created: THREE.CanvasTexture | null = null;
    const image = new Image();
    image.addEventListener('load', () => {
      if (isCancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH * PIXEL_RATIO;
      canvas.height = HEIGHT * PIXEL_RATIO;
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      created = new THREE.CanvasTexture(canvas);
      created.flipY = false;
      created.colorSpace = THREE.SRGBColorSpace;
      created.anisotropy = 4;
      setTexture(created);
    });
    void loadFontFace().then((fontFace) => {
      if (isCancelled) return;
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildMetricsSvg(indicators, fontFace))}`;
    });
    return () => {
      isCancelled = true;
      created?.dispose();
    };
  }, [indicators]);

  return texture;
}

// The baked painting's UVs only cover part of its texture, so the quad gets a planar mapping of its
// world-space extent instead (it faces +z: x runs left→right, y top→bottom with flipY off).
function createFullFrameGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute('position');
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const vertex = new THREE.Vector3();
  const uvs = new Float32Array(position.count * 2);
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    uvs[index * 2] = (vertex.x - box.min.x) / size.x;
    uvs[index * 2 + 1] = (box.max.y - vertex.y) / size.y;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

export function MetricsFrame({ scene }: { scene: THREE.Object3D }) {
  const texture = useMetricsTexture();

  useEffect(() => {
    const mesh = scene.getObjectByName(METRICS_FRAME_MESH_NAME) as THREE.Mesh | undefined;
    if (!mesh || !texture) return;
    const previousGeometry = mesh.geometry;
    const previousMaterial = mesh.material;
    const geometry = createFullFrameGeometry(mesh);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    mesh.geometry = geometry;
    mesh.material = material;
    return () => {
      mesh.geometry = previousGeometry;
      mesh.material = previousMaterial;
      geometry.dispose();
      material.dispose();
    };
  }, [scene, texture]);

  return null;
}
