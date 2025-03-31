import { Send, X, StopCircle, Trash2 } from 'lucide-react'
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

const apiKey = import.meta.env.RENDERER_VITE_OPENAI_API_KEY || ''

export function ChatSidebar() {
  const { isOpen } = useChatSidebar()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentAiMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Set up IPC listeners for chat streaming
    const handleChatChunk = (_: any, chunk: string) => {
      if (!currentAiMessageIdRef.current) return

      console.log('Recieved chunk:', chunk)

      const lines = chunk.split('\n').filter((line) => line.trim() !== '')

      for (const line of lines) {
        if (line.includes('[DONE]')) continue
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content || ''
            if (content) {
              // console.log('Recieved content:', content)
              setMessages((messages) =>
                messages.map((msg) =>
                  msg.id === currentAiMessageIdRef.current
                    ? { ...msg, content: msg.content + content }
                    : msg
                )
              )
            }
          } catch (e) {
            console.error('Failed to parse chunk:', e)
          }
        }
      }
    }

    const handleChatDone = () => {
      setIsStreaming(false)
      currentAiMessageIdRef.current = null
    }

    const handleChatError = (_: any, errorMessage: string) => {
      if (currentAiMessageIdRef.current) {
        setMessages((messages) =>
          messages.map((msg) =>
            msg.id === currentAiMessageIdRef.current
              ? { ...msg, content: `Error: ${errorMessage}` }
              : msg
          )
        )
      }
      setIsStreaming(false)
      currentAiMessageIdRef.current = null
    }

    // Clean up previous listeners before adding new ones
    window.electron.ipcRenderer.removeAllListeners('openai:chat-chunk')
    window.electron.ipcRenderer.removeAllListeners('openai:chat-done')
    window.electron.ipcRenderer.removeAllListeners('openai:chat-error')

    // Add event listeners
    window.electron.ipcRenderer.on('openai:chat-chunk', handleChatChunk)
    window.electron.ipcRenderer.on('openai:chat-done', handleChatDone)
    window.electron.ipcRenderer.on('openai:chat-error', handleChatError)

    // Clean up listeners
    return () => {
      window.electron.ipcRenderer.removeListener('openai:chat-chunk', handleChatChunk)
      window.electron.ipcRenderer.removeListener('openai:chat-done', handleChatDone)
      window.electron.ipcRenderer.removeListener('openai:chat-error', handleChatError)
    }
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isStreaming) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')

    const aiMessageId = crypto.randomUUID()
    currentAiMessageIdRef.current = aiMessageId

    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        content: '',
        sender: 'ai',
        timestamp: new Date()
      }
    ])

    try {
      setIsStreaming(true)

      // Prepare messages for API
      const apiMessages = [
        {
          role: 'system',
          content: 'You are a helpful assistant for a note-taking app called Blot.'
        },
        ...messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userMessage.content }
      ]

      // Use IPC to communicate with OpenAI through main process
      await window.api.openai.chat(apiMessages, apiKey)
    } catch (error) {
      console.error('Error in chat:', error)
      setMessages((messages) =>
        messages.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: 'Sorry, there was an error processing your request.' }
            : msg
        )
      )
      setIsStreaming(false)
      currentAiMessageIdRef.current = null
    }
  }

  const handleInterrupt = () => {
    setIsStreaming(false)
    currentAiMessageIdRef.current = null
    window.electron.ipcRenderer.send('openai:chat-interrupt')
  }

  const handleClearChat = () => {
    setMessages([])
    if (isStreaming) {
      handleInterrupt()
    }
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearChat}
            className="h-8 w-8"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
                  <p className="text-sm">
                    {message.content ||
                      (message.sender === 'ai' &&
                      isStreaming &&
                      message.id === currentAiMessageIdRef.current
                        ? 'Thinking...'
                        : '')}
                  </p>
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
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                type="button"
                onClick={handleInterrupt}
                variant="destructive"
                size="icon"
                title="Stop generating"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
