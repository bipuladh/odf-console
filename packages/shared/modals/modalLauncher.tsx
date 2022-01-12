import * as React from 'react';
import { DeleteModal } from './DeleteModal';

export enum ModalKeys {
  DELETE = 'Delete',
  EDIT_RES = 'Edit Resource',
  EDIT_ANN = 'Edit Annotations',
  EDIT_LABELS = 'Edit Labels',
}

const defaultModalMap = {
  [ModalKeys.DELETE]: DeleteModal,
};

export const useModalLauncher = (modals?: typeof defaultModalMap) => {
  const [isOpen, setOpen] = React.useState(false);
  const [modalKey, setModalKey] = React.useState('');
  const [extraProps, setProps] = React.useState({});

  const modalMap = React.useMemo(
    () => ({ ...defaultModalMap, ...(modals ? modals : {}) }),
    [modals]
  );

  const launchModal = React.useCallback(
    (key: string, extraProps: {}) => {
      setProps(extraProps);
      setOpen(true);
      setModalKey(key);
    },
    [setOpen, setModalKey]
  );

  return [
    modalMap[modalKey],
    { isOpen, closeModal: () => setOpen(false), extraProps },
    launchModal,
  ];
};
