import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  turbopack: {
    // Parent dir so linked ../dot-science-ai/packages resolve.
    root: path.resolve(__dirname, '..')
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: ''
      }
    ]
  },
  transpilePackages: ['geist', '@hermescnp/supabase', '@hermescnp/auth', '@hermescnp/workspace-sdk'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  }
};

export default nextConfig;
