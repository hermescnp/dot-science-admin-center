import type { InfobarContent } from '@/components/ui/infobar';

export const featuresInfoContent: InfobarContent = {
  title: 'Platform features',
  sections: [
    {
      title: 'Overview',
      description:
        'Every functionality of the Dot Science platforms, stored in Supabase. The same records appear in the platform details on the Architecture page, so a change made here shows up there too.',
      links: []
    },
    {
      title: 'Sections',
      description:
        'Each feature belongs to a platform section: Create, Agora, Studio or About. General is for functionalities that span the whole platform.',
      links: []
    },
    {
      title: 'Services',
      description:
        'Services are the architecture nodes a feature depends on, such as Supabase or OpenRouter. They are shown as badges here and in the platform details.',
      links: []
    },
    {
      title: 'Editing',
      description:
        'Use "Add feature" to create one, or the row menu to update or delete it. Search by name or description and filter by platform or section.',
      links: []
    }
  ]
};
