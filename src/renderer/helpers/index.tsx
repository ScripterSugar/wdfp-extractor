export const getIpcReturn = (channel) => {
  return new Promise((resolve) => {
    window.electron.ipcRenderer.once(channel, resolve);
  });
};

export const asd = 1;
