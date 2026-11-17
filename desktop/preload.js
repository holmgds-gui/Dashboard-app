// Ponte mínima entre o app e o Windows: tema do vidro, tentar de novo sem internet e a barra flutuante.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todayDesktop', {
  setTheme: (mode) => ipcRenderer.send('today:set-theme', mode === 'light' ? 'light' : 'dark'),
  retry: () => ipcRenderer.send('today:retry'),
  // botões da janela (minimizar, maximizar, fechar)
  winCtl: (cmd) => ipcRenderer.send('today:win-ctl', String(cmd)),
  onWinState: (cb) => ipcRenderer.on('today:win-state', (_e, max) => { try { cb(!!max); } catch (e) {} }),
  // barra flutuante (aparece ao minimizar)
  barHit: (hit) => ipcRenderer.send('today:bar-hit', !!hit),
  barDragStart: () => ipcRenderer.send('today:bar-drag-start'),
  barDragMove: (dx, dy) => ipcRenderer.send('today:bar-drag-move', dx, dy),
  barDragEnd: () => ipcRenderer.send('today:bar-drag-end'),
  barConfig: (enabled) => ipcRenderer.send('today:bar-config', !!enabled),
  barSize: (w, h, side) => ipcRenderer.send('today:bar-size', w, h, side),
  barGo: (page) => ipcRenderer.send('today:bar-go', String(page || '')),
  onGoto: (cb) => ipcRenderer.on('today:goto', (_e, page) => { try { cb(page); } catch (e) {} }),
});
