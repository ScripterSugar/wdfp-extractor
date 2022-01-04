import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import settingsIcon from '../../assets/settings.svg';
import extractIcon from '../../assets/extract.svg';
import viewerIcon from '../../assets/viewer.svg';
import folderIcon from '../../assets/folder.svg';
import theoSpin from '../../assets/theospin.gif';
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

const AppContent = () => {
  const [targetDir, setTargetDir] = usePermanentState(null, 'TARGET_DIR');
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
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

  const startExtraction = async () => {
    const ipcPromise = getIpcReturn('extractionDone');
    setIsExtracting(true);
    setDevConsoleLogs([]);
    setShowDevConsole(true);
    window.electron.ipcRenderer.startExtraction(targetDir);

    await ipcPromise;

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
  }, []); // eslint-disable-line

  return (
    <div
      id="app-main"
      style={{ background: `url(${theoBackground})`, backgroundSize: 'cover' }}
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
              <img
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
            <Typography style={{ width: '100%' }}>
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
        Created by | INASOM#3195
        <br />
        <div
          style={{
            display: 'flex',
            width: '100%',
            marginTop: 16,
            justifyContent: 'center',
          }}
        >
          <img src={theoSpin} alt="info" width={24} />
        </div>
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
