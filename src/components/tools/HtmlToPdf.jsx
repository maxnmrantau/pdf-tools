import { useState } from 'react'
import DownloadButton from '@/components/common/DownloadButton'
import ProcessingStatus from '@/components/common/ProcessingStatus'
import ProgressBar from '@/components/common/ProgressBar'
import { Globe, Code } from 'lucide-react'

export default function HtmlToPdf({ tool }) {
  const [inputMode, setInputMode] = useState('url') // 'url' or 'html'
  const [url, setUrl] = useState('')
  const [htmlContent, setHtmlContent] = useState('<h1>Judul Dokumen</h1>\n<p>Tulis konten HTML Anda di sini...</p>')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [orientation, setOrientation] = useState('portrait')

  const handleConvert = async () => {
    try {
      setStatus('processing')
      setProgress(10)

      const html2pdf = (await import('html2pdf.js')).default
      setProgress(20)

      let container

      if (inputMode === 'url') {
        if (!url.trim()) {
          setError('Masukkan URL terlebih dahulu')
          setStatus('error')
          return
        }

        setProgress(30)

        // Fetch the URL content via a CORS proxy
        try {
          // Use allorigins CORS proxy to bypass browser restrictions
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url.trim())}`
          const response = await fetch(proxyUrl)
          if (!response.ok) throw new Error(`Gagal mengakses URL (status: ${response.status}). Pastikan URL valid dan dapat diakses.`)
          const html = await response.text()

          setProgress(50)

          // Parse HTML and fix relative URLs
          const parser = new DOMParser()
          const doc = parser.parseFromString(html, 'text/html')

          // Fix relative URLs to absolute
          const baseUrl = new URL(url.trim())
          doc.querySelectorAll('[href]').forEach(el => {
            try { el.setAttribute('href', new URL(el.getAttribute('href'), baseUrl).href) } catch {}
          })
          doc.querySelectorAll('[src]').forEach(el => {
            try { el.setAttribute('src', new URL(el.getAttribute('src'), baseUrl).href) } catch {}
          })

          container = document.createElement('div')
          container.innerHTML = doc.body.innerHTML
          container.style.padding = '0'
          container.style.fontFamily = 'Arial, sans-serif'
          container.style.fontSize = '12pt'
          container.style.lineHeight = '1.6'
          container.style.color = '#000'
          container.style.width = '6.69in'
          document.body.appendChild(container)
        } catch (fetchErr) {
          setError(`Gagal mengambil konten dari URL: ${fetchErr.message}`)
          setStatus('error')
          return
        }
      } else {
        container = document.createElement('div')
        container.innerHTML = htmlContent
        container.style.padding = '0'
        container.style.fontFamily = 'Arial, sans-serif'
        container.style.fontSize = '12pt'
        container.style.lineHeight = '1.6'
        container.style.color = '#000'
        container.style.width = '6.69in'
        document.body.appendChild(container)
      }

      setProgress(60)

      const opt = {
        margin: [0.79, 0.79, 0.79, 0.79],
        filename: 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
          windowHeight: container.scrollHeight + 40,
        },
        jsPDF: { unit: 'in', format: 'a4', orientation },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'li'],
        },
      }

      const pdfBlob = await html2pdf().set(opt).from(container).outputPdf('blob')
      document.body.removeChild(container)
      setProgress(90)

      const blobUrl = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'document.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      setProgress(100)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setError(err.message)
      setStatus('error')
    }
  }

  const canConvert = inputMode === 'url' ? url.trim().length > 0 : htmlContent.trim().length > 0

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 mb-3">Sumber Konten</h3>
        <div className="flex bg-gray-200 rounded-lg p-0.5 mb-4">
          <button
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-1.5 flex-1 px-3 py-2 text-sm rounded-md transition-colors ${inputMode === 'url' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Globe className="w-4 h-4" /> URL Web
          </button>
          <button
            onClick={() => setInputMode('html')}
            className={`flex items-center gap-1.5 flex-1 px-3 py-2 text-sm rounded-md transition-colors ${inputMode === 'html' ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Code className="w-4 h-4" /> Kode HTML
          </button>
        </div>

        {inputMode === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Halaman Web</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="https://example.com"
            />
            <p className="text-xs text-gray-400 mt-1">Masukkan URL halaman web yang ingin dikonversi ke PDF</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode HTML</label>
            <textarea
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              rows={12}
              className="w-full border rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Tulis kode HTML di sini..."
            />
          </div>
        )}
      </div>

      {/* Orientation */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-700 mb-3">Orientasi Halaman</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setOrientation('portrait')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${orientation === 'portrait' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="w-6 h-8 border-2 border-current mx-auto mb-1 rounded-sm"></div>
            <p className="text-sm font-medium">Potret</p>
          </button>
          <button
            onClick={() => setOrientation('landscape')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${orientation === 'landscape' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="w-8 h-6 border-2 border-current mx-auto mb-1 rounded-sm"></div>
            <p className="text-sm font-medium">Lanskap</p>
          </button>
        </div>
      </div>

      {/* Preview for HTML mode */}
      {inputMode === 'html' && htmlContent.trim() && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-gray-700 mb-3">Preview</h3>
          <div
            className="border rounded-lg p-4 min-h-[200px] prose max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      )}

      <ProcessingStatus status={status} error={error} />
      {status === 'processing' && <ProgressBar progress={progress} label="Mengkonversi ke PDF..." />}

      <div className="flex justify-end">
        <DownloadButton
          onClick={handleConvert}
          disabled={!canConvert || status === 'processing'}
          label="Konversi ke PDF"
        />
      </div>
    </div>
  )
}
