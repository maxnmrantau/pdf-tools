import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBlob } from '@/utils/fileUtils'

export default function PdfToWord({ tool }) {
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
      setProgress(30)

      // Use pdfjs-dist to extract text
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setProgress(50)

      const allPages = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()

        // Build lines using hasEOL property from pdfjs-dist
        let currentLine = ''
        const lines = []

        for (const item of textContent.items) {
          currentLine += item.str
          if (item.hasEOL) {
            lines.push(currentLine)
            currentLine = ''
          }
        }
        // Push remaining text
        if (currentLine.trim()) {
          lines.push(currentLine)
        }

        allPages.push(lines)
        setProgress(50 + (i / pdf.numPages) * 30)
      }

      // Generate DOCX using docx library
      const { Document, Packer, Paragraph, TextRun, PageBreak } = await import('docx')
      setProgress(85)

      const sections = []
      for (let p = 0; p < allPages.length; p++) {
        const lines = allPages[p]
        const children = []

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.length === 0) {
            // Empty line = paragraph break
            children.push(new Paragraph({ children: [] }))
          } else {
            children.push(new Paragraph({
              children: [new TextRun({ text: trimmed })],
              spacing: { after: 120 },
            }))
          }
        }

        // Ensure at least one paragraph per page
        if (children.length === 0) {
          children.push(new Paragraph({ children: [] }))
        }

        sections.push({
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch = 1440 twips
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children,
        })
      }

      const doc = new Document({
        sections,
      })

      const blob = await Packer.toBlob(doc)
      setProgress(95)
      downloadBlob(blob, 'converted.docx')
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
        <PdfPreview file={files[0]} />
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengkonversi PDF ke Word..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleConvert}
          disabled={files.length === 0 || status === 'processing'}
          label="Konversi ke Word"
        />
      </div>
    </div>
  )
}
