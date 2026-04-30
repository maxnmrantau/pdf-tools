import { useParams, Link } from 'react-router-dom'
import { getToolById } from '@/config/tools'
import { ArrowLeft } from 'lucide-react'
import MergePdf from '@/components/tools/MergePdf'
import SplitPdf from '@/components/tools/SplitPdf'
import CompressPdf from '@/components/tools/CompressPdf'
import PdfToWord from '@/components/tools/PdfToWord'
import WordToPdf from '@/components/tools/WordToPdf'
import EditPdf from '@/components/tools/EditPdf'
import PdfToJpg from '@/components/tools/PdfToJpg'
import WatermarkPdf from '@/components/tools/WatermarkPdf'
import RotatePdf from '@/components/tools/RotatePdf'
import PageNumbers from '@/components/tools/PageNumbers'
import JpgToPdf from '@/components/tools/JpgToPdf'
import OrganizePdf from '@/components/tools/OrganizePdf'

const toolComponents = {
  'merge-pdf': MergePdf,
  'split-pdf': SplitPdf,
  'compress-pdf': CompressPdf,
  'pdf-to-word': PdfToWord,
  'word-to-pdf': WordToPdf,
  'edit-pdf': EditPdf,
  'pdf-to-jpg': PdfToJpg,
  'watermark': WatermarkPdf,
  'rotate-pdf': RotatePdf,
  'page-numbers': PageNumbers,
  'jpg-to-pdf': JpgToPdf,
  'organize-pdf': OrganizePdf,
}

export default function ToolPage() {
  const { toolId } = useParams()
  const tool = getToolById(toolId)

  if (!tool) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Alat tidak ditemukan</h1>
        <Link to="/" className="text-primary-600 hover:underline">Kembali ke beranda</Link>
      </div>
    )
  }

  const ToolComponent = toolComponents[toolId]
  const Icon = tool.icon

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 no-underline">
        <ArrowLeft className="w-4 h-4" />
        Kembali
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className={`${tool.color} w-14 h-14 rounded-xl flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tool.name}</h1>
          <p className="text-gray-500">{tool.description}</p>
        </div>
      </div>

      {ToolComponent ? (
        <ToolComponent tool={tool} />
      ) : (
        <p className="text-gray-500">Fitur ini belum tersedia.</p>
      )}
    </div>
  )
}
