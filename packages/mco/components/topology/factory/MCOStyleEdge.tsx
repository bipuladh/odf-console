import * as React from 'react';
import {
  DefaultEdge,
  Edge,
  EdgeStyle,
  EdgeTerminalType,
  observer,
  WithSelectionProps,
} from '@patternfly/react-topology';
import './MCOStyleEdge.scss';

type MCOStyleEdgeProps = {
  element: Edge;
} & Partial<WithSelectionProps & { hover?: boolean }>;

const MCOStyleEdgeComponent: React.FC<MCOStyleEdgeProps> = ({
  element,
  ...rest
}) => {
  const data = element.getData();
  const isOperation = data?.isOperation;

  // For operation edges, show direction with an arrow at the target
  // This visualizes the flow: source cluster -> failover node -> target cluster
  return (
    <DefaultEdge
      element={element}
      {...rest}
      endTerminalType={
        isOperation ? EdgeTerminalType.directional : EdgeTerminalType.none
      }
      startTerminalType={EdgeTerminalType.none}
      edgeStyle={EdgeStyle.dashed} // Dashed to show it's an operation in progress
      className="mco-topology-edge--active-operation"
    />
  );
};

export const MCOStyleEdge = observer(MCOStyleEdgeComponent);
