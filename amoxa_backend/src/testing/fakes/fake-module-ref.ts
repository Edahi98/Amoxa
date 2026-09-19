import type { ModuleRef } from '@nestjs/core';

export class FakeModuleRef {
  private readonly instances: readonly object[];

  constructor(instances: readonly object[]) {
    this.instances = instances;
  }

  public get(type: abstract new (...args: never[]) => object): object {
    const found = this.instances.find((instance) => instance instanceof type);
    if (found === undefined) {
      throw new Error(`No hay instancia de ${type.name}`);
    }
    return found;
  }

  public asModuleRef(): ModuleRef {
    return this as unknown as ModuleRef;
  }
}
