import type { RoleKey } from '@shared/roles.js';

export class ScreenAccessError extends Error {
  public readonly role: RoleKey;
  public readonly screenId: string;

  constructor(role: RoleKey, screenId: string) {
    super(`El rol ${role} no puede ver la pantalla ${screenId}`);
    this.name = 'ScreenAccessError';
    this.role = role;
    this.screenId = screenId;
  }
}
