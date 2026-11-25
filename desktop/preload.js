// Ponte mínima entre o app e o Windows: tema do vidro, tentar de novo sem internet e a barra flutuante.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todayDesktop', {
  webview: true, // este programa sabe abrir apps dentro do Today
  openExternal: (url) => ipcRenderer.send('today:open-ext', String(url || '')),
  appClear: (partition) => ipcRenderer.invoke('today:app-clear', String(partition || '')),
  setTheme: (mode) => ipcRenderer.send('today:set-theme', mode === 'light' ? 'light' : 'dark'),
  retry: () => ipcRenderer.send('today:retry'),
  // botões da janela (minimizar, maximizar, fechar)
  setGlass: (t) => ipcRenderer.send('today:set-glass', +t || 0),
  winCtl: (cmd) => ipcRenderer.send('today:win-ctl', String(cmd)),
  onWinState: (cb) => ipcRenderer.on('today:win-state', (_e, max) => { try { cb(!!max); } catch (e) {} }),
  // tamanho real da janela: o Today se ajusta a ele mesmo se o Windows não avisar a página
  onWinSize: (cb) => ipcRenderer.on('today:win-size', (_e, w, h) => { try { cb(+w || 0, +h || 0); } catch (e) {} }),
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
