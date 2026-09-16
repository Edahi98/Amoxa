export interface ScreenEntityModelInit {
  type: string;
  id: string;
  version: number;
  estado?: string;
}

export class ScreenEntityModel {
  public readonly type: string;
  public readonly id: string;
  public readonly version: number;
  public readonly estado?: string;

  constructor(init: ScreenEntityModelInit) {
    this.type = init.type;
    this.id = init.id;
    this.version = init.version;
    this.estado = init.estado;
  }
}
