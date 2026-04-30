import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { loadPdfDocument, splitPdf } from '@/utils/pdfUtils'
import { downloadBytes } from '@/utils/fileUtils'

export default function SplitPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [selectedPages, setSelectedPages] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = async (newFiles) => {
    setFiles(newFiles)
    setSelectedPages([])
    setStatus('idle')
    try {
      const pdfDoc = await loadPdfDocument(newFiles[0])
      const count = pdfDoc.getPageCount()
      setPageCount(count)
      setSelectedPages(Array.from({ length: count }, (_, i) => i))
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const togglePage = (pageIndex) => {
    setSelectedPages(prev =>
      prev.includes(pageIndex)
        ? prev.filter(p => p !== pageIndex)
        : [...prev, pageIndex].sort((a, b) => a - b)
    )
  }

  const handleSplit = async () => {
    if (selectedPages.length === 0) {
      setError('Pilih minimal 1 halaman')
      setStatus('error')
      return
    }
    try {
      setStatus('processing')
      setProgress(20)
      const splitBytes = await splitPdf(files[0], selectedPages)
      setProgress(90)
      downloadBytes(splitBytes, 'split.pdf')
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
        onRemoveFile={() => { setFiles([]); setPageCount(0); setSelectedPages([]) }}
      />

      {files.length > 0 && (
        <PdfPreview
          file={files[0]}
          selectedPages={selectedPages}
          onTogglePage={togglePage}
        />
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Memisahkan PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleSplit}
          disabled={selectedPages.length === 0 || status === 'processing'}
          label="Pisahkan PDF"
        />
      </div>
    </div>
  )
}
