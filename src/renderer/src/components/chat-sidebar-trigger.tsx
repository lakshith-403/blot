import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatSidebar } from '@/contexts/chat-sidebar-context'

export function ChatSidebarTrigger() {
  const { toggle, isOpen } = useChatSidebar()

  return (
    <Button variant="ghost" size="icon" className={cn('h-7 w-7')} onClick={toggle}>
      <MessageSquare className={isOpen ? 'text-primary' : ''} />
      <span className="sr-only">Toggle Chat</span>
    </Button>
  )
}
