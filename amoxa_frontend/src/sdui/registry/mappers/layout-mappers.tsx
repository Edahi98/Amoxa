import type { ReactNode } from 'react';
import { Stack, type StackAlign, type StackDirection, type StackGap } from '@atoms-layout/Stack.js';
import { Grid, type GridColumns, type GridGap } from '@atoms-layout/Grid.js';
import { Button } from '@atoms-button/Button.js';
import { Divider } from '@atoms-layout/Divider.js';
import { Text } from '@atoms-display/Text.js';
import { Badge } from '@atoms-display/Badge.js';
import { Section } from '@molecules-layout/Section.js';
import { Card, type CardElement, type CardTone } from '@molecules-layout/Card.js';
import { List, type ListVariant } from '@molecules-layout/List.js';
import { Tabs, type TabItem } from '@molecules-layout/Tabs.js';
import { RecordCard } from '@molecules-audit/RecordCard.js';
import { EmptyState } from '@molecules-feedback/EmptyState.js';
import { PropReader } from '@sdui-registry-adapters/prop-reader';
import { RecordNormalizer } from '@sdui-registry-adapters/record-normalizer';
import type { RenderContext } from '@sdui-registry/render-context';

export class LayoutMappers {
  private static readonly DIRECTIONS: readonly StackDirection[] = ['column', 'row'];
  private static readonly GAPS: readonly StackGap[] = ['sm', 'md', 'lg'];
  private static readonly ALIGNS: readonly StackAlign[] = ['start', 'center', 'end', 'stretch'];
  private static readonly CARD_TONES: readonly CardTone[] = ['default', 'muted', 'glass'];
  private static readonly CARD_ELEMENTS: readonly CardElement[] = ['div', 'section', 'article'];
  private static readonly GRID_COLUMNS: readonly GridColumns[] = [1, 2, 3, 4];
  private static readonly GRID_GAPS: readonly GridGap[] = ['sm', 'md', 'lg'];
  private static readonly LIST_VARIANTS: readonly ListVariant[] = ['plain', 'divided'];

  public static container(ctx: RenderContext): ReactNode {
    if (PropReader.string(ctx.props, 'layout') === 'grid') {
      return (
        <Grid
          id={ctx.node.id}
          columns={LayoutMappers.GRID_COLUMNS.find((columns) => columns === PropReader.number(ctx.props, 'columns'))}
          gap={PropReader.oneOf(ctx.props, 'gap', LayoutMappers.GRID_GAPS)}
        >
          {ctx.renderChildren()}
        </Grid>
      );
    }
    return (
      <Stack
        id={ctx.node.id}
        direction={PropReader.oneOf(ctx.props, 'direction', LayoutMappers.DIRECTIONS)}
        gap={PropReader.oneOf(ctx.props, 'gap', LayoutMappers.GAPS)}
        align={PropReader.oneOf(ctx.props, 'align', LayoutMappers.ALIGNS)}
        wrap={PropReader.boolean(ctx.props, 'wrap')}
        className={PropReader.string(ctx.props, 'justify') === 'between' ? 'justify-between' : undefined}
      >
        {ctx.renderChildren()}
      </Stack>
    );
  }

  public static section(ctx: RenderContext): ReactNode {
    return (
      <Section
        id={ctx.node.id}
        title={PropReader.string(ctx.props, 'title')}
        description={PropReader.string(ctx.props, 'description')}
        actions={LayoutMappers.sectionAction(ctx)}
      >
        {ctx.renderChildren()}
      </Section>
    );
  }

  public static card(ctx: RenderContext): ReactNode {
    return (
      <Card
        id={ctx.node.id}
        title={PropReader.string(ctx.props, 'title')}
        subtitle={PropReader.string(ctx.props, 'subtitle')}
        tone={PropReader.oneOf(ctx.props, 'tone', LayoutMappers.CARD_TONES)}
        as={PropReader.oneOf(ctx.props, 'as', LayoutMappers.CARD_ELEMENTS) ?? 'section'}
      >
        {ctx.renderChildren()}
      </Card>
    );
  }

  public static list(ctx: RenderContext): ReactNode {
    const children = ctx.renderChildren();
    const items = children.length > 0 ? children : LayoutMappers.dataItems(ctx);
    return (
      <List
        id={ctx.node.id}
        variant={PropReader.oneOf(ctx.props, 'variant', LayoutMappers.LIST_VARIANTS)}
        emptyText={PropReader.string(ctx.props, 'emptyText')}
        className={LayoutMappers.listColumns(ctx)}
      >
        {items}
      </List>
    );
  }

  public static tabs(ctx: RenderContext): ReactNode {
    const tabs: TabItem[] = ctx.visibleChildren.map((child) => ({
      id: child.id,
      label: PropReader.string(child.props, 'label') ?? child.id,
      content: ctx.renderChild(child),
    }));
    if (tabs.length === 0) return null;
    return <Tabs id={ctx.node.id} tabs={tabs} defaultTab={PropReader.string(ctx.props, 'defaultTab')} />;
  }

  public static divider(ctx: RenderContext): ReactNode {
    return <Divider id={ctx.node.id} label={PropReader.string(ctx.props, 'label')} />;
  }

  public static emptyState(ctx: RenderContext): ReactNode {
    const children = ctx.renderChildren();
    return (
      <EmptyState
        id={ctx.node.id}
        title={PropReader.string(ctx.props, 'title') ?? 'Sin información'}
        description={PropReader.string(ctx.props, 'description')}
      >
        {children.length > 0 ? children : undefined}
      </EmptyState>
    );
  }

  private static sectionAction(ctx: RenderContext): ReactNode {
    const label = PropReader.string(ctx.props, 'actionLabel');
    if (label === undefined || !ctx.hasPress()) return undefined;
    return (
      <Button variant="ghost" onClick={() => ctx.press()}>
        {label}
      </Button>
    );
  }

  private static listColumns(ctx: RenderContext): string | undefined {
    const columns = PropReader.number(ctx.props, 'columns');
    if (columns === 3) return 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';
    if (columns === 2) return 'grid grid-cols-1 gap-4 sm:grid-cols-2';
    return undefined;
  }

  private static dataItems(ctx: RenderContext): ReactNode[] {
    if (!Array.isArray(ctx.value)) return [];
    return ctx.value.map((entry, index): ReactNode => {
      if (typeof entry === 'string' || typeof entry === 'number') return <Text key={index} text={String(entry)} />;
      const record = RecordNormalizer.record(entry);
      const title = PropReader.string(record, 'title') ?? PropReader.string(record, 'nombre') ?? PropReader.string(record, 'label');
      if (title === undefined) return null;
      const status = PropReader.string(record, 'status') ?? PropReader.string(record, 'estado');
      const itemId = PropReader.scalarText(record['id']) ?? String(index);
      return (
        <RecordCard
          key={itemId}
          id={`${ctx.node.id}-${itemId}`}
          title={title}
          description={PropReader.string(record, 'description') ?? PropReader.string(record, 'descripcion')}
          badges={status ? <Badge label={status} tone="primary" /> : undefined}
          onPress={ctx.hasPress() ? () => ctx.press({ itemId }) : undefined}
          footer={PropReader.string(record, 'meta') ? <span className="text-sm text-muted-foreground">{PropReader.string(record, 'meta')}</span> : undefined}
        />
      );
    });
  }
}
