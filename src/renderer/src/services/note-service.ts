/**
 * Note interface for the application
 */
export interface Note {
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
}

/**
 * Service for handling note operations
 * Uses the IPC bridge to communicate with the main process for file operations
 */
export class NoteService {
  constructor() {
    console.log('NoteService initialized')
    console.log('window.api available:', !!window.api)
    if (window.api) {
      console.log('window.api.notes available:', !!window.api.notes)
    }
  }

  /**
   * Get all notes
   * @returns Promise containing array of notes sorted by last updated
   */
  async getNotes(): Promise<Note[]> {
    console.log('NoteService.getNotes called')
    try {
      if (!window.api?.notes?.getAll) {
        console.error('window.api.notes.getAll is not available')
        return []
      }

      const notes = await window.api.notes.getAll()
      console.log('Notes retrieved:', notes)
      return notes
    } catch (error) {
      console.error('Error getting notes:', error)
      return []
    }
  }

  /**
   * Get a single note by ID
   * @param id Note ID
   * @returns Promise containing the note or null if not found
   */
  async getNote(id: string): Promise<Note | null> {
    console.log('NoteService.getNote called', id)
    try {
      if (!window.api?.notes?.get) {
        console.error('window.api.notes.get is not available')
        return null
      }

      const note = await window.api.notes.get(id)
      console.log('Note retrieved:', note)
      return note
    } catch (error) {
      console.error(`Error getting note ${id}:`, error)
      return null
    }
  }

  /**
   * Create a new note
   * @param note Note data (title and content)
   * @returns Promise containing the created note
   */
  async createNote(note: { title?: string; content?: any }): Promise<Note> {
    console.log('NoteService.createNote called', note)
    try {
      if (!window.api?.notes?.create) {
        console.error('window.api.notes.create is not available')
        throw new Error('API not available')
      }

      const newNote = await window.api.notes.create(note)
      console.log('Note created:', newNote)
      return newNote
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  }

  /**
   * Update an existing note
   * @param id Note ID
   * @param updates Fields to update (title and/or content)
   * @returns Promise containing the updated note
   */
  async updateNote(id: string, updates: { title?: string; content?: any }): Promise<Note> {
    console.log('NoteService.updateNote called', id, updates)
    try {
      if (!window.api?.notes?.update) {
        console.error('window.api.notes.update is not available')
        throw new Error('API not available')
      }

      const updatedNote = await window.api.notes.update(id, updates)
      console.log('Note updated:', updatedNote)
      return updatedNote
    } catch (error) {
      console.error(`Error updating note ${id}:`, error)
      throw error
    }
  }

  /**
   * Delete a note
   * @param id Note ID
   * @returns Promise that resolves when deletion is complete
   */
  async deleteNote(id: string): Promise<void> {
    console.log('NoteService.deleteNote called', id)
    try {
      if (!window.api?.notes?.delete) {
        console.error('window.api.notes.delete is not available')
        throw new Error('API not available')
      }

      await window.api.notes.delete(id)
      console.log('Note deleted')
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  }

  /**
   * Get chat history for a note
   * @param noteId Note ID
   * @returns Promise containing the chat history array
   */
  async getChatHistory(
    noteId: string
  ): Promise<Array<{ role: string; content: string; timestamp: string }>> {
    console.log('NoteService.getChatHistory called for note', noteId)
    try {
      if (!window.api?.notes?.getChatHistory) {
        console.error('window.api.notes.getChatHistory is not available')
        return []
      }

      const chatHistory = await window.api.notes.getChatHistory(noteId)
      console.log('Chat history retrieved:', chatHistory)
      return chatHistory
    } catch (error) {
      console.error(`Error getting chat history for note ${noteId}:`, error)
      return []
    }
  }

  /**
   * Add a chat message to a note
   * @param noteId Note ID
   * @param message Message object with role and content
   * @returns Promise containing the updated note
   */
  async addChatMessage(noteId: string, message: { role: string; content: string }): Promise<Note> {
    console.log('NoteService.addChatMessage called', noteId, message)
    try {
      if (!window.api?.notes?.addChatMessage) {
        console.error('window.api.notes.addChatMessage is not available')
        throw new Error('API not available')
      }

      const updatedNote = await window.api.notes.addChatMessage(noteId, message)
      console.log('Chat message added:', updatedNote)
      return updatedNote
    } catch (error) {
      console.error(`Error adding chat message to note ${noteId}:`, error)
      throw error
    }
  }

  /**
   * Clear chat history for a note
   * @param noteId Note ID
   * @returns Promise containing the updated note
   */
  async clearChatHistory(noteId: string): Promise<Note> {
    console.log('NoteService.clearChatHistory called for note', noteId)
    try {
      if (!window.api?.notes?.clearChatHistory) {
        console.error('window.api.notes.clearChatHistory is not available')
        throw new Error('API not available')
      }

      const updatedNote = await window.api.notes.clearChatHistory(noteId)
      console.log('Chat history cleared:', updatedNote)
      return updatedNote
    } catch (error) {
      console.error(`Error clearing chat history for note ${noteId}:`, error)
      throw error
    }
  }
}
