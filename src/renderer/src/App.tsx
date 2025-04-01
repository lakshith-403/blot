import { SidebarProvider } from './components/ui/sidebar'
import { SidebarTrigger } from './components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import { ChatSidebar } from './components/chat-sidebar'
import { ChatSidebarTrigger } from './components/chat-sidebar-trigger'
import { ChatSidebarProvider, useChatSidebar } from './contexts/chat-sidebar-context'
import MainEditor from './views/main-editor'
import { NoteProvider } from './contexts/note-context'
import { cn } from './lib/utils'

function AppContent() {
  const { isOpen } = useChatSidebar()

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AppSidebar />
      <main
        className={cn(
          'h-full flex-1 flex flex-col min-w-0 transition-all duration-300 h-screen',
          isOpen && 'pr-[30vw]'
        )}
      >
        <div className="flex gap-2 p-2">
          <SidebarTrigger />
          <ChatSidebarTrigger />
        </div>
        <div className="flex-1 h-full overflow-auto">
          <MainEditor />
        </div>
      </main>
      <ChatSidebar />
    </div>
  )
}

function App(): JSX.Element {
  return (
    <NoteProvider>
      <SidebarProvider>
        <ChatSidebarProvider>
          <AppContent />
        </ChatSidebarProvider>
      </SidebarProvider>
    </NoteProvider>
  )
}

export default App
