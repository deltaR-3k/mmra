import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron';
import path from 'path';
import { exec } from 'child_process';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 600,
        height: 400,
        minWidth: 400,
        minHeight: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, '../icon.png'), // Adjusted path assumption
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In production, load the index.html of the app.
    // In development, load the local dev server.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // IPC Handlers
    ipcMain.on('resize-window', (event, width, height) => {
        // Optional: Add constraints or logic
        mainWindow.setSize(Math.round(width), Math.round(height));
    });

    ipcMain.on('hide-window', () => {
        mainWindow.hide();
    });

    ipcMain.on('minimize-window', () => {
        mainWindow.minimize();
    });

    ipcMain.on('paste-text', (event, text) => {
        clipboard.writeText(text);
        mainWindow.hide();

        // Use AppleScript to simulate Cmd+V
        exec('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"', (error) => {
            if (error) console.error('Failed to paste:', error);
        });
    });

    mainWindow.on('show', () => {
        mainWindow.webContents.send('window-show');
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length === 0) {
            createWindow();
        } else {
            const win = windows[0];
            if (!win.isVisible()) win.show();
            win.focus();
        }
    });

    // Register a 'CommandOrControl+Option+T' shortcut listener.
    const ret = globalShortcut.register('CommandOrControl+Option+T', () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            const win = windows[0];
            if (win.isVisible() && win.isFocused()) {
                win.hide();
            } else {
                win.show();
                win.focus();
            }
        } else {
            createWindow();
        }
    });

    if (!ret) {
        console.log('registration failed');
    } else {
        console.log('Global shortcut registered: CommandOrControl+Option+T');
    }
});

app.on('will-quit', () => {
    // Unregister all shortcuts.
    globalShortcut.unregisterAll();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
