import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Icons for toolbar buttons
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Wand2
} from 'lucide-react'

interface EditorProps {
  readOnly?: boolean
  defaultValue?: any
  title?: string
  onTitleChange?: (title: string) => void
  onTextChange?: (...args: any[]) => void
  onSelectionChange?: (...args: any[]) => void
  className?: string
}

// Formats we'll track
interface FormatState {
  bold: boolean
  italic: boolean
  underline: boolean
  header: false | 1 | 2 | 3 | 4
  list: false | 'ordered' | 'bullet'
  blockquote: boolean
  align: false | '' | 'center' | 'right'
}

const DEFAULT_FORMATS: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  header: false,
  list: false,
  blockquote: false,
  align: false
}

const Editor = forwardRef<Quill, EditorProps>(
  ({ readOnly = false, defaultValue, onTextChange, onSelectionChange, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const editorContainerRef = useRef<HTMLDivElement | null>(null)
    const defaultValueRef = useRef(defaultValue)
    const onTextChangeRef = useRef(onTextChange)
    const onSelectionChangeRef = useRef(onSelectionChange)
    const quillRef = useRef<Quill | null>(null)
    const [formats, setFormats] = useState<FormatState>(DEFAULT_FORMATS)
    const ignoreChangeRef = useRef(false) // Flag to avoid triggering onTextChange during programmatic updates
    const isInitializedRef = useRef(false)

    // State for text selection and popover
    const [selection, setSelection] = useState<{ text: string; range: any } | null>(null)
    const [showPopover, setShowPopover] = useState(false)
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
    const [isHoveringPopover, setIsHoveringPopover] = useState(false)
    const selectionPopoverRef = useRef<HTMLDivElement | null>(null)
    const popoverTimerRef = useRef<number | null>(null)

    // Update refs when props change
    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange
      onSelectionChangeRef.current = onSelectionChange
    })

    // Update content when defaultValue changes, but only during initial load
    useEffect(() => {
      if (quillRef.current && defaultValue !== defaultValueRef.current) {
        // Store the new defaultValue reference
        defaultValueRef.current = defaultValue

        // Only update content during initialization or if editor is empty
        // This prevents cursor reset during autosave cycles
        if (
          !isInitializedRef.current ||
          !quillRef.current.getLength() ||
          quillRef.current.getText().trim() === ''
        ) {
          // Skip firing onTextChange for this programmatic update
          ignoreChangeRef.current = true

          // Update the Quill editor content
          quillRef.current.setContents(defaultValue || '')

          // Mark as initialized
          isInitializedRef.current = true

          // Reset the ignore flag after update
          setTimeout(() => {
            ignoreChangeRef.current = false
          }, 0)
        }
      }
    }, [defaultValue])

    // Custom toolbar action handlers
    const handleFormat = (format: string, value: any = true) => {
      if (!quillRef.current || readOnly) return
      quillRef.current.format(format, value)
    }

    // Update formats when selection changes
    const updateFormats = () => {
      if (!quillRef.current) return
      if (!quillRef.current.hasFocus()) {
        return
      }

      const quill = quillRef.current
      const formats = quill.getFormat()

      setFormats({
        bold: !!formats.bold,
        italic: !!formats.italic,
        underline: !!formats.underline,
        header: (formats.header as false | 1 | 2 | 3) || false,
        list: (formats.list as false | 'ordered' | 'bullet') || false,
        blockquote: !!formats.blockquote,
        align: (formats.align as false | '' | 'center' | 'right') || false
      })
    }

    useEffect(() => {
      if (quillRef.current) {
        quillRef.current.enable(!readOnly)
      }
    }, [readOnly])

    // Handle text selection
    const handleSelectionChange = (range: any, oldRange: any, source: string) => {
      if (quillRef.current && range && range.length > 0 && !readOnly) {
        const text = quillRef.current.getText(range.index, range.length)
        if (text.trim().length > 0) {
          // Position the popover near the selection
          try {
            const rangeBounds = quillRef.current.getBounds(range.index, range.length)

            // Calculate position relative to the editor
            const editorRect = editorContainerRef.current?.getBoundingClientRect()
            if (editorRect && rangeBounds) {
              setPopoverPosition({
                top: Math.max(rangeBounds.top - 30, 5),
                left: rangeBounds.left + 10 // Center over selection
              })

              setSelection({ text, range })
              setShowPopover(true)
            }
          } catch (error) {
            console.error('Error getting bounds:', error)
          }

          // Clear any existing timer
          if (popoverTimerRef.current) {
            window.clearTimeout(popoverTimerRef.current)
          }
        }
      } else if (!isHoveringPopover) {
        // Only hide if not hovering over popover
        // Add a small delay before hiding to allow clicking the buttons
        if (popoverTimerRef.current) {
          window.clearTimeout(popoverTimerRef.current)
        }

        popoverTimerRef.current = window.setTimeout(() => {
          setShowPopover(false)
          setSelection(null)
        }, 300) // Small delay to allow clicking buttons
      }

      // Call the original onSelectionChange handler and update formats
      updateFormats()
      if (onSelectionChangeRef.current) {
        onSelectionChangeRef.current(range, oldRange, source)
      }
    }

    const handleImprove = () => {
      if (selection) {
        console.log('Improve text:', selection.text)
        // This will be integrated with LLM in the future
        setShowPopover(false)
      }
    }

    useEffect(() => {
      const container = containerRef.current
      if (!container || !editorContainerRef.current) return

      // Initialize Quill without toolbar
      const quill = new Quill(editorContainerRef.current, {
        theme: 'snow',
        modules: {
          toolbar: false // Disable default toolbar
        }
      })

      quillRef.current = quill
      quill.enable(!readOnly)

      if (ref && typeof ref === 'object') {
        ref.current = quill
      }

      if (defaultValueRef.current) {
        quill.setContents(defaultValueRef.current)
      }

      quill.on(Quill.events.TEXT_CHANGE, (...args) => {
        updateFormats()
        if (!ignoreChangeRef.current) {
          onTextChangeRef.current?.(...args)
        }
      })

      quill.on(Quill.events.SELECTION_CHANGE, handleSelectionChange)

      return () => {
        if (ref && typeof ref === 'object') {
          ref.current = null
        }
        quillRef.current = null
      }
    }, [ref, readOnly])

    return (
      <div
        className={`h-full w-full top-0 flex-col border rounded-md ${className}`}
        ref={containerRef}
      >
        {/* Custom Toolbar */}
        {!readOnly && (
          <TooltipProvider>
            <div className="flex items-center sticky top-0 z-10 bg-background flex gap-1 p-2 border-b flex-wrap justify-between">
              <div className="flex gap-1 flex-1 flex-wrap">
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.bold ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('bold', !formats.bold)}
                        disabled={readOnly}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.italic ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('italic', !formats.italic)}
                        disabled={readOnly}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.underline ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('underline', !formats.underline)}
                        disabled={readOnly}
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Underline</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-6 w-px bg-muted mx-1 hidden sm:block" />

                {/* Lists */}
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.list === 'bullet' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() =>
                          handleFormat('list', formats.list === 'bullet' ? false : 'bullet')
                        }
                        disabled={readOnly}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bullet List</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.list === 'ordered' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() =>
                          handleFormat('list', formats.list === 'ordered' ? false : 'ordered')
                        }
                        disabled={readOnly}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Numbered List</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-6 w-px bg-muted mx-1 hidden sm:block" />

                {/* Heading Select */}
                <Select
                  value={formats.header ? formats.header.toString() : 'normal'}
                  onValueChange={(value) =>
                    handleFormat('header', value === 'normal' ? false : parseInt(value))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-[130px] min-w-[110px]">
                    <SelectValue placeholder="Heading" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="1">Heading 1</SelectItem>
                    <SelectItem value="2">Heading 2</SelectItem>
                    <SelectItem value="3">Heading 3</SelectItem>
                    <SelectItem value="4">Heading 4</SelectItem>
                  </SelectContent>
                </Select>

                <div className="h-6 w-px bg-muted mx-1 hidden sm:block" />

                {/* Other formatting */}
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.blockquote ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('blockquote', !formats.blockquote)}
                        disabled={readOnly}
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Blockquote</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-6 w-px bg-muted mx-1 hidden sm:block" />

                {/* Alignment */}
                <div className="flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          formats.align === '' || formats.align === false ? 'secondary' : 'ghost'
                        }
                        size="icon"
                        onClick={() => handleFormat('align', '')}
                        disabled={readOnly}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Left</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.align === 'center' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('align', 'center')}
                        disabled={readOnly}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Center</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={formats.align === 'right' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => handleFormat('align', 'right')}
                        disabled={readOnly}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Right</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}

        {/* Editor container */}
        <div className="flex-1 overflow-auto relative mt-5" ref={editorContainerRef}>
          {/* Selection popover */}
          {showPopover && selection && (
            <div
              className="absolute z-500 animate-in fade-in-0 zoom-in-95 drop-shadow-sm"
              ref={selectionPopoverRef}
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`
              }}
              onMouseEnter={() => setIsHoveringPopover(true)}
              onMouseLeave={() => setIsHoveringPopover(false)}
            >
              <div className="bg-popover rounded-md border border-border inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 py-0 rounded-md text-xs"
                  onClick={handleImprove}
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Improve
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

Editor.displayName = 'Editor'

export default Editor
