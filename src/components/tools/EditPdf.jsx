import { useState, useRef, useCallback, useEffect } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { PDFDocument, rgb } from 'pdf-lib'
import { readFileAsArrayBuffer, downloadBytes } from '@/utils/fileUtils'
import { ChevronLeft, ChevronRight, Type, Image, Trash2, MousePointer, Undo2, Redo2, RotateCcw } from 'lucide-react'

const SCALE = 1.5

export default function EditPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [annotations, setAnnotations] = useState([])
  const [currentText, setCurrentText] = useState('')
  const [textColor, setTextColor] = useState('#000000')
  const [fontSize, setFontSize] = useState(16)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [activeTool, setActiveTool] = useState('text') // 'text' or 'select'
  const [selectedAnnotation, setSelectedAnnotation] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Undo/Redo history
  const historyRef = useRef([[]])
  const historyIndexRef = useRef(0)
  const skipHistoryRef = useRef(false)

  const pushHistory = (newAnnotations) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false
      return
    }
    const newIndex = historyIndexRef.current + 1
    // Trim any redo history beyond current index
    historyRef.current = historyRef.current.slice(0, newIndex)
    historyRef.current.push(newAnnotations)
    historyIndexRef.current = newIndex
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    skipHistoryRef.current = true
    setAnnotations(historyRef.current[historyIndexRef.current])
    setSelectedAnnotation(null)
    setTimeout(() => renderPage(currentPage), 50)
  }

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    skipHistoryRef.current = true
    setAnnotations(historyRef.current[historyIndexRef.current])
    setSelectedAnnotation(null)
    setTimeout(() => renderPage(currentPage), 50)
  }

  const handleReset = () => {
    setAnnotations([])
    pushHistory([])
    setSelectedAnnotation(null)
    setTimeout(() => renderPage(currentPage), 50)
  }

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage])

  const canvasRef = useRef(null)
  const pdfRef = useRef(null)
  const renderingRef = useRef(false)

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfRef.current || !canvasRef.current) return
    if (renderingRef.current) return
    renderingRef.current = true

    try {
      const pdf = pdfRef.current
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: SCALE })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: context, viewport }).promise

      // Redraw annotations for this page
      const pageAnnotations = annotations.filter(a => a.page === pageNum)
      for (const ann of pageAnnotations) {
        drawAnnotation(context, ann)
      }
    } finally {
      renderingRef.current = false
    }
  }, [annotations])

  const drawAnnotation = (context, ann) => {
    context.save()
    context.fillStyle = ann.color
    context.font = `${ann.fontSize}px Arial`
    context.fillText(ann.text, ann.x, ann.y)

    // Draw selection outline if selected
    if (selectedAnnotation !== null && annotations[selectedAnnotation] === ann) {
      const metrics = context.measureText(ann.text)
      context.strokeStyle = '#3b82f6'
      context.lineWidth = 1
      context.setLineDash([3, 3])
      context.strokeRect(ann.x - 2, ann.y - ann.fontSize + 2, metrics.width + 4, ann.fontSize + 4)
      context.setLineDash([])
    }
    context.restore()
  }

  const handleFilesSelected = async (newFiles) => {
    setFiles(newFiles)
    setAnnotations([])
    setCurrentPage(1)
    setSelectedAnnotation(null)
    setStatus('idle')
    // Reset undo/redo history
    historyRef.current = [[]]
    historyIndexRef.current = 0
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const arrayBuffer = await readFileAsArrayBuffer(newFiles[0])
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      pdfRef.current = pdf
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      // Render after state updates
      setTimeout(() => renderPage(1), 100)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return
    setCurrentPage(pageNum)
    setSelectedAnnotation(null)
    setTimeout(() => renderPage(pageNum), 50)
  }

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (activeTool === 'text' && currentText.trim()) {
      const newAnnotation = {
        type: 'text',
        text: currentText,
        x,
        y,
        page: currentPage,
        color: textColor,
        fontSize: fontSize * SCALE,
      }
      setAnnotations(prev => {
        const updated = [...prev, newAnnotation]
        pushHistory(updated)
        // Re-render with new annotation
        setTimeout(() => renderPage(currentPage), 50)
        return updated
      })
    } else if (activeTool === 'select') {
      // Try to find clicked annotation
      const context = canvas.getContext('2d')
      let found = -1
      // Check in reverse order (top-most first)
      for (let i = annotations.length - 1; i >= 0; i--) {
        const ann = annotations[i]
        if (ann.page !== currentPage) continue
        context.font = `${ann.fontSize}px Arial`
        const metrics = context.measureText(ann.text)
        const annLeft = ann.x - 2
        const annTop = ann.y - ann.fontSize + 2
        const annWidth = metrics.width + 4
        const annHeight = ann.fontSize + 4
        if (x >= annLeft && x <= annLeft + annWidth && y >= annTop && y <= annTop + annHeight) {
          found = i
          break
        }
      }
      setSelectedAnnotation(found >= 0 ? found : null)
      setTimeout(() => renderPage(currentPage), 50)
    }
  }

  const handleCanvasMouseDown = (e) => {
    if (activeTool !== 'select' || selectedAnnotation === null) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ann = annotations[selectedAnnotation]
    if (!ann || ann.page !== currentPage) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setIsDragging(true)
    setDragOffset({ x: x - ann.x, y: y - ann.y })
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDragging || selectedAnnotation === null) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setAnnotations(prev => {
      const updated = [...prev]
      updated[selectedAnnotation] = {
        ...updated[selectedAnnotation],
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      }
      return updated
    })
    renderPage(currentPage)
  }

  const handleCanvasMouseUp = () => {
    if (isDragging) {
      // Push to history after drag completes
      pushHistory(annotations)
    }
    setIsDragging(false)
  }

  const deleteSelectedAnnotation = () => {
    if (selectedAnnotation === null) return
    setAnnotations(prev => {
      const updated = prev.filter((_, i) => i !== selectedAnnotation)
      pushHistory(updated)
      return updated
    })
    setSelectedAnnotation(null)
    setTimeout(() => renderPage(currentPage), 50)
  }

  const handleSave = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)
      const arrayBuffer = await readFileAsArrayBuffer(files[0])
      setProgress(40)
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      const font = await pdfDoc.embedFont('Helvetica')
      setProgress(60)

      for (const ann of annotations) {
        const page = pdfDoc.getPages()[ann.page - 1]
        if (!page) continue
        const { height } = page.getSize()
        const pdfX = ann.x / SCALE
        const pdfY = height - (ann.y / SCALE)

        const hex = ann.color.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16) / 255
        const g = parseInt(hex.substring(2, 4), 16) / 255
        const b = parseInt(hex.substring(4, 6), 16) / 255

        page.drawText(ann.text, {
          x: pdfX,
          y: pdfY,
          size: ann.fontSize / SCALE,
          font,
          color: rgb(r, g, b),
        })
      }

      setProgress(90)
      const savedBytes = await pdfDoc.save()
      downloadBytes(savedBytes, 'edited.pdf')
      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const pageAnnotations = annotations.filter(a => a.page === currentPage)

  return (
    <div className="space-y-6">
      <FileUploader
        accept={tool.accept}
        multiple={false}
        onFilesSelected={handleFilesSelected}
        files={files}
        onRemoveFile={() => { setFiles([]); setAnnotations([]); pdfRef.current = null; setStatus('idle') }}
      />

      {files.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Top toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b flex-wrap">
            {/* Tool selection */}
            <div className="flex bg-gray-200 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setActiveTool('text')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${activeTool === 'text' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Type className="w-3.5 h-3.5" /> Teks
              </button>
              <button
                onClick={() => setActiveTool('select')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${activeTool === 'select' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <MousePointer className="w-3.5 h-3.5" /> Pilih
              </button>
            </div>

            {/* Text input */}
            {activeTool === 'text' && (
              <>
                <input
                  type="text"
                  value={currentText}
                  onChange={e => setCurrentText(e.target.value)}
                  placeholder="Ketik teks..."
                  className="border rounded-lg px-3 py-1.5 text-sm w-48"
                />
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">Ukuran:</label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    min={8}
                    max={72}
                    className="border rounded-lg px-2 py-1.5 text-sm w-16"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">Warna:</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={e => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border"
                  />
                </div>
              </>
            )}

            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 mr-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-default"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-default"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-md hover:bg-gray-200"
                title="Hapus semua anotasi"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Delete button */}
            {activeTool === 'select' && selectedAnnotation !== null && (
              <button
                onClick={deleteSelectedAnnotation}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}

            <p className="text-xs text-gray-400 ml-auto">
              {activeTool === 'text' ? 'Klik pada PDF untuk menempatkan teks' : 'Klik anotasi untuk memilih, seret untuk memindahkan'}
            </p>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-white border-b">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i + 1)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                    currentPage === i + 1
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              {totalPages > 10 && <span className="text-xs text-gray-400">...</span>}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 ml-2">
              Halaman {currentPage} / {totalPages}
            </span>
          </div>

          {/* Canvas area */}
          <div className="overflow-auto bg-gray-100 p-4 flex justify-center" style={{ maxHeight: 600 }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className={`shadow-lg rounded bg-white ${activeTool === 'text' ? 'cursor-crosshair' : 'cursor-default'}`}
            />
          </div>

          {/* Annotation list */}
          {pageAnnotations.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t">
              <p className="text-xs text-gray-500 mb-1">Anotasi di halaman ini ({pageAnnotations.length}):</p>
              <div className="flex flex-wrap gap-1">
                {pageAnnotations.map((ann, idx) => {
                  const globalIdx = annotations.indexOf(ann)
                  return (
                    <button
                      key={idx}
                      onClick={() => { setSelectedAnnotation(globalIdx); setActiveTool('select'); setTimeout(() => renderPage(currentPage), 50) }}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        selectedAnnotation === globalIdx
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      "{ann.text.length > 10 ? ann.text.slice(0, 10) + '...' : ann.text}"
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Menyimpan PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleSave}
          disabled={files.length === 0 || status === 'processing'}
          label="Simpan PDF"
        />
      </div>
    </div>
  )
}
