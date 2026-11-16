// Today para Windows: abre o app em uma janela de vidro (acrílico do Windows 11),
// mostrando a área de trabalho desfocada atrás. O conteúdo vem do site no GitHub Pages,
// então login, sincronização e atualizações são os mesmos do app web.
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://holmgds-gui.github.io/Dashboard-app/';
const OVERLAY = { dark: '#eef1f5', light: '#141a22' };

let win = null;
let bar = null;            // janela da barra flutuante (aparece quando o Today é minimizado)
let barEnabled = false;    // o app avisa se o usuário quer a barra flutuante
let barSide = 'left';
let barSize = { w: 72, h: 360 };
let quitting = false;

// ---- barra flutuante ----
const posFile = () => path.join(app.getPath('userData'), 'bar-position.json');
function readPos() { try { return JSON.parse(fs.readFileSync(posFile(), 'utf8')); } catch (e) { return null; } }
function savePos() {
  if (!bar || bar.isDestroyed()) return;
  const [x, y] = bar.getPosition();
  try { fs.writeFileSync(posFile(), JSON.stringify({ x, y })); } catch (e) {}
}
function defaultPos(w, h) {
  const wa = screen.getPrimaryDisplay().workArea;
  const m = 10;
  if (barSide === 'right') return { x: wa.x + wa.width - w - m, y: wa.y + Math.round((wa.height - h) / 2) };
  if (barSide === 'top') return { x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + m };
  if (barSide === 'bottom') return { x: wa.x + Math.round((wa.width - w) / 2), y: wa.y + wa.height - h - m };
  return { x: wa.x + m, y: wa.y + Math.round((wa.height - h) / 2) };
}
function clampToScreen(x, y, w, h) {
  const d = screen.getDisplayNearestPoint({ x: x + Math.round(w / 2), y: y + Math.round(h / 2) });
  const wa = d.workArea;
  return {
    x: Math.min(Math.max(wa.x, x), wa.x + wa.width - w),
    y: Math.min(Math.max(wa.y, y), wa.y + wa.height - h),
  };
}
function createBar() {
  if (bar && !bar.isDestroyed()) return bar;
  const saved = readPos();
  const p = saved ? clampToScreen(saved.x, saved.y, barSize.w, barSize.h) : defaultPos(barSize.w, barSize.h);
  bar = new BrowserWindow({
    width: barSize.w, height: barSize.h, x: p.x, y: p.y,
    frame: false, transparent: true, resizable: false, maximizable: false, minimizable: false, fullscreenable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false, focusable: true,
    backgroundColor: '#00000000',
    title: 'Today (barra)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
    },
  });
  bar.setAlwaysOnTop(true, 'floating');
  bar.webContents.setUserAgent(bar.webContents.getUserAgent() + ' TodayDesktop/' + app.getVersion());
  bar.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  bar.webContents.on('will-navigate', (e) => e.preventDefault());
  // Se a barra não carregar, não deixa o Today "sumido": volta a janela normal
  bar.webContents.on('did-fail-load', (_e, code, _d, _u, isMainFrame) => { if (isMainFrame && code !== -3) restoreMain(); });
  bar.on('moved', savePos);
  bar.on('closed', () => { bar = null; barReady = false; });
  bar.loadURL(APP_URL + '?bar=1');
  return bar;
}
let barReady = false;      // a barra já carregou e informou o tamanho
function showBar() {
  const b = createBar();
  if (barReady && !b.isVisible()) b.showInactive();   // senão aparece quando informar o tamanho
}
function hideBar() { if (bar && !bar.isDestroyed()) bar.hide(); }
function restoreMain(page) {
  hideBar();
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
  if (page) win.webContents.send('today:goto', page);
}

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
      backgroundThrottling: false,
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

  // Minimizar vira a barra flutuante (se o usuário deixou ligado)
  win.on('minimize', (e) => {
    if (!barEnabled || quitting) return;
    e.preventDefault();
    win.hide();
    showBar();
  });
  win.on('restore', hideBar);
  win.on('show', () => { if (!win.isMinimized()) hideBar(); });
  win.on('close', () => { quitting = true; });
  win.on('closed', () => { if (bar && !bar.isDestroyed()) bar.destroy(); win = null; app.quit(); });

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

// O app liga/desliga a barra flutuante (Ajustes > Barra de atalhos)
ipcMain.on('today:bar-config', (e, enabled) => {
  if (!win || e.sender !== win.webContents) return;
  barEnabled = !!enabled;
  if (!barEnabled) hideBar();
});
// A janela da barra informa o tamanho que precisa (muda com ícones, formato e "mostrar nomes")
ipcMain.on('today:bar-size', (e, w, h, side) => {
  if (!bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  const wa = screen.getDisplayNearestPoint(bar.getBounds()).workArea;
  w = Math.max(40, Math.min(wa.width, Math.round(+w) || 72)); h = Math.max(40, Math.min(wa.height, Math.round(+h) || 360));
  if (['left', 'right', 'top', 'bottom'].includes(side)) barSide = side;
  barSize = { w, h };
  const [x, y] = bar.getPosition();
  const first = !readPos() && !bar.isVisible();
  const p = first ? defaultPos(w, h) : clampToScreen(x, y, w, h);
  bar.setBounds({ x: p.x, y: p.y, width: w, height: h });
  barReady = true;
  if (win && !win.isDestroyed() && !win.isVisible() && !bar.isVisible()) bar.showInactive();
});
// Clicar num ícone da barra abre o Today naquela página ('' = só abrir)
ipcMain.on('today:bar-go', (e, page) => {
  if (!bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  restoreMain(typeof page === 'string' && /^[a-z]{2,20}$/.test(page) ? page : '');
});

const single = app.requestSingleInstanceLock();
if (!single) app.quit();
else {
  app.on('second-instance', () => restoreMain());
  app.on('before-quit', () => { quitting = true; });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
