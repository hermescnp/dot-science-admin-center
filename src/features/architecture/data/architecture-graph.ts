import { ORCHESTRATOR_ID, orchestrationTargets } from './orchestration';

export type ArchitectureNodeKind = 'app' | 'agent' | 'orchestrator' | 'subagent' | 'service';
export type ArchitectureEdgeKind = 'service' | 'platform' | 'orchestration';

export type ArchitectureOutputSide = 'left' | 'right' | 'bottom';
export type ServiceLayer = 'core' | 'addon' | 'operations';

export interface ArchitectureOutput {
  id: string;
  label: string;
  targets: string[];
  kind?: ArchitectureEdgeKind;
  detail?: string;
  human?: boolean;
  side?: ArchitectureOutputSide;
}

export interface ServiceProduct {
  id: string;
  label: string;
}

export interface ArchitectureNodeData extends Record<string, unknown> {
  label: string;
  description: string;
  url?: string;
  logo?: string;
  logoDark?: string;
  planned?: boolean;
  via?: string;
  stack?: string;
  badge?: string;
  step?: string;
  human?: boolean;
  layer?: ServiceLayer;
  products?: ServiceProduct[];
  outputs?: ArchitectureOutput[];
}

export interface ArchitectureNode {
  id: string;
  kind: ArchitectureNodeKind;
  position: { x: number; y: number };
  data: ArchitectureNodeData;
}

export interface ArchitectureEdge {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  kind: ArchitectureEdgeKind;
  planned: boolean;
}

// Dot Science AI sits above the platforms and feeds them from the top.
// Core services sit to the left of the platforms, agents to the right, and add-on services
// (with the models behind the gateway) in rows underneath. Operations services (tooling,
// domains and email) have no edges and sit in the bottom row.
// Core service and agent rows sit level with the platforms that use them.
export const APP_NODE_WIDTH = 680;
const APP_COLUMN_X = 0;
const APP_STEP_Y = 380;
const AGENT_COLUMN_X = 960;
const SUBAGENT_COLUMN_X = 1400;
const SUBAGENT_START_Y = 560;
const SUBAGENT_STEP_Y = 110;
export const SERVICE_NODE_WIDTH = 260;
export const ADD_ON_NODE_WIDTH = 420;
const SERVICE_COLUMN_X = -520;
const PROVIDER_COLUMN_X = -1060;
const ADD_ON_ROW_Y = 2100;
const ADD_ON_GAP_X = 40;
const MODEL_ROW_Y = 2420;
const OPERATIONS_ROW_Y = 2760;

type PositionedNodeData = { id: string; y: number } & ArchitectureNodeData;

const authentication: ArchitectureOutput = {
  id: 'auth',
  label: 'Authentication',
  targets: ['supabase#auth']
};
const database: ArchitectureOutput = {
  id: 'database',
  label: 'Database',
  targets: ['supabase#database']
};
const storage: ArchitectureOutput = {
  id: 'storage',
  label: 'Storage',
  targets: ['supabase#storage']
};
const analytics: ArchitectureOutput = {
  id: 'analytics',
  label: 'Analytics',
  targets: ['vercel#analytics']
};
const email: ArchitectureOutput = { id: 'email', label: 'Email', targets: ['resend#emails'] };
const gatewayChat: ArchitectureOutput = {
  id: 'models',
  label: 'Models',
  targets: ['openrouter#chat']
};

const coreServices: PositionedNodeData[] = [
  {
    id: 'livekit',
    y: 140,
    label: 'LiveKit',
    description: 'Real-time audio and video rooms for IAteneo voice sessions',
    logo: '/logos/livekit.svg',
    logoDark: '/logos/livekit-dark.svg',
    products: [
      { id: 'rooms', label: 'Rooms (WebRTC)' },
      { id: 'agents', label: 'Agents' },
      { id: 'egress', label: 'Egress' },
      { id: 'ingress', label: 'Ingress' },
      { id: 'sip', label: 'SIP' }
    ],
    outputs: [{ id: 'stt', label: 'Speech-to-text', targets: ['deepgram#streaming-stt'] }]
  },
  {
    id: 'langgraph',
    y: 560,
    label: 'LangGraph',
    description: 'Runs the Golden Papers document edit agent graph with LangSmith tracing',
    logo: '/logos/langgraph.svg',
    products: [
      { id: 'runtime', label: 'Graph runtime' },
      { id: 'langsmith', label: 'LangSmith tracing' },
      { id: 'studio', label: 'Studio' },
      { id: 'platform', label: 'Platform deploy' }
    ]
  }
];

