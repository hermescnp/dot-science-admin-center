import { cn } from '@/lib/utils';
import { GoogleSignInButton } from './google-sign-in-button';
import { InteractiveGridPattern } from './interactive-grid';

export default function SignInViewPage({ error }: { error?: string }) {
  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='relative hidden h-full flex-col p-10 lg:flex dark:border-r'>
        <div className='absolute inset-0 bg-sidebar' />
        <div className='text-sidebar-foreground relative z-20 flex items-center text-lg font-medium'>
          Dot Science Admin Center
        </div>
        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(400px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[0%] h-full skew-y-12'
          )}
        />
      </div>
      <div className='flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-sm flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>Sign in</h1>
            <p className='text-muted-foreground text-sm'>
              Use your Dot Science account. Access is limited to platform admins.
            </p>
          </div>
          <GoogleSignInButton />
          {error && (
            <p className='text-destructive text-center text-sm'>
              Sign-in failed ({error}). Please try again.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
