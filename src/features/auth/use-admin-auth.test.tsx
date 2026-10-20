import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ME_KEY, useLogout, useMe } from './use-admin-auth';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { GET: get, POST: post } }));

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { client, Wrapper };
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('admin session handling', () => {
  it('clears all protected queries and mutation data after logout', async () => {
    const { client, Wrapper } = setup();
    client.setQueryData(ME_KEY, { role: 'admin' });
    client.setQueryData(['admin', 'users'], { items: ['private data'] });
    post.mockResolvedValue({ response: { ok: true, status: 204 } });
    const { result } = renderHook(useLogout, { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(client.getQueryData(ME_KEY)).toBeNull();
    expect(client.getQueryData(['admin', 'users'])).toBeUndefined();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });

  it('treats an already-expired logout session as signed out', async () => {
    const { client, Wrapper } = setup();
    client.setQueryData(['admin', 'users'], 'private data');
    post.mockResolvedValue({ response: { ok: false, status: 401 } });
    const { result } = renderHook(useLogout, { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync();
    });
    expect(client.getQueryData(ME_KEY)).toBeNull();
    expect(client.getQueryData(['admin', 'users'])).toBeUndefined();
  });

  it('keeps the session and exposes the error when logout fails', async () => {
    const { client, Wrapper } = setup();
    client.setQueryData(ME_KEY, { role: 'admin' });
    post.mockResolvedValue({ response: { ok: false, status: 502 } });
    const { result } = renderHook(useLogout, { wrapper: Wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow('Sign out failed');
    });
    expect(client.getQueryData(ME_KEY)).toEqual({ role: 'admin' });
  });

  it('returns null only for an unauthenticated response', async () => {
    const { Wrapper } = setup();
    get.mockResolvedValue({ response: { ok: false, status: 401 } });
    const { result } = renderHook(useMe, { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
  });

  it('retains service errors instead of presenting them as logout', async () => {
    const { Wrapper } = setup();
    get.mockResolvedValue({
      response: { ok: false, status: 502 },
      error: { message: 'Service unavailable' },
    });
    const { result } = renderHook(useMe, { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error?.message).toBe('Service unavailable');
    expect(result.current.data).not.toBeNull();
  });
});
