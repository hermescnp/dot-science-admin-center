import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isHidden?: boolean;
}

export function LoadingOverlay({ isHidden = false }: LoadingOverlayProps) {
  return (
    <div
      aria-hidden={isHidden}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#1e2332] text-white/80 transition-opacity duration-500',
        isHidden && 'pointer-events-none opacity-0'
      )}
    >
      <Spinner className='size-8' />
      <span className='text-sm tracking-wide'>Loading virtual office…</span>
    </div>
  );
}
