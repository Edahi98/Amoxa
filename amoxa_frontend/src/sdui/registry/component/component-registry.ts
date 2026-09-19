import { COMPONENT_TYPES, type ComponentType } from '@sdui-model/sdui-enums';
import type { ComponentDescriptor, ComponentKind } from '@sdui-registry-component/component-descriptor';
import { LayoutMappers } from '@sdui-registry-mappers/layout-mappers';
import { DisplayMappers } from '@sdui-registry-mappers/display-mappers';
import { FormMappers } from '@sdui-registry-mappers/form-mappers';
import { AuditMappers } from '@sdui-registry-mappers/audit-mappers';
import { DataMappers } from '@sdui-registry-mappers/data-mappers';

export class ComponentRegistry {
  private static readonly DESCRIPTORS: readonly ComponentDescriptor[] = [
    { type: 'container', kind: 'container', component: 'Stack', render: LayoutMappers.container },
    { type: 'section', kind: 'container', component: 'Section', render: LayoutMappers.section },
    { type: 'card', kind: 'container', component: 'Card', render: LayoutMappers.card },
    { type: 'list', kind: 'container', component: 'List', render: LayoutMappers.list },
    { type: 'tabs', kind: 'container', component: 'Tabs', render: LayoutMappers.tabs },
    { type: 'empty_state', kind: 'container', component: 'EmptyState', render: LayoutMappers.emptyState },
    { type: 'divider', kind: 'display', component: 'Divider', render: LayoutMappers.divider },
    { type: 'text', kind: 'display', component: 'Text', render: DisplayMappers.text },
    { type: 'badge', kind: 'display', component: 'Badge', render: DisplayMappers.badge },
    { type: 'kpi', kind: 'display', component: 'Kpi', render: DisplayMappers.kpi },
    { type: 'progress', kind: 'display', component: 'ProgressBar', render: DisplayMappers.progress },
    { type: 'clause_tag', kind: 'display', component: 'ClauseTag', render: DisplayMappers.clauseTag },
    { type: 'banner', kind: 'display', component: 'Banner', render: DisplayMappers.banner },
    { type: 'sync_status', kind: 'display', component: 'SyncStatus', render: DisplayMappers.syncStatus },
    { type: 'button', kind: 'pressable', component: 'Button', render: DisplayMappers.button },
    { type: 'text_input', kind: 'control', component: 'Input', render: FormMappers.textInput },
    { type: 'textarea', kind: 'control', component: 'Textarea', render: FormMappers.textarea },
    { type: 'number_input', kind: 'control', component: 'NumberInput', render: FormMappers.numberInput },
    { type: 'date_input', kind: 'control', component: 'DateInput', render: FormMappers.dateInput },
    { type: 'select', kind: 'control', component: 'Select', render: FormMappers.select },
    { type: 'multiselect', kind: 'control', component: 'MultiSelect', render: FormMappers.multiselect },
    { type: 'toggle', kind: 'control', component: 'Toggle', render: FormMappers.toggle },
    { type: 'radio_group', kind: 'control', component: 'RadioGroup', render: FormMappers.radioGroup },
    { type: 'person_picker', kind: 'control', component: 'OptionPicker', render: FormMappers.picker },
    { type: 'process_picker', kind: 'control', component: 'OptionPicker', render: FormMappers.picker },
    { type: 'clause_picker', kind: 'control', component: 'OptionPicker', render: FormMappers.picker },
    { type: 'checklist_item', kind: 'control', component: 'ChecklistItem', render: AuditMappers.checklistItem },
    { type: 'evidence_capture', kind: 'control', component: 'EvidenceCapture', render: AuditMappers.evidenceCapture },
    { type: 'signature', kind: 'control', component: 'SignatureField', render: AuditMappers.signature },
    { type: 'geo_stamp', kind: 'control', component: 'GeoStamp', render: AuditMappers.geoStamp },
    { type: 'finding_card', kind: 'pressable', component: 'FindingCard', render: AuditMappers.findingCard },
    { type: 'action_card', kind: 'pressable', component: 'ActionCard', render: AuditMappers.actionCard },
    { type: 'audit_card', kind: 'pressable', component: 'AuditCard', render: AuditMappers.auditCard },
    { type: 'program_calendar', kind: 'custom', component: 'ProgramCalendar', render: DataMappers.programCalendar },
    { type: 'gantt', kind: 'custom', component: 'GanttChart', render: DataMappers.gantt },
    { type: 'chart', kind: 'custom', component: 'Chart', render: DataMappers.chart },
    { type: 'table', kind: 'custom', component: 'DataTable', render: DataMappers.table },
  ];

  private static readonly INDEX: ReadonlyMap<string, ComponentDescriptor> = new Map(
    ComponentRegistry.DESCRIPTORS.map((descriptor) => [descriptor.type, descriptor]),
  );

  public static get(type: string): ComponentDescriptor | undefined {
    return ComponentRegistry.INDEX.get(type);
  }

  public static has(type: string): boolean {
    return ComponentRegistry.INDEX.has(type);
  }

  public static kindOf(type: string): ComponentKind | undefined {
    return ComponentRegistry.INDEX.get(type)?.kind;
  }

  public static types(): readonly ComponentType[] {
    return COMPONENT_TYPES.filter((type) => ComponentRegistry.INDEX.has(type));
  }

  public static missing(): readonly ComponentType[] {
    return COMPONENT_TYPES.filter((type) => !ComponentRegistry.INDEX.has(type));
  }
}
