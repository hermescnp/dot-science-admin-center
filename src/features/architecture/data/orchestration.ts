export const ORCHESTRATOR_ID = 'gp-document-agent';

export interface OrchestrationTarget {
  nodeId: string;
  graphNode: string;
  when: string;
}

export interface OrchestrationRule {
  next: string;
  condition: string;
  phase: string;
  targets: OrchestrationTarget[];
  parallel?: boolean;
  note?: string;
}

export const orchestrationEntry: OrchestrationTarget = {
  nodeId: 'gp-router',
  graphNode: 'routeUserRequests',
  when: 'START'
};

// Mirrors resolveOrchestratorNext in golden-papers-ai: rules are checked in order, first match wins.
export const orchestrationRules: OrchestrationRule[] = [
  {
    next: 'end',
    condition: 'phase === "failed" || error',
    phase: 'failed',
    targets: [],
    note: 'Any step can fail the run'
  },
  {
    next: 'clarificationGate',
    condition: 'router.requiresClarification && !clarificationAnswers',
    phase: 'awaiting_clarification',
    targets: [
      { nodeId: 'gp-clarification', graphNode: 'clarificationGate', when: 'requiresClarification' }
    ]
  },
  {
    next: 'research',
    condition: 'router.requiresResearch && !researchFindings',
    phase: 'researching',
    targets: [{ nodeId: 'gp-research', graphNode: 'research', when: 'requiresResearch' }]
  },
  {
    next: 'end',
    condition: 'mergedRoutes.length === 0',
    phase: 'done',
    targets: [],
    note: 'Replies with the router summary'
  },
  {
    next: 'contextProvider',
    condition: 'routeBlockSelections.length === 0',
    phase: 'selecting_blocks',
    targets: [{ nodeId: 'gp-context', graphNode: 'contextProvider', when: '!routeBlockSelections' }]
  },
  {
    next: 'planner',
    condition: '!executionPlan',
    phase: 'planning_tasks',
    targets: [{ nodeId: 'gp-planner', graphNode: 'planner', when: '!executionPlan' }],
    note: 'Skipped for a single route: the plan is built and auto-approved'
  },
  {
    next: 'planApprovalGate',
    condition: '!allTasksReviewed(executionPlan)',
    phase: 'awaiting_plan_approval',
    targets: [
      { nodeId: 'gp-plan-approval', graphNode: 'planApprovalGate', when: 'tasks unreviewed' }
    ]
  },
  {
    next: 'dispatchExecutors',
    condition: 'approvedTasks.some(notCompleted)',
    phase: 'executing_routes',
    parallel: true,
    targets: [
      { nodeId: 'gp-answer-executor', graphNode: 'executeRoute', when: 'Send · answer_question' },
      { nodeId: 'gp-tool-executor', graphNode: 'executeRoute', when: 'Send · other intents' }
    ],
    note: 'One Send per approved task, run in parallel'
  },
  {
    next: 'presentResults',
    condition: 'routeResults.some(awaiting_review)',
    phase: 'reviewing_results',
    targets: [{ nodeId: 'gp-review', graphNode: 'presentResults', when: 'awaiting_review' }],
    note: 'Loops on itself until every result is reviewed, then ends'
  },
  {
    next: 'end',
    condition: 'otherwise',
    phase: 'done',
    targets: [],
    note: 'Replies with task and result summaries'
  }
];

export const orchestrationTargets: OrchestrationTarget[] = [
  orchestrationEntry,
  ...orchestrationRules.flatMap((rule) => rule.targets)
];

// Fields from pickRouteExecutionState that every Send carries to its executor.
export const executionStateFields = [
  'currentRoute',
  'currentTask',
  'sections',
  'stages',
  'templates',
  'branding',
  'coverPage',
  'aboutDocument',
  'sharedExecutionContext',
  'clarificationAnswers',
  'researchFindings',
  'routeBlockSelections',
  'executionPlan',
  'mergedRoutes'
];
