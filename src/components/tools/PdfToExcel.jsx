import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBlob } from '@/utils/fileUtils'

export default function PdfToExcel({ tool }) {
  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setStatus('idle')
  }

  const handleConvert = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(10)

      const arrayBuffer = await readFileAsArrayBuffer(files[0])
      setProgress(20)

      // Extract text from PDF
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setProgress(40)

      const pageData = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // Group text items by Y position to form rows
        const items = textContent.items.map(item => ({
          text: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
        })).filter(item => item.text)

        // Cluster by Y position (rows)
        const rows = {}
        items.forEach(item => {
          const rowKey = Math.round(item.y / 5) * 5 // group within 5px
          if (!rows[rowKey]) rows[rowKey] = []
          rows[rowKey].push(item)
        })

        // Sort rows by Y (descending, PDF coords) and sort items within row by X
        const sortedRows = Object.values(rows)
          .sort((a, b) => b[0].y - a[0].y)
          .map(row => row.sort((a, b) => a.x - b.x).map(item => item.text))

        pageData.push({ page: i, rows: sortedRows })
        setProgress(40 + (i / pdf.numPages) * 30)
      }

      // Generate Excel file
      const XLSX = await import('xlsx')
      setProgress(80)

      const wb = XLSX.utils.book_new()
      for (const pd of pageData) {
        const ws = XLSX.utils.aoa_to_sheet(pd.rows)
        XLSX.utils.book_append_sheet(wb, ws, `Halaman ${pd.page}`)
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      setProgress(95)
      downloadBlob(blob, 'converted.xlsx')
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        💡 Ekstraksi tabel dari PDF kompleks mungkin tidak 100% akurat. 
        Hasil terbaik untuk PDF dengan struktur tabel yang jelas.
      </div>

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

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengekstrak tabel ke Excel..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleConvert}
          disabled={files.length === 0 || status === 'processing'}
          label="Konversi ke Excel"
        />
      </div>
    </div>
  )
}
