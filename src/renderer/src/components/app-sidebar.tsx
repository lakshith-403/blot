import { FilePlus, Trash, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotes } from '@/contexts/note-context'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const { notes, loadNotes, createNote, deleteNote, loadNote, currentNote, forceSave } = useNotes()

  const handleRefresh = () => {
    loadNotes()
  }

  const handleCreateNote = async () => {
    // Force save any pending changes before creating a new note
    await forceSave()
    createNote()
  }

  const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Force save if we're deleting the current note
    if (currentNote && currentNote.id !== id) {
      await forceSave()
    }

    deleteNote(id)
  }

  const handleNoteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()

    // No need to manually call forceSave here as we updated loadNote to handle this
    loadNote(id)
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-4 py-2">
            <SidebarGroupLabel>My Notes</SidebarGroupLabel>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" title="Refresh notes" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Add new note" onClick={handleCreateNote}>
                <FilePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SidebarGroupContent>
            <SidebarMenu>
              {notes.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No notes yet. Click the "+" button to create one.
                </div>
              ) : (
                notes.map((note) => (
                  <SidebarMenuItem key={note.id} className="group">
                    <SidebarMenuButton asChild>
                      <a
                        href="#"
                        className={`flex items-center justify-between w-full group py-5 ${
                          currentNote?.id === note.id ? 'bg-muted/100' : ''
                        }`}
                        onClick={(e) => handleNoteClick(e, note.id)}
                      >
                        <div className="flex items-center">
                          <div>
                            <span
                              className={`font-medium ${
                                currentNote?.id === note.id ? 'font-bold' : ''
                              }`}
                            >
                              {typeof note.title === 'object' ? 'Untitled Note' : note.title}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete note"
                          onClick={(e) => handleDeleteNote(e, note.id)}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
