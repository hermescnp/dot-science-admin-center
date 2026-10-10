import type { InfobarContent } from '@/components/ui/infobar';

export const platformsInfoContent: InfobarContent = {
  title: 'Platforms',
  sections: [
    {
      title: 'Overview',
      description:
        'Every platform node from the Architecture page. Create is the main view of each platform and matches the preview shown on its node.',
      links: []
    },
    {
      title: 'Sections',
      description:
        'Agora, Studio and About are the other sides of a platform. A dashed cell means the section does not exist yet for that platform.',
      links: []
    },
    {
      title: 'Details',
      description:
        'Click a row to open the platform details, with its sections and the features stored for each one.',
      links: []
    }
  ]
};

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

export const agentsInfoContent: InfobarContent = {
  title: 'Platform agents',
  sections: [
    {
      title: 'Overview',
      description:
        'Every AI agent of the Dot Science platforms, stored in Supabase. The agent profiles on the Architecture page read the same records, so a change made here shows up there too.',
      links: []
    },
    {
      title: 'Cards',
      description:
        'Each card summarizes an agent: its pattern, purpose, models, tools by effect (read, propose, write), guardrails and human checkpoints. Click a card to open the full profile.',
      links: []
    },
    {
      title: 'Editing',
      description:
        'Use "Add agent" to create one, or the card menu to update or delete it. The form edits the summary fields and models; context, tools, guardrails, checkpoints and outputs keep their stored values.',
      links: []
    }
  ]
};

export const kanbanInfoContent: InfobarContent = {
  title: 'Kanban',
  sections: [
    {
      title: 'Overview',
      description:
        'Every platform feature as a task, grouped by development status: Planned, Designed, Under development and Developed. Use the platform filter to focus on one platform.',
      links: []
    },
    {
      title: 'Moving features',
      description:
        "Drag a card to another column to change the feature's status. The change is saved to the same records as the Features page; the order inside a column isn't saved.",
      links: []
    },
    {
      title: 'Subtasks',
      description:
        'Open a card with its checklist button to add, check off or delete subtasks. The card shows how many are done. "Edit feature" opens the same form as the Features page.',
      links: []
    }
  ]
};

export const maintenanceInfoContent: InfobarContent = {
  title: 'Maintenance',
  sections: [
    {
      title: 'Overview',
      description:
        'Every external service on the Architecture page, with the plan we are on and what it costs. Billing details are stored in Supabase.',
      links: []
    },
    {
      title: 'Plans',
      description:
        "Detected means the plan was read from the provider API. Manual is a plan set here, and Default is the catalog's starting plan. A plan set here also shows in the service dialog on the Architecture page.",
      links: []
    },
    {
      title: 'Costs',
      description:
        'Monthly and annual are what we actually pay. The annual cost is the monthly cost x 12 unless an annual price is set. Usage-billed services show their live spend where the provider API exposes it, and are not included in the totals.',
      links: []
    },
    {
      title: 'Editing',
      description:
        'Use the row menu and "Edit billing" to change the plan, billing cycle, prices, renewal date or notes. Click a row to see every plan and its limits.',
      links: []
    }
  ]
};

export const billingPlansInfoContent: InfobarContent = {
  title: 'Billing Plans',
  sections: [
    {
      title: 'Overview',
      description:
        'Subscription plans for the whole ecosystem. Each plan sets monthly usage limits per subscriber, the features it includes from any platform, and its price.',
      links: []
    },
    {
      title: 'Cost per subscriber',
      description:
        "Usage at limits prices voice minutes, interview minutes, AI calls, storage and emails with each service's overage or usage rate. The share of fixed costs is what the stack costs with no usage, divided by the expected subscribers.",
      links: []
    },
    {
      title: 'Average compensation',
      description:
        'The toggle next to Add plan applies to every plan. Off: plans are priced as if every subscriber uses all of their limits. On: each plan is priced at its average use of limits, because subscribers who use little compensate those who use a lot. At 40% average use, limits can be 2.5x bigger for the same cost.',
      links: []
    },
    {
      title: 'Margin',
      description:
        'The monthly price minus the cost per subscriber. The suggested prices in the plan editor hit a 50% or 70% margin. Fixed costs follow the plans set on the Maintenance page.',
      links: []
    },
    {
      title: 'Compare plans',
      description:
        'The table below the cards puts every plan side by side: prices, cost per subscriber and margin, each limit, and the features included per platform. Click a platform row to see each feature.',
      links: []
    },
    {
      title: 'Other limits',
      description:
        "Limits without a maintenance cost, like projects or seats, show on the plan card but don't change its cost.",
      links: []
    }
  ]
};

export const leadsInfoContent: InfobarContent = {
  title: 'Leads',
  sections: [
    {
      title: 'Where leads come from',
      description:
        'Every person who takes part in an IAteneo session without an account becomes a lead, captured automatically the moment they enter. People who join on their own show as "Joined as guest"; people the host invited show as "Invited by email". One lead per email, so taking part in more sessions only updates it.',
      links: []
    },
    {
      title: 'Verified emails',
      description:
        'The icon next to each email tells whether the address is real. Verified: the person opened the invitation link, which only arrives in that inbox. Invitation sent: invited but the link was not opened yet. Invitation failed: the email could not be delivered. Unverified: typed when joining as a guest, so it may not exist. Filter by these from the Email status filter.',
      links: []
    },
    {
      title: 'Pipeline',
      description:
        'Move each lead through New, Contacted, Qualified and Converted, or mark it Discarded, and keep notes on the conversation. New sessions never reset the status or the notes.',
      links: []
    },
    {
      title: 'Leads become users',
      description:
        'As soon as an email has an account it stops being a lead and only appears on the Users page. Its status and notes are kept in case the account is removed later.',
      links: []
    }
  ]
};
