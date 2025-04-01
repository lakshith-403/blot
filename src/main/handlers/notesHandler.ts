import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { notesDir, chatsDir } from '../utils/storage'

export function setupNotesIPC() {
  // Get all notes
  ipcMain.handle('notes:getAll', async () => {
    try {
      const files = await fs.readdir(notesDir)
      const notes: Array<{
        id: string
        title: string
        content: any
        createdAt: string
        updatedAt: string
      }> = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(notesDir, file)
          try {
            const data = await fs.readFile(filePath, 'utf-8')
            const note = JSON.parse(data)
            notes.push(note)
          } catch (error) {
            console.error(`Error reading note ${file}:`, error)
          }
        }
      }

      return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    } catch (error) {
      console.error('Error getting notes:', error)
      return []
    }
  })

  // Get single note
  ipcMain.handle('notes:get', async (_, id) => {
    try {
      const filePath = path.join(notesDir, `${id}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      // Get chat history from separate file
      const chatFilePath = path.join(chatsDir, `${id}.json`)
      try {
        const chatData = await fs.readFile(chatFilePath, 'utf-8')
        const chatHistory = JSON.parse(chatData)

        // Add chat history to note object before returning
        return { ...note, chatHistory }
      } catch (error) {
        console.log(`No chat file found for note ${id}`)
        return { ...note, chatHistory: [] }
      }
    } catch (error) {
      console.error(`Error getting note ${id}:`, error)
      return null
    }
  })

  // Create note
  ipcMain.handle('notes:create', async (_, noteData) => {
    try {
      const id = uuidv4()
      const now = new Date().toISOString()

      const note = {
        id,
        title:
          typeof noteData.title === 'object' ? 'Untitled Note' : noteData.title || 'Untitled Note',
        content: noteData.content || '',
        createdAt: now,
        updatedAt: now
      }

      const filePath = path.join(notesDir, `${id}.json`)
      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')

      // Create empty chat file
      const chatFilePath = path.join(chatsDir, `${id}.json`)
      await fs.writeFile(chatFilePath, JSON.stringify([], null, 2), 'utf-8')

      return note
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  })

  // Update note
  ipcMain.handle('notes:update', async (_, id, updates) => {
    try {
      const filePath = path.join(notesDir, `${id}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      const updatedNote = {
        ...note,
        ...(updates && {
          title: typeof updates.title === 'object' ? note.title : updates.title || note.title,
          content: updates.content || note.content
        }),
        updatedAt: new Date().toISOString()
      }

      await fs.writeFile(filePath, JSON.stringify(updatedNote, null, 2), 'utf-8')

      return updatedNote
    } catch (error) {
      console.error(`Error updating note ${id}:`, error)
      throw error
    }
  })

  // Delete note
  ipcMain.handle('notes:delete', async (_, id) => {
    try {
      // Delete note file
      const filePath = path.join(notesDir, `${id}.json`)
      await fs.unlink(filePath)

      // Also delete associated chat file if it exists
      try {
        const chatFilePath = path.join(chatsDir, `${id}.json`)
        await fs.unlink(chatFilePath)
      } catch (error) {
        console.log(`No chat file found for note ${id}`)
      }

      return true
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  })

  // Get chat history for a note
  ipcMain.handle('notes:getChatHistory', async (_, noteId) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      const chatFilePath = path.join(chatsDir, `${noteId}.json`)

      try {
        const data = await fs.readFile(chatFilePath, 'utf-8')
        return JSON.parse(data)
      } catch (error) {
        console.log(`No chat file found for note ${noteId}, creating empty one`)
        await fs.writeFile(chatFilePath, JSON.stringify([], null, 2), 'utf-8')
        return []
      }
    } catch (error) {
      console.error(`Error getting chat history for note ${noteId}:`, error)
      return []
    }
  })
}
