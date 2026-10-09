'use client';

// Import from the `/client` entry, not the package barrel: the barrel also exports
// server handlers that pull `next/server` into the client graph (breaks Turbopack).
export { AuthProvider, useAuth } from '@hermescnp/auth/client';
