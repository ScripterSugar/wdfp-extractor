import React from 'react';
import styled from 'styled-components';

const TextFieldInput = styled.input`
  width: 100%;
  height: 24px;
`;

type TextFieldProps = {
  onChange: () => void;
  onEnter: () => void;
  onArrowUp: () => void;
  onArrowDown: () => void;
  value: string;
};

const TextField = ({
  onChange,
  onEnter,
  onArrowUp,
  onArrowDown,
  value,
  ...restinput
}: TextFieldProps) => {
  return (
    <TextFieldInput
      {...restinput}
      onKeyDown={(event) => {
        if (event.keyCode === 13 && onEnter) {
          onEnter();
        }
        if (event.keyCode === 38 && onArrowUp) {
          onArrowUp();
        }
        if (event.keyCode === 40 && onArrowDown) {
          onArrowDown();
        }
      }}
      onChange={onChange}
      value={value}
    />
  );
};

export default TextField;
