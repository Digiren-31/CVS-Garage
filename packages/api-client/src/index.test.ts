import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './index';

describe('shared API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('unwraps successful API envelopes and sends the active identity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { memberCount: 1 },
          error: null,
          meta: { timestamp: new Date().toISOString() }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    api.setUserId('mem-student-1');
    await expect(api.request<{ memberCount: number }>('/dashboard')).resolves.toEqual({
      memberCount: 1
    });

    const request = fetchMock.mock.calls[0];
    expect(request[0]).toBe('/api/v1/dashboard');
    expect((request[1]?.headers as Headers).get('x-user-id')).toBe('mem-student-1');
  });

  it('surfaces API and network failures explicitly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: 'FORBIDDEN', message: 'Not allowed.' },
            meta: { timestamp: new Date().toISOString() }
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    await expect(api.request('/protected')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Not allowed.'
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(api.request('/dashboard')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR'
    });
  });
});
