import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { mergePdfs } from '@/utils/pdfUtils'
import { downloadBytes } from '@/utils/fileUtils'

export default function MergePdf({ tool }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = (newFiles) => {
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleMoveFile = (index, direction) => {
    const newFiles = [...files]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newFiles.length) return
    ;[newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]]
    setFiles(newFiles)
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Pilih minimal 2 file PDF untuk digabungkan')
      setStatus('error')
      return
    }
    try {
      setStatus('processing')
      setProgress(10)
      const mergedBytes = await mergePdfs(files)
      setProgress(90)
      downloadBytes(mergedBytes, 'merged.pdf')
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

      {files.length > 1 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-3">Urutan File (geser untuk mengubah):</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                <button
                  onClick={() => handleMoveFile(index, -1)}
                  disabled={index === 0}
                  className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-30 hover:bg-gray-300"
                >↑</button>
                <button
                  onClick={() => handleMoveFile(index, 1)}
                  disabled={index === files.length - 1}
                  className="px-2 py-1 text-xs bg-gray-200 rounded disabled:opacity-30 hover:bg-gray-300"
                >↓</button>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />

      {status === 'processing' && <ProgressBar progress={progress} label="Menggabungkan PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleMerge}
          disabled={files.length < 2 || status === 'processing'}
          label="Gabungkan PDF"
        />
      </div>
    </div>
  )
}
