const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("workstation", {
  getSetupStatus: () => ipcRenderer.invoke("workstation:getSetupStatus"),
  saveFirstRunConfig: (payload) => ipcRenderer.invoke("workstation:saveFirstRunConfig", payload),
  getAppPaths: () => ipcRenderer.invoke("workstation:getAppPaths"),
  detectTailscalePath: () => ipcRenderer.invoke("workstation:detectTailscalePath"),
  chooseTailscalePath: () => ipcRenderer.invoke("workstation:chooseTailscalePath"),
  retryStartup: () => ipcRenderer.invoke("workstation:retryStartup"),
  resetSetup: () => ipcRenderer.invoke("workstation:resetSetup")
});
