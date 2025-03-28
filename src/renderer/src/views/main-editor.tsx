import { useEffect, useRef, useState } from 'react'
import Editor from '../components/text-editor'
import { useNotes } from '@/contexts/note-context'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { Input } from '@/components/ui/input'

const MainEditor = () => {
  const quillRef = useRef<any>(null)
  const { currentNote, saveCurrentNote } = useNotes()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState<any>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Update local state when the current note changes
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title)
      setContent(currentNote.content)
      setHasUnsavedChanges(false)
      console.log(currentNote)
    } else {
      setTitle('')
      setContent(null)
      setHasUnsavedChanges(false)
    }
  }, [currentNote])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setHasUnsavedChanges(true)
  }

  const handleTextChange = () => {
    if (quillRef.current) {
      setHasUnsavedChanges(true)
    }
  }

  const handleSave = async () => {
    if (!currentNote || !quillRef.current) return

    const quillContent = quillRef.current.getContents()

    try {
      await saveCurrentNote({
        title,
        content: quillContent
      })
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  return (
    <div className="h-full w-full flex flex-col">
      {currentNote ? (
        <>
          <div className="flex justify-between items-center px-3 py-2 border-b">
            <div className="flex-1 mr-2">
              <Input
                placeholder="Note title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-lg font-medium border-none focus-visible:ring-0 px-0 h-auto w-full"
              />
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <div className="flex-1">
            <Editor ref={quillRef} defaultValue={content} onTextChange={handleTextChange} />
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
