export class ChangeDispatcher {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  public schedule(key: string, delayMs: number, run: () => void): void {
    this.cancel(key);
    if (delayMs <= 0) {
      run();
      return;
    }
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        run();
      }, delayMs),
    );
  }

  public cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(key);
  }

  public cancelAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}
