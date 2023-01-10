import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const DRPolicyModel: K8sModel = {
  label: 'DR Policy',
  labelPlural: 'DR Policies',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drpolicies',
  abbr: 'DRP',
  namespaced: false,
  kind: 'DRPolicy',
  crd: true,
};

export const DRClusterModel: K8sModel = {
  label: 'DR Cluster',
  labelPlural: 'DR Clusters',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drclusters',
  abbr: 'DRC',
  namespaced: false,
  kind: 'DRCluster',
  crd: true,
};

export const ACMManagedClusterModel: K8sModel = {
  apiVersion: 'v1',
  apiGroup: 'clusterview.open-cluster-management.io',
  kind: 'ManagedCluster',
  plural: 'managedclusters',
  label: 'Managed Cluster',
  labelPlural: 'Managed Clusters',
  crd: true,
  abbr: 'MCL',
  namespaced: false,
};

export const MirrorPeerModel: K8sModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'multicluster.odf.openshift.io',
  kind: 'MirrorPeer',
  plural: 'mirrorpeers',
  label: 'Mirror Peer',
  labelPlural: 'Mirror Peers',
  crd: true,
  abbr: 'MP',
  namespaced: false,
};

export const DRPlacementControlModel: K8sModel = {
  label: 'DR Placement Control',
  labelPlural: 'DR Placement Controls',
  apiVersion: 'v1alpha1',
  apiGroup: 'ramendr.openshift.io',
  plural: 'drplacementcontrols',
  abbr: 'DRPC',
  namespaced: true,
  kind: 'DRPlacementControl',
  crd: true,
};

export const ACMPlacementRuleModel: K8sModel = {
  label: 'Placement Rule',
  labelPlural: 'Placement Rules',
  apiVersion: 'v1',
  apiGroup: 'apps.open-cluster-management.io',
  plural: 'placementrules',
  abbr: 'PRL',
  namespaced: true,
  kind: 'PlacementRule',
  crd: true,
};

export const ACMSubscriptionModel: K8sModel = {
  label: 'Subscription',
  labelPlural: 'Subscriptions',
  apiVersion: 'v1',
  apiGroup: 'apps.open-cluster-management.io',
  plural: 'subscriptions',
  abbr: 'SUBS',
  namespaced: true,
  kind: 'Subscription',
  crd: true,
};
