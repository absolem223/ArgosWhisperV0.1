/**
 * src/main/window/WindowManager.ts
 * Gestión de la ventana Electron: frameless, always-on-top, draggable.
 * SPEC: Sección 2 — Ventana, Sección 8 — Header
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import { IPC } from '../../shared/ipc';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  create(preloadPath: string, rendererPath: string): BrowserWindow {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    this.mainWindow = new BrowserWindow({
      width: 620,
      height: 800,
      minWidth: 400,
      minHeight: 500,
      // Posicionar en la esquina superior derecha
      x: screenWidth - 640,
      y: 20,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: true,
      skipTaskbar: false,
      backgroundColor: '#0a0d1a',
      show: false,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.mainWindow.loadFile(rendererPath);

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.registerWindowHandlers();

    return this.mainWindow;
  }

  private registerWindowHandlers(): void {
    if (!this.mainWindow) return;

    ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
      this.mainWindow?.minimize();
    });

    ipcMain.on(IPC.WINDOW_CLOSE, () => {
      this.mainWindow?.close();
    });
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
