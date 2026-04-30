import { tools } from '@/config/tools'
import ToolCard from '@/components/common/ToolCard'
import { Shield, Zap, Heart } from 'lucide-react'

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="tool-gradient text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Semua Alat PDF yang Anda Butuhkan
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Gabungkan, pisahkan, komversi, edit PDF dan lainnya — gratis dan aman.
            <br />Semua diproses di browser Anda, file tidak pernah diunggah ke server.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              100% Privat
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Cepat
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Gratis
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Pilih Alat yang Anda Butuhkan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
    </div>
  )
}
