import type { ReactNode } from 'react';
import { ChecklistItem, type ChecklistCriterion, type ChecklistResult, type ChecklistValue } from '@molecules-audit/ChecklistItem.js';
import { EvidenceCapture, type EvidenceItem } from '@molecules-audit/EvidenceCapture.js';
import { SignatureField, type SignatureValue } from '@molecules-audit/SignatureField.js';
import { GeoStamp, type GeoStampValue } from '@molecules-audit/GeoStamp.js';
import { FindingCard, type FindingKind } from '@molecules-audit/FindingCard.js';
import { ActionCard, type ActionStatus } from '@molecules-audit/ActionCard.js';
import { AuditCard, type AuditMethod } from '@molecules-audit/AuditCard.js';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import { RecordNormalizer } from '@sdui-registry-adapters/record-normalizer';
import type { RenderContext } from '@sdui-registry/render-context';

export class AuditMappers {
  private static readonly RESULTS: readonly ChecklistResult[] = ['conforme', 'no_conforme', 'no_aplica'];
  private static readonly CRITERIA: readonly ChecklistCriterion[] = ['norma', 'procedimiento'];
  private static readonly FINDING_KINDS: readonly FindingKind[] = ['nc_mayor', 'nc_menor', 'observacion', 'oportunidad'];
  private static readonly ACTION_STATUSES: readonly ActionStatus[] = ['abierta', 'reportada', 'verificada', 'reabierta', 'vencida'];
  private static readonly AUDIT_METHODS: readonly AuditMethod[] = ['in_situ', 'remoto', 'mixto'];

  public static checklistItem(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? ctx.value : {};
    const value: ChecklistValue = {
      result: PropReader.narrow(record['result'], AuditMappers.RESULTS),
      comment: typeof record['comment'] === 'string' ? record['comment'] : undefined,
    };
    const children = ctx.renderChildren();

    return (
      <ChecklistItem
        id={ctx.node.id}
        question={PropReader.string(ctx.props, 'question') ?? ctx.node.id}
        clause={PropReader.string(ctx.props, 'clause') ?? ctx.node.clauseRef}
        criterion={PropReader.oneOf(ctx.props, 'criterion', AuditMappers.CRITERIA)}
        value={value}
        disabled={ctx.disabled}
        onValueChange={(next) => ctx.setValue({ ...record, ...next })}
      >
        {children.length > 0 ? children : undefined}
      </ChecklistItem>
    );
  }

  public static evidenceCapture(ctx: RenderContext): ReactNode {
    const items = Array.isArray(ctx.value) ? ctx.value.filter((entry): entry is EvidenceItem => PropReader.isRecord(entry)) : [];
    return (
      <EvidenceCapture
        id={ctx.node.id}
        label={PropReader.string(ctx.props, 'label')}
        accept={PropReader.string(ctx.props, 'accept')}
        requireGeo={PropReader.boolean(ctx.props, 'requireGeo')}
        value={items}
        disabled={ctx.disabled}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static signature(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? ctx.value : undefined;
    const value: SignatureValue | null =
      record && typeof record['dataUrl'] === 'string' && typeof record['signedAt'] === 'string'
        ? { dataUrl: record['dataUrl'], signedAt: record['signedAt'] }
        : null;
    return (
      <SignatureField
        id={ctx.node.id}
        label={PropReader.string(ctx.props, 'label') ?? 'Firma'}
        signerName={PropReader.string(ctx.props, 'signerName')}
        value={value}
        disabled={ctx.disabled}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static geoStamp(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? ctx.value : undefined;
    const value: GeoStampValue | null =
      record && typeof record['latitude'] === 'number' && typeof record['longitude'] === 'number'
        ? {
            latitude: record['latitude'],
            longitude: record['longitude'],
            accuracy: typeof record['accuracy'] === 'number' ? record['accuracy'] : undefined,
            capturedAt: typeof record['capturedAt'] === 'string' ? record['capturedAt'] : new Date(0).toISOString(),
          }
        : null;
    return (
      <GeoStamp
        id={ctx.node.id}
        label={PropReader.string(ctx.props, 'label')}
        value={value}
        disabled={ctx.disabled}
        onValueChange={(next) => ctx.setValue(next)}
      />
    );
  }

  public static findingCard(ctx: RenderContext): ReactNode {
    const data = AuditMappers.merged(ctx);
    return (
      <FindingCard
        id={ctx.node.id}
        title={PropReader.string(data, 'title') ?? 'Hallazgo'}
        description={PropReader.string(data, 'description')}
        kind={PropReader.oneOf(data, 'kind', AuditMappers.FINDING_KINDS) ?? 'observacion'}
        clause={PropReader.string(data, 'clause') ?? ctx.node.clauseRef}
        process={PropReader.string(data, 'process')}
        status={PropReader.string(data, 'status')}
        evidenceCount={PropReader.number(data, 'evidenceCount')}
        onPress={AuditMappers.pressHandler(ctx, data)}
      />
    );
  }

  public static actionCard(ctx: RenderContext): ReactNode {
    const data = AuditMappers.merged(ctx);
    return (
      <ActionCard
        id={ctx.node.id}
        title={PropReader.string(data, 'title') ?? 'Acción'}
        owner={PropReader.string(data, 'owner')}
        dueDate={PropReader.string(data, 'dueDate')}
        status={PropReader.oneOf(data, 'status', AuditMappers.ACTION_STATUSES) ?? 'abierta'}
        daysLeft={PropReader.number(data, 'daysLeft')}
        requiresVerification={PropReader.boolean(data, 'requiresVerification')}
        onPress={AuditMappers.pressHandler(ctx, data)}
      />
    );
  }

  public static auditCard(ctx: RenderContext): ReactNode {
    const data = AuditMappers.merged(ctx);
    return (
      <AuditCard
        id={ctx.node.id}
        title={PropReader.string(data, 'title') ?? 'Auditoría'}
        scope={PropReader.string(data, 'scope')}
        method={PropReader.oneOf(data, 'method', AuditMappers.AUDIT_METHODS)}
        startDate={PropReader.string(data, 'startDate')}
        endDate={PropReader.string(data, 'endDate')}
        status={PropReader.string(data, 'status')}
        leader={PropReader.string(data, 'leader')}
        onPress={AuditMappers.pressHandler(ctx, data)}
      />
    );
  }

  private static merged(ctx: RenderContext): Record<string, unknown> {
    return { ...ctx.props, ...RecordNormalizer.record(ctx.value) };
  }

  private static pressHandler(ctx: RenderContext, data: Record<string, unknown>): (() => void) | undefined {
    if (!ctx.hasPress()) return undefined;
    const itemId = PropReader.scalarText(data['id']) ?? ctx.node.id;
    return () => ctx.press({ itemId });
  }
}
