import type { ServicePlanStatus } from '../api/types';
import { servicePlans } from '../data/service-plans';
import { signLiveKitToken } from './health-checks';

const TIMEOUT_MS = 5000;

type Env = Record<string, string>;
type Usage = Record<string, string>;

interface Probe<T> {
  env: string[];
  run: (env: Env) => Promise<T>;
}

interface ServiceProbes {
  plan?: Probe<string | null>;
  usage?: Probe<Usage>;
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>,
  init: RequestInit = {}
): Promise<T | null> {
  const response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

function matchPlan(serviceId: string, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.toLowerCase();
  const plans = servicePlans[serviceId]?.plans ?? [];
  return plans.find((plan) => value.includes(plan.id))?.id ?? null;
}

const numberFormat = new Intl.NumberFormat('en-US');
const currencyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatNumber(value: number) {
  return numberFormat.format(Math.round(value));
}

function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Runs independent lookups so one failing endpoint doesn't hide the others. */
async function collect(entries: [string, () => Promise<string | null | undefined>][]) {
  const results = await Promise.allSettled(entries.map(([, load]) => load()));
  const usage: Usage = {};
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) usage[entries[index][0]] = result.value;
  });
  return usage;
}

async function deepgramProject(headers: Record<string, string>) {
  const projects = await fetchJson<{ projects?: { project_id: string }[] }>(
    'https://api.deepgram.com/v1/projects',
    headers
  );
  return projects?.projects?.[0]?.project_id ?? null;
}

async function vercelTeam(headers: Record<string, string>) {
  const account = await fetchJson<{
    user?: { defaultTeamId?: string | null; billing?: { plan?: string } | null };
  }>('https://api.vercel.com/v2/user', headers);
  return account?.user ?? null;
}

