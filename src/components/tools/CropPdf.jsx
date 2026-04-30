import { useState, useRef, useEffect } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { cropPdf } from '@/utils/pdfUtils'
import { PDFDocument } from 'pdf-lib'
import { readFileAsArrayBuffer, downloadBytes } from '@/utils/fileUtils'

export default function CropPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [cropRect, setCropRect] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState(null)
  const [margins, setMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 })
  const canvasRef = useRef(null)
  const pdfRef = useRef(null)

  const handleFilesSelected = async (newFiles) => {
    setFiles(newFiles)
    setCurrentPage(1)
    setCropRect(null)
    setStatus('idle')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const arrayBuffer = await readFileAsArrayBuffer(newFiles[0])
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      pdfRef.current = pdf
      setTotalPages(pdf.numPages)
      renderPage(1)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const renderPage = async (pageNum) => {
    if (!pdfRef.current) return
    const page = await pdfRef.current.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width
    await page.render({ canvasContext: context, viewport }).promise
  }

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    setIsDrawing(true)
    setStartPos({ x, y })
    setCropRect(null)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    setCropRect({
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      width: Math.abs(x - startPos.x),
      height: Math.abs(y - startPos.y),
    })
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleCrop = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)

      if (cropRect) {
        // Crop using selection
        const scale = 1.5
        const cropAreas = [{
          pageIndex: currentPage - 1,
          x: cropRect.x / scale,
          y: cropRect.y / scale,
          width: cropRect.width / scale,
          height: cropRect.height / scale,
        }]
        const croppedBytes = await cropPdf(files[0], cropAreas)
        setProgress(90)
        downloadBytes(croppedBytes, 'cropped.pdf')
      } else if (margins.top || margins.bottom || margins.left || margins.right) {
        // Crop using margins
        const arrayBuffer = await readFileAsArrayBuffer(files[0])
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
        const pages = pdfDoc.getPages()
        
        for (const page of pages) {
          const { width, height } = page.getSize()
          const x = margins.left
          const y = margins.bottom
          const w = width - margins.left - margins.right
          const h = height - margins.top - margins.bottom
          page.setCropBox(x, y, w, h)
          page.setMediaBox(x, y, w, h)
        }
        
        const savedBytes = await pdfDoc.save()
        setProgress(90)
        downloadBytes(savedBytes, 'cropped.pdf')
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
        onRemoveFile={() => { setFiles([]); setCropRect(null); setStatus('idle') }}
      />

      {files.length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex gap-4 items-center">
            <h3 className="font-medium text-gray-700">Mode Potong:</h3>
            <span className="text-sm text-gray-500">Seret pada PDF atau atur margin</span>
          </div>

          {/* Margin controls */}
          <div className="grid grid-cols-4 gap-3">
            {['top', 'bottom', 'left', 'right'].map(side => (
              <div key={side}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{side === 'top' ? 'Atas' : side === 'bottom' ? 'Bawah' : side === 'left' ? 'Kiri' : 'Kanan'} (pt)</label>
                <input
                  type="number"
                  min="0"
                  value={margins[side]}
                  onChange={e => setMargins(prev => ({ ...prev, [side]: Number(e.target.value) }))}
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Page navigation */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); renderPage(currentPage - 1) }} disabled={currentPage <= 1} className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-30">←</button>
              <span className="text-sm text-gray-600">Halaman {currentPage} / {totalPages}</span>
              <button onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); renderPage(currentPage + 1) }} disabled={currentPage >= totalPages} className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-30">→</button>
            </div>
          )}

          {/* Canvas */}
          <div className="overflow-auto border rounded-lg bg-gray-50 flex justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="cursor-crosshair max-w-full"
              style={cropRect ? {
                clipPath: `inset(${cropRect.y}px ${canvasRef.current?.width - cropRect.x - cropRect.width}px ${canvasRef.current?.height - cropRect.y - cropRect.height}px ${cropRect.x}px)`,
              } : {}}
            />
            {cropRect && (
              <div
                className="absolute border-2 border-dashed border-primary-500 bg-primary-500/10 pointer-events-none"
                style={{
                  left: cropRect.x,
                  top: cropRect.y,
                  width: cropRect.width,
                  height: cropRect.height,
                }}
              />
            )}
          </div>
          <p className="text-xs text-gray-400">Seret pada PDF untuk memilih area yang ingin dipotong</p>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Memotong PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleCrop}
          disabled={files.length === 0 || status === 'processing'}
          label="Potong PDF"
        />
      </div>
    </div>
  )
}
