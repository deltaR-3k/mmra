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
        width: 300,
        height: 200,
        minWidth: 250,
        minHeight: 150,
        maxWidth: 600, // Limit max width
        maxHeight: 800, // Limit max height
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        icon: path.join(__dirname, '../icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In production, load the index.html of the app.
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools(); // Optional: Keep closed for clean look
    } else {
        // Use path.join to correctly resolve inside ASAR or dist folder
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // IPC Handlers
    ipcMain.on('resize-window', (event, width, height) => {
        // Enforce basic constraints to avoid glitches
        const w = Math.max(250, Math.round(width));
        const h = Math.max(150, Math.round(height));
        mainWindow.setSize(w, h);
    });

    ipcMain.on('hide-window', () => {
        mainWindow.hide();
    });

    ipcMain.on('minimize-window', () => {
        mainWindow.minimize();
    });

    ipcMain.on('paste-text', (event, text) => {
        clipboard.writeText(text);

        // Blur to transfer focus to previous app
        mainWindow.blur();

        // Force always on top to prevent hiding behind other windows
        mainWindow.setAlwaysOnTop(true, 'floating');

        setTimeout(() => {
            exec('osascript -e "tell application \\"System Events\\" to keystroke \\"v\\" using command down"', (error) => {
                if (error) console.error('Failed to paste:', error);
            });
        }, 100);
    });

    // Get Clipboard Content
    ipcMain.handle('get-clipboard-text', () => {
        return clipboard.readText();
    });

    mainWindow.on('show', () => {
        mainWindow.webContents.send('window-show');
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    if (process.platform === 'darwin') {
        app.dock?.setIcon(path.join(__dirname, '../icon.png'));
    }
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
