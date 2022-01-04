const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    showOpenDialog() {
      ipcRenderer.send('showOpenDialog', 'asd');
    },
    openDirectory(dir) {
      ipcRenderer.send('openDirectory', dir);
    },
    startExtraction(rootDir) {
      ipcRenderer.send('startExtraction', rootDir);
    },
    on(channel, func) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    once(channel, func) {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
  },
});
