import { useState, useRef, useEffect } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { loadPdfDocument, reorderPages } from '@/utils/pdfUtils'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBytes } from '@/utils/fileUtils'
import { Undo2, Redo2, RotateCcw } from 'lucide-react'

export default function OrganizePdf({ tool }) {
  const [files, setFiles] = useState([])
  const [pageOrder, setPageOrder] = useState([])
  const [thumbnails, setThumbnails] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const pageOrderRef = useRef([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Undo/Redo
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const initialOrderRef = useRef([])

  const pushHistory = (newOrder) => {
    const newIndex = historyIndexRef.current + 1
    historyRef.current = historyRef.current.slice(0, newIndex)
    historyRef.current.push([...newOrder])
    historyIndexRef.current = newIndex
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    setPageOrder([...historyRef.current[historyIndexRef.current]])
  }

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    setPageOrder([...historyRef.current[historyIndexRef.current]])
  }

  const handleReset = () => {
    if (initialOrderRef.current.length === 0) return
    setPageOrder([...initialOrderRef.current])
    pushHistory(initialOrderRef.current)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleFilesSelected = async (newFiles) => {
    setFiles(newFiles)
    setStatus('idle')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const arrayBuffer = await readFileAsArrayBuffer(newFiles[0])
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      const order = Array.from({ length: pdf.numPages }, (_, i) => i)
      setPageOrder(order)
      initialOrderRef.current = [...order]
      historyRef.current = [[...order]]
      historyIndexRef.current = 0

      // Generate thumbnails
      const thumbs = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        await page.render({ canvasContext: context, viewport }).promise
        thumbs.push(canvas.toDataURL())
      }
      setThumbnails(thumbs)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const handleDragStart = (index) => {
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    const newOrder = [...pageOrder]
    const item = newOrder.splice(dragIndex, 1)[0]
    newOrder.splice(index, 0, item)
    setPageOrder(newOrder)
    pageOrderRef.current = newOrder
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    if (dragIndex !== null) pushHistory(pageOrderRef.current)
    setDragIndex(null)
  }

  const handleRemovePage = (index) => {
    const newOrder = pageOrder.filter((_, i) => i !== index)
    setPageOrder(newOrder)
    pushHistory(newOrder)
  }

  const handleReorder = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)
      const reorderedBytes = await reorderPages(files[0], pageOrder)
      setProgress(90)
      downloadBytes(reorderedBytes, 'organized.pdf')
      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <FileUploader
        accept={tool.accept}
        multiple={false}
        onFilesSelected={handleFilesSelected}
        files={files}
        onRemoveFile={() => { setFiles([]); setPageOrder([]); setThumbnails([]); setStatus('idle') }}
      />

      {pageOrder.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">
              Seret halaman untuk mengatur urutan ({pageOrder.length} halaman)
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30"
                title="Reset ke urutan awal"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {pageOrder.map((pageIndex, displayIndex) => (
              <div
                key={`${pageIndex}-${displayIndex}`}
                draggable
                onDragStart={() => handleDragStart(displayIndex)}
                onDragOver={(e) => handleDragOver(e, displayIndex)}
                onDragEnd={handleDragEnd}
                className={`relative cursor-grab active:cursor-grabbing group
                  ${dragIndex === displayIndex ? 'opacity-50 scale-95' : ''}
                  border-2 rounded-lg overflow-hidden transition-all hover:border-primary-400
                  ${dragIndex !== null && dragIndex !== displayIndex ? 'border-primary-300' : 'border-gray-200'}`}
              >
                {thumbnails[pageIndex] && (
                  <img src={thumbnails[pageIndex]} alt={`Halaman ${pageIndex + 1}`} className="w-full" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                  Hal. {pageIndex + 1}
                </div>
                <div className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-bl">
                  #{displayIndex + 1}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemovePage(displayIndex) }}
                  className="absolute top-0 left-0 bg-red-600/80 text-white text-xs px-1 py-0.5 rounded-br opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengatur ulang halaman..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleReorder}
          disabled={files.length === 0 || pageOrder.length === 0 || status === 'processing'}
          label="Urutkan Ulang"
        />
      </div>
    </div>
  )
}
