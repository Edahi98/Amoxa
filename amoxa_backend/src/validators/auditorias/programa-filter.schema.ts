import { z } from 'zod';
import { OptionalField } from '@validators-auditorias/optional-field.js';

export const ProgramaFilterSchema = OptionalField.of(z.uuid());
