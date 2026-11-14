// Bound the whole request, including a slow response body.
export async function engineRequest(
  action, data, signal, { fetcher = globalThis.fetch, timeoutMs = 10_000 } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();

  const deadline = setTimeout(() => {
    controller.abort(new Error('Rust engine timed out. Retry engine to reconnect.'));
  }, timeoutMs);

  let rejectAbort;
  const cancelled = new Promise((_, reject) => {
    rejectAbort = () => reject(controller.signal.reason);
    controller.signal.addEventListener('abort', rejectAbort, { once: true });
    if (controller.signal.aborted) rejectAbort();
  });

  try {
    const request = async () => {
      const response = await fetcher('/api/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error('Rust engine unavailable. Start it with npm run engine, then select Retry engine.');
      }
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error(result?.error || 'Unexpected Rust engine response');
      return result;
    };
    return await Promise.race([request(), cancelled]);
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', rejectAbort);
  }
}

// Success, failure and cleanup all belong to the request that started them.
export function requestGate() {
  let controller;
  const cancel = () => {
    controller?.abort();
    controller = undefined;
  };
  return {
    cancel,
    start() {
      cancel();
      const next = new AbortController();
      controller = next;
      return { signal: next.signal, current: () => controller === next };
    },
  };
}

export function networkFingerprint(nodes) {
  return JSON.stringify(nodes.map(({ x, y, name, ...network }) => network));
}
