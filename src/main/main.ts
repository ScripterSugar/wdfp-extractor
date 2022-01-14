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

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('showOpenDialog', async (event, arg) => {
  const returnedPath = dialog.showOpenDialogSync({
    properties: ['openDirectory'],
  });

  event.reply('showOpenDialog', returnedPath);
});

ipcMain.on('getAppVersion', async (event) => {
  event.reply('appVersion', app.getVersion());
});

ipcMain.on('openDirectory', async (event, openPath) => {
  shell.openPath(openPath);
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

ipcMain.on('startExtraction', async (event, rootDir) => {
  let replyPacket;
  let extractionPhase = 0;

  const wfExtractor = new WfExtractor();

  wfExtractor.setRootPath(rootDir);

  while (replyPacket !== 'done') {
    console.log(`TRYING EXTRACTION, Current Phase ${extractionPhase}`);
    try {
      if (extractionPhase <= 0) {
        await wfExtractor.init();
        extractionPhase = 1;
      }

      if (extractionPhase <= 1) {
        const deviceList = await wfExtractor.getDeviceList();

        if (!deviceList.length) {
          event.reply('extractionResponseMain', { error: 'DEVICE_NOT_FOUND' });
          replyPacket = await extractionProcessor.awaitNextPacket();
          continue;
        } else {
          extractionPhase = 2;
        }
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
        extractionPhase = 5;
      }

      if (extractionPhase <= 5) {
        await wfExtractor.extractMasterTable();
        extractionPhase = 6;
      }

      if (extractionPhase <= 6) {
        await wfExtractor.extractImageAssets();
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
});

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
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
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
