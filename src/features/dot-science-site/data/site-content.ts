/** Copy of the dotscience.ai website content (dot-science-ai `lib/platforms.ts`, `lib/branches.ts`, `components/experience.tsx`). */

const ASSETS = '/dot-science-site';

export type SitePlatformId = 'iateneo' | 'golden-papers' | 'abstra-space' | 'affine-club';

export interface SitePlatformEnvironment {
  name: string;
  summary: string;
}

export interface SitePlatform {
  id: SitePlatformId;
  name: string;
  state: string;
  concept: string;
  vision: string;
  colors: string[];
  logo: string;
  url: string;
  firstSlide: { humanProblem: string; newPerspective: string };
  secondSlide: { title: string; story: string; feeling: string };
  thirdSlide: { title: string; before: string; through: string; after: string };
  fourthSlide: {
    title: string;
    environments: SitePlatformEnvironment[];
    workspaceConnection: string;
  };
}

export type SiteSlideKind = 'identity' | 'experience' | 'transformation' | 'capabilities';

export const siteSlideOrder: { kind: SiteSlideKind; eyebrow: string; index: number }[] = [
  { kind: 'identity', eyebrow: 'Project Identity', index: 1 },
  { kind: 'experience', eyebrow: 'The Experience', index: 2 },
  { kind: 'transformation', eyebrow: 'The Core Transformation', index: 3 },
  { kind: 'capabilities', eyebrow: 'What the User Can Do', index: 4 }
];

const slideSlug: Record<SitePlatformId, string> = {
  iateneo: 'iateneo',
  'golden-papers': 'goldenpapers',
  'abstra-space': 'abstraspace',
  'affine-club': 'affineclub'
};

export function siteSlideImage(id: SitePlatformId, kind: SiteSlideKind): string {
  const index = siteSlideOrder.find((slide) => slide.kind === kind)?.index ?? 1;
  return `${ASSETS}/slides/${index}-${slideSlug[id]}-${kind}.png`;
}

/** First chromatic brand color (skips white), used for labels and accents. */
export function sitePlatformAccent(platform: SitePlatform): string {
  return (
    platform.colors.find((color) => color.toUpperCase() !== '#FFFFFF') ??
    platform.colors[0] ??
    '#68DBFF'
  );
}

export const siteWorkspace = {
  name: 'Dot Science Workspace',
  concept: 'Core of the Meaning',
  vision: 'Open the gateway beyond the word.',
  logo: `${ASSETS}/logos/dot-science-workspace-logo.svg`,
  url: 'https://workspace.dotscience.ai',
  colors: ['#68DBFF', '#0A5E95'],
  origin: {
    title: 'Core of meaning',
    openingStatement: 'Every possibility begins from a point.',
    branchStatement: 'When possibility enters relation, it can grow in more than one direction.',
    selectionPrompt: 'Which path of knowledge will you explore?'
  },
  homeReturnPhrase: 'Open the door beyond the word'
};

export const siteIntroLines: string[] = [
  'In the universe of knowledge,',
  'the dot begins every word and completes every thought,',
  'dimensionless, it becomes a path the moment it moves,',
  'meaning gives direction a space to unfold,',
  '...and opens the door beyond the word.'
];

