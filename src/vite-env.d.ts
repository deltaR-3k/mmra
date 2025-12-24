/// <reference types="vite/client" />

interface ElectronAPI {
    pasteText: (text: string) => void;
    hideWindow: () => void;
    minimizeWindow: () => void;
    resizeWindow: (width: number, height: number) => void;
    onShow: (callback: () => void) => void;
}

interface Window {
    electronAPI: ElectronAPI;
}
