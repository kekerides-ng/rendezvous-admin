'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

/**
 * Admin auth, as TanStack Query hooks (CLAUDE.md rule 1 — never a bare effect).
 *
 * Query for "who am I", mutations for the things that change state. The
 * distinction matters beyond tidiness: `useQuery` caches and dedupes, so three
 * components asking who is signed in produce one request, and invalidating it
 * after login or logout is what makes every one of them update at once.
 */
export const ME_KEY = ['admin', 'me'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/admin/auth/me');
      // 401 is the expected answer for a signed-out visitor, not a failure —
      // throwing would make TanStack retry a question already answered.
      if (response.status === 401) return null;
      if (!response.ok || !data) throw new Error(error?.message ?? 'Could not check your session.');
      return data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data, error, response } = await api.POST('/admin/auth/login', { body });
      // `error` is typed now that the spec documents 400 and 401 — before the
      // backend declared them, openapi-typescript inferred `never` and every
      // one of these checks was dead code the compiler believed unreachable.
      if (!response.ok || !data)
        throw new Error(error?.message ?? 'Sign-in failed. Please try again.');
      return data;
    },
  });
}

export function useVerifyTotp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { challenge: string; code: string }) => {
      const { data, error, response } = await api.POST('/admin/auth/totp', { body });
      if (!response.ok || !data)
        throw new Error(error?.message ?? 'Sign-in failed. Please try again.');
      return data;
    },
    // Replace a cached signed-out result before navigating. Invalidating it
    // leaves null visible until refetch, which makes the console redirect back.
    onSuccess: async (admin) => {
      await queryClient.cancelQueries({ queryKey: ME_KEY });
      queryClient.setQueryData(ME_KEY, admin);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { response } = await api.POST('/admin/auth/logout');
      if (!response.ok && response.status !== 401)
        throw new Error('Sign out failed. Please try again.');
    },
    // Reset, not invalidate: refetching after logout asks a question whose
    // answer we already know, and shows a flash of the old identity.
    onSuccess: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}
