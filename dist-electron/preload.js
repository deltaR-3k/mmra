"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    pasteText: (text) => electron_1.ipcRenderer.send('paste-text', text),
    hideWindow: () => electron_1.ipcRenderer.send('hide-window'),
    minimizeWindow: () => electron_1.ipcRenderer.send('minimize-window'),
    resizeWindow: (width, height) => electron_1.ipcRenderer.send('resize-window', width, height),
    onShow: (callback) => electron_1.ipcRenderer.on('window-show', callback),
});
