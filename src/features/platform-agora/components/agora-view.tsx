'use client';

import { useDeferredValue, useMemo, useReducer, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { agoraConfigs, type AgoraPlatformId } from '../data/agora-configs';
import {
  EMPTY_FILTERS,
  applyFilters,
  buildModeratedItems,
  type ModeratedItem,
  type ModerationOverride,
  type ModerationReason
} from '../data/moderation';
import { AgoraCategorized } from './agora-categorized';
import { AgoraGallery } from './agora-gallery';
import { AgoraHeader } from './agora-header';
import { AgoraList } from './agora-list';
import { BanDialog, BulkActionBar, ItemDetailsDialog } from './moderation-actions';
import { ModerationContext, type ModerationContextValue } from './moderation-context';
import { ModerationFilterBar, filtersReducer, type AgoraLayout } from './moderation-filters';
import { ModerationStats } from './moderation-stats';

type Overrides = Record<string, ModerationOverride>;

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function AgoraView({ platformId }: { platformId: AgoraPlatformId }) {
  const config = agoraConfigs[platformId];
  const [tabId, setTabId] = useState(config.tabs[0].id);
  const tab = config.tabs.find((t) => t.id === tabId) ?? config.tabs[0];
  const [layout, setLayout] = useState<AgoraLayout>('categorized');
  const [filters, dispatch] = useReducer(filtersReducer, EMPTY_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [banIds, setBanIds] = useState<string[] | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const baseItems = useMemo(() => buildModeratedItems(tab), [tab]);
  const items = useMemo(
    () => baseItems.map((item) => (overrides[item.id] ? { ...item, ...overrides[item.id] } : item)),
    [baseItems, overrides]
  );
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const visible = useMemo(() => applyFilters(items, deferredFilters), [items, deferredFilters]);
  const visibleIds = useMemo(() => visible.map((item) => item.id), [visible]);

  function handleTabChange(nextId: string) {
    setTabId(nextId);
    dispatch({ type: 'set', patch: EMPTY_FILTERS });
    setSelectedIds(new Set());
  }

  function update(
    ids: string[],
    applies: (item: ModeratedItem) => boolean,
    patch: (item: ModeratedItem) => ModerationOverride,
    verb: string
  ) {
    const targets = ids.flatMap((id) => {
      const item = itemById.get(id);
      return item && applies(item) ? [item] : [];
    });
    if (targets.length === 0) {
      toast.info(`Nothing to ${verb.toLowerCase()} in the selection`);
      return;
    }
    const previous = targets.map((item) => [item.id, overrides[item.id]] as const);
    setOverrides((current) => {
      const next = { ...current };
      for (const item of targets) next[item.id] = patch(item);
      return next;
    });
    setSelectedIds(new Set());
    toast.success(
      targets.length === 1
        ? `${verb} “${targets[0].title}”`
        : `${verb} ${plural(targets.length, 'item')}`,
      {
        action: {
          label: 'Undo',
          onClick: () =>
            setOverrides((current) => {
              const next = { ...current };
              for (const [id, prior] of previous) {
                if (prior) next[id] = prior;
                else delete next[id];
              }
              return next;
            })
        }
      }
    );
  }

  function confirmBan(reason: ModerationReason, note: string) {
    if (!banIds) return;
    update(
      banIds,
      (item) => item.status !== 'banned',
      (item) => ({
        status: 'banned',
        reports: item.reports,
        ban: { reason, note, bannedAt: Date.now() }
      }),
      'Banned'
    );
    setBanIds(null);
  }

  const restore = (ids: string[]) =>
    update(
      ids,
      (item) => item.status === 'banned',
      (item) => ({ status: 'active', reports: item.reports, ban: undefined }),
      'Restored'
    );

  const dismissReports = (ids: string[]) =>
    update(
      ids,
      (item) => item.status !== 'banned' && item.reports.length > 0,
      () => ({ status: 'active', reports: [], ban: undefined }),
      'Dismissed reports on'
    );

  const contextValue: ModerationContextValue = {
    state: { selectedIds },
    actions: {
      toggleSelected: (id) =>
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      viewDetails: setDetailsId,
      ban: setBanIds,
      restore,
      dismissReports,
      copyId: (id) => {
        void navigator.clipboard.writeText(id).then(() => toast.success('Item ID copied'));
      }
    }
  };

  function selectAllVisible(select: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const categories = tab.categories.flatMap((category) => {
    const categoryItems = visible.filter((item) => item.categoryId === category.id);
    return categoryItems.length > 0
      ? [{ id: category.id, title: category.title, items: categoryItems }]
      : [];
  });
  const selectedList = [...selectedIds];

  return (
    <ModerationContext value={contextValue}>
      <div
        className='relative h-[calc(100svh-4rem)] w-full overflow-y-auto bg-[#07111d] text-white md:h-[calc(100svh-3.5rem)]'
        style={
          {
            '--agora-accent': config.accent,
            '--agora-secondary': config.secondary
          } as CSSProperties
        }
      >
        <AgoraHeader config={config} activeTab={tab.id} onTabChange={handleTabChange} />
        <ModerationStats
          items={items}
          activeStatuses={filters.statuses}
          onSelect={(status) =>
            dispatch({
              type: 'set',
              patch: { statuses: status === 'all' ? [] : [status] }
            })
          }
        />
        <ModerationFilterBar
          filters={filters}
          dispatch={dispatch}
          items={items}
          categories={tab.categories}
          visibleIds={visibleIds}
          selectedIds={selectedIds}
          onSelectAll={selectAllVisible}
          layout={layout}
          onLayoutChange={setLayout}
        />
        <div className='pt-5'>
          {visible.length === 0 ? (
            <div className='px-6 py-16 text-center'>
              <p className='text-sm text-white/60'>No items match these filters.</p>
              <button
                type='button'
                onClick={() => dispatch({ type: 'reset' })}
                className='mt-2 text-sm text-[var(--agora-accent)] hover:underline'
              >
                Clear filters
              </button>
            </div>
          ) : layout === 'categorized' ? (
            <AgoraCategorized categories={categories} />
          ) : layout === 'gallery' ? (
            <AgoraGallery items={visible} />
          ) : (
            <AgoraList items={visible} />
          )}
        </div>
        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            onBan={() => setBanIds(selectedList)}
            onRestore={() => restore(selectedList)}
            onDismissReports={() => dismissReports(selectedList)}
            onClear={() => setSelectedIds(new Set())}
          />
        )}
      </div>
      <BanDialog
        count={banIds?.length ?? 1}
        open={banIds !== null}
        onOpenChange={(open) => !open && setBanIds(null)}
        onConfirm={confirmBan}
      />
      <ItemDetailsDialog
        item={detailsId ? (itemById.get(detailsId) ?? null) : null}
        onOpenChange={(open) => !open && setDetailsId(null)}
      />
    </ModerationContext>
  );
}
