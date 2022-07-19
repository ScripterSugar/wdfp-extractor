import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import settingsIcon from '../../assets/settings.svg';
import extractIcon from '../../assets/extract.svg';
import viewerIcon from '../../assets/viewer.svg';
import trashIcon from '../../assets/trash.svg';
import deltaIcon from '../../assets/delta.png';
import folderIcon from '../../assets/folder.svg';
import discord from '../../assets/discord.svg';
import github from '../../assets/github.png';
import infoIcon from '../../assets/info.svg';
import arrowLeftIcon from '../../assets/arrowLeft.svg';
import theoBackground from '../../assets/images/theo.jpg';
import theoBanner from '../../assets/images/theo_banner.png';
import theoSpin from '../../assets/images/theo_spin.png';
import theoSpecial from '../../assets/images/theo_special.gif';
import theoWalk from '../../assets/images/theo_walk.gif';
import ch10Background from '../../assets/images/ch10.jpg';
import ch10Banner from '../../assets/images/ch10_banner.png';
import ch10Spin from '../../assets/images/ch10_spin.png';
import ch10Special from '../../assets/images/ch10_special.gif';
import ch10Walk from '../../assets/images/ch10_walk.gif';
import couetteBackground from '../../assets/images/couette.jpg';
import couetteBanner from '../../assets/images/couette_banner.png';
import couetteSpin from '../../assets/images/couette_spin.png';
import couetteSpecial from '../../assets/images/couette_special.gif';
import couetteWalk from '../../assets/images/couette_walk.gif';
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
import TextField from './components/TextField';

const APP_THEMES = ['theo', 'couette', 'ch10'];
const THEME_SOURCEMAP = {
  theo: {
    bg: theoBackground,
    banner: theoBanner,
    special: theoSpecial,
    spin: theoSpin,
    walk: theoWalk,
  },
  ch10: {
    bg: ch10Background,
    banner: ch10Banner,
    special: ch10Special,
    spin: ch10Spin,
    walk: ch10Walk,
  },
  couette: {
    bg: couetteBackground,
    banner: couetteBanner,
    special: couetteSpecial,
    spin: couetteSpin,
    walk: couetteWalk,
  },
};

const PRESET_FAST = {
  extractMaster: true,
  parseActionScript: false,
  extractCharacterImage: true,
  processAtlas: false,
  extractGeneralAmf: true,
  processAtlasMisc: false,
  extractAudio: true,
  extractMiscImage: true,
};

const PRESET_FULL = {
  extractMaster: true,
  parseActionScript: true,
  extractCharacterImage: true,
  processAtlas: true,
  extractGeneralAmf: true,
  processAtlasMisc: true,
  extractAudio: true,
  extractMiscImage: true,
};

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
  position: relative;

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

const CommandWrapper = styled.div`
  margin: auto;
  height: 24px;
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
`;

