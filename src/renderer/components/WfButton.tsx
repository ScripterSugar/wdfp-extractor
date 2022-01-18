import styled from 'styled-components';

const WfButton = styled.button`
  padding: 8px;
  width: 100%;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 1.3rem;
  background: white;
  box-shadow: 0px 3px 13px -3px rgb(0 0 0 / 30%);
  border-radius: 16px;
  padding-left: 16px;

  > img,
  > svg {
    margin-right: 24px;
  }

  cursor: pointer;

  &:hover {
    background: #fafafa;
    transform: scale(1.01);
  }
  &:active {
    background: #efefef;
  }

  &:disabled {
    cursor: initial;
    &:hover {
      background: white;
      transform: scale(1);
    }
    &:active {
      background: white;
    }
  }
`;

export const WfDangerButton = styled(WfButton)`
  background: #ea3450;
  color: white;

  &:hover {
    background: #d81634;
  }
  &:active {
    background: #be001d;
  }

  &:disabled {
    &:hover {
      background: #ea3450;
    }
    &:active {
      background: #ea3450;
    }
  }
`;

export const WfSelectButton = styled(WfButton)`
  &[data-selected='true'] {
    background: #f2a241;
    color: white;

    &:hover {
      background: #f2a241;
    }
    &:active {
      background: #f2a241;
    }
  }
`;

export default WfButton;
