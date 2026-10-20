'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

export type UserItem = components['schemas']['UserItemDto'];
export interface UsersQuery {
  page: number;
  pageSize: number;
  status: 'all' | 'active' | 'suspended';
  sort: 'createdAt' | 'lastLoginAt';
  direction: 'asc' | 'desc';
}
export const USERS_KEY = ['admin', 'users'] as const;

export function useUsers(query: UsersQuery) {
  return useQuery({
    queryKey: [...USERS_KEY, query],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/admin/users', { params: { query } });
      if (!response.ok || !data)
        throw new ApiRequestError(response.status, error?.message ?? 'Could not load users.');
      return data;
    },
    retry: false,
  });
}

export function useChangeSuspension() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      suspend,
      reason,
    }: {
      id: string;
      suspend: boolean;
      reason: string;
    }) => {
      const path = suspend ? '/admin/users/{id}/suspend' : '/admin/users/{id}/reinstate';
      const { data, error, response } = await api.POST(path, {
        params: { path: { id } },
        body: { reason },
      });
      if (!response.ok || !data)
        throw new ApiRequestError(response.status, error?.message ?? 'Could not update this user.');
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

/** The caller owns this value in component state; it never enters a query cache. */
export async function revealPhone(id: string): Promise<string | null> {
  const { data, error, response } = await api.POST('/admin/users/{id}/reveal-phone', {
    params: { path: { id } },
  });
  if (!response.ok || !data)
    throw new ApiRequestError(
      response.status,
      error?.message ?? 'Could not reveal this phone number.',
    );
  return data.phone;
}
