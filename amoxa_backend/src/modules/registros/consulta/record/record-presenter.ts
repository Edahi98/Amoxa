import type {
  RecordEntry,
  RecordHistory,
  RecordListItem,
  RecordVersionItem,
} from '@registros-consulta-record/record-entry.types.js';

export class RecordPresenter {
  private static readonly TYPE_LABELS: Record<string, string> = {
    programa: 'Programa de auditoría',
    auditoria: 'Auditoría',
    informe: 'Informe',
    hallazgo: 'Hallazgo',
    accion: 'Acción',
    revision_direccion: 'Revisión por la dirección',
    leccion_aprendida: 'Lecciones aprendidas',
    plantilla: 'Plantilla de checklist',
  };

  public static typeLabel(entidadTipo: string): string {
    return RecordPresenter.TYPE_LABELS[entidadTipo] ?? entidadTipo;
  }

  public static shortHash(hash: string | null): string {
    return hash === null ? 'sin huella' : hash.slice(0, 12);
  }

  public static item(entry: RecordEntry): RecordListItem {
    return {
      id: entry.entidadId,
      title: `${RecordPresenter.typeLabel(entry.entidadTipo)} · versión ${entry.version}`,
      description: `Actualizado por ${entry.autor} el ${entry.fecha.toISOString().slice(0, 10)} · huella ${RecordPresenter.shortHash(entry.hash)}`,
      estado: entry.confidencialidad,
      entidadTipo: entry.entidadTipo,
      entidadId: entry.entidadId,
      version: entry.version,
      hash: entry.hash,
      fecha: entry.fecha.toISOString(),
    };
  }

  public static version(entry: RecordEntry): RecordVersionItem {
    return {
      id: entry.id,
      title: `Versión ${entry.version}`,
      description: `${entry.autor} · ${entry.fecha.toISOString().slice(0, 10)} · huella ${RecordPresenter.shortHash(entry.hash)}`,
      estado: entry.confidencialidad,
      version: entry.version,
      hash: entry.hash,
      fecha: entry.fecha.toISOString(),
      autor: entry.autor,
    };
  }

  public static history(entries: readonly RecordEntry[]): RecordHistory {
    const latest = entries[0];
    return {
      registro: {
        titulo: `${RecordPresenter.typeLabel(latest.entidadTipo)} · ${latest.entidadId}`,
        entidadTipo: latest.entidadTipo,
        entidadId: latest.entidadId,
      },
      historial: { versiones: entries.map((entry) => RecordPresenter.version(entry)) },
    };
  }
}
