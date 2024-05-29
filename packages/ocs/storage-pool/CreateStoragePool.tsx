import * as React from 'react';
import {
  useSafeK8sGet,
  useSafeK8sList,
  useSafeK8sWatchResource,
} from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import {
  CephClusterKind,
  DataPool,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  Patch,
  WatchK8sResource,
  getAPIVersionForModel,
  k8sCreate,
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom-v5-compat';
import { Button, Modal } from '@patternfly/react-core';
import {
  ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
  COMPRESSION_ON,
  POOL_STATE,
  POOL_TYPE,
} from '../constants';
import {
  CephBlockPoolModel,
  CephClusterModel,
  CephFileSystemModel,
} from '../models';
import { CephFilesystemKind, StoragePoolKind } from '../types';
import {
  getErrorMessage,
  getExistingBlockPoolNames,
  getExistingFsPoolNames,
} from '../utils';
import { StoragePoolBody } from './body';
import { StoragePoolFooter } from './footer';
import {
  StoragePoolActionType,
  blockPoolInitialState,
  storagePoolReducer,
  StoragePoolState,
} from './reducer';
import './create-storage-pool.scss';

export const createFsPoolRequest = (
  state: StoragePoolState,
  storageCluster: StorageClusterKind
) => {
  const patchPool: DataPool = {
    name: state.poolName,
    replicated: { size: Number(state.replicaSize) },
    compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
  };
  const patch: Patch = storageCluster?.spec?.managedResources?.cephFilesystems
    ?.additionalDataPools
    ? {
        op: 'add',
        path: `${ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH}/-`,
        value: patchPool,
      }
    : {
        op: 'add',
        path: ADDITIONAL_FS_POOLS_CLUSTER_CR_PATH,
        value: [patchPool],
      };

  return () =>
    k8sPatch({
      model: OCSStorageClusterModel,
      resource: storageCluster,
      data: [patch],
    });
};

export const getPoolKindObj = (
  state: StoragePoolState,
  ns: string,
  deviceClass: StoragePoolKind['spec']['deviceClass']
): StoragePoolKind => ({
  apiVersion: getAPIVersionForModel(CephBlockPoolModel),
  kind: CephBlockPoolModel.kind,
  metadata: {
    name: state.poolName,
    namespace: ns,
  },
  spec: {
    compressionMode: state.isCompressed ? COMPRESSION_ON : 'none',
    deviceClass: deviceClass,
    failureDomain: state.failureDomain,
    parameters: {
      compression_mode: state.isCompressed ? COMPRESSION_ON : 'none',
    },
    replicated: {
      size: Number(state.replicaSize),
    },
  },
});

export const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

export const poolResource = (
  poolName: string,
  ns: string
): WatchK8sResource => ({
  kind: referenceForModel(CephBlockPoolModel),
  namespaced: true,
  isList: false,
  name: poolName,
  namespace: ns,
});

export const StoragePoolDefinitionText: React.FC<{ className?: string }> = ({
  className,
}) => {
  const { t } = useCustomTranslation();

  return (
    <p className={className}>
      {t(
        'A storage pool is a logical entity which provides capacity to applications and workloads. With pools you can support policies for data resiliency and storage efficiency.'
      )}
    </p>
  );
};

const CreateStoragePool: React.FC<{}> = ({}) => {
  const { t } = useCustomTranslation();
  const params = useParams();
  const poolNs = params?.namespace;

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const clusterName = systemFlags[poolNs]?.ocsClusterName;

  const isExternalStorageSystem = systemFlags[poolNs]?.isExternalMode;

  // We read pools from CephFilesystem as it's the only resource where the default pool appears
  // (unlike in StorageCluster CR).
  const fsName = `${clusterName}-cephfilesystem`;
  const [fsData, fsDataLoaded, fsDataLoadError] =
    useSafeK8sWatchResource<CephFilesystemKind>((ns) => ({
      isList: false,
      kind: referenceForModel(CephFileSystemModel),
      namespaced: true,
      namespace: ns,
      name: fsName,
    }));

  // Collect existing fs pool names to check against new pool name.
  const fsExistingNames = React.useMemo(
    () => getExistingFsPoolNames(fsData),
    [fsData]
  );

  const [cephClusters, cephClustersLoaded, cephClustersLoadError] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);
  // Only single cluster per Namespace.
  const cephCluster = getCephClusterInNs(
    cephClusters,
    poolNs
  ) as CephClusterKind;

  // Collect existing block pool names to check against new pool name.
  // Also get the block default deviceClass.
  const defaultBlockPoolName = `${clusterName}-cephblockpool`;
  const [blockPools, blockPoolsLoaded, blockPoolsLoadError] =
    useSafeK8sList<StoragePoolKind>(CephBlockPoolModel);

  const [blockExistingNames, defaultDeviceClass] = React.useMemo(() => {
    let blockPoolNames = [];
    let defaultDeviceClass = '';
    if (blockPoolsLoaded && !blockPoolsLoadError) {
      blockPoolNames = getExistingBlockPoolNames(blockPools);
      defaultDeviceClass =
        blockPools.find(
          (blockPool) => getName(blockPool) === defaultBlockPoolName
        )?.spec?.deviceClass || '';
    }

    return [blockPoolNames, defaultDeviceClass];
  }, [blockPools, blockPoolsLoaded, blockPoolsLoadError, defaultBlockPoolName]);

  const [storageCluster, storageClusterLoaded, storageClusterLoadError] =
    useSafeK8sGet<StorageClusterKind>(
      OCSStorageClusterModel,
      clusterName,
      poolNs
    );

  const isLoaded =
    areFlagsLoaded &&
    fsDataLoaded &&
    cephClustersLoaded &&
    storageClusterLoaded &&
    blockPoolsLoaded;
  const isLoadError =
    flagsLoadError ||
    fsDataLoadError ||
    cephClustersLoadError ||
    storageClusterLoadError ||
    blockPoolsLoadError;

  if (isLoaded && !isLoadError) {
    return (
      <CreateStoragePoolForm
        appName={params.appName}
        storageCluster={storageCluster}
        cephCluster={cephCluster}
        isExternalStorageSystem={isExternalStorageSystem}
        poolNs={poolNs}
        fsName={fsName}
        fsExistingNames={fsExistingNames}
        blockExistingNames={blockExistingNames}
        defaultDeviceClass={defaultDeviceClass}
      />
    );
  }
  return (
    <StatusBox
      loaded={isLoaded}
      loadError={isLoadError}
      label={t('Storage pool creation form')}
    />
  );
};

