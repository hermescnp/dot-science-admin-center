'use client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar';
import { SidebarPanelToggle } from '@/components/layout/sidebar-panel-toggle';
import { navGroups } from '@/config/nav-config';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import type { NavItem } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import { Icons } from '../icons';

export default function AppSidebar() {
  const pathname = usePathname();
  const { isOpen } = useMediaQuery();
  const { toggleSidebar } = useSidebar();
  const filteredGroups = useFilteredNavGroups(navGroups);

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  return (
    <Sidebar collapsible='offcanvas'>
      <SidebarHeader className='border-sidebar-border relative z-10 h-14 shrink-0 flex-row items-center gap-1 border-b px-2 py-2 shadow-[0_4px_24px_rgba(15,23,42,0.10),0_16px_48px_rgba(15,23,42,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.40),0_16px_48px_rgba(0,0,0,0.28)]'>
        <div className='text-foreground flex h-10 min-w-0 flex-1 items-center gap-2 px-2 text-sm font-medium'>
          <Image
            src='/icons/admin-center.png'
            alt=''
            aria-hidden
            width={32}
            height={32}
            className='size-8 shrink-0 object-contain'
          />
          <span className='truncate'>Admin Center</span>
        </div>
        <SidebarPanelToggle label='Collapse sidebar' onClick={toggleSidebar}>
          <Icons.chevronsLeft className='size-4' />
        </SidebarPanelToggle>
      </SidebarHeader>
      <SidebarContent className='overflow-x-hidden'>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label || 'ungrouped'} className='py-0'>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon ? Icons[item.icon] : Icons.logo;
                return item?.items && item?.items?.length > 0 ? (
                  <NavCollapsible key={item.title} item={item} pathname={pathname} />
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} aria-label={item.title} />}
                      tooltip={item.title}
                      isActive={pathname === item.url}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

interface NavCollapsibleProps {
  item: NavItem;
  pathname: string;
}

function NavCollapsible({ item, pathname }: NavCollapsibleProps) {
  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
  const hasActiveChild = item.items?.some((subItem) => pathname === subItem.url) ?? false;
  const [open, setOpen] = React.useState(Boolean(item.isActive) || hasActiveChild);
  const [prevHasActiveChild, setPrevHasActiveChild] = React.useState(hasActiveChild);

  if (hasActiveChild !== prevHasActiveChild) {
    setPrevHasActiveChild(hasActiveChild);
    if (hasActiveChild) setOpen(true);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={item.title}
            isActive={pathname === item.url}
            className='group/collapsible'
          />
        }
      >
        {item.icon && <Icon />}
        <span>{item.title}</span>
        <Icons.chevronRight className='ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90' />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items?.map((subItem) => {
            const SubIcon = subItem.icon ? Icons[subItem.icon] : null;
            return (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  render={<Link href={subItem.url} aria-label={subItem.title} />}
                  isActive={pathname === subItem.url}
                >
                  {SubIcon && <SubIcon />}
                  <span>{subItem.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
