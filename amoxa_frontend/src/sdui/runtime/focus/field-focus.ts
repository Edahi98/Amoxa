export class FieldFocus {
  private static readonly FOCUSABLE = 'input, select, textarea, button, [tabindex]';

  public static focus(id: string): boolean {
    if (typeof document === 'undefined') return false;
    const element = document.getElementById(id);
    if (!element) return false;

    element.scrollIntoView?.({ block: 'center' });
    const target = element.matches(FieldFocus.FOCUSABLE)
      ? element
      : (element.querySelector<HTMLElement>(FieldFocus.FOCUSABLE) ?? element);
    target.focus();
    return true;
  }
}
