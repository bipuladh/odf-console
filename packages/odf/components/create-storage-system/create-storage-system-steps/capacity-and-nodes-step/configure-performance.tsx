import * as React from 'react';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import {
  createWizardNodeState,
  getTotalCpu,
  getTotalMemoryInGiB,
} from '@odf/core/components/utils';
import {
  RESOURCE_PROFILE_REQUIREMENTS_MAP,
  resourceProfileTooltip,
  resourceRequirementsTooltip,
} from '@odf/core/constants';
import { ResourceProfile } from '@odf/core/types';
import { isResourceProfileAllowed, nodesWithoutTaints } from '@odf/core/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { NodeModel } from '@odf/shared/models';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import {
  SelectOption,
  Text,
  TextVariants,
  TextContent,
} from '@patternfly/react-core';
import './configure-performance.scss';

const selectOptions = (t: TFunction, forceLean: boolean) =>
  Object.entries(ResourceProfile).map((value: [string, ResourceProfile]) => {
    const displayName = t('{{profileType}} mode', { profileType: value[0] });
    let profile = value[1];
    const { minCpu, minMem } = RESOURCE_PROFILE_REQUIREMENTS_MAP[profile];
    const description = `CPUs required: ${minCpu}, Memory required: ${minMem} GiB`;
    const isDisabled =
      forceLean &&
      [ResourceProfile.Balanced, ResourceProfile.Performance].includes(profile);
    return (
      <SelectOption
        key={profile}
        value={profile}
        description={description}
        isDisabled={isDisabled}
      >
        {displayName}
      </SelectOption>
    );
  });

export const PerformanceHeaderText: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Text id="configure-performance" component={TextVariants.h4}>
      <span className="pf-u-mr-sm">{t('Configure performance')}</span>
      <FieldLevelHelp>{resourceProfileTooltip(t)}</FieldLevelHelp>
    </Text>
  );
};

type ProfileRequirementsTextProps = {
  selectedProfile: ResourceProfile;
};

export const ProfileRequirementsText: React.FC<ProfileRequirementsTextProps> =
  ({ selectedProfile }) => {
    const { t } = useCustomTranslation();
    const { minCpu, minMem } =
      RESOURCE_PROFILE_REQUIREMENTS_MAP[selectedProfile];
    return (
      <TextContent>
        <Text id="resource-requirements" component={TextVariants.h4}>
          <span className="pf-u-mr-sm">
            {t(`Aggregate resource requirements for ${selectedProfile} mode`)}
          </span>
          {selectedProfile === ResourceProfile.Performance && (
            <FieldLevelHelp>{resourceRequirementsTooltip(t)}</FieldLevelHelp>
          )}
        </Text>
        <Text id="cpu-requirements-desc" className="pf-u-font-size-sm">
          <div className="pf-u-mb-sm">
            <span className="pf-u-disabled-color-100">
              {t('CPUs required')}:
            </span>{' '}
            <span className="pf-u-font-size-md">
              {minCpu} {t('CPUs')}
            </span>
          </div>
          <div>
            <span className="pf-u-disabled-color-100">
              {t('Memory required')}:
            </span>{' '}
            <span className="pf-u-font-size-md">
              {minMem} {t('GiB')}
            </span>
          </div>
        </Text>
      </TextContent>
    );
  };

type ConfigurePerformanceProps = {
  onResourceProfileChange: (newProfile: ResourceProfile) => void;
  resourceProfile: ResourceProfile;
  headerText?: React.FC;
  profileRequirementsText?: React.FC<{ selectedProfile: ResourceProfile }>;
  selectedNodes: WizardNodeState[];
};

const ConfigurePerformance: React.FC<ConfigurePerformanceProps> = ({
  onResourceProfileChange,
  resourceProfile,
  headerText: HeaderTextComponent,
  profileRequirementsText: ProfileRequirementsTextComponent,
  selectedNodes,
}) => {
  const { t } = useCustomTranslation();
  const [availableNodes, availableNodesLoaded, availableNodesLoadError] =
    useK8sWatchResource<NodeKind[]>({
      kind: NodeModel.kind,
      namespaced: false,
      isList: true,
    });

  // Force Lean mode when all selectable capacity is not enough for higher profiles.
  let forceLean = false;
  if (availableNodesLoaded && !availableNodesLoadError) {
    const selectableNodes = createWizardNodeState(
      nodesWithoutTaints(availableNodes)
    );
    const allCpu = getTotalCpu(selectableNodes);
    const allMem = getTotalMemoryInGiB(selectableNodes);
    if (!isResourceProfileAllowed(ResourceProfile.Balanced, allCpu, allMem)) {
      forceLean = true;
    }
  }
  if (forceLean === true && resourceProfile !== ResourceProfile.Lean) {
    onResourceProfileChange(ResourceProfile.Lean);
  }

  // Set error icon in dropdown when appropriate.
  const isProfileAllowed = resourceProfile
    ? isResourceProfileAllowed(
        resourceProfile,
        getTotalCpu(selectedNodes),
        getTotalMemoryInGiB(selectedNodes)
      )
    : true;
  const validated =
    selectedNodes.length === 0 || isProfileAllowed ? 'default' : 'error';

  return (
    <div className="pf-u-mb-lg">
      <TextContent className="pf-u-mb-md">
        {HeaderTextComponent && <HeaderTextComponent />}
        <Text
          id="configure-performance-desc"
          className="pf-u-font-size-sm pf-u-disabled-color-100"
        >
          {t(
            'Select a profile to customise the performance of the Data Foundation cluster to meet your requirements.'
          )}
        </Text>
      </TextContent>
      <SingleSelectDropdown
        aria-label={t('Select a performance mode from the list')}
        selectedKey={resourceProfile}
        id="resource-profile"
        className="odf-configure-performance__selector pf-u-mb-md"
        selectOptions={selectOptions(t, forceLean)}
        onChange={onResourceProfileChange}
        validated={validated}
      />
      {resourceProfile && ProfileRequirementsTextComponent && (
        <ProfileRequirementsTextComponent selectedProfile={resourceProfile} />
      )}
    </div>
  );
};

export default ConfigurePerformance;
