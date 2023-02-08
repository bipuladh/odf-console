import * as React from 'react';
import { SubscriptionKind, SubscriptionState } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ActivityItem } from '@openshift-console/dynamic-plugin-sdk-internal';

type SubscriptionStatus = { status: SubscriptionState; title?: string };

export const upgradeRequiresApproval = (
  subscription: SubscriptionKind
): boolean =>
  subscription?.status?.state ===
    SubscriptionState.SubscriptionStateUpgradePending &&
  (subscription.status?.conditions ?? []).filter(
    ({ status, reason }) => status === 'True' && reason === 'RequiresApproval'
  ).length > 0;

const getSubscriptionStatus = (
  subscription: SubscriptionKind
): SubscriptionStatus => {
  const status =
    subscription?.status?.state ?? SubscriptionState.SubscriptionStateNone;
  switch (status) {
    case SubscriptionState.SubscriptionStateUpgradeAvailable:
      return {
        status,
      };
    case SubscriptionState.SubscriptionStateUpgradePending:
      return upgradeRequiresApproval(subscription)
        ? {
            status: SubscriptionState.SubscriptionStateUpgradeAvailable,
          }
        : {
            status,
          };
    case SubscriptionState.SubscriptionStateAtLatest:
      return {
        status,
      };
    default:
      return {
        status,
      };
  }
};

export const isOCSUpgradeActivity = (subscription: SubscriptionKind): boolean =>
  getSubscriptionStatus(subscription).status ===
  SubscriptionState.SubscriptionStateUpgradePending;

export const OCSUpgradeActivity: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <ActivityItem>{t("Upgrading Data Foundation's Operator")}</ActivityItem>
  );
};
