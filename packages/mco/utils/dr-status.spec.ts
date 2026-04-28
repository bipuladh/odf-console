/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from '@jest/globals';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import {
  DRPlacementControlConditionReason,
  Phase,
  Progression,
} from '@odf/mco/types';
import { K8sResourceConditionStatus } from '@openshift-console/dynamic-plugin-sdk';
import {
  DRStatus,
  getEffectiveDRStatus,
  getDRStatus,
  shouldShowProtectionError,
} from './dr-status';

/**
 * Comprehensive tests for DR status determination logic.
 * Ensures consistent status calculation across topology and train view.
 */

describe('getEffectiveDRStatus - Active Operations Priority', () => {
  describe('Critical Fix: Protection errors during active operations', () => {
    it('should prioritize Relocating over ProtectionError', () => {
      const status = getEffectiveDRStatus(
        Phase.Relocating,
        undefined,
        true, // hasProtectionError
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
        undefined
      );

      expect(status).toBe(DRStatus.Relocating);
      expect(status).not.toBe(DRStatus.ProtectionError);
    });

    it('should prioritize FailingOver over ProtectionError', () => {
      const status = getEffectiveDRStatus(
        Phase.FailingOver,
        undefined,
        true, // hasProtectionError
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
        undefined
      );

      expect(status).toBe(DRStatus.FailingOver);
      expect(status).not.toBe(DRStatus.ProtectionError);
    });

    it('should prioritize Deleting over ProtectionError', () => {
      const status = getEffectiveDRStatus(
        Phase.Deleting,
        undefined,
        true, // hasProtectionError
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
        undefined
      );

      expect(status).toBe(DRStatus.Deleting);
      expect(status).not.toBe(DRStatus.ProtectionError);
    });

    it('should show ProtectionError when NOT in active operation', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        undefined,
        true, // hasProtectionError
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
        '2023-10-01T12:00:00Z' // volumeLastGroupSyncTime
      );

      expect(status).toBe(DRStatus.ProtectionError);
    });
  });

  describe('Progression-based status', () => {
    it('should return WaitOnUserToCleanUp for cleanup progression', () => {
      const status = getEffectiveDRStatus(
        Phase.FailedOver,
        Progression.WaitOnUserToCleanUp
      );
      expect(status).toBe(DRStatus.WaitOnUserToCleanUp);
    });

    it('should return WaitForUser for user action progression', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        Progression.WaitForUserAction
      );
      expect(status).toBe(DRStatus.WaitForUser);
    });

    it('should return Deleting for CleaningUp progression', () => {
      const status = getEffectiveDRStatus(
        Phase.FailingOver,
        Progression.CleaningUp
      );
      expect(status).toBe(DRStatus.Deleting);
    });

    it('should NOT return Deleting for CleaningUp when phase is Deployed', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        Progression.CleaningUp
      );
      expect(status).not.toBe(DRStatus.Deleting);
      expect(status).toBe(DRStatus.Healthy); // Falls through to phase mapping
    });

    it('should return Critical for failed operations', () => {
      expect(
        getEffectiveDRStatus(Phase.FailingOver, Progression.FailedToFailover)
      ).toBe(DRStatus.Critical);

      expect(
        getEffectiveDRStatus(Phase.Relocating, Progression.FailedToRelocate)
      ).toBe(DRStatus.Critical);
    });
  });

  describe('Phase-based status mapping', () => {
    it('should map phases to DRStatus correctly', () => {
      expect(getEffectiveDRStatus(Phase.WaitForUser)).toBe(
        DRStatus.WaitForUser
      );
      expect(getEffectiveDRStatus(Phase.Deleting)).toBe(DRStatus.Deleting);
      expect(getEffectiveDRStatus(Phase.FailingOver)).toBe(
        DRStatus.FailingOver
      );
      expect(getEffectiveDRStatus(Phase.Relocating)).toBe(DRStatus.Relocating);
      expect(getEffectiveDRStatus(Phase.FailedOver)).toBe(DRStatus.FailedOver);
      expect(getEffectiveDRStatus(Phase.Relocated)).toBe(DRStatus.Relocated);
      expect(getEffectiveDRStatus(Phase.Deployed)).toBe(DRStatus.Healthy);
    });

    it('should return Unknown for unrecognized phase', () => {
      expect(getEffectiveDRStatus('UnknownPhase' as any)).toBe(
        DRStatus.Unknown
      );
    });
  });

  describe('Protecting status detection', () => {
    it('should show Protecting when status is Unknown and no sync started', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        undefined,
        false,
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.Unknown,
          reason: DRPlacementControlConditionReason.Unknown,
        },
        undefined // No sync started
      );

      expect(status).toBe(DRStatus.Protecting);
    });

    it('should show Protecting when progressing without sync', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        undefined,
        false,
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Progressing,
        },
        undefined // No sync started
      );

      expect(status).toBe(DRStatus.Protecting);
    });

    it('should NOT show Protecting after sync has started', () => {
      const status = getEffectiveDRStatus(
        Phase.Deployed,
        undefined,
        false,
        {
          type: 'Protected',
          status: K8sResourceConditionStatus.Unknown,
          reason: DRPlacementControlConditionReason.Unknown,
        },
        '2023-10-01T12:00:00Z' // Sync started
      );

      expect(status).not.toBe(DRStatus.Protecting);
      expect(status).toBe(DRStatus.Healthy);
    });
  });
});

