export class TodayClock {
  public static isoDate(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
  }
}
