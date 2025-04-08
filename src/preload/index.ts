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
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
    getChatHistory: (noteId: string) => ipcRenderer.invoke('notes:getChatHistory', noteId),
    addChatMessage: (noteId: string, message: { role: string; content: string }) =>
      ipcRenderer.invoke('notes:addChatMessage', noteId, message),
    clearChatHistory: (noteId: string) => ipcRenderer.invoke('notes:clearChatHistory', noteId)
  },
  openai: {
    improve: (text: string, range: [number, number], apiKey: string, customInstruction?: string) =>
      ipcRenderer.invoke('openai:improve', text, range, apiKey, customInstruction),
    chat: (messages: Array<{ role: string; content: string }>, apiKey: string, noteId?: string) =>
      ipcRenderer.invoke('openai:chat', messages, apiKey, noteId),
    onChatChunk: (callback: (chunk: string) => void) => {
      const listener = (_: any, chunk: string) => callback(chunk)
      ipcRenderer.on('openai:chat-chunk', listener)
      return () => ipcRenderer.removeListener('openai:chat-chunk', listener)
    },
    onChatDone: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('openai:chat-done', listener)
      return () => ipcRenderer.removeListener('openai:chat-done', listener)
    },
    onChatError: (callback: (error: string) => void) => {
      const listener = (_: any, error: string) => callback(error)
      ipcRenderer.on('openai:chat-error', listener)
      return () => ipcRenderer.removeListener('openai:chat-error', listener)
    },
    interruptChat: () => ipcRenderer.send('openai:chat-interrupt'),
    apply: (noteText: string, chatHistory: string, apiKey: string, noteId: string) =>
      ipcRenderer.invoke('openai:apply', noteText, chatHistory, apiKey, noteId)
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
