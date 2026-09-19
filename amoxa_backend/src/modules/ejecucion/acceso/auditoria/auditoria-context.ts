import type { auditoria } from '@schemas/index.js';

export type AuditoriaRow = typeof auditoria.$inferSelect;

export interface AuditoriaContext {
  auditoria: AuditoriaRow;
  organizacionId: string;
  procesoIds: string[];
}
