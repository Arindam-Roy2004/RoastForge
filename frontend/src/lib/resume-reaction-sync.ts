import { resumeApi } from "@/lib/api";

type Reaction = "like" | "dislike";
type PendingReaction = { reaction: Reaction; queuedAt: number };

const STORAGE_KEY = "roastforge.pending-reactions.v1";

function readQueue(): Record<string, PendingReaction> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PendingReaction>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeQueue(queue: Record<string, PendingReaction>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Private mode / quota exceeded — ignore, request path still works live.
  }
}

export function enqueueResumeReaction(resumeId: string, reaction: Reaction) {
  const queue = readQueue();
  queue[resumeId] = { reaction, queuedAt: Date.now() };
  writeQueue(queue);
}

/**
 * Atomically removes an entry from the persisted queue and returns it.
 * Racing callers (e.g. two tabs both firing on an `online` event) won't both
 * see the same pending reaction and toggle it twice on the server.
 */
function takeNextEntry(): [string, PendingReaction] | null {
  const queue = readQueue();
  const entries = Object.entries(queue).sort((a, b) => a[1].queuedAt - b[1].queuedAt);
  if (entries.length === 0) return null;
  const [resumeId, pending] = entries[0];
  delete queue[resumeId];
  writeQueue(queue);
  return [resumeId, pending];
}

// Single-flight: concurrent callers in the same tab share one in-flight promise.
let inflight: Promise<number> | null = null;

export function flushQueuedResumeReactions(): Promise<number> {
  if (inflight) return inflight;
  inflight = (async () => {
    let flushed = 0;
    while (true) {
      const taken = takeNextEntry();
      if (!taken) break;
      const [resumeId, pending] = taken;
      try {
        await resumeApi.react(resumeId, pending.reaction);
        flushed += 1;
      } catch {
        // Put it back and stop — likely still offline or server down.
        const queue = readQueue();
        // Another tab may have queued a newer intent for this resume; don't clobber it.
        if (!queue[resumeId] || queue[resumeId].queuedAt < pending.queuedAt) {
          queue[resumeId] = pending;
          writeQueue(queue);
        }
        break;
      }
    }
    return flushed;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
