/** UI-only replicas of each platform's Agora. Content is dummy data modeled on the real apps. */

export const AGORA_PLATFORM_IDS = [
  'workspace',
  'iateneo',
  'golden-papers',
  'abstra-space',
  'affine-club'
] as const;

export type AgoraPlatformId = (typeof AGORA_PLATFORM_IDS)[number];

export interface AgoraItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
}

export interface AgoraCategory {
  id: string;
  title: string;
  items: AgoraItem[];
}

export interface AgoraTab {
  id: string;
  label: string;
  categories: AgoraCategory[];
}

export interface AgoraConfig {
  id: AgoraPlatformId;
  name: string;
  tagline: string;
  logo: string;
  accent: string;
  secondary: string;
  tabs: AgoraTab[];
}

type Row = [title: string, subtitle: string, meta: string, badge?: string];

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function category(title: string, rows: Row[]): AgoraCategory {
  const id = slug(title);
  return {
    id,
    title,
    items: rows.map(([itemTitle, subtitle, meta, badge], index) => ({
      id: `${id}-${index}`,
      title: itemTitle,
      subtitle,
      meta,
      badge
    }))
  };
}

const workspace: AgoraConfig = {
  id: 'workspace',
  name: 'Workspace',
  tagline: 'Core of the Meaning',
  logo: '/logos/apps/workspace.svg',
  accent: '#68DBFF',
  secondary: '#0A5E95',
  tabs: [
    {
      id: 'projects',
      label: 'Projects',
      categories: [
        category('Concept', [
          [
            'Quantum Literacy',
            'Teaching superposition through dialogue',
            '6 files · Aurora Circle',
            'Public'
          ],
          ['Ocean Memory', 'Climate archives as living graphs', '3 files · You', 'Private'],
          ['Civic Ledger', 'Open budgeting for municipalities', '4 files · Polis Lab', 'Public']
        ]),
        category('Prototype', [
          ['Affine Brand Kit', 'Identity system for Affine Club', '9 files · You', 'Private'],
          ['Symposium Toolkit', 'Templates for IAteneo sessions', '5 files · Hermes', 'Public'],
          ['Neural Atlas', 'Mapping concepts across papers', '7 files · Gaia Group', 'Public'],
          ['Lab Notebook', 'Shared research journal', '2 files · You', 'Private']
        ]),
        category('Production', [
          ['Golden Paper Series', 'Quarterly scientific digests', '12 files · Editorial', 'Public'],
          ['Spatial Classroom', 'Abstra Space lessons for schools', '8 files · You', 'Public'],
          ['Wisdom Archive', 'Curated symposium outcomes', '15 files · Polis Lab', 'Public']
        ]),
        category('Archived', [
          ['Pilot 2025', 'First ecosystem pilot', '20 files · Hermes', 'Private'],
          ['Legacy Docs', 'Pre-Workspace documentation', '31 files · You', 'Private']
        ])
      ]
    },
    {
      id: 'derived-products',
      label: 'Derived Products',
      categories: [
        category('Presentations', [
          ['Entropy in 12 slides', 'From Entropy in Living Systems', 'Ready', 'Presentation'],
          ['Graphs of Meaning deck', 'From Graphs of Meaning', 'Ready', 'Presentation']
        ]),
        category('Quizzes & playgrounds', [
          ['Topology quiz', 'From Intro to Topology', 'Ready', 'Quiz'],
          ['Cell signaling playground', 'From Cell Signaling', 'Generating…', 'Playground']
        ]),
        category('Experiences', [
          ['Double Slit VR', 'From Double Slit Lab', 'Ready', 'VR'],
          ['Cell guided tour', 'From Cell Interior', 'Ready', 'Walkthrough'],
          ['Orbits in 10 stops', 'From Orbital Mechanics', 'Generating…', 'Pathway']
        ])
      ]
    },
    {
      id: 'brandings',
      label: 'Brandings',
      categories: [
        category('Platform kits', [
          ['Dot Science Core', 'Cyan and navy master palette', '42 assets'],
          ['IAteneo', 'Owl of Athena logotype', '18 assets'],
          ['Golden Papers', 'Golden ram identity', '21 assets'],
          ['Abstra Space', 'Butterfly of Psyche', '16 assets']
        ]),
        category('Circle kits', [
          ['Aurora Circle', 'Research collective identity', '8 assets'],
          ['Polis Lab', 'Civic design studio', '11 assets']
        ])
      ]
    },
    {
      id: 'frameworks',
      label: 'Frameworks',
      categories: [
        category('Reasoning', [
          ['Socratic Loop', 'Question, answer, objection', '5 steps'],
          ['Evidence Ladder', 'Claim to source tracing', '4 steps']
        ]),
        category('Production', [
          ['Spiral of Knowledge', 'Resonate → Think → Shape → Explore', '6 stages'],
          ['Derivation Map', 'From document to formats', '5 outputs']
        ])
      ]
    }
  ]
};

