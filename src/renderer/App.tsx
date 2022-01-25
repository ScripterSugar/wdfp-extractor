import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import settingsIcon from '../../assets/settings.svg';
import extractIcon from '../../assets/extract.svg';
import viewerIcon from '../../assets/viewer.svg';
import folderIcon from '../../assets/folder.svg';
import theoSpin from '../../assets/theospin.png';
import theoSpecial from '../../assets/theoSpecial.gif';
import discord from '../../assets/discord.svg';
import infoIcon from '../../assets/info.svg';
import theoWalk from '../../assets/theoWalk.gif';
import arrowLeftIcon from '../../assets/arrowLeft.svg';
import theoBackground from '../../assets/backgrounds/beast_event.jpg';
import './App.css';
import WfCard from './components/WfCard';
import WfButton, {
  WfDangerButton,
  WfSelectButton,
} from './components/WfButton';
import { usePermanentState, useStateRef } from './helpers/hooks';
import { getIpcReturn } from './helpers';
import Typography, { IndicatorTypo } from './components/Typography';
import Modal from './components/Modal';
import Switch from './components/Switch';

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

const LayoutFlex = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;
const LayoutFlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
`;

const LayoutFlexSpaceBetween = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const LayoutFlexDivideHalf = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  > div {
    width: 50%;
  }

  > div:first-child {
    padding-right: 16px;
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

const ModalActions = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  margin-top: 24px;

  > * + * {
    margin-left: 8px;
  }

  &[data-dir='vertical'] {
    flex-direction: column;

    > * + * {
      margin-left: 0;
      margin-top: 8px;
    }
  }
`;

const ProgressWrapper = styled.div`
  display: flex;
  margin-top: 8px;
  flex-direction: column;

  > div {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;

    > p {
      font-weight: bold;
      font-size: 0.8rem;
    }
  }

  > div + div {
    margin-top: 4px;
  }
`;

const ProgressBarWrapper = styled.div`
  height: 8px;
  width: 100%;
  background: white;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
`;

const ProgressBar = styled.div`
  height: 8px;
  width: ${(props) => props.value}%;
  background: #f2a242;
`;

const Progress = ({
  progress,
}: {
  progress: { id: string; max: number; progress: number };
}) => {
  return (
    <ProgressWrapper>
      <div>
        <Typography>
          <img src={theoWalk} alt="loading" style={{ marginRight: 8 }} />
          {progress.id}
        </Typography>
        <Typography>
          ({progress.progress} / {progress.max}){' '}
          {Math.round((progress.progress / progress.max) * 100)}%
        </Typography>
      </div>
      <div>
        <ProgressBarWrapper>
          <ProgressBar
            value={Math.round((progress.progress / progress.max) * 100)}
          />
        </ProgressBarWrapper>
      </div>
    </ProgressWrapper>
  );
};