// Ordered left to right in the add-on row under the platforms.
const addOnServices: ({ id: string } & ArchitectureNodeData)[] = [
  {
    id: 'resend',
    label: 'Resend',
    description: 'Transactional email such as sign-in links and notifications',
    logo: '/logos/resend.svg',
    logoDark: '/logos/resend-dark.svg',
    products: [
      { id: 'emails', label: 'Emails' },
      { id: 'audiences', label: 'Audiences' },
      { id: 'broadcasts', label: 'Broadcasts' },
      { id: 'webhooks', label: 'Webhooks' }
    ]
  },
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    description: 'Voice interviews for Golden Papers Resonance',
    logo: '/logos/elevenlabs.svg',
    logoDark: '/logos/elevenlabs-dark.svg',
    products: [
      { id: 'agents', label: 'Agents' },
      { id: 'tts', label: 'Text-to-speech' },
      { id: 'stt', label: 'Speech-to-text' },
      { id: 'cloning', label: 'Voice cloning' },
      { id: 'dubbing', label: 'Dubbing' }
    ]
  },
  {
    id: 'vercel',
    label: 'Vercel',
    description: 'Page views for the public apps and IAteneo scheduled jobs',
    logo: '/logos/vercel.svg',
    logoDark: '/logos/vercel-dark.svg',
    products: [
      { id: 'analytics', label: 'Analytics' },
      { id: 'cron', label: 'Cron' },
      { id: 'speed-insights', label: 'Speed Insights' },
      { id: 'blob', label: 'Blob' },
      { id: 'kv', label: 'KV' }
    ]
  },
  {
    id: 'sentry',
    label: 'Sentry',
    description: 'Error and performance monitoring for the admin center',
    logo: '/logos/sentry.svg',
    logoDark: '/logos/sentry-dark.svg',
    products: [
      { id: 'errors', label: 'Errors' },
      { id: 'tracing', label: 'Tracing' },
      { id: 'replay', label: 'Replay' },
      { id: 'logs', label: 'Logs' },
      { id: 'profiling', label: 'Profiling' }
    ]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Model gateway for Golden Papers agents, section generation and design tools',
    logo: '/logos/openrouter.svg',
    logoDark: '/logos/openrouter-dark.svg',
    products: [
      { id: 'chat', label: 'Chat' },
      { id: 'images', label: 'Image generation' },
      { id: 'web-search', label: 'Web search' },
      { id: 'models-api', label: 'Models API' },
      { id: 'embeddings', label: 'Embeddings' }
    ],
    outputs: [
      {
        id: 'models',
        label: 'Models',
        targets: [
          'gemini#text',
          'gemini#images',
          'openai#chat',
          'anthropic#messages',
          'xiaomi#chat'
        ]
      }
    ]
  }
];

const liveKitProviders: PositionedNodeData[] = [
  {
    id: 'deepgram',
    y: 140,
    label: 'Deepgram',
    description: 'Nova-2 speech-to-text, called through the LiveKit Agents Deepgram plugin',
    logo: '/logos/deepgram.svg',
    products: [
      { id: 'streaming-stt', label: 'Streaming STT' },
      { id: 'prerecorded-stt', label: 'Pre-recorded STT' },
      { id: 'tts', label: 'Text-to-speech' },
      { id: 'voice-agent', label: 'Voice Agent' }
    ]
  }
];

