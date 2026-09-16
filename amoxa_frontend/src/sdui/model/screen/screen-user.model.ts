import type { UserRole } from '@sdui-model/sdui-enums';

export interface ScreenUserModelInit {
  id: string;
  nombre?: string;
  rol: UserRole;
  procesoId?: string | null;
}

export class ScreenUserModel {
  public readonly id: string;
  public readonly nombre?: string;
  public readonly rol: UserRole;
  public readonly procesoId?: string | null;

  constructor(init: ScreenUserModelInit) {
    this.id = init.id;
    this.nombre = init.nombre;
    this.rol = init.rol;
    this.procesoId = init.procesoId;
  }
}
