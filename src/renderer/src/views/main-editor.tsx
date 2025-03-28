import { useRef } from 'react'
import Editor from '../components/text-editor'

const App = () => {
  const quillRef = useRef<any>(null)

  return (
    <div className="h-full w-full">
      <Editor ref={quillRef} />
    </div>
  )
}

export default App
