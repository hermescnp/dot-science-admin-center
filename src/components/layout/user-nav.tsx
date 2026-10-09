'use client';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useThemeConfig } from '@/components/themes/active-theme';
import { THEMES } from '@/components/themes/theme.config';
import { getUserDisplay } from '@/components/user-avatar-profile';
import { useAuth } from '@/lib/auth-client';
import { startThemeTransition } from '@/lib/theme-transition';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export function UserNav() {
  const { user, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { activeTheme, setActiveTheme } = useThemeConfig();
  const router = useRouter();

  const toggleThemeMode = React.useCallback(() => {
    startThemeTransition(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'));
  }, [resolvedTheme, setTheme]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'd' || !e.shiftKey || !(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      toggleThemeMode();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleThemeMode]);

  const { fullName, avatarUrl, email } = getUserDisplay(user);
  const displayName = fullName || email || 'Account';
  const isSignedIn = Boolean(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type='button'
            aria-label='User account'
            title={displayName}
            className={cn(
              'relative ml-2 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[0.5px] border-[#416679] text-white transition-all duration-200 hover:scale-105 hover:border-[#68DBFF] focus-visible:ring-2 focus-visible:ring-[#68DBFF]/45 focus-visible:outline-none active:scale-95',
              isSignedIn ? 'bg-[#003563]' : 'bg-[#0A1727] hover:bg-black/20'
            )}
          />
        }
      >
        {isSignedIn ? (
          <Avatar className='size-full rounded-none after:hidden'>
            <AvatarImage
              src={avatarUrl}
              alt=''
              referrerPolicy='no-referrer'
              className='rounded-none'
            />
            <AvatarFallback className='rounded-none bg-white/20 text-[22px] text-white/60'>
              {displayName[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Icons.user className='size-5' stroke={1.5} aria-hidden />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        {email ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className='font-normal'>
                <p className='text-foreground truncate text-sm font-medium'>{displayName}</p>
                {displayName !== email ? (
                  <p className='text-muted-foreground truncate text-xs'>{email}</p>
                ) : null}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <div
            className='flex items-center justify-between gap-3 px-2 py-2'
            onClick={(e) => e.stopPropagation()}
          >
            <Label
              htmlFor='user-menu-dark-mode-switch'
              className='cursor-pointer gap-2 text-sm font-normal'
            >
              Dark mode <Kbd>⌘⇧D</Kbd>
            </Label>
            <Switch
              id='user-menu-dark-mode-switch'
              checked={resolvedTheme === 'dark'}
              onCheckedChange={toggleThemeMode}
            />
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center justify-between'>
            Theme <Kbd>T T</Kbd>
          </DropdownMenuLabel>
          {THEMES.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setActiveTheme(option.value)}
              className='flex items-center gap-2'
            >
              {activeTheme === option.value ? (
                <Icons.check className='h-4 w-4 shrink-0' />
              ) : (
                <span className='w-4 shrink-0' />
              )}
              {option.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className='gap-2'>
            <Icons.account className='h-4 w-4' />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/notifications')}
            className='gap-2'
          >
            <Icons.notification className='h-4 w-4' />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          onClick={async () => {
            await signOut();
            router.replace('/auth/sign-in');
            router.refresh();
          }}
          className='gap-2 dark:text-red-300! dark:focus:text-red-200! dark:[&_svg]:text-red-300!'
        >
          <Icons.logout aria-hidden className='h-4 w-4' />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
