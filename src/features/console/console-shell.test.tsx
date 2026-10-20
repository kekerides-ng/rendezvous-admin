import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsoleShell } from './console-shell';

const { get, replace } = vi.hoisted(() => ({ get: vi.fn(), replace: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { GET: get, POST: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/users' }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ConsoleShell>
        <p>Protected users</p>
      </ConsoleShell>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  replace.mockReset();
});

describe('console session boundary', () => {
  it('redirects unauthenticated visitors without rendering protected children', async () => {
    get.mockResolvedValue({ response: { status: 401, ok: false } });
    mount();
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Protected users')).not.toBeInTheDocument();
  });
  it('shows a retryable service failure without redirecting', async () => {
    get.mockResolvedValue({
      response: { status: 502, ok: false },
      error: { message: 'API unavailable' },
    });
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
  it('renders navigation and children for a signed-in admin', async () => {
    get.mockResolvedValue({
      response: { status: 200, ok: true },
      data: { role: 'admin', email: 'admin@example.test' },
    });
    mount();
    expect(await screen.findByText('Protected users')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });
});