const AppContent = () => {
  const [targetDir, setTargetDir] = usePermanentState(null, 'TARGET_DIR');
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [appVersion, setAppVersion] = useState('UNKNOWN');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const handleDataLogRef = useRef();
  const [devConsoleLogs, setDevConsoleLogs, devConsoleLogsRef] = useStateRef(
    []
  );
  const [options, setOptions] = usePermanentState(
    {
      extractMaster: true,
      extractCharacterImage: true,
      extractMiscImage: true,
      extractAudio: true,
      extractAllFrames: false,
      customPort: '',
      processAtlas: false,
      region: 'gl',
      debug: '',
      isDebug: false,
    },
    'EXTRACT_OPTION',
    (val) => {
      try {
        return JSON.parse(val);
      } catch (err) {
        return {
          extractMaster: true,
          extractCharacterImage: true,
          processAtlas: false,
          region: 'gl',
        };
      }
    },
    JSON.stringify
  );
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openSelectOption, setOpenSelectOption] = useState(false);
  const devLogRef = useRef();
  const [progresses, setProgresses] = useState([]);

  const onChangeOptions = (key, value) =>
    setOptions({ ...options, [key]: value });

  const handleDataLog = useCallback(
    ({ type, data: { id, ...rest } }) => {
      switch (type) {
        case 'progressStart': {
          setProgresses([
            ...progresses,
            {
              id,
              max: rest.max,
              progress: 0,
            },
          ]);
          return;
        }
        case 'progress': {
          const newProgresses = progresses.slice();
          const progressIdx = newProgresses.findIndex(
            (progress) => progress.id === id
          );
          const currentProgress = newProgresses[progressIdx];
          newProgresses.splice(progressIdx, 1, {
            ...currentProgress,
            progress: rest.progress,
          });
          setProgresses(newProgresses);
          return;
        }
        case 'progressEnd': {
          const newProgresses = progresses.slice();
          setProgresses(newProgresses.filter((progress) => progress.id !== id));
          return;
        }
        default: {
          console.log('Error');
        }
      }
    },
    [progresses]
  );

  handleDataLogRef.current = handleDataLog;

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

  const handleExtractionError = (errorString) => {
    const [error, ...args] = errorString.split('/');

    switch (error) {
      case 'JAVA_NOT_INSTALLED': {
        return setExtractionError({
          error:
            'To run this program, you need the java installed in your machine.\nPlease refer to the Installation guide of github page.',
          ref: 'https://www.java.com/en/download/',
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
          ],
        });
      }
      case 'MULTIPLE_DEVICES_FOUND': {
        return setExtractionError({
          error:
            'Multiple instances are connected to ADB. Please select the device you want to extract assets from.',
          title: 'Please select the device',
          actionDir: 'vertical',
          actions: args.map((deviceName) => (
            <WfButton
              key={deviceName}
              onClick={() => responseExtraction(`selectDevice${deviceName}`)}
            >
              {deviceName}
            </WfButton>
          )),
        });
      }
      case 'APK_NOT_FOUND': {
        return setExtractionError({
          error:
            'Failed to detect World Flipper installed on the designated device.\nPlease make sure you have World Flipper installed on your phone/emu, and downloaded all the assets.',
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
      case 'DEVICE_NOT_FOUND': {
        return setExtractionError({
          error:
            'No connected devices found from adb.\nMake sure you have your emulator running or the device being connected.',
          ref: 'https://github.com/ScripterSugar/wdfp-extractor',
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
            'Connected device does not have permission to read data asset path.\n\nYou can still try to execute full asset dump,\nBut it might take long time and can still be failed.\n',
          ref: 'https://github.com/ScripterSugar/wdfp-extractor',
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
        let errorMsg;

        console.log(error);
        try {
          errorMsg =
            (typeof error === 'string' && error) ||
            error?.message ||
            JSON.stringify(error);
        } catch (err) {
          errorMsg = 'UNKNOWN';
        }

        if (typeof errorMsg !== 'string') {
          errorMsg = 'UNKNOWN';
        }
        setExtractionError({
          error: errorMsg,
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
    setOpenSelectOption(false);
    setShowDevConsole(true);
    window.electron.ipcRenderer.startExtraction(targetDir, {
      ...options,
      debug: options.isDebug && options.debug,
    });

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
    window.electron.ipcRenderer.on('ipc-logger-log', (message, type) => {
      if (type === 'data') {
        return handleDataLogRef.current(JSON.parse(message));
      }
      const newDevConsoleLogs = [...(devConsoleLogsRef.current || [])];

      newDevConsoleLogs.push(message);

      newDevConsoleLogs.slice(0, 1000);

      setDevConsoleLogs(newDevConsoleLogs);
      devLogRef.current?.scrollTo(0, devLogRef.current?.scrollHeight);
    });

    onChangeOptions('isDebug', false);

    (async () => {
      const ipcReturn = getIpcReturn('appVersion');

      await window.electron.ipcRenderer.getAppVersion();

      setAppVersion(await ipcReturn);
    })();

    window.electron.ipcRenderer.on('update_available', () => {
      setUpdateAvailable(true);
    });

    window.electron.ipcRenderer.on('update_downloaded', () => {
      setUpdateDownloaded(true);
    });
  }, []); // eslint-disable-line

  const restartAndUpdate = () => {
    window.electron.ipcRenderer.updateApp();
  };

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
            onClick={
              targetDir && !isExtracting
                ? () => setOpenSelectOption(true)
                : () => {}
            }
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
          <WfDangerButton
            onClick={window.close}
            style={{ justifyContent: 'center' }}
          >
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
              {progresses.map((progress) => (
                <Progress key={progress.id} progress={progress} />
              ))}
            </DevConsoleInner>
          </WfCard>
        )}
      </AppMainLayout>
      <Modal open={openInfoModal} onClose={() => setOpenInfoModal(false)}>
        <img
          src={theoSpecial}
          onClick={() => {
            onChangeOptions('isDebug', !options.isDebug);
            window.electron.ipcRenderer.openDevTools();
          }}
          alt="theo"
          style={{ width: '100%', marginBottom: 16 }}
        />
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
        </Typography>
        {(updateAvailable && <Typography>Update Available</Typography>) || (
          <Typography>No updates available</Typography>
        )}
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
      <Modal
        style={{ width: 720 }}
        open={!!openSelectOption}
        onClose={() => {}}
      >
        <Typography style={{ marginBottom: 16 }}>
          Select the extraction options.
        </Typography>
        <LayoutFlexColumn>
          <LayoutFlexDivideHalf>
            <LayoutFlexSpaceBetween>
              <Typography>Extract master table</Typography>
              <Switch
                value={options.extractMaster}
                onClick={() =>
                  onChangeOptions('extractMaster', !options.extractMaster)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
            <LayoutFlexSpaceBetween>
              <Typography>Extract character image assets</Typography>

              <Switch
                value={options.extractCharacterImage}
                onClick={() =>
                  onChangeOptions(
                    'extractCharacterImage',
                    !options.extractCharacterImage
                  )
                }
              />
            </LayoutFlexSpaceBetween>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Process image assets by atlas</Typography>
                <IndicatorTypo>Crop spritesheets / Generate GIF</IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                data-disabled={!options.extractCharacterImage}
                value={options.processAtlas}
                onClick={() =>
                  options.extractCharacterImage &&
                  onChangeOptions('processAtlas', !options.processAtlas)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Extract general image assets</Typography>
                <IndicatorTypo>Images of items, bosses, ui, etc.</IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                value={options.extractMiscImage}
                onClick={() =>
                  onChangeOptions('extractMiscImage', !options.extractMiscImage)
                }
              />
            </LayoutFlexSpaceBetween>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Extract audio assets</Typography>
                <IndicatorTypo>Voiceline, BGM, S/E</IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                value={options.extractAudio}
                onClick={() =>
                  onChangeOptions('extractAudio', !options.extractAudio)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
            <LayoutFlexSpaceBetween style={{ marginTop: 16 }}>
              <LayoutFlexColumn>
                <Typography>Custom emulator port</Typography>
                <IndicatorTypo>
                  Specify your emulator port if needed
                </IndicatorTypo>
              </LayoutFlexColumn>
              <input
                style={{ width: 240 }}
                value={options.customPort}
                onChange={(event) =>
                  onChangeOptions('customPort', event.target.value)
                }
              />
            </LayoutFlexSpaceBetween>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Include duplicated frames for sprites</Typography>
                <IndicatorTypo>
                  This makes extraction process slower.
                </IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                value={options.extractAllFrames}
                onClick={() =>
                  onChangeOptions('extractAllFrames', !options.extractAllFrames)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          {options.isDebug && (
            <LayoutFlexSpaceBetween style={{ marginTop: 16 }}>
              <Typography style={{ flexShrink: 0, marginRight: 16 }}>
                Debug String
              </Typography>
              <input
                style={{ width: '100%' }}
                value={options.debug}
                onChange={(event) =>
                  onChangeOptions('debug', event.target.value)
                }
              />
            </LayoutFlexSpaceBetween>
          )}
        </LayoutFlexColumn>
        <IndicatorTypo style={{ marginTop: 16, marginLeft: 4 }}>
          APK region (version)
        </IndicatorTypo>
        <ModalActions style={{ marginTop: 8 }}>
          <WfSelectButton
            data-selected={options.region === 'gl'}
            onClick={() => onChangeOptions('region', 'gl')}
          >
            Global (USA, EU, SEA, KR)
          </WfSelectButton>
          <WfSelectButton
            data-selected={options.region === 'jp'}
            onClick={() => onChangeOptions('region', 'jp')}
          >
            Japan
          </WfSelectButton>
        </ModalActions>
        <ModalActions style={{ marginTop: 48 }}>
          <WfDangerButton
            style={{ width: 160 }}
            onClick={() => setOpenSelectOption(false)}
          >
            Abort
          </WfDangerButton>
          <WfButton style={{ width: 160 }} onClick={startExtraction}>
            Extract
          </WfButton>
        </ModalActions>
      </Modal>
      <Modal style={{ width: 720 }} open={!!extractionError} onClose={() => {}}>
        <Typography style={{ marginBottom: 16 }}>
          {extractionError?.title || 'Error occured during extraction.'}
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
        <ModalActions data-dir={extractionError?.actionDir}>
          {extractionError?.actions}
        </ModalActions>
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
