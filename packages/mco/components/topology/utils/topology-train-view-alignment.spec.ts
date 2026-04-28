/* eslint-disable import/no-extraneous-dependencies */
import { describe, expect, it } from '@jest/globals';
import { DRActionType } from '@odf/mco/constants';
import { Phase, Progression } from '@odf/mco/types';
import { NodeStatus } from '@patternfly/react-topology';
import { DRStatus } from '../../../utils/dr-status';
import {
  getCurrentStepFromFlow,
  FAILOVER_FLOW,
  RELOCATE_FLOW,
  RELOCATE_DISCOVERED_FLOW,
  TrainStep,
  ProgressionStatus,
} from '../../dr-status-popover/progression-train-view';
import { getDecoratorForStatus } from './decorator-helpers';
import { getDRNodeStatus } from './sidebar-utils';

/**
 * Comprehensive test suite to ensure alignment between:
 * 1. Progression train view step mapping
 * 2. Topology node labels and decorators
 * 3. Sidebar status display
 *
 * This prevents regressions where topology shows different status than train view.
 */

describe('Topology and Train View State Alignment', () => {
  describe('Failover Flow Step Mapping', () => {
    it('should map Preparing phase progressions to Preparing step', () => {
      const preparingProgressions = [
        ProgressionStatus.CHECKING_PREREQS,
        ProgressionStatus.WAIT_FENCING,
        ProgressionStatus.WAIT_MAINTENANCE,
        ProgressionStatus.PREPARING_SYNC,
        ProgressionStatus.CLEARING_PLACEMENT,
      ];

      preparingProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, FAILOVER_FLOW);
        expect(step).toBe(TrainStep.Preparing);
      });
    });

    it('should map Failover phase progressions to Failover step', () => {
      const failoverProgressions = [
        ProgressionStatus.FAILING_OVER,
        ProgressionStatus.RUNNING_FINAL_SYNC,
        ProgressionStatus.FINAL_SYNC_COMPLETE,
        ProgressionStatus.ENSURING_SECONDARY,
      ];

      failoverProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, FAILOVER_FLOW);
        expect(step).toBe(TrainStep.Failover);
      });
    });

    it('should map Restoring phase progressions to Restoring step', () => {
      const restoringProgressions = [
        ProgressionStatus.WAIT_RESTORE,
        ProgressionStatus.ENSURING_VOLSYNC,
        ProgressionStatus.SETUP_VOLSYNC_DEST,
        ProgressionStatus.WAIT_READINESS,
        ProgressionStatus.UPDATED_PLACEMENT,
        ProgressionStatus.CREATING_MW,
        ProgressionStatus.UPDATING_PL_RULE,
      ];

      restoringProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, FAILOVER_FLOW);
        expect(step).toBe(TrainStep.Restoring);
      });
    });

    it('should map Cleanup phase progressions to CleanUp step', () => {
      const cleanupProgressions = [
        ProgressionStatus.CLEANING_UP,
        ProgressionStatus.WAIT_USER_CLEANUP,
      ];

      cleanupProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, FAILOVER_FLOW);
        expect(step).toBe(TrainStep.CleanUp);
      });
    });
  });

  describe('Relocate Flow Step Mapping', () => {
    it('should map Preparing phase progressions to Preparing step', () => {
      const preparingProgressions = [
        ProgressionStatus.CHECKING_PREREQS,
        ProgressionStatus.WAIT_FENCING,
        ProgressionStatus.WAIT_MAINTENANCE,
        ProgressionStatus.PREPARING_SYNC,
        ProgressionStatus.CLEARING_PLACEMENT,
      ];

      preparingProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, RELOCATE_FLOW);
        expect(step).toBe(TrainStep.Preparing);
      });
    });

    it('should map Syncing phase progressions to Syncing step', () => {
      const syncingProgressions = [
        ProgressionStatus.RUNNING_FINAL_SYNC,
        ProgressionStatus.FINAL_SYNC_COMPLETE,
        ProgressionStatus.ENSURING_SECONDARY,
        ProgressionStatus.ENSURING_VOLSYNC,
        ProgressionStatus.SETUP_VOLSYNC_DEST,
      ];

      syncingProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, RELOCATE_FLOW);
        expect(step).toBe(TrainStep.Syncing);
      });
    });

    it('should map Restoring phase progressions to Restoring step', () => {
      const restoringProgressions = [
        ProgressionStatus.WAIT_RESTORE,
        ProgressionStatus.WAIT_READINESS,
        ProgressionStatus.UPDATED_PLACEMENT,
        ProgressionStatus.CREATING_MW,
        ProgressionStatus.UPDATING_PL_RULE,
      ];

      restoringProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, RELOCATE_FLOW);
        expect(step).toBe(TrainStep.Restoring);
      });
    });

    it('should map Cleanup phase progressions to CleanUp step', () => {
      const cleanupProgressions = [
        ProgressionStatus.CLEANING_UP,
        ProgressionStatus.WAIT_USER_CLEANUP,
      ];

      cleanupProgressions.forEach((progression) => {
        const step = getCurrentStepFromFlow(progression, RELOCATE_FLOW);
        expect(step).toBe(TrainStep.CleanUp);
      });
    });
  });

  describe('Relocate Discovered Flow Step Mapping', () => {
    it('should map Preparing → CleanUp → Syncing → Restoring sequence', () => {
      // Preparing first
      expect(
        getCurrentStepFromFlow(
          ProgressionStatus.CHECKING_PREREQS,
          RELOCATE_DISCOVERED_FLOW
        )
      ).toBe(TrainStep.Preparing);

      // CleanUp second (early cleanup for discovered apps)
      expect(
        getCurrentStepFromFlow(
          ProgressionStatus.WAIT_USER_CLEANUP,
          RELOCATE_DISCOVERED_FLOW
        )
      ).toBe(TrainStep.CleanUp);

      // Syncing third
      expect(
        getCurrentStepFromFlow(
          ProgressionStatus.RUNNING_FINAL_SYNC,
          RELOCATE_DISCOVERED_FLOW
        )
      ).toBe(TrainStep.Syncing);

      // Restoring last (includes final CLEANING_UP)
      expect(
        getCurrentStepFromFlow(
          ProgressionStatus.WAIT_READINESS,
          RELOCATE_DISCOVERED_FLOW
        )
      ).toBe(TrainStep.Restoring);

      expect(
        getCurrentStepFromFlow(
          ProgressionStatus.CLEANING_UP,
          RELOCATE_DISCOVERED_FLOW
        )
      ).toBe(TrainStep.Restoring);
    });
  });

  describe('Train Step Labels Show In-Progress Status in Topology', () => {
    it('should show all train step labels with spinner (info status)', () => {
      const trainSteps = [
        TrainStep.Preparing,
        TrainStep.Failover,
        TrainStep.Syncing,
        TrainStep.Restoring,
        TrainStep.CleanUp,
      ];

      trainSteps.forEach((step) => {
        const decorator = getDecoratorForStatus(step);
        expect(decorator.status).toBe(NodeStatus.info);
        expect(decorator.icon).toBe('InProgress');
        expect(decorator.tooltip).toContain('...');
      });
    });

    it('should show DRStatus in-progress states with spinner', () => {
      const inProgressStates = [
        DRStatus.FailingOver,
        DRStatus.Relocating,
        DRStatus.Deleting,
        DRStatus.Protecting,
      ];

      inProgressStates.forEach((status) => {
        const decorator = getDecoratorForStatus(status);
        expect(decorator.status).toBe(NodeStatus.info);
        expect(decorator.icon).toBe('InProgress');
      });
    });

    it('should show error states with red error icon', () => {
      const errorStates = [
        DRStatus.Critical,
        DRStatus.ProtectionError,
        DRStatus.Unknown,
      ];

      errorStates.forEach((status) => {
        const decorator = getDecoratorForStatus(status);
        expect(decorator.status).toBe(NodeStatus.danger);
        expect(decorator.icon).toBe('ExclamationCircle');
      });
    });

    it('should show success states with green check icon', () => {
      const successStates = [
        DRStatus.Healthy,
        DRStatus.Available,
        DRStatus.Relocated,
      ];

      successStates.forEach((status) => {
        const decorator = getDecoratorForStatus(status);
        expect(decorator.status).toBe(NodeStatus.success);
        expect(decorator.icon).toBe('CheckCircle');
      });
    });
  });

  describe('Sidebar Status Alignment with Topology', () => {
    it('should show same NodeStatus for in-progress states', () => {
      const inProgressStates = [
        DRStatus.FailingOver,
        DRStatus.Relocating,
        DRStatus.Deleting,
        DRStatus.Protecting,
      ];

      inProgressStates.forEach((status) => {
        const sidebarStatus = getDRNodeStatus(status);
        const topologyDecorator = getDecoratorForStatus(status);
        expect(sidebarStatus).toBe(topologyDecorator.status);
        expect(sidebarStatus).toBe(NodeStatus.info);
      });
    });

    it('should show same NodeStatus for error states', () => {
      const errorStates = [
        DRStatus.Critical,
        DRStatus.ProtectionError,
        DRStatus.Unknown,
      ];

      errorStates.forEach((status) => {
        const sidebarStatus = getDRNodeStatus(status);
        const topologyDecorator = getDecoratorForStatus(status);
        expect(sidebarStatus).toBe(topologyDecorator.status);
        expect(sidebarStatus).toBe(NodeStatus.danger);
      });
    });

    it('should show same NodeStatus for success states', () => {
      const successStates = [
        DRStatus.Healthy,
        DRStatus.Available,
        DRStatus.Relocated,
        DRStatus.FailedOver,
      ];

      successStates.forEach((status) => {
        const sidebarStatus = getDRNodeStatus(status);
        const topologyDecorator = getDecoratorForStatus(status);
        expect(sidebarStatus).toBe(topologyDecorator.status);
        expect(sidebarStatus).toBe(NodeStatus.success);
      });
    });
  });

  describe('Critical User-Reported Scenario: Relocating with WaitForReadiness', () => {
    it('should show Restoring step in train view', () => {
      const step = getCurrentStepFromFlow(
        ProgressionStatus.WAIT_READINESS,
        RELOCATE_FLOW
      );
      expect(step).toBe(TrainStep.Restoring);
    });

    it('should show Restoring with spinner in topology (not error)', () => {
      const decorator = getDecoratorForStatus(TrainStep.Restoring);
      expect(decorator.status).toBe(NodeStatus.info);
      expect(decorator.icon).toBe('InProgress');
      expect(decorator.tooltip).toContain('Restoring');
    });

    it('should show Relocating with spinner in sidebar (not error)', () => {
      const sidebarStatus = getDRNodeStatus(DRStatus.Relocating);
      expect(sidebarStatus).toBe(NodeStatus.info);
    });

    it('should prioritize active operation over protection error in topology', () => {
      // Simulating the exact scenario from user's YAML:
      // phase: Relocating, progression: WaitForReadiness
      // Protected condition: status: False, reason: Error
      // (This is a temporary state while waiting for PVCs to be ready)

      // The decorator for Restoring should be in-progress, not error
      const decorator = getDecoratorForStatus(TrainStep.Restoring);
      expect(decorator.status).not.toBe(NodeStatus.danger);
      expect(decorator.status).toBe(NodeStatus.info);
    });
  });

  describe('All Flow States Show Consistent Status', () => {
    type TestCase = {
      action: DRActionType;
      phase: Phase;
      progression: ProgressionStatus;
      expectedStep: TrainStep;
      expectedNodeStatus: NodeStatus;
      description: string;
    };

    const testCases: TestCase[] = [
      // Failover flow
      {
        action: DRActionType.FAILOVER,
        phase: Phase.FailingOver,
        progression: ProgressionStatus.CHECKING_PREREQS,
        expectedStep: TrainStep.Preparing,
        expectedNodeStatus: NodeStatus.info,
        description: 'Failover - Preparing phase',
      },
      {
        action: DRActionType.FAILOVER,
        phase: Phase.FailingOver,
        progression: ProgressionStatus.FAILING_OVER,
        expectedStep: TrainStep.Failover,
        expectedNodeStatus: NodeStatus.info,
        description: 'Failover - Active failover',
      },
      {
        action: DRActionType.FAILOVER,
        phase: Phase.FailingOver,
        progression: ProgressionStatus.WAIT_RESTORE,
        expectedStep: TrainStep.Restoring,
        expectedNodeStatus: NodeStatus.info,
        description: 'Failover - Restoring resources',
      },
      {
        action: DRActionType.FAILOVER,
        phase: Phase.FailingOver,
        progression: ProgressionStatus.WAIT_USER_CLEANUP,
        expectedStep: TrainStep.CleanUp,
        expectedNodeStatus: NodeStatus.info,
        description: 'Failover - Cleanup phase',
      },

      // Relocate flow (non-discovered)
      {
        action: DRActionType.RELOCATE,
        phase: Phase.Relocating,
        progression: ProgressionStatus.CHECKING_PREREQS,
        expectedStep: TrainStep.Preparing,
        expectedNodeStatus: NodeStatus.info,
        description: 'Relocate - Preparing phase',
      },
      {
        action: DRActionType.RELOCATE,
        phase: Phase.Relocating,
        progression: ProgressionStatus.RUNNING_FINAL_SYNC,
        expectedStep: TrainStep.Syncing,
        expectedNodeStatus: NodeStatus.info,
        description: 'Relocate - Syncing data',
      },
      {
        action: DRActionType.RELOCATE,
        phase: Phase.Relocating,
        progression: ProgressionStatus.WAIT_READINESS,
        expectedStep: TrainStep.Restoring,
        expectedNodeStatus: NodeStatus.info,
        description: 'Relocate - Waiting for readiness (critical test case)',
      },
      {
        action: DRActionType.RELOCATE,
        phase: Phase.Relocating,
        progression: ProgressionStatus.CLEANING_UP,
        expectedStep: TrainStep.CleanUp,
        expectedNodeStatus: NodeStatus.info,
        description: 'Relocate - Cleanup phase',
      },
    ];

    testCases.forEach((testCase) => {
      it(`${testCase.description} - should show consistent status`, () => {
        const flow =
          testCase.action === DRActionType.FAILOVER
            ? FAILOVER_FLOW
            : RELOCATE_FLOW;

        const step = getCurrentStepFromFlow(testCase.progression, flow);
        expect(step).toBe(testCase.expectedStep);

        const decorator = getDecoratorForStatus(step);
        expect(decorator.status).toBe(testCase.expectedNodeStatus);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle Completed progression correctly', () => {
      const step = getCurrentStepFromFlow(Progression.Completed, FAILOVER_FLOW);
      expect(step).toBe(TrainStep.CleanUp); // Last step
    });

    it('should handle undefined/empty progression', () => {
      const step = getCurrentStepFromFlow(undefined, RELOCATE_FLOW);
      expect(step).toBe(TrainStep.Preparing); // First step
    });

    it('should handle unrecognized progression', () => {
      const step = getCurrentStepFromFlow(
        'UnknownProgression' as any,
        FAILOVER_FLOW
      );
      expect(step).toBe(TrainStep.Preparing); // Fallback to first step
    });

    it('should show user action required states as info (not error)', () => {
      const userActionStates = [
        DRStatus.WaitOnUserToCleanUp,
        DRStatus.WaitForUser,
      ];

      userActionStates.forEach((status) => {
        const decorator = getDecoratorForStatus(status);
        const sidebarStatus = getDRNodeStatus(status);

        expect(decorator.status).toBe(NodeStatus.info);
        expect(sidebarStatus).toBe(NodeStatus.info);
        expect(decorator.icon).toBe('InfoCircle');
      });
    });
  });
});