type CreateStoragePoolFormProps = {
  appName: string;
  storageCluster: StorageClusterKind;
  cephCluster: CephClusterKind;
  isExternalStorageSystem: boolean;
  poolNs: string;
  fsName: string;
  fsExistingNames: string[];
  blockExistingNames: string[];
  defaultDeviceClass: string;
};

const CreateStoragePoolForm: React.FC<CreateStoragePoolFormProps> = ({
  appName,
  storageCluster,
  cephCluster,
  isExternalStorageSystem,
  poolNs,
  fsName,
  fsExistingNames,
  blockExistingNames,
  defaultDeviceClass,
}) => {
  const { pathname: url } = useLocation();
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const [state, dispatch] = React.useReducer(
    storagePoolReducer,
    blockPoolInitialState
  );
  const [poolType, setPoolType] = React.useState<POOL_TYPE>(
    POOL_TYPE.FILESYSTEM
  );
  const onPoolTypeChange = React.useMemo(
    () => (newPoolType: POOL_TYPE) => setPoolType(newPoolType),
    [setPoolType]
  );
  const existingNames =
    poolType === POOL_TYPE.FILESYSTEM ? fsExistingNames : blockExistingNames;

  // OCS create pool page url ends with ~new, ODF create pool page ends with /create/~new
  const blockPoolPageUrl = appName
    ? url.replace('/~new', '')
    : url.replace('/create/~new', '');

  const onClose = () => {
    navigate(-1);
  };

  // Create new pool
  const createPool = () => {
    if (cephCluster?.status?.phase === POOL_STATE.READY) {
      let createRequest: () => Promise<K8sResourceCommon>;
      if (poolType === POOL_TYPE.FILESYSTEM) {
        createRequest = createFsPoolRequest(state, storageCluster);
      } else {
        const poolObj: StoragePoolKind = getPoolKindObj(
          state,
          poolNs,
          defaultDeviceClass
        );
        createRequest = () =>
          k8sCreate({ model: CephBlockPoolModel, data: poolObj });
      }

      dispatch({ type: StoragePoolActionType.SET_INPROGRESS, payload: true });
      createRequest()
        .then(() =>
          poolType === POOL_TYPE.BLOCK
            ? navigate(`${blockPoolPageUrl}/${state.poolName}`)
            : navigate(`${blockPoolPageUrl}`)
        )
        .finally(() =>
          dispatch({
            type: StoragePoolActionType.SET_INPROGRESS,
            payload: false,
          })
        )
        .catch((err) =>
          dispatch({
            type: StoragePoolActionType.SET_ERROR_MESSAGE,
            payload: getErrorMessage(err.message) || 'Could not create Pool.',
          })
        );
    } else
      dispatch({
        type: StoragePoolActionType.SET_ERROR_MESSAGE,
        payload: t(
          "Data Foundation's StorageCluster is not available. Try again after the StorageCluster is ready to use."
        ),
      });
  };

  if (isExternalStorageSystem) {
    return (
      <Modal
        title={t('Create storage pool')}
        titleIconVariant="warning"
        isOpen
        onClose={onClose}
        variant="small"
        actions={[
          <Button key="confirm" variant="primary" onClick={onClose}>
            {t('Close')}
          </Button>,
        ]}
      >
        <strong>
          {t(
            "Pool creation is not supported for Data Foundation's external RHCS StorageSystem."
          )}
        </strong>
      </Modal>
    );
  }

  return (
    <>
      <div className="co-create-operand__header">
        <h1 className="co-create-operand__header-text">
          {t('Create storage pool')}
        </h1>
        <StoragePoolDefinitionText />
      </div>
      <div className="create-storage-pool__form">
        <StoragePoolBody
          cephCluster={cephCluster}
          state={state}
          dispatch={dispatch}
          showPoolStatus={false}
          poolType={poolType}
          existingNames={existingNames}
          onPoolTypeChange={onPoolTypeChange}
          fsName={fsName}
        />
        <StoragePoolFooter
          state={state}
          cancel={onClose}
          onConfirm={createPool}
        />
      </div>
    </>
  );
};

export default CreateStoragePool;
