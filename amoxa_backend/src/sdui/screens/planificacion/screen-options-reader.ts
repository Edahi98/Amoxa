import type { ScreenContextBuilder } from '@sdui-builder-screen/screen-context-builder.js';
import type { OptionSpec } from '@sdui-kit/kit-types.js';

export class ScreenOptionsReader {
  public static read(context: ScreenContextBuilder, key: string): OptionSpec[] {
    const opciones = context.build().data?.['opciones'];
    if (typeof opciones !== 'object' || opciones === null) {
      return [];
    }
    const list: unknown = Reflect.get(opciones, key);
    return Array.isArray(list) ? (list as OptionSpec[]) : [];
  }
}
