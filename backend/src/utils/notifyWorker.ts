import { refreshQueue } from '../worker/queue.ts';

/**
 * Call this from the API when a new streak is created
 * so the worker picks up the new pubkeys.
 */
export async function notifyWorkerToRefresh(): Promise<void> {
  await refreshQueue.add('refresh', {}, { removeOnComplete: true, removeOnFail: 5 });
}
