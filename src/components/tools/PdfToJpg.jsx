import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { readFileAsArrayBuffer, downloadBlob } from '@/utils/fileUtils'
import { Download, FileArchive, CheckSquare, Square } from 'lucide-react'

export default function PdfToJpg({ tool }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [imagePreviews, setImagePreviews] = useState([])
  const [quality, setQuality] = useState('high')
  const [selectedImages, setSelectedImages] = useState([])
  const [downloadStatus, setDownloadStatus] = useState('')

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setImagePreviews([])
    setSelectedImages([])
    setStatus('idle')
    setDownloadStatus('')
  }

  const toggleImage = (index) => {
    setSelectedImages(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index].sort((a, b) => a - b)
    )
  }

  const selectAll = () => {
    setSelectedImages(imagePreviews.map((_, i) => i))
  }

  const selectNone = () => {
    setSelectedImages([])
  }

  const handleConvert = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(10)

      const arrayBuffer = await readFileAsArrayBuffer(files[0])
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setProgress(20)

      const scale = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1
      const images = []

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        await page.render({ canvasContext: context, viewport }).promise

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        images.push(dataUrl)
        setProgress(20 + (i / pdf.numPages) * 60)
      }

      setImagePreviews(images)
      setSelectedImages(images.map((_, i) => i))
      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const dataUrlToBlob = (dataUrl) => {
    const parts = dataUrl.split(',')
    const mime = parts[0].match(/:(.*?);/)[1]
    const binary = atob(parts[1])
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    return new Blob([array], { type: mime })
  }

  const downloadSelected = () => {
    if (selectedImages.length === 0) return
    setDownloadStatus('downloading')
    for (const index of selectedImages) {
      const link = document.createElement('a')
      link.href = imagePreviews[index]
      link.download = `page-${index + 1}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    setDownloadStatus('done')
  }

  const downloadAllAsZip = async () => {
    if (imagePreviews.length === 0) return
    try {
      setDownloadStatus('zipping')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (let i = 0; i < imagePreviews.length; i++) {
        const blob = dataUrlToBlob(imagePreviews[i])
        zip.file(`page-${i + 1}.jpg`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, 'pdf-images.zip')
      setDownloadStatus('done')
    } catch (err) {
      console.error(err)
      setDownloadStatus('error')
    }
  }

  const downloadSelectedAsZip = async () => {
    if (selectedImages.length === 0) return
    try {
      setDownloadStatus('zipping')
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      for (const index of selectedImages) {
        const blob = dataUrlToBlob(imagePreviews[index])
        zip.file(`page-${index + 1}.jpg`, blob)
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(zipBlob, 'pdf-images-selected.zip')
      setDownloadStatus('done')
    } catch (err) {
      console.error(err)
      setDownloadStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <FileUploader
        accept={tool.accept}
        multiple={false}
        onFilesSelected={handleFilesSelected}
        files={files}
        onRemoveFile={() => { setFiles([]); setImagePreviews([]); setSelectedImages([]); setStatus('idle'); setDownloadStatus('') }}
      />

      {files.length > 0 && (
        <PdfPreview file={files[0]} />
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-3">Kualitas Gambar</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'low', label: 'Rendah', desc: '72 DPI' },
              { value: 'medium', label: 'Sedang', desc: '150 DPI' },
              { value: 'high', label: 'Tinggi', desc: '300 DPI' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                className={`p-3 rounded-lg border-2 text-center transition-colors
                  ${quality === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {imagePreviews.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {/* Selection toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedImages.length} / {imagePreviews.length} dipilih
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
                Pilih Semua
              </button>
              <button onClick={selectNone} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
                Hapus Semua
              </button>
            </div>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
            {imagePreviews.map((src, i) => (
              <div
                key={i}
                onClick={() => toggleImage(i)}
                className={`relative cursor-pointer group rounded-lg overflow-hidden border-2 transition-all
                  ${selectedImages.includes(i)
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                  }`}
              >
                <img src={src} alt={`Halaman ${i + 1}`} className="w-full" />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs text-center py-0.5">
                  Halaman {i + 1}
                </div>
                {/* Selection checkbox */}
                <div className="absolute top-1.5 left-1.5">
                  {selectedImages.includes(i) ? (
                    <CheckSquare className="w-5 h-5 text-primary-500 fill-primary-200" />
                  ) : (
                    <Square className="w-5 h-5 text-white/80" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Download options */}
          <div className="px-4 py-3 bg-gray-50 border-t">
            <p className="text-xs text-gray-500 mb-2">Opsi Download:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={downloadAllAsZip}
                disabled={imagePreviews.length === 0 || downloadStatus === 'zipping'}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
              >
                <FileArchive className="w-4 h-4" />
                Download Semua (ZIP)
              </button>
              <button
                onClick={downloadSelectedAsZip}
                disabled={selectedImages.length === 0 || downloadStatus === 'zipping'}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 transition-colors"
              >
                <FileArchive className="w-4 h-4" />
                Download Terpilih (ZIP) ({selectedImages.length})
              </button>
              <button
                onClick={downloadSelected}
                disabled={selectedImages.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Terpilih (JPG)
              </button>
            </div>
            {downloadStatus === 'zipping' && (
              <p className="text-xs text-primary-600 mt-2 animate-pulse">Membuat file ZIP...</p>
            )}
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengkonversi PDF ke JPG..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleConvert}
          disabled={files.length === 0 || status === 'processing'}
          label="Konversi ke JPG"
        />
      </div>
    </div>
  )
}
