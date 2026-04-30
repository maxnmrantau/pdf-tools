import { useState, useRef, useEffect } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { loadPdfDocument, rotatePdf } from '@/utils/pdfUtils'
import { downloadBytes } from '@/utils/fileUtils'
import { Undo2, Redo2, RotateCcw } from 'lucide-react'

export default function RotatePdf({ tool }) {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [pageRotations, setPageRotations] = useState({})
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Undo/Redo
  const historyRef = useRef([{}])
  const historyIndexRef = useRef(0)

  const pushHistory = (newRotations) => {
    const newIndex = historyIndexRef.current + 1
    historyRef.current = historyRef.current.slice(0, newIndex)
    historyRef.current.push({ ...newRotations })
    historyIndexRef.current = newIndex
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    setPageRotations({ ...historyRef.current[historyIndexRef.current] })
  }

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    setPageRotations({ ...historyRef.current[historyIndexRef.current] })
  }

  const handleReset = () => {
    setPageRotations({})
    pushHistory({})
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
    setPageRotations({})
    setStatus('idle')
    historyRef.current = [{}]
    historyIndexRef.current = 0
    try {
      const pdfDoc = await loadPdfDocument(newFiles[0])
      const count = pdfDoc.getPageCount()
      setPageCount(count)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const rotatePage = (pageIndex, angle) => {
    const newRotations = {
      ...pageRotations,
      [pageIndex]: ((pageRotations[pageIndex] || 0) + angle) % 360,
    }
    setPageRotations(newRotations)
    pushHistory(newRotations)
  }

  const rotateAll = (angle) => {
    const newRotations = {}
    for (let i = 0; i < pageCount; i++) {
      newRotations[i] = ((pageRotations[i] || 0) + angle) % 360
    }
    setPageRotations(newRotations)
    pushHistory(newRotations)
  }

  const handleRotate = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)

      const rotations = Object.entries(pageRotations)
        .filter(([_, angle]) => angle !== 0)
        .map(([pageIndex, angle]) => ({ pageIndex: Number(pageIndex), angle }))

      if (rotations.length === 0) {
        const allRotations = Array.from({ length: pageCount }, (_, i) => ({ pageIndex: i, angle: 90 }))
        const rotatedBytes = await rotatePdf(files[0], allRotations)
        setProgress(90)
        downloadBytes(rotatedBytes, 'rotated.pdf')
      } else {
        const rotatedBytes = await rotatePdf(files[0], rotations)
        setProgress(90)
        downloadBytes(rotatedBytes, 'rotated.pdf')
      }

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
        onRemoveFile={() => { setFiles([]); setPageCount(0); setPageRotations({}); setStatus('idle') }}
      />

      {files.length > 0 && (
        <>
          <PdfPreview file={files[0]} />
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Rotasi per halaman</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => rotateAll(90)} className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200">
                  Putar Semua 90°
                </button>
                <button onClick={() => rotateAll(180)} className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200">
                  Putar Semua 180°
                </button>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30" title="Undo (Ctrl+Z)">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30" title="Redo (Ctrl+Y)">
                  <Redo2 className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="p-1.5 rounded-md hover:bg-gray-200" title="Reset semua rotasi">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Array.from({ length: pageCount }, (_, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600 mb-1 transition-transform"
                    style={{ transform: `rotate(${pageRotations[i] || 0}deg)` }}
                  >
                    {i + 1}
                    {pageRotations[i] ? <span className="text-[10px] text-primary-500 ml-0.5">{pageRotations[i]}°</span> : null}
                  </div>
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => rotatePage(i, 90)}
                      className="text-xs px-1.5 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                      title="Putar 90°"
                    >↻</button>
                    <button
                      onClick={() => rotatePage(i, -90)}
                      className="text-xs px-1.5 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                      title="Putar -90°"
                    >↺</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Memutar halaman..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleRotate}
          disabled={files.length === 0 || status === 'processing'}
          label="Rotasi PDF"
        />
      </div>
    </div>
  )
}
