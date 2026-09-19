export interface ScreenRouteTarget {
  screenId: string;
  entityId?: string;
  entityType?: string;
}

export class ScreenRoute {
  public static readonly HOME_SCREEN = 'inicio';
  public static readonly HOME_PATH = '/dashboard';

  public static pathFor(screenId: string, params: Readonly<Record<string, unknown>> = {}): string {
    if (screenId === ScreenRoute.HOME_SCREEN) return ScreenRoute.HOME_PATH;

    const search = new URLSearchParams();
    const entityId = ScreenRoute.pick(params, 'entityId', 'entity_id');
    const entityType = ScreenRoute.pick(params, 'entityType', 'entity_type');
    if (entityId) search.set('entityId', entityId);
    if (entityType) search.set('entityType', entityType);
    const query = search.toString();

    return `/app/${encodeURIComponent(screenId)}${query ? `?${query}` : ''}`;
  }

  public static fromLocation(screenId: string | undefined, search: URLSearchParams): ScreenRouteTarget {
    return {
      screenId: screenId ?? ScreenRoute.HOME_SCREEN,
      entityId: search.get('entityId') ?? undefined,
      entityType: search.get('entityType') ?? undefined,
    };
  }

  public static entityOf(params: Readonly<Record<string, unknown>>): { entityId?: string; entityType?: string } {
    return {
      entityId: ScreenRoute.pick(params, 'entityId', 'entity_id'),
      entityType: ScreenRoute.pick(params, 'entityType', 'entity_type'),
    };
  }

  private static pick(params: Readonly<Record<string, unknown>>, ...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = params[key];
      if (typeof value === 'string' && value !== '') return value;
      if (typeof value === 'number') return String(value);
    }
    return undefined;
  }
}
