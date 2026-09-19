export interface AttendeeView {
  usuarioId: string;
  nombre: string;
  rolUsuario: string;
  rolReunion: 'preside' | 'asiste';
  confirmadaEn: string | null;
}

export interface ReunionView {
  id: string | null;
  tipo: 'apertura' | 'cierre';
  registrada: boolean;
  dirigidaPor: string | null;
  notas: string | null;
  realizadaEn: string | null;
  asistentes: AttendeeView[];
}
