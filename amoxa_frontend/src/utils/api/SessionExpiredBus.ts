export type SessionExpiredListener = () => void;

export class SessionExpiredBus {
  private static readonly listeners = new Set<SessionExpiredListener>();

  public static subscribe(listener: SessionExpiredListener): () => void {
    SessionExpiredBus.listeners.add(listener);
    return () => {
      SessionExpiredBus.listeners.delete(listener);
    };
  }

  public static notify(): void {
    Array.from(SessionExpiredBus.listeners).forEach((listener) => listener());
  }
}
