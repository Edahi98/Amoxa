import type { Confidencialidad } from '@registros-versionado/record-version.service.js';

export interface RecordEntry {
  id: string;
  entidadTipo: string;
  entidadId: string;
  version: number;
  hash: string | null;
  fecha: Date;
  confidencialidad: Confidencialidad;
  autorId: string;
  autor: string;
}

export interface RecordPage {
  registros: RecordListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecordListItem {
  id: string;
  title: string;
  description: string;
  estado: Confidencialidad;
  entidadTipo: string;
  entidadId: string;
  version: number;
  hash: string | null;
  fecha: string;
}

export interface RecordHistory {
  registro: { titulo: string; entidadTipo: string; entidadId: string };
  historial: { versiones: RecordVersionItem[] };
}

export interface RecordVersionItem {
  id: string;
  title: string;
  description: string;
  estado: Confidencialidad;
  version: number;
  hash: string | null;
  fecha: string;
  autor: string;
}
