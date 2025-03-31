import { Send } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatSidebar } from '@/contexts/chat-sidebar-context'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
}

export function ChatSidebar() {
  const { isOpen } = useChatSidebar()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! How can I help you with your notes today?',
      sender: 'ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: '2',
      content: 'I need help organizing my project notes.',
      sender: 'user',
      timestamp: new Date(Date.now() - 1000 * 60 * 4)
    },
    {
      id: '3',
      content:
        'I can suggest some categorization and tagging strategies for your project notes. Would you like me to explain some approaches?',
      sender: 'ai',
      timestamp: new Date(Date.now() - 1000 * 60 * 3)
    }
  ])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages([...messages, newMessage])
    setInputValue('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: crypto.randomUUID(),
        content:
          'I received your message. This is a simulated response while we implement the actual chat functionality.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-svh border-l border-border bg-sidebar flex flex-col transition-all duration-300 z-50',
        isOpen ? 'opacity-100 w-64' : 'opacity-0 w-0 overflow-hidden'
      )}
    >
      <div className="flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <h3 className="text-sm font-medium">Chat Assistant</h3>
        </div>

        <div className="flex flex-col h-full">
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 pb-16 mb-16 h-full">
            {messages.map((message) => (
              <div key={message.id} className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium">{message.sender === 'ai' ? 'Blot' : 'You'}</p>
                  <p className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 mt-auto border-t border-border sticky bottom-0 bg-sidebar"
        >
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
