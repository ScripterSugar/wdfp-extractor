import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import settingsIcon from '../../assets/settings.svg';
import extractIcon from '../../assets/extract.svg';
import viewerIcon from '../../assets/viewer.svg';
import folderIcon from '../../assets/folder.svg';
import theoSpin from '../../assets/theospin.png';
import discord from '../../assets/discord.png';
import infoIcon from '../../assets/info.svg';
import arrowLeftIcon from '../../assets/arrowLeft.svg';
import theoBackground from '../../assets/backgrounds/beast_event.jpg';
import './App.css';
import WfCard from './components/WfCard';
import WfButton, { WfDangerButton } from './components/WfButton';
import { usePermanentState, useStateRef } from './helpers/hooks';
import { getIpcReturn } from './helpers';
import Typography from './components/Typography';
import Modal from './components/Modal';

const AppMainLayout = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 100%;
  width: 100%;
  padding: 24px;

  > div > button + button {
    margin-top: 16px;
  }

  > * {
    flex-shrink: 0;
  }
`;
const rotation = keyframes`
    from{
        transform: rotate(0deg);
    }

    to{
        transform: rotate(360deg);
    }

`;

const SpinImg = styled.img`
  animation: ${rotation} 0.5s ${(props) => props.animation || 'linear'} infinite;
`;

const ExpandButton = styled(WfButton)`
  padding: 0;
  height: 48px;
  width: 16px;
  margin-left: 8px;
`;

const DevConsoleInner = styled.div`
  width: 100%;
  height: 100%;
  background: white;
  overflow: auto;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  padding: 8px;
  overflow-x: hidden;

  > p {
    margin: 0;
    font-size: 0.8rem;
    flex-shrink: 0;
    word-break: break-all;
  }
`;

const ModalActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-top: 24px;

  > * + * {
    margin-left: 8px;
  }
`;

