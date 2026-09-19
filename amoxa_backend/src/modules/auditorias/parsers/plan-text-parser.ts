export interface AgendaEntry {
  fecha: string | null;
  actividad: string;
}

export interface TaskEntry {
  auditorId: string;
  descripcion: string;
}

export interface TeamMemberRef {
  auditorId: string;
  nombre: string;
  email: string;
}

export interface ParsedTasks {
  tasks: TaskEntry[];
  unknown: string[];
}

export type AgendaInput = string | readonly (string | { fecha?: string | null; actividad: string })[];

export type TasksInput = string | readonly { auditorId: string; descripcion: string }[];

export class PlanTextParser {
  private static readonly DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/;

  public static parseAgenda(input: AgendaInput | undefined): AgendaEntry[] {
    if (input === undefined) return [];
    const raw: (string | { fecha?: string | null; actividad: string })[] =
      typeof input === 'string' ? input.split(/\r?\n/) : [...input];
    const entries: AgendaEntry[] = [];
    for (const item of raw) {
      if (typeof item !== 'string') {
        const actividad = item.actividad.trim();
        if (actividad !== '') entries.push({ fecha: PlanTextParser.validDate(item.fecha ?? null), actividad });
        continue;
      }
      const line = item.trim();
      if (line === '') continue;
      const match = PlanTextParser.DATE_PREFIX.exec(line);
      const fecha = match === null ? null : PlanTextParser.validDate(match[1]);
      entries.push(match !== null && fecha !== null ? { fecha, actividad: match[2].trim() } : { fecha: null, actividad: line });
    }
    return entries;
  }

  public static parseTasks(input: TasksInput | undefined, members: readonly TeamMemberRef[]): ParsedTasks {
    if (input === undefined) return { tasks: [], unknown: [] };
    const tasks: TaskEntry[] = [];
    const unknown: string[] = [];
    if (typeof input !== 'string') {
      for (const item of input) {
        const descripcion = item.descripcion.trim();
        if (descripcion === '') continue;
        if (members.some((member) => member.auditorId === item.auditorId)) {
          tasks.push({ auditorId: item.auditorId, descripcion });
        } else {
          unknown.push(item.auditorId);
        }
      }
      return { tasks, unknown };
    }
    for (const rawLine of input.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line === '') continue;
      const separator = line.indexOf(':');
      const owner = separator > 0 ? line.slice(0, separator).trim() : '';
      const descripcion = separator > 0 ? line.slice(separator + 1).trim() : '';
      const matches = members.filter((member) => PlanTextParser.matchesMember(member, owner));
      if (owner === '' || descripcion === '' || matches.length !== 1) {
        unknown.push(owner === '' ? line : owner);
        continue;
      }
      tasks.push({ auditorId: matches[0].auditorId, descripcion });
    }
    return { tasks, unknown };
  }

  public static renderAgenda(entries: readonly AgendaEntry[]): string {
    return entries.map((entry) => (entry.fecha === null ? entry.actividad : `${entry.fecha} ${entry.actividad}`)).join('\n');
  }

  public static renderTasks(tasks: readonly TaskEntry[], nameById: ReadonlyMap<string, string>): string {
    return tasks.map((task) => `${nameById.get(task.auditorId) ?? task.auditorId}: ${task.descripcion}`).join('\n');
  }

  private static matchesMember(member: TeamMemberRef, owner: string): boolean {
    const wanted = PlanTextParser.normalize(owner);
    return wanted !== '' && (PlanTextParser.normalize(member.nombre) === wanted || PlanTextParser.normalize(member.email) === wanted);
  }

  private static normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim()
      .toLowerCase();
  }

  private static validDate(value: string | null): string | null {
    if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
  }
}
