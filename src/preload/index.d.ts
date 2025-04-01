import { ElectronAPI } from '@electron-toolkit/preload'

export interface ChatMessage {
  role: string
  content: string
  timestamp: string
}

export interface Note {
  id: string
  title: string
  content: any
  createdAt: string
  updatedAt: string
  chatHistory?: ChatMessage[]
}

export interface NotesAPI {
  getAll: () => Promise<Note[]>
  get: (id: string) => Promise<Note | null>
  create: (noteData: { title?: string; content?: any }) => Promise<Note>
  update: (id: string, updates: { title?: string; content?: any }) => Promise<Note>
  delete: (id: string) => Promise<boolean>
  getChatHistory: (noteId: string) => Promise<ChatMessage[]>
  addChatMessage: (noteId: string, message: { role: string; content: string }) => Promise<Note>
  clearChatHistory: (noteId: string) => Promise<Note>
}

export interface OpenAIAPI {
  improve: (
    text: string,
    range: [number, number],
    apiKey: string,
    customInstruction?: string
  ) => Promise<string>
  chat: (
    messages: Array<{ role: string; content: string }>,
    apiKey: string,
    noteId?: string
  ) => Promise<boolean>
  onChatChunk: (callback: (chunk: string) => void) => () => void
  onChatDone: (callback: () => void) => () => void
  onChatError: (callback: (error: string) => void) => () => void
  interruptChat: () => void
}

export interface API {
  notes: NotesAPI
  openai: OpenAIAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
