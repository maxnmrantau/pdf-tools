import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="tool-gradient p-2 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">PDF Tools</span>
          </Link>
          <div className="text-sm text-gray-500 hidden sm:block">
            Semua diproses di browser Anda • Privat & Aman
          </div>
        </div>
      </div>
    </header>
  )
}
