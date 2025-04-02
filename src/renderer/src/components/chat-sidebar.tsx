import { Maximize2, Send, StopCircle, Trash2, X, CheckCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useChatSidebar } from '@/contexts/chat-sidebar-context'
import { useNotes } from '@/contexts/note-context'
import { cn } from '@/lib/utils'
import { NoteService } from '@/services/note-service'
import ReactMarkdown from 'react-markdown'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  references?: TextReference[]
}

interface TextReference {
  id: string
  text: string
  label: string
}

// Access the enhanced window.api
declare global {
  interface Window {
    api: {
      notes: {
        getAll: () => Promise<any[]>
        get: (id: string) => Promise<any>
        create: (noteData: any) => Promise<any>
        update: (id: string, updates: any) => Promise<any>
        delete: (id: string) => Promise<boolean>
        getChatHistory: (noteId: string) => Promise<any[]>
        addChatMessage: (noteId: string, message: any) => Promise<any>
        clearChatHistory: (noteId: string) => Promise<any>
      }
      openai: {
        improve: (
          text: string,
          range: any,
          apiKey: string,
          customInstruction?: string
        ) => Promise<string>
        chat: (messages: any[], apiKey: string, noteId?: string) => Promise<any>
        onChatChunk: (callback: (chunk: string) => void) => () => void
        onChatDone: (callback: () => void) => () => void
        onChatError: (callback: (error: string) => void) => () => void
        interruptChat: () => void
        apply: (
          originalContent: string,
          improvedContent: string,
          apiKey: string,
          noteId: string
        ) => Promise<string>
      }
    }
  }
}

const apiKey = import.meta.env.RENDERER_VITE_OPENAI_API_KEY || ''
const noteService = new NoteService()