const iateneo: AgoraConfig = {
  id: 'iateneo',
  name: 'IAteneo',
  tagline: 'Network of Thoughts',
  logo: '/logos/apps/iateneo.svg',
  accent: '#68DBFF',
  secondary: '#1d3b52',
  tabs: [
    {
      id: 'networks',
      label: 'Networks',
      categories: [
        category('Live now', [
          ['Ethics of Machine Minds', 'Hosted by Aurora Circle', '42 participants', 'Live'],
          ['Open Science Forum', 'Hosted by Polis Lab', '18 participants', 'Live']
        ]),
        category('Upcoming', [
          ['Language and Thought', 'Socratic symposium', 'Tomorrow · 10:00', 'Upcoming'],
          ['Climate Futures', 'Debate format', 'Fri · 16:00', 'Upcoming'],
          ['History of Zero', 'Reading circle', 'Oct 20 · 18:00', 'Upcoming'],
          ['Design as Inquiry', 'Workshop', 'Oct 22 · 11:00', 'Upcoming']
        ]),
        category('Finished', [
          ['What is a Proof?', '128 interventions', '3 days ago', 'Report ready'],
          ['Cities that Learn', '94 interventions', '1 week ago', 'Report ready'],
          ['Memory and Machines', '210 interventions', '2 weeks ago', 'Report ready']
        ])
      ]
    },
    {
      id: 'thoughts',
      label: 'Thoughts',
      categories: [
        category('Questions', [
          ['Can a network forget?', 'Memory and Machines', '12 comments', 'Question'],
          ['Who owns a shared idea?', 'Open Science Forum', '8 comments', 'Question']
        ]),
        category('Rebuttals', [
          ['Proof is social, not only formal', 'What is a Proof?', '21 comments', 'Rebuttal'],
          ['Cities do not learn, people do', 'Cities that Learn', '5 comments', 'Rebuttal']
        ]),
        category('Iterations', [
          ['Zero as an absence with a place', 'History of Zero', '3 comments', 'Iteration'],
          ['Ethics needs a body', 'Ethics of Machine Minds', '17 comments', 'Iteration'],
          ['Design is a question you can hold', 'Design as Inquiry', '6 comments', 'Iteration']
        ])
      ]
    }
  ]
};