const models: ({ id: string } & ArchitectureNodeData)[] = [
  {
    id: 'gemini',
    label: 'Gemini',
    description:
      'Agent chat and design models via OpenRouter; direct API for knowledge base and translation',
    logo: '/logos/gemini.svg',
    products: [
      { id: 'text', label: 'Text generation' },
      { id: 'images', label: 'Image generation' },
      { id: 'file-search', label: 'File search' },
      { id: 'embeddings', label: 'Embeddings' },
      { id: 'live', label: 'Live API' }
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: "Direct API for IAteneo's AI conversations; GPT models via OpenRouter",
    logo: '/logos/openai.svg',
    logoDark: '/logos/openai-dark.svg',
    products: [
      { id: 'chat', label: 'Chat completions' },
      { id: 'embeddings', label: 'Embeddings' },
      { id: 'realtime', label: 'Realtime' },
      { id: 'images', label: 'Images' },
      { id: 'moderation', label: 'Moderation' }
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude Sonnet for Golden Papers section generation',
    logo: '/logos/anthropic.svg',
    logoDark: '/logos/anthropic-dark.svg',
    via: 'openrouter',
    products: [
      { id: 'messages', label: 'Messages' },
      { id: 'batches', label: 'Message batches' },
      { id: 'files', label: 'Files' },
      { id: 'web-search', label: 'Web search' }
    ]
  },
  {
    id: 'xiaomi',
    label: 'Xiaomi MiMo',
    description: 'Cover and master generation, and the agent fallback model',
    logo: '/logos/xiaomi.svg',
    via: 'openrouter',
    products: [
      { id: 'chat', label: 'Chat' },
      { id: 'vision', label: 'Vision' },
      { id: 'audio', label: 'Audio' }
    ]
  }
];

// Products list the domains and mailboxes each provider holds for us.
const operationsServices: ({ id: string } & ArchitectureNodeData)[] = [
  {
    id: 'cursor',
    label: 'Cursor',
    description: 'AI code editor and agents used to build every Dot Science app',
    logo: '/logos/cursor.svg',
    logoDark: '/logos/cursor-dark.svg'
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    description: 'ChatGPT subscription for research and writing, billed apart from the OpenAI API',
    logo: '/logos/openai.svg',
    logoDark: '/logos/openai-dark.svg'
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    description: 'Gmail and Workspace apps for the hermes.science mailbox',
    logo: '/logos/google-workspace.svg',
    products: [{ id: 'hermes-science', label: 'hermes.science' }]
  },
  {
    id: 'titan',
    label: 'Titan Email',
    description: 'Essential Email by Titan for the dotscience.ai mailbox, sold through Squarespace',
    logo: '/logos/titan.svg',
    logoDark: '/logos/titan-dark.svg',
    products: [{ id: 'dotscience-ai', label: 'dotscience.ai' }]
  },
  {
    id: 'squarespace',
    label: 'Squarespace',
    description: 'Domain registrar for affine.club, dotscience.ai and hermes.science',
    logo: '/logos/squarespace.svg',
    logoDark: '/logos/squarespace-dark.svg',
    products: [
      { id: 'affine-club', label: 'affine.club' },
      { id: 'dotscience-ai', label: 'dotscience.ai' },
      { id: 'hermes-science', label: 'hermes.science' }
    ]
  },
  {
    id: 'namecheap',
    label: 'Namecheap',
    description: 'Domain registrar for iateneo.ai, goldenpapers.ai and abstra.space',
    logo: '/logos/namecheap.svg',
    products: [
      { id: 'iateneo-ai', label: 'iateneo.ai' },
      { id: 'goldenpapers-ai', label: 'goldenpapers.ai' },
      { id: 'abstra-space', label: 'abstra.space' }
    ]
  }
];

const documentSubAgents: ({ id: string } & ArchitectureNodeData)[] = [
  {
    id: 'gp-router',
    step: '1',
    label: 'Request router',
    description: 'Splits the message into routed requests, each with an intent',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-clarification',
    step: '2',
    label: 'Clarification gate',
    description: 'Pauses to ask the user when a request is ambiguous',
    human: true
  },
  {
    id: 'gp-research',
    step: '3',
    label: 'Research',
    description: 'Web research, saved to the knowledge base',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-context',
    step: '4',
    label: 'Context provider',
    description: 'Gathers the sections and knowledge each route needs',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-planner',
    step: '5',
    label: 'Planner',
    description: 'Drafts the plan for each route',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-plan-approval',
    step: '6',
    label: 'Plan approval',
    description: 'The user approves the plan before anything executes',
    human: true
  },
  {
    id: 'gp-answer-executor',
    step: '7',
    label: 'Answer executor',
    description: 'Answers questions about the document; runs in parallel',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-tool-executor',
    step: '7',
    label: 'Tool-calling executor',
    description: 'Edits, rewrites, branding, structure; runs in parallel',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-review',
    step: '8',
    label: 'Results review',
    description: 'The user accepts or rejects each proposed patch',
    human: true
  }
];

const subAgentsById = new Map(documentSubAgents.map((agent) => [agent.id, agent]));

const goldenPapersAgents: PositionedNodeData[] = [
  {
    id: ORCHESTRATOR_ID,
    y: 600,
    label: 'Document editor',
    badge: 'Orchestrator',
    description: 'Picks the next step, gets control back after each one, and fans out executors',
    stack: 'LangGraph supervisor · rule-based routing',
    outputs: [
      ...orchestrationTargets.map((target) => ({
        id: target.nodeId,
        label: target.graphNode,
        detail: target.when,
        kind: 'orchestration' as const,
        human: subAgentsById.get(target.nodeId)?.human,
        targets: [target.nodeId]
      })),
      { id: 'runtime', label: 'Graph runtime', targets: ['langgraph#runtime'] },
      { id: 'tracing', label: 'Tracing', targets: ['langgraph#langsmith'] },
      { id: 'checkpoints', label: 'Checkpoints', targets: ['supabase#database'] }
    ]
  },
  {
    id: 'gp-chat-agent',
    y: 1120,
    label: 'Agent chat',
    description: 'Conversational assistant over the open document',
    stack: 'Gemini 3.5 Flash, MiMo fallback',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-ask-agent',
    y: 1260,
    label: 'Ask agent',
    description: 'Answers questions about a document and its pinned blocks',
    stack: 'Execution agent models',
    outputs: [gatewayChat]
  },
  {
    id: 'gp-template-agent',
    y: 1400,
    label: 'Template agent',
    description: 'Edits document templates and covers through tool calls',
    stack: 'Execution agent models',
    outputs: [gatewayChat]
  }
];

const agents: ArchitectureNode[] = [
  {
    id: 'iateneo-transcriber',
    kind: 'agent',
    position: { x: AGENT_COLUMN_X, y: 470 },
    data: {
      label: 'Transcriber agent',
      description: 'Joins voice rooms and transcribes each intervention in real time',
      stack: 'LiveKit Agents · Deepgram Nova-2',
      outputs: [{ id: 'runtime', label: 'Runtime', targets: ['livekit#agents'] }]
    }
  },
  ...goldenPapersAgents.map(({ id, y, ...data }) => ({
    id,
    kind: id === ORCHESTRATOR_ID ? ('orchestrator' as const) : ('agent' as const),
    position: { x: AGENT_COLUMN_X, y },
    data
  })),
  ...documentSubAgents.map(({ id, ...data }, index) => ({
    id,
    kind: 'subagent' as const,
    position: { x: SUBAGENT_COLUMN_X, y: SUBAGENT_START_Y + index * SUBAGENT_STEP_Y },
    data
  }))
];

export function serviceNodeWidth(data: ArchitectureNodeData): number {
  return data.layer !== 'core' && data.products?.length ? ADD_ON_NODE_WIDTH : SERVICE_NODE_WIDTH;
}

function rowOf(
  nodes: ({ id: string } & ArchitectureNodeData)[],
  startX: number,
  y: number,
  layer: ServiceLayer = 'addon'
): ArchitectureNode[] {
  let x = startX;
  return nodes.map(({ id, ...rest }) => {
    const data = { ...rest, layer };
    const node = { id, kind: 'service' as const, position: { x, y }, data };
    x += serviceNodeWidth(data) + ADD_ON_GAP_X;
    return node;
  });
}

function rowWidth(nodes: ArchitectureNodeData[]): number {
  return nodes.reduce(
    (sum, data) => sum + serviceNodeWidth({ ...data, layer: 'addon' }) + ADD_ON_GAP_X,
    -ADD_ON_GAP_X
  );
}

// The model row is centred under OpenRouter, the last node of the add-on row.
const gatewayCenterX = APP_COLUMN_X + rowWidth(addOnServices) - ADD_ON_NODE_WIDTH / 2;
const modelRowStartX = gatewayCenterX - rowWidth(models) / 2;

const baseNodes: ArchitectureNode[] = [
  {
    id: 'dot-science-ai',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: -440 },
    data: {
      label: 'Dot Science AI',
      logo: '/logos/apps/dot-science-ai.svg',
      description: 'Landing + platform center: schema and shared packages',
      url: process.env.NEXT_PUBLIC_SITE_URL,
      outputs: [
        {
          id: 'platform',
          label: 'Shared packages',
          kind: 'platform',
          targets: [
            'workspace',
            'iateneo',
            'golden-papers',
            'abstra-space',
            'admin-center',
            'affine-club'
          ]
        },
        authentication,
        { id: 'schema', label: 'Schema & migrations', targets: ['supabase#database'] },
        { id: 'buckets', label: 'Storage buckets', targets: ['supabase#storage'] },
        { id: 'functions', label: 'Edge Functions', targets: ['supabase#edge-functions'] },
        analytics
      ]
    }
  },
  {
    id: 'workspace',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: 0 },
    data: {
      label: 'Workspace',
      logo: '/logos/apps/workspace.svg',
      description: 'Product hub: projects, orgs and files',
      url: process.env.NEXT_PUBLIC_WORKSPACE_URL,
      outputs: [authentication, database, storage]
    }
  },
  {
    id: 'iateneo',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: APP_STEP_Y },
    data: {
      label: 'IAteneo',
      logo: '/logos/apps/iateneo.svg',
      description: 'Thought: live sessions and interventions',
      url: process.env.NEXT_PUBLIC_IATENEO_URL,
      outputs: [
        authentication,
        database,
        { id: 'realtime', label: 'Realtime', targets: ['supabase#realtime'] },
        storage,
        { id: 'voice-rooms', label: 'Voice rooms', targets: ['livekit#rooms'] },
        { id: 'ai', label: 'AI', targets: ['openai#chat'] },
        { id: 'agents', label: 'AI agents', targets: ['iateneo-transcriber'] },
        email,
        analytics,
        { id: 'cron', label: 'Scheduled jobs', targets: ['vercel#cron'] }
      ]
    }
  },
  {
    id: 'golden-papers',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: APP_STEP_Y * 2 },
    data: {
      label: 'Golden Papers',
      logo: '/logos/apps/golden-papers.svg',
      description: 'Knowledge: documents and blocks',
      url: process.env.NEXT_PUBLIC_GOLDEN_PAPERS_URL,
      outputs: [
        authentication,
        database,
        storage,
        {
          id: 'ai',
          label: 'AI agents',
          targets: goldenPapersAgents.map((agent) => agent.id)
        },
        { id: 'generation', label: 'Generation & design', targets: ['openrouter#chat'] },
        { id: 'images', label: 'Image generation', targets: ['openrouter#images'] },
        { id: 'web-search', label: 'Web search', targets: ['openrouter#web-search'] },
        { id: 'knowledge', label: 'Knowledge base', targets: ['gemini#file-search'] },
        { id: 'translation', label: 'Translation', targets: ['gemini#text'] },
        { id: 'voice', label: 'Voice', targets: ['elevenlabs#agents'] },
        email,
        analytics
      ]
    }
  },
  {
    id: 'abstra-space',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: APP_STEP_Y * 3 },
    data: {
      label: 'Abstra Space',
      logo: '/logos/apps/abstra-space.svg',
      description: 'Experience: 3D spaces and models',
      url: process.env.NEXT_PUBLIC_ABSTRA_SPACE_URL,
      outputs: [authentication, database]
    }
  },
  {
    id: 'admin-center',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: APP_STEP_Y * 4 },
    data: {
      label: 'Admin Center',
      logo: '/logos/apps/admin-center.png',
      description: 'Platform administration (this app)',
      outputs: [
        authentication,
        database,
        { id: 'monitoring', label: 'Error monitoring', targets: ['sentry#errors'] },
        { id: 'tracing', label: 'Tracing', targets: ['sentry#tracing'] },
        { id: 'models-api', label: 'Models API', targets: ['openrouter#models-api'] }
      ]
    }
  },
  {
    id: 'affine-club',
    kind: 'app',
    position: { x: APP_COLUMN_X, y: APP_STEP_Y * 4 + 280 },
    data: {
      label: 'Affine Club',
      logo: '/logos/apps/affine-club.svg',
      description: 'Resonance: circles (not created yet)',
      url: process.env.NEXT_PUBLIC_AFFINE_CLUB_URL,
      planned: true
    }
  },
  {
    id: 'supabase',
    kind: 'service',
    position: { x: SERVICE_COLUMN_X, y: -400 },
    data: {
      layer: 'core',
      label: 'Supabase',
      description: 'Shared auth, Postgres database and schemas for every Dot Science app',
      logo: '/logos/supabase.svg',
      products: [
        { id: 'auth', label: 'Auth' },
        { id: 'database', label: 'Database' },
        { id: 'realtime', label: 'Realtime' },
        { id: 'storage', label: 'Storage' },
        { id: 'edge-functions', label: 'Edge Functions' },
        { id: 'vectors', label: 'Vectors' },
        { id: 'cron', label: 'Cron' },
        { id: 'queues', label: 'Queues' }
      ]
    }
  },
  ...agents,
  ...coreServices.map(({ id, y, ...data }) => ({
    id,
    kind: 'service' as const,
    position: { x: SERVICE_COLUMN_X, y },
    data: { ...data, layer: 'core' as const }
  })),
  ...liveKitProviders.map(({ id, y, ...data }) => ({
    id,
    kind: 'service' as const,
    position: { x: PROVIDER_COLUMN_X, y },
    data: { ...data, layer: 'core' as const }
  })),
  ...rowOf(addOnServices, APP_COLUMN_X, ADD_ON_ROW_Y),
  ...rowOf(models, modelRowStartX, MODEL_ROW_Y),
  ...rowOf(operationsServices, APP_COLUMN_X, OPERATIONS_ROW_Y, 'operations')
];

