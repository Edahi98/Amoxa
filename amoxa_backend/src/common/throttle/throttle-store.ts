import { Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class ThrottleStore {
  private static readonly SWEEP_THRESHOLD = 5000;
  private readonly buckets = new Map<string, Bucket>();

  public hit(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
    this.sweep(now);
    const current = this.buckets.get(key);
    if (current === undefined || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }

  private sweep(now: number): void {
    if (this.buckets.size < ThrottleStore.SWEEP_THRESHOLD) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
