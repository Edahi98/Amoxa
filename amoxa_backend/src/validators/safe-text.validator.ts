import { z } from 'zod';

export class SafeTextValidator {
  private static readonly SQL_COMMENT_PATTERN = /(--|\/\*|\*\/)/;
  private static readonly SQL_STATEMENT_SEPARATOR_PATTERN = /;/;
  private static readonly SQL_KEYWORD_PATTERN =
    /\b(select|insert|update|delete|drop|alter|create|exec|execute|truncate|union|grant|revoke)\b/i;
  private static readonly SQL_TAUTOLOGY_PATTERN = /\bor\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i;
  private static readonly SQL_QUOTE_ESCAPE_PATTERN = /'\s*or\s*'/i;
  private static readonly SQL_PROCEDURE_PATTERN = /\bxp_cmdshell\b/i;

  private static readonly SCRIPT_TAG_PATTERN = /<\s*\/?\s*script\b/i;
  private static readonly SCRIPT_PROTOCOL_PATTERN = /javascript:/i;
  private static readonly SCRIPT_EVENT_HANDLER_PATTERN = /\bon[a-z]+\s*=/i;
  private static readonly SCRIPT_EMBED_TAG_PATTERN = /<\s*(iframe|svg|img)\b/i;
  private static readonly SCRIPT_COOKIE_ACCESS_PATTERN = /document\s*\.\s*cookie/i;
  private static readonly SCRIPT_DYNAMIC_EVAL_PATTERN = /\b(eval|Function)\s*\(/;

  private static readonly SQL_INJECTION_PATTERNS: readonly RegExp[] = [
    SafeTextValidator.SQL_COMMENT_PATTERN,
    SafeTextValidator.SQL_STATEMENT_SEPARATOR_PATTERN,
    SafeTextValidator.SQL_KEYWORD_PATTERN,
    SafeTextValidator.SQL_TAUTOLOGY_PATTERN,
    SafeTextValidator.SQL_QUOTE_ESCAPE_PATTERN,
    SafeTextValidator.SQL_PROCEDURE_PATTERN,
  ];

  private static readonly SCRIPT_INJECTION_PATTERNS: readonly RegExp[] = [
    SafeTextValidator.SCRIPT_TAG_PATTERN,
    SafeTextValidator.SCRIPT_PROTOCOL_PATTERN,
    SafeTextValidator.SCRIPT_EVENT_HANDLER_PATTERN,
    SafeTextValidator.SCRIPT_EMBED_TAG_PATTERN,
    SafeTextValidator.SCRIPT_COOKIE_ACCESS_PATTERN,
    SafeTextValidator.SCRIPT_DYNAMIC_EVAL_PATTERN,
  ];

  public wrap<TSchema extends z.ZodString>(schema: TSchema) {
    return schema
      .refine((value) => !this.matchesAny(value, SafeTextValidator.SQL_INJECTION_PATTERNS), {
        message: 'El texto contiene un patrón no permitido (posible inyección SQL)',
      })
      .refine((value) => !this.matchesAny(value, SafeTextValidator.SCRIPT_INJECTION_PATTERNS), {
        message: 'El texto contiene un patrón no permitido (posible script)',
      });
  }

  private matchesAny(value: string, patterns: readonly RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(value));
  }
}