export function parseTarget(target: string): { nodeId: string; productId?: string } {
  const [nodeId, productId] = target.split('#');
  return { nodeId, productId };
}

const kindById = new Map(baseNodes.map((node) => [node.id, node.kind]));
const layerById = new Map(baseNodes.map((node) => [node.id, node.data.layer]));

function targetLayer(target: string) {
  return layerById.get(parseTarget(target).nodeId);
}

function outputSide(output: ArchitectureOutput): ArchitectureOutputSide {
  if (output.kind === 'platform') return 'bottom';
  if (output.targets.every((target) => targetLayer(target) === 'addon')) return 'bottom';
  return output.targets.every((target) => targetLayer(target) === 'core') ? 'left' : 'right';
}

export const architectureNodes: ArchitectureNode[] = baseNodes.map((node) =>
  node.data.outputs
    ? {
        ...node,
        data: {
          ...node.data,
          outputs: node.data.outputs.map((output) => ({ ...output, side: outputSide(output) }))
        }
      }
    : node
);

export const usedProductIds = new Set(
  baseNodes.flatMap((node) =>
    (node.data.outputs ?? []).flatMap((output) =>
      output.targets.filter((target) => parseTarget(target).productId)
    )
  )
);

const plannedNodeIds = new Set(
  architectureNodes.filter((node) => node.data.planned).map((node) => node.id)
);

