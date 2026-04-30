import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'

export default function PdfPreview({ file, selectedPages = [], onTogglePage, onPageClick, onPdfLoaded, maxHeight = 500 }) {
  const [thumbnails, setThumbnails] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'single'
  const fullCanvasRef = useRef(null)
  const pdfRef = useRef(null)

  useEffect(() => {
    if (!file) return
    loadPdf()
  }, [file])

  const loadPdf = async () => {
    try {
      setLoading(true)
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      pdfRef.current = pdf
      setTotalPages(pdf.numPages)

      // Notify parent of page count
      if (onPdfLoaded) onPdfLoaded(pdf.numPages)

      // Generate thumbnails
      const thumbs = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.4 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        await page.render({ canvasContext: context, viewport }).promise
        thumbs.push(canvas.toDataURL())
      }
      setThumbnails(thumbs)
      setLoading(false)

      // Render first page in full
      if (pdf.numPages > 0) {
        renderFullPage(1, 1)
      }
    } catch (err) {
      console.error('PDF preview error:', err)
      setLoading(false)
    }
  }

  const renderFullPage = async (pageNum) => {
    if (!pdfRef.current || !fullCanvasRef.current) return
    const page = await pdfRef.current.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = fullCanvasRef.current
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: context, viewport }).promise
  }

  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return
    setCurrentPage(pageNum)
    if (viewMode === 'single') {
      renderFullPage(pageNum)
    }
  }

  const handleThumbnailClick = (pageIndex) => {
    setCurrentPage(pageIndex + 1)
    if (onTogglePage) {
      onTogglePage(pageIndex)
    } else if (onPageClick) {
      onPageClick(pageIndex)
    }
  }

  if (!file) return null

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-gray-500 text-sm">Memuat preview PDF...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {totalPages} halaman
          </span>
          {selectedPages.length > 0 && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
              {selectedPages.length} dipilih
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex bg-gray-200 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Grid
            </button>
            <button
              onClick={() => { setViewMode('single'); renderFullPage(currentPage) }}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${viewMode === 'single' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Single
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto" style={{ maxHeight }}>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-4">
            {thumbnails.map((src, index) => (
              <div
                key={index}
                onClick={() => handleThumbnailClick(index)}
                className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all
                  ${selectedPages.length > 0
                    ? selectedPages.includes(index)
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                    : 'border-gray-200 hover:border-primary-400 hover:shadow-md'
                  }`}
              >
                <img src={src} alt={`Halaman ${index + 1}`} className="w-full" />
                {/* Page number badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                  {index + 1}
                </div>
                {/* Selected checkmark */}
                {selectedPages.includes(index) && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary-500/0 group-hover:bg-primary-500/10 transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex p-4 gap-4">
            {/* Thumbnail sidebar for navigation & selection */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[460px] w-24 flex-shrink-0 pr-1">
              {thumbnails.map((src, index) => (
                <div
                  key={index}
                  onClick={() => goToPage(index + 1)}
                  className={`relative cursor-pointer rounded overflow-hidden border-2 transition-all flex-shrink-0
                    ${currentPage === index + 1 ? 'border-primary-500 ring-1 ring-primary-300' : 'border-gray-200 hover:border-gray-300'}
                    ${selectedPages.length > 0 && !selectedPages.includes(index) ? 'opacity-50' : ''}
                    ${selectedPages.length > 0 && selectedPages.includes(index) ? 'border-primary-400' : ''}
                  `}
                >
                  <img src={src} alt={`Halaman ${index + 1}`} className="w-full" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-px">
                    {index + 1}
                  </div>
                  {selectedPages.includes(index) && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Main canvas area */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div className="relative">
                <canvas ref={fullCanvasRef} className="max-w-full shadow-lg rounded" />
                {/* Selected indicator overlay on canvas */}
                {selectedPages.length > 0 && (
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    selectedPages.includes(currentPage - 1)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-500/70 text-white'
                  }`}>
                    {selectedPages.includes(currentPage - 1) ? '✓ Terpilih' : 'Tidak dipilih'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600">
                  Halaman {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Select/deselect current page button */}
                {onTogglePage && (
                  <button
                    onClick={() => onTogglePage(currentPage - 1)}
                    className={`ml-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      selectedPages.includes(currentPage - 1)
                        ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {selectedPages.includes(currentPage - 1) ? '✓ Batal Pilih' : '+ Pilih Halaman Ini'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick select footer */}
      {onTogglePage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-t">
          <span className="text-xs text-gray-500">Pilih:</span>
          <button
            onClick={() => { for (let i = 0; i < totalPages; i++) if (!selectedPages.includes(i)) onTogglePage(i) }}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >Semua</button>
          <button
            onClick={() => { for (let i = 0; i < totalPages; i++) if (selectedPages.includes(i)) onTogglePage(i) }}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >Tidak Ada</button>
          <button
            onClick={() => { for (let i = 0; i < totalPages; i++) onTogglePage(i) }}
            className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >Balik</button>
          <span className="text-xs text-gray-400 ml-auto">
            Klik halaman untuk memilih/membatalkan
          </span>
        </div>
      )}
    </div>
  )
}
