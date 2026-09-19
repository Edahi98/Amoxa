export class ListReorder {
  public static move<T>(items: readonly T[], from: number, to: number): T[] {
    const size = items.length;
    if (from < 0 || from >= size || to < 0 || to >= size || from === to) return [...items];
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  public static sameOrder(left: readonly { id: string }[], right: readonly { id: string }[]): boolean {
    return left.length === right.length && left.every((item, index) => item.id === right[index].id);
  }
}