// Create a proper message component
const ChatMessage = ({
  message,
  isLastBotMessage,
  isStreaming,
  currentAiMessageId
}: {
  message: Message
  isLastBotMessage: boolean
  isStreaming: boolean
  currentAiMessageId: string | null
}) => {
  const { currentNote, getCachedContent, updateNoteContent } = useNotes()
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    if (!currentNote || !message.content) return

    setIsApplying(true)

    try {
      // Get the cached content (includes unsaved changes)
      const cachedNoteData = getCachedContent()
      const noteContentData = cachedNoteData?.content || currentNote.content

      let noteContent = ''
      if (noteContentData && Array.isArray(noteContentData.ops)) {
        // Extract text from each insert operation
        noteContent = noteContentData.ops
          .filter((op) => op && typeof op.insert === 'string')
          .map((op) => op.insert)
          .join('')
      } else {
        noteContent = '[Note content unavailable]'
      }

      console.log('Applying bot message changes...')
      console.log('Bot message:', message.content)

      // Call the API to apply changes
      const result = await window.api.openai.apply(
        noteContent,
        message.content,
        apiKey,
        currentNote.id
      )

      console.log('Applied result:', result)

      // Update the note with the modified content
      if (result && result !== noteContent) {
        // Create new Delta format content
        const newContent = {
          ops: [{ insert: result }]
        }

        // Update the note content
        await updateNoteContent(newContent)
        console.log('Note updated successfully')
      } else {
        console.log('No changes needed or applied')
      }
    } catch (error) {
      console.error('Error applying changes:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div
      className="mb-4"
      style={{
        width: '27vw',
        wordBreak: 'break-word'
      }}
    >
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
        className={`rounded-lg px-3 py-2 text-sm ${
          message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <ReactMarkdown>
          {message.content ||
            (message.sender === 'ai' && isStreaming && message.id === currentAiMessageId
              ? 'Thinking...'
              : '')}
        </ReactMarkdown>

        {/* Add subtle Apply button for the last bot message */}
        {message.sender === 'ai' && isLastBotMessage && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 px-2 py-0"
              disabled={isStreaming || isApplying}
              onClick={handleApply}
            >
              {isApplying ? 'Applying...' : <>Apply</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Also add a fullscreen message component with the Apply button
const FullscreenChatMessage = ({
  message,
  isLastBotMessage,
  isStreaming,
  currentAiMessageId
}: {
  message: Message
  isLastBotMessage: boolean
  isStreaming: boolean
  currentAiMessageId: string | null
}) => {
  const { currentNote, getCachedContent, updateNoteContent } = useNotes()
  const [isApplying, setIsApplying] = useState(false)

  const handleApply = async () => {
    if (!currentNote || !message.content) return

    setIsApplying(true)

    try {
      // Get the cached content (includes unsaved changes)
      const cachedNoteData = getCachedContent()
      const noteContentData = cachedNoteData?.content || currentNote.content

      let noteContent = ''
      if (noteContentData && Array.isArray(noteContentData.ops)) {
        // Extract text from each insert operation
        noteContent = noteContentData.ops
          .filter((op) => op && typeof op.insert === 'string')
          .map((op) => op.insert)
          .join('')
      } else {
        noteContent = '[Note content unavailable]'
      }

      console.log('Applying bot message changes...')
      console.log('Bot message:', message.content)

      // Call the API to apply changes
      const result = await window.api.openai.apply(
        noteContent,
        message.content,
        apiKey,
        currentNote.id
      )

      console.log('Applied result:', result)

      // Update the note with the modified content
      if (result && result !== noteContent) {
        // Create new Delta format content
        const newContent = {
          ops: [{ insert: result }]
        }

        // Update the note content
        await updateNoteContent(newContent)
        console.log('Note updated successfully')
      } else {
        console.log('No changes needed or applied')
      }
    } catch (error) {
      console.error('Error applying changes:', error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm font-medium">{message.sender === 'ai' ? 'Blot' : 'You'}</p>
        <p className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
      <div
        className={`rounded-lg p-4 text-sm ${
          message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        }`}
      >
        <ReactMarkdown>
          {message.content ||
            (message.sender === 'ai' && isStreaming && message.id === currentAiMessageId
              ? 'Thinking...'
              : '')}
        </ReactMarkdown>

        {/* Add subtle Apply button for the last bot message */}
        {message.sender === 'ai' && isLastBotMessage && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-6 px-2 py-0"
              disabled={isStreaming || isApplying}
              onClick={handleApply}
            >
              {isApplying ? (
                'Applying...'
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Apply
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatSidebar() {
  const { isOpen, references, removeReference } = useChatSidebar()
  const { currentNote, getCachedContent } = useNotes()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fullscreenScrollAreaRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [noNoteSelected, setNoNoteSelected] = useState(false)
  const currentAiMessageIdRef = useRef<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Load chat history when the current note changes
  useEffect(() => {
    if (!currentNote) {
      setNoNoteSelected(true)
      setMessages([])
      return
    }

    setNoNoteSelected(false)

    const loadChatHistory = async () => {
      try {
        const chatHistory = await noteService.getChatHistory(currentNote.id)

        // Convert the chat history to our Message format
        const formattedMessages = chatHistory.map((msg) => ({
          id: crypto.randomUUID(),
          content: msg.content,
          sender: msg.role === 'user' ? 'user' : ('ai' as 'user' | 'ai'),
          timestamp: new Date(msg.timestamp)
        }))

        setMessages(formattedMessages)
      } catch (error) {
        console.error('Error loading chat history:', error)
      }
    }

    if (!isStreaming) {
      loadChatHistory()
    }
  }, [currentNote])

  useEffect(() => {
    // Set up IPC listeners for chat streaming
    const removeChunkListener = window.api.openai.onChatChunk((chunk) => {
      if (!currentAiMessageIdRef.current) return

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
    })

    const removeDoneListener = window.api.openai.onChatDone(() => {
      console.log('Chat done')
      setIsStreaming(false)
      currentAiMessageIdRef.current = null
    })

    const removeErrorListener = window.api.openai.onChatError((errorMessage) => {
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
    })

    // Clean up listeners
    return () => {
      removeChunkListener()
      removeDoneListener()
      removeErrorListener()
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

    // Also scroll fullscreen chat to bottom
    if (fullscreenScrollAreaRef.current) {
      const scrollContainer = fullscreenScrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!inputValue.trim() && references.length === 0) || isStreaming || !currentNote) return

    // Get the cached content (includes unsaved changes)
    const cachedNoteData = getCachedContent()

    // Prepare content with references if any
    let content = inputValue

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender: 'user',
      timestamp: new Date(),
      references: [...references] // Store references with the message
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')

    // Clear references after sending
    references.forEach((ref) => removeReference(ref.id))

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

      // Extract note content from the ops array using cached content
      let noteContent = ''
      const noteContentData = cachedNoteData?.content || currentNote.content
      console.log('noteContentData', cachedNoteData)

      if (noteContentData && Array.isArray(noteContentData.ops)) {
        // Extract text from each insert operation
        noteContent = noteContentData.ops
          .filter((op) => op && typeof op.insert === 'string')
          .map((op) => op.insert)
          .join('')

        // Optionally truncate very large notes
        const MAX_NOTE_LENGTH = 10000 // Adjust based on your token limit needs
        if (noteContent.length > MAX_NOTE_LENGTH) {
          noteContent =
            noteContent.substring(0, MAX_NOTE_LENGTH) + '... [Note truncated due to length]'
        }
      } else {
        noteContent = '[Note content unavailable]'
      }

      // Enhance the prompt with metadata if available
      let noteMeta = ''
      const noteTitle = cachedNoteData?.title || currentNote.title

      if (noteTitle) {
        noteMeta += `Title: ${noteTitle}\n`
      }
      if (currentNote.createdAt) {
        noteMeta += `Created: ${new Date(currentNote.createdAt).toLocaleString()}\n`
      }
      if (currentNote.updatedAt) {
        noteMeta += `Last Updated: ${new Date(currentNote.updatedAt).toLocaleString()}\n`
      }

      // Prepare messages for API with note content in system prompt
      const systemPrompt = `You are a helpful assistant for a note-taking app called Blot.
      You are a professional writing assistant trained to help users improve their writing while preserving their original voice and intent. Your job is to:
	•	Enhance clarity, grammar, flow, and structure.
	•	Suggest alternatives for weak or awkward phrasing.
	•	Maintain the user's tone, style, and purpose unless otherwise instructed.
	•	Be concise, constructive, and respectful in all suggestions.
	•	Offer explanations when asked, but do not overwhelm the user with technical grammar unless requested.
	•	Support multiple writing types (e.g. essays, fiction, emails, blog posts, academic writing, etc.) and adapt accordingly.

Do not generate full rewrites unless specifically asked. Focus on improving what's provided. If the user asks for tone-specific help (e.g., make it sound more formal, more persuasive, or more friendly), follow that instruction precisely.
You have access to the following note:

--- NOTE METADATA ---
${noteMeta}

--- NOTE CONTENT ---
${noteContent}
-------------------

Please use this information to provide accurate and relevant responses.

--- REFERENCES ---
Following are the highlighted text from the note that the user is referring to. If there are references, use them to answer the user's question instead of the whole note.

${references.map((ref) => `ref${ref.id}:\n ${ref.text}`).join('\n')}

`

      const apiMessages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userMessage.content }
      ]

      // Use IPC to communicate with OpenAI through main process
      await window.api.openai.chat(apiMessages, apiKey, currentNote.id)
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
    window.api.openai.interruptChat()
  }

  const handleClearChat = async () => {
    if (!currentNote) return

    try {
      await noteService.clearChatHistory(currentNote.id)
      setMessages([])
      if (isStreaming) {
        handleInterrupt()
      }
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-svh border-l border-border bg-sidebar flex flex-col transition-all duration-300 z-50',
          isOpen ? 'opacity-100 w-64' : 'opacity-0 w-0 overflow-hidden'
        )}
        style={{
          width: '30vw'
        }}
      >
        <div className="flex-1 flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <h3 className="text-sm font-medium">Chat with Blot</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSheetOpen(true)}
                className="h-8 w-8"
                title="Fullscreen chat"
                disabled={!currentNote}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-8 w-8"
                title="Clear chat"
                disabled={!currentNote}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col h-full">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 pb-16 mb-16 h-full">
              {noNoteSelected ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-muted-foreground">Select a note to start chatting</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-muted-foreground">hehe</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isLastBotMessage={message.sender === 'ai' && index === messages.length - 1}
                    isStreaming={isStreaming}
                    currentAiMessageId={currentAiMessageIdRef.current}
                  />
                ))
              )}
            </ScrollArea>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 mt-auto border-t border-border sticky bottom-0 bg-sidebar"
          >
            {/* References */}
            {references.length > 0 && (
              <div className="mb-2 pb-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {references.map((ref) => (
                    <HoverCard key={ref.id} openDelay={200} closeDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="cursor-pointer whitespace-nowrap hover:bg-muted/50 transition-colors"
                          >
                            {ref.label}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={(e) => {
                              e.preventDefault()
                              removeReference(ref.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent sideOffset={5} className="w-80 text-sm p-2">
                        {ref.text}
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isStreaming || noNoteSelected}
              />
              {isStreaming ? (
                <Button
                  type="button"
                  onClick={handleInterrupt}
                  variant="outline"
                  size="icon"
                  title="Stop generating"
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={(!inputValue.trim() && references.length === 0) || noNoteSelected}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Fullscreen Chat Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[100vh] w-full p-0 border-t border-border">
          <SheetHeader className="flex justify-between items-center p-4 border-b border-border">
            <SheetTitle>Chat with Blot</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full max-h-[calc(100vh)]">
            <ScrollArea ref={fullscreenScrollAreaRef} className="flex-1 p-2 mb-8 h-full">
              {noNoteSelected ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-muted-foreground">Select a note to start chatting</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <p className="text-muted-foreground">Start a conversation</p>
                </div>
              ) : (
                <div className="px-4 mx-auto">
                  {messages.map((message, index) => (
                    <FullscreenChatMessage
                      key={message.id}
                      message={message}
                      isLastBotMessage={message.sender === 'ai' && index === messages.length - 1}
                      isStreaming={isStreaming}
                      currentAiMessageId={currentAiMessageIdRef.current}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <form
              onSubmit={handleSubmit}
              className="p-6 mt-auto border-t border-border sticky bottom-0 bg-background"
            >
              {/* References */}
              {references.length > 0 && (
                <div className="mb-2 pb-2">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {references.map((ref) => (
                      <HoverCard key={ref.id} openDelay={200} closeDelay={200}>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="cursor-pointer whitespace-nowrap hover:bg-muted/50 transition-colors"
                            >
                              {ref.label}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={(e) => {
                                e.preventDefault()
                                removeReference(ref.id)
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent sideOffset={5} className="w-80 text-sm p-2">
                          {ref.text}
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3 max-w-3xl mx-auto">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  disabled={isStreaming || noNoteSelected}
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    onClick={handleInterrupt}
                    variant="outline"
                    title="Stop generating"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={(!inputValue.trim() && references.length === 0) || noNoteSelected}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                )}
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
