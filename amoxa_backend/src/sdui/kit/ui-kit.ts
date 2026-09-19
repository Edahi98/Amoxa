import type { ComponentType } from '@sdui/sdui-enums.js';
import { ComponentBuilder } from '@sdui-builder/component-builder.js';
import { ScreenRegistry } from '@sdui-registry/screen-registry.js';
import { ActionKit } from '@sdui-kit/action-kit.js';
import { ClauseCatalog } from '@sdui-kit/clause-catalog.js';
import { ScreenCatalog } from '@sdui-kit/screen-catalog.js';
import type {
  BadgeTone,
  BannerTone,
  ButtonVariant,
  ChartKind,
  FindingKind,
  OptionSpec,
  Props,
  SyncState,
  TableColumn,
  TextVariant,
  Tone,
} from '@sdui-kit/kit-types.js';

export class UiKit {
  public static page(id: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { direction: 'column', gap: 'lg' }, children);
  }

  public static stack(id: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { direction: 'column', gap: 'md' }, children);
  }

  public static row(id: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { direction: 'row', gap: 'sm', align: 'center', wrap: true }, children);
  }

  public static section(id: string, title: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('section', id, { title }, children);
  }

  public static sectionWithAction(
    id: string,
    title: string,
    actionScreenId: string,
    actionLabel: string,
    ...children: ComponentBuilder[]
  ): ComponentBuilder {
    return UiKit.make('section', id, { title, actionLabel }, children).on('press', ActionKit.navId(actionScreenId));
  }

  public static bar(id: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { direction: 'row', gap: 'md', align: 'center', wrap: true, justify: 'between' }, children);
  }

  public static cards(id: string, emptyText: string, path: string, columns: 2 | 3): ComponentBuilder {
    return UiKit.make('list', id, { variant: 'plain', emptyText, columns }).bind(path);
  }

  public static card(id: string, title: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('card', id, { title, tone: 'glass' }, children);
  }

  public static table(id: string, caption: string, emptyText: string, path: string, columns: TableColumn[]): ComponentBuilder {
    return UiKit.make('table', id, { caption, emptyText, columns }).bind(path);
  }

  public static list(id: string, emptyText: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('list', id, { variant: 'divided', emptyText }, children);
  }

  public static tabs(id: string, defaultTab: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('tabs', id, { defaultTab }, children);
  }

  public static tab(id: string, label: string, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { label, direction: 'column', gap: 'md' }, children);
  }

  public static divider(id: string, label?: string): ComponentBuilder {
    return UiKit.make('divider', id, { label });
  }

  public static text(
    id: string,
    text: string,
    variant: TextVariant = 'body',
    tone: Tone = 'default',
  ): ComponentBuilder {
    return UiKit.make('text', id, { text, variant, tone });
  }

  public static boundText(
    id: string,
    path: string,
    fallback = '',
    variant: TextVariant = 'body',
    tone: Tone = 'default',
  ): ComponentBuilder {
    return UiKit.make('text', id, { text: fallback, variant, tone }).bind(path);
  }

  public static badge(id: string, label: string, tone: BadgeTone = 'neutral'): ComponentBuilder {
    return UiKit.make('badge', id, { label, tone });
  }

  public static kpi(id: string, label: string, path: string, unit?: string, tone?: Tone): ComponentBuilder {
    return UiKit.make('kpi', id, { label, value: 0, unit, tone }).bind(path);
  }

  public static progress(id: string, label: string, path: string, tone?: Tone): ComponentBuilder {
    return UiKit.make('progress', id, { label, value: 0, tone }).bind(path);
  }

  public static clauseTag(id: string, clause: string, standard?: string, title?: string): ComponentBuilder {
    return UiKit.make('clause_tag', id, { clause, standard, title }).clauseRef(clause);
  }

  public static chart(
    id: string,
    kind: ChartKind,
    title: string,
    labels: string[],
    series: string[],
    path: string,
    unit?: string,
  ): ComponentBuilder {
    const datasets = series.map((label) => ({ label, data: labels.map(() => 0) }));
    return UiKit.make('chart', id, { kind, labels, datasets, title, ariaLabel: title, unit }).bind(path);
  }

  public static textInput(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('text_input', id, { label, ...extra }).bind(path);
  }

  public static textarea(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('textarea', id, { label, rows: 4, ...extra }).bind(path);
  }

  public static numberInput(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('number_input', id, { label, ...extra }).bind(path);
  }

  public static fileInput(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('file_input', id, { label, ...extra }).bind(path);
  }

  public static codeScanner(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('code_scanner', id, { label, ...extra }).bind(path);
  }

  public static sortableList(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('sortable_list', id, { label, ...extra }).bind(path);
  }

  public static dateInput(id: string, label: string, path: string, extra: Props = {}): ComponentBuilder {
    return UiKit.make('date_input', id, { label, ...extra }).bind(path);
  }

  public static select(
    id: string,
    label: string,
    path: string,
    options: OptionSpec[],
    extra: Props = {},
  ): ComponentBuilder {
    return UiKit.make('select', id, { label, options, ...extra }).bind(path);
  }

  public static multiselect(
    id: string,
    label: string,
    path: string,
    options: OptionSpec[],
    extra: Props = {},
  ): ComponentBuilder {
    return UiKit.make('multiselect', id, { label, options, ...extra }).bind(path);
  }

  public static toggle(id: string, label: string, path: string, hint?: string): ComponentBuilder {
    return UiKit.make('toggle', id, { label, hint }).bind(path);
  }

  public static radioGroup(
    id: string,
    label: string,
    path: string,
    options: OptionSpec[],
    extra: Props = {},
  ): ComponentBuilder {
    return UiKit.make('radio_group', id, { label, options, ...extra }).bind(path);
  }

  public static checklistItem(
    id: string,
    question: string,
    clause: string,
    path: string,
    criterion: 'norma' | 'procedimiento',
    ...children: ComponentBuilder[]
  ): ComponentBuilder {
    return UiKit.make('checklist_item', id, { question, clause, criterion }, children).bind(path).clauseRef(clause);
  }

  public static evidenceCapture(id: string, label: string, path: string, requireGeo = true): ComponentBuilder {
    return UiKit.make('evidence_capture', id, { label, accept: 'image/*,video/*,application/pdf', requireGeo }).bind(path);
  }

  public static signature(id: string, label: string, path: string, signerName?: string): ComponentBuilder {
    return UiKit.make('signature', id, { label, signerName }).bind(path);
  }

  public static geoStamp(id: string, label: string, path: string): ComponentBuilder {
    return UiKit.make('geo_stamp', id, { label }).bind(path);
  }

  public static personPicker(
    id: string,
    label: string,
    path: string,
    options: OptionSpec[] = [],
    multiple = false,
  ): ComponentBuilder {
    return UiKit.make('person_picker', id, { label, options, multiple }).bind(path);
  }

  public static processPicker(
    id: string,
    label: string,
    path: string,
    options: OptionSpec[] = [],
    multiple = false,
  ): ComponentBuilder {
    return UiKit.make('process_picker', id, { label, options, multiple }).bind(path);
  }

  public static clausePicker(id: string, label: string, path: string, multiple = false): ComponentBuilder {
    return UiKit.make('clause_picker', id, { label, options: ClauseCatalog.options(), multiple }).bind(path);
  }

  public static findingCard(id: string, path: string, kind: FindingKind = 'observacion'): ComponentBuilder {
    return UiKit.make('finding_card', id, { title: 'Hallazgo', kind }).bind(path);
  }

  public static actionCard(id: string, path: string): ComponentBuilder {
    return UiKit.make('action_card', id, { title: 'Acción correctiva', status: 'abierta' }).bind(path);
  }

  public static auditCard(id: string, path: string): ComponentBuilder {
    return UiKit.make('audit_card', id, { title: 'Auditoría' }).bind(path);
  }

  public static programCalendar(id: string, path: string): ComponentBuilder {
    return UiKit.make('program_calendar', id, { events: [] }).bind(path);
  }

  public static gantt(id: string, path: string): ComponentBuilder {
    return UiKit.make('gantt', id, { items: [] }).bind(path);
  }

  public static button(
    id: string,
    label: string,
    variant: ButtonVariant,
    actionId: string,
    size: 'md' | 'lg' = 'md',
  ): ComponentBuilder {
    return UiKit.make('button', id, { label, variant, size }).on('press', actionId);
  }

  public static navButton(screenId: string, label?: string, variant: ButtonVariant = 'outline'): ComponentBuilder {
    const actionId = ActionKit.navId(screenId);
    return UiKit.button(`btn_${actionId}`, label ?? ScreenRegistry.titleOf(screenId), variant, actionId).props({
      icon: ScreenCatalog.of(screenId).icon,
    });
  }

  public static navItem(screenId: string, label?: string): ComponentBuilder {
    const actionId = ActionKit.navId(screenId);
    return UiKit.make('button', `item_${actionId}`, {
      label: label ?? ScreenRegistry.titleOf(screenId),
      variant: 'ghost',
      display: 'nav',
      icon: ScreenCatalog.of(screenId).icon,
      target: screenId,
    }).on('press', actionId);
  }

  public static navLocked(id: string, label: string, hint: string): ComponentBuilder {
    return UiKit.make('button', `bloqueado_${id}`, { label, variant: 'ghost', display: 'nav', locked: true, hint });
  }

  public static navTile(screenId: string, label?: string): ComponentBuilder {
    const actionId = ActionKit.navId(screenId);
    const presentation = ScreenCatalog.of(screenId);
    return UiKit.make('button', `tile_${actionId}`, {
      label: label ?? ScreenRegistry.titleOf(screenId),
      variant: 'outline',
      display: 'tile',
      icon: presentation.icon,
      description: presentation.description === '' ? undefined : presentation.description,
    }).on('press', actionId);
  }

  public static grid(id: string, columns: 1 | 2 | 3 | 4, ...children: ComponentBuilder[]): ComponentBuilder {
    return UiKit.make('container', id, { layout: 'grid', columns, gap: 'md' }, children);
  }

  public static banner(id: string, tone: BannerTone, message: string, title?: string): ComponentBuilder {
    return UiKit.make('banner', id, { tone, title, message });
  }

  public static emptyState(
    id: string,
    title: string,
    description?: string,
    ...children: ComponentBuilder[]
  ): ComponentBuilder {
    return UiKit.make('empty_state', id, { title, description }, children);
  }

  public static syncStatus(id: string, path: string, state: SyncState = 'synced'): ComponentBuilder {
    return UiKit.make('sync_status', id, { state, pending: 0 }).bind(path);
  }

  public static option(value: string, label: string, description?: string): OptionSpec {
    return description === undefined ? { value, label } : { value, label, description };
  }

  private static make(
    type: ComponentType,
    id: string,
    props: Props,
    children: ComponentBuilder[] = [],
  ): ComponentBuilder {
    const clean = Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));
    return ComponentBuilder.of(type, id).props(clean).children(...children);
  }
}
