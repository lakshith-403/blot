import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface TextReference {
  id: string
  text: string
  label: string
}

interface ChatSidebarContextProps {
  isOpen: boolean
  toggle: () => void
  setIsOpen: (open: boolean) => void
  references: TextReference[]
  addReference: (reference: TextReference) => void
  removeReference: (id: string) => void
}

const ChatSidebarContext = createContext<ChatSidebarContextProps | undefined>(undefined)

export function useChatSidebar() {
  const context = useContext(ChatSidebarContext)
  if (!context) {
    throw new Error('useChatSidebar must be used within a ChatSidebarProvider')
  }
  return context
}

interface ChatSidebarProviderProps {
  children: ReactNode
  defaultOpen?: boolean
}

export function ChatSidebarProvider({ children, defaultOpen = false }: ChatSidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [references, setReferences] = useState<TextReference[]>([])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const addReference = useCallback(
    (reference: TextReference) => {
      // Find the lowest available reference number
      const findLowestAvailableId = (refs: TextReference[]) => {
        // Get all used ids as numbers
        const usedIds = refs.map((ref) => parseInt(ref.id)).sort((a, b) => a - b)

        // Start from 1 and find the first gap
        let nextId = 1
        for (const id of usedIds) {
          if (id > nextId) {
            // Found a gap
            break
          }
          nextId = id + 1
        }

        return nextId
      }

      const nextId = findLowestAvailableId(references)

      const newRef = {
        ...reference,
        id: String(nextId),
        label: `Ref ${nextId}`
      }

      setReferences((prev) => [...prev, newRef])
    },
    [references]
  )

  const removeReference = useCallback((id: string) => {
    setReferences((prev) => prev.filter((ref) => ref.id !== id))
  }, [])

  const value = {
    isOpen,
    toggle,
    setIsOpen,
    references,
    addReference,
    removeReference
  }

  return <ChatSidebarContext.Provider value={value}>{children}</ChatSidebarContext.Provider>
}
