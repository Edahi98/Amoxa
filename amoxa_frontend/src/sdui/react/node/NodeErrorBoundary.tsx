import { Component, type ReactNode } from 'react';
import { UnknownComponentNotice } from '@sdui-react-node/UnknownComponentNotice';

export interface NodeErrorBoundaryProps {
  type: string;
  id: string;
  children: ReactNode;
}

interface NodeErrorBoundaryState {
  failed: boolean;
}

export class NodeErrorBoundary extends Component<NodeErrorBoundaryProps, NodeErrorBoundaryState> {
  public state: NodeErrorBoundaryState = { failed: false };

  public static getDerivedStateFromError(): NodeErrorBoundaryState {
    return { failed: true };
  }

  public render(): ReactNode {
    if (this.state.failed) {
      return <UnknownComponentNotice type={this.props.type} id={this.props.id} />;
    }
    return this.props.children;
  }
}
