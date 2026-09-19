export interface FilterableOption {
  label: string;
  description?: string;
}

export class OptionFilter {
  public static normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  public static apply<T extends FilterableOption>(options: readonly T[], query: string): T[] {
    const needle = OptionFilter.normalize(query);
    if (!needle) {
      return [...options];
    }
    return options.filter((option) => {
      const haystack = OptionFilter.normalize(`${option.label} ${option.description ?? ''}`);
      return haystack.includes(needle);
    });
  }
}
