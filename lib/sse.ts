// @ts-ignore
declare global {
  var __sseManager: SSEManager | undefined;
}

type Listener = (data: unknown) => void;

class SSEManager {
  private listeners = new Map<string, Set<Listener>>();
  private cache = new Map<string, unknown>();
  private intervals = new Map<string, NodeJS.Timeout>();

  registerWatcher(channel: string, fetcher: () => Promise<unknown>, intervalMs: number) {
    if (this.intervals.has(channel)) return;
    const run = async () => {
      try {
        const data = await fetcher();
        this.cache.set(channel, data);
        this.listeners.get(channel)?.forEach((cb) => cb(data));
      } catch {}
    };
    run();
    this.intervals.set(channel, setInterval(run, intervalMs));
  }

  subscribe(channel: string, cb: Listener): () => void {
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel)!.add(cb);
    if (this.cache.has(channel)) cb(this.cache.get(channel));
    return () => { this.listeners.get(channel)?.delete(cb); };
  }
}

function getSSEManager(): SSEManager {
  if (!globalThis.__sseManager) globalThis.__sseManager = new SSEManager();
  return globalThis.__sseManager;
}

export const sseManager = getSSEManager();
