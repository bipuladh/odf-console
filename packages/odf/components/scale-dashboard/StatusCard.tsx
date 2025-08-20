import * as React from 'react';
import { FileSystemKind } from '@odf/core/types/scale';
import {
  ClusterServiceVersionKind,
  ClusterServiceVersionModel,
  useCustomTranslation,
} from '@odf/shared';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { FileSystemModel } from '@odf/shared/models/scale';
import { getOperatorHealthState, referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Gallery,
  GalleryItem,
} from '@patternfly/react-core';

const getAggregateFileSystemHealth = (
  fileSystems: FileSystemKind[],
  loaded: boolean,
  loadError: any
): HealthState => {
  if (!loaded) {
    return HealthState.LOADING;
  }
  if (loadError) {
    return HealthState.ERROR;
  }
  const fileSystemHealth = fileSystems?.map(
    (fileSystem) => fileSystem.status.conditions[0].status
  );
  if (fileSystemHealth.every((health) => health === HealthState.OK)) {
    return HealthState.OK;
  }
  if (fileSystemHealth.some((health) => health === HealthState.ERROR)) {
    return HealthState.WARNING;
  }
  return HealthState.OK;
};

const StatusCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [csv, csvLoaded, csvLoadError] = useK8sWatchResource<
    ClusterServiceVersionKind[]
  >({
    kind: referenceForModel(ClusterServiceVersionModel),
    namespaced: true,
    isList: true,
  });

  const [fileSystems, fileSystemsLoaded, fileSystemsLoadError] =
    useK8sWatchResource<FileSystemKind[]>({
      kind: referenceForModel(FileSystemModel),
      isList: true,
    });

  const ibmCSV = csv?.[0];
  const flashOperator = getOperatorHealthState(
    ibmCSV?.status?.phase,
    !csvLoaded,
    csvLoadError
  );
  const aggregateFileSystemHealth = getAggregateFileSystemHealth(
    fileSystems,
    !fileSystemsLoaded,
    fileSystemsLoadError
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery className="odf-overview-status__health" hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Data Foundation')}
              state={flashOperator.state}
            />
          </GalleryItem>
          <GalleryItem>
            <HealthItem
              title={t('Connected')}
              state={aggregateFileSystemHealth}
            />
          </GalleryItem>
        </Gallery>
      </CardBody>
    </Card>
  );
};

export default StatusCard;
