import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ME_KEY } from '@/features/auth/use-admin-auth';
import type { UserItem } from './use-users';
import { UsersScreen } from './users-screen';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { GET: get, POST: post } }));

const user: UserItem = {
  id: '019a0123-4567-7123-8123-123456789abc',
  maskedPhone: '•••• 5678',
  kycVerified: false,
  createdAt: '2026-10-20T10:00:00Z',
  lastLoginAt: null,
  disabledAt: null,
};
const ok = (data: unknown) => ({ data, response: { ok: true, status: 200 } });
const fail = (status: number, message: string) => ({
  error: { message },
  response: { ok: false, status },
});
const page = (items = [user], total = items.length) => ({ items, total, page: 1, pageSize: 25 });
function mount(role: 'admin' | 'moderator' = 'admin') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(ME_KEY, { id: 'admin', email: 'admin@example.test', role });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <UsersScreen />
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  get.mockReset().mockResolvedValue(ok(page()));
  post.mockReset().mockResolvedValue(ok({ ...user, disabledAt: '2026-10-20T11:00:00Z' }));
});

describe('users console', () => {
  it('loads real rows, masks phones and formats Lagos time', async () => {
    mount();
    expect(await screen.findByText(user.id)).toBeInTheDocument();
    expect(screen.getByText('•••• 5678')).toBeInTheDocument();
    expect(screen.queryByText('+2348012345678')).not.toBeInTheDocument();
    expect(screen.getByText(/20 Oct 2026, 11:00/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(
      '/admin/users',
      expect.objectContaining({
        params: {
          query: { page: 1, pageSize: 25, status: 'all', sort: 'createdAt', direction: 'desc' },
        },
      }),
    );
  });

  it('shows a loading state', () => {
    get.mockReturnValue(new Promise(() => undefined));
    mount();
    expect(screen.getByText('Loading users…')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    get.mockResolvedValue(ok(page([])));
    mount();
    expect(await screen.findByText('No users match this page and filter.')).toBeInTheDocument();
  });

  it('shows errors and retries', async () => {
    get.mockResolvedValueOnce(fail(502, 'API unavailable'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(user.id)).toBeInTheDocument();
  });

  it('sends filters, sorting and pagination to the server', async () => {
    get.mockResolvedValue(ok(page([user], 100)));
    mount();
    await screen.findByText(user.id);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(get).toHaveBeenLastCalledWith('/admin/users', {
        params: { query: expect.objectContaining({ page: 2 }) },
      });
    });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'suspended');
    await waitFor(() => {
      expect(get).toHaveBeenLastCalledWith('/admin/users', {
        params: { query: expect.objectContaining({ page: 1, status: 'suspended' }) },
      });
    });
    await userEvent.click(screen.getByRole('button', { name: 'Last sign-in' }));
    await waitFor(() => {
      expect(get).toHaveBeenLastCalledWith('/admin/users', {
        params: { query: expect.objectContaining({ sort: 'lastLoginAt', direction: 'desc' }) },
      });
    });
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50');
    await waitFor(() => {
      expect(get).toHaveBeenLastCalledWith('/admin/users', {
        params: { query: expect.objectContaining({ pageSize: 50, page: 1 }) },
      });
    });
  });

  it('requires confirmation and a nonblank reason before suspending', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    const confirmation = screen.getByRole('region', { name: `Suspend user ${user.id}?` });
    const confirm = within(confirmation).getByRole('button', { name: 'Confirm suspend' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Reason'), 'Safety review');
    await userEvent.click(confirm);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/admin/users/{id}/suspend', {
        params: { path: { id: user.id } },
        body: { reason: 'Safety review' },
      });
    });
    expect(await screen.findByText('User access updated.')).toBeInTheDocument();
    await waitFor(() => {
      expect(get.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('cancels without sending a mutation', async () => {
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('keeps the reason and confirmation visible after failure', async () => {
    post.mockResolvedValue(fail(409, 'User is already suspended.'));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'Safety review');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspend' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('User is already suspended.');
    expect(screen.getByLabelText('Reason')).toHaveValue('Safety review');
  });

  it('disables confirmation during the request', async () => {
    post.mockReturnValue(new Promise(() => undefined));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
    await userEvent.type(screen.getByLabelText('Reason'), 'Review');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm suspend' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('allows reinstatement with a reason', async () => {
    get.mockResolvedValue(ok(page([{ ...user, disabledAt: '2026-10-20T11:00:00Z' }])));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Reinstate' }));
    expect(screen.getByText(/Previous sessions stay revoked/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Reason'), 'Review complete');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm reinstate' }));
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/admin/users/{id}/reinstate',
        expect.objectContaining({ body: { reason: 'Review complete' } }),
      );
    });
  });

  it('hides suspension actions for moderators', async () => {
    mount('moderator');
    await screen.findByText(user.id);
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal phone' })).toBeInTheDocument();
  });

  it('reveals a phone on demand, keeps it out of the cache, and clears it on remount', async () => {
    post.mockResolvedValue(ok({ phone: '+2348012345678' }));
    const { client, unmount } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Reveal phone' }));
    expect(await screen.findByText('+2348012345678')).toBeInTheDocument();
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      ),
    ).not.toContain('+2348012345678');
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((mutation) => mutation.state.data),
      ),
    ).not.toContain('+2348012345678');
    unmount();
    render(
      <QueryClientProvider client={client}>
        <UsersScreen />
      </QueryClientProvider>,
    );
    await screen.findByText(user.id);
    expect(screen.queryByText('+2348012345678')).not.toBeInTheDocument();
  });

  it('hides a revealed phone and requires a fresh reveal request', async () => {
    post.mockResolvedValue(ok({ phone: '+2348012345678' }));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Reveal phone' }));
    await screen.findByText('+2348012345678');
    await userEvent.click(screen.getByRole('button', { name: 'Hide phone' }));
    expect(screen.queryByText('+2348012345678')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reveal phone' }));
    await waitFor(() => {
      expect(post).toHaveBeenCalledTimes(2);
    });
  });

  it('shows reveal failure without exposing a phone', async () => {
    post.mockResolvedValue(fail(500, 'Could not reveal phone.'));
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Reveal phone' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reveal phone.');
    expect(screen.queryByText('+2348012345678')).not.toBeInTheDocument();
  });

  it('shows a 403 as a permission error', async () => {
    get.mockResolvedValue(fail(403, 'Not allowed.'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Not allowed.');
  });
});
