import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './login-screen';
import { ME_KEY } from './use-admin-auth';

const { post, replace } = vi.hoisted(() => ({ post: vi.fn(), replace: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { POST: post } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  post.mockReset();
  replace.mockReset();
});

async function passwordStep() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(ME_KEY, null);
  post.mockResolvedValueOnce({
    data: { kind: 'totp_required', challenge: 'test-challenge' },
    response: { ok: true, status: 200 },
  });
  render(
    <QueryClientProvider client={client}>
      <LoginScreen />
    </QueryClientProvider>,
  );
  await userEvent.type(screen.getByLabelText('Email'), 'admin@example.test');
  await userEvent.type(screen.getByLabelText('Password'), 'test-only-passphrase');
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByLabelText('Authenticator code');
  return client;
}

describe('admin sign-in navigation', () => {
  it('navigates to the dashboard after TOTP with the authenticated cache ready', async () => {
    const client = await passwordStep();
    const admin = { id: 'admin', email: 'admin@example.test', role: 'admin' };
    post.mockResolvedValueOnce({ data: admin, response: { ok: true, status: 200 } });
    replace.mockImplementation(() => {
      expect(client.getQueryData(ME_KEY)).toEqual(admin);
    });
    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/');
    });
  });

  it('stays on the code screen and displays a rejected-code error', async () => {
    await passwordStep();
    post.mockResolvedValueOnce({
      error: { message: 'That code is wrong or already used.' },
      response: { ok: false, status: 401 },
    });
    await userEvent.type(screen.getByLabelText('Authenticator code'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That code is wrong or already used.',
    );
    expect(replace).not.toHaveBeenCalled();
  });
});
