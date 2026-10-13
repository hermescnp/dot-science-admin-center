import 'server-only';

import type {
  StarmapEdge,
  StarmapGraph,
  StarmapMemoryCard,
  StarmapNode,
  StarmapSnapshot
} from '../api/types';

const DAY = 86_400;
const START = Date.UTC(2026, 7, 1) / 1000;

const at = (day: number) => START + day * DAY;

interface DemoSkill {
  slug: string;
  label: string;
  category: string;
  day: number;
  useCount: number;
  state?: string;
  pinned?: boolean;
  links?: string[];
}

const SKILLS: DemoSkill[] = [
  {
    slug: 'web-search',
    label: 'Web search',
    category: 'research',
    day: 0,
    useCount: 42,
    pinned: true
  },
  {
    slug: 'paper-summary',
    label: 'Summarize papers',
    category: 'research',
    day: 3,
    useCount: 27,
    links: ['web-search']
  },
  {
    slug: 'citation-check',
    label: 'Verify citations',
    category: 'research',
    day: 9,
    useCount: 11,
    links: ['paper-summary']
  },
  {
    slug: 'lit-review',
    label: 'Literature review outline',
    category: 'research',
    day: 21,
    useCount: 6,
    links: ['paper-summary', 'citation-check']
  },
  {
    slug: 'arxiv-digest',
    label: 'Weekly arXiv digest',
    category: 'research',
    day: 48,
    useCount: 3,
    links: ['web-search', 'paper-summary']
  },
  {
    slug: 'git-commit',
    label: 'Write commit messages',
    category: 'coding',
    day: 1,
    useCount: 58,
    pinned: true
  },
  {
    slug: 'pr-review',
    label: 'Review pull requests',
    category: 'coding',
    day: 6,
    useCount: 19,
    links: ['git-commit']
  },
  {
    slug: 'sql-migrations',
    label: 'Supabase migrations',
    category: 'coding',
    day: 14,
    useCount: 15
  },
  {
    slug: 'rls-policies',
    label: 'Row-level security policies',
    category: 'coding',
    day: 18,
    useCount: 9,
    links: ['sql-migrations']
  },
  {
    slug: 'next-routes',
    label: 'Next.js route handlers',
    category: 'coding',
    day: 25,
    useCount: 12,
    links: ['pr-review']
  },
  {
    slug: 'turbopack-debug',
    label: 'Debug Turbopack builds',
    category: 'coding',
    day: 70,
    useCount: 2,
    links: ['next-routes']
  },
  {
    slug: 'legacy-jquery',
    label: 'jQuery widget fixes',
    category: 'coding',
    day: 2,
    useCount: 1,
    state: 'stale'
  },
  {
    slug: 'calendar-sync',
    label: 'Calendar scheduling',
    category: 'productivity',
    day: 4,
    useCount: 23
  },
  {
    slug: 'email-triage',
    label: 'Email triage',
    category: 'productivity',
    day: 8,
    useCount: 31,
    links: ['calendar-sync']
  },
  {
    slug: 'meeting-notes',
    label: 'Meeting notes',
    category: 'productivity',
    day: 12,
    useCount: 17,
    links: ['calendar-sync']
  },
  {
    slug: 'weekly-report',
    label: 'Weekly status report',
    category: 'productivity',
    day: 33,
    useCount: 7,
    links: ['meeting-notes', 'email-triage']
  },
  {
    slug: 'brand-voice',
    label: 'Dot Science brand voice',
    category: 'writing',
    day: 5,
    useCount: 14,
    pinned: true
  },
  {
    slug: 'blog-draft',
    label: 'Draft blog posts',
    category: 'writing',
    day: 16,
    useCount: 8,
    links: ['brand-voice']
  },
  {
    slug: 'grant-proposal',
    label: 'Grant proposal sections',
    category: 'writing',
    day: 29,
    useCount: 4,
    links: ['lit-review', 'brand-voice']
  },
  {
    slug: 'newsletter',
    label: 'Newsletter copy',
    category: 'writing',
    day: 55,
    useCount: 2,
    links: ['blog-draft']
  },
  {
    slug: 'press-kit',
    label: 'Press kit (old format)',
    category: 'writing',
    day: 10,
    useCount: 0,
    state: 'archived'
  },
  {
    slug: 'csv-clean',
    label: 'Clean CSV exports',
    category: 'data',
    day: 11,
    useCount: 13
  },
  {
    slug: 'chart-gen',
    label: 'Generate charts',
    category: 'data',
    day: 20,
    useCount: 10,
    links: ['csv-clean']
  },
  {
    slug: 'kpi-dashboard',
    label: 'KPI dashboard queries',
    category: 'data',
    day: 38,
    useCount: 5,
    links: ['chart-gen', 'sql-migrations']
  },
  {
    slug: 'billing-forecast',
    label: 'Billing forecast',
    category: 'data',
    day: 62,
    useCount: 2,
    links: ['kpi-dashboard']
  },
  {
    slug: 'figma-export',
    label: 'Export Figma frames',
    category: 'design',
    day: 27,
    useCount: 6
  },
  {
    slug: 'whiteboard-flows',
    label: 'Sketch user flows',
    category: 'design',
    day: 44,
    useCount: 4,
    links: ['figma-export']
  },
  {
    slug: 'design-tokens',
    label: 'Sync design tokens',
    category: 'design',
    day: 66,
    useCount: 1,
    links: ['figma-export', 'next-routes']
  }
];

