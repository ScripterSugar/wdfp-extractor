import electron, { ipcMain } from 'electron';

class Logger {
  window: electron.BrowserWindow;

  constructor({ window }: { window: electron.BrowserWindow }) {
    this.window = window;
  }

  log = (...args) => {
    console.log(...args);

    if (this.window) {
      this.window.webContents.send('ipc-logger-log', ...args);
    }
  };

  devLog = (...args) => {
    if (process.env.IS_DEBUG === 'true') {
      console.log(...args);
    }
  };

  connectWindow = (window: electron.BrowserWindow) => {
    this.window = window;
  };
}

export default new Logger({});
