import type { ExecutionContext } from '@nestjs/common';

export class FakeExecutionContext {
  private readonly request: object;
  private readonly handler: () => void;
  private readonly owner: new () => object;

  private constructor(request: object, handler: () => void, owner: new () => object) {
    this.request = request;
    this.handler = handler;
    this.owner = owner;
  }

  public static forRole(
    dbRole: string | undefined,
    handler: () => void,
    owner: new () => object,
    params: Record<string, string> = {},
  ): ExecutionContext {
    const user = dbRole === undefined ? undefined : { rol: dbRole };
    return new FakeExecutionContext({ user, params }, handler, owner).asContext();
  }

  public static forUser(
    user: { sub: string; rol: string } | undefined,
    handler: () => void,
    owner: new () => object,
  ): { context: ExecutionContext; request: { user?: { sub: string; rol: string } } } {
    const request: { user?: { sub: string; rol: string } } = { user };
    return { context: new FakeExecutionContext(request, handler, owner).asContext(), request };
  }

  public switchToHttp() {
    return { getRequest: () => this.request };
  }

  public getHandler() {
    return this.handler;
  }

  public getClass() {
    return this.owner;
  }

  private asContext(): ExecutionContext {
    return this as unknown as ExecutionContext;
  }
}
