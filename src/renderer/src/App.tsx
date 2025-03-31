import { SidebarProvider } from './components/ui/sidebar'
import { SidebarTrigger } from './components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import { ChatSidebar } from './components/chat-sidebar'
import { ChatSidebarTrigger } from './components/chat-sidebar-trigger'
import { ChatSidebarProvider } from './contexts/chat-sidebar-context'
import MainEditor from './views/main-editor'
import { NoteProvider } from './contexts/note-context'

function App(): JSX.Element {
  return (
    <NoteProvider>
      <SidebarProvider>
        <ChatSidebarProvider>
          <AppSidebar />
          <main className="h-full w-full">
            <div className="flex gap-2 p-2">
              <SidebarTrigger />
              <ChatSidebarTrigger />
            </div>
            <MainEditor />
          </main>
          <ChatSidebar />
        </ChatSidebarProvider>
      </SidebarProvider>
    </NoteProvider>
  )
}

export default App
