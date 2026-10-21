'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';

const KEY = ['admin', 'media'] as const;

export function useMediaQueue(page: number) {
  return useQuery({
    queryKey: [...KEY, page],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/admin/media', {
        params: { query: { page, pageSize: 20 } },
      });
      if (!response.ok || !data)
        throw new ApiRequestError(response.status, error?.message ?? 'Could not load photos.');
      return data;
    },
    retry: false,
    refetchInterval: 4 * 60_000,
  });
}

export function useReviewMedia() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'approve' | 'reject';
      reason: string;
    }) => {
      const result =
        action === 'approve'
          ? await api.POST('/admin/media/{id}/approve', {
              params: { path: { id } },
              body: { reason },
            })
          : await api.POST('/admin/media/{id}/reject', {
              params: { path: { id } },
              body: { reason },
            });
      if (!result.response.ok || !result.data)
        throw new ApiRequestError(
          result.response.status,
          result.error?.message ?? 'Could not review photo.',
        );
      return result.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
