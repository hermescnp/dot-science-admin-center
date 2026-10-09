import { createHmac } from 'node:crypto';
import type { ServiceHealth } from '../api/types';

const TIMEOUT_MS = 5000;
const DEGRADED_LATENCY_MS = 2000;

interface CheckRequest {
  url: string;
  init?: RequestInit;
}

type CheckDefinition = {
  id: string;
  env: string[];
  request: (env: Record<string, string>) => CheckRequest;
};

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url');
}

export function signLiveKitToken(apiKey: string, apiSecret: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(
    JSON.stringify({ iss: apiKey, nbf: now, exp: now + 60, video: { roomList: true } })
  );
  const signature = createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${base64Url(signature)}`;
}

const checks: CheckDefinition[] = [
  {
    id: 'supabase',
    env: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
    request: (env) => ({
      url: `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
      init: { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } }
    })
  },
  {
    id: 'livekit',
    env: ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
    request: (env) => ({
      url: `${env.LIVEKIT_URL.replace(/^ws/, 'http')}/twirp/livekit.RoomService/ListRooms`,
      init: {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${signLiveKitToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET)}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      }
    })
  },
  {
    id: 'openai',
    env: ['OPENAI_API_KEY'],
    request: (env) => ({
      url: 'https://api.openai.com/v1/models',
      init: { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } }
    })
  },
  {
    id: 'deepgram',
    env: ['DEEPGRAM_API_KEY'],
    request: (env) => ({
      url: 'https://api.deepgram.com/v1/projects',
      init: { headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` } }
    })
  },
  {
    id: 'elevenlabs',
    env: ['ELEVENLABS_API_KEY'],
    request: (env) => ({
      url: 'https://api.elevenlabs.io/v1/user',
      init: { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } }
    })
  },
  {
    id: 'resend',
    env: ['RESEND_API_KEY'],
    request: (env) => ({
      url: 'https://api.resend.com/domains',
      init: { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } }
    })
  },
  {
    id: 'openrouter',
    env: ['OPENROUTER_KEY'],
    request: (env) => ({
      url: 'https://openrouter.ai/api/v1/key',
      init: { headers: { Authorization: `Bearer ${env.OPENROUTER_KEY}` } }
    })
  },
  {
    id: 'gemini',
    env: ['GEMINI_API_KEY'],
    request: (env) => ({
      url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      init: { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } }
    })
  },
  {
    id: 'langgraph',
    env: ['LANGSMITH_API_KEY'],
    request: (env) => ({
      url: 'https://api.smith.langchain.com/api/v1/sessions?limit=1',
      init: { headers: { 'x-api-key': env.LANGSMITH_API_KEY } }
    })
  },
  {
    id: 'vercel',
    env: ['VERCEL_TOKEN'],
    request: (env) => ({
      url: 'https://api.vercel.com/v2/user',
      init: { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` } }
    })
  },
  {
    id: 'sentry',
    env: ['SENTRY_AUTH_TOKEN', 'NEXT_PUBLIC_SENTRY_ORG', 'NEXT_PUBLIC_SENTRY_PROJECT'],
    request: (env) => ({
      url: `https://sentry.io/api/0/projects/${env.NEXT_PUBLIC_SENTRY_ORG}/${env.NEXT_PUBLIC_SENTRY_PROJECT}/`,
      init: { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } }
    })
  }
];

function describeStatus(status: number) {
  if (status === 401 || status === 403) return 'Invalid or unauthorized credentials';
  if (status === 404) return 'Resource not found';
  if (status === 429) return 'Rate limited';
  if (status >= 500) return `Service error (${status})`;
  return `Unexpected response (${status})`;
}

async function runCheck(check: CheckDefinition): Promise<ServiceHealth> {
  const checkedAt = new Date().toISOString();
  const env: Record<string, string> = {};
  for (const name of check.env) {
    const value = process.env[name]?.trim();
    if (!value) {
      return {
        id: check.id,
        state: 'unconfigured',
        latencyMs: null,
        checkedAt,
        message: `Missing ${name}`
      };
    }
    env[name] = value;
  }

  const { url, init } = check.request(env);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    if (response.ok) {
      const slow = latencyMs > DEGRADED_LATENCY_MS;
      return {
        id: check.id,
        state: slow ? 'degraded' : 'operational',
        latencyMs,
        checkedAt,
        message: slow ? 'Slow response' : undefined
      };
    }
    return {
      id: check.id,
      state: response.status === 429 ? 'degraded' : 'down',
      latencyMs,
      checkedAt,
      message: describeStatus(response.status)
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      id: check.id,
      state: 'down',
      latencyMs: null,
      checkedAt,
      message: timedOut ? `No response after ${TIMEOUT_MS / 1000}s` : 'Network error'
    };
  }
}

export function checkServiceHealth(): Promise<ServiceHealth[]> {
  return Promise.all(checks.map(runCheck));
}
