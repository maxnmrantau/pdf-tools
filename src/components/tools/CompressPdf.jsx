import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { PDFDocument } from 'pdf-lib'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBytes, formatFileSize } from '@/utils/fileUtils'

export default function CompressPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [quality, setQuality] = useState('medium')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [originalSize, setOriginalSize] = useState(0)
  const [compressedSize, setCompressedSize] = useState(0)

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setOriginalSize(newFiles[0].size)
    setStatus('idle')
  }

  const handleCompress = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(20)
      
      const arrayBuffer = await readFileAsArrayBuffer(files[0])
      setProgress(40)
      
      // Load and re-save the PDF - this removes unused objects
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
      setProgress(60)

      // Remove metadata to reduce size
      if (quality === 'high') {
        pdfDoc.setTitle('')
        pdfDoc.setAuthor('')
        pdfDoc.setSubject('')
        pdfDoc.setKeywords([])
        pdfDoc.setProducer('')
        pdfDoc.setCreator('')
      }

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      })
      setProgress(90)

      setCompressedSize(compressedBytes.length)
      downloadBytes(compressedBytes, 'compressed.pdf')
      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const savings = originalSize > 0 && compressedSize > 0
    ? Math.round((1 - compressedSize / originalSize) * 100)
    : 0

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
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-3">Tingkat Kompresi</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'low', label: 'Rendah', desc: 'Kompresi ringan, kualitas tinggi' },
              { value: 'medium', label: 'Sedang', desc: 'Keseimbangan ukuran & kualitas' },
              { value: 'high', label: 'Tinggi', desc: 'Kompresi maksimal, hapus metadata' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors
                  ${quality === opt.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {status === 'done' && compressedSize > 0 && (
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-green-700 font-medium">Kompresi berhasil!</p>
          <p className="text-sm text-green-600 mt-1">
            Asli: {formatFileSize(originalSize)} → Terkompresi: {formatFileSize(compressedSize)}
            {savings > 0 && ` (hemat ${savings}%)`}
          </p>
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengompres PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleCompress}
          disabled={files.length === 0 || status === 'processing'}
          label="Kompres PDF"
        />
      </div>
    </div>
  )
}
