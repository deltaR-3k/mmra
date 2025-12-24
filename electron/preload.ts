import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    pasteText: (text: string) => ipcRenderer.send('paste-text', text),
    hideWindow: () => ipcRenderer.send('hide-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', width, height),
    getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
    onShow: (callback: () => void) => ipcRenderer.on('window-show', callback),
});
