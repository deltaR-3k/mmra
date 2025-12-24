"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
const createWindow = () => {
    // Create the browser window.
    const mainWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 200,
        minWidth: 400,
        minHeight: 150, // Much smaller minimum height
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon: path_1.default.join(__dirname, '../icon.png'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    // In production, load the index.html of the app.
    // In development, load the local dev server.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // IPC Handlers
    electron_1.ipcMain.on('resize-window', (event, width, height) => {
        mainWindow.setSize(Math.round(width), Math.round(height));
    });
    electron_1.ipcMain.on('hide-window', () => {
        mainWindow.hide();
    });
    electron_1.ipcMain.on('minimize-window', () => {
        mainWindow.minimize();
    });
    electron_1.ipcMain.on('paste-text', (event, text) => {
        electron_1.clipboard.writeText(text);
        mainWindow.hide();
        // Use AppleScript to simulate Cmd+V
        (0, child_process_1.exec)('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"', (error) => {
            if (error)
                console.error('Failed to paste:', error);
        });
    });
    // Get Clipboard Content
    electron_1.ipcMain.handle('get-clipboard-text', () => {
        return electron_1.clipboard.readText();
    });
    mainWindow.on('show', () => {
        mainWindow.webContents.send('window-show');
    });
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
electron_1.app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        electron_1.app.dock?.setIcon(path_1.default.join(__dirname, '../icon.png'));
    }
    createWindow();
    electron_1.app.on('activate', () => {
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length === 0) {
            createWindow();
        }
        else {
            const win = windows[0];
            if (!win.isVisible())
                win.show();
            win.focus();
        }
    });
    // Register a 'CommandOrControl+Option+T' shortcut listener.
    const ret = electron_1.globalShortcut.register('CommandOrControl+Option+T', () => {
        const windows = electron_1.BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const win = windows[0];
            if (win.isVisible() && win.isFocused()) {
                win.hide();
            }
            else {
                win.show();
                win.focus();
            }
        }
        else {
            createWindow();
        }
    });
    if (!ret) {
        console.log('registration failed');
    }
    else {
        console.log('Global shortcut registered: CommandOrControl+Option+T');
    }
});
electron_1.app.on('will-quit', () => {
    // Unregister all shortcuts.
    electron_1.globalShortcut.unregisterAll();
});
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
