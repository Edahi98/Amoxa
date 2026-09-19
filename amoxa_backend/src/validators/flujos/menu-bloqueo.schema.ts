import { z } from 'zod';
import { NestedPayload } from '@validators/nested-payload.js';

export const MenuBloqueoSchema = z.preprocess(NestedPayload.unwrap('menu'), z.looseObject({ bloqueo: z.boolean() }));

export type MenuBloqueoInput = z.infer<typeof MenuBloqueoSchema>;
