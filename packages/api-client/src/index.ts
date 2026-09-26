import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiEnvelope } from '@cvs-garage/contracts';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}

const BASE = '/api/v1/campus';
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
    headers.set('X-CVS-Request', '1');
  }
  let response: Response;
  try { response = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'same-origin' }); }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('The campus server could not be reached. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }
  let result: ApiEnvelope<T>;
  try { result = await response.json(); }
  catch { throw new ApiError('The server returned an unexpected response. Please try again.', response.status, 'INVALID_RESPONSE'); }
  if (!response.ok || !result.success) {
    throw new ApiError(result.error?.message || 'This request could not be completed.', response.status, result.error?.code || 'REQUEST_FAILED');
  }
  return result.data;
}

export function queryString(values: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'all') query.set(key, String(value));
  }
  return query.size ? `?${query}` : '';
}

export function useApiQuery<T>(path: string, options: { enabled?: boolean; keepPrevious?: boolean; staleTime?: number; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: ['campus', path],
    queryFn: ({ signal }) => request<T>(path, { signal }),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    staleTime: options.staleTime ?? 30_000,
    refetchInterval: options.refetchInterval,
    retry: (count, error) => error instanceof ApiError && (error.status === 0 || error.status >= 500) && count < 1,
  });
}

export function useApiMutation<T = unknown>() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ path, method = 'POST', body = {} }: { path: string; method?: string; body?: unknown }) =>
      request<T>(path, { method, body: JSON.stringify(body) }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['campus'] }); },
    retry: false,
  });
}
