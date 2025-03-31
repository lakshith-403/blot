import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ChatSidebarContextProps = {
  isOpen: boolean
  toggle: () => void
  setIsOpen: (open: boolean) => void
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

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const value = {
    isOpen,
    toggle,
    setIsOpen
  }

  return <ChatSidebarContext.Provider value={value}>{children}</ChatSidebarContext.Provider>
}
