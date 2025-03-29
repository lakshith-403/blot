import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

console.log('Preload script running')

// Custom APIs for renderer
const api = {
  notes: {
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    get: (id: string) => ipcRenderer.invoke('notes:get', id),
    create: (noteData: { title?: string; content?: any }) =>
      ipcRenderer.invoke('notes:create', noteData),
    update: (id: string, updates: { title?: string; content?: any }) =>
      ipcRenderer.invoke('notes:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id)
  },
  openai: {
    improve: (text: string, range: [number, number], apiKey: string) =>
      ipcRenderer.invoke('openai:improve', text, range, apiKey)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  console.log('Context isolation is enabled, using contextBridge')
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Error exposing APIs:', error)
  }
} else {
  console.log('Context isolation is disabled, adding to window directly')
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
