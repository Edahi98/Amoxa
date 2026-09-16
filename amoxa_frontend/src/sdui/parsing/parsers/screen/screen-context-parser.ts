import { AbstractNodeParser } from '@sdui-parsers/abstract-node-parser';
import { InputGuard } from '@sdui-parsing-support/input-guard';
import { ParseErrorCollector } from '@sdui-parsing-support/parse-error-collector';
import { ScreenContextModel } from '@sdui-model-screen/screen-context.model';
import { ScreenUserModel } from '@sdui-model-screen/screen-user.model';
import { ScreenEntityModel } from '@sdui-model-screen/screen-entity.model';
import { ScreenOfflineModel } from '@sdui-model-screen/screen-offline.model';
import { CONFLICT_POLICIES, USER_ROLES } from '@sdui-model/sdui-enums';

export class ScreenContextParser extends AbstractNodeParser<ScreenContextModel> {
  constructor(guard: InputGuard) {
    super(guard);
  }

  protected override describeExpectedShape(): string {
    return 'se esperaba un objeto context';
  }

  protected override parseRecord(
    input: Readonly<Record<string, unknown>>,
    path: string,
    errors: ParseErrorCollector,
  ): ScreenContextModel | undefined {
    const user = this.parseUser(input['user']);
    if (user === undefined) {
      errors.add(`${path}.user`, 'se esperaba { id, rol } válidos');
      return undefined;
    }

    return new ScreenContextModel({
      user,
      entity: this.parseEntity(input['entity']),
      clauseRefs: Array.isArray(input['clause_refs'])
        ? input['clause_refs'].filter((v): v is string => typeof v === 'string')
        : undefined,
      offline: this.parseOffline(input['offline']),
      data: this.guard.isRecord(input['data']) ? input['data'] : undefined,
    });
  }

  private parseUser(value: unknown): ScreenUserModel | undefined {
    if (!this.guard.isRecord(value) || !this.guard.isNonEmptyString(value['id']) || !this.guard.includesValue(USER_ROLES, value['rol'])) {
      return undefined;
    }

    return new ScreenUserModel({
      id: value['id'],
      nombre: typeof value['nombre'] === 'string' ? value['nombre'] : undefined,
      rol: value['rol'],
      procesoId: typeof value['proceso_id'] === 'string' || value['proceso_id'] === null ? value['proceso_id'] : undefined,
    });
  }

  private parseEntity(value: unknown): ScreenEntityModel | undefined {
    if (!this.guard.isRecord(value)) return undefined;

    return new ScreenEntityModel({
      type: String(value['type'] ?? ''),
      id: String(value['id'] ?? ''),
      version: typeof value['version'] === 'number' ? value['version'] : 0,
      estado: typeof value['estado'] === 'string' ? value['estado'] : undefined,
    });
  }

  private parseOffline(value: unknown): ScreenOfflineModel | undefined {
    if (!this.guard.isRecord(value)) return undefined;

    return new ScreenOfflineModel({
      enabled: typeof value['enabled'] === 'boolean' ? value['enabled'] : undefined,
      cacheTtlSeconds: typeof value['cache_ttl_seconds'] === 'number' ? value['cache_ttl_seconds'] : undefined,
      conflictPolicy: this.guard.includesValue(CONFLICT_POLICIES, value['conflict_policy']) ? value['conflict_policy'] : undefined,
    });
  }
}
