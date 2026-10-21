'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api/errors';

const KEY = ['admin', 'kyc'] as const;

export function useKycQueue(page: number) {
  return useQuery({
    queryKey: [...KEY, page],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/admin/kyc', {
        params: { query: { page, pageSize: 20 } },
      });
      if (!response.ok || !data)
        throw new ApiRequestError(
          response.status,
          error?.message ?? 'Could not load the review queue.',
        );
      return data;
    },
    retry: false,
  });
}

export function useRejectKyc() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error, response } = await api.POST('/admin/kyc/{id}/reject', {
        params: { path: { id } },
        body: { reason },
      });
      if (!response.ok || !data)
        throw new ApiRequestError(
          response.status,
          error?.message ?? 'Could not reject this review.',
        );
      return data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}
