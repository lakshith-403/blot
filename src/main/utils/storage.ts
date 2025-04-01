import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export let notesDir: string
export let chatsDir: string

export function initializePaths(): void {
  notesDir = path.join(app.getPath('userData'), 'notes')
  chatsDir = path.join(app.getPath('userData'), 'chats')
}

export async function ensureDirectoriesExist(): Promise<void> {
  try {
    await fs.mkdir(notesDir, { recursive: true })
    await fs.mkdir(chatsDir, { recursive: true })
  } catch (error) {
    console.error('Failed to create directories:', error)
  }
}

// Migrate existing notes to the new structure
export async function migrateExistingNotes(): Promise<void> {
  try {
    const files = await fs.readdir(notesDir)

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(notesDir, file)
        try {
          const data = await fs.readFile(filePath, 'utf-8')
          const note = JSON.parse(data)

          // Migrate chatHistory to separate file if it exists
          if (note.chatHistory && note.chatHistory.length > 0) {
            const chatFilePath = path.join(chatsDir, `${note.id}.json`)
            await fs.writeFile(chatFilePath, JSON.stringify(note.chatHistory, null, 2), 'utf-8')

            // Remove chatHistory from note
            delete note.chatHistory
            await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')
            console.log(`Migrated chat history for note ${note.id}`)
          }
        } catch (error) {
          console.error(`Error migrating note ${file}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('Error migrating notes:', error)
  }
}
