import * as React from 'react';
import { Dropdown, DropdownItem, KebabToggle } from '@patternfly/react-core';

type KebabProps = {
  launchModal: (key: string) => void;
};

const defaultKebabItems = [
  <DropdownItem key="Delete" id="Delete">
    Delete
  </DropdownItem>,
];

export const Kebab: React.FC<KebabProps> = (props) => {
  const { launchModal } = props;

  const [isOpen, setOpen] = React.useState(false);

  const onClick = (event?: React.SyntheticEvent<HTMLDivElement>) => {
    setOpen(false);
    const actionKey = event.currentTarget.id;
    launchModal(actionKey);
  };

  const drpodownItems = React.useMemo(() => {
    return defaultKebabItems;
  }, []);

  return (
    <Dropdown
      onSelect={onClick}
      toggle={<KebabToggle onToggle={() => setOpen((open) => !open)} />}
      isOpen={isOpen}
      isPlain
      dropdownItems={drpodownItems}
    />
  );
};