interface DemoMemory {
  day: number;
  source: StarmapMemoryCard['source'];
  title: string;
  body: string;
  links: string[];
}

const MEMORIES: DemoMemory[] = [
  {
    day: 0,
    source: 'profile',
    title: 'Works across several Dot Science repos',
    body: 'The user maintains dot-science-ai, the admin center, the workspace app and hermes-agent. Shared packages live in dot-science-ai/packages.',
    links: ['git-commit', 'pr-review']
  },
  {
    day: 2,
    source: 'profile',
    title: 'Prefers concise, actionable answers',
    body: 'Lead with the outcome, keep explanations short, and avoid speculative refactors.',
    links: ['brand-voice', 'weekly-report']
  },
  {
    day: 7,
    source: 'memory',
    title: 'Supabase is the system of record',
    body: 'All admin data lives in Supabase with RLS. Platform admins are checked via public.is_platform_admin().',
    links: ['sql-migrations', 'rls-policies']
  },
  {
    day: 13,
    source: 'memory',
    title: 'Weekly sync on Mondays',
    body: 'Team status meeting every Monday at 10:00. Prepare the weekly report the Friday before.',
    links: ['calendar-sync', 'weekly-report', 'meeting-notes']
  },
  {
    day: 19,
    source: 'memory',
    title: 'Research focus: agent memory',
    body: 'Current reading list centers on long-term memory for agents, retrieval and skill libraries.',
    links: ['paper-summary', 'lit-review', 'arxiv-digest']
  },
  {
    day: 26,
    source: 'memory',
    title: 'Admin center conventions',
    body: 'Features follow api/types.ts → service.ts → queries.ts. Icons only from @/components/icons.',
    links: ['next-routes', 'pr-review']
  },
  {
    day: 34,
    source: 'profile',
    title: 'Timezone is UTC-4',
    body: 'Schedule meetings and reminders in Eastern time.',
    links: ['calendar-sync']
  },
  {
    day: 41,
    source: 'memory',
    title: 'Billing plans launched',
    body: 'Billing plans and external service costs are tracked in the admin center; forecasts use the last 90 days.',
    links: ['billing-forecast', 'kpi-dashboard']
  },
  {
    day: 47,
    source: 'memory',
    title: 'Grant deadline in November',
    body: 'Research grant draft due mid-November. Needs literature review and budget sections.',
    links: ['grant-proposal', 'lit-review']
  },
  {
    day: 53,
    source: 'memory',
    title: 'Design department whiteboard',
    body: 'The Design department uses a shared Excalidraw board stored in design_boards.',
    links: ['whiteboard-flows', 'figma-export']
  },
  {
    day: 60,
    source: 'memory',
    title: 'Newsletter cadence',
    body: 'Monthly newsletter goes out the first Tuesday of each month.',
    links: ['newsletter', 'blog-draft']
  },
  {
    day: 68,
    source: 'memory',
    title: 'Slow first compile in dev',
    body: 'Heavy client libraries make the first Turbopack compile slow; restart the dev server if a route hangs.',
    links: ['turbopack-debug']
  }
];

function buildGraph(): StarmapGraph {
  const skillId = (slug: string) => `skill:${slug}`;

  const nodes: StarmapNode[] = SKILLS.map((s) => ({
    id: skillId(s.slug),
    label: s.label,
    kind: 'skill',
    timestamp: at(s.day),
    category: s.category,
    useCount: s.useCount,
    state: s.state ?? 'active',
    createdBy: s.useCount > 20 ? 'user' : 'agent',
    pinned: s.pinned ?? false
  }));

  const edges: StarmapEdge[] = SKILLS.flatMap((s) =>
    (s.links ?? []).map((target) => ({
      source: skillId(s.slug),
      target: skillId(target)
    }))
  );

  const memory: StarmapMemoryCard[] = MEMORIES.map((m) => ({
    source: m.source,
    timestamp: at(m.day),
    title: m.title,
    body: m.body
  }));

  MEMORIES.forEach((m, index) => {
    const id = `memory:${m.source}:${index}`;
    nodes.push({
      id,
      label: m.title,
      kind: 'memory',
      memorySource: m.source,
      timestamp: at(m.day),
      category: 'memory',
      useCount: 0,
      state: 'active',
      createdBy: null,
      pinned: false
    });
    for (const target of m.links) edges.push({ source: id, target: skillId(target) });
  });

  const counts = new Map<string, number>();
  for (const s of SKILLS) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);

  return {
    nodes,
    edges,
    clusters: [...counts].map(([category, count]) => ({ category, count })),
    memory,
    stats: {
      skills: SKILLS.length,
      memories: MEMORIES.length,
      edges: edges.length
    }
  };
}

export const DEMO_STARMAP_SNAPSHOT: StarmapSnapshot = {
  id: 'demo',
  profile: 'demo',
  graph: buildGraph(),
  createdAt: new Date(at(72) * 1000).toISOString(),
  demo: true
};
