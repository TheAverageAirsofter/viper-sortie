// Electron shell for the Windows build: opens the static game full screen (F11 or Alt+Enter toggles, Esc leaves full screen).
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
function open() {
  const w = new BrowserWindow({ width: 1280, height: 720, backgroundColor: '#000', fullscreen: true, autoHideMenuBar: true, title: 'Viper Sortie', icon: path.join(__dirname, 'icon.png'), webPreferences: { backgroundThrottling: false } });
  Menu.setApplicationMenu(null);
  w.loadFile(path.join(__dirname, 'www', 'index.html'));
  w.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11' || (i.alt && i.key === 'Enter')) { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    else if (i.key === 'Escape' && w.isFullScreen() && i.shift) w.setFullScreen(false);
  });
}
app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
