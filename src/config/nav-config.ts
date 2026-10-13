import { NavGroup } from '@/types';

/**
 * Navigation configuration, used for both the sidebar navigation and Cmd+K bar.
 * Items are organized into groups, each rendered with a SidebarGroupLabel.
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Architecture',
        url: '/dashboard/architecture',
        icon: 'architecture',
        shortcut: ['a', 'r'],
        isActive: false,
        items: []
      },
      {
        title: 'Organizational Structure',
        url: '#',
        icon: 'hierarchy',
        isActive: false,
        items: [
          {
            title: 'Hierarchy map',
            url: '/dashboard/org-structure',
            icon: 'hierarchy',
            shortcut: ['o', 's']
          },
          {
            title: 'Design',
            url: '/dashboard/departments/design',
            icon: 'whiteboard'
          },
          {
            title: 'Knowledge Management',
            url: '/dashboard/departments/knowledge-management',
            icon: 'stars'
          },
          {
            title: 'Public Relations & Events',
            url: '/dashboard/departments/public-relations-events',
            icon: 'speakerphone'
          },
          {
            title: 'Strategic Planning',
            url: '/dashboard/departments/strategic-planning',
            icon: 'timeline'
          },
          {
            title: 'Research & Development',
            url: '/dashboard/departments/research-development',
            icon: 'flask'
          },
          {
            title: 'The Wisdom Table',
            url: '/dashboard/departments/wisdom-table',
            icon: 'messages'
          }
        ]
      },
      {
        title: 'Virtual Office',
        url: '/dashboard/virtual-office',
        icon: 'building',
        shortcut: ['v', 'o'],
        isActive: false,
        items: []
      },
      {
        title: 'Calendar',
        url: '/dashboard/calendar',
        icon: 'calendar',
        shortcut: ['c', 'l'],
        isActive: false,
        items: []
      },
      {
        title: 'Platforms',
        url: '#',
        icon: 'apps',
        isActive: false,
        items: [
          { title: 'General', url: '/dashboard/platforms', icon: 'apps', shortcut: ['p', 'l'] },
          { title: 'Dot Science AI', url: '/dashboard/platforms/dot-science-ai', icon: 'world' },
          { title: 'Workspace', url: '/dashboard/platforms/workspace', icon: 'workspace' },
          { title: 'IAteneo', url: '/dashboard/platforms/iateneo', icon: 'brain' },
          { title: 'Golden Papers', url: '/dashboard/platforms/golden-papers', icon: 'book' },
          { title: 'Abstra Space', url: '/dashboard/platforms/abstra-space', icon: 'cube' },
          { title: 'Affine Club', url: '/dashboard/platforms/affine-club', icon: 'compass' },
          { title: 'Admin Center', url: '/dashboard/platforms/admin-center', icon: 'shieldLock' }
        ]
      },
      {
        title: 'Features',
        url: '/dashboard/features',
        icon: 'listDetails',
        shortcut: ['f', 'e'],
        isActive: false,
        items: []
      },
      {
        title: 'Agents',
        url: '/dashboard/agents',
        icon: 'robot',
        shortcut: ['a', 'g'],
        isActive: false,
        items: []
      },
      {
        title: 'Maintenance',
        url: '/dashboard/maintenance',
        icon: 'tools',
        shortcut: ['m', 'a'],
        isActive: false,
        items: []
      },
      {
        title: 'Billing Plans',
        url: '/dashboard/billing-plans',
        icon: 'creditCard',
        shortcut: ['b', 'p'],
        isActive: false,
        items: []
      },
      {
        title: 'Users',
        url: '/dashboard/users',
        icon: 'teams',
        shortcut: ['u', 'u'],
        isActive: false,
        items: []
      },
      {
        title: 'Leads',
        url: '/dashboard/leads',
        icon: 'target',
        shortcut: ['l', 'l'],
        isActive: false,
        items: []
      },
      {
        title: 'Kanban',
        url: '/dashboard/kanban',
        icon: 'kanban',
        shortcut: ['k', 'k'],
        isActive: false,
        items: []
      },
      {
        title: 'Chat',
        url: '/dashboard/chat',
        icon: 'chat',
        shortcut: ['c', 'c'],
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: 'Elements',
    items: [
      {
        title: 'Forms',
        url: '#',
        icon: 'forms',
        isActive: true,
        items: [
          {
            title: 'Basic Form',
            url: '/dashboard/forms/basic',
            icon: 'forms',
            shortcut: ['f', 'f']
          },
          {
            title: 'Multi-Step Form',
            url: '/dashboard/forms/multi-step',
            icon: 'forms'
          },
          {
            title: 'Sheet & Dialog',
            url: '/dashboard/forms/sheet-form',
            icon: 'forms'
          },
          {
            title: 'Advanced Patterns',
            url: '/dashboard/forms/advanced',
            icon: 'forms'
          }
        ]
      },
      {
        title: 'React Query',
        url: '/dashboard/react-query',
        icon: 'code',
        isActive: false,
        items: []
      },
      {
        title: 'Icons',
        url: '/dashboard/elements/icons',
        icon: 'palette',
        isActive: false,
        items: []
      }
    ]
  },
  {
    label: '',
    items: [
      {
        title: 'Account',
        url: '#',
        icon: 'account',
        isActive: true,
        items: [
          {
            title: 'Profile',
            url: '/dashboard/profile',
            icon: 'profile',
            shortcut: ['m', 'm']
          },
          {
            title: 'Notifications',
            url: '/dashboard/notifications',
            icon: 'notification',
            shortcut: ['n', 'n']
          }
        ]
      }
    ]
  }
];
