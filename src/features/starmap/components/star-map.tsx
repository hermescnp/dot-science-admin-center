'use client';

// Ported from hermes-agent apps/desktop/src/app/starmap (MIT License, Copyright (c) 2025 Nous Research).
// Read-only: the node context menu (edits Hermes files) and share codes are not included.

import { type Simulation } from 'd3-force';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icons } from '@/components/icons';
import type { StarmapGraph } from '../api/types';
import { computePalette, conceptInkFor, memoryInkFor, resolveRgb, rgba } from './color';
import { RING_OUTER, TILT, ZOOM_MAX, ZOOM_MIN } from './constants';
import { clamp, distToSegmentSq, fitScale, fitViewport, nodeRadius } from './geometry';
import {
  createDoubleTapDetector,
  createRendererLoopPauseController,
  createRevealStore,
  isKeyboardOwner,
  isSmartZoomWheel,
  type RevealStore,
  wheelDeltaPx
} from './interaction';
import { drawScene, drawScramble } from './render';
import { buildSimulation } from './simulation';
import { formatDate } from './text';
import { buildTimeAxis, dateAtReveal, type TimeAxis } from './time-axis';
import { Timeline } from './timeline';
import type {
  FadeBuckets,
  MemoryCard,
  Palette,
  Ring,
  RingLabelRect,
  SimLink,
  SimNode,
  Viewport
} from './types';

// How long a full play-through sweep takes (ms), reveal 0 → 1. Longer = the
// build-up breathes; the eased middle no longer rushes past in a blink.
const SWEEP_MS = 15000;

// Zoom increment for the buttons and shortcuts, relative to the resting fit (Excalidraw's 10%).
const ZOOM_STEP = 0.1;

// How far to relax the ease toward a flat linear march. The bare smoothstep
// spikes to 1.5× linear speed mid-sweep, which reads as a "snap" through the
// middle; blending it back toward linear flattens that peak (≈1.3× at GENTLE
// = 0.45) so playback glides instead of lurching, while still keeping a soft
// ease-in / ease-out at the very start and end.
const GENTLE = 0.45;

// Cinematic timing: cubic smoothstep (gentle ease-in / ease-out) relaxed toward
// linear by GENTLE, so the middle never rushes. Monotonic on [0,1], so the
// numeric inverse below stays valid.
function cineEase(t: number): number {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  const smooth = u * u * (3 - 2 * u);

  return GENTLE * u + (1 - GENTLE) * smooth;
}

// Numeric inverse (monotonic) so a resume maps the current reveal back to clock
// progress without a closed-form solution.
function invCineEase(y: number): number {
  let lo = 0;
  let hi = 1;

  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;

    if (cineEase(mid) < y) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return (lo + hi) / 2;
}

function revealText(axis: TimeAxis, reveal: number): string {
  const date = dateAtReveal(axis, reveal);

  return date !== null ? formatDate(date) : `${Math.round(reveal * axis.size)} / ${axis.size}`;
}

function RevealLabel({ axis, revealStore }: { axis: TimeAxis; revealStore: RevealStore }) {
  const labelRef = useRef<HTMLSpanElement | null>(null);

  const sync = useCallback(
    (reveal: number) => {
      const el = labelRef.current;

      if (el) {
        el.textContent = revealText(axis, reveal);
      }
    },
    [axis]
  );

  useEffect(() => revealStore.subscribe(sync), [revealStore, sync]);

  useEffect(() => {
    sync(revealStore.get());
  }, [revealStore, sync]);

  return (
    <span className='tabular-nums text-foreground/75' ref={labelRef}>
      {revealText(axis, revealStore.get())}
    </span>
  );
}

