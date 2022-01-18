import electron, { ipcMain } from 'electron';

class Logger {
  window: electron.BrowserWindow;

  constructor({ window }: { window: electron.BrowserWindow }) {
    this.window = window;
    this.absCount = 0;
  }

  setThrottle = () => {
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }
    this.throttle = true;

    this.throttleTimeout = setTimeout(() => {
      this.throttle = false;
    }, 100);
  };

  isThrottled = (targetCount) => {
    this.absCount += 1;

    if (this.absCount >= (targetCount || 500)) {
      this.absCount = 0;
      this.setThrottle();
      return false;
    }

    if (this.throttle) return true;

    this.setThrottle();

    return false;
  };

  log = (...args) => {
    console.log(...args);

    if (this.window) {
      this.window.webContents.send('ipc-logger-log', ...args);
    }
  };

  data = (serializable, { maxThrottled } = { maxThrottled: 500 }) => {
    if (serializable.type === 'progress') {
      if (this.isThrottled(maxThrottled)) return;
    }
    if (this.window) {
      this.window.webContents.send(
        'ipc-logger-log',
        JSON.stringify(serializable),
        'data'
      );
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
