import { useState, useRef, useEffect } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { addWatermark } from '@/utils/pdfUtils'
import { downloadBytes } from '@/utils/fileUtils'
import { Undo2, Redo2, RotateCcw } from 'lucide-react'

const POSITIONS = [
  { value: 'top-left', label: 'Kiri Atas' },
  { value: 'top-center', label: 'Tengah Atas' },
  { value: 'top-right', label: 'Kanan Atas' },
  { value: 'middle-left', label: 'Kiri Tengah' },
  { value: 'center', label: 'Tengah' },
  { value: 'middle-right', label: 'Kanan Tengah' },
  { value: 'bottom-left', label: 'Kiri Bawah' },
  { value: 'bottom-center', label: 'Tengah Bawah' },
  { value: 'bottom-right', label: 'Kanan Bawah' },
]

export default function WatermarkPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [watermarkType, setWatermarkType] = useState('text')
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(0.3)
  const [fontSize, setFontSize] = useState(40)
  const [rotation, setRotation] = useState(-45)
  const [position, setPosition] = useState('center')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageScale, setImageScale] = useState(0.25)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [applyMode, setApplyMode] = useState('all')
  const [selectedPages, setSelectedPages] = useState([])

  // Undo/Redo - tracks all watermark settings
  const defaultSettings = {
    watermarkType: 'text', watermarkText: 'CONFIDENTIAL', opacity: 0.3,
    fontSize: 40, rotation: -45, position: 'center',
    imageScale: 0.25, applyMode: 'all', selectedPages: [],
  }
  const historyRef = useRef([{ ...defaultSettings }])
  const historyIndexRef = useRef(0)

  const pushHistory = (settings) => {
    const newIndex = historyIndexRef.current + 1
    historyRef.current = historyRef.current.slice(0, newIndex)
    historyRef.current.push({ ...settings })
    historyIndexRef.current = newIndex
  }

  const canUndo = historyIndexRef.current > 0
  const canRedo = historyIndexRef.current < historyRef.current.length - 1

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const s = historyRef.current[historyIndexRef.current]
    setWatermarkType(s.watermarkType)
    setWatermarkText(s.watermarkText)
    setOpacity(s.opacity)
    setFontSize(s.fontSize)
    setRotation(s.rotation)
    setPosition(s.position)
    setImageScale(s.imageScale)
    setApplyMode(s.applyMode)
    setSelectedPages(s.selectedPages)
  }

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const s = historyRef.current[historyIndexRef.current]
    setWatermarkType(s.watermarkType)
    setWatermarkText(s.watermarkText)
    setOpacity(s.opacity)
    setFontSize(s.fontSize)
    setRotation(s.rotation)
    setPosition(s.position)
    setImageScale(s.imageScale)
    setApplyMode(s.applyMode)
    setSelectedPages(s.selectedPages)
  }

  const handleReset = () => {
    setWatermarkType(defaultSettings.watermarkType)
    setWatermarkText(defaultSettings.watermarkText)
    setOpacity(defaultSettings.opacity)
    setFontSize(defaultSettings.fontSize)
    setRotation(defaultSettings.rotation)
    setPosition(defaultSettings.position)
    setImageScale(defaultSettings.imageScale)
    setApplyMode('all')
    setSelectedPages(totalPages > 0 ? Array.from({ length: totalPages }, (_, i) => i) : [])
    setImageFile(null)
    setImagePreview(null)
    pushHistory({ ...defaultSettings, selectedPages: totalPages > 0 ? Array.from({ length: totalPages }, (_, i) => i) : [] })
  }

  const getCurrentSettings = () => ({
    watermarkType, watermarkText, opacity, fontSize, rotation, position, imageScale, applyMode, selectedPages,
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setStatus('idle')
    setTotalPages(0)
    setSelectedPages([])
    setApplyMode('all')
    historyRef.current = [{ ...defaultSettings }]
    historyIndexRef.current = 0
  }

  const handlePdfLoaded = (numPages) => {
    setTotalPages(numPages)
    const pages = Array.from({ length: numPages }, (_, i) => i)
    setSelectedPages(pages)
    pushHistory({ ...getCurrentSettings(), selectedPages: pages })
  }

  const togglePage = (pageIndex) => {
    const newPages = selectedPages.includes(pageIndex)
      ? selectedPages.filter(i => i !== pageIndex)
      : [...selectedPages, pageIndex].sort((a, b) => a - b)
    setSelectedPages(newPages)
    pushHistory({ ...getCurrentSettings(), selectedPages: newPages })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleAddWatermark = async () => {
    if (files.length === 0) return
    if (watermarkType === 'text' && !watermarkText.trim()) return
    if (watermarkType === 'image' && !imageFile) return

    try {
      setStatus('processing')
      setProgress(20)

      let watermarks
      if (watermarkType === 'text') {
        watermarks = [{
          type: 'text',
          text: watermarkText,
          fontSize,
          opacity,
          rotation,
          position,
        }]
      } else {
        const arrayBuffer = await imageFile.arrayBuffer()
        const imageBytes = new Uint8Array(arrayBuffer)
        watermarks = [{
          type: 'image',
          imageBytes,
          imageType: imageFile.type,
          opacity,
          scale: imageScale,
          position,
        }]
      }

      const pageIndices = applyMode === 'all'
        ? null
        : selectedPages.length > 0 ? selectedPages : null

      const watermarkedBytes = await addWatermark(files[0], watermarks, pageIndices)
      setProgress(90)
      downloadBytes(watermarkedBytes, 'watermarked.pdf')
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
        onRemoveFile={() => { setFiles([]); setStatus('idle') }}
      />

      {files.length > 0 && (
        <PdfPreview file={files[0]} onPdfLoaded={handlePdfLoaded} />
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          {/* Undo/Redo/Reset bar */}
          <div className="flex items-center justify-end gap-1 pb-2 border-b">
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
              className="p-1.5 rounded-md hover:bg-gray-200"
              title="Reset ke pengaturan awal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Tanda Air</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setWatermarkType('text'); pushHistory({ ...getCurrentSettings(), watermarkType: 'text' }) }}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${watermarkType === 'text' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-medium text-sm">Teks</p>
              </button>
              <button
                onClick={() => { setWatermarkType('image'); pushHistory({ ...getCurrentSettings(), watermarkType: 'image' }) }}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${watermarkType === 'image' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-medium text-sm">Gambar</p>
              </button>
            </div>
          </div>

          {watermarkType === 'text' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teks Tanda Air</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => setWatermarkText(e.target.value)}
                  onBlur={() => pushHistory(getCurrentSettings())}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Masukkan teks tanda air..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ukuran Font: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="80"
                    step="2"
                    value={fontSize}
                    onChange={e => setFontSize(Number(e.target.value))}
                    onPointerUp={() => pushHistory(getCurrentSettings())}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transparansi: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={e => setOpacity(Number(e.target.value))}
                    onPointerUp={() => pushHistory(getCurrentSettings())}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rotasi: {rotation}°
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={rotation}
                  onChange={e => setRotation(Number(e.target.value))}
                  onPointerUp={() => pushHistory(getCurrentSettings())}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Gambar</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                  className="w-full text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {imagePreview && (
                  <div className="mt-2 inline-block">
                    <img src={imagePreview} alt="Preview" className="h-16 rounded border" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ukuran: {Math.round(imageScale * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={imageScale}
                    onChange={e => setImageScale(Number(e.target.value))}
                    onPointerUp={() => pushHistory(getCurrentSettings())}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transparansi: {Math.round(opacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={e => setOpacity(Number(e.target.value))}
                    onPointerUp={() => pushHistory(getCurrentSettings())}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          )}

          {/* Page selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Terapkan ke Halaman</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setApplyMode('all')}
                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${applyMode === 'all' ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                Semua Halaman{totalPages > 0 ? ` (${totalPages})` : ''}
              </button>
              <button
                onClick={() => setApplyMode('selected')}
                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${applyMode === 'selected' ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
              >
                Pilih Halaman
              </button>
            </div>
            {applyMode === 'selected' && totalPages > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{selectedPages.length} / {totalPages} halaman dipilih</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedPages(Array.from({ length: totalPages }, (_, i) => i))}
                      className="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Pilih Semua
                    </button>
                    <button
                      onClick={() => setSelectedPages([])}
                      className="text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => togglePage(i)}
                      className={`px-2 py-2 text-xs rounded border transition-colors ${
                        selectedPages.includes(i)
                          ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Position selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posisi</label>
            <div className="grid grid-cols-3 gap-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos.value}
                  onClick={() => { setPosition(pos.value); pushHistory({ ...getCurrentSettings(), position: pos.value }) }}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                    position === pos.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Menambahkan tanda air..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleAddWatermark}
          disabled={files.length === 0 || status === 'processing' || (watermarkType === 'text' ? !watermarkText.trim() : !imageFile)}
          label="Tambah Tanda Air"
        />
      </div>
    </div>
  )
}
