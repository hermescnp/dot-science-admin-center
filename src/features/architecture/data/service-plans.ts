export interface ServicePlan {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
}

export interface ServiceCapability {
  id: string;
  group: string;
  label: string;
  providerMax: string;
  plans: Partial<Record<string, string>>;
}

export interface ServicePlans {
  kind: 'subscription' | 'usage';
  plans: ServicePlan[];
  capabilities: ServiceCapability[];
  fallbackPlanId: string;
  pricingNote?: string;
  pricingUrl: string;
  asOf: string;
}

const asOf = 'Oct 2026';
const included = 'Included';
const custom = 'Custom (Enterprise)';

function capability(
  group: string,
  id: string,
  label: string,
  providerMax: string,
  plans: Partial<Record<string, string>>
): ServiceCapability {
  return { id, group, label, providerMax, plans };
}

const supabaseCapabilities: ServiceCapability[] = [
  capability('Auth', 'mau', 'Monthly active users', custom, {
    free: '50,000',
    pro: '100,000 incl.',
    team: '100,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Auth', 'sso', 'SAML SSO users', custom, {
    pro: '50 incl.',
    team: '50 incl.',
    enterprise: 'Custom'
  }),
  capability('Auth', 'auditLogs', 'Auth audit logs', '28 days', {
    free: '1 hour',
    pro: '7 days',
    team: '28 days',
    enterprise: included
  }),
  capability('Database', 'databaseSize', 'Database size', '64 TB disk', {
    free: '500 MB',
    pro: '8 GB incl.',
    team: '8 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Database', 'egress', 'Egress', custom, {
    free: '5 GB',
    pro: '250 GB incl.',
    team: '250 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Database', 'backups', 'Automatic backups', '14 days', {
    pro: '7 days',
    team: '14 days',
    enterprise: 'Custom'
  }),
  capability('Database', 'pitr', 'Point-in-time recovery', '>28 days', {
    pro: 'Add-on',
    team: 'Add-on',
    enterprise: '>28 days'
  }),
  capability('Database', 'branching', 'Branching', 'Pay per branch', {
    pro: 'Pay per branch',
    team: 'Pay per branch',
    enterprise: 'Custom'
  }),
  capability('Storage', 'storage', 'File storage', custom, {
    free: '1 GB',
    pro: '100 GB incl.',
    team: '100 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Storage', 'cachedEgress', 'Cached egress', custom, {
    free: '5 GB',
    pro: '250 GB incl.',
    team: '250 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Storage', 'uploadSize', 'Max file upload', '500 GB', {
    free: '50 MB',
    pro: '500 GB',
    team: '500 GB',
    enterprise: 'Custom'
  }),
  capability('Edge Functions', 'invocations', 'Invocations per month', custom, {
    free: '500,000',
    pro: '2M incl.',
    team: '2M incl.',
    enterprise: 'Custom'
  }),
  capability('Realtime', 'realtimeConnections', 'Peak connections', custom, {
    free: '200',
    pro: '500 incl.',
    team: '500 incl.',
    enterprise: 'Custom'
  }),
  capability('Realtime', 'realtimeMessages', 'Messages per month', custom, {
    free: '2M',
    pro: '5M incl.',
    team: '5M incl.',
    enterprise: 'Custom'
  }),
  capability('Platform', 'projects', 'Active projects', 'Unlimited', {
    free: '2',
    pro: 'Unlimited',
    team: 'Unlimited',
    enterprise: 'Unlimited'
  }),
  capability('Platform', 'members', 'Team members', 'Unlimited', {
    free: 'Unlimited',
    pro: 'Unlimited',
    team: 'Unlimited',
    enterprise: 'Unlimited'
  }),
  capability('Platform', 'logRetention', 'Log retention', '90 days', {
    free: '1 day',
    pro: '7 days',
    team: '28 days',
    enterprise: '90 days'
  }),
  capability('Security', 'soc2', 'SOC2 and ISO 27001', included, {
    team: included,
    enterprise: included
  }),
  capability('Security', 'hipaa', 'HIPAA', 'Add-on', { team: 'Add-on', enterprise: 'Add-on' }),
  capability('Security', 'dashboardSso', 'Dashboard SSO', included, {
    team: included,
    enterprise: included
  }),
  capability('Security', 'uptimeSla', 'Uptime SLA', included, { enterprise: included })
];

const livekitCapabilities: ServiceCapability[] = [
  capability('Agents', 'agentMinutes', 'Agent session minutes', custom, {
    build: '1,000',
    ship: '5,000 incl.',
    scale: '50,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Agents', 'agentConcurrency', 'Concurrent agent sessions', '600', {
    build: '5',
    ship: '20',
    scale: 'Up to 600',
    enterprise: 'Custom'
  }),
  capability('Agents', 'agentDeployments', 'Agent deployments', '4', {
    build: '1',
    ship: '2',
    scale: '4',
    enterprise: 'Custom'
  }),
  capability('Agents', 'inferenceCredits', 'Inference credits', '$50', {
    build: '$2.50',
    ship: '$5',
    scale: '$50',
    enterprise: 'Custom'
  }),
  capability('Agents', 'customVoices', 'Custom voices', '50', {
    ship: '20',
    scale: '50',
    enterprise: 'Custom'
  }),
  capability('Agents', 'voiceIsolation', 'Voice isolation minutes', custom, {
    build: '100',
    ship: '1,000 incl.',
    scale: '10,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Realtime', 'webrtcMinutes', 'WebRTC minutes', custom, {
    build: '5,000',
    ship: '150,000 incl.',
    scale: '1.5M incl.',
    enterprise: 'Custom'
  }),
  capability('Realtime', 'concurrentConnections', 'Concurrent connections', '5,000', {
    build: '100',
    ship: '1,000',
    scale: '5,000',
    enterprise: 'Custom'
  }),
  capability('Realtime', 'downstream', 'Downstream transfer', custom, {
    build: '50 GB',
    ship: '250 GB incl.',
    scale: '3 TB incl.',
    enterprise: 'Custom'
  }),
  capability('Media', 'transcode', 'Transcode minutes', custom, {
    build: '60',
    ship: '600 incl.',
    scale: '8,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Media', 'concurrentEgress', 'Concurrent imports / exports', '500', {
    build: '2',
    ship: '100',
    scale: '500',
    enterprise: 'Custom'
  }),
  capability('Telephony', 'phoneNumbers', 'US local phone numbers', '1 free, then $1/mo', {
    build: '1 free',
    ship: '1 free, then $1/mo',
    scale: '1 free, then $1/mo',
    enterprise: 'Custom'
  }),
  capability('Telephony', 'sipMinutes', 'Third-party SIP minutes', custom, {
    build: '1,000',
    ship: '5,000 incl.',
    scale: '50,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Platform', 'teamCollaboration', 'Team collaboration', included, {
    ship: included,
    scale: included,
    enterprise: included
  }),
  capability('Security', 'rbac', 'Role-based access', included, {
    scale: included,
    enterprise: included
  }),
  capability('Security', 'regionPinning', 'Region pinning', included, {
    scale: included,
    enterprise: included
  }),
  capability('Security', 'hipaa', 'HIPAA', included, { scale: included, enterprise: included }),
  capability('Security', 'sso', 'SSO', included, { enterprise: included })
];

const openaiCapabilities: ServiceCapability[] = [
  capability('Billing', 'usageLimit', 'Monthly usage limit', '$200,000', {
    free: '$100',
    build: '$500',
    launch: '$5,000',
    grow: '$200,000'
  }),
  capability('Rate limits', 'flagshipRpm', 'Astra, Sol, Terra RPM', '15,000', {
    build: '5,000',
    launch: '10,000',
    grow: '15,000'
  }),
  capability('Rate limits', 'flagshipTpm', 'Astra, Sol, Terra TPM', '40M', {
    build: '1M',
    launch: '4M',
    grow: '40M'
  }),
  capability('Rate limits', 'lunaRpm', 'Luna RPM', '30,000', {
    build: '5,000',
    launch: '10,000',
    grow: '30,000'
  }),
  capability('Rate limits', 'lunaTpm', 'Luna TPM', '180M', {
    build: '2M',
    launch: '10M',
    grow: '180M'
  }),
  capability('Capacity', 'batch', 'Batch API', included, {
    build: included,
    launch: included,
    grow: included
  }),
  capability('Capacity', 'reservedTier', 'Scale / Reserved tier', 'Enterprise', {}),
  capability('Billing', 'spendLimits', 'Spend alerts and hard limits', included, {
    free: included,
    build: included,
    launch: included,
    grow: included
  })
];

const deepgramCapabilities: ServiceCapability[] = [
  capability('Billing', 'credit', 'Prepaid credit', '$4K+ per year', {
    payg: '$200 free',
    growth: '$4K+ per year',
    enterprise: 'Custom'
  }),
  capability('Billing', 'audioProcessed', 'Audio processed (30 days)', 'Unlimited', {
    payg: 'Pay per minute',
    growth: 'Pay per minute',
    enterprise: 'Custom'
  }),
  capability('Speech to text', 'nova3Rate', 'Nova-3 streaming rate', '$0.0042/min', {
    payg: '$0.0048/min',
    growth: '$0.0042/min',
    enterprise: 'Custom'
  }),
  capability('Speech to text', 'sttRest', 'REST concurrency', '50', {
    payg: '50',
    growth: '50',
    enterprise: 'Custom'
  }),
  capability('Speech to text', 'sttWss', 'WebSocket concurrency', '225', {
    payg: '150',
    growth: '225',
    enterprise: 'Custom'
  }),
  capability('Speech to text', 'whisper', 'Whisper Cloud concurrency', '5', {
    payg: '5',
    growth: '5',
    enterprise: 'Custom'
  }),
  capability('Text to speech', 'ttsConcurrency', 'TTS concurrency', '60', {
    payg: '45',
    growth: '60',
    enterprise: 'Custom'
  }),
  capability('Voice agents', 'agentConcurrency', 'Voice Agent concurrency', '60', {
    payg: '45',
    growth: '60',
    enterprise: 'Custom'
  }),
  capability(
    'Audio intelligence',
    'intelligenceConcurrency',
    'Audio Intelligence concurrency',
    '10',
    {
      payg: '10',
      growth: '10',
      enterprise: 'Custom'
    }
  ),
  capability('Platform', 'customModels', 'Custom models', 'Enterprise', { enterprise: included }),
  capability('Security', 'hipaa', 'HIPAA BAA', 'Enterprise', { enterprise: included }),
  capability('Security', 'euResidency', 'EU data residency', included, {
    payg: included,
    growth: included,
    enterprise: included
  })
];

const elevenlabsCapabilities: ServiceCapability[] = [
  capability('Usage', 'credits', 'Monthly credits', '6M', {
    free: '10k',
    starter: '30k',
    creator: '121k',
    pro: '600k',
    scale: '1.8M',
    business: '6M',
    enterprise: 'Custom'
  }),
  capability('Usage', 'concurrency', 'Concurrent requests', '25', {
    free: '2',
    starter: '3',
    creator: '5',
    pro: '10',
    scale: '15',
    business: '25',
    enterprise: 'Elevated'
  }),
  capability('Voices', 'voiceSlots', 'Custom voice slots', '2,200', {
    free: '3',
    starter: '10',
    creator: '30',
    pro: '160',
    scale: '660',
    business: '2,200',
    enterprise: 'Custom'
  }),
  capability('Voices', 'instantCloning', 'Instant Voice Cloning', included, {
    starter: included,
    creator: included,
    pro: included,
    scale: included,
    business: included,
    enterprise: included
  }),
  capability('Voices', 'pvc', 'Professional Voice Clones', '10', {
    creator: '1',
    pro: '1',
    scale: '3',
    business: '10',
    enterprise: 'Custom'
  }),
  capability('Audio', 'quality', 'Audio quality', '192 kbps, 44.1kHz', {
    free: '128 kbps',
    starter: '128 kbps',
    creator: '192 kbps',
    pro: '192 kbps',
    scale: '192 kbps',
    business: '192 kbps',
    enterprise: '192 kbps'
  }),
  capability('Audio', 'pcm', '44.1kHz PCM via API', included, {
    pro: included,
    scale: included,
    business: included,
    enterprise: included
  }),
  capability('Workspace', 'seats', 'Workspace seats', '10', {
    scale: '3',
    business: '10',
    enterprise: 'Custom'
  }),
  capability('Licensing', 'commercial', 'Commercial license', included, {
    starter: included,
    creator: included,
    pro: included,
    scale: included,
    business: included,
    enterprise: included
  }),
  capability('Licensing', 'dubbingStudio', 'Dubbing Studio', included, {
    starter: included,
    creator: included,
    pro: included,
    scale: included,
    business: included,
    enterprise: included
  }),
  capability('Security', 'hipaa', 'HIPAA BAA', 'Enterprise', { enterprise: included }),
  capability('Security', 'sso', 'Custom SSO', 'Enterprise', { enterprise: included })
];

const resendCapabilities: ServiceCapability[] = [
  capability('Sending', 'emails', 'Transactional emails per month', '2.5M', {
    free: '3,000',
    pro: '50,000',
    scale: '100,000',
    enterprise: 'Custom'
  }),
  capability('Sending', 'dailyLimit', 'Daily sending limit', 'None', {
    free: '100',
    pro: 'None',
    scale: 'None',
    enterprise: 'None'
  }),
  capability('Sending', 'domains', 'Domains', '1,000', {
    free: '3',
    pro: '10',
    scale: '1,000',
    enterprise: 'Custom'
  }),
  capability('Sending', 'webhooks', 'Webhook endpoints', '10', {
    pro: '5',
    scale: '10',
    enterprise: 'Custom'
  }),
  capability('Marketing', 'contacts', 'Marketing contacts', '150,000', {
    free: '1,000',
    pro: 'Add-on up to 150,000',
    scale: 'Add-on up to 150,000',
    enterprise: 'Custom'
  }),
  capability('Marketing', 'automations', 'Automation runs per month', '10,000 incl.', {
    free: '10,000',
    pro: '10,000 incl.',
    scale: '10,000 incl.',
    enterprise: 'Custom'
  }),
  capability('Platform', 'aiCredits', 'AI credits per month', '500', {
    free: '5',
    pro: '100',
    scale: '500',
    enterprise: 'Flexible'
  }),
  capability('Platform', 'retention', 'Data retention', 'Flexible (Enterprise)', {
    free: '30 days',
    enterprise: 'Flexible'
  }),
  capability('Platform', 'dedicatedIp', 'Dedicated IP', 'Add-on', {
    scale: 'Add-on',
    enterprise: included
  }),
  capability('Security', 'sso', 'SSO', 'Add-on', { scale: 'Add-on', enterprise: included }),
  capability('Security', 'uptimeSla', '99.99% uptime SLA', 'Enterprise', { enterprise: included })
];

const openrouterCapabilities: ServiceCapability[] = [
  capability('Billing', 'credits', 'Prepaid credits', 'No cap', {
    standard: 'Pay as you go',
    business: 'Pay as you go',
    enterprise: 'Invoicing'
  }),
  capability('Billing', 'platformFee', 'Platform fee', 'Discounts (Enterprise)', {
    free: 'None',
    standard: '5.5%',
    business: '8%',
    enterprise: 'Discounted'
  }),
  capability('Billing', 'byok', 'BYOK without fees', '$25,000/mo', {
    standard: '$25,000/mo',
    business: '$25,000/mo',
    enterprise: 'Custom'
  }),
  capability('Models', 'models', 'Models', '500+', {
    free: '25+ free',
    standard: '500+',
    business: '500+',
    enterprise: '500+'
  }),
  capability('Models', 'providers', 'Providers', '80+', {
    free: '4',
    standard: '80+',
    business: '80+',
    enterprise: '80+'
  }),
  capability('Models', 'rateLimit', 'Rate limits', 'Provider passthrough', {
    free: '50 requests/day',
    standard: 'Provider passthrough',
    business: 'Provider passthrough',
    enterprise: 'Higher allowances'
  }),
  capability('Routing', 'autoRouting', 'Auto-routing and budgets', included, {
    standard: included,
    business: included,
    enterprise: included
  }),
  capability('Routing', 'promptCaching', 'Prompt caching', included, {
    standard: included,
    business: included,
    enterprise: included
  }),
  capability('Routing', 'regionRouting', 'EU / US in-region routing', included, {
    business: included,
    enterprise: included
  }),
  capability('Platform', 'workspaces', 'Workspaces', '1,000', {
    free: '5',
    standard: '5',
    business: '1,000',
    enterprise: 'Custom'
  }),
  capability('Security', 'sso', 'SSO / SAML', 'Enterprise', { enterprise: included }),
  capability('Security', 'sla', 'Contractual SLAs', 'Enterprise', { enterprise: included })
];

const geminiCapabilities: ServiceCapability[] = [
  capability('Billing', 'tierCap', 'Billing tier cap', '$100,000+', {
    tier1: '$250',
    tier2: '$2,000',
    tier3: '$20,000 - $100,000+'
  }),
  capability('Billing', 'spendLimit', 'Spend limit per 10 minutes', '$200', {
    tier1: '$10',
    tier2: '$50',
    tier3: '$200'
  }),
  capability('Batch', 'batchTokens', 'Batch enqueued tokens (3.5 Flash)', '1B', {
    tier1: '3M',
    tier2: '400M',
    tier3: '1B'
  }),
  capability('Batch', 'batchJobs', 'Concurrent batch requests', '100', {
    tier1: '100',
    tier2: '100',
    tier3: '100'
  }),
  capability('Batch', 'fileStorage', 'File storage', '20 GB', {
    free: '20 GB',
    tier1: '20 GB',
    tier2: '20 GB',
    tier3: '20 GB'
  }),
  capability('Rate limits', 'priority', 'Priority inference limits', '0.3x standard', {
    tier1: '0.3x standard',
    tier2: '0.3x standard',
    tier3: '0.3x standard'
  })
];

const langsmithCapabilities: ServiceCapability[] = [
  capability('Workspace', 'seats', 'Seats', 'Unlimited', {
    developer: '1',
    plus: 'Unlimited',
    enterprise: 'Custom'
  }),
  capability('Observability', 'traces', 'Base traces per month', custom, {
    developer: '5k incl.',
    plus: '10k incl.',
    enterprise: 'Custom'
  }),
  capability('Observability', 'retention', 'Trace retention', '180 days (extended)', {
    developer: '14 days',
    plus: '14 or 180 days',
    enterprise: 'Custom'
  }),
  capability('Deployment', 'deployments', 'Free serverless deployments', '1', {
    plus: '1',
    enterprise: 'Custom'
  }),
  capability('Agents', 'fleet', 'Fleet LSU allowance', '37 LSU', {
    developer: '7 LSU',
    plus: '37 LSU',
    enterprise: 'Custom'
  }),
  capability('Agents', 'sandboxes', 'Sandboxes', '8 LSU free', {
    developer: '10 sandboxes',
    plus: '8 LSU free',
    enterprise: 'Custom'
  }),
  capability('Platform', 'hosting', 'Hosting options', 'Cloud, hybrid, self-hosted', {
    developer: 'Cloud',
    plus: 'Cloud',
    enterprise: 'Cloud, hybrid, self-hosted'
  }),
  capability('Security', 'sso', 'SSO, ABAC and RBAC', 'Enterprise', { enterprise: included }),
  capability('Security', 'sla', 'Support SLA', 'Enterprise', { enterprise: included })
];

const vercelCapabilities: ServiceCapability[] = [
  capability('Team', 'devSeats', 'Developer seats', 'Unlimited ($20 each)', {
    hobby: '1',
    pro: '$20 each',
    enterprise: 'Custom'
  }),
  capability('Team', 'viewerSeats', 'Viewer seats', 'Unlimited', {
    pro: 'Unlimited',
    enterprise: 'Custom'
  }),
  capability('Team', 'projects', 'Projects', 'Unlimited', {
    hobby: '200',
    pro: 'Unlimited',
    enterprise: 'Unlimited'
  }),
  capability('Analytics', 'webAnalytics', 'Web Analytics events', custom, {
    hobby: '50K per month',
    pro: '$3 per 100K',
    enterprise: 'Custom'
  }),
  capability('Analytics', 'analyticsRetention', 'Analytics reporting window', '24 months', {
    pro: '24 months (Plus add-on)',
    enterprise: '24 months'
  }),
  capability('Analytics', 'speedInsights', 'Speed Insights events', '10K per 30 days', {
    hobby: '10K per 30 days',
    pro: '10K per 30 days',
    enterprise: '10K per 30 days'
  }),
  capability('Network', 'cdnRequests', 'CDN requests', custom, {
    hobby: '1M per month',
    pro: '10M incl.',
    enterprise: 'Custom'
  }),
  capability('Network', 'transfer', 'Fast Data Transfer', custom, {
    hobby: '100 GB',
    pro: '1 TB incl.',
    enterprise: 'Custom'
  }),
  capability('Observability', 'observabilityPlus', 'Observability Plus', 'Add-on', {
    pro: 'Add-on',
    enterprise: 'Add-on'
  }),
  capability('Security', 'rbac', 'Role-based access', 'Team and project level', {
    pro: 'Team level',
    enterprise: 'Team and project level'
  }),
  capability('Security', 'sla', 'Platform SLAs', 'Enterprise', { enterprise: included })
];

const sentryCapabilities: ServiceCapability[] = [
  capability('Team', 'users', 'Users', 'Unlimited', {
    developer: '1',
    team: 'Unlimited',
    business: 'Unlimited',
    enterprise: 'Unlimited'
  }),
  capability('Quota', 'errors', 'Errors per month', 'Pay as you go', {
    developer: '5K',
    team: '50K incl.',
    business: '50K incl.',
    enterprise: 'Custom'
  }),
  capability('Quota', 'spans', 'Spans per month', 'Pay as you go', {
    developer: '5M',
    team: '5M incl.',
    business: '5M incl.',
    enterprise: 'Custom'
  }),
  capability('Quota', 'replays', 'Session replays', 'Pay as you go', {
    developer: '50',
    team: '50 incl.',
    business: '50 incl.',
    enterprise: 'Custom'
  }),
  capability('Quota', 'logs', 'Logs', 'Pay as you go', {
    developer: '5 GB',
    team: '5 GB incl.',
    business: '5 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Quota', 'attachments', 'Attachments', 'Pay as you go', {
    developer: '1 GB',
    team: '1 GB incl.',
    business: '1 GB incl.',
    enterprise: 'Custom'
  }),
  capability('Monitors', 'cron', 'Cron monitors', 'Pay as you go', {
    developer: '1',
    team: '1 incl.',
    business: '1 incl.',
    enterprise: 'Custom'
  }),
  capability('Monitors', 'uptime', 'Uptime monitors', 'Pay as you go', {
    developer: '1',
    team: '1 incl.',
    business: '1 incl.',
    enterprise: 'Custom'
  }),
  capability('Insights', 'dashboards', 'Custom dashboards', 'Unlimited', {
    developer: '10',
    team: '20',
    business: 'Unlimited',
    enterprise: 'Unlimited'
  }),
  capability('Insights', 'lookback', 'Lookback', '90 days + sampled retention', {
    developer: '30 days',
    team: '90 days',
    business: '90 days + sampled retention',
    enterprise: 'Custom'
  }),
  capability('Platform', 'integrations', 'API and integrations', included, {
    team: included,
    business: included,
    enterprise: included
  }),
  capability('Security', 'saml', 'SAML and SCIM', included, {
    business: included,
    enterprise: included
  })
];

const cursorCapabilities: ServiceCapability[] = [
  capability('Usage', 'otherModels', 'Included third-party model usage', 'Pooled (Enterprise)', {
    hobby: 'Limited',
    pro: '$20',
    'pro-plus': '$70',
    ultra: '$400',
    teams: 'Team allowance per seat'
  }),
  capability('Usage', 'onDemand', 'On-demand usage', included, {
    pro: included,
    'pro-plus': included,
    ultra: included,
    teams: 'On by default'
  }),
  capability('Agents', 'agent', 'Agent, Chat and Tab', included, {
    hobby: 'Auto model, limited',
    pro: 'Extended limits',
    'pro-plus': 'Extended limits',
    ultra: 'Extended limits',
    teams: included
  }),
  capability('Agents', 'cloudAgents', 'Cloud agents', included, {
    pro: included,
    'pro-plus': included,
    ultra: included,
    teams: 'Shared team context'
  }),
  capability('Agents', 'bugbot', 'Bugbot code reviews', included, {
    pro: 'Usage-based',
    'pro-plus': 'Usage-based',
    ultra: 'Usage-based',
    teams: included
  }),
  capability('Admin', 'billing', 'Centralized billing and admin', included, {
    teams: included
  }),
  capability('Security', 'sso', 'SAML/OIDC SSO', included, { teams: included })
];

const chatgptCapabilities: ServiceCapability[] = [
  capability('Usage', 'messages', 'Messages and uploads', 'Unlimited', {
    free: 'Limited',
    go: 'Expanded',
    plus: 'Expanded',
    pro: 'Unlimited',
    business: 'Unlimited'
  }),
  capability('Usage', 'deepResearch', 'Deep research', 'Maximum', {
    free: 'Limited',
    plus: 'Expanded',
    pro: 'Maximum',
    business: 'Flexible'
  }),
  capability('Models', 'reasoning', 'Advanced reasoning models', included, {
    plus: included,
    pro: 'Pro reasoning',
    business: included
  }),
  capability('Tools', 'codex', 'Codex', included, {
    free: 'Limited',
    plus: 'Expanded',
    pro: 'Longer sessions',
    business: included
  }),
  capability('Tools', 'projects', 'Projects, tasks and custom GPTs', included, {
    plus: included,
    pro: 'Expanded',
    business: included
  }),
  capability('Admin', 'workspace', 'Team workspace and SSO', included, { business: included }),
  capability('Privacy', 'training', 'No training on your data by default', included, {
    business: included
  })
];

const googleWorkspaceCapabilities: ServiceCapability[] = [
  capability('Storage', 'storage', 'Pooled storage per user', '5 TB+', {
    'business-starter': '30 GB',
    'business-standard': '2 TB',
    'business-plus': '5 TB',
    enterprise: '5 TB+'
  }),
  capability('Meet', 'participants', 'Meeting participants', '1,000', {
    'business-starter': '100',
    'business-standard': '150',
    'business-plus': '500',
    enterprise: '1,000'
  }),
  capability('Meet', 'recording', 'Meeting recording', included, {
    'business-standard': included,
    'business-plus': included,
    enterprise: included
  }),
  capability('Mail', 'customEmail', 'Custom business email', included, {
    'business-starter': included,
    'business-standard': included,
    'business-plus': included,
    enterprise: included
  }),
  capability('Security', 'vault', 'Vault eDiscovery and retention', included, {
    'business-plus': included,
    enterprise: included
  }),
  capability('Admin', 'users', 'Maximum users', 'Unlimited', {
    'business-starter': '300',
    'business-standard': '300',
    'business-plus': '300',
    enterprise: 'Unlimited'
  })
];

const titanCapabilities: ServiceCapability[] = [
  capability('Mail', 'webmail', 'Webmail, iOS and Android apps', included, { basic: included }),
  capability('Mail', 'calendar', 'Calendar and contacts', included, { basic: included }),
  capability('Mail', 'imap', 'IMAP/POP3', included, { basic: included }),
  capability('Security', 'antispam', 'Anti-spam and anti-virus', included, { basic: included }),
  capability('Mail', 'forwarding', 'External forwarders', '3', { basic: '1' })
];

export const servicePlans: Record<string, ServicePlans> = {
  cursor: {
    kind: 'subscription',
    pricingUrl: 'https://cursor.com/pricing',
    capabilities: cursorCapabilities,
    asOf,
    fallbackPlanId: 'hobby',
    plans: [
      {
        id: 'hobby',
        name: 'Hobby',
        price: '$0',
        priceNote: 'per month',
        features: ['Agent, Chat and Tab with the Auto model', 'Limited usage', 'No credit card']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$20',
        priceNote: 'per month',
        features: [
          'Extended Agent limits',
          '$20 of third-party model usage included',
          'Frontier models, MCPs, skills and hooks',
          'Cloud agents'
        ]
      },
      {
        id: 'pro-plus',
        name: 'Pro+',
        price: '$60',
        priceNote: 'per month',
        features: [
          'Everything in Pro',
          '$70 of third-party model usage included',
          'Recommended for daily agent users'
        ]
      },
      {
        id: 'ultra',
        name: 'Ultra',
        price: '$200',
        priceNote: 'per month',
        features: [
          'Everything in Pro+',
          '$400 of third-party model usage included',
          'For agent power users'
        ]
      },
      {
        id: 'teams',
        name: 'Teams',
        price: '$40',
        priceNote: 'per user per month ($120 Premium seat)',
        features: [
          'Centralized team billing and administration',
          'Bugbot code reviews',
          'Team-wide privacy mode',
          'SAML/OIDC SSO'
        ]
      }
    ]
  },
  chatgpt: {
    kind: 'subscription',
    pricingUrl: 'https://chatgpt.com/pricing',
    capabilities: chatgptCapabilities,
    asOf,
    fallbackPlanId: 'free',
    pricingNote: 'Billed separately from the OpenAI API.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'per month',
        features: ['Limited messages, uploads and images', 'Limited deep research']
      },
      {
        id: 'go',
        name: 'Go',
        price: '$8',
        priceNote: 'per month (US)',
        features: ['More messages, uploads and images', 'Longer memory', 'May include ads']
      },
      {
        id: 'plus',
        name: 'Plus',
        price: '$20',
        priceNote: 'per month',
        features: [
          'Advanced reasoning models',
          'Expanded deep research and memory',
          'Projects, scheduled tasks and custom GPTs',
          'Expanded Codex usage'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$100+',
        priceNote: 'per month ($100, $200 or $500 tiers)',
        features: [
          'Everything in Plus',
          'Pro reasoning',
          'Unlimited messages and uploads',
          'Maximum deep research, memory and context'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        price: '$25',
        priceNote: 'per user per month ($20 billed annually), 2+ seats',
        features: [
          'Secure team workspace',
          'SAML SSO and MFA',
          'Usage analytics and spend controls',
          'No training on business data by default'
        ]
      }
    ]
  },
  'google-workspace': {
    kind: 'subscription',
    pricingUrl: 'https://workspace.google.com/pricing',
    capabilities: googleWorkspaceCapabilities,
    asOf,
    fallbackPlanId: 'business-starter',
    pricingNote: 'Annual plan prices; the flexible plan costs 20% more.',
    plans: [
      {
        id: 'business-starter',
        name: 'Business Starter',
        price: '$7',
        priceNote: 'per user per month, annual plan',
        features: ['Custom business email', '30 GB pooled storage per user', '100-person meetings']
      },
      {
        id: 'business-standard',
        name: 'Business Standard',
        price: '$14',
        priceNote: 'per user per month, annual plan',
        features: [
          '2 TB pooled storage per user',
          '150-person meetings with recording',
          'Everything in Starter'
        ]
      },
      {
        id: 'business-plus',
        name: 'Business Plus',
        price: '$22',
        priceNote: 'per user per month, annual plan',
        features: [
          '5 TB pooled storage per user',
          '500-person meetings',
          'Vault eDiscovery and retention'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: ['5 TB+ pooled storage', '1,000-person meetings', 'Advanced security and DLP']
      }
    ]
  },
  titan: {
    kind: 'subscription',
    pricingUrl:
      'https://support.squarespace.com/hc/en-us/articles/46695199896717-Essential-Email-pricing-billing-and-invoices',
    capabilities: titanCapabilities,
    asOf,
    fallbackPlanId: 'basic',
    pricingNote: 'Sold through Squarespace as Essential Email, monthly billing only.',
    plans: [
      {
        id: 'basic',
        name: 'Basic',
        price: 'CA$4',
        priceNote: 'per mailbox per month (US$3)',
        features: [
          'Email on your own domain',
          'Webmail, iOS and Android apps',
          'Calendar and contacts',
          'Anti-spam and anti-virus'
        ]
      }
    ]
  },
  supabase: {
    kind: 'subscription',
    pricingUrl: 'https://supabase.com/pricing',
    capabilities: supabaseCapabilities,
    asOf,
    fallbackPlanId: 'free',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'per month',
        features: [
          'Unlimited API requests',
          '50,000 monthly active users',
          '500 MB database, shared CPU',
          '5 GB egress, 1 GB file storage',
          '500K Edge Function invocations',
          'Paused after 1 week of inactivity, 2 active projects',
          'Community support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$25',
        priceNote: 'per month, plus compute',
        features: [
          '100,000 monthly active users',
          '8 GB disk per project',
          '250 GB egress, 100 GB file storage',
          '2M Edge Function invocations',
          '$10 compute credits (one Micro instance)',
          'Daily backups for 7 days, 7-day log retention',
          'Never paused, email support'
        ]
      },
      {
        id: 'team',
        name: 'Team',
        price: '$599',
        priceNote: 'per month, plus compute',
        features: [
          'Everything in Pro',
          'SOC2 and ISO 27001',
          'Project-scoped and read-only access',
          'SSO for the Supabase dashboard',
          'Daily backups for 14 days, 28-day log retention',
          'Priority email support and SLAs'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Everything in Team',
          'Uptime SLAs',
          'AWS PrivateLink',
          '24/7 premium support and private Slack channel',
          'Designated support manager'
        ]
      }
    ]
  },
  livekit: {
    kind: 'subscription',
    pricingUrl: 'https://livekit.io/pricing',
    capabilities: livekitCapabilities,
    asOf,
    fallbackPlanId: 'build',
    plans: [
      {
        id: 'build',
        name: 'Build',
        price: '$0',
        priceNote: 'per month',
        features: [
          '1,000 agent session minutes',
          '5 concurrent agent sessions, 1 agent deployment',
          '5,000 WebRTC minutes, 100 concurrent connections',
          '$2.50 inference credits',
          '50 GB downstream transfer',
          'Community support'
        ]
      },
      {
        id: 'ship',
        name: 'Ship',
        price: '$50',
        priceNote: 'per month, then usage',
        features: [
          '5,000 agent session minutes',
          '20 concurrent agent sessions, 2 agent deployments',
          '150,000 WebRTC minutes, 1,000 concurrent connections',
          '$5 inference credits, 20 custom voices',
          'Team collaboration and instant rollback',
          'Email support'
        ]
      },
      {
        id: 'scale',
        name: 'Scale',
        price: '$500',
        priceNote: 'per month, then usage',
        features: [
          '50,000 agent session minutes',
          'Up to 600 concurrent agent sessions',
          '1.5M WebRTC minutes, 5,000 concurrent connections',
          '$50 inference credits with discounted model prices',
          'Role-based access, region pinning, private links',
          'Security reports and HIPAA'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Everything in Scale',
          'Volume pricing, including inference',
          'SSO and support SLA',
          'Shared Slack channel'
        ]
      }
    ]
  },
  openai: {
    kind: 'usage',
    pricingUrl: 'https://platform.openai.com/docs/guides/rate-limits',
    capabilities: openaiCapabilities,
    asOf,
    fallbackPlanId: 'build',
    pricingNote:
      'Billed per token on prepaid credits. The usage tier upgrades automatically as total credit purchases grow, raising rate limits and the monthly usage cap.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'allowed geographies',
        features: ['$100 monthly usage limit', 'Lowest rate limits']
      },
      {
        id: 'build',
        name: 'Build',
        price: '$5',
        priceNote: 'total credit purchases',
        features: [
          '$500 monthly usage limit',
          'Astra, Sol, Terra: 5,000 RPM, 1M TPM',
          'Luna: 5,000 RPM, 2M TPM'
        ]
      },
      {
        id: 'launch',
        name: 'Launch',
        price: '$100',
        priceNote: 'total credit purchases',
        features: [
          '$5,000 monthly usage limit',
          'Astra, Sol, Terra: 10,000 RPM, 4M TPM',
          'Luna: 10,000 RPM, 10M TPM'
        ]
      },
      {
        id: 'grow',
        name: 'Grow',
        price: '$500',
        priceNote: 'total credit purchases',
        features: [
          '$200,000 monthly usage limit',
          'Astra, Sol, Terra: 15,000 RPM, 40M TPM',
          'Luna: 30,000 RPM, 180M TPM'
        ]
      }
    ]
  },
  deepgram: {
    kind: 'subscription',
    pricingUrl: 'https://deepgram.com/pricing',
    capabilities: deepgramCapabilities,
    asOf,
    fallbackPlanId: 'payg',
    plans: [
      {
        id: 'payg',
        name: 'Pay As You Go',
        price: '$0',
        priceNote: '$200 free credit, then usage',
        features: [
          'All public model endpoints',
          'Nova-3 streaming from $0.0048/min',
          'Up to 50 REST and 150 WebSocket STT concurrency',
          'Up to 45 TTS and Voice Agent concurrency',
          'Community and Discord support'
        ]
      },
      {
        id: 'growth',
        name: 'Growth',
        price: '$4K+',
        priceNote: 'prepaid per year',
        features: [
          'Up to 20% lower per-minute rates',
          'Nova-3 streaming from $0.0042/min',
          'Up to 225 WebSocket STT concurrency',
          'Up to 60 TTS and Voice Agent concurrency'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Large-volume pricing',
          'Custom models and deployment options',
          'HIPAA BAAs',
          'Dedicated support'
        ]
      }
    ]
  },
  elevenlabs: {
    kind: 'subscription',
    pricingUrl: 'https://elevenlabs.io/pricing',
    capabilities: elevenlabsCapabilities,
    asOf,
    fallbackPlanId: 'free',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'per month',
        features: [
          '10k credits per month',
          'Text to Speech, Speech to Text, Sound Effects',
          'Voice Design and Music',
          '2 concurrent requests'
        ]
      },
      {
        id: 'starter',
        name: 'Starter',
        price: '$6',
        priceNote: 'per month',
        features: [
          '30k credits per month',
          'Commercial license',
          'Instant Voice Cloning',
          'Dubbing Studio',
          '3 concurrent requests'
        ]
      },
      {
        id: 'creator',
        name: 'Creator',
        price: '$22',
        priceNote: 'per month',
        features: [
          '121k credits per month',
          'Professional Voice Cloning',
          'Additional credits on demand',
          '5 concurrent requests'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$99',
        priceNote: 'per month',
        features: [
          '600k credits per month',
          '44.1kHz PCM output via API',
          '192kbps audio quality',
          '10 concurrent requests'
        ]
      },
      {
        id: 'scale',
        name: 'Scale',
        price: '$299',
        priceNote: 'per month',
        features: [
          '1.8M credits per month',
          '3 workspace seats and team collaboration',
          '3 Professional Voice Clones',
          '15 concurrent requests'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        price: '$990',
        priceNote: 'per month',
        features: [
          '6M credits per month',
          'Low-latency TTS as low as 5c/minute',
          '10 workspace seats, 10 Professional Voice Clones',
          '25 concurrent requests'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Custom DPA and SLAs',
          'HIPAA BAAs and custom SSO',
          'Elevated concurrency',
          'Priority support'
        ]
      }
    ]
  },
  resend: {
    kind: 'subscription',
    pricingUrl: 'https://resend.com/pricing',
    capabilities: resendCapabilities,
    asOf,
    fallbackPlanId: 'free',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'per month',
        features: [
          '3,000 emails per month, 100 per day',
          '3 domains',
          '30-day data retention',
          'Ticket support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$20',
        priceNote: 'per month',
        features: [
          '50,000 emails per month',
          'No daily limit, 10 domains',
          '5 webhook endpoints',
          '$0.90 per 1,000 extra emails'
        ]
      },
      {
        id: 'scale',
        name: 'Scale',
        price: '$90',
        priceNote: 'per month',
        features: [
          '100,000 emails per month',
          '1,000 domains, 10 webhook endpoints',
          'Dedicated Slack channel',
          'Dedicated IP and SSO add-ons'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Custom volume, 3M+ emails per month',
          '99.99% uptime SLA',
          'Dedicated CSM and SSO',
          'Enterprise rate limits'
        ]
      }
    ]
  },
  openrouter: {
    kind: 'usage',
    pricingUrl: 'https://openrouter.ai/pricing',
    capabilities: openrouterCapabilities,
    asOf,
    fallbackPlanId: 'standard',
    pricingNote:
      'Model usage is billed at provider list prices from prepaid credits, plus a platform fee on credit purchases.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        features: ['25+ free models from 4 providers', '50 requests per day', 'Community support']
      },
      {
        id: 'standard',
        name: 'Standard',
        price: '5.5%',
        priceNote: 'platform fee',
        features: [
          '500+ models from 80+ providers',
          'Provider passthrough rate limits',
          'Auto-routing, budgets and prompt caching',
          'Email support'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        price: '8%',
        priceNote: 'platform fee',
        features: [
          'Everything in Standard',
          'EU and US in-region routing',
          'Advanced notifications',
          '1,000 workspaces'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Fee discounts',
          'SSO/SAML and contractual SLAs',
          'Invoicing options',
          'Dedicated support team'
        ]
      }
    ]
  },
  gemini: {
    kind: 'usage',
    pricingUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
    capabilities: geminiCapabilities,
    asOf,
    fallbackPlanId: 'free',
    pricingNote:
      'Billed per token through the linked Google Cloud billing account. The project tier upgrades automatically with cumulative spend, raising rate limits.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceNote: 'active project',
        features: [
          'Lowest rate limits',
          'No spend limit applies',
          'Prompts may be used to improve products'
        ]
      },
      {
        id: 'tier1',
        name: 'Tier 1',
        price: 'Billing linked',
        features: ['$250 billing tier cap', '$10 spend limit per 10 minutes', 'Higher rate limits']
      },
      {
        id: 'tier2',
        name: 'Tier 2',
        price: '$100 paid',
        priceNote: '+3 days',
        features: [
          '$2,000 billing tier cap',
          '$50 spend limit per 10 minutes',
          'Larger batch queues'
        ]
      },
      {
        id: 'tier3',
        name: 'Tier 3',
        price: '$1,000 paid',
        priceNote: '+30 days',
        features: [
          '$20,000 - $100,000+ billing tier cap',
          '$200 spend limit per 10 minutes',
          'Highest rate limits'
        ]
      }
    ]
  },
  langgraph: {
    kind: 'subscription',
    pricingUrl: 'https://www.langchain.com/pricing',
    capabilities: langsmithCapabilities,
    asOf,
    fallbackPlanId: 'developer',
    plans: [
      {
        id: 'developer',
        name: 'Developer',
        price: '$0',
        priceNote: 'per seat, then usage',
        features: [
          '1 seat',
          '5k base traces per month',
          '7 LSU Fleet allowance',
          'Community support'
        ]
      },
      {
        id: 'plus',
        name: 'Plus',
        price: '$39',
        priceNote: 'per seat per month, then usage',
        features: [
          'Unlimited seats',
          '10k base traces per month',
          '1 free serverless deployment',
          'Deployment, Engine and Fleet (37 LSU)'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Self-hosted and hybrid deployment',
          'Custom SSO, ABAC and RBAC',
          'Support SLA',
          'Custom seats and workspaces'
        ]
      }
    ]
  },
  vercel: {
    kind: 'subscription',
    pricingUrl: 'https://vercel.com/pricing',
    capabilities: vercelCapabilities,
    asOf,
    fallbackPlanId: 'hobby',
    plans: [
      {
        id: 'hobby',
        name: 'Hobby',
        price: '$0',
        priceNote: 'per month',
        features: [
          '50K Web Analytics events per month',
          '10K Speed Insights events',
          '1M CDN requests, 100 GB transfer',
          '1 developer seat, non-commercial use'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: '$20',
        priceNote: 'per developer seat per month',
        features: [
          'Web Analytics at $3 per 100K events',
          'Web Analytics Plus add-on with UTM and 24 months',
          '10M CDN requests, 1 TB transfer',
          'Unlimited viewer seats, team-level RBAC'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Web Analytics Plus included',
          'Team and project-level RBAC',
          'Platform SLAs',
          'Dedicated support'
        ]
      }
    ]
  },
  sentry: {
    kind: 'subscription',
    pricingUrl: 'https://sentry.io/pricing/',
    capabilities: sentryCapabilities,
    asOf,
    fallbackPlanId: 'developer',
    plans: [
      {
        id: 'developer',
        name: 'Developer',
        price: '$0',
        priceNote: 'per month',
        features: [
          'One user',
          'Error monitoring and tracing',
          'Email alerts',
          '10 custom dashboards, 30-day lookback'
        ]
      },
      {
        id: 'team',
        name: 'Team',
        price: '$26',
        priceNote: 'per month, billed annually',
        features: [
          'Unlimited users',
          '50K errors, 5M spans, 50 replays',
          'API and third-party integrations',
          '20 custom dashboards, up to 90-day lookback'
        ]
      },
      {
        id: 'business',
        name: 'Business',
        price: '$80',
        priceNote: 'per month, billed annually',
        features: [
          'Unlimited custom dashboards',
          'Advanced quota management',
          'SAML and SCIM support',
          'Extended sampled retention'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Everything in Business',
          'Technical account manager',
          'Dedicated customer support'
        ]
      }
    ]
  }
};
