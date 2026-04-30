import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBytes } from '@/utils/fileUtils'

export default function WordToPdf({ tool }) {
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

      // Convert Word to HTML using mammoth
      const mammoth = await import('mammoth')
      const result = await mammoth.convertToHtml({ arrayBuffer })
      setProgress(50)

      // Convert HTML to PDF using html2pdf.js
      const html2pdf = (await import('html2pdf.js')).default
      setProgress(60)

      // Create a temporary container
      const container = document.createElement('div')
      container.innerHTML = result.value
      container.style.padding = '0 0 40px 0'
      container.style.fontFamily = 'Arial, sans-serif'
      container.style.fontSize = '12pt'
      container.style.lineHeight = '1.6'
      container.style.color = '#000'
      // Set fixed width matching A4 width (minus margins)
      container.style.width = '6.69in' // A4 width (8.27in) - 2*0.79in margins
      document.body.appendChild(container)

      const opt = {
        margin: [0.79, 0.79, 0.79, 0.79], // top, right, bottom, left in inches
        filename: 'converted.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          windowHeight: container.scrollHeight + 40,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break',
          after: '.after-break',
          avoid: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'li'],
        },
      }

      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob')
      document.body.removeChild(container)
      setProgress(90)

      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'converted.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

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

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengkonversi Word ke PDF..." />}

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