// Apps and the orchestrator get one handle per output; other nodes share one handle per side.
const handleKinds = new Set<ArchitectureNodeKind>(['app', 'orchestrator']);

function targetHandle(target: string, edgeKind: ArchitectureEdgeKind) {
  const { nodeId, productId } = parseTarget(target);
  if (productId) return `product-${productId}`;
  if (edgeKind === 'platform') return 'top';
  if (kindById.get(nodeId) !== 'service') return 'left';
  return layerById.get(nodeId) === 'addon' ? 'top' : 'right';
}

export const architectureEdges: ArchitectureEdge[] = architectureNodes.flatMap((node) =>
  (node.data.outputs ?? []).flatMap((output) =>
    output.targets.map((target) => {
      const kind = output.kind ?? 'service';
      const { nodeId } = parseTarget(target);
      return {
        source: node.id,
        sourceHandle: handleKinds.has(node.kind) ? output.id : `src-${output.side}`,
        target: nodeId,
        targetHandle: targetHandle(target, kind),
        kind,
        planned: plannedNodeIds.has(nodeId)
      };
    })
  )
);

function hashString(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

// Positions are left out so moving nodes doesn't make a saved snapshot look outdated.
export const architectureSeedHash = hashString(
  JSON.stringify({
    nodes: architectureNodes.map(({ position: _position, ...node }) => node),
    edges: architectureEdges
  })
);

export type PinTone = 'primary' | 'orchestration' | 'muted';

function edgeTone(edge: ArchitectureEdge): PinTone {
  if (edge.kind === 'orchestration') return 'orchestration';
  if (edge.kind === 'platform' || kindById.get(edge.target) !== 'service') return 'primary';
  return 'muted';
}

// Keyed by `${nodeId}:${handleId}`; handles without an edge get no pin.
export const pinTones = new Map<string, PinTone>();
for (const edge of architectureEdges) {
  const tone = edgeTone(edge);
  for (const key of [
    `${edge.source}:${edge.sourceHandle}`,
    `${edge.target}:${edge.targetHandle}`
  ]) {
    if (!pinTones.has(key)) pinTones.set(key, tone);
  }
}
