import styled from 'styled-components';

export const IndicatorTypo = styled.p`
  display: inline-block;
  margin: 0;
  opacity: 0.7;
  font-size: 0.825rem;
`;

export default styled.p`
  display: inline-block;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin: 0;
`;
