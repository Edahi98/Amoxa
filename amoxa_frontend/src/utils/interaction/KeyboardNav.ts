export type NavOrientation = 'horizontal' | 'vertical' | 'both';

export class KeyboardNav {
  public static next(key: string, current: number, count: number, orientation: NavOrientation = 'both'): number | null {
    if (count <= 0) {
      return null;
    }
    const forward: string[] = [];
    const backward: string[] = [];
    if (orientation !== 'vertical') {
      forward.push('ArrowRight');
      backward.push('ArrowLeft');
    }
    if (orientation !== 'horizontal') {
      forward.push('ArrowDown');
      backward.push('ArrowUp');
    }
    if (forward.includes(key)) {
      return (current + 1) % count;
    }
    if (backward.includes(key)) {
      return (current - 1 + count) % count;
    }
    if (key === 'Home') {
      return 0;
    }
    if (key === 'End') {
      return count - 1;
    }
    return null;
  }
}
