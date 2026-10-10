import type { InfobarContent } from '@/components/ui/infobar';

export const usersInfoContent: InfobarContent = {
  title: 'Users',
  sections: [
    {
      title: 'Where the data comes from',
      description:
        'Every row is a Supabase account: the profile plus its sign-in details from Supabase Auth. Accounts are created when someone signs in to any platform, so there is no way to add users from here.',
      links: []
    },
    {
      title: 'Activity',
      description:
        'Counts of Golden Papers documents the user created, IAteneo sessions they hosted or joined, and Workspace projects they created. Hover the counts for the breakdown.',
      links: []
    },
    {
      title: 'Editing',
      description:
        'You can change the display name, the billing plan and platform admin access. Admins get into this admin center. You cannot remove your own admin access.',
      links: []
    }
  ]
};