describe('getDRStatus - Comprehensive Status Logic', () => {
  const baseParams = {
    isCleanupRequired: false,
    phase: Phase.Deployed,
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    schedulingInterval: '5m',
  };

  describe('Priority order verification', () => {
    it('1. Cleanup has highest priority', () => {
      const status = getDRStatus({
        ...baseParams,
        isCleanupRequired: true,
        phase: Phase.FailingOver, // Even during active operation
      });

      expect(status).toBe(DRStatus.WaitOnUserToCleanUp);
    });

    it('2. WaitForUser has second priority', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.WaitForUser,
      });

      expect(status).toBe(DRStatus.WaitForUser);
    });

    it('3. Deleting has third priority', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.Deleting,
      });

      expect(status).toBe(DRStatus.Deleting);
    });

    it('4. Active operations (FailingOver)', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.FailingOver,
      });

      expect(status).toBe(DRStatus.FailingOver);
    });

    it('5. Active operations (Relocating)', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.Relocating,
      });

      expect(status).toBe(DRStatus.Relocating);
    });
  });

  describe('FailedOver/Relocated phase handling', () => {
    it('should show FailedOver when sync has not started', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.FailedOver,
        volumeLastGroupSyncTime: undefined,
      });

      expect(status).toBe(DRStatus.FailedOver);
    });

    it('should show Relocated when sync has not started', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.Relocated,
        volumeLastGroupSyncTime: undefined,
      });

      expect(status).toBe(DRStatus.Relocated);
    });

    it('should show FailedOver when progression is active', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.FailedOver,
        progression: Progression.Deploying,
        volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      });

      expect(status).toBe(DRStatus.FailedOver);
    });

    it('should show health status after sync started and progression completed', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.FailedOver,
        progression: Progression.Completed,
        volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      });

      expect(status).toBe(DRStatus.Healthy);
    });

    it('should skip sync gate for 0m scheduling interval (FusionAccess)', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.Relocated,
        schedulingInterval: '0m',
        volumeLastGroupSyncTime: undefined,
        progression: Progression.Completed,
      });

      // Should fall through to health check since 0m means no replication
      expect(status).toBe(DRStatus.Healthy);
    });
  });

  describe('Protection status handling', () => {
    it('should show Protecting during initial setup', () => {
      const status = getDRStatus({
        ...baseParams,
        volumeLastGroupSyncTime: undefined,
        protectedCondition: {
          type: 'Protected',
          status: K8sResourceConditionStatus.Unknown,
          reason: DRPlacementControlConditionReason.Unknown,
        },
      });

      expect(status).toBe(DRStatus.Protecting);
    });

    it('should show ProtectionError after progression completes', () => {
      const status = getDRStatus({
        ...baseParams,
        progression: Progression.Completed,
        protectedCondition: {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
      });

      expect(status).toBe(DRStatus.ProtectionError);
    });

    it('should show ProtectionError during Deploying phase', () => {
      const status = getDRStatus({
        ...baseParams,
        phase: Phase.Deploying,
        progression: Progression.Deploying,
        protectedCondition: {
          type: 'Protected',
          status: K8sResourceConditionStatus.False,
          reason: DRPlacementControlConditionReason.Error,
        },
      });

      expect(status).toBe(DRStatus.ProtectionError);
    });
  });

  describe('Replication health status', () => {
    it('should return Critical when volume health is critical', () => {
      const status = getDRStatus({
        ...baseParams,
        volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
      });

      expect(status).toBe(DRStatus.Critical);
    });

    it('should return Critical when kube object health is critical', () => {
      const status = getDRStatus({
        ...baseParams,
        kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
      });

      expect(status).toBe(DRStatus.Critical);
    });

    it('should return Warning when volume health is warning', () => {
      const status = getDRStatus({
        ...baseParams,
        volumeReplicationHealth: VolumeReplicationHealth.WARNING,
      });

      expect(status).toBe(DRStatus.Warning);
    });

    it('should return Healthy when both healths are healthy', () => {
      const status = getDRStatus({
        ...baseParams,
        volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      });

      expect(status).toBe(DRStatus.Healthy);
    });

    it('should prioritize Critical over Warning', () => {
      const status = getDRStatus({
        ...baseParams,
        volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
      });

      expect(status).toBe(DRStatus.Critical);
    });
  });
});