const goldenPapers: AgoraConfig = {
  id: 'golden-papers',
  name: 'Golden Papers',
  tagline: 'Shape of Knowledge',
  logo: '/logos/apps/golden-papers.svg',
  accent: '#FFB338',
  secondary: '#935100',
  tabs: [
    {
      id: 'documents',
      label: 'Documents',
      categories: [
        category('Research papers', [
          [
            'Entropy in Living Systems',
            'Biophysics · 14 sections',
            'Updated 2 days ago',
            'Published'
          ],
          ['Graphs of Meaning', 'Linguistics · 9 sections', 'Updated 5 days ago', 'Published'],
          ['Zero-Knowledge for Citizens', 'Cryptography · 11 sections', 'Updated today', 'Draft']
        ]),
        category('Essays', [
          [
            'On Inheritable Knowledge',
            'Philosophy · 6 sections',
            'Updated 1 week ago',
            'Published'
          ],
          ['The Shape of an Argument', 'Rhetoric · 5 sections', 'Updated 3 days ago', 'In review'],
          ['Why Cities Remember', 'Urbanism · 7 sections', 'Updated 2 weeks ago', 'Published']
        ]),
        category('Reports', [
          [
            'What is a Proof? (IAteneo)',
            'Derived from a symposium',
            'Updated 3 days ago',
            'Published'
          ],
          ['Quarterly Digest Q3', 'Editorial · 12 sections', 'Updated 1 month ago', 'Published']
        ]),
        category('IAteneo session feedback', [
          ['What is a Proof?', 'Symposium report', 'Generated Oct 9', 'Session report'],
          ['Cities that Learn', 'Debate summary', 'Generated Oct 2', 'Session report'],
          ['Participation in What is a Proof?', 'Personal report', 'Generated Oct 9', 'Personal'],
          ['Growth map · last 30 days', 'Personal report', 'Generating…', 'Personal']
        ]),
        category('Lecture notes', [
          ['Intro to Topology', 'Mathematics · 20 sections', 'Updated yesterday', 'Draft'],
          ['Cell Signaling', 'Biology · 16 sections', 'Updated 4 days ago', 'Published']
        ])
      ]
    },
    {
      id: 'templates',
      label: 'Templates',
      categories: [
        category('Scientific', [
          ['IMRaD Paper', 'Intro, methods, results, discussion', '6 sections'],
          ['Systematic Review', 'PRISMA-ready structure', '8 sections'],
          ['Grant Proposal', 'Aims, significance, approach', '7 sections']
        ]),
        category('Teaching', [
          ['Lecture Notes', 'Definitions, examples, exercises', '5 sections'],
          ['Case Study', 'Context, problem, analysis', '4 sections']
        ])
      ]
    }
  ]
};

const abstraSpace: AgoraConfig = {
  id: 'abstra-space',
  name: 'Abstra Space',
  tagline: "Science's Laboratory",
  logo: '/logos/apps/abstra-space.svg',
  accent: '#FF6868',
  secondary: '#5a1f2b',
  tabs: [
    {
      id: 'spaces',
      label: 'Spaces',
      categories: [
        category('Laboratories', [
          ['Double Slit Lab', 'Interactive optics experiment', '42 nodes · Updated today', 'Live'],
          [
            'Cell Interior',
            'Walk through a eukaryotic cell',
            '120 nodes · 2 days ago',
            'Published'
          ],
          ['Orbital Mechanics', 'Tune gravity and watch orbits', '64 nodes · 1 week ago', 'Draft']
        ]),
        category('Exhibitions', [
          ['History of Zero', 'Spatial timeline exhibition', '38 nodes · 3 days ago', 'Published'],
          [
            'Golden Ratio Gallery',
            'Proportion across art and nature',
            '27 nodes · 5 days ago',
            'Published'
          ]
        ]),
        category('Simulations', [
          ['Climate Box', 'Carbon cycle sandbox', '88 nodes · yesterday', 'Draft'],
          ['City Flow', 'Traffic as fluid dynamics', '55 nodes · 2 weeks ago', 'Published'],
          ['Neural Garden', 'Neurons growing in real time', '73 nodes · 4 days ago', 'Published']
        ])
      ]
    },
    {
      id: 'pieces',
      label: 'Pieces',
      categories: [
        category('Models', [
          ['Lab bench', 'Reusable 3D furniture', 'GLB · 2.1 MB'],
          ['Molecule kit', 'Atoms and bonds', 'GLB · 840 KB'],
          ['Planet set', 'Solar system bodies', 'GLB · 5.4 MB']
        ]),
        category('Interactions', [
          ['Slider probe', 'Tune any parameter', 'Behavior'],
          ['Annotation pin', 'Leave observations in space', 'Behavior']
        ])
      ]
    }
  ]
};

