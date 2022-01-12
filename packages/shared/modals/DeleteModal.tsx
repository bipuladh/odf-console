import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt/lib/api/common-types';
import { Modal } from '@patternfly/react-core';
import { CommonModalProps } from './common';

type DeleteModalProps = CommonModalProps & {
  resource: K8sResourceCommon;
  model: K8sModel;
};

export const DeleteModal: React.FC<DeleteModalProps> = ({
  closeModal,
  isOpen,
}) => {

  return (
    <Modal title="Hello I am a Modal" isOpen={isOpen} onClose={closeModal}>
      Do you want to Delete this resource?
    </Modal>
  );
};