export const sitePlatforms: SitePlatform[] = [
  {
    id: 'iateneo',
    state: 'Thought',
    name: 'IAteneo',
    concept: 'Network of Thoughts',
    vision: 'Every thought matters.',
    colors: ['#FFFFFF', '#68DBFF'],
    logo: `${ASSETS}/logos/iateneo-logo.svg`,
    url: 'https://iateneo.ai',
    firstSlide: {
      humanProblem:
        'Meetings keep timelines and transcripts, not meaning: who spoke when, not why it mattered, what it contradicted, or how the group’s reasoning changed. Summaries erase minority paths and the architecture of thought.',
      newPerspective:
        'Treat conversation as a network of relations: questions, answers, objections, so collective reasoning stays navigable beyond a chronological stream.'
    },
    secondSlide: {
      title: 'A meeting that keeps thinking',
      story:
        'You open a symposium. As people speak, contributions take place as relations: questions, answers, objections, examples, and references that remain distinct inside one intellectual movement. Chronology alone cannot describe the architecture of the discussion. Later you return and still find the minority path that a summary would have erased.',
      feeling:
        'Collective reasoning stays visible after the room goes quiet. The architecture of thought remains navigable when speech has faded.'
    },
    thirdSlide: {
      title: 'Conversation becomes structured thought',
      before:
        'Meetings dissolve into transcripts and summaries. Relations between questions, answers, and objections disappear into sequence.',
      through: 'IAteneo holds each contribution as a relation in a living network of thought.',
      after:
        'Collective reasoning stays navigable. Minority paths, open questions, and the architecture of the discussion remain.'
    },
    fourthSlide: {
      title: 'From discovery to derivation',
      environments: [
        {
          name: 'Agora',
          summary: 'Discover public sessions, thought networks, and selected interventions.'
        },
        { name: 'Studio', summary: 'Analyze a session into a navigable network of thought.' },
        {
          name: 'Reviewer',
          summary: 'Comment on interventions, relationships, interpretations, and conclusions.'
        },
        {
          name: 'Viewer',
          summary: 'Inspect the thought graph and ask the contextual agent about the conversation.'
        },
        {
          name: 'Deriver',
          summary: 'Derive a Golden Papers report, annotation canvas, or podcast-style production.'
        }
      ],
      workspaceConnection:
        'Session thought networks feed the Workspace knowledge graph, so questions, terms, and relations remain available across documents and spaces.'
    }
  },
  {
    id: 'golden-papers',
    state: 'Knowledge',
    name: 'Golden Papers',
    concept: 'Shape of Knowledge',
    vision: 'Humanity moves forward.',
    colors: ['#FFB338', '#935100', '#68DBFF'],
    logo: `${ASSETS}/logos/golden-papers-logo.svg`,
    url: 'https://goldenpapers.ai',
    firstSlide: {
      humanProblem:
        'Writing tools treat documents as characters on a page, while scientific writing is argument, evidence, and inheritance. Formatting-first workflows leave structure and provenance behind; abundance makes important work disposable.',
      newPerspective:
        'Give thought a form strong enough to travel and open enough to grow: structure as part of the argument, documents as inheritable knowledge, not isolated containers.'
    },
    secondSlide: {
      title: 'A form another mind can inherit',
      story:
        'You turn a living argument into a document. Claims stay connected to evidence, sources, definitions, and open questions, so structure participates in the argument rather than decorating it. A future reader receives not only your conclusion, but a teachable form strong enough to travel and open enough to grow.',
      feeling:
        'Writing becomes continuity, not disposable text. Another mind can inherit the work and continue it.'
    },
    thirdSlide: {
      title: 'Thought becomes organized knowledge',
      before:
        'Ideas live as disposable drafts and fluent pages that lose structure, evidence, and provenance.',
      through:
        'Golden Papers gives argument a form where claims, evidence, and open questions stay connected.',
      after: 'Another mind inherits not only conclusions, but a teachable structure of knowledge.'
    },
    fourthSlide: {
      title: 'From discovery to derivation',
      environments: [
        {
          name: 'Agora',
          summary:
            'Discover public papers, publications, reusable structures, and scientific templates.'
        },
        {
          name: 'Studio',
          summary:
            'Generate, structure, and edit documents with control over reasoning, evidence, and form.'
        },
        {
          name: 'Reviewer',
          summary: 'Comment on blocks, claims, sources, figures, and structural decisions.'
        },
        {
          name: 'Viewer',
          summary: 'Read the document, navigate its evidence, and ask the contextual agent.'
        },
        {
          name: 'Deriver',
          summary:
            'Derive slides, educational resources, visual summaries, exercises, or playgrounds.'
        }
      ],
      workspaceConnection:
        'Structured claims, definitions, and evidence enter the Workspace, so each document stays connected to the wider semantic field.'
    }
  },
  {
    id: 'abstra-space',
    state: 'Experience',
    name: 'Abstra Space',
    concept: "Science's Laboratory",
    vision: 'Explore the concept as a thing.',
    colors: ['#FF6868', '#68DBFF', '#FFFFFF'],
    logo: `${ASSETS}/logos/abstra-space-logo.svg`,
    url: 'https://abstra.space',
    firstSlide: {
      humanProblem:
        'Scientific ideas stay trapped as flat description. Readers look at representations but cannot follow a path, change perspective, or test relations; virtual spectacle often replaces epistemic honesty.',
      newPerspective:
        'Materialize inquiry as space. Concepts become navigable environments where interaction serves understanding: laboratories of presence, not decorative worlds.'
    },
    secondSlide: {
      title: 'Enter the concept as a place',
      story:
        'You step into a model instead of only reading about it. You follow a path, change perspective, test a relation, and save an observation with its assumptions intact. Interaction serves understanding: the world remains honest about what is simulated, what is measured, and what is known.',
      feeling:
        'Exploration feels like inquiry, not spectacle. Space carries knowledge rather than decorating it.'
    },
    thirdSlide: {
      title: 'Knowledge becomes explorable experience',
      before:
        'Concepts remain flat description. Readers look at representations but cannot enter, test, or remember them with honesty about what is known.',
      through:
        'Abstra Space materializes inquiry as a navigable place where perspective, relation, and observation serve understanding.',
      after:
        'Experience continues as epistemic memory. Observations, assumptions, and paths remain available beyond the visit.'
    },
    fourthSlide: {
      title: 'From discovery to derivation',
      environments: [
        {
          name: 'Agora',
          summary: 'Discover public spaces, exhibitions, simulations, and laboratories.'
        },
        {
          name: 'Studio',
          summary:
            'Create and edit spatial environments whose models express conceptual relationships.'
        },
        {
          name: 'Reviewer',
          summary: 'Comment on models, interactions, spatial relations, and visitor experience.'
        },
        {
          name: 'Viewer',
          summary: 'Explore the space and ask the contextual agent about the concepts.'
        },
        {
          name: 'Deriver',
          summary:
            'Derive a VR experience, guided walkthrough, interactive tour, or presentation pathway.'
        }
      ],
      workspaceConnection:
        'Models and observations link back to Workspace concepts, preserving what was simulated and what was known.'
    }
  },
  {
    id: 'affine-club',
    state: 'Resonance',
    name: 'Affine Club',
    concept: 'Compass of Minds',
    vision: 'Affine minds resonate.',
    colors: ['#0A5E95', '#68DBFF', '#FFFFFF'],
    logo: `${ASSETS}/logos/affine-club-logo.svg`,
    url: 'https://affine.club',
    firstSlide: {
      humanProblem:
        'Professional networks sort people by title, institution, and proximity: signals that rarely reveal how someone frames problems, what intentions animate them, or where complementary minds could meet.',
      newPerspective:
        'Navigate a field of minds with no privileged center. Discover resonance and complementarity through direction and intention: invitations to relation, not rankings of sameness.'
    },
    secondSlide: {
      title: 'Find minds by direction',
      story:
        'You declare an intention. Nearby people appear through affinity and complementarity: how they frame problems and which directions they move toward, not title, institution, or proximity alone. A suggested connection arrives as an invitation you can inspect, refine, or refuse, never as a ranking of sameness.',
      feeling:
        'Resonance without a privileged center. Orientation by direction, not by who stands at the middle.'
    },
    thirdSlide: {
      title: 'Individual trajectories become meaningful relationships',
      before:
        'Networks sort people by title, institution, and proximity, hiding intention and complementarity.',
      through:
        'Affine Club surfaces affinity by direction: invitations you can inspect, refine, or refuse.',
      after:
        'Resonance forms without a privileged center. Connections carry purpose, not only proximity.'
    },
    fourthSlide: {
      title: 'From discovery to derivation',
      environments: [
        {
          name: 'Agora',
          summary:
            'Discover public affine profiles through intentions, capabilities, projects, and ways of thinking.'
        },
        {
          name: 'Studio',
          summary:
            'Construct and enrich your affine profile: intentions, capabilities, projects, and collaboration.'
        },
        {
          name: 'Reviewer',
          summary:
            'Add comments, endorsements, reactions, or resonance signals within privacy settings.'
        },
        {
          name: 'Viewer',
          summary: 'Explore a profile from different angles and ask the contextual agent.'
        },
        {
          name: 'Deriver',
          summary:
            'Derive a CV, cover letter, biography, introduction, portfolio narrative, or avatar.'
        }
      ],
      workspaceConnection:
        'Intentions and resonances become relational context in the Workspace, ready for dialogue, writing, and experience.'
    }
  }
];
