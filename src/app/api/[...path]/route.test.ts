// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from './route';

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin API proxy', () => {
  it('preserves pagination, filters and the first-party cookie', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      }),
    );
    vi.stubGlobal('fetch', upstream);
    const response = await GET(
      new NextRequest('http://localhost:3001/api/admin/users?page=2&status=suspended', {
        headers: { cookie: 'rdv_admin_session=test-session' },
      }),
      context(['admin', 'users']),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/admin/users');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('status')).toBe('suspended');
    expect(new Headers(init.headers).get('cookie')).toBe('rdv_admin_session=test-session');
    expect(init.cache).toBe('no-store');
  });

  it('forwards a suspend reason and returns permission errors intact', async () => {
    const upstream = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'FORBIDDEN', message: 'Not allowed.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', upstream);
    const response = await POST(
      new NextRequest('http://localhost:3001/api/admin/users/user-id/suspend', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: 'rdv_admin_session=moderator' },
        body: JSON.stringify({ reason: 'Safety review' }),
      }),
      context(['admin', 'users', 'user-id', 'suspend']),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: 'FORBIDDEN', message: 'Not allowed.' });
    const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/admin/users/user-id/suspend');
    expect(init.method).toBe('POST');
    expect(await new Response(init.body).json()).toEqual({ reason: 'Safety review' });
  });

  it('keeps revealed-phone responses uncached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ phone: '+2348012345678' }), {
          headers: { 'cache-control': 'no-store' },
        }),
      ),
    );
    const response = await POST(
      new NextRequest('http://localhost:3001/api/admin/users/user-id/reveal-phone', {
        method: 'POST',
      }),
      context(['admin', 'users', 'user-id', 'reveal-phone']),
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ phone: '+2348012345678' });
  });

  it('maps session cookies to the browser API path and preserves separate headers', async () => {
    const headers = new Headers();
    headers.append(
      'set-cookie',
      'rdv_admin_session=test-session; Path=/admin; Expires=Wed, 21 Oct 2026 10:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
    );
    headers.append('set-cookie', 'other=value; Path=/; HttpOnly');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { headers })));
    const response = await POST(
      new NextRequest('http://localhost:3001/api/admin/auth/totp', { method: 'POST' }),
      context(['admin', 'auth', 'totp']),
    );
    expect(response.headers.getSetCookie()).toEqual([
      'rdv_admin_session=test-session; Path=/api/admin; Expires=Wed, 21 Oct 2026 10:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
      'other=value; Path=/; HttpOnly',
    ]);
  });

  it('maps logout deletion to the same cookie path used at sign-in', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, {
            status: 204,
            headers: {
              'set-cookie':
                'rdv_admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
            },
          }),
        ),
    );
    const response = await POST(
      new NextRequest('http://localhost:3001/api/admin/auth/logout', { method: 'POST' }),
      context(['admin', 'auth', 'logout']),
    );
    expect(response.headers.getSetCookie()).toEqual([
      'rdv_admin_session=; Path=/api/admin; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);
  });

  it('returns a retryable upstream failure when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('unreachable')));
    const response = await GET(
      new NextRequest('http://localhost:3001/api/admin/users'),
      context(['admin', 'users']),
    );
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});
