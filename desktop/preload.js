// Ponte mínima entre o app e o Windows: tema do vidro, tentar de novo sem internet e a barra flutuante.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todayDesktop', {
  setTheme: (mode) => ipcRenderer.send('today:set-theme', mode === 'light' ? 'light' : 'dark'),
  retry: () => ipcRenderer.send('today:retry'),
  // barra flutuante (aparece ao minimizar)
  barConfig: (enabled) => ipcRenderer.send('today:bar-config', !!enabled),
  barSize: (w, h, side) => ipcRenderer.send('today:bar-size', w, h, side),
  barGo: (page) => ipcRenderer.send('today:bar-go', String(page || '')),
  onGoto: (cb) => ipcRenderer.on('today:goto', (_e, page) => { try { cb(page); } catch (e) {} }),
});