const probes: Record<string, ServiceProbes> = {
  supabase: {
    plan: {
      env: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_ORG_SLUG'],
      run: async (env) => {
        const org = await fetchJson<{ plan?: string }>(
          `https://api.supabase.com/v1/organizations/${env.SUPABASE_ORG_SLUG}`,
          { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` }
        );
        return matchPlan('supabase', org?.plan);
      }
    },
    usage: {
      env: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_ORG_SLUG', 'NEXT_PUBLIC_SUPABASE_URL'],
      run: async (env) => {
        const headers = {
          Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        };
        const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
        const query = fetchJson<{ db: number; storage: number; mau: number }[]>(
          `https://api.supabase.com/v1/projects/${ref}/database/query`,
          headers,
          {
            method: 'POST',
            body: JSON.stringify({
              query: `select pg_database_size(current_database())::bigint as db,
                (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects)::bigint as storage,
                (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days')::bigint as mau`
            })
          }
        ).then((rows) => rows?.[0] ?? null);
        const fromRow =
          (pick: (row: { db: number; storage: number; mau: number }) => string) => async () => {
            const row = await query;
            return row ? pick(row) : null;
          };
        return collect([
          ['databaseSize', fromRow((row) => formatBytes(Number(row.db)))],
          ['storage', fromRow((row) => formatBytes(Number(row.storage)))],
          ['mau', fromRow((row) => formatNumber(Number(row.mau)))],
          [
            'projects',
            async () => {
              const projects = await fetchJson<
                { status?: string; organization_slug?: string; organization_id?: string }[]
              >('https://api.supabase.com/v1/projects', headers);
              if (!projects) return null;
              const active = projects.filter(
                (project) =>
                  project.status?.startsWith('ACTIVE') &&
                  (project.organization_slug ??
                    project.organization_id ??
                    env.SUPABASE_ORG_SLUG) === env.SUPABASE_ORG_SLUG
              );
              return `${active.length} active`;
            }
          ],
          [
            'members',
            async () => {
              const members = await fetchJson<unknown[]>(
                `https://api.supabase.com/v1/organizations/${env.SUPABASE_ORG_SLUG}/members`,
                headers
              );
              return members ? formatNumber(members.length) : null;
            }
          ]
        ]);
      }
    }
  },
  livekit: {
    usage: {
      env: ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
      run: (env) =>
        collect([
          [
            'concurrentConnections',
            async () => {
              const result = await fetchJson<{ rooms?: { num_participants?: number }[] }>(
                `${env.LIVEKIT_URL.replace(/^ws/, 'http')}/twirp/livekit.RoomService/ListRooms`,
                {
                  Authorization: `Bearer ${signLiveKitToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET)}`,
                  'Content-Type': 'application/json'
                },
                { method: 'POST', body: '{}' }
              );
              if (!result) return null;
              const rooms = result.rooms ?? [];
              const participants = rooms.reduce(
                (sum, room) => sum + (room.num_participants ?? 0),
                0
              );
              return `${formatNumber(participants)} live (${rooms.length} rooms)`;
            }
          ]
        ])
    }
  },
  openai: {
    usage: {
      env: ['OPENAI_ADMIN_KEY'],
      run: (env) =>
        collect([
          [
            'usageLimit',
            async () => {
              const start = Math.floor(startOfMonth().getTime() / 1000);
              const costs = await fetchJson<{
                data?: { results?: { amount?: { value?: number } }[] }[];
              }>(`https://api.openai.com/v1/organization/costs?start_time=${start}&limit=31`, {
                Authorization: `Bearer ${env.OPENAI_ADMIN_KEY}`
              });
              if (!costs) return null;
              const total = (costs.data ?? [])
                .flatMap((bucket) => bucket.results ?? [])
                .reduce((sum, result) => sum + (result.amount?.value ?? 0), 0);
              return `${currencyFormat.format(total)} this month`;
            }
          ]
        ])
    }
  },
  deepgram: {
    plan: {
      env: ['DEEPGRAM_API_KEY'],
      run: async (env) => {
        const headers = { Authorization: `Token ${env.DEEPGRAM_API_KEY}` };
        const projectId = await deepgramProject(headers);
        if (!projectId) return null;
        const balances = await fetchJson<{ balances?: { amount: number }[] }>(
          `https://api.deepgram.com/v1/projects/${projectId}/balances`,
          headers
        );
        return balances?.balances?.some((balance) => balance.amount > 0) ? 'payg' : null;
      }
    },
    usage: {
      env: ['DEEPGRAM_API_KEY'],
      run: async (env) => {
        const headers = { Authorization: `Token ${env.DEEPGRAM_API_KEY}` };
        const projectId = await deepgramProject(headers);
        if (!projectId) return {};
        const base = `https://api.deepgram.com/v1/projects/${projectId}`;
        return collect([
          [
            'credit',
            async () => {
              const balances = await fetchJson<{ balances?: { amount: number }[] }>(
                `${base}/balances`,
                headers
              );
              if (!balances?.balances) return null;
              const remaining = balances.balances.reduce((sum, b) => sum + b.amount, 0);
              return `${currencyFormat.format(remaining)} remaining`;
            }
          ],
          [
            'audioProcessed',
            async () => {
              const start = startOfMonth().toISOString().slice(0, 10);
              const end = new Date().toISOString().slice(0, 10);
              const usage = await fetchJson<{
                results?: { hours?: number; total_hours?: number; requests?: number }[];
              }>(`${base}/usage?start=${start}&end=${end}`, headers);
              if (!usage?.results) return null;
              const hours = usage.results.reduce(
                (sum, r) => sum + (r.total_hours ?? r.hours ?? 0),
                0
              );
              const requests = usage.results.reduce((sum, r) => sum + (r.requests ?? 0), 0);
              return `${hours.toFixed(1)} h · ${formatNumber(requests)} requests this month`;
            }
          ]
        ]);
      }
    }
  },
  elevenlabs: {
    plan: {
      env: ['ELEVENLABS_API_KEY'],
      run: async (env) => {
        const subscription = await fetchJson<{ tier?: string }>(
          'https://api.elevenlabs.io/v1/user/subscription',
          { 'xi-api-key': env.ELEVENLABS_API_KEY }
        );
        return matchPlan('elevenlabs', subscription?.tier);
      }
    },
    usage: {
      env: ['ELEVENLABS_API_KEY'],
      run: async (env) => {
        const subscription = await fetchJson<{
          character_count?: number;
          character_limit?: number;
          voice_slots_used?: number;
          voice_limit?: number;
          professional_voice_slots_used?: number;
          professional_voice_limit?: number;
        }>('https://api.elevenlabs.io/v1/user/subscription', {
          'xi-api-key': env.ELEVENLABS_API_KEY
        });
        if (!subscription) throw new Error('Subscription unavailable');
        const usage: Usage = {};
        if (subscription.character_count !== undefined) {
          usage.credits = `${formatNumber(subscription.character_count)} of ${formatNumber(
            subscription.character_limit ?? 0
          )}`;
        }
        if (subscription.voice_slots_used !== undefined) {
          usage.voiceSlots = `${formatNumber(subscription.voice_slots_used)} of ${formatNumber(
            subscription.voice_limit ?? 0
          )}`;
        }
        if (subscription.professional_voice_slots_used !== undefined) {
          usage.pvc = `${formatNumber(subscription.professional_voice_slots_used)} of ${formatNumber(
            subscription.professional_voice_limit ?? 0
          )}`;
        }
        return usage;
      }
    }
  },
  resend: {
    usage: {
      env: ['RESEND_API_KEY'],
      run: (env) =>
        collect([
          [
            'domains',
            async () => {
              const domains = await fetchJson<{ data?: unknown[] }>(
                'https://api.resend.com/domains',
                { Authorization: `Bearer ${env.RESEND_API_KEY}` }
              );
              return domains?.data ? formatNumber(domains.data.length) : null;
            }
          ]
        ])
    }
  },
  openrouter: {
    plan: {
      env: ['OPENROUTER_KEY'],
      run: async (env) => {
        const key = await fetchJson<{ data?: { is_free_tier?: boolean } }>(
          'https://openrouter.ai/api/v1/key',
          { Authorization: `Bearer ${env.OPENROUTER_KEY}` }
        );
        if (key?.data?.is_free_tier === undefined) return null;
        return key.data.is_free_tier ? 'free' : 'standard';
      }
    },
    usage: {
      env: ['OPENROUTER_KEY'],
      run: (env) =>
        collect([
          [
            'credits',
            async () => {
              const headers = { Authorization: `Bearer ${env.OPENROUTER_KEY}` };
              const credits = await fetchJson<{
                data?: { total_credits?: number; total_usage?: number };
              }>('https://openrouter.ai/api/v1/credits', headers);
              if (credits?.data?.total_credits !== undefined) {
                const { total_credits: total, total_usage: used = 0 } = credits.data;
                return `${currencyFormat.format(used)} of ${currencyFormat.format(total)}`;
              }
              const key = await fetchJson<{ data?: { usage?: number; limit?: number | null } }>(
                'https://openrouter.ai/api/v1/key',
                headers
              );
              if (key?.data?.usage === undefined) return null;
              const limit = key.data.limit;
              return limit
                ? `${currencyFormat.format(key.data.usage)} of ${currencyFormat.format(limit)}`
                : `${currencyFormat.format(key.data.usage)} spent`;
            }
          ]
        ])
    }
  },
  vercel: {
    plan: {
      env: ['VERCEL_TOKEN'],
      run: async (env) => {
        const headers = { Authorization: `Bearer ${env.VERCEL_TOKEN}` };
        const user = await vercelTeam(headers);
        const teamId = user?.defaultTeamId;
        if (!teamId) return matchPlan('vercel', user?.billing?.plan);
        const team = await fetchJson<{ billing?: { plan?: string } | null }>(
          `https://api.vercel.com/v2/teams/${teamId}`,
          headers
        );
        return matchPlan('vercel', team?.billing?.plan);
      }
    },
    usage: {
      env: ['VERCEL_TOKEN'],
      run: async (env) => {
        const headers = { Authorization: `Bearer ${env.VERCEL_TOKEN}` };
        const user = await vercelTeam(headers);
        if (!user) throw new Error('Account unavailable');
        const teamId = user.defaultTeamId;
        const teamQuery = teamId ? `&teamId=${teamId}` : '';
        return collect([
          [
            'devSeats',
            async () => {
              if (!teamId) return '1';
              const members = await fetchJson<{ members?: unknown[] }>(
                `https://api.vercel.com/v2/teams/${teamId}/members?limit=100`,
                headers
              );
              return members?.members ? formatNumber(members.members.length) : null;
            }
          ],
          [
            'projects',
            async () => {
              const projects = await fetchJson<{
                projects?: unknown[];
                pagination?: { next?: number | null };
              }>(`https://api.vercel.com/v9/projects?limit=100${teamQuery}`, headers);
              if (!projects?.projects) return null;
              return `${formatNumber(projects.projects.length)}${projects.pagination?.next ? '+' : ''}`;
            }
          ]
        ]);
      }
    }
  },
  sentry: {
    plan: {
      env: ['SENTRY_AUTH_TOKEN', 'NEXT_PUBLIC_SENTRY_ORG'],
      run: async (env) => {
        const customer = await fetchJson<{ plan?: string; planDetails?: { name?: string } }>(
          `https://sentry.io/api/0/customers/${env.NEXT_PUBLIC_SENTRY_ORG}/`,
          { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` }
        );
        if (!customer) return null;
        const name = customer.planDetails?.name ?? customer.plan;
        return matchPlan('sentry', name) ?? (/_f$|free/i.test(name ?? '') ? 'developer' : null);
      }
    },
    usage: {
      env: ['SENTRY_AUTH_TOKEN', 'NEXT_PUBLIC_SENTRY_ORG'],
      run: async (env) => {
        const headers = { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` };
        const base = `https://sentry.io/api/0/organizations/${env.NEXT_PUBLIC_SENTRY_ORG}`;
        const stats = fetchJson<{
          groups?: { by?: { category?: string }; totals?: Record<string, number> }[];
        }>(
          `${base}/stats_v2/?field=sum(quantity)&groupBy=category&outcome=accepted&statsPeriod=30d`,
          headers
        );
        const total = async (category: string) => {
          const result = await stats;
          if (!result?.groups) return null;
          return result.groups
            .filter((group) => group.by?.category === category)
            .reduce((sum, group) => sum + (group.totals?.['sum(quantity)'] ?? 0), 0);
        };
        const count = (category: string) => async () => {
          const value = await total(category);
          return value === null ? null : `${formatNumber(value)} (30 days)`;
        };
        return collect([
          ['errors', count('error')],
          ['spans', count('span')],
          ['replays', count('replay')],
          [
            'attachments',
            async () => {
              const value = await total('attachment');
              return value === null ? null : `${formatBytes(value)} (30 days)`;
            }
          ],
          [
            'users',
            async () => {
              const members = await fetchJson<unknown[]>(`${base}/members/`, headers);
              return members ? formatNumber(members.length) : null;
            }
          ]
        ]);
      }
    }
  }
};

function readEnv(names: string[]): Env | null {
  const env: Env = {};
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (!value) return null;
    env[name] = value;
  }
  return env;
}

async function detectPlan(probe: Probe<string | null> | undefined) {
  const env = probe && readEnv(probe.env);
  if (!probe || !env) return null;
  try {
    return await probe.run(env);
  } catch {
    return null;
  }
}

async function collectUsage(
  probe: Probe<Usage> | undefined
): Promise<Pick<ServicePlanStatus, 'usage' | 'usageError'>> {
  if (!probe) return { usageError: 'Not exposed by the provider API' };
  const env = readEnv(probe.env);
  if (!env) return { usageError: 'Credentials not configured' };
  try {
    return { usage: await probe.run(env) };
  } catch {
    return { usageError: 'Provider API request failed' };
  }
}

async function probeService(id: string): Promise<ServicePlanStatus> {
  const [planId, usage] = await Promise.all([
    detectPlan(probes[id]?.plan),
    collectUsage(probes[id]?.usage)
  ]);
  return { id, planId, source: planId ? 'detected' : 'unavailable', ...usage };
}

export function detectServicePlans(): Promise<ServicePlanStatus[]> {
  return Promise.all(Object.keys(servicePlans).map(probeService));
}
