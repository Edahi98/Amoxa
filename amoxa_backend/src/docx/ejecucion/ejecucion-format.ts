import type { AuditoriaResumenDoc } from '@docx-ejecucion/ejecucion-documento-data.js';

export class EjecucionFormat {
  public static dateTime(iso: string | null): string {
    return iso === null ? 'Sin registro' : `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
  }

  public static date(value: string | null): string {
    return value === null ? 'Sin fecha' : value.slice(0, 10);
  }

  public static text(value: string | null | undefined, fallback = 'Sin comentarios'): string {
    return value === null || value === undefined || value.trim() === '' ? fallback : value;
  }

  public static auditoria(auditoria: AuditoriaResumenDoc): (readonly [string, string])[] {
    return [
      ['Auditoría', auditoria.titulo],
      ['Líder de la auditoría', auditoria.lider],
      ['Método', auditoria.metodo],
      ['Procesos auditados', auditoria.procesos.length === 0 ? 'Sin procesos' : auditoria.procesos.join(', ')],
      ['Fecha planificada', EjecucionFormat.date(auditoria.fechaPlan)],
      ['Fecha real', EjecucionFormat.date(auditoria.fechaReal)],
      ['Estado', auditoria.estado],
    ];
  }
}
