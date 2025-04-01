import { app } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { createWindow, setupWindowEvents } from './window'
import { initializePaths, ensureDirectoriesExist, migrateExistingNotes } from './utils/storage'
import { setupNotesIPC } from './handlers/notesHandler'
import { setupChatIPC } from './handlers/chatHandler'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.blot')

  // Initialize app storage paths
  initializePaths()

  // Ensure directories exist and migrate any old notes
  ensureDirectoriesExist()
    .then(() => migrateExistingNotes())
    .catch((error) => console.error('Error during initialization:', error))

  // Set up event handlers
  setupWindowEvents()

  // Set up IPC handlers
  setupNotesIPC()
  setupChatIPC()

  // Create the main window
  createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
