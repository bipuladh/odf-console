import { StorageClusterModel } from '@odf/ocs/models';
import { NodeModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  NodeDeploymentMap,
  commonFilter,
  nodeFilter,
} from '@odf/shared/topology';
import { resolveResourceUntilDeployment } from '@odf/shared/topology/utils/resource';
import { NodeKind, PodKind } from '@odf/shared/types';
import {
  Alert,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { getRack, getZone } from '../../utils';

export const generateNodeDeploymentsMap = (
  nodes: NodeKind[],
  pods: PodKind[],
  ...resources: K8sResourceCommon[]
): NodeDeploymentMap => {
  return nodes.reduce<NodeDeploymentMap>((map, node) => {
    const podsInNode = pods.filter(
      (pod) => pod.spec.nodeName === getName(node)
    );
    const deploymentsInNode = podsInNode
      .map((pod) =>
        resolveResourceUntilDeployment(
          pod.metadata.ownerReferences[0].uid,
          ...resources
        )
      )
      .filter((item) => item !== null);
    map[getName(node)] = deploymentsInNode;
    return map;
  }, {});
};

export const getTopologyDomain = (node: NodeKind) =>
  getZone(node) || getRack(node);

export const groupNodesByZones = (nodes: NodeKind[]): NodeKind[][] => {
  const groupedNodes = nodes.reduce((acc, curr) => {
    const zone = getTopologyDomain(curr);
    acc[zone] = [...(acc[zone] || []), curr];
    return acc;
  }, {});
  return Object.values(groupedNodes);
};

const storageClusterAlertFilter =
  () =>
  (alert: Alert): boolean => {
    const rookRegex = /.*rook.*/;
    return (
      alert?.annotations?.storage_type === 'ceph' ||
      Object.values(alert?.labels)?.some((item) => rookRegex.test(item)) ||
      _.get(alert, 'annotations.storage_type') === 'NooBaa' ||
      alert?.annotations?.storage_type === 'RGW'
    );
  };

export const filterFactory = (kind: string) => {
  if (kind === StorageClusterModel.kind) {
    return storageClusterAlertFilter;
  }

  if (kind === NodeModel.kind) {
    return nodeFilter;
  }
  return commonFilter;
};
