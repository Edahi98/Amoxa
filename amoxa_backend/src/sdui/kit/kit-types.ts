export type Props = Record<string, unknown>;

export interface OptionSpec {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export type TextVariant = 'title' | 'heading' | 'body' | 'caption' | 'label';

export type Tone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export type ChartKind = 'bar' | 'line' | 'doughnut' | 'pie' | 'radar';

export type SyncState = 'synced' | 'pending' | 'offline' | 'error';

export type FindingKind = 'nc_mayor' | 'nc_menor' | 'observacion' | 'oportunidad';

export type TableCellKind = 'text' | 'badge' | 'date' | 'number';

export interface TableColumn {
  key: string;
  label: string;
  kind?: TableCellKind;
  sortable?: boolean;
  tones?: Readonly<Record<string, BadgeTone>>;
}
