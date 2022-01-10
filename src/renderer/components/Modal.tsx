import { createPortal } from 'react-dom';
import styled from 'styled-components';
import WfCard from './WfCard';

const Backdrop = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.15);
`;

const ModalLayout = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  display: flex;
  z-index: 100;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  position: relative;
  z-index: 100;
`;

const Modal = ({
  open,
  children,
  onClose,
  ...rest
}: {
  open: boolean;
  children: React.ReactChildren;
  onClose: () => void;
}) => {
  if (!open) return null;

  return createPortal(
    <>
      <ModalLayout>
        <Backdrop onClick={onClose} />
        <ModalContent>
          <WfCard {...rest}>{children}</WfCard>
        </ModalContent>
      </ModalLayout>
    </>,
    document.getElementById('root')
  );
};

export default Modal;
