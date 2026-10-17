import { useEffect, useRef, useState } from 'react';

const SAVE_DELAY_MS = 1200;

export type SaveState =
  | { status: 'saved'; at: string }
  | { status: 'pending' }
  | { status: 'saving' }
  | { status: 'error'; message: string };

const SAVE_PRIORITY: Record<SaveState['status'], number> = {
  saved: 0,
  pending: 1,
  saving: 2,
  error: 3
};

/** One status for two savers: the more urgent one, or the later save when both are done. */
export function combineSaveStates(a: SaveState, b: SaveState): SaveState {
  if (a.status === 'saved' && b.status === 'saved') return a.at >= b.at ? a : b;
  return SAVE_PRIORITY[a.status] >= SAVE_PRIORITY[b.status] ? a : b;
}

/**
 * Batches rapid edits into one save after a quiet period. Pending work is flushed on unmount,
 * and `flush` can be called earlier (e.g. before the edited target changes).
 */
export function useDebouncedSave<T>(save: (value: T) => Promise<string>, savedAt: string) {
  const [state, setState] = useState<SaveState>({ status: 'saved', at: savedAt });
  const pendingRef = useRef<{ value: T } | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  async function run(value: T) {
    setState({ status: 'saving' });
    try {
      const at = await saveRef.current(value);
      setState(pendingRef.current ? { status: 'pending' } : { status: 'saved', at });
    } catch (error) {
      setState({ status: 'error', message: (error as Error).message });
    }
  }

  /**
   * Resolves once everything scheduled so far is saved. Saves run one after another, so an older
   * save can never land after a newer one.
   */
  async function flush() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const pending = pendingRef.current;
    if (!pending) {
      await inFlightRef.current;
      return;
    }
    pendingRef.current = null;
    const previous = inFlightRef.current ?? Promise.resolve();
    const saving = previous.then(() => run(pending.value));
    inFlightRef.current = saving;
    await saving;
    if (inFlightRef.current === saving) inFlightRef.current = null;
  }

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });
  useEffect(() => () => void flushRef.current(), []);

  const unsaved = state.status === 'pending' || state.status === 'saving';
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  function schedule(value: T) {
    pendingRef.current = { value };
    setState({ status: 'pending' });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushRef.current(), SAVE_DELAY_MS);
  }

  return { state, schedule, flush: () => flushRef.current() };
}
