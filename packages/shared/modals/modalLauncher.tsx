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
  const [isOpen, setOpen] = React.useState(true);
  const [modalKey, setModalKey] = React.useState('');

  const modalMap = React.useMemo(
    () => ({ ...defaultModalMap, ...(modals ? modals : {}) }),
    [modals]
  );

  const launchModal = React.useCallback(
    (key: string) => {
      setOpen(true);
      setModalKey(key);
    },
    [setOpen, setModalKey]
  );

  const onClose = React.useCallback(() => {
    setOpen(false);
    setModalKey('');
  }, [setOpen, setModalKey]);

  const props = React.useMemo(() => ({ isOpen, closeModal: onClose }), [isOpen, onClose]);

  return [modalMap[modalKey], props, launchModal];
};
