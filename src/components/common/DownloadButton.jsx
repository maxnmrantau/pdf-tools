import { Download } from 'lucide-react'

export default function DownloadButton({ onClick, disabled = false, label = 'Unduh Hasil' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-5 h-5" />
      {label}
    </button>
  )
}
