// Today para Windows: abre o app em uma janela de vidro (acrílico do Windows 11),
// mostrando a área de trabalho desfocada atrás. O conteúdo vem do site no GitHub Pages,
// então login, sincronização e atualizações são os mesmos do app web.
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu, screen, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://holmgds-gui.github.io/Dashboard-app/';

let win = null;
let bar = null;            // janela da barra flutuante (aparece quando o Today é minimizado)
let barEnabled = false;    // o app avisa se o usuário quer a barra flutuante
let barSide = 'left';
let barSize = { w: 72, h: 360 };
let quitting = false;
let tray = null;
let fauxMax = false;       // "tela cheia" feita pelo programa (mantém o vidro; o maximizar do Windows deixa o fundo preto)
let restoreBounds = null;
let glassSolid = false;

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
  bar.setIgnoreMouseEvents(true, { forward: true });   // a área transparente em volta não bloqueia cliques
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
  win.show();
  // traz para a frente mesmo com outras janelas abertas (o Windows às vezes deixa atrás)
  win.setAlwaysOnTop(true);
  win.focus();
  win.setAlwaysOnTop(false);
  app.focus({ steal: true });
  if (page) {
    if (win.webContents.isLoading()) win.webContents.once('did-finish-load', () => win.webContents.send('today:goto', page));
    else win.webContents.send('today:goto', page);
  }
}
// Ícone na bandeja: caminho de volta garantido, mesmo se a barra flutuante falhar
function createTray() {
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 16, height: 16 });
    tray = new Tray(img);
    tray.setToolTip('Today');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Abrir o Today', click: () => restoreMain() },
      { type: 'separator' },
      { label: 'Sair', click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on('click', () => restoreMain());
  } catch (e) { tray = null; }
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
    // Sem botões nativos por cima do desenho: o app desenha os próprios (minimizar, maximizar, fechar)
    titleBarStyle: 'hidden',
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
    // se a barra não aparecer em alguns segundos, o Today volta sozinho (nunca fica "sumido")
    setTimeout(() => { if (win && !win.isDestroyed() && !win.isVisible() && !(bar && !bar.isDestroyed() && bar.isVisible())) restoreMain(); }, 3500);
  });
  win.on('restore', hideBar);
  win.on('show', () => { if (!win.isMinimized()) hideBar(); });
  win.on('close', () => { quitting = true; });
  win.on('closed', () => { if (bar && !bar.isDestroyed()) bar.destroy(); win = null; app.quit(); });

  const sendState = () => { if (win && !win.isDestroyed()) win.webContents.send('today:win-state', fauxMax || win.isMaximized()); };
  // mexer na janela (arrastar/redimensionar) tira do modo tela cheia
  win.on('will-move', () => { if (fauxMax) { fauxMax = false; sendState(); } });
  win.on('will-resize', () => { if (fauxMax) { fauxMax = false; sendState(); } });
  // duplo clique na faixa do topo maximiza "de verdade" e deixa o fundo preto: troca pela tela cheia do programa
  win.on('maximize', () => { if (!fauxMax) { win.unmaximize(); setImmediate(toggleMax); } else sendState(); });
  win.on('unmaximize', sendState);
  win.webContents.on('did-finish-load', sendState);

  win.once('ready-to-show', () => win.show());
  win.loadURL(APP_URL);
}

// O app avisa quando você troca entre claro e escuro: o vidro do Windows acompanha
ipcMain.on('today:set-theme', (_e, mode) => {
  if (!win || (mode !== 'dark' && mode !== 'light')) return;
  nativeTheme.themeSource = mode;
  if (glassSolid) { try { win.setBackgroundColor(mode === 'dark' ? '#0f141b' : '#eef1f5'); } catch (e) {} }
});
ipcMain.on('today:retry', () => { if (win) win.loadURL(APP_URL); });

function toggleMax() {
  if (!win || win.isDestroyed()) return;
  if (win.isMaximized()) { win.unmaximize(); return; }
  if (fauxMax) {
    fauxMax = false;
    if (restoreBounds) win.setBounds(restoreBounds);
  } else {
    restoreBounds = win.getBounds();
    fauxMax = true;
    win.setBounds(screen.getDisplayMatching(restoreBounds).workArea);
  }
  win.webContents.send('today:win-state', fauxMax);
}
// Translucidez: 0 = sólido (sem efeito do Windows), de 5 a 100 = acrílico com o app mais ou menos transparente
ipcMain.on('today:set-glass', (e, t) => {
  if (!win || win.isDestroyed() || e.sender !== win.webContents) return;
  glassSolid = (+t || 0) <= 4;
  try {
    win.setBackgroundMaterial(glassSolid ? 'none' : 'acrylic');
    win.setBackgroundColor(glassSolid ? (nativeTheme.shouldUseDarkColors ? '#0f141b' : '#eef1f5') : '#00000000');
  } catch (err) {}
});

// Botões da janela desenhados pelo app
ipcMain.on('today:win-ctl', (e, cmd) => {
  if (!win || win.isDestroyed() || e.sender !== win.webContents) return;
  if (cmd === 'min') win.minimize();
  else if (cmd === 'max') { toggleMax(); }
  else if (cmd === 'close') win.close();
});

// Só captura o mouse quando ele está sobre a barra/logo; a margem transparente deixa o clique passar
ipcMain.on('today:bar-hit', (e, hit) => {
  if (!bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  if (hit) bar.setIgnoreMouseEvents(false); else bar.setIgnoreMouseEvents(true, { forward: true });
});

// Arrastar o botão do Today (barra minimizada)
let dragStart = null;
ipcMain.on('today:bar-drag-start', (e) => {
  if (!bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  const [x, y] = bar.getPosition(); dragStart = { x, y };
});
ipcMain.on('today:bar-drag-move', (e, dx, dy) => {
  if (!dragStart || !bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  bar.setBounds({ x: Math.round(dragStart.x + (+dx || 0)), y: Math.round(dragStart.y + (+dy || 0)), width: barSize.w, height: barSize.h });
});
ipcMain.on('today:bar-drag-end', (e) => {
  if (!bar || bar.isDestroyed() || e.sender !== bar.webContents) return;
  dragStart = null;
  const [x, y] = bar.getPosition();
  const p = clampToScreen(x, y, barSize.w, barSize.h);
  bar.setBounds({ x: p.x, y: p.y, width: barSize.w, height: barSize.h });
  savePos();
});

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
  app.whenReady().then(() => { createWindow(); createTray(); });
  app.on('window-all-closed', () => app.quit());
}
