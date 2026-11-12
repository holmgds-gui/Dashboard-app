// Today para Windows: abre o app em uma janela de vidro (acrílico do Windows 11),
// mostrando a área de trabalho desfocada atrás. O conteúdo vem do site no GitHub Pages,
// então login, sincronização e atualizações são os mesmos do app web.
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu } = require('electron');
const path = require('path');

const APP_URL = 'https://holmgds-gui.github.io/Dashboard-app/';
const OVERLAY = { dark: '#eef1f5', light: '#141a22' };

let win = null;

function createWindow() {
  nativeTheme.themeSource = 'dark';
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Today',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#00000000',
    backgroundMaterial: 'acrylic',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: OVERLAY.dark, height: 44 },
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  Menu.setApplicationMenu(null);
  win.webContents.setUserAgent(win.webContents.getUserAgent() + ' TodayDesktop/' + app.getVersion());

  // Links externos (Salvos, e-mails de confirmação) abrem no navegador padrão
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(APP_URL)) { e.preventDefault(); shell.openExternal(url); }
  });

  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    win.loadFile(path.join(__dirname, 'offline.html'));
  });

  win.once('ready-to-show', () => win.show());
  win.loadURL(APP_URL);
}

// O app avisa quando você troca entre claro e escuro: o vidro do Windows acompanha
ipcMain.on('today:set-theme', (_e, mode) => {
  if (!win || (mode !== 'dark' && mode !== 'light')) return;
  nativeTheme.themeSource = mode;
  try { win.setTitleBarOverlay({ color: '#00000000', symbolColor: OVERLAY[mode], height: 44 }); } catch (e) {}
});
ipcMain.on('today:retry', () => { if (win) win.loadURL(APP_URL); });

const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
