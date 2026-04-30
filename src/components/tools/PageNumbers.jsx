import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { addPageNumbers } from '@/utils/pdfUtils'
import { downloadBytes } from '@/utils/fileUtils'

export default function PageNumbers({ tool }) {
  const [files, setFiles] = useState([])
  const [position, setPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(12)
  const [startFrom, setStartFrom] = useState(1)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setStatus('idle')
  }

  const handleAddPageNumbers = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)
      const resultBytes = await addPageNumbers(files[0], { position, fontSize, startFrom })
      setProgress(90)
      downloadBytes(resultBytes, 'numbered.pdf')
      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const positionOptions = [
    { value: 'bottom-center', label: 'Bawah Tengah' },
    { value: 'bottom-right', label: 'Bawah Kanan' },
    { value: 'bottom-left', label: 'Bawah Kiri' },
    { value: 'top-center', label: 'Atas Tengah' },
    { value: 'top-right', label: 'Atas Kanan' },
    { value: 'top-left', label: 'Atas Kiri' },
  ]

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
        <PdfPreview file={files[0]} />
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posisi Nomor</label>
            <div className="grid grid-cols-3 gap-2">
              {positionOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPosition(opt.value)}
                  className={`p-2 rounded-lg border-2 text-center text-sm transition-colors
                    ${position === opt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Font: {fontSize}px</label>
              <input
                type="range"
                min="8"
                max="24"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai dari halaman</label>
              <input
                type="number"
                min="1"
                value={startFrom}
                onChange={e => setStartFrom(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Menambahkan nomor halaman..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleAddPageNumbers}
          disabled={files.length === 0 || status === 'processing'}
          label="Tambah Nomor Halaman"
        />
      </div>
    </div>
  )
}
