/// <reference types="vite/client" />

interface ElectronAPI {
    pasteText: (text: string) => void;
    hideWindow: () => void;
    minimizeWindow: () => void;
    resizeWindow: (width: number, height: number) => void;
    getClipboardText: () => Promise<string>;
    onShow: (callback: () => void) => void;
}

interface Window {
    electronAPI: ElectronAPI;
}
