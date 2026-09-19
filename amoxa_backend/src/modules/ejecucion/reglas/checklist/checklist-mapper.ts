export type ClientResult = 'conforme' | 'no_conforme' | 'no_aplica';
export type DbResult = 'C' | 'NC' | 'NA';
export type ClientCriterion = 'norma' | 'procedimiento';
export type DbCriterion = 'ISO_9001' | 'propio' | 'legal' | 'eficacia';

export class ChecklistMapper {
  private static readonly TO_DB: Readonly<Record<string, DbResult>> = {
    conforme: 'C',
    no_conforme: 'NC',
    no_aplica: 'NA',
    C: 'C',
    NC: 'NC',
    NA: 'NA',
  };

  private static readonly TO_CLIENT: Readonly<Record<DbResult, ClientResult>> = {
    C: 'conforme',
    NC: 'no_conforme',
    NA: 'no_aplica',
  };

  private static readonly LABELS: Readonly<Record<DbResult, string>> = {
    C: 'Conforme',
    NC: 'No conforme',
    NA: 'No aplica',
  };

  public static toDb(result: string): DbResult | undefined {
    return Object.hasOwn(ChecklistMapper.TO_DB, result) ? ChecklistMapper.TO_DB[result] : undefined;
  }

  public static toClient(result: DbResult): ClientResult {
    return ChecklistMapper.TO_CLIENT[result];
  }

  public static label(result: DbResult): string {
    return ChecklistMapper.LABELS[result];
  }

  public static criterion(tipo: DbCriterion): ClientCriterion {
    return tipo === 'ISO_9001' || tipo === 'legal' ? 'norma' : 'procedimiento';
  }

  public static keyOf(orden: number): string {
    return `q${orden}`;
  }

  public static parseKey(key: string): number | undefined {
    const match = /^q(\d{1,5})$/.exec(key);
    return match === null ? undefined : Number(match[1]);
  }
}
