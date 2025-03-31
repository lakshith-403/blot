import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef
} from 'react'
import { Note, NoteService } from '../services/note-service'

interface NoteContextType {
  notes: Note[]
  currentNote: Note | null
  isLoading: boolean
  loadNotes: () => Promise<void>
  createNote: () => Promise<Note>
  loadNote: (id: string) => Promise<void>
  saveCurrentNote: (updates: { title?: string; content?: any }) => Promise<void>
  updateNoteCache: (updates: { title?: string; content?: any }) => void
  forceSave: () => Promise<void>
  deleteNote: (id: string) => Promise<void>
  setCurrentNote: (note: Note | null) => void
  getChatHistory: (noteId: string) => Promise<any[]>
  clearChatHistory: (noteId: string) => Promise<void>
}

const NoteContext = createContext<NoteContextType | undefined>(undefined)

export const useNotes = (): NoteContextType => {
  const context = useContext(NoteContext)
  if (!context) {
    throw new Error('useNotes must be used within a NoteProvider')
  }
  return context
}

interface NoteProviderProps {
  children: ReactNode
}

export const NoteProvider = ({ children }: NoteProviderProps) => {
  console.log('NoteProvider initializing')
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const noteService = new NoteService()

  // Cache state
  const cacheRef = useRef<{ title?: string; content?: any } | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)
  const isDirtyRef = useRef(false)

  const loadNotes = async () => {
    console.log('Loading notes...')
    setIsLoading(true)
    try {
      const notes = await noteService.getNotes()
      console.log('Loaded notes:', notes)
      setNotes(notes)
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNote = async () => {
    console.log('Creating note...')
    try {
      const newNote = await noteService.createNote({
        title: 'Untitled Note',
        content: ''
      })
      console.log('Created note:', newNote)
      setNotes((prevNotes) => [newNote, ...prevNotes])
      setCurrentNote(newNote)
      return newNote
    } catch (error) {
      console.error('Error creating note:', error)
      throw error
    }
  }

  const loadNote = async (id: string) => {
    console.log('Loading note:', id)

    // Force save the current note before loading a new one
    if (currentNote && currentNote.id !== id) {
      await forceSave()
    }

    setIsLoading(true)
    try {
      const note = await noteService.getNote(id)
      console.log('Loaded note:', note)
      if (note) {
        setCurrentNote(note)
        // Clear the cache when loading a new note
        cacheRef.current = null
        isDirtyRef.current = false
        clearSaveTimeout()
      }
    } catch (error) {
      console.error(`Error loading note ${id}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  // Update cache without saving to disk immediately
  const updateNoteCache = useCallback(
    (updates: { title?: string; content?: any }) => {
      if (!currentNote) return

      // Update the cache
      cacheRef.current = {
        ...(cacheRef.current || {}),
        ...updates
      }
      isDirtyRef.current = true

      // Set up auto-save if not already scheduled
      if (!saveTimeoutRef.current) {
        scheduleSave()
      }
    },
    [currentNote]
  )

  // Clear any existing save timeout
  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [])

  // Schedule a save operation
  const scheduleSave = useCallback(() => {
    clearSaveTimeout()
    saveTimeoutRef.current = window.setTimeout(() => {
      if (isDirtyRef.current && cacheRef.current && currentNote) {
        saveCurrentNote(cacheRef.current)
          .then(() => {
            isDirtyRef.current = false
            if (isDirtyRef.current) {
              // If it became dirty again during save, schedule another save
              scheduleSave()
            }
          })
          .catch((error) => {
            console.error('Error during auto-save:', error)
            // Retry save after failure
            scheduleSave()
          })
      }
      saveTimeoutRef.current = null
    }, 5000) // 5 second intervals
  }, [currentNote])

  const saveCurrentNote = async (updates: { title?: string; content?: any }) => {
    if (!currentNote) return
    console.log('Saving note:', currentNote.id, updates)
    try {
      const updatedNote = await noteService.updateNote(currentNote.id, updates)
      console.log('Saved note:', updatedNote)

      // Don't update the currentNote unless metadata has changed
      // This prevents editor resets while preserving important updates
      const metadataChanged =
        updatedNote.updatedAt !== currentNote.updatedAt ||
        (updatedNote.title !== currentNote.title && !cacheRef.current?.title)

      if (metadataChanged) {
        setCurrentNote((prev) => {
          if (!prev) return updatedNote
          // Keep the existing currentNote reference if possible
          return {
            ...prev,
            updatedAt: updatedNote.updatedAt,
            // Only update title if it wasn't changed locally
            title: cacheRef.current?.title || updatedNote.title
          }
        })
      }

      // Update the note in the notes list without changing the currentNote reference
      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note.id === updatedNote.id
            ? {
                ...note,
                updatedAt: updatedNote.updatedAt,
                title: cacheRef.current?.title || updatedNote.title
                // Don't update content reference as it would reset editor
              }
            : note
        )
      )
    } catch (error) {
      console.error(`Error saving note ${currentNote.id}:`, error)
      throw error
    }
  }

  const deleteNote = async (id: string) => {
    console.log('Deleting note:', id)
    try {
      await noteService.deleteNote(id)
      console.log('Deleted note:', id)

      // Remove from notes list
      setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id))

      // Clear current note if it was deleted
      if (currentNote && currentNote.id === id) {
        setCurrentNote(null)
        cacheRef.current = null
        isDirtyRef.current = false
        clearSaveTimeout()
      }
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  }

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      clearSaveTimeout()
    }
  }, [clearSaveTimeout])

  // Load notes when component mounts
  useEffect(() => {
    console.log('NoteProvider mounted, loading notes...')
    loadNotes()
  }, [])

  // Force save any pending changes in the cache
  const forceSave = useCallback(async () => {
    if (!currentNote || !isDirtyRef.current || !cacheRef.current) return

    try {
      await saveCurrentNote(cacheRef.current)
      isDirtyRef.current = false
    } catch (error) {
      console.error('Error during force save:', error)
    }
  }, [currentNote])

  const getChatHistory = async (noteId: string) => {
    console.log('Getting chat history for note:', noteId)
    try {
      const history = await noteService.getChatHistory(noteId)
      console.log('Loaded chat history:', history)
      return history
    } catch (error) {
      console.error(`Error getting chat history for note ${noteId}:`, error)
      throw error
    }
  }

  const clearChatHistory = async (noteId: string) => {
    console.log('Clearing chat history for note:', noteId)
    try {
      await noteService.clearChatHistory(noteId)
      console.log('Chat history cleared for note:', noteId)
    } catch (error) {
      console.error(`Error clearing chat history for note ${noteId}:`, error)
      throw error
    }
  }

  const value = {
    notes,
    currentNote,
    isLoading,
    loadNotes,
    createNote,
    loadNote,
    saveCurrentNote,
    updateNoteCache,
    forceSave,
    deleteNote,
    setCurrentNote,
    getChatHistory,
    clearChatHistory
  }

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>
}
