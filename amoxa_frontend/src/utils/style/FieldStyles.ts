import { ClassNames } from '@utils-style/cn.js';

export class FieldStyles {
  private static readonly BASE =
    'w-full min-w-0 rounded-lg border bg-card px-4 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  public static control(hasError: boolean, className?: string): string {
    return ClassNames.merge(FieldStyles.BASE, hasError ? 'border-destructive' : 'border-input', className);
  }
}
