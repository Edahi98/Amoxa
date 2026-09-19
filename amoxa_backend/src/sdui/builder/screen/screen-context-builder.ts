import type { SessionRole } from '@shared/roles.js';
import type { RawContext, RawEntity, RawOffline, RawUser } from '@sdui-builder/raw-json.types.js';

export class ScreenContextBuilder {
  private readonly node: RawContext;

  private constructor(user: RawUser) {
    this.node = { user };
  }

  public static forUser(user: RawUser): ScreenContextBuilder {
    return new ScreenContextBuilder(user);
  }

  public get role(): SessionRole {
    return this.node.user.rol;
  }

  public entity(entity: RawEntity): this {
    this.node.entity = entity;
    return this;
  }

  public clauseRefs(...clauses: string[]): this {
    this.node.clause_refs = clauses;
    return this;
  }

  public offline(offline: RawOffline): this {
    this.node.offline = offline;
    return this;
  }

  public data(data: Record<string, unknown>): this {
    this.node.data = data;
    return this;
  }

  public build(): RawContext {
    return { ...this.node, user: { ...this.node.user } };
  }
}
