import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Icons for toolbar buttons
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Link
} from 'lucide-react'

interface EditorProps {
  readOnly?: boolean
  defaultValue?: any
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

    useLayoutEffect(() => {
      onTextChangeRef.current = onTextChange
      onSelectionChangeRef.current = onSelectionChange
    })

    // Custom toolbar action handlers
    const handleFormat = (format: string, value: any = true) => {
      if (!quillRef.current || readOnly) return
      quillRef.current.format(format, value)
    }

    // Update formats when selection changes
    const updateFormats = () => {
      if (!quillRef.current) return

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
        onTextChangeRef.current?.(...args)
      })

      quill.on(Quill.events.SELECTION_CHANGE, (...args) => {
        updateFormats()
        onSelectionChangeRef.current?.(...args)
      })

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
            <div className="flex items-center sticky top-0 z-10 bg-background flex gap-1 p-2 border-b flex-wrap">
              {/* Bold, Italic, Underline */}
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
          </TooltipProvider>
        )}

        {/* Editor container */}
        <div className="flex-1 overflow-auto" ref={editorContainerRef}></div>
      </div>
    )
  }
)

Editor.displayName = 'Editor'

export default Editor
