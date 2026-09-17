export class ClassNames {
  public static merge(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
  }
}