const AppContent = () => {
  const [targetDir, setTargetDir] = usePermanentState(null, 'TARGET_DIR');
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [appVersion, setAppVersion] = useState('UNKNOWN');
  const [devConsoleLogs, setDevConsoleLogs, devConsoleLogsRef] = useStateRef(
    []
  );
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const devLogRef = useRef();

  const changeTargetDir = async () => {
    const ipcPromise = getIpcReturn('showOpenDialog');

    window.electron.ipcRenderer.showOpenDialog();

    const [newTarget] = (await ipcPromise) || [];

    if (newTarget) {
      setTargetDir(newTarget);
    }
  };

  const responseExtraction = (res) => {
    window.electron.ipcRenderer.responseExtraction(res);
    setExtractionError(null);
  };

  const handleExtractionError = (error) => {
    switch (error) {
      case 'JAVA_NOT_INSTALLED': {
        return setExtractionError({
          error:
            'To run this program, you need the java installed in your machine.\nPlease refer to the Installation guide of github page.',
          ref: 'https://github.com/',
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
          ],
        });
      }
      case 'DEVICE_NOT_FOUND': {
        return setExtractionError({
          error:
            'No connected devices found from adb.\nMake sure you have your emulator running or the device being connected.',
          ref: 'https://github.com/',
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
            <WfButton onClick={() => responseExtraction('retry')}>
              Retry
            </WfButton>,
          ],
        });
      }
      case 'PROHIBITED_DATA_PERMISSION': {
        return setExtractionError({
          error:
            'Connected device does not have permission to read data asset path.\n\nYou can still try to execute full asset dump,\nBut it will might take long time and can still be failed.\n',
          ref: 'https://github.com/',
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
            <WfButton onClick={() => responseExtraction('retry')}>
              Retry
            </WfButton>,
            <WfButton onClick={() => responseExtraction('retry')}>
              Try Full dump
            </WfButton>,
          ],
        });
      }
      default: {
        setExtractionError({
          error,
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
            <WfButton onClick={() => responseExtraction('retry')}>
              Retry
            </WfButton>,
          ],
        });
      }
    }
  };

  const startExtraction = async () => {
    setIsExtracting(true);
    setDevConsoleLogs([]);
    setShowDevConsole(true);
    window.electron.ipcRenderer.startExtraction(targetDir);

    let ipcResponse;

    while (!ipcResponse?.success) {
      ipcResponse = await getIpcReturn('extractionResponseMain');

      if (ipcResponse?.error) {
        handleExtractionError(ipcResponse.error);
      }
    }

    setIsExtracting(false);
  };

  const openTargetDir = () => {
    window.electron.ipcRenderer.openDirectory(targetDir);
  };

  useEffect(() => {
    window.electron.ipcRenderer.on('ipc-logger-log', (...args) => {
      const newDevConsoleLogs = [...(devConsoleLogsRef.current || [])];

      newDevConsoleLogs.push(...args);

      newDevConsoleLogs.slice(0, 1000);

      setDevConsoleLogs(newDevConsoleLogs);
      devLogRef.current?.scrollTo(0, devLogRef.current?.scrollHeight);
    });

    (async () => {
      const ipcReturn = getIpcReturn('appVersion');

      await window.electron.ipcRenderer.getAppVersion();

      setAppVersion(await ipcReturn);
    })();
  }, []); // eslint-disable-line

  return (
    <div
      id="app-main"
      style={{
        background: `url(${theoBackground})`,
        backgroundSize: 'cover',
      }}
    >
      <AppMainLayout>
        <WfCard style={{ width: '50%', height: '100%' }}>
          <WfButton disabled>
            <img src={viewerIcon} alt="viewer" width={24} />
            Launch Data Viewer
          </WfButton>
          <WfButton
            disabled={!targetDir || isExtracting}
            onClick={targetDir && !isExtracting ? startExtraction : () => {}}
          >
            <img src={extractIcon} alt="extract" width={24} />
            Extract Data
            {isExtracting && (
              <SpinImg
                src={theoSpin}
                style={{ marginLeft: 8 }}
                alt="info"
                width={24}
              />
            )}
          </WfButton>
          <WfButton
            disabled={!targetDir}
            onClick={targetDir ? openTargetDir : () => {}}
          >
            <img src={folderIcon} alt="folder" width={24} />
            Open Extraction Directory
          </WfButton>
          <WfButton onClick={changeTargetDir}>
            <img src={settingsIcon} alt="settings" width={24} />
            {targetDir ? 'Change' : 'Set'} Extraction Directory
          </WfButton>
          <div>
            <Typography style={{ width: '100%', marginTop: 16 }}>
              {targetDir?.replace(/\\/g, '/') || 'N/A'}
            </Typography>
          </div>
          <div style={{ flexGrow: 1 }} />
          <WfButton onClick={() => setOpenInfoModal(true)}>
            <img src={infoIcon} alt="info" width={24} />
            Information
          </WfButton>
          <WfDangerButton style={{ justifyContent: 'center' }}>
            Close App
          </WfDangerButton>
        </WfCard>
        <ExpandButton onClick={() => setShowDevConsole(!showDevConsole)}>
          <img
            src={arrowLeftIcon}
            alt="arrowLeft"
            width={16}
            style={{
              opacity: 0.4,
              transtion: 'all 0.15s ease-out',
              transform: !showDevConsole ? 'rotate(180deg)' : 'rotate(0)',
              ...(showDevConsole ? { marginLeft: 4 } : { marginLeft: -4 }),
            }}
          />
        </ExpandButton>
        {showDevConsole && (
          <WfCard
            style={{
              marginLeft: 16,
              flexGrow: 1,
              height: '100%',
              padding: 8,
              flexShrink: 1,
              width: 0,
            }}
          >
            <DevConsoleInner ref={devLogRef}>
              {devConsoleLogs.map((log) => (
                <p>{log}</p>
              ))}
            </DevConsoleInner>
          </WfCard>
        )}
      </AppMainLayout>
      <Modal open={openInfoModal} onClose={() => setOpenInfoModal(false)}>
        <Typography>World Flipper Data Extractor</Typography>
        <br />
        <Typography
          style={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'row',
          }}
        >
          V.{appVersion}
          <SpinImg
            animation="ease-in"
            src={theoSpin}
            alt="info"
            width={24}
            style={{ marginLeft: 8 }}
          />
        </Typography>
        <br />
        Created by | INASOM#3195
        <br />
        <WfButton
          style={{
            background: '#5865F2',
            justifyContent: 'center',
            height: 48,
            marginTop: 16,
          }}
          onClick={() =>
            window.electron.ipcRenderer.openExternal(
              'https://discord.com/invite/worldflipper'
            )
          }
        >
          <img src={discord} alt="discord" style={{ width: 32, margin: 0 }} />
        </WfButton>
      </Modal>
      <Modal style={{ width: 720 }} open={!!extractionError} onClose={() => {}}>
        <Typography style={{ marginBottom: 16 }}>
          Error occured during extraction.
        </Typography>
        <Typography style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
          {extractionError?.error}
        </Typography>
        {extractionError?.ref && (
          <a
            style={{ margin: 0 }}
            href="#"
            onClick={() =>
              window.electron.ipcRenderer.openExternal(extractionError.ref)
            }
          >
            {extractionError.ref}
          </a>
        )}
        <ModalActions>{extractionError?.actions}</ModalActions>
      </Modal>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
      </Routes>
    </Router>
  );
}
