// Per-user registry of SSE push controllers (one entry per user, last writer
// wins). Used by server-side code (e.g. webhook dispatch) to push events to a
// connected client without waiting for the next poll cycle.
export const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>();

// Tracks the number of active /api/stream connections per user so the route
// can enforce a cap and prevent unbounded database polling.
export const activeStreamConnections = new Map<string, number>();

export function sendSSEEvent(
  userId: string,
  event: string,
  data: object
): void {
  const connectionsSet = sseConnections.get(userId);
  if (connectionsSet) {
    // Copy the set before iterating to avoid modification-during-iteration
    const controllers = Array.from(connectionsSet);
    for (const controller of controllers) {
      try {
        controller.enqueue(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        );
      } catch (e) {
        connectionsSet.delete(controller);
        if (connectionsSet.size === 0) {
          sseConnections.delete(userId);
        }
      }
    }
  }
}
