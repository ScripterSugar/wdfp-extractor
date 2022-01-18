const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    showOpenDialog() {
      ipcRenderer.send('showOpenDialog', 'asd');
    },
    openDirectory(dir) {
      ipcRenderer.send('openDirectory', dir);
    },
    startExtraction(rootDir, options) {
      ipcRenderer.send('startExtraction', rootDir, options);
    },
    openExternal(external) {
      shell.openExternal(external);
    },
    getAppVersion() {
      ipcRenderer.send('getAppVersion');
    },
    responseExtraction(response) {
      ipcRenderer.send('extractionResponseRenderer', response);
    },
    on(channel, func) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    once(channel, func) {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    removeAllListeners(channel) {
      ipcRenderer.removeAllListeners(channel);
    },
  },
});
