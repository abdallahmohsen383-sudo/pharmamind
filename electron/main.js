
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Disable Hardware Acceleration for better performance on some Windows machines
// app.disableHardwareAcceleration();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "PharmaMind",
    icon: path.join(__dirname, '../public/icon.ico'), // Ensure you have an icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Remove the default menu (File, Edit, etc.) for an app-like feel
  Menu.setApplicationMenu(null);

  // In production, load the built index.html
  // In development, you can load localhost if you want hot reload
  // But for the build script we assume production load
  const startUrl = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(startUrl);

  // Open external links in default browser, not in the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
