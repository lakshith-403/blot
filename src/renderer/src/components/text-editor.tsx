import React, { forwardRef, useEffect, useLayoutEffect, useRef, MutableRefObject } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface EditorProps {
  readOnly?: boolean
  defaultValue?: any
  onTextChange?: (...args: any[]) => void
  onSelectionChange?: (...args: any[]) => void
}

const Editor = forwardRef<Quill, EditorProps>(
  ({ readOnly, defaultValue, onTextChange, onSelectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const defaultValueRef = useRef(defaultValue)
    const onTextChangeRef = useRef(onTextChange)
    const onSelectionChangeRef = useRef(onSelectionChange)

    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange
      onSelectionChangeRef.current = onSelectionChange
    })

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current?.enable(!readOnly)
      }
    }, [ref, readOnly])

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const editorContainer = container.appendChild(container.ownerDocument.createElement('div'))
      const quill = new Quill(editorContainer, {
        theme: 'snow'
      })

      if (ref && typeof ref === 'object') {
        ref.current = quill
      }

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current)
      }

      quill.on(Quill.events.TEXT_CHANGE, (...args) => {
        onTextChangeRef.current?.(...args)
      })

      quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
        onSelectionChangeRef.current?.(...args)
      })

      return () => {
        if (ref && typeof ref === 'object') {
          ref.current = null
        }
        container.innerHTML = ''
      }
    }, [ref])

    return <div className="h-full w-full" ref={containerRef}></div>
  }
)

Editor.displayName = 'Editor'

export default Editor
