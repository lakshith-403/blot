import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Note, NoteService } from '../services/note-service'

interface NoteContextType {
  notes: Note[]
  currentNote: Note | null
  isLoading: boolean
  loadNotes: () => Promise<void>
  createNote: () => Promise<Note>
  loadNote: (id: string) => Promise<void>
  saveCurrentNote: (updates: { title?: string; content?: any }) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  setCurrentNote: (note: Note | null) => void
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
    setIsLoading(true)
    try {
      const note = await noteService.getNote(id)
      console.log('Loaded note:', note)
      if (note) {
        setCurrentNote(note)
      }
    } catch (error) {
      console.error(`Error loading note ${id}:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveCurrentNote = async (updates: { title?: string; content?: any }) => {
    if (!currentNote) return
    console.log('Saving note:', currentNote.id, updates)
    try {
      const updatedNote = await noteService.updateNote(currentNote.id, updates)
      console.log('Saved note:', updatedNote)
      setCurrentNote(updatedNote)

      // Update the note in the notes list
      setNotes((prevNotes) =>
        prevNotes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
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
      }
    } catch (error) {
      console.error(`Error deleting note ${id}:`, error)
      throw error
    }
  }

  // Load notes when component mounts
  useEffect(() => {
    console.log('NoteProvider mounted, loading notes...')
    loadNotes()
  }, [])

  const value = {
    notes,
    currentNote,
    isLoading,
    loadNotes,
    createNote,
    loadNote,
    saveCurrentNote,
    deleteNote,
    setCurrentNote
  }

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>
}
