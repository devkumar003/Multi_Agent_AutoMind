const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    installOllama: () => ipcRenderer.invoke('install-ollama')
});
