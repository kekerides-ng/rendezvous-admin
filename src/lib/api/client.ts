import createClient from 'openapi-fetch';

import type { paths } from './schema';

/**
 * The only thing in this app that talks to the API (CLAUDE.md rule 1).
 *
 * `baseUrl: '/api'` — **this app's own route handlers**, not the backend.
 * Going direct would make the session a third-party cookie and Safari would
 * drop it (architecture.md §2). Same-origin also means `credentials: 'include'`
 * is doing nothing exotic: the browser sends the cookie because it is ours.
 */
export const api = createClient<paths>({
  baseUrl: '/api',
  credentials: 'include',
});

// Every protected request shares the same expiry behavior, including mutations.
api.use({
  onResponse({ response }) {
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login'
    ) {
      window.location.replace('/login');
    }
  },
});
