import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fetch from 'node-fetch'

let notesDir: string

async function ensureNotesDirExists(): Promise<void> {
  try {
    await fs.mkdir(notesDir, { recursive: true })
  } catch (error) {
    console.error('Failed to create notes directory:', error)
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
        updatedAt: now
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
      const filePath = path.join(notesDir, `${id}.json`)
      await fs.unlink(filePath)
      return true
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  })

  // Handle OpenAI API requests
  ipcMain.handle('openai:improve', async (_, text, apiKey) => {
    try {
      console.log('Making OpenAI API request from main process')

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that improves text. Make it more clear, concise, and engaging.'
            },
            {
              role: 'user',
              content: `Improve this text: ${text}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorData = (await response.json()) as Record<string, unknown>
        throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string
          }
        }>
      }

      return data.choices[0]?.message?.content || ''
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
