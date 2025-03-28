import { SidebarProvider } from './components/ui/sidebar'
import { SidebarTrigger } from './components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import MainEditor from './views/main-editor'
import { NoteProvider } from './contexts/note-context'

function App(): JSX.Element {
  return (
    <NoteProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="h-full w-full">
          <SidebarTrigger />
          <MainEditor />
        </main>
      </SidebarProvider>
    </NoteProvider>
  )
}

export default App