const Progress = ({
  progress,
  appTheme,
}: {
  progress: { id: string; max: number; progress: number };
  appTheme: string;
}) => {
  return (
    <ProgressWrapper>
      <div>
        <Typography>
          <img
            src={THEME_SOURCEMAP[appTheme].walk}
            alt="loading"
            style={{ marginRight: 8 }}
          />
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
  const [appTheme, setAppTheme] = usePermanentState(APP_THEMES[0], 'APP_THEME');
  const [showDevConsole, setShowDevConsole] = useState(
    process.env.NODE_ENV === 'development'
  );
  const [inputHistoryIndex, setInputHistoryIndex] = useState(-1);
  const [deltaMode, setDeltaMode] = useState(false);
  const [commandInputHIstory, setCommandInputHistory] = usePermanentState(
    '',
    'LATEST_COMMAND_INPUT'
  );
  const [commandInput, setCommandInput] = useState('');
  const [openTrashModal, setOpenTrashModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [appVersion, setAppVersion] = useState('UNKNOWN');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [meta, setMeta] = useState({});
  const handleDataLogRef = useRef();
  const [devConsoleLogs, setDevConsoleLogs, devConsoleLogsRef] = useStateRef(
    []
  );
  const [options, setOptions] = usePermanentState(
    {
      skipDevicePull: false,
      skipSwfDecompile: false,
      extractMaster: true,
      parseActionScript: true,
      extractCharacterImage: true,
      extractMiscImage: true,
      extractAudio: true,
      extractAllFrames: false,
      extractGeneralAmf: true,
      customPort: '',
      processAtlas: false,
      processAtlasMisc: false,
      region: 'gl',
      debug: 'sprite item/sprite_sheet',
      isDebug: false,
    },
    'EXTRACT_OPTION',
    (val) => {
      try {
        return JSON.parse(val);
      } catch (err) {
        return {
          skipSwfDecompile: false,
          skipDevicePull: false,
          extractMaster: true,
          parseActionScript: true,
          extractCharacterImage: true,
          extractMiscImage: true,
          extractAudio: true,
          extractAllFrames: false,
          extractGeneralAmf: true,
          customPort: '',
          processAtlas: false,
          processAtlasMisc: false,
          region: 'gl',
          debug: 'sprite item/sprite_sheet',
          isDebug: false,
        };
      }
    },
    JSON.stringify
  );

  const [pullOptions, setPullOptions] = usePermanentState(
    {
      skipSwfDecompile: false,
      variant: 'device',
      customPort: '',
      parseActionScript: true,
      regionVariant: 'en',
      region: 'gl',
      baseVersion: '',
      customCdn: '',
      ignoreFull: false,
    },
    'PULL_OPTION',
    (val) => {
      try {
        return JSON.parse(val);
      } catch (err) {
        return {
          skipSwfDecompile: false,
          customPort: '',
          variant: 'device',
          regionVariant: 'en',
          region: 'gl',
          baseVersion: '',
          customCdn: '',
          ignoreFull: false,
        };
      }
    },
    JSON.stringify
  );
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openSelectOption, setOpenSelectOption] = useState(false);
  const [openSelectPullOption, setOpenSelectPullOption] = useState(false);
  const devLogRef = useRef();
  const [progresses, setProgresses] = useState([]);

  const changeAppTheme = () => {
    setAppTheme(APP_THEMES[APP_THEMES.indexOf(appTheme) + 1] || APP_THEMES[0]);
  };

  const onChangeOptions = (key, value) =>
    setOptions({ ...options, [key]: value });

  const onChangePullOptions = (key, value) => {
    return setPullOptions({
      ...pullOptions,
      ...((key === 'regionVariant' &&
        ['kr', 'en'].includes(value) && { region: 'gl' }) || { region: 'jp' }),
      ...(key === 'regionVariant' && {
        baseVersion: meta?.[`${value}LatestApiAssetVersion`] || '',
      }),
      [key]: value,
    });
  };

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

  const responseExtraction = useCallback((res) => {
    window.electron.ipcRenderer.responseExtraction(res);
    setExtractionError(null);
  }, []);

  const handleExtractionError = useCallback(
    (errorString) => {
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
        case 'FAILED_TO_LOAD_PATHS': {
          return setExtractionError({
            error:
              'Master tables are not extracted.\nPlease turn on the option "Extract master table" if this is your first extraction.',
            actions: [
              <WfDangerButton onClick={() => responseExtraction('done')}>
                Abort
              </WfDangerButton>,
              <WfButton
                onClick={() => responseExtraction('extractMaster|phase:5')}
              >
                Retry with option
              </WfButton>,
            ],
          });
        }
        case 'PROHIBITED_DATA_PERMISSION': {
          return setExtractionError({
            error:
              'Connected device does not have file listing access to the /data root directory.\nYour device must be rooted to extract assets.',
            ref: 'https://github.com/ScripterSugar/wdfp-extractor',
            actions: [
              <WfDangerButton onClick={() => responseExtraction('done')}>
                Abort
              </WfDangerButton>,
            ],
          });
        }
        case 'INVALID_BOOT_FFC6': {
          return setExtractionError({
            error: `boot_ffc6 script file seems like in invalid format.\nThis error might caused by misoperation of your FFDEC skipping the extraction due to timeout setting.\nIf the problem persists, try put the scripts file under swf/scripts directly using FFDEC standalone.\nboot_ffc6.as file must be present at the path ${targetDir}/swf/scripts/boot_ffc6.as\n\nOr you can retry swf extraction, purging current decompiled swf files.`,
            ref: 'https://github.com/jindrapetrik/jpexs-decompiler',
            actions: [
              <WfDangerButton onClick={() => responseExtraction('done')}>
                Abort
              </WfDangerButton>,
              <WfButton onClick={() => responseExtraction('purgeSwf')}>
                Purge SWF
              </WfButton>,
              <WfButton onClick={() => responseExtraction('retry')}>
                Retry
              </WfButton>,
            ],
          });
        }
        case 'FAILED_TO_EXTRACT_BOOT_FFC6': {
          return setExtractionError({
            error: `Essential AS scripts were not extracted due to performance issue or misoperation of FFDEC.\nIf the problem persists, try put the scripts file under swf/scripts directly using FFDEC standalone.\nboot_ffc6.as file must be present at the path ${targetDir}/swf/scripts/boot_ffc6.as\n\nOr you can retry swf extraction, purging current decompiled swf files.`,
            ref: 'https://github.com/jindrapetrik/jpexs-decompiler',
            actions: [
              <WfDangerButton onClick={() => responseExtraction('done')}>
                Abort
              </WfDangerButton>,
              <WfButton onClick={() => responseExtraction('purgeSwf')}>
                Purge SWF
              </WfButton>,
              <WfButton onClick={() => responseExtraction('retry')}>
                Retry
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
    },
    [responseExtraction, setExtractionError, targetDir]
  );

  const startExtraction = useCallback(
    async (command) => {
      setIsExtracting(true);
      setDevConsoleLogs([]);
      setOpenSelectOption(false);
      setShowDevConsole(true);

      if (/[^A-z0-9/\\:-]/.test(targetDir)) {
        setIsExtracting(false);
        return setExtractionError({
          error:
            'Invalid characters in target directory.\nExtraction path must only include english and dashes.\nTry to create directory at the root of your drive, somewhere like C:/wafuriextract',
          actions: [
            <WfDangerButton onClick={() => responseExtraction('done')}>
              Abort
            </WfDangerButton>,
          ],
        });
      }
      if (command) {
        window.electron.ipcRenderer.startExtraction(targetDir, {
          ...options,
          debug: command,
        });
      } else {
        window.electron.ipcRenderer.startExtraction(targetDir, {
          ...options,
          debug: options.isDebug && options.debug,
          deltaMode: deltaMode && meta.latestPullStamp,
        });
      }

      let ipcResponse;

      while (!ipcResponse?.success) {
        ipcResponse = await getIpcReturn('extractionResponseMain');

        if (ipcResponse?.error) {
          handleExtractionError(ipcResponse.error);
        }
      }

      return setIsExtracting(false);
    },
    [
      handleExtractionError,
      options,
      setDevConsoleLogs,
      targetDir,
      responseExtraction,
      deltaMode,
      meta,
    ]
  );

  const startPull = useCallback(async () => {
    setIsExtracting(true);
    setDevConsoleLogs([]);
    setOpenSelectPullOption(false);
    setShowDevConsole(true);

    if (/[^A-z/-:]/.test(targetDir)) {
      setIsExtracting(false);
      return setExtractionError({
        error:
          'Invalid characters in target directory.\nExtraction path must includes only english and dashes.',
        actions: [
          <WfDangerButton onClick={() => responseExtraction('done')}>
            Abort
          </WfDangerButton>,
        ],
      });
    }
    window.electron.ipcRenderer.startPull(targetDir, {
      ...pullOptions,
      deltaMode: deltaMode && 'latest',
      region:
        (['en', 'kr'].includes(pullOptions.regionVariant) && 'gl') || 'jp',
    });

    let ipcResponse;

    while (!ipcResponse?.success) {
      ipcResponse = await getIpcReturn('extractionResponseMain');

      if (ipcResponse?.error) {
        handleExtractionError(ipcResponse.error);
      }
    }

    return setIsExtracting(false);
  }, [
    handleExtractionError,
    pullOptions,
    setDevConsoleLogs,
    targetDir,
    responseExtraction,
    deltaMode,
  ]);

  const openTargetDir = () => {
    window.electron.ipcRenderer.openDirectory(targetDir);
  };

  useEffect(() => {
    if (targetDir) {
      (async () => {
        const ipcReturn = getIpcReturn('getMetaResponse');
        await window.electron.ipcRenderer.getMeta(targetDir);
        console.log(await ipcReturn);

        setMeta(await ipcReturn);
      })();
    }
  }, [targetDir, isExtracting]);

  useEffect(() => {
    if (meta && meta[`${pullOptions.regionVariant}LatestApiAssetVersion`]) {
      onChangePullOptions(
        'baseVersion',
        meta[`${pullOptions.regionVariant}LatestApiAssetVersion`]
      );
    }
  }, [meta]);

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

    onChangeOptions('isDebug', process.env.NODE_ENV === 'development');

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

  const loadPrevCommand = () => {
    const prevCommand = commandInputHIstory.split(',')[inputHistoryIndex + 1];
    if (!prevCommand) return null;
    setCommandInput(prevCommand);

    setInputHistoryIndex(inputHistoryIndex + 1);
  };
  const loadNextCommand = () => {
    if (!inputHistoryIndex) {
      setCommandInput('');
      return setInputHistoryIndex(-1);
    }
    setCommandInput(commandInputHIstory.split(',')[inputHistoryIndex - 1]);

    setInputHistoryIndex(inputHistoryIndex - 1);
  };

  const saveCommand = () => {
    const splitHistories = commandInputHIstory.split(',');

    splitHistories.unshift(commandInput);

    if (splitHistories.length > 100) {
      splitHistories.pop();
    }

    setCommandInputHistory(splitHistories.join(','));
  };

  const clearMeta = (targetData) => {
    if (!targetDir) return;
    setOpenTrashModal(false);
    setShowDevConsole(true);
    window.electron.ipcRenderer.clearMeta(targetDir, targetData);
  };

  const excuteCommand = () => {
    if (!commandInput) return;
    saveCommand();
    setCommandInput('');
    setInputHistoryIndex(-1);

    setTimeout(() => startExtraction(commandInput), 1);
  };

  const selectedPreset = useMemo(() => {
    if (
      !Object.keys(PRESET_FAST).filter(
        (key) => PRESET_FAST[key] !== options[key]
      ).length
    ) {
      return 'fast';
    }
    if (
      !Object.keys(PRESET_FULL).filter(
        (key) => PRESET_FULL[key] !== options[key]
      ).length
    ) {
      return 'full';
    }
    return null;
  }, [options]);

  const isDeltaExtractionAvailable = useMemo(() => {
    return meta.latestPullStamp && meta.deltaAvailable;
  }, [meta]);

  return (
    <div
      id="app-main"
      style={{
        backgroundImage: `url(${THEME_SOURCEMAP[appTheme].bg})`,
        backgroundSize: 'cover',
      }}
    >
      <AppMainLayout>
        <WfCard
          style={{
            width: '50%',
            height: '100%',
            ...(deltaMode && {
              border: '6px solid #50e99b',
              padding: 18,
            }),
          }}
        >
          <WfButton
            disabled={!targetDir || isExtracting}
            onClick={
              targetDir && !isExtracting
                ? () => setOpenSelectPullOption(true)
                : () => {}
            }
          >
            <img src={extractIcon} alt="extract" width={24} />
            Pull/Download Assets
          </WfButton>
          <LayoutFlex style={{ marginTop: 16, marginBottom: 16 }}>
            <WfButton
              style={{ flexGrow: 1 }}
              disabled={
                !targetDir ||
                isExtracting ||
                (deltaMode && !isDeltaExtractionAvailable)
              }
              onClick={
                targetDir && !isExtracting
                  ? () => setOpenSelectOption(true)
                  : () => {}
              }
            >
              <img src={viewerIcon} alt="viewer" width={24} />
              Extract Data
              {isExtracting && (
                <SpinImg
                  src={THEME_SOURCEMAP[appTheme].spin}
                  style={{ marginLeft: 8 }}
                  alt="info"
                  width={24}
                />
              )}
            </WfButton>
            <WfButton
              style={{
                flexGrow: 0,
                flexShrink: 0,
                width: 64,
                marginLeft: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                border: deltaMode && '6px solid #50e99b',
              }}
              disabled={
                !meta.jpLatestApiAssetVersion &&
                !meta.krLatestApiAssetVersion &&
                !meta.enLatestApiAssetVersion
              }
              onClick={() => {
                if (!deltaMode) {
                  setPullOptions({ ...pullOptions, variant: 'api' });
                }
                setDeltaMode(!deltaMode);
              }}
            >
              <img
                style={{ margin: 0 }}
                src={deltaIcon}
                alt="trash"
                width={32}
              />
            </WfButton>
          </LayoutFlex>
          <WfButton
            disabled={!targetDir}
            onClick={targetDir ? openTargetDir : () => {}}
          >
            <img src={folderIcon} alt="folder" width={24} />
            Open Extraction Directory
          </WfButton>
          <LayoutFlex style={{ marginTop: 16 }}>
            <WfButton style={{ flexGrow: 1 }} onClick={changeTargetDir}>
              <img src={settingsIcon} alt="settings" width={24} />
              {targetDir ? 'Change' : 'Set'} Extraction Directory
            </WfButton>
            <WfButton
              style={{
                flexGrow: 0,
                flexShrink: 0,
                width: 64,
                marginLeft: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              disabled={!targetDir}
              onClick={() => setOpenTrashModal(true)}
            >
              <img
                style={{ margin: 0 }}
                src={trashIcon}
                alt="trash"
                width={24}
              />
            </WfButton>
          </LayoutFlex>
          <div>
            <Typography style={{ width: '100%', marginTop: 16 }}>
              {targetDir?.replace(/\\/g, '/') || 'N/A'}
            </Typography>
          </div>
          {deltaMode && (
            <div>
              <Typography style={{ width: '100%' }}>
                Delta extraction mode
              </Typography>
            </div>
          )}
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
              position: 'relative',
              paddingBottom: 40,
            }}
          >
            <DevConsoleInner ref={devLogRef}>
              {devConsoleLogs.map((log) => (
                <p>{log}</p>
              ))}
              {progresses.map((progress) => (
                <Progress
                  key={progress.id}
                  progress={progress}
                  appTheme={appTheme}
                />
              ))}
            </DevConsoleInner>
            <CommandWrapper>
              <TextField
                value={commandInput}
                disabled={isExtracting}
                onChange={(event) => setCommandInput(event.target.value)}
                onEnter={excuteCommand}
                onArrowUp={loadPrevCommand}
                onArrowDown={loadNextCommand}
              />
            </CommandWrapper>
          </WfCard>
        )}
      </AppMainLayout>
      <Modal
        open={openInfoModal}
        style={{ height: 600 }}
        onClose={() => setOpenInfoModal(false)}
      >
        <img
          src={THEME_SOURCEMAP[appTheme].special}
          onClick={() => {
            onChangeOptions('isDebug', !options.isDebug);
            window.electron.ipcRenderer.openDevTools();
          }}
          alt="theo"
          style={{ width: '100%', marginBottom: 16 }}
        />
        <div style={{ flexGrow: 1 }} />
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
        {(updateAvailable && (
          <>
            <Typography>Update Available</Typography>
            <WfButton
              style={{
                justifyContent: 'center',
                height: 48,
                marginTop: 16,
                fontSize: '1rem',
              }}
              onClick={restartAndUpdate}
            >
              Restart And Update
            </WfButton>
          </>
        )) || <Typography>No updates available</Typography>}
        <br />
        Created by | INASOM#3195
        <br />
        <WfButton
          style={{
            backgroundImage: `url(${THEME_SOURCEMAP[appTheme].banner})`,
            backgroundSize: 'cover',
            justifyContent: 'center',
            height: 48,
            marginTop: 16,
          }}
          onClick={changeAppTheme}
        />
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
        <WfButton
          style={{
            background: 'black',
            justifyContent: 'center',
            height: 48,
            marginTop: 16,
          }}
          onClick={() =>
            window.electron.ipcRenderer.openExternal(
              'https://github.com/ScripterSugar/wdfp-extractor'
            )
          }
        >
          <img src={github} alt="github" style={{ width: 32, margin: 0 }} />
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
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
            <LayoutFlexSpaceBetween>
              <Typography>Extract master table</Typography>
              <Switch
                value={options.extractMaster}
                onClick={() =>
                  onChangeOptions('extractMaster', !options.extractMaster)
                }
              />
            </LayoutFlexSpaceBetween>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Search ActionScripts for assets</Typography>
                <IndicatorTypo>Requires SWF decompilation</IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                data-disabled={!options.extractMaster}
                value={options.parseActionScript}
                onClick={() =>
                  options.extractMaster &&
                  onChangeOptions(
                    'parseActionScript',
                    !options.parseActionScript
                  )
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
                <Typography>Process character image by atlas</Typography>
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
                <Typography>Crop general image assets by atlases</Typography>
                <IndicatorTypo>
                  This makes extraction process way slower.
                </IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                data-disabled={!options.extractMiscImage}
                value={options.processAtlasMisc}
                onClick={() =>
                  options.extractMiscImage &&
                  onChangeOptions('processAtlasMisc', !options.processAtlasMisc)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
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
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Extract general configs</Typography>
                <IndicatorTypo>Skill descriptors, ETC.</IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                value={options.extractGeneralAmf}
                onClick={() =>
                  onChangeOptions(
                    'extractGeneralAmf',
                    !options.extractGeneralAmf
                  )
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          <LayoutFlexDivideHalf style={{ marginTop: 8 }}>
            <LayoutFlexSpaceBetween>
              <LayoutFlexColumn>
                <Typography>Include duplicated frames</Typography>
                <IndicatorTypo>
                  This makes extraction process slower.
                </IndicatorTypo>
              </LayoutFlexColumn>
              <Switch
                data-disabled={!options.processAtlasMisc}
                value={options.extractAllFrames}
                onClick={() =>
                  options.processAtlasMisc &&
                  onChangeOptions('extractAllFrames', !options.extractAllFrames)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexDivideHalf>
          {options.isDebug && (
            <LayoutFlexSpaceBetween style={{ marginTop: 16 }}>
              <LayoutFlexColumn>
                <Typography style={{ flexShrink: 0, marginRight: 16 }}>
                  Dev command
                </Typography>
                <IndicatorTypo>
                  usage: [command] [filepath] <br />
                  commands: [master | general | image | audio | sprite | search
                  | exboost]
                </IndicatorTypo>
              </LayoutFlexColumn>
              <textarea
                style={{ width: '50%', height: 48, whiteSpace: 'pre-line' }}
                value={options.debug}
                onChange={(event) =>
                  onChangeOptions('debug', event.target.value)
                }
              />
            </LayoutFlexSpaceBetween>
          )}
        </LayoutFlexColumn>
        <IndicatorTypo style={{ marginTop: 16, marginLeft: 4 }}>
          Option preset
        </IndicatorTypo>
        <ModalActions style={{ marginTop: 8 }}>
          <LayoutFlexColumn style={{ width: '100%' }}>
            <WfSelectButton
              data-selected={selectedPreset === 'fast'}
              onClick={() => {
                setOptions({
                  ...options,
                  ...PRESET_FAST,
                });
              }}
            >
              Fast
            </WfSelectButton>
            <IndicatorTypo style={{ marginTop: 8 }}>
              Run time (full asset): ~10min
            </IndicatorTypo>
          </LayoutFlexColumn>
          <LayoutFlexColumn style={{ width: '100%' }}>
            <WfSelectButton
              data-selected={selectedPreset === 'full'}
              onClick={() => {
                setOptions({
                  ...options,
                  ...PRESET_FULL,
                });
              }}
            >
              Full
            </WfSelectButton>
            <IndicatorTypo style={{ marginTop: 8 }}>
              Run time (full asset): 1hr+ for initial extraction
            </IndicatorTypo>
          </LayoutFlexColumn>
        </ModalActions>
        <ModalActions style={{ marginTop: 48 }}>
          <WfDangerButton
            style={{ width: 160 }}
            onClick={() => setOpenSelectOption(false)}
          >
            Abort
          </WfDangerButton>
          <WfButton style={{ width: 160 }} onClick={() => startExtraction()}>
            Extract
          </WfButton>
        </ModalActions>
      </Modal>
      <Modal
        style={{ width: 720, height: 500 }}
        open={!!openSelectPullOption}
        onClose={() => {}}
      >
        <IndicatorTypo style={{ marginLeft: 4 }}>
          Pull assets from
        </IndicatorTypo>
        <ModalActions style={{ marginTop: 8 }}>
          <WfSelectButton
            data-selected={pullOptions.variant === 'device'}
            disabled={deltaMode}
            onClick={() => onChangePullOptions('variant', 'device')}
          >
            {(deltaMode && 'Deltamode not supported') || 'From Device/Emulator'}
          </WfSelectButton>
          <WfSelectButton
            data-selected={pullOptions.variant === 'api'}
            onClick={() => onChangePullOptions('variant', 'api')}
          >
            From API
          </WfSelectButton>
        </ModalActions>
        {(pullOptions.variant === 'api' && (
          <LayoutFlexColumn style={{ marginTop: 24 }}>
            <LayoutFlexDivideHalf>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>Ignore full asset download</Typography>
                  <IndicatorTypo>Will only fetch diff data</IndicatorTypo>
                </LayoutFlexColumn>
                <Switch
                  value={pullOptions.ignoreFull}
                  data-disabled={deltaMode}
                  onClick={() =>
                    onChangePullOptions('ignoreFull', !pullOptions.ignoreFull)
                  }
                />
              </LayoutFlexSpaceBetween>
            </LayoutFlexDivideHalf>
            <LayoutFlexDivideHalf style={{ marginTop: 16 }}>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>Base version</Typography>
                  <IndicatorTypo>
                    Input base asset version. EX) 1.531.10
                  </IndicatorTypo>
                </LayoutFlexColumn>
                <input
                  style={{ width: 80 }}
                  value={pullOptions.baseVersion}
                  placeholder="latest"
                  onChange={(event) =>
                    onChangePullOptions('baseVersion', event.target.value)
                  }
                />
              </LayoutFlexSpaceBetween>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>
                    Latest fetched version:{' '}
                    {meta?.[
                      `${pullOptions.regionVariant}LatestApiAssetVersion`
                    ] || 'N/A'}
                  </Typography>
                </LayoutFlexColumn>
              </LayoutFlexSpaceBetween>
            </LayoutFlexDivideHalf>
            <LayoutFlexSpaceBetween style={{ marginTop: 16 }}>
              <LayoutFlexColumn>
                <Typography>Custom CDN address</Typography>
                <IndicatorTypo>
                  CDN address to replace {`{$cdnAddress}`} value.
                </IndicatorTypo>
              </LayoutFlexColumn>
              <input
                style={{ width: '50%' }}
                value={pullOptions.customCdn}
                onChange={(event) =>
                  onChangePullOptions('customCdn', event.target.value)
                }
              />
            </LayoutFlexSpaceBetween>
          </LayoutFlexColumn>
        )) || (
          <LayoutFlexColumn style={{ marginTop: 24 }}>
            <LayoutFlexDivideHalf>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>Skip Swf decompile</Typography>
                  <IndicatorTypo>Will use packed boot_ffc6.as</IndicatorTypo>
                </LayoutFlexColumn>
                <Switch
                  value={pullOptions.skipSwfDecompile}
                  onClick={() =>
                    onChangePullOptions(
                      'skipSwfDecompile',
                      !pullOptions.skipSwfDecompile
                    )
                  }
                />
              </LayoutFlexSpaceBetween>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>Custom emulator port</Typography>
                  <IndicatorTypo>
                    Specify your emulator port if needed
                  </IndicatorTypo>
                </LayoutFlexColumn>
                <input
                  style={{ width: 80 }}
                  value={pullOptions.customPort}
                  onChange={(event) =>
                    onChangePullOptions('customPort', event.target.value)
                  }
                />
              </LayoutFlexSpaceBetween>
            </LayoutFlexDivideHalf>
            <LayoutFlexDivideHalf style={{ marginTop: 16 }}>
              <LayoutFlexSpaceBetween>
                <LayoutFlexColumn>
                  <Typography>Full SWF Decompile</Typography>
                  <IndicatorTypo>Will take up more then 10x time</IndicatorTypo>
                </LayoutFlexColumn>
                <Switch
                  value={pullOptions.parseActionScript}
                  data-disabled={pullOptions.skipSwfDecompile}
                  onClick={() =>
                    onChangePullOptions(
                      'parseActionScript',
                      !pullOptions.parseActionScript
                    )
                  }
                />
              </LayoutFlexSpaceBetween>
            </LayoutFlexDivideHalf>
          </LayoutFlexColumn>
        )}
        <div style={{ flexGrow: 1 }} />
        <IndicatorTypo style={{ marginTop: 16, marginLeft: 4 }}>
          Target region (version)
        </IndicatorTypo>
        <ModalActions style={{ marginTop: 8 }}>
          <WfSelectButton
            data-selected={pullOptions.regionVariant === 'en'}
            onClick={() => onChangePullOptions('regionVariant', 'en')}
          >
            EN
          </WfSelectButton>
          <WfSelectButton
            data-selected={pullOptions.regionVariant === 'kr'}
            onClick={() => onChangePullOptions('regionVariant', 'kr')}
          >
            KR
          </WfSelectButton>
          <WfSelectButton
            data-selected={pullOptions.regionVariant === 'jp'}
            onClick={() => onChangePullOptions('regionVariant', 'jp')}
          >
            JP
          </WfSelectButton>
        </ModalActions>
        <ModalActions style={{ marginTop: 48 }}>
          <WfDangerButton
            style={{ width: 160 }}
            onClick={() => setOpenSelectPullOption(false)}
          >
            Abort
          </WfDangerButton>
          <WfButton style={{ width: 160 }} onClick={() => startPull()}>
            Pull assets
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
      <Modal open={openTrashModal} onClose={() => setOpenTrashModal(false)}>
        <WfButton
          style={{
            fontSize: '1rem',
            paddingRight: 16,
          }}
          onClick={() => clearMeta('characterSprites')}
        >
          <img src={trashIcon} alt="trash" width={24} />
          Reset character sprites cache
        </WfButton>
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
