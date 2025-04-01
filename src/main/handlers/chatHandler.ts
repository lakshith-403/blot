import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import OpenAI from 'openai'
import { notesDir, chatsDir } from '../utils/storage'

export function setupChatIPC() {
  // Add chat message to note
  ipcMain.handle('notes:addChatMessage', async (_, noteId, message) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      // Get the note to update its updatedAt timestamp
      const noteFilePath = path.join(notesDir, `${noteId}.json`)
      const noteData = await fs.readFile(noteFilePath, 'utf-8')
      const note = JSON.parse(noteData)

      // Update note's updatedAt timestamp
      note.updatedAt = new Date().toISOString()
      await fs.writeFile(noteFilePath, JSON.stringify(note, null, 2), 'utf-8')

      // Get chat history from separate file
      const chatFilePath = path.join(chatsDir, `${noteId}.json`)
      let chatHistory: Array<{
        role: string
        content: string
        timestamp: string
      }> = []

      try {
        const chatData = await fs.readFile(chatFilePath, 'utf-8')
        chatHistory = JSON.parse(chatData)
      } catch (error) {
        console.log(`Creating new chat file for note ${noteId}`)
      }

      // Add timestamp to the message
      const newMessage = {
        ...message,
        timestamp: new Date().toISOString()
      }

      // Add message to chat history
      chatHistory.push(newMessage)

      // Save chat history to separate file
      await fs.writeFile(chatFilePath, JSON.stringify(chatHistory, null, 2), 'utf-8')

      // Return updated note with chat history
      return { ...note, chatHistory }
    } catch (error) {
      console.error(`Error adding chat message to note ${noteId}:`, error)
      throw error
    }
  })

  // Clear chat history for a note
  ipcMain.handle('notes:clearChatHistory', async (_, noteId) => {
    try {
      if (!noteId) {
        throw new Error('Note ID is required')
      }

      // Get the note to update its updatedAt timestamp
      const noteFilePath = path.join(notesDir, `${noteId}.json`)
      const noteData = await fs.readFile(noteFilePath, 'utf-8')
      const note = JSON.parse(noteData)

      // Update note's updatedAt timestamp
      note.updatedAt = new Date().toISOString()
      await fs.writeFile(noteFilePath, JSON.stringify(note, null, 2), 'utf-8')

      // Clear chat history by writing empty array to chat file
      const chatFilePath = path.join(chatsDir, `${noteId}.json`)
      await fs.writeFile(chatFilePath, JSON.stringify([], null, 2), 'utf-8')

      // Return updated note with empty chat history
      return { ...note, chatHistory: [] }
    } catch (error) {
      console.error(`Error clearing chat history for note ${noteId}:`, error)
      throw error
    }
  })

  // Helper function to save a message to a note's chat history
  async function saveMessageToNote(noteId: string, message: { role: string; content: string }) {
    try {
      // Get the note to update its updatedAt timestamp
      const noteFilePath = path.join(notesDir, `${noteId}.json`)
      const noteData = await fs.readFile(noteFilePath, 'utf-8')
      const note = JSON.parse(noteData)

      // Update note's updatedAt timestamp
      note.updatedAt = new Date().toISOString()
      await fs.writeFile(noteFilePath, JSON.stringify(note, null, 2), 'utf-8')

      // Get chat history from separate file
      const chatFilePath = path.join(chatsDir, `${noteId}.json`)
      let chatHistory: Array<{
        role: string
        content: string
        timestamp: string
      }> = []

      try {
        const chatData = await fs.readFile(chatFilePath, 'utf-8')
        chatHistory = JSON.parse(chatData)
      } catch (error) {
        console.log(`Creating new chat file for note ${noteId}`)
      }

      // Add message to chat history with timestamp
      chatHistory.push({
        ...message,
        timestamp: new Date().toISOString()
      })

      // Save chat history to separate file
      await fs.writeFile(chatFilePath, JSON.stringify(chatHistory, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Error saving message to note ${noteId}:`, error)
    }
  }

  // Handle OpenAI chat API requests with streaming
  ipcMain.handle('openai:chat', async (event, messages, apiKey, noteId) => {
    try {
      console.log('Making OpenAI Chat API request from main process')

      // Save user message to chat history if noteId is provided
      if (noteId) {
        const userMessage = messages[messages.length - 1]
        if (userMessage && userMessage.role === 'user') {
          await saveMessageToNote(noteId, userMessage)
        }
      }

      const openai = new OpenAI({
        apiKey: apiKey
      })

      // Set up interrupt handler
      let aborted = false
      const interruptHandler = () => {
        console.log('Interrupting OpenAI chat stream')
        aborted = true
      }
      ipcMain.once('openai:chat-interrupt', interruptHandler)

      // For storing assistant response
      let assistantMessage = {
        role: 'assistant',
        content: ''
      }

      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
          stream: true
        })

        for await (const chunk of stream) {
          if (aborted) {
            await stream.controller.abort()
            break
          }

          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            // Add content to assistant message
            assistantMessage.content += content

            // Format the chunk as expected by the renderer
            const formattedChunk = `data: ${JSON.stringify({
              choices: [{ delta: { content } }]
            })}\n\n`

            event.sender.send('openai:chat-chunk', formattedChunk)
          }
        }

        // Save assistant message to chat history if noteId is provided and not aborted
        if (noteId && !aborted && assistantMessage.content) {
          await saveMessageToNote(noteId, assistantMessage)
        }

        event.sender.send('openai:chat-done')
        return true
      } finally {
        // Clean up interrupt handler
        ipcMain.removeListener('openai:chat-interrupt', interruptHandler)
      }
    } catch (error: unknown) {
      console.error('Error in OpenAI chat:', error)
      event.sender.send(
        'openai:chat-error',
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  })

  // Handle OpenAI API requests for improving text
  ipcMain.handle('openai:improve', async (_, text, r, apiKey, customInstruction) => {
    try {
      console.log('Making OpenAI API request from main process')
      const range = [r['index'], r['index'] + r['length']]

      const roundedText = text.substring(range[0], range[1])
      const roundedTextWithDelimiter = `~~${roundedText}~~`
      let markedText = text.slice(0, range[0]) + roundedTextWithDelimiter + text.slice(range[1])
      // Only keep 200 char to both sides in the marked text
      const markedTextStart = Math.max(0, range[0] - 200)
      const markedTextEnd = Math.min(markedText.length, range[1] + 200)
      markedText = markedText.substring(markedTextStart, markedTextEnd)

      const openai = new OpenAI({
        apiKey: apiKey
      })

      // Define user instruction based on whether a custom instruction was provided
      const userInstruction = customInstruction
        ? `I need to improve the following part of the text based on this instruction: "${customInstruction}". Text to be improved is marked with ~~ in either sides.
            Please only output the improved text. Even if the marked portion ends in the middle of a word, only output characters from the marked portion.
            Output ONLY the improved text. That means you should not include the original text or any other text outside of the portion sorrounded with ~~
            
            e.g.
            Marked text: 
            Hello Where can i find t~~he resturae~~nt?
            Output text:
            he restaura
            
            Here is a portion of the text containing the portion to be improved:
            ${markedText}`
        : `I need to improve the following part of the text. Text to be improved is marked with ~~ in either sides.
            Please only output the improved text. Even if the marked portion ends in the middle of a word, only output characters from the marked portion.
            Output ONLY the improved text. That means you should not include the original text or any other text outside of the portion sorrounded with ~~
            
            e.g.
            Marked text: 
            Hello Where can i find t~~he resturae~~nt?
            Output text:
            he restaura
            
            Here is a portion of the text containing the portion to be improved:
            ${markedText}`

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant for a note-taking app called Blot.
            You are a professional writing assistant trained to help users improve their writing while preserving their original voice and intent. Your job is to:
	•	Enhance clarity, grammar, flow, and structure.
	•	Suggest alternatives for weak or awkward phrasing.
	•	Maintain the user's tone, style, and purpose unless otherwise instructed.
	•	Be concise, constructive, and respectful in all suggestions.
	•	Offer explanations when asked, but do not overwhelm the user with technical grammar unless requested.
	•	Support multiple writing types (e.g. essays, fiction, emails, blog posts, academic writing, etc.) and adapt accordingly.

Do not generate full rewrites unless specifically asked. 
Focus on improving what's provided. 
If the user asks for tone-specific help 
(e.g., make it sound more formal, more persuasive, or more friendly), follow that instruction precisely.
Keep your changes to a minimum.

You have access to the following note:

--- NOTE CONTENT ---
${text}
-------------------

Please use this information to provide accurate and relevant responses.`
          },
          {
            role: 'user',
            content: userInstruction
          }
        ],
        temperature: 0.7,
        max_tokens: 5000
      })

      return completion.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('Error improving text with OpenAI:', error)
      throw error
    }
  })
}