// A tilted, top-down star map of what Hermes has learned. Time is RADIAL: oldest
// at the core, newest on the outer rings. This component owns the refs, effects
// and pointer wiring; layout lives in simulation.ts and painting in render.ts.
export function StarMap({
  graph,
  highlightIds = null,
  onSelectNode
}: {
  graph: StarmapGraph;
  /** Stars to emphasise (the rest dim) while nothing is selected or hovered. */
  highlightIds?: null | ReadonlySet<string>;
  onSelectNode?: (id: null | string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef<null | Simulation<SimNode, SimLink>>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const byIdRef = useRef(new Map<string, SimNode>());
  const adjacencyRef = useRef(new Map<string, Set<string>>());
  const memByIdRef = useRef(new Map<string, MemoryCard>());
  const ringsRef = useRef<Ring[]>([]);
  const ringLabelRectsRef = useRef<RingLabelRect[]>([]);

  const fadeRef = useRef<FadeBuckets>({
    appear: new Map(),
    labels: new Map(),
    links: new Map(),
    nodes: new Map(),
    rings: new Map()
  });

  const doubleTapRef = useRef(createDoubleTapDetector());
  const paletteRef = useRef<null | Palette>(null);
  const themeDirtyRef = useRef(true);
  const invalidateRef = useRef<() => void>(() => {});
  const viewportRef = useRef<Viewport>({ k: 1, x: 0, y: 0 });
  const hoverRef = useRef<null | string>(null);
  const hoveredLinkRef = useRef<null | string>(null);
  const hoveredRingRef = useRef<null | number>(null);
  const selectedRingRef = useRef<null | number>(null);
  const selectedIdRef = useRef<null | string>(null);
  const highlightRef = useRef(highlightIds);
  const sizeRef = useRef({ h: 0, w: 0 });
  const dprRef = useRef(1);
  const dirtyRef = useRef(true);
  // Scrub = direct manipulation (snap the fades to the pointer); Play = the
  // cinematic birth/fade easing. One frame's worth of state, never re-rendered.
  const snapMotionRef = useRef(false);

  const dragRef = useRef<{
    // False for hand-style drags (Space held, middle button): releasing never selects.
    click: boolean;
    id: null | string;
    mode: 'none' | 'pan';
    moved: boolean;
    ring: null | number;
    sx: number;
    sy: number;
    vp: Viewport;
  }>({
    click: false,
    id: null,
    mode: 'none',
    moved: false,
    ring: null,
    sx: 0,
    sy: 0,
    vp: { k: 1, x: 0, y: 0 }
  });
  // Space held = temporary hand tool, as on the design canvas. A tap without a
  // drag still toggles playback on release.
  const spaceRef = useRef({ held: false, panned: false });
  const pointerInsideRef = useRef(false);
  const zoomLabelRef = useRef<HTMLButtonElement | null>(null);

  const [selectedId, setSelectedId] = useState<null | string>(null);
  const [size, setSize] = useState({ h: 0, w: 0 });
  // Changes on every theme switch so the legend swatch and the canvas palette
  // re-resolve against the new CSS custom properties.
  const themeEpoch = useTheme().resolvedTheme;
  // Memory and concept swatch colors — the same hue rotations of the primary the
  // canvas uses, so the legend matches the rendered diamonds and hexagons exactly.
  const [memoryColor, setMemoryColor] = useState('var(--theme-secondary)');
  const [conceptColor, setConceptColor] = useState('var(--theme-accent)');

  // Time scrubber: reveal 1 = the whole map (idle default); lower values hide
  // not-yet-reached nodes so playing/scrubbing "builds it up". revealRef feeds
  // the canvas loop and revealStore feeds the timeline + legend label — so a
  // play-through / scrub never re-renders StarMap (the perf win). `playing`
  // stays React state since it flips rarely and drives the play effect + button.
  const revealStore = useMemo(() => createRevealStore(1), []);
  const [playing, setPlaying] = useState(false);
  // Reveal positions where each dated ring spawns (its inner neighbor's ratio —
  // ringSeen reveals one band ahead), surfaced as markers on the timeline.
  const [ringStops, setRingStops] = useState<number[]>([]);
  const revealRef = useRef(1);
  // Spore-style zoom: the camera fits the *leading ring's* radius, a step
  // function of reveal. It holds steady while a band fills, then eases out to the
  // next shell when a new ring is reached — growth in discrete jumps, not a
  // constant creep. This ref is the camera's current (eased) fit radius.
  const camRadiusRef = useRef(RING_OUTER);
  const timeAxis = useMemo(() => buildTimeAxis(graph, 72), [graph]);

  // Mark the canvas dirty and wake the (otherwise-idle) render loop.
  const invalidate = useCallback(() => invalidateRef.current(), []);

  // Single writer for the scrubber position: feeds the canvas (ref), the
  // timeline + legend label (store subscribers), and wakes the paint loop —
  // no React re-render, so playback/scrubbing stays off the render path.
  const setRevealValue = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 1);
      revealRef.current = next;
      revealStore.set(next);
      invalidate();
    },
    [invalidate, revealStore]
  );

  // Drop every in-flight ease so the next frame snaps to its targets.
  const resetFades = useCallback(() => {
    for (const bucket of Object.values(fadeRef.current)) {
      bucket.clear();
    }
  }, []);

  const memById = useMemo(() => {
    const m = new Map<string, MemoryCard>();
    // A node id carries the card's fingerprint (agent.learning_graph.memory_node_id) so an edit
    // still names the card the user clicked after the list shifts. An imported or older graph
    // has no fingerprint, so key both shapes or the tooltip/body lookup misses every card.
    graph.memory.forEach((card, i) => {
      m.set(`memory:${card.source}:${i}`, card);

      if (card.fingerprint) {
        m.set(`memory:${card.source}:${i}:${card.fingerprint}`, card);
      }
    });

    return m;
  }, [graph.memory]);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();

    for (const n of graph.nodes) {
      m.set(n.id, new Set());
    }

    for (const e of graph.edges) {
      m.get(e.source)?.add(e.target);
      m.get(e.target)?.add(e.source);
    }

    return m;
  }, [graph.edges, graph.nodes]);

  // Track the wrapper size.
  useEffect(() => {
    const el = wrapRef.current;

    if (!el) {
      return;
    }

    const sync = () => setSize({ h: el.clientHeight, w: el.clientWidth });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    sync();

    return () => ro.disconnect();
  }, []);

  // (Re)build the radial simulation whenever the graph or size changes.
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    sizeRef.current = size;

    if (size.w === 0 || size.h === 0) {
      return;
    }

    const { byId, links, nodes, rings, sim } = buildSimulation(graph, invalidate);
    simRef.current = sim;
    nodesRef.current = nodes;
    linksRef.current = links;
    byIdRef.current = byId;
    ringsRef.current = rings;
    // Markers fire when a ring spawns: ringSeen(i) flips at rings[i-1].ratio.
    setRingStops(
      rings
        .map((rg, i) => (rg.label != null ? (rings[i - 1]?.ratio ?? 0) : -1))
        .filter((v) => v >= 0)
    );
    resetFades();
    // Fit the actual disk (outermost ring), so a 3-ring map frames like a 12-ring
    // one — count changes the disk size, not the framing.
    viewportRef.current = fitViewport(size.w, size.h, rings[rings.length - 1]?.r ?? RING_OUTER);
    invalidate();

    if (selectedIdRef.current && !byId.has(selectedIdRef.current)) {
      selectedIdRef.current = null;
      setSelectedId(null);
    }

    return () => {
      sim.stop();

      if (simRef.current === sim) {
        simRef.current = null;
      }
    };
  }, [graph, invalidate, resetFades, size]);

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    adjacencyRef.current = adjacency;
    memByIdRef.current = memById;
    invalidate();
  }, [adjacency, invalidate, memById]);

  // The empty-core ASCII scramble uses the bundled JetBrains Mono face. Canvas
  // text doesn't reflow when a webfont loads, so repaint once it's ready.
  useEffect(() => {
    document.fonts?.load('1em "JetBrains Mono"').then(invalidate, () => {});
  }, [invalidate]);

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    selectedIdRef.current = selectedId;
    invalidate();
    onSelectNode?.(selectedId);
  }, [invalidate, onSelectNode, selectedId]);

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    highlightRef.current = highlightIds;
    invalidate();
  }, [highlightIds, invalidate]);

  // A fresh graph resets the scrubber to "fully built" (the idle default).
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    camRadiusRef.current = RING_OUTER;
    snapMotionRef.current = false;
    setRevealValue(1);
    setPlaying(false);
  }, [graph, setRevealValue]);

  // The stepped fit radius for a reveal: fit ONE ring BEYOND the leading shell
  // (the first not-yet-passed ring) so the ring currently igniting its nodes
  // sits comfortably inside the frame with a band of headroom, instead of jammed
  // against the edge. Steps only when reveal crosses a boundary — the Spore step.
  const targetRadius = useCallback((rev: number): number => {
    const rings = ringsRef.current;

    if (!rings.length) {
      return RING_OUTER;
    }

    const lead = rings.findIndex((rg) => rg.ratio > rev + 1e-3);
    const i = lead === -1 ? rings.length - 1 : lead;
    const band = (rings[1]?.r ?? RING_OUTER) - (rings[0]?.r ?? 0);

    // Small headroom (a third of a band) so the igniting ring isn't jammed at the
    // frame edge during playback, without zooming the resting view out.
    return rings[i]!.r + band * 0.35;
  }, []);

  const applyFit = useCallback((radius: number) => {
    const { h, w } = sizeRef.current;

    if (w > 0 && h > 0) {
      viewportRef.current = fitViewport(w, h, radius);
    }
  }, []);

  // Snap the camera to a reveal's stepped target (scrubbing / reset — no glide).
  const fitForReveal = useCallback(
    (rev: number) => {
      camRadiusRef.current = targetRadius(rev);
      applyFit(camRadiusRef.current);
    },
    [applyFit, targetRadius]
  );

  // Playback: sweep reveal 0 → 1 over SWEEP_MS, then stop (play once).
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    if (!playing) {
      return;
    }

    let raf = 0;
    let start = 0;

    const step = (now: number) => {
      if (!start) {
        // Anchor (in clock-space) so a resume continues from the current reveal.
        start = now - invCineEase(revealRef.current) * SWEEP_MS;
      }

      const progress = Math.min(1, (now - start) / SWEEP_MS);
      const next = cineEase(progress);

      // Ease the camera toward the leading ring's radius (a step target): it
      // holds while a band fills, then pushes out when the next shell is reached.
      const target = targetRadius(next);
      camRadiusRef.current += (target - camRadiusRef.current) * 0.1;
      applyFit(camRadiusRef.current);
      setRevealValue(next);

      // End once the reveal is complete AND the camera has settled on the final
      // shell, so the last push-out finishes instead of cutting off.
      if (progress >= 1 && Math.abs(target - camRadiusRef.current) < 0.5) {
        camRadiusRef.current = target;
        applyFit(target);
        setPlaying(false);

        return;
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [applyFit, playing, setRevealValue, targetRadius]);

  const onTogglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);

      return;
    }

    // Leaving scrub: play eases (cinematic) rather than holding the snapped view.
    snapMotionRef.current = false;

    // Replay from the start when parked at the end. Snap straight to the empty
    // state (no fade-out) before playing in.
    if (revealRef.current >= 1) {
      resetFades();
      fitForReveal(0);
      setRevealValue(0);
    }

    setPlaying(true);
  }, [fitForReveal, playing, resetFades, setRevealValue]);

  const onScrub = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 1);
      setPlaying(false);
      // Scrub is direct manipulation: snap fades + camera to the pointer so a
      // fast drag jumps there instead of replaying the birth-in from a stale spot.
      snapMotionRef.current = true;
      fitForReveal(next);
      setRevealValue(next);
    },
    [fitForReveal, setRevealValue]
  );

  // Recompute the legend's memory/concept swatches from the live --theme-primary
  // (matches the canvas), re-running on theme change and once the canvas is mounted.
  useEffect(() => {
    const el = canvasRef.current ?? wrapRef.current;

    if (!el) {
      return;
    }

    const style = getComputedStyle(el);
    const val = style.getPropertyValue('--theme-primary').trim();

    if (val) {
      const bgVal =
        style.getPropertyValue('--background').trim() ||
        style.getPropertyValue('--dt-background').trim() ||
        '#000';

      const primary = resolveRgb(val);
      const bg = resolveRgb(bgVal);
      setMemoryColor(rgba(memoryInkFor(primary, bg), 0.9));
      setConceptColor(rgba(conceptInkFor(primary, bg), 0.9));
    }
  }, [size, themeEpoch]);

  // Repaint + repalette when the theme/mode repaints (the shared observer fires
  // after applyTheme rewrites the class + inline vars on <html>).
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    themeDirtyRef.current = true;
    invalidate();
  }, [invalidate, themeEpoch]);

  // Render loop. The core scramble animates continuously, so the loop runs while
  // the window is visible — but each frame is cheap (live scramble + a blit of the
  // cached static layer). The expensive scene only re-renders when invalidate()
  // marks it dirty. Capped to ~30fps; interaction (force) bypasses the cap.
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    let raf = 0;
    const ANIM_MS = 1000 / 30;
    let lastAnimTs = 0;
    let force = true;

    let paused = false;
    let pauseController: ReturnType<typeof createRendererLoopPauseController>;

    const schedule = () => {
      if (!paused && !raf) {
        raf = requestAnimationFrame(frame);
      }
    };

    // The static scene (rings, bands, links, nodes, labels) is cached in an
    // offscreen layer and only re-rendered when something actually changes —
    // dirtyRef flags that. The animated core scramble is the ONLY per-frame work:
    // each frame we just clear, draw the live scramble, and blit the cached layer
    // on top. So an idle map costs a scramble + one drawImage, not a full redraw.
    let staticCanvas: HTMLCanvasElement | null = null;

    const paint = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');

      if (!canvas || !ctx) {
        return;
      }

      if (!staticCanvas) {
        staticCanvas = document.createElement('canvas');
      }

      // Keep the offscreen layer matched to the backing store; a resize wipes it,
      // so force a static rebuild.
      if (staticCanvas.width !== canvas.width || staticCanvas.height !== canvas.height) {
        staticCanvas.width = canvas.width;
        staticCanvas.height = canvas.height;
        dirtyRef.current = true;
      }

      const offCtx = staticCanvas.getContext('2d');

      if (!offCtx) {
        return;
      }

      if (themeDirtyRef.current || !paletteRef.current) {
        paletteRef.current = computePalette(canvas);
        themeDirtyRef.current = false;
        dirtyRef.current = true;
      }

      const palette = paletteRef.current;

      if (!palette) {
        return;
      }

      // Rebuild the cached static layer only when the scene changed; keep
      // rebuilding while fades are mid-ease (drawScene returns `animating`).
      if (dirtyRef.current) {
        const { animating, ringLabelRects } = drawScene({
          adjacency: adjacencyRef.current,
          byId: byIdRef.current,
          ctx: offCtx,
          dpr: dprRef.current,
          fades: fadeRef.current,
          focusId: selectedIdRef.current ?? hoverRef.current,
          highlight: highlightRef.current,
          hoverId: hoverRef.current,
          hoverLink: hoveredLinkRef.current,
          hoverRing: hoveredRingRef.current,
          links: linksRef.current,
          memById: memByIdRef.current,
          nodes: nodesRef.current,
          palette,
          reveal: revealRef.current,
          rings: ringsRef.current,
          selectedRing: selectedRingRef.current,
          size: sizeRef.current,
          snapMotion: snapMotionRef.current,
          vp: viewportRef.current
        });

        // One-shot: a scrub snaps this frame; hover/focus afterward eases as usual
        // (buckets are already at target, so the next eased frames don't move).
        snapMotionRef.current = false;
        ringLabelRectsRef.current = ringLabelRects;
        dirtyRef.current = animating;

        const zoomLabel = zoomLabelRef.current;
        const { h, w } = sizeRef.current;

        if (zoomLabel && w > 0 && h > 0) {
          const rings = ringsRef.current;
          const rest = fitViewport(w, h, rings[rings.length - 1]?.r ?? RING_OUTER).k;
          const text = `${Math.round((viewportRef.current.k / rest) * 100)}%`;

          if (zoomLabel.textContent !== text) {
            zoomLabel.textContent = text;
          }
        }
      }

      // Composite order flips on focus/hover. Idle: scene first, sphere on top —
      // its backdrop wash dims the busy centre. Focused/hovered: sphere first,
      // scene on top — so the active node's tooltip + lit lines lift ABOVE the
      // sphere instead of being covered by it.
      const focused = selectedIdRef.current ?? hoverRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (focused) {
        drawScramble({
          ctx,
          dpr: dprRef.current,
          palette,
          rings: ringsRef.current,
          vp: viewportRef.current
        });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(staticCanvas, 0, 0);
      } else {
        ctx.drawImage(staticCanvas, 0, 0);
        drawScramble({
          ctx,
          dpr: dprRef.current,
          palette,
          rings: ringsRef.current,
          vp: viewportRef.current
        });
      }
    };

    const frame = (ts: number) => {
      raf = 0;

      // The scramble animates every frame; throttle to ANIM_MS unless an
      // interaction (force) needs an immediate repaint.
      if (!force && ts - lastAnimTs < ANIM_MS) {
        schedule();

        return;
      }

      force = false;
      lastAnimTs = ts;
      paint();
      schedule();
    };

    invalidateRef.current = () => {
      dirtyRef.current = true;
      force = true;
      schedule();
    };

    // Suspend the loop when the window drops out of view; wake + force a
    // fresh frame the moment it returns so the resume is seamless.
    const onActivity = () => {
      const next = pauseController.isPaused();

      if (next === paused) {
        return;
      }

      paused = next;

      if (paused) {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      } else {
        dirtyRef.current = true;
        force = true;
        schedule();
      }
    };

    pauseController = createRendererLoopPauseController(onActivity);
    paused = pauseController.isPaused();

    schedule();

    return () => {
      cancelAnimationFrame(raf);
      pauseController.dispose();

      invalidateRef.current = () => {};
    };
  }, []);

  // Size the backing canvas (DPR-aware).
  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    sizeRef.current = size;
    dprRef.current = Math.min(2, window.devicePixelRatio || 1);
    const canvas = canvasRef.current;

    if (canvas && size.w > 0 && size.h > 0) {
      canvas.width = Math.round(size.w * dprRef.current);
      canvas.height = Math.round(size.h * dprRef.current);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
    }

    invalidate();
  }, [invalidate, size]);

  // ── Pointer interactions (invert the tilted projection for hit-testing) ─────
  const pickNode = useCallback((cssX: number, cssY: number): null | SimNode => {
    const vp = viewportRef.current;
    // Hit radius mirrors the billboarded draw: rested fit scale, screen space.
    const nodeK = fitScale(sizeRef.current.w, sizeRef.current.h, ringsRef.current);
    let best: null | SimNode = null;
    let bestD = Infinity;

    for (const n of nodesRef.current) {
      const r = nodeRadius(n) * nodeK + 6;
      const sx = n.x * vp.k + vp.x;
      const sy = n.y * vp.k * TILT + vp.y;
      const d = (sx - cssX) ** 2 + (sy - cssY) ** 2;

      if (d < r * r && d < bestD) {
        bestD = d;
        best = n;
      }
    }

    return best;
  }, []);

  // Nearest link within ~5px of the cursor (screen space), or null.
  const pickLink = (cssX: number, cssY: number): null | string => {
    const vp = viewportRef.current;
    let best: null | string = null;
    let bestD = 25;

    for (const link of linksRef.current) {
      const s =
        typeof link.source === 'object' ? link.source : byIdRef.current.get(String(link.source));
      const t =
        typeof link.target === 'object' ? link.target : byIdRef.current.get(String(link.target));

      if (!s || !t) {
        continue;
      }

      const d = distToSegmentSq(
        cssX,
        cssY,
        s.x * vp.k + vp.x,
        s.y * vp.k * TILT + vp.y,
        t.x * vp.k + vp.x,
        t.y * vp.k * TILT + vp.y
      );

      if (d < bestD) {
        bestD = d;
        best = `${s.id}->${t.id}`;
      }
    }

    return best;
  };

  const pickRingLabel = (cssX: number, cssY: number): null | number => {
    for (const r of ringLabelRectsRef.current) {
      if (cssX >= r.x && cssX <= r.x + r.w && cssY >= r.y && cssY <= r.y + r.h) {
        return r.i;
      }
    }

    return null;
  };

  const localXY = (e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();

    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  const idleDrag = (): typeof dragRef.current => ({
    click: false,
    id: null,
    mode: 'none',
    moved: false,
    ring: null,
    sx: 0,
    sy: 0,
    vp: viewportRef.current
  });

  const syncCursor = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const drag = dragRef.current;
    canvas.style.cursor =
      drag.mode === 'pan' && drag.moved
        ? 'grabbing'
        : spaceRef.current.held
          ? 'grab'
          : hoverRef.current || hoveredRingRef.current != null
            ? 'pointer'
            : 'default';
  };

  // 100% is the resting fit (the whole disk in frame), not the raw scale.
  const restingK = () =>
    fitViewport(
      sizeRef.current.w,
      sizeRef.current.h,
      ringsRef.current[ringsRef.current.length - 1]?.r ?? RING_OUTER
    ).k;

  // Zoom keeping the screen point (px, py) still; defaults to the canvas centre.
  const zoomTo = (k: number, px = sizeRef.current.w / 2, py = sizeRef.current.h / 2) => {
    setPlaying(false);
    const vp = viewportRef.current;
    const next = clamp(k, ZOOM_MIN, ZOOM_MAX);
    viewportRef.current = {
      k: next,
      x: px - ((px - vp.x) / vp.k) * next,
      y: py - ((py - vp.y) / vp.k) * next
    };
    invalidate();
  };

  const zoomStep = (direction: 1 | -1) => {
    zoomTo(viewportRef.current.k + direction * ZOOM_STEP * restingK());
  };

  const fitAll = () => {
    setPlaying(false);
    viewportRef.current = fitViewport(
      sizeRef.current.w,
      sizeRef.current.h,
      ringsRef.current[ringsRef.current.length - 1]?.r ?? RING_OUTER
    );
    invalidate();
  };

  const resetView = () => {
    fitAll();
    selectedRingRef.current = null;
    setSelectedId(null);
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle button or Space + drag act as the hand tool; a plain drag pans too.
    const hand = e.button === 1 || (e.button === 0 && spaceRef.current.held);

    if (e.button !== 0 && !hand) {
      return;
    }

    if (e.button === 1) {
      e.preventDefault();
    }

    const { x, y } = localXY(e);
    const ringHit = hand ? null : pickRingLabel(x, y);
    hoveredRingRef.current = null;
    // Nodes aren't draggable (static map) — remember which was pressed so a click
    // (press without movement) can select it; any drag just pans.
    const nodeId = hand || ringHit != null ? null : (pickNode(x, y)?.id ?? null);
    dragRef.current = {
      click: !hand,
      id: nodeId,
      mode: 'pan',
      moved: false,
      ring: ringHit,
      sx: e.clientX,
      sy: e.clientY,
      vp: viewportRef.current
    };
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;

    if (drag.mode === 'none') {
      const { x, y } = localXY(e);
      const ringHit = spaceRef.current.held ? null : pickRingLabel(x, y);
      const id = spaceRef.current.held || ringHit != null ? null : (pickNode(x, y)?.id ?? null);
      // Links are the last fallback (only when not over a node/date).
      const linkKey =
        !spaceRef.current.held && ringHit == null && id == null ? pickLink(x, y) : null;

      if (
        id !== hoverRef.current ||
        ringHit !== hoveredRingRef.current ||
        linkKey !== hoveredLinkRef.current
      ) {
        hoverRef.current = id;
        hoveredRingRef.current = ringHit;
        hoveredLinkRef.current = linkKey;
        invalidate();
        syncCursor();
      }

      return;
    }

    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;

    if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      drag.moved = true;
      // Taking manual control of the camera ends an auto-fit play-through.
      setPlaying(false);

      if (spaceRef.current.held) {
        spaceRef.current.panned = true;
      }

      syncCursor();
    }

    if (drag.moved) {
      viewportRef.current = { ...drag.vp, x: drag.vp.x + dx, y: drag.vp.y + dy };
      invalidate();
    }
  };

  const endDrag = () => {
    const drag = dragRef.current;

    // A click (press without movement) toggles a ring date, a node, or clears.
    if (drag.mode === 'pan' && !drag.moved && drag.click) {
      // Double tap (trackpad tap-to-click may never emit a dblclick) resets view.
      if (doubleTapRef.current()) {
        resetView();
        dragRef.current = idleDrag();
        syncCursor();

        return;
      }

      // Independent toggles: a date and a node can both be selected.
      if (drag.ring != null) {
        selectedRingRef.current = selectedRingRef.current === drag.ring ? null : drag.ring;
      } else if (drag.id) {
        setSelectedId((prev) => (prev === drag.id ? null : drag.id));
      } else {
        selectedRingRef.current = null;
        setSelectedId(null);
      }

      invalidate();
    }

    dragRef.current = idleDrag();
    syncCursor();
  };

  const onMouseLeave = () => {
    pointerInsideRef.current = false;
    hoverRef.current = null;
    hoveredRingRef.current = null;
    hoveredLinkRef.current = null;
    invalidate();
    endDrag();
  };

  // Same wheel model as the design canvas: scroll / two-finger swipe pans
  // (Shift turns a vertical wheel horizontal), ⌘/Ctrl + wheel and pinch zoom.
  const onWheel = (e: WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    e.preventDefault();

    // macOS smart zoom (two-finger double-tap) → reset (see lib/trackpad-gestures).
    if (isSmartZoomWheel(e)) {
      resetView();

      return;
    }

    setPlaying(false);
    const { dx, dy } = wheelDeltaPx(e, rect.height);

    if (e.ctrlKey || e.metaKey) {
      // One zoom step at most per event, so a mouse notch and a pinch both feel even.
      const step = clamp(dy, -ZOOM_STEP * 100, ZOOM_STEP * 100) / 100;
      zoomTo(viewportRef.current.k * (1 - step), e.clientX - rect.left, e.clientY - rect.top);

      return;
    }

    const [panX, panY] = e.shiftKey && dx === 0 ? [dy, 0] : [dx, dy];
    const vp = viewportRef.current;
    viewportRef.current = { ...vp, x: vp.x - panX, y: vp.y - panY };
    invalidate();
  };

  // Safari reports trackpad pinches as gesture events instead of ⌘ + wheel.
  const onPinch = (factor: number, clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (rect) {
      zoomTo(viewportRef.current.k * factor, clientX - rect.left, clientY - rect.top);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (isKeyboardOwner(document.activeElement)) {
      return;
    }

    if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();

      if (!spaceRef.current.held) {
        spaceRef.current = { held: true, panned: false };
        syncCursor();
      }

      return;
    }

    if (!pointerInsideRef.current) {
      return;
    }

    const mod = e.metaKey || e.ctrlKey;

    if (mod && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      zoomStep(1);
    } else if (mod && e.key === '-') {
      e.preventDefault();
      zoomStep(-1);
    } else if (mod && e.key === '0') {
      e.preventDefault();
      zoomTo(restingK());
    } else if (e.shiftKey && !mod && e.code === 'Digit1') {
      e.preventDefault();
      fitAll();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || !spaceRef.current.held) {
      return;
    }

    const { panned } = spaceRef.current;
    spaceRef.current = { held: false, panned: false };
    syncCursor();

    if (!panned) {
      onTogglePlay();
    }
  };

  const handlersRef = useRef({ onKeyDown, onKeyUp, onPinch, onWheel });

  // eslint-disable-next-line no-restricted-syntax -- legitimate non-atom ref write (see eslint rule comment)
  useEffect(() => {
    handlersRef.current = { onKeyDown, onKeyUp, onPinch, onWheel };
  });

  // Native listeners: React's wheel handler is passive, so it can't stop ⌘/Ctrl +
  // wheel or a pinch from zooming the whole page instead of the map.
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    let gestureScale = 1;
    const onWheelEvent = (e: WheelEvent) => handlersRef.current.onWheel(e);
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const { clientX, clientY, scale } = e as Event & {
        clientX: number;
        clientY: number;
        scale: number;
      };
      handlersRef.current.onPinch(scale / gestureScale, clientX, clientY);
      gestureScale = scale;
    };
    const onKeyDownEvent = (e: KeyboardEvent) => handlersRef.current.onKeyDown(e);
    const onKeyUpEvent = (e: KeyboardEvent) => handlersRef.current.onKeyUp(e);
    const onBlur = () => {
      spaceRef.current = { held: false, panned: false };
    };

    canvas.addEventListener('wheel', onWheelEvent, { passive: false });
    canvas.addEventListener('gesturestart', onGestureStart);
    canvas.addEventListener('gesturechange', onGestureChange);
    window.addEventListener('keydown', onKeyDownEvent);
    window.addEventListener('keyup', onKeyUpEvent);
    window.addEventListener('blur', onBlur);

    return () => {
      canvas.removeEventListener('wheel', onWheelEvent);
      canvas.removeEventListener('gesturestart', onGestureStart);
      canvas.removeEventListener('gesturechange', onGestureChange);
      window.removeEventListener('keydown', onKeyDownEvent);
      window.removeEventListener('keyup', onKeyUpEvent);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return (
    <div
      className='relative h-full min-h-0 flex-1 overflow-hidden'
      ref={wrapRef}
      style={{ '--theme-primary': 'var(--primary)' } as React.CSSProperties}
    >
      <canvas
        className='block touch-none select-none text-foreground'
        onDoubleClick={resetView}
        onMouseDown={onMouseDown}
        onMouseEnter={() => {
          pointerInsideRef.current = true;
        }}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        ref={canvasRef}
      />

      {/* Zoom controls styled like the design canvas's (Excalidraw) zoom pill. */}
      <div className='bg-background/70 absolute bottom-3 left-3 z-20 flex items-center overflow-hidden rounded-[0.625rem] shadow-[0_0_0_1px_color-mix(in_oklab,var(--border)_70%,transparent)] backdrop-blur-[8px]'>
        <ZoomButton label='Zoom out' onClick={() => zoomStep(-1)}>
          <Icons.minus className='size-3.5' />
        </ZoomButton>
        <button
          ref={zoomLabelRef}
          type='button'
          title='Reset zoom'
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => zoomTo(restingK())}
          className='text-muted-foreground hover:bg-accent/50 hover:text-foreground h-7.5 w-12 text-xs tabular-nums transition-colors'
        >
          100%
        </button>
        <ZoomButton label='Zoom in' onClick={() => zoomStep(1)}>
          <Icons.add className='size-3.5' />
        </ZoomButton>
      </div>

      <div className='pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center px-12'>
        <Timeline
          axis={timeAxis}
          conceptColor={conceptColor}
          memoryColor={memoryColor}
          onScrub={onScrub}
          onTogglePlay={onTogglePlay}
          playing={playing}
          revealStore={revealStore}
          ringStops={ringStops}
        />
      </div>

      {/* Legend — bottom-left, one entry per line like a conventional key. */}
      <div className='pointer-events-none absolute bottom-13 left-3 flex flex-col gap-1 text-[0.62rem] text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <span className='inline-block size-2 rounded-full bg-[var(--theme-primary)]/80' /> skill
        </span>
        <span className='flex items-center gap-1.5'>
          <span
            className='inline-block size-2 rotate-45'
            style={{ backgroundColor: memoryColor }}
          />{' '}
          memory
        </span>
        <span className='flex items-center gap-1.5'>
          <span
            className='inline-block size-2.5 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]'
            style={{ backgroundColor: conceptColor }}
          />{' '}
          concept
        </span>
        <span className='text-[0.58rem] text-muted-foreground/65'>
          core = oldest · outer = newer
        </span>
        <RevealLabel axis={timeAxis} revealStore={revealStore} />
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className='text-muted-foreground hover:bg-accent/50 hover:text-foreground flex size-7.5 items-center justify-center transition-colors'
    >
      {children}
    </button>
  );
}
