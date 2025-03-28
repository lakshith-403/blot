import { useEffect, useRef, useState } from 'react'
import Editor from '../components/text-editor'
import { useNotes } from '@/contexts/note-context'
import { Input } from '@/components/ui/input'

const MainEditor = () => {
  const quillRef = useRef<any>(null)
  const { currentNote, updateNoteCache } = useNotes()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<any>(null)
  const prevNoteIdRef = useRef<string | null>(null)

  // Update local state when the current note changes
  useEffect(() => {
    if (currentNote) {
      // Always update content when switching between notes
      if (prevNoteIdRef.current !== currentNote.id) {
        console.log('Switching to note:', currentNote.id)
        setTitle(currentNote.title)
        setContent(currentNote.content)
        prevNoteIdRef.current = currentNote.id
      } else {
        // Just update the title if it's the same note
        setTitle(currentNote.title)
      }
    } else {
      setTitle('')
      setContent(null)
      prevNoteIdRef.current = null
    }
  }, [currentNote])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    updateNoteCache({ title: newTitle })
  }

  const handleTextChange = () => {
    if (quillRef.current) {
      const quillContent = quillRef.current.getContents()
      updateNoteCache({ content: quillContent })
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      {currentNote ? (
        <>
          <div className="flex items-center px-3 py-2 border-b">
            <div className="flex-1">
              <Input
                placeholder="Note title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-medium border-none focus-visible:ring-0 px-0 h-auto w-full"
              />
            </div>
          </div>

          <div className="flex-1">
            <Editor
              ref={quillRef}
              key={currentNote.id}
              defaultValue={content}
              onTextChange={handleTextChange}
            />
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h3 className="text-lg font-medium">No note selected</h3>
            <p className="mt-1">Select a note from the sidebar or create a new one</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MainEditor