const affineClub: AgoraConfig = {
  id: 'affine-club',
  name: 'Affine Club',
  tagline: 'Compass of Minds',
  logo: '/logos/apps/affine-club.svg',
  accent: '#68DBFF',
  secondary: '#0A5E95',
  tabs: [
    {
      id: 'circles',
      label: 'Circles',
      categories: [
        category('Resonance', [
          ['Affine Founders', 'Early members of the club', '15 members', 'Leader'],
          ['Cross-Discipline', 'Minds that bridge fields', '46 members', 'Joined']
        ]),
        category('Interests', [
          ['Ocean Minds', 'Marine science and policy', '21 members'],
          ['Future of Learning', 'Education innovators', '39 members']
        ]),
        category('Philosophy', [
          ['Aurora Circle', 'Ethics, mind and language', '64 members', 'Leader'],
          ['Stoa Nova', 'Modern stoicism', '31 members', 'Joined']
        ]),
        category('Science', [
          ['Polis Lab', 'Civic science and policy', '48 members'],
          ['Open Proof', 'Mathematics in public', '22 members', 'Joined'],
          ['Terra Collective', 'Climate research', '77 members'],
          ['Physics Playground', 'Interactive physics', '24 members']
        ]),
        category('Editorial', [
          ['Golden Editors', 'Peer review collective', '19 members', 'Leader'],
          ['Open Methods', 'Reproducible research', '41 members', 'Joined']
        ]),
        category('Academia', [
          ['Topology Readers', 'Graduate study group', '12 members'],
          ['Bio Writers', 'Science communication', '27 members']
        ]),
        category('Makers', [
          ['Spatial Lab', 'Builders of scientific spaces', '33 members', 'Leader'],
          ['XR Educators', 'Teachers using VR', '58 members', 'Joined']
        ])
      ]
    },
    {
      id: 'resonances',
      label: 'Resonances',
      categories: [
        category('Strong matches', [
          [
            'Lucía Ferrer ↔ Tomás Rivera',
            'Complex systems meets spatial computing',
            'Resonance 92%',
            'Open'
          ],
          ['Sofía Navarro ↔ Kofi Mensah', 'Philosophy and math for children', 'Resonance 83%'],
          ['Daniel Osei ↔ Jonas Weber', 'Language models for design systems', 'Resonance 78%']
        ]),
        category('Shared ways of thinking', [
          ['Systems first', 'Start from relations, not parts', '24 minds'],
          ['Evidence over authority', 'Trust what can be traced', '31 minds']
        ]),
        category('Shared intentions', [
          ['Teach what I learn', 'Turn research into lessons', '18 minds'],
          ['Build public tools', 'Open infrastructure for knowledge', '27 minds']
        ])
      ]
    },
    {
      id: 'entities',
      label: 'Entities',
      categories: [
        category('People', [
          ['Lucía Ferrer', 'Complex systems · seeks collaborators', 'Researcher', 'Open'],
          ['Tomás Rivera', 'Spatial computing · XR', 'Builder', 'Open'],
          ['Sofía Navarro', 'Philosophy for children', 'Educator'],
          ['Mei Tanaka', 'Marine biology · field work', 'Researcher']
        ]),
        category('Projects', [
          ['Ocean Memory', 'Needs a data engineer', '3 roles open', 'Open'],
          ['Spatial Classroom', 'Needs an XR designer', '1 role open', 'Open'],
          ['Civic Ledger', 'Open municipal budgets', '6 members']
        ]),
        category('Organizations', [
          ['Aurora Institute', 'Interdisciplinary research lab', '12 members'],
          ['Terra Foundation', 'Ocean and climate science', '8 members']
        ])
      ]
    }
  ]
};

export const agoraConfigs: Record<AgoraPlatformId, AgoraConfig> = {
  workspace,
  iateneo,
  'golden-papers': goldenPapers,
  'abstra-space': abstraSpace,
  'affine-club': affineClub
};

export function isAgoraPlatformId(value: string): value is AgoraPlatformId {
  return (AGORA_PLATFORM_IDS as readonly string[]).includes(value);
}
