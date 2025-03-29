import { ElectronAPI } from '@electron-toolkit/preload'

export interface Note {
  id: string
  title: string
  content: any
  createdAt: string
  updatedAt: string
}

export interface NotesAPI {
  getAll: () => Promise<Note[]>
  get: (id: string) => Promise<Note | null>
  create: (noteData: { title?: string; content?: any }) => Promise<Note>
  update: (id: string, updates: { title?: string; content?: any }) => Promise<Note>
  delete: (id: string) => Promise<boolean>
}

export interface OpenAIAPI {
  improve: (text: string, range: [number, number], apiKey: string) => Promise<string>
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
