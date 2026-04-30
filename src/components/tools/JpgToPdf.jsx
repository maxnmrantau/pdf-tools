import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { imagesToPdf } from '@/utils/pdfUtils'
import { downloadBytes, readFileAsDataURL } from '@/utils/fileUtils'

export default function JpgToPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const [orientation, setOrientation] = useState('auto')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = async (newFiles) => {
    setFiles(prev => [...prev, ...newFiles])
    const newPreviews = await Promise.all(newFiles.map(f => readFileAsDataURL(f)))
    setPreviews(prev => [...prev, ...newPreviews])
    setStatus('idle')
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleMoveFile = (index, direction) => {
    const newFiles = [...files]
    const newPreviews = [...previews]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newFiles.length) return
    ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
    ;[newPreviews[index], newPreviews[targetIndex]] = [newPreviews[targetIndex], newPreviews[index]]
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleConvert = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)
      const pdfBytes = await imagesToPdf(files)
      setProgress(90)
      downloadBytes(pdfBytes, 'images.pdf')
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
        multiple={tool.multiple}
        onFilesSelected={handleFilesSelected}
        files={files}
        onRemoveFile={handleRemoveFile}
      />

      {previews.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-3">Urutan Gambar</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((src, index) => (
              <div key={index} className="relative group">
                <img src={src} alt={`Gambar ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveFile(index, -1)}
                    className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded"
                  >←</button>
                  <button
                    onClick={() => handleMoveFile(index, 1)}
                    className="bg-black/60 text-white text-xs px-1.5 py-0.5 rounded"
                  >→</button>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="bg-red-600/80 text-white text-xs px-1.5 py-0.5 rounded"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengkonversi gambar ke PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleConvert}
          disabled={files.length === 0 || status === 'processing'}
          label="Konversi ke PDF"
        />
      </div>
    </div>
  )
}
