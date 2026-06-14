/**
 * src/main/index.ts
 * Entry point del proceso Main de Electron.
 * SPEC: Sección 3 — Arquitectura de Carpetas
 */

import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { WindowManager } from './window/WindowManager';
import { registerIpcHandlers, cleanupIpcHandlers } from './ipc/ipcHandlers';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_ROOT = path.join(PROJECT_ROOT, 'data');

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  const windowManager = new WindowManager();
  const preloadPath = path.join(__dirname, 'preload.js');
  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

  mainWindow = windowManager.create(preloadPath, rendererPath);

  registerIpcHandlers(mainWindow, PROJECT_ROOT, DATA_ROOT);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
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

let isQuitting = false;
app.on('will-quit', async (event) => {
  if (!isQuitting) {
    event.preventDefault();
    isQuitting = true;
    console.log('[Main] Realizando limpieza de procesos...');
    await cleanupIpcHandlers();
    app.quit();
  }
});
