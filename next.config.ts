import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Next 16 writes its own AGENTS.md. CLAUDE.md is this repo's single source of
  // instructions; a second generated one would drift from it silently.
  agentRules: false,
  // The browser talks to this app; this app talks to the backend. Server-side
  // only, so no NEXT_PUBLIC_ prefix — the backend URL is never shipped to a
  // client (architecture.md §2).
  env: { API_URL: process.env.API_URL ?? 'http://localhost:4000' },
};

export default nextConfig;
