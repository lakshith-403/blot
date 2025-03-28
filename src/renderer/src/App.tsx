import { SidebarProvider } from './components/ui/sidebar'
import { SidebarTrigger } from './components/ui/sidebar'
import { AppSidebar } from './components/app-sidebar'
import MainEditor from './views/main-editor'

function App(): JSX.Element {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="h-full w-full">
        <SidebarTrigger />
        <MainEditor />
      </main>
    </SidebarProvider>
  )
}

export default App