describe('shouldShowProtectionError', () => {
  it('should return true for Error reason with False status', () => {
    expect(
      shouldShowProtectionError({
        type: 'Protected',
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Error,
      })
    ).toBe(true);
  });

  it('should return true for Error reason with True status', () => {
    expect(
      shouldShowProtectionError({
        type: 'Protected',
        status: K8sResourceConditionStatus.True,
        reason: DRPlacementControlConditionReason.Error,
      })
    ).toBe(true);
  });

  it('should return false for Error reason with Unknown status', () => {
    expect(
      shouldShowProtectionError({
        type: 'Protected',
        status: K8sResourceConditionStatus.Unknown,
        reason: DRPlacementControlConditionReason.Error,
      })
    ).toBe(false);
  });

  it('should return false for non-Error reasons', () => {
    expect(
      shouldShowProtectionError({
        type: 'Protected',
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Progressing,
      })
    ).toBe(false);

    expect(
      shouldShowProtectionError({
        type: 'Protected',
        status: K8sResourceConditionStatus.Unknown,
        reason: DRPlacementControlConditionReason.Unknown,
      })
    ).toBe(false);
  });

  it('should return false for undefined condition', () => {
    expect(shouldShowProtectionError(undefined)).toBe(false);
  });
});

describe('Real-world scenarios', () => {
  it('User-reported bug: Relocating with WaitForReadiness and protection error', () => {
    // YAML from user:
    // phase: Relocating
    // progression: WaitForReadiness
    // conditions: status: False, reason: Error (waiting for PVCs)

    const topologyStatus = getEffectiveDRStatus(
      Phase.Relocating,
      'WaitForReadiness', // Not a standard Progression enum, but handled
      true, // hasProtectionError
      {
        type: 'Protected',
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Error,
      },
      undefined
    );

    // Should show Relocating (in-progress), NOT ProtectionError
    expect(topologyStatus).toBe(DRStatus.Relocating);
    expect(topologyStatus).not.toBe(DRStatus.ProtectionError);
  });

  it('Failover in progress with temporary protection error', () => {
    const status = getEffectiveDRStatus(
      Phase.FailingOver,
      undefined,
      true, // hasProtectionError
      {
        type: 'Protected',
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Error,
      },
      undefined
    );

    expect(status).toBe(DRStatus.FailingOver);
    expect(status).not.toBe(DRStatus.ProtectionError);
  });

  it('Deployed app with persistent protection error after sync started', () => {
    const status = getEffectiveDRStatus(
      Phase.Deployed,
      undefined,
      true, // hasProtectionError
      {
        type: 'Protected',
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Error,
      },
      '2023-10-01T12:00:00Z' // Sync has started
    );

    // This is a real error that should be shown
    expect(status).toBe(DRStatus.ProtectionError);
  });

  it('Initial deployment showing Protecting state', () => {
    const status = getDRStatus({
      isCleanupRequired: false,
      phase: Phase.Deployed,
      volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
      volumeLastGroupSyncTime: undefined, // No sync yet
      protectedCondition: {
        type: 'Protected',
        status: K8sResourceConditionStatus.Unknown,
        reason: DRPlacementControlConditionReason.Unknown,
      },
      schedulingInterval: '5m',
    });

    expect(status).toBe(DRStatus.Protecting);
  });

  it('Completed failover transitioning to sync', () => {
    const status = getDRStatus({
      isCleanupRequired: false,
      phase: Phase.FailedOver,
      volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
      volumeLastGroupSyncTime: undefined, // Sync not started yet
      schedulingInterval: '5m',
    });

    // Should show FailedOver until sync starts
    expect(status).toBe(DRStatus.FailedOver);
  });

  it('Completed failover with sync started showing health', () => {
    const status = getDRStatus({
      isCleanupRequired: false,
      phase: Phase.FailedOver,
      volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      progression: Progression.Completed,
      schedulingInterval: '5m',
    });

    // After sync starts and progression completes, show health
    expect(status).toBe(DRStatus.Healthy);
  });
});
