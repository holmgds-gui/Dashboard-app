// Ponte mínima entre o app e o Windows: só trocar o tema do vidro e tentar de novo sem internet.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todayDesktop', {
  setTheme: (mode) => ipcRenderer.send('today:set-theme', mode === 'light' ? 'light' : 'dark'),
  retry: () => ipcRenderer.send('today:retry'),
});
