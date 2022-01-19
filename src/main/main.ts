/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import logger from './wf/logger';
import WfExtractor from './wf';

let mainWindow: BrowserWindow | null = null;

ipcMain.on('showOpenDialog', async (event, arg) => {
  const returnedPath = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });

  event.reply('showOpenDialog', returnedPath);
});

ipcMain.on('openDevTools', async (event, arg) => {
  mainWindow.webContents.openDevTools();
});

ipcMain.on('getAppVersion', async (event) => {
  event.reply('appVersion', app.getVersion());
});

ipcMain.on('openDirectory', async (event, openPath) => {
  shell.openPath(openPath);
});
ipcMain.on('updateApp', async (event, openPath) => {
  autoUpdater.quitAndInstall();
});

class ExtractionProcessor {
  packetResolver: (any) => void;

  awaitNextPacket = () => {
    return new Promise((resolve) => {
      this.packetResolver = resolve;
    });
  };

  resolveAwait = (data) => {
    if (this.packetResolver) {
      this.packetResolver(data);
      this.packetResolver = null;
    }
  };
}

const extractionProcessor = new ExtractionProcessor();

ipcMain.on('extractionResponseRenderer', async (event, response) => {
  extractionProcessor.resolveAwait(response);
});

ipcMain.on(
  'startExtraction',
  async (
    event,
    rootDir,
    { region, extractMaster, extractImage, processAtlas }
  ) => {
    let replyPacket;
    let extractionPhase = 0;

    const wfExtractor = new WfExtractor({ region, rootDir });

    while (replyPacket !== 'done') {
      console.log(`TRYING EXTRACTION, Current Phase ${extractionPhase}`);
      try {
        if (extractionPhase <= 0) {
          await wfExtractor.init();
          extractionPhase = 1;
        }

        if (extractionPhase <= 1) {
          if (/selectDevice/.test(replyPacket)) {
            const deviceId = replyPacket.replace(/selectDevice/, '');
            await wfExtractor.selectDevice(deviceId);
          } else {
            await wfExtractor.selectDevice();
          }

          extractionPhase = 2;
        }

        if (extractionPhase <= 2) {
          await wfExtractor.connectAdbShell();
          extractionPhase = 3;
        }

        if (extractionPhase <= 3) {
          await wfExtractor.dumpAndExtractApk();
          extractionPhase = 4;
        }

        if (extractionPhase <= 4) {
          await wfExtractor.indexWfAssets();
          await wfExtractor.dumpWfAssets();
          await wfExtractor.mergeAssets();
          extractionPhase = 4.5;
        }

        if (extractionPhase <= 4.5) {
          await wfExtractor.buildDigestFileMap();

          extractionPhase = 5;
        }

        if (extractionPhase <= 5) {
          if (extractMaster) {
            await wfExtractor.extractMasterTable();
          }
          extractionPhase = 6;
        }

        if (extractionPhase <= 6) {
          if (extractImage) {
            await wfExtractor.extractImageAssets();

            if (processAtlas) {
              await wfExtractor.extractCharacterSpriteMetaDatas();
              await wfExtractor.generateAnimatedSprites();
            }
          }
          extractionPhase = 7;
        }

        break;
      } catch (err) {
        logger.log(`Error ocurred while extraction: ${err?.message || err}`);

        event.reply('extractionResponseMain', {
          error: err?.message || 'UNKNOWN',
        });
        replyPacket = await extractionProcessor.awaitNextPacket();
      }
    }

    event.reply('extractionResponseMain', { success: true });
  }
);

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    resizable: false,
    icon: getAssetPath('icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  logger.connectWindow(mainWindow);

  mainWindow.setMenu(null);

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
    autoUpdater.checkForUpdatesAndNotify();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update_downloaded');
});
