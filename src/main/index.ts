import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'

let notesDir: string

async function ensureNotesDirExists(): Promise<void> {
  try {
    await fs.mkdir(notesDir, { recursive: true })
  } catch (error) {
    console.error('Failed to create notes directory:', error)
  }
}

// Ensure all notes have the required fields
async function migrateExistingNotes(): Promise<void> {
  try {
    const files = await fs.readdir(notesDir)

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(notesDir, file)
        try {
          const data = await fs.readFile(filePath, 'utf-8')
          const note = JSON.parse(data)

          // Add chatHistory if it doesn't exist
          if (!note.chatHistory) {
            note.chatHistory = []
            await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')
            console.log(`Added chatHistory to note ${note.id}`)
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

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set Content Security Policy to allow API requests
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; connect-src 'self' https://api.openai.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:; style-src 'self' 'unsafe-inline';"
        ]
      }
    })
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.blot')

  notesDir = path.join(app.getPath('userData'), 'notes')
  ensureNotesDirExists()
    .then(() => migrateExistingNotes())
    .catch((error) => console.error('Error during initialization:', error))

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set up IPC handlers for notes
  setupNotesIPC()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Set up IPC handlers for note operations
function setupNotesIPC() {
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
        chatHistory?: Array<{
          role: string
          content: string
          timestamp: string
        }>
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
      return JSON.parse(data)
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
        updatedAt: now,
        chatHistory: []
      }

      const filePath = path.join(notesDir, `${id}.json`)
      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')

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
          content: updates.content || note.content,
          chatHistory: updates.chatHistory || note.chatHistory || []
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
      const filePath = path.join(notesDir, `${id}.json`)
      await fs.unlink(filePath)
      return true
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  })

  // Add chat message to note
  ipcMain.handle('notes:addChatMessage', async (_, noteId, message) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      const filePath = path.join(notesDir, `${noteId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      // Initialize chatHistory if it doesn't exist
      if (!note.chatHistory) {
        note.chatHistory = []
      }

      // Add timestamp to the message
      const newMessage = {
        ...message,
        timestamp: new Date().toISOString()
      }

      // Add message to chat history
      note.chatHistory.push(newMessage)
      note.updatedAt = new Date().toISOString()

      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')

      return note
    } catch (error) {
      console.error(`Error adding chat message to note ${noteId}:`, error)
      throw error
    }
  })

  // Clear chat history for a note
  ipcMain.handle('notes:clearChatHistory', async (_, noteId) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      const filePath = path.join(notesDir, `${noteId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      note.chatHistory = []
      note.updatedAt = new Date().toISOString()

      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')

      return note
    } catch (error) {
      console.error(`Error clearing chat history for note ${noteId}:`, error)
      throw error
    }
  })

  // Get chat history for a note
  ipcMain.handle('notes:getChatHistory', async (_, noteId) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      const filePath = path.join(notesDir, `${noteId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      return note.chatHistory || []
    } catch (error) {
      console.error(`Error getting chat history for note ${noteId}:`, error)
      return []
    }
  })

  // Handle OpenAI chat API requests with streaming
  ipcMain.handle('openai:chat', async (event, messages, apiKey, noteId) => {
    try {
      console.log('Making OpenAI Chat API request from main process')

      // Save user message to chat history if noteId is provided
      if (noteId) {
        const userMessage = messages[messages.length - 1]
        if (userMessage && userMessage.role === 'user') {
          await saveMessageToNote(noteId, userMessage)
        }
      }

      const openai = new OpenAI({
        apiKey: apiKey
      })

      // Set up interrupt handler
      let aborted = false
      const interruptHandler = () => {
        console.log('Interrupting OpenAI chat stream')
        aborted = true
      }
      ipcMain.once('openai:chat-interrupt', interruptHandler)

      // For storing assistant response
      let assistantMessage = {
        role: 'assistant',
        content: ''
      }

      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          stream: true
        })

        for await (const chunk of stream) {
          if (aborted) {
            await stream.controller.abort()
            break
          }

          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            // Add content to assistant message
            assistantMessage.content += content

            // Format the chunk as expected by the renderer
            const formattedChunk = `data: ${JSON.stringify({
              choices: [{ delta: { content } }]
            })}\n\n`

            event.sender.send('openai:chat-chunk', formattedChunk)
          }
        }

        // Save assistant message to chat history if noteId is provided and not aborted
        if (noteId && !aborted && assistantMessage.content) {
          await saveMessageToNote(noteId, assistantMessage)
        }

        event.sender.send('openai:chat-done')
        return true
      } finally {
        // Clean up interrupt handler
        ipcMain.removeListener('openai:chat-interrupt', interruptHandler)
      }
    } catch (error: unknown) {
      console.error('Error in OpenAI chat:', error)
      event.sender.send(
        'openai:chat-error',
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  })

  // Helper function to save a message to a note's chat history
  async function saveMessageToNote(noteId: string, message: { role: string; content: string }) {
    try {
      const filePath = path.join(notesDir, `${noteId}.json`)
      const data = await fs.readFile(filePath, 'utf-8')
      const note = JSON.parse(data)

      // Initialize chatHistory if it doesn't exist
      if (!note.chatHistory) {
        note.chatHistory = []
      }

      // Add message to chat history with timestamp
      note.chatHistory.push({
        ...message,
        timestamp: new Date().toISOString()
      })

      note.updatedAt = new Date().toISOString()
      await fs.writeFile(filePath, JSON.stringify(note, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Error saving message to note ${noteId}:`, error)
    }
  }

  // Handle OpenAI API requests for improving text
  ipcMain.handle('openai:improve', async (_, text, r, apiKey) => {
    try {
      console.log('Making OpenAI API request from main process')
      const range = [r['index'], r['index'] + r['length']]

      const roundedText = text.substring(range[0], range[1])
      const roundedTextWithDelimiter = `~~${roundedText}~~`
      console.log('Rounded text:', roundedText)
      console.log('Rounded text with delimiter:', roundedTextWithDelimiter)
      const markedText = text.slice(0, range[0]) + roundedTextWithDelimiter + text.slice(range[1])
      console.log('Marked text:', markedText)

      const openai = new OpenAI({
        apiKey: apiKey
      })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `
              You are a helpful assistant that improves text. Fix typos, mistakes, grammar, and make it more clear.
              Keep your changes to a minimum. Focus is on fixing mistakes, not adding new content.
              You're given the entire text and a portion sorrounded with ~~ that you need to improve.
              do not change anything outside of the portion sorrounded with ~~
              Even if the marked portion ends in the middle of a word, only output characters from the marked portion.
              Output ONLY the improved text. That means you should not include the original text or any other text outside of the portion sorrounded with ~~

              e.g.:
              Original text:
              Hello Where can i find t~~he restura~~nt?
              Marked text: 
              Hello Where can i find t~~he restura~~nt?
              Output text:
              he restaura

              Response should only contain the improved text. In this example the response should be:
              he restaurant

              DO NOT say anything else than the improved text.
              `
          },
          {
            role: 'user',
            content: `Orignal text:\n ${text} \n\n Improve this portion:\n ${markedText}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('Error improving text with OpenAI:', error)
      throw error
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
