import { useScreenRuntime } from '@hooks-screen/useScreenRuntime.js';
import { ComponentRegistry } from '@sdui-registry-component/component-registry';
import { NodeErrorBoundary } from '@sdui-react-node/NodeErrorBoundary';
import { UnknownComponentNotice } from '@sdui-react-node/UnknownComponentNotice';
import type { ComponentModel } from '@sdui-model-component/component.model';
import type { RenderContext } from '@sdui-registry/render-context';

export interface NodeRendererProps {
  node: ComponentModel;
}

const NO_PROPS: Readonly<Record<string, unknown>> = {};

export function NodeRenderer({ node }: NodeRendererProps) {
  const runtime = useScreenRuntime();

  if (!runtime.isVisible(node)) {
    return null;
  }

  const descriptor = ComponentRegistry.get(node.type);
  if (!descriptor) {
    return <UnknownComponentNotice type={node.type} id={node.id} />;
  }

  const pressAction = node.events?.press;
  const changeAction = node.events?.change;
  const valuePath = node.bind ?? (descriptor.kind === 'control' ? `local[${node.id}]` : undefined);
  const visibleChildren = node.children.filter((child) => runtime.isVisible(child));

  const context: RenderContext = {
    node,
    props: node.props ?? NO_PROPS,
    value: valuePath === undefined ? undefined : runtime.getValue(valuePath),
    error: runtime.errorFor(node),
    required: node.required === true,
    disabled: !runtime.isEnabled(node) || node.props?.['disabled'] === true,
    busy: pressAction !== undefined && runtime.isBusy(pressAction),
    sync: runtime.sync,
    visibleChildren,
    setValue: (next, timing = 'immediate') => {
      if (valuePath !== undefined) runtime.setValue(valuePath, next, node.id);
      if (changeAction !== undefined) runtime.scheduleChange(node.id, changeAction, timing);
    },
    press: (extraParams) => {
      if (pressAction !== undefined) void runtime.dispatch(pressAction, extraParams);
    },
    hasPress: () => pressAction !== undefined,
    actionAllowed: () => pressAction === undefined || runtime.actionAllowed(pressAction),
    renderChild: (child) => <NodeRenderer key={child.id} node={child} />,
    renderChildren: () => visibleChildren.map((child, index) => <NodeRenderer key={`${index}-${child.id}`} node={child} />),
  };

  return (
    <NodeErrorBoundary type={node.type} id={node.id}>
      {descriptor.render(context)}
    </NodeErrorBoundary>
  );
}
