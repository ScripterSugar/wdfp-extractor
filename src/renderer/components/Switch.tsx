import React from 'react';
import styled from 'styled-components';

const SwitchWrapper = styled.div`
  flex-shrink: 0;
  width: 64px;
  height: 32px;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  border-radius: 32px;
  transition: all 0.2s ease-out;
  position: relative;

  border: #747474 2px solid;
  background: #686868;

  &[data-value='true'] {
    border: #f4b34a 2px solid;
    background: #f2a241;
  }

  cursor: pointer;

  &[data-disabled='true'] {
    border: #747474 2px solid;
    background: #343434;

    > * {
      background: #686868 !important;
    }

    cursor: initial;
  }
`;

const SwitchButton = styled.div`
  height: 24px;
  width: 24px;
  position: absolute;
  z-index: 1000;
  background: white;
  border-radius: 38px;
  transition: all 0.2s ease-out;
  left: 2px;
  top: 2px;

  &[data-value='true'] {
    left: 34px;
  }
`;

const Switch = ({
  value,
  onClick,
  ...rest
}: {
  value: boolean;
  onClick: () => void;
}) => {
  return (
    <SwitchWrapper {...rest} onClick={onClick} data-value={value}>
      <SwitchButton data-value={value} />
    </SwitchWrapper>
  );
};

export default Switch;
