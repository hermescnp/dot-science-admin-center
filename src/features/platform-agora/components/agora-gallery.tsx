import type { ModeratedItem } from '../data/moderation';
import { AgoraItemCard } from './agora-item-card';

export function AgoraGallery({ items }: { items: ModeratedItem[] }) {
  return (
    <div className='grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 px-4 pb-8 md:px-6'>
      {items.map((item) => (
        <AgoraItemCard key={item.id} item={item} coverClassName='aspect-video' />
      ))}
    </div>
  );
}
