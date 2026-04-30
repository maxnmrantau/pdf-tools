import { useState } from 'react'
import FileUploader from '@/components/common/FileUploader'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import PdfPreview from '@/components/common/PdfPreview'
import { readFileAsArrayBuffer } from '@/utils/fileUtils'
import { downloadBlob } from '@/utils/fileUtils'

export default function OcrPdf({ tool }) {
  const [files, setFiles] = useState([])
  const [extractedText, setExtractedText] = useState('')
  const [language, setLanguage] = useState('ind')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const handleFilesSelected = (newFiles) => {
    setFiles(newFiles)
    setExtractedText('')
    setStatus('idle')
  }

  const handleOcr = async () => {
    if (files.length === 0) return
    try {
      setStatus('processing')
      setProgress(10)

      const arrayBuffer = await readFileAsArrayBuffer(files[0])
      setProgress(20)

      // Render PDF pages to canvas first
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setProgress(30)

      // Initialize Tesseract
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(30 + m.progress * 60)
          }
        },
      })
      setProgress(40)

      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        await page.render({ canvasContext: context, viewport }).promise

        const { data: { text } } = await worker.recognize(canvas)
        fullText += `--- Halaman ${i} ---\n${text}\n\n`
      }

      await worker.terminate()
      setExtractedText(fullText)
      setProgress(95)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const handleDownloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, 'extracted-text.txt')
  }

  return (
    <div className="space-y-6">
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm text-sky-700">
        🔍 OCR memproses gambar untuk mengenali teks. Proses ini bisa memakan waktu 
        tergantung jumlah halaman dan kompleksitas dokumen.
      </div>

      <FileUploader
        accept={tool.accept}
        multiple={false}
        onFilesSelected={handleFilesSelected}
        files={files}
        onRemoveFile={() => { setFiles([]); setExtractedText(''); setStatus('idle') }}
      />

      {files.length > 0 && (
        <PdfPreview file={files[0]} />
      )}

      {files.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Bahasa OCR</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full"
          >
            <option value="ind">Indonesia</option>
            <option value="eng">English</option>
            <option value="jpn">Japanese</option>
            <option value="chi_sim">Chinese (Simplified)</option>
            <option value="chi_tra">Chinese (Traditional)</option>
            <option value="kor">Korean</option>
            <option value="ara">Arabic</option>
          </select>
        </div>
      )}

      {extractedText && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-2">Teks yang Diekstrak</h3>
          <textarea
            value={extractedText}
            onChange={e => setExtractedText(e.target.value)}
            rows={10}
            className="w-full border rounded-lg p-3 font-mono text-sm"
          />
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Menjalankan OCR..." />}

      <div className="flex justify-end gap-3">
        {extractedText && (
          <DownloadButton onClick={handleDownloadText} label="Unduh Teks" />
        )}
        <DownloadButton
          onClick={handleOcr}
          disabled={files.length === 0 || status === 'processing'}
          label="Jalankan OCR"
        />
      </div>
    </div>
  )
}
