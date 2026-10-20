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
      if (error) throw new Error(error.message);
      return data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const { data, error } = await api.POST('/admin/auth/login', { body });
      // `error` is typed now that the spec documents 400 and 401 — before the
      // backend declared them, openapi-typescript inferred `never` and every
      // one of these checks was dead code the compiler believed unreachable.
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function useVerifyTotp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { challenge: string; code: string }) => {
      const { data, error } = await api.POST('/admin/auth/totp', { body });
      if (error) throw new Error(error.message);
      return data;
    },
    // The cookie is now set, so anything that asked "who am I" was answered
    // before it existed.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.POST('/admin/auth/logout');
    },
    // Reset, not invalidate: refetching after logout asks a question whose
    // answer we already know, and shows a flash of the old identity.
    onSuccess: () => queryClient.setQueryData(ME_KEY, null),
  });
}
