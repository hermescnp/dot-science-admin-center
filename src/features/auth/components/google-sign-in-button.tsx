'use client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-client';
import { useState } from 'react';

export function GoogleSignInButton({ next = '/dashboard/overview' }: { next?: string }) {
  const { signInWithGoogle } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className='flex w-full flex-col gap-2'>
      <Button
        className='w-full'
        size='lg'
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await signInWithGoogle(next);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
            setPending(false);
          }
        }}
      >
        <svg viewBox='0 0 24 24' aria-hidden className='mr-2 size-4'>
          <path
            fill='currentColor'
            d='M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.62 2.2-5.4 2.2-4.3 0-7.7-3.48-7.7-7.8s3.4-7.8 7.7-7.8c2.34 0 4.04.92 5.3 2.1l2.32-2.32C18.94 1.2 16.14 0 12.48 0 5.86 0 .36 5.4.36 12s5.5 12 12.12 12c3.58 0 6.28-1.18 8.38-3.36 2.16-2.16 2.84-5.2 2.84-7.64 0-.76-.06-1.46-.18-2.08H12.48z'
          />
        </svg>
        {pending ? 'Redirecting…' : 'Continue with Google'}
      </Button>
      {error && <p className='text-destructive text-center text-sm'>{error}</p>}
    </div>
  );
}
