export const jsonResponse = (data: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

export const readJson = async <T>(response: Response) => JSON.parse(await response.text()) as T;

export const withMockedFetch = async <T>(mockFetch: typeof fetch, run: () => Promise<T>) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};
