import { Shield, Zap, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">Tentang PDF Tools</h3>
            <p className="text-sm leading-relaxed">
              Kumpulan alat PDF gratis yang diproses sepenuhnya di browser Anda. 
              File Anda tidak pernah diunggah ke server mana pun.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Keunggulan</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                100% Privat — file tidak keluar dari browser
              </li>
              <li className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Cepat — diproses langsung di perangkat Anda
              </li>
              <li className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                Gratis — tanpa batas penggunaan
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Teknologi</h3>
            <p className="text-sm leading-relaxed">
              Dibangun dengan React, pdf-lib, PDF.js, Tesseract.js, dan teknologi web modern lainnya.
            </p>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          © {new Date().getFullYear()} PDF Tools. Semua pemrosesan dilakukan di browser.
        </div>
      </div>
    </footer>
  )
}
