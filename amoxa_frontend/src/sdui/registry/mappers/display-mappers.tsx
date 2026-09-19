import type { ReactNode } from 'react';
import { Text, type TextElement, type TextTone, type TextVariant } from '@atoms-display/Text.js';
import { Badge } from '@atoms-display/Badge.js';
import { ProgressBar } from '@atoms-display/ProgressBar.js';
import { ClauseTag } from '@atoms-display/ClauseTag.js';
import { SyncStatus, type SyncState } from '@atoms-display/SyncStatus.js';
import { Button, type ButtonSize, type ButtonVariant } from '@atoms-button/Button.js';
import { NavItem } from '@molecules-layout/NavItem.js';
import { NavTile } from '@molecules-layout/NavTile.js';
import { IconCatalog } from '@utils-icon/IconCatalog.js';
import { Kpi, type KpiTrend } from '@molecules-data/Kpi.js';
import { Banner, type BannerTone } from '@molecules-feedback/Banner.js';
import { ToneStyles } from '@utils-style/ToneStyles.js';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import { RecordNormalizer } from '@sdui-registry-adapters/record-normalizer';
import type { RenderContext } from '@sdui-registry/render-context';

export class DisplayMappers {
  private static readonly TEXT_VARIANTS: readonly TextVariant[] = ['title', 'heading', 'body', 'caption', 'label'];
  private static readonly TEXT_TONES: readonly TextTone[] = ['default', 'muted', 'primary', 'success', 'warning', 'danger'];
  private static readonly TEXT_ELEMENTS: readonly TextElement[] = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  private static readonly BANNER_TONES: readonly BannerTone[] = ['info', 'success', 'warning', 'danger'];
  private static readonly BUTTON_VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'outline', 'ghost', 'danger'];
  private static readonly BUTTON_SIZES: readonly ButtonSize[] = ['md', 'lg'];
  private static readonly TRENDS: readonly KpiTrend[] = ['up', 'down', 'flat'];
  private static readonly SYNC_STATES: readonly SyncState[] = ['synced', 'pending', 'offline', 'error'];

  public static text(ctx: RenderContext): ReactNode {
    const text = PropReader.scalarText(ctx.value) ?? PropReader.string(ctx.props, 'text') ?? '';
    return (
      <Text
        id={ctx.node.id}
        text={text}
        variant={PropReader.oneOf(ctx.props, 'variant', DisplayMappers.TEXT_VARIANTS)}
        tone={PropReader.oneOf(ctx.props, 'tone', DisplayMappers.TEXT_TONES)}
        as={PropReader.oneOf(ctx.props, 'as', DisplayMappers.TEXT_ELEMENTS)}
      />
    );
  }

  public static badge(ctx: RenderContext): ReactNode {
    const label = PropReader.scalarText(ctx.value) ?? PropReader.string(ctx.props, 'label') ?? '';
    return <Badge id={ctx.node.id} label={label} tone={PropReader.oneOf(ctx.props, 'tone', ToneStyles.TONES)} />;
  }

  public static kpi(ctx: RenderContext): ReactNode {
    const record = PropReader.isRecord(ctx.value) ? RecordNormalizer.record(ctx.value) : {};
    const scalar = PropReader.isRecord(ctx.value) ? record['value'] : ctx.value;
    const fallback = ctx.props['value'];
    const raw = typeof scalar === 'string' || typeof scalar === 'number' ? scalar : fallback;
    const value = typeof raw === 'string' || typeof raw === 'number' ? raw : 0;
    const deltaSource = record['delta'] ?? ctx.props['delta'];
    const delta = typeof deltaSource === 'string' || typeof deltaSource === 'number' ? deltaSource : undefined;

    return (
      <Kpi
        id={ctx.node.id}
        label={PropReader.string(ctx.props, 'label') ?? ctx.node.id}
        value={value}
        unit={PropReader.string(record, 'unit') ?? PropReader.string(ctx.props, 'unit')}
        delta={delta}
        trend={PropReader.narrow(record['trend'] ?? ctx.props['trend'], DisplayMappers.TRENDS)}
        tone={PropReader.oneOf(ctx.props, 'tone', ToneStyles.TONES)}
        icon={IconCatalog.resolve(PropReader.string(ctx.props, 'icon'))}
      />
    );
  }

  public static progress(ctx: RenderContext): ReactNode {
    const bound = typeof ctx.value === 'number' ? ctx.value : undefined;
    return (
      <ProgressBar
        id={ctx.node.id}
        value={bound ?? PropReader.number(ctx.props, 'value') ?? 0}
        label={PropReader.string(ctx.props, 'label')}
        tone={PropReader.oneOf(ctx.props, 'tone', ToneStyles.TONES)}
      />
    );
  }

  public static clauseTag(ctx: RenderContext): ReactNode {
    return (
      <ClauseTag
        id={ctx.node.id}
        clause={PropReader.string(ctx.props, 'clause') ?? ctx.node.clauseRef ?? ''}
        standard={PropReader.string(ctx.props, 'standard')}
        title={PropReader.string(ctx.props, 'title')}
      />
    );
  }

  public static banner(ctx: RenderContext): ReactNode {
    return (
      <Banner
        id={ctx.node.id}
        tone={PropReader.oneOf(ctx.props, 'tone', DisplayMappers.BANNER_TONES) ?? 'info'}
        title={PropReader.string(ctx.props, 'title')}
        message={PropReader.scalarText(ctx.value) ?? PropReader.string(ctx.props, 'message') ?? ''}
      />
    );
  }

  public static syncStatus(ctx: RenderContext): ReactNode {
    const record = RecordNormalizer.record(ctx.value);
    const declared =
      PropReader.narrow(record['state'], DisplayMappers.SYNC_STATES) ?? PropReader.oneOf(ctx.props, 'state', DisplayMappers.SYNC_STATES) ?? 'synced';
    const declaredPending = typeof record['pending'] === 'number' ? record['pending'] : PropReader.number(ctx.props, 'pending');
    const live = ctx.sync.state !== 'synced';

    return (
      <SyncStatus
        id={ctx.node.id}
        state={live ? ctx.sync.state : declared}
        pending={live ? ctx.sync.pending : declaredPending}
        lastSyncAt={ctx.sync.lastSyncAt ?? PropReader.string(record, 'lastSyncAt')}
      />
    );
  }

  public static button(ctx: RenderContext): ReactNode {
    const icon = IconCatalog.resolve(PropReader.string(ctx.props, 'icon'));
    if (PropReader.string(ctx.props, 'display') === 'nav') {
      return (
        <NavItem
          id={ctx.node.id}
          icon={icon}
          label={PropReader.string(ctx.props, 'label') ?? ctx.node.id}
          target={PropReader.string(ctx.props, 'target')}
          disabled={ctx.disabled || ctx.busy || !ctx.actionAllowed()}
          onClick={() => ctx.press()}
        />
      );
    }
    if (PropReader.string(ctx.props, 'display') === 'tile') {
      return (
        <NavTile
          id={ctx.node.id}
          icon={icon}
          title={PropReader.string(ctx.props, 'label') ?? ctx.node.id}
          description={PropReader.string(ctx.props, 'description')}
          disabled={ctx.disabled || ctx.busy || !ctx.actionAllowed()}
          aria-busy={ctx.busy || undefined}
          onClick={() => ctx.press()}
        />
      );
    }
    return (
      <Button
        id={ctx.node.id}
        icon={icon}
        variant={PropReader.oneOf(ctx.props, 'variant', DisplayMappers.BUTTON_VARIANTS)}
        size={PropReader.oneOf(ctx.props, 'size', DisplayMappers.BUTTON_SIZES)}
        disabled={ctx.disabled || ctx.busy || !ctx.actionAllowed()}
        aria-busy={ctx.busy || undefined}
        onClick={() => ctx.press()}
      >
        {PropReader.string(ctx.props, 'label') ?? ctx.node.id}
      </Button>
    );
  }
}
