/// <reference types="vite/client" />

import { Note } from './services/note-service'

interface Window {
  api: {
    notes: {
      getAll: () => Promise<Note[]>
      get: (id: string) => Promise<Note | null>
      create: (noteData: { title?: string; content?: any }) => Promise<Note>
      update: (id: string, updates: { title?: string; content?: any }) => Promise<Note>
      delete: (id: string) => Promise<boolean>
    }
  }
}
