import type { SessionRole } from '@shared/roles.js';
import type { TokenPayload } from '@auth-token/token-payload.js';
import type { RawEntity, RawOffline } from '@sdui-builder/raw-json.types.js';

export interface ScreenDataRequest {
  screenId: string;
  user: TokenPayload;
  role: SessionRole;
  entityId?: string;
  entityType?: string;
}

export interface ScreenData {
  data?: Record<string, unknown>;
  entity?: RawEntity;
  offline?: RawOffline;
}
