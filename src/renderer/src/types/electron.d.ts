interface IElectronAPI {
  openai: {
    improve: (text: string, apiKey: string) => Promise<string>
  }
  notes: {
    getAll: () => Promise<
      Array<{
        id: string
        title: string
        content: any
        createdAt: string
        updatedAt: string
      }>
    >
    get: (id: string) => Promise<{
      id: string
      title: string
      content: any
      createdAt: string
      updatedAt: string
    } | null>
    create: (noteData: { title?: string; content?: any }) => Promise<{
      id: string
      title: string
      content: any
      createdAt: string
      updatedAt: string
    }>
    update: (
      id: string,
      updates: { title?: string; content?: any }
    ) => Promise<{
      id: string
      title: string
      content: any
      createdAt: string
      updatedAt: string
    }>
    delete: (id: string) => Promise<boolean>
  }
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}

export {}
